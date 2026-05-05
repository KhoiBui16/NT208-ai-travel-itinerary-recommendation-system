"""Backward-compatibility shim — auth schemas moved to auth.schemas."""

from src.auth.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

__all__ = [
    "AuthResponse",
    "ForgotPasswordRequest",
    "LoginRequest",
    "LogoutRequest",
    "RefreshRequest",
    "RegisterRequest",
    "ResetPasswordRequest",
    "TokenResponse",
]
