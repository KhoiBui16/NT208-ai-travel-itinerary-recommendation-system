import React from "react";
import { Calendar, Plus, GripVertical, Clock, MapPin, Trash2, Eye } from "lucide-react";
import { Day, Activity } from "../types/trip.types";
import { typeColors, typeLabels } from "../utils/tripConstants";

interface TripTimelineProps {
  selectedDay: Day;
  draggedIdx: number | null;
  dragOverIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (idx: number) => void;
  onDragEnd: () => void;
  onDeleteActivity: (actId: number) => void;
  onViewDetails: (act: Activity) => void;
  calculateActivityCost: (act: Activity) => number;
  formatCurrency: (val: number) => string;
  onOpenPlaceSelection: () => void;
}

export function TripTimeline({
  selectedDay,
  draggedIdx,
  dragOverIdx,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDeleteActivity,
  onViewDetails,
  calculateActivityCost,
  formatCurrency,
  onOpenPlaceSelection
}: TripTimelineProps) {
  if (selectedDay.activities.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Calendar className="mb-4 h-14 w-14 text-gray-200" />
        <p className="mb-2 font-semibold text-gray-400">Chưa có hoạt động nào</p>
        <p className="mb-6 text-sm text-gray-400">Chọn địa điểm để thêm vào lịch trình</p>
        <button
          onClick={onOpenPlaceSelection}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Chọn địa điểm cho ngày này
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-400 via-purple-300 to-orange-300" />

      <div className="mb-4 flex justify-end">
        <button
          onClick={onOpenPlaceSelection}
          className="flex items-center gap-2 rounded-xl border-2 border-cyan-500 bg-white px-4 py-2 text-sm font-semibold text-cyan-600 transition-all hover:bg-cyan-50"
        >
          <Plus className="h-4 w-4" />
          Thêm địa điểm
        </button>
      </div>

      <div className="space-y-4">
        {selectedDay.activities.map((act, idx) => (
          <div
            key={act.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={onDragEnd}
            className={`relative ml-14 transition-all duration-200 ${
              draggedIdx === idx ? "opacity-50 scale-[0.98]" : ""
            } ${dragOverIdx === idx && draggedIdx !== idx ? "translate-y-1 ring-2 ring-cyan-400 rounded-2xl" : ""}`}
          >
            <div className="absolute -left-9 top-5 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 border-cyan-500 shadow">
              <div className="h-2 w-2 rounded-full bg-cyan-500" />
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
              <div className="flex gap-3">
                <div className="mt-1 cursor-grab active:cursor-grabbing flex-shrink-0">
                  <GripVertical className="h-5 w-5 text-gray-300" />
                </div>

                <img
                  src={act.image}
                  alt={act.name}
                  className="h-20 w-24 flex-shrink-0 rounded-xl object-cover"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-cyan-500" />
                        <span className="text-xs font-semibold text-cyan-600">
                          {act.time}{act.endTime ? ` - ${act.endTime}` : ""}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColors[act.type]}`}>
                          {typeLabels[act.type]}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 truncate">{act.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">{act.description}</p>
                    </div>

                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        onClick={() => onDeleteActivity(act.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {act.type !== "nature" && (
                    <div className="mb-2">
                      <span className="text-sm font-semibold text-green-700">
                        Chi phí ước tính: {formatCurrency(calculateActivityCost(act))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => onViewDetails(act)}
                      className="flex items-center gap-1 text-xs font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}