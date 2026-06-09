"""Place and destination data access repository.

Provides query operations for:
  - Destination — City browsing with aggregate counts
  - Place       — Search, filter, and detail queries
  - Hotel       — Hotel listings by destination
  - SavedPlace  — User bookmark CRUD operations

All queries use async SQLAlchemy and return ORM objects or raw results.
Methods call flush() after mutations to synchronize with the database.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.places.models import Destination, Hotel, Place, SavedPlace


class PlaceRepository:
    """Data access layer for Place, Destination, Hotel, and SavedPlace.

    Encapsulates raw SQLAlchemy queries behind a clean async interface.
    All methods operate on the injected session.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ===================================================================
    # Destination — City-level queries
    # ===================================================================

    async def get_destinations(self) -> list[Destination]:
        """Get all active destinations, ordered alphabetically.

        Only returns destinations with is_active=True.
        """
        stmt = select(Destination).where(Destination.is_active.is_(True)).order_by(Destination.name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_destinations_with_counts(self) -> list[dict]:
        """Get destinations with places and hotels counts in a single query.

        Uses LEFT OUTER JOINs with DISTINCT counts to avoid
        inflated numbers from the cross-join of places × hotels.

        Returns dicts (not ORM objects) for flexible serialization.
        """
        stmt = (
            select(
                Destination.id,
                Destination.name,
                Destination.slug,
                Destination.description,
                Destination.image,
                Destination.latitude,
                Destination.longitude,
                func.count(func.distinct(Place.id)).label("places_count"),
                func.count(func.distinct(Hotel.id)).label("hotels_count"),
            )
            .outerjoin(Place, Place.destination_id == Destination.id)
            .outerjoin(Hotel, Hotel.destination_id == Destination.id)
            .where(Destination.is_active.is_(True))
            .group_by(Destination.id)
            .order_by(Destination.name)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            {
                "id": row.id,
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "image": row.image,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "places_count": row.places_count or 0,
                "hotels_count": row.hotels_count or 0,
            }
            for row in rows
        ]

    async def get_destination_by_slug(self, slug: str) -> Destination | None:
        """Look up a destination by its URL-safe slug."""
        stmt = select(Destination).where(Destination.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_destination_by_name(self, name: str) -> Destination | None:
        """Look up a destination by its display name (case-insensitive).

        BUG-BE-003 fix: Changed from exact match to case-insensitive match
        to handle variations like "Ha Noi" vs "Hà Nội".
        """
        from sqlalchemy import func

        stmt = select(Destination).where(func.lower(Destination.name) == func.lower(name))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_destination_by_fuzzy(self, name: str) -> Destination | None:
        """Fuzzy match destination name using ILIKE (BUG-BE-003 fix)."""
        stmt = (
            select(Destination)
            .where(Destination.name.ilike(f"%{name}%"))
            .order_by(Destination.places_count.desc().nulls_last())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # ===================================================================
    # Place — Search, filter, and detail queries
    # ===================================================================

    async def get_by_id(self, place_id: int) -> Place | None:
        """Fetch a place by ID with its destination eager-loaded.

        Eager loads destination to avoid a lazy load when accessing
        place.destination.name in the response serializer.
        """
        stmt = select(Place).where(Place.id == place_id).options(selectinload(Place.destination))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        query: str | None = None,
        city: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[Place]:
        """Search places with optional filters.

        Filters:
        - query: ILIKE match on place name (partial match)
        - city: ILIKE match on destination name (partial match)
        - category: Exact match on place category

        Results are ordered by rating descending for quality-first display.
        Destination is eager-loaded for response serialization.
        """
        stmt = select(Place).options(selectinload(Place.destination))

        # Apply optional filters
        if query:
            stmt = stmt.where(Place.name.ilike(f"%{query}%"))
        if city:
            stmt = stmt.join(Destination).where(Destination.name.ilike(f"%{city}%"))
        if category:
            stmt = stmt.where(Place.category == category)

        # Order by quality and limit results
        stmt = stmt.order_by(Place.rating.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_destination(self, destination_id: int) -> list[Place]:
        """Get all places in a destination, ordered by rating.

        Used for destination detail pages to show all available places.
        """
        stmt = (
            select(Place)
            .where(Place.destination_id == destination_id)
            .order_by(Place.rating.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def find_alternatives(
        self,
        destination_id: int,
        category: str,
        exclude_ids: list[int],
        limit: int = 5,
    ) -> list[Place]:
        """Find alternative places for activity suggestions (EP-30).

        Returns top-rated places in the same destination and category,
        excluding places already used in the trip (via exclude_ids).
        Destination is eager-loaded for response serialization.
        """
        stmt = (
            select(Place)
            .where(
                Place.destination_id == destination_id,
                Place.category == category,
            )
            .options(selectinload(Place.destination))
            .order_by(Place.rating.desc(), Place.review_count.desc())
            .limit(limit)
        )

        # Exclude already-used places
        if exclude_ids:
            stmt = stmt.where(Place.id.notin_(exclude_ids))

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ===================================================================
    # Hotel — Accommodation reference queries
    # ===================================================================

    async def get_hotels_by_destination(self, destination_id: int) -> list[Hotel]:
        """Get all hotels in a destination, ordered by rating.

        Used for destination detail pages and AI context building.
        """
        stmt = (
            select(Hotel)
            .where(Hotel.destination_id == destination_id)
            .order_by(Hotel.rating.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ===================================================================
    # SavedPlace — User bookmark operations
    # ===================================================================

    async def get_saved_by_user(self, user_id: int) -> list[SavedPlace]:
        """Get all saved places for a user with full place + destination data.

        Eager loads place → destination chain for rich response serialization.
        Ordered by save date descending (newest first).
        """
        stmt = (
            select(SavedPlace)
            .where(SavedPlace.user_id == user_id)
            .options(selectinload(SavedPlace.place).selectinload(Place.destination))
            .order_by(SavedPlace.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def save_place(self, user_id: int, place_id: int) -> SavedPlace:
        """Create a new bookmark record. Caller should check for duplicates first."""
        saved = SavedPlace(user_id=user_id, place_id=place_id)
        self.session.add(saved)
        await self.session.flush()
        return saved

    async def unsave_place(self, saved_id: int) -> None:
        """Delete a bookmark by its ID. No-op if not found."""
        stmt = select(SavedPlace).where(SavedPlace.id == saved_id)
        result = await self.session.execute(stmt)
        saved = result.scalar_one_or_none()
        if saved:
            await self.session.delete(saved)
            await self.session.flush()

    async def saved_exists(self, user_id: int, place_id: int) -> bool:
        """Check if a place is already bookmarked by a user.

        Uses COUNT query for efficiency (no full row fetch needed).
        """
        stmt = (
            select(func.count())
            .select_from(SavedPlace)
            .where(SavedPlace.user_id == user_id, SavedPlace.place_id == place_id)
        )
        count = (await self.session.execute(stmt)).scalar_one()
        return count > 0

    async def get_saved_by_id(self, saved_id: int) -> SavedPlace | None:
        """Fetch a saved place record by ID (shallow — no eager loading)."""
        stmt = select(SavedPlace).where(SavedPlace.id == saved_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
