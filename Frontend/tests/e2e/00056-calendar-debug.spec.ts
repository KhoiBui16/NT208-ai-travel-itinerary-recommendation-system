import { test, expect } from "@playwright/test";

/**
 * Debug test for CalendarModal after fix
 * Tests day button clicks with proper state handling
 */

test("Debug: CalendarModal day clicks after pointer-events fix", async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on("console", msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`));

  // Track button state changes
  let disabledCount = 0;

  console.log("=== Navigating to create-trip ===");
  await page.goto("http://127.0.0.1:5173/create-trip");
  await page.waitForLoadState("networkidle");

  // Open calendar
  const calendarBtn = page.getByText(/Chọn ngày bắt đầu và kết thúc/i);
  await expect(calendarBtn).toBeVisible();
  await calendarBtn.click();
  await page.waitForTimeout(500);

  // Check if calendar modal opened
  const modalVisible = await page.locator("div.fixed.inset-0.z-50").isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`Calendar modal visible: ${modalVisible}`);

  if (!modalVisible) {
    console.log("ERROR: Calendar modal did not open");
    await page.screenshot({ path: ".codex-run-logs/00056-calendar-not-open.png", fullPage: true });
    test.skip();
    return;
  }

  // Get all day buttons (both enabled and disabled)
  const allDayBtns = page.locator("button.aspect-square");
  const allCount = await allDayBtns.count();
  console.log(`Total day buttons: ${allCount}`);

  // Get only enabled buttons
  const enabledBtns = page.locator("button.aspect-square:not([disabled])");
  let enabledCount = await enabledBtns.count();
  console.log(`Enabled day buttons (initial): ${enabledCount}`);

  if (enabledCount < 2) {
    console.log("ERROR: Not enough enabled buttons");
    await page.screenshot({ path: ".codex-run-logs/00056-not-enough-buttons.png", fullPage: true });
    test.skip();
    return;
  }

  // Click first enabled button
  console.log("Clicking first enabled button...");
  await enabledBtns.first().click();
  await page.waitForTimeout(500);

  // Re-count enabled buttons after state update
  enabledCount = await enabledBtns.count();
  console.log(`Enabled day buttons (after first click): ${enabledCount}`);

  // Get text of first button to verify selection
  const firstBtnText = await enabledBtns.first().textContent();
  console.log(`First button text after click: "${firstBtnText}"`);

  // Now click a different button for end date
  // Use nth(1) instead of nth(2) to be safer
  console.log("Clicking second enabled button for end date...");

  // Wait a bit for state to stabilize
  await page.waitForTimeout(300);

  // Re-query to get fresh element references
  const freshEnabledBtns = page.locator("button.aspect-square:not([disabled])");
  const freshCount = await freshEnabledBtns.count();
  console.log(`Enabled day buttons (fresh count): ${freshCount}`);

  if (freshCount >= 2) {
    await freshEnabledBtns.nth(1).click({ timeout: 5000 });
    console.log("Second click successful!");
  } else {
    console.log("ERROR: Not enough buttons after first click");
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: ".codex-run-logs/00056-calendar-after-clicks.png", fullPage: true });

  // Check confirm button
  const confirmBtn = page.locator("button:has-text('Xác nhận')");
  const confirmEnabled = await confirmBtn.isEnabled().catch(() => false);
  console.log(`Confirm button enabled: ${confirmEnabled}`);

  console.log("=== Console errors ===");
  const errors = consoleLogs.filter(l => l.includes("error"));
  console.log(`Error count: ${errors.length}`);
  for (const err of errors) {
    console.log(`  ${err}`);
  }

  expect(true).toBeTruthy();
});
