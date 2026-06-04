import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Header } from "../components/Header";
import { CalendarModal } from "../components/CalendarModal";
import { storePendingClaim } from "../contexts/AuthContext";
import { travelTypes, budgetLevels, interests, popularDestinations } from "../utils/tripConstants";
import { generateItinerary } from "../services/itinerary";
import { useDestinations } from "../hooks/useDestinations";
import { getGenerateErrorMessage } from "../utils/errorHandler";
import { mapItineraryResponseToSessionTrip, writeSessionTrip } from "../utils/tripResponseMapper";
import {
  Sparkles,
  MapPin,
  Calendar,
  User,
  Users,
  Heart,
  Baby,
  Utensils,
  TreePine,
  Landmark,
  ShoppingBag,
  Theater,
  ChevronRight,
  Wand2,
} from "lucide-react";



export default function CreateTrip() {
  const navigate = useNavigate();

  // Fetch destinations from backend
  const { destinations: backendDests, isLoading: destsLoading, error: destsError, isUsingFallback } = useDestinations();

  const [destination, setDestination] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 1. Thay đổi State cho Ngày tháng
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [showCalendar, setShowCalendar] = useState(false);

  const [travelType, setTravelType] = useState("solo");
  const [budgetLevel, setBudgetLevel] = useState("mid");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["culture", "food"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [qualityWarning, setQualityWarning] = useState("");
  const [generateStep, setGenerateStep] = useState(0);

  const GENERATE_STEPS = [
    "Đang chuẩn bị dữ liệu điểm đến...",
    "Đang gửi yêu cầu tới AI...",
    "Đang kiểm tra và lưu lịch trình...",
    "Hoàn tất, đang mở lịch trình...",
  ];

  // Compute day count from dateRange
  const dayCount =
    dateRange.from && dateRange.to
      ? Math.floor(
          (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  // Use backend destinations if available, otherwise fallback to popularDestinations
  const availableDestinations = backendDests.length > 0
    ? backendDests.map((d) => d.name)
    : popularDestinations;

  const filteredSuggestions = availableDestinations.filter((d) =>
    d.toLowerCase().includes(destination.toLowerCase()) && destination.length > 0
  );

  // Helper to get destination object by name
  const getDestinationByName = (name: string) => {
    return backendDests.find((d) => d.name === name);
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerateAI = async () => {
    const destInput = destination.trim();

    // Prevent double-click - early return if already generating
    if (isGenerating) {
      return;
    }

    if (!destInput || !dateRange.from || !dateRange.to) {
      setValidationError("Vui lòng nhập đầy đủ điểm đến và thời gian chuyến đi");
      return;
    }

    // Calculate number of days
    const dayCount = dateRange.from && dateRange.to
      ? Math.floor((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;    // Pre-submit validation: if backend destinations loaded successfully, check if input is supported
    if (backendDests.length > 0 && !isUsingFallback) {
      const selectedDest = backendDests.find(
        (d) => d.name.toLowerCase() === destInput.toLowerCase()
      );

      if (!selectedDest) {
        setValidationError(`Thành phố "${destInput}" chưa có trong danh sách được hỗ trợ. Vui lòng chọn một thành phố từ gợi ý.`);
        return;
      }

      // Data quality warning only - do NOT block submit
      // All destinations returned by backend API are allowed to attempt generate
      // Backend may still return 422 if insufficient context, but user should be allowed to try
      if (selectedDest.readinessReason) {
        // Show user-visible warning (not blocking)
        setQualityWarning(selectedDest.readinessReason);
      } else {
        // Clear warning if city has good data quality
        setQualityWarning("");
      }
    }

    setValidationError("");
    setIsGenerating(true);
    setGenerateStep(0);

    // Cycle through progress steps during generation
    const stepInterval = setInterval(() => {
      setGenerateStep((prev) => Math.min(prev + 1, GENERATE_STEPS.length - 1));
    }, 4000);

    try {
      // Map budgetLevel to budget number
      const budgetMap: Record<string, number> = { low: 2000000, mid: 5000000, high: 10000000 };
      // Map travelType to adults/children count
      const adultsMap: Record<string, number> = { solo: 1, couple: 2, family: 2, group: 4 };
      const childrenMap: Record<string, number> = { solo: 0, couple: 0, family: 1, group: 0 };

      const resp = await generateItinerary({
        destination: destInput,
        startDate: format(dateRange.from!, "yyyy-MM-dd"),
        endDate: format(dateRange.to!, "yyyy-MM-dd"),
        budget: budgetMap[budgetLevel] || 5000000,
        adults: adultsMap[travelType] || 2,
        children: childrenMap[travelType] || 0,
        interests: selectedInterests,
      });

      writeSessionTrip(mapItineraryResponseToSessionTrip(resp));

      if (resp.claimToken) {
        storePendingClaim(resp.id, resp.claimToken);
      }

      navigate(`/trip-workspace?tripId=${resp.id}`);
    } catch (err) {
      setValidationError(getGenerateErrorMessage(err, { destination: destInput, quotaLimit: 3 }));
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  const handleManualTrip = () => {
    navigate("/manual-trip-setup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      {/* 3. Thêm CalendarModal vào giao diện */}
      <CalendarModal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        onConfirm={(from, to) => {
          setDateRange({ from, to });
          setShowCalendar(false);
        }}
        value={dateRange}
        selectedName={destination || "Chuyến đi của bạn"}
      />

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Page Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">AI Trip Planner</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Tạo Lịch Trình Với AI
          </h1>
          <p className="text-lg text-gray-500">
            Cho chúng tôi biết về chuyến đi của bạn — AI sẽ lên kế hoạch hoàn hảo
          </p>
        </div>

        {/* Main Form Card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl border border-gray-100">

          {/* Destination */}
          <div className="mb-7">
            {destsError && (
              <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ {destsError}
                </p>
              </div>
            )}
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Điểm đến
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500" />
              <input
                type="text"
                value={destination}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setDestination(newValue);
                  setShowSuggestions(true);

                  // Update quality warning when destination changes
                  if (backendDests.length > 0 && !isUsingFallback) {
                    const newDest = getDestinationByName(newValue);
                    if (newDest?.readinessReason) {
                      setQualityWarning(newDest.readinessReason);
                    } else {
                      setQualityWarning("");
                    }
                  } else {
                    setQualityWarning("");
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onFocus={() => setShowSuggestions(true)}
                placeholder={
                  destsLoading
                    ? "Đang tải danh sách thành phố..."
                    : backendDests.length > 0
                      ? `VD: ${availableDestinations.slice(0, 3).join(", ")}...`
                      : "VD: Hà Nội, Đà Nẵng, Phú Quốc..."
                }
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 transition-all"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  {filteredSuggestions.map((sug) => {
                    const destObj = getDestinationByName(sug);
                    const isPartial = destObj?.readinessStatus === "partial";
                    const isSparse = destObj?.readinessStatus === "sparse";
                    return (
                      <button
                        key={sug}
                        onMouseDown={() => {
                          setDestination(sug);
                          setShowSuggestions(false);
                          // Update quality warning when selecting from suggestions
                          if (backendDests.length > 0 && !isUsingFallback) {
                            const selectedDest = getDestinationByName(sug);
                            if (selectedDest?.readinessReason) {
                              setQualityWarning(selectedDest.readinessReason);
                            } else {
                              setQualityWarning("");
                            }
                          } else {
                            setQualityWarning("");
                          }
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cyan-50"
                      >
                        <MapPin className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                        <span className={`flex-1 ${isSparse ? "text-gray-400" : "text-gray-700"}`}>{sug}</span>
                        {isPartial && (
                          <span className="text-xs text-amber-600" title="Dữ liệu giới hạn">⚠️</span>
                        )}
                        {isSparse && (
                          <span className="text-xs text-gray-400" title="Chưa đủ dữ liệu">🔒</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. Dates (Đã gộp chung thành 1 nút gọi Calendar) */}
          <div className="mb-7">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Thời gian chuyến đi
            </label>
            <button
              onClick={() => setShowCalendar(true)}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-4 pr-4 text-left text-gray-900 transition-all hover:border-cyan-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
            >
              <Calendar className="h-5 w-5 text-cyan-500" />
              <span className={!dateRange.from ? "text-gray-400" : "font-medium"}>
                {dateRange.from && dateRange.to
                  ? `${format(dateRange.from, 'dd/MM/yyyy')} — ${format(dateRange.to, 'dd/MM/yyyy')}`
                  : "Chọn ngày bắt đầu và kết thúc"}
              </span>
            </button>
          </div>

          {/* Travel Companions */}
          <div className="mb-7">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Bạn đi với ai?
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {travelTypes.map((type) => {
                const Icon = type.icon;
                const active = travelType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setTravelType(type.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-all ${
                      active
                        ? "border-cyan-500 bg-cyan-50 shadow-md"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${active ? "text-cyan-600" : "text-gray-400"}`} />
                    <span className={`text-xs font-semibold ${active ? "text-cyan-700" : "text-gray-600"}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Level */}
          <div className="mb-7">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Mức ngân sách
            </label>
            <div className="grid grid-cols-3 gap-3">
              {budgetLevels.map((level) => {
                const active = budgetLevel === level.id;
                const colorMap: Record<string, string> = {
                  green: active ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50",
                  cyan: active ? "border-cyan-500 bg-cyan-50" : "border-gray-200 bg-gray-50",
                  orange: active ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-gray-50",
                };
                const textMap: Record<string, string> = {
                  green: active ? "text-green-700" : "text-gray-600",
                  cyan: active ? "text-cyan-700" : "text-gray-600",
                  orange: active ? "text-orange-700" : "text-gray-600",
                };
                const subMap: Record<string, string> = {
                  green: active ? "text-green-600" : "text-gray-400",
                  cyan: active ? "text-cyan-600" : "text-gray-400",
                  orange: active ? "text-orange-600" : "text-gray-400",
                };
                return (
                  <button
                    key={level.id}
                    onClick={() => setBudgetLevel(level.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${colorMap[level.color]}`}
                  >
                    <p className={`font-semibold ${textMap[level.color]}`}>{level.label}</p>
                    <p className={`text-xs ${subMap[level.color]}`}>{level.sublabel}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interests */}
          <div className="mb-8">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Sở thích du lịch{" "}
              <span className="text-gray-400 font-normal">(chọn một hoặc nhiều)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => {
                const Icon = interest.icon;
                const active = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 transition-all ${
                      active
                        ? "border-cyan-500 bg-cyan-500 text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-cyan-300 hover:bg-cyan-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{interest.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Limit Notice */}
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              ℹ️ Chưa đăng nhập vẫn có thể tạo thử tối đa{" "}
              <strong>3 lịch trình AI mỗi ngày</strong>. Đăng nhập để lưu lịch
              trình vào tài khoản và nhận quyền chỉnh sửa/chia sẻ đầy đủ.
            </p>
          </div>

          {/* Primary Button — Generate with AI */}
          <button
            onClick={handleGenerateAI}
            disabled={isGenerating}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {GENERATE_STEPS[generateStep]}
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5" />
                Tạo Lịch Trình Với AI
              </>
            )}
          </button>
          {dayCount > 7 && dayCount <= 30 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mt-2">
              <p className="text-sm text-blue-700">
                ℹ️ Lịch trình dài có thể mất nhiều thời gian hơn. Hệ thống sẽ tạo dựa trên dữ liệu hiện có.
              </p>
            </div>
          )}
          {qualityWarning && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                ⚠️ {qualityWarning}
              </p>
            </div>
          )}
          {validationError && (
            <p
              role="alert"
              aria-live="assertive"
              className="mt-2 text-sm text-red-500 text-center"
            >
              {validationError}
            </p>
          )}
        </div>

        {/* Secondary — Manual Option */}
        <div className="mt-6 text-center">
          <p className="mb-3 text-sm text-gray-500">Muốn tự lên kế hoạch?</p>
          <button
            onClick={handleManualTrip}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all hover:border-cyan-400 hover:text-cyan-700 hover:shadow-md"
          >
            Tự tạo lịch trình thủ công
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
