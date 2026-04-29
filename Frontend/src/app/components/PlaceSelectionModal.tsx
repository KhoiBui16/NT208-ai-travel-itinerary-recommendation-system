import { useState, useEffect, useRef } from "react";
import { X, ArrowLeft, Star, Bookmark, MapPin, Plus, Check, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { PlaceInfoModal } from "./PlaceInfoModal";
import { City, Place, cities, places } from "../data/places";

interface PlaceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlace: (place: Place) => void;
  currentDayLabel: string;
  destinationName?: string;
}

const CATEGORIES = ["Tất cả", "Điểm tham quan", "Ẩm thực", "Thiên nhiên", "Giải trí", "Mua sắm"];

export function PlaceSelectionModal({ isOpen, onClose, currentDayLabel, onAddPlace, destinationName }: PlaceSelectionModalProps) {
  const [step, setStep] = useState<"city" | "place">("city");
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<number[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<number[]>([]);
  const [viewingPlaceInfo, setViewingPlaceInfo] = useState<Place | null>(null);
  
  // States cho Tìm kiếm và Lọc
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  
  const modalRef = useRef<HTMLDivElement>(null);

  const syncBookmarksFromStorage = () => {
    const data = localStorage.getItem("savedPlaces");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const savedNames = new Set(parsed.map((p: any) => p.name));
        const matchedIds = places
          .filter((p) => savedNames.has(p.name))
          .map((p) => p.id);
        setSavedPlaces(matchedIds);
      } catch (e) {
        setSavedPlaces([]);
      }
    } else {
      setSavedPlaces([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (destinationName) {
        const normalizedTarget = destinationName.toLowerCase().replace(/^(tp\.?\s*|thành phố\s*)/, '').trim();
        const matchedCity = cities.find((c) => {
          const normalizedCity = c.name.toLowerCase().replace(/^(tp\.?\s*|thành phố\s*)/, '').trim();
          return normalizedCity.includes(normalizedTarget) || normalizedTarget.includes(normalizedCity);
        });

        if (matchedCity) {
          setSelectedCityId(matchedCity.id);
          setStep("place");
        } else {
          setStep("city");
          setSelectedCityId(null);
        }
      } else {
        setStep("city");
        setSelectedCityId(null);
      }
      setSelectedPlaces([]);
      setSearchQuery("");
      setActiveCategory("Tất cả");
      syncBookmarksFromStorage();
    }
  }, [isOpen, destinationName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedCity = cities.find((c) => c.id === selectedCityId);
  
  // Logic Lọc danh sách địa điểm theo Search và Category
  const cityPlaces = places
    .filter((p) => p.cityId === selectedCityId)
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = activeCategory === "Tất cả" || p.category === activeCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      const aIsBookmarked = savedPlaces.includes(a.id);
      const bIsBookmarked = savedPlaces.includes(b.id);
      if (aIsBookmarked && !bIsBookmarked) return -1;
      if (!aIsBookmarked && bIsBookmarked) return 1;
      return 0;
    });

  const handleCitySelect = (cityId: number) => {
    setSelectedCityId(cityId);
    setSearchQuery("");
    setActiveCategory("Tất cả");
    setStep("place");
  };

  const handleBack = () => {
    setStep("city");
    setSelectedCityId(null);
    setSelectedPlaces([]);
  };

  const togglePlaceSelection = (placeId: number) => {
    setSelectedPlaces((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const handleConfirmSelection = () => {
    const selectedPlaceObjects = places.filter((p) => selectedPlaces.includes(p.id));
    selectedPlaceObjects.forEach((place) => {
      onAddPlace(place);
    });
    toast.success(`Đã thêm ${selectedPlaces.length} địa điểm vào ${currentDayLabel}`);
    onClose();
  };

  const handleClearSelection = () => {
    setSelectedPlaces([]);
  };

  const toggleBookmark = (placeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = localStorage.getItem("currentUser");
    if (!user) return;
    
    const place = places.find((p) => p.id === placeId);
    if (!place) return;
    
    const isCurrentlySaved = savedPlaces.includes(placeId);
    const data = localStorage.getItem("savedPlaces");
    let arr: any[] = [];
    if (data) {
      try { arr = JSON.parse(data); } catch (e) {}
    }
    
    if (isCurrentlySaved) {
      arr = arr.filter((p: any) => p.name !== place.name);
      setSavedPlaces((prev) => prev.filter((id) => id !== placeId));
    } else {
      arr.push({
        id: `modal-${placeId}`,
        name: place.name,
        type: place.category === "Ẩm thực" ? "food" : place.category === "Điểm tham quan" ? "attraction" : place.category === "Thiên nhiên" ? "nature" : place.category === "Giải trí" ? "entertainment" : place.category === "Mua sắm" ? "shopping" : "attraction",
        rating: place.rating,
        reviewCount: 0,
        estimatedCost: "",
        priceLevel: "",
        image: place.image,
        description: place.description,
        address: cities.find((c) => c.id === place.cityId)?.name || "",
        savedAt: new Date().toISOString(),
        isBookmarked: true,
      });
      setSavedPlaces((prev) => [...prev, placeId]);
    }
    localStorage.setItem("savedPlaces", JSON.stringify(arr));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Selection Bar */}
        {selectedPlaces.length > 0 && step === "place" && (
          <div className="flex-shrink-0 border-b border-cyan-300 bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3.5 shadow-md z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <p className="font-bold text-white">
                  Đã chọn {selectedPlaces.length} địa điểm
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearSelection}
                  className="rounded-xl border-2 border-white/60 bg-white/15 px-4 py-2 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmSelection}
                  className="rounded-xl bg-white px-5 py-2 font-bold text-cyan-600 shadow-md transition-all hover:scale-[1.02]"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === "place" && !destinationName && (
                <button
                  onClick={handleBack}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {step === "city" ? "Chọn thành phố" : selectedCity?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === "city" 
                    ? `Thêm địa điểm cho ${currentDayLabel}`
                    : `Khám phá các địa điểm nổi bật`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Thanh Tìm kiếm & Lọc (Chỉ hiện khi ở bước chọn địa điểm) */}
          {step === "place" && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tên địa điểm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      activeCategory === cat
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "city" && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => handleCitySelect(city.id)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:border-cyan-300 hover:shadow-xl"
                >
                  <div className="relative h-48">
                    <img
                      src={city.image}
                      alt={city.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-xl font-bold text-white drop-shadow">{city.name}</h3>
                      <p className="text-sm text-white/90 drop-shadow">{city.country}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === "place" && (
            <>
              {cityPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MapPin className="mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-lg font-semibold">Không tìm thấy địa điểm phù hợp</p>
                  <p className="text-sm">Vui lòng thử từ khóa hoặc bộ lọc khác</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {cityPlaces.map((place) => {
                    const isSelected = selectedPlaces.includes(place.id);
                    
                    return (
                      <div
                        key={place.id}
                        className={`group overflow-hidden flex flex-col rounded-2xl border-2 bg-white shadow-md transition-all duration-200 ${
                          isSelected 
                            ? "border-cyan-500 ring-4 ring-cyan-200 shadow-xl" 
                            : "border-gray-200 hover:border-cyan-300"
                        }`}
                      >
                        <div className="relative h-48 flex-shrink-0">
                          <img
                            src={place.image}
                            alt={place.name}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          
                          <button
                            onClick={(e) => toggleBookmark(place.id, e)}
                            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-lg ${
                              savedPlaces.includes(place.id)
                                ? "bg-orange-500 text-white hover:bg-orange-600"
                                : "bg-white/90 text-gray-600 hover:bg-orange-500 hover:text-white hover:scale-110"
                            }`}
                            title="Lưu địa điểm"
                          >
                            <Bookmark className={`h-5 w-5 ${savedPlaces.includes(place.id) ? "fill-current" : ""}`} />
                          </button>

                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="mb-1 inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                              {place.category}
                            </div>
                            <h3 className="text-lg font-bold text-white drop-shadow leading-tight">{place.name}</h3>
                            <div className="flex items-center gap-1 text-white/90 mt-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{place.rating}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{place.description}</p>
                          
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => setViewingPlaceInfo(place)}
                              className="flex-1 flex items-center justify-center gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:text-cyan-600"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Chi tiết
                            </button>
                            <button
                              onClick={() => togglePlaceSelection(place.id)}
                              className={`flex-[1.5] rounded-xl py-2 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2 ${
                                isSelected
                                  ? "bg-cyan-600 text-white"
                                  : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Đã chọn
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  Thêm
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {viewingPlaceInfo && (
        <PlaceInfoModal
          place={{
            name: viewingPlaceInfo.name,
            image: viewingPlaceInfo.image,
            description: viewingPlaceInfo.description,
            address: cities.find(c => c.id === viewingPlaceInfo.cityId)?.name || '',
            rating: viewingPlaceInfo.rating,
            reviewCount: 1234, 
            estimatedCost: '100,000₫', 
            openingHours: '08:00 - 22:00', 
          }}
          onClose={() => setViewingPlaceInfo(null)}
        />
      )}
    </div>
  );
}