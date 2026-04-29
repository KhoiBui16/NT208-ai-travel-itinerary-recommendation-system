import React from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { Day } from "../types/trip.types";

interface TripSidebarProps {
  days: Day[];
  selectedDayId: number;
  onSelectDay: (id: number) => void;
  onDeleteDay: (id: number) => void;
  onAddDays: () => void;
  getAccommodationForDay: (dayId: number) => any;
}

export function TripSidebar({
  days,
  selectedDayId,
  onSelectDay,
  onDeleteDay,
  onAddDays,
  getAccommodationForDay
}: TripSidebarProps) {
  return (
    <div className="flex w-52 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4">
        <h2 className="text-sm font-bold text-gray-900">Danh sách ngày</h2>
        <p className="text-xs text-gray-500">{days.length} ngày</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {days.map((day) => {
          const hasAccommodation = getAccommodationForDay(day.id) !== null;
          return (
            <div key={day.id} className="relative group mb-1">
              <button
                onClick={() => onSelectDay(day.id)}
                className={`w-full rounded-xl p-3 text-left transition-all ${
                  selectedDayId === day.id
                    ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <p className={`font-bold ${selectedDayId === day.id ? "text-white" : "text-gray-900"}`}>
                  {day.label}
                </p>
                <p className={`text-xs ${selectedDayId === day.id ? "text-cyan-100" : "text-gray-400"}`}>
                  {day.date}
                </p>
                <p className={`mt-1 text-xs ${selectedDayId === day.id ? "text-cyan-100" : "text-gray-400"}`}>
                  {day.activities.length} hoạt động
                </p>
                {!hasAccommodation && (
                  <div className={`mt-1 flex items-center gap-1 text-xs ${
                    selectedDayId === day.id ? "text-orange-200" : "text-orange-500"
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    <span>Chưa có nơi ở</span>
                  </div>
                )}
              </button>
              
              {days.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDay(day.id);
                  }}
                  className="absolute right-2 top-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Xóa ngày này"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={onAddDays}
          className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50"
        >
          <Plus className="h-4 w-4" />
          Thêm ngày
        </button>
      </div>
    </div>
  );
}