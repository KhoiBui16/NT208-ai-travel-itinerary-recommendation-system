import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { Mail, Lock, User, UserPlus } from "lucide-react";
import { registerUser, setCurrentUser } from "../utils/auth";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    const result = registerUser(formData.email, formData.password, formData.name);
    
    if (result.success && result.user) {
      setCurrentUser(result.user);
      navigate("/");
    } else {
      setError(result.error || "Đăng ký thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full bg-blue-100 p-4">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Đăng Ký</h1>
            <p className="text-gray-600">
              Tạo tài khoản mới để bắt đầu hành trình của bạn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-xl">
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
                placeholder="Nguyễn Văn A"
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
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                <Lock className="h-5 w-5 text-blue-600" />
                Mật khẩu
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                <Lock className="h-5 w-5 text-blue-600" />
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Đăng Ký
            </button>

            <p className="mt-6 text-center text-gray-600">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Đăng nhập
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
