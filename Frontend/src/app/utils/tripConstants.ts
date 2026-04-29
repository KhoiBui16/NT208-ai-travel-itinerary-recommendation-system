import { Day, Place, Hotel, Destination } from "../types/trip.types";
import {
  Utensils,
  Landmark,
  TreePine,
  Music,
  ShoppingBag,
  Navigation,
  Bike,
  Bus,
  Car,
  User, 
  Heart,
  Users,
  Baby,
  Theater,
  Mountain, 
  Building,
  Hotel as HotelIcon
} from "lucide-react";

export const travelTypes = [
  { id: "solo", label: "Du lịch một mình", icon: User },
  { id: "couple", label: "Cặp đôi", icon: Heart },
  { id: "friends", label: "Bạn bè", icon: Users },
  { id: "family", label: "Gia đình", icon: Baby },
];

export const budgetLevels = [
  { id: "budget", label: "Tiết kiệm", sublabel: "< 3 triệu/ngày", color: "green" },
  { id: "mid", label: "Trung bình", sublabel: "3–8 triệu/ngày", color: "cyan" },
  { id: "luxury", label: "Cao cấp", sublabel: "> 8 triệu/ngày", color: "orange" },
];

export const interests = [
  { id: "food", label: "Ẩm thực", icon: Utensils },
  { id: "nature", label: "Thiên nhiên", icon: TreePine },
  { id: "culture", label: "Văn hóa", icon: Landmark },
  { id: "shopping", label: "Mua sắm", icon: ShoppingBag },
  { id: "entertainment", label: "Giải trí", icon: Theater },
];

export const popularDestinations = [
  "Hà Nội", "Đà Nẵng", "Hội An", "Phú Quốc", "Sapa", "Vịnh Hạ Long",
  "TP. Hồ Chí Minh", "Nha Trang", "Đà Lạt", "Huế",
];

export const BUDGET_CATEGORIES = [
  { key: 'food', label: 'Ăn uống', icon: Utensils, textColor: 'text-orange-600', hexColor: '#ea580c' },
  { key: 'attraction', label: 'Tham quan', icon: Landmark, textColor: 'text-cyan-600', hexColor: '#0891b2' },
  { key: 'entertainment', label: 'Giải trí và trải nghiệm', icon: Music, textColor: 'text-purple-600', hexColor: '#9333ea' },
  { key: 'transportation', label: 'Di chuyển', icon: Car, textColor: 'text-blue-600', hexColor: '#2563eb' },
  { key: 'shopping', label: 'Mua sắm', icon: ShoppingBag, textColor: 'text-pink-600', hexColor: '#db2777' },
  { key: 'accommodation', label: 'Nơi ở', icon: HotelIcon, textColor: 'text-green-600', hexColor: '#16a34a' },
];

