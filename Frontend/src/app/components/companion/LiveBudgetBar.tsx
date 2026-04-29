import { useState } from "react";
import { DollarSign, Plus, X, Camera } from "lucide-react";

interface LiveBudgetBarProps {
  totalBudget: number;
  spent: number;
  onAddExpense: (amount: number, category: string, photo?: string) => void;
}

const expenseCategories = [
  "Ăn uống",
  "Di chuyển",
  "Tham quan",
  "Mua sắm",
  "Lưu trú",
  "Khác",
];

export function LiveBudgetBar({ totalBudget, spent, onAddExpense }: LiveBudgetBarProps) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  
  const percentage = totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 100) : 0;
  const remaining = totalBudget - spent;
  
  const getBarColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-green-500";
  };
  
  const getTextColor = () => {
    if (percentage >= 90) return "text-red-700";
    if (percentage >= 70) return "text-orange-700";
    return "text-green-700";
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };
  
  const handleSubmit = () => {
    const numAmount = parseInt(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onAddExpense(numAmount, category);
      setAmount("");
      setCategory("Ăn uống");
      setShowModal(false);
    }
  };
  
  return (
    <>
      {/* Persistent Bar */}
      <div
        onClick={() => setShowModal(true)}
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-gray-200 shadow-lg cursor-pointer transition-all hover:shadow-xl"
      >
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <DollarSign className={`h-5 w-5 ${getTextColor()}`} />
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(spent)} / {formatCurrency(totalBudget)}
                  </span>
                  <span className={`text-xs font-semibold ${getTextColor()}`}>
                    {percentage.toFixed(0)}% đã dùng
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full transition-all duration-500 ${getBarColor()}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition-all hover:bg-cyan-600"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick Add Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Thêm chi tiêu</h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Current Budget Status */}
            <div className="mb-5 rounded-xl bg-gray-50 p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Đã chi:</span>
                <span className="font-bold text-gray-900">{formatCurrency(spent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Còn lại:</span>
                <span className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Số tiền (VNĐ)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="VD: 50000"
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 px-4 text-gray-900 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 transition-all"
                  autoFocus
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Danh mục
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {expenseCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`rounded-lg border-2 py-2 px-2 text-sm font-semibold transition-all ${
                        category === cat
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Photo (Optional) */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Ảnh hóa đơn (tùy chọn)
                </label>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100">
                  <Camera className="h-5 w-5" />
                  Chụp hoặc tải ảnh
                </button>
              </div>
              
              {/* Delta Preview */}
              {amount && !isNaN(parseInt(amount)) && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                  <p className="text-sm text-orange-900">
                    <span className="font-semibold">Sau khi thêm:</span>{" "}
                    {formatCurrency(spent + parseInt(amount))} / {formatCurrency(totalBudget)}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {spent + parseInt(amount) > totalBudget 
                      ? `⚠️ Vượt ngân sách ${formatCurrency(spent + parseInt(amount) - totalBudget)}`
                      : `✓ Còn lại ${formatCurrency(totalBudget - spent - parseInt(amount))}`
                    }
                  </p>
                </div>
              )}
              
              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Xác nhận thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
