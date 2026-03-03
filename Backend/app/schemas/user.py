"""
============================================
app/schemas/user.py — Schemas cho User
============================================
Map giữa DB model User ↔ FE interface User:

FE (auth.ts):                    DB (models/user.py):
  id: string                      id: UUID
  email: string                   email: str
  name: string                    full_name: str  ← tên khác!
  phone?: string                  phone: str | None
  interests?: string[]            interests: list[str] | None
  createdAt: string               created_at: datetime

Chú ý: FE dùng 'name', DB dùng 'full_name' → alias mapping.
============================================
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserResponse(BaseModel):
    """
    Response trả về FE — khớp với interface User trong auth.ts.
    Dùng alias để map full_name → name, created_at → createdAt.

    model_config:
      - from_attributes=True: cho phép tạo từ SQLAlchemy model
      - populate_by_name=True: cho phép dùng cả tên Python và alias
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: str = Field(
        ...,
        description="User ID (UUID → string cho FE)",
    )
    email: EmailStr = Field(
        ...,
        description="Email",
    )
    name: str = Field(
        ...,
        alias="full_name",
        description="Họ tên — DB: full_name, FE: name",
    )
    phone: str | None = Field(
        default=None,
        description="Số điện thoại",
    )
    interests: list[str] | None = Field(
        default=None,
        description="Sở thích",
    )
    createdAt: str = Field(
        ...,
        alias="created_at",
        description="Ngày tạo — DB: created_at, FE: createdAt",
    )

    @classmethod
    def from_db(cls, user) -> "UserResponse":
        """
        Tạo UserResponse từ SQLAlchemy User model.
        Xử lý chuyển đổi UUID → str, datetime → ISO string.
        """
        return cls(
            id=str(user.id),
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            interests=user.interests,
            created_at=user.created_at.isoformat() if user.created_at else "",
        )


class UserUpdateRequest(BaseModel):
    """
    Schema cho PUT /api/v1/users/profile
    FE gửi các field muốn cập nhật.
    Tương ứng updateUserProfile() trong auth.ts
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Tên mới",
    )
    phone: str | None = Field(
        default=None,
        max_length=20,
        description="SĐT mới",
    )
    interests: list[str] | None = Field(
        default=None,
        description="Sở thích mới",
    )
