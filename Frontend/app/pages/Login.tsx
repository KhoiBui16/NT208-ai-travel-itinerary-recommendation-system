import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";
import { loginUser } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginUser(formData.email, formData.password);
      
      if (result.success && result.user) {
        navigate("/");
      } else {
        setError(result.error || "Đăng nhập thất bại");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex rounded-full bg-blue-100 p-4">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Đăng Nhập</h1>
            <p className="text-gray-600">
              Chào mừng bạn trở lại! Đăng nhập để tiếp tục
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng Nhập"
              )}
            </button>

            <p className="mt-6 text-center text-gray-600">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Đăng ký ngay
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
