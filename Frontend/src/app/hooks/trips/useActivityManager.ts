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
    // Keep a copy for revert
    const day = days.find(d => d.id === selectedDayId);
    const deletedAct = day?.activities.find(a => a.id === actId);

    // Optimistic UI update
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== selectedDayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== actId) }
      )
    );

    // Fire API call if tripId exists
    if (tripId) {
      itineraryService.deleteActivity(tripId, actId).catch(() => {
        // Revert on failure
        if (deletedAct) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) =>
              day.id !== selectedDayId ? day : { ...day, activities: [...day.activities, deletedAct] }
            )
          );
        }
        toast.error("Không thể xóa hoạt động. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    }
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

    const original = originalEditingActivity;

    // Optimistic UI update
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

    // Fire API call if tripId exists
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
        // Revert on failure
        if (original) {
          setDays((prev: Day[]) =>
            prev.map((day: Day) => {
              if (day.id !== selectedDayId) return day;
              const revertedActivities = day.activities.map((a: Activity) => a.id === original.id ? original : a);
              return { ...day, activities: revertedActivities };
            })
          );
        }
        toast.error("Không thể cập nhật hoạt động. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    }
  };

  /** Add an activity and sync to API if tripId exists. Returns the activity with its ID. */
  const addActivityToDay = (dayId: number, activity: Activity): Activity => {
    // Optimistic UI update with conflict resolution
    setDays((prev: Day[]) =>
      prev.map((day: Day) =>
        day.id !== dayId ? day : { ...day, activities: resolveTimeConflicts([...day.activities, activity]) }
      )
    );

    // Fire API call if tripId exists
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
        // Update local state with BE-assigned ID
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
        // Remove on failure
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== dayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== activity.id) }
          )
        );
        toast.error("Không thể thêm hoạt động. Vui lòng thử lại sau.", {
          position: "top-right",
          duration: 4000,
        });
      });
    }

    return activity;
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
    addActivityToDay,
    handleAddExtraExpense, handleUpdateExtraExpense, handleRemoveExtraExpense,
    handleAddDayExtraExpense, handleAddDayExtraExpenseFromSidebar, handleUpdateDayExtraExpense, handleRemoveDayExtraExpense
  };
};
