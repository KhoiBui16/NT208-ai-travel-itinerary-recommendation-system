import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useTripWizard } from "../contexts/TripWizardContext";
import { readSessionTrip } from "../utils/tripResponseMapper";

function readPendingClaimTripId(): number | null {
  const raw = sessionStorage.getItem("pendingClaim");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { tripId?: unknown };
    return typeof parsed.tripId === "number" ? parsed.tripId : null;
  } catch {
    return null;
  }
}

function canAccessGuestWorkspace(
  location: ReturnType<typeof useLocation>,
  hasWizardState: boolean,
): boolean {
  if (location.pathname !== "/trip-workspace") {
    return false;
  }

  const currentTrip = readSessionTrip();
  const pendingClaimTripId = readPendingClaimTripId();
  const tripIdParam = new URLSearchParams(location.search).get("tripId");

  if (!tripIdParam) {
    return Boolean(currentTrip?.days?.length) || hasWizardState;
  }

  const tripId = Number(tripIdParam);
  if (!Number.isFinite(tripId)) {
    return false;
  }

  const matchesSessionTrip =
    currentTrip?.tripId === tripId && Boolean(currentTrip.days?.length);
  const matchesPendingClaim =
    pendingClaimTripId === tripId && Boolean(currentTrip?.days?.length);

  return matchesSessionTrip || matchesPendingClaim;
}

/**
 * Wraps protected routes. Redirects to /login if not authenticated.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const { destinations, dayAllocations } = useTripWizard();
  const location = useLocation();
  const hasWizardState =
    destinations.length > 0 && Object.keys(dayAllocations).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (canAccessGuestWorkspace(location, hasWizardState)) {
      return <>{children}</>;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
