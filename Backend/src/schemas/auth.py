"""Authentication request and response schemas."""

from pydantic import EmailStr, Field

from src.base.schema import CamelCaseModel


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


class TokenResponse(CamelCaseModel):
    """Access and refresh token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(CamelCaseModel):
    """Auth response with user profile and tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


from src.schemas.user import UserResponse  # noqa: E402

AuthResponse.model_rebuild()
