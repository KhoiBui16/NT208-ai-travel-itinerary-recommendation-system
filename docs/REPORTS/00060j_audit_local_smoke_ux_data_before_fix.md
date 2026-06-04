# 00060J-AUDIT — Local Smoke UX/Data Before Fix

**Audit SHA:** `8b0f172`
**Branch:** `docs/00060-d-local-smoke-ux-data-audit`
**Dựa trên:** 00060I-V2 (commit `a4dba73`) và 00060H (commit `3e31772`)
**Ngày audit:** 2026-06-04

---

## 1. Executive Summary

| Metric | Giá trị |
|---|---|
| Audit SHA | `8b0f172` |
| Total files read | 26 files |
| Total findings | 20 sub-findings (từ 15 user findings) |
| P0 (crash/critical) | **3** |
| P1 (core UX/data) | **7** |
| P2 (polish/clarity) | **4** |
| Future (scope lock) | **6** |
| Should fix before C3/C4? | **YES** — P0 cần fix trước khi deploy staging |
| Should deploy before fixes? | **NO** — AddDays crash và share URL bug có thể gây data corruption |

---

## 2. User findings classification

| # | User finding | Severity | Confirmed? | Root cause summary | Fix now? | Future phase |
|---|---|---|---|---|---|---|
| 1a | Home — destination images không thực (relative paths) | P1 | YES | BE trả `/img/destinations/ha-noi.jpg` — relative path, FE chỉ hiển thị đúng nếu có static serving | Fix — serve static hoặc dùng absolute URL | - |
| 1b | Home → CityDetail: click destination đi `/cities` không phải `/cities/:slug` | P1 | YES | `Home.tsx` wrap `<Link to="/cities">` thay vì `/cities/${dest.id}` | Fix now | - |
| 1c | Place images trong DB đều null/empty | P1 | YES | 618/618 places có `image = ''` (empty string) — ETL không crawl image | Fix ETL hoặc dùng category fallback | Phase ETL |
| 2 | Guest "Lịch trình của tôi" — yêu cầu đăng nhập | OK | YES — intentional | `TripHistory.tsx` hiện login prompt rõ ràng khi `!isAuthenticated` | Không cần fix | - |
| 3a | Guest AI generate — thiếu trạng thái rõ ràng | P2 | YES | `CreateTrip.tsx` chỉ hiện spinner + text "AI đang lên kế hoạch...", không có step progress | Add progress steps | - |
| 3b | Guest AI generate — ảnh activities giống nhau | P1 | YES | Places image = '' → `_activity_image_for_generated_activity` trả empty string | Fix ETL image data | Phase ETL |
| 3c | Guest AI generate — accommodation không hiển thị | P1 | YES | `useTripSync` map accommodations đúng nhưng `TripWorkspace` cần đủ data từ session | Confirmed working via code audit | - |
| 3d | Guest share UI bị lộ (nút Chia Sẻ hiển thị cho guest) | P1 | YES | `ItineraryView.tsx` guard `{isAuthenticated && <ShareButton>}` — đúng. Nhưng `DailyItinerary.tsx` có Share Dialog không check auth | Fix DailyItinerary share guard | - |
| 3e | FloatingAIChat button che nút `+` | P2 | YES | `FloatingAIChat` dùng `fixed bottom-6 right-6 z-40`; các action button trong TripWorkspace cũng có thể ở góc dưới phải | Reposition chatbot | - |
| 4 | Guest manual create — place images broken | P1 | YES | Same as 1c — places image = '' từ DB/ETL | Fix ETL | Phase ETL |
| 5 | Login — Google OAuth / email OTP | Future | YES — intentional | `LoginRequiredModal` có comment "Tích hợp Google SSO OAuth2 thực tế tại đây" placeholder | - | Phase D+ |
| 6a | TripWorkspace — places biến mất sau reload | P1 | PARTIAL | `useTripSync` load từ sessionStorage và API; nếu `tripIdParam` không có → fallback session; nếu session expired → mất data | Improve reload resilience | - |
| 6b | AddDays CalendarModal crash: `RangeError: Invalid time value` | **P0** | YES | `AddDaysModal.tsx:57` dùng `parse(day.date, "dd/MM/yyyy", new Date())` nhưng `day.date` từ API là ISO `"2025-06-01"` → parse fail → Invalid Date → `format(Invalid Date)` crash | **Fix now** | - |
| 7a | Share — duplicate copy UI | P2 | YES | `ItineraryView.tsx` có share link bar + copy button. `DailyItinerary.tsx` cũng có share dialog riêng với hardcoded `"yourtrip.app/trip/abc123"` | Fix DailyItinerary share | - |
| 7b | Share — invalid/redacted URL | **P0** | PARTIAL | BE `service.py:250` trả `share_url = "…/shared/[REDACTED]"` khi link đã issued. FE `ItineraryView.tsx:197` đã guard token `[REDACTED]` — nhưng `DailyItinerary.tsx` không dùng real share API | Fix DailyItinerary share | - |
| 7c | Share — no PDF export | Future | YES | `DailyItinerary.tsx` có button "Export as PDF" nhưng không implement | - | Phase D+ |
| 8 | TripHistory — no images, hardcoded status | P2 | YES | `TripHistory.tsx:51` hardcode `status: "planning" as const`; `coverImage: trip.coverImage \|\| ""` nhưng `ItineraryResponse` không có `coverImage` field | Fix status logic + add image | - |
| 9 | Generate — 14-day cap | P2 | YES — intentional | `pipeline.py:62` `MAX_TRIP_DAYS = 14`, `pipeline.py:571` raise `ValidationException`. Đây là product constraint để tránh LLM overflow | Keep 14-day cap, add FE early validation | - |
| 10 | Generate — no clear progress indicator | P2 | YES | `CreateTrip.tsx` chỉ có spinner; không có step: queuing → generating → validating → saving | Add multi-step progress | - |
| 11 | FloatingAIChat covers buttons | P2 | Duplicate of 3e | same | same | - |
| 12 | CreateTrip images — API/ETL | P1 | YES | `CreateTrip.tsx` dùng `useDestinations()` với API data; destination images là relative path `/img/destinations/...` | Fix static serving or use absolute URL | - |
| 13 | Premium button | Future | YES | `Header.tsx:103` có "Upgrade to Premium" button hardcoded, không navigate đâu | - | Phase D+ |
| 14 | Saved places — savedId/placeId sau 00060I | OK | YES — FIXED | `SavedPlaces.tsx` đã dùng `normalizeSavedPlaces()` + `savedId` đúng; `CityDetail.tsx` dùng `p.place?.name \|\| p.placeName \|\| p.name` | Confirmed working | - |
| 15 | Budget — rule-based | Future | YES | `CreateTrip.tsx:budgetMap = { low: 2M, mid: 5M, high: 10M }` rule-based; không có AI budget advisor | - | Phase C5+ |

