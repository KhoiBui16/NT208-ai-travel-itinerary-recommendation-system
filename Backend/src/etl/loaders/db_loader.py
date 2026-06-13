"""DB loader for ETL pipeline — upsert places, hotels, and track sources.

Uses SQLAlchemy Core insert().on_conflict_do_update() for idempotent
upserts (INSERT ... ON CONFLICT DO UPDATE).
"""

import logging
from datetime import UTC, datetime

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

# ETL runs outside the FastAPI app bootstrap, so import related ORM modules here
# to register string-based relationships such as Place.activities -> Activity.
import src.auth.models  # noqa: F401
import src.itineraries.models  # noqa: F401
from src.core.slugify import slugify
from src.places.models import Destination, Hotel, Place, ScrapedSource

logger = logging.getLogger(__name__)


async def get_or_create_destination(session: AsyncSession, city: str) -> Destination:
    """Get existing destination or create a new one by name.

    Also creates a slug from the city name for URL-friendly lookups.

    Args:
        session: DB session.
        city: Destination city name.

    Returns:
        Destination ORM instance.
    """
    stmt = select(Destination).where(Destination.name == city)
    result = await session.execute(stmt)
    dest = result.scalar_one_or_none()

    if dest:
        return dest

    slug = _to_slug(city)
    dest = Destination(
        name=city,
        slug=slug,
        description=f"Khám phá {city}",
        image=f"/img/destinations/{slug}.jpg",
        is_active=True,
        last_etl_at=datetime.now(UTC),  # Set on creation
    )
    session.add(dest)
    await session.flush()
    return dest


async def upsert_places(session: AsyncSession, places: list[dict]) -> int:
    """Upsert place records into the database.

    Uses ON CONFLICT (name, destination_id) DO UPDATE to handle
    duplicate runs gracefully.

    Args:
        session: DB session.
        places: List of normalized place dicts.

    Returns:
        Number of records upserted.
    """
    if not places:
        return 0

    count = 0
    for place_data in places:
        city = place_data["destination"]
        dest = await get_or_create_destination(session, city)

        external_id = place_data.get("external_id")
        if external_id:
            existing = await _get_place_by_external_id(session, str(external_id))
            if existing:
                await _update_existing_place(existing, place_data, dest.id)
                count += 1
                continue

        stmt = insert(Place).values(
            destination_id=dest.id,
            name=place_data["name"],
            category=place_data["category"],
            description=place_data.get("description", ""),
            location=place_data.get("location", ""),
            latitude=place_data.get("latitude"),
            longitude=place_data.get("longitude"),
            avg_cost=place_data.get("avg_cost", 0),
            rating=place_data.get("rating", 0),
            review_count=place_data.get("review_count", 0),
            image=place_data.get("image", ""),
            opening_hours=place_data.get("opening_hours"),
            external_id=external_id,
            raw_metadata=place_data.get("raw_metadata"),
            source=place_data.get("source", "etl"),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["name", "destination_id"],
            set_={
                "category": stmt.excluded.category,
                "description": stmt.excluded.description,
                "location": stmt.excluded.location,
                "latitude": stmt.excluded.latitude,
                "longitude": stmt.excluded.longitude,
                "avg_cost": stmt.excluded.avg_cost,
                "rating": stmt.excluded.rating,
                "review_count": stmt.excluded.review_count,
                "image": stmt.excluded.image,
                "opening_hours": stmt.excluded.opening_hours,
                "external_id": stmt.excluded.external_id,
                "raw_metadata": stmt.excluded.raw_metadata,
                "source": stmt.excluded.source,
            },
        )
        await session.execute(stmt)
        count += 1

    await session.flush()

    # Update places_count and last_etl_at on destinations
    for place_data in places:
        city = place_data["destination"]
        dest = await get_or_create_destination(session, city)
        count_stmt = select(Place).where(Place.destination_id == dest.id)
        result = await session.execute(count_stmt)
        dest.places_count = len(result.scalars().all())
        dest.last_etl_at = datetime.now(UTC)

    await session.flush()
    return count


