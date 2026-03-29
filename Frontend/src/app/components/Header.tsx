import { Link, useNavigate } from "react-router";
import { User, LogOut, Menu, X, Settings, History, MapPin, Crown, ChevronDown, Home, Compass } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { isAuthenticated, logoutUser } from "../utils/auth";

export function Header() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="w-full px-6 md:px-10">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src="/app_logo.png"
                alt="YourTrip Logo" 
                className="h-16 w-auto transition-transform duration-300 group-hover:scale-110" 
              />
              {/* Đã xóa chữ YourTrip văn bản ở đây */}
            </Link>

            {/* Desktop Navigation Links - Moved to left */}
            <div className="hidden items-center gap-6 md:flex">
              <Link
                to="/"
                className="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-cyan-600"
              >
                <Home className="h-4 w-4" />
                Trang chủ
              </Link>
              <Link
                to="/cities"
                className="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-cyan-600"
              >
                <Compass className="h-4 w-4" />
                Khám phá điểm đến
              </Link>
              <Link
                to="/trip-history"
                className="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-cyan-600"
              >
                <History className="h-4 w-4" />
                Lịch trình của tôi
              </Link>
            </div>
          </div>

          {/* Right side - Create Trip Button and Profile */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Create Trip Button */}
            <Link
              to="/create-trip"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
            >
              Tạo Chuyến Đi
            </Link>

            {/* Profile Avatar with Dropdown */}
            {isAuthenticated() ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white p-1 pr-3 transition-all hover:border-cyan-500"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 z-50">
                    {/* Upgrade to Premium */}
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-white" />
                        <span className="font-bold text-white">Upgrade to Premium</span>
                      </div>
                      <p className="text-xs text-white/90 mb-3">
                        Unlock unlimited AI itineraries and more features
                      </p>
                      <button className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-gray-50">
                        Nâng Cấp Ngay
                      </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/account"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium">Tài khoản</span>
                      </Link>

                      <Link
                        to="/saved-places"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">Địa điểm đã lưu</span>
                      </Link>

                      <Link
                        to="/trip-history"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <History className="h-5 w-5" />
                        <span className="font-medium">Lịch sử lịch trình</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Cài đặt</span>
                      </Link>

                      <div className="my-2 border-t border-gray-200" />

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="font-semibold text-gray-700 transition-colors hover:text-cyan-600"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-cyan-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-cyan-700"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex flex-col gap-4 border-t border-gray-200 py-4 md:hidden">
            {/* Navigation Links */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-medium text-gray-700"
            >
              <Home className="h-5 w-5" />
              Trang chủ
            </Link>
            <Link
              to="/cities"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-medium text-gray-700"
            >
              <Compass className="h-5 w-5" />
              Khám phá điểm đến
            </Link>
            <Link
              to="/trip-history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-medium text-gray-700"
            >
              <History className="h-5 w-5" />
              Lịch trình của tôi
            </Link>
            
            <Link
              to="/create-trip"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 text-center font-semibold text-white"
            >
              Tạo Chuyến Đi
            </Link>

            {isAuthenticated() ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <User className="h-5 w-5" />
                  Tài khoản
                </Link>
                <Link
                  to="/saved-places"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <MapPin className="h-5 w-5" />
                  Địa điểm đã lưu
                </Link>
                <Link
                  to="/trip-history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <History className="h-5 w-5" />
                  Lịch sử lịch trình
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <Settings className="h-5 w-5" />
                  Cài đặt
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 text-left font-medium text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-medium text-gray-700"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-gray-900 px-6 py-2 text-center font-semibold text-white"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}