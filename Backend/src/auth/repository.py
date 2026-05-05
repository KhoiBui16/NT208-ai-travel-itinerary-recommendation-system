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

        Used during refresh rotation (revoke old, create new) and logout.

        Args:
            token_id: Primary key of the refresh_tokens row.
        """
        await self.session.execute(
            update(RefreshToken).where(RefreshToken.id == token_id).values(is_revoked=True)
        )
        await self.session.flush()

    async def revoke_all_for_user(self, user_id: int) -> None:
        """Revoke all active refresh tokens for a user.

        Can be used for "logout from all devices" functionality.

        Args:
            user_id: The user whose tokens should be revoked.
        """
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)  # noqa: E712
            .values(is_revoked=True)
        )
        await self.session.flush()
