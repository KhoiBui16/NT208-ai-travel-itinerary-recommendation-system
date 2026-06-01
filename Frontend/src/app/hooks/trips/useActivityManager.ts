/**
 * useActivityManager — Hook quản lý hoạt động trong ngày
 *
 * Cung cấp toàn bộ CRUD + UI logic cho activities:
 *   • Drag & Drop       — Kéo thả sắp xếp lại thứ tự activities
 *   • Activity CRUD     — Thêm, sửa, xóa hoạt động (optimistic UI + API sync)
 *   • Time conflict     — Kiểm tra xung đột thời gian giữa activities
 *   • Extra Expenses    — CRUD chi phí phát sinh cấp activity
 *   • Day Extra Expenses — CRUD chi phí phát sinh cấp ngày
 *
 * Pattern: Optimistic UI update → API call → Revert on failure
 */

import { useState } from "react";
import { toast } from "sonner";
import { Day, Activity, TimeConflictWarning, ExtraExpense, DayExtraExpense } from "../../types/trip.types";
import { parseTimeToMinutes, recalculateActivityTimes, resolveTimeConflicts } from "../../utils/timeHelpers";
import * as itineraryService from "../../services/itinerary";

export const useActivityManager = (
  days: Day[],
  setDays: React.Dispatch<React.SetStateAction<Day[]>>,
  selectedDayId: number,
  tripId: number | null
) => {

  // ===================================================================
  // State
  // ===================================================================

  // Drag & Drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Activity detail/edit state
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [originalEditingActivity, setOriginalEditingActivity] = useState<Activity | null>(null);

  // Time conflict warning state
  const [timeConflictWarning, setTimeConflictWarning] = useState<TimeConflictWarning>({ hasConflict: false });

  // Place info modal state
  const [viewingPlaceInfo, setViewingPlaceInfo] = useState<any | null>(null);

  /** Tạo ID tạm thời cho entities mới (trước khi BE assign ID) */
  const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

  // ===================================================================
  // 1. Drag & Drop — Kéo thả sắp xếp activities
  // ===================================================================

  /** Bắt đầu kéo activity tại index */
  const handleDragStart = (idx: number) => setDraggedIdx(idx);

  /** Activity đang được kéo qua vị trí index */
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  /** Thả activity vào vị trí mới → sắp xếp lại + recalculate times */
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
        // Recalculate thời gian sau khi sắp xếp lại
        const recalculated = recalculateActivityTimes(acts);
        return { ...day, activities: recalculated };
      })
    );
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  /** Kết thúc drag (cleanup state) */
  const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

  // ===================================================================
  // 2. Activity CRUD — Thêm, sửa, xóa hoạt động
  // ===================================================================

  /** Xóa activity — Optimistic UI + API call + revert on failure */
  const handleDeleteActivity = (actId: number) => {
    // Giữ bản copy để revert nếu API fail
    const day = days.find(d => d.id === selectedDayId);
    const deletedAct = day?.activities.find(a => a.id === actId);

    // Optimistic UI update — xóa ngay trên UI
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== selectedDayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== actId) }
      )
    );

    // API call — nếu có tripId thì gọi BE
    if (tripId) {
      itineraryService.deleteActivity(tripId, actId).catch(() => {
        // Revert on failure — thêm lại activity đã xóa
        if (deletedAct) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) =>
              day.id !== selectedDayId ? day : { ...day, activities: [...day.activities, deletedAct] }
            )
          );
        }
      });
    }
  };

  /** Mở modal xem/sửa chi tiết activity */
  const handleViewDetails = (act: Activity) => {
    setDetailActivity(act);
    const activityCopy = { ...act, extraExpenses: act.extraExpenses || [] };
    setEditingActivity(activityCopy);
    setOriginalEditingActivity(activityCopy);
    setTimeConflictWarning({ hasConflict: false });
  };

  /** Kiểm tra xung đột thời gian với các activities khác trong cùng ngày */
  const checkTimeConflict = (activity: Activity): TimeConflictWarning => {
    if (!activity.time || !activity.endTime) return { hasConflict: false };
    const currentDay = days.find(d => d.id === selectedDayId);
    if (!currentDay) return { hasConflict: false };

    const editStart = parseTimeToMinutes(activity.time);
    const editEnd = parseTimeToMinutes(activity.endTime);

    // So sánh với từng activity khác trong cùng ngày
    for (const otherAct of currentDay.activities) {
      if (otherAct.id === activity.id) continue;       // Bỏ qua chính nó
      if (!otherAct.time || !otherAct.endTime) continue;
      const otherStart = parseTimeToMinutes(otherAct.time);
      const otherEnd = parseTimeToMinutes(otherAct.endTime);

      // Kiểm tra overlap: start < otherEnd && end > otherStart
      if (editStart < otherEnd && editEnd > otherStart) {
        return { hasConflict: true, conflictWith: otherAct };
      }
    }
    return { hasConflict: false };
  };

  /** Lưu chỉnh sửa activity — kiểm tra conflict → optimistic update → API call */
  const handleSaveActivityDetails = () => {
    if (!editingActivity) return;

    // Kiểm tra xung đột thời gian trước khi lưu
    const conflictCheck = checkTimeConflict(editingActivity);
    if (conflictCheck.hasConflict) {
      toast.error("Địa điểm này đang có xung đột về thời gian, vui lòng kiểm tra lại!", { position: "top-right", duration: 5000 });
      return;
    }

    const original = originalEditingActivity;

    // Optimistic UI update
    setDays((prev: Day[]) =>
      prev.map((day: Day) => {
        if (day.id !== selectedDayId) return day;
        const updatedActivities = day.activities.map((a: Activity) => a.id === editingActivity.id ? editingActivity : a);
        return { ...day, activities: updatedActivities };
      })
    );
    // Đóng modal
    setDetailActivity(null);
    setEditingActivity(null);
    setOriginalEditingActivity(null);
    setTimeConflictWarning({ hasConflict: false });

    // API call — nếu có tripId
    if (tripId) {
      itineraryService.updateActivity(tripId, editingActivity.id, {
        id: editingActivity.id,
        time: editingActivity.time,
        endTime: editingActivity.endTime || "",
        name: editingActivity.name,
        location: editingActivity.location,
        description: editingActivity.description,
        type: editingActivity.type,
        image: editingActivity.image,
        transportation: editingActivity.transportation,
        adultPrice: editingActivity.adultPrice,
        childPrice: editingActivity.childPrice,
        customCost: editingActivity.customCost,
        taxiCost: editingActivity.taxiCost,
        extraExpenses: editingActivity.extraExpenses,
      }).catch(() => {
        // Revert on failure — khôi phục activity gốc
        if (original) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) => {
              if (day.id !== selectedDayId) return day;
              const revertedActivities = day.activities.map((a: Activity) => a.id === original.id ? original : a);
              return { ...day, activities: revertedActivities };
            })
          );
        }
      });
    }
  };

  /** Thêm activity vào ngày — optimistic UI + API sync + ID update */
  const addActivityToDay = (dayId: number, activity: Activity): Activity => {
    // Optimistic UI update — thêm ngay + resolve xung đột thời gian
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== dayId ? day : { ...day, activities: resolveTimeConflicts([...day.activities, activity]) }
      )
    );

    // API call — nếu có tripId
    if (tripId) {
      itineraryService.addActivity(tripId, dayId, {
        time: activity.time,
        endTime: activity.endTime || "",
        name: activity.name,
        location: activity.location,
        description: activity.description,
        type: activity.type,
        image: activity.image,
        transportation: activity.transportation,
        adultPrice: activity.adultPrice,
        childPrice: activity.childPrice,
        customCost: activity.customCost,
        taxiCost: activity.taxiCost,
        extraExpenses: activity.extraExpenses,
      }).then((resp) => {
        // Cập nhật ID từ BE (thay ID tạm bằng ID thật từ DB)
        if (resp.id && resp.id !== activity.id) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) =>
              day.id !== dayId ? day : {
                ...day,
                activities: day.activities.map((a: Activity) => a.id === activity.id ? { ...a, id: resp.id! } : a)
              }
            )
          );
        }
      }).catch(() => {
        // Revert on failure — xóa activity vừa thêm
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== dayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== activity.id) }
          )
        );
      });
    }

    return activity;
  };

  // ===================================================================
  // 3. Extra Expenses — Chi phí phát sinh cấp activity
  // ===================================================================

  /** Thêm chi phí phát sinh mới vào activity đang edit */
  const handleAddExtraExpense = () => {
    if (!editingActivity) return;
    const newExpense: ExtraExpense = { id: generateId(), name: "Chi tiêu khác", amount: 0, category: "food" };
    setEditingActivity((prev: Activity | null) => prev ? { ...prev, extraExpenses: [...(prev.extraExpenses || []), newExpense] } : prev);
  };

  /** Cập nhật field của chi phí phát sinh */
  const handleUpdateExtraExpense = (expenseId: number, field: 'name' | 'amount' | 'category', value: string | number) => {
    if (!editingActivity) return;
    setEditingActivity((prev: Activity | null) => prev ? {
      ...prev,
      extraExpenses: (prev.extraExpenses || []).map((exp: ExtraExpense) => exp.id === expenseId ? { ...exp, [field]: value } : exp)
    } : prev);
  };

  /** Xóa chi phí phát sinh */
  const handleRemoveExtraExpense = (expenseId: number) => {
    if (!editingActivity) return;
    setEditingActivity((prev: Activity | null) => prev ? {
      ...prev, extraExpenses: (prev.extraExpenses || []).filter((exp: ExtraExpense) => exp.id !== expenseId)
    } : prev);
  };

  // ===================================================================
  // 4. Day Extra Expenses — Chi phí phát sinh cấp ngày
  // ===================================================================

  /** Thêm chi phí phát sinh cấp ngày (từ sidebar) */
  const handleAddDayExtraExpenseFromSidebar = (expenseData: { name: string; amount: number; category: any }) => {
    const newExpense: DayExtraExpense = { id: generateId(), ...expenseData };
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: [...(day.extraExpenses || []), newExpense]
    }));
  };

  /** Thêm chi phí phát sinh cấp ngày (mặc định) */
  const handleAddDayExtraExpense = () => {
    const newExpense: DayExtraExpense = { id: generateId(), name: "Chi tiêu khác", amount: 0, category: "food" };
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: [...(day.extraExpenses || []), newExpense]
    }));
  };

  /** Cập nhật field của chi phí phát sinh cấp ngày */
  const handleUpdateDayExtraExpense = (expenseId: number, field: 'name' | 'amount' | 'category', value: string | number) => {
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: (day.extraExpenses || []).map((exp: DayExtraExpense) => exp.id === expenseId ? { ...exp, [field]: value } : exp)
    }));
  };

  /** Xóa chi phí phát sinh cấp ngày */
  const handleRemoveDayExtraExpense = (expenseId: number) => {
    setDays((prev: Day[]) => prev.map((day: Day) => day.id !== selectedDayId ? day : {
      ...day, extraExpenses: (day.extraExpenses || []).filter((exp: DayExtraExpense) => exp.id !== expenseId)
    }));
  };

  // ===================================================================
  // Return — Export tất cả state và handlers
  // ===================================================================

  return {
    // State
    draggedIdx, dragOverIdx, detailActivity, editingActivity, originalEditingActivity, timeConflictWarning, viewingPlaceInfo,
    // State setters
    setDetailActivity, setEditingActivity, setOriginalEditingActivity, setTimeConflictWarning, setViewingPlaceInfo,
    // Drag & Drop handlers
    handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    // Activity CRUD handlers
    handleDeleteActivity, handleViewDetails, checkTimeConflict, handleSaveActivityDetails,
    addActivityToDay,
    // Extra expense handlers (activity-level)
    handleAddExtraExpense, handleUpdateExtraExpense, handleRemoveExtraExpense,
    // Extra expense handlers (day-level)
    handleAddDayExtraExpense, handleAddDayExtraExpenseFromSidebar, handleUpdateDayExtraExpense, handleRemoveDayExtraExpense
  };
};
