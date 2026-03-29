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

export const router = createBrowserRouter([
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
    path: "/trip-library",
    Component: TripLibrary,
  },
  {
    path: "/saved-places",
    Component: SavedPlaces,
  },
  {
    path: "/account",
    Component: Account,
  },
  {
    path: "/trip-history",
    Component: TripHistory,
  },
  {
    path: "/settings",
    Component: Settings,
  },
  {
    path: "/daily-itinerary",
    Component: DailyItinerary,
  },
  {
    path: "/create-trip",
    Component: CreateTrip,
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
    path: "/trip-workspace",
    Component: TripWorkspace,
  },
  {
    path: "/trip-planning",
    Component: TripPlanning,
  },
  {
    path: "/itinerary/:id",
    Component: ItineraryView,
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
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/saved-itineraries",
    Component: SavedItineraries,
  },
  {
    path: "*",
    Component: NotFound,
  },
]);