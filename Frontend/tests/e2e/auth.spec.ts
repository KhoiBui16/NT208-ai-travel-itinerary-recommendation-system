import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

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
    const API_URL = process.env.E2E_API_URL || "http://localhost:8000";
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
});
