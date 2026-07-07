/**
 * Trip domain type definitions for the frontend.
 *
 * These types represent the core data structures used across trip-related
 * pages and components. They align with (but are not identical to) the
 * backend Pydantic schemas — some fields are optional here for flexibility
 * in form state management.
 *
 * Used by: TripWorkspace, DailyItinerary, ItineraryView, CreateTrip,
 *          PlaceSelectionModal, ActivityDetailModal, BudgetTracker, etc.
 */

// ===================================================================
// Expense types — Budget tracking
// ===================================================================

/**
 * Extra expense item attached to an activity.
 *
 * Used by the BudgetTracker and ActivityDetailModal to itemize
 * miscellaneous costs that don't fit standard price fields.
 */
export interface ExtraExpense {
  id: number; // Unique expense ID
  name: string; // Display name, e.g. "Parking fee", "Souvenir"
  amount: number; // Cost in VND
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

/**
 * Day-level extra expense — same structure as ExtraExpense
 * but attached to a day rather than a specific activity.
 *
 * Enables tracking costs that apply to an entire day
 * (e.g. daily parking, entrance fees for day passes).
 */
export interface DayExtraExpense {
  id: number; // Unique expense ID
  name: string; // Display name
  amount: number; // Cost in VND
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

// ===================================================================
// Activity — A scheduled event within a trip day
// ===================================================================

/**
 * Activity within a trip day.
 *
 * Represents a single scheduled event with timing, location,
 * category classification, and detailed cost breakdown.
 * Field names use camelCase matching the BE CamelCaseModel output.
 */
export interface Activity {
  id: number; // Activity database ID

  // --- Scheduling ---
  time: string; // Start time in "HH:mm" format
  endTime?: string; // Optional end time in "HH:mm" format

  // --- Descriptive info ---
  name: string; // Activity display name, e.g. "Visit Hoan Kiem Lake"
  location: string; // Address or area description
  description: string; // Detailed description text
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping"; // Category
  image: string; // Photo URL

  // --- Transportation to this activity ---
  transportation?: "walk" | "bike" | "bus" | "taxi";

  // --- Cost fields (all amounts in VND) ---
  adultPrice?: number; // For food (per person) or attraction (ticket price)
  childPrice?: number; // For food (per person) or attraction (ticket price)
  customCost?: number; // For shopping, entertainment, or custom override

  // --- Transportation costs ---
  busTicketPrice?: number; // Per person bus ticket
  taxiCost?: number; // Total taxi cost estimate

  // --- Map coordinates ---
  latitude?: number;  // GPS latitude for map marker
  longitude?: number; // GPS longitude for map marker
  placeId?: number;   // Linked place database ID
  city?: string;      // Name of the destination city

  // --- Extra expenses ---
  extraExpenses?: ExtraExpense[]; // Additional itemized costs
}

// ===================================================================
// Day — A calendar day in the trip itinerary
// ===================================================================

/**
 * Trip day containing ordered activities and day-level expenses.
 *
 * Each day represents one calendar date in the trip plan.
 * The `label` provides a user-friendly name shown in the day tabs.
 */
export interface Day {
  id: number; // TripDay database ID
  label: string; // Display label, e.g. "Ngày 1" or "Day 1"
  date: string; // ISO date string, e.g. "2024-12-25"
  activities: Activity[]; // Ordered list of activities
  destinationName?: string; // City name for multi-city trips
  extraExpenses?: DayExtraExpense[]; // Day-level miscellaneous costs
}

// ===================================================================
// Place & Destination — Reference data types
// ===================================================================

/**
 * Place type for search results and selection modals.
 *
 * Represents a travel location (restaurant, attraction, park, etc.)
 * from the places database. Used in PlaceSelectionModal, CityDetail,
 * SavedPlaces, and ContextualSuggestionsPanel.
 */
export interface Place {
  id: number; // Place database ID
  name: string; // Place display name
  reviewCount: number; // Number of reviews from source
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping"; // Category
  image: string; // Photo URL
  price?: string; // Display price string (formatted)
  location?: string; // Address text
  reviews?: number; // Review count (alias for some components)
  rating?: number; // 0-5 star rating (optional — may not be available)
  saved: boolean; // Whether the current user has bookmarked this place
  city: string; // Parent destination name
  description?: string; // Place description text
  latitude?: number; // GPS latitude
  longitude?: number; // GPS longitude
}

/**
 * Destination (city) type for the city selection UI.
 *
 * Used in CreateTrip page for destination selection.
 * Note: This is a simplified version — the service-layer
 * DestinationResponse includes additional data quality fields.
 */
export interface Destination {
  id: number; // Destination database ID
  name: string; // City display name
  country: string; // Country name (default: "Vietnam")
  image: string; // Cover image URL
  rating: number; // Average rating across places
}

// ===================================================================
// Trip planning types — Form state and UI helpers
// ===================================================================

/** Date allocation for multi-city trip planning (DayAllocation page). */
export interface DateAllocation {
  from: Date; // Start date for this segment
  to: Date; // End date for this segment
  days: number; // Number of days in this segment
}

// ===================================================================
// Hotel & Accommodation — Lodging types
// ===================================================================

/**
 * Hotel reference data from the places database.
 *
 * Used in TripAccommodation component for hotel selection
 * and display within accommodation records.
 */
export interface Hotel {
  id: number; // Hotel database ID
  name: string; // Hotel display name
  rating: number; // 0-5 star rating
  reviewCount: number; // Number of reviews
  price: number; // Price per night in VND
  image: string; // Photo URL
  location: string; // Address text
  city: string; // Parent destination name
  amenities: string[]; // e.g. ["WiFi", "Pool", "Parking"]
  description: string; // Hotel description
}

/**
 * Accommodation booking record linked to specific trip days.
 *
 * Used in TripWorkspace and TripAccommodation for managing
 * lodging bookings. The `dayIds` field links to TripDay records.
 */
export interface Accommodation {
  id?: number; // Accommodation database ID when persisted

  // --- Hotel reference (optional — may be manually entered) ---
  hotel?: Hotel | null; // Full hotel data if linked to DB record

  // --- Day association ---
  dayIds: number[]; // Which TripDay IDs this accommodation covers

  // --- Booking details ---
  bookingType?: "hourly" | "nightly" | "daily"; // Pricing model
  duration?: number; // Number of booking units
  name?: string; // Hotel/accommodation name
  checkIn?: string; // Check-in date/time
  checkOut?: string; // Check-out date/time

  // --- Pricing (VND) ---
  pricePerNight?: number; // Unit price
  totalPrice?: number; // Calculated total
}

// ===================================================================
// Traveler & Utility types
// ===================================================================

/** Traveler count information displayed in trip headers and summaries. */
export interface TravelerInfo {
  adults: number; // Number of adult travelers (≥1)
  children: number; // Number of child travelers (≥0)
  total: number; // Pre-calculated sum: adults + children
}

/**
 * Time conflict warning for overlapping activities.
 *
 * Used by the DailyItinerary component to highlight activities
 * whose time ranges overlap with another activity in the same day.
 */
export interface TimeConflictWarning {
  hasConflict: boolean; // Whether a time overlap was detected
  conflictWith?: Activity; // The conflicting activity (if any)
}
