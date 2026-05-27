# Issue: C.2 FE UI Chưa Có — ActivityDetailModal Thiếu Nút Gợi Ý Thay Thế

**Ngày phát hiện:** 2026-05-27  
**Severity:** Medium  
**Status:** TO DO  
**Phase:** C.2

## Mô tả

Plan C.2 ghi: "FE có nút 'Gợi ý thay thế' trong `ActivityDetailModal.tsx` (chưa kết nối API)".

Thực tế: `ActivityDetailModal.tsx` **không có nút gợi ý thay thế**. Modal chỉ có:
- Edit form (time, transportation, cost)
- Extra expenses
- Description
- Save/Cancel buttons

Không có nút nào gọi `GET /api/v1/agent/suggest/{activity_id}`.

## Files liên quan

- `Frontend/src/app/components/ActivityDetailModal.tsx` — thiếu nút suggest
- `Frontend/src/app/components/companion/PlaceSuggestions.tsx` — vẫn là mock data
- `Frontend/src/app/services/` — thiếu `agent.ts` (API client cho agent endpoints)

## Impact

- EP-30 (`GET /agent/suggest/{activity_id}`) hoạt động đúng ở BE
- Nhưng user không thể trigger từ FE UI
- C.2 chỉ hoàn chỉnh ở BE, FE chưa có

## Cần làm

1. Thêm nút "Gợi ý thay thế" vào `ActivityDetailModal.tsx`
2. Tạo `Frontend/src/app/services/agent.ts` với `suggestAlternatives(activityId, limit)`
3. Hiển thị kết quả suggestions trong modal hoặc panel riêng
4. Kết nối `companion/PlaceSuggestions.tsx` với API thật

## Ghi chú

Việc này có thể làm trong branch C.3 (companion chat) vì `agent.ts` sẽ cần cho cả C.3 và C.2 FE.
