import React, { useState } from "react";
import { Utensils, Landmark, Music, Car, ShoppingBag, X, Check, Minus, Plus } from "lucide-react";
import { Day, DayExtraExpense } from "../types/trip.types";
import { BUDGET_CATEGORIES } from "../utils/tripConstants";

interface TripBudgetSidebarProps {
  selectedDay: Day;
  totalBudget: number;
  calculateTotalTripCost: () => number;
  calculateDayCost: (day: Day) => number;
  calculateDayCostByCategory: (day: Day) => Record<string, number>;
  formatCurrency: (value: number) => string;
  onOpenBudgetDetail: () => void;
  onAddDayExpense: (expense: { name: string; amount: number; category: "food" | "attraction" | "entertainment" | "transportation" | "shopping" }) => void;
  onRemoveDayExpense: (expenseId: number) => void;
}

export function TripBudgetSidebar({
  selectedDay,
  totalBudget,
  calculateTotalTripCost,
  calculateDayCost,
  calculateDayCostByCategory,
  formatCurrency,
  onOpenBudgetDetail,
  onAddDayExpense,
  onRemoveDayExpense
}: TripBudgetSidebarProps) {
  // Đưa các state của form "Chi tiêu theo ngày" vào đây
  const [showDayExpenseForm, setShowDayExpenseForm] = useState(false);
  const [dayExpenseDraft, setDayExpenseDraft] = useState({ 
    name: "Chi tiêu khác", 
    amount: 0, 
    category: "food" as "food" | "attraction" | "entertainment" | "transportation" | "shopping" 
  });
  const [dayExpenseError, setDayExpenseError] = useState("");

  const breakdown = calculateDayCostByCategory(selectedDay);

  return (
    <div className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Total Budget Section */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 px-4 py-4">
        <h2 className="mb-3 text-sm font-bold text-gray-900">Ngân sách chuyến đi</h2>
        
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          {totalBudget > 0 && (
            <div className="mb-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${calculateTotalTripCost() > totalBudget ? 'bg-red-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.min(100, totalBudget > 0 ? (calculateTotalTripCost() / totalBudget) * 100 : 0)}%` }}
              />
            </div>
          )}
          
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Tổng ngân sách</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Đã chi tiêu</span>
              <span className="font-bold text-orange-600">{formatCurrency(calculateTotalTripCost())}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Còn dư</span>
              <span className="font-bold text-green-600">{formatCurrency(Math.max(0, totalBudget - calculateTotalTripCost()))}</span>
            </div>
          </div>
          
          {totalBudget === 0 && (
            <p className="text-xs text-amber-600 mb-2">Bạn chưa thiết lập ngân sách cho chuyến đi</p>
          )}
          
          {totalBudget > 0 && totalBudget < 10000 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-amber-700">⚠ Ngân sách quá ít</p>
            </div>
          )}
          
          {totalBudget >= 10000 && calculateTotalTripCost() > totalBudget && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-red-600">
                ⚠ Đã vượt ngân sách {formatCurrency(calculateTotalTripCost() - totalBudget)}
              </p>
            </div>
          )}
          
          <button
            onClick={onOpenBudgetDetail}
            className="mt-2 w-full rounded-lg bg-cyan-600 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-700"
          >
            Xem chi tiết
          </button>
        </div>
      </div>

      {/* Daily Budget Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Chi tiêu {selectedDay.label}</h3>
          <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(calculateDayCost(selectedDay))}</p>
        </div>
        
        <div className="p-4 space-y-3">
          {BUDGET_CATEGORIES.filter(c => c.key !== 'accommodation').map(cat => {
            const Icon = cat.icon;
            const baseAmount = breakdown[cat.key] || 0;
            if (baseAmount === 0) return null;
            
            return (
              <div key={cat.key} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.textColor}`} />
                    <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(baseAmount)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1"></p>
              </div>
            );
          }).filter(Boolean)}
          
          {/* Day Extra Expenses */}
          {selectedDay.extraExpenses && selectedDay.extraExpenses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 mt-4 mb-2">Chi tiêu khác</h4>
              {selectedDay.extraExpenses.map(expense => {
                const categoryInfo = {
                  food: { label: 'Ăn uống', icon: Utensils, color: 'text-orange-600' },
                  attraction: { label: 'Tham quan', icon: Landmark, color: 'text-cyan-600' },
                  entertainment: { label: 'Giải trí', icon: Music, color: 'text-purple-600' },
                  transportation: { label: 'Di chuyển', icon: Car, color: 'text-blue-600' },
                  shopping: { label: 'Mua sắm', icon: ShoppingBag, color: 'text-pink-600' },
                }[expense.category];
                
                return (
                  <div key={expense.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{expense.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{categoryInfo?.label}</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(expense.amount)}</span>
                        <button
                          onClick={() => onRemoveDayExpense(expense.id)}
                          className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Add Extra Expense Form */}
          {showDayExpenseForm ? (
            <div className="rounded-lg border-2 border-cyan-300 bg-cyan-50 p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">Thêm chi tiêu</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (dayExpenseDraft.amount === 0) {
                        setDayExpenseError("Bạn chưa nhập số tiền");
                        return;
                      }
                      if (dayExpenseDraft.amount < 1000) {
                        setDayExpenseError("Số tiền nhập quá ít");
                        return;
                      }
                      onAddDayExpense({
                        name: dayExpenseDraft.name || "Chi tiêu khác",
                        amount: dayExpenseDraft.amount,
                        category: dayExpenseDraft.category
                      });
                      setShowDayExpenseForm(false);
                      setDayExpenseDraft({ name: "Chi tiêu khác", amount: 0, category: "food" });
                      setDayExpenseError("");
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded bg-cyan-600 text-white hover:bg-cyan-700"
                    title="Xác nhận"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setShowDayExpenseForm(false);
                      setDayExpenseDraft({ name: "Chi tiêu khác", amount: 0, category: "food" });
                      setDayExpenseError("");
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={dayExpenseDraft.name}
                onChange={(e) => setDayExpenseDraft(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs mb-2"
                placeholder="Tên chi tiêu"
              />
              <select
                value={dayExpenseDraft.category}
                onChange={(e) => setDayExpenseDraft(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs mb-2"
              >
                <option value="food">Ăn uống</option>
                <option value="attraction">Tham quan</option>
                <option value="entertainment">Giải trí và trải nghiệm</option>
                <option value="transportation">Di chuyển</option>
                <option value="shopping">Mua sắm</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDayExpenseDraft(prev => ({ ...prev, amount: Math.max(0, prev.amount - 1000) }))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="text"
                  value={dayExpenseDraft.amount === 0 ? "" : dayExpenseDraft.amount.toString()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setDayExpenseDraft(prev => ({ ...prev, amount: val === '' ? 0 : parseInt(val) }));
                    setDayExpenseError("");
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-center"
                />
                <button
                  onClick={() => setDayExpenseDraft(prev => ({ ...prev, amount: prev.amount + 1000 }))}
                  className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {dayExpenseError && (
                <p className="text-xs text-red-600 mt-1.5 font-semibold">{dayExpenseError}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setShowDayExpenseForm(true);
                setDayExpenseDraft({ name: "Chi tiêu khác", amount: 0, category: "food" });
                setDayExpenseError("");
              }}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-xs font-semibold text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all"
            >
              + Thêm chi tiêu khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
}