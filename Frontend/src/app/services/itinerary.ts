/**
 * Itinerary API service — Nhóm Trip
 *
 * Tất cả API calls cho nhóm Trip, giao tiếp với BE endpoints:
 *   • Trip CRUD           — list, get, create, generate, update, delete
 *   • Rating & Share      — rate, share, getShared, claim
 *   • Activity CRUD       — add, update, delete
 *   • Accommodation CRUD  — add, delete
 *
 * Response types match BE CamelCaseModel (auto camelCase ↔ snake_case).
 */

import { api } from "./api";


// ===========================================================================
// 1. Types — Match BE CamelCaseModel response schemas
// ===========================================================================


/** Thông tin số lượng du khách */
export interface TravelerInfo {
  adults: number;
  children: number;
  total: number;
}

/** Hoạt động trong ngày (match BE ActivitySchema) */
export interface ActivityItem {
  id?: number;
  time: string;                    // Giờ bắt đầu (HH:MM)
  endTime?: string;                // Giờ kết thúc
  name: string;
  location: string;
  description: string;
  type: string;                    // food|attraction|nature|entertainment|shopping
  image?: string;
  transportation?: string;        // walk|bike|bus|taxi
  adultPrice?: number;             // Giá vé/ăn người lớn (VNĐ)
  childPrice?: number;             // Giá vé/ăn trẻ em (VNĐ)
  customCost?: number;             // Chi phí tùy chỉnh (VNĐ)
  busTicketPrice?: number;         // Giá vé bus/người (VNĐ)
  taxiCost?: number;               // Tổng chi phí taxi (VNĐ)
  extraExpenses?: unknown[];       // Chi phí phát sinh
}

/** Một ngày trong lịch trình (match BE DaySchema) */
export interface DayItem {
  id: number;
  label?: string;                  // "Ngày 1 - Hà Nội"
  date?: string;                   // ISO date
  destinationName?: string;        // Tên điểm đến
  activities: ActivityItem[];
}

/** Chỗ ở (match BE AccommodationSchema) */
export interface AccommodationItem {
  id?: number;
  hotel?: unknown;                 // Hotel entity (nếu có)
  dayIds: number[];                // IDs các ngày sử dụng
  bookingType?: string;            // hourly|nightly|daily
  duration?: number;               // Số đêm/giờ/ngày
  name?: string;                   // Tên chỗ ở
  checkIn?: string;                // Check-in
  checkOut?: string;               // Check-out
  pricePerNight?: number;          // Giá/đêm (VNĐ)
  totalPrice?: number;             // Tổng giá (VNĐ)
}

/** Response đầy đủ của lịch trình (match BE ItineraryResponse) */
export interface ItineraryResponse {
  id: number;
  destination: string;
  tripName: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalCost: number;
  travelerInfo: TravelerInfo;
  interests: string[];
  days: DayItem[];
  accommodations: AccommodationItem[];
  claimToken: string | null;       // Chỉ có khi guest tạo trip
  createdAt: string;
  updatedAt: string;
}

