# Issue: FE Generic Error Masks Backend Error Reason

## Status
OPEN

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
