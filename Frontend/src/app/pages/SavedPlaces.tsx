import { Link } from "react-router";
import { Header } from "../components/Header";
import { Bookmark, MapPin, Clock, Star, Plus, Trash2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlaceInfoModal } from "../components/PlaceInfoModal";
import * as placesService from "../services/places";
import { normalizeSavedPlaces, type NormalizedSavedPlace } from "../utils/savedPlaces";

interface SavedPlaceDisplay {
  savedId: number; // bookmark row ID — used for DELETE /saved/:savedId
  placeId: number; // actual place ID — used for POST /saved { placeId }
  name: string;
  type: string;
  rating: number;
  reviewCount: number;
  estimatedCost: string;
  image: string;
  description: string;
  address: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  savedAt: string;
  isBookmarked?: boolean;
}

export default function SavedPlaces() {
  const [savedLocations, setSavedLocations] = useState<SavedPlaceDisplay[]>([]);
  const [viewingPlace, setViewingPlace] = useState<SavedPlaceDisplay | null>(null);

  // Load saved places from API — use normalizeSavedPlace to get correct savedId/placeId
  useEffect(() => {
    placesService.listSavedPlaces().then((res) => {
      const normalized = normalizeSavedPlaces(res);
      const mapped: SavedPlaceDisplay[] = normalized.map((sp) => ({
        savedId: sp.savedId,
        placeId: sp.placeId,
        name: sp.name,
        type: sp.category || "attraction",
        rating: 0,
        reviewCount: 0,
        estimatedCost: "",
        image: sp.image || "",
        description: "",
        address: sp.location || "",
        isBookmarked: true,
        savedAt: sp.createdAt || "",
      }));
      // Merge full place details from the raw response for display
      res.forEach((raw, idx) => {
        if (mapped[idx]) {
          mapped[idx].rating = raw.place?.rating ?? 0;
          mapped[idx].reviewCount = raw.place?.reviewCount ?? 0;
          mapped[idx].estimatedCost = String(raw.place?.price ?? "");
          mapped[idx].image = raw.place?.image ?? mapped[idx].image;
          mapped[idx].description = raw.place?.description ?? "";
          mapped[idx].address = raw.place?.location ?? mapped[idx].address;
        }
      });
      setSavedLocations(mapped);
    }).catch(() => {
      setSavedLocations([]);
      toast.error("Không thể tải danh sách địa điểm đã lưu. Vui lòng thử lại sau.", {
        position: "top-right",
        duration: 4000,
      });
    });
  }, []);

  const handleToggleBookmark = (savedId: number) => {
    const place = savedLocations.find(loc => loc.savedId === savedId);
    if (!place) return;

    if (place.isBookmarked === false) {
      // Re-save via API using the actual place ID
      placesService.savePlace(place.placeId).catch(() => {
        // Revert UI
        setSavedLocations((prev) =>
          prev.map((loc) =>
            loc.savedId === savedId ? { ...loc, isBookmarked: place.isBookmarked } : loc
          )
        );
        toast.error("Không thể lưu địa điểm. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    } else {
      // Unsave via API using the bookmark row ID (savedId, not placeId)
      placesService.unsavePlace(savedId).catch(() => {
        // Revert UI
        setSavedLocations((prev) =>
          prev.map((loc) =>
            loc.savedId === savedId ? { ...loc, isBookmarked: place.isBookmarked } : loc
          )
        );
        toast.error("Không thể bỏ lưu địa điểm. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    }

    setSavedLocations(prevLocations =>
      prevLocations.map(loc =>
        loc.savedId === savedId ? { ...loc, isBookmarked: !loc.isBookmarked } : loc
      )
    );
  };

  const handleDelete = (savedId: number) => {
    // Always use savedId (bookmark row ID) for unsave, never placeId
    placesService.unsavePlace(savedId).catch(() => {
      toast.error("Không thể xóa địa điểm. Vui lòng thử lại sau.", {
        position: "top-right",
        duration: 4000,
      });
    });
    const updated = savedLocations.filter(loc => loc.savedId !== savedId);
    setSavedLocations(updated);
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
                key={location.savedId}
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
                    onClick={() => handleToggleBookmark(location.savedId)}
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