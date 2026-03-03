"""
============================================
app/models/user.py — Model bảng USER (ERD)
============================================
Bảng USER theo ERD Database_MVP.png:
  - user_id (PK)
  - full_name
  - email (UNIQUE)
  - password
  - role

Bổ sung thêm cho FE compatibility:
  - phone          (FE User interface có phone)
  - interests      (FE User interface có interests)
  - created_at     (FE dùng createdAt)
  - updated_at     (tracking)

Relationship:
  - 1 User có nhiều Trips (1-N)
============================================
"""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """
    SQLAlchemy model cho bảng 'users'.
    Mapped_column là cách khai báo cột mới trong SQLAlchemy 2.0+
    (thay thế Column() cũ, hỗ trợ type hint tốt hơn).
    """

    __tablename__ = "users"

    # --- Cột từ ERD ---
    # UUID tự sinh, dùng làm Primary Key (an toàn hơn auto-increment)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="USER.user_id trong ERD",
    )

    # Họ tên đầy đủ
    full_name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="USER.full_name trong ERD"
    )

    # Email đăng nhập — UNIQUE, không được trùng
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="USER.email trong ERD",
    )

    # Mật khẩu đã hash (KHÔNG lưu plaintext!)
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="USER.password trong ERD (đã hash)"
    )

    # Vai trò: 'user' hoặc 'admin' (ERD có role, MVP#1 chỉ dùng 'user')
    role: Mapped[str] = mapped_column(
        String(50),
        default="user",
        nullable=False,
        comment="USER.role trong ERD — 'user' hoặc 'admin'",
    )

    # --- Cột bổ sung cho FE ---
    # SĐT (FE User interface có phone)
    phone: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="Số điện thoại (FE compatibility)"
    )

    # Sở thích du lịch (FE User interface có interests: string[])
    # ARRAY chỉ PostgreSQL hỗ trợ
    interests: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, comment="Danh sách sở thích (FE compatibility)"
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="Ngày tạo tài khoản"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="Ngày cập nhật gần nhất",
    )

    # --- Relationship ---
    # 1 User -> nhiều Trips (1-N)
    # back_populates: 2 chiều — Trip.user sẽ trỏ ngược về User
    # cascade: xóa User -> xóa tất cả Trips của user đó
    trips: Mapped[list["Trip"]] = relationship(
        "Trip",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",  # Eager loading để tránh N+1 query
    )

    def __repr__(self) -> str:
        """Hiển thị khi debug/print."""
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
