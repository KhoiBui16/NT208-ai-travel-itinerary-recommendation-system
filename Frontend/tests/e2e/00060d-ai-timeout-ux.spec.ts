import { expect, test } from "@playwright/test";
import { selectDateRange } from "./helpers/calendar";

const mockDestinations = [
  {
    id: 1,
    name: "Hà Nội",
    country: "Vietnam",
    image: "",
    rating: 4.8,
    placesCount: 71,
    hotelsCount: 3,
    isGenerateReady: true,
    readinessStatus: "ready",
    readinessReason: null,
  },
];

test.describe("00060G AI timeout UX", () => {
  test("submit path shows clear 503 timeout alert without saving or navigating", async ({
    page,
  }) => {
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
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Gemini request timed out",
          error_code: "AI_PROVIDER_TIMEOUT",
          status_code: 503,
          retryable: true,
        }),
      });
    });

    await page.goto("/create-trip");
    await page.waitForLoadState("networkidle");

    const destinationInput = page.getByPlaceholder(/Hà Nội|Đà Nẵng|Phú Quốc/i);
    await destinationInput.fill("Hà Nội");
    await page.getByRole("button", { name: "Hà Nội" }).click();

    const dateResult = await selectDateRange(page, async () => {
      await page
        .getByRole("button", { name: /Chọn ngày bắt đầu và kết thúc|Chọn ngày/i })
        .click();
    });
    expect(dateResult.ok).toBeTruthy();

    const generateButton = page.getByRole("button", { name: /Tạo Lịch Trình Với AI/i });
    await generateButton.click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/AI đang phản hồi quá lâu/i);
    await expect(alert).toContainText(/Chưa có lịch trình nào được lưu/i);
    await expect(alert).toContainText(/1–2 ngày/i);

    expect(generateRequestCount).toBe(1);
    await expect(page).toHaveURL(/\/create-trip$/);
    await expect(generateButton).toBeEnabled();
    await expect(page.locator("text=AI đang lên kế hoạch...")).toHaveCount(0);
  });
});
