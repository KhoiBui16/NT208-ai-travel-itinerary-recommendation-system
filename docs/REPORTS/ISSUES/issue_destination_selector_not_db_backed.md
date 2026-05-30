# Issue: Destination Selector Not DB-backed

## Status
PARTIALLY_RESOLVED (2026-05-29, branch fix/00051-c-fe-error-visibility)

## Evidence
- **B3 Playwright test** (2026-05-28): `Frontend/tests/e2e/b3/flow-c-date-picker.spec.ts`
- Suggestions for "Hà": `[]` (empty)
- Suggestions for "TP": `[]` (empty)
- File: `Frontend/src/app/utils/tripConstants.ts` (inferred from `CreateTrip.tsx` import)
- File: `Frontend/src/app/pages/CreateTrip.tsx` — dùng `popularDestinations` hardcoded list
- API `/api/v1/places/destinations` trả `[{id:2, name:"Hà Nội"}]` — không được FE query

## Impact
- FE hiển thị 12 thành phố trong `cities.ts` nhưng chỉ Hà Nội có data trong DB
- User có thể gõ bất kỳ tên thành phố nào → generate fail 422
- User không biết thành phố nào được hỗ trợ
- Destination suggestions dropdown không hoạt động với tên tiếng Việt có dấu

## Reproduction
1. Mở `/create-trip`
2. Gõ "TP" vào ô điểm đến
3. Không có suggestion dropdown
4. Gõ "TP. Hồ Chí Minh" → submit → 422

## Expected
- Destination selector query `/api/v1/places/destinations` để lấy danh sách thành phố có data
- Chỉ hiển thị thành phố có data trong DB
- Hoặc: hiển thị tất cả nhưng mark thành phố chưa có data là "Sắp có"

## Actual
- FE dùng hardcoded `popularDestinations` list
- Không query backend
- User có thể chọn thành phố không có data

## Suggested fix
Option A (recommended): Query `/api/v1/places/destinations` khi component mount, dùng kết quả làm suggestion list.

Option B: Giữ hardcoded list nhưng validate trước khi submit — nếu destination không có trong supported list, hiển thị warning.

## Recommended branch
`fix/00050-x-destination-selector`

---

## Resolution in 00051 (2026-05-29)

### Files added
- `Frontend/src/app/hooks/useDestinations.ts` — Hook to fetch destinations from backend
- `Frontend/src/app/utils/errorHandler.ts` — Error mapper (shared for generate)

### Files modified
- `Frontend/src/app/pages/CreateTrip.tsx` — Hook integration + pre-submit validation

### What was fixed
1. **Backend API query**: FE now calls `GET /api/v1/places/destinations` on component mount
2. **Suggestions from backend**: Destination suggestions filtered from backend response: `backendDests.map((d) => d.name)`
3. **Fallback behavior**: When API fails or returns empty, gracefully degrades to static `popularDestinations` list with warning banner
4. **Pre-submit validation**: Unsupported cities blocked before API call when `backendDests.length > 0 && !isUsingFallback`
5. **Placeholder update**: Dynamic placeholder shows backend city names (e.g., "VD: Hà Nội...")

### Backend API response verified (Phase 4)
```json
[{"id":2,"name":"Hà Nội","country":"Vietnam","image":"/img/destinations/ha-n-i.jpg","rating":0.0}]
```

### Browser evidence (Phase 4)
- TC1.1 PASS: `GET /api/v1/places/destinations` called on page load
- TC1.3 PASS: Placeholder shows "VD: Hà Nội..."
- TC1.6 PASS: Suggestions dropdown shows "Hà Nội" from backend
- TC2 PASS: Unsupported city "Không Tồn Tại City" blocked pre-submit (zero generate API calls)

### Remaining limitations (NOT resolved in 00051)
1. **Backend contract limitation**: `DestinationResponse` lacks `placesCount` or `hasData` field. FE cannot pre-validate data sufficiency (e.g., "enough places for generate"). Only validates destination name existence.
2. **Multi-city data**: Currently only Hà Nội has data in DB. Other cities still require 00052 ETL expansion.
3. **Data quality**: FE cannot distinguish between "destination exists but 0 places" vs "destination with enough places" without backend `hasData` flag.

### Why PARTIALLY_RESOLVED and not RESOLVED
- FE now queries backend and validates destination name existence ✅
- But FE still cannot know if destination has sufficient data (places/hotels) without `placesCount/hasData` field ❌
- Multi-city data still depends on 00052 ETL expansion ❌

### Recommended next steps
1. **Backend**: Add `placesCount: int`, `hotelsCount: int`, and `isGenerateReady: bool` to `DestinationResponse` schema
2. **ETL**: Run Goong ETL for remaining cities, verify Đà Lạt data sufficiency (currently 10 places < 30 threshold)
3. **FE**: Use `isGenerateReady` flag to disable/marginal cities in suggestions UI

### 10-city status (2026-05-30, verified in 00056)
Backend `/api/v1/places/destinations` now returns 10 cities:

| City | Places | Hotels | Ready? | UI behavior |
|---|---|---|---|---|
| Hà Nội | 71 | 3 | ✅ READY | Shows in FE |
| TP. Hồ Chí Minh | 72 | 2 | ✅ READY | Shows in FE |
| Đà Nẵng | 68 | 2 | ✅ READY | Shows in FE |
| Hội An | 67 | 2 | ✅ READY | Shows in FE |
| Huế | 66 | 1 | ✅ READY | Shows in FE |
| Nha Trang | 64 | 1 | ✅ READY | Shows in FE |
| Hạ Long | 71 | 1 | ✅ READY | Shows in FE |
| Phú Quốc | 73 | 1 | ✅ READY | Shows in FE |
| Sapa | 56 | 1 | ✅ READY | Shows in FE |
| Đà Lạt | 10 | 2 | ⚠️ MARGINAL (10 < 30 threshold) | Shows in FE (may fail generate) |

**Threshold**: Generate pipeline needs ≥30 places. Đà Lạt has only 10 → may trigger "Not enough destination places" error.

**FE limitation**: Backend `/api/v1/places/destinations` doesn't return `placesCount` or `isGenerateReady`. FE cannot pre-filter marginal cities.

**Impact**: User may select Đà Lạt and hit backend "not enough destination places" error, with no FE warning.

### Related reports
- `docs/REPORTS/00051_fe_error_visibility_results.md`
- `docs/REPORTS/00056_calendar_generate_flow_fix_result.md`
