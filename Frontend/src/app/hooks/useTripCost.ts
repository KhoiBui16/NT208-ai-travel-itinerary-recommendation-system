import { Day, Activity, Accommodation, TravelerInfo } from "../types/trip.types";
import { getUniqueAccommodationsFromRecord } from "../utils/tripResponseMapper";

export const useTripCost = (
  days: Day[],
  accommodations: Record<number, Accommodation>,
  travelers: TravelerInfo
) => {
  const calculateHotelCost = (price: number, type: string, duration: number) => {
    if (type === 'hourly') return Math.round(price * 0.15) * duration;
    if (type === 'daily') return Math.round(price * 1.5) * duration;
    return price * duration; // nightly
  };

  const getAccommodationCost = (accommodation: Accommodation): number => {
    if (typeof accommodation.totalPrice === "number") {
      return accommodation.totalPrice;
    }
    const price =
      accommodation.hotel?.price ??
      accommodation.pricePerNight ??
      0;
    const bookingType = accommodation.bookingType || "nightly";
    const duration = accommodation.duration ?? Math.max(1, accommodation.dayIds.length - 1);
    return calculateHotelCost(price, bookingType, duration);
  };

  const getUniqueAccommodations = () =>
    getUniqueAccommodationsFromRecord(accommodations);

  const calculateActivityCost = (activity: Activity): number => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    let total = 0;
    const hasPersonPrices = adultPrice > 0 || childPrice > 0;
    const flatCost = customCost || 0;
    if (transportation === "bus") {
      total += busTicketPrice * travelers.total;
    } else if (transportation === "taxi") {
      total += taxiCost;
    }
    if (type === "food" || type === "attraction") {
      if (hasPersonPrices) {
        total += (adultPrice * travelers.adults) + (childPrice * travelers.children);
      } else {
        total += flatCost;
      }
    } else if (type === "shopping" || type === "entertainment" || type === "nature") {
      if (flatCost > 0) {
        total += flatCost;
      } else if (hasPersonPrices) {
        total += adultPrice + childPrice;
      }
    }
    extraExpenses.forEach(expense => {
      total += expense.amount;
    });
    return total;
  };

  const calculateActivityCostByCategory = (activity: Activity): Record<string, number> => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    const hasPersonPrices = adultPrice > 0 || childPrice > 0;
    const flatCost = customCost || 0;
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0, accommodation: 0,
    };
    if (transportation === "bus") {
      breakdown.transportation += busTicketPrice * travelers.total;
    } else if (transportation === "taxi") {
      breakdown.transportation += taxiCost;
    }
    if (type === "food") {
      if (hasPersonPrices) {
        breakdown.food += (adultPrice * travelers.adults) + (childPrice * travelers.children);
      } else {
        breakdown.food += flatCost;
      }
    } else if (type === "attraction") {
      if (hasPersonPrices) {
        breakdown.attraction += (adultPrice * travelers.adults) + (childPrice * travelers.children);
      } else {
        breakdown.attraction += flatCost;
      }
    } else if (type === "shopping") {
      breakdown.shopping += flatCost > 0 ? flatCost : adultPrice + childPrice;
    } else if (type === "entertainment") {
      breakdown.entertainment += flatCost > 0 ? flatCost : adultPrice + childPrice;
    } else if (type === "nature") {
      breakdown.attraction += flatCost > 0 ? flatCost : adultPrice + childPrice;
    }
    extraExpenses.forEach(expense => {
      if (breakdown[expense.category] !== undefined) {
        breakdown[expense.category] += expense.amount;
      }
    });
    return breakdown;
  };

  const calculateAccommodationShareForDay = (day: Day): number => {
    let total = 0;
    getUniqueAccommodations().forEach((accommodation) => {
      if (!accommodation.dayIds.includes(day.id)) return;
      const coveredDayCount = Math.max(1, accommodation.dayIds.length);
      total += getAccommodationCost(accommodation) / coveredDayCount;
    });
    return total;
  };

  const calculateDayCost = (day: Day): number => {
    let total = calculateAccommodationShareForDay(day);
    day.activities.forEach(activity => {
      total += calculateActivityCost(activity);
    });
    if (day.extraExpenses) {
      day.extraExpenses.forEach(expense => {
        total += expense.amount;
      });
    }
    return total;
  };

  const calculateDayCostByCategory = (day: Day): Record<string, number> => {
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0, accommodation: 0,
    };
    getUniqueAccommodations().forEach((accommodation) => {
      if (accommodation.dayIds.includes(day.id)) {
        const totalHotelCost = getAccommodationCost(accommodation);
        const coveredDayCount = Math.max(1, accommodation.dayIds.length);
        breakdown.accommodation += totalHotelCost / coveredDayCount;
      }
    });
    day.activities.forEach((activity) => {
      const activityBreakdown = calculateActivityCostByCategory(activity);
      Object.keys(breakdown).forEach((key) => {
        breakdown[key] += activityBreakdown[key];
      });
    });
    if (day.extraExpenses) {
      day.extraExpenses.forEach((expense) => {
        if (breakdown[expense.category] !== undefined) {
          breakdown[expense.category] += expense.amount;
        }
      });
    }
    return breakdown;
  };

  const calculateTotalTripCost = () => {
    let total = 0;
    days.forEach((day) => {
      day.activities.forEach(activity => {
        total += calculateActivityCost(activity);
      });
      if (day.extraExpenses) {
        day.extraExpenses.forEach(expense => {
          total += expense.amount;
        });
      }
    });
    getUniqueAccommodations().forEach((accommodation) => {
      total += getAccommodationCost(accommodation);
    });
    return total;
  };

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
    return breakdown;
  };

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
