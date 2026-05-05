"""Auxiliary trip, share, claim, and ETL tracking ORM models."""

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


class Accommodation(Base):
    """Trip accommodation record."""

    __tablename__ = "accommodations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hotel_id: Mapped[int | None] = mapped_column(ForeignKey("hotels.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    check_in: Mapped[str] = mapped_column(String(20), nullable=False)
    check_out: Mapped[str] = mapped_column(String(20), nullable=False)
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_price: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    booking_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)

    trip: Mapped["Trip"] = relationship(back_populates="accommodations")


class ShareLink(Base):
    """Opaque share token for public read-only trip access."""

    __tablename__ = "share_links"
    __table_args__ = (UniqueConstraint("trip_id", name="uq_share_links_trip_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    permission: Mapped[str] = mapped_column(String(20), default="view", nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="share_link")


class TripRating(Base):
    """User feedback for a generated trip."""

    __tablename__ = "trip_ratings"
    __table_args__ = (
        UniqueConstraint("trip_id", name="uq_trip_ratings_trip_id"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_trip_ratings_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="rating")


class GuestClaimToken(Base):
    """One-time claim token for guest-created trips."""

    __tablename__ = "guest_claim_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    trip: Mapped["Trip"] = relationship(back_populates="claim_tokens")


class ScrapedSource(Base):
    """ETL run tracking — when each source was last crawled.

    Temporary home in itineraries — moves to places/models.py in PR 4.
    """

    __tablename__ = "scraped_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_crawled: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
