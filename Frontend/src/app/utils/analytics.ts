// Analytics tracking functions for YourTrip application

interface AnalyticsEvent {
  timestamp: string;
  userId: string | null;
}

interface SuggestionEvent extends AnalyticsEvent {
  suggestionId: string;
  suggestionName: string;
  source?: string;
}

interface BudgetChangeEvent extends AnalyticsEvent {
  category: string;
  oldValue: number;
  newValue: number;
  action: string;
}

interface ItineraryEvent extends AnalyticsEvent {
  suggestionId: string;
  suggestionName: string;
  date: string;
  time: string;
}

// Get current user ID from localStorage or return null
const getCurrentUserId = (): string | null => {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user).id : null;
};

// Track when user views a suggestion
export const trackViewSuggestion = (
  suggestionId: string,
  suggestionName: string,
  source?: string
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    suggestionId,
    suggestionName,
    source,
  };
  
  console.log("[Analytics] view_suggestion", event);
  
  // In production, send to analytics service
  // Example: analytics.track('view_suggestion', event);
};

// Track when user saves a suggestion
export const trackSaveSuggestion = (
  suggestionId: string,
  suggestionName: string
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    suggestionId,
    suggestionName,
  };
  
  console.log("[Analytics] save_suggestion", event);
};

// Track when user opens suggestion details
export const trackOpenDetail = (
  suggestionId: string,
  suggestionName: string
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    suggestionId,
    suggestionName,
  };
  
  console.log("[Analytics] open_detail", event);
};

// Track when user confirms adding suggestion to itinerary
export const trackAddToItineraryConfirm = (
  suggestionId: string,
  suggestionName: string,
  date: string,
  time: string
) => {
  const event: ItineraryEvent = {
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    suggestionId,
    suggestionName,
    date,
    time,
  };
  
  console.log("[Analytics] add_to_itinerary_confirm", event);
};

// Track budget changes
export const trackBudgetChange = (
  category: string,
  oldValue: number,
  newValue: number,
  action: string
) => {
  const event: BudgetChangeEvent = {
    timestamp: new Date().toISOString(),
    userId: getCurrentUserId(),
    category,
    oldValue,
    newValue,
    action,
  };
  
  console.log("[Analytics] budget_change", event);
  
  // Store in change history
  const history = JSON.parse(localStorage.getItem("budgetChangeHistory") || "[]");
  history.push(event);
  localStorage.setItem("budgetChangeHistory", JSON.stringify(history));
};
