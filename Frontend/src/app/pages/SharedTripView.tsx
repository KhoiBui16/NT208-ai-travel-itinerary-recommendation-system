import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Header } from "../components/Header";
import { getSharedItinerary, type ItineraryResponse } from "../services/itinerary";
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

export default function SharedTripView() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) {
      setError("Liên kết chia sẻ không hợp lệ");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      try {
        const data = await getSharedItinerary(token);
        if (!isMounted) return;
        setTrip(data);
        // Expand all days by default
        setExpandedDays(new Set(data.days.map((d) => d.id)));
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.response?.status === 404) {
          setError("Lịch trình không tồn tại hoặc đã hết hạn chia sẻ");
        } else {
          setError("Không thể tải lịch trình chia sẻ");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [token]);

  const toggleDay = (dayId: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);

  /* ── Loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
            <p className="text-gray-500">Đang tải lịch trình chia sẻ...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────── */
  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        <div className="flex items-center justify-center py-40">
          <div className="text-center max-w-md">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-300" />
            <h2 className="mb-2 text-2xl font-bold text-gray-800">
              Không thể hiển thị
            </h2>
            <p className="mb-6 text-gray-500">
              {error || "Lịch trình không tồn tại hoặc liên kết đã hết hạn"}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Back link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-cyan-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-semibold">Về trang chủ</span>
        </Link>

        {/* Trip Header Card */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            {trip.tripName || "Lịch trình chuyến đi"}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-600" />
              <span>{trip.destination}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" />
              <span>
                {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600" />
              <span>
                {trip.travelerInfo.total} người
                {trip.travelerInfo.children > 0 &&
                  ` (${trip.travelerInfo.adults} người lớn, ${trip.travelerInfo.children} trẻ em)`}
              </span>
            </div>
            {trip.budget > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-600" />
                <span>Ngân sách: {formatCurrency(trip.budget)}</span>
              </div>
            )}
            {trip.totalCost > 0 && (
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orange-500" />
                <span>Tổng chi phí: {formatCurrency(trip.totalCost)}</span>
              </div>
            )}
          </div>

          {trip.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {trip.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Days */}
        <div className="space-y-4">
          {trip.days.map((day, idx) => {
            const isExpanded = expandedDays.has(day.id);
            return (
              <div
                key={day.id}
                className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(day.id)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">
                        {day.label || `Ngày ${idx + 1}`}
                      </span>
                      {day.destinationName && (
                        <span className="ml-2 text-sm text-gray-500">
                          — {day.destinationName}
                        </span>
                      )}
                      {day.date && (
                        <span className="ml-2 text-sm text-gray-400">
                          {formatDate(day.date)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Day Activities */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 pb-4">
                    {day.activities.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400">
                        Chưa có hoạt động
                      </p>
                    ) : (
                      <div className="space-y-3 pt-3">
                        {day.activities.map((act) => (
                          <div
                            key={act.id ?? act.name}
                            className="flex gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"
                          >
                            {act.image && (
                              <img
                                src={act.image}
                                alt={act.name}
                                className="h-16 w-20 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-xs font-semibold text-gray-500">
                                  {act.time}
                                  {act.endTime ? ` – ${act.endTime}` : ""}
                                </span>
                                {act.type && (
                                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                    {act.type}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-gray-900">
                                {act.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {act.location}
                              </p>
                              {act.description && (
                                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                  {act.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Accommodations */}
        {trip.accommodations.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Lưu trú
            </h2>
            <div className="space-y-3">
              {trip.accommodations.map((acc) => (
                <div
                  key={acc.id ?? acc.name}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <h4 className="font-semibold text-gray-900">
                    {acc.name || "Chỗ ở"}
                  </h4>
                  {acc.bookingType && (
                    <p className="text-sm text-gray-500">{acc.bookingType}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                    {acc.checkIn && (
                      <span>Nhận phòng: {formatDate(acc.checkIn)}</span>
                    )}
                    {acc.checkOut && (
                      <span>Trả phòng: {formatDate(acc.checkOut)}</span>
                    )}
                    {acc.pricePerNight != null && (
                      <span>{formatCurrency(acc.pricePerNight)}/đêm</span>
                    )}
                    {acc.totalPrice != null && (
                      <span className="font-semibold text-orange-600">
                        Tổng: {formatCurrency(acc.totalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
