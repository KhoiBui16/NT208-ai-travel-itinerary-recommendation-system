# 09. Execution Tracker

Tracker này thay thế `plan/17_execution_tracker.md` sau khi dọn repo. Mỗi branch phải cập nhật dòng tương ứng trước khi chuyển sang review.

| Task ID | Phase | Branch | Scope | Status | Local verify | PR |
|---|---|---|---|---|---|---|
| 00000 | A | `feat/00000-a-foundation-bootstrap` | Backend foundation bootstrap | merged | passed | #1 |
| 00001 | B1 | `feat/00001-b1-auth-users` | Auth + users endpoints | merged | passed | #2 |
| 00002 | B2 | `feat/00002-b2-itineraries` | Itinerary CRUD/share/claim/rating | merged | passed | #3 |
| 00003 | B3 | `feat/00003-b3-places-cache` | Places, destinations, saved places, Redis cache | merged | passed | #4 |
| 00004 | D | `feat/00004-d-etl-pipeline` | ETL extract/transform/load foundation | merged | passed | #5 |
| 00005 | D | `fix/00005-d-etl-backend-readiness` | ETL schema, local readiness, CI frontend build | merged | passed | #6 |
| 00006 | D | `docs/00006-d-docs-cleanup` | Dọn legacy docs, mở rộng docs FE/BE/phase/test, thêm full-stack smoke script, fix lỗi CRUD bắt được khi smoke | merged | passed | #7 |
| 00007 | B3 | `fix/00007-b3-fe-api-fixes` | Nối FE localStorage còn sót sang BE API, cập nhật README/tracker | merged | FE build pass | #8 |
| 00008 | B3 | `fix/00008-b3-fe-auth-itinerary-api` | Thay utils/auth mock bằng API thật, useTripSync dùng BE auto-save | merged | FE build pass | #9 |
| 00009 | B2/B3 | `feat/00009-b2-fe-integration` | FE integration — TripWizardContext, API+mock fallback, share/claim flow, ProtectedRoute | merged | FE build pass | #10 |
| 00010 | B2/B3 | `feat/00010-b2-crud-api-wiring` | Wire activity/accommodation CRUD API, places search debounce, city detail BE integration | merged | FE build pass | #11 |
| 00011 | B2/B3 | `fix/00011-b2-crud-wiring-hotfix` | resolveTimeConflicts in addActivityToDay, remove unused imports, fix duplicate updateNextId | merged | FE build pass | #12 |
| 00012 | B2/B3 | `fix/00012-b2-createtrip-api-docs-sync` | Wire CreateTrip to createItinerary API, sync docs với actual FE-BE status | merged | FE build pass | #13 |
| 00013 | B2/B3 | `fix/00013-b2-createtrip-api-docs-sync` | Wire CreateTrip to createItinerary API, sync docs với actual FE-BE status | merged | FE build pass | #13 |
| 00014 | B2/B3 | `fix/00014-b2-docs-errorboundary` | Fix outdated docs (CreateTrip status), add ErrorBoundary, update tracker | merged | FE build pass | #14 |
| 00015 | D | `docs/00015-d-update-docs-readme` | Update docs and README with actual FE-BE integration status, team, endpoint count | merged | FE build pass | #16 |
| 00019 | B2 | `fix/00019-b2-itineraryview-share-button` | Add share button to ItineraryView with share link display + copy | merged | FE build pass | #19 |
| 00020 | B1 | `fix/00020-b1-password-reset-endpoints` | Forgot/reset password BE endpoints + FE wiring + email service | merged | 117 BE tests pass, FE build pass | #20 |
| 00024 | B2 | `fix/00024-b2-missing-greenlet-optional-auth` | Fix 4 critical MissingGreenlet + optional auth bugs in BE | merged | 117 BE tests pass | #24 |
| 00027 | B2 | `fix/00027-b2-fe-be-contract-gaps` | Fix FE-BE contract gaps — TripLibrary fields, CreateTrip generateItinerary | merged | FE build pass | #27 |
| 00028 | B2 | `fix/00028-b2-register-otp-bypass` | Bypass client-side OTP placeholder in Register flow | merged | FE build pass | #28 |
| 00031 | B3 | `feat/00031-b3-playwright-e2e` | Setup Playwright e2e tests, audit .claude/ operational files, đồng bộ docs/ | pending | 11/11 e2e pass, 117 BE tests pass, FE build pass | #31 |
| 00040 | C | `feat/00040-c-goong-etl-readiness` | Goong-first ETL readiness, place metadata migration, extractor/client tests | ready_for_pr | BE lint/format/unit/integration/migration pass; real Goong ETL Hà Nội loaded 60 places + 3 hotels | pending |
| 00041 | C | `feat/00041-c-generate-pipeline` | C.1 AI generate pipeline with DB recommendation context, Gemini structured JSON, user/guest AI quota | merged | BE lint/format/unit/integration/migration pass; FE build pass; Playwright 11/11 pass; browser AI smoke 1-day 201 and workspace loads generated trip | #42 |
| 00043 | D | `docs/00043-d-post-merge-audit-reporting` | Post-merge smoke, README/docs sync, source-plan review skill, browser evidence | merged | BE checks pass, FE e2e pass, smoke + screenshots captured | #43 |
| 00044 | C | `fix/00044-c-stabilize-c1-guest-flow` | Guest claim reload redirect fix, FE audit cleanup, C1 stabilization | blocked_ci | Local BE/FE verification pass; GitHub Actions failed before checkout due repo/account 403 | pending |
| 00045 | C | `fix/00045-c-restage-c1-guest-flow` | Clean restage branch for PR44 changes from `main` | ready_for_pr | Cherry-picked from 00044 cleanly, branch pushed to origin | pending |
| 00046 | D | `docs/00046-d-phase-c-audit-sync` | Audit remaining Phase C scope, branch strategy, env/key readiness | in_progress | Source-plan-docs audit in progress | pending |


