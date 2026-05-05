"""Backward-compatibility shim — itinerary schemas moved to itineraries.schemas."""

from src.itineraries.schemas import (
    AccommodationSchema,
    ActivitySchema,
    ClaimTripRequest,
    CreateTripRequest,
    DaySchema,
    ExtraExpenseSchema,
    GenerateItineraryRequest,
    ItineraryResponse,
    ShareResponse,
    TravelerInfo,
    UpdateTripRequest,
)

__all__ = [
    "AccommodationSchema",
    "ActivitySchema",
    "ClaimTripRequest",
    "CreateTripRequest",
    "DaySchema",
    "ExtraExpenseSchema",
    "GenerateItineraryRequest",
    "ItineraryResponse",
    "ShareResponse",
    "TravelerInfo",
    "UpdateTripRequest",
]
