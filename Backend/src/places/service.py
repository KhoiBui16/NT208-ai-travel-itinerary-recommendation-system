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
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import AppSettings, get_settings
from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.core.slugify import slugify
from src.places.models import Destination, Place, SavedPlace
from src.places.repository import PlaceRepository
from src.places.schemas import (
    DestinationDetailResponse,
    DestinationResponse,
    HotelResponse,
    PlaceResponse,
    SavedPlaceRequest,
    SavedPlaceResponse,
)
from src.shared.cache import CacheClient, normalize_cache_key
from src.shared.service import BaseService

logger = logging.getLogger(__name__)

LOCAL_DESTINATION_IMAGE_PREFIX = "/img/destinations/"
MIN_LIST_GENERATE_READY_PLACES = 2


class PlaceService(BaseService):
    """Business logic for places, destinations, and saved bookmarks.

    Uses composition with CacheClient for Redis caching. Cache keys:
    - "destinations:all:v4"              → Destination list with data quality
    - "destinations:detail:v4:{name}"    → City detail (dest + places + hotels, +lat/lng)
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
        # Cache key version: lazily derived from the current Alembic revision so
        # the cache auto-invalidates whenever a deploy runs a new migration
        # (Render preDeployCommand runs `alembic upgrade head` before the app
        # serves). No manual "v4/v5" bump is ever needed again.
        self._cache_version: str | None = None

    async def _cache_ver(self) -> str:
        """Resolve the places/destinations cache-key version from the Alembic revision.

        Memoized per instance. Falls back to a constant when the revision
        cannot be read (e.g. mocked session in unit tests, or the
        alembic_version table being absent) so caching still works.
        """
        if self._cache_version is not None:
            return self._cache_version
        rev: str | None = None
        try:
            result = await self.session.execute(text("SELECT version_num FROM alembic_version"))
            row = result.fetchone()
            if row is not None:
                candidate = row[0]
                if isinstance(candidate, str):
                    rev = candidate
        except Exception:
            rev = None
        self._cache_version = f"rev-{rev}" if rev else "rev-default"
        return self._cache_version

    # ===================================================================
    # Destinations — Public city browsing
    # ===================================================================

    async def get_destinations(self) -> list[DestinationResponse]:
        """Get all active destinations with place/hotel counts.

        Cache key is versioned by the current Alembic revision
        (``destinations:all:<rev>``) so it auto-invalidates whenever a deploy
        runs a new migration — no manual version bump required.

        Cache TTL: destination_cache_ttl_seconds from settings.
        """
        version = await self._cache_ver()
        # Try cache first
        cached = await self.cache.get(f"destinations:all:{version}")
        if cached is not None:
            cached_items = json.loads(cached)
            return [
                DestinationResponse(
                    **{
                        **destination_data,
                        "slug": destination_data.get("slug")
                        or slugify(destination_data.get("name", "")),
                    }
                )
                for destination_data in cached_items
            ]

        # Cache miss — query DB with aggregate counts
        destinations = await self.repo.get_destinations_with_counts()
        items = [self._to_destination_response_with_counts(d) for d in destinations]

        # Cache only non-empty results — a cached empty list would mask data
        # loaded afterwards (e.g. a DB restore) until the TTL (24h) expires.
        if items:
            await self.cache.set(
                f"destinations:all:{version}",
                json.dumps([i.model_dump() for i in items]),
                self.settings.destination_cache_ttl_seconds,
            )
        return items

    async def get_destination_detail(self, name: str) -> DestinationDetailResponse:
        """Get detailed info for a destination including places and hotels.

        Resolution: tries exact name match first, then slug match.
        Returns a composite dict with destination, places[], and hotels[].

        Cache TTL: destination_cache_ttl_seconds from settings.
        """
        # Cache key is versioned by the current Alembic revision (see get_destinations).
        version = await self._cache_ver()
        cache_key = normalize_cache_key("destinations", "detail", version, name)

        # Try cache first
        cached = await self.cache.get(cache_key)
        if cached is not None:
            payload = json.loads(cached)
            destination_payload = payload.get("destination") or {}
            if "slug" not in destination_payload:
                destination_payload["slug"] = slugify(destination_payload.get("name", ""))
            payload["destination"] = destination_payload
            return DestinationDetailResponse.model_validate(payload)

        # Resolve destination — try name first, then slug, then fuzzy match
        dest = await self.repo.get_destination_by_name(name)
        if not dest:
            # Convert input to slug format so "Ha Noi" → "ha-noi" matches DB slugs
            dest = await self.repo.get_destination_by_slug(slugify(name))
        if not dest:
            dest = await self.repo.get_destination_by_fuzzy(name)
        if not dest:
            raise NotFoundException("Destination not found")

        # Load places and hotels for this destination
        places = await self.repo.get_by_destination(dest.id)
        hotels = await self.repo.get_hotels_by_destination(dest.id)

        # Build composite response with live counts so detail matches the actual payload.
        result = DestinationDetailResponse(
            destination=self._to_destination_response(
                dest,
                places_count=len(places),
                hotels_count=len(hotels),
            ),
            places=[self._to_place_response(p) for p in places],
            hotels=[self._to_hotel_response(h, dest) for h in hotels],
        )

        # Store in cache
        await self.cache.set(
            cache_key,
            result.model_dump_json(by_alias=True),
            self.settings.destination_cache_ttl_seconds,
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
        # Build normalized cache key from all search parameters, versioned by
        # the current Alembic revision (see get_destinations).
        version = await self._cache_ver()
        cache_key = normalize_cache_key("places", "search", version, query, city, category, limit)

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

    def _to_destination_response(
        self,
        dest: Destination,
        *,
        places_count: int | None = None,
        hotels_count: int = 0,
    ) -> DestinationResponse:
        """Convert a Destination ORM to a response with optional live counts."""
        return self._build_destination_response(
            dest_id=dest.id,
            dest_name=dest.name,
            dest_slug=dest.slug,
            description=dest.description,
            image=dest.image,
            places_count=dest.places_count if places_count is None else places_count,
            hotels_count=hotels_count,
        )

    def _to_destination_response_with_counts(self, dest_data: dict) -> DestinationResponse:
        """Convert destination dict with counts to response with data quality metadata.

        Data quality tiers (advisory only — does NOT block form submission):
        - "ready"   (≥30 places): Full data coverage, best AI results
        - "partial" (≥6 places):  Limited data, results may have fewer options
        - "sparse"  (<6 places):  Very little data, results may be incomplete

        `isGenerateReady` is coarse list-level guidance only. Backend may
        still return 422 if the final trip request needs more context than
        the destination currently has.
        """
        return self._build_destination_response(
            dest_id=dest_data["id"],
            dest_name=dest_data["name"],
            dest_slug=dest_data["slug"],
            description=dest_data.get("description", ""),
            image=dest_data["image"],
            places_count=dest_data.get("places_count", 0),
            hotels_count=dest_data.get("hotels_count", 0),
        )

    def _build_destination_response(
        self,
        *,
        dest_id: int,
        dest_name: str,
        dest_slug: str,
        description: str | None = None,
        image: str,
        places_count: int,
        hotels_count: int,
    ) -> DestinationResponse:
        """Create a destination response with consistent readiness metadata.

        `isGenerateReady` is intentionally coarse because the destination
        listing does not know the user's final trip length yet. We only mark
        a city as unavailable when the live place count is below the minimum
        needed for even the shortest AI-generated trip.
        """
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
                f"Dữ liệu về {dest_name} hiện còn quá ít để tạo lịch trình tốt. "
                "Bạn vẫn có thể xem thông tin điểm đến này; chúng tôi sẽ bổ sung "
                "thêm địa điểm trong thời gian tới."
            )

        is_generate_ready = places_count >= MIN_LIST_GENERATE_READY_PLACES

        return DestinationResponse(
            id=dest_id,
            name=dest_name,
            slug=dest_slug,
            description=description,
            image=self._resolve_destination_image(
                image=image,
                dest_slug=dest_slug,
                dest_name=dest_name,
            ),
            placesCount=places_count,
            hotelsCount=hotels_count,
            isGenerateReady=is_generate_ready,
            readinessStatus=status,
            readinessReason=reason,
        )

    def _resolve_destination_image(self, *, image: str, dest_slug: str, dest_name: str) -> str:
        """Normalize destination cover image paths for list/detail responses.

        Legacy ETL rows may carry stale local image slugs such as
        `/img/destinations/ha-n-i.jpg`. When the API is already returning
        a canonical destination slug, prefer rebuilding the local asset path
        from that slug so FE and docs see the same truth.
        """
        normalized_slug = dest_slug or slugify(dest_name)
        trimmed_image = image.strip()

        if trimmed_image.startswith(("http://", "https://")):
            return trimmed_image

        if not trimmed_image or trimmed_image.startswith(LOCAL_DESTINATION_IMAGE_PREFIX):
            return f"{LOCAL_DESTINATION_IMAGE_PREFIX}{normalized_slug}.jpg"

        return trimmed_image

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
            latitude=place.latitude,
            longitude=place.longitude,
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
