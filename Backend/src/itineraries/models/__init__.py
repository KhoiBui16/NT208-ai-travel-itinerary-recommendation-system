"""Itineraries ORM model exports.

Tập trung export tất cả ORM models của nhóm Trip để các module khác
có thể import gọn gàng từ `src.itineraries.models`.

Lưu ý: Phải import adjacent domain models (auth, places) TRƯỚC itinerary
models để SQLAlchemy có thể resolve string-based relationships khi tests
hoặc CLI tools import package riêng lẻ.
"""

# --- Adjacent domain models (phải import trước để SQLAlchemy resolve FK) ---
import src.auth.models  # noqa: F401
import src.places.models  # noqa: F401

# --- Chat models ---
from src.itineraries.models.chat import ChatMessage, ChatSession

# --- Trip auxiliary models (accommodation, share, claim, rating) ---
from src.itineraries.models.extras import (
    Accommodation,
    GuestClaimToken,
    ShareLink,
    TripRating,
)

# --- Trip core models (trip, day, activity, extra expense) ---
from src.itineraries.models.trip import Activity, ExtraExpense, Trip, TripDay

__all__ = [
    # Core trip entities
    "Trip",
    "TripDay",
    "Activity",
    "ExtraExpense",
    # Auxiliary trip entities
    "Accommodation",
    "ShareLink",
    "TripRating",
    "GuestClaimToken",
    # Chat entities
    "ChatMessage",
    "ChatSession",
]
