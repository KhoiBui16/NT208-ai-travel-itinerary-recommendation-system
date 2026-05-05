"""Backward-compat shim — place schemas moved to src.places.schemas."""

from src.places.schemas import (
    DestinationResponse,
    HotelResponse,
    PlaceResponse,
    PlaceSearchRequest,
    PlaceType,
    SavedPlaceRequest,
    SavedPlaceResponse,
)

__all__ = [
    "DestinationResponse",
    "HotelResponse",
    "PlaceResponse",
    "PlaceSearchRequest",
    "PlaceType",
    "SavedPlaceRequest",
    "SavedPlaceResponse",
]
