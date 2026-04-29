import { useState, useEffect } from "react";
import { X, Star, MapPin, Bookmark, Plus, Calendar, Clock } from "lucide-react";
export interface SavedSuggestion {
  id: string;
  name: string;
  type: string;
  rating: number;
  priceLevel: string;
  distance: string;
  image: string;
  reasoning: string;
  estimatedCost: string;
  city: string;
  savedAt: string;
}

interface SavedPlace {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviewCount: number;
  estimatedCost: string;
  priceLevel: string;
  image: string;
  description: string;
  address: string;
  savedAt: string;
  isBookmarked: boolean;
}

interface SavedSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: SavedSuggestion[];
  onRemove: (id: string) => void;
  onAddToItinerary: (suggestion: SavedSuggestion, date: string, time: string) => void;
  days?: { id: number; label: string; date: string }[];
}

export function SavedSuggestions({
  isOpen,
  onClose,
  suggestions,
  onRemove,
  onAddToItinerary,
  days = [],
}: SavedSuggestionsProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [confirmingAdd, setConfirmingAdd] = useState<SavedPlace | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState("0");
  const [selectedTime, setSelectedTime] = useState("09:00");

  // Load bookmarked places from localStorage
  useEffect(() => {
    if (!isOpen) return;
    const data = localStorage.getItem("savedPlaces"); // TODO: Fetch saved places from API
    if (data) {
      try {
        const parsed: SavedPlace[] = JSON.parse(data);
        setSavedPlaces(parsed.filter((p) => p.isBookmarked !== false));
      } catch (e) {
        setSavedPlaces([]);
      }
    } else {
      setSavedPlaces([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveBookmark = (placeName: string) => {
    // Remove from localStorage
    const data = localStorage.getItem("savedPlaces"); // TODO: Fetch saved places from API
    if (data) {
      try {
        let arr = JSON.parse(data);
        arr = arr.filter((p: any) => p.name !== placeName);
        localStorage.setItem("savedPlaces", JSON.stringify(arr));
      } catch (e) {}
    }
    // Remove from local state
    setSavedPlaces((prev) => prev.filter((p) => p.name !== placeName));
  };

  const handleConfirmAdd = () => {
    if (!confirmingAdd || days.length === 0) return;
    const day = days[parseInt(selectedDayIdx)] || days[0];
    // Convert to SavedSuggestion format for compatibility
    const asSuggestion: SavedSuggestion = {
      id: confirmingAdd.id,
      name: confirmingAdd.name,
      type: confirmingAdd.type || "attraction",
      rating: confirmingAdd.rating || 4.5,
      priceLevel: confirmingAdd.priceLevel || "",
      distance: "",
      image: confirmingAdd.image,
      reasoning: confirmingAdd.description || "",
      estimatedCost: confirmingAdd.estimatedCost || "",
      city: confirmingAdd.address || "",
      savedAt: confirmingAdd.savedAt || new Date().toISOString(),
    };
    onAddToItinerary(asSuggestion, day.date, selectedTime);
    setConfirmingAdd(null);
    setSelectedTime("09:00");
    setSelectedDayIdx("0");
  };

  const typeLabels: Record<string, string> = {
    food: "Ẩm thực",
    attraction: "Tham quan",
    nature: "Thiên nhiên",
    entertainment: "Giải trí",
    shopping: "Mua sắm",
  };

  const typeColors: Record<string, string> = {
    food: "bg-orange-100 text-orange-700",
    attraction: "bg-cyan-100 text-cyan-700",
    nature: "bg-green-100 text-green-700",
    entertainment: "bg-purple-100 text-purple-700",
    shopping: "bg-pink-100 text-pink-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-gray-200 bg-white p-6 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Địa điểm đã lưu</h2>
            <p className="text-sm text-gray-500">{savedPlaces.length} địa điểm</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {savedPlaces.length === 0 ? (
            <div className="py-12 text-center">
              <Bookmark className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Chưa có địa điểm nào được lưu</p>
              <p className="mt-1 text-sm text-gray-400">
                Nhấn vào biểu tượng bookmark trên các địa điểm để lưu lại
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedPlaces.map((place) => (
                <div
                  key={place.id || place.name}
                  className="rounded-2xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-cyan-300 hover:shadow-lg"
                >
                  <div className="flex gap-4">
                    <img
                      src={place.image}
                      alt={place.name}
                      className="h-24 w-32 flex-shrink-0 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{place.name}</h3>
                          {place.type && (
                            <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${typeColors[place.type] || "bg-gray-100 text-gray-600"}`}>
                              {typeLabels[place.type] || place.type}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveBookmark(place.name)}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition-colors hover:bg-orange-600"
                          title="Bỏ lưu"
                        >
                          <Bookmark className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                      {place.description && (
                        <p className="text-sm text-gray-500 line-clamp-1 mb-2">{place.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                        {place.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span>{place.rating}</span>
                          </div>
                        )}
                        {place.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">{place.address}</span>
                          </div>
                        )}
                      </div>
                      {days.length > 0 && (
                        <button
                          onClick={() => setConfirmingAdd(place)}
                          className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                        >
                          <Plus className="mr-1 inline h-4 w-4" />
                          Thêm vào lịch trình
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add to itinerary confirmation modal */}
        {confirmingAdd && days.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-xl font-bold text-gray-900">
                Thêm vào lịch trình
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Chọn ngày và giờ cho: <strong>{confirmingAdd.name}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Ngày
                  </label>
                  <select
                    value={selectedDayIdx}
                    onChange={(e) => setSelectedDayIdx(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                  >
                    {days.map((day, idx) => (
                      <option key={day.id} value={idx}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Clock className="h-4 w-4" />
                    Giờ
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setConfirmingAdd(null);
                    setSelectedTime("09:00");
                    setSelectedDayIdx("0");
                  }}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 font-semibold text-white transition-all hover:scale-[1.02]"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
