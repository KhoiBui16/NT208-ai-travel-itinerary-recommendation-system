## Mô tả
- Chốt checkpoint hardening cuối trước Phase `C3B`: đồng bộ destination slug/backend truth, sửa drift ở `CityDetail`, `TripHistory`, `TripLibrary`, `ItineraryView`, và sync docs active theo current source.
- Task ID: `#00098`

## Thay đổi chính
- [x] Dùng backend slug/backend detail làm source of truth cho destination list/detail.
- [x] Sửa TripHistory/TripLibrary để tính duration/status từ dữ liệu itinerary thật thay vì suy diễn từ `days[]` rỗng.
- [x] Sửa contract delete activity và accommodation price để bám đúng API/backend data.
- [x] Ổn định lại Playwright regression cũ bằng cách bỏ `networkidle` wait không phù hợp ở `TripWorkspace`.
- [x] Cập nhật reports, README, `.claude`, và tracker theo latest browser + Playwright verification.

## Cách kiểm tra (Testing)
- Bước 1: `Set-Location <repo-root>\\Backend`
- Bước 2: `uv run pytest tests\\unit\\test_place_service.py tests\\unit\\test_auth_service.py tests\\integration\\test_place_endpoints.py -q --tb=short`
- Bước 3: `Set-Location <repo-root>\\Frontend`
- Bước 4: `npm run build`
- Bước 5: `npx playwright test --reporter=list`
- Kết quả mong đợi: backend targeted tests pass (`36 passed, 1 skipped`), frontend build pass, full Playwright suite pass (`32 passed, 3 skipped`).

## Lưu ý khác
- Không có migration mới.
- Không thêm env key mới.
- Scope này chưa implement `C3B`; đây là nhánh hardening để merge xong mới tách phase `C3B`.
