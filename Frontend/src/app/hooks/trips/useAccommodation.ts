import { useState } from "react";
import { Accommodation, Hotel, Day } from "../../types/trip.types";
import { availableHotels } from "../../utils/tripConstants";
import * as itineraryService from "../../services/itinerary";
import { normalizeAccommodationRecord } from "../../utils/tripResponseMapper";

export const useAccommodation = (days: Day[], selectedDayId: number, tripId: number | null) => {
  const [accommodations, setAccommodations] = useState<Record<number, Accommodation>>({});
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showDaySelection, setShowDaySelection] = useState(false);
  const [selectedDaysForHotel, setSelectedDaysForHotel] = useState<number[]>([]);
  const [bookingType, setBookingType] = useState<'hourly' | 'nightly' | 'daily'>('nightly');
  const [bookingDuration, setBookingDuration] = useState<number>(1);

  const getAccommodationForDay = (dayId: number): Accommodation | null => {
    for (const accommodation of Object.values(normalizeAccommodationRecord(accommodations))) {
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
    setSelectedDaysForHotel((prev) => (prev.length > 0 ? prev : [selectedDayId]));
    setShowDaySelection(true);
  };

  const handleConfirmAccommodation = () => {
    if (!selectedHotel || selectedDaysForHotel.length === 0) return;
    const hotel = selectedHotel;
    const dayIds = [...selectedDaysForHotel];
    const currentBookingType = bookingType;
    const currentBookingDuration = bookingDuration;
    const optimisticKey = Date.now();
    const previousAccommodations = accommodations;
    const overlappingEntries = Object.entries(normalizeAccommodationRecord(accommodations)).filter(([, accommodation]) =>
      accommodation.dayIds.some((dayId) => dayIds.includes(dayId)),
    );
    const overlappingPersistedIds = overlappingEntries
      .map(([, accommodation]) => accommodation.id)
      .filter((value): value is number => typeof value === "number");
    const newAccommodation: Accommodation = {
      hotel,
      dayIds,
      bookingType: currentBookingType,
      duration: currentBookingDuration,
      name: hotel.name,
      pricePerNight: hotel.price,
      totalPrice: hotel.price * currentBookingDuration,
    };

    // Optimistic UI update
    setAccommodations((prev) => {
      const next = { ...prev };
      for (const [key] of overlappingEntries) {
        delete next[Number(key)];
      }
      next[optimisticKey] = newAccommodation;
      return normalizeAccommodationRecord(next);
    });
    setShowDaySelection(false);
    setSelectedHotel(null);
    setSelectedDaysForHotel([]);
    setShowHotelSelection(false);
    setBookingType('nightly');
    setBookingDuration(1);

    // Fire API call if tripId exists
    if (tripId) {
      void (async () => {
        try {
          await Promise.all(
            overlappingPersistedIds.map((accommodationId) =>
              itineraryService.deleteAccommodation(tripId, accommodationId),
            ),
          );

          const created = await itineraryService.addAccommodation(tripId, {
            hotel,
            dayIds,
            bookingType: currentBookingType,
            duration: currentBookingDuration,
            name: hotel.name,
            pricePerNight: hotel.price,
            totalPrice: hotel.price * currentBookingDuration,
          });

          setAccommodations((prev) => {
            const next = { ...prev };
            delete next[optimisticKey];
            next[created.id ?? optimisticKey] = {
              ...newAccommodation,
              id: created.id,
              hotel: (created.hotel as Hotel) || hotel,
              dayIds: created.dayIds,
              bookingType: created.bookingType as Accommodation["bookingType"],
              duration: created.duration,
              name: created.name,
              checkIn: created.checkIn,
              checkOut: created.checkOut,
              pricePerNight: created.pricePerNight,
              totalPrice: created.totalPrice,
            };
            return normalizeAccommodationRecord(next);
          });
        } catch {
          setAccommodations(previousAccommodations);
        }
      })();
    }
  };

  const handleDeleteAccommodation = (accKey: number) => {
    const deleted = accommodations[accKey];

    // Optimistic UI update
    setAccommodations((prev) => {
      const next = { ...prev };
      delete next[accKey];
      return next;
    });

    // Fire API call if tripId exists
    if (tripId && deleted?.id) {
      itineraryService.deleteAccommodation(tripId, deleted.id).catch(() => {
        // Revert on failure
        if (deleted) {
          setAccommodations((prev) => normalizeAccommodationRecord({ ...prev, [accKey]: deleted }));
        }
      });
    }
  };

  const handleChangeAccommodation = () => {
    const currentAcc = getAccommodationForDay(selectedDayId);
    if (currentAcc) {
      setSelectedHotel(currentAcc.hotel || null);
      setSelectedDaysForHotel(currentAcc.dayIds);
      setBookingType(currentAcc.bookingType || 'nightly');
      setBookingDuration(currentAcc.duration || 1);
      if (currentAcc.hotel) {
        setShowDaySelection(true);
        setShowHotelSelection(false);
      } else {
        setShowDaySelection(false);
        setShowHotelSelection(true);
      }
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
    handleSelectHotel, handleConfirmAccommodation, handleChangeAccommodation,
    handleDeleteAccommodation
  };
};
