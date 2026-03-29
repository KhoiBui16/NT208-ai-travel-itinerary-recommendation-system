import React, { useState, useEffect, useRef } from "react";
import { User, Edit2, Save, Check } from "lucide-react";

interface TopActionBarProps {
  travelersTotal: number;
  tripName: string;
  onEditTravelers: () => void;
  onSaveItinerary: () => void;
  onCreateItinerary: () => void;
  onNameChange: (newName: string) => void;
}

export function TopActionBar({ travelersTotal, tripName, onEditTravelers, onSaveItinerary, onCreateItinerary, onNameChange }: TopActionBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(tripName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cập nhật lại tempName khi tripName từ ngoài truyền vào thay đổi
  useEffect(() => {
    setTempName(tripName);
  }, [tripName]);

  // Tự động focus vào ô input khi bấm edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Lưu tên
  const handleSave = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    } else {
      setTempName(tripName); // Trả lại tên cũ nếu để trống
    }
    setIsEditing(false);
  };

  // Bắt sự kiện phím Enter/Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTempName(tripName);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3 z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center">
          
          {/* Tính năng Đổi tên lịch trình */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-xl font-bold text-gray-900 border-b-2 border-cyan-500 focus:outline-none bg-transparent py-0.5 min-w-[300px]"
                placeholder="Nhập tên lịch trình..."
              />
              <button 
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }} 
                className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors"
                title="Lưu"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-3 cursor-pointer group rounded-lg hover:bg-gray-50 py-1 pr-2 transition-colors" 
              onClick={() => setIsEditing(true)}
              title="Nhấn để đổi tên lịch trình"
            >
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-cyan-700 transition-colors">
                {tripName || "Lịch trình chuyến đi"}
              </h1>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 group-hover:bg-cyan-100 transition-colors">
                <Edit2 className="h-4 w-4 text-gray-500 group-hover:text-cyan-600" />
              </div>
            </div>
          )}

          {/* Nút số người - Đã được thêm ml-8 để giãn khoảng cách to ra */}
          <button
            onClick={onEditTravelers}
            className="ml-8 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm transition-all hover:shadow-md hover:border-cyan-200"
          >
            <User className="h-4 w-4 text-cyan-600" />
            <span className="text-sm font-semibold text-gray-900">{travelersTotal} người</span>
            <Edit2 className="h-3.5 w-3.5 text-gray-400" />
          </button>

        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onSaveItinerary}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md"
          >
            <Save className="h-4 w-4" />
            Lưu lịch trình
          </button>
          <button
            onClick={onCreateItinerary}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02]"
          >
            <Check className="h-4 w-4" />
            Tạo lịch trình
          </button>
        </div>
      </div>
    </div>
  );
}