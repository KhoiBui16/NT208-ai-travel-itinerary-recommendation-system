import { useEffect, useRef, useCallback, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Day, Accommodation, TravelerInfo, Place, Activity, ExtraExpense, DayExtraExpense } from "../../types/trip.types";
import { getItinerary, createItinerary, updateItinerary } from "../../services/itinerary";
import { useTripWizard } from "../../contexts/TripWizardContext";
import { storePendingClaim } from "../../contexts/AuthContext";
import {
  getUniqueAccommodationsFromRecord,
  mapItineraryResponseToSessionTrip,
  normalizeAccommodationRecord,
  readSessionTrip,
  writeSessionTrip,
} from "../../utils/tripResponseMapper";
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
  selectedDayId: number,
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
  const saveInFlightRef = useRef(false);
  const currentTripIdRef = useRef<number | null>(tripIdParam ?? null);
  const [currentTripId, _setCurrentTripId] = useState<number | null>(tripIdParam ?? null);
  const [currentTripUpdatedAt, setCurrentTripUpdatedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!tripIdParam);
  const setCurrentTripId = useCallback((id: number | null) => {
    currentTripIdRef.current = id;
    _setCurrentTripId(id);
  }, []);
  const { destinations: wizardDestinations, dayAllocations: wizardAllocations, budget: wizardBudget, resetWizard } = useTripWizard();

  const applyServerTrip = useCallback((
    response: Awaited<ReturnType<typeof getItinerary>>,
    preferredDayId?: number | null,
  ) => {
    const mapped = mapItineraryResponseToSessionTrip(response);
    setCurrentTripId(mapped.tripId);
    setCurrentTripUpdatedAt(mapped.updatedAt);
    setTripName(mapped.name);
    setTotalBudget(mapped.totalBudget);
    setTravelers(mapped.travelers);
    setDays(mapped.days);
    if (mapped.days.length > 0) {
      const resolvedDayId =
        preferredDayId && mapped.days.some((day) => day.id === preferredDayId)
          ? preferredDayId
          : mapped.days[0].id;
      setSelectedDayId(resolvedDayId);
    }
    setAccommodations(mapped.accommodations);

    let maxId = 0;
    mapped.days.forEach((day) => {
      if (day.id > maxId) maxId = day.id;
      day.activities?.forEach((activity) => {
        if (activity.id > maxId) maxId = activity.id;
      });
    });
    updateNextId(maxId + 1);
    writeSessionTrip(mapped);
  }, [
    setAccommodations,
    setDays,
    setSelectedDayId,
    setTotalBudget,
    setTravelers,
    setTripName,
    updateNextId,
    setCurrentTripId,
  ]);

  // Sync auth state
  useEffect(() => {
    setIsAuthenticated(isAuthenticated);
  }, [isAuthenticated, setIsAuthenticated]);

  // 1. Sync ban đầu khi vào trang
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      let allowSessionFallback = true;

      // If we have a tripId from URL, load from API
      if (tripIdParam && isAuthenticated) {
        try {
          const resp = await getItinerary(tripIdParam);
          if (!isMounted) return;
          applyServerTrip(resp);
          isInitialMount.current = false;
          return;
        } catch (error) {
          console.error("Error loading trip from API:", error);
          allowSessionFallback =
            !(error instanceof ApiError) ||
            error.status >= 500 ||
            error.status === 429;

          if (!allowSessionFallback) {
            toast.error("Không thể tải lịch trình này từ server.", {
              position: "top-right",
              duration: 4000,
            });
            isInitialMount.current = false;
            return;
          }

          toast.warning("Không thể tải dữ liệu từ server. Đang dùng bản nháp tạm trên trình duyệt này.", {
            position: "top-right",
            duration: 3000,
          });
        }
      }

      // Fallback: check sessionStorage for workspace-passed data (wizard flow)
      const tripData = readSessionTrip();
      const hasMatchingSessionTrip =
        !tripIdParam || tripData?.tripId === tripIdParam;
      if (allowSessionFallback && tripData?.days?.length && hasMatchingSessionTrip) {
        if (tripData.tripId) setCurrentTripId(tripData.tripId);
        setCurrentTripUpdatedAt(tripData.updatedAt ?? null);
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
          // Generate raw candidates to sort chronologically first
          const candidates: { dateObj: Date; dateStr: string; destinationName: string }[] = [];
          wizardDestinations.forEach((dest) => {
            const allocation = wizardAllocations[dest.id];
            if (!allocation) return;
            const from = parseISO(allocation.from);
            for (let i = 0; i < allocation.days; i++) {
              const dateObj = addDays(from, i);
              candidates.push({
                dateObj,
                dateStr: format(dateObj, "dd/MM/yyyy", { locale: vi }),
                destinationName: dest.name,
              });
            }
          });

          // Sort candidates chronologically by dateObj
          candidates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

          let dayId = 1;
          const generatedDays: Day[] = candidates.map((cand, idx) => ({
            id: dayId++,
            label: `Ngày ${idx + 1} - ${cand.destinationName}`,
            date: cand.dateStr,
            activities: [],
            destinationName: cand.destinationName,
          }));

          if (generatedDays.length > 0) {
            setDays(generatedDays);
            setSelectedDayId(generatedDays[0].id);
            updateNextId(dayId);
            setTripName("Lịch trình mới");
            if (wizardBudget > 0) setTotalBudget(wizardBudget);
            sessionStorage.removeItem("selectedTripId");
          }
        } catch (error) {
          console.error("[useTripSync] Failed to generate wizard trip:", error);
          toast.error("Không thể tạo lịch trình mới. Vui lòng thử lại sau.", {
            position: "top-right",
            duration: 5000,
          });
        }
      }
      isInitialMount.current = false;
    };

    const run = async () => {
      try {
        await loadInitialData();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    run();
    return () => { isMounted = false; };
  }, [tripIdParam, isAuthenticated, setCurrentTripId, applyServerTrip]);

  // 2. Auto-save debounce (save to sessionStorage for quick restore, API when tripId exists)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (days.length > 0) {
      writeSessionTrip({
        tripId: currentTripIdRef.current,
        name: tripName,
        days,
        accommodations: normalizeAccommodationRecord(accommodations),
        totalBudget,
        travelers,
        updatedAt: currentTripUpdatedAt,
        savedAt: new Date().toISOString(),
      });
    }
  }, [days, accommodations, totalBudget, travelers, tripName, currentTripUpdatedAt]);

  // 3. Save to API
  const handleSaveItinerary = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (saveInFlightRef.current) {
      return;
    }

    const uniqueAccommodations = getUniqueAccommodationsFromRecord(accommodations);
    let cacheTripData = {
      tripId: currentTripIdRef.current,
      name: tripName,
      days,
      accommodations: normalizeAccommodationRecord(accommodations),
      totalBudget,
      travelers,
      updatedAt: currentTripUpdatedAt,
      savedAt: new Date().toISOString(),
    };

    try {
      saveInFlightRef.current = true;
      setIsSaving(true);

      if (currentTripIdRef.current) {
        // Update existing itinerary
        const response = await updateItinerary(currentTripIdRef.current, {
          tripName: tripName || "Lịch trình mới",
          budget: totalBudget,
          travelerInfo: travelers,
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
              latitude: a.latitude,
              longitude: a.longitude,
              placeId: a.placeId,
            })),
          })),
          accommodations: uniqueAccommodations.map((acc) => ({
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
        applyServerTrip(response, selectedDayId);
      } else {
        // Create new itinerary
        const destinationNames = Array.from(new Set(days.map((d) => d.destinationName).filter(Boolean)));
        const resp = await createItinerary({
          destination: destinationNames[0] || "Việt Nam",
          tripName: tripName || "Lịch trình mới",
          startDate: toISODate(days[0]?.date) || new Date().toISOString().split("T")[0],
          endDate: toISODate(days[days.length - 1]?.date) || new Date().toISOString().split("T")[0],
          budget: totalBudget,
          adultsCount: travelers.adults,
          childrenCount: travelers.children,
        });
        setCurrentTripId(resp.id);
        cacheTripData = { ...cacheTripData, tripId: resp.id };

        // Store claimToken for guest → owner claim after login
        if (resp.claimToken) {
          storePendingClaim(resp.id, resp.claimToken);
        }

        // Now update with the full days data
        const updateResponse = await updateItinerary(resp.id, {
          travelerInfo: travelers,
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
              latitude: a.latitude,
              longitude: a.longitude,
              placeId: a.placeId,
            })),
          })),
          accommodations: uniqueAccommodations.map((acc) => ({
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
        applyServerTrip(updateResponse, selectedDayId);
      }

      toast.success("Đã lưu lịch trình thành công", { position: "top-right" });
    } catch (error) {
      console.error("Error saving itinerary:", error);

      // Fallback: lưu tạm vào sessionStorage (im lặng). Thông báo cho user
      // được chọn theo loại lỗi ở khối classify bên dưới để tránh toast trùng.
      writeSessionTrip(cacheTripData);

      // Classify error type for better UX message
      if (error instanceof ApiError) {
        const { status, body } = error;
        const errorCode = body?.error_code ?? body?.code;

        // Quota/trip limit error (check by error_code first, before status code)
        if (errorCode === "TRIP_LIMIT_EXCEEDED" || errorCode === "TRIP_QUOTA_EXCEEDED") {
          toast.error(
            "Bạn đã đạt giới hạn 5/5 lịch trình có thể lưu. Hãy xóa một lịch trình cũ hoặc nâng cấp khi Premium khả dụng.",
            { position: "top-right", duration: 6000 }
          );
          return;
        }

        // Auth error (401)
        if (status === 401) {
          toast.error("Vui lòng đăng nhập để lưu lịch trình.", { position: "top-right" });
          return;
        }

        // Generic forbidden/no permission (403, but not quota which we already checked)
        if (status === 403) {
          toast.error("Bạn không có quyền thực hiện hành động này.", { position: "top-right" });
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
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }, [
    isAuthenticated,
    tripName,
    days,
    accommodations,
    totalBudget,
    travelers,
    selectedDayId,
    setShowLoginModal,
    currentTripUpdatedAt,
    applyServerTrip,
  ]);

  return { applyServerTrip, currentTripId, currentTripUpdatedAt, handleSaveItinerary, isSaving, isLoading };
};
