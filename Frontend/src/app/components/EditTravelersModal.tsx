import React, { useState, useEffect } from "react";
import { X, Users, Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { TravelerInfo } from "../types/trip.types";

interface EditTravelersModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelers: TravelerInfo;
  setTravelers: (t: TravelerInfo) => void;
}

export function EditTravelersModal({ isOpen, onClose, travelers, setTravelers }: EditTravelersModalProps) {
  const [editAdults, setEditAdults] = useState(travelers.adults);
  const [editChildren, setEditChildren] = useState(travelers.children);

  useEffect(() => {
    if (isOpen) {
      setEditAdults(travelers.adults);
      setEditChildren(travelers.children);
    }
  }, [isOpen, travelers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bạn đi bao nhiêu người?</h2>
          <p className="text-gray-500">Chọn số lượng người lớn và trẻ em tham gia chuyến đi</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Người lớn</h3>
                <p className="text-sm text-gray-500">Từ 12 tuổi trở lên</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditAdults(Math.max(0, editAdults - 1))} disabled={editAdults === 0} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Minus className="h-4 w-4" />
                </button>
                <input type="number" min="0" value={editAdults} onChange={(e) => setEditAdults(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 text-center text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-1 focus:border-cyan-500 focus:outline-none" />
                <button onClick={() => setEditAdults(editAdults + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Trẻ em</h3>
                <p className="text-sm text-gray-500">Dưới 12 tuổi</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditChildren(Math.max(0, editChildren - 1))} disabled={editChildren === 0} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Minus className="h-4 w-4" />
                </button>
                <input type="number" min="0" value={editChildren} onChange={(e) => setEditChildren(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 text-center text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-1 focus:border-cyan-500 focus:outline-none" />
                <button onClick={() => setEditChildren(editChildren + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {(editAdults + editChildren) > 0 && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-100">Tổng số người</p>
                <p className="text-2xl font-bold">{editAdults + editChildren} người</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-cyan-100">Bao gồm</p>
                <p className="text-base font-semibold">
                  {editAdults > 0 && `${editAdults} người lớn`}
                  {editAdults > 0 && editChildren > 0 && ", "}
                  {editChildren > 0 && `${editChildren} trẻ em`}
                </p>
              </div>
            </div>
          </div>
        )}

        {(editAdults + editChildren) > 0 && (
          <button
            onClick={() => {
              const newTravelers = { adults: editAdults, children: editChildren, total: editAdults + editChildren };
              setTravelers(newTravelers);
              onClose();
              toast.success("Đã cập nhật số người đi", { position: "top-right", duration: 3000 });
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <Check className="h-5 w-5" />
            Xác nhận
          </button>
        )}
      </div>
    </div>
  );
}