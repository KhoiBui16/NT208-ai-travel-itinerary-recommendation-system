import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
import { Mail, Lock, Chrome } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../utils/authErrorHandler";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fromLocation = (
    location.state as { from?: { pathname: string; search?: string } } | null
  )?.from;
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search ?? ""}`
    : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const claimResult = await login(formData.email, formData.password);

      // Handle remember me with cookies
      if (formData.rememberMe) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        document.cookie = `rememberedEmail=${formData.email}; expires=${expiryDate.toUTCString()}; path=/`;
      } else {
        document.cookie = "rememberedEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }

      toast.success("Đăng nhập thành công!", { position: "top-right" });
      navigate(claimResult?.returnTo || from, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Tính năng đăng nhập Google đang được phát triển", {
      position: "top-right",
    });
  };

  const handleEmailLogin = () => {
    toast.info("Tính năng đăng nhập qua Email đang được phát triển", {
      position: "top-right",
    });
  };

  return (
    <>
      <Header />
      <AuthLayout>
        <div className="rounded-2xl bg-white p-8 lg:p-10 shadow-xl">
          {/* Header inside form */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Chào mừng bạn trở lại!</h1>
            <p className="text-gray-600">Đăng nhập để tiếp tục hành trình của bạn</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-gray-900">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-gray-900">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="login-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  required
                />
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-2 focus:ring-cyan-200"
                />
                <span className="text-sm text-gray-700">Ghi nhớ đăng nhập</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-sm text-gray-500">Hoặc</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          {/* Social login buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
            >
              <Chrome className="h-5 w-5 text-red-500" />
              Tiếp tục với Google
            </button>

            <button
              onClick={handleEmailLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
            >
              <Mail className="h-5 w-5 text-cyan-600" />
              Tiếp tục với Email
            </button>
          </div>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-semibold text-cyan-600 hover:text-cyan-700">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
