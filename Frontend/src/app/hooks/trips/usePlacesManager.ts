import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Place, Day, Activity } from "../../types/trip.types";
import * as placesService from "../../services/places";
import * as itineraryService from "../../services/itinerary";
import {
  findSavedPlaceByPlaceId,
  normalizeSavedPlaces,
} from "../../utils/savedPlaces";

export const usePlacesManager = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  selectedDayId: number,
  isAuthenticated: boolean,
  setShowLoginModal: (show: boolean) => void,
  tripId: number | null
) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSavedSuggestions, setShowSavedSuggestions] = useState(false);
  const [savedSuggestions, setSavedSuggestions] = useState<any[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Search places from API when search query or selected day changes
  useEffect(() => {
    const selectedDay = days.find(d => d.id === selectedDayId);
    // Fix: fall back to first day with a destinationName when selected day has none
    const city =
      selectedDay?.destinationName ||
      days.find(d => d.destinationName)?.destinationName ||
      undefined;
    const query = placeSearch.trim();

    // Debounce API calls (300ms)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await placesService.searchPlaces({
          query: query || undefined,
          city: city || undefined,
          category: activeFilter !== "all" ? activeFilter : undefined,
          limit: 50,
        });
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
      } catch {
        setPlaces([]);
      }
    }, 300);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [placeSearch, selectedDayId, activeFilter, days]);

  const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

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

    // Optimistic UI update
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== dayId ? day : { ...day, activities: [...day.activities, act] }
      )
    );

    // Fire API call if tripId exists
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
        // Update local state with BE-assigned ID
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
        // Remove on failure
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== dayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== act.id) }
          )
        );
        toast.error("Không thể thêm gợi ý vào lịch trình. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    }
  };

  const handleRemoveSavedSuggestion = (id: string) => {
    setSavedSuggestions((prev: any[]) => prev.filter((s) => s.id !== id));
  };

  const toggleSavePlace = (id: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const place = places.find(p => p.id === id);
    if (!place) return;

    // Optimistic UI update
    setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

    const revert = () => {
      setPlaces((prev: Place[]) =>
        prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)),
      );
    };

    if (place.saved) {
      placesService
        .listSavedPlaces()
        .then((savedList) => {
          const match = findSavedPlaceByPlaceId(normalizeSavedPlaces(savedList), id);
          if (!match) {
            revert();
            return;
          }
          return placesService.unsavePlace(match.savedId);
        })
        .catch(revert);
    } else {
      placesService.savePlace(id).catch(revert);
    }
  };

  const filteredPlaces = places.filter((p) => {
    const selectedDay = days.find(d => d.id === selectedDayId);
    const matchSearch = p.name.toLowerCase().includes(placeSearch.toLowerCase());
    const matchFilter = activeFilter === "all" || p.type === activeFilter;

    // Fix: if selectedDay has no destinationName, fall back to the first
    // day with a destinationName, then to show all places rather than
    // hiding everything. This prevents the blank-panel bug after reload.
    const destinationName =
      selectedDay?.destinationName ||
      days.find(d => d.destinationName)?.destinationName ||
      null;

    // If no destination context is available at all, show all places so
    // the user can still add activities to the trip.
    const matchCity = destinationName ? p.city === destinationName : true;

    return matchSearch && matchFilter && matchCity;
  });

  return {
    places, setPlaces,
    placeSearch, setPlaceSearch,
    activeFilter, setActiveFilter,
    showSavedSuggestions, setShowSavedSuggestions,
    savedSuggestions, setSavedSuggestions,
    filteredPlaces,
    handleAddSuggestionToItinerary,
    handleRemoveSavedSuggestion,
    toggleSavePlace
  };
};
