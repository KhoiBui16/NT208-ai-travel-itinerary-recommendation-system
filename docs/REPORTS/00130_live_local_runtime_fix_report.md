# Báo cáo Task 00130 — Live local runtime fix

## 1. Branch / scope

- Branch: `fix/00130-c-live-runtime-local-bugfix`
- Scope của pass này: ưu tiên fix runtime FE logic có thể tái hiện local và ảnh hưởng trực tiếp tới end-user flow.
- Không đụng backend product code trong pass này.

## 2. Các lỗi đã tái hiện và đã fix

### F1. `TripWorkspace` -> `DailyItinerary` mất context `tripId`

- Nguồn lỗi: [Frontend/src/app/pages/TripWorkspace.tsx](../../Frontend/src/app/pages/TripWorkspace.tsx)
- Triệu chứng:
  - bấm `Tạo lịch trình` từ workspace có thể rơi sang `/daily-itinerary` mà mất `tripId`
  - màn hình theo ngày không còn giữ được ngữ cảnh itinerary đang mở
- Fix:
  - giữ `tripId` trên query string khi điều hướng sang `/daily-itinerary`

### F2. `PlaceSelectionModal` vẫn dùng mock data nên city/place flow sai thực tế

- Nguồn lỗi: [Frontend/src/app/components/PlaceSelectionModal.tsx](../../Frontend/src/app/components/PlaceSelectionModal.tsx)
- Triệu chứng:
  - modal thêm địa điểm không bám destination hiện tại
  - dữ liệu city/place lấy từ mock thay vì API thật
  - dễ dẫn tới tình huống “đang ở Vũng Tàu nhưng modal hiện thành phố khác”
- Fix:
  - bỏ flow mock-backed
  - tải destination list và destination detail từ API `/api/v1/places/destinations/*`
  - map `PlaceResponse` sang `Place` FE type
  - thêm loading / error / empty states
  - sửa bug compile do dùng nhầm `CATEGORIES` thay vì `CATEGORY_OPTIONS`

### F3. `DailyItinerary` vẫn render gợi ý mock và share CTA gây hiểu nhầm

- Nguồn lỗi: [Frontend/src/app/pages/DailyItinerary.tsx](../../Frontend/src/app/pages/DailyItinerary.tsx)
- Triệu chứng:
  - cột `Gợi ý` không dựa trên API thật
  - link quay lại workspace không giữ `tripId`
  - dialog share ở màn hình theo ngày khiến user tưởng đây là nơi tạo share link chuẩn
- Fix:
  - tải gợi ý theo `selectedDay.destinationName` từ API thật
  - giữ `tripId` khi quay lại workspace
  - đổi copy của share dialog để nói đúng contract hiện tại
  - placeholder `Bản đồ` được ghi rõ là placeholder, không giả làm map tích hợp

### F4. `Nơi ở` dùng state accommodation không nhất quán -> edit/replace dễ sai

- Nguồn lỗi:
  - [Frontend/src/app/hooks/trips/useAccommodation.ts](../../Frontend/src/app/hooks/trips/useAccommodation.ts)
  - [Frontend/src/app/utils/tripResponseMapper.ts](../../Frontend/src/app/utils/tripResponseMapper.ts)
  - [Frontend/src/app/hooks/trips/useTripSync.ts](../../Frontend/src/app/hooks/trips/useTripSync.ts)
  - [Frontend/src/app/types/trip.types.ts](../../Frontend/src/app/types/trip.types.ts)
- Triệu chứng:
  - `Thay đổi thiết lập` có thể dẫn tới state nơi ở sai hoặc append thêm record chồng nhau
  - state accommodation lúc load từ server bị nhân bản theo từng `dayId`
  - save payload có nguy cơ gửi duplicated accommodations
