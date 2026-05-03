import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

/* ── Types ─────────────────────────────────────────────── */

export interface WizardDestination {
  id: number;
  name: string;
  country: string;
  image: string;
  description?: string;
}

interface DayAllocation {
  from: string; // yyyy-MM-dd
  to: string;
  days: number;
}

interface TravelerInfo {
  adults: number;
  children: number;
  total: number;
}

interface WizardState {
  destinations: WizardDestination[];
  dayAllocations: Record<number, DayAllocation | null>;
  travelers: TravelerInfo | null;
  budget: number;
}

interface TripWizardContextValue extends WizardState {
  /* setters — called once per wizard step */
  setDestinations: (dests: WizardDestination[]) => void;
  setDayAllocations: (allocs: Record<number, DayAllocation | null>) => void;
  setTravelers: (info: TravelerInfo) => void;
  setBudget: (amount: number) => void;

  /** Clear all wizard state (after trip is created in workspace) */
  resetWizard: () => void;
}

/* ── Constants ─────────────────────────────────────────── */

const STORAGE_KEY = "tripWizard";

const INITIAL_STATE: WizardState = {
  destinations: [],
  dayAllocations: {},
  travelers: null,
  budget: 0,
};

/* ── Helpers ───────────────────────────────────────────── */

/** Date objects don't survive JSON round-trip, so we only store plain data. */
function loadFromStorage(): WizardState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch { /* ignore corrupt data */ }
  return INITIAL_STATE;
}

function saveToStorage(state: WizardState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ── Context ───────────────────────────────────────────── */

const TripWizardContext = createContext<TripWizardContextValue | null>(null);

export function TripWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(loadFromStorage);

  /* persist on every change */
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setDestinations = useCallback(
    (dests: WizardDestination[]) =>
      setState((prev) => ({ ...prev, destinations: dests })),
    [],
  );

  const setDayAllocations = useCallback(
    (allocs: Record<number, DayAllocation | null>) =>
      setState((prev) => ({ ...prev, dayAllocations: allocs })),
    [],
  );

  const setTravelers = useCallback(
    (info: TravelerInfo) =>
      setState((prev) => ({ ...prev, travelers: info })),
    [],
  );

  const setBudget = useCallback(
    (amount: number) =>
      setState((prev) => ({ ...prev, budget: amount })),
    [],
  );

  const resetWizard = useCallback(() => {
    setState(INITIAL_STATE);
    sessionStorage.removeItem(STORAGE_KEY);
    // Also clean up legacy keys that older code may have left
    sessionStorage.removeItem("tripDestinations");
    sessionStorage.removeItem("tripDayAllocations");
    sessionStorage.removeItem("tripTravelers");
    sessionStorage.removeItem("tripBudget");
    sessionStorage.removeItem("currentTrip");
    sessionStorage.removeItem("selectedTripId");
  }, []);

  return (
    <TripWizardContext.Provider
      value={{
        ...state,
        setDestinations,
        setDayAllocations,
        setTravelers,
        setBudget,
        resetWizard,
      }}
    >
      {children}
    </TripWizardContext.Provider>
  );
}

export function useTripWizard(): TripWizardContextValue {
  const ctx = useContext(TripWizardContext);
  if (!ctx) throw new Error("useTripWizard must be used within TripWizardProvider");
  return ctx;
}
