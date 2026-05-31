import { test, expect, type Page } from "@playwright/test";
import { apiRegister, loginAs } from "./helpers/auth";

const API_URL = process.env.E2E_API_URL || "http://localhost:8000";

// Check if backend is available before running auth tests
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

async function createGuestTrip() {
  const res = await fetch(`${API_URL}/api/v1/itineraries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destination: "Hà Nội",
      tripName: `Guest Claim E2E ${Date.now()}`,
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      budget: 5000000,
      adultsCount: 1,
      childrenCount: 0,
      interests: ["food"],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Guest trip create failed (${res.status}): ${body}`);
  }
  const body = (await res.json()) as { id: number; claimToken: string | null };
  if (!body.claimToken) {
    throw new Error("Guest trip did not return a claimToken");
  }
  return body;
}

async function seedPendingClaim(page: Page, tripId: number, claimToken: string) {
  await page.evaluate(
    ({ tripId, claimToken }) => {
      sessionStorage.setItem(
        "pendingClaim",
        JSON.stringify({
          tripId,
          claimToken,
          returnTo: `/trip-workspace?tripId=${tripId}`,
        }),
      );
    },
    { tripId, claimToken },
  );
}

test.describe("Auth flow", () => {
  test("register → success → redirect home", async ({ page }) => {
    const email = `e2e_register_${Date.now()}@test.com`;
    await page.goto("/register");

    await page.getByPlaceholder(/họ và tên/i).fill("E2E Test User");
    await page.getByPlaceholder(/email@example.com/i).fill(email);
    await page.getByPlaceholder("••••••••").first().fill("password123");
    await page.getByPlaceholder("••••••••").last().fill("password123");
    // Use form submit selector to avoid matching "Đăng ký bằng Google" button
    await page.locator("form button[type='submit']").click();

    // Should redirect to home page after successful registration
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("login → success → redirect home", async ({ page }) => {
    // Register user via API first
    const email = `e2e_login_${Date.now()}@test.com`;
    const password = "password123";
    await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: "E2E Login User" }),
    });

    await page.goto("/login");
    await page.getByPlaceholder(/email@example.com/i).fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).toHaveURL("/");
  });

  test("protected route → redirect login → login → show page", async ({
    page,
  }) => {
    // Try accessing protected route without auth
    await page.goto("/trip-library");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    // Register + inject tokens
    const email = `e2e_protected_${Date.now()}@test.com`;
    const tokens = await loginAs(page, email, "password123", "Protected User");

    // Navigate to protected route
    await page.goto("/trip-library");
    await expect(page).toHaveURL("/trip-library");
  });

  test("guest pending claim survives login reload and opens workspace", async ({
    page,
  }) => {
    const guestTrip = await createGuestTrip();
    const email = `e2e_claim_login_${Date.now()}@test.com`;
    await apiRegister(email, "password123", "Claim Login User");

    await page.goto("/login");
    await seedPendingClaim(page, guestTrip.id, guestTrip.claimToken!);
    await page.reload();

    await page.getByPlaceholder(/email@example.com/i).fill(email);
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await page.waitForURL(
      new RegExp(`/trip-workspace\\?tripId=${guestTrip.id}`),
      { timeout: 10_000 },
    );
    await expect(page).toHaveURL(
      new RegExp(`/trip-workspace\\?tripId=${guestTrip.id}`),
    );
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("pendingClaim")))
      .toBeNull();
  });

  test("guest pending claim survives register reload and opens workspace", async ({
    page,
  }) => {
    const guestTrip = await createGuestTrip();
    const email = `e2e_claim_register_${Date.now()}@test.com`;

    await page.goto("/register");
    await seedPendingClaim(page, guestTrip.id, guestTrip.claimToken!);
    await page.reload();

    await page.getByPlaceholder(/họ và tên/i).fill("Claim Register User");
    await page.getByPlaceholder(/email@example.com/i).fill(email);
    await page.getByPlaceholder("••••••••").first().fill("password123");
    await page.getByPlaceholder("••••••••").last().fill("password123");
    await page.locator("form button[type='submit']").click();

    await page.waitForURL(
      new RegExp(`/trip-workspace\\?tripId=${guestTrip.id}`),
      { timeout: 10_000 },
    );
    await expect(page).toHaveURL(
      new RegExp(`/trip-workspace\\?tripId=${guestTrip.id}`),
    );
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("pendingClaim")))
      .toBeNull();
  });
});
