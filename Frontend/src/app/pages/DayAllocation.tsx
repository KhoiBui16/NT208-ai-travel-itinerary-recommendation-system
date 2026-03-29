import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { CalendarModal } from "../components/CalendarModal";
import { Calendar, MapPin, ArrowRight, AlertCircle, ChevronLeft, CalendarDays } from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";

interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateAllocation {
  from: Date;
  to: Date;
  days: number;
}

export default function DayAllocation() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dateAllocations, setDateAllocations] = useState<Record<number, DateAllocation | null>>({});
  
  // Calendar modal state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [calendarKey, setCalendarKey] = useState(0);
  const [initialDateRange, setInitialDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  useEffect(() => {
    // Load selected destinations from localStorage
    const saved = localStorage.getItem("tripDestinations");
    if (saved) {
      const parsed = JSON.parse(saved);
      setDestinations(parsed);
      
      // Initialize allocations
      const initial: Record<number, DateAllocation | null> = {};
      parsed.forEach((dest: Destination) => {
        initial[dest.id] = null;
      });
      setDateAllocations(initial);
    } else {
      // No destinations selected, go back
      navigate("/manual-trip-setup");
    }
  }, [navigate]);
  
  const totalDays = Object.values(dateAllocations).reduce((sum, allocation) => {
    return sum + (allocation ? allocation.days : 0);
  }, 0);
  
  const handleScheduleClick = (destId: number) => {
    setSelectedDestId(destId);
    const current = dateAllocations[destId];
    if (current) {
      setInitialDateRange({ from: current.from, to: current.to });
    } else {
      setInitialDateRange({ from: null, to: null });
    }
    setCalendarKey(prev => prev + 1);
    setShowCalendar(true);
  };
  
  const isDateAllocatedByOthers = (date: Date): boolean => {
    if (!selectedDestId) return false;
    
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    
    for (const [id, allocation] of Object.entries(dateAllocations)) {
      if (parseInt(id) === selectedDestId) continue;
      
      if (allocation) {
        let current = startOfDay(allocation.from);
        const end = startOfDay(allocation.to);
        
        while (current <= end) {
          if (format(current, 'yyyy-MM-dd') === dateStr) {
            return true;
          }
          current = addDays(current, 1);
        }
      }
    }
    
    return false;
  };
  
  const handleConfirmDates = (from: Date, to: Date, days: number) => {
    if (selectedDestId) {
      setDateAllocations(prev => ({
        ...prev,
        [selectedDestId]: { from, to, days },
      }));
      setShowCalendar(false);
      setSelectedDestId(null);
    }
  };
  
  const handleCancelCalendar = () => {
    setShowCalendar(false);
    setSelectedDestId(null);
  };
  
  const handleContinue = () => {
    // Check if all destinations have at least 1 day
    const hasAllAllocations = destinations.every(dest => {
      const allocation = dateAllocations[dest.id];
      return allocation && allocation.days >= 1;
    });
    
    if (!hasAllAllocations) {
      return;
    }
    
    // Save allocations to localStorage
    const saveData: Record<number, { from: string; to: string; days: number }> = {};
    Object.entries(dateAllocations).forEach(([id, allocation]) => {
      if (allocation) {
        saveData[parseInt(id)] = {
          from: format(allocation.from, 'yyyy-MM-dd'),
          to: format(allocation.to, 'yyyy-MM-dd'),
          days: allocation.days,
        };
      }
    });
    localStorage.setItem("tripDayAllocations", JSON.stringify(saveData));
    
    // Navigate to travelers selection
    navigate("/travelers-selection");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />
      
      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <button
          onClick={() => navigate("/manual-trip-setup")}
          className="flex items-center gap-2 text-gray-600 transition-colors hover:text-cyan-600"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="font-semibold">Quay lại chọn điểm đến</span>
        </button>
      </div>
      
      {/* Calendar Modal */}
      <CalendarModal
        key={calendarKey}
        open={showCalendar && selectedDestId !== null}
        onClose={handleCancelCalendar}
        onConfirm={handleConfirmDates}
        value={initialDateRange}
        selectedName={destinations.find(d => d.id === selectedDestId)?.name || ""}
        isDateDisabled={isDateAllocatedByOthers}
      />
      
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phân bổ ngày cho chuyến đi</h1>
          <p className="text-gray-500">Lên lịch cụ thể cho từng địa điểm bạn đã chọn</p>
        </div>
        
        {/* Total Days Display */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-cyan-100">Tổng số ngày đã lên lịch</p>
                <p className="text-3xl font-bold">{totalDays} ngày</p>
              </div>
            </div>
            {totalDays === 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Cần ít nhất 1 ngày</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Allocation List */}
        <div className="mb-6 space-y-3">
          {destinations.map((dest) => {
            const allocation = dateAllocations[dest.id];
            const isAllocated = !!allocation;
            
            return (
              <div
                key={dest.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                  isAllocated ? "border-cyan-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Destination Image */}
                  <div className="relative h-18 w-24 flex-shrink-0 overflow-hidden rounded-xl">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  
                  {/* Destination Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{dest.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{dest.country}</span>
                    </div>
                    {/* Date Display inline */}
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
                  
                  {/* Schedule Button */}
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
        
        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={totalDays === 0 || !destinations.every(d => dateAllocations[d.id])}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-4 font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Tiếp tục
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}