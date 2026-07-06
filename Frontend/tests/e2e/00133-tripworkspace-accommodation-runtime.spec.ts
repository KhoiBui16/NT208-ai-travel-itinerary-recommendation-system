import { expect, test } from "@playwright/test";

const tripId = 4321;

const partialHotelTripResponse = {
  id: tripId,
  destination: "Vũng Tàu",
  tripName: "Trip Workspace Runtime",
  startDate: "2026-07-01",
  endDate: "2026-07-02",
  budget: 3000000,
  totalCost: 900000,
  travelerInfo: {
    adults: 2,
    children: 0,
    total: 2,
  },
  interests: ["food"],
  days: [
    {
      id: 9101,
      label: "Ngày 1 - Vũng Tàu",
      date: "2026-07-01",
      destinationName: "Vũng Tàu",
      activities: [
        {
          id: 9201,
          time: "08:00",
          endTime: "09:00",
          name: "Bữa sáng",
          location: "Vũng Tàu",
          description: "Ăn sáng",
          type: "food",
          image: "",
          adultPrice: 50000,
        },
      ],
    },
  ],
  accommodations: [
    {
      id: 701,
      hotel: {
        id: 88,
        name: "Khách sạn biển",
      },
      dayIds: [9101],
      bookingType: "nightly",
      duration: 1,
      name: "Khách sạn biển",
      pricePerNight: 650000,
      totalPrice: 650000,
    },
  ],
  claimToken: null,
  createdAt: "2026-07-01T08:00:00Z",
  updatedAt: "2026-07-01T08:00:00Z",
};

const persistedTripResponse = {
  ...partialHotelTripResponse,
  tripName: "Trip Workspace Runtime Saved",
  updatedAt: "2026-07-01T10:00:00Z",
  accommodations: [
    {
      id: 777,
      hotel: {
        id: 88,
        name: "Khách sạn biển",
      },
      dayIds: [9101],
      bookingType: "nightly",
      duration: 1,
      name: "Khách sạn biển",
      pricePerNight: 650000,
      totalPrice: 650000,
    },
  ],
};

test("TripWorkspace accommodation settings survives partial hotel payload and save reapplies server state", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem("accessToken", "token-access");
    localStorage.setItem("refreshToken", "token-refresh");
  });

  await page.route("**/api/v1/users/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 7,
        email: "runtime@test.com",
        name: "Runtime User",
        phone: null,
        interests: [],
        createdAt: "2026-07-01T08:00:00Z",
      }),
    });
  });

  await page.route(`**/api/v1/itineraries/${tripId}`, async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(persistedTripResponse),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(partialHotelTripResponse),
    });
  });

  await page.route("**/api/v1/places/search*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/api/v1/places/saved/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto(`/trip-workspace?tripId=${tripId}`, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Ngày 1 - Vũng Tàu", exact: true }),
  ).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: "Nơi ở" }).click();
  await expect(page.getByText("Thông tin nơi ở đã lưu")).toBeVisible();

  await page.getByRole("button", { name: /Thay đổi thiết lập/i }).click();
  await expect(page.getByText("Thiết lập thời gian ở")).toBeVisible();
  expect(pageErrors).toEqual([]);

  await page.getByRole("button", { name: /Lưu lịch trình/i }).click();
  await expect(page.getByText("Đã lưu lịch trình thành công").first()).toBeVisible();
  await expect(page.getByText("Đã lưu lịch trình thành công")).toHaveCount(1);

  const currentTrip = await page.evaluate(() => {
    const raw = sessionStorage.getItem("currentTrip");
    return raw ? JSON.parse(raw) : null;
  });

  expect(currentTrip.tripId).toBe(tripId);
  expect(currentTrip.name).toBe("Trip Workspace Runtime Saved");
  expect(Object.values(currentTrip.accommodations)[0]).toMatchObject({
    id: 777,
    name: "Khách sạn biển",
  });
});
