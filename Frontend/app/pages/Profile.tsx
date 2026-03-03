import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { User, Mail, Phone, Heart, Save, Loader2 } from "lucide-react";
import { getCurrentUser, updateUserProfile, isAuthenticated } from "../utils/auth";

const interestOptions = [
  "Văn hóa - Lịch sử",
  "Ẩm thực",
  "Thiên nhiên",
  "Biển",
  "Phiêu lưu",
  "Chụp ảnh",
  "Mua sắm",
  "Thể thao",
];

export default function Profile() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    interests: user?.interests || [],
  });

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (user) {
      setLoading(true);
      try {
        await updateUserProfile(user.id, {
          name: formData.name,
          phone: formData.phone,
          interests: formData.interests,
        });
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch {
        setError("Cập nhật thất bại. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Thông Tin Cá Nhân
          </h1>
          <p className="text-lg text-gray-600">
            Quản lý thông tin và sở thích của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl">
          {success && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-600">
              Cập nhật thông tin thành công!
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <User className="h-5 w-5 text-blue-600" />
              Họ và tên
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-blue-600" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3"
            />
            <p className="mt-1 text-sm text-gray-500">
              Email không thể thay đổi
            </p>
          </div>

          <div className="mb-6">
            <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
              <Phone className="h-5 w-5 text-blue-600" />
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="0123456789"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="mb-8">
            <label className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <Heart className="h-5 w-5 text-blue-600" />
              Sở thích
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {interestOptions.map((interest) => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang lưu...
              </span>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Lưu Thay Đổi
              </>
            )}
          </button>
        </form>

        {/* Account Info */}
        <div className="mt-8 rounded-2xl bg-white p-8 shadow-xl">
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Thông Tin Tài Khoản
          </h3>
          <div className="space-y-2 text-gray-600">
            <p>
              <span className="font-semibold">Ngày tạo:</span>{" "}
              {new Date(user.createdAt).toLocaleDateString("vi-VN")}
            </p>
            <p>
              <span className="font-semibold">ID Tài khoản:</span> {user.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
