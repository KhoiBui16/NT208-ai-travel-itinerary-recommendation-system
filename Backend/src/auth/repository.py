"""Auth domain repository: UserRepository + RefreshTokenRepository (merged).

Both repos are small and belong to the same domain, so they live in one file.
"""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import RefreshToken, User


class UserRepository:
    """Data access for User table.

    Args:
        session: Async SQLAlchemy session injected via FastAPI Depends.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        """Fetch a user by primary key.
        
        Lấy user theo ID chính.
        
        Use Cases:
          - JWT verification: extract user_id từ token, query user
          - Refresh token validation: tìm user owner của token
          - Change password: lấy user để cập nhật password
        
        Query: SELECT * FROM users WHERE id = ?

        Args:
            user_id: The user's integer ID from JWT sub claim.

        Returns:
            User instance or None if not found.
        """
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email address.

        Used during login (to verify credentials) and register (to check duplicates).

        Args:
            email: Case-sensitive email string.

        Returns:
            User instance or None if not found.
        """
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_reset_token_hash(self, token_hash: str) -> User | None:
        """Fetch a user by password reset token hash.

        Args:
            token_hash: SHA-256 hash of the raw reset token.

        Returns:
            User instance or None if not found.
        """
        result = await self.session.execute(
            select(User).where(User.password_reset_token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: object) -> User:
        """Create a new user record.

        Args:
            **kwargs: User fields — must include email, hashed_password, name.
                      Optional: phone, interests.

        Returns:
            The newly created User with auto-generated id.
        """
        user = User(**kwargs)  # type: ignore[arg-type]
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User, **kwargs: object) -> User:
        """Update specific fields on an existing user.

        Only sets attributes whose value is not None, allowing partial updates.

        Args:
            user: The existing User ORM instance.
            **kwargs: Fields to update — e.g. name, phone, hashed_password.

        Returns:
            The updated User instance.
        """
        for key, value in kwargs.items():
            if value is not None:
                setattr(user, key, value)
        await self.session.flush()
        await self.session.refresh(user)
        return user


class RefreshTokenRepository:
    """Data access for RefreshToken table.

    Manages hashed refresh tokens in the refresh_tokens table.
    Raw tokens are never stored — only SHA-256 hashes are persisted.

    Args:
        session: Async SQLAlchemy session injected via FastAPI Depends.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Look up a refresh token by its SHA-256 hash.
        
        Token Lookup Flow:
        
        1. Client gửi raw token khi refresh/logout
        2. Service hash token: SHA-256(raw_token)
        3. Query DB: SELECT * FROM refresh_tokens WHERE token_hash = ?
        4. Return RefreshToken record nếu tìm thấy
        
        Security:
          - Lưu hash, không lưu raw token -> DB breach safe
          - Token_hash indexed -> O(1) lookup
          - If token_hash không tồn tại -> None (invalid token)
        
        Use Cases:
          - refresh token: Find stored token to check revoke status
          - logout: Find token to revoke
          - verify token: Check if token exists và is_revoked=false

        Args:
            token_hash: The hex digest of SHA-256(raw_token).

        Returns:
            RefreshToken instance or None if not found.
        """
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        """Persist a new refresh token hash.
        
        Token Persistence Flow:
        
        1. Service generates new refresh token
           - 128 bytes random (secure random)
           - Hash = SHA-256(raw_token)
        
        2. Service calls: token_repo.create(user_id, token_hash, expires_at)
        
        3. INSERT INTO refresh_tokens:
           - user_id: user owner
           - token_hash: SHA-256 hash (64 hex chars)
           - expires_at: token expiry time (typically now + 7 days)
           - is_revoked: false (default)
           - created_at: now (auto)
        
        4. Flush vào DB (commit trong transaction)
        
        5. Return RefreshToken ORM instance
        
        Security:
          - KHÔNG lưu raw token (only in client memory)
          - Hash indexed for fast lookup
          - Expiry check prevents stale token usage

        Args:
            user_id: Owner of the token.
            token_hash: SHA-256 hex digest of the raw token.
            expires_at: When the token becomes invalid.

        Returns:
            The newly created RefreshToken record.
        """
        token = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.session.add(token)
        await self.session.flush()
        return token

    async def revoke(self, token_id: int) -> None:
        """Mark a single refresh token as revoked.
        
        Token Revocation Flow:
        
        1. Service finds token record
           - find_by_hash(token_hash) -> RefreshToken instance
        
        2. Service calls: token_repo.revoke(token.id)
        
        3. UPDATE refresh_tokens:
           - SET is_revoked = true
           - WHERE id = token_id
        
        4. Flush vào DB
        
        Security (Revocation Pattern):
          - Revoke = soft delete (không xóa record)
          - is_revoked flag prevents token reuse
          - Audit trail: can query revoked tokens later
        
        Use Cases:
          1. Token Refresh (rotation):
             - Old token used -> revoke
             - New pair created
             - Prevents old token reuse
          
          2. Logout:
             - Revoke current token
             - Token không thể dùng lại
          
          3. (Optional) Logout from other device:
             - Revoke specific token ID

        Args:
            token_id: Primary key of the refresh_tokens row.
        """
        await self.session.execute(
            update(RefreshToken).where(RefreshToken.id == token_id).values(is_revoked=True)
        )
        await self.session.flush()

    async def revoke_all_for_user(self, user_id: int) -> None:
        """Revoke all active refresh tokens for a user.
        
        Bulk Revocation Flow:
        
        1. Service calls: token_repo.revoke_all_for_user(user_id)
        
        2. UPDATE refresh_tokens:
           - SET is_revoked = true
           - WHERE user_id = user_id AND is_revoked = false
           - Only revoke active tokens (skip already revoked)
        
        3. Flush vào DB
        
        Security (Force Logout All Devices):
          - Được thực hiện khi password reset
          - Nếu password bị compromise -> attacker không thể dùng old tokens
          - Force user login lại mọi nơi
        
        Use Cases:
          1. Password Reset (forgot_password endpoint):
             - User quên password
             - Reset được kích hoạt -> trigger reset flow
             - Revoke all old tokens -> force login everywhere
             - Prevention: attacker thay password không thể dùng session cũ
          
          2. (Optional) Admin action: 
             - Logout user from all devices
             - Security incident response
             - Account compromise cleanup

        Args:
            user_id: The user whose tokens should be revoked.
        """
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)  # noqa: E712
            .values(is_revoked=True)
        )
        await self.session.flush()
