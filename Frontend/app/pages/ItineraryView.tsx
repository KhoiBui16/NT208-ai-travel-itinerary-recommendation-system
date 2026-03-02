import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Header } from "../components/Header";
import {
  MapPin,
  Clock,
  DollarSign,
  Save,
  Edit2,
  Trash2,
  Star,
  Map,
  Calendar,
  MessageSquare,
  X,
  Plus,
} from "lucide-react";
import {
  getItineraryById,
  saveItinerary,
  deleteItinerary,
  rateItinerary,
  getCurrentUser,
  isAuthenticated,
} from "../utils/auth";
import { formatCurrency } from "../utils/itinerary";
import type { Itinerary, Activity } from "../utils/auth";

export default function ItineraryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (id) {
      const data = getItineraryById(id);
      if (data) {
        setItinerary(data);
        setRating(data.rating || 0);
        setFeedback(data.feedback || "");
        
        // Show save prompt for guests
        if (!isAuthenticated() && !data.userId) {
          setShowSavePrompt(true);
        }
      } else {
        navigate("/");
      }
    }
  }, [id, navigate]);

  const handleSave = () => {
    if (!itinerary) return;
    
    if (!isAuthenticated()) {
      setShowSavePrompt(true);
      return;
    }

    const updatedItinerary = { ...itinerary, userId: user!.id };
    saveItinerary(updatedItinerary);
    setItinerary(updatedItinerary);
    alert("Đã lưu lịch trình thành công!");
  };

  const handleDelete = (dayIndex: number, activityId: string) => {
    if (!itinerary) return;
    
    const newDays = itinerary.days.map((day, idx) => {
      if (idx === dayIndex) {
        return {
          ...day,
          activities: day.activities.filter(a => a.id !== activityId)
        };
      }
      return day;
    });

    const newItinerary = { ...itinerary, days: newDays };
    setItinerary(newItinerary);
    saveItinerary(newItinerary);
  };

  const handleRatingSubmit = () => {
    if (!itinerary) return;
    
    rateItinerary(itinerary.id, rating, feedback);
    setItinerary({ ...itinerary, rating, feedback });
    setShowRating(false);
    alert("Cảm ơn bạn đã đánh giá!");
  };

  if (!itinerary) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      {/* Save Prompt Modal for Guests */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <Save className="mx-auto mb-4 h-16 w-16 text-blue-600" />
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                Đăng ký để lưu lịch trình
              </h3>
              <p className="text-gray-600">
                Tạo tài khoản để lưu và quản lý các lịch trình du lịch của bạn
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/register"
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Đăng Ký
              </Link>
              <button
                onClick={() => setShowSavePrompt(false)}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Để Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">Đánh Giá Lịch Trình</h3>
              <button onClick={() => setShowRating(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="mb-3 block font-semibold text-gray-900">
                Đánh giá của bạn
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-semibold text-gray-900">
                Nhận xét (tùy chọn)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                className="w-full rounded-lg border border-gray-300 p-4 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows={4}
              />
            </div>

            <button
              onClick={handleRatingSubmit}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Gửi Đánh Giá
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white shadow-xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">{itinerary.destination}</h1>
              <div className="flex flex-wrap gap-4 text-blue-100">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{itinerary.startDate} - {itinerary.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Ngân sách: {formatCurrency(itinerary.budget)}</span>
                </div>
              </div>
            </div>
            {itinerary.rating && (
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{itinerary.rating}/5</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <Save className="h-5 w-5" />
              {user && itinerary.userId ? "Đã Lưu" : "Lưu Lịch Trình"}
            </button>
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <Map className="h-5 w-5" />
              {showMap ? "Ẩn Bản Đồ" : "Xem Bản Đồ"}
            </button>
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <Edit2 className="h-5 w-5" />
              {editMode ? "Xong" : "Chỉnh Sửa"}
            </button>
            <button
              onClick={() => setShowRating(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <MessageSquare className="h-5 w-5" />
              Đánh Giá
            </button>
          </div>
        </div>

        {/* Map View */}
        {showMap && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-2xl font-bold text-gray-900">Bản Đồ Hành Trình</h3>
              <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
                <div className="text-center">
                  <Map className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <p className="text-lg text-gray-600">
                    Bản đồ hiển thị tất cả các điểm trong lịch trình
                  </p>
                  <p className="text-sm text-gray-500">
                    Tính năng tích hợp bản đồ tương tác
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Summary */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="mb-4 text-2xl font-bold text-gray-900">Ước Tính Chi Phí</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="mb-1 text-sm text-gray-600">Hoạt động</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  itinerary.days.reduce(
                    (sum, day) =>
                      sum + day.activities.reduce((s, a) => s + a.cost, 0),
                    0
                  )
                )}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="mb-1 text-sm text-gray-600">Lưu trú & Ăn uống</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(itinerary.days.length * 800000)}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="mb-1 text-sm text-gray-600">Tổng Chi Phí</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(itinerary.totalCost)}
              </p>
            </div>
          </div>
        </div>

        {/* Itinerary Days */}
        <div className="space-y-8">
          {itinerary.days.map((day, dayIndex) => (
            <div key={day.day} className="rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                  {day.day}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Ngày {day.day}</h3>
                  <p className="text-gray-600">{day.date}</p>
                </div>
              </div>

              <div className="space-y-4">
                {day.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:shadow-lg"
                  >
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">
                            {activity.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {activity.description}
                          </p>
                        </div>
                        {editMode && (
                          <button
                            onClick={() => handleDelete(dayIndex, activity.id)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{activity.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{activity.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.location}</span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-blue-600">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatCurrency(activity.cost)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
