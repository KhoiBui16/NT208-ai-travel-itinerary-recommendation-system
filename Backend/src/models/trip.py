"""Trip, day, and activity ORM models."""

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
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
    from src.models.extras import (
        Accommodation,
        ChatSession,
        ExtraExpense,
        GuestClaimToken,
        ShareLink,
        TripRating,
    )
    from src.models.place import Place
    from src.models.user import User


class Trip(Base):
    """Travel itinerary root entity."""

    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    destination: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trip_name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    budget: Mapped[int] = mapped_column(Integer, nullable=False)
    total_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    adults_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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


class TripDay(Base):
    """A single day in a trip."""

    __tablename__ = "trip_days"
    __table_args__ = (UniqueConstraint("trip_id", "day_number", name="uq_trip_days_trip_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    destination_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

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


class Activity(Base):
    """A scheduled activity. Field names must match FE semantics."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_day_id: Mapped[int] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    place_id: Mapped[int | None] = mapped_column(ForeignKey("places.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    transportation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    adult_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    child_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bus_ticket_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    taxi_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip_day: Mapped[TripDay] = relationship(back_populates="activities")
    place: Mapped["Place | None"] = relationship(back_populates="activities")
    extra_expenses: Mapped[list["ExtraExpense"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
    )
