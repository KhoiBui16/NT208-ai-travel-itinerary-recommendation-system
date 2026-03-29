import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Header } from "../components/Header";
import { Calendar, MapPin, Trash2, Eye, Star, BookOpen } from "lucide-react";
import {
  getCurrentUser,
  getSavedItineraries,
  deleteItinerary,
  isAuthenticated,
} from "../utils/auth";
import { formatCurrency } from "../utils/itinerary";
import type { Itinerary } from "../utils/auth";

export default function SavedItineraries() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  useEffect(() => { // TODO: Gọi API GET /api/itineraries/saved để lấy danh sách lịch trình đã lưu thực tế.
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const user = getCurrentUser();
    if (user) {
      const saved = getSavedItineraries(user.id);
      setItineraries(saved);
    }
  }, [navigate]);

  const handleDelete = (id: string) => { // TODO: Gọi API DELETE /api/itineraries/:id để xóa lịch trình thực tế.
    if (confirm("Bạn có chắc muốn xóa lịch trình này?")) {
      deleteItinerary(id);
      setItineraries(itineraries.filter((i) => i.id !== id));
    }
  };

  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Hành Trình Đã Lưu
          </h1>
          <p className="text-lg text-gray-600">
            Quản lý tất cả các lịch trình du lịch của bạn
          </p>
        </div>

        {itineraries.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-xl">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              Chưa có lịch trình nào
            </h3>
            <p className="mb-6 text-gray-600">
              Bắt đầu lên kế hoạch cho chuyến đi đầu tiên của bạn
            </p>
            <Link
              to="/trip-planning"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Lên Kế Hoạch Ngay
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                className="overflow-hidden rounded-2xl bg-white shadow-xl transition-all hover:shadow-2xl"
              >
                <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="mb-2 text-2xl font-bold">
                        {itinerary.destination}
                      </h3>
                      <div className="flex items-center gap-2 text-blue-100">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {itinerary.startDate} - {itinerary.endDate}
                        </span>
                      </div>
                    </div>
                    {itinerary.rating && (
                      <div className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 backdrop-blur-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{itinerary.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 text-sm text-gray-600">Số ngày</p>
                      <p className="font-bold text-gray-900">
                        {itinerary.days.length} ngày
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-gray-600">Chi phí</p>
                      <p className="font-bold text-blue-600">
                        {formatCurrency(itinerary.totalCost)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-sm text-gray-600">Sở thích</p>
                    <div className="flex flex-wrap gap-2">
                      {itinerary.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-600"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {itinerary.feedback && (
                    <div className="mb-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-gray-700">
                        "{itinerary.feedback}"
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Link
                      to={`/itinerary/${itinerary.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      Xem Chi Tiết
                    </Link>
                    <button
                      onClick={() => handleDelete(itinerary.id)}
                      className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-600 transition-colors hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}