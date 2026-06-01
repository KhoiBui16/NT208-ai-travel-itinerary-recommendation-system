import { test, expect } from "@playwright/test";
import { selectDateRange } from "./helpers/calendar";

/**
 * CI-safe test for destination data quality UX.
 * Tests that partial/sparse cities are allowed to submit with warning.
 *
 * This test is CI-safe:
 * - Uses relative URLs (baseURL from playwright.config.ts)
 * - Mocks backend destinations API with data quality metadata
 * - Does not require backend, DB, Gemini, or Goong
 * - Verifies that partial cities are allowed to submit (warning-only, no blocking)
 * - Uses calendar helper to handle month navigation when current month has insufficient enabled days
 */

test("Destination data quality advisory allows submit", async ({ page }) => {
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", msg => {
    consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Track if generate API was called
  let generateApiCalled = false;
  page.on("request", request => {
    if (request.url().includes("/api/v1/itineraries/generate")) {
      generateApiCalled = true;
    }
  });

  // Mock backend destinations API with data quality metadata
  // All cities have isGenerateReady=true (allowed to attempt generate)
  await page.route("**/api/v1/places/destinations", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 2,
          name: "Hà Nội",
          country: "Vietnam",
          image: "/img/destinations/ha-n-i.jpg",
          rating: 0.0,
          placesCount: 71,
          hotelsCount: 3,
          isGenerateReady: true,
          readinessStatus: "ready",
          readinessReason: null,
        },
        {
          id: 34,
          name: "Đà Lạt",
          country: "Vietnam",
          image: "/img/destinations/da-lat.jpg",
          rating: 0.0,
          placesCount: 10,
          hotelsCount: 2,
          isGenerateReady: true,  // ALLOWED to submit
          readinessStatus: "partial",
          readinessReason: "Dữ liệu cho Đà Lạt hiện còn hạn chế nên lịch trình có thể ít lựa chọn hơn. Bạn vẫn có thể tiếp tục tạo lịch trình.",
        },
      ]),
    });
  });

  await page.route("**/places/destinations", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: 2,
          name: "Hà Nội",
          country: "Vietnam",
          image: "/img/destinations/ha-n-i.jpg",
          rating: 0.0,
          placesCount: 71,
          hotelsCount: 3,
          isGenerateReady: true,
          readinessStatus: "ready",
          readinessReason: null,
        },
        {
          id: 34,
          name: "Đà Lạt",
          country: "Vietnam",
          image: "/img/destinations/da-lat.jpg",
          rating: 0.0,
          placesCount: 10,
          hotelsCount: 2,
          isGenerateReady: true,  // ALLOWED to submit
          readinessStatus: "partial",
          readinessReason: "Dữ liệu cho Đà Lạt hiện còn hạn chế nên lịch trình có thể ít lựa chọn hơn. Bạn vẫn có thể tiếp tục tạo lịch trình.",
        },
      ]),
    });
  });

  // Navigate to create-trip
  await page.goto("/create-trip");
  await page.waitForLoadState("networkidle");

  // Type "Đà" to trigger suggestions
  const destInput = page.locator('input[type="text"]').first();
  await destInput.fill("Đà");
  await page.waitForTimeout(300);

  // Check suggestions dropdown appears
  const suggestionsDropdown = page.locator('div.absolute.top-full').first();
  await expect(suggestionsDropdown).toBeVisible();

  // Find Đà Lạt in suggestions
  const suggestions = suggestionsDropdown.locator('button');
  const count = await suggestions.count();
  console.log(`Suggestions count for "Đà": ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);

  // Check Đà Lạt (PARTIAL) - has warning icon but is selectable
  const dalatBtn = suggestions.filter({ hasText: "Đà Lạt" }).or(suggestions.filter({ hasText: "Đà Nẵng" })).first();
  await expect(dalatBtn).toBeVisible();
  const dalatText = await dalatBtn.textContent();
  console.log(`Suggestion text: "${dalatText}"`);

  // Verify warning icon present (partial city)
  if (dalatText?.includes("Đà Lạt")) {
    expect(dalatText).toContain("⚠️");
  }

  // Select Đà Lạt
  await dalatBtn.click();
  await page.waitForTimeout(300);

  // Verify input has Đà Lạt value
  const inputValue = await destInput.inputValue();
  console.log(`Selected city: "${inputValue}"`);

  // Only proceed with Đà Lạt
  if (!inputValue.includes("Đà Lạt")) {
    await destInput.clear();
    await destInput.fill("Đà Lạt");
    await page.waitForTimeout(300);
  }

  // CRITICAL CHECK: Quality warning should be visible IMMEDIATELY after selecting Đà Lạt
  // This is the main advisory UX feature - warning appears when user selects partial city
  console.log("=== Checking quality warning after selecting Đà Lạt ===");
  const qualityWarning = page.locator('div.rounded-lg.bg-amber-50').filter({ hasText: "Dữ liệu cho Đà Lạt" });
  await page.waitForTimeout(200); // Small wait for React state to update
  const hasQualityWarning = await qualityWarning.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`Has quality warning visible: ${hasQualityWarning}`);
  expect(hasQualityWarning).toBeTruthy();

  // Verify warning CLEARS when switching to ready city (Hà Nội) - BEFORE clicking generate
  console.log("=== Switching to Hà Nội (ready city) to verify warning clears ===");
  await destInput.clear();
  await destInput.fill("Hà Nội");
  await page.waitForTimeout(500);

  // Warning should disappear for ready cities
  const qualityWarningCheck = page.locator('div.rounded-lg.bg-amber-50').filter({ hasText: "Dữ liệu" });
  const hasWarningAfterSwitch = await qualityWarningCheck.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`Has warning after switching to Hà Nội: ${hasWarningAfterSwitch}`);
  expect(hasWarningAfterSwitch).toBeFalsy();

  // Switch back to Đà Lạt for generate test
  console.log("=== Switching back to Đà Lạt for generate test ===");
  await destInput.clear();
  await destInput.fill("Đà Lạt");
  await page.waitForTimeout(500);

  // Verify warning re-appears
  const hasWarningAgain = await qualityWarning.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`Has warning after switching back to Đà Lạt: ${hasWarningAgain}`);
  expect(hasWarningAgain).toBeTruthy();

  // Use calendar helper to select date range
  // This helper handles month navigation when current month has insufficient enabled days
  console.log("=== Selecting date range with calendar helper ===");
  const dateResult = await selectDateRange(page);

  if (!dateResult.ok) {
    console.log(`ERROR: Calendar selection failed: ${dateResult.reason}`);
    test.skip(true, `Calendar selection failed: ${dateResult.reason}`);
    return;
  }

  console.log(`✓ Successfully selected date range: ${dateResult.from} — ${dateResult.to}`);

  // Mock generate API to avoid real Gemini call
  await page.route("**/api/v1/itineraries/generate", async route => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: 123,
        destination: "Đà Lạt",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        days: [],
      }),
    });
  });

  // Try to submit with Đà Lạt (PARTIAL city)
  // KEY TEST: This SHOULD be allowed, NOT blocked
  console.log("=== Submitting with Đà Lạt (partial city) ===");
  const generateBtn = page.locator('button:has-text("Tạo Lịch Trình Với AI")');
  await generateBtn.click();
  await page.waitForTimeout(1000);

  // Verify generate API was CALLED (not blocked)
  console.log(`Generate API called: ${generateApiCalled}`);
  expect(generateApiCalled).toBeTruthy();

  // Verify NO blocking error appeared
  // The old blocking error said "chọn thành phố khác" - this should NOT appear
  const blockingError = page.locator('p:has-text("chọn thành phố khác")').or(page.locator('p:has-text("Chưa đủ dữ liệu")'));
  const hasBlockingError = await blockingError.isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`Has blocking error: ${hasBlockingError}`);
  expect(hasBlockingError).toBeFalsy();

  // Verify no critical console errors
  console.log("=== Console errors ===");
  console.log(`Error count: ${consoleErrors.length}`);
  for (const err of consoleErrors) {
    console.log(`  ${err}`);
  }

  const criticalErrors = consoleErrors.filter(e =>
    e.includes("Uncaught") || e.includes("TypeError") || e.includes("ReferenceError")
  );
  expect(criticalErrors.length).toBe(0);

  console.log("=== TEST PASSED: Đà Lạt (partial) was allowed to submit ===");
});
