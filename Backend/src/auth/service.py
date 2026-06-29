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

from src.auth.email import EmailService, PasswordResetDeliveryMode
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
        """Register a new user and return JWT pair.

        Flow: Đăng ký tài khoản
        1. Kiểm tra email chưa tồn tại (ConflictException nếu tồn tại)
        2. Hash password bằng bcrypt
        3. Tạo User record trong database
        4. Phát hành cặp JWT tokens
        5. Log sự kiện registration
        6. Trả về AuthResponse chứa access_token, refresh_token, user info
        """
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
        """Verify credentials and return JWT pair.

        Flow: Đăng nhập
        1. Tìm user bằng email
        2. Xác minh password (verify_password: bcrypt comparison)
        3. Kiểm tra account is_active = true (không bị deactivate)
        4. Phát hành cặp JWT tokens mới
        5. Log sự kiện login
        6. Trả về AuthResponse với tokens + user info
        """
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
        """Rotate refresh token: revoke old, issue new pair.

        Flow: Token Rotation (Security best practice)
        1. Hash refresh token (để so sánh với database)
        2. Tìm token record trong database
        3. Kiểm tra token không bị revoked
        4. Lấy user từ token, kiểm tra user is_active
        5. Revoke token cũ (đánh dấu is_revoked = true)
           → Nếu token bị đánh cắp, attacker sẽ dùng token cũ (đã revoked)
        6. Phát hành cặp JWT mới (access_token + refresh_token mới)
        7. Log sự kiện refresh
        8. Trả về AuthResponse với tokens mới
        """
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
        """Revoke the refresh token to prevent further use.

        Flow: Đăng xuất an toàn
        1. Hash refresh token
        2. Tìm token record trong database
        3. Nếu tìm thấy và chưa revoked:
           → Đánh dấu is_revoked = true
           → Ngăn token này được dùng để refresh lại
        4. Log sự kiện logout
        5. Client sẽ xóa access_token + refresh_token khỏi local storage
        """
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if stored and not stored.is_revoked:
            await self.token_repo.revoke(stored.id)
            logger.info("user_logout", user_id=stored.user_id)

    async def forgot_password(self, email: str) -> PasswordResetDeliveryMode:
        """Generate a password reset token and send it via email.

        Flow: Yêu cầu reset password
        1. Tìm user bằng email
        2. Nếu không tìm thấy hoặc account không active: return (security: không leak)
        3. Nếu tìm thấy:
           → Tạo reset token + hash + expiry time (vd: 1 giờ)
           → Lưu token_hash + expires_at vào user record trong DB
           → Gửi email chứa reset link + raw token tới user
        4. Log sự kiện
        5. Reset token là one-time use (được consume bởi reset_password())
        """
        delivery_mode = self.email_service.get_password_reset_delivery_mode()
        user = await self.user_repo.get_by_email(email)
        if not user or not user.is_active:
            return delivery_mode

        if delivery_mode == "disabled":
            logger.warning(
                "password_reset_requested_but_delivery_unavailable",
                user_id=user.id,
            )
            return delivery_mode

        raw_token, token_hash, expires_at = create_password_reset_token()
        await self.user_repo.update(
            user,
            password_reset_token_hash=token_hash,
            password_reset_expires_at=expires_at,
        )
        delivery_mode = await self.email_service.send_password_reset(
            to_email=email,
            reset_token=raw_token,
        )
        logger.info(
            "password_reset_requested",
            user_id=user.id,
            delivery_mode=delivery_mode,
        )
        return delivery_mode

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        """Consume a password reset token and update the user's password.

        Flow: Xác nhận reset password
        1. Hash reset token
        2. Tìm user có password_reset_token_hash khớp
        3. Nếu không tìm thấy: raise UnauthorizedException
        4. Kiểm tra token không hết hạn:
           → Nếu hết hạn: xóa token fields, raise UnauthorizedException
           → Nếu chưa hết: tiếp tục
        5. Mã hóa mật khẩu mới (hash_password)
        6. Cập nhật user:
           → hashed_password = mật khẩu mới
           → password_reset_token_hash = null (một lần dùng)
           → password_reset_expires_at = null
        7. Revoke tất cả refresh tokens cũ của user
           → User phải đăng nhập lại trên tất cả devices
        8. Log sự kiện
        """
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
        """Issue a new JWT access token and refresh token pair.

        Flow: Phát hành JWT tokens
        1. Tạo access token (short-lived, vd: 15 phút)
           → Chứa user_id trong payload
           → Dùng để xác thực API requests
        2. Tạo refresh token (long-lived, vd: 30 ngày)
           → Chứa user_id + token secret
           → Dùng để lấy access token mới khi hết hạn
        3. Lưu refresh token hash + expiry vào database
           → Hash để không lưu raw token (security)
           → Expiry để auto-clean old tokens
        4. Trả về dict chứa cả access_token (raw) + refresh_token (raw)
        """
        access_token = create_access_token(user.id)
        raw_refresh, token_hash, expires_at = create_refresh_token(user.id)
        await self.token_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return {"access_token": access_token, "refresh_token": raw_refresh}
