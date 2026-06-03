"""Auth + User API endpoints.

Auth endpoints (EP 1-4, 31-32):
  register, login, refresh, logout, forgot-password, reset-password

User endpoints (EP 5-7):
  profile, update profile, change password
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.auth.email import EmailService
from src.auth.models import User
from src.auth.profile_service import UserService
from src.auth.repository import RefreshTokenRepository, UserRepository
from src.auth.schemas import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)
from src.auth.service import AuthService
from src.core.database import get_db
from src.core.schema import SuccessResponse

# ============================================================================
# EP-1, EP-2, EP-4: Đăng ký / Đăng nhập / Đăng xuất
# ============================================================================
# Workflow:
#   1. Người dùng gửi email/password qua POST /register hoặc POST /login
#   2. Service xác minh credentials (hoặc tạo user mới nếu register)
#   3. Service tạo JWT access token (15 phút) + refresh token (lưu hash vào DB)
#   4. Server trả cặp token về cho client; client lưu vào localStorage/sessionStorage
#   5. Logout: client gửi refresh token về server, server đánh dấu refresh token là revoked
#   6. Kế tiếp client không thể dùng refresh token đó để tạo cặp token mới
# ============================================================================

# --- Auth router ---

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """DI factory: create AuthService with fresh repo instances per request."""
    return AuthService(
        user_repo=UserRepository(db),
        token_repo=RefreshTokenRepository(db),
        email_service=EmailService(),
    )


@auth_router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-1: Register a new user account.
    
    Quy trình:
      - Kiểm tra email đã tồn tại chưa
      - Hash mật khẩu bằng bcrypt
      - Tạo user mới trong DB
      - Tạo JWT access token + refresh token
      - Trả token pair về client
    
    Response:
      - accessToken: JWT (15 phút)
      - refreshToken: Opaque token (7 ngày)
      - user: User info (id, email, name, ...)
    """
    return await service.register(
        email=body.email,
        password=body.password,
        name=body.name,
        phone=body.phone,
    )


@auth_router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-2: Login with email and password.
    
    Quy trình:
      - Tìm user theo email
      - Xác minh mật khẩu với bcrypt.verify()
      - Kiểm tra user.is_active == True
      - Tạo JWT access token + refresh token mới
      - Trả token pair về client
    
    Lỗi có thể trả:
      - 401: Email/password sai hoặc account bị deactivated
    """
    return await service.login(email=body.email, password=body.password)


@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-3: Refresh the JWT pair using a valid refresh token.
    
    Quy trình Token Rotation:
      1. Hash refresh_token nhận được bằng SHA-256
      2. Tìm record trong refresh_tokens table với token_hash này
      3. Kiểm tra: token tồn tại + chưa revoked + chưa hết hạn
      4. Nếu ok: đánh dấu token cũ là revoked (is_revoked=True)
      5. Tạo JWT access token mới (15 phút)
      6. Tạo refresh token mới (7 ngày), lưu hash vào DB
      7. Trả access_token + refresh_token mới
    
    Lỗi:
      - 401: Refresh token không hợp lệ, hết hạn, hoặc đã bị revoke
    
    Lợi ích:
      - Token mới mỗi lần refresh
      - Token cũ không thể tái sử dụng (revoked)
      - Phát hiện token leak: nếu token cũ được dùng lại → 401
    """
    return await service.refresh(raw_refresh_token=body.refresh_token)


@auth_router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: LogoutRequest,
    _: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-4: Logout by revoking the refresh token.
    
    Quy trình:
      - Require: Người dùng phải đã login (Bearer token header)
      - Client gửi refresh_token (lưu trước từ login/register)
      - Server tìm refresh_token trong DB (lưu dạng hash)
      - Đánh dấu refresh_token.is_revoked = True
      - Kế tiếp nếu client dùng refresh token này để gọi EP-3 sẽ bị 401
      - Client phải xoá access_token + refresh_token ở localStorage
    
    Security:
      - Refresh token là opaque, được hash SHA-256 trước lưu DB
      - Không thể tái sử dụng refresh token sau logout
      - Access token vẫn còn valid cho đến khi hết hạn (15 phút)
    """
    await service.logout(raw_refresh_token=body.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@auth_router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-31: Request a password reset email.
    
    Quy trình:
      1. Tìm user theo email
      2. Nếu user không tồn tại → trả message giả tạo (security)
      3. Nếu user tồn tại:
         - Tạo password_reset_token (opaque, 1 giờ)
         - Hash token bằng SHA-256
         - Lưu hash + expires_at vào users.password_reset_token_hash, password_reset_expires_at
         - Gửi email chứa reset link với raw token
    
    Response: Luôn trả 200 OK (không leak email tồn tại)
    
    Email chứa link:
      - https://frontend.com/reset-password?token={raw_token}
    """
    await service.forgot_password(email=body.email)
    return SuccessResponse(
        message="If the email exists, a reset link has been sent",
    )


