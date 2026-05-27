# Issue: Integration Test Pollution — Trip Limit 409

**Ngày phát hiện:** 2026-05-27  
**Severity:** Low  
**Status:** TO DO  
**Phase:** B2 / Test Infrastructure

## Mô tả

`test_create_trip__auth_user__returns_201` fail với **409 Conflict** khi chạy trên DB local đã có data.

## Root Cause

Test dùng hardcoded email `trip_test@test.com` và không cleanup trips sau mỗi lần chạy. Khi user này đã đạt `MAX_TRIPS_PER_USER` (giới hạn số trips), tạo thêm bị 409.

```python
# test_itinerary_endpoints.py
def test_create_trip__auth_user__returns_201(client: TestClient) -> None:
    token = _get_auth_token(client, "trip_test@test.com", "password123", "Trip Tester")
    response = client.post("/api/v1/itineraries", ...)
    assert response.status_code == 201  # FAIL: 409 khi user đã có quá nhiều trips
```

## Impact

- Chỉ fail trên DB local đã có data từ nhiều lần chạy test
- CI với DB sạch vẫn pass
- Không phải bug trong production code

## Fix đề xuất

Option A: Thêm cleanup trong test fixture — xóa trips của `trip_test@test.com` trước khi test.

Option B: Dùng unique email mỗi lần chạy (timestamp-based).

Option C: Tăng `MAX_TRIPS_PER_USER` trong test config.

## Workaround hiện tại

Chạy với `CI=true` trên DB sạch (GitHub Actions) — test pass.

Local: Xóa trips của `trip_test@test.com` trong DB trước khi chạy integration tests.
