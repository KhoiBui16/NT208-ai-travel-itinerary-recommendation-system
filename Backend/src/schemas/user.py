"""User request and response schemas."""

from datetime import datetime

from pydantic import EmailStr, Field

from src.base.schema import CamelCaseModel


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
