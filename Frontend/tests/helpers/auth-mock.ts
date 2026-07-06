/**
 * Auth Mock Helper for E2E Tests
 *
 * Cung cấp utilities để mock authentication state trong Playwright tests.
 * Giải quyết vấn đề: localStorage tokens không trigger AuthContext state.
 *
 * Usage:
 * ```typescript
 * import { mockAuthenticatedUser, setMockAuthState } from '../helpers/auth-mock';
 *
 * test.beforeEach(async ({ page }) => {
 *   await page.addInitScript(setMockAuthState(mockAuthenticatedUser));
 * });
 * ```
 */

export interface MockAuthState {
  isAuthenticated: boolean;
  user?: {
    id: number;
    email: string;
    name: string;
    phone?: string | null;
    interests?: string[];
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Mock authenticated user state - dùng cho tests cần login
 */
export const mockAuthenticatedUser: MockAuthState = {
  isAuthenticated: true,
  user: {
    id: 77,
    email: "test@example.com",
    name: "Test User",
    phone: null,
    interests: ["culture"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
};

/**
 * Mock guest user state - dùng cho tests không cần login
 */
export const mockGuestUser: MockAuthState = {
  isAuthenticated: false,
};

/**
 * Generate script to set mock auth state in browser
 *
 * @param state - Auth state to mock
 * @returns JavaScript code string for addInitScript
 */
export function setMockAuthState(state: MockAuthState): string {
  return `
    // Store mock state globally for AuthContext to read
    (window as any).__MOCK_AUTH_STATE__ = ${JSON.stringify(state)};

    // Also set localStorage for API calls
    if (state.accessToken) {
      localStorage.setItem("accessToken", state.accessToken);
    }
    if (state.refreshToken) {
      localStorage.setItem("refreshToken", state.refreshToken);
    }

    // Mock user profile in localStorage for some components
    if (state.user) {
      localStorage.setItem("userProfile", JSON.stringify(state.user));
    }

    console.log('[Auth Mock] State set:', ${JSON.stringify({
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user,
      hasTokens: !!(state.accessToken && state.refreshToken),
    })});
  `;
}

/**
 * Setup authenticated page with mock user
 *
 * @param page - Playwright page object
 * @param user - Optional custom user state (defaults to mockAuthenticatedUser)
 */
export async function setupAuthenticatedPage(
  page: any,
  user: MockAuthState = mockAuthenticatedUser,
): Promise<void> {
  await page.addInitScript(setMockAuthState(user));
}

/**
 * Clear all auth state from browser
 *
 * @param page - Playwright page object
 */
export async function clearAuthState(page: any): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__MOCK_AUTH_STATE__ = { isAuthenticated: false };
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Create custom mock user state
 *
 * @param overrides - Properties to override from default mockAuthenticatedUser
 * @returns Custom MockAuthState
 */
export function createMockUser(overrides: Partial<MockAuthState>): MockAuthState {
  return {
    ...mockAuthenticatedUser,
    ...overrides,
    user: {
      ...mockAuthenticatedUser.user,
      ...overrides.user,
    },
  };
}
