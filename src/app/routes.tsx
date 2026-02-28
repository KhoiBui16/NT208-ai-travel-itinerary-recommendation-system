import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import TripPlanning from "./pages/TripPlanning";
import ItineraryView from "./pages/ItineraryView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import SavedItineraries from "./pages/SavedItineraries";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
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
