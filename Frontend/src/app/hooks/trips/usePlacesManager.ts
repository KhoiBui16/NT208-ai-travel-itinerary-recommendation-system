import { useState } from "react";
import { Place, Day, Activity } from "../../types/trip.types";
import { allPlaces } from "../../utils/tripConstants";
import * as placesService from "../../services/places";

export const usePlacesManager = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  selectedDayId: number,
  isAuthenticated: boolean,
  setShowLoginModal: (show: boolean) => void
) => {
  const [places, setPlaces] = useState<Place[]>(allPlaces);
  const [placeSearch, setPlaceSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSavedSuggestions, setShowSavedSuggestions] = useState(false);
  const [savedSuggestions, setSavedSuggestions] = useState<any[]>([]);

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
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== dayId ? day : { ...day, activities: [...day.activities, act] }
      )
    );
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

    if (place.saved) {
      placesService.unsavePlace(id).catch(() => {
        // Revert on failure
        setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
      });
    } else {
      placesService.savePlace(id).catch(() => {
        setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
      });
    }
  };

  const filteredPlaces = places.filter((p) => {
    const selectedDay = days.find(d => d.id === selectedDayId);
    const matchSearch = p.name.toLowerCase().includes(placeSearch.toLowerCase());
    const matchFilter = activeFilter === "all" || p.type === activeFilter;
    const matchCity = selectedDay ? p.city === selectedDay.destinationName : false;
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