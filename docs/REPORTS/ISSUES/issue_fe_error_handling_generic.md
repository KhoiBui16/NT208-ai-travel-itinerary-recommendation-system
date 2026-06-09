# Issue: FE Error Handling Generic for Generate Flow

> **Status:** ✅ RESOLVED by PR #87 (00062)
> **Resolution:** Toast notifications now show specific error messages for rate limits (429), validation errors (422), and AI timeouts (503) instead of generic "Không thể tạo lịch trình".

## Status
RESOLVED

## Evidence
- File: `Frontend/src/app/pages/CreateTrip.tsx`
- Code: `catch { setValidationError("Không thể tạo lịch trình. Vui lòng thử lại."); }`
- All errors (400, 422, 429, 500, 503) show the same generic message

## Impact
- User cannot distinguish rate limit hit (429) from AI failure (503) from validation error (422)
- When user hits 3/day limit, they see "Không thể tạo lịch trình" instead of "Bạn đã dùng hết 3 lượt hôm nay"
- Poor UX for paid users who need to know why generation failed

## Reproduction
1. Hit rate limit (3 generates/day)
2. Try to generate again
3. See generic error instead of rate limit message

## Expected
- 429: "Bạn đã dùng hết X lượt tạo lịch trình hôm nay. Thử lại vào ngày mai."
- 422: Show specific validation error from BE
- 503: "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau."
- 500: Generic fallback

## Actual
All errors: "Không thể tạo lịch trình. Vui lòng thử lại."

## Suggested fix
```typescript
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      setValidationError("Bạn đã dùng hết lượt tạo lịch trình hôm nay. Thử lại vào ngày mai.");
    } else if (err.status === 422) {
      setValidationError(err.message || "Thông tin không hợp lệ. Vui lòng kiểm tra lại.");
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