async def _get_place_by_external_id(session: AsyncSession, external_id: str) -> Place | None:
    """Return a place by provider id when ETL source supplies one."""
    result = await session.execute(select(Place).where(Place.external_id == external_id))
    return result.scalar_one_or_none()


async def _update_existing_place(
    place: Place,
    place_data: dict,
    destination_id: int,
) -> None:
    """Update a previously imported place matched by external_id."""
    place.destination_id = destination_id
    place.name = place_data["name"]
    place.category = place_data["category"]
    place.description = place_data.get("description", "")
    place.location = place_data.get("location", "")
    place.latitude = place_data.get("latitude")
    place.longitude = place_data.get("longitude")
    place.avg_cost = place_data.get("avg_cost", 0)
    place.rating = place_data.get("rating", 0)
    place.review_count = place_data.get("review_count", 0)
    place.image = place_data.get("image", "")
    place.opening_hours = place_data.get("opening_hours")
    place.raw_metadata = place_data.get("raw_metadata")
    place.source = place_data.get("source", "etl")


async def upsert_hotels(session: AsyncSession, hotels: list[dict]) -> int:
    """Upsert hotel records into the database.

    Args:
        session: DB session.
        hotels: List of normalized hotel dicts.

    Returns:
        Number of records upserted.
    """
    if not hotels:
        return 0

    count = 0
    for hotel_data in hotels:
        city = hotel_data["destination"]
        dest = await get_or_create_destination(session, city)

        stmt = insert(Hotel).values(
            destination_id=dest.id,
            name=hotel_data["name"],
            price_per_night=hotel_data.get("price_per_night", 0),
            rating=hotel_data.get("rating", 0),
            review_count=hotel_data.get("review_count", 0),
            location=hotel_data.get("location", ""),
            image=hotel_data.get("image", ""),
            amenities=hotel_data.get("amenities", ""),
            description=hotel_data.get("description", ""),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["name", "destination_id"],
            set_={
                "price_per_night": stmt.excluded.price_per_night,
                "rating": stmt.excluded.rating,
                "review_count": stmt.excluded.review_count,
                "amenities": stmt.excluded.amenities,
                "description": stmt.excluded.description,
            },
        )
        await session.execute(stmt)
        count += 1

    await session.flush()

    # Update last_etl_at for destinations with hotels
    cities_updated = set()
    for hotel_data in hotels:
        city = hotel_data["destination"]
        if city not in cities_updated:
            dest = await get_or_create_destination(session, city)
            dest.last_etl_at = datetime.now(UTC)
            cities_updated.add(city)

    await session.flush()
    return count


async def update_source_tracking(
    session: AsyncSession,
    source_name: str,
    city: str | None = None,
    items_count: int = 0,
    status: str = "success",
    error_message: str | None = None,
) -> None:
    """Update scraped_sources table with ETL run metadata.

    Args:
        session: DB session.
        source_name: ETL source name (e.g. "osm_overpass", "goong_geocode").
        city: City that was processed.
        items_count: Number of items loaded.
        status: Run status ("success", "failed", "partial").
        error_message: Error details if failed.
    """
    stmt = insert(ScrapedSource).values(
        source_name=source_name,
        city=city,
        items_count=items_count,
        status=status,
        error_message=error_message,
        last_crawled=datetime.now(UTC),
    )
    await session.execute(stmt)
    await session.flush()


async def invalidate_cache(redis: Redis | None) -> None:
    """Invalidate place/destination caches after ETL run.

    Deletes all Redis keys matching destinations:* and places:*
    so next API requests fetch fresh data from DB.

    Args:
        redis: Redis client (None = no cache to invalidate).
    """
    if not redis:
        return
    try:
        async for key in redis.scan_iter("destinations:*"):
            await redis.delete(key)
        async for key in redis.scan_iter("places:*"):
            await redis.delete(key)
        logger.info("Cache invalidated: destinations:* + places:*")
    except Exception:
        logger.warning("Cache invalidation failed", exc_info=True)


def _to_slug(name: str) -> str:
    """Dùng chung quy tắc slug với runtime backend để tránh lệch ETL/API."""
    return slugify(name)
