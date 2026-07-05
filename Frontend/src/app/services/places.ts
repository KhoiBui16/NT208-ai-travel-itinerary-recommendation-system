/**
 * Places API service — FE client for destination, place, and bookmark operations.
 *
 * Communicates with the Backend places endpoints:
 *   - Destinations:  GET /api/v1/places/destinations
 *   - Place Search:  GET /api/v1/places/search
 *   - Place Detail:  GET /api/v1/places/:id
 *   - Saved Places:  GET/POST/DELETE /api/v1/places/saved
 *
 * All types are aligned with the BE CamelCaseModel schema definitions.
 */

import { api } from "./api";

// ===================================================================
// Types — Match BE CamelCaseModel place schemas
// ===================================================================

/**
 * Destination response for city listing pages.
 *
 * Includes data quality metadata (readiness info) that is displayed
 * as advisory warnings. `isGenerateReady` is a coarse backend signal
 * based on current place coverage, not a guarantee that every trip
 * duration will pass generate validation.
 */
export interface DestinationResponse {
  // --- Identity ---
  id: number;
  name: string; // City/destination display name
  slug: string; // URL-safe slug from backend, used for FE routing
  country: string; // Default: "Vietnam" (always present — BE defaults to "Vietnam")

  // --- Media ---
  image: string; // Cover image URL

  // --- Aggregate stats ---
  rating: number; // Average rating across places (defaults to 0 when no places)
  placesCount: number; // Number of places in this destination
  hotelsCount: number; // Number of hotels in this destination

  // --- Data quality metadata (advisory, not a submit gate) ---
  isGenerateReady: boolean; // Whether AI generation is available
  readinessStatus: "ready" | "partial" | "sparse"; // Data quality tier
  readinessReason: string | null; // Human-readable warning (Vietnamese)
}

export interface HotelResponse {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  image: string;
  location: string;
  city: string;
  amenities: string[];
  description: string;
}

export interface DestinationDetailResponse {
  destination: DestinationResponse;
  places: PlaceResponse[];
  hotels: HotelResponse[];
}

/**
 * Place response for search results and detail views.
 *
 * Matches the BE PlaceResponse schema. Used across multiple FE pages:
 * CityDetail, PlaceSelectionModal, SavedPlaces, ContextualSuggestionsPanel.
 */
export interface PlaceResponse {
  // --- Identity ---
  id: number;
  name: string; // Place display name

  // --- Quality metrics ---
  reviewCount: number; // Number of reviews from source
  rating: number | null; // 0-5 star rating (null if unrated — BE sends null when unrated)

  // --- Classification ---
  type: string; // Category: "food" | "attraction" | "nature" | etc.

  // --- Media and location ---
  image: string; // Photo URL
  price: string | null; // Display price string (formatted VND or null — BE sends string)
  location: string | null; // Address text
  latitude?: number; // Map coordinate (Goong map integration)
  longitude?: number; // Map coordinate (Goong map integration)

  // --- Review info ---
  reviews: unknown[]; // Review details (if available)

  // --- User state ---
  saved: boolean; // Whether the current user has bookmarked this

  // --- Context ---
  city: string; // Parent destination name
  description: string | null; // Place description
}

/**
 * Saved place response — includes full place details for display.
 * Used in the SavedPlaces page to show bookmarked places.
 */
export interface SavedPlaceResponse {
  id: number; // SavedPlace record ID (used for unsave operation)
  place: PlaceResponse; // Full nested place data
  createdAt: string; // ISO datetime when the place was saved
}

// ===================================================================
// Destination API — Public city browsing
// ===================================================================

/** List all active destinations with place/hotel counts and data quality info. */
export async function listDestinations(): Promise<DestinationResponse[]> {
  return api.get<DestinationResponse[]>("/api/v1/places/destinations");
}

/**
 * Get detailed info for a destination including places and hotels.
 * Accepts either destination name or slug as the path parameter.
 */
export async function getDestinationDetail(
  name: string,
): Promise<DestinationDetailResponse> {
  return api.get<DestinationDetailResponse>(
    `/api/v1/places/destinations/${encodeURIComponent(name)}`,
  );
}

// ===================================================================
// Place Search API — Public place discovery
// ===================================================================

/**
 * Search places with optional filters (query, city, category).
 *
 * All parameters are optional — omitting all returns top-rated places.
 * Builds a clean query string from provided params only.
 */
export async function searchPlaces(params: {
  query?: string; // Free-text search on place name
  city?: string; // Filter by destination name
  category?: string; // Filter by category (food, attraction, etc.)
  limit?: number; // Max results (default 20, max 100)
}): Promise<PlaceResponse[]> {
  // Build query string from non-empty parameters only
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.city) qs.set("city", params.city);
  if (params.category) qs.set("category", params.category);
  if (params.limit) qs.set("limit", String(params.limit));
  const search = qs.toString();

  return api.get<PlaceResponse[]>(
    `/api/v1/places/search${search ? `?${search}` : ""}`,
  );
}

/** Get a single place by its database ID. Returns 404 if not found. */
export async function getPlaceById(placeId: number): Promise<PlaceResponse> {
  return api.get<PlaceResponse>(`/api/v1/places/${placeId}`);
}

// ===================================================================
// Saved Places API — Authenticated bookmark operations
// ===================================================================

/** List all bookmarked places for the authenticated user. */
export async function listSavedPlaces(): Promise<SavedPlaceResponse[]> {
  return api.get<SavedPlaceResponse[]>("/api/v1/places/saved/list");
}

/**
 * Bookmark a place for the authenticated user.
 * Returns 409 if already saved, 404 if place doesn't exist.
 */
export async function savePlace(
  placeId: number,
): Promise<SavedPlaceResponse> {
  return api.post<SavedPlaceResponse>("/api/v1/places/saved", { placeId });
}

/** Remove a bookmark. Validates ownership on the backend. */
export async function unsavePlace(savedId: number): Promise<void> {
  return api.delete(`/api/v1/places/saved/${savedId}`);
}
