import { Link } from "react-router";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6">
      <div className="text-center">
        <h1 className="mb-4 text-9xl font-bold text-blue-600">404</h1>
        <h2 className="mb-4 text-3xl font-bold text-gray-900">
          Không Tìm Thấy Trang
        </h2>
        <p className="mb-8 text-lg text-gray-600">
          Trang bạn đang tìm kiếm không tồn tại
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Home className="h-5 w-5" />
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}
