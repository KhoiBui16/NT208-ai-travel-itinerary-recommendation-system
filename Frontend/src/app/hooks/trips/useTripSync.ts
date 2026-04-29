import { useEffect, useRef } from "react";
import { format, addDays, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Day, Accommodation, TravelerInfo, Place, Activity, ExtraExpense, DayExtraExpense } from "../../types/trip.types";

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
  setTripName: React.Dispatch<React.SetStateAction<string>>
) => {
  const isInitialMount = useRef(true);

  // 1. Sync ban đầu khi vào trang
  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    setIsAuthenticated(!!user);
    
    // Load Saved Trips để check tên mặc định
    const savedTripsData = localStorage.getItem("savedTrips");
    const savedTrips = savedTripsData ? JSON.parse(savedTripsData) : [];

    // KIỂM TRA LỊCH TRÌNH HIỆN TẠI (Đang làm dở)
    const savedTrip = localStorage.getItem("currentTrip");
    if (savedTrip) {
      try {
        const tripData = JSON.parse(savedTrip);
        if (tripData.days && tripData.days.length > 0) {
          if (tripData.name) setTripName(tripData.name); // GIỮ TÊN CŨ KHI LOAD TRANG
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

          // LOGIC: Sinh tên "Lịch trình mới (n)" không trùng
          let name = "Lịch trình mới";
          let counter = 1;
          while (savedTrips.some((t: any) => t.name === name)) {
            name = `Lịch trình mới (${counter})`;
            counter++;
          }
          setTripName(name);
          localStorage.removeItem("selectedTripId");
        }
      } catch (error) {}
    }
    isInitialMount.current = false;
  }, []);

  // 2. Hàm cập nhật vào danh sách "Lịch trình của tôi"
  const updateSavedTripsList = (tripData: any, currentName: string) => {
    try {
      const savedTripsData = localStorage.getItem("savedTrips");
      let savedTrips = savedTripsData ? JSON.parse(savedTripsData) : [];
      let currentTripId = localStorage.getItem("selectedTripId");
      
      if (!currentTripId) {
        currentTripId = `trip-${Date.now()}`;
        localStorage.setItem("selectedTripId", currentTripId);
      }
      
      const existingTripIndex = savedTrips.findIndex((t: any) => t.id === currentTripId);
      const tripEntry = {
        id: currentTripId,
        name: currentName || "Lịch trình mới",
        createdAt: existingTripIndex >= 0 ? savedTrips[existingTripIndex].createdAt : Date.now(),
        cities: Array.from(new Set(days.map(d => d.destinationName).filter(Boolean))),
        days: days.length,
        estimatedCost: totalBudget || 0,
        status: days[0]?.date !== "TBD" ? "upcoming" : "planning",
        coverImage: days[0]?.activities?.[0]?.image || "https://images.unsplash.com/photo-1708400586139-2ba956acf25f?w=800",
        tripData
      };
      
      if (existingTripIndex >= 0) savedTrips[existingTripIndex] = tripEntry;
      else savedTrips.push(tripEntry);
      
      localStorage.setItem("savedTrips", JSON.stringify(savedTrips));
    } catch (e) {}
  };

  // 3. Auto-save mỗi khi có thay đổi (Gồm cả tên)
  useEffect(() => {
    if (isInitialMount.current) return;
    if (days.length > 0) {
      const tripData = { name: tripName, days, accommodations, totalBudget, savedAt: new Date().toISOString() };
      localStorage.setItem("currentTrip", JSON.stringify(tripData));
      updateSavedTripsList(tripData, tripName); // Lưu tên mới vào danh sách tổng
    }
  }, [days, accommodations, totalBudget, tripName]);

  const handleSaveItinerary = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const tripData = { name: tripName, days, accommodations, totalBudget, savedAt: new Date().toISOString() };
    localStorage.setItem("currentTrip", JSON.stringify(tripData));
    updateSavedTripsList(tripData, tripName);
    toast.success("Đã lưu lịch trình thành công", { position: "top-right" });
  };

  return { handleSaveItinerary };
};