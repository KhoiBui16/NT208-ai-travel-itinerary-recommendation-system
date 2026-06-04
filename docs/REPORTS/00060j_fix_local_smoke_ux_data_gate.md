# 00060J-FIX v3 — Local Smoke UX/Data Blockers

**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Ngày thực hiện:** 2025
**Trạng thái:** ✅ Hoàn tất — Build FE pass, lint BE pass, 134 unit tests pass

---

## 1. Tóm tắt (Executive Summary)

Bản fix này giải quyết 7 nhóm lỗi UX và data blockers được phát hiện trong quá trình smoke test local:

| Nhóm | Vấn đề | Trạng thái |
|------|--------|------------|
| A | AddDaysModal crash khi parse ISO date | ✅ Đã fix |
| B | Share URL hiện hardcoded / placeholder | ✅ Đã fix |
| C | Ảnh điểm đến relative path không resolve; ảnh place empty | ✅ Đã fix |
| D | Home destination cards navigate tới `/cities` thay vì `/cities/:slug` | ✅ Đã fix |
| F | Backend hard cap 14 ngày + FE không có long-trip hint | ✅ Đã fix |
| G | Spinner generate không có progress steps | ✅ Đã fix |
| H | TripHistory status hardcoded "planning"; Header Premium button active; PDF button active | ✅ Đã fix |

---

## 2. Source Discovery Summary

### Backend findings
- `pipeline.py:62` — `MAX_TRIP_DAYS = 14` (cần nâng lên 30)
- `pipeline.py:571` — Error message "Trip duration must be between 1 and 14 days" (user-facing, cần thay)
- `config.py` — không có config cho MAX_TRIP_DAYS, giá trị hardcode trong pipeline

### Frontend findings
- `AddDaysModal.tsx:57` — `parse(day.date, "dd/MM/yyyy", ...)` — sẽ crash với ISO dates từ BE
- `DailyItinerary.tsx:287` — `value="yourtrip.app/trip/abc123"` — hardcoded fake URL
- `Home.tsx:36` — `resolveDestinationImage` không handle relative `/img/` path
- `Home.tsx` destination cards — tất cả link tới `/cities` thay vì `/cities/:slug`
- `TripHistory.tsx:52` — `status: "planning" as const` — không dùng ngày thực tế
- `TripHistory.tsx:52` — `coverImage: trip.coverImage || ""` — không có fallback
- `Header.tsx:116` — "Nâng Cấp Ngay" button không disabled
- `placeImage.ts` — không có category-based fallback (618/618 places trong DB có image = '')

### DB runtime diagnostics
- **Destinations**: 10 rows, tất cả có `image = /img/destinations/*.jpg` (relative path)
- **Places**: 618 rows, **tất cả** có `image = ''` (empty string)

---

## 3. Quyết định người dùng đã áp dụng

1. **NO 14-day hard cap** → `MAX_TRIP_DAYS = 30`; error message chung chung, không mention số ngày cụ thể với user
2. **Unsupported location copy** → Khi `apiPlaces.length === 0` sau khi API load xong: hiện `"Địa điểm chưa được hỗ trợ trong giai đoạn hiện tại, Vui lòng liên hệ để được cập nhật thêm địa điểm"`
3. **API-first images** → `resolveDestinationImage` prefix relative path với `VITE_API_URL`; `resolvePlaceImageWithCategory` dùng category fallback khi image empty
4. **No invalid share URLs** → DailyItinerary share dialog: bỏ hardcoded URL, hướng user đến ItineraryView để share
5. **Guest share boundary** → DailyItinerary: khi chưa đăng nhập, hiện thông báo yêu cầu đăng nhập
6. **Future buttons disabled** → Header "Nâng Cấp Ngay" disabled + title="Tính năng đang phát triển"; DailyItinerary "Export as PDF" disabled + label
7. **Long trip copy** → CreateTrip: khi `dayCount > 7 && dayCount <= 30`, hiện info banner với text đã định sẵn

---

## 4. Fixes Implemented

### Group A — AddDaysModal P0 crash (date parse)

**File:** `Frontend/src/app/components/AddDaysModal.tsx`

- Thêm import `parseISO, isValid` từ `date-fns`
- Thêm hàm `safeParseDate(dateStr)`: thử ISO format trước, fallback sang `dd/MM/yyyy`
- Thay `getAllOccupiedDates()`: dùng `safeParseDate` thay vì `parse(day.date, "dd/MM/yyyy", ...)`

