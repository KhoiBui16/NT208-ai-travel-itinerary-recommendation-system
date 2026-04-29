export interface Place {
  id: number;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  description: string;
  openingHours: string;
  priceRange: string;
  visitDuration: string;
  estimatedCost?: string;
  address?: string;
}

export interface City {
  id: string;
  name: string;
  region: string;
  image: string;
  description: string;
  popularPlaces: number;
  rating: number;
}

export interface CityData {
  id: string;
  name: string;
  region: string;
  image: string;
  bannerImage: string;
  description: string;
  overview: string;
  bestTimeToVisit: string;
  averageTemperature: string;
  popularPlaces: Place[];
}

// Mock data for cities
export const cityData: Record<string, CityData> = {
  "ha-noi": {
    id: "ha-noi",
    name: "Hà Nội",
    region: "Miền Bắc",
    image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1200",
    bannerImage: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?w=1200",
    description: "Thủ đô ngàn năm văn hiến với nhiều di tích lịch sử",
    overview:
      "Hà Nội là thủ đô của Việt Nam, một thành phố với lịch sử hơn 1000 năm tuổi. Nơi đây kết hợp hài hòa giữa nét đẹp truyền thống và hiện đại, với những khu phố cổ kính, hồ nước thơ mộng và các công trình kiến trúc Pháp. Hà Nội cũng nổi tiếng với ẩm thực phong phú, từ phở, bún chả đến cà phê trứng đặc trưng.",
    bestTimeToVisit: "Tháng 9 - Tháng 11 và Tháng 3 - Tháng 4",
    averageTemperature: "23°C - 30°C",
    popularPlaces: [
      {
        id: 1,
        name: "Văn Miếu Quốc Tử Giám",
        image: "https://images.unsplash.com/photo-1756800585184-ce324a1fe500?w=500",
        rating: 4.8,
        reviewCount: 1245,
        category: "Di tích lịch sử",
        description:
          "Ngôi đền Khổng Tử đầu tiên của Việt Nam, được xây dựng vào năm 1070. Đây là trường đại học đầu tiên của Việt Nam và là biểu tượng của nền giáo dục truyền thống.",
        openingHours: "8:00 - 17:00 hàng ngày",
        priceRange: "30,000đ",
        visitDuration: "1-2 giờ",
      },
      {
        id: 2,
        name: "Hồ Hoàn Kiếm",
        image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=500",
        rating: 4.7,
        reviewCount: 2341,
        category: "Thiên nhiên & Công viên",
        description:
          "Trái tim của Hà Nội với hồ nước xanh mát và chùa Ngọc Sơn trên đảo. Nơi đây là điểm đến lý tưởng để dạo bộ, tập thể dục buổi sáng và ngắm cảnh hoàng hôn.",
        openingHours: "Mở cửa 24/7",
        priceRange: "Miễn phí",
        visitDuration: "30 phút - 1 giờ",
      },
      {
        id: 3,
        name: "Phố Cổ Hà Nội",
        image: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?w=500",
        rating: 4.6,
        reviewCount: 3102,
        category: "Khu phố",
        description:
          "36 phố phường với lịch sử hàng trăm năm, mỗi phố chuyên về một nghề truyền thống. Nơi đây là thiên đường mua sắm, ẩm thực và trải nghiệm văn hóa đường phố.",
        openingHours: "Mở cửa 24/7",
        priceRange: "Miễn phí tham quan",
        visitDuration: "2-3 giờ",
      },
      {
        id: 4,
        name: "Lăng Hồ Chí Minh",
        image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=500",
        rating: 4.9,
        reviewCount: 1876,
        category: "Di tích lịch sử",
        description:
          "Nơi an nghỉ của Chủ tịch Hồ Chí Minh, một công trình kiến trúc trang nghiêm và ấn tượng. Khu di tích bao gồm Lăng Bác, Nhà sàn, ao cá và vườn hoa.",
        openingHours: "7:30 - 10:30 (trừ thứ 2 và thứ 6)",
        priceRange: "Miễn phí",
        visitDuration: "1.5-2 giờ",
      },
      {
        id: 5,
        name: "Bún Chả Hương Liên",
        image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=500",
        rating: 4.7,
        reviewCount: 892,
        category: "Ẩm thực",
        description:
          "Quán bún chả nổi tiếng nơi Tổng thống Obama và đầu bếp Anthony Bourdain từng thưởng thức. Món bún chả truyền thống Hà Nội với thịt nướng thơm ngon.",
        openingHours: "10:00 - 21:00 hàng ngày",
        priceRange: "40,000đ - 80,000đ",
        visitDuration: "45 phút - 1 giờ",
      },
      {
        id: 6,
        name: "Cà phê trứng Giảng",
        image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=500",
        rating: 4.8,
        reviewCount: 1523,
        category: "Ẩm thực",
        description:
          "Quán cà phê nổi tiếng với món cà phê trứng độc đáo - sáng tạo của người Hà Nội. Vị cà phê đắng kết hợp với lớp kem trứng béo ngậy tạo nên hương vị khó quên.",
        openingHours: "7:00 - 22:00 hàng ngày",
        priceRange: "30,000đ - 50,000đ",
        visitDuration: "30 phút - 1 giờ",
      },
    ],
  },
  "ho-chi-minh": {
    id: "ho-chi-minh",
    name: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1200",
    bannerImage: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200",
    description: "Thành phố năng động và hiện đại nhất Việt Nam",
    overview:
      "TP. Hồ Chí Minh (Sài Gòn) là trung tâm kinh tế lớn nhất Việt Nam, một thành phố năng động với nhịp sống sôi động và hiện đại. Nơi đây kết hợp giữa kiến trúc Pháp cổ điển và các tòa nhà chọc trời hiện đại, với đời sống văn hóa phong phú và ẩm thực đa dạng. Sài Gòn cũng là điểm xuất phát lý tưởng để khám phá miền Nam Việt Nam.",
    bestTimeToVisit: "Tháng 12 - Tháng 4",
    averageTemperature: "26°C - 32°C",
    popularPlaces: [
      {
        id: 7,
        name: "Dinh Độc Lập",
        image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=500",
        rating: 4.7,
        reviewCount: 2103,
        category: "Di tích lịch sử",
        description:
          "Công trình kiến trúc độc đáo, từng là dinh thự và nơi làm việc của Tổng thống Việt Nam Cộng Hòa. Nơi đây ghi dấu sự kiện lịch sử quan trọng năm 1975.",
        openingHours: "7:30 - 11:00, 13:00 - 16:00",
        priceRange: "65,000đ",
        visitDuration: "1-1.5 giờ",
      },
      {
        id: 8,
        name: "Nhà thờ Đức Bà",
        image: "https://images.unsplash.com/photo-1566840056115-68772ebbb15f?w=500",
        rating: 4.8,
        reviewCount: 1876,
        category: "Kiến trúc",
        description:
          "Nhà thờ Gothic Pháp mang tính biểu tượng với hai tháp chuông cao vút. Được xây dựng từ những viên gạch đỏ nhập khẩu từ Marseille, Pháp.",
        openingHours: "8:00 - 11:00, 15:00 - 16:00",
        priceRange: "Miễn phí",
        visitDuration: "30 phút",
      },
      {
        id: 9,
        name: "Chợ Bến Thành",
        image: "https://images.unsplash.com/photo-1601024445121-e5b82f020549?w=500",
        rating: 4.5,
        reviewCount: 3421,
        category: "Mua sắm",
        description:
          "Chợ truyền thống lớn nhất Sài Gòn với hàng nghìn gian hàng bán đủ loại mặt hàng từ quần áo, đồ lưu niệm đến ẩm thực đường phố.",
        openingHours: "6:00 - 18:00 hàng ngày",
        priceRange: "Tùy món",
        visitDuration: "1-2 giờ",
      },
      {
        id: 10,
        name: "Phố đi bộ Nguyễn Huệ",
        image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=500",
        rating: 4.6,
        reviewCount: 1654,
        category: "Giải trí",
        description:
          "Không gian đi bộ hiện đại với đài phun nước, ánh sáng lung linh và các hoạt động văn hóa. Điểm đến lý tưởng để dạo chơi buổi tối.",
        openingHours: "Mở cửa 24/7",
        priceRange: "Miễn phí",
        visitDuration: "1-2 giờ",
      },
    ],
  },
  "da-nang": {
    id: "da-nang",
    name: "Đà Nẵng",
    region: "Miền Trung",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1200",
    bannerImage: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
    description: "Thành phố đáng sống với biển đẹp và cơ sở hạ tầng hiện đại",
    overview:
      "Đà Nẵng là thành phố trực thuộc trung ương lớn thứ ba của Việt Nam, nổi tiếng với bãi biển đẹp, cơ sở hạ tầng hiện đại và những cây cầu độc đáo. Thành phố này là cửa ngõ để khám phá các di sản văn hóa thế giới như Hội An, Mỹ Sơn và cố đô Huế. Đà Nẵng cũng nổi bật với ẩm thực miền Trung phong phú.",
    bestTimeToVisit: "Tháng 2 - Tháng 5",
    averageTemperature: "25°C - 30°C",
    popularPlaces: [
      {
        id: 11,
        name: "Cầu Vàng Bà Nà Hills",
        image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=500",
        rating: 4.9,
        reviewCount: 4521,
        category: "Điểm tham quan",
        description:
          "Cây cầu vàng nổi tiếng thế giới với thiết kế độc đáo được nâng đỡ bởi đôi bàn tay khổng lồ. Nằm trên đỉnh Bà Nà Hills với tầm nhìn tuyệt đẹp.",
        openingHours: "7:00 - 22:00 hàng ngày",
        priceRange: "750,000đ (bao gồm cáp treo)",
        visitDuration: "Cả ngày",
      },
      {
        id: 12,
        name: "Bãi biển Mỹ Khê",
        image: "https://images.unsplash.com/photo-1555979864-7a8f9b4fddf8?w=500",
        rating: 4.8,
        reviewCount: 3102,
        category: "Thiên nhiên",
        description:
          "Một trong những bãi biển đẹp nhất thế giới theo Forbes, với bãi cát trắng mịn và nước biển trong xanh. Lý tưởng cho các hoạt động thể thao nước.",
        openingHours: "Mở cửa 24/7",
        priceRange: "Miễn phí",
        visitDuration: "2-4 giờ",
      },
      {
        id: 13,
        name: "Ngũ Hành Sơn",
        image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?w=500",
        rating: 4.7,
        reviewCount: 1876,
        category: "Di tích lịch sử",
        description:
          "Quần thể 5 ngọn núi đá vôi với nhiều hang động, chùa chiền và điểm ngắm cảnh tuyệt đẹp. Mỗi ngọn núi mang tên một nguyên tố: Kim, Mộc, Thủy, Hỏa, Thổ.",
        openingHours: "7:00 - 17:30 hàng ngày",
        priceRange: "40,000đ",
        visitDuration: "2-3 giờ",
      },
      {
        id: 14,
        name: "Cầu Rồng",
        image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=500",
        rating: 4.6,
        reviewCount: 2234,
        category: "Kiến trúc",
        description:
          "Cây cầu biểu tượng của Đà Nẵng với hình dáng con rồng, phun lửa và nước vào tối cuối tuần. Đặc biệt đẹp khi được thắp sáng vào ban đêm.",
        openingHours: "Mở cửa 24/7, phun lửa 21:00 T7 & CN",
        priceRange: "Miễn phí",
        visitDuration: "30 phút - 1 giờ",
      },
    ],
  },
};

