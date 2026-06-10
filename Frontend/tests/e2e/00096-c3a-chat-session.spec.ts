/**
 * C3A-4: Chat Session E2E Tests
 *
 * Tests for companion chat session functionality:
 * - Authenticated user can create chat sessions
 * - Authenticated user can see chat sessions list
 * - Guest cannot access chat session features
 * - Cross-user chat session access is blocked
 * - Chat session persists after page reload
 */

import { test, expect } from "@playwright/test";
import { apiRegister, injectAuth } from "./helpers/auth";

const API_URL = process.env.E2E_API_URL || "http://localhost:8000";

// Check if backend is available before running chat tests
async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    test.skip(true, "Backend API not available. These are integration tests that require the backend server.");
  }
});

/** Create a trip via BE API and return its ID. */
async function createTripViaAPI(accessToken: string) {
  const res = await fetch(`${API_URL}/api/v1/itineraries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      destination: "Hanoi",
      tripName: "E2E Chat Test Trip",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      budget: 5000000,
      adultsCount: 2,
      childrenCount: 0,
      interests: ["food"],
    }),
  });
  if (!res.ok) throw new Error(`Create trip failed: ${res.status}`);
  return res.json() as Promise<{ id: number }>;
}

/** Create a guest trip via BE API and return its ID and claimToken. */
async function createGuestTripViaAPI() {
  const res = await fetch(`${API_URL}/api/v1/itineraries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: "Hanoi",
      tripName: "E2E Guest Chat Test Trip",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      budget: 5000000,
      adultsCount: 1,
      childrenCount: 0,
      interests: ["food"],
    }),
  });
  if (!res.ok) throw new Error(`Create guest trip failed: ${res.status}`);
  return res.json() as Promise<{ id: number; claimToken: string }>;
}

