import { useState } from "react";
import { Calendar, MapPin, Clock, Sun, X, CheckCircle2, AlertCircle } from "lucide-react";

interface DailyBriefProps {
  date: string;
  cityName: string;
  activitiesCount: number;
  firstActivityTime: string;
  weatherInfo?: string;
  onStartDay: () => void;
  onDismiss: () => void;
}

export function DailyBrief({
  date,
  cityName,
  activitiesCount,
  firstActivityTime,
  weatherInfo = "Nắng, 28°C",
  onStartDay,
  onDismiss,
}: DailyBriefProps) {
  const [dayStarted, setDayStarted] = useState(false);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  
  const handleStartDay = () => {
    // Check location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission("granted");
          setDayStarted(true);
          onStartDay();
        },
        () => {
          setLocationPermission("denied");
        }
      );
    } else {
      setDayStarted(true);
      onStartDay();
    }
  };
  
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationPermission("granted"),
        () => setLocationPermission("denied")
      );
    }
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-40 w-full max-w-sm animate-slide-in-up">
      <div className="rounded-2xl bg-white shadow-2xl border-2 border-cyan-500 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6" />
              <h3 className="text-lg font-bold">Bản tin buổi sáng</h3>
            </div>
            <button
              onClick={onDismiss}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-100" />
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-100" />
              <span className="font-medium">{cityName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-100" />
              <span className="font-medium">Hoạt động đầu: {firstActivityTime}</span>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Weather */}
          <div className="flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-3">
            <Sun className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Thời tiết hôm nay</p>
              <p className="text-sm text-gray-600">{weatherInfo}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-600 mb-2">Hôm nay bạn có:</p>
            <p className="text-2xl font-bold text-gray-900">{activitiesCount} hoạt động</p>
          </div>
          
          {/* Location Permission Warning */}
          {locationPermission === "denied" && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">Không có quyền truy cập vị trí</p>
                <p className="text-xs text-red-700 mb-2">
                  Cần quyền truy cập để nhận nhắc nhở đúng lúc
                </p>
                <button
                  onClick={requestLocation}
                  className="text-xs font-semibold text-red-600 underline hover:text-red-700"
                >
                  Bật định vị
                </button>
              </div>
            </div>
          )}
          
          {/* Start Day Button */}
          {!dayStarted ? (
            <button
              onClick={handleStartDay}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-bold text-white shadow-md transition-all hover:scale-[1.02]"
            >
              Bắt đầu ngày
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 border-2 border-green-500 py-3.5 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold">Đã bắt đầu — Đang nhận cảnh báo</span>
            </div>
          )}
          
          {dayStarted && (
            <p className="text-xs text-center text-gray-500">
              Bạn sẽ nhận thông báo 30 phút và 15 phút trước mỗi hoạt động
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
