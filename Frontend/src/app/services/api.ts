/**
 * Centralized API client for DuLichViet Backend.
 *
 * - Automatically injects JWT Bearer token on every request.
 * - On 401, attempts one silent refresh then retries.
 * - All methods return typed JSON; non-2xx throws ApiError.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ---------- Token helpers ----------

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ---------- Error class ----------

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
    public headers: RateLimitInfo | null = null,
  ) {
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

// ---------- Core fetch wrapper ----------

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  // --- Silent refresh on 401 ---
  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(url, { ...options, headers });
      return parseResponse<T>(retry);
    }
    // Refresh failed — clear tokens, caller should redirect to login
    clearTokens();
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const body = await res.json();

  // Extract rate limit headers if present
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

  if (!res.ok) {
    throw new ApiError(res.status, body, rateLimitInfo);
  }
  return body as T;
}

// ---------- Refresh logic ----------

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
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

      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------- Convenience methods ----------

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
