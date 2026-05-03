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

## Còn Lại Trước Phase C

- `ItineraryView` chưa có share button — share flow nằm trong `TopActionBar` của TripWorkspace.
- `ForgotPassword` cần BE endpoint password reset.
- FE unit/e2e test runner (Playwright/Cypress).
- Full ETL real data sau khi có `GOONG_API_KEY`.
- Phase C AI services (generate pipeline, companion chat, chat history).
- Optional analytics EP-34 nếu cần.

## FE-BE Integration Status (2026-05-04)

Tất cả trang chính đã nối BE API. Xem chi tiết tại `docs/04_frontend.md`.

Tóm tắt: 33 BE endpoints, 110 BE tests (66 unit + 44 integration), 8 protected routes, API client layer + optimistic CRUD + revert-on-failure, mock chỉ dùng fallback.
