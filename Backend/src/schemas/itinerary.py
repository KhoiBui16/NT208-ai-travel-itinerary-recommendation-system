"""Itinerary request and response schemas."""

from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from src.base.schema import CamelCaseModel
from src.schemas.place import HotelResponse

ActivityType = Literal["food", "attraction", "nature", "entertainment", "shopping"]
TransportType = Literal["walk", "bike", "bus", "taxi"]
ExpenseCategory = Literal["food", "attraction", "entertainment", "transportation", "shopping"]


class ExtraExpenseSchema(CamelCaseModel):
    """Extra expense item for an activity or day."""

    id: int | None = None
    name: str
    amount: int = Field(ge=0)
    category: ExpenseCategory


class ActivitySchema(CamelCaseModel):
    """Activity schema aligned with FE Activity interface."""

    id: int | None = None
    time: str
    end_time: str | None = None
    name: str
    location: str = ""
    description: str = ""
    type: ActivityType
    image: str = ""
    transportation: TransportType | None = None
    adult_price: int | None = Field(default=None, ge=0)
    child_price: int | None = Field(default=None, ge=0)
    custom_cost: int | None = Field(default=None, ge=0)
    bus_ticket_price: int | None = Field(default=None, ge=0)
    taxi_cost: int | None = Field(default=None, ge=0)
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)


class DaySchema(CamelCaseModel):
    """Trip day schema."""

    id: int | None = None
    label: str
    date: str
    activities: list[ActivitySchema] = Field(default_factory=list)
    destination_name: str | None = None
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)


class AccommodationSchema(CamelCaseModel):
    """Accommodation schema aligned with FE Accommodation interface."""

    id: int | None = None
    hotel: HotelResponse | None = None
    day_ids: list[int] = Field(default_factory=list)
    booking_type: Literal["hourly", "nightly", "daily"] | None = None
    duration: int | None = Field(default=None, ge=0)
    name: str | None = None
    check_in: str | None = None
    check_out: str | None = None
    price_per_night: int | None = Field(default=None, ge=0)
    total_price: int | None = Field(default=None, ge=0)


class TravelerInfo(CamelCaseModel):
    """Traveler count information."""

    adults: int = Field(ge=1)
    children: int = Field(default=0, ge=0)
    total: int = Field(ge=1)


class GenerateItineraryRequest(CamelCaseModel):
    """Request for direct AI itinerary generation."""

    destination: str = Field(min_length=1, max_length=100)
    start_date: date
    end_date: date
    budget: int = Field(gt=0)
    adults: int = Field(default=1, ge=1)
    children: int = Field(default=0, ge=0)
    interests: list[str] = Field(default_factory=list)

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info: object) -> date:
        """Ensure end_date is not before start_date."""
        data = getattr(info, "data", {})
        start_date = data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("end_date must be on or after start_date")
        return value


class CreateTripRequest(CamelCaseModel):
    """Manual trip creation request."""

    destination: str
    trip_name: str
    start_date: date
    end_date: date
    budget: int = Field(gt=0)
    adults_count: int = Field(default=1, ge=1)
    children_count: int = Field(default=0, ge=0)
    interests: list[str] = Field(default_factory=list)


class UpdateTripRequest(CamelCaseModel):
    """Full nested auto-save request."""

    trip_name: str | None = None
    budget: int | None = Field(default=None, gt=0)
    days: list[DaySchema] | None = None
    accommodations: list[AccommodationSchema] | None = None


class ShareResponse(CamelCaseModel):
    """Share-link response."""

    share_url: str
    share_token: str
    expires_at: datetime | None = None


class ClaimTripRequest(CamelCaseModel):
    """Guest trip claim request."""

    claim_token: str


class ItineraryResponse(CamelCaseModel):
    """Full itinerary response returned to FE."""

    id: int
    destination: str
    trip_name: str
    start_date: date
    end_date: date
    budget: int
    total_cost: int = 0
    traveler_info: TravelerInfo
    interests: list[str] = Field(default_factory=list)
    days: list[DaySchema] = Field(default_factory=list)
    accommodations: list[AccommodationSchema] = Field(default_factory=list)
    claim_token: str | None = None
    created_at: datetime
    updated_at: datetime
