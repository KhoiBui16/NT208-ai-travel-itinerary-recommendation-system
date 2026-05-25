"""Structured output schema for AI itinerary generation."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ActivityType = Literal["food", "attraction", "nature", "entertainment", "shopping"]
TransportType = Literal["walk", "bike", "bus", "taxi"]
BookingType = Literal["hourly", "nightly", "daily"]


class AgentActivity(BaseModel):
    """One LLM-generated activity."""

    model_config = ConfigDict(extra="ignore")

    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str | None = Field(default=None, alias="endTime")
    name: str = Field(min_length=1, max_length=200)
    type: ActivityType
    location: str = ""
    description: str = ""
    place_id: int | None = Field(default=None, alias="placeId")
    adult_price: int | None = Field(default=None, ge=0, alias="adultPrice")
    child_price: int | None = Field(default=None, ge=0, alias="childPrice")
    custom_cost: int | None = Field(default=None, ge=0, alias="customCost")
    transportation: TransportType | None = None
    bus_ticket_price: int | None = Field(default=None, ge=0, alias="busTicketPrice")
    taxi_cost: int | None = Field(default=None, ge=0, alias="taxiCost")


class AgentDay(BaseModel):
    """One LLM-generated trip day."""

    model_config = ConfigDict(extra="ignore")

    day_number: int = Field(ge=1, alias="dayNumber")
    label: str = Field(min_length=1, max_length=50)
    activities: list[AgentActivity] = Field(min_length=2)


class AgentAccommodation(BaseModel):
    """One LLM-generated accommodation option."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=200)
    hotel_id: int | None = Field(default=None, alias="hotelId")
    check_in: str = Field(alias="checkIn")
    check_out: str = Field(alias="checkOut")
    price_per_night: int = Field(default=0, ge=0, alias="pricePerNight")
    total_price: int = Field(default=0, ge=0, alias="totalPrice")
    booking_type: BookingType | None = Field(default=None, alias="bookingType")
    duration: int | None = Field(default=None, ge=0)
    day_ids: list[int] = Field(default_factory=list, alias="dayIds")


class AgentItinerary(BaseModel):
    """Top-level structured itinerary output from Gemini."""

    model_config = ConfigDict(extra="ignore")

    trip_name: str = Field(min_length=1, max_length=200, alias="tripName")
    total_cost: int = Field(default=0, ge=0, alias="totalCost")
    days: list[AgentDay]
    accommodations: list[AgentAccommodation] = Field(default_factory=list)
