import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import * as authService from "../services/auth";
import * as userService from "../services/users";
import type { UserResponse } from "../services/auth";
import { getAccessToken, getRefreshToken, clearTokens } from "../services/api";

// ---------- Context shape ----------

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  loading: boolean; // initial profile fetch
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------- Provider ----------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = user !== null;

  // Fetch profile on mount if token exists
  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    userService
      .getProfile()
      .then(setUser)
      .catch(() => {
        // Token invalid or expired — clear and stay logged-out
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      phone?: string,
    ) => {
      const res = await authService.register({ email, password, name, phone });
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    if (rt) {
      await authService.logout(rt);
    } else {
      clearTokens();
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await userService.getProfile();
    setUser(profile);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
