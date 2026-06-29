import type { ItineraryResponse } from "../services/itinerary";
import type {
  Accommodation,
  Activity,
  Day,
  TravelerInfo,
} from "../types/trip.types";

export const CURRENT_TRIP_STORAGE_KEY = "currentTrip";

export interface SessionTripData {
  tripId: number | null;
  name: string;
  days: Day[];
  accommodations: Record<number, Accommodation>;
  totalBudget: number;
  travelers: TravelerInfo;
  updatedAt: string | null;
  savedAt: string;
}

function buildAccommodationIdentity(accommodation: Accommodation): string {
  if (typeof accommodation.id === "number") {
    return `id:${accommodation.id}`;
  }

  const sortedDayIds = [...(accommodation.dayIds || [])].sort((a, b) => a - b);
  return [
    `days:${sortedDayIds.join(",")}`,
    `hotel:${accommodation.hotel?.id ?? ""}`,
    `name:${accommodation.name ?? accommodation.hotel?.name ?? ""}`,
    `type:${accommodation.bookingType ?? ""}`,
    `duration:${accommodation.duration ?? ""}`,
  ].join("|");
}

export function normalizeAccommodationRecord(
  records: Record<number, Accommodation> | undefined,
): Record<number, Accommodation> {
  if (!records) return {};

  const normalized: Record<number, Accommodation> = {};
  const seen = new Set<string>();
  let fallbackKey = -1;

  for (const [rawKey, accommodation] of Object.entries(records)) {
    if (!accommodation || !Array.isArray(accommodation.dayIds)) continue;

    const identity = buildAccommodationIdentity(accommodation);
    if (seen.has(identity)) continue;
    seen.add(identity);

    let key =
      typeof accommodation.id === "number"
        ? accommodation.id
        : Number(rawKey);

    if (!Number.isFinite(key) || normalized[key]) {
      while (normalized[fallbackKey]) fallbackKey -= 1;
      key = fallbackKey;
      fallbackKey -= 1;
    }

    normalized[key] = {
      ...accommodation,
      dayIds: [...accommodation.dayIds],
    };
  }

  return normalized;
}

export function getUniqueAccommodationsFromRecord(
  records: Record<number, Accommodation> | undefined,
): Accommodation[] {
  return Object.values(normalizeAccommodationRecord(records));
}

export function mapItineraryResponseToSessionTrip(
  response: ItineraryResponse,
): SessionTripData {
  const days: Day[] = response.days.map((day, dayIndex) => ({
    id: day.id || dayIndex + 1,
    label:
      day.label ||
      `Ngày ${dayIndex + 1}${day.destinationName ? ` - ${day.destinationName}` : ""}`,
    date: day.date || "",
    destinationName: day.destinationName,
    activities: (day.activities || []).map(
      (activity, activityIndex): Activity => ({
        id: activity.id ?? day.id * 100 + activityIndex + 1,
        name: activity.name,
        time: activity.time,
        endTime: activity.endTime,
        location: activity.location,
        description: activity.description,
        type: activity.type as Activity["type"],
        image: activity.image || "",
        transportation: activity.transportation as Activity["transportation"],
        adultPrice: activity.adultPrice,
        childPrice: activity.childPrice,
        customCost: activity.customCost,
        busTicketPrice: activity.busTicketPrice,
        taxiCost: activity.taxiCost,
        extraExpenses: [],
      }),
    ),
    extraExpenses: [],
  }));

  const accommodations: Record<number, Accommodation> = {};
  for (const [index, accommodation] of (response.accommodations || []).entries()) {
    const key = accommodation.id ?? -(index + 1);
    accommodations[key] = {
      id: accommodation.id,
      hotel: (accommodation.hotel as Accommodation["hotel"]) || null,
      dayIds: accommodation.dayIds,
      bookingType: accommodation.bookingType as Accommodation["bookingType"],
      duration: accommodation.duration,
      name: accommodation.name,
      checkIn: accommodation.checkIn,
      checkOut: accommodation.checkOut,
      pricePerNight: accommodation.pricePerNight,
      totalPrice: accommodation.totalPrice,
    };
  }

  return {
    tripId: response.id,
    name: response.tripName || response.destination,
    days,
    accommodations: normalizeAccommodationRecord(accommodations),
    totalBudget: response.budget || 0,
    travelers: response.travelerInfo,
    updatedAt: response.updatedAt ?? null,
    savedAt: new Date().toISOString(),
  };
}

export function readSessionTrip(): SessionTripData | null {
  const raw = sessionStorage.getItem(CURRENT_TRIP_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionTripData>;
    if (!Array.isArray(parsed.days) || typeof parsed.name !== "string") {
      return null;
    }

    return {
      tripId: typeof parsed.tripId === "number" ? parsed.tripId : null,
      name: parsed.name,
      days: parsed.days,
      accommodations: normalizeAccommodationRecord(parsed.accommodations),
      totalBudget: parsed.totalBudget || 0,
      travelers:
        parsed.travelers || {
          adults: 2,
          children: 0,
          total: 2,
        },
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      savedAt: parsed.savedAt || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeSessionTrip(tripData: SessionTripData): void {
  sessionStorage.setItem(CURRENT_TRIP_STORAGE_KEY, JSON.stringify(tripData));
}
