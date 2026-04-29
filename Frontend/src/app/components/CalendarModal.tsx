import { useState } from "react";
import { X, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, differenceInDays, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (from: Date, to: Date, days: number) => void;
  value: DateRange;
  selectedName: string;
  isDateDisabled?: (date: Date) => boolean;
}

export function CalendarModal({ open, onClose, onConfirm, value, selectedName, isDateDisabled }: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(() => value.from || new Date());
  const [tempRange, setTempRange] = useState<DateRange>(value);

  // Reset state when value changes (modal opens)
  // We use a key-based reset via the parent instead

  const handleDateClick = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return;
    if (isDateDisabled?.(date)) return;

    if (!tempRange.from) {
      setTempRange({ from: date, to: null });
    } else if (!tempRange.to) {
      if (isSameDay(date, tempRange.from)) {
        setTempRange({ from: tempRange.from, to: date });
      } else if (isBefore(date, tempRange.from)) {
        setTempRange({ from: date, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: date });
      }
    } else {
      if (isSameDay(date, tempRange.from) && isSameDay(tempRange.from, tempRange.to)) {
        setTempRange({ from: null, to: null });
      } else if (isSameDay(date, tempRange.from)) {
        setTempRange({ from: tempRange.to, to: null });
      } else if (isSameDay(date, tempRange.to)) {
        setTempRange({ from: tempRange.from, to: null });
      } else {
        setTempRange({ from: date, to: null });
      }
    }
  };

  const handleConfirm = () => {
    if (tempRange.from && tempRange.to) {
      const days = differenceInDays(tempRange.to, tempRange.from) + 1;
      if (days >= 1) onConfirm(tempRange.from, tempRange.to, days);
    }
  };

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));

    const today = startOfDay(new Date());

    return (
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-bold text-gray-900">Tháng {month + 1}, {year}</h3>
          <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />;

            const isPast = isBefore(day, today);
            const isDisabledByOthers = isDateDisabled?.(day) ?? false;
            const isDisabled = isPast || isDisabledByOthers;

            const isInRange = tempRange.from && tempRange.to &&
              !isBefore(day, tempRange.from) && !isAfter(day, tempRange.to);
            const isStart = tempRange.from && isSameDay(day, tempRange.from);
            const isEnd = tempRange.to && isSameDay(day, tempRange.to);

            return (
              <button
                key={i}
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                title={isDisabledByOthers ? "Ngày này đã đi thành phố khác rồi!" : undefined}
                className={`
                  aspect-square rounded-lg text-sm font-medium transition-all relative
                  ${isDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                  ${isInRange && !isDisabled ? 'bg-cyan-500 text-white' : ''}
                  ${(isStart || isEnd) && !isDisabled ? 'ring-2 ring-cyan-700' : ''}
                  ${!isDisabled && !isInRange ? 'bg-white border border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 text-gray-700' : ''}
                `}
              >
                {format(day, 'd')}
                {isDisabledByOthers && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-5 h-0.5 bg-gray-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100">
              <CalendarDays className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chọn ngày đi</h2>
              <p className="text-sm text-gray-500">{selectedName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selected Range Display */}
        {tempRange.from && tempRange.to && (
          <div className="mb-5 rounded-xl bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-200 p-3">
            <p className="text-center font-bold text-cyan-800">
              {format(tempRange.from, 'dd/MM/yyyy')} — {format(tempRange.to, 'dd/MM/yyyy')}
            </p>
            <p className="text-center text-sm text-cyan-600 mt-0.5">
              {differenceInDays(tempRange.to, tempRange.from) + 1} ngày
            </p>
          </div>
        )}

        {/* Calendar */}
        <div className="mb-5">{renderCalendar()}</div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-gray-200 px-6 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!tempRange.from || !tempRange.to}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2.5 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}