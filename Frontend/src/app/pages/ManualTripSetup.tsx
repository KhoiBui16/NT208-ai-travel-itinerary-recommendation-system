import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { getCurrentUser } from "../utils/auth";
import {
  Heart,
  Plus,
  X,
  Search,
  MapPin,
  Eye,
  ArrowRight,
  Star,
  Utensils,
  TreePine,
  Landmark,
  Home,
  ChevronRight,
  Check,
  Bookmark,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";

import { Destination, destinations } from "../data/destinations";

export default function ManualTripSetup() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [savedDestinations, setSavedDestinations] = useState<number[]>([]);
  const [selectedDests, setSelectedDests] = useState<number[]>([]);
  const [viewingDest, setViewingDest] = useState<Destination | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalReason, setLoginModalReason] = useState("");

  // Check auth state from localStorage
  const isLoggedIn = !!getCurrentUser();

  // Sync bookmark state from localStorage on mount
  useEffect(() => {
    const savedPlacesData = localStorage.getItem("savedPlaces");
    if (savedPlacesData) {
      try {
        const savedPlacesArray = JSON.parse(savedPlacesData);
        const savedNames = new Set(savedPlacesArray.map((p: any) => p.name));
        const matchedIds = destinations
          .filter((d) => savedNames.has(d.name))
          .map((d) => d.id);
        setSavedDestinations(matchedIds);
      } catch (e) {}
    }
  }, []);

  const filtered = destinations.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn) {
      setLoginModalReason("Đăng nhập để lưu điểm đến yêu thích");
      setShowLoginModal(true);
      return;
    }

    const dest = destinations.find((d) => d.id === id);
    if (!dest) return;

    const savedPlacesData = localStorage.getItem("savedPlaces");
    let savedPlacesArray: any[] = [];
    if (savedPlacesData) {
      try {
        savedPlacesArray = JSON.parse(savedPlacesData);
      } catch (e) {}
    }

    const isAlreadySaved = savedPlacesArray.some(
      (p: any) => p.name === dest.name,
    );

    if (isAlreadySaved) {
      savedPlacesArray = savedPlacesArray.filter(
        (p: any) => p.name !== dest.name,
      );
      setSavedDestinations((prev) => prev.filter((d) => d !== id));
    } else {
      savedPlacesArray.push({
        id: `dest-${id}`,
        name: dest.name,
        type: "Điểm đến",
        rating: dest.rating,
        reviewCount: 0,
        estimatedCost: "",
        priceLevel: "",
        image: dest.image,
        description: dest.description,
        address: dest.country,
        savedAt: new Date().toISOString(),
        isBookmarked: true,
      });
      setSavedDestinations((prev) => [...prev, id]);
    }

    localStorage.setItem("savedPlaces", JSON.stringify(savedPlacesArray));
  };

  const handleAddDestination = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle selection
    setSelectedDests((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleContinue = () => {
    const selected = destinations.filter((d) => selectedDests.includes(d.id));
    localStorage.setItem("tripDestinations", JSON.stringify(selected));
    navigate("/day-allocation");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      {/* View Places Modal */}
      {viewingDest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewingDest(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with image */}
            <div className="relative h-48 overflow-hidden rounded-t-2xl">
              <img
                src={viewingDest.image}
                alt={viewingDest.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
              <div className="absolute bottom-4 left-6">
                <h2 className="text-3xl font-bold text-white">
                  {viewingDest.name}
                </h2>
                <p className="text-white/80">{viewingDest.country}</p>
              </div>
              <button
                onClick={() => setViewingDest(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-500">
                Khám phá các địa điểm nổi bật tại {viewingDest.name} — bạn có
                thể thêm chúng vào lịch trình sau.
              </p>
              {viewingDest.places.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.category}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-cyan-600" />
                      <h3 className="font-bold text-gray-900">
                        {category.category}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <span className="font-medium text-gray-800">
                            {item.name}
                          </span>
                          <div className="ml-auto flex items-center gap-1 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs text-gray-500">
                              Nổi bật
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => setViewingDest(null)}
                  className="rounded-xl border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    if (!selectedDests.includes(viewingDest.id)) {
                      setSelectedDests((prev) => [...prev, viewingDest.id]);
                    }
                    setViewingDest(null);
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 font-bold text-white shadow-md transition-all hover:scale-[1.02]"
                >
                  + Thêm {viewingDest.name} vào chuyến đi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          {/* Back Button */}
          <button
            onClick={() => navigate("/create-trip")}
            className="mb-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-cyan-600"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-semibold">Quay lại</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chọn Điểm Đến
          </h1>
          <p className="text-gray-500">
            Chọn các thành phố hoặc khu vực bạn muốn khám phá. Bạn có thể chọn
            nhiều điểm đến.
          </p>
        </div>

        {/* Selected Destinations Bar */}
        {selectedDests.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-md border border-cyan-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-3 text-sm font-bold text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  Điểm đến đã chọn ({selectedDests.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDests.map((dest) => (
                    <div
                      key={dest}
                      className="flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 pl-3 pr-2 py-1.5"
                    >
                      <span className="text-sm font-semibold text-cyan-700">
                        {destinations.find((d) => d.id === dest)?.name}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedDests((prev) =>
                            prev.filter((id) => id !== dest),
                          )
                        }
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-200 text-cyan-600 transition-colors hover:bg-cyan-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleContinue}
                className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                Tiếp tục
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm điểm đến..."
            className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100 transition-all shadow-sm"
          />
        </div>

        {/* Destination Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dest) => {
            const isSelected = selectedDests.includes(dest.id);
            return (
              <div
                key={dest.id}
                className={`group overflow-hidden rounded-2xl border-2 shadow-sm transition-all duration-300 ${
                  isSelected
                    ? "border-cyan-500 bg-white ring-2 ring-cyan-200 shadow-lg"
                    : "border-gray-200 bg-white hover:border-cyan-300 hover:shadow-md"
                }`}
              >
                <div
                  className="relative h-56 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingDest(dest);
                  }}
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent group-hover:bg-gradient-to-t group-hover:from-black/75 group-hover:via-black/35" />

                  {/* Top Right Action Buttons */}
                  <div className="absolute right-3 top-3 flex gap-2 z-10">
                    <button
                      onClick={(e) => handleAddDestination(dest.id, e)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all shadow-lg ${
                        isSelected
                          ? "bg-cyan-400 text-white hover:bg-gray-500 hover:scale-110"
                          : "bg-gray-400 text-white hover:bg-cyan-600 hover:scale-110"
                      }`}
                      title={isSelected ? "Bỏ chọn" : "Thêm vào chuyến đi"}
                      aria-label={isSelected ? "Bỏ chọn" : "Thêm vào chuyến đi"}
                    >
                      {isSelected ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>

                    <button
                      onClick={(e) => toggleSaved(dest.id, e)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all shadow-lg ${
                        savedDestinations.includes(dest.id)
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-white/90 text-gray-600 hover:bg-orange-500 hover:text-white hover:scale-110"
                      }`}
                      title={isLoggedIn ? "Lưu điểm đến" : "Đăng nhập để lưu"}
                      aria-label={
                        isLoggedIn ? "Lưu điểm đến" : "Đăng nhập để lưu"
                      }
                    >
                      <Bookmark
                        className={`h-5 w-5 ${savedDestinations.includes(dest.id) ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
                      <Check className="h-4 w-4" />
                      Đã chọn
                    </div>
                  )}

                  {/* Bottom Info - Khung chứa thông tin phía dưới */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    {/* Tên địa điểm */}
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-white drop-shadow" />
                      <h3 className="text-2xl font-bold text-white drop-shadow">
                        {dest.name}
                      </h3>
                    </div>

                    {/* Mô tả ngắn */}
                    <p className="mb-4 line-clamp-1 text-sm text-white/90 drop-shadow">
                      {dest.description}
                    </p>

                    {/* Hàng sao và nút Xem chi tiết */}
                    <div className="flex items-center justify-between">
                      {/* Góc trái: Sao và Rating */}
                      <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-white">
                          {dest.rating}
                        </span>
                      </div>

                      {/* Góc phải: Chữ Xem chi tiết */}
                      <div className="flex items-center gap-1 text-sm font-semibold text-white transition-all group-hover:gap-2">
                        <span>Xem chi tiết</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">Không tìm thấy điểm đến phù hợp</p>
          </div>
        )}
      </div>

      {/* Login Required Modal */}
      {showLoginModal && (
        <LoginRequiredModal
          isOpen={showLoginModal}
          reason={loginModalReason}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
