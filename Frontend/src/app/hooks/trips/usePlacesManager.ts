/**
 * usePlacesManager — Hook quản lý địa điểm du lịch trong workspace
 *
 * Cung cấp:
 *   • API search       — Tìm kiếm places từ BE (debounced 300ms)
 *   • Filter & display — Lọc theo city, category, search text
 *   • Save/unsave      — Lưu/bỏ lưu địa điểm yêu thích
 *   • Add to trip      — Thêm suggestion/place vào lịch trình
 *
 * Pattern: Optimistic UI update → API call → Revert on failure
 */

import { useState, useEffect, useRef } from "react";
import { Place, Day, Activity } from "../../types/trip.types";
import { allPlaces } from "../../utils/tripConstants";
import * as placesService from "../../services/places";
import * as itineraryService from "../../services/itinerary";

export const usePlacesManager = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  selectedDayId: number,
  isAuthenticated: boolean,
  setShowLoginModal: (show: boolean) => void,
  tripId: number | null
) => {

  // ===================================================================
  // 1. State
  // ===================================================================

  /** Danh sách places hiển thị (từ API hoặc mock) */
  const [places, setPlaces] = useState<Place[]>(allPlaces);

  /** Từ khóa tìm kiếm */
  const [placeSearch, setPlaceSearch] = useState("");

  /** Bộ lọc category đang active ("all" = tất cả) */
  const [activeFilter, setActiveFilter] = useState("all");

  /** Hiển thị panel saved suggestions */
  const [showSavedSuggestions, setShowSavedSuggestions] = useState(false);

  /** Danh sách AI suggestions đã lưu */
  const [savedSuggestions, setSavedSuggestions] = useState<any[]>([]);

  /** Ref cho debounce timer */
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ===================================================================
  // 2. API Search — Tìm kiếm places từ BE (debounced)
  // ===================================================================

  /**
   * Effect: Tự động search places khi thay đổi:
   *   • placeSearch (từ khóa)
   *   • selectedDayId (→ thay đổi city context)
   *   • activeFilter (category filter)
   *
   * Debounce 300ms để tránh gọi API quá nhiều khi user đang gõ.
   */
  useEffect(() => {
    const selectedDay = days.find(d => d.id === selectedDayId);
    const city = selectedDay?.destinationName;
    const query = placeSearch.trim();

    // Clear timer cũ → set timer mới (debounce 300ms)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await placesService.searchPlaces({
          query: query || undefined,
          city: city || undefined,
          category: activeFilter !== "all" ? activeFilter : undefined,
          limit: 50,
        });
        if (results.length > 0) {
          // Map API response → local Place format
          setPlaces(results.map((p) => ({
            id: p.id,
            name: p.name,
            reviewCount: p.reviewCount || 0,
            type: p.type,
            image: p.image || "",
            price: p.price ?? undefined,
            location: p.location ?? undefined,
            reviews: p.reviews ?? undefined,
            rating: p.rating ?? undefined,
            saved: p.saved,
            city: p.city,
            description: p.description ?? undefined,
          })));
        }
      } catch {
        // API fail → giữ nguyên data hiện tại (mock fallback)
      }
    }, 300);

    // Cleanup timer khi unmount hoặc dependency thay đổi
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [placeSearch, selectedDayId, activeFilter, days]);

  // ===================================================================
  // 3. Handlers — Thêm vào trip, lưu/bỏ lưu yêu thích
  // ===================================================================

  /** Tạo ID tạm thời cho entities mới */
  const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

  /** Thêm AI suggestion vào lịch trình — Optimistic UI + API sync */
  const handleAddSuggestionToItinerary = (suggestion: any, date: string, time: string) => {
    const dayId = days.find(d => d.date === date)?.id || selectedDayId;
    const act: Activity = {
      id: generateId(),
      name: suggestion.name,
      time,
      endTime: "",
      location: suggestion.city,
      description: suggestion.reasoning,
      type: "attraction",
      image: suggestion.image,
      transportation: "taxi",
      extraExpenses: [],
    };

    // Optimistic UI update — thêm ngay vào ngày
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== dayId ? day : { ...day, activities: [...day.activities, act] }
      )
    );

    // API call — nếu có tripId
    if (tripId) {
      itineraryService.addActivity(tripId, dayId, {
        time: act.time,
        endTime: act.endTime || "",
        name: act.name,
        location: act.location,
        description: act.description,
        type: act.type,
        image: act.image,
        transportation: act.transportation,
        extraExpenses: act.extraExpenses,
      }).then((resp) => {
        // Cập nhật ID từ BE (thay ID tạm bằng ID thật)
        if (resp.id && resp.id !== act.id) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) =>
              day.id !== dayId ? day : {
                ...day,
                activities: day.activities.map((a: Activity) => a.id === act.id ? { ...a, id: resp.id! } : a)
              }
            )
          );
        }
      }).catch(() => {
        // Revert on failure — xóa activity vừa thêm
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== dayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== act.id) }
          )
        );
      });
    }
  };

  /** Xóa saved suggestion khỏi danh sách */
  const handleRemoveSavedSuggestion = (id: string) => {
    setSavedSuggestions((prev: any[]) => prev.filter((s) => s.id !== id));
  };

  /** Toggle save/unsave place yêu thích — Optimistic UI + API call */
  const toggleSavePlace = (id: number) => {
    // Yêu cầu đăng nhập
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const place = places.find(p => p.id === id);
    if (!place) return;

    // Optimistic UI update — toggle ngay
    setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

    // API call theo trạng thái hiện tại
    if (place.saved) {
      // Đang saved → unsave
      placesService.unsavePlace(id).catch(() => {
        // Revert on failure
        setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
      });
    } else {
      // Chưa saved → save
      placesService.savePlace(id).catch(() => {
        setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
      });
    }
  };

  // ===================================================================
  // 4. Filter — Lọc places hiển thị
  // ===================================================================

  /** Danh sách places sau khi lọc (search + category + city) */
  const filteredPlaces = places.filter((p) => {
    const selectedDay = days.find(d => d.id === selectedDayId);
    const matchSearch = p.name.toLowerCase().includes(placeSearch.toLowerCase());
    const matchFilter = activeFilter === "all" || p.type === activeFilter;
    const matchCity = selectedDay ? p.city === selectedDay.destinationName : false;
    return matchSearch && matchFilter && matchCity;
  });

  // ===================================================================
  // Return — Export state và handlers
  // ===================================================================

  return {
    // State
    places, setPlaces,
    placeSearch, setPlaceSearch,
    activeFilter, setActiveFilter,
    showSavedSuggestions, setShowSavedSuggestions,
    savedSuggestions, setSavedSuggestions,
    // Filtered data
    filteredPlaces,
    // Handlers
    handleAddSuggestionToItinerary,
    handleRemoveSavedSuggestion,
    toggleSavePlace
  };
};