"""Backward-compatibility shim — itinerary models moved to itineraries.models.trip."""

from src.itineraries.models.trip import Activity, ExtraExpense, Trip, TripDay

__all__ = ["Trip", "TripDay", "Activity", "ExtraExpense"]
