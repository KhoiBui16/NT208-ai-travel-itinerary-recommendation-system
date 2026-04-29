import { useState } from "react";
import { Header } from "../components/Header";
import { Bell, Globe, Moon, Shield, HelpCircle, FileText, Mail } from "lucide-react";
// TODO: Gọi API GET/PUT /api/users/settings để đồng bộ cài đặt thực tế với backend. Hiện tại đang dùng state local để demo.
export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    tripReminders: true,
    marketingEmails: false,
    language: "vi",
    theme: "light",
    dataSharing: false,
    locationAccess: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 text-4xl font-bold text-gray-900">Cài Đặt</h1>
          <p className="text-lg text-gray-600">
            Tùy chỉnh trải nghiệm của bạn với YourTrip
          </p>
        </div>

        <div className="space-y-6">
          {/* Notifications */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Bell className="h-6 w-6" />
              Thông Báo
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Thông báo qua Email
                  </p>
                  <p className="text-sm text-gray-600">
                    Nhận thông báo quan trọng qua email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailNotifications: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Thông báo đẩy
                  </p>
                  <p className="text-sm text-gray-600">
                    Nhận thông báo trên thiết bị của bạn
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pushNotifications: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Nhắc nhở chuyến đi
                  </p>
                  <p className="text-sm text-gray-600">
                    Nhận nhắc nhở trước khi chuyến đi bắt đầu
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.tripReminders}
                  onChange={(e) =>
                    setSettings({ ...settings, tripReminders: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Email marketing
                  </p>
                  <p className="text-sm text-gray-600">
                    Nhận tin tức và ưu đãi đặc biệt
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marketingEmails: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>
            </div>
          </div>

          {/* Language & Region */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Globe className="h-6 w-6" />
              Ngôn Ngữ & Khu Vực
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Ngôn ngữ
                </label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    setSettings({ ...settings, language: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Múi giờ
                </label>
                <select className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200">
                  <option value="asia/ho_chi_minh">
                    (GMT+7) Hồ Chí Minh
                  </option>
                  <option value="asia/bangkok">(GMT+7) Bangkok</option>
                  <option value="asia/singapore">(GMT+8) Singapore</option>
                  <option value="asia/tokyo">(GMT+9) Tokyo</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Đơn vị tiền tệ
                </label>
                <select className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200">
                  <option value="vnd">VND (₫)</option>
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                  <option value="gbp">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Moon className="h-6 w-6" />
              Giao Diện
            </h2>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Chế độ hiển thị
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSettings({ ...settings, theme: "light" })}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    settings.theme === "light"
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 text-2xl">☀️</div>
                  <p
                    className={`text-sm font-semibold ${
                      settings.theme === "light"
                        ? "text-cyan-900"
                        : "text-gray-700"
                    }`}
                  >
                    Sáng
                  </p>
                </button>

                <button
                  onClick={() => setSettings({ ...settings, theme: "dark" })}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    settings.theme === "dark"
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 text-2xl">🌙</div>
                  <p
                    className={`text-sm font-semibold ${
                      settings.theme === "dark"
                        ? "text-cyan-900"
                        : "text-gray-700"
                    }`}
                  >
                    Tối
                  </p>
                </button>

                <button
                  onClick={() => setSettings({ ...settings, theme: "auto" })}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    settings.theme === "auto"
                      ? "border-cyan-500 bg-cyan-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 text-2xl">⚙️</div>
                  <p
                    className={`text-sm font-semibold ${
                      settings.theme === "auto"
                        ? "text-cyan-900"
                        : "text-gray-700"
                    }`}
                  >
                    Tự động
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Shield className="h-6 w-6" />
              Quyền Riêng Tư & Bảo Mật
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Chia sẻ dữ liệu sử dụng
                  </p>
                  <p className="text-sm text-gray-600">
                    Giúp cải thiện trải nghiệm ứng dụng
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dataSharing}
                  onChange={(e) =>
                    setSettings({ ...settings, dataSharing: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">
                    Quyền truy cập vị trí
                  </p>
                  <p className="text-sm text-gray-600">
                    Cho phép ứng dụng sử dụng vị trí của bạn
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.locationAccess}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      locationAccess: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              </label>

              <button className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-50">
                Xem chính sách quyền riêng tư
              </button>
              <button className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-50">
                Quản lý cookie
              </button>
            </div>
          </div>

          {/* Support & About */}
          <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <HelpCircle className="h-6 w-6" />
              Hỗ Trợ & Giới Thiệu
            </h2>

            <div className="space-y-3">
              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50">
                <HelpCircle className="h-5 w-5" />
                <span>Trung tâm trợ giúp</span>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50">
                <Mail className="h-5 w-5" />
                <span>Liên hệ hỗ trợ</span>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50">
                <FileText className="h-5 w-5" />
                <span>Điều khoản sử dụng</span>
              </button>

              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">
                  Phiên bản: 1.0.0
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  © 2025 YourTrip. Tất cả quyền được bảo lưu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
