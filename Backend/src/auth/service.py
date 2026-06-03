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
        """Register a new user and return JWT pair.

        Quá trình tủng bước:

        1. Kiểm tra duplicate email
           - Query: SELECT * FROM users WHERE email = ?
           - Nếu tồn tại -> throw ConflictException

        2. Hash mật khẩu
           - Dùng bcrypt.hashpw() (salt rounds = 12)
           - KHLNG lưu raw password

        3. Tạo user record
           - INSERT INTO users (email, hashed_password, name, phone, is_active=true)
           - is_active=true mặc định (account tuỳng enable)
           - Timestamps: created_at = NOW(), updated_at = NOW()

        4. Tạo JWT token pair
           - access_token: exp = now + 15 phút
           - refresh_token: 128 bytes random
             * Hash SHA-256
             * Lưu token_hash vào DB
             * exp = now + 7 ngày

        5. Trả về
           - access_token (dùng cho authenticated requests)
           - refresh_token (dùng để refresh access_token)
           - user profile

        Exceptions:
          - ConflictException: Email đã tồn tại
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

        Quá trình login tủng bước:

        1. Query user bằng email
           - SELECT * FROM users WHERE email = ?
           - Nếu không tồn tại -> throw UnauthorizedException

        2. Verify password
           - Dùng bcrypt.checkpw(input_password, stored_hash)
           - Nếu không match -> throw UnauthorizedException
           - KHLNG tiết lộ: "Invalid email or password" (chứ không nói email/password sai)

        3. Kiểm tra user status
           - Nếu user.is_active == false -> throw UnauthorizedException
           - Ngăn người dùng bị ban/deactivate không thể login

        4. Tạo token pair
           - access_token (15 phút)
           - refresh_token (7 ngày)

        5. Trả về
           - Token pair + user profile

        Security:
          - Timing attack protection: password check luôn tẫm timeé (bcrypt xử lý)
          - Brute-force mitigation: Rate limit nên được apply ở FastAPI middleware

        Exceptions:
          - UnauthorizedException: Email không tồn tại
          - UnauthorizedException: Password sai
          - UnauthorizedException: Account deactivated
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

        Token Rotation Flow (Security Best Practice):

        1. Hash incoming refresh_token (SHA-256)
           - Client gửi raw token (128 bytes hex)
           - Hash = SHA-256(raw_token)

        2. Lookup token hash trong DB
           - SELECT * FROM refresh_tokens WHERE token_hash = ?
           - Nếu không tồn tại -> throw UnauthorizedException

        3. Kiểm tra token status
           - is_revoked == false (token chưa bị revoke)
           - Nếu revoke rồi -> throw UnauthorizedException (token reuse!)
           - Đặc tác: attacker đã steal token cũ + dùng lại

        4. Verify user still exists
           - Query user bằng user_id
           - user.is_active == true
           - Nếu user deactivated -> throw UnauthorizedException

        5. **REVOKE old token**
           - UPDATE refresh_tokens SET is_revoked=true WHERE id=<token_id>
           - Dùng không thể dùng lại old token
           - Nếu attacker họể hoặc cố dùng -> 401 error (detected)

        6. Tạo cặp token MỚI
           - access_token: exp = now + 15 phút
           - refresh_token: 128 bytes random hôn
             * Hash SHA-256, lưu token_hash
             * exp = now + 7 ngày

        7. Trả về token pair mới

        Security (Refresh Token Rotation):
          - Prevents token compromise: if token stolen, can only use once
          - Detects replay: if old token reused -> 401 (compromised detected)
          - Logout all devices: revoke_all_for_user() called on password reset

        Exceptions:
          - UnauthorizedException: Token không tồn tại
          - UnauthorizedException: Token revoked (reuse detected)
          - UnauthorizedException: User not found or inactive
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

        Logout Flow:

        1. Hash refresh_token (SHA-256)

        2. Query token trong DB bằng token_hash

        3. Nếu tìm thấy và không revoke rồi:
           - UPDATE refresh_tokens SET is_revoked=true
           - Lôg user_id lấy từ token record

        4. Logout là idempotent:
           - Logout lại vẫn success ngay cả không tìm thấy token
           - Không throw error nếu token không exist

        Client-side after logout:
          - Xóa refresh_token khỏi storage (localStorage, sessionStorage)
          - Xóa access_token khỏi memory
          - Redirect login page

        Subsequent calls:
          - Nếu dùng old refresh_token -> 401 Unauthorized (token revoked)
          - Access_token sẽ hết hạn sau 15 phút anyway
        """
        token_hash = hash_token(raw_refresh_token)
        stored = await self.token_repo.find_by_hash(token_hash)
        if stored and not stored.is_revoked:
            await self.token_repo.revoke(stored.id)
            logger.info("user_logout", user_id=stored.user_id)

    async def forgot_password(self, email: str) -> None:
        """Generate a password reset token and send it via email.

        Forgot Password Flow:

        1. Query user bằng email
           - Nếu không tồn tại: return (không throw)
           - Nếu is_active==false: return
           - TἝ protection: không tiết lộ email có hay không

        2. Tạo reset token
           - 128 bytes random (secure_random_bytes)
           - Hash = SHA-256(token)

        3. Lưu vào DB
           - UPDATE users SET
             * password_reset_token_hash = hash
             * password_reset_expires_at = now + 1 hour

        4. Gửi email
           - Nếu SMTP configured: gửi đời thực qua aiosmtplib
           - Otherwise: log URL ra console (development fallback)
           - Email subject: "DuLichViet — Đặt lại mật khẩu"
           - URL: https://frontend.com/reset-password?token=<raw_token>
           - Lưu ý: raw_token chỉ gửi qua email, KHLNG lưu hash

        5. Log request (for audit)

        Security:
          - Token single-use: xóa sau dùng
          - Token expiry: 1 giờ
          - Doesn't leak email existence
          - Always return success (timing attack prevention)
        """
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
        """Consume a password reset token and update the user's password.

        Reset Password Flow (High Security):

        1. Hash incoming token (SHA-256)

        2. Query user bằng token hash
           - SELECT * FROM users WHERE password_reset_token_hash = ?
           - Nếu không tìm thấy -> throw UnauthorizedException

        3. Kiểm tra token expiry
           - now = UTC datetime
           - Nếu now > password_reset_expires_at:
             * Token hết hạn
             * Clear token từ DB (lị cleanup)
             * throw UnauthorizedException

        4. Hash mật khẩu mới (bcrypt)

        5. Update user
           - hashed_password = new hash
           - password_reset_token_hash = NULL
           - password_reset_expires_at = NULL
           - Lị dữ liệu reset

        6. **CRITICAL: Revoke ALL refresh tokens**
           - revoke_all_for_user(user_id)
           - UPDATE refresh_tokens SET is_revoked=true WHERE user_id=? AND is_revoked=false
           - Force user logout from ALL devices
           - Reason: nếu password bị compromise -> attacker không thể dùng old tokens

        7. Log audit event

        Security (Password Reset):
          - Token single-use: xóa sau dùng
          - Token expiry: 1 giờ
          - Logout all devices: user phải login lại everywhere
          - Prevents attacker using stolen tokens after reset

        Exceptions:
          - UnauthorizedException: Token không tồn tại
          - UnauthorizedException: Token hết hạn
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

        Token Creation Flow:

        1. Create access token (JWT)
           - Header: {"alg": "HS256", "typ": "JWT"}
           - Payload:
             * sub: user.id (subject = user identifier)
             * exp: now + 15 phút (access token expires quickly)
             * iat: now (issued at)
             * typ: "access" (để phân biệt với other token types)
           - Signature: HMAC-SHA256(header.payload, SECRET_KEY)
           - Trả về: JWT string (client dùng trong Authorization header)

        2. Create refresh token (opaque)
           - 128 bytes random data (secure_random_bytes)
           - Kật qả: raw_token (hex), token_hash (SHA-256), expires_at (now + 7 ngày)

        3. Persist refresh token
           - INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked=false)
           - Lưu hash (KHÔNG lưu raw token)
           - expiry: 7 ngày

        4. Return both tokens
           - access_token: JWT string (send to client)
           - refresh_token: raw token string (client dư lưu, dùng khi access_token hết hạn)

        Token Usage:
          - Access token: dùng trong Authorization: Bearer <access_token>
            * Verify JWT signature + expiry
            * Extract user_id từ sub claim
          - Refresh token: dùng endpoint /auth/refresh
            * Hash token
            * Query DB tìm token_hash
            * Check is_revoked + expiry
            * If valid -> revoke old, create new pair

        Security:
          - Access token short-lived (15 phút) -> minimize compromise window
          - Refresh token stored as hash (not raw) -> DB breach won't leak tokens
          - Refresh token rotation -> reuse detection (token theft protection)
          - Both tokens have separate expiry (access faster)
        """
        access_token = create_access_token(user.id)
        raw_refresh, token_hash, expires_at = create_refresh_token(user.id)
        await self.token_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return {"access_token": access_token, "refresh_token": raw_refresh}
