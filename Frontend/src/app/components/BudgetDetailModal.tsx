import React, { useState } from "react";
import { X, Utensils, Landmark, Music, ShoppingBag, Car, Hotel as HotelIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Day } from "../types/trip.types";
import { BUDGET_CATEGORIES } from "../utils/tripConstants";

interface BudgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBudget: number;
  setTotalBudget: (val: number) => void;
  calculateTotalTripCost: () => number;
  calculateDayCost: (day: Day) => number;
  calculateTotalCostByCategory: () => Record<string, number>;
  formatCurrency: (val: number) => string;
  days: Day[];
}

export function BudgetDetailModal({ isOpen, onClose, totalBudget, setTotalBudget, calculateTotalTripCost, calculateDayCost, calculateTotalCostByCategory, formatCurrency, days }: BudgetDetailModalProps) {
  const [showSetBudgetInput, setShowSetBudgetInput] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState("");
  const [showAdjustBudget, setShowAdjustBudget] = useState(false);
  const [adjustBudgetValue, setAdjustBudgetValue] = useState("");

  if (!isOpen) return null;

  const handleSetBudget = () => {
    const val = parseInt(budgetInputValue);
    if (!val || val <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ", { position: "top-right", duration: 3000 });
      return;
    }
    if (val < 10000) {
      if (window.confirm("Ngân sách hiện tại quá ít, bạn có thực sự muốn thiết lập không?")) {
        setTotalBudget(val);
        localStorage.setItem("tripBudget", JSON.stringify({ total: val })); // Chuyển logic lưu ngân sách lên API Backend
        setShowSetBudgetInput(false);
        setBudgetInputValue("");
      }
    } else {
      setTotalBudget(val);
      localStorage.setItem("tripBudget", JSON.stringify({ total: val }));  // Chuyển logic lưu ngân sách lên API Backend
      setShowSetBudgetInput(false);
      setBudgetInputValue("");
      toast.success("Đã thiết lập ngân sách", { position: "top-right", duration: 3000 });
    }
  };

  const handleAdjustBudget = () => {
    const val = parseInt(adjustBudgetValue);
    if (!val || val <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ", { position: "top-right", duration: 3000 });
      return;
    }
    if (val < 10000) {
      if (window.confirm("Ngân sách hiện tại quá ít, bạn có thực sự muốn thiết lập không?")) {
        setTotalBudget(val);
        localStorage.setItem("tripBudget", JSON.stringify({ total: val }));  // Chuyển logic lưu ngân sách lên API Backend
        setShowAdjustBudget(false);
        setAdjustBudgetValue("");
      }
    } else {
      setTotalBudget(val);
      localStorage.setItem("tripBudget", JSON.stringify({ total: val }));  // Chuyển logic lưu ngân sách lên API Backend
      setShowAdjustBudget(false);
      setAdjustBudgetValue("");
      toast.success("Đã cập nhật ngân sách", { position: "top-right", duration: 3000 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Chi tiết ngân sách</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 p-5">
          {totalBudget === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">Bạn chưa thiết lập ngân sách cho chuyến đi này</p>
              {showSetBudgetInput ? (
                <div className="max-w-xs mx-auto space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="text" value={budgetInputValue} onChange={(e) => setBudgetInputValue(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Nhập tổng ngân sách (₫)" className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowSetBudgetInput(false); setBudgetInputValue(""); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600">
                      Hủy
                    </button>
                    <button onClick={handleSetBudget} className="flex-1 rounded-lg bg-cyan-600 py-2 text-sm font-bold text-white hover:bg-cyan-700">
                      Xác nhận
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSetBudgetInput(true)} className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-bold text-white hover:bg-cyan-700">
                  Thiết lập ngân sách
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${calculateTotalTripCost() > totalBudget ? 'bg-red-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, totalBudget > 0 ? (calculateTotalTripCost() / totalBudget) * 100 : 0)}%` }} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Tổng ngân sách</span>
                  <div className="flex items-center gap-2">
                    {showAdjustBudget ? (
                      <>
                        <input type="text" value={adjustBudgetValue} onChange={(e) => setAdjustBudgetValue(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Nhập số tiền" className="w-32 rounded border-2 border-cyan-500 px-2 py-1 text-sm text-right focus:outline-none" autoFocus />
                        <button onClick={() => { setShowAdjustBudget(false); setAdjustBudgetValue(""); }} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">
                          Hủy
                        </button>
                        <button onClick={handleAdjustBudget} className="text-xs px-2 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700">
                          Xác nhận
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setShowAdjustBudget(true); setAdjustBudgetValue(totalBudget.toString()); }} className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">
                          Điều chỉnh ngân sách
                        </button>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(totalBudget)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Đã chi tiêu</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(calculateTotalTripCost())}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Còn dư</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(Math.max(0, totalBudget - calculateTotalTripCost()))}</span>
                </div>
              </div>
              {totalBudget > 0 && totalBudget < 10000 && (
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-sm font-semibold text-amber-700">⚠ Ngân sách quá ít</p>
                </div>
              )}
              {totalBudget >= 10000 && calculateTotalTripCost() > totalBudget && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-sm font-semibold text-red-600">⚠ Đã vượt ngân sách {formatCurrency(calculateTotalTripCost() - totalBudget)}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Cơ cấu chi tiêu</h4>
          {(() => {
            const breakdown = calculateTotalCostByCategory();
          
            const totalSpent = calculateTotalTripCost();
            const pieData = BUDGET_CATEGORIES.filter(cat => (breakdown[cat.key] || 0) > 0).map(cat => ({ name: cat.label, value: breakdown[cat.key] || 0, color: cat.hexColor }));
            
            if (pieData.length === 0) {
              return <p className="text-gray-400 text-center py-6">Chưa có chi tiêu</p>;
            }
            
            return (
              <div className="flex gap-6 items-center">
                <div className="w-48 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {BUDGET_CATEGORIES.map(cat => {
                    const amount = breakdown[cat.key] || 0;
                    if (amount === 0) return null;
                    const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                    const Icon = cat.icon;
                    return (
                      <div key={cat.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.hexColor }} />
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{cat.label}</span>
                          <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</span>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            );
          })()}
        </div>

        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-4">Chi tiêu theo ngày</h4>
          <div className="space-y-2">
            {days.map(day => {
              const dayCost = calculateDayCost(day);
              if (dayCost === 0) return null;
              return (
                <div key={day.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{day.label}</p>
                      <p className="text-xs text-gray-500">{day.date}</p>
                    </div>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(dayCost)}</p>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white transition-colors hover:bg-cyan-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}