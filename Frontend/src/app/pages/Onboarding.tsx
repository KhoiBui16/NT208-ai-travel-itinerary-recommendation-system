import { useState } from "react";
import { useNavigate } from "react-router";
import { Utensils, Mountain, Building, Music, ShoppingBag, User, Users, Heart, Baby } from "lucide-react";
import { TRAVEL_TYPES, INTEREST_OPTIONS, BUDGET_LEVELS } from "../utils/tripConstants";

export default function Onboarding() {
  const navigate = useNavigate();
  const [selectedTravelType, setSelectedTravelType] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("");

  const handleToggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleComplete = () => { // Gọi API POST /api/user/preferences để lưu thiết lập.
    // Save preferences to localStorage
    const preferences = {
      travelType: selectedTravelType,
      interests: selectedInterests,
      budgetLevel: selectedBudget,
    };
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    
    // Navigate to trip library
    navigate("/trip-library");
  };

  const isValid = selectedTravelType && selectedInterests.length > 0 && selectedBudget;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Chào mừng đến YourTrip! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Hãy cho chúng tôi biết thêm về sở thích du lịch của bạn
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-2 w-16 rounded-full bg-cyan-500" />
          <div className="h-2 w-16 rounded-full bg-cyan-500" />
          <div className="h-2 w-16 rounded-full bg-cyan-500" />
        </div>

        <div className="space-y-8">
          {/* Travel Type Selection */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Bạn thường đi du lịch với ai?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TRAVEL_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTravelType(type.id)}
                    className={`rounded-xl border-2 p-6 transition-all ${
                      selectedTravelType === type.id
                        ? "border-cyan-500 bg-cyan-50 shadow-lg scale-105"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <Icon
                      className={`mx-auto mb-3 h-12 w-12 ${
                        selectedTravelType === type.id ? "text-cyan-600" : "text-gray-400"
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        selectedTravelType === type.id ? "text-cyan-900" : "text-gray-700"
                      }`}
                    >
                      {type.viLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interests Selection */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Sở thích của bạn là gì?
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Chọn tất cả những gì áp dụng)
              </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {INTEREST_OPTIONS.map((interest) => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    onClick={() => handleToggleInterest(interest.id)}
                    className={`rounded-xl border-2 p-6 transition-all ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50 shadow-lg scale-105"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <Icon
                      className={`mx-auto mb-3 h-10 w-10 ${
                        isSelected ? "text-cyan-600" : "text-gray-400"
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        isSelected ? "text-cyan-900" : "text-gray-700"
                      }`}
                    >
                      {interest.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Level Selection */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Mức ngân sách của bạn?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUDGET_LEVELS.map((budget) => {
                const isSelected = selectedBudget === budget.id;
                return (
                  <button
                    key={budget.id}
                    onClick={() => setSelectedBudget(budget.id)}
                    className={`rounded-xl border-2 p-6 transition-all ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50 shadow-lg scale-105"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="mb-2 text-3xl font-bold text-gray-900">
                      {budget.label}
                    </div>
                    <p
                      className={`mb-1 font-semibold ${
                        isSelected ? "text-cyan-900" : "text-gray-700"
                      }`}
                    >
                      {budget.viLabel}
                    </p>
                    <p className="text-sm text-gray-500">{budget.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900 font-semibold"
          >
            Bỏ qua
          </button>
          <button
            onClick={handleComplete}
            disabled={!isValid}
            className={`rounded-xl px-8 py-4 font-bold text-white shadow-lg transition-all ${
              isValid
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:scale-105 hover:shadow-xl"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    </div>
  );
}
