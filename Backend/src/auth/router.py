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
    ForgotPasswordResponse,
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

    Tính năng: Đăng ký tài khoản mới
    - Nhận email, mật khẩu, tên, số điện thoại từ client
    - Kiểm tra email chưa tồn tại trong hệ thống
    - Mã hóa mật khẩu và lưu vào database
    - Phát hành cặp token JWT (access + refresh)
    - Trả về thông tin user + tokens cho client lưu
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

    Tính năng: Đăng nhập với email và mật khẩu
    - Kiểm tra email có tồn tại trong database
    - Xác minh mật khẩu (so sánh với hash đã lưu)
    - Kiểm tra tài khoản có đang hoạt động (is_active = true)
    - Phát hành cặp token JWT mới
    - Trả về thông tin user + tokens để client lưu vào localStorage/sessionStorage
    """
    return await service.login(email=body.email, password=body.password)


@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-3: Refresh the JWT pair using a valid refresh token.

    Tính năng: Làm mới token JWT với Token Rotation
    - Nhận refresh token cũ từ client
    - Kiểm tra refresh token có trong database và không bị revoked
    - Lấy thông tin user từ token cũ
    - Đánh dấu refresh token cũ là revoked (Security: ngăn token cũ dùng lại)
    - Phát hành cặp token JWT mới (access token + refresh token mới)
    - Trả về tokens mới cho client cập nhật
    - Lợi ích: Nếu refresh token bị đánh cắp, attacker chỉ có token cũ (đã revoked)
    """
    return await service.refresh(raw_refresh_token=body.refresh_token)


@auth_router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: LogoutRequest,
    _: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-4: Logout by revoking the refresh token.

    Tính năng: Đăng xuất an toàn
    - Yêu cầu user phải đã xác thực (Bearer token hợp lệ)
    - Nhận refresh token từ request body
    - Đánh dấu refresh token là "revoked" trong database
    - Ngăn chặn việc refresh token này được dùng lại
    - Trả về success message, client xóa tokens khỏi storage
    """
    await service.logout(raw_refresh_token=body.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@auth_router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> ForgotPasswordResponse:
    """EP-31: Request a password reset email.

    Tính năng: Yêu cầu đặt lại mật khẩu qua email
    - Nhận email từ client
    - Kiểm tra email có tồn tại trong hệ thống
    - Nếu không tồn tại: trả success response (security: không leak thông tin)
    - Nếu tồn tại: tạo reset token có thời gian hết hạn (vd: 1 giờ)
    - Lưu hash của reset token vào database
    - Gửi email chứa reset token + reset link tới user
    - User nhấp link trong email để truy cập trang reset password
    """
    delivery_mode = await service.forgot_password(email=body.email)

    if delivery_mode == "smtp":
        message = "If the email exists, a reset link has been sent"
    elif delivery_mode == "log_only":
        message = "Password reset links are only logged in this environment"
    else:
        message = "Password reset email delivery is not configured"

    return ForgotPasswordResponse(
        message=message,
        email_delivery_enabled=delivery_mode == "smtp",
        delivery_mode=delivery_mode,
    )


@auth_router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-32: Consume a reset token and set a new password.

    Tính năng: Đặt lại mật khẩu mới bằng reset token
    - Nhận reset token + mật khẩu mới từ client
    - Tìm user có hash token khớp trong database
    - Kiểm tra token không hết hạn (so sánh thời gian)
    - Nếu hết hạn: xóa token khỏi database, báo lỗi
    - Nếu hợp lệ: mã hóa mật khẩu mới, lưu vào user record
    - Xóa reset token khỏi user (đảm bảo token chỉ dùng 1 lần)
    - Revoke tất cả refresh tokens cũ của user (logout tất cả sessions)
    - Trả về success message, user cần đăng nhập lại
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

    Tính năng: Xem hồ sơ cá nhân
    - Yêu cầu Bearer token hợp lệ (get_current_user giải mã và load User)
    - Trả về thông tin public của user: id, email, name, phone, interests, is_active, timestamps
    - Không cần query thêm DB vì user đã được load sẵn bởi get_current_user dependency
    - Hàm này không gọi qua UserService vì là thao tác read-only trực tiếp
    """
    return UserResponse.model_validate(user)


@user_router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(_user_service),
) -> UserResponse:
    """EP-6: Partially update the authenticated user's profile.

    Tính năng: Cập nhật hồ sơ cá nhân
    - Chấp nhận các trường: name (tên), phone (số đt), interests (sở thích)
    - Cả 3 trường đều là optional: chỉ field nào có trong body mới được ghi đè
    - Email và is_active không đổi được qua endpoint này (readonly)
    - UserService.update_profile xử lý logic xây dựng dict updates động
    - Trả về UserResponse mới nhất sau khi cập nhật
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

    Tính năng: Đổi mật khẩu
    - Yêu cầu Bearer token hợp lệ (user phải đang đăng nhập)
    - Xác minh current_password với bcrypt hash trong DB trước khi cho phép đổi
    - new_password phải đạt độ dài tối thiểu (6 ký tự, schema validate)
    - Lưu bcrypt hash của mật khẩu mới vào DB
    - Không revoke refresh tokens hiện có (khác reset-password)
    - Trả về SuccessResponse: client hiển thị thông báo thành công
    """
    await service.change_password(
        user_id=user.id,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password changed successfully")
