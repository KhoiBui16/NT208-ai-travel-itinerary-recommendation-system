"""Authentication business logic.

Handles the full JWT auth lifecycle:
  register        → create user + issue token pair
  login           → verify credentials + issue token pair
  refresh         → revoke old refresh token + issue new pair (rotation)
  logout          → revoke refresh token
  forgot_password → generate reset token + send email
  reset_password  → consume reset token + update password
"""

from datetime import UTC, datetime

from src.auth.email import EmailService
from src.auth.models import User
from src.auth.repository import RefreshTokenRepository, UserRepository
from src.auth.schemas import AuthResponse, UserResponse
from src.core.config import get_settings
from src.core.exceptions import ConflictException, UnauthorizedException
from src.core.logger import get_logger
from src.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)

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
        email_service: EmailService | None = None,
    ) -> None:
        self.user_repo = user_repo
        self.token_repo = token_repo
        self.email_service = email_service or EmailService()

    async def register(
        self,
        email: str,
        password: str,
        name: str,
        phone: str | None = None,
    ) -> AuthResponse:
        """Register a new user and return JWT pair."""
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("Email already registered")

        hashed = hash_password(password)
        user = await self.user_repo.create(
            email=email,
            hashed_password=hashed,
            name=name,
            phone=phone,
        )

        tokens = await self._create_tokens(user)
        logger.info("user_registered", user_id=user.id, email=email)

        return AuthResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type="bearer",
            expires_in=get_settings().access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    async def login(self, email: str, password: str) -> AuthResponse:
        """Verify credentials and return JWT pair."""
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise UnauthorizedException("Account is deactivated")

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
        """Rotate refresh token: revoke old, issue new pair."""
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if not stored or stored.is_revoked:
            raise UnauthorizedException("Invalid or revoked refresh token")

        user = await self.user_repo.get_by_id(stored.user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found or inactive")

        await self.token_repo.revoke(stored.id)

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
        """Revoke the refresh token to prevent further use."""
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if stored and not stored.is_revoked:
            await self.token_repo.revoke(stored.id)
            logger.info("user_logout", user_id=stored.user_id)

    async def forgot_password(self, email: str) -> None:
        """Generate a password reset token and send it via email."""
        user = await self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            return

        raw_token, token_hash, expires_at = create_password_reset_token()
        await self.user_repo.update(
            user,
            password_reset_token_hash=token_hash,
            password_reset_expires_at=expires_at,
        )
        await self.email_service.send_password_reset(
            to_email=email,
            reset_token=raw_token,
        )
        logger.info("password_reset_requested", user_id=user.id)

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        """Consume a password reset token and update the user's password."""
        token_hash = hash_token(raw_token)
        user = await self.user_repo.get_by_reset_token_hash(token_hash)

        if not user:
            raise UnauthorizedException("Invalid or expired reset token")

        now = datetime.now(UTC)
        if user.password_reset_expires_at is None or user.password_reset_expires_at < now:
            await self.user_repo.update(
                user,
                password_reset_token_hash=None,
                password_reset_expires_at=None,
            )
            raise UnauthorizedException("Reset token has expired")

        new_hashed = hash_password(new_password)
        await self.user_repo.update(
            user,
            hashed_password=new_hashed,
            password_reset_token_hash=None,
            password_reset_expires_at=None,
        )

        await self.token_repo.revoke_all_for_user(user.id)

        logger.info("password_reset_completed", user_id=user.id)

    async def _create_tokens(self, user: User) -> dict[str, str]:
        """Issue a new JWT access token and refresh token pair."""
        access_token = create_access_token(user.id)
        raw_refresh, token_hash, expires_at = create_refresh_token(user.id)
        await self.token_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return {"access_token": access_token, "refresh_token": raw_refresh}
