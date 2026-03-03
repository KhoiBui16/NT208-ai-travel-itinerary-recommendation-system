/**
 * ============================================
 * api.ts — Centralized API Service Layer
 * ============================================
 * Tất cả request tới Backend đều đi qua module này.
 * - JWT token tự động gắn vào header Authorization
 * - Xử lý lỗi thống nhất
 *
 * URL Resolution (theo thứ tự ưu tiên):
 * 1. VITE_API_BASE_URL env var (set trong Vercel Dashboard)
 * 2. Auto-detect: nếu chạy trên *.vercel.app → dùng Render backend
 * 3. Fallback: http://localhost:8000/api/v1 (dev mode)
 * ============================================
 */

// --- Production Backend URL trên Render ---
const RENDER_API_URL = 'https://dulichviet-api.onrender.com/api/v1';

/**
 * Xác định API Base URL theo môi trường.
 * Ưu tiên: env var > auto-detect production > localhost fallback
 */
function resolveApiBaseUrl(): string {
  // 1. Nếu có env var, dùng luôn (ưu tiên cao nhất)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Auto-detect: chạy trên Vercel production → dùng Render backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname.includes('vercel.app') ||
      hostname.includes('ai-travel') ||
      (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
    ) {
      console.info(`[API] Production detected (${hostname}) → ${RENDER_API_URL}`);
      return RENDER_API_URL;
    }
  }

  // 3. Fallback: local development
  return 'http://localhost:8000/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();
console.info(`[API] Base URL: ${API_BASE_URL}`);

// ==================== Token Management ====================

/**
 * Lấy JWT token từ localStorage.
 */
export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * Lưu JWT token vào localStorage.
 */
export function setToken(token: string): void {
  localStorage.setItem('access_token', token);
}

/**
 * Xóa JWT token khỏi localStorage (logout).
 */
export function removeToken(): void {
  localStorage.removeItem('access_token');
}

// ==================== HTTP Helpers ====================

/**
 * Tạo headers mặc định cho request.
 * Tự động gắn Authorization: Bearer <token> nếu có.
 */
function getHeaders(includeAuth = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Xử lý response lỗi từ API.
 * BE trả về { detail: "..." } cho các lỗi.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.error || errorMessage;
    } catch {
      // Response không phải JSON
    }
    throw new ApiError(errorMessage, response.status);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Custom error class cho API errors.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ==================== API Methods ====================

/**
 * GET request.
 */
async function get<T>(path: string, includeAuth = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getHeaders(includeAuth),
  });
  return handleResponse<T>(response);
}

/**
 * POST request.
 */
async function post<T>(path: string, body?: unknown, includeAuth = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getHeaders(includeAuth),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * PUT request.
 */
async function put<T>(path: string, body?: unknown, includeAuth = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: getHeaders(includeAuth),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * DELETE request.
 */
async function del<T>(path: string, includeAuth = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getHeaders(includeAuth),
  });
  return handleResponse<T>(response);
}

// ==================== Type Definitions ====================
// Khớp 1:1 với BE schemas (auth.py, user.py, trip.py, place.py)

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  interests?: string[];
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  access_token: string | null;
  token_type: string;
  user: User | null;
  error: string | null;
}

export interface Itinerary {
  id: string;
  userId?: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
  days: ItineraryDay[];
  totalCost: number;
  createdAt: string;
  rating?: number | null;
  feedback?: string | null;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  duration: string;
  image: string;
  coordinates?: { lat: number; lng: number } | null;
}

export interface ItineraryListResponse {
  itineraries: Itinerary[];
  total: number;
}

export interface DestinationInfo {
  destination: string;
  place_count: number;
  places: PlaceInfo[];
}

export interface PlaceInfo {
  id: string;
  place_name: string;
  category?: string;
  description?: string;
  location?: string;
  cost?: number;
  duration?: string;
  image?: string;
  destination?: string;
}

// ==================== Auth API ====================

/**
 * Đăng ký tài khoản mới.
 * POST /api/v1/auth/register
 */
export async function apiRegister(email: string, password: string, name: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/register', { email, password, name }, false);
}

/**
 * Đăng nhập.
 * POST /api/v1/auth/login
 */
export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', { email, password }, false);
}

// ==================== User API ====================

/**
 * Lấy profile user hiện tại.
 * GET /api/v1/users/profile
 */
export async function apiGetProfile(): Promise<User> {
  return get<User>('/users/profile');
}

/**
 * Cập nhật profile.
 * PUT /api/v1/users/profile
 */
export async function apiUpdateProfile(data: {
  name?: string;
  phone?: string;
  interests?: string[];
}): Promise<User> {
  return put<User>('/users/profile', data);
}

// ==================== Itinerary API ====================

/**
 * Tạo lịch trình bằng AI.
 * POST /api/v1/itineraries/generate
 */
export async function apiGenerateItinerary(data: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
}): Promise<Itinerary> {
  return post<Itinerary>('/itineraries/generate', data);
}

/**
 * Lấy danh sách lịch trình đã lưu (cần đăng nhập).
 * GET /api/v1/itineraries/
 */
export async function apiGetItineraries(): Promise<ItineraryListResponse> {
  return get<ItineraryListResponse>('/itineraries/');
}

/**
 * Lấy chi tiết 1 lịch trình.
 * GET /api/v1/itineraries/{id}
 */
export async function apiGetItinerary(id: string): Promise<Itinerary> {
  return get<Itinerary>(`/itineraries/${id}`, false);
}

/**
 * Xóa lịch trình.
 * DELETE /api/v1/itineraries/{id}
 */
export async function apiDeleteItinerary(id: string): Promise<void> {
  return del<void>(`/itineraries/${id}`);
}

/**
 * Đánh giá lịch trình.
 * PUT /api/v1/itineraries/{id}/rating
 */
export async function apiRateItinerary(id: string, rating: number, feedback?: string): Promise<Itinerary> {
  return put<Itinerary>(`/itineraries/${id}/rating`, { rating, feedback });
}

/**
 * Xóa 1 activity khỏi lịch trình.
 * DELETE /api/v1/itineraries/{id}/activities/{activityId}
 */
export async function apiRemoveActivity(itineraryId: string, activityId: string): Promise<Itinerary> {
  return del<Itinerary>(`/itineraries/${itineraryId}/activities/${activityId}`);
}

// ==================== Destinations API ====================

/**
 * Lấy danh sách điểm đến.
 * GET /api/v1/destinations/
 */
export async function apiGetDestinations(): Promise<DestinationInfo[]> {
  return get<DestinationInfo[]>('/destinations/', false);
}
