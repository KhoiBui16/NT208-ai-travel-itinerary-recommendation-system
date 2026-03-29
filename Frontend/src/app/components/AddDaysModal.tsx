import React, { useState } from "react";
import { X, Plus, MapPin, Check, CalendarDays, Calendar } from "lucide-react";
import { format, addDays, parse, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Day, DateAllocation } from "../types/trip.types";
import { availableDestinations } from "../utils/tripConstants";
import { CalendarModal } from "./CalendarModal";

interface AddDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: Day[];
  onConfirm: (newDays: Omit<Day, "id">[]) => void;
}

export function AddDaysModal({ isOpen, onClose, days, onConfirm }: AddDaysModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDestinations, setSelectedDestinations] = useState<number[]>([]);
  const [dateAllocations, setDateAllocations] = useState<Record<number, DateAllocation | null>>({});
  const [showCalendarForDest, setShowCalendarForDest] = useState<number | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const [initialDateRange, setInitialDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  if (!isOpen) return null;

  const handleToggleDestination = (destId: number) => {
    setSelectedDestinations((prev) =>
      prev.includes(destId) ? prev.filter((id) => id !== destId) : [...prev, destId]
    );
  };

  const handleConfirmDestinations = () => {
    if (selectedDestinations.length === 0) return;
    const initial: Record<number, DateAllocation | null> = {};
    selectedDestinations.forEach((destId) => {
      initial[destId] = null;
    });
    setDateAllocations(initial);
    setStep(2);
  };

  const handleScheduleClick = (destId: number) => {
    setShowCalendarForDest(destId);
    const current = dateAllocations[destId];
    if (current) {
      setInitialDateRange({ from: current.from, to: current.to });
    } else {
      setInitialDateRange({ from: null, to: null });
    }
    setCalendarKey((prev) => prev + 1);
  };

  const getAllOccupiedDates = (): Date[] => {
    const occupiedDates: Date[] = [];
    days.forEach((day) => {
      try {
        const parsed = parse(day.date, "dd/MM/yyyy", new Date());
        occupiedDates.push(startOfDay(parsed));
      } catch (e) {}
    });
    return occupiedDates;
  };

  const isDateAllocatedInAddFlow = (date: Date): boolean => {
    if (!showCalendarForDest) return false;
    const dateStr = format(startOfDay(date), "yyyy-MM-dd");
    const occupiedDates = getAllOccupiedDates();
    
    for (const occupiedDate of occupiedDates) {
      if (format(occupiedDate, "yyyy-MM-dd") === dateStr) return true;
    }
    
    for (const [id, allocation] of Object.entries(dateAllocations)) {
      if (parseInt(id) === showCalendarForDest) continue;
      if (allocation) {
        let current = startOfDay(allocation.from);
        const end = startOfDay(allocation.to);
        while (current <= end) {
          if (format(current, "yyyy-MM-dd") === dateStr) return true;
          current = addDays(current, 1);
        }
      }
    }
    return false;
  };

  const handleConfirmDatesForDest = (from: Date, to: Date, daysCount: number) => {
    if (showCalendarForDest) {
      setDateAllocations((prev) => ({
        ...prev,
        [showCalendarForDest]: { from, to, days: daysCount },
      }));
      setShowCalendarForDest(null);
    }
  };

  const handleConfirmAddDays = () => {
    const hasAllAllocations = selectedDestinations.every((destId) => {
      const allocation = dateAllocations[destId];
      return allocation && allocation.days >= 1;
    });
    
    if (!hasAllAllocations) return;
    
    const selectedDests = availableDestinations.filter((d) => selectedDestinations.includes(d.id));
    let newDayNumber = days.length + 1;
    const newDays: Omit<Day, "id">[] = [];
    
    selectedDests.forEach((dest) => {
      const allocation = dateAllocations[dest.id];
      if (!allocation) return;
      for (let i = 0; i < allocation.days; i++) {
        const currentDate = addDays(allocation.from, i);
        newDays.push({
          label: `Ngày ${newDayNumber++} - ${dest.name}`,
          date: format(currentDate, "dd/MM/yyyy", { locale: vi }),
          activities: [],
          destinationName: dest.name,
        });
      }
    });
    
    onConfirm(newDays);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setSelectedDestinations([]);
    setDateAllocations({});
    setShowCalendarForDest(null);
  };

  const totalAllocatedDays = Object.values(dateAllocations).reduce((sum, allocation) => {
    return sum + (allocation ? allocation.days : 0);
  }, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          {step === 1 && (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chọn thành phố</h2>
                  <p className="text-sm text-gray-500">Chọn các thành phố bạn muốn thêm vào chuyến đi</p>
                </div>
                <button
                  onClick={handleClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedDestinations.length > 0 && (
                <div className="mb-5 rounded-xl bg-cyan-50 border border-cyan-200 p-4">
                  <p className="text-sm font-semibold text-cyan-700">
                    Đã chọn {selectedDestinations.length} thành phố
                  </p>
                </div>
              )}

              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableDestinations.map((dest) => {
                  const isSelected = selectedDestinations.includes(dest.id);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => handleToggleDestination(dest.id)}
                      className={`group overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "border-cyan-500 bg-white ring-2 ring-cyan-200 shadow-lg"
                          : "border-gray-200 bg-white hover:border-cyan-300 hover:shadow-md"
                      }`}
                    >
                      <div className="relative h-40">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        
                        <div className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          isSelected ? "bg-cyan-500 text-white" : "bg-white/80 text-gray-600"
                        }`}>
                          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </div>

                        <div className="absolute bottom-3 left-3">
                          <h3 className="text-lg font-bold text-white">{dest.name}</h3>
                          <div className="flex items-center gap-1 text-white/90">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">{dest.country}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={handleClose}
                  className="rounded-xl border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmDestinations}
                  disabled={selectedDestinations.length === 0}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Tiếp tục
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Phân bổ ngày cho chuyến đi</h2>
                  <p className="text-sm text-gray-500">Lên lịch cụ thể cho từng địa điểm bạn đã chọn</p>
                </div>
                <button
                  onClick={handleClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-cyan-100">Tổng số ngày đã lên lịch</p>
                      <p className="text-2xl font-bold">{totalAllocatedDays} ngày</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                {availableDestinations.filter(d => selectedDestinations.includes(d.id)).map((dest) => {
                  const allocation = dateAllocations[dest.id];
                  const isAllocated = !!allocation;
                  
                  return (
                    <div
                      key={dest.id}
                      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
                        isAllocated ? "border-cyan-200" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                          <img
                            src={dest.image}
                            alt={dest.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900">{dest.name}</h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{dest.country}</span>
                          </div>
                          {allocation ? (
                            <div className="mt-1.5 flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-cyan-600 flex-shrink-0" />
                              <span className="text-sm font-semibold text-cyan-700">
                                {format(allocation.from, 'dd/MM/yyyy')} — {format(allocation.to, 'dd/MM/yyyy')}
                              </span>
                              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                {allocation.days} ngày
                              </span>
                            </div>
                          ) : (
                            <p className="mt-1.5 text-sm text-gray-400 italic">Chưa lên lịch</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleScheduleClick(dest.id)}
                          className={`flex-shrink-0 rounded-xl px-5 py-2.5 font-semibold transition-all ${
                            isAllocated
                              ? "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                              : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-sm hover:shadow-md hover:scale-[1.02]"
                          }`}
                        >
                          {isAllocated ? "Đổi lịch" : "Lên lịch"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleConfirmAddDays}
                  disabled={totalAllocatedDays === 0 || !selectedDestinations.every(id => dateAllocations[id])}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Xác nhận
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <CalendarModal
        key={calendarKey}
        open={showCalendarForDest !== null}
        onClose={() => setShowCalendarForDest(null)}
        onConfirm={handleConfirmDatesForDest}
        value={initialDateRange}
        selectedName={availableDestinations.find(d => d.id === showCalendarForDest)?.name || ""}
        isDateDisabled={isDateAllocatedInAddFlow}
      />
    </>
  );
}