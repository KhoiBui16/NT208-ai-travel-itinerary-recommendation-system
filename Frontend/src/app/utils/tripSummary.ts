export type TripTimelineStatus = "upcoming" | "completed" | "planning";

/**
 * Tính số ngày theo khoảng ngày của chuyến đi.
 *
 * List API hiện chỉ trả summary và không kèm `days`, nên UI list cần suy ra
 * số ngày từ `startDate`/`endDate` để tránh hiển thị sai `0 ngày`.
 */
export function computeTripDurationDays(
  startDate?: string,
  endDate?: string,
): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay);
  return diffDays >= 0 ? diffDays + 1 : 0;
}

/**
 * Suy ra trạng thái hiển thị của chuyến đi theo timeline ngày.
 *
 * Đây chỉ là trạng thái trình bày cho list view hiện tại, chưa thay thế cho
 * business status thực ở backend.
 */
export function computeTripTimelineStatus(
  startDate?: string,
  endDate?: string,
): TripTimelineStatus {
  if (!startDate || !endDate) return "planning";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "planning";
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < today) return "completed";
  if (start <= today && today <= end) return "planning";
  return "upcoming";
}
