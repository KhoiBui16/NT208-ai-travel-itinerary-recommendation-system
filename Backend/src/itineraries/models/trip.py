"""Trip, day, activity, and extra-expense ORM models.

Defines the core trip entity hierarchy:
  Trip → TripDay → Activity → ExtraExpense
                 → ExtraExpense (day-level)

These models form the backbone of the itinerary domain, storing all
user-created and AI-generated trip data. Cascade deletes ensure that
removing a Trip cleans up all nested entities automatically.
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


# ===================================================================
# Trip — Root itinerary entity
# ===================================================================


class Trip(Base):
    """Travel itinerary root entity.

    Represents a complete trip plan including destination, dates, budget,
    and traveler information. Serves as the aggregate root for all nested
    entities (days, activities, accommodations, ratings, share links).

    A trip can be:
    - Manually created (ai_generated=False, empty days)
    - AI-generated (ai_generated=True, pre-populated days/activities)
    - Owned by a user (user_id set) or guest-created (user_id=None)
    """

    __tablename__ = "trips"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Owner (nullable for guest trips) ---
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,  # Indexed for fast user trip listing
    )

    # --- Trip metadata ---
    destination: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trip_name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # --- Budget tracking ---
    budget: Mapped[int] = mapped_column(Integer, nullable=False)  # Total budget in VND
    total_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Calculated sum

    # --- Traveler info ---
    adults_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    children_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Preferences ---
    interests: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    # --- Status and origin ---
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # --- Timestamps ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,  # Indexed for sorting by creation date
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),  # Auto-updated on any trip modification
        nullable=False,
    )

    # --- Relationships ---
    # Owner user (nullable for guest trips)
    user: Mapped["User | None"] = relationship(back_populates="trips")

    # Trip days ordered by day_number; cascade deletes all days when trip is removed
    days: Mapped[list["TripDay"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripDay.day_number",
    )

    # Accommodation bookings for this trip
    accommodations: Mapped[list["Accommodation"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )

    # User rating (one-to-one, at most one rating per trip)
    rating: Mapped["TripRating | None"] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        uselist=False,
    )

    # Share link (one-to-one, at most one active share link per trip)
    share_link: Mapped["ShareLink | None"] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        uselist=False,
    )

    # Guest claim tokens (can have multiple — consumed ones are kept for audit)
    claim_tokens: Mapped[list["GuestClaimToken"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )

    # Companion chat sessions bound to this trip
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
    )


# ===================================================================
# TripDay — A single calendar day in a trip
# ===================================================================


class TripDay(Base):
    """A single day in a trip.

    Groups activities and day-level expenses for a specific date.
    Each day has a unique day_number within its trip (enforced by DB constraint).
    """

    __tablename__ = "trip_days"
    __table_args__ = (
        # Ensures no two days in the same trip share a day_number
        UniqueConstraint("trip_id", "day_number", name="uq_trip_days_trip_number"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent trip reference ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for fast day lookup by trip
    )

    # --- Day metadata ---
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-indexed position
    label: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "Ngày 1", "Day 1"
    date: Mapped[str] = mapped_column(String(20), nullable=False)  # ISO date string
    destination_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Multi-city

    # --- Relationships ---
    # Back-reference to parent trip
    trip: Mapped[Trip] = relationship(back_populates="days")

    # Activities within this day, ordered by order_index for display
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="trip_day",
        cascade="all, delete-orphan",
        order_by="Activity.order_index",
    )

    # Day-level extra expenses (not tied to a specific activity)
    extra_expenses: Mapped[list["ExtraExpense"]] = relationship(
        back_populates="trip_day",
        cascade="all, delete-orphan",
    )


# ===================================================================
# Activity — A scheduled event within a trip day
# ===================================================================


class Activity(Base):
    """A scheduled activity within a trip day.

    Field names are designed to match the FE Activity TypeScript interface
    for seamless serialization via CamelCaseModel schemas.

    An activity optionally references a Place from the DB (via place_id)
    when it was generated from ETL data by the AI pipeline.
    """

    __tablename__ = "activities"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent day reference ---
    trip_day_id: Mapped[int] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for fast activity lookup by day
    )

    # --- Optional reference to a DB place (set by AI pipeline) ---
    place_id: Mapped[int | None] = mapped_column(ForeignKey("places.id"), nullable=True)

    # --- Descriptive info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # Activity display name
    time: Mapped[str] = mapped_column(String(10), nullable=False)  # Start time "HH:mm"
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # End time "HH:mm"
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # Category (food, attraction...)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)  # Address
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)  # Details
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)  # Image URL

    # --- Transportation to this activity ---
    transportation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- Cost breakdown (all amounts in VND) ---
    adult_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Per-adult cost
    child_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Per-child cost
    custom_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Override cost
    bus_ticket_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Bus fare
    taxi_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Taxi fare

    # --- Ordering ---
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Sort position

    # --- Timestamp ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    # Back-reference to parent day
    trip_day: Mapped[TripDay] = relationship(back_populates="activities")

    # Optional link to a Place from the places domain
    place: Mapped["Place | None"] = relationship(back_populates="activities")

    # Activity-level extra expenses
    extra_expenses: Mapped[list["ExtraExpense"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
    )


# ===================================================================
# ExtraExpense — Miscellaneous cost item
# ===================================================================


class ExtraExpense(Base):
    """Extra cost attached to either a day or an activity (exactly one parent).

    The database CHECK constraint ensures mutual exclusivity:
    - activity_id IS NOT NULL AND trip_day_id IS NULL  (activity-level expense)
    - activity_id IS NULL AND trip_day_id IS NOT NULL   (day-level expense)

    This enables the FE budget tracker to itemize costs that don't fit
    into the standard activity price fields.
    """

    __tablename__ = "extra_expenses"
    __table_args__ = (
        # Enforce exactly one parent (activity XOR day)
        CheckConstraint(
            "(activity_id IS NOT NULL AND trip_day_id IS NULL) OR "
            "(activity_id IS NULL AND trip_day_id IS NOT NULL)",
            name="ck_extra_expenses_single_parent",
        ),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent references (exactly one must be set) ---
    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,  # Indexed for efficient cascade lookups
    )
    trip_day_id: Mapped[int | None] = mapped_column(
        ForeignKey("trip_days.id", ondelete="CASCADE"),
        nullable=True,
        index=True,  # Indexed for efficient cascade lookups
    )

    # --- Expense details ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # Display name
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Cost in VND
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # Budget category

    # --- Relationships ---
    # Back-reference to parent activity (if activity-level expense)
    activity: Mapped["Activity | None"] = relationship(back_populates="extra_expenses")
    # Back-reference to parent day (if day-level expense)
    trip_day: Mapped["TripDay | None"] = relationship(back_populates="extra_expenses")
