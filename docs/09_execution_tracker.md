# 09. Execution Tracker

Tracker này thay thế `plan/17_execution_tracker.md` sau khi dọn repo. Mỗi branch phải cập nhật dòng tương ứng trước khi chuyển sang review.

| Task ID | Phase | Branch                                        | Scope                                                                                                         | Status       | Local verify                                                                                                                                        | PR      |
| ------- | ----- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 00000   | A     | `feat/00000-a-foundation-bootstrap`           | Backend foundation bootstrap                                                                                  | merged       | passed                                                                                                                                              | #1      |
| 00001   | B1    | `feat/00001-b1-auth-users`                    | Auth + users endpoints                                                                                        | merged       | passed                                                                                                                                              | #2      |
| 00002   | B2    | `feat/00002-b2-itineraries`                   | Itinerary CRUD/share/claim/rating                                                                             | merged       | passed                                                                                                                                              | #3      |
| 00003   | B3    | `feat/00003-b3-places-cache`                  | Places, destinations, saved places, Redis cache                                                               | merged       | passed                                                                                                                                              | #4      |
| 00004   | D     | `feat/00004-d-etl-pipeline`                   | ETL extract/transform/load foundation                                                                         | merged       | passed                                                                                                                                              | #5      |
| 00005   | D     | `fix/00005-d-etl-backend-readiness`           | ETL schema, local readiness, CI frontend build                                                                | merged       | passed                                                                                                                                              | #6      |
| 00006   | D     | `docs/00006-d-docs-cleanup`                   | Dọn legacy docs, mở rộng docs FE/BE/phase/test, thêm full-stack smoke script, fix lỗi CRUD bắt được khi smoke | merged       | passed                                                                                                                                              | #7      |
| 00007   | B3    | `fix/00007-b3-fe-api-fixes`                   | Nối FE localStorage còn sót sang BE API, cập nhật README/tracker                                              | merged       | FE build pass                                                                                                                                       | #8      |
| 00008   | B3    | `fix/00008-b3-fe-auth-itinerary-api`          | Thay utils/auth mock bằng API thật, useTripSync dùng BE auto-save                                             | merged       | FE build pass                                                                                                                                       | #9      |
| 00009   | B2/B3 | `feat/00009-b2-fe-integration`                | FE integration — TripWizardContext, API+mock fallback, share/claim flow, ProtectedRoute                       | merged       | FE build pass                                                                                                                                       | #10     |
| 00010   | B2/B3 | `feat/00010-b2-crud-api-wiring`               | Wire activity/accommodation CRUD API, places search debounce, city detail BE integration                      | merged       | FE build pass                                                                                                                                       | #11     |
| 00011   | B2/B3 | `fix/00011-b2-crud-wiring-hotfix`             | resolveTimeConflicts in addActivityToDay, remove unused imports, fix duplicate updateNextId                   | merged       | FE build pass                                                                                                                                       | #12     |
| 00012   | B2/B3 | `fix/00012-b2-createtrip-api-docs-sync`       | Wire CreateTrip to createItinerary API, sync docs với actual FE-BE status                                     | merged       | FE build pass                                                                                                                                       | #13     |
| 00013   | B2/B3 | `fix/00013-b2-createtrip-api-docs-sync`       | Wire CreateTrip to createItinerary API, sync docs với actual FE-BE status                                     | merged       | FE build pass                                                                                                                                       | #13     |
| 00014   | B2/B3 | `fix/00014-b2-docs-errorboundary`             | Fix outdated docs (CreateTrip status), add ErrorBoundary, update tracker                                      | merged       | FE build pass                                                                                                                                       | #14     |
| 00015   | D     | `docs/00015-d-update-docs-readme`             | Update docs and README with actual FE-BE integration status, team, endpoint count                             | merged       | FE build pass                                                                                                                                       | #16     |
| 00019   | B2    | `fix/00019-b2-itineraryview-share-button`     | Add share button to ItineraryView with share link display + copy                                              | merged       | FE build pass                                                                                                                                       | #19     |
| 00020   | B1    | `fix/00020-b1-password-reset-endpoints`       | Forgot/reset password BE endpoints + FE wiring + email service                                                | merged       | 117 BE tests pass, FE build pass                                                                                                                    | #20     |
| 00024   | B2    | `fix/00024-b2-missing-greenlet-optional-auth` | Fix 4 critical MissingGreenlet + optional auth bugs in BE                                                     | merged       | 117 BE tests pass                                                                                                                                   | #24     |
| 00027   | B2    | `fix/00027-b2-fe-be-contract-gaps`            | Fix FE-BE contract gaps — TripLibrary fields, CreateTrip generateItinerary                                    | merged       | FE build pass                                                                                                                                       | #27     |
| 00028   | B2    | `fix/00028-b2-register-otp-bypass`            | Bypass client-side OTP placeholder in Register flow                                                           | merged       | FE build pass                                                                                                                                       | #28     |
| 00031   | B3    | `feat/00031-b3-playwright-e2e`                | Setup Playwright e2e tests, audit .claude/ operational files, đồng bộ docs/                                   | pending      | 11/11 e2e pass, 117 BE tests pass, FE build pass                                                                                                    | #31     |
| 00040   | C     | `feat/00040-c-goong-etl-readiness`            | Goong-first ETL readiness, place metadata migration, extractor/client tests                                   | ready_for_pr | BE lint/format/unit/integration/migration pass; real Goong ETL Hà Nội loaded 60 places + 3 hotels                                                   | pending |
| 00041   | C     | `feat/00041-c-generate-pipeline`              | C.1 AI generate pipeline with DB recommendation context, Gemini structured JSON, user/guest AI quota          | merged       | BE lint/format/unit/integration/migration pass; FE build pass; Playwright 11/11 pass; browser AI smoke 1-day 201 and workspace loads generated trip | #42     |
| 00043   | D     | `docs/00043-d-post-merge-audit-reporting`     | Post-merge smoke, README/docs sync, source-plan review skill, browser evidence                                | merged       | BE checks pass, FE e2e pass, smoke + screenshots captured                                                                                           | #43     |
| 00044   | C     | `fix/00044-c-stabilize-c1-guest-flow`         | Guest claim reload redirect fix, FE audit cleanup, C1 stabilization                                           | blocked_ci   | Local BE/FE verification pass; GitHub Actions failed before checkout due repo/account 403                                                           | pending |
| 00045   | C     | `fix/00045-c-restage-c1-guest-flow`           | Clean restage branch for PR44 changes from `main`                                                             | ready_for_pr | Cherry-picked from 00044 cleanly, branch pushed to origin                                                                                           | pending |
| 00046   | D     | `docs/00046-d-phase-c-audit-sync`             | Audit remaining Phase C scope, branch strategy, env/key readiness                                             | merged       | `docs/REPORTS/phase_phase_c_remaining_audit.md`                                                                                                     | #46     |
| 00047   | C     | `feat/00047-c-suggestion-service`             | C.2 DB-only SuggestionService EP-30 (BE-only, no FE UI)                                                        | merged       | 97 unit + 44 integration pass; API smoke — `docs/REPORTS/phase_c2_suggestion_service.md`                                                              | #49     |
| 00048   | D     | `docs/00048-d-system-test-fixes`              | Full system test 2026-05-27, destination slug fix, rate limit security analysis, README IP note, new ISSUES docs | merged       | 97 BE unit pass, 44/44 integration pass (sau cleanup), 13 FE e2e pass, full CRUD API smoke pass | #48     |
| 00050   | D     | `docs/00050-d-c3-c4-design-readiness-audit`    | C3/C4 design readiness audit, companion chat contract, generate pipeline hardening, ETL data coverage         | merged       | 15 FE e2e pass, docs/REPORTS phase_c3_c4_design_readiness_audit.md + data_coverage_verification.md                                            | #53     |
| 00051   | C     | `fix/00051-c-fe-error-visibility`              | FE error visibility on create-trip (destination selector backend-backed, unsupported city blocking)             | merged       | 15 FE e2e pass, destination suggestions from backend, unsupported city blocked pre-submit                                                          | #54     |
| 00056   | C     | `fix/00056-c-calendar-generate-flow-fix`       | Calendar modal + generate flow fixes, 00057 readiness contract sync                                          | ready_for_pr | 00057 test pending, 00056 test 9.3s pass, all e2e 15 PASS/3 SKIP                                                                                  | pending |
| 00057   | C     | `fix/00057-c-destination-readiness-contract`  | Backend destination readiness contract (placesCount, hotelsCount, isGenerateReady, readinessStatus) + FE advisory UX | ready_for_pr | FE build pass, 00057 test verifies warning visible + submit allowed, 00056 test passes                                                          | pending |
| 00094   | C     | `feat/00094-c-c3a-chat-session-apis`         | C3A Backend chat session REST APIs (3 endpoints), ownership enforcement, 10 unit + 14 integration tests | merged       | 148 unit + 67 integration BE tests pass; 14 e2e test files                                                                                                 | #98     |
| 00095   | C     | `feat/00095-c-c3a-fe-chat-panel`             | C3A Frontend ChatPanel component, chat.types.ts, services/chat.ts, TripWorkspace integration | merged       | FE build pass; 14 e2e test files                                                                                                                             | #99     |
| 00096   | C     | `chore/00096-c-c3a-chat-e2e-tests`          | C3A E2E tests for chat session CRUD (5 Playwright test cases)                                           | merged       | 5 e2e tests pass; BE 148 unit + 67 integration pass; FE build pass                                                                                           | #100    |
| 00097   | D     | `fix/00097-d-post-c3a-docs-sync`             | Post-merge C3A docs sync + browser verification alignment + CityDetail API-first/detail-count fix          | merged       | FE build pass; `00096` Playwright `5 passed`; `00097` Playwright `2 passed`; multi-city browser detail PASS (`Buôn Ma Thuột`, `Cần Thơ`, `Hà Nội`, `Đà Nẵng`, `TP.HCM`); real AI generate PASS with DB+Redis cross-check; active docs + reports synced | #102    |
| 00098   | D     | `fix/00098-d-code-clarity-hardening`         | Pre-C3B hardening: destination slug truth, CityDetail API-first follow-up, trip duration/status truth, delete-activity contract, docs sync | ready_for_pr | BE targeted tests `36 passed, 1 skipped`; FE build pass; full Playwright `32 passed, 3 skipped`; live browser smoke PASS cho login submit, TripHistory/TripLibrary duration truth, itinerary detail render với activity thật | pending |
| 00100   | C     | `feat/00100-c-c3b-chat-hardening`            | C3B hardening pass: runtime mock cleanup, fullstack verification refresh, docs/browser sync, README/public submission notes | review_ready | Backend full suite `199 passed, 30 skipped, 1 warning`; FE build pass; latest full Playwright recorded `33 passed, 3 skipped`; real AI generate PASS; real AI chat persistence PASS; SQL + Redis cross-check pass; bounded ETL `Châu Đốc` run proved remaining data gap | pending |
| 00107   | C     | `feat/00107-c-post-105-completion`           | Post-PR#105 completion: ETL cross-city contamination guard (`city_match`) + idempotent cleanup CLI (`src.etl.cleanup`), scheduler wired via compose profile `etl`, apply-patch rate limit riêng, C4 session rename/delete/switcher/load-more, migration 0009 `chat_sessions.title`, docs sync | merged | BE ruff/format/alembic pass; 184 unit pass + 43 integration pass / 34 CI-gated skip; FE build pass; chat e2e (00096+00099) exit 0; cleanup reassign 106 contaminated places (Huế còn đúng 2 row hợp lệ); zero-place destinations 14→9 | #106 |
| 00114   | C     | `fix/00114-c-business-uat-polish-b1-b2-b3`    | Business UAT polish (3-item P2 backlog from `00113` audit): **B1** CityDetail saved-places network storm (sync `useEffect` deps stabilized to `apiDestination`/`apiPlaces`/`isAuthenticated` + cached SavedPlace id map → toggle không refetch); **B3** `trip_days` duplicate-key race (`get_or_create_day` upsert `ON CONFLICT (trip_id, day_number) DO NOTHING` + RETURNING discriminator, thay `add_day` ở pipeline + manual + sync); **B2** Gemini 503 `ServerError` → `AI_PROVIDER_OVERLOADED` (retryable) tách khỏi timeout `AI_PROVIDER_TIMEOUT` + FE copy chính xác ("quá tải" vs "phản hồi quá lâu") | review_ready | BE ruff/format/alembic pass; **187 unit pass** (184 + 3 mới: 2 `get_or_create_day` conflict/fresh, 1 `ServerError→AI_PROVIDER_OVERLOADED`) + 43 integration pass / 34 CI-gated skip; FE build pass; B1 browser network evidence `/places/saved/list` = **1 call city-load** (trước ~128), 0 delta save/unsave/render-stress; **no SSE/WebSocket/streaming, no OOP refactor, no schema migration** | pending |
| 00119   | D     | `docs/00119-d-predeploy-goong-etl-deploy-sync` | Pre-deploy audit: Goong key model (5.4) + Render free-tier/Vercel-env caveats trong deploy guide, superseded banner `06_backend_phases.md`, sửa "9 city sparse" → 2 zero + 2 marginal | review_ready | Docs-only; 4 sub-agent audit (provider docs / ETL+DB / FE / deploy) + SQL evidence (1563/1564 goong_places, 2 zero + 2 marginal city); no runtime code change | pending |

