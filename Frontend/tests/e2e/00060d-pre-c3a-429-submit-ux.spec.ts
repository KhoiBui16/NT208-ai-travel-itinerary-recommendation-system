import { expect, test } from "@playwright/test";
import { selectDateRange } from "./helpers/calendar";

const mockDestinations = [
  {
    id: 2,
    name: "Hà Nội",
    country: "Vietnam",
    image: "/img/destinations/ha-noi.jpg",
    rating: 4.8,
    placesCount: 71,
    hotelsCount: 3,
    isGenerateReady: true,
    readinessStatus: "ready",
    readinessReason: null,
  },
];

test.describe("00060D-FIX pre-C3A 429 submit UX", () => {
  test("submit path shows accessible 429 alert without navigating away", async ({ page }) => {
    let generateRequestCount = 0;

    await page.route("**/api/v1/places/destinations*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDestinations),
      });
    });

    await page.route("**/api/v1/itineraries/generate", async (route) => {
      generateRequestCount += 1;
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: {
          "X-RateLimit-Limit": "3",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "2026-05-31T23:59:59+07:00",
          "Retry-After": "3600",
        },
        body: JSON.stringify({
          detail: "Bạn đã dùng hết 3 lượt tạo lịch trình AI hôm nay.",
          error_code: "RATE_LIMIT_EXCEEDED",
          status_code: 429,
          limit: 3,
          remaining: 0,
          reset_at: "2026-05-31T23:59:59+07:00",
          retry_after_seconds: 3600,
        }),
      });
    });

    await page.goto("/create-trip");
    await page.waitForLoadState("networkidle");

    const destinationInput = page.getByPlaceholder(/Hà Nội|Đà Nẵng|Phú Quốc/i);
    await destinationInput.fill("Hà Nội");
    await page.getByRole("button", { name: "Hà Nội" }).click();

    const dateResult = await selectDateRange(page, async () => {
      await page.getByRole("button", { name: /Chọn ngày bắt đầu và kết thúc|Chọn ngày/i }).click();
    });
    expect(dateResult.ok).toBeTruthy();

    const generateButton = page.getByRole("button", { name: /Tạo Lịch Trình Với AI/i });
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Bạn đã dùng hết 3 lượt|Hạn mức|thử lại/i);
    await expect(alert).toContainText(/1 giờ|thử lại/i);

    expect(generateRequestCount).toBe(1);
    await expect(page).toHaveURL(/\/create-trip$/);
    await expect(generateButton).toBeEnabled();
    await expect(page.locator("text=AI đang lên kế hoạch...")).toHaveCount(0);
  });
});
