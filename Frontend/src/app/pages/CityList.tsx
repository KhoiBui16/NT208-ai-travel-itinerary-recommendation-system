import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { listDestinations, type DestinationResponse } from "../services/places";
import {
  applyPlaceImageFallback,
  DEFAULT_PLACE_IMAGE,
  getDestinationFallbackImage,
  resolvePlaceImage,
} from "../utils/placeImage";

interface DisplayCity {
  id: number;
  slug: string;
  name: string;
  region: string;
  image: string;
  description: string;
  popularPlaces: number;
  rating: number;
}

function resolveDestinationCardImage(
  name: string,
  image?: string | null,
): string {
  return resolvePlaceImage(image, getDestinationFallbackImage(name));
}

/** Map API destinations to the display shape CityList expects. */
function apiToCity(d: DestinationResponse): DisplayCity {
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    region: "",
    image: resolveDestinationCardImage(d.name, d.image),
    description: d.description || d.readinessReason || d.country || "",
    popularPlaces: d.placesCount,
    rating: d.rating || 0,
  };
}

const regions = ["Tất cả", "Miền Bắc", "Miền Trung", "Miền Nam"];

export default function CityList() {
  const [cityList, setCityList] = useState<DisplayCity[]>([]);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedRegion = "Tất cả";

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const apiDests = await listDestinations();
        if (!isMounted) return;

        if (apiDests.length > 0) {
          setCityList(apiDests.map(apiToCity));
        } else {
          setCityList([]);
          setLoadMessage("Chưa có dữ liệu điểm đến trong hệ thống. Hãy chạy ETL để nạp dữ liệu thật.");
        }
      } catch {
        if (isMounted) {
          setCityList([]);
          setLoadMessage("Không thể tải danh sách điểm đến từ API. Hãy kiểm tra backend, database và ETL.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  const filteredCities =
    selectedRegion === "Tất cả"
      ? cityList
      : cityList.filter((city) => city.region === selectedRegion);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
            <p className="text-gray-500">Đang tải điểm đến...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-cyan-600 to-cyan-700 py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
            <MapPin className="h-5 w-5 text-white" />
            <span className="text-sm font-semibold text-white">
              Khám phá Việt Nam
            </span>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-white">
            Điểm Đến Tại Việt Nam
          </h1>
          <p className="max-w-2xl text-xl text-cyan-100">
            Khám phá vẻ đẹp đa dạng của Việt Nam từ Bắc vào Nam. Chọn thành phố
            để xem chi tiết về các địa điểm nổi tiếng và thông tin du lịch.
          </p>
        </div>
      </div>

      {/* City Grid */}
      <div className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCities.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800">
              <p className="text-lg font-semibold">Chưa thể hiển thị danh sách điểm đến.</p>
              <p className="mt-1 text-sm">
                {loadMessage || "Hệ thống chưa có dữ liệu điểm đến để hiển thị."}
              </p>
            </div>
          ) : (
            filteredCities.map((city) => (
              <Link
                key={city.id}
                to={`/cities/${city.slug}`}
                className="group overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:border-cyan-300 hover:shadow-xl"
              >
                {/* City Image */}
                <div className="relative h-56">
                  <img
                    src={city.image}
                    alt={city.name}
                    onError={(event) =>
                      applyPlaceImageFallback(
                        event,
                        getDestinationFallbackImage(city.name),
                      )
                    }
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Region Badge */}
                  {city.region && (
                    <div className="absolute left-3 top-3">
                      <span className="inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {city.region}
                      </span>
                    </div>
                  )}

                  {/* City Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                      {city.name}
                    </h3>
                    {city.rating > 0 && (
                      <div className="flex items-center gap-1 text-white/90">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{city.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* City Info */}
                <div className="p-4">
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                    {city.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {city.popularPlaces > 0 ? `${city.popularPlaces} địa điểm` : "Xem chi tiết"}
                    </span>
                    <div className="flex items-center gap-1 text-cyan-600 transition-all group-hover:gap-2">
                      <span className="text-sm font-semibold">Xem chi tiết</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
