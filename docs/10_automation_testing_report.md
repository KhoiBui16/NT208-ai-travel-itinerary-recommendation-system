# 10. Báo Cáo Automation Testing

File này ghi trạng thái test mới nhất. Các kết quả cần được cập nhật lại mỗi khi chạy full verification mới.

## Phạm Vi Test

### Đã kiểm

| Loại test                 | Công cụ                                  | Số lượng         | Trạng thái         |
| ------------------------- | ---------------------------------------- | ---------------- | ------------------ |
| Backend lint              | `ruff check`                             | —                | Pass               |
| Backend format            | `ruff format --check`                    | —                | Pass               |
| Backend migration         | `alembic upgrade head` + `alembic check` | —                | Pass               |
| Backend unit tests        | `pytest tests/unit/`                     | **97 tests**     | Pass               |
| Backend integration tests | `pytest tests/integration/`              | **44 collected** | 43 pass, 1 fail (test pollution) |
| Backend Docker API health | HTTP health check                        | 1 check          | Pass               |
| Frontend production build | `vite build`                             | —                | Pass               |
| Frontend e2e tests        | Playwright (Chromium)                    | **13 tests**     | Pass               |
| Full-stack API smoke      | `test_fullstack_smoke.ps1`               | 16 flows         | Pass               |
| AI browser smoke          | Playwright + real local Gemini key       | 1 generated trip | Pass               |

**Tổng current branch (feat/00047): 97 BE unit tests + 44 BE integration tests + 13 FE e2e tests.**

> **2026-05-27 full system test:** 97 unit pass, 43/44 integration pass (1 fail — test pollution), 13 FE e2e pass.

### Không kiểm ở giai đoạn này

- AI direct generation real-provider chỉ kiểm local/manual vì CI dùng dummy key và mock external calls.
- AI companion chat vì chưa implement.
- Analytics EP-34 vì chưa bật.
- Trip workspace drag-and-drop (chưa có e2e test cho tính năng này).
- Calendar modal interaction (phức tạp, cần viết test riêng).
- Visual regression testing.

### AI browser smoke 2026-05-25

- FE: `http://localhost:5173`
- BE: `http://localhost:8020`
- Flow: authenticated `CreateTrip` → `POST /api/v1/itineraries/generate` → `/trip-workspace?tripId=129`
- Result: API `201 Created`, generated trip rendered in workspace, 5 activities for the generated day, no browser console errors.
- Extra check: reopening `/trip-workspace?tripId=129` after `useTripSync` fix triggers a single `GET /api/v1/itineraries/129`.

## Automation Commands

### Backend

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -q --tb=short
$env:CI="true"; uv run pytest tests/integration/ -q --tb=short
```

### Frontend

```powershell
cd Frontend
npm run build           # Production build
npm run test:e2e        # Playwright e2e (cần BE chạy trên localhost:8000)
npm run test:e2e:headed # Chạy e2e với browser hiển thị
```

### Full-stack smoke

```powershell
.\scripts\test_fullstack_smoke.ps1
```

Sandbox-friendly variant (bỏ qua FE build):

```powershell
.\scripts\test_fullstack_smoke.ps1 -SkipFrontendBuild
```

## Playwright E2E Tests (PR #31)

### Cấu hình

- **Config file**: `Frontend/playwright.config.ts`
- **Base URL**: `http://localhost:5173`
- **Browser**: Chromium only
- **Timeout**: 30 giây
- **Retries**: 0 (local), 2 (CI)
- **WebServer**: Tự động start `npm run dev` nếu chưa chạy

### Test suites

**Auth flow (3 tests):**

| Test                                                 | Mô tả                                                            | Kết quả |
| ---------------------------------------------------- | ---------------------------------------------------------------- | ------- |
| register → success → redirect home                   | Điền form register, submit, redirect `/`                         | Pass    |
| login → success → redirect home                      | Register qua API, login qua UI, redirect `/`                     | Pass    |
| protected route → redirect login → login → show page | Access protected route → redirect login → login → access granted | Pass    |

**Trip CRUD (3 tests):**

