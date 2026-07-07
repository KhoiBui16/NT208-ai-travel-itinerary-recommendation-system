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
  Bookmark,
  BedDouble,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import {
  listSavedPlaces,
  savePlace,
  unsavePlace,
  getDestinationDetail,
  type DestinationResponse,
  type HotelResponse,
  type PlaceResponse,
  type SavedPlaceResponse,
} from "../services/places";
import {
  applyPlaceImageFallback,
  getDestinationFallbackImage,
  resolvePlaceImage,
  resolvePlaceImageWithCategory,
  DEFAULT_PLACE_IMAGE,
} from "../utils/placeImage";
import { toast } from "sonner";

const PLACE_CATEGORY_LABELS: Record<string, string> = {
  food: "Ẩm thực",
  attraction: "Điểm tham quan",
  nature: "Thiên nhiên",
  entertainment: "Giải trí",
  shopping: "Mua sắm",
};

interface DisplayPlaceCard {
  id: number;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  description: string;
  openingHours: string;
  priceRange: string;
  visitDuration: string;
  address?: string;
}

interface DisplayCityView {
  name: string;
  region: string;
  image: string;
  bannerImage: string;
  description: string;
  overview: string;
  bestTimeToVisit: string;
  averageTemperature: string;
}

const DEFAULT_PLACE_META = {
  openingHours: "Đang cập nhật từ dữ liệu hệ thống",
  priceRange: "Đang cập nhật từ dữ liệu hệ thống",
  visitDuration: "Cần kiểm tra thực tế trước khi lên lịch trình chi tiết",
};

function formatPlaceCategory(type: string): string {
  return PLACE_CATEGORY_LABELS[type] ?? type;
}

function resolveDestinationImage(name: string, apiImage?: string | null): string {
  return resolvePlaceImage(apiImage, getDestinationFallbackImage(name));
}

function toDisplayPlace(place: PlaceResponse): DisplayPlaceCard {
  return {
    id: place.id,
    name: place.name,
    image: resolvePlaceImageWithCategory(place.image, place.type),
    rating: place.rating ?? 0,
    reviewCount: place.reviewCount ?? 0,
    category: formatPlaceCategory(place.type),
    description:
      place.description ||
      "Địa điểm đã được đồng bộ vào hệ thống. Mô tả chi tiết sẽ được bổ sung khi dữ liệu nguồn đầy đủ hơn.",
    openingHours: DEFAULT_PLACE_META.openingHours,
    priceRange: place.price ?? DEFAULT_PLACE_META.priceRange,
    visitDuration: DEFAULT_PLACE_META.visitDuration,
    address: place.location ?? undefined,
  };
}

function getReadinessLabel(
  readinessStatus?: DestinationResponse["readinessStatus"],
): string {
  if (readinessStatus === "ready") return "Sẵn sàng";
  if (readinessStatus === "partial") return "Có thể sử dụng";
  return "Dữ liệu còn thưa";
}

function formatHotelPrice(price: number): string {
  return `${price.toLocaleString("vi-VN")}đ/đêm`;
}

