import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { User, Mail, Phone, Heart, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile } from "../services/users";
import { toast } from "sonner";
import { INTEREST_OPTIONS } from "../utils/tripConstants";

export default function Profile() {
  const navigate = useNavigate();
  // user: thông tin user từ AuthContext (đồng bộ sau mỗi lần refreshUser)
  // isAuthenticated: false nếu chưa đăng nhập → redirect sang /login
  // refreshUser: gọi lại GET /api/v1/users/profile để cập nhật AuthContext sau khi save
  const { user, isAuthenticated, refreshUser } = useAuth();

  // Form state: khởi tạo từ user hiện tại trong AuthContext
  // email là read-only (không gửi lên BE khi update)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    interests: user?.interests || [],
  });

  // success: hiển thị banner xanh sau khi lưu thành công (tự ẩn sau 3 giây)
  const [success, setSuccess] = useState(false);
  // saving: disable nút submit, hiển thị "Đang lưu..." khi đang gọi API
  const [saving, setSaving] = useState(false);

  // Sync form when user data changes (e.g. after refreshUser)
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        interests: user.interests || [],
      });
    }
  }, [user]);

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Lưu backup để rollback UI nếu API thất bại (optimistic-like pattern)
    const backup = { ...formData };
    try {
      // Gọi EP-6: PUT /api/v1/users/profile với name, phone, interests
      // email không được gửi lên vì là readonly field ở BE
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        interests: formData.interests,
      });
      // Đồng bộ AuthContext với data mới nhất từ BE (gọi EP-5)
      await refreshUser();
      setSuccess(true);
      // Tự ẩn banner thành công sau 3 giây
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      // Rollback form về trạng thái trước khi submit nếu API lỗi
      setFormData(backup);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.", {
        position: "top-right",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle sở thích: thêm vào array nếu chưa có, xóa nếu đã có
  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

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

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-xl"
        >
          {success && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-600">
              Cập nhật thông tin thành công!
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
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest.label);
                return (
                  <button
                    key={interest.label}
                    type="button"
                    onClick={() => toggleInterest(interest.label)}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Save className="h-5 w-5" />
            {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
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
