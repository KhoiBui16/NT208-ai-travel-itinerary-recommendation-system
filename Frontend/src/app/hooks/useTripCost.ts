/**
 * useTripCost — Hook tính chi phí lịch trình
 *
 * Cung cấp các hàm tính chi phí ở nhiều cấp độ:
 *   • Activity level  — chi phí 1 hoạt động (theo loại + phương tiện)
 *   • Day level       — tổng chi phí 1 ngày (activities + extra expenses)
 *   • Trip level      — tổng chi phí toàn bộ trip (days + accommodations)
 *   • Category breakdown — phân tích chi phí theo danh mục
 *
 * Cost calculation logic:
 *   • food/attraction: adultPrice × adults + childPrice × children
 *   • shopping/entertainment: customCost (flat)
 *   • bus: busTicketPrice × total travelers
 *   • taxi: taxiCost (flat)
 *   • hotel: pricePerNight × duration (with booking type adjustment)
 */

import { Day, Activity, Accommodation, TravelerInfo } from "../types/trip.types";

export const useTripCost = (
  days: Day[],
  accommodations: Record<number, Accommodation>,
  travelers: TravelerInfo
) => {

  // ===================================================================
  // 1. Hotel cost — Tính chi phí chỗ ở
  // ===================================================================

  /** Tính chi phí hotel dựa trên booking type và duration */
  const calculateHotelCost = (price: number, type: string, duration: number) => {
    if (type === 'hourly') return Math.round(price * 0.15) * duration;   // Hourly: 15% giá đêm × số giờ
    if (type === 'daily') return Math.round(price * 1.5) * duration;     // Daily: 150% giá đêm × số ngày
    return price * duration; // Nightly: giá đêm × số đêm (default)
  };

  /** Lấy tổng chi phí accommodation (ưu tiên totalPrice nếu có) */
  const getAccommodationCost = (accommodation: Accommodation): number => {
    // Nếu FE đã tính sẵn totalPrice → dùng luôn
    if (typeof accommodation.totalPrice === "number") {
      return accommodation.totalPrice;
    }
    // Tính từ giá đêm × duration
    const price =
      accommodation.hotel?.price ??
      accommodation.pricePerNight ??
      0;
    const bookingType = accommodation.bookingType || "nightly";
    const duration = accommodation.duration || Math.max(1, accommodation.dayIds.length - 1);
    return calculateHotelCost(price, bookingType, duration);
  };

  // ===================================================================
  // 2. Activity cost — Tính chi phí hoạt động
  // ===================================================================

  /** Tính tổng chi phí 1 activity (bao gồm transport + loại + extra expenses) */
  const calculateActivityCost = (activity: Activity): number => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    let total = 0;

    // Chi phí di chuyển
    if (transportation === "bus") {
      total += busTicketPrice * travelers.total;           // Bus: giá vé × tổng người
    } else if (transportation === "taxi") {
      total += taxiCost;                                    // Taxi: flat cost
    }

    // Chi phí theo loại hoạt động
    if (type === "food" || type === "attraction") {
      total += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "shopping" || type === "entertainment") {
      total += customCost || 0;                             // Shopping/entertainment: flat cost
    }

    // Chi phí phát sinh
    extraExpenses.forEach(expense => {
      total += expense.amount;
    });
    return total;
  };

  /** Phân tích chi phí 1 activity theo danh mục (food, attraction, ...) */
  const calculateActivityCostByCategory = (activity: Activity): Record<string, number> => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0,
    };

    // Phân loại chi phí di chuyển
    if (transportation === "bus") {
      breakdown.transportation += busTicketPrice * travelers.total;
    } else if (transportation === "taxi") {
      breakdown.transportation += taxiCost;
    }

    // Phân loại chi phí theo loại hoạt động
    if (type === "food") {
      breakdown.food += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "attraction") {
      breakdown.attraction += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "shopping") {
      breakdown.shopping += customCost || 0;
    } else if (type === "entertainment") {
      breakdown.entertainment += customCost || 0;
    }

    // Phân loại chi phí phát sinh theo category
    extraExpenses.forEach(expense => {
      breakdown[expense.category] += expense.amount;
    });
    return breakdown;
  };

  // ===================================================================
  // 3. Day cost — Tính chi phí 1 ngày
  // ===================================================================

  /** Tính tổng chi phí 1 ngày (activities + day extra expenses) */
  const calculateDayCost = (day: Day): number => {
    let total = 0;
    // Tổng chi phí tất cả activities trong ngày
    day.activities.forEach(activity => {
      total += calculateActivityCost(activity);
    });
    // Cộng thêm chi phí phát sinh cấp ngày
    if (day.extraExpenses) {
      day.extraExpenses.forEach(expense => {
        total += expense.amount;
      });
    }
    return total;
  };

  /** Phân tích chi phí 1 ngày theo danh mục (bao gồm accommodation) */
  const calculateDayCostByCategory = (day: Day): Record<string, number> => {
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0, accommodation: 0,
    };

    // Chia đều chi phí accommodation cho các ngày sử dụng
    Object.values(accommodations).forEach((accommodation) => {
      if (accommodation.dayIds.includes(day.id)) {
        const totalHotelCost = getAccommodationCost(accommodation);
        breakdown.accommodation += totalHotelCost / accommodation.dayIds.length;
      }
    });

    // Cộng chi phí activities
    day.activities.forEach((activity) => {
      const activityBreakdown = calculateActivityCostByCategory(activity);
      Object.keys(breakdown).forEach((key) => {
        breakdown[key] += activityBreakdown[key];
      });
    });

    // Cộng chi phí phát sinh cấp ngày
    if (day.extraExpenses) {
      day.extraExpenses.forEach((expense) => {
        if (breakdown[expense.category] !== undefined) {
          breakdown[expense.category] += expense.amount;
        }
      });
    }
    return breakdown;
  };

  // ===================================================================
  // 4. Trip total cost — Tính tổng chi phí toàn bộ trip
  // ===================================================================

  /** Tính tổng chi phí toàn trip (tất cả ngày + tất cả accommodation) */
  const calculateTotalTripCost = () => {
    let total = 0;
    // Tổng chi phí tất cả ngày
    days.forEach((day) => {
      total += calculateDayCost(day);
    });
    // Tổng chi phí tất cả accommodation
    Object.values(accommodations).forEach((accommodation) => {
      total += getAccommodationCost(accommodation);
    });
    return total;
  };

  /** Phân tích tổng chi phí toàn trip theo danh mục */
  const calculateTotalCostByCategory = (): Record<string, number> => {
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0, accommodation: 0,
    };
    days.forEach(day => {
      const dayBreakdown = calculateDayCostByCategory(day);
      Object.keys(dayBreakdown).forEach(key => {
        breakdown[key] += dayBreakdown[key];
      });
    });
    // Cộng riêng accommodation (đã tính trong day breakdown nhưng cần tổng riêng)
    Object.values(accommodations).forEach(accommodation => {
      breakdown.accommodation += getAccommodationCost(accommodation);
    });
    return breakdown;
  };

  // ===================================================================
  // 5. Format — Hiển thị tiền tệ
  // ===================================================================

  /** Format số tiền theo VNĐ (e.g. "1.500.000₫") */
  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + "₫";
  };

  return {
    calculateHotelCost,
    calculateActivityCost,
    calculateActivityCostByCategory,
    calculateDayCost,
    calculateDayCostByCategory,
    calculateTotalTripCost,
    calculateTotalCostByCategory,
    formatCurrency
  };
};
