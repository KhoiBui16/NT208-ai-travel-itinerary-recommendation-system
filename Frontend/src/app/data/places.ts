export interface City {
  id: number;
  name: string;
  country: string;
  image: string;
  description: string;
}

export interface Place {
  id: number;
  name: string;
  cityId: number;
  image: string;
  rating: number;
  category: string;
  description: string;
}

// Mock data for cities
export const cities: City[] = [
  {
    id: 1,
    name: "Hà Nội",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?w=400",
    description: "Trung tâm văn hóa và lịch sử của Việt Nam",
  },
  {
    id: 2,
    name: "Đà Nẵng",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=400",
    description: "Thành phố biển đẹp với nhiều điểm tham quan",
  },
  {
    id: 3,
    name: "Hội An",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1595394462771-378e35f35b4e?w=400",
    description: "Phố cổ với kiến trúc cổ kính độc đáo",
  },
  {
    id: 4,
    name: "Sapa",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?w=400",
    description: "Vùng núi với ruộng bậc thang tuyệt đẹp",
  },
  {
    id: 5,
    name: "Phú Quốc",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1698809807960-758cf416e96e?w=400",
    description: "Đảo du lịch với bãi biển tuyệt đẹp",
  },
  {
    id: 6,
    name: "Vịnh Hạ Long",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=400",
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo",
  },
  {
    id: 7,
    name: "TP. Hồ Chí Minh",
    country: "Việt Nam",
    image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=600",
    description: "Thành phố năng động và hiện đại nhất Việt Nam"
  },
];

// Mock data for places
export const places: Place[] = [
  // Hà Nội
  { id: 1, name: "Văn Miếu Quốc Tử Giám", cityId: 1, image: "https://images.unsplash.com/photo-1756800585184-ce324a1fe500?w=300", rating: 4.8, category: "Điểm tham quan", description: "Di tích lịch sử văn hóa nổi tiếng" },
  { id: 2, name: "Hồ Hoàn Kiếm", cityId: 1, image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=300", rating: 4.7, category: "Thiên nhiên", description: "Trung tâm Hà Nội với hồ nước đẹp" },
  { id: 3, name: "Bún Chả Hương Liên", cityId: 1, image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300", rating: 4.6, category: "Ẩm thực", description: "Bún chả nổi tiếng Obama từng thưởng thức" },
  { id: 4, name: "Phố Cổ Hà Nội", cityId: 1, image: "https://images.unsplash.com/photo-1612459191625-ae51dc10eff3?w=300", rating: 4.5, category: "Điểm tham quan", description: "36 phố phường lịch sử" },
  { id: 5, name: "Lăng Hồ Chí Minh", cityId: 1, image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300", rating: 4.9, category: "Điểm tham quan", description: "Di tích lịch sử quan trọng" },
  { id: 6, name: "Cà phê trứng Giảng", cityId: 1, image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300", rating: 4.7, category: "Ẩm thực", description: "Cà phê trứng truyền thống Hà Nội" },
  
  // Đà Nẵng
  { id: 7, name: "Cầu Vàng Bà Nà Hills", cityId: 2, image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300", rating: 4.9, category: "Điểm tham quan", description: "Cây cầu vàng độc đáo" },
  { id: 8, name: "Bãi biển Mỹ Khê", cityId: 2, image: "https://images.unsplash.com/photo-1555979864-7a8f9b4fddf8?w=300", rating: 4.8, category: "Thiên nhiên", description: "Một trong những bãi biển đẹp nhất" },
  { id: 9, name: "Ngũ Hành Sơn", cityId: 2, image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?w=300", rating: 4.7, category: "Điểm tham quan", description: "Núi đá với nhiều hang động" },
  { id: 10, name: "Mì Quảng", cityId: 2, image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300", rating: 4.6, category: "Ẩm thực", description: "Đặc sản truyền thống Đà Nẵng" },
  { id: 11, name: "Bán đảo Sơn Trà", cityId: 2, image: "https://images.unsplash.com/photo-1555979864-7a8f9b4fddf8?w=300", rating: 4.8, category: "Thiên nhiên", description: "Khu bảo tồn thiên nhiên đẹp" },
  { id: 12, name: "Phố đi bộ sông Hàn", cityId: 2, image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=300", rating: 4.5, category: "Điểm tham quan", description: "Không gian giải trí bên sông" },
  
  // Hội An
  { id: 13, name: "Phố Cổ Hội An", cityId: 3, image: "https://images.unsplash.com/photo-1595394462771-378e35f35b4e?w=300", rating: 4.9, category: "Điểm tham quan", description: "Di sản văn hóa thế giới" },
  { id: 14, name: "Chùa Cầu", cityId: 3, image: "https://images.unsplash.com/photo-1766170507529-f9f377c8ff17?w=300", rating: 4.8, category: "Điểm tham quan", description: "Biểu tượng của Hội An" },
  { id: 15, name: "Cao lầu Hội An", cityId: 3, image: "https://images.unsplash.com/photo-1718942900361-d01a1ee8d077?w=300", rating: 4.7, category: "Ẩm thực", description: "Món ăn đặc sản Hội An" },
  { id: 16, name: "Bãi biển An Bàng", cityId: 3, image: "https://images.unsplash.com/photo-1555979864-7a8f9b4fddf8?w=300", rating: 4.6, category: "Thiên nhiên", description: "Bãi biển yên tĩnh gần Hội An" },
  { id: 17, name: "Làng rau Trà Quế", cityId: 3, image: "https://images.unsplash.com/photo-1649530928914-c2df337e3007?w=300", rating: 4.5, category: "Thiên nhiên", description: "Trải nghiệm làm rau hữu cơ" },
  { id: 18, name: "Bánh mì Phương", cityId: 3, image: "https://images.unsplash.com/photo-1745347455714-fdfc711ec593?w=300", rating: 4.8, category: "Ẩm thực", description: "Bánh mì nổi tiếng thế giới" },
];
