/**
 * Itinerary API service — FE client for trip CRUD and sub-resource operations.
 *
 * Communicates with the Backend itinerary endpoints:
 *   - Main CRUD:         POST/GET/PUT/DELETE /api/v1/itineraries
 *   - AI Generation:     POST /api/v1/itineraries/generate
 *   - Rating & Share:    PUT /api/v1/itineraries/:id/rating, POST .../share
 *   - Guest Claim:       POST /api/v1/itineraries/:id/claim
 *   - Activity CRUD:     POST/PUT/DELETE /api/v1/itineraries/:id/activities
 *   - Accommodation CRUD: POST/DELETE /api/v1/itineraries/:id/accommodations
 *   - Shared Access:     GET /api/v1/shared/:shareToken
 *
 * All types are aligned with the BE CamelCaseModel schema definitions.
 */

import { api } from "./api";

// ===================================================================
// Types — Match BE CamelCaseModel itinerary schemas
// ===================================================================

/** Traveler count information embedded in itinerary responses. */
export interface TravelerInfo {
  adults: number; // Number of adult travelers (≥1)
  children: number; // Number of child travelers (≥0)
  total: number; // Pre-calculated sum: adults + children
}

/**
 * Activity item within a trip day.
 *
 * Maps to BE ActivitySchema. Field names use camelCase to match
 * the automatic CamelCaseModel serialization from the backend.
 */
export interface ActivityItem {
  id?: number;
  time: string;
  endTime?: string;
  name: string;
  location: string;
  description: string;
  type: string;
  image?: string;
  transportation?: string;
  adultPrice?: number;
  childPrice?: number;
  customCost?: number;
  busTicketPrice?: number;
  taxiCost?: number;
  extraExpenses?: unknown[];

  latitude?: number | null;
  longitude?: number | null;
}

/** A single day in a trip itinerary, containing ordered activities. */
export interface DayItem {
  id: number; // TripDay database ID
  label?: string; // Display label, e.g. "Ngày 1"
  date?: string; // ISO date string, e.g. "2024-12-25"
  destinationName?: string; // City name for multi-city trips
  activities: ActivityItem[]; // Ordered list of activities for this day
}

/**
 * Accommodation booking record linked to specific trip days.
 *
 * Maps to BE AccommodationSchema. The `dayIds` field specifies
 * which TripDay records this accommodation covers.
 */
export interface AccommodationItem {
  id?: number; // Assigned after DB insert, undefined for new records

  // --- Hotel reference (optional) ---
  hotel?: unknown; // Full hotel data if linked to DB record

  // --- Day association ---
  dayIds: number[]; // Which TripDay IDs this accommodation covers

  // --- Booking details ---
  bookingType?: string; // "hourly" | "nightly" | "daily"
  duration?: number; // Number of booking units
  name?: string; // Hotel/accommodation name
  checkIn?: string; // Check-in date/time
  checkOut?: string; // Check-out date/time

  // --- Pricing (VND) ---
  pricePerNight?: number; // Unit price
  totalPrice?: number; // Calculated total
}

/**
 * Full itinerary response from the backend.
 *
 * This is the primary data structure for trip display across all FE pages:
 * TripWorkspace, ItineraryView, TripHistory, SharedTripView, etc.
 */
export interface ItineraryResponse {
  // --- Trip identity ---
  id: number; // Unique trip ID
  destination: string; // Destination city name
  tripName: string; // User-defined or AI-generated title
  startDate: string; // ISO date string
  endDate: string; // ISO date string

  // --- Budget ---
  budget: number; // Total allocated budget (VND)
  totalCost: number; // Calculated cost sum

  // --- Traveler info ---
  travelerInfo: TravelerInfo;

  // --- Preferences ---
  interests: string[]; // User interest tags

  // --- Nested structure ---
  days: DayItem[]; // Ordered day plans (empty in list responses)
  accommodations: AccommodationItem[]; // Lodging bookings

  // --- Guest claim support ---
  claimToken: string | null; // Present only for guest-created trips

  // --- Timestamps ---
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime (auto-save updates this)
}

/** Paginated list response for trip listing endpoints. */
interface PaginatedResponse {
  items: ItineraryResponse[]; // Trip summaries (no nested days/activities)
  total: number; // Total matching trips
  page: number; // Current page number
  pageSize: number; // Items per page
}

/** Response from the share trip endpoint. */
interface ShareResponse {
  shareUrl: string; // Full shareable URL
  shareToken: string; // Raw opaque token (or "[REDACTED]" if already issued)
  expiresAt: string | null; // Optional expiration timestamp
}

// ===================================================================
// Main Trip CRUD API — Lifecycle operations
// ===================================================================

