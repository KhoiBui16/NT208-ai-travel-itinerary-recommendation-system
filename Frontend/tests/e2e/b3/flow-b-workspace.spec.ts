/**
 * B3 Flow B — TripWorkspace render for existing Hà Nội trip
 * Uses auth user b2test_matrix@example.com + trip_id=235
 *
 * NOTE: This is a local-only fullstack test that requires:
 * - Backend running on http://localhost:8000
 * - Frontend dev server
 * - Seeded test user (b2test_matrix@example.com)
 * - Existing trip_id=235 in database
 * - Not CI-safe by default; use FULLSTACK_E2E=1 to run
 */
import { test, expect } from "@playwright/test";

test.skip(process.env.FULLSTACK_E2E !== "1", "Local-only fullstack test - requires backend/frontend/seeded data. Set FULLSTACK_E2E=1 to run.");

const TEST_EMAIL = "b2test_matrix@example.com";
const TEST_PASSWORD = "B2Test1234!";
const TRIP_ID = 235;

test("Flow B: Login and open TripWorkspace for Hà Nội trip_id=235", async ({ page }) => {
  const networkErrors: { url: string; status: number }[] = [];
  const consoleErrors: string[] = [];

  page.on("response", (res) => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // 1. Login
  await page.goto("/login");
  await page.screenshot({ path: ".codex-run-logs/flow-b-01-login-page.png", fullPage: true });

  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').or(page.locator('button:has-text("Đăng nhập")')).first().click();

  await page.waitForTimeout(2000);
  await page.screenshot({ path: ".codex-run-logs/flow-b-02-after-login.png", fullPage: true });
  console.log("After login URL:", page.url());

  // 2. Navigate to TripWorkspace
  await page.goto(`/trip-workspace?tripId=${TRIP_ID}`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: ".codex-run-logs/flow-b-03-workspace-loaded.png", fullPage: true });
  console.log("Workspace URL:", page.url());

  // 3. Check page content
  const pageContent = await page.content();
  const hasHaNoi = pageContent.includes("Hà Nội") || pageContent.includes("Ha Noi") || pageContent.includes("ha-noi");
  const hasActivities = pageContent.includes("activity") || pageContent.includes("hoạt động") || pageContent.includes("Hoạt động");
  const hasFloatingChat = pageContent.includes("FloatingAI") || pageContent.includes("chat") || pageContent.includes("Chat") || pageContent.includes("AI");

  console.log("=== FLOW B RESULTS ===");
  console.log("Page URL:", page.url());
  console.log("Has Hà Nội content:", hasHaNoi);
  console.log("Has activities:", hasActivities);
  console.log("Has floating chat:", hasFloatingChat);
  console.log("Network errors (4xx/5xx):", JSON.stringify(networkErrors));
  console.log("Console errors:", consoleErrors);

  // Check for FloatingAIChat specifically
  const floatingChat = page.locator('[class*="FloatingAI"], [class*="floating-chat"], button:has-text("AI"), [aria-label*="chat"]').first();
  const chatVisible = await floatingChat.isVisible({ timeout: 2000 }).catch(() => false);
  console.log("FloatingAIChat visible:", chatVisible);

  if (chatVisible) {
    await page.screenshot({ path: ".codex-run-logs/flow-b-04-floating-chat-visible.png", fullPage: true });
  }

  // 4. Scroll to see full workspace
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".codex-run-logs/flow-b-05-workspace-scrolled.png", fullPage: true });

  // 5. Check if redirected to login (ProtectedRoute fail)
  const finalUrl = page.url();
  const wasRedirectedToLogin = finalUrl.includes("/login");
  console.log("Was redirected to login:", wasRedirectedToLogin);

  expect(wasRedirectedToLogin).toBeFalsy(); // Should NOT redirect if login worked
});