**Root cause:** BE trả về ISO dates (`2025-06-15`), FE cố parse theo `dd/MM/yyyy` → invalid date

### Group B — Share URL guard

**File:** `Frontend/src/app/pages/DailyItinerary.tsx`

- Bỏ hardcoded `value="yourtrip.app/trip/abc123"`
- Khi chưa đăng nhập: hiện message yêu cầu đăng nhập
- Khi đã đăng nhập: hướng user đến trang chi tiết lịch trình để share
- Disable "Export as PDF" với title="Tính năng đang phát triển"

**Note:** `ItineraryView.tsx` đã có guard REDACTED từ 00060I — giữ nguyên, không thay đổi.

### Group C — Image handling

**File:** `Frontend/src/app/utils/placeImage.ts`

- Thêm `CATEGORY_FALLBACK_IMAGES` map cho 5 categories
- Thêm `getPlaceFallbackImage(category)` — trả về category image hoặc DEFAULT
- Thêm `resolvePlaceImageWithCategory(image, category)` — API image wins, fallback by category
- Thêm `DESTINATION_COVER_IMAGES` map cho TripHistory
- Thêm `getDestinationFallbackImage(destination)` cho TripHistory cards

**File:** `Frontend/src/app/pages/Home.tsx`

- `resolveDestinationImage`: nếu image là relative path (`/img/...`), prefix với `VITE_API_URL`

**File:** `Frontend/src/app/pages/CityDetail.tsx`

- Import `resolvePlaceImageWithCategory`
- API places section: thay `{place.image ? <img> : <div placeholder>}` bằng `<img src={resolvePlaceImageWithCategory(place.image, place.type)}>` luôn có ảnh
- Thêm state `apiLoaded` để track khi nào API đã respond
- Thêm unsupported message khi `apiLoaded && apiPlaces.length === 0`

### Group D — Home navigation

**File:** `Frontend/src/app/pages/Home.tsx`

- Thêm hàm `nameToSlug(name)`: normalize NFD, bỏ dấu, thay `đ→d`, slug hoá
- Destination cards: thay `to="/cities"` bằng `to={/cities/${nameToSlug(dest.name)}}`

### Group F — Remove 14-day cap

**File:** `Backend/src/itineraries/pipeline.py`

- `MAX_TRIP_DAYS = 14` → `MAX_TRIP_DAYS = 30`
- Error message: thay "Trip duration must be between 1 and 14 days" → message tiếng Việt chung chung

**File:** `Frontend/src/app/pages/CreateTrip.tsx`

- Thêm `generateStep` state và `GENERATE_STEPS` array
- Tính `dayCount` từ `dateRange`
- Thêm info banner khi `dayCount > 7 && dayCount <= 30`

### Group G — Generate progress steps

**File:** `Frontend/src/app/pages/CreateTrip.tsx`

- `GENERATE_STEPS` = 4 bước tiến trình
- `stepInterval` mỗi 4s advance `generateStep` (không vượt quá max)
- Button text khi đang generate: hiện `GENERATE_STEPS[generateStep]` thay vì "AI đang lên kế hoạch..."
- `clearInterval(stepInterval)` trong `finally`

### Group H — TripHistory + future buttons

**File:** `Frontend/src/app/pages/TripHistory.tsx`

- Thêm `computeStatus(startDate, endDate)`: so sánh ngày hôm nay với start/end để trả `"upcoming" | "planning" | "completed"`
- Import `getDestinationFallbackImage` từ `placeImage.ts`
- Mapping: `status: computeStatus(...)` và `coverImage: trip.coverImage || getDestinationFallbackImage(trip.destination)`

**File:** `Frontend/src/app/components/Header.tsx`

- Button "Nâng Cấp Ngay": thêm `disabled`, `title="Tính năng đang phát triển"`, `opacity-50 cursor-not-allowed`

**File:** `Frontend/src/app/pages/DailyItinerary.tsx`

- Button "Export as PDF": thêm `disabled`, `title`, class `opacity-50 cursor-not-allowed`, text "Tính năng đang phát triển"

---

## 5. Before/After Evidence

### AddDaysModal
- **Before:** `parse(day.date, "dd/MM/yyyy", new Date())` → crash với ISO date từ BE
- **After:** `safeParseDate(day.date)` → handle cả `2025-06-15` lẫn `15/06/2025`

