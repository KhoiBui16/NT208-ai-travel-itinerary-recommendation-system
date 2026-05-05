"""Backward-compat shim — PlaceRepository moved to src.places.repository."""

from src.places.repository import PlaceRepository

__all__ = ["PlaceRepository"]
