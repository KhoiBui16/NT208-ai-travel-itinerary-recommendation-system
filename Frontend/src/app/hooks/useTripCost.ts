import { Day, Activity, Accommodation, TravelerInfo } from "../types/trip.types";

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

  const calculateActivityCost = (activity: Activity): number => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    let total = 0;
    if (transportation === "bus") {
      total += busTicketPrice * travelers.total;
    } else if (transportation === "taxi") {
      total += taxiCost;
    }
    if (type === "food" || type === "attraction") {
      total += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "shopping" || type === "entertainment") {
      total += customCost || 0;
    }
    extraExpenses.forEach(expense => {
      total += expense.amount;
    });
    return total;
  };

  const calculateActivityCostByCategory = (activity: Activity): Record<string, number> => {
    const { type, adultPrice = 0, childPrice = 0, customCost, transportation, busTicketPrice = 0, taxiCost = 0, extraExpenses = [] } = activity;
    const breakdown: Record<string, number> = {
      food: 0, attraction: 0, entertainment: 0, transportation: 0, shopping: 0,
    };
    if (transportation === "bus") {
      breakdown.transportation += busTicketPrice * travelers.total;
    } else if (transportation === "taxi") {
      breakdown.transportation += taxiCost;
    }
    if (type === "food") {
      breakdown.food += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "attraction") {
      breakdown.attraction += (adultPrice * travelers.adults) + (childPrice * travelers.children);
    } else if (type === "shopping") {
      breakdown.shopping += customCost || 0;
    } else if (type === "entertainment") {
      breakdown.entertainment += customCost || 0;
    }
    extraExpenses.forEach(expense => {
      breakdown[expense.category] += expense.amount;
    });
    return breakdown;
  };

  const calculateDayCost = (day: Day): number => {
    let total = 0;
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
    Object.values(accommodations).forEach((accommodation) => {
      if (accommodation.dayIds.includes(day.id)) {
        const bType = accommodation.bookingType || 'nightly';
        const bDur = accommodation.duration || Math.max(1, accommodation.dayIds.length - 1);
        const totalHotelCost = calculateHotelCost(accommodation.hotel.price, bType, bDur);
        breakdown.accommodation += totalHotelCost / accommodation.dayIds.length;
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
      total += calculateDayCost(day);
    });
    Object.values(accommodations).forEach((accommodation) => {
      const bType = accommodation.bookingType || 'nightly';
      const bDur = accommodation.duration || Math.max(1, accommodation.dayIds.length - 1);
      total += calculateHotelCost(accommodation.hotel.price, bType, bDur);
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
    Object.values(accommodations).forEach(accommodation => {
      const bType = accommodation.bookingType || 'nightly';
      const bDur = accommodation.duration || Math.max(1, accommodation.dayIds.length - 1);
      breakdown.accommodation += calculateHotelCost(accommodation.hotel.price, bType, bDur);
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