"""Backward-compatibility shim — user schemas moved to auth.schemas."""

from src.auth.schemas import (
    ChangePasswordRequest,
    UpdateProfileRequest,
    UserResponse,
)

__all__ = ["UserResponse", "UpdateProfileRequest", "ChangePasswordRequest"]
