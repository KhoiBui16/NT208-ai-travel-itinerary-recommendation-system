import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Header } from "../components/Header";
import { SavedSuggestions, SavedSuggestion } from "../components/SavedSuggestions";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { PlaceSelectionModal } from "../components/PlaceSelectionModal";
import { CalendarModal } from "../components/CalendarModal";
import { PlaceInfoModal } from "../components/PlaceInfoModal";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  Plus, Sparkles, GripVertical, Clock, MapPin, Search, Star, Heart,
  Utensils, Landmark, TreePine, Music, ShoppingBag, Trash2, X, Check,
  ChevronRight, Save, Bookmark, Home,
  Hotel as HotelIcon, Wifi, Coffee, Car, AlertCircle, Eye, DollarSign,
  Users, Bike, Bus, Navigation, Minus, User, Edit, MessageCircle
} from "lucide-react";
import { format, addDays, parseISO, parse, startOfDay, isBefore, isAfter, isSameDay, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";

// ── CÁC FILE DỮ LIỆU ĐÃ TÁCH ──────────────────────────────────────────────
import { 
  Day, Activity, Place, Destination, Hotel, Accommodation, 
  TravelerInfo, TimeConflictWarning, ExtraExpense, DayExtraExpense, DateAllocation 
} from "../types/trip.types";

import { 
  initialDays, allPlaces, availableHotels, availableDestinations, 
  categoryFilters, typeColors, typeLabels, transportationOptions, PIE_COLORS 
} from "../utils/tripConstants";

import { 
  parseTimeToMinutes, minutesToTime, getActivityDurationMinutes, 
  recalculateActivityTimes, resolveTimeConflicts 
} from "../utils/timeHelpers";

import { ActivityDetailModal } from "../components/ActivityDetailModal";
import { TripSidebar } from "../components/TripSidebar";
import { TripBudgetSidebar } from "../components/TripBudgetSidebar";
import { TripTimeline } from "../components/TripTimeline";
import { TripAccommodation } from "../components/TripAccommodation";
import { ChatPanel } from "../components/ChatPanel";
import { EditTravelersModal } from "../components/EditTravelersModal";
import { BudgetDetailModal } from "../components/BudgetDetailModal";
import { AddDaysModal } from "../components/AddDaysModal";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { useTripCost } from "../hooks/useTripCost";
import { TopActionBar } from "../components/TopActionBar";
import { useActivityManager } from "../hooks/trips/useActivityManager";
import { useAccommodation } from "../hooks/trips/useAccommodation";
import { usePlacesManager } from "../hooks/trips/usePlacesManager";
import { useTripSync } from "../hooks/trips/useTripSync";
import { listSavedPlaces } from "../services/places";
import { buildSavedPlaceIdSet, normalizeSavedPlaces } from "../utils/savedPlaces";
import { useAuth } from "../contexts/AuthContext";
// Khởi tạo ID (để tránh lỗi khi tạo hoạt động mới)
let nextId = 500;
const updateNextId = (id: number) => { nextId = Math.max(nextId, id); };
// ── Mock Data ──────────────────────────────────────────────────────────────

  // Hàm tính tiền khách sạn (Giờ / Đêm / Ngày)

export default function TripWorkspace() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");
  const { isAuthenticated: authIsAuthenticated } = useAuth();
  const [tripId, setTripId] = useState<number | null>(
    tripIdParam && Number.isFinite(Number(tripIdParam)) ? Number(tripIdParam) : null,
  );
  const [days, setDays] = useState<Day[]>(initialDays);
  const [selectedDayId, setSelectedDayId] = useState(1);

  // Tab state for Địa điểm / Nơi ở
  const [activeTab, setActiveTab] = useState<"places" | "accommodation">("places");
  // Tab state for Budget / Chat (right panel)
  const [rightPanelTab, setRightPanelTab] = useState<"budget" | "chat">("budget");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(authIsAuthenticated);
  const remoteTripId = isAuthenticated ? tripId : null;
  const {
    places, setPlaces, placeSearch, setPlaceSearch, activeFilter, setActiveFilter,
    showSavedSuggestions, setShowSavedSuggestions, savedSuggestions, setSavedSuggestions,
    filteredPlaces, handleAddSuggestionToItinerary, handleRemoveSavedSuggestion, toggleSavePlace
  } = usePlacesManager(days, setDays, selectedDayId, isAuthenticated, setShowLoginModal, remoteTripId);
  
  // Place Selection Modal state
  const [showPlaceSelectionModal, setShowPlaceSelectionModal] = useState(false);
  const [selectedDayForPlaces, setSelectedDayForPlaces] = useState<number | null>(null);
  
  // Add to itinerary modal (from place panel)
  const [addPlaceModal, setAddPlaceModal] = useState<{ place: Place } | null>(null);

  // Traveler info from sessionStorage
  const [travelers, setTravelers] = useState<TravelerInfo>({ adults: 2, children: 0, total: 2 });
  
  // Edit travelers modal
  const [showEditTravelersModal, setShowEditTravelersModal] = useState(false);
  
  // Budget state
  const [totalBudget, setTotalBudget] = useState(0);
  const [showBudgetDetail, setShowBudgetDetail] = useState(false);
  const [tripName, setTripName] = useState("");

  // ── 2-Step "Add Days" Flow States ────────────────────────────────────────
  const [showAddDaysModal, setShowAddDaysModal] = useState(false);
  // Compare ids as strings (tolerant of number/string mismatch between DB day ids
  // and the selectedDayId state) and fall back to the first day so a stale
  // selectedDayId can never produce undefined — which previously crashed the
  // center panel with "Cannot read properties of undefined (reading 'label')".
  const selectedDay = days.find((d) => String(d.id) === String(selectedDayId)) ?? days[0];
  const {
    accommodations, setAccommodations, showHotelSelection, setShowHotelSelection,
    selectedHotel, setSelectedHotel, showDaySelection, setShowDaySelection,
    selectedDaysForHotel, setSelectedDaysForHotel,
    bookingType, setBookingType, bookingDuration, setBookingDuration,
    getAccommodationForDay, getHotelsForCity, handleSelectHotel,
    handleConfirmAccommodation, handleChangeAccommodation
  } = useAccommodation(days, selectedDayId, remoteTripId);

  const {
    calculateHotelCost, calculateActivityCost, calculateDayCost,
    calculateDayCostByCategory, calculateTotalTripCost,
    calculateTotalCostByCategory, formatCurrency
  } = useTripCost(days, accommodations, travelers);

  const { applyServerTrip, handleSaveItinerary, currentTripId, currentTripUpdatedAt, isSaving, isLoading } = useTripSync(
    days, setDays, selectedDayId, setSelectedDayId, accommodations, setAccommodations,
    totalBudget, setTotalBudget, travelers, setTravelers, setIsAuthenticated, setPlaces,
    isAuthenticated, setShowLoginModal, updateNextId,
    tripName, setTripName,
    tripIdParam ? Number(tripIdParam) : null
  );

  // Sync tripId from useTripSync (e.g. after creating a new itinerary)
  useEffect(() => {
    if (currentTripId != null && currentTripId !== tripId) setTripId(currentTripId);
  }, [currentTripId]);

  const {
    draggedIdx, dragOverIdx, detailActivity, editingActivity, timeConflictWarning, viewingPlaceInfo,
    setDetailActivity, setEditingActivity, setOriginalEditingActivity, setTimeConflictWarning, setViewingPlaceInfo,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleDeleteActivity, handleViewDetails, checkTimeConflict, handleSaveActivityDetails,
    addActivityToDay,
    handleAddDayExtraExpenseFromSidebar, handleRemoveDayExtraExpense
  } = useActivityManager(days, setDays, selectedDayId, remoteTripId);

  // ── Add Place from PlaceSelectionModal ──────────────────────────────────
  const handleAddPlaceFromModal = (place: any) => {
    const dayId = selectedDayForPlaces || selectedDayId;
    const targetDay = days.find(d => d.id === dayId);
    const lastAct = targetDay?.activities[targetDay.activities.length - 1];
    const startTime = lastAct?.endTime || "09:00";
    const startMin = parseTimeToMinutes(startTime);
    const endTime = minutesToTime(startMin + 60);

    const act: Activity = {
      id: nextId++,
      name: place.name,
      time: startTime,
      endTime: endTime,
      location: place.location || place.name,
      description: place.description,
      type: "attraction",
      image: place.image,
      transportation: "taxi",
      adultPrice: 50000,
      childPrice: 25000,
      taxiCost: 50000,
      extraExpenses: [],
      latitude: place.latitude,
      longitude: place.longitude,
      placeId: place.id,
    };

    addActivityToDay(dayId, act);

    setShowPlaceSelectionModal(false);
    setSelectedDayForPlaces(null);
  };

  // ── Add Place to Itinerary (Từ Modal mới tách) ──────────────────────────
  const handleAddPlaceToItinerary = (dayIdStr: string, time: string, place: Place) => {
    const dayId = parseInt(dayIdStr);
    const addMin = parseTimeToMinutes(time);
    const act: Activity = {
      id: nextId++,
      name: place.name,
      time: time,
      endTime: minutesToTime(addMin + 60),
      location: place.location || place.name,
      description: typeLabels[place.type],
      type: place.type,
      image: place.image,
      transportation: "walk",
      adultPrice: place.type === "food" ? 50000 : place.type === "attraction" ? 40000 : undefined,
      childPrice: place.type === "food" ? 30000 : place.type === "attraction" ? 20000 : undefined,
      customCost: place.type === "shopping" || place.type === "entertainment" ? 100000 : undefined,
      extraExpenses: [],
      latitude: place.latitude,
      longitude: place.longitude,
      placeId: place.id,
    };
    addActivityToDay(dayId, act);
    setAddPlaceModal(null);
    setSelectedDayId(dayId);
  };
  
  // ──Add Days Flow Handlers ────────────────────────────────────────
  const handleAddNewDays = (newDaysData: Omit<Day, "id">[]) => {
    const newDaysWithId = newDaysData.map(dayData => ({
      ...dayData,
      id: nextId++
    }));
    setDays(prev => [...prev, ...newDaysWithId]);
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col bg-gray-100">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Đang tải thông tin lịch trình...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedDay) {
    return (
      <div className="flex h-screen flex-col bg-gray-100">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-md px-6 py-8 bg-white rounded-2xl shadow-xl">
            <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lịch trình bị lỗi</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Lịch trình này không chứa ngày nào hoặc đã bị hỏng cấu trúc trước đó (do lỗi đồng bộ cũ). Vui lòng tạo lịch trình mới để tiếp tục chỉnh sửa.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-700 transition-colors shadow-lg hover:shadow-cyan-600/30"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <Header />

      {/* Top Action Bar */}
      <TopActionBar
          travelersTotal={travelers.total}
          tripName={tripName || "Lịch trình mới"}
          tripId={remoteTripId}
          isSaving={isSaving}
          onNameChange={(newName) => {
            setTripName(newName);
          }}
          onEditTravelers={() => setShowEditTravelersModal(true)}
          onSaveItinerary={handleSaveItinerary}
          onCreateItinerary={() => {
            const emptyDay = days.find(day => !day.activities || day.activities.length === 0);
            if (emptyDay) {
              toast.error("Đang có ngày trống trong lịch trình, vui lòng kiểm tra lại", {
                position: "top-right",
                duration: 5000,
              });
              return;
            }
            navigate(remoteTripId ? `/daily-itinerary?tripId=${remoteTripId}` : "/daily-itinerary");
          }}
        />

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT SIDEBAR — Day List ──────────────────────────────────── */}
        <TripSidebar
          days={days}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          onDeleteDay={(dayId) => {
            const newDays = days.filter(d => d.id !== dayId);
            const renumberedDays = newDays.map((d, index) => ({
              ...d,
              label: d.destinationName 
                ? `Ngày ${index + 1} - ${d.destinationName}` 
                : `Ngày ${index + 1}`
            }));
            setDays(renumberedDays);
            if (selectedDayId === dayId && renumberedDays.length > 0) {
              setSelectedDayId(renumberedDays[0].id);
            }
          }}
          onAddDays={() => setShowAddDaysModal(true)}
          getAccommodationForDay={getAccommodationForDay}
        />

        {/* ── CENTER PANEL — Timeline ──────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedDay.label}</h2>
                <p className="text-sm text-gray-500">{selectedDay.date}</p>
              </div>
            </div>
            
            {/* Segmented Control */}
            <div className="flex justify-center gap-2 bg-gray-100 p-1 rounded-xl w-fit mx-auto">
              <button
                onClick={() => setActiveTab("places")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "places"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Địa điểm
              </button>
              <button
                onClick={() => {
                  setActiveTab("accommodation");
                  if (!getAccommodationForDay(selectedDayId) && !showDaySelection) {
                    setShowHotelSelection(true);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "accommodation"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Nơi ở
              </button>
            </div>
          </div>

      {/* Timeline / Accommodation Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "places" ? (
            <TripTimeline 
              selectedDay={selectedDay}
              draggedIdx={draggedIdx}
              dragOverIdx={dragOverIdx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onDeleteActivity={handleDeleteActivity}
              onViewDetails={handleViewDetails}
              calculateActivityCost={calculateActivityCost}
              formatCurrency={formatCurrency}
              onOpenPlaceSelection={() => {
                setSelectedDayForPlaces(selectedDayId);
                setShowPlaceSelectionModal(true);
              }}
            />
          ) : (
            <TripAccommodation
              selectedDay={selectedDay}
              selectedDayId={selectedDayId}
              days={days}
              showDaySelection={showDaySelection}
              selectedHotel={selectedHotel}
              selectedDaysForHotel={selectedDaysForHotel}
              showHotelSelection={showHotelSelection}
              bookingType={bookingType}
              bookingDuration={bookingDuration}
              setBookingType={setBookingType}
              setBookingDuration={setBookingDuration}
              calculateHotelCost={calculateHotelCost}
              getHotelsForCity={getHotelsForCity}
              getAccommodationForDay={getAccommodationForDay}
              setSelectedDaysForHotel={setSelectedDaysForHotel}
              onCancelDaySelection={() => {
                setShowDaySelection(false);
                setSelectedHotel(null);
                setSelectedDaysForHotel([]);
                setShowHotelSelection(true);
              }}
              onConfirmAccommodation={handleConfirmAccommodation}
              onChangeAccommodation={handleChangeAccommodation}
              onSelectHotel={handleSelectHotel}
              onShowHotelSelection={() => setShowHotelSelection(true)}
            />
          )}
        </div>
      </div>
      
      {/* ── RIGHT PANEL — Budget / Chat ──────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setRightPanelTab("budget")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === "budget"
                  ? "bg-white text-cyan-600 border-b-2 border-cyan-600"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Ngân sách
            </button>
            <button
              onClick={() => setRightPanelTab("chat")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === "chat"
                  ? "bg-white text-cyan-600 border-b-2 border-cyan-600"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              AI Chat
            </button>
          </div>

          {/* Tab Content */}
          {rightPanelTab === "budget" ? (
            <TripBudgetSidebar
              selectedDay={selectedDay}
              totalBudget={totalBudget}
              calculateTotalTripCost={calculateTotalTripCost}
              calculateDayCost={calculateDayCost}
              calculateDayCostByCategory={calculateDayCostByCategory}
              formatCurrency={formatCurrency}
              onOpenBudgetDetail={() => setShowBudgetDetail(true)}
              onAddDayExpense={handleAddDayExtraExpenseFromSidebar}
              onRemoveDayExpense={handleRemoveDayExtraExpense}
            />
          ) : (
            <div className="h-[calc(100vh-8rem)]">
              {remoteTripId ? (
                <ChatPanel
                  tripId={remoteTripId}
                  isAuthenticated={isAuthenticated}
                  tripUpdatedAt={currentTripUpdatedAt}
                  onTripPatched={applyServerTrip}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-3 text-sm text-gray-600">
                      Lưu lịch trình để sử dụng tính năng AI Chat
                    </p>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
                    >
                      Đăng nhập / Lưu lịch trình
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* ── ACTIVITY DETAIL MODAL ────────────────────────────────────────────── */}
      {detailActivity && editingActivity && (
      <ActivityDetailModal
        editingActivity={editingActivity}
        setEditingActivity={setEditingActivity}
        travelers={travelers}
        timeConflictWarning={timeConflictWarning}
        setTimeConflictWarning={setTimeConflictWarning}
        checkTimeConflict={checkTimeConflict}
        formatCurrency={formatCurrency}
        calculateActivityCost={calculateActivityCost}
        onViewPlace={setViewingPlaceInfo}
        onSave={handleSaveActivityDetails}
        onClose={() => {
          setDetailActivity(null);
          setEditingActivity(null);
          setOriginalEditingActivity(null);
          setTimeConflictWarning({ hasConflict: false });
        }}
      />
      )}
      
      {/* Other modals remain unchanged... */}
      <AddPlaceModal
        isOpen={!!addPlaceModal}
        place={addPlaceModal?.place || null}
        days={days}
        onClose={() => setAddPlaceModal(null)}
        onConfirm={handleAddPlaceToItinerary}
      />

      {/* 2-Step Add Days Flow Modal - keeping existing code... */}
      <AddDaysModal
        isOpen={showAddDaysModal}
        onClose={() => setShowAddDaysModal(false)}
        days={days}
        onConfirm={handleAddNewDays}
      />
      

      {showSavedSuggestions && (
        <SavedSuggestions
          isOpen={showSavedSuggestions}
          onClose={() => {
            setShowSavedSuggestions(false);
            if (!isAuthenticated) return;
            // Re-sync bookmark state from API
            listSavedPlaces().then((data) => {
              const savedIds = buildSavedPlaceIdSet(normalizeSavedPlaces(data));
              setPlaces((prev) =>
                prev.map((p) => ({ ...p, saved: savedIds.has(p.id) })),
              );
            }).catch(() => {});
          }}
          suggestions={savedSuggestions}
          onAddToItinerary={handleAddSuggestionToItinerary}
          onRemove={handleRemoveSavedSuggestion}
          days={days.map(d => ({ id: d.id, label: d.label, date: d.date }))}
        />
      )}

      {/* Edit Travelers Modal */}
      <EditTravelersModal
        isOpen={showEditTravelersModal}
        onClose={() => setShowEditTravelersModal(false)}
        travelers={travelers}
        setTravelers={setTravelers}
      />

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        reason="Đăng nhập để lưu lịch trình thủ công vào tài khoản. Nếu chưa đăng nhập, lịch trình chỉ được lưu tạm trong trình duyệt này."
      />

      {showPlaceSelectionModal && selectedDayForPlaces !== null && (
        <PlaceSelectionModal
          isOpen={showPlaceSelectionModal}
          onClose={() => {
            setShowPlaceSelectionModal(false);
            setSelectedDayForPlaces(null);
            if (!isAuthenticated) return;
            // Re-sync bookmark state from API after modal closes
            listSavedPlaces().then((data) => {
              const savedIds = buildSavedPlaceIdSet(normalizeSavedPlaces(data));
              setPlaces((prev) =>
                prev.map((p) => ({ ...p, saved: savedIds.has(p.id) })),
              );
            }).catch(() => {});
          }}
          currentDayLabel={days.find((d) => d.id === selectedDayForPlaces)?.label || ""}
          onAddPlace={handleAddPlaceFromModal}
          destinationName={days.find((d) => d.id === selectedDayForPlaces)?.destinationName}
        />
      )}

      {/* Budget Detail Modal */}
      <BudgetDetailModal
        isOpen={showBudgetDetail}
        onClose={() => setShowBudgetDetail(false)}
        totalBudget={totalBudget}
        setTotalBudget={setTotalBudget}
        calculateTotalTripCost={calculateTotalTripCost}
        calculateDayCost={calculateDayCost}
        calculateTotalCostByCategory={calculateTotalCostByCategory}
        formatCurrency={formatCurrency}
        days={days}
      />

      {/* Place Info Modal */}
      {viewingPlaceInfo && (
        <PlaceInfoModal
          place={viewingPlaceInfo}
          onClose={() => setViewingPlaceInfo(null)}
        />
      )}
      
    </div>
  );
}