---

## 3. Source evidence by finding

### Finding 1b — Home → CityDetail navigation broken

**File:** `Frontend/src/app/pages/Home.tsx`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Frontend/src/app/pages/Home.tsx#L183-L195

```tsx
// Line 183 — Link goes to /cities, not /cities/:slug
<Link key={dest.name} to="/cities" ...>
  <img src={dest.image} alt={dest.name} onError={applyPlaceImageFallback} />
  ...
</Link>
```

**Root cause:** Tất cả destination cards link đến `/cities` (list page) thay vì `/cities/${slug}` (detail page). Clicking sẽ không đến CityDetail của thành phố đó.

**Proposed fix:** Tạo slug từ tên thành phố → `to={/cities/${encodeURIComponent(dest.name)}}` hoặc dùng `id` nếu BE trả `id`.

---

### Finding 1c — Place images NULL trong DB

**DB evidence:**
```
select count(*) as total, count(image) as with_image, count(case when image='' then 1 end) as empty_str from places;
 total | with_image | empty_str
   618 |        618 |       618
```

**Root cause:** ETL Goong extractor không lấy được ảnh từ Goong API (Goong Place Detail không trả image URLs). 618/618 places có image = empty string.

**Impact:** Mọi activity image trong AI-generated trip đều trống → UI hiển thị broken image hoặc placeholder.

---

### Finding 6b — AddDays CalendarModal crash (P0)

**File:** `Frontend/src/app/components/AddDaysModal.tsx`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Frontend/src/app/components/AddDaysModal.tsx#L54-L60

```tsx
// Line 54-60 — getAllOccupiedDates()
days.forEach((day) => {
  try {
    const parsed = parse(day.date, "dd/MM/yyyy", new Date()); // CRASH POINT
    occupiedDates.push(startOfDay(parsed));
  } catch (e) {}
});
```

