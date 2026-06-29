import { useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { forgotPassword, type ForgotPasswordResponse } from "../services/auth";
import { getAuthErrorMessage } from "../utils/authErrorHandler";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submittedResult, setSubmittedResult] = useState<ForgotPasswordResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await forgotPassword(email);
      setSubmittedResult(result);
    } catch (err) {
      setError(getAuthErrorMessage(err, "forgot-password"));
    } finally {
      setLoading(false);
    }
  };

  const submitted = submittedResult !== null;
  const deliveryMode = submittedResult?.deliveryMode ?? null;

  return (
    <>
      <Header />
      <AuthLayout>
        <div className="rounded-2xl bg-white p-8 lg:p-10 shadow-xl">
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Tạo lại mật khẩu</h1>
            <p className="text-gray-600">
              {submitted
                ? deliveryMode === "smtp"
                  ? "Kiểm tra email của bạn"
                  : "Email đặt lại mật khẩu chưa sẵn sàng"
                : "Nhập email của bạn để nhận liên kết đặt lại mật khẩu"}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-5">
              <div
                className={`flex items-start gap-4 rounded-lg p-6 ${
                  deliveryMode === "smtp" ? "bg-green-50" : "bg-amber-50"
                }`}
              >
                <CheckCircle
                  className={`h-6 w-6 flex-shrink-0 ${
                    deliveryMode === "smtp" ? "text-green-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <p
                    className={`font-semibold ${
                      deliveryMode === "smtp" ? "text-green-800" : "text-amber-900"
                    }`}
                  >
                    {deliveryMode === "smtp"
                      ? "Yêu cầu đã được gửi"
                      : "Máy chủ chưa gửi email đặt lại mật khẩu"}
                  </p>
                  {deliveryMode === "smtp" ? (
                    <p className="mt-1 text-sm text-green-700">
                      Nếu email <strong>{email}</strong> đã đăng ký, bạn sẽ nhận được
                      liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (và thư rác).
                    </p>
                  ) : deliveryMode === "log_only" ? (
                    <p className="mt-1 text-sm text-amber-700">
                      Môi trường hiện tại chưa gửi email thật. Liên kết đặt lại chỉ được
                      ghi vào log backend để phục vụ phát triển nội bộ.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">
                      Hệ thống hiện chưa được cấu hình để gửi email đặt lại mật khẩu.
                      Vui lòng liên hệ quản trị viên hoặc thử lại sau khi cấu hình SMTP hoàn tất.
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/login"
                className="block w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 text-center font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="forgot-password-email"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Email đã đăng ký
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="forgot-password-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Hãy nhập đúng email bạn đã dùng để đăng ký tài khoản.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
              >
                {loading ? "Đang gửi..." : "Xác nhận"}
              </button>
            </form>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
