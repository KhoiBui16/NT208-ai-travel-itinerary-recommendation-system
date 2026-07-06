import { expect, test } from "@playwright/test";

const mockProfile = {
  id: 77,
  email: "floating-chat@test.com",
  name: "Floating Chat User",
  phone: null,
  interests: ["culture"],
  isActive: true,
  createdAt: "2026-06-02T09:00:00Z",
  updatedAt: "2026-06-02T09:00:00Z",
};

const mockTrip = {
  id: 777,
  destination: "Huế",
  tripName: "Hue Context Trip",
  startDate: "2026-07-01",
  endDate: "2026-07-02",
  budget: 5000000,
  totalCost: 0,
  travelerInfo: {
    adults: 2,
    children: 0,
    total: 2,
  },
  interests: ["culture"],
  days: [
    {
      id: 1,
      label: "Ngày 1 - Huế",
      date: "2026-07-01",
      destinationName: "Huế",
      activities: [
        {
          id: 101,
          time: "09:00",
          endTime: "10:00",
          name: "Đại Nội Huế",
          location: "Thành phố Huế",
          description: "Tham quan di tích cố đô.",
          type: "attraction",
          image: "",
          transportation: "walk",
          extraExpenses: [],
        },
      ],
    },
  ],
  accommodations: [],
  claimToken: null,
  createdAt: "2026-06-02T09:00:00Z",
  updatedAt: "2026-06-02T09:00:00Z",
};

test.describe("00060D / 00100 runtime chat truth", () => {
  test("TripWorkspace uses AI Chat tab instead of floating mock chat for a Huế trip", async ({ page }) => {
    // Set up tokens and mock user profile in localStorage BEFORE page loads
    await page.addInitScript(() => {
      localStorage.setItem("accessToken", "mock-access-token-valid");
      localStorage.setItem("refreshToken", "mock-refresh-token-valid");
      localStorage.setItem("userProfile", JSON.stringify({
        id: 77,
        email: "floating-chat@test.com",
        name: "Floating Chat User",
        phone: null,
        interests: ["culture"],
        isActive: true,
        createdAt: "2026-06-02T09:00:00Z",
        updatedAt: "2026-06-02T09:00:00Z",
      }));
    });

    // Set up API route handlers
    await page.route("**/api/v1/users/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProfile),
      });
    });

    await page.route("**/api/v1/itineraries/777", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTrip),
      });
    });

    await page.route("**/api/v1/places/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/v1/places/saved/list", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // TripWorkspace now issues background requests, so waiting for networkidle is flaky.
    // Navigate once the document is ready, then wait on a stable UI marker below.
    await page.goto("/trip-workspace?tripId=777", { waitUntil: "domcontentloaded" });

    // Verify trip loaded - heading should contain "Huế"
    await expect(
      page.getByRole("heading", { name: "Ngày 1 - Huế", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Current runtime truth on 00100: there is no floating mock chat toggle anymore.
    const floatingChatToggle = page.locator("div.fixed.bottom-28.right-6.z-20");
    await expect(floatingChatToggle).toHaveCount(0);

    // The runtime workspace still exposes the AI Chat tab entry point.
    await expect(page.getByRole("button", { name: "AI Chat", exact: true })).toBeVisible();

    // With a Huế trip mocked in, the workspace must not drift to hardcoded Hà Nội text.
    await expect(page.getByText("Hà Nội", { exact: true })).toHaveCount(0);
  });
});