## Scope Task 00006

Đã làm trong branch:

- Dọn legacy docs/folder khỏi workflow active.
- Chuyển tài liệu chính sang `docs/`.
- Mở rộng docs cho overview, architecture, Backend, Frontend, DB/ETL, workflow/CI, local testing.
- Không tạo docs AI như tính năng đã hoàn thành; AI chỉ ghi pending.
- Giữ nguyên `asserts/videos/MVP#1_Demo.mp4`.
- Thêm `scripts/test_fullstack_smoke.ps1` để automation smoke BE/FE.
- Cập nhật README team role: `Leader - Backend - AI`.
- Fix `PUT /users/profile` bị `MissingGreenlet` sau update server-side timestamp.
- Fix optional auth cho `POST /itineraries` để authenticated create không bị tạo như guest.
- Fix response nested itinerary update đọc stale relation trong cùng async session.
- Xoá `docs/README.md` — nội dung merge vào `docs/01_overview.md`.
- Cập nhật root `README.md` thêm Quick Start, Docker vs Local table, FE-BE Integration Gap.
- Tạo API client layer (`Frontend/src/app/services/`): `api.ts` (fetch wrapper + JWT auto-refresh), `auth.ts`, `itinerary.ts`, `places.ts`, `users.ts`.
- Tạo `AuthContext` (`Frontend/src/app/contexts/AuthContext.tsx`) quản lý JWT state, user profile, login/logout/register.
- Tạo `ProtectedRoute` (`Frontend/src/app/components/ProtectedRoute.tsx`) cho protected routes.
- Nối FE-BE: Login, Register, Account, TripLibrary, SavedPlaces, ManualTripSetup, Header, usePlacesManager — thay localStorage bằng API calls.
- Cập nhật `docs/04_frontend.md` với API integration status.
- 108 BE tests pass (66 unit + 42 integration). FE build pass.

## Scope Task 00009 (PR #10)

