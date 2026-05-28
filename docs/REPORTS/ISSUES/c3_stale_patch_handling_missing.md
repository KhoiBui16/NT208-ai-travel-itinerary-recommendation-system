# Issue: Stale Patch Handling Missing in C3 Design

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: HIGH
**Status**: OPEN
**Related**: `docs/REPORTS/phase_c3_design_readiness.md`

## Problem

Khi C3 apply-patch endpoint được implement, C3 design hiện tại không có mechanism để reject stale patches.

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
- No 409 Conflict response cho stale state

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

## Does not block

C3 implementation có thể bắt đầu mà không có stale handling, nhưng production sẽ có race condition risk.

## No action in this audit branch

This is an audit-only branch. Fix sẽ được implement trong feature branch riêng.