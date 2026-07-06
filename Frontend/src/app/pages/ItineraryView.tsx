import { useState, useEffect, useMemo } from "react";
import { ItineraryMap } from "../components/ItineraryMap";
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
  Share2,
  Copy,
  X,
  Plus,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { resolvePlaceImage, applyPlaceImageFallback } from "../utils/placeImage";
import {
  deleteActivity,
  getItinerary,
  updateItinerary,
  deleteItinerary as deleteItineraryApi,
  rateItinerary as rateItineraryApi,
  shareItinerary,
  ItineraryResponse,
} from "../services/itinerary";
import { formatCurrency } from "../utils/itinerary";
import { toast } from "sonner";

// Local types matching what the component renders
interface LocalActivity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  duration: string;
  image: string;
  latitude?: number;
  longitude?: number;
}

interface LocalDay {
  day: number;
  date: string;
  activities: LocalActivity[];
}

interface LocalItinerary {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
  days: LocalDay[];
  totalCost: number;
  rating?: number;
  feedback?: string;
}

function mapApiToLocal(resp: ItineraryResponse): LocalItinerary {
  return {
    id: String(resp.id),
    destination: resp.destination,
    startDate: resp.startDate,
    endDate: resp.endDate,
    budget: resp.budget,
    interests: resp.interests,
    totalCost: resp.totalCost,
    days: (resp.days || []).map((d, idx) => ({
      day: idx + 1,
      date: d?.date || d?.label || "",
      activities: (d?.activities || []).map((a) => ({
        id: String(a.id ?? idx * 100 + Math.random()),
        time: a.time,
        title: a.name,
        description: a.description,
        location: a.location,
        cost: a.adultPrice ?? a.customCost ?? 0,
        duration: a.endTime ? `${a.time} - ${a.endTime}` : a.time,
        image: a.image || "",
        latitude: a.latitude ?? undefined,
        longitude: a.longitude ?? undefined,
      })),
    })),
  };
}

export default function ItineraryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [itinerary, setItinerary] = useState<LocalItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    getItinerary(Number(id))
      .then((resp) => {
        if (!isMounted) return;
        const local = mapApiToLocal(resp);
        setItinerary(local);
        setRating(local.rating || 0);
        setFeedback(local.feedback || "");
      })
      .catch(() => {
        if (!isMounted) return;
        toast.error("Không tìm thấy lịch trình");
        navigate("/");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [id, navigate]);

  // Flatten all activities across all days for the map view
  const allActivitiesForMap = useMemo(() => {
    if (!itinerary) return [];
    return itinerary.days.flatMap((day) =>
      day.activities.map((a) => ({
        id: a.id,
        name: a.title,
        time: a.time,
        description: a.description,
        latitude: a.latitude,
        longitude: a.longitude,
      }))
    );
  }, [itinerary]);

  const handleSave = async () => {
    if (!itinerary || !id) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    try {
      await updateItinerary(Number(id), {
        tripName: itinerary.destination,
      });
      toast.success("Đã lưu lịch trình thành công!");
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (dayIndex: number, activityId: string) => {
    if (!itinerary || !id) return;
    const numericActivityId = Number(activityId);

    const newDays = itinerary.days.map((day, idx) => {
      if (idx === dayIndex) {
        return {
          ...day,
          activities: day.activities.filter((a) => a.id !== activityId),
        };
      }
      return day;
    });

    const newItinerary = { ...itinerary, days: newDays };
    setItinerary(newItinerary);

    if (!Number.isFinite(numericActivityId) || numericActivityId <= 0) {
      toast.error("Không thể xác định hoạt động để xóa.");
      setItinerary(itinerary);
      return;
    }

    try {
      await deleteActivity(Number(id), numericActivityId);
    } catch {
      toast.error("Xóa hoạt động thất bại.");
      setItinerary(itinerary);
    }
  };

  const handleRatingSubmit = async () => {
    if (!itinerary || !id) return;

    try {
      await rateItineraryApi(Number(id), rating);
      setItinerary({ ...itinerary, rating });
      setShowRating(false);
      toast.success("Cảm ơn bạn đã đánh giá!");
    } catch {
      toast.error("Gửi đánh giá thất bại.");
    }
  };

  const handleShare = async () => {
    if (!id) return;
    setIsSharing(true);
    try {
      const resp = await shareItinerary(Number(id));
      // Guard against placeholder/invalid tokens returned by the BE
      const token = resp.shareToken;
      const isValidToken =
        token &&
        token !== "[REDACTED]" &&
        !token.startsWith("[REDACTED") &&
        token.length > 8;
      if (!isValidToken) {
        toast.warning(
          "Không thể lấy link chia sẻ. Hãy thử lại để tạo link mới.",
        );
        return;
      }
      // Prefer the full URL returned by BE; fall back to building it from the token
      const link =
        resp.shareUrl && resp.shareUrl.startsWith("http")
          ? resp.shareUrl
          : `${window.location.origin}/shared/${token}`;
      setShareLink(link);
    } catch {
      toast.error("Không thể chia sẻ lịch trình");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Đã sao chép liên kết chia sẻ");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("Đã sao chép liên kết chia sẻ");
    }
  };

  if (loading || !itinerary) {
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
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <Save className="mx-auto mb-4 h-16 w-16 text-blue-600" />
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                Đăng nhập để lưu lịch trình
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
                onClick={() => navigate(-1)}
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
            {isAuthenticated && (
              <Link
                to={`/trip-workspace?tripId=${itinerary.id}`}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <Edit2 className="h-5 w-5" />
                Tiếp tục chỉnh sửa
              </Link>
            )}
            {isAuthenticated && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <Save className="h-5 w-5" />
                Đã Lưu
              </button>
            )}
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <Map className="h-5 w-5" />
              {showMap ? "Ẩn Bản Đồ" : "Xem Bản Đồ"}
            </button>
            <button
              onClick={() => setShowRating(true)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30"
            >
              <MessageSquare className="h-5 w-5" />
              Đánh Giá
            </button>
            {isAuthenticated && (
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-6 py-2 font-semibold backdrop-blur-sm transition-all hover:bg-white/30 disabled:opacity-50"
              >
                <Share2 className="h-5 w-5" />
                {isSharing ? "Đang chia sẻ..." : "Chia Sẻ"}
              </button>
            )}
          </div>

          {/* Share Link Bar */}
          {shareLink && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
              <Share2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate flex-1">{shareLink}</span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 flex-shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Map View */}
        {showMap && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-2xl font-bold text-gray-900">Bản Đồ Hành Trình</h3>
              <ItineraryMap
                activities={allActivitiesForMap}
                destinationName={itinerary?.destination}
                height="420px"
              />
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
                      src={resolvePlaceImage(activity.image)}
                      alt={activity.title}
                      onError={applyPlaceImageFallback}
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