## Scope Task 00047 (C.2)

- EP-30 `GET /api/v1/agent/suggest/{activity_id}` — owner-only, DB-only.
- Files: `suggestion_service.py`, `agent/router.py`, repo helpers, tests.
- Không sửa FE `.tsx`.
- Env: không key mới.

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
- Browser e2e pass 11/11 sau khi bổ sung CORS origin `http://localhost:5173`.
- Authenticated browser AI smoke 2026-05-25: FE `localhost:5173` → BE `localhost:8020`, `POST /itineraries/generate` trả 201, trip 129 có 5 activities, workspace render đúng generated data.

## Scope Task 00044

- Ổn định C.1 guest claim flow trước khi chuyển sang C.2/C.3.
- FE `pendingClaim` lưu thêm `returnTo=/trip-workspace?tripId={id}` để reload `/login` hoặc `/register` không mất redirect target.
- `AuthContext.login()` và `AuthContext.register()` trả về claim redirect target sau khi claim thành công.
- `Login.tsx` và `Register.tsx` điều hướng về generated workspace khi claim thành công, fallback về flow cũ nếu không có claim.
- Thêm 2 Playwright e2e tests: guest pending claim survives login reload, guest pending claim survives register reload.
- Frontend e2e tăng từ 11 lên 13 tests.
- Cập nhật Vite `6.3.5` → `6.4.2`; `npm audit` còn 0 vulnerabilities.
- CI policy local simulation pass: branch regex, PR title regex, required body sections.
- Clean worktree CI simulation pass: `npm ci && npm run build` mặc định trong `Frontend/`.
- Local browser smoke 2026-05-26: auth UI generate pass (`POST /generate=201`, trip 143, 5 activities), seeded guest claim after login reload pass (`POST /claim=200`, `GET /itineraries/144=200`).
- Guest AI generate manual smoke bị Gemini `ResourceExhausted`; track ở `docs/REPORTS/ISSUES/gemini_resource_exhausted_manual_smoke.md`.

