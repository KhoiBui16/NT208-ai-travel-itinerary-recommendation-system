import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import {
  User,
  Mail,
  Lock,
  Camera,
  Globe,
  Bell,
  Crown,
  Shield,
  Utensils,
  Mountain,
  Building,
  Music,
  ShoppingBag,
  Heart,
  Users,
  Baby,
} from "lucide-react";
import {
  TRAVEL_TYPES,
  INTEREST_OPTIONS,
  BUDGET_LEVELS,
} from "../utils/tripConstants";
import { useAuth } from "../contexts/AuthContext";
import * as userService from "../services/users";
import { ApiError } from "../services/api";
import { toast } from "sonner";

export default function Account() {
  const { user, refreshUser } = useAuth();
  // editMode: bật/tắt chế độ chỉnh sửa thông tin tài khoản
  const [editMode, setEditMode] = useState(false);
  // showPasswordChange: hiển/ẩn form đổi mật khẩu inline
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  // showPremiumModal: hiển/ẩn modal thông tin Premium
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  // saving: cờ đang gọi API (dùng chung cho cả save profile và change password)
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // userData: state nội bộ của form Account
  // accountPlan, language, travelType, budgetLevel, notificationsEnabled là UI-only
  // (chưa được persist lên BE trong phiên bản hiện tại)
  // username và interests được đồng bộ từ AuthContext qua useEffect bên dưới
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    profilePicture: "",
    language: "vi",
    accountPlan: "Free",
    travelType: "solo",
    interests: [] as string[],
    budgetLevel: "moderate",
    notificationsEnabled: true,
  });

  // Load user data from auth context
  useEffect(() => {
    if (user) {
      setUserData((prev) => ({
        ...prev,
        username: user.name,
        email: user.email,
        interests: user.interests ?? [],
      }));
    }
  }, [user]);

  const handleToggleInterest = (id: string) => {
    setUserData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Gọi EP-6: PUT /api/v1/users/profile với name và interests
      // (Account.tsx không cho sửa phone, chỉ sửa username và interests)
      await userService.updateProfile({
        name: userData.username,
        interests: userData.interests,
      });
      // Refresh AuthContext để Header và các component khác cập nhật tên mới
      await refreshUser();
      setEditMode(false);
      toast.success("Đã cập nhật thông tin!", { position: "top-right" });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, { position: "top-right" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate phía client trước khi gọi API: tránh round-trip không cần thiết
    if (!currentPassword || !newPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin", { position: "top-right" });
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự", {
        position: "top-right",
      });
      return;
    }

    setSaving(true);
    try {
      // Gọi EP-7: PUT /api/v1/users/password
      // BE sẽ xác minh currentPassword với bcrypt hash trước khi đổi
      await userService.changePassword({
        currentPassword,
        newPassword,
      });
      // Ẩn form và xóa state mật khẩu sau khi đổi thành công
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Đã đổi mật khẩu thành công!", { position: "top-right" });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, { position: "top-right" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">Tài Khoản</h1>
          <p className="text-lg text-gray-600">
            Quản lý thông tin cá nhân và sở thích du lịch của bạn
          </p>
        </div>

        {/* Account Plan Status */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-white" />
              <div>
                <p className="text-sm text-white/90">Gói hiện tại</p>
                <p className="text-2xl font-bold text-white">
                  {userData.accountPlan}
                </p>
              </div>
            </div>
            {userData.accountPlan === "Free" && (
              <button
                onClick={() => setShowPremiumModal(true)}
                className="rounded-xl bg-white px-6 py-3 font-bold text-orange-600 shadow-lg transition-all hover:scale-105"
              >
                Nâng Cấp Premium
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Thông Tin Tài Khoản
              </h2>
              <button
                onClick={() => {
                  if (editMode) {
                    handleSaveProfile();
                  } else {
                    setEditMode(!editMode);
                  }
                }}
                disabled={saving}
                className="rounded-lg bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-200 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : editMode ? "Lưu" : "Chỉnh sửa"}
              </button>
            </div>

            {/* Profile Picture */}
            <div className="mb-6 flex items-center gap-6">
              <div className="relative">
                {userData.profilePicture ? (
                  <img
                    src={userData.profilePicture}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600">
                    <User className="h-12 w-12 text-white" />
                  </div>
                )}
                {editMode && (
                  <button className="absolute bottom-0 right-0 rounded-full bg-white p-2 shadow-lg transition-all hover:scale-110">
                    <Camera className="h-4 w-4 text-gray-700" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Ảnh đại diện</p>
                <p className="text-xs text-gray-500">PNG, JPG tối đa 2MB</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4" />
                  Tên người dùng
                </label>
                <input
                  type="text"
                  value={userData.username}
                  onChange={(e) =>
                    setUserData({ ...userData, username: e.target.value })
                  }
                  disabled={!editMode}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-gray-50"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Lock className="h-4 w-4" />
                  Mật khẩu
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value="••••••••"
                    disabled
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-gray-50"
                  />
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>

              {/* Change Password Form */}
              {showPasswordChange && (
                <div className="rounded-lg bg-gray-50 p-4 space-y-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Mật khẩu hiện tại"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? "Đang cập nhật..." : "Cập Nhật Mật Khẩu"}
                  </button>
                </div>
              )}

              {/* Language */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Globe className="h-4 w-4" />
                  Ngôn ngữ
                </label>
                <select
                  value={userData.language}
                  onChange={(e) =>
                    setUserData({ ...userData, language: e.target.value })
                  }
                  disabled={!editMode}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Notification Preferences */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Bell className="h-4 w-4" />
                  Thông báo
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={userData.notificationsEnabled}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        notificationsEnabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-gray-900">
                    Nhận thông báo về chuyến đi và đề xuất
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Travel Preferences */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Sở Thích Du Lịch
            </h2>

            {/* Travel Type */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Loại hình du lịch
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TRAVEL_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() =>
                        setUserData({ ...userData, travelType: type.id })
                      }
                      className={`rounded-xl border-2 p-4 transition-all ${
                        userData.travelType === type.id
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`mx-auto mb-2 h-8 w-8 ${
                          userData.travelType === type.id
                            ? "text-cyan-600"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-semibold ${
                          userData.travelType === type.id
                            ? "text-cyan-900"
                            : "text-gray-700"
                        }`}
                      >
                        {type.viLabel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interests */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Sở thích
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected = userData.interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => handleToggleInterest(interest.id)}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`mx-auto mb-2 h-8 w-8 ${
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

            {/* Budget Level */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Mức ngân sách
              </label>
              <div className="grid grid-cols-3 gap-3">
                {BUDGET_LEVELS.map((budget) => {
                  const isSelected = userData.budgetLevel === budget.id;
                  return (
                    <button
                      key={budget.id}
                      onClick={() =>
                        setUserData({ ...userData, budgetLevel: budget.id })
                      }
                      className={`rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-2 text-3xl font-bold text-gray-900">
                        {budget.label}
                      </div>
                      <p
                        className={`font-semibold ${
                          isSelected ? "text-cyan-900" : "text-gray-700"
                        }`}
                      >
                        {budget.viLabel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Quyền Riêng Tư & Bảo Mật
            </h2>
            <div className="space-y-3">
              <button className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-50">
                Quản lý quyền riêng tư
              </button>
              <button className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-50">
                Xem lịch sử hoạt động
              </button>
              <button className="w-full rounded-lg border border-red-300 px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50">
                Xóa tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mb-4">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Tính Năng Premium Đang Phát Triển
              </h3>
              <p className="text-gray-600">
                Chúng tôi đang xây dựng các tính năng Premium để nâng cao trải nghiệm của bạn.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Lưu nhiều lịch trình hơn</p>
                  <p className="text-sm text-gray-600">Lưu trữ vô số chuyến đi của bạn</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Tạo nhiều lịch trình AI hơn</p>
                  <p className="text-sm text-gray-600">Tạo vô số lịch trình với AI mỗi ngày</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ưu tiên tốc độ & gợi ý</p>
                  <p className="text-sm text-gray-600">Tận hưởng tốc độ nhanh hơn và gợi ý thông minh hơn</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPremiumModal(false);
                toast.info("Chúng tôi sẽ thông báo khi Premium sẵn sàng!");
              }}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-white transition-all hover:from-amber-500 hover:to-orange-600"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