export const initialDays: Day[] = [
  {
    id: 1,
    label: "Ngày 1 - Hà Nội",
    date: "10/03/2025",
    destinationName: "Hà Nội",
    activities: [
      {
        id: 101, time: "08:30", endTime: "10:00", name: "Văn Miếu Quốc Tử Giám",
        location: "58 Quốc Tử Giám, Đống Đa", description: "Di tích lịch sử văn hóa nổi tiếng",
        type: "attraction",
        image: "https://images.unsplash.com/photo-1756800585184-ce324a1fe500?w=300",
        transportation: "taxi",
        adultPrice: 30000,
        childPrice: 15000,
        taxiCost: 50000,
        extraExpenses: [],
      },
      {
        id: 102, time: "11:00", endTime: "12:00", name: "Cà phê trứng Giảng",
        location: "39 Nguyễn Hữu Huân, Hoàn Kiếm", description: "Cà phê trứng truyền thống Hà Nội",
        type: "food",
        image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300",
        transportation: "walk",
        adultPrice: 45000,
        childPrice: 30000,
        extraExpenses: [],
      },
      {
        id: 103, time: "14:00", endTime: "16:30", name: "Bảo tàng Lịch sử Quốc gia",
        location: "216 Trần Quang Khải, Hoàn Kiếm", description: "Khám phá lịch sử Việt Nam",
        type: "attraction",
        image: "https://images.unsplash.com/photo-1758186169566-33d86f4f7737?w=300",
        transportation: "bus",
        adultPrice: 40000,
        childPrice: 20000,
        busTicketPrice: 7000,
        extraExpenses: [],
      },
      {
        id: 104, time: "17:00", endTime: "18:30", name: "Hồ Hoàn Kiếm",
        location: "Đinh Tiên Hoàng, Hoàn Kiếm", description: "Dạo quanh hồ và ngắm cảnh hoàng hôn",
        type: "nature",
        image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=300",
        transportation: "walk",
        extraExpenses: [],
      },
    ],
  },
  {
    id: 2,
    label: "Ngày 2 - Hà Nội",
    date: "11/03/2025",
    destinationName: "Hà Nội",
    activities: [
      {
        id: 201, time: "09:00", endTime: "10:30", name: "Chùa Một Cột",
        location: "Chùa Một Cột, Ba Đình", description: "Biểu tượng Phật giáo độc đáo của Hà Nội",
        type: "attraction",
        image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300",
        transportation: "taxi",
        adultPrice: 0,
        childPrice: 0,
        taxiCost: 45000,
        extraExpenses: [],
      },
      {
        id: 202, time: "12:00", endTime: "13:30", name: "Bún Chả Hương Liên",
        location: "24 Lê Văn Hưu, Hai Bà Trưng", description: "Bún chả nổi tiếng Obama từng thưởng thức",
        type: "food",
        image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300",
        transportation: "bike",
        adultPrice: 60000,
        childPrice: 40000,
        extraExpenses: [],
      },
      {
        id: 203, time: "15:00", endTime: "18:00", name: "Phố Cổ Hà Nội",
        location: "Hoàn Kiếm, Hà Nội", description: "Khám phá 36 phố phường lịch sử",
        type: "entertainment",
        image: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?w=300",
        transportation: "walk",
        customCost: 200000,
        extraExpenses: [],
      },
    ],
  },
  {
    id: 3,
    label: "Ngày 3 - Hà Nội",
    date: "12/03/2025",
    destinationName: "Hà Nội",
    activities: [
      {
        id: 301, time: "08:00", endTime: "11:00", name: "Chợ Đồng Xuân",
        location: "Đồng Xuân, Hoàn Kiếm", description: "Chợ lớn nhất Hà Nội, mua sắm đặc sản",
        type: "shopping",
        image: "https://images.unsplash.com/photo-1767114648704-0c6e0cd55cde?w=300",
        transportation: "taxi",
        customCost: 500000,
        taxiCost: 60000,
        extraExpenses: [],
      },
      {
        id: 302, time: "14:00", endTime: "17:00", name: "Hồ Tây",
        location: "Tây Hồ, Hà Nội", description: "Hồ nước ngọt tự nhiên lớn nhất Hà Nội",
        type: "nature",
        image: "https://images.unsplash.com/photo-1555979864-7a8f9b4fddf8?w=300",
        transportation: "bike",
        extraExpenses: [],
      },
    ],
  },
];

