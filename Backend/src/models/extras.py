"""Backward-compatibility shim — extras/chat models moved to itineraries.models."""

from src.itineraries.models.chat import ChatMessage, ChatSession
from src.itineraries.models.extras import (
    Accommodation,
    GuestClaimToken,
    ShareLink,
    TripRating,
)
from src.places.models import ScrapedSource

__all__ = [
    "Accommodation",
    "ChatMessage",
    "ChatSession",
    "GuestClaimToken",
    "ScrapedSource",
    "ShareLink",
    "TripRating",
]