## FE-BE Integration Status (2026-06-11)

Tất cả trang chính đã nối BE API. Xem chi tiết tại `docs/04_frontend.md`.

Tóm tắt: active backend contract hiện đã mở rộng từ C3A session CRUD sang C3B companion message flow và C4 history read-path; backend local suite gần nhất đạt `199 passed, 30 skipped, 1 warning`, FE Playwright suite là `36` test cases / `17` spec files với latest full run `33 pass / 3 skip`, 8 protected routes, API client layer + optimistic CRUD + revert-on-failure, mock chỉ còn ở các fallback/promo surfaces. Các nhánh nền trước đó đã merge cho generate/suggest/C3A, `00098` khóa pre-C3B hardening, còn `00100` đang chốt evidence thật cho chat + ETL scheduler + docs sync trước PR.

## Scope Task 00093 (BUG-BE-003 - Destination Slugify Fix)

- Tạo shared `Backend/src/core/slugify.py` — Vietnamese slugify utility hỗ trợ tiếng Việt, regex pattern chuẩn
- Places service: dùng `slugify()` cho destination resolution ("Ha Noi" → "ha-noi" → match DB)
- Itineraries repository: refactor từ inline `_to_slug()` sang dùng shared `slugify()`
- Browser test automation: thêm `.claude/commands/browserbase-test.md` skill
- MCP skills guide: thêm `docs/MCP_SKILLS_GUIDE.md`
- Browser test reports: thêm 4 report files trong `docs/REPORTS/` (executive summary, manual results, retest results, status)
- Local verification: 138 unit + 53 integration pass; FE build pass
- Browser test results: 6/7 PASS, 1 PARTIAL (rate limit quota)

