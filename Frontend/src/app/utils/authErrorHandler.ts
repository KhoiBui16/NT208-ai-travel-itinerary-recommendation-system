import { ApiError } from "../services/api";

export type AuthAction = "login" | "register" | "forgot-password" | "reset-password";

function defaultMessage(action: AuthAction): string {
  switch (action) {
    case "login":
      return "Đăng nhập thất bại. Vui lòng thử lại.";
    case "register":
      return "Đăng ký thất bại. Vui lòng thử lại.";
    case "forgot-password":
      return "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.";
    case "reset-password":
      return "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
    default:
      return "Không thể thực hiện thao tác. Vui lòng thử lại.";
  }
}

function isSafeBackendDetail(detail: string): boolean {
  const lowered = detail.toLowerCase();
  return (
    detail.length <= 160 &&
    !lowered.includes("traceback") &&
    !lowered.includes("sql") &&
    !lowered.includes("internal") &&
    !lowered.includes("exception")
  );
}

function mapKnownDetail(detail: string, action: AuthAction): string | null {
  const lowered = detail.toLowerCase();

  if (lowered.includes("invalid email or password")) {
    return "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
  }

  if (lowered.includes("account is deactivated")) {
    return "Tài khoản của bạn hiện đang bị vô hiệu hóa.";
  }

  if (lowered.includes("email already registered")) {
    return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
  }

  if (lowered.includes("invalid or expired reset token") || lowered.includes("reset token has expired")) {
    return "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  }

  if (lowered.includes("valid email address")) {
    return "Email không hợp lệ. Vui lòng nhập lại.";
  }

  if (lowered.includes("at least 6 characters")) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }

  if (lowered.includes("field required")) {
    if (action === "forgot-password") return "Vui lòng nhập email đã đăng ký.";
    return "Vui lòng điền đầy đủ các trường bắt buộc.";
  }

  return null;
}

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      const lowered = error.message.toLowerCase();
      if (
        lowered.includes("failed to fetch") ||
        lowered.includes("networkerror") ||
        lowered.includes("fetch failed")
      ) {
        return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.";
      }
    }
    return defaultMessage(action);
  }

  const detail = typeof error.body.detail === "string" ? error.body.detail : error.message;
  const knownMessage = mapKnownDetail(detail, action);
  if (knownMessage) {
    return knownMessage;
  }

  if (error.status === 409) {
    return "Dữ liệu đang bị trùng với thông tin đã tồn tại. Vui lòng kiểm tra lại.";
  }

  if (error.status === 401) {
    return action === "login"
      ? "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại."
      : "Phiên xác thực không hợp lệ. Vui lòng thử lại.";
  }

  if (error.status === 422) {
    return isSafeBackendDetail(detail)
      ? detail
      : "Thông tin không hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập.";
  }

  if (error.status === 503) {
    if (action === "forgot-password") {
      return "Chức năng gửi email đặt lại mật khẩu hiện chưa sẵn sàng. Vui lòng thử lại sau.";
    }
    return "Dịch vụ hiện tạm thời không khả dụng. Vui lòng thử lại sau.";
  }

  if (error.status >= 500) {
    return "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
  }

  return isSafeBackendDetail(detail) ? detail : defaultMessage(action);
}
