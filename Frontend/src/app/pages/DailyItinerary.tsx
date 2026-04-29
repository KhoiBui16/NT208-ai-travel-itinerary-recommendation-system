import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Header } from "../components/Header";
import { SavedSuggestion } from "../components/SavedSuggestions";
import { LoginRequiredModal } from "../components/LoginRequiredModal";
import { PlaceInfoModal } from "../components/PlaceInfoModal";
import { Suggestion, mockSuggestions } from "../data/suggestions";
import {
  Plus,
  Sparkles,
  GripVertical,
  Car,
  Lightbulb,
  MapPin,
  Users,
  MessageCircle,
  Sun,
  CloudRain,
  Clock,
  Utensils,
  Building,
  Camera,
  Coffee,
  Zap,
  Share2,
  Download,
  Link2,
  Map as MapIcon,
  DollarSign,
  TrendingUp,
  AlertCircle,
  UserPlus,
  Edit,
  ChevronDown,
  TreePine,
  Music,
  ShoppingBag,
  Star,
  Eye,
  Bookmark,
  X,
  ChevronLeft,
  Save as SaveIcon,
  Send,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Type definitions to match TripWorkspace
interface Activity {
  id: number;
  time: string;
  endTime?: string;
  name: string;
  location: string;
  description: string;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  transportation?: "walk" | "bike" | "bus" | "taxi";
}

interface Day {
  id: number;
  label: string;
  date: string;
  activities: Activity[];
  destinationName?: string;
}

export default function DailyItinerary() {
  const navigate = useNavigate();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [savedSuggestions, setSavedSuggestions] = useState<string[]>([]);
  const [viewingPlace, setViewingPlace] = useState<Suggestion | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"suggestions" | "map">("suggestions");
  
  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{id: number; text: string; sender: "user" | "ai"; timestamp: Date}>>([
    {
      id: 1,
      text: "Xin chào! Tôi có thể giúp bạn tối ưu hóa lịch trình hoặc gợi ý địa điểm.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [aiInputValue, setAiInputValue] = useState("");
  
  // Load trip data from localStorage
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string>("1");
  
  // Load data from localStorage on mount
  useEffect(() => {
    const savedTrip = localStorage.getItem("currentTrip");
    if (savedTrip) {
      try {
        const tripData = JSON.parse(savedTrip);
        if (tripData.days && tripData.days.length > 0) {
          setDays(tripData.days);
          setSelectedDayId(tripData.days[0].id.toString());
        }
      } catch (error) {
        console.error("Error loading trip data:", error);
      }
    }
    
    // Load saved places
    const savedPlaces = localStorage.getItem("savedPlaces");
    if (savedPlaces) {
      try {
        const parsed = JSON.parse(savedPlaces);
        // Match by name for cross-page bookmark sync
        const savedNames = parsed.map((p: any) => p.name);
        const matchedIds = mockSuggestions
          .filter(s => savedNames.includes(s.name))
          .map(s => s.id);
        setSavedSuggestions(matchedIds);
      } catch (error) {
        console.error("Error loading saved places:", error);
      }
    }
  }, []);
  
  // Get selected day data
  const selectedDay = days.find(d => d.id.toString() === selectedDayId);
  const currentActivities = selectedDay?.activities || [];
  
  // Filter suggestions based on selected day's destination and sort bookmarked to top
  const filteredSuggestions = mockSuggestions
    .filter(suggestion => {
      // Nếu không có ngày chọn thì hiện tất cả, nếu có thì kiểm tra tên thành phố
      if (!selectedDay?.destinationName) return true;
      return suggestion.city === selectedDay.destinationName;
    }) 
    .sort((a, b) => {
      // Sort bookmarked places to the top
      const aIsBookmarked = savedSuggestions.includes(a.id);
      const bIsBookmarked = savedSuggestions.includes(b.id);
      if (aIsBookmarked && !bIsBookmarked) return -1;
      if (!aIsBookmarked && bIsBookmarked) return 1;
      return 0;
    });
    
  const totalTravelTime = "55 phút";
  
  const handleToggleSave = (suggestion: Suggestion) => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const savedPlaces = localStorage.getItem("savedPlaces");
    let savedPlacesArray: any[] = [];
    
    if (savedPlaces) {
      try {
        savedPlacesArray = JSON.parse(savedPlaces);
      } catch (e) {
        console.error("Error parsing saved places:", e);
      }
    }
    
    const isAlreadySaved = savedPlacesArray.some(p => p.name === suggestion.name);
    
    if (isAlreadySaved) {
      // Remove from saved
      savedPlacesArray = savedPlacesArray.filter(p => p.name !== suggestion.name);
      setSavedSuggestions(prev => prev.filter(id => id !== suggestion.id));
    } else {
      // Add to saved
      savedPlacesArray.push({
        id: suggestion.id,
        name: suggestion.name,
        type: suggestion.type,
        rating: suggestion.rating,
        reviewCount: suggestion.reviewCount,
        distance: suggestion.distance,
        estimatedCost: suggestion.estimatedCost,
        priceLevel: suggestion.priceLevel,
        image: suggestion.image,
        description: suggestion.description,
        address: suggestion.address,
        openingHours: suggestion.openingHours,
        phone: suggestion.phone,
        website: suggestion.website,
        savedAt: new Date().toISOString(),
      });
      setSavedSuggestions(prev => [...prev, suggestion.id]);
    }
    
    localStorage.setItem("savedPlaces", JSON.stringify(savedPlacesArray));
  };

  const handleAddToItinerary = (suggestion: any, date: string, time: string) => {
    console.log("Adding to itinerary:", suggestion, date, time);
    // In production, add to actual itinerary
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Header />

      {/* Top Navigation Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Day Selector Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="mb-1 text-xs font-medium text-gray-600">Ngày hiện tại</label>
                <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                  <SelectTrigger className="w-[240px] border-gray-300 bg-white">
                    <SelectValue placeholder="Chọn ngày..." />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.label} - {day.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-3">
              {/* Detail Trip Button - UPDATED TEXT */}
              <Link
                to="/trip-workspace"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md"
              >
                <Edit className="h-4 w-4" />
                Chi tiết lịch trình
              </Link>

              {/* Share Button */}
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-gray-700 shadow-md transition-all hover:shadow-lg border border-gray-200">
                    <Share2 className="h-5 w-5" />
                    <span className="hidden sm:inline">Chia sẻ</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Chia Sẻ Chuyến Đi</DialogTitle>
                    <DialogDescription>
                      Chia sẻ lịch trình của bạn với bạn bè và gia đình
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="rounded-lg bg-gray-100 p-4">
                      <p className="mb-2 text-sm font-semibold text-gray-700">Link chia sẻ:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value="yourtrip.app/trip/abc123"
                          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <button className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50">
                        <Download className="h-5 w-5 text-gray-600" />
                        <span className="font-semibold text-gray-700">Export as PDF</span>
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50">
                        <Link2 className="h-5 w-5 text-gray-600" />
                        <span className="font-semibold text-gray-700">Copy Link</span>
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Link
                to="/create-trip"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tạo lịch trình mới</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Timeline - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Timeline with Vertical Line */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <h3 className="mb-6 text-xl font-bold text-gray-900">
                {selectedDay ? `Lịch Trình ${selectedDay.label} - ${selectedDay.date}` : 'Lịch Trình'}
              </h3>

              <div className="relative space-y-6">
                {/* Vertical Timeline Line */}
                {currentActivities.length > 0 && (
                  <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-400 via-purple-400 to-orange-400" />
                )}

                {currentActivities.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p className="text-lg font-medium">Chưa có hoạt động nào trong ngày này</p>
                    <p className="mt-2 text-sm">Hãy thêm địa điểm từ trang Chi tiết lịch trình</p>
                  </div>
                ) : (
                  currentActivities.map((item, index) => {
                    // Get icon component based on activity type
                    const getActivityIcon = (type: string) => {
                      switch (type) {
                        case 'food': return Utensils;
                        case 'attraction': return Building;
                        case 'nature': return TreePine;
                        case 'entertainment': return Music;
                        case 'shopping': return ShoppingBag;
                        default: return MapPin;
                      }
                    };
                    const ActivityIcon = getActivityIcon(item.type);

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline Marker */}
                        <div className="absolute left-0 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>

                        <div className="ml-16 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                          <div className="flex gap-4">
                            {/* Thumbnail */}
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-24 w-24 rounded-lg object-cover"
                            />

                            {/* Content */}
                            <div className="flex-1">
                              <div className="mb-2">
                                <div className="mb-1 flex items-center gap-2">
                                  <ActivityIcon className="h-5 w-5 text-cyan-600" />
                                  <p className="text-sm font-semibold text-gray-500">
                                    {item.time}
                                  </p>
                                </div>
                                <h4 className="mb-1 text-lg font-bold text-gray-900">
                                  {item.name}
                                </h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                              </div>

                              {/* Transportation info if available */}
                              {item.transportation && index < currentActivities.length - 1 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Car className="h-4 w-4" />
                                  <span>
                                    {item.transportation === 'walk' && 'Đi bộ'}
                                    {item.transportation === 'bike' && 'Đi xe đạp'}
                                    {item.transportation === 'bus' && 'Đi xe buýt'}
                                    {item.transportation === 'taxi' && 'Đi taxi'}
                                    {' đến điểm tiếp theo'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Suggestions & Map với Segmented Control */}
        <div className="w-[450px] flex-shrink-0 flex flex-col bg-white border-l-2 border-gray-200">
          {/* Segmented Control Header */}
          <div className="border-b-2 border-gray-200 p-4">
            <div className="inline-flex w-full rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setRightPanelTab("suggestions")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  rightPanelTab === "suggestions"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Gợi ý
              </button>
              <button
                onClick={() => setRightPanelTab("map")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  rightPanelTab === "map"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Bản đồ
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {rightPanelTab === "suggestions" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-xl border-2 border-gray-200 bg-white transition-all hover:border-cyan-300 hover:shadow-md overflow-hidden"
                >
                  {/* Image with Bookmark */}
                  <div className="relative">
                    <img
                      src={suggestion.image}
                      alt={suggestion.name}
                      className="h-32 w-full object-cover"
                    />
                    {/* Bookmark Icon */}
                    <button
                      onClick={() => handleToggleSave(suggestion)}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
                        savedSuggestions.includes(suggestion.id)
                          ? "bg-cyan-700 text-white"
                          : "bg-white/90 text-gray-600 hover:bg-cyan-500 hover:text-white"
                      }`}
                      title={savedSuggestions.includes(suggestion.id) ? "Đã lưu" : "Lưu địa điểm"}
                    >
                      <Bookmark className={`h-4 w-4 ${savedSuggestions.includes(suggestion.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <h4 className="mb-1 font-bold text-gray-900">{suggestion.name}</h4>
                    <p className="mb-2 text-xs text-gray-600 line-clamp-2">{suggestion.description}</p>

                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{suggestion.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{suggestion.distance}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{suggestion.estimatedCost}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewingPlace(suggestion)}
                      className="w-full flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:text-cyan-600"
                    >
                      <Eye className="h-3 w-3" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Map Tab */
            <div className="flex-1 relative overflow-hidden">
              {/* Mock Map */}
              <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {/* Mock Map Markers */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    {/* Center Marker */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 shadow-lg">
                      <MapIcon className="h-6 w-6 text-white" />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-gray-700 text-center">
                      {selectedDay?.destinationName || "Hà Nội"}
                    </p>
                  </div>
                </div>

                {/* Mock Location Pins */}
                <div className="absolute top-1/4 left-1/3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 shadow-md">
                    <Utensils className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="absolute top-2/3 left-2/3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 shadow-md">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="absolute top-1/3 right-1/4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-md">
                    <Coffee className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* Map Overlay Info */}
                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur-sm">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Bản đồ khu vực {selectedDay?.destinationName || "Hà Nội"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Đang hiển thị các địa điểm gợi ý trong phạm vi thành phố
                  </p>
                </div>

                {/* Mock Grid Lines */}
                <div className="absolute inset-0 opacity-10">
                  <div className="h-full w-full" style={{
                    backgroundImage: `
                      linear-gradient(to right, #000 1px, transparent 1px),
                      linear-gradient(to bottom, #000 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Place Info Modal */}
      {viewingPlace && (
        <PlaceInfoModal
          place={{
            name: viewingPlace.name,
            image: viewingPlace.image,
            description: viewingPlace.description,
            address: viewingPlace.address,
            rating: viewingPlace.rating,
            reviewCount: viewingPlace.reviewCount,
            estimatedCost: viewingPlace.estimatedCost,
            openingHours: viewingPlace.openingHours,
            phone: viewingPlace.phone,
            website: viewingPlace.website,
          }}
          onClose={() => setViewingPlace(null)}
        />
      )}

      {/* AI Chat Button (always visible) */}
      <button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl transition-all hover:scale-110 hover:shadow-purple-500/50"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-96 flex-col rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
            <div>
              <h3 className="font-bold">AI Travel Assistant</h3>
              <p className="text-xs text-white/80">
                Gợi ý trong: {selectedDay?.destinationName || "Hà Nội"}
              </p>
            </div>
            <button
              onClick={() => setShowAIChat(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="flex items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>⚠️ Mọi thay đổi cần xác nhận của bạn</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <span className="mt-1 block text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Replies */}
          {aiMessages.length <= 2 && (
            <div className="border-t border-gray-200 p-3">
              <p className="mb-2 text-xs text-gray-500">Gợi ý nhanh (tùy chọn):</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const userMsg = {
                      id: aiMessages.length + 1,
                      text: "Tối ưu lịch trình",
                      sender: "user" as const,
                      timestamp: new Date(),
                    };
                    setAiMessages(prev => [...prev, userMsg]);
                    setTimeout(() => { // TODO: Gọi API AI thực tế ở đây
                      const aiMsg = {
                        id: aiMessages.length + 2,
                        text: "Tôi đã nhận được yêu cầu của bạn. Vui lòng xác nhận các thay đổi trước khi áp dụng vào lịch trình.",
                        sender: "ai" as const,
                        timestamp: new Date(),
                      };
                      setAiMessages(prev => [...prev, aiMsg]);
                    }, 1000);
                  }}
                  className="flex-1 rounded-lg border-2 border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100"
                >
                  ✨ Tối ưu lịch trình
                </button>
                <button
                  onClick={() => {
                    const userMsg = {
                      id: aiMessages.length + 1,
                      text: "Gợi ý địa điểm",
                      sender: "user" as const,
                      timestamp: new Date(),
                    };
                    setAiMessages(prev => [...prev, userMsg]);
                    setTimeout(() => { // TODO: Gọi API AI thực tế ở đây
                      const aiMsg = {
                        id: aiMessages.length + 2,
                        text: "Tôi có thể gợi ý các địa điểm phù hợp với lịch trình của bạn.",
                        sender: "ai" as const,
                        timestamp: new Date(),
                      };
                      setAiMessages(prev => [...prev, aiMsg]);
                    }, 1000);
                  }}
                  className="flex-1 rounded-lg border-2 border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100"
                >
                  📍 Gợi ý địa điểm
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInputValue}
                onChange={(e) => setAiInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && aiInputValue.trim()) {
                    const userMsg = {
                      id: aiMessages.length + 1,
                      text: aiInputValue,
                      sender: "user" as const,
                      timestamp: new Date(),
                    };
                    setAiMessages(prev => [...prev, userMsg]);
                    setAiInputValue("");
                    setTimeout(() => { // TODO: Gọi API AI thực tế ở đây
                      const aiMsg = {
                        id: aiMessages.length + 2,
                        text: "Tôi đã nhận được yêu cầu của bạn. Vui lòng xác nhận các thay đổi trước khi áp dụng vào lịch trình.",
                        sender: "ai" as const,
                        timestamp: new Date(),
                      };
                      setAiMessages(prev => [...prev, aiMsg]);
                    }, 1000);
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <button
                onClick={() => {
                  if (aiInputValue.trim()) {
                    const userMsg = {
                      id: aiMessages.length + 1,
                      text: aiInputValue,
                      sender: "user" as const,
                      timestamp: new Date(),
                    };
                    setAiMessages(prev => [...prev, userMsg]);
                    setAiInputValue("");
                    setTimeout(() => { // TODO: Gọi API AI thực tế ở đây
                      const aiMsg = {
                        id: aiMessages.length + 2,
                        text: "Tôi đã nhận được yêu cầu của bạn. Vui lòng xác nhận các thay đổi trước khi áp dụng vào lịch trình.",
                        sender: "ai" as const,
                        timestamp: new Date(),
                      };
                      setAiMessages(prev => [...prev, aiMsg]);
                    }, 1000);
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-all hover:scale-105"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        reason="Đăng nhập để lưu địa điểm yêu thích"
      />
    </div>
  );
}