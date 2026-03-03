import { Link } from "react-router";
import { Header } from "../components/Header";
import { Plane, MapPin, Calendar, DollarSign, Sparkles, Map, Save } from "lucide-react";

const destinations = [
  {
    name: "Hà Nội",
    image: "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwaGFub2l8ZW58MXx8fHwxNzcyMjY1ODIwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thủ đô ngàn năm văn hiến",
  },
  {
    name: "TP. Hồ Chí Minh",
    image: "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWlnb24lMjBobyUyMGNoaSUyMG1pbmh8ZW58MXx8fHwxNzcyMjY1ODIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thành phố năng động và hiện đại",
  },
  {
    name: "Đà Nẵng",
    image: "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYSUyMG5hbmclMjBiZWFjaHxlbnwxfHx8fDE3NzIyNjU4MjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Thành phố đáng sống bên biển",
  },
  {
    name: "Hội An",
    image: "https://images.unsplash.com/photo-1664650440553-ab53804814b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob2klMjBhbiUyMGFuY2llbnQlMjB0b3dufGVufDF8fHx8MTc3MjI2NTgyMXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Phố cổ với đèn lồng lung linh",
  },
  {
    name: "Vịnh Hạ Long",
    image: "https://images.unsplash.com/photo-1668000018482-a02acf02b22a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWxvbmclMjBiYXklMjB2aWV0bmFtfGVufDF8fHx8MTc3MjI2NTgyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Di sản thiên nhiên thế giới",
  },
  {
    name: "Sapa",
    image: "https://images.unsplash.com/photo-1694152362876-42d5815a214d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYXBhJTIwcmljZSUyMHRlcnJhY2VzfGVufDF8fHx8MTc3MjI2NTgyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    description: "Ruộng bậc thang hùng vĩ",
  },
];

const features = [
  {
    icon: Sparkles,
    title: "AI Thông Minh",
    description: "Tạo lịch trình cá nhân hóa bằng AI",
  },
  {
    icon: Map,
    title: "Xem Trên Bản Đồ",
    description: "Hiển thị địa điểm trên bản đồ",
  },
  {
    icon: DollarSign,
    title: "Ước Tính Chi Phí",
    description: "Tính toán chi phí chuyến đi",
  },
  {
    icon: Save,
    title: "Lưu Hành Trình",
    description: "Lưu và quản lý lịch trình của bạn",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-3">
            <Plane className="h-12 w-12" />
            <h1 className="text-5xl font-bold">Du Lịch Việt</h1>
          </div>
          <h2 className="mb-4 text-6xl font-bold leading-tight">
            Khám Phá Việt Nam<br />
            Của Bạn
          </h2>
          <p className="mb-8 max-w-2xl text-xl text-blue-100">
            Lên kế hoạch cho chuyến du lịch hoàn hảo với trợ giúp của AI.
            Nhận lịch trình được cá nhân hóa, ước tính chi phí và khám phá những địa điểm tuyệt vời.
          </p>

          <Link
            to="/trip-planning"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            <Calendar className="h-6 w-6" />
            Bắt Đầu Lên Kế Hoạch
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h3 className="mb-12 text-center text-3xl font-bold text-gray-900">
          Tính Năng Nổi Bật
        </h3>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl bg-white p-6 text-center shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-full bg-blue-100 p-4">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="mb-2 text-xl font-bold text-gray-900">
                  {feature.title}
                </h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular Destinations */}
      <section id="destinations" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <h3 className="text-3xl font-bold text-gray-900">
            Điểm Đến Phổ Biến
          </h3>
          <button
            onClick={() => document.getElementById('all-destinations')?.scrollIntoView({ behavior: 'smooth' })}
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Xem Tất Cả →
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Link
              key={dest.name}
              to={`/trip-planning?destination=${encodeURIComponent(dest.name)}`}
              className="group relative overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="relative h-64">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <h4 className="text-2xl font-bold">{dest.name}</h4>
                </div>
                <p className="text-gray-200">{dest.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* All Destinations Grid */}
      <section id="all-destinations" className="mx-auto max-w-7xl px-6 py-16">
        <h3 className="mb-8 text-3xl font-bold text-gray-900">
          Tất Cả Điểm Đến
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hội An",
            "Vịnh Hạ Long", "Sapa", "Nha Trang", "Phú Quốc", "Đà Lạt", "Huế",
          ].map((dest) => (
            <Link
              key={dest}
              to={`/trip-planning?destination=${encodeURIComponent(dest)}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-semibold text-gray-900">{dest}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white">
          <h3 className="mb-4 text-4xl font-bold">
            Sẵn Sàng Cho Chuyến Phiêu Lưu?
          </h3>
          <p className="mb-8 text-xl text-blue-100">
            Tạo lịch trình du lịch hoàn hảo của bạn ngay hôm nay
          </p>
          <Link
            to="/trip-planning"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-xl transition-all hover:scale-105"
          >
            <Plane className="h-6 w-6" />
            Lên Kế Hoạch Ngay
          </Link>
        </div>
      </section>
    </div>
  );
}
