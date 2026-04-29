
export interface Suggestion {
  id: string;
  name: string;
  type: "dining" | "lodging" | "sightseeing" | "nearby";
  rating: number;
  distance: string;
  estimatedCost: string;
  priceLevel: string;
  image: string;
  reasoning: string;
  city: string;
  description?: string;
  address?: string;
  reviewCount?: number;
  openingHours?: string;
  phone?: string;
  website?: string;
}

export interface ContextualSuggestionsPanelProps {
  selectedCities: string[];
  onSaveSuggestion: (suggestion: Suggestion) => void;
  onAddToItinerary: (suggestion: Suggestion, date: string, time: string) => void;
  budgetAvailable?: boolean;
}

export const mockSuggestions: Suggestion[] = [
  {
    id: "1",
    name: "Bún Chả Hương Liên",
    type: "dining",
    rating: 4.6,
    distance: "0.8 km",
    estimatedCost: "50,000₫",
    priceLevel: "$$",
    image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300",
    reasoning: "Gần Văn Miếu — tuyệt vời cho bữa trưa",
    city: "Hà Nội",
    description: "Quán bún chả nổi tiếng từng được Tổng thống Obama ghé thăm",
    address: "24 Lê Văn Hưu, Hai Bà Trưng",
  },
  {
    id: "2",
    name: "Khách sạn Metropole",
    type: "lodging",
    rating: 4.8,
    distance: "1.2 km",
    estimatedCost: "2,500,000₫",
    priceLevel: "$$$",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
    reasoning: "Khách sạn lịch sử sang trọng trung tâm thành phố",
    city: "Hà Nội",
    description: "Khách sạn 5 sao với kiến trúc Pháp cổ điển",
    address: "15 Ngô Quyền, Hoàn Kiếm",
  },
  {
    id: "3",
    name: "Chùa Một Cột",
    type: "sightseeing",
    rating: 4.5,
    distance: "2.1 km",
    estimatedCost: "Miễn phí",
    priceLevel: "$",
    image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300",
    reasoning: "Biểu tượng Phật giáo độc đáo",
    city: "Hà Nội",
    description: "Ngôi chùa nổi tiếng với kiến trúc độc đáo một cột",
    address: "Chùa Một Cột, Ba Đình",
  },
  {
    id: "4",
    name: "Cà phê Giảng",
    type: "nearby",
    rating: 4.7,
    distance: "0.5 km",
    estimatedCost: "30,000₫",
    priceLevel: "$",
    image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300",
    reasoning: "Cà phê trứng nguyên bản gần đây",
    city: "Hà Nội",
    description: "Quán cà phê trứng lâu đời nhất Hà Nội",
    address: "39 Nguyễn Hữu Huân, Hoàn Kiếm",
  },
];