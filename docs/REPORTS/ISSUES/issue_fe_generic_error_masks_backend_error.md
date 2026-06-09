# Issue: FE Generic Error Masks Backend Error Reason

## Status
✅ FULLY RESOLVED by PR #87 (00062) - Extends 00051 fix with comprehensive error handling

**Previous resolution:** RESOLVED_FOR_SCOPE (2026-05-29, branch fix/00051-c-fe-error-visibility)

## Evidence
- **B3 Playwright test** (2026-05-28): `Frontend/tests/e2e/b3/flow-a-hcm-error.spec.ts`
- Backend response: `{"detail":"Destination data not found. Please run ETL for this destination first.","error_code":"VALIDATION_ERROR","status_code":422}`
- UI error text captured: **"Không thể tạo lịch trình. Vui lòng thử lại."**
- Console error: `Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)`
- File: `Frontend/src/app/pages/CreateTrip.tsx`
- Code: `catch { setValidationError("Không thể tạo lịch trình. Vui lòng thử lại."); }`

## Impact
- User chọn TP.HCM → thấy generic error, không biết thành phố chưa có data
- User hết quota (429) → thấy generic error, không biết đã dùng hết lượt hôm nay
- User gặp Gemini timeout (503) → thấy generic error, không biết có thể thử lại sau
- Tất cả errors (400/403/409/422/429/503/500) đều hiển thị cùng 1 message

## Reproduction
1. Mở `/create-trip`
2. Nhập "TP. Hồ Chí Minh"
3. Chọn ngày
4. Click "Tạo Lịch Trình Với AI"
5. Thấy: "Không thể tạo lịch trình. Vui lòng thử lại."
6. Backend thực tế trả: 422 với message rõ ràng

## Expected
- 422 (destination missing): "Thành phố này chưa có dữ liệu. Vui lòng chọn thành phố khác."
- 422 (validation): Hiển thị `err.message` từ BE
- 429 (rate limit): "Bạn đã dùng hết X lượt tạo lịch trình hôm nay. Thử lại vào ngày mai."
- 503 (Gemini timeout/unavailable): "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
- 500: Generic fallback

## Actual
Tất cả: "Không thể tạo lịch trình. Vui lòng thử lại."

## Suggested fix
```typescript
// Frontend/src/app/pages/CreateTrip.tsx
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      setValidationError("Bạn đã dùng hết lượt tạo lịch trình hôm nay. Thử lại vào ngày mai.");
    } else if (err.status === 422) {
      // Use BE message if available and user-friendly
      const msg = err.message;
      if (msg?.includes("Destination data not found")) {
        setValidationError("Thành phố này chưa có dữ liệu. Vui lòng chọn thành phố khác.");
      } else {
        setValidationError(msg || "Thông tin không hợp lệ. Vui lòng kiểm tra lại.");
      }
    } else if (err.status === 503) {
      setValidationError("Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.");
    } else {
      setValidationError("Không thể tạo lịch trình. Vui lòng thử lại.");
    }
  } else {
    setValidationError("Không thể tạo lịch trình. Vui lòng thử lại.");
  }
}
```

## Recommended branch
`fix/00050-x-fe-error-visibility`

---

## Resolution in 00051 (2026-05-29)

### Files added
- `Frontend/src/app/utils/errorHandler.ts` — Centralized error mapper
- `Frontend/src/app/hooks/useDestinations.ts` — Backend destination fetch

### Files modified
- `Frontend/src/app/pages/CreateTrip.tsx` — +44 / -7

### What was fixed
1. **Generic error eliminated**: `errorHandler.ts` maps all HTTP status codes (400/401/403/422/429/503/500+) to specific Vietnamese user messages
2. **422 destination not found**: Returns `Thành phố "${destName}" chưa có dữ liệu trong hệ thống. Vui lòng chọn một thành phố có trong danh sách gợi ý.`
3. **422 not enough places**: Returns `Thành phố "${destName}" chưa có đủ địa điểm để tạo lịch trình...`
4. **429 rate limit**: Returns `Bạn đã dùng hết ${quotaLimit} lượt tạo lịch trình AI hôm nay. Vui lòng thử lại vào ngày mai.`
5. **503 AI timeout**: Returns `Dịch vụ AI đang bận hoặc phản hồi quá lâu. Vui lòng thử lại sau ít phút.`
6. **503 Redis/cache**: Returns `Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau.`
7. **Backend error sanitization**: Blocks SQL/traceback/internal details from reaching UI

### Browser evidence (Phase 4)
- TC2 PASS: Unsupported city "Không Tồn Tại City" blocked pre-submit → validation error shown, zero generate API calls
- TC3 PASS: Error is specific, NOT generic "Không thể tạo lịch trình. Vui lòng thử lại."
- TC1 PASS: Destinations API loaded, suggestions from backend

### Remaining verification gaps
- TC429 (rate limit) browser test: NOT RUN in Phase 4 (quota risk) — verified via code review only
- TC503 (AI timeout) browser test: NOT RUN in Phase 4 (env risk) — verified via code review only
- These paths deferred to regression test in 00055 or future full browser test suite

### Related report
See: `docs/REPORTS/00051_fe_error_visibility_results.md`