## Phase C Plan (2026-06-10)

Tất cả trang chính đã nối BE API. Xem chi tiết tại `docs/04_frontend.md`.

Tóm tắt: 35 BE endpoints (EP-0 đến EP-32 + EP-30 suggest), current branch có 97 unit tests + 44 integration tests, 13 FE e2e tests, 8 protected routes, API client layer + optimistic CRUD + revert-on-failure, mock chỉ dùng fallback. 4 critical async session bugs đã fix (PR #24), FE-BE contract gaps fix (PR #27), Register OTP bypass (PR #28), Playwright e2e setup (PR #31), AI C.1 generate (PR #42), AI C.2 suggest EP-30 (PR #49).

## Phase C Plan (2026-05-04)

Xem chi tiết tại `docs/06_ai_roadmap.md` và `docs/02_architecture.md`.

Thứ tự ưu tiên:

1. Generate pipeline (`itinerary_pipeline.py`) — core value
2. SuggestionService (`suggestion_service.py`) — DB-only, dễ implement
3. Companion chat (`companion_service.py` + `agent.py`) — phức tạp nhất
4. Chat history (message/history layer sau `service.py` + `chat.py`) — cần khi companion hoạt động
5. Analytics EP-34 — optional

## Scope Task 00048 (D — docs/system-test)

- Full system test 2026-05-27: 97 unit + 43/44 integration + 13 e2e pass.
- README.md: Thêm sections Quick Start, Tests & Verification, ETL, Cấu trúc thư mục, Team.
- Fix `resolve_destination_for_ai()`: thêm slug-based fallback để "Ha Noi" → "ha-noi" → match DB.
- Rate limit messages: đã có tiếng Việt rõ ràng cho cả auth user và guest.
- docs/REPORTS: Thêm phase_full_system_test_2026_05_27.md + 3 issues mới.
- Phát hiện security gap: guest rate limit dùng IP+UA fingerprint — đổi UA bypass được limit.
- Accommodation POST: cần kiểm tra thêm (response trả rỗng trong một số test).
- Không thay đổi UI/UX, không thay đổi API contract.

## Scope Task 00099 (C3B companion chat message flow)

- Tạo local branch `feat/00099-c-c3b-companion-chat` để nối tiếp sau khi `main` đã nhận các nhánh hardening trước đó.
- Backend:
  - thêm `Backend/src/itineraries/companion_service.py` để điều phối provider call, ownership check, `requiresConfirmation`, `proposedOperations`, và persist `chat_messages`
  - mở `POST/GET /api/v1/itineraries/chat-sessions/{sessionId}/messages`
  - tách auth-user chat quota riêng `rate:ai:chat:user:{user_id}:{YYYYMMDD}`
  - giữ invariant: companion chat trip-bound, REST-only, chưa tự apply patch vào itinerary
- Frontend:
  - `ChatPanel` load session thật, load history thật, gửi message thật, render assistant contract
  - thêm `chatErrorHandler.ts` để map lỗi chat theo UX tiếng Việt
  - cập nhật Playwright C3A spec cũ cho current UI và thêm C3B panel UI spec
- ETL:
  - thêm `Backend/src/etl/scheduler.py` làm loop wrapper tối thiểu cho ETL CLI hiện có
  - local smoke: dry-run scheduler pass và ETL thật đã bù `Hải Phòng`, `Ninh Bình`
- Local verification 2026-06-14:
  - `uv run ruff check src tests` → pass
  - `uv run alembic upgrade head` / `uv run alembic check` → pass
  - `uv run pytest tests/unit/test_companion_service.py tests/unit/test_chat_session_service.py tests/unit/test_rate_limiter.py tests/unit/test_config.py -q` → `27 passed`
  - `uv run pytest tests/integration/test_chat_session_api.py tests/integration/test_companion_chat_api.py -q` → `5 passed, 14 skipped`
  - `npm run build -- --outDir .build-tmp\\c3b-chat-verify` → pass
  - `npx playwright test tests/e2e/00096-c3a-chat-session.spec.ts tests/e2e/00099-c3b-chat-panel-ui.spec.ts --reporter=list` → `6 passed`
  - `browse` CLI smoke trên FE `127.0.0.1:5173` + BE `127.0.0.1:8000` + Docker DB/Redis gốc:
    - open `trip-workspace?tripId=589`
    - mở panel `AI Chat`
    - gửi message thật
    - history API xác nhận `2` messages persisted (`user`, `assistant`)
- Gap còn lại sau 00099:
  - chưa có `apply-patch` confirm endpoint
  - tại thời điểm chốt `00099`, `FloatingAIChat` vẫn còn là promo/mock UI trên runtime
  - ETL scheduler mới ở mức manual loop, chưa wire hẳn vào Docker/service schedule

## Scope Task 00100 (C3B hardening + ETL scheduler smoke + docs sync)

- Giữ nguyên repo hiện tại, dùng đúng Docker stack `nt208-ai-travel-itinerary-recommendation-system` với DB/Redis thật.
- Hardening ETL scheduler:
  - fix logging path trong `Backend/src/etl/scheduler.py` để loop không vỡ vì `Logger._log()` nhận keyword args không hợp lệ
  - thêm `Backend/tests/unit/test_etl_scheduler.py`
- Fullstack verification refresh:
  - backend full suite pass trên project DB/Redis thật
  - full Playwright suite pass với current source
  - real Gemini generate PASS
  - real companion chat PASS với `chat_messages` persist trong DB
  - ETL scheduler `--once` PASS và đã bù dữ liệu `Buôn Ma Thuột`
- Docs/README sync:
  - cập nhật current truth cho `README.md`, `Backend/README.md`, `Frontend/README.md`
  - cập nhật `docs/01`, `03`, `08`, `11`, browser plan/status/results
  - thêm contribution `25%` mỗi thành viên, public-link placeholders, và câu thần chú cuối `README.md`
- Local verification 2026-06-19:
  - `uv run ruff check src tests` → pass
  - `uv run alembic upgrade head` / `uv run alembic check` → pass
  - `uv run pytest tests/unit tests/integration -v --tb=short` → `199 passed, 30 skipped, 1 warning`
  - `npm run build -- --outDir .build-tmp\\verify` → pass
  - `npx playwright test tests/e2e --reporter=list` → `33 passed, 3 skipped`
  - real API smoke:
    - `POST /api/v1/itineraries/generate` → `201`
    - `POST /api/v1/itineraries/chat-sessions/{sessionId}/messages` → `201`
    - `GET /api/v1/itineraries/chat-sessions/{sessionId}/messages` → `200`
  - ETL smoke:
    - `uv run python -m src.etl.scheduler --once --cities "Buôn Ma Thuột"` → `69` places loaded for `Buôn Ma Thuột`
- Live verification refresh 2026-06-20:
  - browser smoke bằng local Chrome trên `/`, `/cities/ha-noi`, `/cities/chau-doc`, `/trip-workspace?tripId=712` → PASS
  - SQL cross-check:
    - `trips.id=712` (owner workspace smoke) persisted thật
    - `trips.id=735` (guest generate smoke) persisted thật
    - `chat_sessions.id=206` + `chat_messages` `4` rows persisted thật
  - Redis cross-check:
    - có quota keys `rate:ai:guest:*` và `rate:ai:chat:user:*`
  - bounded ETL real run:
    - `uv run python -m src.etl --cities "Châu Đốc"` hoàn tất nhưng `places_count` vẫn `0`, xác nhận data gap còn mở
- Gap còn lại sau 00100:
  - chưa có `apply-patch` confirm endpoint
  - scheduler chưa wire vào compose service/CI schedule
  - destination readiness từng bị overstate ở một số city sparse (`isGenerateReady` true dù `places_count=0`) — đã được fix tiếp trong `00101`
  - live provider smoke hiện trả lời theo hướng clarification-first; proposed-operation confirm path chưa được chứng minh end-to-end

## Scope Task 00101 (C3C apply-patch confirm + browser/API/DB truth)

- Giữ nguyên repo hiện tại, tiếp tục dùng đúng Docker stack `nt208-ai-travel-itinerary-recommendation-system` với DB/Redis/API thật.
- Hoàn thiện `C3C`:
  - thêm `POST /api/v1/itineraries/{tripId}/apply-patch`
  - thêm FE confirm/cancel UI trong `ChatPanel`
  - persist `confirmation_status`, `trip_snapshot_updated_at`, `resolved_at`
  - thêm stale strategy dựa trên `trip.updated_at`
- Bug thật lộ ra qua UAT và đã fix:
  - normalize alias `restaurant -> food` để proposal legacy không làm nổ `500`
  - stale path commit trước khi raise `409` để `confirmationStatus='stale'` không bị rollback mất
- Verification 2026-06-21:
  - backend unit file mục tiêu: `8 passed`
  - backend integration file mục tiêu: `9 passed`
  - backend full suite: `161 passed, 1 warning` + `76 passed`
  - frontend build: `npm run build -- --outDir .build-tmp\\verify-00101-c3c-3` → pass
  - browser/API/DB evidence trên trip `780`, session `265`:
    - apply: assistant `81` -> `applied`, activity `842` persisted
    - cancel: assistant `83` -> `cancelled`, không tạo activity mới cho day 1
    - stale: assistant `85` -> `stale`, `409` returned, không mutate itinerary
    - real AI smoke: assistant `99` trả summary itinerary thật với `201`
  - destination truth hardening tiếp theo trên cùng branch:
    - `Châu Đốc` API list hiện trả `placesCount=0`, `isGenerateReady=false`, `readinessStatus='sparse'`
    - `Hà Nội` API list/detail hiện trả image slug chuẩn `/img/destinations/ha-noi.jpg`
    - cache destinations bump sang `v3` để không giữ lại readiness/image semantics cũ trong Redis
- Gap còn lại sau 00101:
  - scheduler vẫn chưa wire vào compose service/CI schedule
  - patch-specific rate limit chưa có riêng
  - data enrichment cho city sparse vẫn còn mở
  - history-management/session UX sâu hơn vẫn chưa hoàn tất
