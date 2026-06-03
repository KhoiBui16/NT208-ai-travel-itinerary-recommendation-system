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
    
    Tính năng: Đăng ký / đăng nhập / đăng xuất
    
    Flow đăng ký:
      1. Client gửi email, password, name, phone (optional)
      2. Service kiểm tra email chưa được đăng ký trước đó
      3. Hash password bằng bcrypt
      4. Tạo user record trong DB
      5. Tạo JWT access token (15 phút) + refresh token (7 ngày) + lưu hash refresh token
      6. Trả về tokens + user profile
    
    Response:
      - access_token: JWT để gọi các endpoint authenticated
      - refresh_token: Dùng để lấy access_token mới khi hết hạn
      - expires_in: Thời gian sống của access token (giây)
      - user: Hồ sơ người dùng vừa tạo
    
    Status: 201 Created (user mới được tạo thành công)
    
    Exceptions:
      - 409 Conflict: Email đã được đăng ký
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
    
    Tính năng: Đăng ký / đăng nhập / đăng xuất
    
    Flow đăng nhập:
      1. Client gửi email + password
      2. Service tìm user theo email
      3. Verify password: compare bcrypt(input_password) vs stored hash
      4. Kiểm tra user.is_active (tài khoản không bị vô hiệu hóa)
      5. Tạo JWT access token + refresh token + lưu hash refresh token
      6. Trả về tokens + user profile
    
    Response:
      - access_token: JWT (15 phút) cho subsequent authenticated requests
      - refresh_token: Dùng endpoint /refresh để lấy access_token mới
      - user: Thông tin người dùng (id, email, name, phone, interests, etc.)
    
    Exceptions:
      - 401 Unauthorized: Email không tồn tại hoặc password sai
      - 401 Unauthorized: Tài khoản bị vô hiệu hóa (is_active=false)
    """
    return await service.login(email=body.email, password=body.password)


@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-3: Refresh the JWT pair using a valid refresh token.
    
    Tính năng: Refresh token rotation (JWT)
    
    Flow refresh token rotation:
      1. Client gửi refresh_token khi access_token hết hạn
      2. Service hash refresh_token (SHA-256)
      3. Tìm refresh token record trong DB bằng token_hash
      4. Kiểm tra:
         - Token tồn tại và chưa bị revoke
         - User tồn tại và is_active
      5. REVOKE token cũ (đánh dấu is_revoked=true) - security best practice
      6. Tạo cặp access + refresh token MỚI + lưu hash token mới
      7. Trả về token pair mới
    
    Security (Token Rotation):
      - Khi refresh được gọi, token cũ bị revoke ngay
      - Nếu token cũ bị dùng lại -> lỗi 401 (token revoked)
      - Ngăn chặn token reuse attacks
      - Detects token theft: nếu attacker dùng old token lần nữa
    
    Exceptions:
      - 401 Unauthorized: Token không tồn tại hoặc đã bị revoke
      - 401 Unauthorized: User không tồn tại hoặc is_active=false
    """
    return await service.refresh(raw_refresh_token=body.refresh_token)


