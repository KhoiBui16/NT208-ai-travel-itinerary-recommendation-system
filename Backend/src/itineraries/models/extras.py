"""Trip auxiliary ORM models.

Chứa các entity phụ trợ cho nhóm Trip:
  • Accommodation    — Thông tin chỗ ở trong chuyến đi, bảng `accommodations`
  • ShareLink        — Token chia sẻ lịch trình công khai, bảng `share_links`
  • TripRating       — Đánh giá lịch trình (1-5 sao), bảng `trip_ratings`
  • GuestClaimToken  — Token claim trip cho guest, bảng `guest_claim_tokens`
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if TYPE_CHECKING:
    from src.itineraries.models.trip import Trip


# ---------------------------------------------------------------------------
# Accommodation — Chỗ ở trong chuyến đi
# ---------------------------------------------------------------------------


class Accommodation(Base):
    """Thông tin chỗ ở (khách sạn, homestay, ...) trong chuyến đi.

    Table: ``accommodations``

    Mỗi accommodation thuộc về 1 Trip, có thể link tới Hotel entity.
    ``day_ids`` lưu danh sách ID các ngày sử dụng chỗ ở này.

    Loại booking (booking_type): hourly, nightly, daily
    """

    __tablename__ = "accommodations"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign keys ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hotel_id: Mapped[int | None] = mapped_column(ForeignKey("hotels.id"), nullable=True)

    # --- Accommodation info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    check_in: Mapped[str] = mapped_column(String(20), nullable=False)
    check_out: Mapped[str] = mapped_column(String(20), nullable=False)

    # --- Pricing (đơn vị: VNĐ) ---
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Booking config ---
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # hourly|nightly|daily
    booking_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Số đêm/giờ/ngày
    # IDs các ngày sử dụng
    day_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="accommodations")


# ---------------------------------------------------------------------------
# ShareLink — Token chia sẻ lịch trình công khai (EP-15)
# ---------------------------------------------------------------------------


class ShareLink(Base):
    """Token chia sẻ lịch trình qua link công khai (read-only).

    Table: ``share_links``
    Constraints:
      • UNIQUE(trip_id) — mỗi trip chỉ có tối đa 1 share link active
      • token_hash UNIQUE — không trùng token

    Flow: Owner share → tạo opaque token → hash lưu DB → gửi raw token cho FE
    Người nhận dùng raw token để truy cập trip read-only.
    Có thể revoke (set revoked_at) hoặc set expires_at.
    """

    __tablename__ = "share_links"
    __table_args__ = (UniqueConstraint("trip_id", name="uq_share_links_trip_id"),)

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign key → Trip ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # --- Token & permission ---
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Hiện tại chỉ "view"
    permission: Mapped[str] = mapped_column(String(20), default="view", nullable=False)

    # --- Lifecycle timestamps ---
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="share_link")


# ---------------------------------------------------------------------------
# TripRating — Đánh giá lịch trình (1-5 sao)
# ---------------------------------------------------------------------------


class TripRating(Base):
    """Đánh giá lịch trình từ user (1-5 sao + feedback text).

    Table: ``trip_ratings``
    Constraints:
      • UNIQUE(trip_id) — mỗi trip chỉ có 1 rating (upsert pattern)
      • CHECK(rating >= 1 AND rating <= 5)
    """

    __tablename__ = "trip_ratings"
    __table_args__ = (
        UniqueConstraint("trip_id", name="uq_trip_ratings_trip_id"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trip_ratings_rating_range"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign key → Trip ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # --- Rating data ---
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5 sao
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)  # Nhận xét tùy chọn

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="rating")


# ---------------------------------------------------------------------------
# GuestClaimToken — Token claim trip cho guest
# ---------------------------------------------------------------------------


class GuestClaimToken(Base):
    """Token một lần để guest claim ownership trip sau khi đăng nhập.

    Table: ``guest_claim_tokens``

    Flow: Guest tạo trip → nhận claim_token → đăng nhập → gọi POST /claim
    → verify token → transfer trip.user_id → consumed_at = now()

    Token có thời hạn (expires_at) và chỉ dùng được 1 lần (consumed_at).
    """

    __tablename__ = "guest_claim_tokens"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign key → Trip ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Token data ---
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # --- Lifecycle ---
    # Hết hạn sau 24h
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # NULL = chưa dùng
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="claim_tokens")
