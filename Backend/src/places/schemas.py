"""Place, destination, hotel, and saved-place API schemas.

Defines Pydantic models for:
  - Response serialization (PlaceResponse, DestinationResponse, HotelResponse)
  - Request validation (PlaceSearchRequest, SavedPlaceRequest)
  - Feature-specific responses (SuggestionResponse for EP-30)

All schemas inherit from CamelCaseModel for automatic camelCase
serialization to match frontend TypeScript interfaces.
"""

from datetime import datetime
from typing import Literal

from pydantic import Field

from src.core.schema import CamelCaseModel

# ---------------------------------------------------------------------------
# Type aliases — shared across schemas
# ---------------------------------------------------------------------------

# Valid place categories matching the Goong ETL category taxonomy
PlaceType = Literal["food", "attraction", "nature", "entertainment", "shopping"]


# ===================================================================
# Response schemas — API output serialization
# ===================================================================


class DestinationResponse(CamelCaseModel):
    """Destination response for city listing and detail pages.

    Includes data quality metadata (readiness info) that the FE can
    display as advisory warnings. `isGenerateReady` is a coarse signal
    based on live place coverage for the shortest supported AI trip,
    not a guarantee that every destination will satisfy every trip
    duration. Backend generate still performs the final validation.
    """

    # --- Identity ---
    id: int
    name: str  # City/destination display name
    slug: str  # URL-safe slug used by FE routes and API lookups
    description: str | None = None  # Poetic travel description from DB
    country: str = "Vietnam"  # Default country for this app

    # --- Media ---
    image: str  # Cover image URL

    # --- Aggregate stats ---
    rating: float = 0  # Average rating across places (informational)
    placesCount: int = 0  # Number of places in this destination
    hotelsCount: int = 0  # Number of hotels in this destination

    # --- Data quality metadata (advisory, not a submit gate) ---
    isGenerateReady: bool = False  # Coarse generate readiness based on live place coverage
    readinessStatus: str = "not_ready"  # "ready" | "partial" | "sparse"
    readinessReason: str | None = None  # Human-readable warning message


class DestinationDetailResponse(CamelCaseModel):
    """Composite destination detail payload for city detail pages."""

    destination: DestinationResponse
    places: list["PlaceResponse"] = Field(default_factory=list)
    hotels: list["HotelResponse"] = Field(default_factory=list)


class PlaceResponse(CamelCaseModel):
    """Place response for search results and detail views.

    Designed to match the FE Place TypeScript interface for seamless
    rendering in CityDetail, PlaceSelectionModal, and SavedPlaces pages.
    """

    # --- Identity ---
    id: int
    name: str  # Place display name

    # --- Quality metrics ---
    review_count: int = 0  # Number of reviews from source
    rating: float | None = None  # 0-5 star rating (None if unrated)

    # --- Classification ---
    type: PlaceType  # Category: food, attraction, nature, etc.

    # --- Media and location ---
    image: str  # Photo URL
    price: str | None = None  # Display price string (formatted)
    location: str | None = None  # Address text
    latitude: float | None = None  # Map coordinate (Goong map integration)
    longitude: float | None = None  # Map coordinate (Goong map integration)

    # --- Review info (alias for backward compatibility) ---
    reviews: int | None = None  # Alias for review_count in some FE contexts

    # --- User state ---
    saved: bool = False  # Whether the current user has bookmarked this place

    # --- Context ---
    city: str  # Parent destination name for display
    description: str | None = None  # Place description text


class HotelResponse(CamelCaseModel):
    """Hotel response for destination detail pages and accommodation selection.

    Used in:
    - Destination detail page (hotel listings)
    - AccommodationSchema in itinerary responses (embedded hotel info)
    """

    # --- Identity ---
    id: int
    name: str  # Hotel display name

    # --- Quality metrics ---
    rating: float  # 0-5 star rating
    review_count: int = 0  # Number of reviews

    # --- Pricing ---
    price: int  # Price per night in VND

    # --- Media and location ---
    image: str  # Photo URL
    location: str  # Address text

    # --- Context ---
    city: str  # Parent destination name

    # --- Extended info ---
    amenities: list[str] = Field(default_factory=list)  # e.g. ["WiFi", "Pool", "Parking"]
    description: str  # Hotel description


# ===================================================================
# Request schemas — API input validation
# ===================================================================


class PlaceSearchRequest(CamelCaseModel):
    """Place search query options for filtering and pagination.

    All fields are optional — omitting all returns all places (up to limit).
    """

    city: str | None = None  # Filter by destination name
    query: str | None = None  # Free-text search on place name
    type: PlaceType | None = None  # Filter by category
    limit: int = Field(default=20, ge=1, le=100)  # Max results to return


class SavedPlaceRequest(CamelCaseModel):
    """Save-place request — bookmark a place for the authenticated user."""

    place_id: int  # ID of the place to save


# ===================================================================
# Composite response schemas
# ===================================================================


class SavedPlaceResponse(CamelCaseModel):
    """Saved-place response — includes full place details for display.

    Used in the SavedPlaces page to show bookmarked places with
    all their metadata (name, image, rating, etc.).
    """

    id: int  # SavedPlace record ID (used for unsave operation)
    place: PlaceResponse  # Full nested place data
    created_at: datetime  # When the place was saved


class SuggestionResponse(CamelCaseModel):
    """Activity alternative suggestions response (EP-30, Phase C.2).

    Returns a list of alternative places for a given activity,
    allowing users to swap an AI-suggested activity with a similar
    place from the same destination and category.
    """

    activity_id: int  # The activity these suggestions are for
    current_name: str  # Name of the current activity (for display)
    suggestions: list[PlaceResponse] = Field(default_factory=list)  # Alternative places
