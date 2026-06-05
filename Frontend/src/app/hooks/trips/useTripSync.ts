import { useEffect, useRef, useCallback, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Day, Accommodation, TravelerInfo, Place, Activity, ExtraExpense, DayExtraExpense } from "../../types/trip.types";
import { getItinerary, createItinerary, updateItinerary } from "../../services/itinerary";
import { useTripWizard } from "../../contexts/TripWizardContext";
import { storePendingClaim } from "../../contexts/AuthContext";
import { readSessionTrip, writeSessionTrip } from "../../utils/tripResponseMapper";
import { ApiError } from "../../services/api";

/** Convert dd/MM/yyyy → yyyy-MM-dd for API. Pass-through if already ISO or empty. */
function toISODate(d: string): string {
  if (!d) return d;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return d; // already ISO or other format
}

export const useTripSync = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  setSelectedDayId: React.Dispatch<React.SetStateAction<number>>,
  accommodations: Record<number, Accommodation>,
  setAccommodations: React.Dispatch<React.SetStateAction<Record<number, Accommodation>>>,
  totalBudget: number,
  setTotalBudget: React.Dispatch<React.SetStateAction<number>>,
  travelers: TravelerInfo,
  setTravelers: React.Dispatch<React.SetStateAction<TravelerInfo>>,
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>,
  setPlaces: React.Dispatch<React.SetStateAction<Place[]>>,
  isAuthenticated: boolean,
  setShowLoginModal: (show: boolean) => void,
  updateNextId: (id: number) => void,
  tripName: string,
  setTripName: React.Dispatch<React.SetStateAction<string>>,
  tripIdParam?: number | null,
) => {
  const isInitialMount = useRef(true);
  const currentTripIdRef = useRef<number | null>(tripIdParam ?? null);
  const [currentTripId, _setCurrentTripId] = useState<number | null>(tripIdParam ?? null);
  const setCurrentTripId = useCallback((id: number | null) => {
    currentTripIdRef.current = id;
    _setCurrentTripId(id);
  }, []);
  const { destinations: wizardDestinations, dayAllocations: wizardAllocations, budget: wizardBudget, resetWizard } = useTripWizard();

  // Sync auth state
  useEffect(() => {
    setIsAuthenticated(isAuthenticated);
  }, [isAuthenticated, setIsAuthenticated]);

  // 1. Sync ban đầu khi vào trang
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      // If we have a tripId from URL, load from API
      if (tripIdParam && isAuthenticated) {
        try {
          const resp = await getItinerary(tripIdParam);
          if (!isMounted) return;
          setCurrentTripId(resp.id);

          if (resp.tripName) setTripName(resp.tripName);
          if (resp.budget) setTotalBudget(resp.budget);
          if (resp.travelerInfo) setTravelers(resp.travelerInfo);

          if (resp.days && resp.days.length > 0) {
            const mappedDays: Day[] = resp.days.map((d, idx) => ({
              id: d.id || idx + 1,
              label: d.label || `Ngày ${idx + 1}${d.destinationName ? ` - ${d.destinationName}` : ""}`,
              date: d.date || "",
              activities: (d.activities || []).map((a) => ({
                id: a.id ?? Date.now() + idx * 100 + Math.random(),
                name: a.name,
                time: a.time,
                endTime: a.endTime,
                location: a.location,
                description: a.description,
                type: a.type || "attraction",
                image: a.image,
                transportation: a.transportation,
                adultPrice: a.adultPrice,
                childPrice: a.childPrice,
                customCost: a.customCost,
                taxiCost: a.taxiCost,
                extraExpenses: (a.extraExpenses || []) as ExtraExpense[],
              })),
              destinationName: d.destinationName,
            }));
            setDays(mappedDays);
            setSelectedDayId(mappedDays[0].id);

            let maxId = 0;
            mappedDays.forEach((day) => {
              if (day.id > maxId) maxId = day.id;
              day.activities?.forEach((act) => {
                if (act.id > maxId) maxId = act.id;
              });
            });
            updateNextId(maxId + 1);
          }

          // Load accommodations from API response
          if (resp.accommodations && resp.accommodations.length > 0) {
            const accMap: Record<number, Accommodation> = {};
            resp.accommodations.forEach((acc) => {
              (acc.dayIds || []).forEach((dayId: number) => {
                accMap[dayId] = {
                  id: acc.id,
                  hotel: acc.hotel as any,
                  dayIds: acc.dayIds,
                  bookingType: acc.bookingType,
                  duration: acc.duration,
                  name: acc.name,
                  checkIn: acc.checkIn,
                  checkOut: acc.checkOut,
                  pricePerNight: acc.pricePerNight,
                  totalPrice: acc.totalPrice,
                };
              });
            });
            setAccommodations(accMap);
          }

          isInitialMount.current = false;
          return;
        } catch (error) {
          console.error("Error loading trip from API:", error);
          // Fall through to sessionStorage fallback
        }
      }

      // Fallback: check sessionStorage for workspace-passed data (wizard flow)
      const tripData = readSessionTrip();
      if (tripData?.days?.length) {
        if (tripData.tripId) setCurrentTripId(tripData.tripId);
        if (tripData.name) setTripName(tripData.name);
        setDays(tripData.days);
        setSelectedDayId(tripData.days[0].id);
        if (tripData.accommodations) setAccommodations(tripData.accommodations);
        if (tripData.totalBudget) setTotalBudget(tripData.totalBudget);
        if (tripData.travelers) setTravelers(tripData.travelers);

        let maxId = 0;
        tripData.days.forEach((day: Day) => {
          if (day.id > maxId) maxId = day.id;
          day.activities?.forEach((act: Activity) => {
            if (act.id > maxId) maxId = act.id;
          });
        });
        updateNextId(maxId + 1);
        isInitialMount.current = false;
        return;
      }

      // NẾU LÀ LỊCH TRÌNH MỚI TINH (Từ bước manual setup sang) — read from wizard context
      if (wizardDestinations.length > 0 && Object.keys(wizardAllocations).length > 0) {
        try {
          let dayCounter = 1;
          let dayId = 1;
          const generatedDays: Day[] = [];

          wizardDestinations.forEach((dest) => {
            const allocation = wizardAllocations[dest.id];
            if (!allocation) return;
            const from = parseISO(allocation.from);
            for (let i = 0; i < allocation.days; i++) {
              generatedDays.push({
                id: dayId++,
                label: `Ngày ${dayCounter++} - ${dest.name}`,
                date: format(addDays(from, i), "dd/MM/yyyy", { locale: vi }),
                activities: [],
                destinationName: dest.name,
              });
            }
          });

          if (generatedDays.length > 0) {
            setDays(generatedDays);
            setSelectedDayId(generatedDays[0].id);
            updateNextId(dayId);
            setTripName("Lịch trình mới");
            if (wizardBudget > 0) setTotalBudget(wizardBudget);
            sessionStorage.removeItem("selectedTripId");
          }
        } catch (error) {}
      }
      isInitialMount.current = false;
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, [tripIdParam, isAuthenticated, setCurrentTripId]);

  // 2. Auto-save debounce (save to sessionStorage for quick restore, API when tripId exists)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (days.length > 0) {
      writeSessionTrip({
        tripId: currentTripIdRef.current,
        name: tripName,
        days,
        accommodations,
        totalBudget,
        travelers,
        savedAt: new Date().toISOString(),
      });
    }
  }, [days, accommodations, totalBudget, travelers, tripName]);

  // 3. Save to API
  const handleSaveItinerary = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const tripData = {
      tripId: currentTripIdRef.current,
      name: tripName,
      days,
      accommodations,
      totalBudget,
      travelers,
      savedAt: new Date().toISOString(),
    };

    try {
      if (currentTripIdRef.current) {
        // Update existing itinerary
        await updateItinerary(currentTripIdRef.current, {
          tripName: tripName || "Lịch trình mới",
          budget: totalBudget,
          days: days.map((d, idx) => ({
            id: d.id,
            label: d.label,
            date: toISODate(d.date),
            destinationName: d.destinationName,
            activities: d.activities.map((a) => ({
              id: a.id,
              time: a.time,
              endTime: a.endTime,
              name: a.name,
              location: a.location,
              description: a.description,
              type: a.type,
              image: a.image,
              transportation: a.transportation,
              adultPrice: a.adultPrice,
              childPrice: a.childPrice,
              customCost: a.customCost,
              taxiCost: a.taxiCost,
              extraExpenses: a.extraExpenses,
            })),
          })),
          accommodations: Object.values(accommodations).map((acc) => ({
            id: acc.id,
            hotel: acc.hotel,
            dayIds: acc.dayIds,
            bookingType: acc.bookingType,
            duration: acc.duration,
            name: acc.name,
            checkIn: acc.checkIn,
            checkOut: acc.checkOut,
            pricePerNight: acc.pricePerNight,
            totalPrice: acc.totalPrice,
          })),
        });
      } else {
        // Create new itinerary
        const destinationNames = Array.from(new Set(days.map((d) => d.destinationName).filter(Boolean)));
        const resp = await createItinerary({
          destination: destinationNames[0] || "Việt Nam",
          tripName: tripName || "Lịch trình mới",
          startDate: toISODate(days[0]?.date) || new Date().toISOString().split("T")[0],
          endDate: toISODate(days[days.length - 1]?.date) || new Date().toISOString().split("T")[0],
          budget: totalBudget,
        });
        setCurrentTripId(resp.id);

        // Store claimToken for guest → owner claim after login
        if (resp.claimToken) {
          storePendingClaim(resp.id, resp.claimToken);
        }

        // Now update with the full days data
        await updateItinerary(resp.id, {
          days: days.map((d, idx) => ({
            id: d.id,
            label: d.label,
            date: toISODate(d.date),
            destinationName: d.destinationName,
            activities: d.activities.map((a) => ({
              id: a.id,
              time: a.time,
              endTime: a.endTime,
              name: a.name,
              location: a.location,
              description: a.description,
              type: a.type,
              image: a.image,
              transportation: a.transportation,
              adultPrice: a.adultPrice,
              childPrice: a.childPrice,
              customCost: a.customCost,
              taxiCost: a.taxiCost,
              extraExpenses: a.extraExpenses,
            })),
          })),
          accommodations: Object.values(accommodations).map((acc) => ({
            id: acc.id,
            hotel: acc.hotel,
            dayIds: acc.dayIds,
            bookingType: acc.bookingType,
            duration: acc.duration,
            name: acc.name,
            checkIn: acc.checkIn,
            checkOut: acc.checkOut,
            pricePerNight: acc.pricePerNight,
            totalPrice: acc.totalPrice,
          })),
        });
      }

      // Also save to sessionStorage as cache
      writeSessionTrip(tripData);
      toast.success("Đã lưu lịch trình thành công", { position: "top-right" });
    } catch (error) {
      console.error("Error saving itinerary:", error);

      // Fallback: save to sessionStorage only
      writeSessionTrip(tripData);

      // Classify error type for better UX message
      if (error instanceof ApiError) {
        const { status, body } = error;

        // Auth errors (401/403)
        if (status === 401 || status === 403) {
          toast.error("Vui lòng đăng nhập để lưu lịch trình.", { position: "top-right" });
          return;
        }

        // Quota/trip limit error
        if (status === 403 || body.error_code === "TRIP_LIMIT_EXCEEDED") {
          toast.error(
            "Bạn đã đạt giới hạn 5/5 lịch trình có thể lưu. Hãy xóa một lịch trình cũ hoặc nâng cấp khi Premium khả dụng.",
            { position: "top-right", duration: 6000 }
          );
          return;
        }

        // Rate limit error
        if (status === 429) {
          toast.error("Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút.", { position: "top-right" });
          return;
        }

        // Validation error (422)
        if (status === 422) {
          toast.error("Dữ liệu lịch trình không hợp lệ. Vui lòng kiểm tra và thử lại.", { position: "top-right" });
          return;
        }
      }

      // Network/server errors (500/503) or unknown errors
      toast.error(
        "Không thể lưu lịch trình lên server lúc này. Lịch trình đã được lưu tạm trên thiết bị này.",
        { position: "top-right" }
      );
    }
  }, [isAuthenticated, tripName, days, accommodations, totalBudget, travelers, setShowLoginModal]);

  return { handleSaveItinerary, currentTripId };
};
