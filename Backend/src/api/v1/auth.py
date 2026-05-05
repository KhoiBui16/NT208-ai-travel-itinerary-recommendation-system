"""Auth endpoints: register, login, refresh, logout, forgot-password, reset-password.

EP-1:  POST /api/v1/auth/register         — Create account + receive JWT pair
EP-2:  POST /api/v1/auth/login            — Verify credentials + receive JWT pair
EP-3:  POST /api/v1/auth/refresh          — Rotate refresh token + receive new JWT pair
EP-4:  POST /api/v1/auth/logout           — Revoke refresh token (requires Bearer auth)
EP-31: POST /api/v1/auth/forgot-password  — Request password reset email
EP-32: POST /api/v1/auth/reset-password   — Consume reset token + set new password
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.core.schema import SuccessResponse
from src.models.user import User
from src.repositories.token_repo import RefreshTokenRepository
from src.repositories.user_repo import UserRepository
from src.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from src.services.auth_service import AuthService
from src.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """DI factory: create AuthService with fresh repo instances per request."""
    return AuthService(
        user_repo=UserRepository(db),
        token_repo=RefreshTokenRepository(db),
        email_service=EmailService(),
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-1: Register a new user account.

    Args:
        body: RegisterRequest with email, password, name, optional phone.
        service: AuthService injected per request.

    Returns:
        AuthResponse with accessToken, refreshToken, and user profile.

    Raises:
        409 Conflict: Email already registered.
        422 Validation: Missing/invalid fields.
    """
    return await service.register(
        email=body.email,
        password=body.password,
        name=body.name,
        phone=body.phone,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-2: Login with email and password.

    Args:
        body: LoginRequest with email and password.
        service: AuthService injected per request.

    Returns:
        AuthResponse with accessToken, refreshToken, and user profile.

    Raises:
        401 Unauthorized: Invalid credentials or deactivated account.
        422 Validation: Missing fields.
    """
    return await service.login(email=body.email, password=body.password)


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
) -> AuthResponse:
    """EP-3: Refresh the JWT pair using a valid refresh token.

    The old refresh token is revoked (rotation) and a new pair is issued.

    Args:
        body: RefreshRequest with refreshToken.
        service: AuthService injected per request.

    Returns:
        AuthResponse with new accessToken, new refreshToken, and user profile.

    Raises:
        401 Unauthorized: Invalid or revoked refresh token.
    """
    return await service.refresh(raw_refresh_token=body.refresh_token)


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: LogoutRequest,
    _: User = Depends(get_current_user),
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-4: Logout by revoking the refresh token.

    Requires Bearer auth to confirm identity, then revokes the
    provided refresh token so it cannot be used again.

    Args:
        body: LogoutRequest with refreshToken to revoke.
        _: Current user (auth required but not used directly).
        service: AuthService injected per request.

    Returns:
        SuccessResponse confirming logout.
    """
    await service.logout(raw_refresh_token=body.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-31: Request a password reset email.

    Always returns success even if the email does not exist,
    to prevent email enumeration attacks.

    Args:
        body: ForgotPasswordRequest with email.
        service: AuthService injected per request.

    Returns:
        SuccessResponse confirming the request was processed.
    """
    await service.forgot_password(email=body.email)
    return SuccessResponse(
        message="If the email exists, a reset link has been sent",
    )


@router.post("/reset-password", response_model=SuccessResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(_auth_service),
) -> SuccessResponse:
    """EP-32: Consume a reset token and set a new password.

    After a successful reset, all refresh tokens are revoked — the user
    must log in again on all devices.

    Args:
        body: ResetPasswordRequest with token and newPassword.
        service: AuthService injected per request.

    Returns:
        SuccessResponse confirming the password was changed.

    Raises:
        401 Unauthorized: Invalid, expired, or already-used reset token.
    """
    await service.reset_password(
        raw_token=body.token,
        new_password=body.new_password,
    )
    return SuccessResponse(message="Password has been reset successfully")
