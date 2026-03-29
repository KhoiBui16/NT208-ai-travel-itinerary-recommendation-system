import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { DollarSign, Sparkles, ArrowRight, ChevronLeft, X, AlertCircle } from "lucide-react";

export default function BudgetSetup() {
  const navigate = useNavigate();
  
  const [budget, setBudget] = useState<number>(0);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<"budget" | "moderate" | "comfortable" | null>(null);
  const [suggestion, setSuggestion] = useState<{ min: number; max: number } | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [warningMessage, setWarningMessage] = useState("");

  // Load trip data for suggestion calculation
  const [tripData, setTripData] = useState<{
    days: number;
    people: number;
    destinations: string[];
  }>({ days: 0, people: 0, destinations: [] });

  useEffect(() => {
    // Load trip data from localStorage
    const savedDayAllocations = localStorage.getItem("tripDayAllocations");
    const savedTravelers = localStorage.getItem("tripTravelers");
    const savedDestinations = localStorage.getItem("tripDestinations");

    let totalDays = 0;
    let totalPeople = 1;
    let destinations: string[] = [];

    if (savedDayAllocations) {
      const allocations = JSON.parse(savedDayAllocations);
      totalDays = Object.values(allocations).reduce((sum: number, allocation: any) => sum + (allocation?.days || 0), 0);
    }

    if (savedTravelers) {
      const travelers = JSON.parse(savedTravelers);
      totalPeople = travelers.total || 1;
    }

    if (savedDestinations) {
      const dests = JSON.parse(savedDestinations);
      destinations = dests.map((d: any) => d.name);
    }

    setTripData({ days: totalDays, people: totalPeople, destinations });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setInputValue(value);
    
    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for validation
    const timeout = setTimeout(() => {
      const numValue = parseInt(value) || 0;
      setBudget(numValue);
      
      if (numValue > 0 && numValue < 10000) {
        setWarningMessage("Ngân sách hiện tại quá ít, vui lòng cân nhắc lại");
      } else {
        setWarningMessage("");
      }
    }, 500);

    setDebounceTimeout(timeout);
  };

  const calculateSuggestion = (level: "budget" | "moderate" | "comfortable") => {
    const { days, people } = tripData;
    
    let basePerDay = 3000000; // Moderate
    if (level === "budget") basePerDay = 2000000;
    if (level === "comfortable") basePerDay = 5000000;
    
    const min = basePerDay * Math.max(days, 1) * Math.max(people, 1) * 0.7;
    const max = basePerDay * Math.max(days, 1) * Math.max(people, 1) * 1.4;
    
    setSuggestion({ min, max });
    setSelectedLevel(level);
  };

  const handleSuggestClick = () => {
    setShowSuggestion(true);
  };

  const handleConfirm = () => {
    // Check if budget is too low
    if (budget === 0 || budget < 10000) {
      setShowWarningModal(true);
      return;
    }
    
    // Save and navigate
    saveBudgetAndNavigate();
  };

  const saveBudgetAndNavigate = () => {
    localStorage.setItem("tripBudget", JSON.stringify({ amount: budget }));
    // Clear old trip data so TripWorkspace generates fresh days from new setup
    localStorage.removeItem("currentTrip");
    localStorage.removeItem("selectedTripId");
    navigate("/trip-workspace");
  };

  const handleSkip = () => {
    // Clear any saved budget
    localStorage.removeItem("tripBudget");
    // Clear old trip data so TripWorkspace generates fresh days from new setup
    localStorage.removeItem("currentTrip");
    localStorage.removeItem("selectedTripId");
    navigate("/trip-workspace");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + "₫";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />
      
      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <button
          onClick={() => navigate("/travelers-selection")}
          className="flex items-center gap-2 text-gray-600 transition-colors hover:text-cyan-600"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="font-semibold">Quay lại</span>
        </button>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Cảnh báo ngân sách thấp</h3>
                  <p className="text-sm text-gray-600">Ngân sách của bạn có vẻ quá thấp</p>
                </div>
              </div>
              <button
                onClick={() => setShowWarningModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mb-6 text-gray-700">
              Bạn có thực sự muốn tiếp tục với ngân sách này không? Ngân sách thấp có thể ảnh hưởng đến trải nghiệm chuyến đi của bạn.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarningModal(false)}
                className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Quay lại
              </button>
              <button
                onClick={saveBudgetAndNavigate}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Thiết lập ngân sách</h1>
          <p className="text-gray-500">Nhập ngân sách dự kiến cho chuyến đi của bạn</p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          {/* Budget Input */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Ngân sách của bạn
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Nhập số tiền..."
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-4 pr-12 text-lg font-semibold text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                ₫
              </div>
            </div>
            
            {/* Budget Display */}
            {budget === 0 && inputValue === "" ? (
              <p className="mt-2 text-sm text-gray-400 italic">Chưa thiết lập ngân sách</p>
            ) : budget > 0 ? (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-cyan-600">
                  {formatCurrency(budget)}
                </p>
                {warningMessage && (
                  <div className="flex items-center gap-1.5 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-xs font-medium">{warningMessage}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Suggest Budget Button */}
          <div className="mb-6">
            <button
              onClick={handleSuggestClick}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-500 bg-cyan-50 px-4 py-3 font-semibold text-cyan-700 transition-all hover:bg-cyan-100"
            >
              <Sparkles className="h-5 w-5" />
              Gợi ý ngân sách cho tôi
            </button>
          </div>

          {/* Suggestion Panel */}
          {showSuggestion && (
            <div className="mb-6 rounded-xl border-2 border-cyan-200 bg-cyan-50 p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Chọn mức ngân sách</h3>
              
              {/* Budget Level Buttons */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <button
                  onClick={() => calculateSuggestion("budget")}
                  className={`rounded-xl border-2 p-3 font-semibold transition-all ${
                    selectedLevel === "budget"
                      ? "border-cyan-500 bg-white text-cyan-700 shadow-sm"
                      : "border-cyan-200 bg-white/50 text-gray-700 hover:border-cyan-300"
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">Tiết kiệm</div>
                  <div className="text-sm">$</div>
                </button>
                <button
                  onClick={() => calculateSuggestion("moderate")}
                  className={`rounded-xl border-2 p-3 font-semibold transition-all ${
                    selectedLevel === "moderate"
                      ? "border-cyan-500 bg-white text-cyan-700 shadow-sm"
                      : "border-cyan-200 bg-white/50 text-gray-700 hover:border-cyan-300"
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">Trung bình</div>
                  <div className="text-sm">$$</div>
                </button>
                <button
                  onClick={() => calculateSuggestion("comfortable")}
                  className={`rounded-xl border-2 p-3 font-semibold transition-all ${
                    selectedLevel === "comfortable"
                      ? "border-cyan-500 bg-white text-cyan-700 shadow-sm"
                      : "border-cyan-200 bg-white/50 text-gray-700 hover:border-cyan-300"
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">Thoải mái</div>
                  <div className="text-sm">$$$</div>
                </button>
              </div>

              {/* Suggestion Display */}
              {suggestion && (
                <div className="rounded-lg bg-white p-4 border border-cyan-200">
                  <p className="mb-2 text-xs font-semibold text-gray-600">GỢI Ý NGÂN SÁCH</p>
                  <p className="text-lg font-bold text-cyan-700">
                    {formatCurrency(suggestion.min)} - {formatCurrency(suggestion.max)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Dựa trên {tripData.days} ngày, {tripData.people} người và phong cách {selectedLevel === "budget" ? "tiết kiệm" : selectedLevel === "moderate" ? "trung bình" : "thoải mái"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 rounded-xl border-2 border-gray-300 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Bỏ qua
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              Xác nhận
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">💡 Lưu ý:</span> Ngân sách sẽ giúp chúng tôi gợi ý các địa điểm, nhà hàng và hoạt động phù hợp với khả năng chi trả của bạn. Bạn có thể thay đổi ngân sách bất cứ lúc nào.
          </p>
        </div>
      </div>
    </div>
  );
}