@auth_router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: LogoutRequest,
    _: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-4: Logout by revoking the refresh token.
    
    Tính năng: Đăng ký / đăng nhập / đăng xuất
    
    Flow đăng xuất:
      1. Client gửi refresh_token cần revoke
      2. Require: User phải authenticated (access_token hợp lệ)
         -> get_current_user dependency đảm bảo JWT valid
      3. Service hash refresh_token (SHA-256)
      4. Tìm refresh token record trong DB
      5. Nếu tìm thấy và chưa revoke -> đánh dấu is_revoked=true
      6. Trả về success message
    
    Client-side:
      - Xóa refresh_token khỏi local storage/cookie
      - Xóa access_token khỏi memory
    
    Server-side revocation:
      - refresh_token không thể dùng lại
      - Nếu user cố dùng lại -> 401 Unauthorized (token revoked)
    
    Exceptions:
      - 401 Unauthorized: Access token không valid (get_current_user fails)
      - Logout vẫn succeed ngay cả nếu refresh_token không tìm thấy (idempotent)
    """
    await service.logout(raw_refresh_token=body.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@auth_router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-31: Request a password reset email.
    
    Tính năng: Quên mật khẩu / đặt lại qua email
    
    Flow quên mật khẩu:
      1. Client gửi email
      2. Service tìm user bằng email
      3. Kiểm tra user tồn tại và is_active
      4. Nếu tìm thấy:
         a. Tạo password reset token (128 bytes random, hashed SHA-256)
         b. Lưu token_hash + expires_at (1 giờ) vào DB
         c. Gửi email chứa raw token (KHÔNG gửi hash):
            - Email subject: "DuLichViet — Đặt lại mật khẩu"
            - Email body: URL = https://frontend.com/reset-password?token=<raw_token>
            - Link có hiệu lực 1 giờ
      5. Trả về success message (cùng message cho tất cả email, bảo vệ privacy)
    
    Security:
      - Không tiết lộ email tồn tại hay không
      - Token lưu là SHA-256 hash, không lưu raw token
      - Token tự hết hạn sau 1 giờ
      - Token single-use: sau khi dùng -> xóa từ DB
      - Console logging (fallback khi SMTP chưa config): in reset URL vào logs
    
    Exceptions:
      - Luôn trả 200 (success message generic) để bảo vệ privacy
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
    
    Tính năng: Quên mật khẩu / đặt lại qua email
    
    Flow đặt lại mật khẩu:
      1. Client gửi token (từ email link) + new_password
      2. Service hash token (SHA-256)
      3. Tìm user bằng password_reset_token_hash
      4. Kiểm tra:
         a. Token tồn tại (user found)
         b. Token chưa hết hạn (password_reset_expires_at > now)
         c. Nếu hết hạn -> xóa token từ DB + throw 401
      5. Nếu hợp lệ:
         a. Hash password mới bằng bcrypt
         b. Update user.hashed_password = new hash
         c. Clear token: password_reset_token_hash = NULL, expires_at = NULL
         d. **IMPORTANT**: Revoke ALL refresh tokens cho user (logout from all devices)
            -> security: nếu password bị compromise -> buộc login lại mọi nơi
      6. Trả về success message
    
    Security (Password Reset):
      - Token single-use: xóa sau dùng
      - Token hết hạn: 1 giờ
      - Logout from all devices: buộc user login lại
      - Nếu attacker thay đổi password, user cũ không thể dùng lại old tokens
    
    Exceptions:
      - 401 Unauthorized: Token không tồn tại
      - 401 Unauthorized: Token hết hạn
    """
    await service.reset_password(
        raw_token=body.token,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password has been reset successfully")


# --- User router ---

user_router = APIRouter(prefix="/users", tags=["users"])


def _user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """DI factory: create UserService with fresh repo instance per request."""
    return UserService(user_repo=UserRepository(db))


@user_router.get("/profile", response_model=UserResponse)
async def get_profile(user: User = Depends(get_current_user)) -> UserResponse:
    """EP-5: Get the authenticated user's profile.
    
    Tính năng: Xem / cập nhật hồ sơ, đổi mật khẩu
    
    Flow xem profile:
      1. Client gửi request vập hẽữ endpoint này
      2. Require: User phải authenticated (access_token hợp lệ)
         -> get_current_user dependency:
            a. Extract Bearer token từ Authorization header
            b. Verify JWT (check signature, expiry)
            c. Extract user_id từ sub claim
            d. Query DB lấy user record
            e. Kiểm tra is_active
      3. Trả về user profileñ public fields (không trả password hash)
    
    Response (UserResponse):
      - id: user ID
      - email: Địa chỉ email
      - name: Họ và tên người dùng
      - phone: Số điện thoại (optional)
      - interests: Danh sách thành phố quan tâm (default: [])
      - is_active: Tài khoản có hoạt động
      - created_at, updated_at: Timestamps
    
    Exceptions:
      - 401 Unauthorized: Không có token hoặc token không hợp lệ
      - 401 Unauthorized: User bị vô hiệu hóa (is_active=false)
    """
    return UserResponse.model_validate(user)


@user_router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> UserResponse:
    """EP-6: Partially update the authenticated user's profile.
    
    Tính năng: Xem / cập nhật hồ sơ, đổi mật khẩu
    
    Flow cập nhật profile:
      1. Client gửi (optional) name, phone, interests
      2. Require: User phải authenticated
      3. Service cập nhật partial fields:
         - Nếu name không null -> cập nhật
         - Nếu phone không null -> cập nhật
         - Nếu interests không null -> cập nhật
         - Không gủi email, password, is_active và có endpoint riêng
      4. Update DB
      5. Trả về user profile updated
    
    Request:
      - name: Họ và tên mới (1-100 char, optional)
      - phone: Số điện thoại mới (max 30 char, optional)
      - interests: Danh sách thành phố quan tâm (list[str], optional)
    
    Exceptions:
      - 401 Unauthorized: Không authenticated
      - 400 Bad Request: Validation failure (tổng dữ liệu invalid)
    """
    return await service.update_profile(
        user_id=user.id,
        name=body.name,
        phone=body.phone,
        interests=body.interests,
    )


@user_router.put("/password", response_model=SuccessResponse)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> SuccessResponse:
    """EP-7: Change the authenticated user's password.
    
    Tính năng: Xem / cập nhật hồ sơ, đổi mật khẩu
    
    Flow đổi mật khẩu:
      1. Client gửi current_password + new_password
      2. Require: User phải authenticated
      3. Service:
         a. Lấy user record
         b. Verify current_password: compare bcrypt(input) vs stored hash
         c. Nếu sai -> throw 401 "Current password is incorrect"
         d. Hash new_password bằng bcrypt
         e. Update DB: hashed_password = new hash
         f. **IMPORTANT**: KHLNG revoke tokens (user vao dùng được access_token cũ)
            - UN LIKE forgot_password/reset (là user initiated)
            - Change password = user tự tài khoản cũ -> không can interrupt sessions
      4. Trả về success
    
    Request:
      - current_password: Mật khẩu hiện tại
      - new_password: Mật khẩu mới (phải khác current, min 6 char)
    
    Security:
      - Verify current password: ngăn chặn đổi mật khẩu từ desktop/session không lấy
      - Không revoke tokens: user vẫn cũ logged in
    
    Exceptions:
      - 401 Unauthorized: current_password sai
      - 401 Unauthorized: Không authenticated
      - 400 Bad Request: Validation failure
    """
    await service.change_password(
        user_id=user.id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password changed successfully")
