import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
import { OTPModal } from "../components/OTPModal";
import { Mail, Lock, User, Chrome } from "lucide-react";
import { registerUser } from "../utils/auth";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  
  // OTP Modal State
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpTimestamp, setOtpTimestamp] = useState<number>(0);

  const generateOTP = () => { // Chuyển logic tạo mã OTP qua cho Backend xử lý (gửi email)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setOtpTimestamp(Date.now());
    
    console.log("OTP sent to email:", formData.email);
    console.log("OTP Code:", otp);
    
    return otp;
  };

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

    generateOTP();
    setShowOTPModal(true);
  };

  const handleVerifySuccess = () => { // Gọi API POST /api/auth/register kèm theo OTP để tạo user.
    const result = registerUser(formData.email, formData.password, formData.name);
    
    if (result.success) {
      toast.success("Đăng ký thành công!", {
        position: "top-right",
      });
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } else {
      setError(result.error || "Đăng ký thất bại");
      setShowOTPModal(false);
    }
  };

  const handleCloseOTP = () => {
    setShowOTPModal(false);
  };

  const handleResendOTP = () => {
    generateOTP();
  };

  const handleGoogleSignup = () => {
    toast.info("Tính năng đăng ký Google đang được phát triển", {
      position: "top-right",
    });
  };

  return (
    <>
      <Header />
      {showOTPModal && (
        <OTPModal
          email={formData.email}
          generatedOTP={generatedOTP}
          otpTimestamp={otpTimestamp}
          onVerifySuccess={handleVerifySuccess}
          onClose={handleCloseOTP}
          onResendOTP={handleResendOTP}
        />
      )}

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
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
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
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
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
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
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

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
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
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              Đăng Ký
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