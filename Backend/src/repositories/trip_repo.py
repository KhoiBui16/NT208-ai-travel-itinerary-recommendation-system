"""Backward-compatibility shim — TripRepository moved to itineraries.repository."""

from src.itineraries.repository import TripRepository

__all__ = ["TripRepository"]
