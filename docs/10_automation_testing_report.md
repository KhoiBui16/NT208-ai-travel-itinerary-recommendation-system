# 10. Báo Cáo Automation Testing

File này ghi trạng thái test mới nhất cho nhánh docs cleanup. Các kết quả cần được cập nhật lại mỗi khi chạy full verification mới.

## Phạm Vi Test

Đã kiểm:

- Backend lint/format.
- Backend migration.
- Backend unit tests.
- Backend integration tests.
- Backend Docker API health.
- Frontend production build.
- Frontend dev server smoke.
- Full-stack API smoke cho CRUD chính.

Không kiểm ở giai đoạn này:

- AI direct generation thật vì chưa implement.
- AI companion chat vì chưa implement.
- Analytics EP-34 vì chưa bật.
- Full browser e2e bằng Playwright/Cypress vì repo chưa có runner.
- Full ETL real data vì chưa có `GOONG_API_KEY`.

## Automation Commands

Backend:

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -q --tb=short
$env:CI="true"; uv run pytest tests/integration/ -q --tb=short
```

Frontend:

```powershell
cd Frontend
npm run build
```

Full-stack smoke:

```powershell
.\scripts\test_fullstack_smoke.ps1
```

Sandbox-friendly variant đã dùng trong lượt cuối:

```powershell
.\scripts\test_fullstack_smoke.ps1 -SkipFrontendBuild
```

## Kịch Bản Full-Stack Smoke

Script `scripts/test_fullstack_smoke.ps1` kiểm các luồng sau qua HTTP thật:

1. `GET /api/v1/health` trả healthy.
2. `POST /api/v1/auth/register` tạo user mới.
3. `GET /api/v1/users/profile` đọc profile bằng Bearer token.
4. `PUT /api/v1/users/profile` update profile.
5. `POST /api/v1/itineraries` tạo manual trip authenticated.
6. `PUT /api/v1/itineraries/{tripId}` update nested day/activity/accommodation.
7. `GET /api/v1/itineraries/{tripId}` đọc trip owner-only.
8. `GET /api/v1/itineraries` list trip owner.
9. `POST /api/v1/itineraries/{tripId}/share` tạo `shareToken`.
10. `GET /api/v1/shared/{shareToken}` public read trip.
11. `PUT /api/v1/itineraries/{tripId}/rating?rating=5` lưu rating.
12. `POST /api/v1/itineraries` guest tạo trip và nhận `claimToken`.
13. `POST /api/v1/itineraries/{guestTripId}/claim` claim guest trip.
14. `GET /api/v1/places/destinations` chạy places endpoint.
15. `GET /api/v1/places/search?limit=5` chạy place search endpoint.
16. `GET http://localhost:5173/` trả 200 và có `id="root"`.

## Nhận Xét Về CRUD Backend

Đã ổn ở mức API/service test:

- Auth token lifecycle.
- User profile/password.
- Trip create/list/get/update/delete.
- Owner-only guard trên integer trip ID.
- Share token public read.
- Guest claim token.
- Places public endpoints.
- Saved places service/integration.

Lỗi đã bắt được bằng live smoke và đã fix trong branch này:

- `PUT /api/v1/users/profile` từng trả 500 `MissingGreenlet` vì `updated_at` bị lazy refresh sau async update. Fix: `UserRepository.update()` gọi `session.refresh(user)` sau `flush()`.
- `POST /api/v1/itineraries` có Bearer token từng vẫn tạo guest trip vì optional auth dependency không đọc OAuth2 token. Fix: thêm `oauth2_optional_scheme` với `auto_error=False`.
- `PUT /api/v1/itineraries/{tripId}` từng trả response không có `days` ngay sau nested update vì relation trong identity map bị stale. Fix: `TripRepository.get_with_full_data()` dùng `populate_existing=True`.

Cần cải thiện khi nối FE thật:

- FE auto-save nested trip cần e2e browser test — **đã nối API qua useTripSync, useActivityManager, useAccommodation**.
- FE auth token storage/refresh đã integrate thật với API client — **AuthContext + services/api.ts**.
- Accommodation hiện có add/delete endpoint và nested sync, chưa có endpoint update riêng.
- Extra expenses chưa có endpoint CRUD riêng nếu FE cần chỉnh độc lập.
- Generate vẫn là stub, không test AI quality.

## Cách Đánh Giá Pass/Fail

Pass khi:

- Lint/format pass.
- Alembic upgrade/check pass.
- Unit và integration tests pass.
- FE build pass.
- BE health pass.
- Full-stack smoke không throw exception.

Fail nếu:

- Bất kỳ command trả exit code khác 0.
- API smoke không tạo/update/share/claim được trip.
- FE smoke không trả HTTP 200 hoặc thiếu root div.

## Cập Nhật Kết Quả

Khi chạy test mới, cập nhật mục này:

| Ngày | Branch | Backend unit | Backend integration | Migration | FE build | Smoke | Ghi chú |
|---|---|---|---|---|---|---|---|
| 2026-05-03 | `docs/00006-d-docs-cleanup` | 66 passed | 42 passed | passed | passed earlier; sandbox rerun blocked by esbuild `spawn EPERM` | passed | Full smoke pass với `-SkipFrontendBuild`; FE source không đổi sau build pass trước đó |
| 2026-05-04 | `main` (post-merge #10-#14) | 66 passed | 42 passed | passed | passed | — | FE-BE integration hoàn thành; 30 endpoints, 8 protected routes, API client layer + optimistic CRUD |

## Kết Quả Chi Tiết 2026-05-03

Pass:

- `uv run ruff check src tests`
- `uv run ruff format --check src tests`
- `uv run alembic upgrade head`
- `uv run alembic check`
- `uv run pytest tests/unit/ -q --tb=short -p no:cacheprovider`: 66 passed.
- `uv run pytest tests/integration/ -q --tb=short -p no:cacheprovider`: 42 passed.
- `scripts/test_fullstack_smoke.ps1 -SkipFrontendBuild`: passed.
- `docker compose ps`: API running, DB healthy, Redis healthy.
- FE HTTP smoke: http://127.0.0.1:5173 trả 200 và có root div.

Ghi chú:

- `npm run build` đã pass trong lượt test trước cùng ngày, trước khi sửa BE; từ đó không đổi source FE.
- Khi rerun trong sandbox, Vite/esbuild bị Windows sandbox chặn process spawn với `spawn EPERM`; đây là môi trường chạy lệnh, không phải lỗi source FE mới.
- Frontend build vẫn cần CI/GitHub Actions xác nhận lại vì CI chạy Linux không bị sandbox Windows này.
