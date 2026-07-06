## Mô tả

PR này fix lỗ hổng authorization ở nested trip subresources được phát hiện trong `00059B/00059C`. Trước fix, user sở hữu `trip_A` có thể gửi path `trip_id=trip_A.id` nhưng dùng `activity_id` hoặc `accommodation_id` của trip khác để update/delete ngoài phạm vi ownership hợp lệ.

PR title đề xuất:

`fix: [#00060] enforce nested trip subresource authorization`

## Thay đổi chính

- Thêm repository lookups ràng buộc đồng thời parent trip và nested subresource:
  - `get_activity_for_trip(activity_id, trip_id)`
  - `get_accommodation_for_trip(acc_id, trip_id)`
- Cập nhật `ItineraryService.update_activity()`, `delete_activity()`, `delete_accommodation()` để chỉ mutate nested records nếu chúng thực sự thuộc path trip
- Thêm integration regression tests cho:
  - owner success path
  - mixed-ID activity update exploit
  - mixed-ID activity delete exploit
  - mixed-ID accommodation delete exploit
  - unauthorized trip read unchanged
- Hardening một số itinerary integration tests sang fresh auth users để full local reruns không va dữ liệu cũ trong DB
- Thêm unit tests cho service layer
- Cập nhật report/index/issue để phản ánh trạng thái `RESOLVED`

## Cách kiểm tra (Testing)

Đã verify bằng local PowerShell-safe commands:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"

uv run pytest tests/unit/test_itinerary_service.py -v --tb=short -k "activity or accommodation"
$env:CI="true"
uv run pytest tests/integration/test_itinerary_endpoints.py -v --tb=short -k "mixed or own_trip or activity or accommodation"

uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
$env:CI="true"
uv run pytest tests/integration/ -v --tb=short
```

Kết quả chính:

- Before fix reproduction:
  - mixed activity update returned `200`
  - mixed activity delete followed the same vulnerable pattern and is now explicitly covered
  - mixed accommodation delete returned `204`
- After fix:
  - mixed activity update returns `404`
  - mixed activity delete returns `404`
  - mixed accommodation delete returns `404`
  - owner success paths still pass
  - full backend lint/unit/integration pass

## Lưu ý khác

- Không có thay đổi frontend trong PR này.
- Không gọi Gemini/Goong, không chạy ETL.
- Fix này giải quyết blocker ownership model trước khi qua `00060B`, nhưng chưa phải là toàn bộ go/no-go cho C3/C4.
