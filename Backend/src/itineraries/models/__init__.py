"""Itineraries ORM model exports.

Re-exports all ORM models from the itineraries domain submodules
for convenient imports like:
    from src.itineraries.models import Trip, TripDay, Activity

Note: Adjacent domain models (auth, places) are imported first so that
SQLAlchemy can resolve string-based relationship references when tests
or CLI tools import this package in isolation.
"""

# Import adjacent domain models before itinerary models so SQLAlchemy can
# resolve string-based relationships when tests or CLI tools import one package.
import src.auth.models  # noqa: F401
import src.places.models  # noqa: F401

# --- Chat models ---
from src.itineraries.models.chat import ChatMessage, ChatSession

# --- Auxiliary trip models (accommodation, share, claim, rating) ---
from src.itineraries.models.extras import (
    Accommodation,
    GuestClaimToken,
    ShareLink,
    TripRating,
)

# --- Core trip models (trip, day, activity, extra expense) ---
from src.itineraries.models.trip import Activity, ExtraExpense, Trip, TripDay

__all__ = [
    # Core trip entities
    "Trip",
    "TripDay",
    "Activity",
    "ExtraExpense",
    # Auxiliary entities
    "Accommodation",
    "ShareLink",
    "TripRating",
    "GuestClaimToken",
    # Chat entities
    "ChatMessage",
    "ChatSession",
]