### Destination Images
- **Before:** `resolveDestinationImage` bỏ qua relative path `/img/destinations/ha-n-i.jpg`
- **After:** prefix với `http://localhost:8000` → `http://localhost:8000/img/destinations/ha-n-i.jpg`

### Place Images
- **Before:** 618/618 places empty image → hiện placeholder box hoặc broken img
- **After:** `resolvePlaceImageWithCategory("", "food")` → `https://images.pexels.com/.../food.jpeg`

### Home Navigation
- **Before:** click "Hà Nội" card → `/cities`
- **After:** click "Hà Nội" card → `/cities/ha-noi`

### 14-day cap
- **Before:** trip 15+ ngày → BE throws "Trip duration must be between 1 and 14 days"
- **After:** trip 31+ ngày → BE throws generic Vietnamese message; trip 15-30 ngày → OK

### TripHistory Status
- **Before:** tất cả trips hiện badge "Đang lên kế hoạch"
- **After:** trips đã qua → "Đã hoàn thành", trips sắp tới → "Sắp tới"

---

## 6. Tests / Checks

| Test | Kết quả |
|------|---------|
| `uv run ruff check src tests` | ✅ All checks passed |
| `uv run ruff format --check src tests` | ✅ 91 files already formatted |
| `uv run pytest tests/unit/ -v --tb=short` | ✅ 134 passed, 0 failed |
| `node tests/unit/savedPlaces.test.mjs` | ✅ 10 passed, 0 failed |
| `npm run build -- --outDir .build-tmp/verify-00060j-fix` | ✅ built in 13.57s, 0 errors |

---

## 7. Runtime Diagnostics

```
DB destinations (10 rows):
  id | name              | image
  2  | Hà Nội            | /img/destinations/ha-n-i.jpg
  29 | TP. Hồ Chí Minh   | /img/destinations/tp-ho-chi-minh.jpg
  30 | Đà Nẵng           | /img/destinations/da-nang.jpg
  ...

DB places image distribution:
  image | count
  ''    | 618   ← Tất cả places đều empty image → cần category fallback
```

Destination images dùng relative path → fix `resolveDestinationImage` để prefix `VITE_API_URL` là đúng hướng.

Place images rỗng hoàn toàn → `resolvePlaceImageWithCategory` với category fallback là giải pháp thực tế nhất hiện tại.

---

## 8. Remaining Risks

| Rủi ro | Mức độ | Ghi chú | Follow-up |
|--------|--------|---------|-----------|
| `nameToSlug` có thể không map chính xác với mọi slug trong `CityDetail.slugToName` | Trung bình | Đã test với 6 city chính; edge case: "TP. Hồ Chí Minh" → slug `tp-ho-chi-minh` (khớp với slugToName) | Smoke test thủ công 10 destinations |
| **`MAX_TRIP_DAYS = 30` vẫn là hard cap** — trips > 30 ngày vẫn bị reject với message tiếng Việt chung chung | **CAO** | User quyết định không giữ hard cap 14 ngày → đã nâng lên 30. Nếu user muốn bỏ hoàn toàn hoặc tăng thêm → cần approval | Cần user approval trước khi remove/tăng |
| Place images rỗng trong DB (618/618) — category fallback từ Pexels chỉ là tạm | Cao | ETL Goong không crawl được image URLs | **00060K** ETL image crawl scheduler |
| Blocking generate có thể timeout với trips dài (15–30 ngày) | Trung bình | Gemini có thể mất 30s+ cho trip dài; long trip banner đã cảnh báo | **00060L** async generation job |
| Ảnh place từ Pexels — CDN availability | Thấp | Fallback URLs stable, format đơn giản | - |
| DailyItinerary share: user bị chuyển sang ItineraryView để share | Thấp | UX phụ, không blocking | Phase D+ |

---

## 9. Commit / PR

- **Branch:** `fix/00060-d-local-smoke-ux-data-fix`
- **Commit 1:** `c1a56c9` — `fix: [#00060] fix local smoke ux and data blockers` (11 files)
- **Commit 2:** `672ce31` — `fix: [#00060] align local smoke gate fixes with product decisions` (TopActionBar REDACTED guard)
- **Files changed total:** 12 files (8 Frontend, 1 Backend, 2 docs, 1 TopActionBar fix-up)
