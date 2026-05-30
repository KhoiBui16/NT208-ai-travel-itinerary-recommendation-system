/**
 * B3 Flow C — Date picker observation + Create Trip page inspection
 * No generate call. Just observe UI state.
 *
 * NOTE: This is a local-only fullstack test that requires:
 * - Backend running on http://localhost:8000
 * - Frontend dev server
 * - Not CI-safe by default; use FULLSTACK_E2E=1 to run
 */
import { test } from "@playwright/test";

test.skip(process.env.FULLSTACK_E2E !== "1", "Local-only fullstack test - requires backend/frontend. Set FULLSTACK_E2E=1 to run.");

test("Flow C: Create Trip page observation - date picker and UI state", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/create-trip");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".codex-run-logs/flow-c-01-create-trip-full.png", fullPage: true });

  // Observe destination suggestions
  const destInput = page.locator('input').first();
  await destInput.fill("Hà");
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".codex-run-logs/flow-c-02-destination-suggestions.png", fullPage: true });

  // Get all suggestion texts
  const suggestions = await page.locator('button[onmousedown], [class*="suggestion"] button').allTextContents().catch(() => []);
  console.log("Destination suggestions for 'Hà':", suggestions);

  // Clear and try TP.HCM
  await destInput.fill("TP");
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".codex-run-logs/flow-c-03-tp-suggestions.png", fullPage: true });
  const tpSuggestions = await page.locator('button[onmousedown], [class*="suggestion"] button').allTextContents().catch(() => []);
  console.log("Destination suggestions for 'TP':", tpSuggestions);

  // Open calendar
  const calendarBtn = page.locator('button').filter({ hasText: /ngày|Chọn|calendar/i }).first();
  if (await calendarBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await calendarBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".codex-run-logs/flow-c-04-calendar-open.png", fullPage: true });

    // Check disabled dates
    const disabledDays = await page.locator('[aria-disabled="true"], [disabled], .rdp-day_disabled').count();
    console.log("Disabled days count:", disabledDays);

    // Check today
    const today = new Date().toISOString().split("T")[0];
    console.log("Today:", today);

    await page.keyboard.press("Escape");
  }

  // Check AI limit notice
  const limitNotice = await page.locator('text=3 lịch trình').or(page.locator('text=miễn phí')).first().textContent().catch(() => "NOT_FOUND");
  console.log("Rate limit notice:", limitNotice);

  console.log("=== FLOW C RESULTS ===");
  console.log("Console errors:", consoleErrors);
});
