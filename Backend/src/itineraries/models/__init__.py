"""Itineraries ORM model exports."""

# Import adjacent domain models before itinerary models so SQLAlchemy can
# resolve string-based relationships when tests or CLI tools import one package.
import src.auth.models  # noqa: F401
import src.places.models  # noqa: F401
from src.itineraries.models.chat import ChatMessage, ChatSession
from src.itineraries.models.extras import (
    Accommodation,
    GuestClaimToken,
    ShareLink,
    TripRating,
)
from src.itineraries.models.trip import Activity, ExtraExpense, Trip, TripDay

__all__ = [
    "Accommodation",
    "Activity",
    "ChatMessage",
    "ChatSession",
    "ExtraExpense",
    "GuestClaimToken",
    "ShareLink",
    "Trip",
    "TripDay",
    "TripRating",
]
