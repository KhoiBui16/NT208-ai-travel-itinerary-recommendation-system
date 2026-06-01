"""Itineraries domain: trip CRUD, share/claim, rating, AI generation stub."""

from src.itineraries.models.trip import Activity, Trip, TripDay
from src.itineraries.service import ItineraryService

__all__ = ["ItineraryService", "Trip", "TripDay", "Activity"]
