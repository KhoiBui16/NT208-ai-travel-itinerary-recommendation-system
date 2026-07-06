import { expect, test } from "@playwright/test";

const mockDestinations = [
  {
    id: 1,
    name: "Hạ Long",
    country: "Vietnam",
    image: "",
    rating: 4.7,
    placesCount: 64,
    hotelsCount: 2,
    isGenerateReady: true,
    readinessStatus: "ready",
    readinessReason: null,
  },
  {
    id: 2,
    name: "Hồ Chí Minh",
    country: "Vietnam",
    image: null,
    rating: 4.8,
    placesCount: 70,
    hotelsCount: 3,
    isGenerateReady: true,
    readinessStatus: "ready",
    readinessReason: null,
  },
  {
    id: 3,
    name: "Mystery City",
    country: "Vietnam",
    image: "",
    rating: 4.1,
    placesCount: 12,
    hotelsCount: 1,
    isGenerateReady: true,
    readinessStatus: "partial",
    readinessReason: null,
  },
  {
    id: 4,
    name: "Broken Image City",
    country: "Vietnam",
    image: "/broken-destination.jpg",
    rating: 4.0,
    placesCount: 10,
    hotelsCount: 1,
    isGenerateReady: true,
    readinessStatus: "partial",
    readinessReason: null,
  },
];

test.describe("00060G home destination image fallback", () => {
  test("API destinations with empty or broken images still render usable cards", async ({
    page,
  }) => {
    await page.route("**/api/v1/places/destinations*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDestinations),
      });
    });

    await page.route("**/broken-destination.jpg", async (route) => {
      await route.fulfill({ status: 404, body: "" });
    });

    await page.goto("/");
    await expect(page.getByText("Hạ Long", { exact: true })).toBeVisible();

    for (const destination of mockDestinations) {
      await expect(page.getByText(destination.name, { exact: true })).toBeVisible();
      const image = page.locator(`img[alt="${destination.name}"]`);
      await expect(image).toHaveAttribute("src", /.+/);
      await expect(image).not.toHaveAttribute("src", "");
    }

    await expect(page.locator('img[alt="Mystery City"]')).toHaveAttribute(
      "src",
      /pexels-photo-2444403/,
    );
    await expect(page.locator('img[alt="Broken Image City"]')).toHaveAttribute(
      "src",
      /pexels-photo-2444403/,
    );
  });
});
