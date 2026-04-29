"""Place and destination data access repository.

Provides query operations for destinations, places, hotels,
and saved-place bookmarks.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.place import Destination, Hotel, Place, SavedPlace


class PlaceRepository:
    """Data access for Place, Destination, Hotel, and SavedPlace."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Destination ---

    async def get_destinations(self) -> list[Destination]:
        stmt = (
            select(Destination)
            .where(Destination.is_active.is_(True))
            .order_by(Destination.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_destination_by_slug(self, slug: str) -> Destination | None:
        stmt = select(Destination).where(Destination.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_destination_by_name(self, name: str) -> Destination | None:
        stmt = select(Destination).where(Destination.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- Place ---

    async def get_by_id(self, place_id: int) -> Place | None:
        stmt = (
            select(Place)
            .where(Place.id == place_id)
            .options(selectinload(Place.destination))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        query: str | None = None,
        city: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[Place]:
        stmt = select(Place).options(selectinload(Place.destination))
        if query:
            stmt = stmt.where(Place.name.ilike(f"%{query}%"))
        if city:
            stmt = stmt.join(Destination).where(Destination.name.ilike(f"%{city}%"))
        if category:
            stmt = stmt.where(Place.category == category)
        stmt = stmt.order_by(Place.rating.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_destination(self, destination_id: int) -> list[Place]:
        stmt = (
            select(Place)
            .where(Place.destination_id == destination_id)
            .order_by(Place.rating.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Hotel ---

    async def get_hotels_by_destination(self, destination_id: int) -> list[Hotel]:
        stmt = (
            select(Hotel)
            .where(Hotel.destination_id == destination_id)
            .order_by(Hotel.rating.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Saved Place ---

    async def get_saved_by_user(self, user_id: int) -> list[SavedPlace]:
        stmt = (
            select(SavedPlace)
            .where(SavedPlace.user_id == user_id)
            .options(selectinload(SavedPlace.place).selectinload(Place.destination))
            .order_by(SavedPlace.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def save_place(self, user_id: int, place_id: int) -> SavedPlace:
        saved = SavedPlace(user_id=user_id, place_id=place_id)
        self.session.add(saved)
        await self.session.flush()
        return saved

    async def unsave_place(self, saved_id: int) -> None:
        stmt = select(SavedPlace).where(SavedPlace.id == saved_id)
        result = await self.session.execute(stmt)
        saved = result.scalar_one_or_none()
        if saved:
            await self.session.delete(saved)
            await self.session.flush()

    async def saved_exists(self, user_id: int, place_id: int) -> bool:
        stmt = select(func.count()).select_from(SavedPlace).where(
            SavedPlace.user_id == user_id, SavedPlace.place_id == place_id
        )
        count = (await self.session.execute(stmt)).scalar_one()
        return count > 0

    async def get_saved_by_id(self, saved_id: int) -> SavedPlace | None:
        stmt = select(SavedPlace).where(SavedPlace.id == saved_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
