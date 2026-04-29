"""Place domain service.

Handles destination browsing, place search/detail, saved-place bookmarks,
and Redis caching for read-heavy queries.
"""

import json
import logging

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.models.place import Destination, Place, SavedPlace
from src.repositories.place_repo import PlaceRepository
from src.schemas.place import (
    DestinationResponse,
    HotelResponse,
    PlaceResponse,
    SavedPlaceRequest,
    SavedPlaceResponse,
)
from src.services.base import BaseService

logger = logging.getLogger(__name__)

CACHE_TTL_DESTINATIONS = 3600  # 1 hour
CACHE_TTL_SEARCH = 900  # 15 minutes


class PlaceService(BaseService):
    """Business logic for places, destinations, and saved bookmarks."""

    def __init__(self, session: AsyncSession, redis: Redis | None = None) -> None:
        super().__init__()
        self.session = session
        self.repo = PlaceRepository(session)
        self.redis = redis

    # --- Destinations (public) ---

    async def get_destinations(self) -> list[DestinationResponse]:
        cached = await self._cache_get("destinations:all")
        if cached is not None:
            return [DestinationResponse(**d) for d in json.loads(cached)]

        destinations = await self.repo.get_destinations()
        items = [self._to_destination_response(d) for d in destinations]

        await self._cache_set("destinations:all", json.dumps([i.model_dump() for i in items]))
        return items

    async def get_destination_detail(self, name: str) -> dict:
        cache_key = f"destinations:detail:{name}"
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return json.loads(cached)

        dest = await self.repo.get_destination_by_name(name)
        if not dest:
            # Try slug-based lookup
            dest = await self.repo.get_destination_by_slug(name)
        if not dest:
            raise NotFoundException("Destination not found")

        places = await self.repo.get_by_destination(dest.id)
        hotels = await self.repo.get_hotels_by_destination(dest.id)

        result = {
            "destination": self._to_destination_response(dest).model_dump(),
            "places": [self._to_place_response(p).model_dump() for p in places],
            "hotels": [self._to_hotel_response(h, dest).model_dump() for h in hotels],
        }

        await self._cache_set(cache_key, json.dumps(result))
        return result

    # --- Place search/detail (public) ---

    async def search_places(
        self,
        query: str | None = None,
        city: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[PlaceResponse]:
        cache_key = f"places:search:{query}:{city}:{category}:{limit}"
        cached = await self._cache_get(cache_key)
        if cached is not None:
            return [PlaceResponse(**p) for p in json.loads(cached)]

        places = await self.repo.search(
            query=query, city=city, category=category, limit=limit
        )
        items = [self._to_place_response(p) for p in places]

        await self._cache_set(
            cache_key,
            json.dumps([i.model_dump() for i in items]),
            CACHE_TTL_SEARCH,
        )
        return items

    async def get_place_by_id(self, place_id: int) -> PlaceResponse:
        place = await self.repo.get_by_id(place_id)
        if not place:
            raise NotFoundException("Place not found")
        return self._to_place_response(place)

    # --- Saved Places (auth required) ---

    async def list_saved(self, user_id: int) -> list[SavedPlaceResponse]:
        saved = await self.repo.get_saved_by_user(user_id)
        return [self._to_saved_response(s) for s in saved]

    async def save_place(self, user_id: int, request: SavedPlaceRequest) -> SavedPlaceResponse:
        exists = await self.repo.saved_exists(user_id, request.place_id)
        if exists:
            raise ConflictException("Place already saved")

        place = await self.repo.get_by_id(request.place_id)
        if not place:
            raise NotFoundException("Place not found")

        saved = await self.repo.save_place(user_id, request.place_id)
        # Re-fetch with eager-loaded relations
        saved = await self.repo.get_saved_by_id(saved.id)
        return self._to_saved_response(saved)

    async def unsave_place(self, saved_id: int, user_id: int) -> None:
        saved = await self.repo.get_saved_by_id(saved_id)
        if not saved:
            raise NotFoundException("Saved place not found")
        if saved.user_id != user_id:
            raise ForbiddenException("Not your bookmark")
        await self.repo.unsave_place(saved_id)

    # --- Private helpers ---

    def _to_destination_response(self, dest: Destination) -> DestinationResponse:
        return DestinationResponse(
            id=dest.id,
            name=dest.name,
            image=dest.image,
        )

    def _to_place_response(self, place: Place) -> PlaceResponse:
        city = place.destination.name if place.destination else ""
        return PlaceResponse(
            id=place.id,
            name=place.name,
            type=place.category,
            image=place.image,
            location=place.location,
            rating=place.rating,
            city=city,
            description=place.description,
        )

    def _to_hotel_response(self, hotel, dest: Destination) -> HotelResponse:
        return HotelResponse(
            id=hotel.id,
            name=hotel.name,
            rating=hotel.rating,
            review_count=hotel.review_count,
            price=hotel.price_per_night,
            image=hotel.image,
            location=hotel.location,
            city=dest.name,
            amenities=hotel.amenities.split(",") if hotel.amenities else [],
            description=hotel.description,
        )

    def _to_saved_response(self, saved: SavedPlace) -> SavedPlaceResponse:
        return SavedPlaceResponse(
            id=saved.id,
            place=self._to_place_response(saved.place),
            created_at=saved.created_at,
        )

    # --- Cache helpers ---

    async def _cache_get(self, key: str) -> str | None:
        if not self.redis:
            return None
        try:
            return await self.redis.get(key)
        except Exception:
            logger.warning("Redis cache read failed for key=%s", key, exc_info=True)
            return None

    async def _cache_set(self, key: str, value: str, ttl: int = CACHE_TTL_DESTINATIONS) -> None:
        if not self.redis:
            return
        try:
            await self.redis.setex(key, ttl, value)
        except Exception:
            logger.warning("Redis cache write failed for key=%s", key, exc_info=True)
