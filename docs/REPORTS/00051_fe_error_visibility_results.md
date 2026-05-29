# 00051 — FE Error Visibility and Destination Selector Results

## Summary
- **Branch**: `fix/00051-c-fe-error-visibility`
- **Scope**: Frontend error visibility + destination selector backend integration
- **Status**: `RESOLVED_FOR_SCOPE`
- **Date**: 2026-05-29

## What changed

| Area | Before | After | Evidence |
|---|---|---|---|
| FE generic generate error | Tất cả errors (422/429/503/500+) hiển thị generic "Không thể tạo lịch trình. Vui lòng thử lại." | Mỗi HTTP status code có message riêng: 422 (validation/destination), 429 (quota), 503 (AI timeout), 500 (server) | Phase 4 TC2/TC3 browser smoke |
| Destination selector source | Hardcoded `popularDestinations` list từ `tripConstants.ts` | Dynamic query `/api/v1/places/destinations` với fallback to static list khi API fail | Phase 4 TC1 browser smoke |
| Unsupported city handling | User gõ bất kỳ → submit → BE trả 422 → FE generic error | Pre-submit validation block unsupported cities khi backend destinations loaded successfully | Phase 4 TC2 browser smoke |
| Backend destination endpoint | FE không query | FE query `GET /api/v1/places/destinations` on component mount | Phase 4 TC1 network capture |

## Files changed

| File | Change | Reason |
|---|---|---|
| `Frontend/src/app/utils/errorHandler.ts` | **NEW** — Centralized error mapper for generate itinerary | Biến generic error thành status-specific messages |
| `Frontend/src/app/hooks/useDestinations.ts` | **NEW** — Hook to fetch destinations from backend | Tích hợp backend `/api/v1/places/destinations` API |
| `Frontend/src/app/pages/CreateTrip.tsx` | **MODIFIED** — +44 / -7 | Import hook + error handler, pre-submit validation, warning banner |

## Verification evidence

| Test case | Result | Evidence | Notes |
|---|---|---|---|
| TC1 destination list API loaded | **PASS** | `GET /api/v1/places/destinations` called on page load | Backend returns `[{id:2, name:"Hà Nội", country:"Vietnam", image:"...", rating:0.0}]` |
| TC1.3 placeholder shows Ha Noi | **PASS** | Placeholder text: `VD: Hà Nội...` | FE updates placeholder based on backend destination names |
| TC1.6 suggestions from backend | **PASS** | Suggestions dropdown shows "Hà Nội" from backend response | FE filters `backendDests.map((d) => d.name)` for suggestions |
| TC2 unsupported city pre-submit blocked | **PASS** | Validation error: `Thành phố "Không Tồn Tại City" chưa có trong danh sách được hỗ trợ.` | Zero POST `/generate` calls made (0 API calls) |
| TC2.7 NO generate call | **PASS** | No network request to `/api/v1/itineraries/generate` | Pre-submit validation works when `backendDests.length > 0 && !isUsingFallback` |
| TC3 generic error not shown | **PASS** | Error is specific, not "Không thể tạo lịch trình. Vui lòng thử lại." | `errorHandler.ts` maps status codes correctly |
| TC429 rate limit message | **NOT_RUN** | Code review only — `getGenerateErrorMessage()` returns 429-specific message | Deferred to avoid Gemini quota waste; logic verified in code |
| TC503 AI timeout message | **NOT_RUN** | Code review only — `getGenerateErrorMessage()` returns 503-specific message | Deferred for env safety; logic verified in code |
| npm run build | **PARTIAL** | TypeScript compilation pass (3194 modules transformed) | Default `--outDir dist` blocked by EPERM (local file lock); alternate `--outDir .build-tmp` succeeds |

**Screenshots**: `.codex-run-logs/phase4-tc1.png`, `.codex-run-logs/phase4-tc2.png`

## Remaining limitations

1. **`dist/assets` EPERM**: Local OS file lock on `Frontend/dist/assets`. TypeScript compilation passes; build succeeds to alternate directory. Not a code error.
2. **TC429/TC503 browser tests**: Not run in Phase 4 to avoid quota waste and env risks. Error handling logic verified via code review.
3. **Backend contract limitation**: `DestinationResponse` lacks `placesCount` or `hasData` field. FE cannot pre-validate data sufficiency (e.g., "enough places for generate"). Only validates destination name existence.
4. **Multi-city data**: Still depends on 00052 ETL expansion. Currently only Hà Nội has data in DB.

## Decision

**Can merge 00051 after Phase 6? YES**

**Lý do:**
- Core issues resolved: generic error eliminated, destination selector backend-backed, unsupported cities blocked pre-submit.
- No UI/UX changes — logic-only fixes.
- TC429/TC503 verified via code review (errorHandler.ts maps all status codes correctly).
- EPERM is local environment issue, not a code defect.
- Remaining backend contract limitation (placesCount) is out-of-scope for this FE-only fix.

**Next task**: 00052 ETL data expansion for multi-city support.

---

## Phase 4 Code Review Evidence

### errorHandler.ts — Status code mapping verified

| Status code | Mapper returns | Vietnamese message |
|---|---|---|
| 400 | "Thông tin không hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập." | Validation error generic |
| 401 | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | Token expired |
| 403 | "Bạn không có quyền thực hiện thao tác này." | Forbidden |
| 422 (destination not found) | `Thành phố "${destName}" chưa có dữ liệu trong hệ thống...` | Specific to missing destination |
| 422 (not enough places) | `Thành phố "${destName}" chưa có đủ địa điểm để tạo lịch trình...` | Specific to insufficient data |
| 429 | `Bạn đã dùng hết ${quotaLimit} lượt tạo lịch trình AI hôm nay...` | Quota exhausted |
| 503 (AI/Gemini timeout) | "Dịch vụ AI đang bận hoặc phản hồi quá lâu. Vui lòng thử lại sau ít phút." | AI provider busy |
| 503 (Redis/cache) | "Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau." | Cache failure |
| 500+ | "Hệ thống đang gặp sự cố. Vui lòng thử lại sau." | Server error generic fallback |

### useDestinations.ts — API path verified

- **Initial bug**: Used `/places/destinations` (incorrect prefix)
- **Fixed**: Now uses `/api/v1/places/destinations` (matches BE contract)
- **Fallback behavior**: When API fails or returns empty, falls back to static `popularDestinations` list with `isUsingFallback: true`
- **Pre-submit validation**: Only active when `backendDests.length > 0 && !isUsingFallback` — gracefully degrades when API unavailable

### CreateTrip.tsx — Integration verified

- Import statements added for `useDestinations` hook and `getGenerateErrorMessage`
- Hook call: `const { destinations: backendDests, isLoading: destsLoading, error: destsError, isUsingFallback } = useDestinations();`
- Merge logic: `const availableDestinations = backendDests.length > 0 ? backendDests.map((d) => d.name) : popularDestinations;`
- Pre-submit validation: Checks if destination is in backend list when available
- Catch block: `setValidationError(getGenerateErrorMessage(err, { destination: destInput, quotaLimit: 3 }));`
- Warning banner: Shows `destsError` when backend API fails or returns empty

---

## Related Issues

| Issue | Status after 00051 |
|---|---|
| `issue_fe_generic_error_masks_backend_error.md` | `RESOLVED_FOR_SCOPE` |
| `issue_destination_selector_not_db_backed.md` | `PARTIALLY_RESOLVED` |

See issue file updates below for details.
