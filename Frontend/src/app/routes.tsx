import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import TripPlanning from "./pages/TripPlanning";
import ItineraryView from "./pages/ItineraryView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import SavedItineraries from "./pages/SavedItineraries";
import NotFound from "./pages/NotFound";
import DailyItinerary from "./pages/DailyItinerary";
import CreateTrip from "./pages/CreateTrip";
import Onboarding from "./pages/Onboarding";
import TripLibrary from "./pages/TripLibrary";
import SavedPlaces from "./pages/SavedPlaces";
import Account from "./pages/Account";
import TripHistory from "./pages/TripHistory";
import Settings from "./pages/Settings";
import BudgetSetup from "./pages/BudgetSetup";
import TravelersSelection from "./pages/TravelersSelection";
import ManualTripSetup from "./pages/ManualTripSetup";
import DayAllocation from "./pages/DayAllocation";
import TripWorkspace from "./pages/TripWorkspace";
import CityList from "./pages/CityList";
import CityDetail from "./pages/CityDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SharedTripView from "./pages/SharedTripView";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/cities",
    Component: CityList,
  },
  {
    path: "/cities/:cityId",
    Component: CityDetail,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/reset-password",
    Component: ResetPassword,
  },
  {
    path: "/shared/:token",
    Component: SharedTripView,
  },
  {
    path: "/create-trip",
    Component: CreateTrip,
  },
  {
    path: "/daily-itinerary",
    Component: DailyItinerary,
  },
  {
    path: "/budget-setup",
    Component: BudgetSetup,
  },
  {
    path: "/travelers-selection",
    Component: TravelersSelection,
  },
  {
    path: "/manual-trip-setup",
    Component: ManualTripSetup,
  },
  {
    path: "/day-allocation",
    Component: DayAllocation,
  },
  {
    path: "/trip-planning",
    Component: TripPlanning,
  },
  {
    path: "/itinerary/:id",
    Component: ItineraryView,
  },

  // Protected routes (require login)
  {
    path: "/trip-library",
    element: (
      <ProtectedRoute>
        <TripLibrary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/saved-places",
    element: (
      <ProtectedRoute>
        <SavedPlaces />
      </ProtectedRoute>
    ),
  },
  {
    path: "/account",
    element: (
      <ProtectedRoute>
        <Account />
      </ProtectedRoute>
    ),
  },
  {
    path: "/trip-history",
    element: (
      <ProtectedRoute>
        <TripHistory />
      </ProtectedRoute>
    ),
  },
  {
    path: "/trip-workspace",
    element: (
      <ProtectedRoute>
        <TripWorkspace />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/saved-itineraries",
    element: (
      <ProtectedRoute>
        <SavedItineraries />
      </ProtectedRoute>
    ),
  },

  // Catch-all
  {
    path: "*",
    Component: NotFound,
  },
]);
