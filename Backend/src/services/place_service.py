"""Backward-compat shim — PlaceService moved to src.places.service."""

from src.places.service import PlaceService

__all__ = ["PlaceService"]
