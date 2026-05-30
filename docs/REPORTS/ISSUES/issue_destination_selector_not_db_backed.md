# Issue: Destination Selector Not DB-backed

## Status
RESOLVED (2026-05-30, branch fix/00057-c-destination-readiness-contract)

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
- `docs/REPORTS/00057_destination_readiness_contract_result.md`

---

## Final Hardening Correction (2026-05-30)

### Product correction discovered
Initial 00057 implementation had a critical UX bug:
- Backend set `isGenerateReady=false` for Đà Lạt (partial city)
- Frontend blocked submit based on `isGenerateReady`
- Warning messages said "chọn thành phố khác"

This violated the product principle: **city trong backend selector phải cho phép user chọn và submit bình thường**.

### Final corrections made
1. **Backend**: Set `isGenerateReady=true` for ALL destinations in API response
2. **Backend**: Changed `readinessStatus` from "not_ready" to "sparse" (advisory only)
3. **Backend**: Updated warning messages to advisory:
   - Partial: "Dữ liệu hạn chế... Bạn vẫn có thể tiếp tục tạo lịch trình."
   - Sparse: "Dữ liệu rất ít... Bạn vẫn có thể thử tạo lịch trình..."
4. **Frontend**: Removed blocking logic - all listed cities allowed to submit
5. **Cache**: Bumped to `destinations:all:v2` to invalidate old blocking semantics
6. **Tests**: Rewrote 00057 test to verify Đà Lạt IS allowed to submit

### Final API response (Đà Lạt)
```json
{
  "isGenerateReady": true,  // ALLOWED
  "readinessStatus": "partial",
  "readinessReason": "Dữ liệu cho Đà Lạt hiện còn hạn chế... Bạn vẫn có thể tiếp tục tạo lịch trình."
}
```

### Test evidence
- 00057 test: ✅ PASS - verified Đà Lạt allowed to submit, generate API called
- All Playwright: ✅ 15 PASS, 3 SKIP
- Frontend build: ✅ PASS

### Why RESOLVED (not PARTIALLY_RESOLVED)
- ✅ Backend returns data quality metadata for all destinations
- ✅ ALL destinations have `isGenerateReady=true` (allowed to submit)
- ✅ FE does NOT block based on data quality
- ✅ Warning messages are advisory, not telling user to choose another city
- ✅ Cache invalidated to prevent old blocking semantics
- ✅ CI-safe test verifies allow-submit behavior

---

## Resolution in 00057 (2026-05-30 - FINAL)

### Files added/modified
- `Backend/src/places/schemas.py` - Added data quality fields to DestinationResponse
- `Backend/src/places/repository.py` - Added get_destinations_with_counts()
- `Backend/src/places/service.py` - Added data quality calculation; cache to v2
- `Frontend/src/app/services/places.ts` - Updated DestinationResponse interface
- `Frontend/src/app/hooks/useDestinations.ts` - Updated Destination interface
- `Frontend/src/app/pages/CreateTrip.tsx` - Removed blocking logic; advisory warnings only
- `Frontend/tests/e2e/00057-destination-readiness.spec.ts` - CI-safe test verifying allow-submit

### Final implementation (after hardening correction)
1. **Backend API contract**: Returns `placesCount`, `hotelsCount`, `isGenerateReady` (always true for listed cities), `readinessStatus`, `readinessReason`
2. **Efficient counting query**: Used `COUNT(DISTINCT)` grouped query
3. **Data quality calculation** (advisory only):
   - `ready`: placesCount >= 30
   - `partial`: 6 <= placesCount < 30
   - `sparse`: placesCount < 6
4. **FE UI indicators**: Partial/sparse cities show ⚠️ icon (advisory)
5. **NO submit guard**: ALL listed cities allowed to submit
6. **Đà Lạt handling**: Shows as partial with warning, BUT allows submit

See "Final Hardening Correction" section below for product correction details.

### API response verified (2026-05-30)
```json
{
  "id": 34,
  "name": "Đà Lạt",
  "placesCount": 10,
  "hotelsCount": 2,
  "isGenerateReady": false,
  "readinessStatus": "partial",
  "readinessReason": "Dữ liệu giới hạn (10 điểm đến). Khuyến nghị chọn thành phố khác để có lịch trình tốt hơn."
}
```

### Browser evidence (00057 test)
- TC PASS: Đà Lạt shows ⚠️ icon in suggestions
- TC PASS: Submit with Đà Lạt blocked with readinessReason
- TC PASS: No generate API call made (pre-submit validation)
- TC PASS: Hà Nội (ready) shows no warning

### 10-city status after 00057
All 10 cities now have readiness metadata:
- 9 cities: ready (56-73 places each)
- Đà Lạt: partial (10 places)

### Why RESOLVED (not PARTIALLY_RESOLVED)
- ✅ Backend returns readiness metadata for all destinations
- ✅ FE validates and blocks not-ready cities pre-submit
- ✅ UI shows clear indicators (⚠️/🔒)
- ✅ Vietnamese error messages guide users
- ✅ CI-safe test verifies behavior

### Remaining limitations (NOT in scope for 00057)
1. **No true not_ready cities**: All cities are either ready or partial. Not_ready path (<10 places) untested in production.
2. **Guest flow**: Readiness validation tested for auth, guest path needs separate verification.
3. **ETL for marginal cities**: Đà Lạt needs more data (10 → 30+). No ETL in this task.

### Related reports
- `docs/REPORTS/00057_destination_readiness_contract_result.md`
- `docs/REPORTS/00051_fe_error_visibility_results.md`
- `docs/REPORTS/00056_calendar_generate_flow_fix_result.md`
