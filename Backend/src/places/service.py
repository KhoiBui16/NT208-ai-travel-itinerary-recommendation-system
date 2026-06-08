"""Place domain service with CacheClient composition.

Handles destination browsing, place search/detail, saved-place bookmarks,
and Redis caching via explicit CacheClient injection.

Service method groups:
  1. Destinations (public)  — List cities, get city detail with places/hotels
  2. Place search (public)  — Search/filter places, get place by ID
  3. Saved Places (auth)    — Bookmark/unbookmark places
  4. Private helpers         — ORM-to-schema conversion methods
"""

import json
import logging

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import AppSettings, get_settings
from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.places.models import Destination, Place, SavedPlace
from src.places.repository import PlaceRepository
from src.places.schemas import (
    DestinationResponse,
    HotelResponse,
    PlaceResponse,
    SavedPlaceRequest,
    SavedPlaceResponse,
)
from src.shared.cache import CacheClient, normalize_cache_key
from src.shared.service import BaseService

logger = logging.getLogger(__name__)


class PlaceService(BaseService):
    """Business logic for places, destinations, and saved bookmarks.

    Uses composition with CacheClient for Redis caching. Cache keys:
    - "destinations:all:v2"              → Destination list with data quality
    - "destinations:detail:{name}"       → City detail (dest + places + hotels)
    - "places:search:{query}:{city}:..." → Search results
    """

    def __init__(
        self,
        session: AsyncSession,
        redis: Redis | None = None,
        settings: AppSettings | None = None,
    ) -> None:
        super().__init__()
        self.session = session
        self.repo = PlaceRepository(session)
        self.cache = CacheClient(redis)  # Graceful degradation if Redis unavailable
        self.settings = settings or get_settings()

    # ===================================================================
    # Destinations — Public city browsing
    # ===================================================================

    async def get_destinations(self) -> list[DestinationResponse]:
        """Get all active destinations with place/hotel counts.

        Uses v2 cache key to reflect updated data quality semantics:
        data quality is advisory (non-blocking warning), not a submit gate.

        Cache TTL: destination_cache_ttl_seconds from settings.
        """
        # Try cache first
        cached = await self.cache.get("destinations:all:v2")
        if cached is not None:
            return [DestinationResponse(**d) for d in json.loads(cached)]

        # Cache miss — query DB with aggregate counts
        destinations = await self.repo.get_destinations_with_counts()
        items = [self._to_destination_response_with_counts(d) for d in destinations]

        # Store in cache for future requests
        await self.cache.set(
            "destinations:all:v2",
            json.dumps([i.model_dump() for i in items]),
            self.settings.destination_cache_ttl_seconds,
        )
        return items

    async def get_destination_detail(self, name: str) -> dict:
        """Get detailed info for a destination including places and hotels.

        Resolution: tries exact name match first, then slug match.
        Returns a composite dict with destination, places[], and hotels[].

        Cache TTL: destination_cache_ttl_seconds from settings.
        """
        cache_key = f"destinations:detail:{name}"

        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return json.loads(cached)

        # Resolve destination — try name first, then slug
        dest = await self.repo.get_destination_by_name(name)
        if not dest:
            dest = await self.repo.get_destination_by_slug(name)
        if not dest:
            raise NotFoundException("Destination not found")

        # Load places and hotels for this destination
        places = await self.repo.get_by_destination(dest.id)
        hotels = await self.repo.get_hotels_by_destination(dest.id)

        # Build composite response
        result = {
            "destination": self._to_destination_response(dest).model_dump(),
            "places": [self._to_place_response(p).model_dump() for p in places],
            "hotels": [self._to_hotel_response(h, dest).model_dump() for h in hotels],
        }

        # Store in cache
        await self.cache.set(
            cache_key, json.dumps(result), self.settings.destination_cache_ttl_seconds
        )
        return result

    # ===================================================================
    # Place search/detail — Public place discovery
    # ===================================================================

    async def search_places(
        self,
        query: str | None = None,
        city: str | None = None,
        category: str | None = None,
        limit: int = 20,
    ) -> list[PlaceResponse]:
        """Search places with optional filters (query, city, category).

        Results are ordered by rating descending.
        Cache TTL: place_search_cache_ttl_seconds from settings.
        """
        # Build normalized cache key from all search parameters
        cache_key = normalize_cache_key("places", "search", query, city, category, limit)

        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return [PlaceResponse(**p) for p in json.loads(cached)]

        # Cache miss — query DB
        places = await self.repo.search(query=query, city=city, category=category, limit=limit)
        items = [self._to_place_response(p) for p in places]

        # Store in cache
        await self.cache.set(
            cache_key,
            json.dumps([i.model_dump() for i in items]),
            self.settings.place_search_cache_ttl_seconds,
        )
        return items

    async def get_place_by_id(self, place_id: int) -> PlaceResponse:
        """Get a single place by ID. Returns 404 if not found."""
        place = await self.repo.get_by_id(place_id)
        if not place:
            raise NotFoundException("Place not found")
        return self._to_place_response(place)

    # ===================================================================
    # Saved Places — Authenticated bookmark operations
    # ===================================================================

    async def list_saved(self, user_id: int) -> list[SavedPlaceResponse]:
        """List all bookmarked places for a user, ordered by save date."""
        saved = await self.repo.get_saved_by_user(user_id)
        return [self._to_saved_response(s) for s in saved]

    async def save_place(self, user_id: int, request: SavedPlaceRequest) -> SavedPlaceResponse:
        """Bookmark a place for the user.

        Raises ConflictException if the place is already saved.
        Raises NotFoundException if the place doesn't exist.
        """
        # Check for duplicate bookmark
        exists = await self.repo.saved_exists(user_id, request.place_id)
        if exists:
            raise ConflictException("Place already saved")

        # Verify the place exists
        place = await self.repo.get_by_id(request.place_id)
        if not place:
            raise NotFoundException("Place not found")

        # Create the bookmark and re-fetch with eager-loaded relations
        saved = await self.repo.save_place(user_id, request.place_id)
        saved = await self.repo.get_saved_by_id(saved.id)
        return self._to_saved_response(saved)

    async def unsave_place(self, saved_id: int, user_id: int) -> None:
        """Remove a bookmark. Validates ownership before deletion.

        Raises NotFoundException if bookmark doesn't exist.
        Raises ForbiddenException if bookmark belongs to another user.
        """
        saved = await self.repo.get_saved_by_id(saved_id)
        if not saved:
            raise NotFoundException("Saved place not found")
        if saved.user_id != user_id:
            raise ForbiddenException("Not your bookmark")
        await self.repo.unsave_place(saved_id)

    # ===================================================================
    # Private helpers — ORM-to-schema conversion
    # ===================================================================

    def _to_destination_response(self, dest: Destination) -> DestinationResponse:
        """Convert a Destination ORM to a basic response (no counts)."""
        return DestinationResponse(
            id=dest.id,
            name=dest.name,
            image=dest.image,
        )

    def _to_destination_response_with_counts(self, dest_data: dict) -> DestinationResponse:
        """Convert destination dict with counts to response with data quality metadata.

        Data quality tiers (advisory only — does NOT block form submission):
        - "ready"   (≥30 places): Full data coverage, best AI results
        - "partial" (≥6 places):  Limited data, results may have fewer options
        - "sparse"  (<6 places):  Very little data, results may be incomplete

        All API-listed destinations have isGenerateReady=True. Backend may
        still return 422 if context is truly insufficient at generation time.
        """
        places_count = dest_data.get("places_count", 0)
        hotels_count = dest_data.get("hotels_count", 0)
        dest_name = dest_data.get("name", "điểm đến")

        # Determine data quality status and advisory message
        if places_count >= 30:
            status = "ready"
            reason = None
        elif places_count >= 6:
            status = "partial"
            reason = (
                f"Dữ liệu cho {dest_name} hiện còn hạn chế nên lịch trình có thể ít lựa chọn hơn. "
                f"Bạn vẫn có thể tiếp tục tạo lịch trình."
            )
        else:
            status = "sparse"
            reason = (
                f"Dữ liệu cho {dest_name} còn rất ít. "
                f"Bạn vẫn có thể thử tạo lịch trình, nhưng kết quả có thể không đầy đủ."
            )

        return DestinationResponse(
            id=dest_data["id"],
            name=dest_data["name"],
            image=dest_data["image"],
            placesCount=places_count,
            hotelsCount=hotels_count,
            isGenerateReady=True,  # All API-listed destinations allowed to attempt generate
            readinessStatus=status,
            readinessReason=reason,
        )

    def _to_place_response(self, place: Place) -> PlaceResponse:
        """Convert a Place ORM to PlaceResponse schema.

        Extracts city name from the eager-loaded destination relationship.
        """
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
        """Convert a Hotel ORM to HotelResponse schema.

        Parses the comma-separated amenities string into a list for the FE.
        """
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
        """Convert a SavedPlace ORM to SavedPlaceResponse schema.

        Nests the full PlaceResponse for rich display in the FE.
        """
        return SavedPlaceResponse(
            id=saved.id,
            place=self._to_place_response(saved.place),
            created_at=saved.created_at,
        )
