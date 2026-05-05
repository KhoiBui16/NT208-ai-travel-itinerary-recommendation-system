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
    """EP-1: Register a new user account."""
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
    """EP-2: Login with email and password."""
    return await service.login(email=body.email, password=body.password)


@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-3: Refresh the JWT pair using a valid refresh token."""
    return await service.refresh(raw_refresh_token=body.refresh_token)


@auth_router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: LogoutRequest,
    _: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-4: Logout by revoking the refresh token."""
    await service.logout(raw_refresh_token=body.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@auth_router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-31: Request a password reset email."""
    await service.forgot_password(email=body.email)
    return SuccessResponse(
        message="If the email exists, a reset link has been sent",
    )


@auth_router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-32: Consume a reset token and set a new password."""
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
