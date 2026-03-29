import {
  Plane,
  MapPin,
  Calendar,
  DollarSign,
  Sparkles,
  Map,
  Save,
  Zap,
  Route,
  TrendingUp,
} from "lucide-react";

export const destinations = [
  {
    name: "Hà Nội",
    image:
      "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thủ đô ngàn năm văn hiến",
  },
  {
    name: "TP. Hồ Chí Minh",
    image:
      "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thành phố năng động và hiện đại",
  },
  {
    name: "Đà Nẵng",
    image:
      "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thành phố đáng sống bên biển",
  },
  {
    name: "Hội An",
    image:
      "https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Phố cổ với đèn lồng lung linh",
  },
  {
    name: "Vịnh Hạ Long",
    image:
      "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWxvbmclMjBiYXklMjB2aWV0bmFtfGVufDF8fHx8MTc3MjI2NTgyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Di sản thiên nhiên thế giới",
  },
  {
    name: "Sapa",
    image:
      "https://images.unsplash.com/photo-1694152362876-42d5815a214d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXBhJTIwcmljZSUyMHRlcnJhY2VzfGVufDF8fHx8MTc3MjI2NTgyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Ruộng bậc thang hùng vĩ",
  },
];

export const features = [
  {
    icon: Sparkles,
    title: "Tạo lịch trình trong 10 giây",
    description: "AI tự động xây dựng lịch trình chi du lịch cho bạn",
  },
  {
    icon: Map,
    title: "Địa điểm thú vị",
    description: "Khám các những địa điểm nổi tiếng nhất Việt Nam",
  },
  {
    icon: DollarSign,
    title: "Chi tiêu thông minh",
    description: "Tự do quản lý và điều chỉnh ngân sách",
  },
  {
    icon: Save,
    title: "Chỉnh sửa linh hoạt",
    description: "Dễ dàng tùy chỉnh lịch trình chi tiết theo ý muốn của bạn",
  },
];

export const heroFeatures = [
  {
    icon: Sparkles,
    title: "AI-Powered Itinerary Generator",
    description: "Instantly create personalized travel plans",
    viTitle: "Tạo Lịch Trình Bằng AI",
    viDescription: "Tạo kế hoạch du lịch cá nhân hóa ngay lập tức",
  },
  {
    icon: DollarSign,
    title: "Smart Budget Estimator",
    description: "Predict travel expenses before your trip",
    viTitle: "Ước Tính Ngân Sách Thông Minh",
    viDescription: "Dự đoán chi phí du lịch trước khi bạn đi",
  },
  {
    icon: Route,
    title: "Route Optimization",
    description: "Automatically arrange destinations for efficient travel",
    viTitle: "Tối Ưu Hóa Tuyến Đường",
    viDescription: "Sắp xếp điểm đến tự động để di chuyển hiệu quả",
  },
];