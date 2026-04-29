"""Place and destination API endpoints — EP 21-27."""

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user, get_redis
from src.models.user import User
from src.schemas.place import (
    DestinationResponse,
    PlaceResponse,
    SavedPlaceRequest,
    SavedPlaceResponse,
)
from src.services.place_service import PlaceService

router = APIRouter(prefix="/places", tags=["Places"])


def get_place_service(
    session: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> PlaceService:
    return PlaceService(session=session, redis=redis)


# --- Destinations (public) ---


@router.get("/destinations", response_model=list[DestinationResponse])
async def list_destinations(
    service: PlaceService = Depends(get_place_service),
) -> list[DestinationResponse]:
    return await service.get_destinations()


@router.get("/destinations/{name}")
async def get_destination_detail(
    name: str,
    service: PlaceService = Depends(get_place_service),
) -> dict:
    return await service.get_destination_detail(name)


# --- Place search/detail (public) ---


@router.get("/search", response_model=list[PlaceResponse])
async def search_places(
    query: str | None = None,
    city: str | None = None,
    category: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    service: PlaceService = Depends(get_place_service),
) -> list[PlaceResponse]:
    return await service.search_places(query=query, city=city, category=category, limit=limit)


@router.get("/{place_id}", response_model=PlaceResponse)
async def get_place(
    place_id: int,
    service: PlaceService = Depends(get_place_service),
) -> PlaceResponse:
    return await service.get_place_by_id(place_id)


# --- Saved Places (auth required) ---


@router.get("/saved/list", response_model=list[SavedPlaceResponse])
async def list_saved_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> list[SavedPlaceResponse]:
    return await service.list_saved(user.id)


@router.post("/saved", response_model=SavedPlaceResponse, status_code=201)
async def save_place(
    body: SavedPlaceRequest,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> SavedPlaceResponse:
    return await service.save_place(user.id, body)


@router.delete("/saved/{saved_id}", status_code=204)
async def unsave_place(
    saved_id: int,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
) -> None:
    await service.unsave_place(saved_id, user_id=user.id)
