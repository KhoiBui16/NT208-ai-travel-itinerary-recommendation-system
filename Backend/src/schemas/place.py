"""Place, destination, hotel, and saved-place schemas."""

from datetime import datetime
from typing import Literal

from pydantic import Field

from src.base.schema import CamelCaseModel

PlaceType = Literal["food", "attraction", "nature", "entertainment", "shopping"]


class DestinationResponse(CamelCaseModel):
    """Destination response matching FE expectations."""

    id: int
    name: str
    country: str = "Vietnam"
    image: str
    rating: float = 0


class PlaceResponse(CamelCaseModel):
    """Place response matching FE expectations."""

    id: int
    name: str
    review_count: int = 0
    type: PlaceType
    image: str
    price: str | None = None
    location: str | None = None
    reviews: int | None = None
    rating: float | None = None
    saved: bool = False
    city: str
    description: str | None = None


class HotelResponse(CamelCaseModel):
    """Hotel response matching FE expectations."""

    id: int
    name: str
    rating: float
    review_count: int = 0
    price: int
    image: str
    location: str
    city: str
    amenities: list[str] = Field(default_factory=list)
    description: str


class PlaceSearchRequest(CamelCaseModel):
    """Place search query options."""

    city: str | None = None
    query: str | None = None
    type: PlaceType | None = None
    limit: int = Field(default=20, ge=1, le=100)


class SavedPlaceRequest(CamelCaseModel):
    """Save-place request."""

    place_id: int


class SavedPlaceResponse(CamelCaseModel):
    """Saved-place response."""

    id: int
    place: PlaceResponse
    created_at: datetime
