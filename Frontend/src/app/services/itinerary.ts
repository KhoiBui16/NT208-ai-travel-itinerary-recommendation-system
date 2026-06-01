import { api } from "./api";

// ---------- Types (match BE CamelCaseModel) ----------

export interface TravelerInfo {
  adults: number;
  children: number;
  total: number;
}

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
}

export interface DayItem {
  id: number;
  label?: string;
  date?: string;
  destinationName?: string;
  activities: ActivityItem[];
}

export interface AccommodationItem {
  id?: number;
  hotel?: unknown;
  dayIds: number[];
  bookingType?: string;
  duration?: number;
  name?: string;
  checkIn?: string;
  checkOut?: string;
  pricePerNight?: number;
  totalPrice?: number;
}

export interface ItineraryResponse {
  id: number;
  destination: string;
  tripName: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalCost: number;
  travelerInfo: TravelerInfo;
  interests: string[];
  days: DayItem[];
  accommodations: AccommodationItem[];
  claimToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  items: ItineraryResponse[];
  total: number;
  page: number;
  pageSize: number;
}

interface ShareResponse {
  shareUrl: string;
  shareToken: string;
  expiresAt: string | null;
}

// ---------- Itinerary API ----------

export async function listItineraries(
  page = 1,
  size = 20,
): Promise<PaginatedResponse> {
  return api.get<PaginatedResponse>(
    `/api/v1/itineraries?page=${page}&size=${size}`,
  );
}

export async function getItinerary(tripId: number): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/itineraries/${tripId}`);
}

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

export async function updateItinerary(
  tripId: number,
  data: {
    tripName?: string;
    budget?: number;
    days?: DayItem[];
    accommodations?: AccommodationItem[];
  },
): Promise<ItineraryResponse> {
  return api.put<ItineraryResponse>(`/api/v1/itineraries/${tripId}`, data);
}

export async function deleteItinerary(tripId: number): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}`);
}

export async function rateItinerary(
  tripId: number,
  rating: number,
): Promise<{ success: boolean; message: string }> {
  return api.put(
    `/api/v1/itineraries/${tripId}/rating?rating=${rating}`,
    null,
  );
}

export async function shareItinerary(
  tripId: number,
): Promise<ShareResponse> {
  return api.post<ShareResponse>(`/api/v1/itineraries/${tripId}/share`);
}

export async function getSharedItinerary(
  shareToken: string,
): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/shared/${shareToken}`);
}

export async function claimItinerary(
  tripId: number,
  claimToken: string,
): Promise<{ claimed: boolean; tripId: number }> {
  return api.post(`/api/v1/itineraries/${tripId}/claim`, { claimToken });
}

// ---------- Nested: Activities ----------

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

export async function deleteActivity(
  tripId: number,
  activityId: number,
): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}/activities/${activityId}`);
}

// ---------- Nested: Accommodations ----------

export async function addAccommodation(
  tripId: number,
  accommodation: AccommodationItem,
): Promise<AccommodationItem> {
  return api.post<AccommodationItem>(
    `/api/v1/itineraries/${tripId}/accommodations`,
    accommodation,
  );
}

export async function deleteAccommodation(
  tripId: number,
  accommodationId: number,
): Promise<void> {
  return api.delete(
    `/api/v1/itineraries/${tripId}/accommodations/${accommodationId}`,
  );
}
