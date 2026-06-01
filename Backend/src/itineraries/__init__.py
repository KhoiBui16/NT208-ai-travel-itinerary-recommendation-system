"""Itineraries domain: trip CRUD, share/claim, rating, AI generation stub.

Public exports:
  - ItineraryService — Main service class for trip operations
  - Trip, TripDay, Activity — Core ORM models
"""

from src.itineraries.models.trip import Activity, Trip, TripDay
from src.itineraries.service import ItineraryService

__all__ = ["ItineraryService", "Trip", "TripDay", "Activity"]