- Tạo `TripWizardContext` thay 6 sessionStorage keys cho wizard flow (destinations, allocations, travelers, budget).
- Nối `useTripSync` dùng BE API (`getItinerary`, `createItinerary`, `updateItinerary`, `claimItinerary`).
- Nối `AuthContext` claim flow: `storePendingClaim` + `executePendingClaim` cho guest→owner.
- Nối `SharedTripView` dùng `getSharedItinerary` API.
- Nối `Profile` dùng `updateProfile` API.
- Nối `ItineraryView` dùng `getItinerary`, `rateItinerary`, `updateItinerary`, `deleteItinerary` API.
- Nối `TripHistory` dùng `listItineraries`, `updateItinerary`, `deleteItinerary` API.
- Nối `SavedItineraries` dùng `listItineraries`, `deleteItinerary` API.
- `sessionStorage("currentTrip")` chỉ còn làm quick-restore cache, không phải primary data source.

## Scope Task 00010 (PR #11)

- `useActivityManager`: Thêm `tripId` param, wire `deleteActivity`/`updateActivity`/`addActivity` API với optimistic update + revert.
- `useAccommodation`: Thêm `tripId` param, wire `addAccommodation`/`deleteAccommodation` API với optimistic update + revert.
- `usePlacesManager`: Thêm `tripId` param, debounced `searchPlaces()` API (300ms), `addActivity` API trong `handleAddSuggestionToItinerary`.
- `useTripSync`: Expose `currentTripId` state (song song ref) để hooks khác nhận tripId sau khi tạo itinerary mới.
- `CityDetail`: Gọi `getDestinationDetail()` API, hiển thị API places, fallback mock.
- `TripWorkspace`: Truyền `tripId` đến cả 3 hook, dùng `addActivityToDay` thay `setDays` trực tiếp.

## Scope Task 00011 (PR #12)

- Fix `resolveTimeConflicts` missing trong `addActivityToDay`.
- Remove unused imports: `Share2` (CityDetail), `Calendar`/`CalendarDays` (TripWorkspace).
- Remove duplicate `updateNextId` trong TripWorkspace.
- Remove unused `handleDeleteAccommodation` destructure.
- Add `setCurrentTripId` vào useEffect dependency array.

## Scope Task 00013 (PR #13)

- Wire `CreateTrip` page to `createItinerary` API thay vì mock navigation.
- Map budget level/travel type sang BE-accepted params (budget, adultsCount, childrenCount).
- Navigate to `/trip-workspace?tripId={resp.id}` sau khi tạo thành công.
- Sync docs với actual FE-BE status.

## Scope Task 00014 (PR #14)

- Fix docs outdated: CreateTrip status từ "Chưa nối API" thành "Done".
- Thêm `ErrorBoundary` component bọc toàn app cho graceful crash recovery.
- Update tracker với PR #13 scope.

## Scope Task 00015 (PR #16)

- Cập nhật toàn bộ docs/ và README.md cho đúng thực tế code sau PRs #10-#14.
- Số liệu: 32 endpoints, 8 protected routes, 117 tests, team 3 thành viên.
- FE-BE integration table 16 hàng, xoá claim localStorage cũ.
- Thêm TripWizardContext, useTripSync, ErrorBoundary vào docs.

## Scope Task 00019 (PR #19)

- Thêm share button vào `ItineraryView.tsx` với share link display + copy.
- Import `Share2`, `Copy` icons, `shareItinerary` API.
- Thêm state `shareLink`, `isSharing` và handlers `handleShare`, `handleCopyLink`.
- Share button chỉ hiện khi `isAuthenticated`.
- Share link bar với nút Sao chép và Đóng (pattern giống `TopActionBar`).

## Scope Task 00020 (PR #20)

