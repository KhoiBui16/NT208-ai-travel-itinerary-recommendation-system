import { Link } from "react-router";
import { Header } from "../components/Header";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { City, cities } from "../data/cities";


const regions = ["Tất cả", "Miền Bắc", "Miền Trung", "Miền Nam"];

export default function CityList() {
  const selectedRegion = "Tất cả";

  const filteredCities =
    selectedRegion === "Tất cả"
      ? cities
      : cities.filter((city) => city.region === selectedRegion);

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
          {filteredCities.map((city) => (
            <Link
              key={city.id}
              to={`/cities/${city.id}`}
              className="group overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:border-cyan-300 hover:shadow-xl"
            >
              {/* City Image */}
              <div className="relative h-56">
                <img
                  src={city.image}
                  alt={city.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Region Badge */}
                <div className="absolute left-3 top-3">
                  <span className="inline-block rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {city.region}
                  </span>
                </div>

                {/* City Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                    {city.name}
                  </h3>
                  <div className="flex items-center gap-1 text-white/90">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{city.rating}</span>
                  </div>
                </div>
              </div>

              {/* City Info */}
              <div className="p-4">
                <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                  {city.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {city.popularPlaces} địa điểm
                  </span>
                  <div className="flex items-center gap-1 text-cyan-600 transition-all group-hover:gap-2">
                    <span className="text-sm font-semibold">Xem chi tiết</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
