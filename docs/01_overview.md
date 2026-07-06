# 01. Tổng Quan MVP2

## Mục đích

File này là **entry point** cho toàn bộ docs. Đọc file này đầu tiên để hiểu bức tranh tổng thể, sau đó follow link đến file chi tiết.

---

## Thứ Tự Đọc Docs

```text
1. ★ 01_overview.md (file này)     → Bức tranh tổng thể, trạng thái, invariant
2. ★ 02_architecture.md             → Kiến trúc hệ thống FE-BE-DB-Redis-AI
3. ★ 03_backend.md                  → Backend chi tiết: endpoint, service flow, config
4. ★ 04_frontend.md                 → Frontend chi tiết: component, hook flow, API client
5. ★ 05_database_etl.md             → Database ERD, column detail, Redis, ETL pipeline
6. ★ 06_ai_roadmap.md               → AI Phase C target architecture
7.    07_workflow_ci.md              → Branch, commit, PR, CI/CD rules
8.    08_testing_local_run.md        → Cách chạy local, test gates
9.    09_execution_tracker.md        → Task/branch/PR tracker
10.   10_automation_testing_report.md → Báo cáo test mới nhất
11.   11_phase_roadmap.md            → Snapshot Phase C + template DoD/verify/env
```

**Quick reference:**

| Câu hỏi                                    | Đọc file nào                      |
| ------------------------------------------ | --------------------------------- |
| "Hệ thống hoạt động thế nào?"              | `02_architecture.md`              |
| "Endpoint X làm gì, flow ra sao?"          | `03_backend.md`                   |
| "Component X lấy data từ đâu?"             | `04_frontend.md`                  |
| "Bảng X có những cột gì, relationship gì?" | `05_database_etl.md`              |
| "AI Phase C sẽ implement thế nào?"         | `06_ai_roadmap.md`                |
| "Branch/commit/PR format sao?"             | `07_workflow_ci.md`               |
| "Chạy local/test thế nào?"                 | `08_testing_local_run.md`         |
| "Task/PR hiện tại ở đâu?"                  | `09_execution_tracker.md`         |
| "Test pass/fail gì gần nhất?"              | `10_automation_testing_report.md` |

---

## Quy Tắc Viết Docs

- Chỉ ghi "đã làm" khi source code, test hoặc workflow hiện tại chứng minh được.
- Phase C.0–C.4 (ETL readiness, generate, suggestion, companion chat, apply-patch, session management) đã merge; C.5 Analytics optional/deferred. Chỉ ghi "đã làm" khi source/test chứng minh được.
- Khi đổi API contract, schema, config, CI, README hoặc flow local run, cập nhật `docs/` trong cùng branch.
- `docs/09_execution_tracker.md` phải được sync trước khi branch chuyển sang review.
- Các folder/file legacy đã loại khỏi workflow active: `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/`, `Backend/BE_docs.md`, `PR_DESCRIPTIONS.md`.

---

## Trạng Thái Ngắn Gọn

```text
MVP1
→ FE revamp mạnh về UI/contract
→ BE refactor MVP2 theo FastAPI async + Alembic + repository/service
→ ETL foundation cho city/place/hotel data
→ AI Phase C.0–C.4 đã merge (#42, #49, #98-106)
→ C.5 Analytics optional/deferred
```

### Current state (HEAD `#109`, Phase C.0–C.4 merged)

