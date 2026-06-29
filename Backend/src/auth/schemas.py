"""Auth + User request and response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field

from src.core.schema import CamelCaseModel


class RegisterRequest(CamelCaseModel):
    """Registration request."""

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)


class LoginRequest(CamelCaseModel):
    """Login request."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(CamelCaseModel):
    """Refresh-token request."""

    refresh_token: str = Field(min_length=1)


class LogoutRequest(CamelCaseModel):
    """Logout request."""

    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(CamelCaseModel):
    """Forgot-password request — triggers a reset email."""

    email: EmailStr


class ForgotPasswordResponse(CamelCaseModel):
    """Outcome of a forgot-password request.

    The response stays silent about whether the email exists, but it does
    expose whether this environment can actually deliver reset emails.
    """

    success: bool = True
    message: str
    email_delivery_enabled: bool
    delivery_mode: Literal["smtp", "log_only", "disabled"]


class ResetPasswordRequest(CamelCaseModel):
    """Reset-password request — consumes the reset token."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)


class TokenResponse(CamelCaseModel):
    """Access and refresh token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(CamelCaseModel):
    """Public user profile response."""

    id: int
    email: EmailStr
    name: str
    phone: str | None = None
    interests: list[str] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UpdateProfileRequest(CamelCaseModel):
    """Profile update request."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    interests: list[str] | None = None


class ChangePasswordRequest(CamelCaseModel):
    """Password change request."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class AuthResponse(CamelCaseModel):
    """Auth response with user profile and tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
