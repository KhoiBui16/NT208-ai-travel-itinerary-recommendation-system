import { Landmark, Utensils, TreePine, Home } from "lucide-react";

export interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
  description: string;
  rating: number;
  places: {
    category: string;
    icon: any;
    items: {
      name: string;
      image: string;
    }[];
  }[];
}

export const destinations: Destination[] = [
  {
    id: 1,
    name: "Hà Nội",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=600",
    description: "Thủ đô ngàn năm văn hiến với nhiều di tích lịch sử",
    rating: 4.8,
    places: []
  },
  {
    id: 2,
    name: "TP. Hồ Chí Minh",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=600",
    description: "Thành phố năng động và hiện đại nhất Việt Nam",
    rating: 4.7,
    places: []
  },
  {
    id: 3,
    name: "Đà Nẵng",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=600",
    description: "Thành phố đáng sống với biển đẹp và cơ sở hạ tầng hiện đại",
    rating: 4.9,
    places: []
  },
  {
    id: 4,
    name: "Hội An",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1595394462771-378e35f35b4e?w=600",
    description: "Phố cổ với kiến trúc độc đáo và đèn lồng lung linh",
    rating: 4.9,
    places: []
  },
  {
    id: 5,
    name: "Nha Trang",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600",
    description: "Thành phố biển nổi tiếng với bãi tắm đẹp",
    rating: 4.6,
    places: []
  }
];