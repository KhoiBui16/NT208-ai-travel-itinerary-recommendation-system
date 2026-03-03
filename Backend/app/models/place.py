"""
============================================
app/models/place.py — Model bảng PLACE (ERD)
============================================
Bảng PLACE theo ERD Database_MVP.png:
  - place_id (PK)
  - place_name
  - category
  - rating
  - popularity_score

Bổ sung thêm cho FE compatibility (Activity interface):
  - description    (FE Activity.description)
  - location       (FE Activity.location — địa chỉ)
  - cost           (FE Activity.cost — chi phí trung bình)
  - duration       (FE Activity.duration — thời gian tham quan)
  - image          (FE Activity.image — URL ảnh)
  - latitude       (FE Activity.coordinates.lat)
  - longitude      (FE Activity.coordinates.lng)
  - destination    (thành phố nào, để filter/group)

Place là bảng CHUNG — 1 Place có thể xuất hiện
trong nhiều Trip khác nhau (qua TripPlace junction).
============================================
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Place(Base):
    """
    SQLAlchemy model cho bảng 'places'.
    Lưu trữ thông tin các địa điểm du lịch.

    Dữ liệu ban đầu được seed từ itinerary.ts (FE mock data)
    và sẽ được AI bổ sung thêm khi tạo lịch trình mới.
    """

    __tablename__ = "places"

    # --- Cột từ ERD ---
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="PLACE.place_id trong ERD",
    )

    # Tên địa điểm (VD: "Phở Bát Đàn", "Bãi biển Mỹ Khê")
    place_name: Mapped[str] = mapped_column(
        String(500), nullable=False, index=True, comment="PLACE.place_name trong ERD"
    )

    # Phân loại: food, sightseeing, culture, nature, shopping, transport, ...
    category: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True, comment="PLACE.category trong ERD"
    )

    # Đánh giá trung bình (1.0 - 5.0)
    rating: Mapped[float | None] = mapped_column(
        Numeric(3, 1), nullable=True, comment="PLACE.rating trong ERD"
    )

    # Độ phổ biến (0.0 - 100.0) — dùng cho AI ranking
    popularity_score: Mapped[float | None] = mapped_column(
        Numeric(5, 1), nullable=True, comment="PLACE.popularity_score trong ERD"
    )

    # --- Cột bổ sung cho FE ---
    # Mô tả địa điểm
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Mô tả chi tiết (FE Activity.description)"
    )

    # Địa chỉ (VD: "49 Bát Đàn, Hoàn Kiếm, Hà Nội")
    location: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="Địa chỉ (FE Activity.location)"
    )

    # Chi phí trung bình (VND)
    cost: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        default=0,
        comment="Chi phí trung bình VND (FE Activity.cost)",
    )

    # Thời gian tham quan (VD: "2 giờ", "1.5 giờ")
    duration: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Thời gian tham quan (FE Activity.duration)"
    )

    # URL ảnh minh họa
    image: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="URL ảnh (FE Activity.image)"
    )

    # Tọa độ GPS
    latitude: Mapped[float | None] = mapped_column(
        Numeric(10, 7), nullable=True, comment="Vĩ độ (FE Activity.coordinates.lat)"
    )

    longitude: Mapped[float | None] = mapped_column(
        Numeric(10, 7), nullable=True, comment="Kinh độ (FE Activity.coordinates.lng)"
    )

    # Thành phố (để filter theo destination)
    destination: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Thuộc thành phố nào (Hà Nội, TP.HCM, ...)",
    )

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="Ngày tạo record"
    )

    # --- Relationship ---
    # 1 Place xuất hiện trong nhiều TripPlace
    trip_places: Mapped[list["TripPlace"]] = relationship(
        "TripPlace",
        back_populates="place",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Place(id={self.id}, name='{self.place_name}', dest='{self.destination}')>"
