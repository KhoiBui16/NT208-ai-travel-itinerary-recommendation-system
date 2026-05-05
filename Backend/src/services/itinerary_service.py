"""Backward-compatibility shim — ItineraryService moved to itineraries.service."""

from src.itineraries.service import MAX_ACTIVE_TRIPS, ItineraryService

__all__ = ["ItineraryService", "MAX_ACTIVE_TRIPS"]