- Alembic migration `20260504_0003`: thêm `password_reset_token_hash`, `password_reset_expires_at` vào `users`.
- `User` model: thêm 2 field mới.
- `security.py`: thêm `create_password_reset_token()` utility.
- `config.py`: thêm `password_reset_token_expire_hours`, SMTP config.
- `config.yaml`: thêm `auth.password_reset_token_expire_hours` và `email` section.
- `schemas/auth.py`: thêm `ForgotPasswordRequest`, `ResetPasswordRequest`.
- `email_service.py`: gửi email qua `aiosmtplib`, fallback log-to-console khi chưa có SMTP.
- `auth_service.py`: thêm `forgot_password()`, `reset_password()` methods.
- `user_repo.py`: thêm `get_by_reset_token_hash()`.
- `auth.py` router: thêm EP-31 forgot-password, EP-32 reset-password.
- `pyproject.toml`: thêm `aiosmtplib` dependency.
- 7 unit tests mới cho password reset flow.
- FE: `services/auth.ts` thêm `forgotPassword()`, `resetPassword()`.
- FE: `ForgotPassword.tsx` thay OTP mock bằng gọi API thật, hiện thông báo kiểm tra email.
- FE: `ResetPassword.tsx` trang mới nhận token từ URL param.
- FE: `routes.tsx` thêm route `/reset-password`.

## Scope Task 00024 (PR #24)

Fix 4 critical BE bugs có chung root pattern: SQLAlchemy async session lifecycle.

