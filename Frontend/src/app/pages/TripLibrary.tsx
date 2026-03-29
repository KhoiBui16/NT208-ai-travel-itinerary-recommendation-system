import { Link } from "react-router";
import { Header } from "../components/Header";
import { Plus, MapPin, Calendar, DollarSign, Heart, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

// Mock trip data - in real app this would come from API/localStorage


export default function TripLibrary() {
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    const savedTripsData = localStorage.getItem("savedTrips");
    if (savedTripsData) {
      try {
        const parsedTrips = JSON.parse(savedTripsData);
        // Sắp xếp mới nhất lên đầu
        parsedTrips.sort((a: any, b: any) => b.createdAt - a.createdAt);
        setTrips(parsedTrips);
      } catch (e) {
        setTrips([]);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Chuyến Đi Của Tôi
          </h1>
          <p className="text-lg text-gray-600">
            Quản lý và xem tất cả các chuyến đi của bạn
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Tổng chuyến đi</span>
              <Calendar className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{trips.length}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Địa điểm đã lưu</span>
              <Heart className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {trips.reduce((sum, trip) => sum + trip.savedLocationsCount, 0)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">Tổng ngân sách</span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {(trips.reduce((sum, trip) => sum + trip.estimatedCost, 0) / 1000000).toFixed(1)}M
            </p>
          </div>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg border border-gray-200">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Chưa có chuyến đi nào
            </h3>
            <p className="mb-6 text-gray-600">
              Bắt đầu lên kế hoạch cho chuyến đi đầu tiên của bạn!
            </p>
            <Link
              to="/create-trip"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <Plus className="h-6 w-6" />
              Tạo Chuyến Đi Mới
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                to={`/daily-itinerary`}
                className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1 border border-gray-200"
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={trip.coverImage}
                    alt={trip.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        trip.status === "planned"
                          ? "bg-green-500 text-white"
                          : "bg-yellow-500 text-gray-900"
                      }`}
                    >
                      {trip.status === "planned" ? "Đã lên kế hoạch" : "Nháp"}
                    </span>
                  </div>

                  {/* Trip Name */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="mb-1 text-xl font-bold text-white">
                      {trip.name}
                    </h3>
                    <div className="flex items-center gap-1 text-white">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{trip.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* Date Range */}
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trip.startDate} - {trip.endDate}
                    </span>
                  </div>

                  {/* Trip Details */}
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-cyan-50 p-3 border border-cyan-100">
                      <p className="text-xs text-cyan-700 mb-1">Số ngày</p>
                      <p className="text-lg font-bold text-cyan-900">
                        {trip.days} ngày
                      </p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
                      <p className="text-xs text-orange-700 mb-1">Chi phí dự kiến</p>
                      <p className="text-lg font-bold text-orange-900">
                        {(trip.estimatedCost / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>

                  {/* Saved Locations Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Heart className="h-4 w-4" />
                      <span>{trip.savedLocationsCount} địa điểm đã lưu</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* AI Suggestion Card */}
        {trips.length > 0 && (
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-8 shadow-lg border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Để AI giúp bạn lên kế hoạch!
                </h3>
                <p className="mb-4 text-gray-700">
                  Miễn phí tạo tới 2 lịch trình AI mỗi ngày. Nhận đề xuất cá nhân hóa cho chuyến đi tiếp theo của bạn.
                </p>
                <Link
                  to="/create-trip"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  <Sparkles className="h-5 w-5" />
                  Tạo Với AI
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        to="/create-trip"
        className="fixed bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-2xl transition-all hover:scale-110 hover:shadow-3xl"
      >
        <Plus className="h-8 w-8 text-white" />
      </Link>
    </div>
  );
}
