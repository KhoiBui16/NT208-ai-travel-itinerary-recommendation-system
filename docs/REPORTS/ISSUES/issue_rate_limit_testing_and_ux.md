# Issue: Rate Limit Too Low for Testing + FE UX Missing

## Status
PARTIALLY_RESOLVED (2026-05-29)

### Resolution notes
- **FE UX**: IMPROVED in `fix/00051-c-fe-error-visibility` — `errorHandler.ts` now maps 429 to specific quota message. Browser test deferred to regression.
- **Dev/test utilities**: Still OPEN — no reset endpoint or higher quota for test accounts.

## Evidence
- **B2 API Matrix** (2026-05-28):
  - Guest: 3 generate calls → 429 `Bạn đã dùng hết 3 lượt tạo lịch trình AI miễn phí hôm nay`
  - Auth user: 3 generate calls → 429 `Bạn đã dùng hết 3 lượt tạo lịch trình AI hôm nay`
  - Phải tạo 3 test users khác nhau để test đủ scenarios
- **B3 Browser** (2026-05-28): FE hiển thị generic error khi 429

## Impact

### Testing impact
- 3/day quá thấp cho manual testing — mỗi test session cần user mới
- B2 phải tạo: `b2test_matrix@example.com`, `b2test_hcm@example.com`, `b2test_danang@example.com`
- Không có dev/test reset utility
- Không có higher quota cho test accounts

### UX impact
- User hết quota → thấy "Không thể tạo lịch trình. Vui lòng thử lại." thay vì "Bạn đã dùng hết 3 lượt hôm nay. Thử lại lúc 00:00 UTC."
- User không biết khi nào quota reset
- User không biết còn bao nhiêu lượt

## Reproduction
1. Generate 3 lần với cùng user
2. Generate lần 4 → 429
3. FE hiển thị generic error

## Expected
- 429: "Bạn đã dùng hết 3 lượt tạo lịch trình hôm nay. Thử lại lúc 00:00 UTC."
- Dev/test environment: higher quota hoặc reset endpoint
- FE hiển thị remaining quota (optional)

## Actual
- 429 hoạt động đúng về mặt kỹ thuật
- FE hiển thị generic error
- Không có reset utility

## Suggested fixes

**FE fix**: Map 429 → specific message (xem `issue_fe_generic_error_masks_backend_error.md`)

**Dev/test fix**: Thêm env var `RATE_LIMIT_AI_FREE_OVERRIDE` cho test environment:
```python
# AppSettings
rate_limit_ai_free: int = Field(default=3)
# In test: RATE_LIMIT_AI_FREE_OVERRIDE=100
```

**Or**: Thêm admin endpoint để reset rate limit key cho test user:
```
DELETE /api/v1/admin/rate-limit/{user_id}  # dev only, không expose production
```

## Recommended branch
`fix/00051-c-fe-error-visibility` (FE message) — **DONE** (2026-05-29)
`fix/00054-c-rate-limit-auth-trip-policy` (reset endpoint, separate chat quota) — future work
