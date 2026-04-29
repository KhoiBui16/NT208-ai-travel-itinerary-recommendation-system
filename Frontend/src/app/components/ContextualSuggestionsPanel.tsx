import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  DollarSign,
  Eye,
  Bookmark,
  Calendar,
  Clock,
} from "lucide-react";
import {
  trackViewSuggestion,
  trackSaveSuggestion,
  trackOpenDetail,
  trackAddToItineraryConfirm,
} from "../utils/analytics";
import { Suggestion, mockSuggestions } from "../data/suggestions";

interface ContextualSuggestionsPanelProps {
  selectedCities: string[];
  onSaveSuggestion: (suggestion: Suggestion) => void;
  onAddToItinerary: (suggestion: Suggestion, date: string, time: string) => void;
  budgetAvailable?: boolean;
}

export function ContextualSuggestionsPanel({
  selectedCities,
  onSaveSuggestion,
  onAddToItinerary,
  budgetAvailable = true,
}: ContextualSuggestionsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "dining" | "lodging" | "sightseeing" | "nearby">("all");
  const [viewingDetail, setViewingDetail] = useState<Suggestion | null>(null);
  const [confirmingAdd, setConfirmingAdd] = useState<Suggestion | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const filters = [
    { id: "all", label: "Tất cả" },
    { id: "dining", label: "Ẩm thực" },
    { id: "lodging", label: "Lưu trú" },
    { id: "sightseeing", label: "Tham quan" },
    { id: "nearby", label: "Gần đây" },
  ];

  // Filter suggestions by selected cities and active filter
  const filteredSuggestions = mockSuggestions.filter((s) => {
    const cityMatch = selectedCities.includes(s.city);
    const typeMatch = activeFilter === "all" || s.type === activeFilter;
    return cityMatch && typeMatch;
  });

  const handleViewDetails = (suggestion: Suggestion) => {
    setViewingDetail(suggestion);
    trackOpenDetail(suggestion.id, suggestion.name);
  };

  const handleSave = (suggestion: Suggestion) => {
    onSaveSuggestion(suggestion);
    trackSaveSuggestion(suggestion.id, suggestion.name);
  };

  const handleConfirmAdd = () => {
    if (confirmingAdd && selectedDate && selectedTime) {
      onAddToItinerary(confirmingAdd, selectedDate, selectedTime);
      trackAddToItineraryConfirm(confirmingAdd.id, confirmingAdd.name, selectedDate, selectedTime);
      setConfirmingAdd(null);
      setViewingDetail(null);
      setSelectedDate("");
      setSelectedTime("");
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="rounded-lg bg-cyan-500 p-3 text-white shadow-lg transition-all hover:bg-cyan-600"
          title="Mở rộng gợi ý"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white border-l-2 border-gray-200">
      {/* Header */}
      <div className="border-b-2 border-gray-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Gợi ý cho ngày này</h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            title="Thu gọn"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFilter === filter.id
                  ? "bg-cyan-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {!budgetAvailable && (
          <p className="mt-2 text-xs text-gray-500">
            Đang hiển thị gợi ý được đánh giá cao (không có dữ liệu ngân sách)
          </p>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="py-12 text-center">
            <MapPin className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Không có gợi ý nào</p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="rounded-xl border-2 border-gray-200 bg-white p-3 transition-all hover:border-cyan-300 hover:shadow-md"
              onMouseEnter={() => trackViewSuggestion(suggestion.id, suggestion.name, "panel")}
            >
              <img
                src={suggestion.image}
                alt={suggestion.name}
                className="mb-3 h-32 w-full rounded-lg object-cover"
              />
              <h4 className="mb-1 font-bold text-gray-900">{suggestion.name}</h4>
              <p className="mb-2 text-xs text-gray-600">{suggestion.reasoning}</p>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{suggestion.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{suggestion.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{suggestion.estimatedCost}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(suggestion)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:text-cyan-600"
                >
                  <Eye className="h-3 w-3" />
                  Chi tiết
                </button>
                <button
                  onClick={() => handleSave(suggestion)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-cyan-600"
                >
                  <Bookmark className="h-3 w-3" />
                  Lưu
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {viewingDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewingDetail(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingDetail.image}
              alt={viewingDetail.name}
              className="h-48 w-full rounded-t-2xl object-cover"
            />
            <div className="p-6">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">{viewingDetail.name}</h3>
              <p className="mb-4 text-sm text-gray-600">{viewingDetail.description}</p>

              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{viewingDetail.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{viewingDetail.rating} / 5.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>{viewingDetail.estimatedCost}</span>
                </div>
              </div>

              <button
                onClick={() => setConfirmingAdd(viewingDetail)}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white transition-all hover:scale-[1.02]"
              >
                Thêm vào lịch trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Confirmation Modal */}
      {confirmingAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900">Thêm vào lịch trình</h3>
            <p className="mb-4 text-sm text-gray-600">
              Chọn ngày và giờ cho: <strong>{confirmingAdd.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Calendar className="h-4 w-4" />
                  Ngày
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                />
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
                  setSelectedDate("");
                  setSelectedTime("");
                }}
                className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
