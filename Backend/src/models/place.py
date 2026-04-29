"""Destination, place, hotel, and saved-place ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
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
    from src.models.trip import Activity
    from src.models.user import User


class Destination(Base):
    """Travel destination/city."""

    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    places_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_etl_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    places: Mapped[list["Place"]] = relationship(back_populates="destination")
    hotels: Mapped[list["Hotel"]] = relationship(back_populates="destination")


class Place(Base):
    """Searchable travel place from seed/ETL sources."""

    __tablename__ = "places"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    opening_hours: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="seed", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    destination: Mapped[Destination] = relationship(back_populates="places")
    activities: Mapped[list["Activity"]] = relationship(back_populates="place")
    saved_by: Mapped[list["SavedPlace"]] = relationship(back_populates="place")


class Hotel(Base):
    """Hotel reference data."""

    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    amenities: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    destination: Mapped[Destination] = relationship(back_populates="hotels")


class SavedPlace(Base):
    """User bookmark for a place."""

    __tablename__ = "saved_places"
    __table_args__ = (UniqueConstraint("user_id", "place_id", name="uq_saved_places_user_place"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="saved_places")
    place: Mapped[Place] = relationship(back_populates="saved_by")
