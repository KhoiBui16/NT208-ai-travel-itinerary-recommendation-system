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
  Share2,
  Bookmark,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../utils/auth";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { Place, CityData, cityData } from "../data/cities";


export default function CityDetail() {
  const { cityId } = useParams<{ cityId: string }>();
  const navigate = useNavigate();
  const [savedPlaces, setSavedPlaces] = useState<number[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const city = cityId ? cityData[cityId] : null;

  // Sync bookmark state from localStorage on mount
  useEffect(() => {
    if (!city) return;
    const savedPlacesData = localStorage.getItem("savedPlaces");
    if (savedPlacesData) {
      try {
        const savedPlacesArray = JSON.parse(savedPlacesData);
        const savedNames = new Set(savedPlacesArray.map((p: any) => p.name));
        const matchedIds = city.popularPlaces
          .filter(p => savedNames.has(p.name))
          .map(p => p.id);
        setSavedPlaces(matchedIds);
      } catch (e) {}
    }
  }, [city]);

  if (!city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Không tìm thấy thành phố
          </h1>
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

  const toggleSavePlace = (placeId: number) => {
    if (!getCurrentUser()) {
      setShowLoginModal(true);
      return;
    }
    
    const place = city?.popularPlaces.find(p => p.id === placeId);
    if (!place) return;
    
    const savedPlacesData = localStorage.getItem("savedPlaces");
    let savedPlacesArray: any[] = [];
    if (savedPlacesData) {
      try { savedPlacesArray = JSON.parse(savedPlacesData); } catch (e) {}
    }
    
    const isAlreadySaved = savedPlacesArray.some((p: any) => p.name === place.name);
    
    if (isAlreadySaved) {
      savedPlacesArray = savedPlacesArray.filter((p: any) => p.name !== place.name);
      setSavedPlaces(prev => prev.filter(id => id !== placeId));
    } else {
      savedPlacesArray.push({
        id: `city-${cityId}-${placeId}`,
        name: place.name,
        type: place.category,
        rating: place.rating,
        reviewCount: place.reviewCount,
        estimatedCost: place.estimatedCost,
        priceLevel: "",
        image: place.image,
        description: place.description,
        address: place.address || city?.name || "",
        openingHours: place.openingHours,
        savedAt: new Date().toISOString(),
        isBookmarked: true,
      });
      setSavedPlaces(prev => [...prev, placeId]);
    }
    
    localStorage.setItem("savedPlaces", JSON.stringify(savedPlacesArray));
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
            Sẵn sàng khám phá {city.name}?
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
      </div>

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}