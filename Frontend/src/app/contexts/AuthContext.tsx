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
import { claimItinerary } from "../services/itinerary";

const PENDING_CLAIM_KEY = "pendingClaim";

interface PendingClaim {
  tripId: number;
  claimToken: string;
  returnTo?: string;
}

interface PendingClaimResult {
  tripId: number;
  returnTo: string;
}

function tripWorkspacePath(tripId: number) {
  return `/trip-workspace?tripId=${tripId}`;
}

function claimReturnTo(pendingClaim: PendingClaim) {
  const workspacePath = tripWorkspacePath(pendingClaim.tripId);
  return pendingClaim.returnTo === workspacePath ? pendingClaim.returnTo : workspacePath;
}

function readPendingClaim(): PendingClaim | null {
  const raw = sessionStorage.getItem(PENDING_CLAIM_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingClaim>;
    if (typeof parsed.tripId !== "number" || typeof parsed.claimToken !== "string") {
      return null;
    }
    return parsed as PendingClaim;
  } catch {
    return null;
  }
}

/** Store a claim token + tripId so AuthContext can claim after login. */
export function storePendingClaim(tripId: number, claimToken: string) {
  sessionStorage.setItem(
    PENDING_CLAIM_KEY,
    JSON.stringify({ tripId, claimToken, returnTo: tripWorkspacePath(tripId) }),
  );
}

/** Execute any pending claim (called right after successful login). */
async function executePendingClaim(): Promise<PendingClaimResult | null> {
  const pendingClaim = readPendingClaim();
  if (!pendingClaim) {
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    return null;
  }

  try {
    const { tripId, claimToken } = pendingClaim;
    await claimItinerary(tripId, claimToken);
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    return {
      tripId,
      returnTo: claimReturnTo(pendingClaim),
    };
  } catch {
    // Claim failed (expired or already claimed) — silently remove
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    return null;
  }
}

// ---------- Context shape ----------

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  loading: boolean; // initial profile fetch
  login: (email: string, password: string) => Promise<PendingClaimResult | null>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) => Promise<PendingClaimResult | null>;
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
    // Claim any guest itineraries that were created before login
    return await executePendingClaim();
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
      // Claim any guest itineraries that were created before register
      return await executePendingClaim();
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
