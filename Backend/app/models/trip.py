"""
============================================
app/models/trip.py — Model bảng TRIP (ERD)
============================================
Bảng TRIP theo ERD Database_MVP.png:
  - trip_id (PK)
  - user_id (FK → USER)
  - destination
  - total_days
  - budget

Bổ sung thêm cho FE compatibility:
  - start_date, end_date   (FE Itinerary interface)
  - interests              (FE gửi sở thích khi tạo trip)
  - total_cost             (FE tính tổng chi phí)
  - score                  (điểm AI tối ưu 0-100)
  - rating                 (user đánh giá 1-5 sao)
  - feedback               (user nhận xét)
  - created_at, updated_at (tracking)

Relationships:
  - N-1 với User (mỗi Trip thuộc 1 User)
  - N-N với Place thông qua TripPlace
============================================
"""

import uuid
from datetime import date, datetime

from sqlalchemy import String, Integer, Numeric, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Trip(Base):
    """
    SQLAlchemy model cho bảng 'trips'.
    Tương ứng bảng TRIP trong ERD.
    FE gọi là 'Itinerary' — API layer sẽ mapping tên.
    """

    __tablename__ = "trips"

    # --- Cột từ ERD ---
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="TRIP.trip_id trong ERD",
    )

    # FK đến bảng users — NULLABLE cho khách (guest)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="TRIP.user_id FK → USER (NULL = guest)",
    )

    # Điểm đến (TP.HCM, Hà Nội, Đà Nẵng, ...)
    destination: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True, comment="TRIP.destination trong ERD"
    )

    # Tổng số ngày du lịch
    total_days: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="TRIP.total_days trong ERD"
    )

    # Ngân sách (VND) — Numeric(15,2) cho số tiền lớn
    budget: Mapped[float] = mapped_column(
        Numeric(15, 2), nullable=False, comment="TRIP.budget trong ERD (VND)"
    )

    # --- Cột bổ sung cho FE ---
    # Ngày bắt đầu / kết thúc (FE Itinerary.startDate, endDate)
    start_date: Mapped[date] = mapped_column(
        Date, nullable=False, comment="Ngày bắt đầu (FE compatibility)"
    )

    end_date: Mapped[date] = mapped_column(
        Date, nullable=False, comment="Ngày kết thúc (FE compatibility)"
    )

    # Sở thích cho chuyến đi này (FE Itinerary.interests)
    interests: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True, comment="Sở thích du lịch cho trip này"
    )

    # Tổng chi phí thực tế (tính từ activities)
    total_cost: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        default=0,
        comment="Tổng chi phí (FE compatibility)",
    )

    # Điểm tối ưu từ AI (0-100)
    score: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Điểm AI scoring (0-100)"
    )

    # Đánh giá của user (1-5 sao)
    rating: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Rating 1-5 sao (FE compatibility)"
    )

    # Nhận xét của user
    feedback: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Feedback text (FE compatibility)"
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="Ngày tạo trip"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="Ngày cập nhật gần nhất",
    )

    # --- Relationships ---
    # N-1: Trip thuộc về 1 User
    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="trips",
    )

    # 1-N: Trip có nhiều TripPlace (junction table)
    trip_places: Mapped[list["TripPlace"]] = relationship(
        "TripPlace",
        back_populates="trip",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="TripPlace.day_number, TripPlace.visit_order",
    )

    def __repr__(self) -> str:
        return f"<Trip(id={self.id}, destination='{self.destination}', days={self.total_days})>"
