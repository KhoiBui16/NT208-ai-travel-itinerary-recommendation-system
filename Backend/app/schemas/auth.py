"""
============================================
app/schemas/auth.py — Schemas cho Authentication
============================================
Pydantic schemas validate dữ liệu input/output cho:
  - Đăng ký (Register)
  - Đăng nhập (Login)
  - JWT Token response

Pydantic v2 dùng model_config thay vì class Config.
============================================
"""

from pydantic import BaseModel, EmailStr, Field


# --- Request schemas (input từ FE) ---


class RegisterRequest(BaseModel):
    """
    Schema cho POST /api/v1/auth/register
    FE gửi: { email, password, name }
    Tương ứng registerUser() trong auth.ts
    """

    email: EmailStr = Field(
        ...,  # Required (bắt buộc)
        description="Email đăng nhập",
        examples=["user@example.com"],
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Mật khẩu (tối thiểu 6 ký tự)",
        examples=["mypassword123"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Họ tên đầy đủ",
        examples=["Nguyễn Văn A"],
    )


class LoginRequest(BaseModel):
    """
    Schema cho POST /api/v1/auth/login
    FE gửi: { email, password }
    Tương ứng loginUser() trong auth.ts
    """

    email: EmailStr = Field(
        ...,
        description="Email đăng nhập",
        examples=["user@example.com"],
    )
    password: str = Field(
        ...,
        description="Mật khẩu",
        examples=["mypassword123"],
    )


# --- Response schemas (output trả về FE) ---


class TokenResponse(BaseModel):
    """
    Response sau khi đăng nhập/đăng ký thành công.
    Chứa JWT access_token để FE gắn vào header Authorization.
    """

    access_token: str = Field(
        ...,
        description="JWT token",
    )
    token_type: str = Field(
        default="bearer",
        description="Loại token (luôn là 'bearer')",
    )


class AuthResponse(BaseModel):
    """
    Response đầy đủ cho register/login.
    Trả về cả token và thông tin user.
    FE mong đợi: { success, user?, error? }
    """

    success: bool = Field(
        ...,
        description="Đăng ký/đăng nhập thành công?",
    )
    access_token: str | None = Field(
        default=None,
        description="JWT token (null nếu thất bại)",
    )
    token_type: str = Field(
        default="bearer",
    )
    user: "UserResponse | None" = Field(
        default=None,
        description="Thông tin user (null nếu thất bại)",
    )
    error: str | None = Field(
        default=None,
        description="Thông báo lỗi (null nếu thành công)",
    )


# Tránh circular import: import UserResponse ở cuối file
from app.schemas.user import UserResponse  # noqa: E402

# Rebuild model sau khi UserResponse available
AuthResponse.model_rebuild()
