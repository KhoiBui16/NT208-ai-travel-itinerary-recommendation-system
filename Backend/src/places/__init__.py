"""Places domain: destinations, places, hotels, saved bookmarks.

Public exports:
  - PlaceService  — Main service class for place operations
  - Destination   — City/region ORM model
  - Place         — Travel location ORM model
"""

from src.places.models import Destination, Place
from src.places.service import PlaceService

__all__ = ["PlaceService", "Destination", "Place"]
