import { useState } from "react";
import { toast } from "sonner";
import { Day, Activity, TimeConflictWarning, ExtraExpense, DayExtraExpense } from "../../types/trip.types";
import { parseTimeToMinutes, recalculateActivityTimes } from "../../utils/timeHelpers";

export const useActivityManager = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  selectedDayId: number
) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [originalEditingActivity, setOriginalEditingActivity] = useState<Activity | null>(null);
  const [timeConflictWarning, setTimeConflictWarning] = useState<TimeConflictWarning>({ hasConflict: false });
  const [viewingPlaceInfo, setViewingPlaceInfo] = useState<any | null>(null);

  const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    setDays((prev: Day[]) =>
      prev.map((day: Day) => {
        if (day.id !== selectedDayId) return day;
        const acts = [...day.activities];
        const [moved] = acts.splice(draggedIdx, 1);
        acts.splice(targetIdx, 0, moved);
        const recalculated = recalculateActivityTimes(acts);
        return { ...day, activities: recalculated };
      })
    );
    setDraggedIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

  const handleDeleteActivity = (actId: number) => {
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== selectedDayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== actId) }
      )
    );
  };

  const handleViewDetails = (act: Activity) => {
    setDetailActivity(act);
    const activityCopy = { ...act, extraExpenses: act.extraExpenses || [] };
    setEditingActivity(activityCopy);
    setOriginalEditingActivity(activityCopy);
    setTimeConflictWarning({ hasConflict: false });
  };

  const checkTimeConflict = (activity: Activity): TimeConflictWarning => {
    if (!activity.time || !activity.endTime) return { hasConflict: false };
    const currentDay = days.find(d => d.id === selectedDayId);
    if (!currentDay) return { hasConflict: false };
    
    const editStart = parseTimeToMinutes(activity.time);
    const editEnd = parseTimeToMinutes(activity.endTime);
    
    for (const otherAct of currentDay.activities) {
      if (otherAct.id === activity.id) continue;
      if (!otherAct.time || !otherAct.endTime) continue;
      const otherStart = parseTimeToMinutes(otherAct.time);
      const otherEnd = parseTimeToMinutes(otherAct.endTime);
      
      if (editStart < otherEnd && editEnd > otherStart) {
        return { hasConflict: true, conflictWith: otherAct };
      }
    }
    return { hasConflict: false };
  };

  const handleSaveActivityDetails = () => {
    if (!editingActivity) return;
    const conflictCheck = checkTimeConflict(editingActivity);
    if (conflictCheck.hasConflict) {
      toast.error("Địa điểm này đang có xung đột về thời gian, vui lòng kiểm tra lại!", { position: "top-right", duration: 5000 });
      return;
    }
    setDays((prev: Day[]) =>
      prev.map((day: Day) => {
        if (day.id !== selectedDayId) return day;
        const updatedActivities = day.activities.map((a: Activity) => a.id === editingActivity.id ? editingActivity : a);
        return { ...day, activities: updatedActivities };
      })
    );
    setDetailActivity(null);
    setEditingActivity(null);
    setOriginalEditingActivity(null);
    setTimeConflictWarning({ hasConflict: false });
  };

  const handleAddExtraExpense = () => {
    if (!editingActivity) return;
    const newExpense: ExtraExpense = { id: generateId(), name: "Chi tiêu khác", amount: 0, category: "food" };
    setEditingActivity((prev: Activity | null) => prev ? { ...prev, extraExpenses: [...(prev.extraExpenses || []), newExpense] } : prev);
  };

  const handleUpdateExtraExpense = (expenseId: number, field: 'name' | 'amount' | 'category', value: string | number) => {
    if (!editingActivity) return;
    setEditingActivity((prev: Activity | null) => prev ? {
      ...prev,
      extraExpenses: (prev.extraExpenses || []).map((exp: ExtraExpense) => exp.id === expenseId ? { ...exp, [field]: value } : exp)
    } : prev);
  };

  const handleRemoveExtraExpense = (expenseId: number) => {
    if (!editingActivity) return;
    setEditingActivity((prev: Activity | null) => prev ? {
      ...prev, extraExpenses: (prev.extraExpenses || []).filter((exp: ExtraExpense) => exp.id !== expenseId)
    } : prev);
  };

  const handleAddDayExtraExpenseFromSidebar = (expenseData: { name: string; amount: number; category: any }) => {
    const newExpense: DayExtraExpense = { id: generateId(), ...expenseData };
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: [...(day.extraExpenses || []), newExpense]
    }));
  };

  const handleAddDayExtraExpense = () => {
    const newExpense: DayExtraExpense = { id: generateId(), name: "Chi tiêu khác", amount: 0, category: "food" };
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: [...(day.extraExpenses || []), newExpense]
    }));
  };

  const handleUpdateDayExtraExpense = (expenseId: number, field: 'name' | 'amount' | 'category', value: string | number) => {
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: (day.extraExpenses || []).map((exp: DayExtraExpense) => exp.id === expenseId ? { ...exp, [field]: value } : exp)
    }));
  };

  const handleRemoveDayExtraExpense = (expenseId: number) => {
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: (day.extraExpenses || []).filter((exp: DayExtraExpense) => exp.id !== expenseId)
    }));
  };

  return {
    draggedIdx, dragOverIdx, detailActivity, editingActivity, originalEditingActivity, timeConflictWarning, viewingPlaceInfo,
    setDetailActivity, setEditingActivity, setOriginalEditingActivity, setTimeConflictWarning, setViewingPlaceInfo,
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleDeleteActivity, handleViewDetails, checkTimeConflict, handleSaveActivityDetails,
    handleAddExtraExpense, handleUpdateExtraExpense, handleRemoveExtraExpense,
    handleAddDayExtraExpense, handleAddDayExtraExpenseFromSidebar, handleUpdateDayExtraExpense, handleRemoveDayExtraExpense
  };
};