| Test                                | Mô tả                                         | Kết quả |
| ----------------------------------- | --------------------------------------------- | ------- |
| create trip → navigate to workspace | Tạo trip qua API, navigate TripWorkspace      | Pass    |
| view trip list in TripLibrary       | Tạo trip qua API, mở TripLibrary, verify card | Pass    |
| delete trip from TripHistory        | Tạo trip qua API, mở ItineraryView, xóa       | Pass    |

**Public pages (5 tests):**

| Test                       | Mô tả                                   | Kết quả |
| -------------------------- | --------------------------------------- | ------- |
| home page loads            | Verify `/` trả banner                   | Pass    |
| login page loads           | Verify heading "Chào mừng bạn trở lại!" | Pass    |
| register page loads        | Verify heading "Đăng Ký"                | Pass    |
| forgot-password page loads | Verify URL đúng                         | Pass    |
| not-found page             | Verify heading "404"                    | Pass    |

### Test helpers

File `tests/e2e/helpers/auth.ts` cung cấp:

- `apiRegister(email, password, name)` — Đăng ký user qua BE API
- `apiLogin(email, password)` — Đăng nhập qua BE API
- `injectAuth(page, accessToken, refreshToken)` — Inject JWT vào localStorage
- `loginAs(page, email, password, name)` — Full register + inject flow

### CI integration

Job `frontend-e2e` trong `.github/workflows/frontend-ci.yml`:

1. Start PostgreSQL + Redis containers
2. Install BE + run migrations + start BE server
3. Install FE + Playwright browsers
4. Run `npx playwright test` với `E2E_API_URL=http://localhost:8000`
5. Upload Playwright report artifact khi fail

## Kịch Bản Full-Stack Smoke

Script `scripts/test_fullstack_smoke.ps1` kiểm 16 luồng HTTP thật:

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

- Auth token lifecycle (register, login, refresh, logout, forgot/reset password).
- User profile/password CRUD.
- Trip create/list/get/update/delete + nested day/activity/accommodation.
- Owner-only guard trên integer trip ID.
- Share token public read.
- Guest claim token (one-time, hash, expiry, consume-once).
- Places public endpoints + saved places CRUD.
- Rating/feedback.

### Lỗi đã bắt và fix

| PR  | Lỗi                                                                    | Fix                                                                       |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| #7  | `PUT /users/profile` trả 500 `MissingGreenlet` sau update timestamp    | `UserRepository.update()` gọi `session.refresh(user)` sau `flush()`       |
| #7  | `POST /itineraries` có Bearer vẫn tạo guest trip                       | Thêm `oauth2_optional_scheme` với `auto_error=False`                      |
| #7  | `PUT /itineraries/{tripId}` response không có `days` sau nested update | `TripRepository.get_with_full_data()` dùng `populate_existing=True`       |
| #24 | `get_current_user_optional` không extract Bearer token từ header       | Thêm `_optional_token(request)` dependency đọc Authorization header       |
| #24 | `update_profile(user: User)` truyền ORM object qua session boundary    | Đổi sang `update_profile(user_id: int)` và re-fetch trong service session |
| #24 | SQLAlchemy Identity Map cache stale sau `flush()`                      | Thêm `session.expire_all()` trước re-fetch                                |
| #24 | Lazy relationship access trigger `MissingGreenlet` trên fresh Activity | Thêm `_activity_to_schema()` static method thay `model_validate()`        |
| #27 | TripLibrary dùng sai field names (`trip.name`, `trip.estimatedCost`)   | Sửa thành `trip.tripName`, `trip.totalCost ?? trip.budget`                |
| #27 | CreateTrip gọi sai API (`createItinerary` thay vì `generateItinerary`) | Sửa API call + field names (`adults`/`children`)                          |
| #28 | OTPModal block tất cả registration (random OTP không gửi email)        | Bypass OTP, gọi `register()` API trực tiếp                                |

## Cách Đánh Giá Pass/Fail

Pass khi:

- Lint/format pass.
- Alembic upgrade/check pass.
- Unit tests (97) và integration tests (44) pass.
- FE build pass.
- FE e2e tests (13) pass.
- BE health pass.
- Full-stack smoke không throw exception.

