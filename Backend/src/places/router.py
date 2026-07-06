"""Place and destination API endpoints — EP 21-27.

Router structure:
  All endpoints under /api/v1/places

Endpoint groups:
  1. Destinations (public)   — List cities, get city detail with places/hotels
  2. Place search (public)   — Search/filter places, get place by ID
  3. Saved Places (auth)     — Bookmark/unbookmark places (requires login)
"""

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_redis
from src.places.schemas import (
    DestinationDetailResponse,
    DestinationResponse,
    PlaceResponse,
    SavedPlaceRequest,
    SavedPlaceResponse,
)
from src.places.service import PlaceService

# ---------------------------------------------------------------------------
# Router initialization
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/places", tags=["Places"])


def get_place_service(
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> PlaceService:
    """Dependency injection factory for PlaceService.

    Creates a new service instance per request, bound to the current
    database session and Redis connection for caching.
    """
    return PlaceService(session=session, redis=redis)


# ===================================================================
# Destinations — Public city browsing endpoints
# ===================================================================


@router.get("/destinations", response_model=list[DestinationResponse])
async def list_destinations(
    service: PlaceService = Depends(get_place_service),
) -> list[DestinationResponse]:
    """List all active destinations with place/hotel counts.

    Returns data quality metadata (readiness info) for each destination.
    Results are cached in Redis for performance.
    """
    return await service.get_destinations()


@router.get("/destinations/{name}", response_model=DestinationDetailResponse)
async def get_destination_detail(
    name: str,
    service: PlaceService = Depends(get_place_service),
) -> DestinationDetailResponse:
    """Get detailed info for a destination including its places and hotels.

    Looks up by name first, then by slug if name doesn't match.
    Returns a composite object with destination, places[], and hotels[].
    Results are cached in Redis per destination.
    """
    return await service.get_destination_detail(name)


# ===================================================================
# Place search/detail — Public place discovery endpoints
# ===================================================================


@router.get("/search", response_model=list[PlaceResponse])
async def search_places(
    query: str | None = None,
    city: str | None = None,
    category: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    service: PlaceService = Depends(get_place_service),
) -> list[PlaceResponse]:
    """Search places by name, city, and/or category.

    All filter parameters are optional — omitting all returns top-rated
    places across all destinations. Results are cached in Redis.
    """
    return await service.search_places(query=query, city=city, category=category, limit=limit)


@router.get("/{place_id}", response_model=PlaceResponse)
async def get_place(
    place_id: int,
    service: PlaceService = Depends(get_place_service),
) -> PlaceResponse:
    """Get a single place by its ID. Returns 404 if not found."""
    return await service.get_place_by_id(place_id)


# ===================================================================
# Saved Places — Authenticated bookmark endpoints
# ===================================================================


@router.get("/saved/list", response_model=list[SavedPlaceResponse])
async def list_saved_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> list[SavedPlaceResponse]:
    """List all saved/bookmarked places for the authenticated user.

    Returns full place details for each bookmark, ordered by save date (newest first).
    """
    return await service.list_saved(user.id)


@router.post("/saved", response_model=SavedPlaceResponse, status_code=201)
async def save_place(
    body: SavedPlaceRequest,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> SavedPlaceResponse:
    """Save/bookmark a place for the authenticated user.

    Returns 409 Conflict if the place is already saved.
    Returns 404 if the place doesn't exist.
    """
    return await service.save_place(user.id, body)


@router.delete("/saved/{saved_id}", status_code=204)
async def unsave_place(
    saved_id: int,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> None:
    """Remove a saved place bookmark. Returns 204 on success.

    Validates that the bookmark belongs to the authenticated user.
    Returns 404 if bookmark not found, 403 if not owned by user.
    """
    await service.unsave_place(saved_id, user_id=user.id)
