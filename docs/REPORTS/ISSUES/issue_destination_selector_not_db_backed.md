# Issue: Destination Selector Not DB-backed

## Status
OPEN

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
