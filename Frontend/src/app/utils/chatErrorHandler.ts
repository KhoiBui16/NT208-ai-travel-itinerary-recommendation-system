/**
 * Chat error handler for C3B companion messaging.
 *
 * Mục tiêu là chuyển các lỗi API/runtime phổ biến thành copy tiếng Việt
 * dễ hiểu cho end-user mà vẫn giữ đúng contract 401/403/429/503 hiện có.
 */

import { ApiError } from "../services/api";

function formatRetryAfter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";

  const minutes = Math.ceil(seconds / 60);
  if (minutes <= 1) return "khoảng 1 phút";
  if (minutes < 60) return `khoảng ${minutes} phút`;

  const hours = Math.ceil(minutes / 60);
  return `khoảng ${hours} giờ`;
}

export function getChatErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("fetch failed")
      ) {
        return "Không thể kết nối đến máy chủ chat. Vui lòng kiểm tra mạng và thử lại.";
      }
    }
    return "Không thể gửi tin nhắn đến AI companion. Vui lòng thử lại.";
  }

  const detail =
    typeof error.body.detail === "string" ? error.body.detail.toLowerCase() : "";

  if (error.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục chat.";
  }

  if (error.status === 403) {
    return "Bạn không có quyền dùng phiên chat này. Hãy mở đúng lịch trình của mình.";
  }

  if (error.status === 404) {
    return "Không tìm thấy phiên chat. Hãy tạo phiên mới và thử lại.";
  }

  if (error.status === 409) {
    return "Đề xuất này không còn áp dụng được vì lịch trình đã thay đổi. Hãy làm mới chat và yêu cầu AI đề xuất lại.";
  }

  if (error.status === 422) {
    return "Tin nhắn chưa hợp lệ. Vui lòng kiểm tra nội dung rồi gửi lại.";
  }

  if (error.status === 429) {
    const retryAfter = error.headers?.retryAfter;
    const waitText = retryAfter ? formatRetryAfter(retryAfter) : "";
    const retryHint = waitText ? ` Bạn có thể thử lại sau ${waitText}.` : "";
    return `Bạn đã dùng hết quota chat AI hôm nay.${retryHint}`;
  }

  if (error.status === 503) {
    if (
      detail.includes("redis") ||
      detail.includes("rate limiter") ||
      detail.includes("service unavailable")
    ) {
      return "Hệ thống chat AI đang tạm thời không khả dụng. Vui lòng thử lại sau.";
    }

    if (
      detail.includes("ai") ||
      detail.includes("gemini") ||
      detail.includes("timeout") ||
      detail.includes("companion")
    ) {
      return "AI companion đang phản hồi quá lâu hoặc chưa sẵn sàng. Chưa có thay đổi nào được lưu.";
    }

    return "Dịch vụ chat AI đang tạm thời gián đoạn. Vui lòng thử lại sau.";
  }

  if (error.status >= 500) {
    return "Máy chủ đang gặp sự cố khi xử lý tin nhắn. Vui lòng thử lại sau.";
  }

  return "Không thể gửi tin nhắn đến AI companion. Vui lòng thử lại.";
}
