/**
 * Centralized error handler for generate itinerary flow.
 * Maps backend error responses to user-friendly Vietnamese messages.
 */

import { ApiError, RateLimitInfo } from "../services/api";

export interface GenerateErrorContext {
  destination?: string;
  quotaLimit?: number;
}

function formatRetryAfter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";

  const minutes = Math.ceil(seconds / 60);
  if (minutes <= 1) return "khoảng 1 phút";
  if (minutes < 60) return `khoảng ${minutes} phút`;

  const hours = Math.ceil(minutes / 60);
  return `khoảng ${hours} giờ`;
}

/**
 * Maps API errors to user-friendly messages for AI itinerary generation.
 *
 * Handles:
 * - Network errors (no response)
 * - 400 Bad Request
 * - 401 Unauthorized (token expired)
 * - 403 Forbidden
 * - 422 Unprocessable Entity (destination not found, not enough places, validation)
 * - 429 Too Many Requests (rate limit)
 * - 503 Service Unavailable (AI timeout, Redis down)
 * - 500+ Server errors
 */
export function getGenerateErrorMessage(error: unknown, context?: GenerateErrorContext): string {
  // Network / non-API errors
  if (!(error instanceof ApiError)) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("fetch failed")) {
        return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.";
      }
    }
    return "Không thể tạo lịch trình. Vui lòng thử lại.";
  }

  // API errors with status code
  const { status, body } = error;

  // 400 Bad Request
  if (status === 400) {
    return "Thông tin không hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập.";
  }

  // 401 Unauthorized
  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  // 403 Forbidden
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  // 422 Unprocessable Entity
  if (status === 422) {
    const detail = typeof body.detail === "string" ? body.detail : "";
    const detailLower = detail.toLowerCase();
    const destName = context?.destination || "được chọn";

    // Destination not found
    if (
      detailLower.includes("destination data not found") ||
      detailLower.includes("destination not found") ||
      (detailLower.includes("not found") && detailLower.includes("destination"))
    ) {
      return `Điểm đến "${destName}" hiện chưa có dữ liệu trong hệ thống. Bạn có thể quay lại danh sách để kiểm tra slug hoặc chờ ETL cập nhật thêm dữ liệu.`;
    }

    // Not enough places
    if (
      detailLower.includes("not enough destination places") ||
      detailLower.includes("not enough places") ||
      (detailLower.includes("places") && (detailLower.includes("not enough") || detailLower.includes("insufficient")))
    ) {
      return `Điểm đến "${destName}" hiện chưa có đủ địa điểm để tạo lịch trình. Bạn có thể thử lại sau khi dữ liệu được cập nhật thêm.`;
    }

    // Other validation errors - use backend message if user-safe
    if (
      detail &&
      detail.length < 100 &&
      !detailLower.includes("sql") &&
      !detailLower.includes("traceback") &&
      !detailLower.includes("exception") &&
      !detailLower.includes("internal") &&
      !detailLower.includes("path") &&
      !detailLower.includes("error_code")
    ) {
      return detail;
    }

    return "Thông tin không hợp lệ. Vui lòng kiểm tra lại điểm đến, ngày tháng, số người và ngân sách.";
  }

  // 429 Too Many Requests (rate limit)
  if (status === 429) {
    // Use rate limit metadata from headers if available
    if (error.headers && error.headers.remaining !== undefined) {
      const { limit, remaining, resetAt, retryAfter } = error.headers;
      const resetTime = resetAt ? new Date(resetAt) : null;
      const waitText = retryAfter ? formatRetryAfter(retryAfter) : "";
      const retryText = waitText ? ` Bạn có thể thử lại sau ${waitText}.` : "";

      // Format reset time for user (e.g., "23:59" or "HH:mm tomorrow")
      let resetTimeString = "";
      if (resetTime) {
        const hours = resetTime.getHours().toString().padStart(2, "0");
        const minutes = resetTime.getMinutes().toString().padStart(2, "0");
        resetTimeString = ` lúc ${hours}:${minutes}`;
      }

      if (remaining === 0) {
        return `Bạn đã dùng hết ${limit} lượt tạo lịch trình AI hôm nay. Hạn mức sẽ được đặt lại ${resetTimeString}.${retryText}`;
      } else {
        return `Còn ${remaining} lượt tạo lịch trình AI hôm nay (${limit} lượt tổng).`;
      }
    }

    // Fallback to default message
    const quotaLimit = context?.quotaLimit ?? 3;
    return `Bạn đã dùng hết ${quotaLimit} lượt tạo lịch trình AI hôm nay. Vui lòng thử lại vào ngày mai.`;
  }

  // 503 Service Unavailable
  if (status === 503) {
    const errorCode = typeof body.error_code === "string" ? body.error_code : "";
    const detail = typeof body.detail === "string" ? body.detail : "";
    const detailLower = detail.toLowerCase();

    // AI provider timeout — slow / no response within the dynamic timeout.
    if (errorCode === "AI_PROVIDER_TIMEOUT") {
      return "Dịch vụ AI đang phản hồi quá lâu nên chưa thể tạo lịch trình. Chưa có lịch trình nào được lưu. Vui lòng thử lại sau, hoặc tạo chuyến đi ngắn hơn 1–2 ngày để kiểm tra nhanh.";
    }

    // AI provider overload / upstream 503 — the provider responded fast with a
    // server-side failure. Distinct from timeout; show an accurate message
    // instead of misclassifying overload as "phản hồi quá lâu".
    if (errorCode === "AI_PROVIDER_OVERLOADED") {
      return "Dịch vụ AI đang tạm thời quá tải. Vui lòng thử lại sau ít phút. Chưa có lịch trình nào được lưu.";
    }

    // Cache / infrastructure issues (e.g. Redis down)
    if (detailLower.includes("redis") || detailLower.includes("cache")) {
      return "Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau.";
    }

    return "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.";
  }

  // 500+ Server errors
  if (status >= 500) {
    return "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
  }

  // Fallback for other 4xx errors
  return "Không thể tạo lịch trình. Vui lòng thử lại.";
}
