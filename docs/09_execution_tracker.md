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
| 00007 | B3 | `fix/00007-b3-fe-api-fixes` | Nối FE localStorage còn sót sang BE API, cập nhật README/tracker | wip | FE build pass | pending |

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
- Tạo `ProtectedRoute` (`Frontend/src/app/components/ProtectedRoute.tsx`) cho 7 protected routes.
- Nối FE-BE: Login, Register, Account, TripLibrary, SavedPlaces, ManualTripSetup, Header, usePlacesManager — thay localStorage bằng API calls.
- Cập nhật `docs/04_frontend.md` với API integration status.
- 108 BE tests pass (66 unit + 42 integration). FE build pass.

Review-ready khi:

- `git diff --check` pass.
- Backend lint/format/migration/unit/integration pass.
- Frontend build pass.
- BE Docker health pass.
- FE dev server smoke pass.

## Còn Lại Sau Task 00006

- Phase C AI services (generate pipeline, companion chat, chat history).
- `useTripSync` vẫn dùng localStorage cho workspace state — cần đổi sang BE API auto-save.
- FE unit/e2e test runner.
- Full ETL real data sau khi có `GOONG_API_KEY`.
- `ForgotPassword` cần BE endpoint password reset.
- Optional analytics EP-34 nếu cần.
