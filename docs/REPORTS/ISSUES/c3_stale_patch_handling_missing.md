# Issue: Stale Patch Handling Missing in C3 Design

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: HIGH
**Status**: RESOLVED IN `00101` / FOLLOW-UP FOR HARDENING ONLY
**Related**: `docs/REPORTS/phase_c3_design_readiness.md`

## Problem

Current source đã có stale detection cơ bản bằng `trip_snapshot_updated_at` so với `trips.updated_at`, trả `409` và persist `confirmationStatus='stale'`. Issue này được hạ cấp thành follow-up cho policy/rate-limit/UX hardening thay vì blocker “chưa có stale handling”.

Nếu hai clients cùng làm việc trên cùng một trip:
1. User A đọc trip (version N)
2. User B đọc trip (version N)
3. User A chat → apply-patch để thêm activity
4. User B chat → apply-patch để sửa activity khác
5. Last-write-wins → User A hoặc B mất thay đổi

## Evidence

- `service.py` có `update()` nhưng không có version field check
- `docs/06_ai_roadmap.md` section 3 không nói về stale patch handling
- No `day.version` hoặc `trip.version` field
- Đã có `409 Conflict` cho stale state trên current source

## Recommended fix

Thêm optimistic locking:

```python
# Option A: Version field (recommended)
class TripDay(Base):
    version: int = Field(default=0)

# PUT /itineraries/{tripId}/days/{dayId}/apply-patch
# Request body includes expected_day_version
# If day.version != request.expected_version:
#     raise ConflictException("Day has been modified, please refresh and try again")
```

Hoặc:

```python
# Option B: ETag / If-Match header
# Client gửi If-Match: "<version>"
# Server validate và reject nếu không match
```

## Current disposition

Current source đã có stale detection cơ bản và persist `confirmationStatus='stale'` thật. Issue này không còn là blocker “thiếu stale handling”; follow-up còn lại chỉ là optimistic-locking sâu hơn, policy/rate-limit và UX polish nếu muốn tránh race condition tinh hơn.

## Follow-up scope only

Nếu cần làm sâu hơn, hãy mở issue riêng cho:
- trip/day version field hoặc ETag strategy
- patch-specific rate limit
- UX refresh/resolve flow khi user gặp `409`
