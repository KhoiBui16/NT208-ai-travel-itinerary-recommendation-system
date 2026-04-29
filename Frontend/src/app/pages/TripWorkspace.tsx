import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Header } from "../components/Header";
import { FloatingAIChat } from "../components/FloatingAIChat";
import { SavedSuggestions, SavedSuggestion } from "../components/SavedSuggestions";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { PlaceSelectionModal } from "../components/PlaceSelectionModal";
import { CalendarModal } from "../components/CalendarModal";
import { PlaceInfoModal } from "../components/PlaceInfoModal";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast, Toaster } from "sonner";
import {
  Plus, Sparkles, GripVertical, Clock, MapPin, Search, Star, Heart,
  Utensils, Landmark, TreePine, Music, ShoppingBag, Trash2, X, Check,
  ChevronRight, Calendar, Save, Bookmark, Home, CalendarDays,
  Hotel as HotelIcon, Wifi, Coffee, Car, AlertCircle, Eye, DollarSign,
  Users, Bike, Bus, Navigation, Minus, User, Edit
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
import { TripSidebar } from "../components/tripSidebar";
import { TripBudgetSidebar } from "../components/TripBudgetSidebar";
import { TripTimeline } from "../components/TripTimeline";
import { TripAccommodation } from "../components/TripAccommodation";
import { EditTravelersModal } from "../components/EditTravelersModal";
import { BudgetDetailModal } from "../components/BudgetDetailModal";
import { AddDaysModal } from "../components/AddDaysModal";
import { AddPlaceModal } from "../components/AddPlaceModal";
import { useTripCost } from "../hooks/useTripCost";
import { AIPromoBubble } from "../components/AIPromoBubble";
import { TopActionBar } from "../components/TopActionBar";
import { useActivityManager } from "../hooks/trips/useActivityManager";
import { useAccommodation } from "../hooks/trips/useAccommodation";
import { usePlacesManager } from "../hooks/trips/usePlacesManager";
import { useTripSync } from "../hooks/trips/useTripSync";
// Khởi tạo ID (để tránh lỗi khi tạo hoạt động mới)
let nextId = 500;
const updateNextId = (id: number) => { nextId = Math.max(nextId, id); };
// ── Mock Data ──────────────────────────────────────────────────────────────

  // Hàm tính tiền khách sạn (Giờ / Đêm / Ngày)

export default function TripWorkspace() {
  
  const navigate = useNavigate();
  const [days, setDays] = useState<Day[]>(initialDays);
  const [selectedDayId, setSelectedDayId] = useState(1);

  // Tab state for Địa điểm / Nơi ở
  const [activeTab, setActiveTab] = useState<"places" | "accommodation">("places");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const {
    places, setPlaces, placeSearch, setPlaceSearch, activeFilter, setActiveFilter,
    showSavedSuggestions, setShowSavedSuggestions, savedSuggestions, setSavedSuggestions,
    filteredPlaces, handleAddSuggestionToItinerary, handleRemoveSavedSuggestion, toggleSavePlace
  } = usePlacesManager(days, setDays, selectedDayId, isAuthenticated, setShowLoginModal);
  
  // Place Selection Modal state
  const [showPlaceSelectionModal, setShowPlaceSelectionModal] = useState(false);
  const [selectedDayForPlaces, setSelectedDayForPlaces] = useState<number | null>(null);
  
  // AI bubble speech states
  const [showAIBubbleSpeech, setShowAIBubbleSpeech] = useState(false);
  const [hasClosedBubbleSpeech, setHasClosedBubbleSpeech] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);

  // Add to itinerary modal (from place panel)
  const [addPlaceModal, setAddPlaceModal] = useState<{ place: Place } | null>(null);

  // Traveler info from localStorage
  const [travelers, setTravelers] = useState<TravelerInfo>({ adults: 2, children: 0, total: 2 });
  
  // Edit travelers modal
  const [showEditTravelersModal, setShowEditTravelersModal] = useState(false);
  
  // Budget state
  const [totalBudget, setTotalBudget] = useState(0);
  const [showBudgetDetail, setShowBudgetDetail] = useState(false);
  const [tripName, setTripName] = useState("");

  // ── 2-Step "Add Days" Flow States ────────────────────────────────────────
  const [showAddDaysModal, setShowAddDaysModal] = useState(false);
  const selectedDay = days.find((d) => d.id === selectedDayId)!;
  
  const {
    accommodations, setAccommodations, showHotelSelection, setShowHotelSelection,
    selectedHotel, setSelectedHotel, showDaySelection, setShowDaySelection,
    selectedDaysForHotel, setSelectedDaysForHotel,
    bookingType, setBookingType, bookingDuration, setBookingDuration,
    getAccommodationForDay, getHotelsForCity, handleSelectHotel, 
    handleConfirmAccommodation, handleChangeAccommodation
  } = useAccommodation(days, selectedDayId);

  const {
    calculateHotelCost, calculateActivityCost, calculateDayCost,
    calculateDayCostByCategory, calculateTotalTripCost,
    calculateTotalCostByCategory, formatCurrency
  } = useTripCost(days, accommodations, travelers);

  const updateNextId = (id: number) => { nextId = Math.max(nextId, id); };

  const { handleSaveItinerary } = useTripSync(
    days, setDays, setSelectedDayId, accommodations, setAccommodations,
    totalBudget, setTotalBudget, setTravelers, setIsAuthenticated, setPlaces,
    isAuthenticated, setShowLoginModal, updateNextId,
    tripName, setTripName // <-- THÊM 2 BIẾN NÀY VÀO CUỐI
  );

  const {
    draggedIdx, dragOverIdx, detailActivity, editingActivity, timeConflictWarning, viewingPlaceInfo,
    setDetailActivity, setEditingActivity, setOriginalEditingActivity, setTimeConflictWarning, setViewingPlaceInfo,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleDeleteActivity, handleViewDetails, checkTimeConflict, handleSaveActivityDetails,
    handleAddDayExtraExpenseFromSidebar, handleRemoveDayExtraExpense
  } = useActivityManager(days, setDays, selectedDayId);

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
      location: place.name,
      description: place.description,
      type: "attraction",
      image: place.image,
      transportation: "taxi",
      adultPrice: 50000,
      childPrice: 25000,
      taxiCost: 50000,
      extraExpenses: [],
    };
    
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const newActivities = [...day.activities, act];
        return { ...day, activities: resolveTimeConflicts(newActivities) };
      })
    );
    
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
      location: place.name,
      description: typeLabels[place.type],
      type: place.type,
      image: place.image,
      transportation: "walk",
      adultPrice: place.type === "food" ? 50000 : place.type === "attraction" ? 40000 : undefined,
      childPrice: place.type === "food" ? 30000 : place.type === "attraction" ? 20000 : undefined,
      customCost: place.type === "shopping" || place.type === "entertainment" ? 100000 : undefined,
      extraExpenses: [],
    };
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const newActivities = [...day.activities, act];
        return { ...day, activities: resolveTimeConflicts(newActivities) };
      })
    );
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
    

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <Header />

      {/* Top Action Bar */}
      <TopActionBar
          travelersTotal={travelers.total}
          tripName={tripName || "Lịch trình mới"}
          onNameChange={(newName) => {
            setTripName(newName);
            // Optional: Thêm logic lưu tên mới vào localStorage nếu cần
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
            navigate("/daily-itinerary");
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
      
      {/* ── RIGHT PANEL — Budget & Expenses ────────────────────────────── */}
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
            // Re-sync bookmark state from localStorage
            const savedPlacesData = localStorage.getItem("savedPlaces");
            if (savedPlacesData) {
              try {
                const savedPlacesArray = JSON.parse(savedPlacesData);
                const savedNames = new Set(savedPlacesArray.map((p: any) => p.name));
                setPlaces(prev => prev.map(p => ({
                  ...p,
                  saved: savedNames.has(p.name),
                })));
              } catch (e) {}
            }
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

      {/* AI Bubble Speech */}
      <AIPromoBubble
      show={showAIBubbleSpeech}
      onClose={() => {
        setShowAIBubbleSpeech(false);
        setHasClosedBubbleSpeech(true);
        sessionStorage.setItem('hasClosedAIBubbleSpeech', 'true');
        }}
      />
      
      <FloatingAIChat 
        selectedCities={["Hà Nội"]} 
        onOpen={() => {
          setHasOpenedChat(true);
          sessionStorage.setItem('hasOpenedAIChat', 'true');
          setShowAIBubbleSpeech(false);
        }}
      />

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        reason="Đăng nhập để lưu lịch trình và sử dụng đầy đủ tính năng"
      />

      {showPlaceSelectionModal && selectedDayForPlaces !== null && (
        <PlaceSelectionModal
          isOpen={showPlaceSelectionModal}
          onClose={() => {
            setShowPlaceSelectionModal(false);
            setSelectedDayForPlaces(null);
            // Re-sync bookmark state from localStorage after modal closes
            const savedPlacesData = localStorage.getItem("savedPlaces");
            if (savedPlacesData) {
              try {
                const savedPlacesArray = JSON.parse(savedPlacesData);
                const savedNames = new Set(savedPlacesArray.map((p: any) => p.name));
                setPlaces(prev => prev.map(p => ({
                  ...p,
                  saved: savedNames.has(p.name),
                })));
              } catch (e) {}
            }
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
      
      <Toaster />
    </div>
  );
}
