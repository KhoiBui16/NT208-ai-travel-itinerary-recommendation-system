import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { PlaceInfoModal } from "../components/PlaceInfoModal";
import { useAuth } from "../contexts/AuthContext";
import { getItinerary } from "../services/itinerary";
import { getDestinationDetail, listSavedPlaces, savePlace, unsavePlace, type PlaceResponse } from "../services/places";
import { normalizeSavedPlaces } from "../utils/savedPlaces";
import { applyPlaceImageFallback, resolvePlaceImage } from "../utils/placeImage";
import { GoongMap } from "../components/GoongMap";
import {
  Plus,
  Car,
  MapPin,
  Utensils,
  Building,
  Camera,
  Coffee,
  Share2,
  Download,
  Map as MapIcon,
  DollarSign,
  Edit,
  TreePine,
  Music,
  ShoppingBag,
  Star,
  Eye,
  Bookmark,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Type definitions to match TripWorkspace
interface Activity {
  id: number;
  time: string;
  endTime?: string;
  name: string;
  location: string;
  description: string;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  transportation?: "walk" | "bike" | "bus" | "taxi";
}

interface Day {
  id: number;
  label: string;
  date: string;
  activities: Activity[];
  destinationName?: string;
}

const formatSuggestionCost = (place: PlaceResponse) => place.price || "Chưa có dữ liệu";

export default function DailyItinerary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");
  const { isAuthenticated } = useAuth();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedSuggestions, setSavedSuggestions] = useState<number[]>([]);
  const [viewingPlace, setViewingPlace] = useState<PlaceResponse | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"suggestions" | "map">("suggestions");

  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Load trip data from BE API
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>("1");
  const [suggestions, setSuggestions] = useState<PlaceResponse[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Load data from BE API on mount
  useEffect(() => {
    // If we have a tripId in URL, fetch from API; otherwise fallback to sessionStorage
    if (tripIdParam) {
      getItinerary(Number(tripIdParam)).then((tripData) => {
        if (tripData.days && tripData.days.length > 0) {
          setDays(tripData.days.map((d: any) => ({
            id: d.id,
            label: d.label,
            date: d.date,
            activities: (d.activities || []).map((a: any) => ({
              id: a.id,
              time: a.time,
              endTime: a.endTime,
              name: a.name,
              location: a.location,
              description: a.description,
              type: a.type,
              image: a.image,
              transportation: a.transportation,
            })),
            destinationName: d.destinationName,
          })));
          setSelectedDayId(String(tripData.days[0].id));
        }
      }).catch((error) => {
        console.error("Error loading trip data:", error);
      });
    } else {
      // Fallback: check sessionStorage for workspace-passed data
      const savedTrip = sessionStorage.getItem("currentTrip");
      if (savedTrip) {
        try {
          const tripData = JSON.parse(savedTrip);
          if (tripData.days && tripData.days.length > 0) {
            setDays(tripData.days);
            setSelectedDayId(tripData.days[0].id.toString());
          }
        } catch (error) {
          console.error("Error loading trip data:", error);
        }
      }
    }

    // Load saved places from API
    if (isAuthenticated) {
      listSavedPlaces().then((data) => {
        const normalized = normalizeSavedPlaces(data);
        const savedIds = new Set(
          data
            .map((item) => item.place?.id)
            .filter((value): value is number => typeof value === "number"),
        );
        const savedNames = new Set(normalized.map((p) => p.name));
        const matchedIds = suggestions
          .filter((place) => savedIds.has(place.id) || savedNames.has(place.name))
          .map((place) => place.id);
        setSavedSuggestions(matchedIds);
      }).catch(() => {});
    }
  }, [tripIdParam, isAuthenticated, suggestions]);
  
  // Get selected day data
  const selectedDay = days.find(d => d.id.toString() === selectedDayId);
  const currentActivities = selectedDay?.activities || [];

  useEffect(() => {
    if (!selectedDay?.destinationName) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    getDestinationDetail(selectedDay.destinationName)
      .then((detail) => {
        if (!active) return;
        setSuggestions(detail.places);
      })
      .catch(() => {
        if (!active) return;
        setSuggestions([]);
        setSuggestionsError("Không thể tải gợi ý địa điểm từ dữ liệu hiện có.");
      })
      .finally(() => {
        if (active) {
          setSuggestionsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDay?.destinationName]);

  const filteredSuggestions = [...suggestions]
    .sort((a, b) => {
      // Sort bookmarked places to the top
      const aIsBookmarked = savedSuggestions.includes(a.id);
      const bIsBookmarked = savedSuggestions.includes(b.id);
      if (aIsBookmarked && !bIsBookmarked) return -1;
      if (!aIsBookmarked && bIsBookmarked) return 1;
      return 0;
    });
    
  const handleToggleSave = async (suggestion: PlaceResponse) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const isAlreadySaved = savedSuggestions.includes(suggestion.id);

    // Optimistic UI update
    if (isAlreadySaved) {
      setSavedSuggestions(prev => prev.filter(id => id !== suggestion.id));
    } else {
      setSavedSuggestions(prev => [...prev, suggestion.id]);
    }

    try {
      if (isAlreadySaved) {
        const savedList = await listSavedPlaces();
        const match = savedList.find((item) => item.place?.id === suggestion.id || item.place?.name === suggestion.name);
        if (match) await unsavePlace(match.id);
      } else {
        await savePlace(suggestion.id);
      }
    } catch {
      // Revert on failure
      if (isAlreadySaved) {
        setSavedSuggestions(prev => [...prev, suggestion.id]);
      } else {
        setSavedSuggestions(prev => prev.filter(id => id !== suggestion.id));
      }
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Header />

      {/* Top Navigation Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Day Selector Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">Ngày hiện tại</label>
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger className="w-[240px] border-gray-300 bg-white">
                    <SelectValue placeholder="Chọn ngày..." />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.label} - {day.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-3">
              {/* Detail Trip Button - UPDATED TEXT */}
              <Link
                to={tripIdParam ? `/trip-workspace?tripId=${tripIdParam}` : "/trip-workspace"}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md"
              >
                <Edit className="h-4 w-4" />
                Chi tiết lịch trình
              </Link>

              {/* Share Button */}
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-gray-700 shadow-md transition-all hover:shadow-lg border border-gray-200">
                    <Share2 className="h-5 w-5" />
                    <span className="hidden sm:inline">Chia sẻ</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Chia Sẻ Chuyến Đi</DialogTitle>
                    <DialogDescription>
                      Chia sẻ lịch trình của bạn với bạn bè và gia đình
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {!isAuthenticated ? (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                        <p className="text-sm font-semibold text-amber-800">
                          Vui lòng đăng nhập để chia sẻ lịch trình
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                        <p className="text-sm text-gray-600">
                          Màn hình này chỉ là bản xem theo ngày. Để tạo link chia sẻ thật, hãy vào trang Chi tiết lịch trình và dùng nút Chia sẻ ở đó.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <button
                        disabled
                        title="Tính năng đang phát triển"
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 opacity-50 cursor-not-allowed"
                      >
                        <Download className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-400">Export as PDF</span>
                        <span className="ml-auto text-xs text-gray-400">Tính năng đang phát triển</span>
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Link
                to="/create-trip"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tạo lịch trình mới</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Timeline - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Timeline with Vertical Line */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h3 className="mb-6 text-xl font-bold text-gray-900">
                {selectedDay ? `Lịch Trình ${selectedDay.label} - ${selectedDay.date}` : 'Lịch Trình'}
              </h3>

              <div className="relative space-y-6">
                {/* Vertical Timeline Line */}
                {currentActivities.length > 0 && (
                  <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-400 via-purple-400 to-orange-400" />
                )}

                {currentActivities.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-lg font-medium">Chưa có hoạt động nào trong ngày này</p>
                    <p className="mt-2 text-sm">Hãy thêm địa điểm từ trang Chi tiết lịch trình</p>
                  </div>
                ) : (
                  currentActivities.map((item, index) => {
                    // Get icon component based on activity type
                    const getActivityIcon = (type: string) => {
                      switch (type) {
                        case 'food': return Utensils;
                        case 'attraction': return Building;
                        case 'nature': return TreePine;
                        case 'entertainment': return Music;
                        case 'shopping': return ShoppingBag;
                        default: return MapPin;
                      }
                    };
                    const ActivityIcon = getActivityIcon(item.type);

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline Marker */}
                        <div className="absolute left-0 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>

                        <div className="ml-16 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                          <div className="flex gap-4">
                            {/* Thumbnail */}
                            <img
                              src={resolvePlaceImage(item.image)}
                              alt={item.name}
                              onError={applyPlaceImageFallback}
                              className="h-24 w-24 rounded-lg object-cover"
                            />

                            {/* Content */}
                            <div className="flex-1">
                              <div className="mb-2">
                                <div className="mb-1 flex items-center gap-2">
                                  <ActivityIcon className="h-5 w-5 text-cyan-600" />
                                  <p className="text-sm font-semibold text-gray-500">
                                    {item.time}
                                  </p>
                                </div>
                                <h4 className="mb-1 text-lg font-bold text-gray-900">
                                  {item.name}
                                </h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>

                              {/* Transportation info if available */}
                              {item.transportation && index < currentActivities.length - 1 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Car className="h-4 w-4" />
                                  <span>
                                    {item.transportation === 'walk' && 'Đi bộ'}
                                    {item.transportation === 'bike' && 'Đi xe đạp'}
                                    {item.transportation === 'bus' && 'Đi xe buýt'}
                                    {item.transportation === 'taxi' && 'Đi taxi'}
                                    {' đến điểm tiếp theo'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Suggestions & Map với Segmented Control */}
        <div className="w-[450px] flex-shrink-0 flex flex-col bg-white border-l-2 border-gray-200">
          {/* Segmented Control Header */}
          <div className="border-b-2 border-gray-200 p-4">
            <div className="inline-flex w-full rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setRightPanelTab("suggestions")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  rightPanelTab === "suggestions"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Gợi ý
              </button>
              <button
                onClick={() => setRightPanelTab("map")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  rightPanelTab === "map"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Bản đồ
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {rightPanelTab === "suggestions" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {suggestionsLoading && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Đang tải gợi ý địa điểm từ dữ liệu điểm đến...
                </div>
              )}
              {!suggestionsLoading && suggestionsError && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  {suggestionsError}
                </div>
              )}
              {!suggestionsLoading && !suggestionsError && filteredSuggestions.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Chưa có gợi ý khả dụng cho ngày này từ dữ liệu hiện có.
                </div>
              )}
              {!suggestionsLoading && !suggestionsError && filteredSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-xl border-2 border-gray-200 bg-white transition-all hover:border-cyan-300 hover:shadow-md overflow-hidden"
                >
                  {/* Image with Bookmark */}
                  <div className="relative">
                    <img
                      src={resolvePlaceImage(suggestion.image)}
                      alt={suggestion.name}
                      onError={applyPlaceImageFallback}
                      className="h-32 w-full object-cover"
                    />
                    {/* Bookmark Icon */}
                    <button
                      onClick={() => handleToggleSave(suggestion)}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
                        savedSuggestions.includes(suggestion.id)
                          ? "bg-cyan-700 text-white"
                          : "bg-white/90 text-gray-600 hover:bg-cyan-500 hover:text-white"
                      }`}
                      title={savedSuggestions.includes(suggestion.id) ? "Đã lưu" : "Lưu địa điểm"}
                    >
                      <Bookmark className={`h-4 w-4 ${savedSuggestions.includes(suggestion.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h4 className="mb-1 font-bold text-gray-900">{suggestion.name}</h4>
                    <p className="mb-2 text-xs text-gray-600 line-clamp-2">{suggestion.description}</p>

                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{suggestion.rating ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{suggestion.location || suggestion.city}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatSuggestionCost(suggestion)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingPlace(suggestion)}
                      className="w-full flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:text-cyan-600"
                    >
                      <Eye className="h-3 w-3" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Map Tab — real Goong map of the destination's places */
            <div className="flex-1 relative overflow-hidden">
              <GoongMap
                places={filteredSuggestions}
                destinationName={selectedDay?.destinationName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Place Info Modal */}
      {viewingPlace && (
        <PlaceInfoModal
          place={{
            name: viewingPlace.name,
            image: viewingPlace.image,
            description: viewingPlace.description,
            address: viewingPlace.location || viewingPlace.city,
            rating: viewingPlace.rating ?? undefined,
            reviewCount: viewingPlace.reviewCount,
            estimatedCost: formatSuggestionCost(viewingPlace),
          }}
          onClose={() => setViewingPlace(null)}
        />
      )}

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        reason="Đăng nhập để lưu địa điểm yêu thích"
      />
    </div>
  );
}
