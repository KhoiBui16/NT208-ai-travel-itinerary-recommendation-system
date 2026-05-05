"""Places domain: destinations, places, hotels, saved bookmarks."""

from src.places.models import Destination, Place
from src.places.service import PlaceService

__all__ = ["PlaceService", "Destination", "Place"]
