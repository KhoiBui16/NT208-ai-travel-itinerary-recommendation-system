import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { MapPin, Calendar, DollarSign, Heart, Camera, Utensils, Mountain, Users, Loader2 } from "lucide-react";
import { generateItinerary } from "../utils/itinerary";

const destinations = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hội An",
  "Vịnh Hạ Long",
  "Sapa",
  "Nha Trang",
  "Phú Quốc",
  "Đà Lạt",
  "Huế",
];

const interestOptions = [
  { id: "culture", label: "Văn hóa - Lịch sử", icon: Camera },
  { id: "food", label: "Ẩm thực", icon: Utensils },
  { id: "nature", label: "Thiên nhiên", icon: Mountain },
  { id: "beach", label: "Biển", icon: Heart },
  { id: "adventure", label: "Phiêu lưu", icon: Users },
];

export default function TripPlanning() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultDestination = searchParams.get("destination") || "";

  const [formData, setFormData] = useState({
    destination: defaultDestination,
    startDate: "",
    endDate: "",
    budget: "",
    interests: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.destination) newErrors.destination = "Vui lòng chọn điểm đến";
    if (!formData.startDate) newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    if (!formData.endDate) newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    if (!formData.budget) newErrors.budget = "Vui lòng nhập ngân sách";
    if (formData.interests.length === 0) newErrors.interests = "Vui lòng chọn ít nhất một sở thích";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Generate itinerary via BE API (AI-powered)
      const itinerary = await generateItinerary(
        formData.destination,
        formData.startDate,
        formData.endDate,
        parseInt(formData.budget),
        formData.interests
      );
      
      // Navigate to itinerary view
      navigate(`/itinerary/${itinerary.id}`);
    } catch (err) {
      setErrors({ submit: "Lỗi tạo lịch trình. Vui lòng thử lại." });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
    setErrors(prev => ({ ...prev, interests: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Lên Kế Hoạch Chuyến Đi
          </h1>
          <p className="text-lg text-gray-600">
            Điền thông tin dưới đây để nhận lịch trình du lịch được cá nhân hóa
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Destination */}
          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-blue-600" />
              Điểm đến
            </label>
            <select
              value={formData.destination}
              onChange={(e) => {
                setFormData({ ...formData, destination: e.target.value });
                setErrors({ ...errors, destination: "" });
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Chọn điểm đến</option>
              {destinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination}</p>
            )}
          </div>

          {/* Dates */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  setFormData({ ...formData, startDate: e.target.value });
                  setErrors({ ...errors, startDate: "" });
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                <Calendar className="h-5 w-5 text-blue-600" />
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  setFormData({ ...formData, endDate: e.target.value });
                  setErrors({ ...errors, endDate: "" });
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Budget */}
          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Ngân sách (VND)
            </label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => {
                setFormData({ ...formData, budget: e.target.value });
                setErrors({ ...errors, budget: "" });
              }}
              placeholder="Ví dụ: 5000000"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            {errors.budget && (
              <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
            )}
          </div>

          {/* Interests */}
          <div className="mb-8">
            <label className="mb-4 block font-semibold text-gray-900">
              Sở thích của bạn
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {interestOptions.map((interest) => {
                const Icon = interest.icon;
                const isSelected = formData.interests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">{interest.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.interests && (
              <p className="mt-2 text-sm text-red-600">{errors.interests}</p>
            )}
          </div>

          {errors.submit && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">
              {errors.submit}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tạo lịch trình (AI)...
              </span>
            ) : (
              "Tạo Lịch Trình Du Lịch"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
