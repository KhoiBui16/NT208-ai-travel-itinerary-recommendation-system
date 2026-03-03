/**
 * ============================================
 * auth.ts — Authentication & Data utilities
 * ============================================
 * Tích hợp Backend API thực tế (FastAPI).
 * JWT token lưu localStorage, user info cache localStorage.
 * Tất cả hàm auth/itinerary gọi BE qua api.ts.
 * ============================================
 */

import {
  type User,
  type Itinerary,
  type ItineraryDay,
  type Activity,
  getToken,
  setToken,
  removeToken,
  apiRegister,
  apiLogin,
  apiGetProfile,
  apiUpdateProfile,
  apiGetItineraries,
  apiGetItinerary,
  apiDeleteItinerary,
  apiRateItinerary,
  ApiError,
} from './api';

// Re-export types for backward compatibility
export type { User, Itinerary, ItineraryDay, Activity };

// ==================== User State (localStorage cache) ====================

/**
 * Lấy current user từ localStorage cache.
 * Đây là cache — source of truth là BE API.
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Lưu user info vào localStorage cache.
 */
export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

// ==================== Auth Functions (async → BE API) ====================

/**
 * Đăng ký tài khoản mới qua BE API.
 * POST /api/v1/auth/register
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const res = await apiRegister(email, password, name);
    if (res.success && res.access_token && res.user) {
      setToken(res.access_token);
      setCurrentUser(res.user);
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error || 'Đăng ký thất bại' };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Không thể kết nối server. Vui lòng thử lại sau.' };
  }
}

/**
 * Đăng nhập qua BE API.
 * POST /api/v1/auth/login
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const res = await apiLogin(email, password);
    if (res.success && res.access_token && res.user) {
      setToken(res.access_token);
      setCurrentUser(res.user);
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error || 'Đăng nhập thất bại' };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Không thể kết nối server. Vui lòng thử lại sau.' };
  }
}

/**
 * Đăng xuất — xóa token + user cache.
 */
export function logoutUser(): void {
  removeToken();
  setCurrentUser(null);
}

/**
 * Cập nhật profile qua BE API.
 * PUT /api/v1/users/profile
 */
export async function updateUserProfile(
  _userId: string,
  updates: Partial<User>
): Promise<User | null> {
  try {
    const user = await apiUpdateProfile({
      name: updates.name,
      phone: updates.phone,
      interests: updates.interests,
    });
    setCurrentUser(user);
    return user;
  } catch {
    return null;
  }
}

/**
 * Lấy profile mới nhất từ BE (refresh cache).
 * GET /api/v1/users/profile
 */
export async function refreshUserProfile(): Promise<User | null> {
  try {
    const user = await apiGetProfile();
    setCurrentUser(user);
    return user;
  } catch {
    // Token hết hạn hoặc lỗi → đăng xuất
    logoutUser();
    return null;
  }
}

// ==================== Itinerary Functions (async → BE API) ====================

/**
 * Lấy danh sách lịch trình đã lưu từ BE.
 * GET /api/v1/itineraries/
 */
export async function getSavedItineraries(_userId?: string): Promise<Itinerary[]> {
  try {
    const res = await apiGetItineraries();
    return res.itineraries;
  } catch {
    return [];
  }
}

/**
 * Lấy chi tiết lịch trình từ BE.
 * GET /api/v1/itineraries/{id}
 */
export async function getItineraryById(id: string): Promise<Itinerary | null> {
  try {
    return await apiGetItinerary(id);
  } catch {
    return null;
  }
}

/**
 * Xóa lịch trình từ BE.
 * DELETE /api/v1/itineraries/{id}
 */
export async function deleteItinerary(id: string): Promise<void> {
  await apiDeleteItinerary(id);
}

/**
 * Đánh giá lịch trình qua BE.
 * PUT /api/v1/itineraries/{id}/rating
 */
export async function rateItinerary(
  id: string,
  rating: number,
  feedback?: string
): Promise<Itinerary | null> {
  try {
    return await apiRateItinerary(id, rating, feedback);
  } catch {
    return null;
  }
}

/**
 * Kiểm tra đã đăng nhập chưa.
 * Kiểm tra cả token và user cache.
 */
export function isAuthenticated(): boolean {
  return getToken() !== null && getCurrentUser() !== null;
}

/**
 * Hàm tiện ích — lưu itinerary (no-op, BE tự lưu khi generate).
 * Giữ để backward compat, không cần gọi API.
 */
export function saveItinerary(_itinerary: Itinerary): void {
  // BE already saves on generate. No client-side action needed.
}
