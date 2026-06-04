import { api } from "./api";
import type { UserResponse } from "./auth";

// ---------- Users API (EP-5, EP-6, EP-7) ----------
// Tất cả endpoint đều yêu cầu Bearer token (Authorization header)
// Token được api.ts tự động đính kèm từ localStorage

/**
 * EP-5: Lấy thông tin hồ sơ của user đang đăng nhập.
 * GET /api/v1/users/profile
 * @returns Thông tin public của user: id, email, name, phone, interests, isActive, timestamps
 */

export async function getProfile(): Promise<UserResponse> {
  return api.get<UserResponse>("/api/v1/users/profile");
}

/**
 * EP-6: Cập nhật hồ sơ cá nhân (partial update).
 * PUT /api/v1/users/profile
 * - Chỉ gửi field cần thay đổi; field không có trong payload sẽ được giữ nguyên
 * - Email không thể cập nhật qua endpoint này (BE readonly)
 * @param data Các field cần cập nhật: name, phone, interests (tất cả optional)
 * @returns UserResponse mới nhất sau khi cập nhật
 */
export async function updateProfile(data: {
  name?: string;
  phone?: string;
  interests?: string[];
}): Promise<UserResponse> {
  return api.put<UserResponse>("/api/v1/users/profile", data);
}

/**
 * EP-7: Đổi mật khẩu của user đang đăng nhập.
 * PUT /api/v1/users/password
 * - BE xác minh currentPassword với bcrypt hash trước khi cho phép đổi
 * - newPassword phải >= 6 ký tự (validate ở BE schema)
 * - Mapping field: camelCase FE → snake_case BE (api.ts tự convert)
 * @param data.currentPassword Mật khẩu hiện tại để xác minh
 * @param data.newPassword Mật khẩu mới (min 6 ký tự)
 * @returns { success: true, message: "Password changed successfully" }
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return api.put("/api/v1/users/password", data);
}
