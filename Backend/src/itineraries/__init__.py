"""Itineraries domain: trip CRUD, share/claim, rating, AI generation.

Public exports:
  - ItineraryService — Main service class for trip operations
  - Trip, TripDay, Activity — Core ORM models
"""

from src.itineraries.models.trip import Activity, Trip, TripDay

__all__ = ["ItineraryService", "Trip", "TripDay", "Activity"]


def __getattr__(name: str) -> object:
    """Lazy-load service exports so metadata-only imports avoid AI provider deps."""
    if name == "ItineraryService":
        from src.itineraries.service import ItineraryService

        return ItineraryService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
