# Issue: Overlap Trip Policy Not Verified

## Status
OPEN

## Evidence
- **B1.5/B2/B3 audit** (2026-05-28): Overlap trip policy không được test trong bất kỳ phase nào
- B2 chỉ test generate với non-overlapping dates
- Không có unit/integration test cho overlap scenario
- Không có product decision document về overlap policy

## Impact
- Không biết hệ thống có cho phép tạo 2 trips cùng ngày không
- Không biết BE có validate overlap không
- Không biết FE có warning overlap không
- C3 companion chat có thể bị ảnh hưởng nếu user có nhiều trips cùng ngày

## What is unknown
1. Nếu user tạo trip Hà Nội 30/05-02/06 và sau đó tạo trip Đà Nẵng 01/06-03/06 → BE có reject không?
2. Nếu BE cho phép overlap → FE có warning không?
3. Nếu user có 2 trips cùng ngày → TripWorkspace hiển thị trip nào?
4. C3 companion chat với trip overlap → session isolation đúng không?

## Reproduction
1. Tạo trip A: 30/05 - 02/06
2. Tạo trip B: 01/06 - 04/06 (overlap với trip A)
3. Quan sát: BE accept hay reject? FE warning hay không?

## Expected
Product decision cần xác định:
- Option A: Không cho phép overlap → BE trả 409 Conflict
- Option B: Cho phép overlap với warning → FE hiển thị warning
- Option C: Cho phép overlap không warning → user tự quản lý

## Actual
Chưa test, chưa có product decision.

## Suggested action
1. Tạo product decision document về overlap policy
2. Implement và test trong B4 hoặc dedicated test branch
3. Không claim overlap behavior ready cho C3/C4

## Recommended branch
`test/00055-c-fullstack-regression-verification` hoặc `feat/00056-c-c3-chat-session-foundation` (nếu overlap ảnh hưởng session)
