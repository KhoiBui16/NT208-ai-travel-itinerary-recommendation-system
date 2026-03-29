import React, { useState } from "react";
import { X, MapPin, Eye, DollarSign, Check, AlertCircle, Minus, Plus } from "lucide-react";
import { Activity, TravelerInfo, TimeConflictWarning, ExtraExpense } from "../types/trip.types";
import { typeColors, typeLabels, transportationOptions, nextId } from "../utils/tripConstants";

interface ActivityDetailModalProps {
  editingActivity: Activity;
  setEditingActivity: React.Dispatch<React.SetStateAction<Activity | null>>;
  travelers: TravelerInfo;
  timeConflictWarning: TimeConflictWarning;
  setTimeConflictWarning: React.Dispatch<React.SetStateAction<TimeConflictWarning>>;
  onClose: () => void;
  onSave: () => void;
  onViewPlace: (placeInfo: any) => void;
  checkTimeConflict: (activity: Activity) => TimeConflictWarning;
  formatCurrency: (value: number) => string;
  calculateActivityCost: (activity: Activity) => number;
}

export function ActivityDetailModal({
  editingActivity,
  setEditingActivity,
  travelers,
  timeConflictWarning,
  setTimeConflictWarning,
  onClose,
  onSave,
  onViewPlace,
  checkTimeConflict,
  formatCurrency,
  calculateActivityCost,
}: ActivityDetailModalProps) {
  const [showActivityExpenseForm, setShowActivityExpenseForm] = useState(false);
  const [expenseSubmitAttempted, setExpenseSubmitAttempted] = useState(false);
  const [activityExpenseDraft, setActivityExpenseDraft] = useState({ 
    name: "Chi tiêu khác", amount: 0, category: "food" as "food" | "attraction" | "entertainment" | "transportation" | "shopping" 
  });

  const handleRemoveExtraExpense = (expenseId: number) => {
    setEditingActivity((prev: Activity | null) => prev ? {
      ...prev,
      extraExpenses: (prev.extraExpenses || []).filter((exp: ExtraExpense) => exp.id !== expenseId)
    } : prev);
  };

  const handleOpenExpenseForm = () => {
    setActivityExpenseDraft({ name: "Chi tiêu khác", amount: 0, category: "food" });
    setExpenseSubmitAttempted(false);
    setShowActivityExpenseForm(true);
  };

  let currentNextId = nextId;

  const noSpinnersClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Chi tiết hoạt động</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-6 flex gap-4">
          <img src={editingActivity.image} alt={editingActivity.name} className="h-32 w-40 flex-shrink-0 rounded-xl object-cover" />
          <div className="flex-1">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${typeColors[editingActivity.type]} mb-2`}>{typeLabels[editingActivity.type]}</span>
            <h4 className="text-lg font-bold text-gray-900 mb-1">{editingActivity.name}</h4>
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2"><MapPin className="h-4 w-4" /><span>{editingActivity.location}</span></div>
            <button onClick={() => onViewPlace({ name: editingActivity.name, image: editingActivity.image, description: editingActivity.description, address: editingActivity.location, rating: 4.5, reviewCount: 1234, estimatedCost: editingActivity.type === 'food' ? `${formatCurrency(editingActivity.adultPrice || 0)}/người` : editingActivity.type === 'attraction' ? formatCurrency(editingActivity.adultPrice || 0) : 'Miễn phí', openingHours: '08:00 - 22:00' })} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"><Eye className="h-3.5 w-3.5" /> Thông tin về địa điểm</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Thời gian bắt đầu</label>
              <input type="time" value={editingActivity.time} onChange={(e) => { const updated = { ...editingActivity, time: e.target.value }; setEditingActivity(updated); setTimeConflictWarning(checkTimeConflict(updated)); }} className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 focus:border-cyan-500 focus:bg-white focus:outline-none font-medium text-gray-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Thời gian kết thúc</label>
              <input type="time" value={editingActivity.endTime || ""} onChange={(e) => { const updated = { ...editingActivity, endTime: e.target.value }; setEditingActivity(updated); setTimeConflictWarning(checkTimeConflict(updated)); }} className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 focus:border-cyan-500 focus:bg-white focus:outline-none font-medium text-gray-900" />
            </div>
          </div>
          
          {timeConflictWarning.hasConflict && timeConflictWarning.conflictWith && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">Cảnh báo: Thời gian này đang bị trùng lặp với lịch trình khác của bạn. Vui lòng điều chỉnh lại!</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Phương tiện di chuyển</label>
            <div className="grid grid-cols-4 gap-2">
              {transportationOptions.map((option: any) => {
                const Icon = option.icon; const isSelected = editingActivity.transportation === option.id;
                return (
                  <button key={option.id} onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, transportation: option.id as any } : prev)} className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${isSelected ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}><Icon className="h-5 w-5" /><span className="text-xs font-semibold">{option.label}</span></button>
                );
              })}
            </div>
          </div>

          {editingActivity.type !== "nature" && (
            <div className="rounded-xl bg-emerald-50/50 border border-emerald-200 p-5">
              <h4 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Chi phí ước tính</h4>
              <div className="space-y-4">
                
                {/* Taxi / Bus Cost */}
                {editingActivity.transportation && editingActivity.transportation !== "walk" && editingActivity.transportation !== "bike" && (
                  <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm">
                    <h5 className="text-sm font-bold text-gray-900 mb-3">Di chuyển</h5>
                    {editingActivity.transportation === "bus" ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-700 font-semibold">Giá vé xe buýt / người:</label>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, busTicketPrice: Math.max(0, (prev.busTicketPrice || 0) - 5000) } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Minus className="h-4 w-4" /></button>
                            <input type="number" min="0" step="1000" value={editingActivity.busTicketPrice || 0} onChange={(e) => setEditingActivity((prev: Activity | null) => prev ? { ...prev, busTicketPrice: Math.max(0, parseInt(e.target.value) || 0) } : prev)} className={`w-28 rounded-md border border-gray-300 py-1.5 px-2 text-sm text-center font-bold text-gray-900 focus:outline-none focus:border-cyan-500 ${noSpinnersClass}`} />
                            <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, busTicketPrice: (prev.busTicketPrice || 0) + 5000 } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Plus className="h-4 w-4" /></button>
                            <span className="text-sm font-bold text-gray-700 ml-1">₫</span>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-700 font-semibold text-right">× {travelers.total} người = {formatCurrency((editingActivity.busTicketPrice || 0) * travelers.total)}</p>
                      </div>
                    ) : editingActivity.transportation === "taxi" ? (
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-700 font-semibold">Chi phí Taxi (Tổng):</label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, taxiCost: Math.max(0, (prev.taxiCost || 0) - 10000) } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Minus className="h-4 w-4" /></button>
                          <input type="number" min="0" step="10000" value={editingActivity.taxiCost || 0} onChange={(e) => setEditingActivity((prev: Activity | null) => prev ? { ...prev, taxiCost: Math.max(0, parseInt(e.target.value) || 0) } : prev)} className={`w-28 rounded-md border border-gray-300 py-1.5 px-2 text-sm text-center font-bold text-gray-900 focus:outline-none focus:border-cyan-500 ${noSpinnersClass}`} />
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, taxiCost: (prev.taxiCost || 0) + 10000 } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Plus className="h-4 w-4" /></button>
                          <span className="text-sm font-bold text-gray-700 ml-1">₫</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Attraction Tickets */}
                {editingActivity.type === "attraction" && (
                  <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm">
                    <h5 className="text-sm font-bold text-gray-900 mb-3">Vé vào cổng</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 font-semibold">Vé người lớn:</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, adultPrice: Math.max(0, (prev.adultPrice || 0) - 10000) } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Minus className="h-4 w-4" /></button>
                          <input type="number" min="0" step="10000" value={editingActivity.adultPrice || 0} onChange={(e) => setEditingActivity((prev: Activity | null) => prev ? { ...prev, adultPrice: Math.max(0, parseInt(e.target.value) || 0) } : prev)} className={`w-28 rounded-md border border-gray-300 py-1.5 px-2 text-sm text-center font-bold text-gray-900 focus:outline-none focus:border-cyan-500 ${noSpinnersClass}`} />
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, adultPrice: (prev.adultPrice || 0) + 10000 } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Plus className="h-4 w-4" /></button>
                          <span className="text-sm font-bold text-gray-700 ml-1">₫</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 font-semibold">Vé trẻ em:</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, childPrice: Math.max(0, (prev.childPrice || 0) - 10000) } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Minus className="h-4 w-4" /></button>
                          <input type="number" min="0" step="10000" value={editingActivity.childPrice || 0} onChange={(e) => setEditingActivity((prev: Activity | null) => prev ? { ...prev, childPrice: Math.max(0, parseInt(e.target.value) || 0) } : prev)} className={`w-28 rounded-md border border-gray-300 py-1.5 px-2 text-sm text-center font-bold text-gray-900 focus:outline-none focus:border-cyan-500 ${noSpinnersClass}`} />
                          <button onClick={() => setEditingActivity((prev: Activity | null) => prev ? { ...prev, childPrice: (prev.childPrice || 0) + 10000 } : prev)} className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"><Plus className="h-4 w-4" /></button>
                          <span className="text-sm font-bold text-gray-700 ml-1">₫</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extra Expenses List */}
                {editingActivity.extraExpenses && editingActivity.extraExpenses.length > 0 && (
                  <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm">
                    <h5 className="text-sm font-bold text-gray-900 mb-3">Chi tiêu khác</h5>
                    <div className="space-y-2">
                      {editingActivity.extraExpenses.map((expense: ExtraExpense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm font-semibold text-gray-700">{expense.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(expense.amount)}</span>
                            <button onClick={() => handleRemoveExtraExpense(expense.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 h-7 w-7 rounded-md flex items-center justify-center transition-colors"><X className="h-4 w-4"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Extra Expense Form */}
                {showActivityExpenseForm ? (
                  <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-sm font-bold text-emerald-900">Thêm chi tiêu</h5>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            if (activityExpenseDraft.amount <= 0) {
                              setExpenseSubmitAttempted(true);
                              return;
                            }
                            currentNextId++; 
                            setEditingActivity((prev: Activity | null) => prev ? { 
                              ...prev, 
                              extraExpenses: [...(prev.extraExpenses || []), { 
                                id: currentNextId, 
                                name: activityExpenseDraft.name || "Chi tiêu khác", 
                                amount: activityExpenseDraft.amount, 
                                category: activityExpenseDraft.category 
                              }] 
                            } : prev); 
                            setShowActivityExpenseForm(false); 
                            setActivityExpenseDraft({ name: "Chi tiêu khác", amount: 0, category: "food" });
                            setExpenseSubmitAttempted(false);
                          }} 
                          className="bg-emerald-600 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="h-4 w-4"/>
                        </button>
                        <button onClick={() => setShowActivityExpenseForm(false)} className="bg-white border border-gray-300 text-gray-600 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"><X className="h-4 w-4"/></button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={activityExpenseDraft.name} 
                        onChange={(e) => setActivityExpenseDraft(prev => ({ ...prev, name: e.target.value }))} 
                        className="w-full text-sm font-semibold text-gray-900 p-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white" 
                      />
                      <div className="grid grid-cols-[1fr,1.5fr] gap-3">
                        <select 
                          value={activityExpenseDraft.category} 
                          onChange={(e) => setActivityExpenseDraft(prev => ({ ...prev, category: e.target.value as any }))} 
                          className="w-full text-sm font-semibold text-gray-700 p-2.5 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="food">Ăn uống</option>
                          <option value="attraction">Tham quan</option>
                          <option value="entertainment">Giải trí</option>
                          <option value="transportation">Di chuyển</option>
                          <option value="shopping">Mua sắm</option>
                        </select>
                        <div className="relative flex items-center gap-1">
                          <button onClick={() => {
                            setActivityExpenseDraft(prev => ({ ...prev, amount: Math.max(0, prev.amount - 10000) }));
                            if(activityExpenseDraft.amount - 10000 > 0) setExpenseSubmitAttempted(false);
                          }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-emerald-200 text-gray-600 hover:bg-gray-50 transition-colors"><Minus className="h-4 w-4" /></button>
                          <div className="relative flex-1">
                            <input 
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={activityExpenseDraft.amount === 0 ? "" : activityExpenseDraft.amount} 
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setActivityExpenseDraft(prev => ({ ...prev, amount: val }));
                                if(val > 0) setExpenseSubmitAttempted(false);
                              }} 
                              className={`w-full text-sm font-bold text-gray-900 p-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:border-emerald-500 text-center ${noSpinnersClass}`} 
                            />
                          </div>
                          <button onClick={() => {
                            setActivityExpenseDraft(prev => ({ ...prev, amount: prev.amount + 10000 }));
                            setExpenseSubmitAttempted(false);
                          }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-emerald-200 text-gray-600 hover:bg-gray-50 transition-colors"><Plus className="h-4 w-4" /></button>
                        </div>
                      </div>
                      
                      {expenseSubmitAttempted && activityExpenseDraft.amount <= 0 && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Bạn chưa nhập số tiền</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleOpenExpenseForm} className="w-full text-sm font-bold text-emerald-700 border-2 border-dashed border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-400 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4"/> Thêm chi tiêu khác
                  </button>
                )}
                
                {/* Total Cost Banner */}
                <div className="pt-4 border-t-2 border-emerald-200/60 flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Tổng chi phí hoạt động:</span>
                  <span className="text-xl font-black text-emerald-700">{formatCurrency(calculateActivityCost(editingActivity))}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mô tả thêm</label>
            <div className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-700 text-sm leading-relaxed min-h-[80px]">{editingActivity.description || "Không có mô tả"}</div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-[1] rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 py-3.5 font-bold text-gray-700 transition-colors">Hủy thay đổi</button>
          <button 
            onClick={onSave} 
            disabled={timeConflictWarning.hasConflict} 
            className="flex-[2] rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Check className="h-5 w-5" /> Xác nhận lưu
          </button>
        </div>
      </div>
    </div>
  );
}