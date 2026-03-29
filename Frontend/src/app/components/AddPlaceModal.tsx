import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Day, Place } from "../types/trip.types";
import { typeColors, typeLabels } from "../utils/tripConstants";

interface AddPlaceModalProps {
  isOpen: boolean;
  place: Place | null;
  days: Day[];
  onClose: () => void;
  onConfirm: (dayId: string, time: string, place: Place) => void;
}

export function AddPlaceModal({ isOpen, place, days, onClose, onConfirm }: AddPlaceModalProps) {
  const [addToDay, setAddToDay] = useState("1");
  const [addToTime, setAddToTime] = useState("09:00");

  // Reset dữ liệu mỗi khi mở Modal
  useEffect(() => {
    if (isOpen && days.length > 0) {
      setAddToDay(days[0].id.toString());
      setAddToTime("09:00");
    }
  }, [isOpen, days]);

  if (!isOpen || !place) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Thêm vào lịch trình</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <img
            src={place.image}
            alt={place.name}
            className="h-12 w-16 rounded-lg object-cover"
          />
          <div>
            <p className="font-bold text-gray-900 text-sm">{place.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColors[place.type]}`}>
              {typeLabels[place.type]}
            </span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Chọn ngày</label>
            <select
              value={addToDay}
              onChange={(e) => setAddToDay(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:bg-white focus:outline-none"
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label} — {day.date}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Thời gian</label>
            <input
              type="time"
              value={addToTime}
              onChange={(e) => setAddToTime(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-cyan-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(addToDay, addToTime, place)}
            className="flex-1 rounded-xl bg-cyan-600 py-3 font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}