/**
 * List all trips for the authenticated user (paginated).
 * Returns lightweight summaries without nested days/activities.
 */
export async function listItineraries(
  page = 1,
  size = 20,
): Promise<PaginatedResponse> {
  return api.get<PaginatedResponse>(
    `/api/v1/itineraries?page=${page}&size=${size}`,
  );
}

/** Get full trip details including nested days, activities, and accommodations. */
export async function getItinerary(tripId: number): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/itineraries/${tripId}`);
}

/**
 * Create a new manual trip (empty shell, no AI generation).
 * Both authenticated and guest users can create trips.
 */
export async function createItinerary(data: {
  destination: string;
  tripName: string;
  startDate: string;
  endDate: string;
  budget: number;
  adultsCount?: number;
  childrenCount?: number;
  interests?: string[];
}): Promise<ItineraryResponse> {
  return api.post<ItineraryResponse>("/api/v1/itineraries", data);
}

/**
 * Generate a complete AI-powered itinerary (Phase C.1).
 * Triggers the ItineraryPipeline on the backend.
 */
export async function generateItinerary(data: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  adults?: number;
  children?: number;
  interests?: string[];
}): Promise<ItineraryResponse> {
  return api.post<ItineraryResponse>("/api/v1/itineraries/generate", data);
}

/**
 * Auto-save trip changes — supports partial nested updates.
 * Called by TripWorkspace on every meaningful edit.
 */
export async function updateItinerary(
  tripId: number,
  data: {
    tripName?: string;
    budget?: number;
    travelerInfo?: TravelerInfo;
    days?: DayItem[];
    accommodations?: AccommodationItem[];
  },
): Promise<ItineraryResponse> {
  return api.put<ItineraryResponse>(`/api/v1/itineraries/${tripId}`, data);
}

/** Permanently delete a trip. Returns void on success. */
export async function deleteItinerary(tripId: number): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}`);
}

// ===================================================================
// Rating & Share — Social and feedback features
// ===================================================================

/** Rate a trip with 1-5 stars (upsert — calling again updates the rating). */
export async function rateItinerary(
  tripId: number,
  rating: number,
): Promise<{ success: boolean; message: string }> {
  return api.put(`/api/v1/itineraries/${tripId}/rating?rating=${rating}`, null);
}

/** Create a public share link for read-only trip access. */
export async function shareItinerary(tripId: number): Promise<ShareResponse> {
  return api.post<ShareResponse>(`/api/v1/itineraries/${tripId}/share`);
}

/** Access a shared trip via its public share token (no auth required). */
export async function getSharedItinerary(
  shareToken: string,
): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/shared/${shareToken}`);
}

/**
 * Claim a guest-created trip after login/registration.
 * Submits the one-time claim token to transfer ownership.
 */
export async function claimItinerary(
  tripId: number,
  claimToken: string,
): Promise<{ claimed: boolean; tripId: number }> {
  return api.post(`/api/v1/itineraries/${tripId}/claim`, { claimToken });
}

// ===================================================================
// Nested: Activity CRUD — Sub-resource operations within a trip day
// ===================================================================

/** Add a new activity to a specific day within the trip. */
export async function addActivity(
  tripId: number,
  dayId: number,
  activity: Omit<ActivityItem, "id">,
): Promise<ActivityItem> {
  return api.post<ActivityItem>(
    `/api/v1/itineraries/${tripId}/activities?day_id=${dayId}`,
    activity,
  );
}

/** Update an existing activity's details (time, name, costs, etc.). */
export async function updateActivity(
  tripId: number,
  activityId: number,
  activity: ActivityItem,
): Promise<ActivityItem> {
  return api.put<ActivityItem>(
    `/api/v1/itineraries/${tripId}/activities/${activityId}`,
    activity,
  );
}

/** Remove an activity from the trip. */
export async function deleteActivity(
  tripId: number,
  activityId: number,
): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}/activities/${activityId}`);
}

// ===================================================================
// Nested: Accommodation CRUD — Lodging sub-resource operations
// ===================================================================

/** Add a new accommodation record to the trip. */
export async function addAccommodation(
  tripId: number,
  accommodation: AccommodationItem,
): Promise<AccommodationItem> {
  return api.post<AccommodationItem>(
    `/api/v1/itineraries/${tripId}/accommodations`,
    accommodation,
  );
}

/** Remove an accommodation record from the trip. */
export async function deleteAccommodation(
  tripId: number,
  accommodationId: number,
): Promise<void> {
  return api.delete(
    `/api/v1/itineraries/${tripId}/accommodations/${accommodationId}`,
  );
}