test.describe("C3A Chat Session", () => {
  test("authenticated user can create chat session for own trip", async ({
    page,
  }) => {
    const email = `e2e_chat_create_${Date.now()}@test.com`;
    const tokens = await apiRegister(email, "password123", "Chat Creator");
    await injectAuth(page, tokens.accessToken, tokens.refreshToken);

    // Create a trip
    const trip = await createTripViaAPI(tokens.accessToken);

    // Navigate to trip workspace
    await page.goto(`/trip-workspace?tripId=${trip.id}`);
    await expect(page).toHaveURL(/trip-workspace/);

    // Click on AI Chat tab in right panel
    const chatTab = page.getByRole("button", { name: "AI Chat" });
    await expect(chatTab).toBeVisible();
    await chatTab.click();

    // Should show empty state initially
    await expect(
      page.getByText(/Chưa có phiên chat cho chuyến đi này/i),
    ).toBeVisible();

    // Click "Bắt đầu cuộc trò chuyện" button
    const createSessionBtn = page.getByRole("button", {
      name: /Bắt đầu cuộc trò chuyện/i,
    });
    await expect(createSessionBtn).toBeVisible();
    await createSessionBtn.click();

    // Should show loading state
    await expect(page.locator(".animate-spin")).toBeVisible();

    // After creation, should show active session state
    // Wait for session to be created
    await page.waitForTimeout(2000);

    // Should show session header with session ID
    await expect(page.getByText(/Companion Chat/i)).toBeVisible();
    await expect(page.getByText(/Phiên:/i)).toBeVisible();

    // Should show status badge
    await expect(page.getByText(/active/i)).toBeVisible();

    // Should show thread ID placeholder
    await expect(page.getByText(/Thread ID:/i)).toBeVisible();
  });

  test("authenticated user can see chat sessions list for their trip", async ({
    page,
  }) => {
    const email = `e2e_chat_list_${Date.now()}@test.com`;
    const tokens = await apiRegister(email, "password123", "Chat Lister");
    await injectAuth(page, tokens.accessToken, tokens.refreshToken);

    // Create a trip
    const trip = await createTripViaAPI(tokens.accessToken);

    // Create multiple chat sessions via API
    for (let i = 0; i < 3; i++) {
      await fetch(`${API_URL}/api/v1/itineraries/${trip.id}/chat-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
    }

    // Navigate to trip workspace
    await page.goto(`/trip-workspace?tripId=${trip.id}`);
    await expect(page).toHaveURL(/trip-workspace/);

    // Click on AI Chat tab
    await page.getByRole("button", { name: "AI Chat" }).click();

    // Wait for sessions to load
    await page.waitForTimeout(2000);

    // Should show active session state (not empty)
    await expect(page.getByText(/Companion Chat/i)).toBeVisible();
    await expect(page.getByText(/Phiên:/i)).toBeVisible();

    // Should show session count
    await expect(page.getByText(/3 phiên/i)).toBeVisible();
  });

  test("guest cannot access chat session features", async ({ page }) => {
    // Create a guest trip
    const guestTrip = await createGuestTripViaAPI();

    // Navigate to trip workspace as guest (no auth)
    await page.goto(`/trip-workspace?tripId=${guestTrip.id}`);
    await expect(page).toHaveURL(/trip-workspace/);

    // Click on AI Chat tab
    await page.getByRole("button", { name: "AI Chat" }).click();

    // Should show "Save itinerary to use AI Chat" message
    await expect(
      page.getByText(/Lưu lịch trình để sử dụng tính năng AI Chat/i),
    ).toBeVisible();

    // Should show login button
    const loginBtn = page.getByRole("button", {
      name: /Đăng nhập \/ Lưu lịch trình/i,
    });
    await expect(loginBtn).toBeVisible();

    // Should NOT show create session button
    await expect(
      page.getByRole("button", { name: /Bắt đầu cuộc trò chuyện/i }),
    ).not.toBeVisible();
  });

  test("cross-user chat session access is blocked", async ({ page, context }) => {
    // Create User A and their trip + session
    const emailA = `e2e_chat_user_a_${Date.now()}@test.com`;
    const tokensA = await apiRegister(emailA, "password123", "User A");
    const tripA = await createTripViaAPI(tokensA.accessToken);

    // Create a chat session for User A's trip
    const sessionRes = await fetch(
      `${API_URL}/api/v1/itineraries/${tripA.id}/chat-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokensA.accessToken}`,
        },
      },
    );
    const sessionA = (await sessionRes.json()) as { id: number };

    // Create User B
    const emailB = `e2e_chat_user_b_${Date.now()}@test.com`;
    const tokensB = await apiRegister(emailB, "password123", "User B");
    await injectAuth(page, tokensB.accessToken, tokensB.refreshToken);

    // User B tries to access User A's trip workspace
    await page.goto(`/trip-workspace?tripId=${tripA.id}`);
    await expect(page).toHaveURL(/trip-workspace/);

    // Click on AI Chat tab
    await page.getByRole("button", { name: "AI Chat" }).click();

    // Wait for API response
    await page.waitForTimeout(2000);

    // Should show error state (403 Forbidden)
    await expect(page.getByText(/Lỗi/i)).toBeVisible();

    // Should NOT show User A's session
    await expect(page.getByText(/Phiên:/i)).not.toBeVisible();
  });

  test("chat session persists after page reload", async ({ page }) => {
    const email = `e2e_chat_persist_${Date.now()}@test.com`;
    const tokens = await apiRegister(email, "password123", "Chat Persister");
    await injectAuth(page, tokens.accessToken, tokens.refreshToken);

    // Create a trip
    const trip = await createTripViaAPI(tokens.accessToken);

    // Navigate to trip workspace
    await page.goto(`/trip-workspace?tripId=${trip.id}`);
    await expect(page).toHaveURL(/trip-workspace/);

    // Click on AI Chat tab
    await page.getByRole("button", { name: "AI Chat" }).click();

    // Create a session
    await page
      .getByRole("button", { name: /Bắt đầu cuộc trò chuyện/i })
      .click();

    // Wait for session creation
    await page.waitForTimeout(2000);

    // Verify session is visible
    await expect(page.getByText(/Phiên:/i)).toBeVisible();

    // Reload page
    await page.reload();

    // Click on AI Chat tab again (might reset to budget tab)
    await page.getByRole("button", { name: "AI Chat" }).click();

    // Wait for session to load
    await page.waitForTimeout(2000);

    // Session should still be visible
    await expect(page.getByText(/Phiên:/i)).toBeVisible();
    await expect(page.getByText(/active/i)).toBeVisible();
  });
});
