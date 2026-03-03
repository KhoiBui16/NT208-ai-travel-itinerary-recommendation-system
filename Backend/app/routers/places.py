"""
============================================
app/routers/places.py — Destinations/Places Router
============================================
Endpoints (prefix: /api/v1/destinations):
  GET /           — Lấy danh sách destinations (cho dropdown)
  GET /{name}     — Lấy places của 1 destination

Tương ứng FE:
  TripPlanning.tsx → dropdown chọn destination
  FE hiện tại hardcode 10 destinations, BE trả dynamic list

Dữ liệu từ bảng places, group theo destination.
============================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.place import Place
from app.schemas.place import PlaceResponse

from pydantic import BaseModel, Field

router = APIRouter()


class DestinationItem(BaseModel):
    """1 destination trong danh sách."""

    name: str = Field(..., description="Tên thành phố")
    place_count: int = Field(0, description="Số địa điểm")


class DestinationListResponse(BaseModel):
    """Response danh sách destinations."""

    destinations: list[DestinationItem] = Field(default_factory=list)


@router.get(
    "/",
    response_model=DestinationListResponse,
    summary="Lấy danh sách điểm đến",
    description="""
    Lấy danh sách các thành phố/tỉnh có trong DB.
    Mỗi destination kèm số lượng places.
    
    **FE mapping:** TripPlanning.tsx → dropdown chọn "Chọn điểm đến"
    """,
)
async def get_destinations(
    db: AsyncSession = Depends(get_db),
) -> DestinationListResponse:
    """
    Query distinct destinations từ bảng places.
    Group by destination, count places.
    """
    result = await db.execute(
        select(
            Place.destination,
            func.count(Place.id).label("count"),
        )
        .where(Place.destination.isnot(None))
        .group_by(Place.destination)
        .order_by(Place.destination)
    )
    rows = result.all()

    destinations = [DestinationItem(name=row[0], place_count=row[1]) for row in rows]

    return DestinationListResponse(destinations=destinations)


@router.get(
    "/{destination_name}/places",
    response_model=list[PlaceResponse],
    summary="Lấy places của 1 destination",
    description="Lấy danh sách địa điểm du lịch của 1 thành phố.",
)
async def get_places_by_destination(
    destination_name: str,
    db: AsyncSession = Depends(get_db),
) -> list[PlaceResponse]:
    """Query places theo destination."""
    result = await db.execute(
        select(Place)
        .where(Place.destination == destination_name)
        .order_by(Place.place_name)
    )
    places = result.scalars().all()

    return [PlaceResponse.from_db(p) for p in places]
