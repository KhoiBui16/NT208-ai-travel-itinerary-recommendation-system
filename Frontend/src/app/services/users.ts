import { api } from "./api";
import type { UserResponse } from "./auth";

// ---------- Users API ----------

export async function getProfile(): Promise<UserResponse> {
  return api.get<UserResponse>("/api/v1/users/profile");
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
  interests?: string[];
}): Promise<UserResponse> {
  return api.put<UserResponse>("/api/v1/users/profile", data);
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return api.put("/api/v1/users/password", data);
}