**Root cause:**
- `day.date` từ API (via `useTripSync`) là ISO format `"2025-06-01"`
- Nhưng `day.date` từ wizard flow (manual create) là `"dd/MM/yyyy"` format
- `parse("2025-06-01", "dd/MM/yyyy", new Date())` → trả `Invalid Date`
- `format(Invalid Date, "yyyy-MM-dd")` tại line 66 → `RangeError: Invalid time value`
- Stack trace: `format → isDateAllocatedInAddFlow → CalendarModal → AddDaysModal`

**Proposed fix:**
```tsx
function safeParseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  }
  // Try dd/MM/yyyy
  const d = parse(dateStr, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}
```

---

### Finding 7b — Backend trả REDACTED share_url

**File:** `Backend/src/itineraries/service.py`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Backend/src/itineraries/service.py#L248-L252

```python
# Line 248-252 — existing share link returns redacted URL
return ShareResponse(
    share_url=f"{settings.frontend_url}/shared/[REDACTED]",
    share_token="[REDACTED — already issued]",
    expires_at=existing.expires_at,
)
```

**FE guard đã có (từ 00060I):**
`ItineraryView.tsx:197` check `token !== "[REDACTED]"` — đúng cho `ItineraryView`.

**Vẫn còn vấn đề:**
`DailyItinerary.tsx` có Share Dialog hardcode `value="yourtrip.app/trip/abc123"` — không dùng API → không relevant đến REDACTED bug nhưng là P2 UX issue.

---

### Finding 3d — DailyItinerary share không guard auth

**File:** `Frontend/src/app/pages/DailyItinerary.tsx`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Frontend/src/app/pages/DailyItinerary.tsx#L225-L255

```tsx
// Share dialog visible for all users — no auth check
<Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
  <DialogTrigger asChild>
    <button>Chia sẻ</button>
  </DialogTrigger>
  <DialogContent>
    <input readOnly value="yourtrip.app/trip/abc123" /> {/* HARDCODED */}
  </DialogContent>
</Dialog>
```

---

### Finding 8 — TripHistory status hardcoded + no coverImage

**File:** `Frontend/src/app/pages/TripHistory.tsx`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Frontend/src/app/pages/TripHistory.tsx#L48-L53

```tsx
// Line 51 — status always "planning"
status: "planning" as const,
coverImage: trip.coverImage || "",  // ItineraryResponse has no coverImage field
```

**Root cause:** BE `ItineraryResponse` không có `coverImage` field → luôn empty string → blank image trong TripHistory cards.

---

### Finding 9 — 14-day cap: intentional design

**File:** `Backend/src/itineraries/pipeline.py`
**GitHub permalink:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system/blob/8b0f172/Backend/src/itineraries/pipeline.py#L62

```python
MAX_TRIP_DAYS = 14  # Line 62
# Line 570-571
if day_count < 1 or day_count > MAX_TRIP_DAYS:
    raise ValidationException("Trip duration must be between 1 and 14 days")
```

**Root cause:** Product constraint để tránh LLM context overflow và abuse. Đây là intentional design.
**UX issue:** FE không validate sớm → user chọn cả tháng, submit, nhận error 422 từ BE.

---

### Finding 14 — Saved places (confirmed working post-00060I)

**File:** `Frontend/src/app/pages/SavedPlaces.tsx`
**Evidence:** `normalizeSavedPlaces(res)` + `handleDelete(savedId)` + `handleToggleBookmark(savedId)` — đúng theo contract.

**File:** `Frontend/src/app/pages/CityDetail.tsx`
**Residual issue:** `data.map((p: any) => p.place?.name || p.placeName || p.name)` — fallback chain đúng nhưng mock `savedPlaces` state dùng local `city.popularPlaces.id` (numeric mock ID), không phải real BE place ID.

---

## 4. Runtime data diagnostics

| Check | Kết quả | Diễn giải |
|---|---|---|
| Destinations count | 10 rows, all `is_active=true` | ETL đã chạy cho 10 thành phố |
| Destinations image | Relative paths `/img/destinations/*.jpg` | Cần static file serving — không phải absolute URL |
| Places image | 618/618 records có `image = ''` (empty string) | **ETL critical bug** — Goong API không trả image URL → tất cả activity image trong AI trip đều trống |
| Places per destination | 10–73 places/city; Đà Lạt chỉ có 10 | Đà Lạt có nguy cơ fail AI generate với chuyến dài |
| `count(image)` vs total | `count(image) = 618` nhưng `count(case when image='' then 1 end) = 618` | PostgreSQL count() không đếm NULL nhưng đếm empty string — tất cả là empty string |
| Docker DB/Redis | postgres:5432 healthy, redis:6379 healthy | Infra OK |
| BE API | Server chưa start local | Cần `uvicorn` để test live API |

