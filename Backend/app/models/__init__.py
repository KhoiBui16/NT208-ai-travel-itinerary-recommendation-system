"""
============================================
app/models/__init__.py — Export tất cả models
============================================
Import tập trung để main.py chỉ cần:
    from app.models import user, trip, place, trip_place
============================================
"""

from app.models.user import User
from app.models.trip import Trip
from app.models.place import Place
from app.models.trip_place import TripPlace

# Cho phép: from app.models import User, Trip, Place, TripPlace
__all__ = ["User", "Trip", "Place", "TripPlace"]
