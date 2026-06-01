"""Itinerary request and response schemas.

Defines Pydantic models used for:
  - API request validation (create, update, generate, claim trips)
  - API response serialization (itinerary data sent to FE)
  - Nested sub-resource schemas (days, activities, accommodations, expenses)

All schemas inherit from CamelCaseModel so that Python snake_case fields
are automatically serialized/deserialized as camelCase for the frontend.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from src.core.schema import CamelCaseModel
from src.places.schemas import HotelResponse

# ---------------------------------------------------------------------------
# Type aliases — constrained Literal types shared across schemas
# ---------------------------------------------------------------------------

# Allowed activity categories corresponding to Goong ETL place categories
ActivityType = Literal["food", "attraction", "nature", "entertainment", "shopping"]

# Supported transportation modes between activities within a day
TransportType = Literal["walk", "bike", "bus", "taxi"]

# Expense categories for extra costs tracked at activity or day level
ExpenseCategory = Literal["food", "attraction", "entertainment", "transportation", "shopping"]


# ===================================================================
# Primitive / leaf-level schemas (no nested dependencies)
# ===================================================================


class ExtraExpenseSchema(CamelCaseModel):
    """Extra expense item attached to either an activity or a day.

    Used by FE budget tracker to itemize miscellaneous costs that don't
    fit into the standard price fields (adult_price, child_price, etc.).
    """

    id: int | None = None  # None when creating a new expense
    name: str  # Display name, e.g. "Parking fee", "Souvenir"
    amount: int = Field(ge=0)  # Cost in VND, must be non-negative
    category: ExpenseCategory  # Determines which budget bucket this falls into


class TravelerInfo(CamelCaseModel):
    """Traveler count information embedded in itinerary responses.

    The `total` field is a convenience sum (adults + children) pre-calculated
    so the FE doesn't need to recompute it for display.
    """

    adults: int = Field(ge=1)  # At least 1 adult required
    children: int = Field(default=0, ge=0)  # Optional child travelers
    total: int = Field(ge=1)  # Pre-calculated total = adults + children


# ===================================================================
# Composite schemas — used inside Day/Trip structures
# ===================================================================


class ActivitySchema(CamelCaseModel):
    """Activity schema aligned with FE Activity interface.

    Represents a single scheduled event within a trip day, including
    timing, location, type classification, and detailed cost breakdown.
    Field names match the frontend Activity TypeScript interface exactly.
    """

    # --- Identity ---
    id: int | None = None  # None for new activities, assigned after DB insert

    # --- Scheduling ---
    time: str  # Start time in "HH:mm" format, e.g. "09:00"
    end_time: str | None = None  # Optional end time in "HH:mm" format

    # --- Descriptive info ---
    name: str  # Activity name, e.g. "Visit Hoan Kiem Lake"
    location: str = ""  # Address or area description
    description: str = ""  # Detailed description for the activity
    type: ActivityType  # Category classification (food, attraction, etc.)
    image: str = ""  # URL to activity/place image

    # --- Transportation to this activity ---
    transportation: TransportType | None = None  # How traveler gets here

    # --- Cost breakdown (all amounts in VND) ---
    adult_price: int | None = Field(default=None, ge=0)  # Per-adult cost
    child_price: int | None = Field(default=None, ge=0)  # Per-child cost
    custom_cost: int | None = Field(default=None, ge=0)  # Override cost (shopping, etc.)
    bus_ticket_price: int | None = Field(default=None, ge=0)  # Per-person bus fare
    taxi_cost: int | None = Field(default=None, ge=0)  # Flat taxi fare estimate

    # --- Nested extra expenses ---
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)


class DaySchema(CamelCaseModel):
    """Trip day schema — one calendar day in the itinerary.

    Groups activities and day-level expenses for a specific date.
    The `label` field provides a user-friendly day name (e.g. "Day 1").
    """

    id: int | None = None  # None for newly added days
    label: str  # Display label, e.g. "Ngày 1" or "Day 1"
    date: str  # ISO date string, e.g. "2024-12-25"
    activities: list[ActivitySchema] = Field(default_factory=list)  # Ordered activities
    destination_name: str | None = None  # City/destination for multi-city trips
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)  # Day-level costs


class AccommodationSchema(CamelCaseModel):
    """Accommodation schema aligned with FE Accommodation interface.

    Represents hotel/lodging booking information for one or more trip days.
    Links to day IDs so FE can display which nights the accommodation covers.
    """

    # --- Identity ---
    id: int | None = None  # None for new accommodations

    # --- Hotel reference (optional — may be manually entered) ---
    hotel: HotelResponse | None = None  # Full hotel info if linked to DB record

    # --- Day association ---
    day_ids: list[int] = Field(default_factory=list)  # Which trip day IDs this covers

    # --- Booking details ---
    booking_type: Literal["hourly", "nightly", "daily"] | None = None  # Pricing model
    duration: int | None = Field(default=None, ge=0)  # Number of units booked
    name: str | None = None  # Hotel/accommodation name
    check_in: str | None = None  # Check-in time or date string
    check_out: str | None = None  # Check-out time or date string

    # --- Pricing (all amounts in VND) ---
    price_per_night: int | None = Field(default=None, ge=0)  # Unit price
    total_price: int | None = Field(default=None, ge=0)  # Calculated total


# ===================================================================
# Request schemas — API input validation
# ===================================================================


class GenerateItineraryRequest(CamelCaseModel):
    """Request for AI-powered itinerary generation (Phase C.1 pipeline).

    Triggers the ItineraryPipeline which fetches DB context (places, hotels)
    and calls Gemini LLM to produce a complete multi-day itinerary.
    """

    destination: str = Field(min_length=1, max_length=100)  # Target city name
    start_date: date  # Trip start date
    end_date: date  # Trip end date (inclusive)
    budget: int = Field(gt=0)  # Total budget in VND
    adults: int = Field(default=1, ge=1)  # Number of adult travelers
    children: int = Field(default=0, ge=0)  # Number of child travelers
    interests: list[str] = Field(default_factory=list)  # Preferred categories

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info: object) -> date:
        """Ensure end_date is not before start_date."""
        data = getattr(info, "data", {})
        start_date = data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("end_date must be on or after start_date")
        return value


class CreateTripRequest(CamelCaseModel):
    """Manual trip creation request — user builds itinerary from scratch.

    Unlike GenerateItineraryRequest, this creates an empty trip shell
    (no days or activities) that the user fills in via the TripWorkspace editor.
    """

    destination: str  # Target city/destination name
    trip_name: str  # User-chosen trip title
    start_date: date  # Trip start date
    end_date: date  # Trip end date (inclusive)
    budget: int = Field(gt=0)  # Total budget in VND
    adults_count: int = Field(default=1, ge=1)  # Number of adult travelers
    children_count: int = Field(default=0, ge=0)  # Number of child travelers
    interests: list[str] = Field(default_factory=list)  # User interest tags

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info: object) -> date:
        """Ensure end_date is not before start_date."""
        data = getattr(info, "data", {})
        start_date = data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("end_date must be on or after start_date")
        return value


class UpdateTripRequest(CamelCaseModel):
    """Full nested auto-save request for trip editing.

    Supports partial updates — only non-None fields are applied.
    When `days` or `accommodations` are provided, the service performs
    a full diff/sync (create, update, delete) against existing records.
    """

    trip_name: str | None = None  # Updated trip title
    budget: int | None = Field(default=None, gt=0)  # Updated budget in VND
    days: list[DaySchema] | None = None  # Full day structure for diff/sync
    accommodations: list[AccommodationSchema] | None = None  # Full accommodation list


class ClaimTripRequest(CamelCaseModel):
    """Guest trip claim request — transfer ownership after login.

    When a guest creates a trip without being logged in, they receive
    a one-time claim token. After registering/logging in, they submit
    this token to attach the trip to their account.
    """

    claim_token: str  # One-time opaque token issued at trip creation


# ===================================================================
# Response schemas — API output serialization
# ===================================================================


class ShareResponse(CamelCaseModel):
    """Share-link response returned after creating a public trip link.

    Contains the full URL for sharing and the raw token. If a share
    link already exists for the trip, returns a redacted response.
    """

    share_url: str  # Full shareable URL, e.g. "https://example.com/shared/<token>"
    share_token: str  # Raw opaque share token
    expires_at: datetime | None = None  # Optional expiration timestamp


class ItineraryResponse(CamelCaseModel):
    """Full itinerary response returned to FE.

    This is the primary data structure for trip display in the frontend.
    Contains all nested data (days → activities → expenses, accommodations)
    along with metadata (traveler info, timestamps, budget tracking).
    """

    # --- Trip identity and metadata ---
    id: int  # Unique trip identifier
    destination: str  # Destination city name
    trip_name: str  # User-defined or AI-generated trip title
    start_date: date  # Trip start date
    end_date: date  # Trip end date (inclusive)

    # --- Budget tracking ---
    budget: int  # Total allocated budget in VND
    total_cost: int = 0  # Calculated sum of all costs across days + accommodations

    # --- Traveler details ---
    traveler_info: TravelerInfo  # Adults/children/total counts

    # --- User preferences ---
    interests: list[str] = Field(default_factory=list)  # Interest tags

    # --- Nested trip structure ---
    days: list[DaySchema] = Field(default_factory=list)  # Ordered day plans
    accommodations: list[AccommodationSchema] = Field(default_factory=list)  # Lodging bookings

    # --- Guest claim support ---
    claim_token: str | None = None  # Present only for guest-created trips

    # --- Timestamps ---
    created_at: datetime  # When the trip was first created
    updated_at: datetime  # Last modification timestamp (auto-save updates this)
