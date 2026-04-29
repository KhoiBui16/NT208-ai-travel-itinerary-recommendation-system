import { Link } from "react-router";
import { Header } from "../components/Header";
import { destinations, features, heroFeatures } from "../data/homeData";
import { Sparkles, MapPin, Plane, Star, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Hero Image Background (Ruộng bậc thang) */}
        <div className="relative min-h-[750px] w-full">
          <img
  src="https://images.pexels.com/photos/2444403/pexels-photo-2444403.jpeg?auto=compress&cs=tinysrgb&w=2000"
  alt="Mu Cang Chai Terraced Fields"
  className="absolute inset-0 h-full w-full object-cover"
/>
          {/* Lớp phủ gradient tối dần từ trên xuống để làm nổi bật chữ */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

          {/* Hero Content (Căn giữa) */}
          <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
            <h2 className="mb-6 text-5xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl">
              Khám Phá Việt Nam
              <br />
              Với Trí Tuệ Nhân Tạo
            </h2>
            <p className="mb-10 max-w-3xl text-lg text-gray-200 md:text-xl">
              Lên kế hoạch cho chuyến du lịch hoàn hảo với trợ giúp của AI. Nhận
              lịch trình được cá nhân hóa, ước tính chi phí và khám phá những địa
              điểm tuyệt vời.
            </p>

            {/* CTA Button & Robot */}
            <div className="relative mb-16">
              <Link
                to="/create-trip"
                className="relative z-10 inline-flex items-center gap-3 rounded-full bg-orange-500 px-10 py-4 text-xl font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all hover:scale-105 hover:bg-orange-600"
              >
                <Sparkles className="h-6 w-6" />
                Bắt đầu lên lịch trình đầu tiên
              </Link>
              {/* Fake Robot Icon (Bạn có thể thay bằng thẻ img chứa hình robot thực tế) */}
              <div className="absolute -right-12 -top-8 z-20 animate-bounce">
                <span className="text-6xl filter drop-shadow-lg">🤖</span>
              </div>
            </div>

            {/* Glassmorphism Cards */}
            <div className="grid w-full max-w-5xl gap-6 sm:grid-cols-3">
              {heroFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.viTitle}
                    className="group flex flex-col items-center rounded-3xl border border-white/20 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-md transition-all hover:-translate-y-2 hover:bg-white/20"
                  >
                    <Icon className="mb-3 h-10 w-10 text-cyan-300" />
                    <h3 className="mb-2 text-xl font-bold text-white">
                      {feature.viTitle}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Phần còn lại giữ nguyên thiết kế cũ của bạn */}

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
                className="rounded-xl bg-white p-6 text-center shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex rounded-full bg-cyan-100 p-4">
                  <Icon className="h-8 w-8 text-cyan-600" />
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
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <h3 className="text-3xl font-bold text-gray-900">Điểm Đến Phổ Biến</h3>
          <Link
            to="/cities"
            className="font-semibold text-cyan-600 hover:text-cyan-700"
          >
            Xem Tất Cả →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <Link
              key={dest.name}
              to="/cities"
              className="group relative overflow-hidden rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
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

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-12 text-center text-white">
          <h3 className="mb-4 text-4xl font-bold">
            Sẵn Sàng Cho Chuyến Phiêu Lưu?
          </h3>
          <p className="mb-8 text-xl text-cyan-100">
            Tạo lịch trình du lịch hoàn hảo của bạn ngay hôm nay
          </p>
          <Link
            to="/create-trip"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-orange-600"
          >
            <Plane className="h-6 w-6" />
            Lên Kế Hoạch Ngay
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="mb-4 text-xl font-bold">Về sản phẩm</h4>
              <p className="text-gray-300">YourTrip - Chạm là đi</p>
            </div>
            <div>
              <h4 className="mb-4 text-xl font-bold">Đội ngũ phát triển</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Bùi Nhật Anh Khôi - Leader</li>
                <li>Dương Đăng Chính - FrontEnd</li>
                <li>Lê Văn Chí - BackEnd</li>
                <li>Nguyễn Hữu Chiến - BackEnd</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-xl font-bold">Kết nối & Hỗ trợ</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Email: 23520761@gm.uit.edu.vn</li>
                <li>
                  <a
                    href="https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-cyan-400"
                  >
                    GitHub: NT208-ai-travel-itinerary-recommendation-system
                  </a>
                </li>
                <li>Địa chỉ: Khu phố 6, P. Linh Trung, Thủ Đức (UIT)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center">
            <p className="text-gray-400">
              © 2026 [Your Trip] · From UIT with love
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}