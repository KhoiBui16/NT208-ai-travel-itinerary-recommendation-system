import { api, setTokens, clearTokens } from "./api";

// ---------- Types (match BE CamelCaseModel responses) ----------

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  interests: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

interface SuccessResponse {
  success: boolean;
  message: string;
}

export type PasswordResetDeliveryMode = "smtp" | "log_only" | "disabled";

export interface ForgotPasswordResponse extends SuccessResponse {
  emailDeliveryEnabled: boolean;
  deliveryMode: PasswordResetDeliveryMode;
}

// ---------- Auth API ----------

export async function register(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/v1/auth/register", data);
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/v1/auth/login", data);
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await api.post<SuccessResponse>("/api/v1/auth/logout", { refreshToken });
  } finally {
    clearTokens();
  }
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return api.post<ForgotPasswordResponse>("/api/v1/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<SuccessResponse> {
  return api.post<SuccessResponse>("/api/v1/auth/reset-password", {
    token,
    newPassword,
  });
}
