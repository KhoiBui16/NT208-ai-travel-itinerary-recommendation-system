# ISSUE: Guest Trip Không Bị Giới Hạn Số Lượng

**Ngày phát hiện:** 2026-05-27  
**Severity:** Low  
**Status:** Open  
**Phát hiện bởi:** Kiro Agent (system test 2026-05-27)

---

## Mô tả

Authenticated user bị giới hạn tối đa `MAX_ACTIVE_TRIPS = 5` trips đang hoạt động. Guest user không bị giới hạn — có thể tạo vô số trips.

## Root Cause

Trong `ItineraryService.create_trip()`, kiểm tra trip limit chỉ áp dụng khi `user_id` không phải `None`:

```python
if user_id is not None:
    active_count = await self.repo.count_active_by_user(user_id)
    if active_count >= settings.max_active_trips:
        raise ConflictException("Trip limit reached")
# Guest: không check → tạo thoải mái
```

## Bằng chứng thực tế (2026-05-27)

```powershell
# Tạo 6 guest trips liên tiếp (auth user bị block ở trip 6)
POST /itineraries (no auth) → 201
POST /itineraries (no auth) → 201
POST /itineraries (no auth) → 201
POST /itineraries (no auth) → 201
POST /itineraries (no auth) → 201
POST /itineraries (no auth) → 201  # Không bị block!
```

## Impact

| Yếu tố | Đánh giá |
|---|---|
| Exploitability | Dễ — không cần auth |
| Impact | Low-Medium — tốn DB storage, không lộ data |
| Scope | Guest only |
| Severity | **Low** |

### Tác động cụ thể

- DB có thể bị fill bởi orphan guest trips (không có user_id)
- Mỗi guest trip tạo `guest_claim_tokens` row (expires 24h)
- Sau 24h, claim token hết hạn nhưng trip vẫn còn trong DB
- Không có cleanup job cho orphan guest trips

## Giải pháp đề xuất

### Option 1: Giới hạn guest trips theo IP (đơn giản)
```python
# Trong service
if user_id is None:
    guest_ip = request.client.host
    guest_count = await self.repo.count_recent_guest_trips_by_ip(guest_ip)
    if guest_count >= settings.max_guest_trips_per_ip:  # e.g., 3
        raise ConflictException("Guest trip limit reached. Please register.")
```

### Option 2: Cleanup job cho orphan guest trips
- Cron job xóa guest trips có `claim_token.expires_at < now()` và `user_id IS NULL`
- Giảm DB bloat

### Option 3: Giới hạn tổng số guest trips trong DB
- Nếu tổng guest trips > threshold → từ chối tạo mới
- Đơn giản nhưng không fair

## Workaround hiện tại

Không có. Guest trips tích lũy trong DB.

## Files liên quan

- `Backend/src/itineraries/service.py` — `create_trip()` method
- `Backend/src/itineraries/repository.py` — `count_active_by_user()`
- `Backend/src/core/config.py` — `max_active_trips` setting

## Liên kết

- Xem thêm: `docs/REPORTS/ISSUES/guest_rate_limit_ua_bypass.md`
- Test report: `docs/REPORTS/phase_full_system_test_2026_05_27.md`
