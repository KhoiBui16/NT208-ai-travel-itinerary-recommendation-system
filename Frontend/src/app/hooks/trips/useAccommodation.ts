import { useState } from "react";
import { Accommodation, Hotel, Day } from "../../types/trip.types";
import { availableHotels } from "../../utils/tripConstants";

export const useAccommodation = (days: Day[], selectedDayId: number) => {
  const [accommodations, setAccommodations] = useState<Record<number, Accommodation>>({});
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showDaySelection, setShowDaySelection] = useState(false);
  const [selectedDaysForHotel, setSelectedDaysForHotel] = useState<number[]>([]);
  const [bookingType, setBookingType] = useState<'hourly' | 'nightly' | 'daily'>('nightly');
  const [bookingDuration, setBookingDuration] = useState<number>(1);

  const getAccommodationForDay = (dayId: number): Accommodation | null => {
    for (const [key, accommodation] of Object.entries(accommodations)) {
      if (accommodation.dayIds.includes(dayId)) {
        return accommodation;
      }
    }
    return null;
  };

  const getDaysInSameCity = (dayId: number): Day[] => {
    const day = days.find(d => d.id === dayId);
    if (!day || !day.destinationName) return [];
    return days.filter(d => d.destinationName === day.destinationName);
  };

  const getHotelsForCity = (city?: string): Hotel[] => {
    if (!city) return [];
    return availableHotels.filter(h => h.city === city);
  };

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setShowHotelSelection(false);
    setSelectedDaysForHotel([selectedDayId]);
    setShowDaySelection(true);
  };

  const handleConfirmAccommodation = () => {
    if (!selectedHotel || selectedDaysForHotel.length === 0) return;
    const newAccommodation: Accommodation = {
      hotel: selectedHotel,
      dayIds: selectedDaysForHotel,
      bookingType: bookingType,
      duration: bookingDuration
    };
    setAccommodations((prev) => ({ ...prev, [selectedHotel.id]: newAccommodation }));
    setShowDaySelection(false);
    setSelectedHotel(null);
    setSelectedDaysForHotel([]);
    setShowHotelSelection(false);
    setBookingType('nightly');
    setBookingDuration(1);
  };

  const handleChangeAccommodation = () => {
    const currentAcc = getAccommodationForDay(selectedDayId);
    if (currentAcc) {
      setSelectedHotel(currentAcc.hotel);
      setSelectedDaysForHotel(currentAcc.dayIds);
      setBookingType(currentAcc.bookingType || 'nightly');
      setBookingDuration(currentAcc.duration || 1);
      setShowDaySelection(true);
      setShowHotelSelection(false);
    } else {
      setShowHotelSelection(true);
    }
  };

  return {
    accommodations, setAccommodations,
    showHotelSelection, setShowHotelSelection,
    selectedHotel, setSelectedHotel,
    showDaySelection, setShowDaySelection,
    selectedDaysForHotel, setSelectedDaysForHotel,
    bookingType, setBookingType,
    bookingDuration, setBookingDuration,
    getAccommodationForDay, getDaysInSameCity, getHotelsForCity,
    handleSelectHotel, handleConfirmAccommodation, handleChangeAccommodation
  };
};