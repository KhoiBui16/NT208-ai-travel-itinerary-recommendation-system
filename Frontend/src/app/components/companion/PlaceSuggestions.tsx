import { MapPin, Star, Clock, DollarSign, Navigation, Plus } from "lucide-react";

interface PlaceSuggestion {
  id: number;
  name: string;
  type: "restaurant" | "hotel";
  rating: number;
  priceLevel: number; // 1-3
  eta: string; // e.g., "5 phút đi bộ"
  image: string;
  source: string;
  timestamp: string;
}

interface PlaceSuggestionsProps {
  activityType: "food" | "other";
  suggestions: PlaceSuggestion[];
  onNavigate: (placeId: number) => void;
  onAddToDay: (placeId: number) => void;
}

export function PlaceSuggestions({
  activityType,
  suggestions,
  onNavigate,
  onAddToDay,
}: PlaceSuggestionsProps) {
  // Filter suggestions based on activity type
  const filtered = suggestions.filter((s) => {
    if (activityType === "food") {
      return s.type === "hotel"; // If current activity is food, suggest stays
    }
    return true; // For other activities, show both restaurants and hotels
  });
  
  const displaySuggestions = filtered.slice(0, 3); // Max 3 suggestions
  
  if (displaySuggestions.length === 0) {
    return null;
  }
  
  const getPriceSymbol = (level: number) => {
    return "₫".repeat(level);
  };
  
  const getTypeLabel = (type: string) => {
    return type === "restaurant" ? "Nhà hàng" : "Lưu trú";
  };
  
  return (
    <div className="mt-4 rounded-xl bg-gradient-to-br from-cyan-50 to-orange-50 border border-cyan-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-900">Gợi ý gần đây</h4>
        {displaySuggestions[0] && (
          <span className="text-xs text-gray-500">
            Nguồn: {displaySuggestions[0].source} lúc {displaySuggestions[0].timestamp}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {displaySuggestions.map((place) => (
          <div
            key={place.id}
            className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm"
          >
            <div className="flex gap-3">
              {/* Image */}
              <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={place.image}
                  alt={place.name}
                  className="h-full w-full object-cover"
                />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <h5 className="font-bold text-gray-900 text-sm truncate">{place.name}</h5>
                  <p className="text-xs text-gray-500">{getTypeLabel(place.type)}</p>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{place.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    <span className="font-semibold text-green-600">
                      {getPriceSymbol(place.priceLevel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{place.eta}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onNavigate(place.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Navigation className="h-3 w-3" />
                    Dẫn đường
                  </button>
                  <button
                    onClick={() => onAddToDay(place.id)}
                    className="flex items-center gap-1 rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-cyan-600"
                  >
                    <Plus className="h-3 w-3" />
                    Thêm vào ngày
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
