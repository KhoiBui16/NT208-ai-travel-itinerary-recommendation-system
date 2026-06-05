import { useParams, useNavigate } from "react-router";
import { Header } from "../components/Header";
import {
  MapPin,
  Star,
  ArrowLeft,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Heart,
  Bookmark,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { listSavedPlaces, savePlace, unsavePlace, getDestinationDetail, type PlaceResponse } from "../services/places";
import { Place, CityData, cityData } from "../data/cities";
import { resolvePlaceImageWithCategory } from "../utils/placeImage";
import { toast } from "sonner";

export default function CityDetail() {
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<number[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set());
  const [apiPlaces, setApiPlaces] = useState<PlaceResponse[]>([]);
  const [apiCityName, setApiCityName] = useState<string | null>(null);
  // Track whether the API responded (to distinguish "loading" from "no data")
  const [apiLoaded, setApiLoaded] = useState(false);

  const city = cityId ? cityData[cityId] : null;

  // Try loading from API, fall back to mock
  useEffect(() => {
    if (!cityId) return;
    let isMounted = true;

    // Derive API destination name from slug: "ha-noi" -> "Hà Nội"
    const slugToName: Record<string, string> = {
      "ha-noi": "Hà Nội", "ho-chi-minh": "Hồ Chí Minh", "da-nang": "Đà Nẵng",
      "hoi-an": "Hội An", "hue": "Huế", "nha-trang": "Nha Trang",
      "da-lat": "Đà Lạt", "ha-long": "Hạ Long", "sapa": "Sapa",
      "phu-quoc": "Phú Quốc", "vinh-ha-long": "Vịnh Hạ Long",
      "ninh-binh": "Ninh Bình", "quang-ninh": "Quảng Ninh",
      "can-tho": "Cần Thơ", "vung-tau": "Vũng Tàu", "hai-phong": "Hải Phòng",
    };

    const name = slugToName[cityId];
    if (!name) return;

    getDestinationDetail(name).then((data) => {
      if (!isMounted) return;
      const dest = (data as any).destination;
      const places = (data as any).places as PlaceResponse[];
      if (dest) setApiCityName(dest.name || name);
      if (places && places.length > 0) setApiPlaces(places);
      setApiLoaded(true);
    }).catch(() => {
      // Keep mock fallback
      if (isMounted) setApiLoaded(true);
    });

    return () => { isMounted = false; };
  }, [cityId]);

  // Sync bookmark state from BE API on mount
  useEffect(() => {
    if (!city || !isAuthenticated) return;
    listSavedPlaces().then((data) => {
      // Correct BE shape: { id: savedId, place: { id: placeId, name, ... } }
      const names = new Set(data.map((p: any) => p.place?.name || p.placeName || p.name).filter(Boolean));
      setSavedPlaceNames(names);
      const matchedIds = city.popularPlaces
        .filter(p => names.has(p.name))
        .map(p => p.id);
      setSavedPlaces(matchedIds);
    }).catch(() => {});
  }, [city, isAuthenticated]);

  if (!city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Thành phố không tồn tại
          </h1>
          <p className="mb-6 text-lg text-gray-600">
            Thành phố bạn tìm kiếm không có trong hệ thống. Vui lòng chọn thành phố khác từ danh sách.
          </p>
          <button
            onClick={() => navigate("/cities")}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-all hover:bg-cyan-700"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const toggleSavePlace = async (placeId: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const place = city?.popularPlaces.find(p => p.id === placeId);
    if (!place) return;

    const isAlreadySaved = savedPlaceNames.has(place.name);

    // Optimistic UI update
    if (isAlreadySaved) {
      setSavedPlaces(prev => prev.filter(id => id !== placeId));
      setSavedPlaceNames(prev => { const n = new Set(prev); n.delete(place.name); return n; });
    } else {
      setSavedPlaces(prev => [...prev, placeId]);
      setSavedPlaceNames(prev => { const n = new Set(prev); n.add(place.name); return n; });
    }

    try {
      if (isAlreadySaved) {
        // Find saved place ID to unsave — use correct BE shape: { id: savedId, place: { name } }
        const savedList = await listSavedPlaces();
        const match = savedList.find((p: any) => (p.place?.name || p.placeName || p.name) === place.name);
        if (match) await unsavePlace(match.id); // match.id is the savedId (bookmark row)
        toast.success("Đã bỏ lưu địa điểm");
      } else {
        await savePlace(placeId);
        toast.success("Đã lưu địa điểm");
      }
    } catch {
      // Revert on failure
      if (isAlreadySaved) {
        setSavedPlaces(prev => [...prev, placeId]);
        setSavedPlaceNames(prev => { const n = new Set(prev); n.add(place.name); return n; });
      } else {
        setSavedPlaces(prev => prev.filter(id => id !== placeId));
        setSavedPlaceNames(prev => { const n = new Set(prev); n.delete(place.name); return n; });
      }
      toast.error("Không thể lưu địa điểm lúc này. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      {/* Hero Banner */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={city.bannerImage}
          alt={city.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate("/cities")}
          className="absolute left-6 top-6 flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 font-semibold text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Quay lại
        </button>

        {/* City Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-500/90 px-4 py-2 backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">
                {city.region}
              </span>
            </div>
            <h1 className="mb-3 text-6xl font-bold text-white drop-shadow-lg">
              {city.name}
            </h1>
            <p className="max-w-3xl text-xl text-white/90 drop-shadow">
              {city.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* City Overview */}
        <div className="mb-12 rounded-3xl bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Giới thiệu tổng quan
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-gray-700">
            {city.overview}
          </p>

          {/* Quick Info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-4">
              <Calendar className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  Thời gian tốt nhất
                </p>
                <p className="font-bold text-gray-900">{city.bestTimeToVisit}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  Nhiệt độ trung bình
                </p>
                <p className="font-bold text-gray-900">
                  {city.averageTemperature}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-4">
              <MapPin className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-semibold text-gray-600">
                  Địa điểm nổi tiếng
                </p>
                <p className="font-bold text-gray-900">
                  {city.popularPlaces.length} địa điểm
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Places */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">
              Địa điểm nổi tiếng
            </h2>
            <p className="text-gray-600">
              {city.popularPlaces.length} địa điểm
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {city.popularPlaces.map((place) => {
              const isSaved = savedPlaces.includes(place.id);

              return (
                <div
                  key={place.id}
                  className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all hover:shadow-xl"
                >
                  {/* Place Image */}
                  <div className="relative h-64">
                    <img
                      src={place.image}
                      alt={place.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Save Button */}
                    <button
                      onClick={() => toggleSavePlace(place.id)}
                      className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all ${
                        isSaved
                          ? "bg-orange-500 text-white hover:bg-orange-600"
                          : "bg-white/90 text-gray-600 hover:bg-orange-500 hover:text-white"
                      }`}
                    >
                      <Bookmark
                        className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`}
                      />
                    </button>

                    {/* Category Badge */}
                    <div className="absolute left-4 top-4">
                      <span className="inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {place.category}
                      </span>
                    </div>

                    {/* Place Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="mb-1 text-2xl font-bold text-white drop-shadow-lg">
                        {place.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/90">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{place.rating}</span>
                        <span className="text-sm">
                          ({place.reviewCount.toLocaleString()} đánh giá)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Place Info */}
                  <div className="p-5">
                    <p className="mb-4 text-gray-700">{place.description}</p>

                    <div className="space-y-2 border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-600">
                          Giờ mở cửa:
                        </span>
                        <span className="text-gray-900">
                          {place.openingHours}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-600">
                          Giá tham khảo:
                        </span>
                        <span className="text-gray-900">{place.priceRange}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Users className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-600">
                          Thời gian tham quan:
                        </span>
                        <span className="text-gray-900">
                          {place.visitDuration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-10 text-center text-white">
          <h3 className="mb-4 text-3xl font-bold">
            Sẵn sàng khám phá {apiCityName || city.name}?
          </h3>
          <p className="mb-6 text-lg text-cyan-100">
            Tạo lịch trình du lịch của bạn ngay hôm nay
          </p>
          <button
            onClick={() => navigate("/create-trip")}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-cyan-600 shadow-lg transition-all hover:scale-105"
          >
            <Calendar className="h-6 w-6" />
            Lên kế hoạch chuyến đi
          </button>
        </div>

        {/* API Places — shown when BE has data */}
        {/* PRODUCT RULE: Do NOT suggest choosing a different city. Show this exact copy when no places. */}
        {apiLoaded && apiPlaces.length === 0 && (
          <div className="mt-12 rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
            <p className="text-amber-800 font-semibold mb-2">
              Địa điểm đang được cập nhật
            </p>
            <p className="text-sm text-amber-700">
              Chúng tôi đang thu thập thông tin cho {apiCityName || city.name}. Vui lòng thử lại sau hoặc chọn thành phố khác.
            </p>
          </div>
        )}
        {apiPlaces.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              Địa điểm từ cơ sở dữ liệu
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {apiPlaces.map((place) => (                <div
                  key={place.id}
                  className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all hover:shadow-xl"
                >
                  <div className="relative h-48">
                    <img
                      src={resolvePlaceImageWithCategory(place.image, place.type)}
                      alt={place.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {place.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 text-lg font-bold text-gray-900">{place.name}</h3>
                    {place.location && (
                      <p className="mb-2 text-sm text-gray-500">{place.location}</p>
                    )}
                    {place.description && (
                      <p className="text-sm text-gray-700 line-clamp-2">{place.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {place.rating != null && (
                        <>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{place.rating}</span>
                        </>
                      )}
                      {place.price && (
                        <span className="text-sm text-gray-500">{place.price}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}