- **EP-9/10/11 `user_id=None`**: `get_current_user_optional` dùng `token: str | None = None` không có `Depends()`, nên FastAPI không extract Bearer token từ header. Fix: thêm `_optional_token(request: Request)` dependency đọc Authorization header.
- **EP-6 MissingGreenlet crash**: `update_profile(user: User, ...)` nhận User ORM object từ session A (get_current_user dependency) nhưng operate trong session B (service's own session). Fix: đổi sang `update_profile(user_id: int, ...)` và re-fetch user trong service session.
- **EP-12 days empty after update**: SQLAlchemy Identity Map cache stale sau `flush()`. Fix: thêm `session.expire_all()` trước re-fetch trong `ItineraryService.update()`.
- **EP-16/18 MissingGreenlet on extra_expenses**: Lazy relationship access trên fresh Activity object. Fix: thêm `_activity_to_schema()` static method thay `ActivitySchema.model_validate()` + `session.refresh()` sau `flush()` trong `TripRepository`.

## Scope Task 00027 (PR #27)

- Fix TripLibrary.tsx: `trip.coverImage` → placeholder URL, `trip.name` → `trip.tripName`, `trip.estimatedCost` → `trip.totalCost ?? trip.budget`, `trip.savedLocationsCount` → count activities from `trip.days`.
- Fix CreateTrip.tsx: đổi `createItinerary()` → `generateItinerary()` với đúng field names (`adults`/`children` thay vì `adultsCount`/`childrenCount`, bỏ `tripName`).

## Scope Task 00028 (PR #28)

- Bypass client-side OTP placeholder trong Register flow.
- OTPModal so sánh `otpValue === generatedOTP` — random OTP không bao giờ gửi email, block tất cả registration.
- Comment out OTP state/handlers, gọi `register()` trực tiếp trong `handleSubmit`.
- Giữ OTPModal component file cho Phase C khi BE có email OTP.

## Scope Task 00031 (PR #31)

- Thiết lập Playwright cho Frontend e2e testing.
- Tạo `playwright.config.ts` với baseURL, webServer, Chromium config.
- Tạo 11 e2e tests trong 3 spec files: auth (3), trips (3), public pages (5).
- Tạo API auth helpers (`tests/e2e/helpers/auth.ts`) cho test setup.
- Thêm `frontend-e2e` CI job vào `frontend-ci.yml` với PostgreSQL + Redis services.
- Audit toàn bộ `.claude/` directory: loại bỏ dual-mode patterns lỗi thời, cập nhật current repo truth, đánh dấu AI invariants là Phase C, thêm frontend-e2e vào required checks.
- Đồng bộ docs/ với nội dung tiếng Việt chi tiết: endpoint tables, database schema, AI roadmap, Playwright docs.

## Còn Lại Trước Phase C

- Full ETL real data cho các city còn lại sau Hà Nội.
- Phase C AI services còn lại: C.2 suggestion, C.3 companion chat, C.4 chat history, C.5 optional analytics.
- Optional analytics EP-34 nếu cần.
- Mở rộng e2e tests: trip workspace drag-and-drop, calendar, accommodation CRUD flow.

## Scope Task 00040

- Thêm Goong REST client dùng chung: autocomplete, place detail, geocode.
- Chuẩn hóa Goong endpoints sang lowercase path theo docs.
- Chuyển ETL sang Goong-first: autocomplete/detail theo keyword category, OSM fallback khi Goong lỗi hoặc quá ít data.
- Thêm `places.external_id` và `places.raw_metadata` để lưu sanitized provider metadata, không chứa API key.
- Mở rộng `external_id` lên `varchar(512)` sau khi real Goong smoke cho thấy `place_id` dài hơn 120 ký tự.
- Upsert ưu tiên `external_id`, fallback unique `(name, destination_id)`.
- ETL CLI import đủ ORM registry để chạy ngoài FastAPI app.
- Giảm log `httpx` để tránh leak Goong key trong query string.
- Local smoke 2026-05-25: `uv run python -m src.etl --cities "Hà Nội"` load 60 places + 3 hotels, invalidate Redis cache.

## Scope Task 00041

- Tạo shared AI infra tối thiểu cho C.1: `src/agent/config.py`, `src/agent/llm.py`, prompt/schema packages.
- Tạo `src/itineraries/pipeline.py` theo by-domain: resolve destination, query DB recommendation context, gọi Gemini, validate output, persist trip.
- `POST /api/v1/itineraries/generate` thay stub bằng pipeline thật.
- Rate limit AI cho auth user và guest fingerprint; Redis down vẫn fail-closed.
- Empty-context guard: nếu destination chưa có đủ places thì trả 422 trước khi gọi Gemini.
- Prompt compact, activity pacing configurable qua `AGENT_MIN_ACTIVITIES_PER_DAY` / `AGENT_MAX_ACTIVITIES_PER_DAY` (default 5/ngày).
- FE không đổi UI/UX; dùng service layer hiện có.
- Local smoke 2026-05-25: generate 1 ngày pass với timeout default 30s; generate 3 ngày pass khi `.env` local set `AGENT_TIMEOUT_SECONDS=60`.
- Sau pacing configurable default `5-5`, generate output phải có đúng 5 activities/ngày.
- Added structured AI debug logs for context size, prompt size, Gemini duration, validation retries, and persist summary.
- Browser investigation 2026-05-25: fixed guest pending-claim storage, login return URL with query string, and generated accommodation cost fallback when `hotel` is null.
- Browser investigation 2026-05-25: fixed `useTripSync` effect loop so `TripWorkspace` loads generated trip by `tripId` with a single `GET /itineraries/{id}` instead of repeated requests.
- Browser e2e pass 11/11 sau khi bổ sung CORS origin `http://127.0.0.1:5173`.
- Authenticated browser AI smoke 2026-05-25: FE `127.0.0.1:5173` → BE `127.0.0.1:8020`, `POST /itineraries/generate` trả 201, trip 129 có 5 activities, workspace render đúng generated data.

## FE-BE Integration Status (2026-05-04)

Tất cả trang chính đã nối BE API. Xem chi tiết tại `docs/04_frontend.md`.

Tóm tắt: 33 BE core endpoints (EP-0 đến EP-32), current branch có 93 unit tests + 42 integration tests, 11 FE e2e tests, 8 protected routes, API client layer + optimistic CRUD + revert-on-failure, mock chỉ dùng fallback. 4 critical async session bugs đã fix (PR #24), FE-BE contract gaps fix (PR #27), Register OTP bypass (PR #28), Playwright e2e setup (PR #31).

## Phase C Plan (2026-05-04)

Xem chi tiết tại `docs/06_ai_roadmap.md` và `docs/02_architecture.md`.

Thứ tự ưu tiên:

1. Generate pipeline (`itinerary_pipeline.py`) — core value
2. SuggestionService (`suggestion_service.py`) — DB-only, dễ implement
3. Companion chat (`companion_service.py` + `agent.py`) — phức tạp nhất
4. Chat history (`chat_service.py` + `chat.py`) — cần khi companion hoạt động
5. Analytics EP-34 — optional
