import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { MapPin, Calendar, DollarSign, Clock, TrendingUp, Edit2, Eye, FileText, Trash2, X, Check, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../utils/auth";

interface SavedTrip {
  id: string;
  name: string;
  createdAt: number;
  cities: string[];
  startDate?: string;
  endDate?: string;
  days: number;
  estimatedCost: number;
  status: "upcoming" | "completed" | "planning";
  coverImage: string;
  tripData?: any; // Store the full trip data
}

export default function TripHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "planning">("all");
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Delete mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check login status
  useEffect(() => { // TODO: Gọi API GET /api/trips/saved để lấy danh sách lịch trình đã lưu thực tế. Hiện tại đang dùng localStorage để demo.
    const user = getCurrentUser();
    setIsLoggedIn(!!user);
  }, []);

  // Lấy dữ liệu từ localStorage và sắp xếp mới nhất lên đầu
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const savedTripsData = localStorage.getItem("savedTrips");
    if (savedTripsData) {
      try {
        const parsedTrips = JSON.parse(savedTripsData);
        
        // SẮP XẾP: Lịch trình có createdAt lớn hơn (mới hơn) sẽ lên đầu
        parsedTrips.sort((a: SavedTrip, b: SavedTrip) => b.createdAt - a.createdAt);
        
        setTrips(parsedTrips);
      } catch (e) {
        console.error("Error loading trips:", e);
        setTrips([]);
      }
    } else {
      setTrips([]);
    }
  }, [isLoggedIn]);

  const filteredTrips =
    filter === "all"
      ? trips
      : trips.filter((trip) => trip.status === filter);

  const upcomingCount = trips.filter((t) => t.status === "upcoming").length;
  const completedCount = trips.filter((t) => t.status === "completed").length;
  const planningCount = trips.filter((t) => t.status === "planning").length;

  const handleEditName = (tripId: string, currentName: string) => {
    setEditingTripId(tripId);
    setEditingName(currentName);
  };

  const handleSaveName = (tripId: string) => {
    const updatedTrips = trips.map((trip) =>
      trip.id === tripId ? { ...trip, name: editingName } : trip
    );
    setTrips(updatedTrips);
    localStorage.setItem("savedTrips", JSON.stringify(updatedTrips));
    setEditingTripId(null);
  };

  const handleViewDetails = (trip: SavedTrip) => {
    // Save the trip data to localStorage so daily-itinerary can access it
    if (trip.tripData) {
      localStorage.setItem("currentTrip", JSON.stringify(trip.tripData));
      localStorage.setItem("selectedTripId", trip.id);
    }
    navigate("/daily-itinerary");
  };

  const handleStartDeleteMode = (tripId: string) => {
    setIsSelectionMode(true);
    setSelectedTrips([tripId]);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedTrips([]);
  };

  const handleToggleSelection = (tripId: string) => {
    setSelectedTrips(prev =>
      prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    const updatedTrips = trips.filter(trip => !selectedTrips.includes(trip.id));
    setTrips(updatedTrips);
    localStorage.setItem("savedTrips", JSON.stringify(updatedTrips));
    setShowDeleteConfirm(false);
    setIsSelectionMode(false);
    setSelectedTrips([]);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Show login prompt if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
        <Header />
        
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg border-2 border-gray-200">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200">
              <LogIn className="h-12 w-12 text-cyan-600" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Đăng Nhập Để Xem Lịch Trình
            </h2>
            <p className="mb-8 text-lg text-gray-600 max-w-md mx-auto">
              Vui lòng đăng nhập để trải nghiệm tính năng quản lý lịch trình và lưu trữ các chuyến đi của bạn
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <LogIn className="h-5 w-5" />
                Đăng Nhập Ngay
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-8 py-4 font-bold text-gray-700 shadow-md transition-all hover:border-cyan-500 hover:text-cyan-600"
              >
                Về Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="mb-3 text-4xl font-bold text-gray-900">
              Lịch Trình Của Tôi
            </h1>
            <p className="text-lg text-gray-600">
              Quản lý và xem lại tất cả các chuyến đi của bạn
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                Tổng lịch trình
              </span>
              <TrendingUp className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{trips.length}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                Sắp tới
              </span>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{upcomingCount}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                Đã hoàn thành
              </span>
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-200">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">
                Đang lên kế hoạch
              </span>
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{planningCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-6 py-2 font-semibold transition-all ${
              filter === "all"
                ? "bg-cyan-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`rounded-lg px-6 py-2 font-semibold transition-all ${
              filter === "upcoming"
                ? "bg-cyan-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Sắp tới
          </button>
          <button
            onClick={() => setFilter("planning")}
            className={`rounded-lg px-6 py-2 font-semibold transition-all ${
              filter === "planning"
                ? "bg-cyan-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Đang lên kế hoạch
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`rounded-lg px-6 py-2 font-semibold transition-all ${
              filter === "completed"
                ? "bg-cyan-600 text-white shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Đã hoàn thành
          </button>

          {/* Delete Mode Actions - Moved here */}
          {isSelectionMode && (
            <>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">
                  {selectedTrips.length} đã chọn
                </span>
                <button
                  onClick={handleCancelSelection}
                  className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-all hover:border-gray-400"
                >
                  <X className="h-4 w-4" />
                  Hủy
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedTrips.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa ({selectedTrips.length})
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trip Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className={`group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl border-2 ${
                isSelectionMode && selectedTrips.includes(trip.id)
                  ? "border-cyan-500 ring-4 ring-cyan-200"
                  : "border-gray-200"
              }`}
            >
              {/* Cover Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={trip.coverImage}
                  alt={trip.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                {/* Selection Checkbox or Delete Button */}
                {isSelectionMode ? (
                  <button
                    onClick={() => handleToggleSelection(trip.id)}
                    className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg shadow-lg transition-all ${
                      selectedTrips.includes(trip.id)
                        ? "bg-cyan-600 text-white"
                        : "bg-white/90 text-gray-600 hover:bg-cyan-100"
                    }`}
                  >
                    {selectedTrips.includes(trip.id) ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 rounded border-2 border-gray-400" />
                    )}
                  </button>
                ) : (
                  <>
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          trip.status === "upcoming"
                            ? "bg-orange-500 text-white"
                            : trip.status === "planning"
                            ? "bg-purple-500 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {trip.status === "upcoming"
                          ? "Sắp tới"
                          : trip.status === "planning"
                          ? "Đang lên kế hoạch"
                          : "Đã hoàn thành"}
                      </span>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleStartDeleteMode(trip.id)}
                      className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-lg transition-all hover:bg-red-50 hover:text-red-600"
                      title="Xóa lịch trình"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Trip Name - Editable */}
                <div className="absolute bottom-4 left-4 right-4">
                  {editingTripId === trip.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleSaveName(trip.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName(trip.id);
                        if (e.key === "Escape") setEditingTripId(null);
                      }}
                      className="w-full rounded-lg border-2 border-cyan-500 bg-white px-3 py-1 text-lg font-bold text-gray-900"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="mb-1 flex-1 text-xl font-bold text-white">
                        {trip.name}
                      </h3>
                      {!isSelectionMode && (
                        <button
                          onClick={() => handleEditName(trip.id, trip.name)}
                          className="rounded-lg bg-white/20 p-2 backdrop-blur-sm transition-colors hover:bg-white/30"
                          title="Chỉnh sửa tên"
                        >
                          <Edit2 className="h-4 w-4 text-white" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                {/* Cities List */}
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                    Điểm đến
                  </p>
                  <div className="space-y-1">
                    {trip.cities.slice(0, 3).map((city, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        <span>{city}</span>
                      </div>
                    ))}
                    {trip.cities.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{trip.cities.length - 3} điểm đến khác
                      </p>
                    )}
                  </div>
                </div>

                {/* Date Range */}
                {trip.startDate && trip.endDate && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trip.startDate} - {trip.endDate}
                    </span>
                  </div>
                )}

                {/* Trip Details */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-cyan-50 p-3 border border-cyan-100">
                    <p className="text-xs text-cyan-700 mb-1">Số ngày</p>
                    <p className="text-lg font-bold text-cyan-900">
                      {trip.days} ngày
                    </p>
                  </div>

                  <div className="rounded-lg bg-orange-50 p-3 border border-orange-100">
                    <p className="text-xs text-orange-700 mb-1">Ngân sách</p>
                    <p className="text-lg font-bold text-orange-900">
                      {(trip.estimatedCost / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                {/* View Details Button */}
                {!isSelectionMode && (
                  <button
                    onClick={() => handleViewDetails(trip)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Eye className="h-4 w-4" />
                    Xem chi tiết
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTrips.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-lg border border-gray-200">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Bạn chưa có lịch trình nào
            </h3>
            <p className="mb-6 text-gray-600">
              Bắt đầu lên kế hoạch cho chuyến đi tiếp theo của bạn
            </p>
            <Link
              to="/manual-trip-setup"
              className="inline-block rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-3 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
            >
              Tạo lịch trình ngay
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-2xl font-bold text-gray-900">
              Xác Nhận Xóa
            </h3>
            <p className="mb-6 text-gray-600">
              Bạn có muốn xóa {selectedTrips.length} lịch trình đã chọn không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-all hover:border-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}