import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
// import { OTPModal } from "../components/OTPModal"; // TODO: re-enable when BE email OTP is ready
import { Mail, Lock, User, Chrome } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getAuthErrorMessage } from "../utils/authErrorHandler";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Modal State — placeholder until backend email OTP is available.
  // For now, skip OTP verification and register directly.
  // const [showOTPModal, setShowOTPModal] = useState(false);
  // const [generatedOTP, setGeneratedOTP] = useState("");
  // const [otpTimestamp, setOtpTimestamp] = useState<number>(0);

  // const generateOTP = () => {
  //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
  //   setGeneratedOTP(otp);
  //   setOtpTimestamp(Date.now());
  //   return otp;
  // };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Skip OTP placeholder — register directly until BE email OTP is ready
    setLoading(true);
    try {
      const claimResult = await register(
        formData.email,
        formData.password,
        formData.name,
      );
      toast.success("Đăng ký thành công!", { position: "top-right" });
      setTimeout(() => {
        navigate(claimResult?.returnTo || "/", { replace: true });
      }, 1000);
    } catch (err) {
      setError(getAuthErrorMessage(err, "register"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    toast.info("Tính năng đăng ký Google đang được phát triển", {
      position: "top-right",
    });
  };

  return (
    <>
      <Header />
      {/* OTPModal disabled until BE email OTP is ready */}

      <AuthLayout>
        <div className="rounded-2xl bg-white p-8 lg:p-10 shadow-xl">
          {/* Header inside form */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Đăng Ký</h1>
            <p className="text-gray-600">Tạo tài khoản mới để bắt đầu hành trình của bạn</p>
          </div>

          {/* Google signup button */}
          <button
            onClick={handleGoogleSignup}
            className="mb-6 w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
          >
            <Chrome className="h-5 w-5 text-red-500" />
            Đăng ký bằng Google
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-sm text-gray-500">Hoặc</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-gray-900">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="register-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Họ và tên của bạn"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-gray-900">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-gray-900">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="register-password"
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
              <p className="mt-1 text-xs text-gray-500">
                Mật khẩu cần tối thiểu 6 ký tự.
              </p>
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="register-confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "Đang đăng ký..." : "Đăng Ký"}
            </button>
          </form>

          {/* Sign in link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
              Đăng nhập
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
