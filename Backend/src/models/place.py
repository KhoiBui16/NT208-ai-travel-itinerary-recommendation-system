"""Backward-compat shim — place models moved to src.places.models."""

from src.places.models import Destination, Hotel, Place, SavedPlace, ScrapedSource

__all__ = ["Destination", "Hotel", "Place", "SavedPlace", "ScrapedSource"]
