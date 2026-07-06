/**
 * savedPlaces.ts — Contract normalizer for saved place responses.
 *
 * The BE SavedPlaceResponse shape is:
 *   { id: savedId, place: { id: placeId, name, image, location, category/type, city, ... }, createdAt }
 *
 * This module provides:
 * - A normalizer that extracts `savedId` (bookmark row ID) and `placeId` (actual place ID)
 * - Lookup helpers so callers never confuse the two IDs
 *
 * Contract rules:
 * - `savePlace(placeId)`   → always use actual place ID
 * - `unsavePlace(savedId)` → always use bookmark row ID
 */

export interface NormalizedSavedPlace {
  savedId: number; // SavedPlace.id — used for DELETE /api/v1/places/saved/:savedId
  placeId: number; // Place.id — used for POST /api/v1/places/saved { placeId }
  name: string;
  image: string | null;
  location: string | null;
  category: string | null;
  city: string | null;
  createdAt?: string;
}

/**
 * Normalize a raw saved-place response from the API.
 *
 * Handles both:
 *   - Correct BE shape: { id: savedId, place: { id: placeId, ... } }
 *   - Partial/legacy shape: fallback to null on any missing key
 *
 * Returns null if the input is unusable (missing savedId or placeId).
 */
export function normalizeSavedPlace(raw: unknown): NormalizedSavedPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const savedId = typeof r.id === "number" ? r.id : null;
  const place =
    r.place && typeof r.place === "object"
      ? (r.place as Record<string, unknown>)
      : null;
  if (!savedId || !place) return null;

  const placeId = typeof place.id === "number" ? place.id : null;
  if (!placeId) return null;

  return {
    savedId,
    placeId,
    name: typeof place.name === "string" ? place.name : "",
    image: typeof place.image === "string" ? place.image : null,
    location: typeof place.location === "string" ? place.location : null,
    // BE sends "type" (PlaceResponse.type), not "category"
    category: typeof place.type === "string" ? place.type : null,
    city: typeof place.city === "string" ? place.city : null,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
  };
}

/** Normalize an array of raw saved-place entries, dropping invalid rows. */
export function normalizeSavedPlaces(
  rawList: unknown[],
): NormalizedSavedPlace[] {
  return rawList
    .map(normalizeSavedPlace)
    .filter((s): s is NormalizedSavedPlace => s !== null);
}

/**
 * Find a normalized saved place by place ID.
 * Use this when you have a placeId and need the savedId for unsave.
 */
export function findSavedPlaceByPlaceId(
  list: NormalizedSavedPlace[],
  placeId: number,
): NormalizedSavedPlace | undefined {
  return list.find((s) => s.placeId === placeId);
}

/**
 * Find a normalized saved place by name (case-sensitive, exact).
 * Fallback for when the place ID is not available (legacy/mock places).
 */
export function findSavedPlaceByName(
  list: NormalizedSavedPlace[],
  name: string,
): NormalizedSavedPlace | undefined {
  return list.find((s) => s.name === name);
}

/**
 * Build a Set of saved place IDs for fast O(1) membership checks.
 * Use this in components that render many places and check `isSaved`.
 */
export function buildSavedPlaceIdSet(
  list: NormalizedSavedPlace[],
): Set<number> {
  return new Set(list.map((s) => s.placeId));
}
