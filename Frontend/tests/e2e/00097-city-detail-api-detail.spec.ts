import { expect, test } from "@playwright/test";

const mockDestinationDetail = {
  destination: {
    id: 97,
    name: "Buôn Ma Thuột",
    country: "Vietnam",
    image: "",
    rating: 0,
    placesCount: 1,
    hotelsCount: 1,
    isGenerateReady: true,
    readinessStatus: "partial",
    readinessReason:
      "Dữ liệu cho Buôn Ma Thuột hiện còn hạn chế nên lịch trình có thể ít lựa chọn hơn. Bạn vẫn có thể tiếp tục tạo lịch trình.",
  },
  places: [
    {
      id: 9701,
      name: "Bảo tàng Thế giới Cà phê",
      reviewCount: 218,
      rating: 4.6,
      type: "attraction",
      image: "",
      price: "75,000đ",
      location: "Nguyễn Đình Chiểu, Buôn Ma Thuột",
      reviews: [],
      saved: false,
      city: "Buôn Ma Thuột",
      description: "Không gian trải nghiệm văn hóa cà phê đặc trưng của Tây Nguyên.",
    },
  ],
  hotels: [
    {
      id: 9702,
      name: "Mường Thanh Luxury Buôn Ma Thuột",
      reviewCount: 321,
      rating: 4.5,
      price: 1450000,
      image: "",
      location: "81 Nguyễn Tất Thành, Buôn Ma Thuột",
      city: "Buôn Ma Thuột",
      amenities: ["Wifi", "Hồ bơi", "Bữa sáng"],
      description: "Khách sạn trung tâm thuận tiện cho lịch trình khám phá thành phố.",
    },
  ],
};

const mockHanoiDetail = {
  destination: {
    id: 2,
    name: "Hà Nội",
    country: "Vietnam",
    image: "",
    rating: 0,
    placesCount: 2,
    hotelsCount: 1,
    isGenerateReady: true,
    readinessStatus: "ready",
    readinessReason: null,
  },
  places: [
    {
      id: 2001,
      name: "Lăng Chủ tịch Hồ Chí Minh",
      reviewCount: 542,
      rating: 4.8,
      type: "attraction",
      image: "",
      price: "25,000đ",
      location: "Ba Đình, Hà Nội",
      reviews: [],
      saved: false,
      city: "Hà Nội",
      description: "Điểm tham quan lịch sử quan trọng tại trung tâm thủ đô.",
    },
    {
      id: 2002,
      name: "Phở Thìn Bờ Hồ",
      reviewCount: 311,
      rating: 4.5,
      type: "food",
      image: "",
      price: "70,000đ",
      location: "Hoàn Kiếm, Hà Nội",
      reviews: [],
      saved: false,
      city: "Hà Nội",
      description: "Quán phở đặc trưng được render trực tiếp từ API detail.",
    },
  ],
  hotels: [
    {
      id: 2003,
      name: "Sofitel Legend Metropole Hanoi",
      reviewCount: 198,
      rating: 4.7,
      price: 5200000,
      image: "",
      location: "15 Ngô Quyền, Hà Nội",
      city: "Hà Nội",
      amenities: ["Wifi", "Spa", "Nhà hàng"],
      description: "Khách sạn tham khảo cho trung tâm Hà Nội.",
    },
  ],
};

test.describe("00097 city detail API-backed rendering", () => {
  test("non-mock destination slug renders API places and hotels instead of a generic fallback shell", async ({
    page,
  }) => {
    await page.route("**/api/v1/places/destinations/buon-ma-thuot*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDestinationDetail),
      });
    });

    await page.goto("/cities/buon-ma-thuot");

    await expect(
      page.getByRole("heading", { name: "Buôn Ma Thuột", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Địa điểm nổi bật từ dữ liệu hiện có")).toBeVisible();
    await expect(page.getByText("Bảo tàng Thế giới Cà phê")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Khách sạn tham khảo" }),
    ).toBeVisible();
    await expect(page.getByText("Mường Thanh Luxury Buôn Ma Thuột")).toBeVisible();
    await expect(page.getByText("Có thể sử dụng")).toBeVisible();
    await expect(
      page.getByText(
        "Điểm đến này hiện được hiển thị từ dữ liệu backend đang có sẵn.",
      ),
    ).toHaveCount(0);
  });

  test("mock-pack city still prefers API detail data over bundled mock cards when backend detail is available", async ({
    page,
  }) => {
    await page.route("**/api/v1/places/destinations/ha-noi*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHanoiDetail),
      });
    });

    await page.goto("/cities/ha-noi");

    await expect(
      page.getByRole("heading", { name: "Hà Nội", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Địa điểm nổi bật từ dữ liệu hiện có")).toBeVisible();
    await expect(page.getByText("2 địa điểm").first()).toBeVisible();
    await expect(page.getByText("Lăng Chủ tịch Hồ Chí Minh")).toBeVisible();
    await expect(page.getByText("Phở Thìn Bờ Hồ")).toBeVisible();
    await expect(page.getByText("Sofitel Legend Metropole Hanoi")).toBeVisible();
  });
});
