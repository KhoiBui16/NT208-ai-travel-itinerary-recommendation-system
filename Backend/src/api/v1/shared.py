"""Public shared trip endpoint — EP-15 read-only access via shareToken."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.schemas.itinerary import ItineraryResponse
from src.services.itinerary_service import ItineraryService

shared_router = APIRouter(prefix="/shared", tags=["Shared"])


def get_itinerary_service(session: AsyncSession = Depends(get_db)) -> ItineraryService:
    return ItineraryService(session=session)


@shared_router.get("/{share_token}", response_model=ItineraryResponse)
async def get_shared_trip(
    share_token: str,
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.get_by_share_token(share_token)
