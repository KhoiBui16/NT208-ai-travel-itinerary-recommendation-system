import { Activity } from "../types/trip.types";

export const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

export const getActivityDurationMinutes = (act: Activity): number => {
  if (act.time && act.endTime) {
    const diff = parseTimeToMinutes(act.endTime) - parseTimeToMinutes(act.time);
    return diff > 0 ? diff : 60; // default 1h if invalid
  }
  return 60;
};

export const recalculateActivityTimes = (activities: Activity[], startMinutes = 540): Activity[] => {
  let currentStart = startMinutes; // 09:00 = 540
  return activities.map(act => {
    const duration = getActivityDurationMinutes(act);
    const newStart = currentStart;
    const newEnd = currentStart + duration;
    currentStart = newEnd;
    return { ...act, time: minutesToTime(newStart), endTime: minutesToTime(newEnd) };
  });
};

export const resolveTimeConflicts = (activities: Activity[]): Activity[] => {
  if (activities.length <= 1) return activities;
  // Sort by start time
  const sorted = [...activities].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  // Resolve overlaps
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = parseTimeToMinutes(sorted[i - 1].endTime || sorted[i - 1].time);
    const currStart = parseTimeToMinutes(sorted[i].time);
    if (currStart < prevEnd) {
      const duration = getActivityDurationMinutes(sorted[i]);
      sorted[i] = { ...sorted[i], time: minutesToTime(prevEnd), endTime: minutesToTime(prevEnd + duration) };
    }
  }
  return sorted;
};