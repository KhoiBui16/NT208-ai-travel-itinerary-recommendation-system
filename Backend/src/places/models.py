"""Destination, place, hotel, saved-place, and scraped-source ORM models.

Defines the places domain entity hierarchy:
  Destination → Place  (travel locations within a city)
  Destination → Hotel  (accommodation reference data)
  User → SavedPlace → Place  (user bookmark/favorites)
  ScrapedSource        (ETL run tracking metadata)

These models are populated primarily through the Goong ETL pipeline
and serve as reference data for both user browsing and AI itinerary generation.
"""

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
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if TYPE_CHECKING:
    from src.auth.models import User
    from src.itineraries.models.trip import Activity


# ===================================================================
# Destination — Travel destination / city
# ===================================================================


class Destination(Base):
    """Travel destination/city — top-level geographic entity.

    Represents a city or region that contains places and hotels.
    Destinations are created and updated by the ETL pipeline.

    The `is_active` flag controls visibility in the API — inactive
    destinations are hidden from users but retained in the database.

    The `places_count` field is a denormalized counter maintained by
    the ETL pipeline for efficient sorting/filtering without JOINs.
    """

    __tablename__ = "destinations"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Identity ---
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # Display name
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # URL-safe slug

    # --- Description and media ---
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)  # Cover image URL

    # --- Geographic coordinates ---
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Status and counters ---
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    places_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Denormalized

    # --- ETL tracking ---
    last_etl_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,  # Last ETL pipeline run for this destination
    )

    # --- Relationships ---
    places: Mapped[list["Place"]] = relationship(back_populates="destination")
    hotels: Mapped[list["Hotel"]] = relationship(back_populates="destination")


# ===================================================================
# Place — Searchable travel location
# ===================================================================


class Place(Base):
    """Searchable travel place from seed/ETL sources.

    Represents a specific location (restaurant, attraction, park, etc.)
    within a destination city. Places are the primary data source for:
    - User browsing (search, filter by city/category)
    - AI itinerary generation (LLM context)
    - Activity suggestions (alternative recommendations)

    The `external_id` stores the Goong/Google Place ID for deduplication
    during ETL runs. The `raw_metadata` JSONB field preserves the original
    API response for potential future enrichment.
    """

    __tablename__ = "places"
    __table_args__ = (
        # Prevent duplicate places within the same destination
        UniqueConstraint("name", "destination_id", name="uq_places_name_dest"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent destination ---
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for fast destination-scoped queries
    )

    # --- Descriptive info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)  # Searchable name
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # food/attraction
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)  # Address text

    # --- Geographic coordinates ---
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Pricing and quality ---
    avg_cost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Average cost in VND
    rating: Mapped[float] = mapped_column(Float, default=0, nullable=False)  # 0-5 star rating
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # --- Media ---
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)  # Photo URL

    # --- Extended info ---
    opening_hours: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- ETL metadata ---
    external_id: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        index=True,  # Goong/Google Place ID for deduplication
    )
    raw_metadata: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,  # Original API response preserved for enrichment
    )
    source: Mapped[str] = mapped_column(
        String(30),
        default="seed",
        nullable=False,  # Data origin: "seed", "goong", etc.
    )

    # --- Timestamp ---
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),  # Auto-updated when place data is modified
        nullable=False,
    )

    # --- Relationships ---
    destination: Mapped[Destination] = relationship(back_populates="places")
    activities: Mapped[list["Activity"]] = relationship(back_populates="place")
    saved_by: Mapped[list["SavedPlace"]] = relationship(back_populates="place")  # User bookmarks


# ===================================================================
# Hotel — Accommodation reference data
# ===================================================================


class Hotel(Base):
    """Hotel reference data from ETL sources.

    Stores hotel information used for:
    - AI itinerary generation (accommodation suggestions in LLM context)
    - Destination detail pages (hotel listings)
    - Accommodation records within trips (via hotel_id FK)

    Hotels are deduplicated by (name, destination_id) unique constraint.
    """

    __tablename__ = "hotels"
    __table_args__ = (
        # Prevent duplicate hotels within the same destination
        UniqueConstraint("name", "destination_id", name="uq_hotels_name_dest"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Parent destination ---
    destination_id: Mapped[int] = mapped_column(
        ForeignKey("destinations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Hotel info ---
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    price_per_night: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # VND
    rating: Mapped[float] = mapped_column(Float, default=0, nullable=False)  # 0-5 stars
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    location: Mapped[str] = mapped_column(String(300), default="", nullable=False)  # Address
    image: Mapped[str] = mapped_column(String(500), default="", nullable=False)  # Photo URL
    booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # External booking

    # --- Rich text fields ---
    amenities: Mapped[str] = mapped_column(Text, default="", nullable=False)  # Comma-separated
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # --- Relationships ---
    destination: Mapped[Destination] = relationship(back_populates="hotels")


# ===================================================================
# SavedPlace — User bookmark for favorite places
# ===================================================================


class SavedPlace(Base):
    """User bookmark for a place (favorites feature).

    Allows authenticated users to save places for later reference.
    Each (user_id, place_id) pair is unique — a user can't save
    the same place twice (enforced by DB constraint).
    """

    __tablename__ = "saved_places"
    __table_args__ = (
        # Prevent duplicate bookmarks for the same user + place
        UniqueConstraint("user_id", "place_id", name="uq_saved_places_user_place"),
    )

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- User who saved this place ---
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for fast bookmark listing by user
    )

    # --- Saved place reference ---
    place_id: Mapped[int] = mapped_column(
        ForeignKey("places.id", ondelete="CASCADE"),
        nullable=False,
        index=True,  # Indexed for checking if a place is already saved
    )

    # --- Timestamp ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    user: Mapped["User"] = relationship(back_populates="saved_places")
    place: Mapped[Place] = relationship(back_populates="saved_by")


# ===================================================================
# ScrapedSource — ETL run tracking metadata
# ===================================================================


class ScrapedSource(Base):
    """ETL run tracking — records when each data source was last crawled.

    Used to track ETL pipeline execution status per source and city.
    Helps avoid redundant crawls and provides audit trail for data freshness.
    """

    __tablename__ = "scraped_sources"

    # --- Primary key ---
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # --- Source identification ---
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "goong"
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Target city name
    url: Mapped[str | None] = mapped_column(Text, nullable=True)  # Source URL if applicable

    # --- Crawl results ---
    last_crawled: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Places found
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # Status
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)  # Error details

    # --- Timestamp ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
