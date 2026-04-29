import { Link } from "react-router";
import { Header } from "../components/Header";
import { Bookmark, MapPin, Clock, Star, Plus, Trash2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { PlaceInfoModal } from "../components/PlaceInfoModal";

interface SavedPlace {
  id: string;
  name: string;
  type: string;
  rating: number;
  reviewCount: number;
  distance?: string;
  estimatedCost: string;
  priceLevel: string;
  image: string;
  description: string;
  address: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  savedAt: string;
  isBookmarked?: boolean; // Track bookmark state
}

export default function SavedPlaces() {
  const [savedLocations, setSavedLocations] = useState<SavedPlace[]>([]);
  const [viewingPlace, setViewingPlace] = useState<SavedPlace | null>(null);

  // Load saved places from localStorage
  useEffect(() => { // TODO: Gọi API GET /api/places/saved để lấy danh sách địa điểm đã lưu thực tế. Hiện tại đang dùng localStorage để demo.
    const savedPlaces = localStorage.getItem("savedPlaces");
    if (savedPlaces) {
      try {
        const parsed = JSON.parse(savedPlaces);
        // Initialize all as bookmarked
        const withBookmark = parsed.map((p: SavedPlace) => ({
          ...p,
          isBookmarked: p.isBookmarked !== undefined ? p.isBookmarked : true,
        }));
        setSavedLocations(withBookmark);
      } catch (error) {
        console.error("Error loading saved places:", error);
      }
    }
  }, []);

  // Clean up unbookmarked places on component unmount or page unload
  useEffect(() => {
    const cleanupUnbookmarked = () => {
      const bookmarkedOnly = savedLocations.filter(loc => loc.isBookmarked !== false);
      if (bookmarkedOnly.length !== savedLocations.length) {
        localStorage.setItem("savedPlaces", JSON.stringify(bookmarkedOnly));
      }
    };

    // Cleanup on page unload
    window.addEventListener("beforeunload", cleanupUnbookmarked);

    return () => {
      window.removeEventListener("beforeunload", cleanupUnbookmarked);
      // Cleanup on component unmount
      cleanupUnbookmarked();
    };
  }, [savedLocations]);

  const handleToggleBookmark = (id: string) => {
    setSavedLocations(prevLocations => {
      const updated = prevLocations.map(loc =>
        loc.id === id
          ? { ...loc, isBookmarked: !loc.isBookmarked }
          : loc
      );
      
      // Update localStorage immediately for currently bookmarked items
      const currentlyBookmarked = updated.filter(loc => loc.isBookmarked !== false);
      localStorage.setItem("savedPlaces", JSON.stringify(currentlyBookmarked));
      
      return updated;
    });
  };

  const handleDelete = (id: string) => { // TODO: Gọi API DELETE /api/places/saved/:id để xóa địa điểm đã lưu thực tế. Hiện tại chỉ xóa local để demo.
    const updated = savedLocations.filter(loc => loc.id !== id);
    setSavedLocations(updated);
    localStorage.setItem("savedPlaces", JSON.stringify(updated.filter(loc => loc.isBookmarked !== false)));
  };

  // Filter to show all locations, even unbookmarked ones (until page reload)
  const displayLocations = savedLocations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Địa Điểm Đã Lưu
          </h1>
          <p className="text-lg text-gray-600">
            {displayLocations.filter(l => l.isBookmarked !== false).length} địa điểm yêu thích của bạn
          </p>
        </div>

        {displayLocations.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg border border-gray-200">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Bookmark className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Chưa có địa điểm nào được lưu
            </h3>
            <p className="text-gray-600">
              Bắt đầu lưu các địa điểm yêu thích khi tạo chuyến đi!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayLocations.map((location) => (
              <div
                key={location.id}
                className={`group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl border-2 ${
                  location.isBookmarked === false
                    ? "border-gray-300"
                    : "border-gray-200"
                }`}
              >
                {/* Location Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Bookmark Icon */}
                  <button
                    onClick={() => handleToggleBookmark(location.id)}
                    className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 ${
                      location.isBookmarked === false
                        ? "bg-white/90 text-gray-600 hover:bg-cyan-500 hover:text-white"
                        : "bg-cyan-700 text-white"
                    }`}
                    title={location.isBookmarked === false ? "Lưu lại" : "Đã lưu"}
                  >
                    <Bookmark className={`h-5 w-5 ${location.isBookmarked === false ? "" : "fill-current"}`} />
                  </button>

                  {/* Category Badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-bold text-white">
                      {location.type}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-2 flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{location.address}</span>
                  </div>

                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    {location.name}
                  </h3>

                  <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                    {location.description}
                  </p>

                  {/* Rating */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">
                        {location.rating}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({location.reviewCount.toLocaleString()} đánh giá)
                    </span>
                  </div>

                  {/* Opening Hours */}
                  {location.openingHours && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{location.openingHours}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingPlace(location)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:text-cyan-600"
                    >
                      <Eye className="h-4 w-4" />
                      Chi tiết địa điểm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips Card */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 shadow-lg border-2 border-purple-200">
          <h3 className="mb-2 text-xl font-bold text-gray-900">💡 Mẹo</h3>
          <p className="text-gray-700">
            Lưu các địa điểm yêu thích khi duyệt qua đề xuất. Các địa điểm bỏ lưu sẽ tự động biến mất khi bạn tải lại trang!
          </p>
        </div>
      </div>

      {/* Place Info Modal */}
      {viewingPlace && (
        <PlaceInfoModal
          place={{
            name: viewingPlace.name,
            image: viewingPlace.image,
            description: viewingPlace.description,
            address: viewingPlace.address,
            rating: viewingPlace.rating,
            reviewCount: viewingPlace.reviewCount,
            estimatedCost: viewingPlace.estimatedCost,
            openingHours: viewingPlace.openingHours,
            phone: viewingPlace.phone,
            website: viewingPlace.website,
          }}
          onClose={() => setViewingPlace(null)}
        />
      )}
    </div>
  );
}