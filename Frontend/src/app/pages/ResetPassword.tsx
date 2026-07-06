import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { AuthLayout } from "../components/AuthLayout";
import { Lock, ArrowLeft } from "lucide-react";
import { resetPassword } from "../services/auth";
import { getAuthErrorMessage } from "../utils/authErrorHandler";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      toast.success("Đã đổi mật khẩu thành công", { position: "top-right" });
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(getAuthErrorMessage(err, "reset-password"));
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Đặt lại mật khẩu
            </h1>
            <p className="text-gray-600">
              Nhập mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          {!token ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại từ{" "}
              <Link to="/forgot-password" className="font-semibold text-cyan-600 underline">
                trang quên mật khẩu
              </Link>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="reset-password-new"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Nhập mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reset-password-new"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Mật khẩu mới cần tối thiểu 6 ký tự.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reset-password-confirm"
                  className="mb-2 block text-sm font-semibold text-gray-900"
                >
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="reset-password-confirm"
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
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </form>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
