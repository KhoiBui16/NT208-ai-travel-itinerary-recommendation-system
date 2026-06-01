import { api } from "./api";

// ---------- Types (match BE CamelCaseModel) ----------

export interface DestinationResponse {
  id: number;
  name: string;
  country: string;
  image: string;
  rating: number;
  placesCount: number;
  hotelsCount: number;
  isGenerateReady: boolean;
  readinessStatus: "ready" | "partial" | "sparse";
  readinessReason: string | null;
}

export interface PlaceResponse {
  id: number;
  name: string;
  reviewCount: number;
  type: string;
  image: string;
  price: number;
  location: string;
  reviews: unknown[];
  rating: number;
  saved: boolean;
  city: string;
  description: string;
}

export interface SavedPlaceResponse {
  id: number;
  place: PlaceResponse;
  createdAt: string;
}

// ---------- Places API ----------

export async function listDestinations(): Promise<DestinationResponse[]> {
  return api.get<DestinationResponse[]>("/api/v1/places/destinations");
}

export async function getDestinationDetail(
  name: string,
): Promise<Record<string, unknown>> {
  return api.get(`/api/v1/places/destinations/${encodeURIComponent(name)}`);
}

export async function searchPlaces(params: {
  query?: string;
  city?: string;
  category?: string;
  limit?: number;
}): Promise<PlaceResponse[]> {
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

export async function getPlaceById(placeId: number): Promise<PlaceResponse> {
  return api.get<PlaceResponse>(`/api/v1/places/${placeId}`);
}

// ---------- Saved places ----------

export async function listSavedPlaces(): Promise<SavedPlaceResponse[]> {
  return api.get<SavedPlaceResponse[]>("/api/v1/places/saved/list");
}

export async function savePlace(
  placeId: number,
): Promise<SavedPlaceResponse> {
  return api.post<SavedPlaceResponse>("/api/v1/places/saved", { placeId });
}

export async function unsavePlace(savedId: number): Promise<void> {
  return api.delete(`/api/v1/places/saved/${savedId}`);
}