Fail nếu:

- Bất kỳ command trả exit code khác 0.
- API smoke không tạo/update/share/claim được trip.
- FE smoke không trả HTTP 200 hoặc thiếu root div.
- Playwright test fail (timeout, assertion, strict mode violation).

## Cập Nhật Kết Quả

| Ngày       | Branch                                        | BE unit | BE integration | BE e2e | Migration   | FE build | FE e2e  | Smoke | Ghi chú                                           |
| ---------- | --------------------------------------------- | ------- | -------------- | ------ | ----------- | -------- | ------- | ----- | ------------------------------------------------- |
| 2026-05-03 | `docs/00006-d-docs-cleanup`                   | 66 pass | 42 pass        | —      | pass        | pass\*   | —       | pass  | \*sandbox rerun blocked by esbuild `spawn EPERM`  |
| 2026-05-04 | `main` (post-merge #10-#14)                   | 66 pass | 42 pass        | —      | pass        | pass     | —       | —     | FE-BE integration hoàn thành                      |
| 2026-05-04 | `fix/00020-b1-password-reset-endpoints`       | 73 pass | 42 pass        | —      | pass (0003) | pass     | —       | —     | Password reset: 7 unit tests mới                  |
| 2026-05-04 | `fix/00024-b2-missing-greenlet-optional-auth` | 75 pass | 42 pass        | —      | pass        | pass     | —       | —     | Fix 4 critical async session bugs                 |
| 2026-05-05 | `feat/00031-b3-playwright-e2e`                | 75 pass | 42 pass        | —      | pass        | pass     | 11 pass | —     | Playwright e2e setup + .claude/ audit + docs sync |
| 2026-05-25 | `feat/00041-c-generate-pipeline` (merged #42) | 93 pass | 42 collected (36 pass, 6 skip) | — | pass | pass | 11 pass | pass (AI smoke) | C.1 generate pipeline + Goong ETL |
| 2026-05-26 | `fix/00044-c-stabilize-c1-guest-flow`         | 93 pass | 42 pass        | —      | pass        | pass     | 13 pass | pass  | Guest claim reload fix + 2 e2e mới |
| 2026-05-26 | `feat/00047-c-suggestion-service` (review_ready) | **97 pass** | **44 pass** | — | pass | pass (không re-run) | — | C.2 EP-30 DB-only suggest; không đổi FE UI |
| 2026-05-27 | `main` (local, uncommitted) | 97 pass | 43 pass, 1 fail (test pollution) | 13 pass | pass | pass (dist_ci/) | 13 pass | pass | Full system test: CRUD smoke, rate limit security analysis, destination slug fix |
| 2026-05-27 | `docs/00048-d-system-test-fixes` | 97 pass | 43 pass, 1 fail (test pollution) | 13 pass | pass | pass (dist_ci/) | 13 pass | pass | Task 00048: full CRUD API smoke, rate limit UA bypass confirmed, guest trip no-limit confirmed, destination slug mismatch (ha-noi vs ha-n-i in DB) |

## Async Session Lifecycle Patterns

Các bug PR #24/#7 có chung root pattern: SQLAlchemy async session lifecycle. Ghi lại để tránh lặp:

1. **Không truyền ORM object qua session boundary**: `get_current_user` tạo User trong session A (request-scoped), service dùng session B. Truyền `user.id` và re-fetch trong service.

2. **`flush()` ≠ `refresh()`**: `flush()` write SQL nhưng không reload Python object. Gọi `session.refresh(obj)` để load server-generated columns (id, timestamps, defaults).

3. **`expire_all()` trước re-fetch**: SQLAlchemy Identity Map cache object state sau `flush()`. Nếu update nested relations rồi re-fetch, gọi `session.expire_all()` trước để query fresh data.

4. **Lazy relationship ngoài eager-load context**: `model_validate(orm_obj, from_attributes=True)` trigger `MissingGreenlet` trên lazy-loaded attrs. Build schema từ scalar fields, default lazy collections thành `[]`.
