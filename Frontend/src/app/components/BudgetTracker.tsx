import { useState } from "react";
import {
  DollarSign,
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  History,
  X,
} from "lucide-react";
import { trackBudgetChange } from "../utils/analytics";
import { BudgetPreset, presets } from "../data/budget";

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  icon: React.ElementType;
  color: string;
}

export function BudgetTracker() {
  const [totalBudget, setTotalBudget] = useState(10000000);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [showHistory, setShowHistory] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const [categories, setCategories] = useState<BudgetCategory[]>([
    { id: "dining", name: "Ẩm thực", amount: 2500000, icon: DollarSign, color: "orange" },
    { id: "transport", name: "Di chuyển", amount: 2000000, icon: DollarSign, color: "blue" },
    { id: "lodging", name: "Lưu trú", amount: 3000000, icon: DollarSign, color: "purple" },
    { id: "entertainment", name: "Giải trí", amount: 1000000, icon: DollarSign, color: "green" },
    { id: "shopping", name: "Mua sắm", amount: 1000000, icon: DollarSign, color: "pink" },
    { id: "contingency", name: "Dự phòng", amount: 500000, icon: DollarSign, color: "gray" },
  ]);

  const [expenses, setExpenses] = useState<number>(0);

  const totalAllocated = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const usedPercentage = (expenses / totalBudget) * 100;
  const allocatedPercentage = (totalAllocated / totalBudget) * 100;

  const handleIncrement = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const increment = 100000;
          trackBudgetChange(cat.name, cat.amount, cat.amount + increment, "increment");
          return { ...cat, amount: cat.amount + increment };
        }
        return cat;
      })
    );
  };

  const handleDecrement = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId && cat.amount >= 100000) {
          const decrement = 100000;
          trackBudgetChange(cat.name, cat.amount, cat.amount - decrement, "decrement");
          return { ...cat, amount: cat.amount - decrement };
        }
        return cat;
      })
    );
  };

  const handleDirectEdit = (categoryId: string, newAmount: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          trackBudgetChange(cat.name, cat.amount, newAmount, "direct_edit");
          return { ...cat, amount: newAmount };
        }
        return cat;
      })
    );
  };

  const applyPreset = (preset: BudgetPreset) => {
    setCategories((prev) =>
      prev.map((cat) => {
        const percentage = preset.allocations[cat.id] || 0;
        const newAmount = Math.round((totalBudget * percentage) / 100);
        if (newAmount !== cat.amount) {
          trackBudgetChange(cat.name, cat.amount, newAmount, `preset_${preset.id}`);
        }
        return { ...cat, amount: newAmount };
      })
    );
  };

  const costPerDay = totalAllocated / 3; // Assuming 3-day trip

  const changeHistory = JSON.parse(localStorage.getItem("budgetChangeHistory") || "[]").slice(-10);

  if (isCompact) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Ngân sách</h3>
            <p className="text-sm text-gray-600">
              {expenses.toLocaleString()}₫ / {totalBudget.toLocaleString()}₫
            </p>
          </div>
          <button
            onClick={() => setIsCompact(false)}
            className="rounded-lg bg-cyan-500 px-3 py-1 text-sm font-semibold text-white hover:bg-cyan-600"
          >
            Mở rộng
          </button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${usedPercentage >= warningThreshold ? "bg-red-500" : "bg-cyan-500"}`}
            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Ngân sách chuyến đi</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-lg border-2 border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50"
            title="Lịch sử thay đổi"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsCompact(true)}
            className="rounded-lg border-2 border-gray-200 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-cyan-50 to-orange-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Tổng ngân sách</span>
          <span className="text-2xl font-bold text-gray-900">{totalBudget.toLocaleString()}₫</span>
        </div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">Đã sử dụng</span>
          <span className="font-semibold text-gray-900">{expenses.toLocaleString()}₫</span>
        </div>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${usedPercentage >= warningThreshold ? "bg-red-500" : "bg-cyan-500"}`}
            style={{ width: `${Math.min(usedPercentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{usedPercentage.toFixed(1)}% đã dùng</span>
          {usedPercentage >= warningThreshold && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Gần vượt ngân sách!</span>
            </div>
          )}
        </div>
      </div>

      {/* Budget Presets */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-semibold text-gray-700">Phân bổ nhanh:</p>
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:border-cyan-500 hover:bg-cyan-50"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Phân bổ theo danh mục:</p>
        {categories.map((category) => (
          <div key={category.id} className="rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-gray-900">{category.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecrement(category.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={category.amount}
                  onChange={(e) => handleDirectEdit(category.id, parseInt(e.target.value) || 0)}
                  className="w-28 rounded-lg border-2 border-gray-200 px-2 py-1 text-center text-sm font-semibold focus:border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={() => handleIncrement(category.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full bg-${category.color}-500`}
                style={{ width: `${(category.amount / totalBudget) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Cost per Day */}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-600">Chi phí ước tính mỗi ngày</p>
          <p className="font-bold text-gray-900">{costPerDay.toLocaleString()}₫</p>
        </div>
      </div>

      {/* Add Expense Button */}
      <button
        onClick={() => setShowExpenseForm(true)}
        className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white transition-all hover:scale-[1.02]"
      >
        <Plus className="inline h-4 w-4 mr-2" />
        Thêm chi tiêu
      </button>

      {/* History Modal */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Lịch sử thay đổi</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {changeHistory.length === 0 ? (
                <p className="py-8 text-center text-gray-500">Chưa có thay đổi nào</p>
              ) : (
                changeHistory.reverse().map((event: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{event.category}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-600">
                      {event.oldValue.toLocaleString()}₫ → {event.newValue.toLocaleString()}₫
                      <span className="ml-2 text-xs text-gray-500">({event.action})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowExpenseForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900">Thêm chi tiêu</h3>
            <p className="mb-4 text-sm text-gray-600">Ghi lại chi tiêu thực tế của bạn</p>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Số tiền"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none"
              />
              <select className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none">
                <option value="">Chọn danh mục</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ghi chú (tùy chọn)"
                className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowExpenseForm(false)}
                className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  // In production, save expense
                  setShowExpenseForm(false);
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-2 font-semibold text-white hover:scale-[1.02]"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