export default function CityDetail() {
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<number[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set());
  // place name -> SavedPlace record id, cached from the initial list fetch so
  // unsave does not refetch /places/saved/list on every bookmark toggle.
  const [savedIdByName, setSavedIdByName] = useState<Map<string, number>>(new Map());
  const [apiDestination, setApiDestination] = useState<DestinationResponse | null>(null);
  const [apiPlaces, setApiPlaces] = useState<PlaceResponse[]>([]);
  const [apiHotels, setApiHotels] = useState<HotelResponse[]>([]);
  // Track whether the API responded (to distinguish "loading" from "no data")
  const [apiLoaded, setApiLoaded] = useState(false);

  // Luôn ưu tiên dữ liệu API thật để tránh browser test "pass giả" nhờ mock pack.
  useEffect(() => {
    if (!cityId) return;
    let isMounted = true;

    setApiLoaded(false);
    setApiDestination(null);
    setApiPlaces([]);
    setApiHotels([]);

    getDestinationDetail(cityId)
      .then((data) => {
        if (!isMounted) return;
        setApiDestination(data.destination ?? null);
        setApiPlaces(data.places ?? []);
        setApiHotels(data.hotels ?? []);
        setApiLoaded(true);
      })
      .catch(() => {
        if (isMounted) setApiLoaded(true);
      });

    return () => { isMounted = false; };
  }, [cityId]);

  const mappedApiPlaces = apiPlaces.map(toDisplayPlace);
  const hasApiDetail = !!apiDestination;
  const displayPlaces = mappedApiPlaces;
  const apiPlaceCount = apiDestination?.placesCount ?? apiPlaces.length;
  const apiHotelCount = apiDestination?.hotelsCount ?? apiHotels.length;

  const displayCity: DisplayCityView | null =
    (apiDestination
      ? {
          name: apiDestination.name,
          region: "Việt Nam",
          image: resolveDestinationImage(apiDestination.name, apiDestination.image),
          bannerImage: resolveDestinationImage(apiDestination.name, apiDestination.image),
          description:
            apiDestination.description ||
            apiDestination.readinessReason ||
            `${apiDestination.name} hiện có ${apiPlaceCount} địa điểm và ${apiHotelCount} khách sạn trong hệ thống.`,
          overview:
            apiDestination.description ||
            (apiDestination.readinessReason
              ? `${apiDestination.readinessReason} Trang này ưu tiên hiển thị dữ liệu backend hiện có để bạn đánh giá đúng độ phủ dữ liệu trước khi tạo lịch trình.`
              : `${apiDestination.name} hiện có ${apiPlaceCount} địa điểm và ${apiHotelCount} khách sạn tham khảo trong cơ sở dữ liệu. Trang này đang hiển thị trực tiếp dữ liệu backend thay vì mock pack cố định.`),
          bestTimeToVisit: "Đang cập nhật từ dữ liệu hệ thống",
          averageTemperature: apiHotelCount
            ? `${apiHotelCount} khách sạn tham khảo`
            : "Đang cập nhật từ dữ liệu hệ thống",
        }
      : null);

  const displayPlaceCount = hasApiDetail ? apiPlaceCount : displayPlaces.length;

  // Sync bookmark state from BE API once per city load (or when auth changes).
  // NOTE: depend on the stable `apiDestination`/`apiPlaces` state refs, NOT on
  // `displayCity`/`displayPlaces` (which are new objects every render) — otherwise
  // this effect refires every render and storms /places/saved/list. See B1.
  useEffect(() => {
    if (!apiDestination || !isAuthenticated || apiPlaces.length === 0) return;
    let isMounted = true;
    listSavedPlaces().then((data) => {
      if (!isMounted) return;
      const names = new Set<string>();
      const idByName = new Map<string, number>();
      for (const savedPlace of data) {
        const placeName = savedPlace.place?.name;
        if (placeName) {
          names.add(placeName);
          idByName.set(placeName, savedPlace.id);
        }
      }
      setSavedPlaceNames(names);
      setSavedIdByName(idByName);
      const matchedIds = apiPlaces
        .filter((place) => names.has(place.name))
        .map((place) => place.id);
      setSavedPlaces(matchedIds);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [apiDestination, apiPlaces, isAuthenticated]);

  if (!displayCity) {
    if (!apiLoaded) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
          <Header />
          <div className="flex items-center justify-center py-40">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
              <p className="text-gray-500">Đang tải chi tiết điểm đến...</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Điểm đến chưa sẵn sàng
          </h1>
          <p className="mb-6 text-lg text-gray-600">
            Điểm đến bạn mở hiện chưa có dữ liệu khả dụng trong hệ thống hoặc slug chưa khớp với backend.
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

    const place = displayPlaces.find(p => p.id === placeId);
    if (!place) return;

    const isAlreadySaved = savedPlaceNames.has(place.name);

    // Optimistic UI update
    if (isAlreadySaved) {
      setSavedPlaces(prev => prev.filter(id => id !== placeId));
      setSavedPlaceNames(prev => { const n = new Set(prev); n.delete(place.name); return n; });
      setSavedIdByName(prev => { const n = new Map(prev); n.delete(place.name); return n; });
    } else {
      setSavedPlaces(prev => [...prev, placeId]);
      setSavedPlaceNames(prev => { const n = new Set(prev); n.add(place.name); return n; });
    }

    try {
      if (isAlreadySaved) {
        // Use the cached SavedPlace id so a bookmark toggle does NOT refetch
        // /places/saved/list every time. Only refetch (once) if the id is
        // missing — e.g. the place was saved before this view cached its id.
        let savedId = savedIdByName.get(place.name);
        if (savedId === undefined) {
          const savedList = await listSavedPlaces();
          const match = savedList.find((savedPlace) => savedPlace.place?.name === place.name);
          savedId = match?.id;
        }
        if (savedId !== undefined) {
          await unsavePlace(savedId);
        }
        toast.success("Đã bỏ lưu địa điểm");
      } else {
        const created = await savePlace(placeId);
        setSavedIdByName(prev => {
          const n = new Map(prev);
          n.set(created.place.name, created.id);
          return n;
        });
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
          src={displayCity.bannerImage}
          alt={displayCity.name}
          onError={(event) =>
            applyPlaceImageFallback(
              event,
              getDestinationFallbackImage(displayCity.name),
            )
          }
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
                {displayCity.region}
              </span>
            </div>
            <h1 className="mb-3 text-6xl font-bold text-white drop-shadow-lg">
              {displayCity.name}
            </h1>
            <p className="max-w-3xl text-xl text-white/90 drop-shadow">
              {displayCity.description}
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
            {displayCity.overview}
          </p>

          {/* Quick Info */}
          {hasApiDetail ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-4">
                <Calendar className="h-8 w-8 text-cyan-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Thời gian tốt nhất
                  </p>
                  <p className="font-bold text-gray-900">
                    {displayCity.bestTimeToVisit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Nhiệt độ trung bình
                  </p>
                  <p className="font-bold text-gray-900">
                    {displayCity.averageTemperature}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-4">
                <MapPin className="h-8 w-8 text-cyan-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Địa điểm hiện có
                  </p>
                  <p className="font-bold text-gray-900">{displayPlaceCount} địa điểm</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-4">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Trạng thái dữ liệu
                  </p>
                  <p className="font-bold text-gray-900">
                    {getReadinessLabel(apiDestination?.readinessStatus)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-4">
                <Calendar className="h-8 w-8 text-cyan-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Thời gian tốt nhất
                  </p>
                  <p className="font-bold text-gray-900">{displayCity.bestTimeToVisit}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">
                    Nhiệt độ trung bình
                  </p>
                  <p className="font-bold text-gray-900">
                    {displayCity.averageTemperature}
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
                    {displayPlaceCount} địa điểm
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popular Places */}
        {displayPlaces.length > 0 && (
          <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">
              Địa điểm nổi bật từ dữ liệu hiện có
            </h2>
            <p className="text-gray-600">
              {displayPlaceCount} địa điểm
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {displayPlaces.map((place) => {
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
                      onError={applyPlaceImageFallback}
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
                        {place.rating > 0 ? (
                          <>
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{place.rating}</span>
                            <span className="text-sm">
                              ({place.reviewCount.toLocaleString()} đánh giá)
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold">Chưa có đánh giá</span>
                        )}
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
        )}

        {apiHotels.length > 0 && (
          <div className="mt-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                Khách sạn tham khảo
              </h2>
              <p className="text-gray-600">{apiHotelCount} khách sạn</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {apiHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all hover:shadow-xl"
                >
                  <div className="relative h-56">
                    <img
                      src={resolvePlaceImage(hotel.image)}
                      alt={hotel.name}
                      onError={applyPlaceImageFallback}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    <div className="absolute left-4 top-4">
                      <span className="inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        Khách sạn
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="mb-1 text-2xl font-bold text-white drop-shadow-lg">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-2 text-white/90">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{hotel.rating}</span>
                        <span className="text-sm">
                          ({hotel.reviewCount.toLocaleString()} đánh giá)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="mb-4 text-gray-700">{hotel.description}</p>

                    <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <span>{hotel.location}</span>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {hotel.amenities.length > 0 ? (
                        hotel.amenities.slice(0, 4).map((amenity) => (
                          <span
                            key={`${hotel.id}-${amenity}`}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                          >
                            {amenity}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          Tiện nghi đang cập nhật
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-cyan-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-600">Giá tham khảo</p>
                        <p className="font-bold text-cyan-700">
                          {formatHotelPrice(hotel.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate("/create-trip")}
                        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-700"
                      >
                        Dùng cho lịch trình
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-10 text-center text-white">
          <h3 className="mb-4 text-3xl font-bold">
            Sẵn sàng khám phá {apiDestination?.name || displayCity.name}?
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
        {apiLoaded && hasApiDetail && displayPlaces.length === 0 && apiHotelCount === 0 && (
          <div className="mt-12 rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
            <p className="text-amber-800 font-semibold mb-2">
              Địa điểm chưa được hỗ trợ trong giai đoạn hiện tại
            </p>
            <p className="text-sm text-amber-700">
              Vui lòng liên hệ để được cập nhật thêm địa điểm
            </p>
          </div>
        )}
        {apiLoaded && hasApiDetail && displayPlaces.length === 0 && apiHotelCount > 0 && (
          <div className="mt-12 rounded-xl border border-cyan-200 bg-cyan-50 p-6 text-center">
            <p className="mb-2 font-semibold text-cyan-800">
              Điểm đến này đã có dữ liệu khách sạn nhưng chưa có địa điểm tham quan trong hệ thống
            </p>
            <p className="text-sm text-cyan-700">
              Bạn vẫn có thể xem khách sạn tham khảo và tiếp tục kiểm tra mức sẵn sàng dữ liệu trước khi tạo lịch trình.
            </p>
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