@auth_router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-32: Consume a reset token and set a new password.
    
    Quy trình:
      1. Client gửi:
         - token: raw token từ email link
         - newPassword: mật khẩu mới
      2. Server hash token bằng SHA-256
      3. Tìm user với password_reset_token_hash == token_hash
      4. Kiểm tra:
         - Token tồn tại trong DB
         - expires_at > now (chưa hết hạn)
      5. Nếu hết hạn: xoá token khỏi DB, trả 401
      6. Nếu ok:
         - Hash mật khẩu mới bằng bcrypt
         - Cập nhật users.hashed_password
         - Xoá password_reset_token_hash + expires_at (token 1 lần)
         - Revoke toàn bộ refresh_tokens cũ (force re-login)
    
    Security:
      - Token dùng 1 lần (xoá khỏi DB sau reset)
      - Khi reset password: logout toàn bộ session cũ
      - Hacker lấy được old token link vẫn không thể dùng lại
    """
    await service.reset_password(
        raw_token=body.token,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password has been reset successfully")


# ============================================================================
# EP-3: Refresh Token Rotation (JWT)
# ============================================================================
# Workflow:
#   1. Access token hết hạn (15 phút) hoặc sắp hết hạn
#   2. Client gọi POST /refresh với refresh_token (7 ngày)
#   3. Server kiểm tra refresh_token có trong DB không, chưa revoked chưa
#   4. Nếu valid: revoke refresh_token cũ (đánh dấu is_revoked=True)
#   5. Tạo JWT access token mới + refresh_token mới
#   6. Trả cặp token mới về client
#   7. Client cập nhật localStorage với token mới
# Security:
#   - Refresh token bị revoke ngay khi dùng → Rotate token
#   - Nếu hacker lấy được refresh token cũ → không thể dùng lại
#   - Mỗi lần refresh = 1 token mới, token cũ mất hiệu lực
# ============================================================================

# --- User router ---

user_router = APIRouter(prefix="/users", tags=["users"])


def _user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """DI factory: create UserService with fresh repo instance per request."""
    return UserService(user_repo=UserRepository(db))


@user_router.get("/profile", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)) -> UserResponse:
    """EP-5: Get the authenticated user's profile."""
    return UserResponse.model_validate(user)


@user_router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> UserResponse:
    """EP-6: Partially update the authenticated user's profile."""
    return await service.update_profile(
        user_id=user.id,
        name=body.name,
        phone=body.phone,
        interests=body.interests,
    )


@user_router.put("/password", response_model=SuccessResponse)
# ============================================================================
# EP-31, EP-32: Quên Mật Khẩu / Đặt Lại Mật Khẩu Qua Email
# ============================================================================
# Workflow:
#   1. User nhấp "Quên mật khẩu"
#   2. Nhập email → Client gọi POST /forgot-password
#   3. Server tìm user theo email; tạo password_reset_token (opaque, 1 giờ)
#   4. Hash token trước lưu DB trong password_reset_token_hash + expires_at
#   5. Gửi email chứa link: /reset-password?token={raw_token}
#   6. User nhấp link, nhập password mới → POST /reset-password
#   7. Server kiểm tra token hợp lệ + chưa hết hạn
#   8. Hash password mới, cập nhật users.hashed_password
#   9. Xoá password_reset_token_hash + expires_at (token dùng 1 lần)
#  10. Logout toàn bộ session cũ (revoke tất cả refresh token)
# Security:
#   - Token 1 lần (reset xong thì xoá khỏi DB)
#   - Token hết hạn sau 1 giờ
#   - Email không tồn tại: server im lặng (không leak email đã register)
#   - Password mới được hash bcrypt
# ============================================================================

async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> SuccessResponse:
    """EP-7: Change the authenticated user's password."""
    await service.change_password(
        user_id=user.id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password changed successfully")
