// Analytics tracking functions for YourTrip application
// NOTE: Analytics is EP-34 optional. Currently logs to console only.
// When EP-34 is implemented, replace with a proper analytics service.

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

// Track when user views a suggestion
export const trackViewSuggestion = (
  suggestionId: string,
  suggestionName: string,
  source?: string,
  userId?: string | null
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
    suggestionId,
    suggestionName,
    source,
  };

  console.log("[Analytics] view_suggestion", event);
};

// Track when user saves a suggestion
export const trackSaveSuggestion = (
  suggestionId: string,
  suggestionName: string,
  userId?: string | null
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
    suggestionId,
    suggestionName,
  };

  console.log("[Analytics] save_suggestion", event);
};

// Track when user opens suggestion details
export const trackOpenDetail = (
  suggestionId: string,
  suggestionName: string,
  userId?: string | null
) => {
  const event: SuggestionEvent = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
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
  time: string,
  userId?: string | null
) => {
  const event: ItineraryEvent = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
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
  action: string,
  userId?: string | null
) => {
  const event: BudgetChangeEvent = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
    category,
    oldValue,
    newValue,
    action,
  };

  console.log("[Analytics] budget_change", event);
};
