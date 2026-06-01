"""Auxiliary trip ORM models: accommodation, share, claim, and rating.

These models support trip features beyond the core day/activity structure:
  - Accommodation — Hotel/lodging booking records linked to trip days
  - ShareLink     — Opaque hashed tokens for public read-only trip access
  - TripRating    — User feedback (1-5 stars + optional text) on trips
  - GuestClaimToken — One-time tokens for guest trip ownership transfer
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


# ===================================================================
# Accommodation — Hotel/lodging booking for a trip
# ===================================================================


class Accommodation(Base):
    """Trip accommodation record.

    Represents a hotel or lodging booking associated with a trip.
    Links to specific trip days via the `day_ids` JSON field, allowing
    flexible multi-night stays across different days.

    Can optionally reference a Hotel from the DB (via hotel_id) when
    the AI pipeline assigns a known hotel from ETL data.
    """

    __tablename__ = "accommodations"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent trip reference ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for fast lookup by trip
    )

    # --- Optional hotel reference (from ETL data) ---
    hotel_id: Mapped[int | None] = mapped_column(ForeignKey("hotels.id"), nullable=True)

    # --- Booking details ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # Hotel/accommodation name
    check_in: Mapped[str] = mapped_column(String(20), nullable=False)  # Check-in date/time
    check_out: Mapped[str] = mapped_column(String(20), nullable=False)  # Check-out date/time

    # --- Pricing (all amounts in VND) ---
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Extended booking info ---
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # External link
    booking_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # hourly/nightly
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Number of units booked

    # --- Day association (JSON array of TripDay IDs) ---
    day_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="accommodations")


# ===================================================================
# ShareLink — Public read-only trip access via opaque tokens
# ===================================================================


class ShareLink(Base):
    """Opaque share token for public read-only trip access.

    Security model:
    - Only the hashed token is stored in the database
    - The raw token is returned once when created and cannot be recovered
    - Supports optional expiration and manual revocation
    - One share link per trip (enforced by unique constraint)
    """

    __tablename__ = "share_links"
    __table_args__ = (
        # Only one share link per trip (prevents duplicate links)
        UniqueConstraint("trip_id", name="uq_share_links_trip_id"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Trip reference (one-to-one) ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # --- Token (only hash stored, raw token is ephemeral) ---
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # --- Creator info ---
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Access control ---
    permission: Mapped[str] = mapped_column(String(20), default="view", nullable=False)

    # --- Lifecycle timestamps ---
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,  # None = never expires
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,  # Set when owner revokes the link
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="share_link")


# ===================================================================
# TripRating — User feedback on generated trips
# ===================================================================


class TripRating(Base):
    """User feedback for a generated trip.

    Stores a 1-5 star rating with optional text feedback.
    One rating per trip (enforced by unique constraint).
    Uses upsert semantics at the service layer — calling rate()
    again updates the existing rating.
    """

    __tablename__ = "trip_ratings"
    __table_args__ = (
        # One rating per trip
        UniqueConstraint("trip_id", name="uq_trip_ratings_trip_id"),
        # Rating must be between 1 and 5 (inclusive)
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trip_ratings_rating_range"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Trip reference (one-to-one) ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # --- Rating data ---
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5 stars
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)  # Optional text

    # --- Timestamp ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="rating")


# ===================================================================
# GuestClaimToken — One-time token for guest trip ownership transfer
# ===================================================================


class GuestClaimToken(Base):
    """One-time claim token for guest-created trips.

    Lifecycle:
    1. Created when a guest creates a trip (raw token returned to client)
    2. Stored as hash in DB (raw token cannot be recovered)
    3. Consumed when the guest logs in and calls the claim endpoint
    4. Expires after 24 hours if not consumed

    Consumed tokens are kept in DB for audit trail (consumed_at is set).
    """

    __tablename__ = "guest_claim_tokens"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Trip reference ---
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for lookup by trip
    )

    # --- Token (only hash stored) ---
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # --- Lifecycle timestamps ---
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,  # When the token becomes invalid
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,  # Set when token is used to claim trip
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    trip: Mapped["Trip"] = relationship(back_populates="claim_tokens")
