import { Link, useNavigate } from "react-router";
import { Plane, User, LogOut, BookOpen, Menu, X } from "lucide-react";
import { getCurrentUser, logoutUser } from "../utils/auth";
import { useState } from "react";

export function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-blue-600">
            <Plane className="h-8 w-8" />
            <span className="text-xl font-bold">Du Lịch Việt</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/trip-planning"
              className="font-medium text-gray-700 transition-colors hover:text-blue-600"
            >
              Lên Kế Hoạch
            </Link>

            {user ? (
              <>
                <Link
                  to="/saved-itineraries"
                  className="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-blue-600"
                >
                  <BookOpen className="h-5 w-5" />
                  Hành Trình Đã Lưu
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-blue-600"
                >
                  <User className="h-5 w-5" />
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng Xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-medium text-gray-700 transition-colors hover:text-blue-600"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Đăng Ký
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex flex-col gap-4 border-t border-gray-200 py-4 md:hidden">
            <Link
              to="/trip-planning"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-gray-700"
            >
              Lên Kế Hoạch
            </Link>

            {user ? (
              <>
                <Link
                  to="/saved-itineraries"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <BookOpen className="h-5 w-5" />
                  Hành Trình Đã Lưu
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 font-medium text-gray-700"
                >
                  <User className="h-5 w-5" />
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng Xuất
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-medium text-gray-700"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-center font-medium text-white"
                >
                  Đăng Ký
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
