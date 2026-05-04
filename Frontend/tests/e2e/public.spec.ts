import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/login");
    // The Login page heading is "Chào mừng bạn trở lại!"
    await expect(page.getByRole("heading", { name: /chào mừng/i })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL("/register");
    await expect(page.getByRole("heading", { name: /đăng ký/i })).toBeVisible();
  });

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL("/forgot-password");
  });

  test("not-found page for invalid route", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({ timeout: 10_000 });
  });
});
