"""Authentication business logic.

Handles the full JWT auth lifecycle:
  register → create user + issue token pair
  login    → verify credentials + issue token pair
  refresh  → revoke old refresh token + issue new pair (rotation)
  logout   → revoke refresh token

Security design:
  - Access tokens are short-lived JWTs (15 min default).
  - Refresh tokens are opaque, stored as SHA-256 hashes in DB.
  - Each refresh rotates both tokens — the old refresh token is revoked.
  - Logout revokes the refresh token so it cannot be reused.
"""

from src.core.config import get_settings
from src.core.exceptions import ConflictException, UnauthorizedException
from src.core.logger import get_logger
from src.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from src.models.user import User
from src.repositories.token_repo import RefreshTokenRepository
from src.repositories.user_repo import UserRepository
from src.schemas.auth import AuthResponse
from src.schemas.user import UserResponse

logger = get_logger(__name__)


class AuthService:
    """Handle registration, login, token refresh, and logout.

    Args:
        user_repo: UserRepository for user table lookups and writes.
        token_repo: RefreshTokenRepository for refresh token management.
    """

    def __init__(
        self,
        user_repo: UserRepository,
        token_repo: RefreshTokenRepository,
    ) -> None:
        self.user_repo = user_repo
        self.token_repo = token_repo

    async def register(
        self,
        email: str,
        password: str,
        name: str,
        phone: str | None = None,
    ) -> AuthResponse:
        """Register a new user and return JWT pair.

        Workflow:
          1. Check email uniqueness — raise ConflictException if exists.
          2. Hash the plaintext password with bcrypt.
          3. Create user record in DB.
          4. Issue access + refresh token pair.
          5. Return AuthResponse with tokens and user profile.

        Args:
            email: User email (must be unique).
            password: Plaintext password (min 6 chars, validated by schema).
            name: Display name.
            phone: Optional phone number.

        Returns:
            AuthResponse with accessToken, refreshToken, and user profile.

        Raises:
            ConflictException: If email is already registered.
        """
        # Step 1: Check email uniqueness
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("Email already registered")

        # Step 2-3: Hash password and create user
        hashed = hash_password(password)
        user = await self.user_repo.create(
            email=email,
            hashed_password=hashed,
            name=name,
            phone=phone,
        )

        # Step 4: Issue JWT pair
        tokens = await self._create_tokens(user)
        logger.info("user_registered", user_id=user.id, email=email)

        # Step 5: Build response
        return AuthResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=get_settings().access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    async def login(self, email: str, password: str) -> AuthResponse:
        """Verify credentials and return JWT pair.

        Workflow:
          1. Look up user by email.
          2. Verify password with bcrypt — raise UnauthorizedException if mismatch.
          3. Check is_active flag — raise UnauthorizedException if deactivated.
          4. Issue access + refresh token pair.
          5. Return AuthResponse.

        Args:
            email: User email.
            password: Plaintext password.

        Returns:
            AuthResponse with accessToken, refreshToken, and user profile.

        Raises:
            UnauthorizedException: If credentials are invalid or account is deactivated.
        """
        # Step 1-2: Verify credentials (deliberately generic error message)
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        # Step 3: Check account status
        if not user.is_active:
            raise UnauthorizedException("Account is deactivated")

        # Step 4-5: Issue tokens and respond
        tokens = await self._create_tokens(user)
        logger.info("user_login", user_id=user.id)
        return AuthResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=get_settings().access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    async def refresh(self, raw_refresh_token: str) -> AuthResponse:
        """Rotate refresh token: revoke old, issue new pair.

        Workflow:
          1. Hash the raw refresh token and look up in DB.
          2. Validate — raise UnauthorizedException if not found or revoked.
          3. Look up the owning user — raise UnauthorizedException if inactive.
          4. Revoke the old refresh token (rotation).
          5. Issue new access + refresh token pair.
          6. Return AuthResponse.

        Args:
            raw_refresh_token: The opaque refresh token string from client.

        Returns:
            AuthResponse with new accessToken, new refreshToken, and user profile.

        Raises:
            UnauthorizedException: If token is invalid, revoked, or user is inactive.
        """
        # Step 1-2: Validate refresh token
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if not stored or stored.is_revoked:
            raise UnauthorizedException("Invalid or revoked refresh token")

        # Step 3: Validate user still exists and is active
        user = await self.user_repo.get_by_id(stored.user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        # Step 4: Revoke old token (rotation)
        await self.token_repo.revoke(stored.id)

        # Step 5-6: Issue new pair
        tokens = await self._create_tokens(user)
        logger.info("token_refreshed", user_id=user.id)
        return AuthResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=get_settings().access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    async def logout(self, raw_refresh_token: str) -> None:
        """Revoke the refresh token to prevent further use.

        Silently succeeds if the token is not found or already revoked,
        so the client always gets a clean logout experience.

        Args:
            raw_refresh_token: The opaque refresh token string to revoke.
        """
        # Hash and look up — revoke only if still active
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if stored and not stored.is_revoked:
            await self.token_repo.revoke(stored.id)
            logger.info("user_logout", user_id=stored.user_id)

    async def _create_tokens(self, user: User) -> dict[str, str]:
        """Issue a new JWT access token and refresh token pair.

        Workflow:
          1. Create short-lived JWT access token (HS256, 15 min).
          2. Generate opaque refresh token + its SHA-256 hash + expiry.
          3. Persist the token hash in DB.
          4. Return raw tokens (hash is never returned to client).

        Args:
            user: The User to issue tokens for.

        Returns:
            Dict with "access_token" (JWT string) and "refresh_token" (opaque string).
        """
        access_token = create_access_token(user.id)
        raw_refresh, token_hash, expires_at = create_refresh_token(user.id)
        await self.token_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return {"access_token": access_token, "refresh_token": raw_refresh}
