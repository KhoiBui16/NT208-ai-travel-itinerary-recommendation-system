import { useState } from "react";
import { Bell, Clock, MapPin, X, Settings, Moon } from "lucide-react";

interface Reminder {
  id: number;
  type: "departure" | "closing";
  activityName: string;
  location: string;
  time: string;
  minutesBefore: number;
}

interface SmartRemindersProps {
  reminders: Reminder[];
  onDismiss: (id: number) => void;
  onSnooze: (id: number) => void;
  dayStarted: boolean;
}

export function SmartReminders({ reminders, onDismiss, onSnooze, dayStarted }: SmartRemindersProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [enableDeparture, setEnableDeparture] = useState(true);
  const [enableClosing, setEnableClosing] = useState(true);
  const [dndMode, setDndMode] = useState(false);
  
  if (!dayStarted || dndMode) {
    return null;
  }
  
  const activeReminders = reminders.filter((r) => {
    if (r.type === "departure" && !enableDeparture) return false;
    if (r.type === "closing" && !enableClosing) return false;
    return true;
  });
  
  return (
    <>
      {/* Reminder Cards */}
      <div className="fixed top-20 right-6 z-40 w-full max-w-sm space-y-3">
        {activeReminders.map((reminder) => (
          <div
            key={reminder.id}
            className="animate-slide-in-right rounded-2xl bg-white shadow-2xl border-2 border-orange-400 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="h-6 w-6 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="font-bold text-lg">
                      {reminder.type === "departure" ? "Sắp đến giờ khởi hành" : "Sắp đóng cửa"}
                    </h4>
                    <p className="text-sm text-orange-100 mt-1">
                      {reminder.minutesBefore} phút nữa
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDismiss(reminder.id)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <p className="font-bold text-gray-900 mb-1">{reminder.activityName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{reminder.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{reminder.time}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onSnooze(reminder.id)}
                  className="flex-1 rounded-lg border-2 border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Nhắc lại sau 15p
                </button>
                <button
                  onClick={() => onDismiss(reminder.id)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-2 text-sm font-bold text-white transition-all hover:scale-[1.02]"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Settings Button */}
        {activeReminders.length === 0 && dayStarted && (
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 rounded-xl bg-white border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-md transition-all hover:shadow-lg"
          >
            <Settings className="h-4 w-4" />
            Cài đặt nhắc nhở
          </button>
        )}
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Cài đặt nhắc nhở</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* DND Mode */}
              <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-200 p-4">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Chế độ không làm phiền</p>
                    <p className="text-xs text-gray-600">Tắt tất cả nhắc nhở</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={dndMode}
                    onChange={(e) => setDndMode(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
              
              {/* Departure Warnings */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Cảnh báo khởi hành</p>
                  <p className="text-xs text-gray-600">Nhắc 30 phút và 15 phút trước</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={enableDeparture}
                    onChange={(e) => setEnableDeparture(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
              
              {/* Closing Time Alerts */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="font-semibold text-gray-900">Cảnh báo giờ đóng cửa</p>
                  <p className="text-xs text-gray-600">Nhắc trước 30 phút</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={enableClosing}
                    onChange={(e) => setEnableClosing(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full" />
                </label>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white transition-all hover:scale-[1.02]"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
