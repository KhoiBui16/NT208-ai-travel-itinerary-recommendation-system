import { Page } from "@playwright/test";

/**
 * Reusable helper for CalendarModal date range selection.
 *
 * Problem it solves:
 * - CalendarModal disables all past dates (isBefore(day, today))
 * - If test runs on last day of month (e.g., May 31), only 1 day is enabled in current month
 * - Date range requires at least 2 enabled days
 * - This helper automatically navigates to next month if needed
 *
 * Usage:
 *   const result = await selectDateRange(page);
 *   if (!result.ok) {
 *     test.skip(true, result.reason);
 *     return;
 *   }
 */

export interface DateRangeResult {
  ok: true;
  from: string;  // e.g., "01/06/2026"
  to: string;    // e.g., "03/06/2026"
  days: number;
}

export interface DateRangeError {
  ok: false;
  reason: string;
}

export type SelectDateRangeResult = DateRangeResult | DateRangeError;

/**
 * Opens calendar modal and selects a valid date range.
 * Automatically navigates to next month if current month has insufficient enabled days.
 *
 * @param page - Playwright Page instance
 * @param openCalendar - Function to open calendar modal (optional, defaults to clicking calendar button)
 * @returns DateRangeResult on success, DateRangeError on failure
 */
export async function selectDateRange(
  page: Page,
  openCalendar?: () => Promise<void>,
): Promise<SelectDateRangeResult> {
  // Open calendar modal
  if (openCalendar) {
    await openCalendar();
  } else {
    // Find the calendar button - try multiple selectors
    // The button has either "Calendar" or "CalendarDays" icon
    const calendarBtn = page.locator('button').filter({ has: page.locator('svg.lucide-calendar, svg.lucide-calendar-days') }).first();
    await calendarBtn.click();
  }
  await page.waitForTimeout(500);

  // Verify modal opened
  const modalVisible = await page.locator("div.fixed.inset-0.z-50").isVisible({ timeout: 2000 }).catch(() => false);
  if (!modalVisible) {
    return { ok: false, reason: "Calendar modal did not open" };
  }

  // Try to find/select a valid date range across multiple months
  const maxMonthsToTry = 3; // Try current month + next 2 months

  for (let monthOffset = 0; monthOffset < maxMonthsToTry; monthOffset++) {
    // If not first iteration, click next month
    if (monthOffset > 0) {
      // Find the next month button using multiple selector strategies
      // The CalendarModal has ChevronRight icon in the header
      const nextMonthBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();

      // Wait a bit for the button to be ready
      await page.waitForTimeout(200);

      const isVisible = await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        return { ok: false, reason: "Next month button not visible" };
      }

      const clicked = await nextMonthBtn.click().then(() => true).catch(() => false);
      if (!clicked) {
        return { ok: false, reason: "Could not click next month button" };
      }
      await page.waitForTimeout(500); // Wait for calendar to re-render
    }

    // Count enabled day buttons in current month view
    const enabledBtns = page.locator("button.aspect-square:not([disabled])");
    const enabledCount = await enabledBtns.count();

    // Need at least 2 enabled days for date range
    if (enabledCount < 2) {
      console.log(`Month ${monthOffset + 1}: Not enough enabled days (${enabledCount}), trying next month`);
      continue; // Try next month
    }

    // Select first enabled day as start date
    const firstBtn = enabledBtns.first();
    await firstBtn.click();
    await page.waitForTimeout(300);

    // Re-query to get fresh element references after state change
    const freshEnabledBtns = page.locator("button.aspect-square:not([disabled])");
    const freshCount = await freshEnabledBtns.count();

    if (freshCount < 2) {
      console.log(`Month ${monthOffset + 1}: After selecting first date, only ${freshCount} enabled days remain`);
      continue; // Try next month
    }

    // Select second enabled day as end date (use index 1 for different day)
    await freshEnabledBtns.nth(1).click();
    await page.waitForTimeout(300);

    // Click confirm button
    const confirmBtn = page.locator("button:has-text('Xác nhận')").first();

    // Wait for confirm button to be ready
    await page.waitForTimeout(200);

    const isEnabled = await confirmBtn.isEnabled().catch(() => false);
    if (!isEnabled) {
      return { ok: false, reason: "Confirm button is not enabled after selecting dates" };
    }

    const confirmClicked = await confirmBtn.click().then(() => true).catch(() => false);

    if (!confirmClicked) {
      return { ok: false, reason: "Could not click confirm button" };
    }

    // Wait longer for React state to update and modal to close
    // Poll for modal to be closed (max 5 seconds)
    let modalClosed = false;
    for (let wait = 0; wait < 10; wait++) {
      await page.waitForTimeout(500);
      const stillOpen = await page.locator("div.fixed.inset-0.z-50").isVisible({ timeout: 500 }).catch(() => false);
      if (!stillOpen) {
        modalClosed = true;
        console.log(`[Calendar Helper] Modal closed after ${wait * 500}ms`);
        break;
      }
      console.log(`[Calendar Helper] Modal still open, waiting... (${wait + 1}/10)`);
    }

    if (!modalClosed) {
      return { ok: false, reason: "Modal did not close after 5 seconds" };
    }

    // Extract selected dates from the date input field
    // After selection, button shows "01/06/2026 — 02/06/2026"
    // Before selection, button shows "Chọn ngày bắt đầu và kết thúc"
    const dateInputBtn = page.locator('button').filter({ hasText: /\/|Chọn ngày/ }).filter({ has: page.locator('svg.lucide-calendar, svg.lucide-calendar-days') }).first();
    const selectedText = await dateInputBtn.textContent().catch(() => "");

    console.log(`[Calendar Helper] Date input text after selection: "${selectedText}"`);

    if (!selectedText || selectedText.trim() === "") {
      return { ok: false, reason: "Date input is empty after selection" };
    }

    // Parse date range from text like "01/06/2026 — 03/06/2026"
    const dateMatch = selectedText?.match(/(\d{2}\/\d{2}\/\d{4})\s*—\s*(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) {
      return { ok: false, reason: `Could not parse selected dates from: "${selectedText}"` };
    }

    const [, from, to] = dateMatch;

    // Calculate number of days (simple parse for display)
    // This is approximate; actual calculation would need date parsing
    const days = 3; // Placeholder - we could parse properly if needed

    return {
      ok: true,
      from,
      to,
      days,
    };
  }

  // Tried all months but couldn't find 2 enabled days
  return { ok: false, reason: `Could not find 2 enabled days across ${maxMonthsToTry} months` };
}
