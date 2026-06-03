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

const guestGenerateResponse = {
  id: 321,
  destination: "Hà Nội",
  tripName: "Guest Hà Nội Trip",
  startDate: "2026-06-10",
  endDate: "2026-06-11",
  budget: 5000000,
  totalCost: 1200000,
  travelerInfo: {
    adults: 1,
    children: 0,
    total: 1,
  },
  interests: ["food"],
  days: [
    {
      id: 1001,
      label: "Ngày 1 - Hà Nội",
      date: "2026-06-10",
      destinationName: "Hà Nội",
      activities: [
        {
          id: 2001,
          time: "09:00",
          endTime: "10:00",
          name: "Bún chả Hàng Quạt",
          location: "Hà Nội",
          description: "Ăn sáng",
          type: "food",
          image: "",
        },
      ],
    },
  ],
  accommodations: [],
  claimToken: "claim_guest_123",
  createdAt: "2026-06-10T08:00:00Z",
  updatedAt: "2026-06-10T08:00:00Z",
};

const authGenerateResponse = {
  ...guestGenerateResponse,
  id: 654,
  tripName: "Auth Session Snapshot",
  claimToken: null,
  days: [
    {
      ...guestGenerateResponse.days[0],
      id: 1101,
      activities: [
        {
          ...guestGenerateResponse.days[0].activities[0],
          id: 2101,
          name: "Session Snapshot Activity",
        },
      ],
    },
  ],
};

const authWorkspaceResponse = {
  ...authGenerateResponse,
  tripName: "Auth API Workspace",
  days: [
    {
      ...authGenerateResponse.days[0],
      activities: [
        {
          ...authGenerateResponse.days[0].activities[0],
          id: 2102,
          name: "Server Persisted Activity",
          image: "https://cdn.test/auth-activity.jpg",
        },
      ],
    },
  ],
};

async function setupCommonRoutes(page: Parameters<typeof test>[0]["page"]) {
  await page.route("**/api/v1/places/destinations*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockDestinations),
    });
  });

  await page.route("**/api/v1/places/search*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

async function fillGenerateForm(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/create-trip");
  const destinationInput = page.getByPlaceholder(/Hà Nội|Đà Nẵng|Phú Quốc/i);
  await destinationInput.fill("Hà Nội");
  await page.getByRole("button", { name: "Hà Nội" }).click();

  const dateResult = await selectDateRange(page, async () => {
    await page
      .getByRole("button", { name: /Chọn ngày bắt đầu và kết thúc|Chọn ngày/i })
      .click();
  });
  expect(dateResult.ok).toBeTruthy();

  await page.getByRole("button", { name: /Tạo Lịch Trình Với AI/i }).click();
}

test.describe("00060H guest/auth workspace boundary", () => {
  test("guest generate keeps workspace in browser session without forcing login", async ({
    page,
  }) => {
    await setupCommonRoutes(page);

    await page.route("**/api/v1/itineraries/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(guestGenerateResponse),
      });
    });

    await fillGenerateForm(page);

    await expect(page).toHaveURL(/\/trip-workspace\?tripId=321/);
    await expect(page.getByText("Bún chả Hàng Quạt")).toBeVisible();
    await expect(page.getByRole("button", { name: /Chia sẻ/i })).toHaveCount(0);

    const storedState = await page.evaluate(() => ({
      currentTrip: sessionStorage.getItem("currentTrip"),
      pendingClaim: sessionStorage.getItem("pendingClaim"),
      accessToken: localStorage.getItem("accessToken"),
    }));

    expect(storedState.accessToken).toBeNull();
    expect(storedState.currentTrip).not.toBeNull();
    expect(storedState.pendingClaim).not.toBeNull();

    const currentTrip = JSON.parse(storedState.currentTrip!);
    const pendingClaim = JSON.parse(storedState.pendingClaim!);
    expect(currentTrip.tripId).toBe(321);
    expect(currentTrip.travelers.total).toBe(1);
    expect(pendingClaim.tripId).toBe(321);

    const activityImage = page.locator('img[alt="Bún chả Hàng Quạt"]').first();
    await expect(activityImage).toHaveAttribute("src", /.+/);

    await page.getByRole("button", { name: /Lưu lịch trình/i }).click();
    await expect(
      page.getByText(
        /Nếu chưa đăng nhập, lịch trình chỉ được lưu tạm trong trình duyệt này/i,
      ),
    ).toBeVisible();
  });

  test("authenticated generate still loads workspace from API instead of guest session cache", async ({
    page,
  }) => {
    let getItineraryCount = 0;

    await page.addInitScript(() => {
      localStorage.setItem("accessToken", "token-access");
      localStorage.setItem("refreshToken", "token-refresh");
    });

    await setupCommonRoutes(page);

    await page.route("**/api/v1/users/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 7,
          email: "auth@test.com",
          name: "Auth User",
          phone: null,
          interests: [],
          createdAt: "2026-06-10T08:00:00Z",
        }),
      });
    });

    await page.route("**/api/v1/itineraries/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(authGenerateResponse),
      });
    });

    await page.route("**/api/v1/itineraries/654", async (route) => {
      getItineraryCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(authWorkspaceResponse),
      });
    });

    await fillGenerateForm(page);

    await expect(page).toHaveURL(/\/trip-workspace\?tripId=654/);
    await expect(page.getByText("Server Persisted Activity")).toBeVisible();
    await expect(page.getByText("Session Snapshot Activity")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Chia sẻ/i })).toBeVisible();
    expect(getItineraryCount).toBe(1);
  });
});
