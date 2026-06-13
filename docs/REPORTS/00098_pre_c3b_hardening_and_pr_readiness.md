# 00098 Pre-C3B Hardening And PR Readiness

**Ngày:** 2026-06-13  
**Branch:** `fix/00098-d-code-clarity-hardening`  
**Scope:** Chốt lại các contract FE-BE còn drift trước khi tách phase `C3B`, đồng thời sync docs active theo current source truth.

## 1. Current truth của nhánh 00098

- `C3A` đã merge xong trên `main`; `00097` cũng đã merge (`PR #102`) để sync docs/browser truth sau C3A.
- `C3B` vẫn chưa được implement. Nhánh `00098` chỉ là hardening checkpoint cuối trước khi bắt đầu companion chat thật.
- Destination browse/detail hiện phải bám backend slug và backend detail payload, không được quay lại runtime mock hoặc local fallback làm source of truth.
- Trip list pages không được suy diễn sai duration/status từ `days[]` rỗng trong list API.

## 2. Các thay đổi chính đã chốt

### 2.1 Destination slug và CityDetail API-first

- Backend `DestinationResponse` đã trả thêm `slug`.
- Places service bổ sung slug ngay cả khi cache cũ chưa có field này.
- FE `CityList`, `Home`, `ManualTripSetup`, `CityDetail` dùng backend slug/backend detail làm truth chính.
- `CityDetail` vẫn render được các destination ngoài mock pack; mock chỉ còn là fallback hiển thị khi API detail thực sự thất bại.

### 2.2 Trip list truth thay vì suy diễn từ payload chưa hydrate

- Tạo `Frontend/src/app/utils/tripSummary.ts` để tính số ngày và timeline status từ các field thời gian thực tế.
- `TripHistory` và `TripLibrary` dùng helper này thay vì đọc trực tiếp `trip.days.length`.
- `TripLibrary` đổi thống kê gây hiểu lầm sang `Tổng số ngày` và ghi rõ activities sẽ load ở trang detail.

### 2.3 Sửa contract update/delete ở itinerary flow

- `ItineraryView` delete activity gọi đúng `deleteActivity(tripId, activityId)`.
- Bỏ luồng rewrite nguyên `days[]` payload bằng fake ids / forced `type`.
- `useAccommodation` sửa lại field giá phòng để dùng đúng `selectedHotel.price`.

### 2.4 Bỏ hardcoded dữ liệu giả gây nhiễu khi đọc UI

- `PlaceSelectionModal` không còn nhét `reviewCount`, `estimatedCost`, `openingHours` giả vào modal chi tiết.
- Một số thông báo FE đã được đổi sang copy trung tính hơn cho end-user khi backend data còn sparse.

### 2.5 Ổn định lại Playwright regression cũ

- `00060d-pre-c3a-floating-chat-context.spec.ts` không còn chờ `networkidle` ở `TripWorkspace`.
- Spec chuyển sang chờ `domcontentloaded` rồi assert UI marker ổn định, đúng hơn với thực tế workspace hiện có background requests.

## 3. Verify đã chạy

### Backend targeted tests

```powershell
Set-Location "<repo-root>\\Backend"
uv run pytest tests\\unit\\test_place_service.py tests\\unit\\test_auth_service.py tests\\integration\\test_place_endpoints.py -q --tb=short
```

Kết quả:

- `36 passed`
- `1 skipped`

### Frontend build

```powershell
Set-Location "<repo-root>\\Frontend"
npm run build
```

Kết quả:

- Build production pass.

### Full Playwright regression

```powershell
Set-Location "<repo-root>\\Frontend"
npx playwright test --reporter=list
```

Kết quả latest full run:

- `35` test cases trong `16` spec files
- `32 passed`
- `3 skipped`

### Browser smoke trên stack thật

Stack verify:

- Frontend `http://localhost:5173`
- Backend `http://localhost:8000`
- Postgres container `nt208-ai-travel-itinerary-recommendation-system-db-1`
- Redis container `nt208-ai-travel-itinerary-recommendation-system-redis-1`

Flow đã xác nhận:

- Login form submit thật, `POST /api/v1/auth/login` trả `200`.
- `/trip-history` hiển thị đúng `3 ngày`, không còn rơi vào `0 ngày`.
- `/trip-library` hiển thị đúng `3 ngày` và không còn ngụ ý sai rằng itinerary rỗng.
- `/itinerary/521` render activity thật `Pho co Ha Noi`.
- Browser console không có error mới.

Evidence nội bộ:

- `.codex-run-logs/00098-login-before-submit.png`
- `.codex-run-logs/00098-login-after-submit.png`
- `.codex-run-logs/00098-trip-history.png`
- `.codex-run-logs/00098-trip-library.png`
- `.codex-run-logs/00098-itinerary-521.png`
- `.codex-run-logs/playwright-00098.json`

## 4. Đánh giá readiness

**Kết luận:** `MERGEABLE_FOR_00098`

Nhánh này đủ ổn để merge như một checkpoint hardening trước `C3B` vì:

- FE browse/detail/trip list không còn lệch source of truth khỏi backend.
- Các flow browser quan trọng đã được verify trên FE + BE + DB + Redis thật.
- Full Playwright regression đang xanh ngoài `3` legacy skipped specs.

## 5. Những gì nhánh này chưa làm

- Chưa implement `C3B` companion messaging, `requiresConfirmation`, `proposedOperations`, hoặc chat quota riêng.
- Chưa làm sweep docstring/comment cho toàn repo; đây là một scope khác và nên tách branch riêng nếu muốn làm đầy đủ.
- Chưa mở rộng ETL/data coverage cho các destination sparse; nhánh này chỉ đảm bảo UI và API phản ánh đúng dữ liệu đang có.

## 6. Next step sau khi merge

1. Merge `00098`.
2. Tách branch feature riêng cho `C3B`.
3. Nếu cần, mở follow-up riêng cho repo-wide docstring/comment cleanup và naming audit.
