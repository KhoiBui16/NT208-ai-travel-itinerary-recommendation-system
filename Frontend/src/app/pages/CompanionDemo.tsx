import { useState } from "react";
import { Header } from "../components/Header";
import { DailyBrief } from "../components/companion/DailyBrief";
import { LiveBudgetBar } from "../components/companion/LiveBudgetBar";
import { SmartReminders } from "../components/companion/SmartReminders";
import { PlaceSuggestions } from "../components/companion/PlaceSuggestions";
import { Calendar, Info } from "lucide-react";

export default function CompanionDemo() {
  const [showDailyBrief, setShowDailyBrief] = useState(true);
  const [dayStarted, setDayStarted] = useState(false);
  const [totalSpent, setTotalSpent] = useState(500000);
  const [reminders, setReminders] = useState([
    {
      id: 1,
      type: "departure" as const,
      activityName: "Bảo tàng Lịch sử Quốc gia",
      location: "216 Trần Quang Khải, Hoàn Kiếm",
      time: "14:00",
      minutesBefore: 30,
    },
  ]);
  
  const totalBudget = 5000000;
  
  const handleStartDay = () => {
    setDayStarted(true);
  };
  
  const handleDismissBrief = () => {
    setShowDailyBrief(false);
  };
  
  const handleAddExpense = (amount: number, category: string) => {
    setTotalSpent((prev) => prev + amount);
  };
  
  const handleDismissReminder = (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };
  
  const handleSnoozeReminder = (id: number) => {
    // In a real app, this would reschedule the reminder
    console.log("Snoozed reminder", id);
  };
  
  const mockSuggestions = [
    {
      id: 1,
      name: "Nhà hàng Bún Chả Hương Liên",
      type: "restaurant" as const,
      rating: 4.7,
      priceLevel: 2,
      eta: "5 phút đi bộ",
      image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300",
      source: "Google Places",
      timestamp: "10:30",
    },
    {
      id: 2,
      name: "Khách sạn Metropole",
      type: "hotel" as const,
      rating: 4.9,
      priceLevel: 3,
      eta: "10 phút đi bộ",
      image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300",
      source: "TripAdvisor",
      timestamp: "10:30",
    },
    {
      id: 3,
      name: "Cà phê Trứng Giảng",
      type: "restaurant" as const,
      rating: 4.8,
      priceLevel: 1,
      eta: "3 phút đi bộ",
      image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300",
      source: "Foursquare",
      timestamp: "10:30",
    },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50 pb-24">
      <Header />
      
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">Tính năng Travel Companion</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-gray-900">
            Demo Travel Companion
          </h1>
          <p className="text-lg text-gray-500">
            Trải nghiệm các tính năng đồng hành thông minh trong chuyến đi
          </p>
        </div>
        
        {/* Info Card */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-cyan-50 to-orange-50 border border-cyan-200 p-6">
          <div className="flex gap-3">
            <Info className="h-6 w-6 flex-shrink-0 text-cyan-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Về trang demo này</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• <strong>Daily Brief:</strong> Xuất hiện ở góc dưới bên phải khi bạn vào trang</li>
                <li>• <strong>Live Budget Bar:</strong> Thanh ngân sách cố định ở cuối trang, click để thêm chi tiêu</li>
                <li>• <strong>Smart Reminders:</strong> Hiển thị ở góc trên bên phải sau khi "Bắt đầu ngày"</li>
                <li>• <strong>Place Suggestions:</strong> Gợi ý địa điểm dựa trên ngữ cảnh hoạt động</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="mb-8 rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Bảng điều khiển Demo</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Hiển thị Daily Brief</span>
              <button
                onClick={() => setShowDailyBrief(!showDailyBrief)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  showDailyBrief
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {showDailyBrief ? "Đang hiển thị" : "Đã ẩn"}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Trạng thái ngày</span>
              <span className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                dayStarted
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {dayStarted ? "Đã bắt đầu" : "Chưa bắt đầu"}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Số lượng nhắc nhở</span>
              <button
                onClick={() => {
                  if (reminders.length === 0) {
                    setReminders([
                      {
                        id: Date.now(),
                        type: "departure",
                        activityName: "Hồ Hoàn Kiếm",
                        location: "Đinh Tiên Hoàng, Hoàn Kiếm",
                        time: "17:00",
                        minutesBefore: 15,
                      },
                    ]);
                  }
                }}
                className="rounded-lg bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-700"
              >
                {reminders.length} nhắc nhở
              </button>
            </div>
          </div>
        </div>
        
        {/* Place Suggestions Example */}
        <div className="mb-8 rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Ví dụ Place Suggestions</h3>
          <div className="rounded-xl bg-gray-50 p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Hoạt động hiện tại:</strong> Văn Miếu Quốc Tử Giám (Tham quan)
            </p>
            <p className="text-xs text-gray-500">
              Hệ thống sẽ gợi ý cả nhà hàng và khách sạn gần đây
            </p>
          </div>
          <PlaceSuggestions
            activityType="other"
            suggestions={mockSuggestions}
            onNavigate={(id) => console.log("Navigate to", id)}
            onAddToDay={(id) => console.log("Add to day", id)}
          />
        </div>
        
        {/* Second Example - Food Activity */}
        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Ví dụ 2: Hoạt động Ăn uống</h3>
          <div className="rounded-xl bg-gray-50 p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Hoạt động hiện tại:</strong> Bún Chả Hương Liên (Ẩm thực)
            </p>
            <p className="text-xs text-gray-500">
              Khi đang ở nhà hàng, hệ thống chỉ gợi ý khách sạn/nơi lưu trú gần đó
            </p>
          </div>
          <PlaceSuggestions
            activityType="food"
            suggestions={mockSuggestions}
            onNavigate={(id) => console.log("Navigate to", id)}
            onAddToDay={(id) => console.log("Add to day", id)}
          />
        </div>
      </div>
      
      {/* Companion Components */}
      {showDailyBrief && (
        <DailyBrief
          date="Thứ Hai, 10/03/2025"
          cityName="Hà Nội"
          activitiesCount={4}
          firstActivityTime="08:30"
          weatherInfo="Nắng, 28°C"
          onStartDay={handleStartDay}
          onDismiss={handleDismissBrief}
        />
      )}
      
      <SmartReminders
        reminders={reminders}
        onDismiss={handleDismissReminder}
        onSnooze={handleSnoozeReminder}
        dayStarted={dayStarted}
      />
      
      <LiveBudgetBar
        totalBudget={totalBudget}
        spent={totalSpent}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
}