export const cities: City[] = [
  {
    id: "ha-noi",
    name: "Hà Nội",
    region: "Miền Bắc",
    image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=600",
    description: "Thủ đô ngàn năm văn hiến với nhiều di tích lịch sử",
    popularPlaces: 24,
    rating: 4.8,
  },
  {
    id: "ho-chi-minh",
    name: "TP. Hồ Chí Minh",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=600",
    description: "Thành phố năng động và hiện đại nhất Việt Nam",
    popularPlaces: 28,
    rating: 4.7,
  },
  {
    id: "da-nang",
    name: "Đà Nẵng",
    region: "Miền Trung",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=600",
    description: "Thành phố đáng sống với biển đẹp và cơ sở hạ tầng hiện đại",
    popularPlaces: 18,
    rating: 4.9,
  },
  {
    id: "hoi-an",
    name: "Hội An",
    region: "Miền Trung",
    image: "https://images.unsplash.com/photo-1595394462771-378e35f35b4e?w=600",
    description: "Phố cổ với kiến trúc độc đáo và đèn lồng lung linh",
    popularPlaces: 15,
    rating: 4.9,
  },
  {
    id: "nha-trang",
    name: "Nha Trang",
    region: "Miền Trung",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600",
    description: "Thành phố biển nổi tiếng với bãi tắm đẹp",
    popularPlaces: 16,
    rating: 4.6,
  },
  {
    id: "phu-quoc",
    name: "Phú Quốc",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1698809807960-758cf416e96e?w=600",
    description: "Đảo ngọc với bãi biển trong xanh và resort sang trọng",
    popularPlaces: 12,
    rating: 4.8,
  },
  {
    id: "sapa",
    name: "Sapa",
    region: "Miền Bắc",
    image: "https://images.unsplash.com/photo-1694152362876-42d5815a214d?w=600",
    description: "Vùng núi cao với ruộng bậc thang tuyệt đẹp",
    popularPlaces: 10,
    rating: 4.7,
  },
  {
    id: "ha-long",
    name: "Vịnh Hạ Long",
    region: "Miền Bắc",
    image: "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=600",
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi",
    popularPlaces: 14,
    rating: 4.9,
  },
  {
    id: "hue",
    name: "Huế",
    region: "Miền Trung",
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600",
    description: "Cố đô với kiến trúc hoàng gia và ẩm thực đặc sắc",
    popularPlaces: 20,
    rating: 4.7,
  },
  {
    id: "da-lat",
    name: "Đà Lạt",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1632555272863-536e1a4c7ae3?w=600",
    description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm",
    popularPlaces: 22,
    rating: 4.8,
  },
  {
    id: "vung-tau",
    name: "Vũng Tàu",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=600",
    description: "Thành phố biển gần TP.HCM với bãi biển và hải sản tươi ngon",
    popularPlaces: 11,
    rating: 4.5,
  },
  {
    id: "can-tho",
    name: "Cần Thơ",
    region: "Miền Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600",
    description: "Trung tâm đồng bằng sông Cửu Long với chợ nổi nổi tiếng",
    popularPlaces: 13,
    rating: 4.6,
  },
];