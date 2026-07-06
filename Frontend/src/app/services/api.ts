/**
 * Centralized API client for DuLichViet Backend.
 *
 * Features:
 * - Automatically injects JWT Bearer token on every request
 * - On 401, attempts one silent token refresh then retries the request
 * - All methods return typed JSON; non-2xx throws ApiError
 * - Rate limit headers (X-RateLimit-*) are parsed and attached to errors
 *
 * Usage:
 *   import { api } from "./api";
 *   const data = await api.get<MyType>("/api/v1/some-endpoint");
 */

// Backend base URL — configurable via VITE_API_URL environment variable
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ===================================================================
// Token helpers — localStorage-based JWT token management
// ===================================================================

const ACCESS_KEY = "accessToken"; // localStorage key for JWT access token
const REFRESH_KEY = "refreshToken"; // localStorage key for JWT refresh token

/** Retrieve the current access token from localStorage. */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

/** Retrieve the current refresh token from localStorage. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/** Store both access and refresh tokens in localStorage. */
export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

/** Clear all auth tokens from localStorage (logout). */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ===================================================================
// Error class — Typed API error with rate limit info
// ===================================================================

/** Parsed rate limit headers from API responses. */
export interface RateLimitInfo {
  limit: number; // Maximum requests allowed in the window
  remaining: number; // Remaining requests in current window
  resetAt: string; // ISO timestamp when the window resets
  retryAfter?: number; // Seconds to wait before retrying (429 only)
}

/**
 * Custom error class for non-2xx API responses.
 *
 * Extracts the `detail` field from the error body for user-friendly
 * messages. Supports both string details and Pydantic validation
 * error arrays.
 */
export class ApiError extends Error {
  constructor(
    public status: number, // HTTP status code
    public body: Record<string, unknown>, // Full error response body
    public headers: RateLimitInfo | null = null, // Rate limit info (if present)
  ) {
    // Extract human-readable message from the error body
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? (body.detail as Array<{ msg: string }>).map((d) => d.msg).join(", ")
          : JSON.stringify(body);
    super(detail);
    this.name = "ApiError";
  }
}

// ===================================================================
// Core fetch wrapper — Request execution with auth injection
// ===================================================================

/**
 * Execute an authenticated API request.
 *
 * Automatically:
 * 1. Sets Content-Type: application/json
 * 2. Injects Bearer token from localStorage
 * 3. On 401, attempts silent token refresh and retries once
 * 4. Parses response as typed JSON
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  // Build headers with content type and auth token
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Inject Bearer token if available
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  // --- Silent refresh on 401 (Unauthorized) ---
  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry the original request with the new access token
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(url, { ...options, headers });
      return parseResponse<T>(retry);
    }
    // Refresh failed — clear tokens; caller should redirect to login
    clearTokens();
  }

  return parseResponse<T>(res);
}

/**
 * Parse an API response — handle 204, extract rate limit headers, throw on error.
 */
async function parseResponse<T>(res: Response): Promise<T> {
  // 204 No Content — return undefined (for DELETE operations)
  if (res.status === 204) return undefined as T;

  const body = await res.json();

  // Extract rate limit headers if present (X-RateLimit-*)
  const rateLimitHeader = res.headers.get("X-RateLimit-Limit");
  let rateLimitInfo: RateLimitInfo | null = null;
  if (rateLimitHeader) {
    const limit = parseInt(rateLimitHeader, 10);
    const remaining = parseInt(res.headers.get("X-RateLimit-Remaining") || "0", 10);
    const resetAt = res.headers.get("X-RateLimit-Reset") || "";
    const retryAfter = res.headers.get("Retry-After");
    rateLimitInfo = {
      limit,
      remaining,
      resetAt,
      ...(retryAfter && { retryAfter: parseInt(retryAfter, 10) }),
    };
  }

  // Throw ApiError for non-2xx responses
  if (!res.ok) {
    throw new ApiError(res.status, body, rateLimitInfo);
  }
  return body as T;
}

// ===================================================================
// Refresh logic — Silent JWT token renewal
// ===================================================================

/** Singleton promise to prevent concurrent refresh attempts. */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 *
 * Deduplicates concurrent refresh attempts — if multiple requests
 * trigger 401 simultaneously, only one refresh call is made and
 * all waiters share the same result.
 */
async function tryRefresh(): Promise<boolean> {
  // Return existing refresh attempt if one is in progress
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;

      // Store the new token pair
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      // Clear the singleton so future 401s can trigger a new refresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ===================================================================
// Convenience methods — Public API client interface
// ===================================================================

/**
 * Public API client object with typed HTTP methods.
 *
 * Usage:
 *   api.get<UserResponse>("/api/v1/users/me")
 *   api.post<TripResponse>("/api/v1/itineraries", tripData)
 *   api.put<TripResponse>("/api/v1/itineraries/1", updateData)
 *   api.delete("/api/v1/itineraries/1")
 */
export const api = {
  /** Send a GET request and return typed JSON response. */
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  /** Send a POST request with optional JSON body. */
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /** Send a PUT request with optional JSON body. */
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /** Send a PATCH request with optional JSON body. */
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /** Send a DELETE request. Returns void for 204 responses. */
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
