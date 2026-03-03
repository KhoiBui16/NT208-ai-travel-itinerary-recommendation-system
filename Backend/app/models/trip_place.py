"""
============================================
app/models/trip_place.py — Model bảng TRIP_PLACE (ERD)
============================================
Bảng TRIP_PLACE theo ERD Database_MVP.png:
  - trip_place_id (PK)
  - trip_id (FK → TRIP)
  - place_id (FK → PLACE)
  - day_number
  - visit_order

Bổ sung thêm cho FE compatibility (Activity interface):
  - time           (FE Activity.time — giờ tham quan)
  - custom_cost    (chi phí riêng cho lần visit này)
  - notes          (ghi chú riêng)

Đây là bảng JUNCTION (bảng trung gian) cho quan hệ N-N:
  - 1 Trip có nhiều Place (qua TripPlace)
  - 1 Place thuộc nhiều Trip (qua TripPlace)

Khi FE cần danh sách activities theo ngày:
  SELECT tp.*, p.* FROM trip_places tp
  JOIN places p ON tp.place_id = p.id
  WHERE tp.trip_id = :trip_id
  ORDER BY tp.day_number, tp.visit_order
============================================
"""

import uuid
from datetime import datetime

from sqlalchemy import Integer, String, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TripPlace(Base):
    """
    SQLAlchemy model cho bảng 'trip_places'.
    Junction table — mỗi row = 1 lần visit 1 Place trong 1 Trip.

    VD: Trip "Hà Nội 3 ngày" có TripPlace rows:
      - day 1, order 1: Phở Bát Đàn
      - day 1, order 2: Hồ Hoàn Kiếm
      - day 2, order 1: Lăng Bác
      ...
    """

    __tablename__ = "trip_places"

    # --- Cột từ ERD ---
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="TRIP_PLACE.trip_place_id trong ERD",
    )

    # FK đến bảng trips
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="TRIP_PLACE.trip_id FK → TRIP",
    )

    # FK đến bảng places
    place_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("places.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="TRIP_PLACE.place_id FK → PLACE",
    )

    # Ngày thứ mấy trong chuyến đi (1, 2, 3, ...)
    day_number: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="TRIP_PLACE.day_number trong ERD"
    )

    # Thứ tự tham quan trong ngày (1, 2, 3, ...)
    visit_order: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="TRIP_PLACE.visit_order trong ERD"
    )

    # --- Cột bổ sung cho FE ---
    # Giờ tham quan (VD: "08:00", "14:30")
    time: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="Giờ tham quan (FE Activity.time)"
    )

    # Chi phí riêng cho lần visit này (override Place.cost)
    # VD: Place "Phở Bát Đàn" cost = 50k, nhưng trip này gọi 2 tô = 100k
    custom_cost: Mapped[float | None] = mapped_column(
        Numeric(15, 2), nullable=True, comment="Chi phí tùy chỉnh (override Place.cost)"
    )

    # Ghi chú riêng cho hoạt động này
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Ghi chú (VD: 'đặt bàn trước')"
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="Ngày tạo record"
    )

    # --- Relationships ---
    # N-1: TripPlace thuộc về 1 Trip
    trip: Mapped["Trip"] = relationship(
        "Trip",
        back_populates="trip_places",
    )

    # N-1: TripPlace tham chiếu 1 Place
    place: Mapped["Place"] = relationship(
        "Place",
        back_populates="trip_places",
    )

    def __repr__(self) -> str:
        return (
            f"<TripPlace(trip={self.trip_id}, place={self.place_id}, "
            f"day={self.day_number}, order={self.visit_order})>"
        )
