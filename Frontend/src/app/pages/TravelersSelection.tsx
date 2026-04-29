import { useState } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/Header";
import { ChevronLeft, Users, Plus, Minus, ArrowRight } from "lucide-react";

export default function TravelersSelection() {
  const navigate = useNavigate();
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const totalTravelers = adults + children;

  const handleContinue = () => {
    // Save to localStorage
    localStorage.setItem("tripTravelers", JSON.stringify({ adults, children, total: totalTravelers }));
    navigate("/budget-setup");
  };

  const incrementAdults = () => setAdults(prev => prev + 1);
  const decrementAdults = () => setAdults(prev => Math.max(0, prev - 1));
  const incrementChildren = () => setChildren(prev => prev + 1);
  const decrementChildren = () => setChildren(prev => Math.max(0, prev - 1));

  const handleAdultsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setAdults(Math.max(0, value));
  };

  const handleChildrenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setChildren(Math.max(0, value));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-orange-50">
      <Header />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Back Button */}
        <button
          onClick={() => navigate("/day-allocation")}
          className="mb-6 flex items-center gap-2 text-gray-600 transition-colors hover:text-cyan-600"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="font-semibold">Quay lại phân bổ ngày</span>
        </button>

        {/* Main Content */}
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-100">
          {/* Icon & Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bạn đi bao nhiêu người?</h1>
            <p className="text-gray-500">Chọn số lượng người lớn và trẻ em tham gia chuyến đi</p>
          </div>

          {/* Travelers Selection */}
          <div className="space-y-6 mb-8">
            {/* Adults */}
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Người lớn</h3>
                  <p className="text-sm text-gray-500">Từ 12 tuổi trở lên</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={decrementAdults}
                    disabled={adults === 0}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-700"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={adults}
                    onChange={handleAdultsInputChange}
                    className="w-16 text-center text-2xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                  <button
                    onClick={incrementAdults}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Children */}
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Trẻ em</h3>
                  <p className="text-sm text-gray-500">Dưới 12 tuổi</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={decrementChildren}
                    disabled={children === 0}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-700"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={children}
                    onChange={handleChildrenInputChange}
                    className="w-16 text-center text-2xl font-bold text-gray-900 border-2 border-gray-300 rounded-lg py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  />
                  <button
                    onClick={incrementChildren}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          {totalTravelers > 0 && (
            <div className="mb-6 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 p-5 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-100">Tổng số người</p>
                  <p className="text-3xl font-bold">{totalTravelers} người</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-cyan-100">Bao gồm</p>
                  <p className="text-lg font-semibold">
                    {adults > 0 && `${adults} người lớn`}
                    {adults > 0 && children > 0 && ", "}
                    {children > 0 && `${children} trẻ em`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          {totalTravelers > 0 && (
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-4 font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              Tiếp tục
              <ArrowRight className="h-5 w-5" />
            </button>
          )}

          {/* Helper Text */}
          {totalTravelers === 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Vui lòng chọn ít nhất 1 người để tiếp tục
              </p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">💡 Mẹo:</span> Số lượng người sẽ ảnh hưởng đến gợi ý về phương tiện di chuyển, loại phòng nghỉ và ngân sách cho chuyến đi của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}