"""User and refresh-token ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if TYPE_CHECKING:
    from src.itineraries.models.chat import ChatSession
    from src.itineraries.models.trip import Trip
    from src.places.models import SavedPlace


class User(Base):
    """Application user."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # === Password Reset Token (EP-31/EP-32) ===
    # password_reset_token_hash: SHA-256 hash của reset token (1 lần dùng)
    #   - Tạo khi user yêu cầu forgot-password
    #   - Xoá khi reset-password được consume hoặc hết hạn
    # password_reset_expires_at: Thời gian hết hạn (mặc định 1 giờ)
    #   - Kiểm tra khi user gọi reset-password
    #   - Nếu hết hạn: token không hợp lệ, xoá khỏi DB
    password_reset_token_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    trips: Mapped[list["Trip"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_places: Mapped[list["SavedPlace"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user")


class RefreshToken(Base):
    """Hashed refresh token used for server-side revoke/logout.
    
    Mô tả:
      - Mỗi user có thể có nhiều refresh tokens (multi-device login)
      - Token được hash SHA-256 trước lưu (không lưu raw)
      - Mỗi token có expires_at (mặc định 7 ngày)
      - is_revoked = True khi: logout hoặc token rotation
    
    Token Lifecycle:
      1. User login/register → create RefreshToken mới
      2. Client nhận raw token, lưu ở localStorage
      3. Access token hết hạn → gọi refresh endpoint
      4. Server revoke token cũ (is_revoked=True) + tạo token mới
      5. Logout → revoke token (is_revoked=True)
      6. Reset password → revoke tất cả token
      7. Expired token tự động bị bỏ (cleanup batch job future)
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="refresh_tokens")
