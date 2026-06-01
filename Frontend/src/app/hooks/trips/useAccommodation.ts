/**
 * useAccommodation — Hook quản lý chỗ ở trong lịch trình
 *
 * Cung cấp toàn bộ CRUD + UI logic cho accommodations:
 *   • State management  — accommodations map, hotel selection, day selection
 *   • Query helpers      — lấy accommodation theo day, hotels theo city
 *   • CRUD handlers      — select, confirm, change, delete (optimistic UI)
 *
 * Pattern: Optimistic UI update → API call → Revert on failure
 */

import { useState } from "react";
import { Accommodation, Hotel, Day } from "../../types/trip.types";
import { availableHotels } from "../../utils/tripConstants";
import * as itineraryService from "../../services/itinerary";

export const useAccommodation = (days: Day[], selectedDayId: number, tripId: number | null) => {

  // ===================================================================
  // 1. State — Trạng thái UI
  // ===================================================================

  /** Map dayId → Accommodation (lookup nhanh accommodation theo ngày) */
  const [accommodations, setAccommodations] = useState<Record<number, Accommodation>>({});

  /** Hiển thị modal chọn hotel */
  const [showHotelSelection, setShowHotelSelection] = useState(false);

  /** Hotel đã chọn (trước khi confirm) */
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  /** Hiển thị modal chọn ngày áp dụng */
  const [showDaySelection, setShowDaySelection] = useState(false);

  /** Danh sách ngày đã chọn cho hotel */
  const [selectedDaysForHotel, setSelectedDaysForHotel] = useState<number[]>([]);

  /** Loại booking (hourly/nightly/daily) */
  const [bookingType, setBookingType] = useState<'hourly' | 'nightly' | 'daily'>('nightly');

  /** Thời gian lưu trú (số đêm/giờ/ngày) */
  const [bookingDuration, setBookingDuration] = useState<number>(1);

  // ===================================================================
  // 2. Query helpers — Truy vấn dữ liệu
  // ===================================================================

  /** Lấy accommodation đang gán cho ngày cụ thể (nếu có) */
  const getAccommodationForDay = (dayId: number): Accommodation | null => {
    for (const [key, accommodation] of Object.entries(accommodations)) {
      if (accommodation.dayIds.includes(dayId)) {
        return accommodation;
      }
    }
    return null;
  };

  /** Lấy tất cả ngày cùng thành phố với ngày được chọn */
  const getDaysInSameCity = (dayId: number): Day[] => {
    const day = days.find(d => d.id === dayId);
    if (!day || !day.destinationName) return [];
    return days.filter(d => d.destinationName === day.destinationName);
  };

  /** Lấy danh sách hotels có sẵn cho thành phố (từ mock data) */
  const getHotelsForCity = (city?: string): Hotel[] => {
    if (!city) return [];
    return availableHotels.filter(h => h.city === city);
  };

  // ===================================================================
  // 3. CRUD handlers — Chọn, xác nhận, thay đổi, xóa accommodation
  // ===================================================================

  /** Chọn hotel → đóng modal hotel → mở modal chọn ngày */
  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setShowHotelSelection(false);
    setSelectedDaysForHotel([selectedDayId]);
    setShowDaySelection(true);
  };

  /** Xác nhận accommodation — Optimistic UI + API call */
  const handleConfirmAccommodation = () => {
    if (!selectedHotel || selectedDaysForHotel.length === 0) return;
    const newAccommodation: Accommodation = {
      hotel: selectedHotel,
      dayIds: selectedDaysForHotel,
      bookingType: bookingType,
      duration: bookingDuration
    };

    // Optimistic UI update — thêm ngay vào map
    setAccommodations((prev) => ({ ...prev, [selectedHotel.id]: newAccommodation }));

    // Reset UI state
    setShowDaySelection(false);
    setSelectedHotel(null);
    setSelectedDaysForHotel([]);
    setShowHotelSelection(false);
    setBookingType('nightly');
    setBookingDuration(1);

    // API call — nếu có tripId
    if (tripId) {
      itineraryService.addAccommodation(tripId, {
        hotel: selectedHotel,
        dayIds: selectedDaysForHotel,
        bookingType: bookingType,
        duration: bookingDuration,
        name: selectedHotel.name,
        pricePerNight: selectedHotel.pricePerNight,
        totalPrice: selectedHotel.pricePerNight * bookingDuration,
      }).catch(() => {
        // Revert on failure — xóa accommodation vừa thêm
        setAccommodations((prev) => {
          const next = { ...prev };
          delete next[selectedHotel.id];
          return next;
        });
      });
    }
  };

  /** Xóa accommodation — Optimistic UI + API call */
  const handleDeleteAccommodation = (accKey: number) => {
    const deleted = accommodations[accKey];

    // Optimistic UI update — xóa ngay
    setAccommodations((prev) => {
      const next = { ...prev };
      delete next[accKey];
      return next;
    });

    // API call — nếu có tripId
    if (tripId && deleted?.id) {
      itineraryService.deleteAccommodation(tripId, deleted.id).catch(() => {
        // Revert on failure — thêm lại accommodation đã xóa
        if (deleted) {
          setAccommodations((prev) => ({ ...prev, [accKey]: deleted }));
        }
      });
    }
  };

  /** Thay đổi accommodation — mở lại modal edit hoặc modal chọn hotel mới */
  const handleChangeAccommodation = () => {
    const currentAcc = getAccommodationForDay(selectedDayId);
    if (currentAcc) {
      // Đã có accommodation → mở modal edit với data hiện tại
      setSelectedHotel(currentAcc.hotel);
      setSelectedDaysForHotel(currentAcc.dayIds);
      setBookingType(currentAcc.bookingType || 'nightly');
      setBookingDuration(currentAcc.duration || 1);
      setShowDaySelection(true);
      setShowHotelSelection(false);
    } else {
      // Chưa có → mở modal chọn hotel mới
      setShowHotelSelection(true);
    }
  };

  // ===================================================================
  // Return — Export state và handlers
  // ===================================================================

  return {
    // State
    accommodations, setAccommodations,
    showHotelSelection, setShowHotelSelection,
    selectedHotel, setSelectedHotel,
    showDaySelection, setShowDaySelection,
    selectedDaysForHotel, setSelectedDaysForHotel,
    bookingType, setBookingType,
    bookingDuration, setBookingDuration,
    // Query helpers
    getAccommodationForDay, getDaysInSameCity, getHotelsForCity,
    // CRUD handlers
    handleSelectHotel, handleConfirmAccommodation, handleChangeAccommodation,
    handleDeleteAccommodation
  };
};
