"""Itinerary API endpoints — EP 8-20, EP 32."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user, get_current_user_optional
from src.models.user import User
from src.schemas.common import PaginatedResponse, SuccessResponse
from src.schemas.itinerary import (
    AccommodationSchema,
    ActivitySchema,
    ClaimTripRequest,
    CreateTripRequest,
    GenerateItineraryRequest,
    ItineraryResponse,
    ShareResponse,
    UpdateTripRequest,
)
from src.services.itinerary_service import ItineraryService

router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


def get_itinerary_service(session: AsyncSession = Depends(get_db)) -> ItineraryService:
    return ItineraryService(session=session)


# --- Main CRUD ---


@router.post("/generate", response_model=ItineraryResponse, status_code=201)
async def generate_itinerary(
    request: GenerateItineraryRequest,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.generate(request, user_id=user.id if user else None)


@router.post("", response_model=ItineraryResponse, status_code=201)
async def create_trip(
    request: CreateTripRequest,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.create_manual(request, user_id=user.id if user else None)


@router.get("", response_model=PaginatedResponse)
async def list_trips(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> PaginatedResponse:
    return await service.list_by_user(user.id, page=page, size=size)


@router.get("/{trip_id}", response_model=ItineraryResponse)
async def get_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.get_by_id(trip_id, user_id=user.id)


@router.put("/{trip_id}", response_model=ItineraryResponse)
async def update_trip(
    trip_id: int,
    request: UpdateTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.update(trip_id, request, user_id=user.id)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete(trip_id, user_id=user.id)


# --- Rating & Share ---


@router.put("/{trip_id}/rating")
async def rate_trip(
    trip_id: int,
    rating: int = Query(..., ge=1, le=5),
    feedback: str | None = None,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> SuccessResponse:
    await service.rate(trip_id, user_id=user.id, rating=rating, feedback=feedback)
    return SuccessResponse(message="Rating saved")


@router.post("/{trip_id}/share", response_model=ShareResponse)
async def share_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ShareResponse:
    return await service.share(trip_id, user_id=user.id)


@router.post("/{trip_id}/claim")
async def claim_trip(
    trip_id: int,
    request: ClaimTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> dict:
    return await service.claim(trip_id, user_id=user.id, request=request)


# --- Activity CRUD ---


@router.post("/{trip_id}/activities", response_model=ActivitySchema, status_code=201)
async def add_activity(
    trip_id: int,
    day_id: int = Query(..., description="TripDay ID to add activity to"),
    data: ActivitySchema = ...,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    return await service.add_activity(trip_id, day_id, data, user_id=user.id)


@router.put("/{trip_id}/activities/{activity_id}", response_model=ActivitySchema)
async def update_activity(
    trip_id: int,
    activity_id: int,
    data: ActivitySchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    return await service.update_activity(trip_id, activity_id, data, user_id=user.id)


@router.delete("/{trip_id}/activities/{activity_id}", status_code=204)
async def delete_activity(
    trip_id: int,
    activity_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete_activity(trip_id, activity_id, user_id=user.id)


# --- Accommodation CRUD ---


@router.post("/{trip_id}/accommodations", response_model=AccommodationSchema, status_code=201)
async def add_accommodation(
    trip_id: int,
    data: AccommodationSchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> AccommodationSchema:
    return await service.add_accommodation(trip_id, data, user_id=user.id)


@router.delete("/{trip_id}/accommodations/{accommodation_id}", status_code=204)
async def delete_accommodation(
    trip_id: int,
    accommodation_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete_accommodation(trip_id, accommodation_id, user_id=user.id)