export const allPlaces: Place[] = [
  { id: 1, name: "Phở Bát Đàn", city: "Hà Nội", rating: 4.7, reviewCount: 1842, type: "food", image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300", saved: false },
  { id: 2, name: "Lăng Hồ Chí Minh", city: "Hà Nội", rating: 4.8, reviewCount: 5230, type: "attraction", image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300", saved: false },
  { id: 3, name: "Công viên Thống Nhất", city: "Hà Nội", rating: 4.5, reviewCount: 978, type: "nature", image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?w=300", saved: false },
  { id: 4, name: "Bar Bao giờ", city: "Hà Nội", rating: 4.6, reviewCount: 643, type: "entertainment", image: "https://images.unsplash.com/photo-1668563966338-38394330adf0?w=300", saved: false },
  { id: 5, name: "Chợ Hôm Đức Viên", city: "Hà Nội", rating: 4.3, reviewCount: 412, type: "shopping", image: "https://images.unsplash.com/photo-1767114648704-0c6e0cd55cde?w=300", saved: false },
  { id: 6, name: "Bánh Mì 25", city: "Hà Nội", rating: 4.8, reviewCount: 2103, type: "food", image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300", saved: false },
  { id: 7, name: "Đền Ngọc Sơn", city: "Hà Nội", rating: 4.7, reviewCount: 3890, type: "attraction", image: "https://images.unsplash.com/photo-1756800585184-ce324a1fe500?w=300", saved: false },
  { id: 8, name: "Hồ Thiền Quang", city: "Hà Nội", rating: 4.4, reviewCount: 729, type: "nature", image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=300", saved: false },
  { id: 9, name: "Bia Hơi Hà Nội", city: "Hà Nội", rating: 4.5, reviewCount: 1567, type: "food", image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300", saved: false },
  { id: 10, name: "Trung tâm thương mại Vincom", city: "Hà Nội", rating: 4.5, reviewCount: 2841, type: "shopping", image: "https://images.unsplash.com/photo-1767114648704-0c6e0cd55cde?w=300", saved: false },
];

export const availableHotels: Hotel[] = [
  {
    id: 1,
    name: "Sofitel Legend Metropole Hanoi",
    rating: 4.8,
    reviewCount: 3542,
    price: 3500000,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    location: "15 Ngô Quyền, Hoàn Kiếm",
    city: "Hà Nội",
    amenities: ["Wifi miễn phí", "Bể bơi", "Nhà hàng", "Spa"],
    description: "Khách sạn 5 sao sang trọng tại trung tâm Hà Nội",
  },
  {
    id: 2,
    name: "Hilton Hanoi Opera",
    rating: 4.7,
    reviewCount: 2891,
    price: 2800000,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
    location: "1 Lê Thánh Tông, Hoàn Kiếm",
    city: "Hà Nội",
    amenities: ["Wifi miễn phí", "Phòng gym", "Nhà hàng", "Bar"],
    description: "Khách sạn cao cấp gần Nhà hát Lớn",
  },
  {
    id: 3,
    name: "La Siesta Premium Hang Be",
    rating: 4.6,
    reviewCount: 1847,
    price: 1500000,
    image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400",
    location: "94 Hàng Bè, Hoàn Kiếm",
    city: "Hà Nội",
    amenities: ["Wifi miễn phí", "Bữa sáng", "Dịch vụ đưa đón"],
    description: "Khách sạn boutique tại Phố Cổ Hà Nội",
  },
  {
    id: 4,
    name: "Hanoi Pearl Hotel",
    rating: 4.5,
    reviewCount: 1256,
    price: 1200000,
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
    location: "6 Bảo Khánh, Hoàn Kiếm",
    city: "Hà Nội",
    amenities: ["Wifi miễn phí", "Bữa sáng", "Quầy bar"],
    description: "Khách sạn 4 sao hiện đại gần Hồ Hoàn Kiếm",
  },
  {
    id: 5,
    name: "Essence Hanoi Hotel",
    rating: 4.4,
    reviewCount: 982,
    price: 900000,
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
    location: "22 Tạ Hiện, Hoàn Kiếm",
    city: "Hà Nội",
    amenities: ["Wifi miễn phí", "Bữa sáng", "Sân thượng"],
    description: "Khách sạn trẻ trung tại phố Tây Tạ Hiện",
  },
  {
    id: 6,
    name: "InterContinental Danang",
    rating: 4.9,
    reviewCount: 4231,
    price: 4200000,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
    location: "Bãi Biển Non Nước, Đà Nẵng",
    city: "Đà Nẵng",
    amenities: ["Wifi miễn phí", "Bể bơi vô cực", "Spa", "Nhà hàng"],
    description: "Resort 5 sao view biển tuyệt đẹp",
  },
];

export const availableDestinations: Destination[] = [
  {
    id: 1,
    name: "Hà Nội",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYW5vaSUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjkzNzQwOXww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.8,
  },
  {
    id: 2,
    name: "Sapa",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXBhJTIwbW91bnRhaW4lMjB0ZXJyYWNlc3xlbnwxfHx8fDE3NzI5Mzc0MTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.9,
  },
  {
    id: 3,
    name: "Hội An",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1595394462771-378e35f35b4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGxhbnRlcm5zJTIwbmlnaHR8ZW58MXx8fHwxNzcyOTM3NDExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.7,
  },
  {
    id: 4,
    name: "Phú Quốc",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1698809807960-758cf416e96e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaHUlMjBxdW9jJTIwaXNsYW5kJTIwYmVhY2h8ZW58MXx8fHwxNzcyOTM3NDExfDA&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.6,
  },
  {
    id: 5,
    name: "Đà Nẵng",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.8,
  },
  {
    id: 6,
    name: "Vịnh Hạ Long",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWxvbmclMjBiYXklMjB2aWV0bmFtfGVufDF8fHx8MTc3MjI2NTgyMnww&ixlib=rb-4.1.0&q=80&w=1080",
    rating: 4.9,
  },
];

export const categoryFilters = [
  { id: "all", label: "Tất cả" },
  { id: "food", label: "Ăn uống", icon: Utensils },
  { id: "attraction", label: "Tham quan", icon: Landmark },
  { id: "nature", label: "Thiên nhiên", icon: TreePine },
  { id: "entertainment", label: "Giải trí", icon: Music },
  { id: "shopping", label: "Mua sắm", icon: ShoppingBag },
];

export const typeColors: Record<string, string> = {
  food: "bg-orange-100 text-orange-700",
  attraction: "bg-cyan-100 text-cyan-700",
  nature: "bg-green-100 text-green-700",
  entertainment: "bg-purple-100 text-purple-700",
  shopping: "bg-pink-100 text-pink-700",
};

export const typeLabels: Record<string, string> = {
  food: "Ẩm thực",
  attraction: "Tham quan",
  nature: "Thiên nhiên",
  entertainment: "Giải trí",
  shopping: "Mua sắm",
};

export const transportationOptions = [
  { id: "walk", label: "Đi bộ", icon: Navigation },
  { id: "bike", label: "Xe đạp", icon: Bike },
  { id: "bus", label: "Xe buýt", icon: Bus },
  { id: "taxi", label: "Taxi/Grab", icon: Car },
];

export let nextId = 500;

export const PIE_COLORS = ["#f97316", "#06b6d4", "#a855f7", "#3b82f6", "#ec4899", "#22c55e"];

export const TRAVEL_TYPES = [
  { id: "solo", label: "Solo traveler", icon: User, viLabel: "Du lịch một mình" },
  { id: "couple", label: "Couple", icon: Heart, viLabel: "Cặp đôi" },
  { id: "friends", label: "Friends", icon: Users, viLabel: "Bạn bè" },
  { id: "family", label: "Family", icon: Baby, viLabel: "Gia đình" },
];

export const INTEREST_OPTIONS = [
  { id: "food", label: "Ẩm thực", icon: Utensils },
  { id: "nature", label: "Thiên nhiên", icon: Mountain },
  { id: "history", label: "Lịch sử", icon: Building },
  { id: "nightlife", label: "Giải trí đêm", icon: Music },
  { id: "shopping", label: "Mua sắm", icon: ShoppingBag },
];

export const BUDGET_LEVELS = [
  { id: "budget", label: "$", viLabel: "Tiết kiệm", description: "< 1 triệu/ngày" },
  { id: "moderate", label: "$$", viLabel: "Trung bình", description: "1-3 triệu/ngày" },
  { id: "luxury", label: "$$$", viLabel: "Cao cấp", description: "> 3 triệu/ngày" },
];