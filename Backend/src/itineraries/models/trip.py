"""Trip core ORM models.

Chứa các entity chính của nhóm Trip:
  • Trip        — Lịch trình du lịch (root entity), bảng `trips`
  • TripDay     — Một ngày trong lịch trình, bảng `trip_days`
  • Activity    — Hoạt động trong ngày, bảng `activities`
  • ExtraExpense — Chi phí phát sinh (cấp activity hoặc cấp day), bảng `extra_expenses`

Quan hệ: Trip → TripDay → Activity → ExtraExpense
                TripDay → ExtraExpense (day-level)
"""

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
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
    from src.auth.models import User
    from src.itineraries.models.extras import (
        Accommodation,
        ChatSession,
        ExtraExpense,
        GuestClaimToken,
        ShareLink,
        TripRating,
    )
    from src.places.models import Place


# ---------------------------------------------------------------------------
# Trip — Lịch trình du lịch (root entity)
# ---------------------------------------------------------------------------


class Trip(Base):
    """Lịch trình du lịch — root entity.

    Table: ``trips``

    Mỗi Trip thuộc về một User (hoặc NULL nếu guest tạo chưa claim).
    Chứa thông tin tổng quan: điểm đến, ngân sách, số người, sở thích.
    Có thể được tạo thủ công (manual) hoặc bởi AI (ai_generated=True).

    Relationships:
      • days          → TripDay[]        (cascade delete)
      • accommodations → Accommodation[] (cascade delete)
      • rating        → TripRating       (1-1, cascade delete)
      • share_link    → ShareLink        (1-1, cascade delete)
      • claim_tokens  → GuestClaimToken[] (cascade delete)
      • chat_sessions → ChatSession[]    (cascade delete)
    """

    __tablename__ = "trips"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Owner (nullable cho guest-created trips) ---
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # --- Trip metadata ---
    destination: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trip_name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # --- Budget & cost ---
    budget: Mapped[int] = mapped_column(Integer, nullable=False)
    total_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Traveler info ---
    adults_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Preferences ---
    interests: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    # --- Status & flags ---
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    user: Mapped["User | None"] = relationship(back_populates="trips")
    days: Mapped[list["TripDay"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripDay.day_number",
    )
    accommodations: Mapped[list["Accommodation"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )
    rating: Mapped["TripRating | None"] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        uselist=False,
    )
    share_link: Mapped["ShareLink | None"] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        uselist=False,
    )
    claim_tokens: Mapped[list["GuestClaimToken"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# TripDay — Một ngày trong lịch trình
# ---------------------------------------------------------------------------


class TripDay(Base):
    """Một ngày cụ thể trong lịch trình.

    Table: ``trip_days``
    Constraint: UNIQUE(trip_id, day_number) — mỗi trip không thể có 2 ngày trùng số.

    Relationships:
      • trip           → Trip           (many-to-one)
      • activities     → Activity[]     (cascade delete, sắp xếp theo order_index)
      • extra_expenses → ExtraExpense[] (cascade delete, chi phí cấp ngày)
    """

    __tablename__ = "trip_days"
    __table_args__ = (UniqueConstraint("trip_id", "day_number", name="uq_trip_days_trip_number"),)

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign key → Trip ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Day info ---
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    destination_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- Relationships ---
    trip: Mapped[Trip] = relationship(back_populates="days")
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="trip_day",
        cascade="all, delete-orphan",
        order_by="Activity.order_index",
    )
    extra_expenses: Mapped[list["ExtraExpense"]] = relationship(
        back_populates="trip_day",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# Activity — Hoạt động trong ngày
# ---------------------------------------------------------------------------


class Activity(Base):
    """Một hoạt động được lên lịch trong ngày.

    Table: ``activities``
    Field names match FE semantics (camelCase mapping via CamelCaseModel).

    Loại hoạt động (type): food, attraction, nature, entertainment, shopping
    Phương tiện (transportation): walk, bike, bus, taxi

    Relationships:
      • trip_day       → TripDay        (many-to-one)
      • place          → Place          (many-to-one, optional — link tới DB place)
      • extra_expenses → ExtraExpense[] (cascade delete, chi phí phát sinh)
    """

    __tablename__ = "activities"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Foreign keys ---
    trip_day_id: Mapped[int] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    place_id: Mapped[int | None] = mapped_column(ForeignKey("places.id"), nullable=True)

    # --- Activity info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    transportation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- Cost fields (đơn vị: VNĐ) ---
    adult_price: Mapped[int | None] = mapped_column(Integer, nullable=True)      # Giá vé/ăn người lớn
    child_price: Mapped[int | None] = mapped_column(Integer, nullable=True)      # Giá vé/ăn trẻ em
    custom_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)      # Chi phí tùy chỉnh (shopping, entertainment)
    bus_ticket_price: Mapped[int | None] = mapped_column(Integer, nullable=True) # Giá vé xe buýt/người
    taxi_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)        # Tổng chi phí taxi

    # --- Ordering ---
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip_day: Mapped[TripDay] = relationship(back_populates="activities")
    place: Mapped["Place | None"] = relationship(back_populates="activities")
    extra_expenses: Mapped[list["ExtraExpense"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# ExtraExpense — Chi phí phát sinh (cấp activity hoặc cấp day)
# ---------------------------------------------------------------------------


class ExtraExpense(Base):
    """Chi phí phát sinh — có thể thuộc về Activity HOẶC TripDay (không cả hai).

    Table: ``extra_expenses``
    Constraint: CHECK — chỉ một trong activity_id hoặc trip_day_id được NOT NULL.

    Category: food, attraction, entertainment, transportation, shopping
    """

    __tablename__ = "extra_expenses"
    __table_args__ = (
        # Đảm bảo mỗi expense chỉ thuộc về 1 parent (activity XOR day)
        CheckConstraint(
            "(activity_id IS NOT NULL AND trip_day_id IS NULL) OR "
            "(activity_id IS NULL AND trip_day_id IS NOT NULL)",
            name="ck_extra_expenses_single_parent",
        ),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent foreign keys (mutually exclusive) ---
    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    trip_day_id: Mapped[int | None] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # --- Expense info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)       # Đơn vị: VNĐ
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # food|attraction|entertainment|transportation|shopping

    # --- Relationships ---
    activity: Mapped["Activity | None"] = relationship(back_populates="extra_expenses")
    trip_day: Mapped["TripDay | None"] = relationship(back_populates="extra_expenses")
