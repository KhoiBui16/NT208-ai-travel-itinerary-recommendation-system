export interface ExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

export interface Activity {
  id: number;
  time: string;
  endTime?: string;
  name: string;
  location: string;
  description: string;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  transportation?: "walk" | "bike" | "bus" | "taxi";
  // Cost fields
  adultPrice?: number; // For food (per person) or attraction (ticket price)
  childPrice?: number; // For food (per person) or attraction (ticket price)
  customCost?: number; // For shopping, entertainment, or custom override
  // Transportation costs
  busTicketPrice?: number; // Per person bus ticket
  taxiCost?: number; // Total taxi cost estimate
  // Extra expenses
  extraExpenses?: ExtraExpense[];
}

export interface DayExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

export interface Day {
  id: number;
  label: string;
  date: string;
  activities: Activity[];
  destinationName?: string;
  extraExpenses?: DayExtraExpense[];
}

export interface Place {
  id: number;
  name: string;
  reviewCount: number;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  price?: string;      
  location?: string;
  reviews?: number;
  rating?: number;
  saved: boolean;
  city: string;
  description?: string;
}

export interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
  rating: number;
}

export interface DateAllocation {
  from: Date;
  to: Date;
  days: number;
}

export interface Hotel {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  image: string;
  location: string;
  city: string;
  amenities: string[];
  description: string;
}

export interface Accommodation {
  hotel: Hotel;
  dayIds: number[];
  bookingType?: 'hourly' | 'nightly' | 'daily';
  duration?: number;
}

export interface TravelerInfo {
  adults: number;
  children: number;
  total: number;
}

export interface TimeConflictWarning {
  hasConflict: boolean;
  conflictWith?: Activity;
}