---

## 5. Cross-flow dependency map

| Flow | Depends on | Current risk | Fix order |
|---|---|---|---|
| Home destination cards | BE `/places/destinations` + static image serving | P1 — destination image relative path, link sai | 2 |
| City detail | `/places/destinations/{name}` + mock `cityData` + `savedPlaces` | P1 — link từ Home đến City bị broken | 2 |
| AI generate workspace | Gemini + pipeline + mapper + session | P1 — place images luôn trống do ETL | Phase ETL |
| AddDays flow | `AddDaysModal.tsx` + `CalendarModal` + date format | **P0** — crash khi `day.date` là ISO format | 1 |
| Share (ItineraryView) | BE share API + FE token guard | P1 (already fixed in 00060I) — guard có nhưng REDACTED url vẫn hiển thị | 2 |
| Share (DailyItinerary) | Hardcoded URL, no auth guard | P2 — mock data, không gây data loss | 3 |
| Saved places | `normalizeSavedPlaces()` + `savedId/placeId` contract | OK — fixed in 00060I | - |
| TripHistory | BE list API + status/coverImage fields | P2 — missing image và hardcoded status | 3 |
| Guest auth boundary | `ProtectedRoute` + `isAuthenticated` check | OK — route-level protection đúng | - |
| Budget suggestion | Rule-based mapping | Expected — future AI advisor | Future |

---

## 6. Proposed fix strategy

| Priority | Fix group | Files likely touched | Tests required | Risk |
|---|---|---|---|---|
| **1 (P0)** | AddDays crash — dual date format parser | `AddDaysModal.tsx` | Unit test: safeParseDate với ISO vs dd/MM; integration: open AddDays với API-loaded trip | Low — isolated helper function |
| **2 (P1)** | Home→CityDetail navigation fix; Share URL visible warning; TripHistory coverImage fallback | `Home.tsx`, `TripHistory.tsx`, `ItineraryView.tsx` (minor) | Playwright: click destination → correct page; share redacted shows warning | Low |
| **3 (P2)** | DailyItinerary share guard; FloatingAIChat reposition; TripHistory status date-based | `DailyItinerary.tsx`, `FloatingAIChat.tsx`, `TripHistory.tsx` | UI layout test | Medium — z-index/layout changes |
| **ETL phase** | Place image crawling — Goong/alternative sources | `Backend/src/etl/` | ETL integration test; verify image field populated | High — external API dependency |
| **Future** | Google OAuth, Premium, PDF export, dark mode, SSE, AI budget advisor | Multiple | - | - |

---

## 7. Open questions for user

| Question | Why it matters | Recommended default |
|---|---|---|
| 14-day cap: keep 14 ngày hay tăng lên? | FE cần validate sớm nếu giữ cap | **Giữ 14-day cap**, thêm FE early validation trước submit |
| Guest có được chia sẻ trip không? | `DailyItinerary.tsx` share dialog hiện cho tất cả | **Không** — require login trước khi share; ẩn nút Share với guest |
| PDF export trong MVP không? | DailyItinerary có button "Export as PDF" placeholder | **Future** — không triển khai trong sprint này |
| Goong Map tile trước C3 không? | Map hiện là mock placeholder | **Future** — ETL data quality quan trọng hơn map tile |
| Place images: ETL crawl lại hay dùng category fallback ngay? | 618 images rỗng → activity cards trống | **Ngắn hạn**: dùng category-based fallback images; **Dài hạn**: crawl lại ETL với image source khác |
| FloatingAIChat: giữ hay ẩn trong TripWorkspace cho đến C3? | Che nút thêm hoạt động | **Reposition** — không ẩn, chỉ dịch sang vị trí khác không che action bar |

---

## 8. Findings NOT requiring code fix

| Finding | Reason |
|---|---|
| Finding 2 — Guest "Lịch trình của tôi" | TripHistory đã hiện login prompt rõ ràng |
| Finding 5 — Google OAuth | Intentional placeholder, future scope |
| Finding 13 — Premium button | Intentional placeholder, future scope |
| Finding 14 — Saved places | Fixed correctly in 00060I |
| Finding 15 — Budget rule-based | Expected behavior for MVP |
| Finding 7b (ItineraryView) | Fixed in 00060I-R with token guard |
