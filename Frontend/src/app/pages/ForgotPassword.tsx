import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
import { OTPModal } from "../components/OTPModal";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // OTP Modal State (client-side placeholder until backend email OTP is implemented)
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpTimestamp, setOtpTimestamp] = useState<number>(0);

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setOtpTimestamp(Date.now());
    return otp;
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // TODO: Call POST /api/auth/forgot-password when backend implements email OTP
    // For now, show OTP modal as a client-side placeholder
    generateOTP();
    setShowOTPModal(true);
  };

  const handleVerifySuccess = () => {
    setShowOTPModal(false);
    setStep("newPassword");
  };

  const handleCloseOTP = () => {
    setShowOTPModal(false);
  };

  const handleResendOTP = () => {
    generateOTP();
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    // TODO: Call POST /api/auth/reset-password when backend implements it
    toast.success("Đã đổi mật khẩu thành công", {
      position: "top-right",
    });

    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  return (
    <>
      <Header />
      {showOTPModal && (
        <OTPModal
          email={email}
          generatedOTP={generatedOTP}
          otpTimestamp={otpTimestamp}
          onVerifySuccess={handleVerifySuccess}
          onClose={handleCloseOTP}
          onResendOTP={handleResendOTP}
        />
      )}

      <AuthLayout>
        <div className="rounded-2xl bg-white p-8 lg:p-10 shadow-xl">
          {/* Back to login link */}
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>

          {/* Header inside form */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Tạo lại mật khẩu</h1>
            <p className="text-gray-600">
              {step === "email"
                ? "Nhập email của bạn để nhận mã xác nhận"
                : "Nhập mật khẩu mới cho tài khoản của bạn"}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Email hoặc Google đã đăng ký
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Xác nhận
              </button>
            </form>
          ) : (
            <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Nhập mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                Xác nhận
              </button>
            </form>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
