import { useState } from "react";
import { Header } from "../components/Header";
import { User, Mail, Lock, Camera, Globe, Bell, Crown, Shield, Utensils, Mountain, Building, Music, ShoppingBag, Heart, Users, Baby } from "lucide-react";
import { TRAVEL_TYPES, INTEREST_OPTIONS, BUDGET_LEVELS } from "../utils/tripConstants";

export default function Account() {
  const [editMode, setEditMode] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Mock user data
  const [userData, setUserData] = useState({ //gọi API /api/users/me để lấy thông tin user thực tế
    username: "Nguyễn Văn A",
    email: "nguyen.vana@example.com",
    profilePicture: "",
    language: "vi",
    accountPlan: "Free",
    travelType: "solo",
    interests: ["food", "nature", "history"],
    budgetLevel: "moderate",
    notificationsEnabled: true,
  });

  const handleToggleInterest = (id: string) => {
    setUserData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
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
                <p className="text-2xl font-bold text-white">{userData.accountPlan}</p>
              </div>
            </div>
            {userData.accountPlan === "Free" && (
              <button className="rounded-xl bg-white px-6 py-3 font-bold text-orange-600 shadow-lg transition-all hover:scale-105">
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
                onClick={() => setEditMode(!editMode)}
                className="rounded-lg bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-200"
              >
                {editMode ? "Lưu" : "Chỉnh sửa"}
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
                  onChange={(e) =>
                    setUserData({ ...userData, email: e.target.value })
                  }
                  disabled={!editMode}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-gray-50"
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
                    placeholder="Mật khẩu hiện tại"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                  />
                  <button className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                    Cập Nhật Mật Khẩu
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
    </div>
  );
}