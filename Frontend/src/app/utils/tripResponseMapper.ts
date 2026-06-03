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
  savedAt: string;
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
  for (const accommodation of response.accommodations || []) {
    for (const dayId of accommodation.dayIds || []) {
      accommodations[dayId] = {
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
  }

  return {
    tripId: response.id,
    name: response.tripName || response.destination,
    days,
    accommodations,
    totalBudget: response.budget || 0,
    travelers: response.travelerInfo,
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
      accommodations: parsed.accommodations || {},
      totalBudget: parsed.totalBudget || 0,
      travelers:
        parsed.travelers || {
          adults: 2,
          children: 0,
          total: 2,
        },
      savedAt: parsed.savedAt || new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeSessionTrip(tripData: SessionTripData): void {
  sessionStorage.setItem(CURRENT_TRIP_STORAGE_KEY, JSON.stringify(tripData));
}