| Hạng mục | Current truth |
|---|---|
| Overall readiness | `C4_MERGED` (Phase C.0–C.4 done; C.5 optional/deferred) |
| `C3A — Chat Session Foundation` | Đã merge (`PR #98-100`) |
| `C3B/C3C` | Đã merge (#98-105): message flow, owner-check, real Gemini call, chat quota riêng, persisted `chat_messages`, `apply-patch` confirm/stale |
| `C4` | Đã merge (#106): history read-path + session management (rename/delete/switcher/load-more); apply-patch rate limit riêng + ETL scheduler wired |
| `FloatingAIChat.tsx` | Legacy mock component còn nằm trên source nhưng không còn mount ở các route runtime chính |
| `ChatPanel` | Đã gắn vào `TripWorkspace`, owner-only, trip-scoped, load history thật, send message thật |
| `chat_sessions` / `chat_messages` | Đã có trong source/migration và session foundation |
| Chat REST API | Đã có session CRUD + `POST/GET /itineraries/chat-sessions/{sessionId}/messages` |
| Real Gemini call trong chat | Đã có |
| Chat quota riêng | Đã có `rate:ai:chat:user:{user_id}:{YYYYMMDD}` |

Điểm cần nhớ:

- `C3A` đã dựng xong session foundation owner-only, trip-scoped trong `TripWorkspace`.
- `00100` là hardening pass sau khi message flow đã có: fix ETL scheduler smoke, cập nhật browser/docs theo current truth, và khóa lại evidence FE-BE-DB-Redis thật.
- `C3B` đã xử lý message generation, provider abstraction, chat quota, và chat error UX riêng.
- `C4` đã merge (#106): session management UX (rename/delete/switcher/load-more), apply-patch rate limit riêng (`rate:ai:apply_patch:user:*`), ETL scheduler wired vào compose (profile `etl`).

---

## Cross-Reference: Docs ↔ Code

| Docs file                         | Source code tương ứng                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02_architecture.md`              | `Backend/src/main.py`, `Frontend/src/app/App.tsx`, `Frontend/src/app/routes.tsx`                                                                         |
| `03_backend.md`                   | `Backend/src/auth/*.py`, `Backend/src/itineraries/*.py`, `Backend/src/places/*.py`, `Backend/src/core/*.py`                                              |
| `04_frontend.md`                  | `Frontend/src/app/services/*.ts`, `Frontend/src/app/contexts/*.tsx`, `Frontend/src/app/hooks/**/*.ts`, `Frontend/src/app/types/trip.types.ts`            |
| `05_database_etl.md`              | `Backend/src/auth/models.py`, `Backend/src/itineraries/models/*.py`, `Backend/src/places/models.py`, `Backend/alembic/versions/*.py`, `Backend/src/etl/` |
| `06_ai_roadmap.md`                | `Backend/src/itineraries/pipeline.py`, `Backend/src/agent/*`, `Backend/src/itineraries/models/extras.py`                                                 |
| `07_workflow_ci.md`               | `.github/workflows/`, `Backend/pyproject.toml`, `Frontend/package.json`                                                                                  |
| `08_testing_local_run.md`         | `scripts/test_fullstack_smoke.ps1`, `docker-compose.yml`                                                                                                 |
| `09_execution_tracker.md`         | Git branch/PR history                                                                                                                                    |
| `10_automation_testing_report.md` | `Backend/tests/`, `Frontend/tests/e2e/`                                                                                                                  |

---

## Đã Hoàn Thành

### Backend

- Foundation `Backend/src/` với FastAPI app factory, `uv`, async SQLAlchemy, Alembic, Docker.
- Config tập trung: `config.yaml` (non-secret) + `.env` (secret) + `AppSettings` (pydantic-settings).
- Auth/users: register, login, refresh rotation, logout, profile, update profile, change password, forgot-password, reset-password.
- Email service: `aiosmtplib` (async SMTP) + console fallback khi chưa cấu hình SMTP.
- Itinerary core: create/list/get/update/delete, nested days/activities/accommodations, owner check, rating.
- Share/claim: public `shareToken`, guest `claimToken` one-time, token hash trong DB.
- Places/cache: destinations, destination detail, place search/detail, saved places, Redis read cache fail-open.
- ETL D1/C.0: Goong-first autocomplete/detail/geocode, OSM fallback, transformers, DB upsert loader, `hotels.yaml`, `scraped_sources`.
- AI C.1 generate pipeline: DB recommendation context, Gemini JSON output, Pydantic validation, retry, guest/user AI rate limit.
- Tests current local source (2026-06-24): backend `187 unit + 77 integration` collected (43 int pass + 34 CI-gated skip local); Playwright suite hiện là `17` spec files / 36 tests (CI `frontend-e2e` green trên PR #109).
- AI C.2 SuggestionService (EP-30): DB-only suggest alternatives, owner-check, no LLM.
- Destination slug matching: `resolve_destination_for_ai()` hỗ trợ "Ha Noi" → "ha-noi" → match DB.

### Frontend

- FE revamp UI trong `Frontend/` với Vite, React, TypeScript.
- Route set đầy đủ cho 27 pages.
- FE type contract: `Frontend/src/app/types/trip.types.ts`.
- API client layer (`services/api.ts` + 4 modules) với JWT auto-refresh, forgot/reset password API.
- `AuthContext` quản lý JWT state + guest→owner claim flow; **8 protected routes**.
- `TripWizardContext` thay 6 sessionStorage keys cho wizard flow.
- `useTripSync` auto-save qua BE API; sessionStorage chỉ làm quick-restore cache.
- `useActivityManager`/`useAccommodation`/`usePlacesManager` — optimistic CRUD + revert.
- `CreateTrip` nối `generateItinerary` API, navigate TripWorkspace với tripId.
- `ErrorBoundary` bọc toàn app.
- Playwright e2e hiện có `36` test cases / `17` spec files, bao phủ auth flow, trip CRUD, public pages, guest claim, destination readiness, rate-limit UX, CityDetail API-first regression, C3A chat session CRUD, và C3B ChatPanel message/history contract.
- **Tất cả trang chính đã nối BE API**; mock chỉ làm fallback khi BE không có data.

### Docs/Ops

- `docs/` là tài liệu chính với 10 file chi tiết.
- `README.md` có hướng dẫn Docker-only, local `uv`, Redis URL, ETL, test.
- Branch/commit/PR/CI rules đã chuẩn hóa.
- CI required checks: `pr-policy`, `backend-lint`, `backend-unit`, `backend-integration`, `backend-migrations`, `frontend-build`, `frontend-e2e`.

---

## Chưa Hoàn Thành

### AI (Phase C)

- C.1 generate pipeline đã merge (#42); C.2 SuggestionService đã merge (PR #49).
- C.3/C.4 đã merge (#98-106): companion chat, apply-patch confirm/cancel/stale, session management.
- C.5 Analytics EP-34 optional/deferred: chưa implement (`/agent/analytics` absent, `enable_analytics=false`); cần SQL guardrails nếu bật.
- Data readiness: một số city thưa dữ liệu (giới hạn Goong provider — không trả photo/rating).

### ETL/Data

- Full ETL real data cần `GOONG_API_KEY`.
- Cần chạy ETL cho danh sách city chính sau khi có key/network.
- Cần kiểm số lượng destination/place/hotel sau crawl.

### Docker/Deploy

- Docker Compose hiện chạy API, PostgreSQL, Redis.
- Chưa có service frontend chính thức trong Compose.
- Chưa tự động deploy; CI/CD hiện là quality gate.
- **Deploy target:** FE → Vercel, BE → Render (target staging, manual-first).

---

## MVP2 Cải Tiến So Với MVP1

| Aspect               | MVP1              | MVP2                                                    |
| -------------------- | ----------------- | ------------------------------------------------------- |
| Backend architecture | Đơn giản          | Router/Service/Repository/Schema/Model                  |
| Database migration   | `create_all()`    | Alembic migration                                       |
| Auth                 | Cơ bản            | JWT access + refresh rotation + revoke + reset password |
| Trip access          | Public by ID      | Owner-only ID + opaque shareToken                       |
| Guest claim          | `user_id IS NULL` | claimToken hash + expiry + consume                      |
| Data source          | Mock thuần        | Goong-first ETL places/hotels + Redis cache             |
| FE architecture      | localStorage      | API client + optimistic CRUD + revert                   |
| Testing              | Không có          | Backend unit/integration tests + 17 e2e specs (36 tests)              |
| CI/CD                | Không có          | 7 required checks                                       |

---

## Invariant Cần Giữ

| Invariant                                   | Chi tiết                          | Khi nào review                      |
| ------------------------------------------- | --------------------------------- | ----------------------------------- |
| Public API JSON dùng `camelCase`            | `CamelCaseModel` serialize        | Locked — không review               |
| Endpoint theo integer ID phải owner-only    | `trip.user_id == user.id`         | Locked                              |
| Public share chỉ qua `shareToken`           | Opaque, không đoán được           | Locked                              |
| Guest claim phải dùng `claimToken` one-time | Hash + expiry + consumed_at       | Locked                              |
| AI chat không tự ghi DB trước khi confirm   | Patch-confirm flow                | Khi implement C.3                   |
| Redis cache places fail-open                | Query DB trực tiếp khi Redis down | Locked                              |
| AI rate limit KHÔNG fail-open               | Trả lỗi thay vì cho request qua   | Đã áp dụng cho C.1; giữ cho C.3/C.5 |
| Activity dùng `name` không dùng `title`     | FE contract đã chốt               | Locked                              |

---

## Kết Luận Hiện Tại

Backend CRUD core đã chạy và có test. FE-BE integration đã hoàn thành cho tất cả trang chính — auth, trip CRUD, activity/accommodation CRUD, places, share/claim, city detail, CreateTrip, forgot/reset password. Phase C.0–C.4 đã merge (#42, #49, #98-106): companion chat + apply-patch + session management đều chạy thật trên current source, các mock AI surface chủ động đã được gỡ khỏi runtime chính. Phần còn lại là C.5 Analytics (optional/deferred) + data enrichment cho sparse cities (giới hạn Goong provider).