/** Danh sách lịch trình phân trang */
interface PaginatedResponse {
  items: ItineraryResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/** Response chia sẻ lịch trình */
interface ShareResponse {
  shareUrl: string;
  shareToken: string;
  expiresAt: string | null;
}


// ===========================================================================
// 2. Trip API — CRUD lịch trình
// ===========================================================================


/** Lấy danh sách lịch trình của user (phân trang) */
export async function listItineraries(
  page = 1,
  size = 20,
): Promise<PaginatedResponse> {
  return api.get<PaginatedResponse>(
    `/api/v1/itineraries?page=${page}&size=${size}`,
  );
}

/** Lấy chi tiết lịch trình theo ID */
export async function getItinerary(tripId: number): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/itineraries/${tripId}`);
}

/** Tạo lịch trình thủ công (manual) */
export async function createItinerary(data: {
  destination: string;
  tripName: string;
  startDate: string;
  endDate: string;
  budget: number;
  adultsCount?: number;
  childrenCount?: number;
  interests?: string[];
}): Promise<ItineraryResponse> {
  return api.post<ItineraryResponse>("/api/v1/itineraries", data);
}

/** Tạo lịch trình bằng AI (Phase C.1) */
export async function generateItinerary(data: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  adults?: number;
  children?: number;
  interests?: string[];
}): Promise<ItineraryResponse> {
  return api.post<ItineraryResponse>("/api/v1/itineraries/generate", data);
}

/** Cập nhật lịch trình (auto-save pattern) */
export async function updateItinerary(
  tripId: number,
  data: {
    tripName?: string;
    budget?: number;
    days?: DayItem[];
    accommodations?: AccommodationItem[];
  },
): Promise<ItineraryResponse> {
  return api.put<ItineraryResponse>(`/api/v1/itineraries/${tripId}`, data);
}

/** Xóa lịch trình */
export async function deleteItinerary(tripId: number): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}`);
}


// ===========================================================================
// 3. Rating & Share — Đánh giá và chia sẻ lịch trình
// ===========================================================================


/** Đánh giá lịch trình (1-5 sao) */
export async function rateItinerary(
  tripId: number,
  rating: number,
): Promise<{ success: boolean; message: string }> {
  return api.put(
    `/api/v1/itineraries/${tripId}/rating?rating=${rating}`,
    null,
  );
}

/** Chia sẻ lịch trình qua link công khai */
export async function shareItinerary(
  tripId: number,
): Promise<ShareResponse> {
  return api.post<ShareResponse>(`/api/v1/itineraries/${tripId}/share`);
}

/** Lấy lịch trình qua share token (public, không cần auth) */
export async function getSharedItinerary(
  shareToken: string,
): Promise<ItineraryResponse> {
  return api.get<ItineraryResponse>(`/api/v1/shared/${shareToken}`);
}

/** Guest claim trip sau khi đăng nhập */
export async function claimItinerary(
  tripId: number,
  claimToken: string,
): Promise<{ claimed: boolean; tripId: number }> {
  return api.post(`/api/v1/itineraries/${tripId}/claim`, { claimToken });
}


// ===========================================================================
// 4. Nested: Activities — Thêm/sửa/xóa hoạt động
// ===========================================================================


/** Thêm activity vào ngày cụ thể */
export async function addActivity(
  tripId: number,
  dayId: number,
  activity: Omit<ActivityItem, "id">,
): Promise<ActivityItem> {
  return api.post<ActivityItem>(
    `/api/v1/itineraries/${tripId}/activities?day_id=${dayId}`,
    activity,
  );
}

/** Cập nhật thông tin activity */
export async function updateActivity(
  tripId: number,
  activityId: number,
  activity: ActivityItem,
): Promise<ActivityItem> {
  return api.put<ActivityItem>(
    `/api/v1/itineraries/${tripId}/activities/${activityId}`,
    activity,
  );
}

/** Xóa activity */
export async function deleteActivity(
  tripId: number,
  activityId: number,
): Promise<void> {
  return api.delete(`/api/v1/itineraries/${tripId}/activities/${activityId}`);
}


// ===========================================================================
// 5. Nested: Accommodations — Thêm/xóa chỗ ở
// ===========================================================================


/** Thêm accommodation vào trip */
export async function addAccommodation(
  tripId: number,
  accommodation: AccommodationItem,
): Promise<AccommodationItem> {
  return api.post<AccommodationItem>(
    `/api/v1/itineraries/${tripId}/accommodations`,
    accommodation,
  );
}

/** Xóa accommodation */
export async function deleteAccommodation(
  tripId: number,
  accommodationId: number,
): Promise<void> {
  return api.delete(
    `/api/v1/itineraries/${tripId}/accommodations/${accommodationId}`,
  );
}
