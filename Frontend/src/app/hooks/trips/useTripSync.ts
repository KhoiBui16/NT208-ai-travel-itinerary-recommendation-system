import { useEffect, useRef, useCallback } from "react";
import { format, addDays, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Day, Accommodation, TravelerInfo, Place, Activity, ExtraExpense, DayExtraExpense } from "../../types/trip.types";
import { useAuth } from "../../contexts/AuthContext";
import { listItineraries, getItinerary, createItinerary, updateItinerary, ItineraryResponse } from "../../services/itinerary";

export const useTripSync = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  setSelectedDayId: React.Dispatch<React.SetStateAction<number>>,
  accommodations: Record<number, Accommodation>,
  setAccommodations: React.Dispatch<React.SetStateAction<Record<number, Accommodation>>>,
  totalBudget: number,
  setTotalBudget: React.Dispatch<React.SetStateAction<number>>,
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

  // Sync auth state
  useEffect(() => {
    setIsAuthenticated(isAuthenticated);
  }, [isAuthenticated, setIsAuthenticated]);

  // 1. Sync ban đầu khi vào trang
  useEffect(() => {
    const loadInitialData = async () => {
      // If we have a tripId from URL, load from API
      if (tripIdParam && isAuthenticated) {
        try {
          const resp = await getItinerary(tripIdParam);
          currentTripIdRef.current = resp.id;

          if (resp.tripName) setTripName(resp.tripName);
          if (resp.budget) setTotalBudget(resp.budget);

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
          // Fall through to localStorage fallback
        }
      }

      // Fallback: check localStorage for workspace-passed data (wizard flow)
      const savedTrip = localStorage.getItem("currentTrip");
      if (savedTrip) {
        try {
          const tripData = JSON.parse(savedTrip);
          if (tripData.days && tripData.days.length > 0) {
            if (tripData.name) setTripName(tripData.name);
            setDays(tripData.days);
            setSelectedDayId(tripData.days[0].id);
            if (tripData.accommodations) setAccommodations(tripData.accommodations);
            if (tripData.totalBudget) setTotalBudget(tripData.totalBudget);

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
        } catch (error) {}
      }

      // NẾU LÀ LỊCH TRÌNH MỚI TINH (Từ bước manual setup sang)
      const savedDestinations = localStorage.getItem("tripDestinations");
      const savedAllocations = localStorage.getItem("tripDayAllocations");

      if (savedDestinations && savedAllocations) {
        try {
          const destinations = JSON.parse(savedDestinations);
          const allocations = JSON.parse(savedAllocations);
          let dayCounter = 1;
          let dayId = 1;
          const generatedDays: Day[] = [];

          destinations.forEach((dest: any) => {
            const allocation = allocations[dest.id.toString()];
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

            // Generate unique name
            let name = "Lịch trình mới";
            let counter = 1;
            // Simple name uniqueness without API call for speed
            setTripName(name);
            localStorage.removeItem("selectedTripId");
          }
        } catch (error) {}
      }
      isInitialMount.current = false;
    };

    loadInitialData();
  }, [tripIdParam, isAuthenticated]);

  // 2. Auto-save debounce (save to localStorage for quick restore, API when tripId exists)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (days.length > 0) {
      const tripData = { name: tripName, days, accommodations, totalBudget, savedAt: new Date().toISOString() };
      // Always save to localStorage as quick-restore cache
      localStorage.setItem("currentTrip", JSON.stringify(tripData));
    }
  }, [days, accommodations, totalBudget, tripName]);

  // 3. Save to API
  const handleSaveItinerary = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const tripData = { name: tripName, days, accommodations, totalBudget, savedAt: new Date().toISOString() };

    try {
      if (currentTripIdRef.current) {
        // Update existing itinerary
        await updateItinerary(currentTripIdRef.current, {
          tripName: tripName || "Lịch trình mới",
          budget: totalBudget,
          days: days.map((d, idx) => ({
            id: d.id,
            label: d.label,
            date: d.date,
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
          startDate: days[0]?.date || new Date().toISOString().split("T")[0],
          endDate: days[days.length - 1]?.date || new Date().toISOString().split("T")[0],
          budget: totalBudget,
        });
        currentTripIdRef.current = resp.id;

        // Now update with the full days data
        await updateItinerary(resp.id, {
          days: days.map((d, idx) => ({
            id: d.id,
            label: d.label,
            date: d.date,
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

      // Also save to localStorage as cache
      localStorage.setItem("currentTrip", JSON.stringify(tripData));
      toast.success("Đã lưu lịch trình thành công", { position: "top-right" });
    } catch (error) {
      console.error("Error saving itinerary:", error);
      // Fallback: save to localStorage only
      localStorage.setItem("currentTrip", JSON.stringify(tripData));
      toast.error("Lưu lên server thất bại, đã lưu tạm thời", { position: "top-right" });
    }
  }, [isAuthenticated, tripName, days, accommodations, totalBudget, setShowLoginModal]);

  return { handleSaveItinerary };
};