- Fix:
  - thêm `Accommodation.id` vào FE type
  - normalize accommodation record để mỗi booking chỉ xuất hiện một lần
  - load từ server không còn fan-out một accommodation thành nhiều key theo `dayId`
  - khi confirm nơi ở mới:
    - remove các accommodation đang overlap cùng `dayIds`
    - xóa record cũ trên API trước khi add mới nếu trip đã persist
    - revert toàn bộ state nếu API fail

### F5. Tổng chi phí accommodation bị đếm lặp

- Nguồn lỗi: [Frontend/src/app/hooks/useTripCost.ts](../../Frontend/src/app/hooks/useTripCost.ts)
- Triệu chứng:
  - `calculateTotalCostByCategory()` cộng accommodation hai lần
  - duplicated accommodation records từ state cũ càng làm tổng chi phí phình thêm
- Fix:
  - dedupe accommodations trước khi tính
  - bỏ vòng cộng accommodation lặp ở cuối `calculateTotalCostByCategory()`
  - đổi fallback `duration || ...` sang `duration ?? ...`

### F6. `TripHistory` dùng `budget` thay vì `totalCost`

- Nguồn lỗi: [Frontend/src/app/pages/TripHistory.tsx](../../Frontend/src/app/pages/TripHistory.tsx)
- Triệu chứng:
  - thẻ lịch trình có thể hiển thị số tiền sai nghĩa business
- Fix:
  - ưu tiên `trip.totalCost`, fallback sang `trip.budget`

### F7. Guest close modal gây `401` console noise

- Nguồn lỗi: [Frontend/src/app/pages/TripWorkspace.tsx](../../Frontend/src/app/pages/TripWorkspace.tsx)
- Triệu chứng:
  - guest đóng modal/place panel vẫn gọi `GET /api/v1/places/saved/list`
  - browser console báo `401 Unauthorized`
- Fix:
  - chặn resync bookmark khi guest chưa đăng nhập

## 3. Verify local đã chạy

### FE build

```powershell
Set-Location <repo-root>\Frontend
npm run build -- --outDir .build-tmp\00130-fix
npm run build -- --outDir .build-tmp\00130-fix-final
```

Kết quả:

- build pass 2 lần
- vẫn còn chunk-size warning (`~1.2 MB` JS bundle), không phải blocker của fix này

### BE checks

```powershell
Set-Location <repo-root>\Backend
uv run ruff check src tests
uv run alembic check
```

Kết quả:

- `ruff` pass
- `alembic check` pass
- có warning `.ruff_cache` access denied trên Windows, không chặn verify

### Browser smoke local

Đã chạy smoke Playwright local với sessionStorage seed, không cần auth:

- mở `/trip-workspace`
- vào tab `Nơi ở`
- chọn hotel
- confirm nơi ở
- bấm `Thay đổi thiết lập`
- mở `PlaceSelectionModal`
- mở `/daily-itinerary`

Kết quả cuối:

- flow pass
- `consoleErrors: []`
- `failedResponses: []`

### Visual evidence mới

- `.codex-run-logs/00130-workspace-initial.png`
- `.codex-run-logs/00130-accommodation-list.png`
- `.codex-run-logs/00130-accommodation-saved.png`
- `.codex-run-logs/00130-accommodation-edit.png`
- `.codex-run-logs/00130-place-modal-live.png`
- `.codex-run-logs/00130-daily-itinerary.png`

## 4. Những gì report này CHƯA claim là xong

Pass fix này **không** giải quyết các hạng mục sau:

- contamination data trong local/Render DB
- auth UX messaging chi tiết cho login/register/forgot-password
- AI chat apply-patch semantics / identifier UX
- AI-generated activity cost `0đ` hoặc budget logic business phía AI/backend
- map integration thật từ Goong
- docs sync toàn repo

## 5. Kết luận kỹ thuật

- Slice fix FE runtime hiện tại đã đủ sạch để mở PR riêng.
- Các lỗi logic vừa sửa đã được tái hiện local và verify lại bằng build + browser smoke.
- Data contamination vẫn là vấn đề riêng, không được che bằng FE patch này.
