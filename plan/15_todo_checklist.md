# Part 15: Todo Checklist — Granular Task Tracking

> **CHANGE-ID:** `todo-20260420-v1`
> **Generated:** 2026-04-20
> **Source of truth:** [implementation_plan.md](implementation_plan.md) (Build Order + 33 core EP Mapping + EP-34 optional)
> **Batch:** 2/2 — COMPLETE (Phase A → D, 90 tasks total)

> **Decision lock v4.1:** Phase C không ép mọi AI request qua Supervisor. EP-8 generate dùng direct
> `ItineraryPipeline`; EP-30 suggest là DB-only `SuggestionService`; Supervisor chỉ cho Companion
> chat và optional Analytics. Guest claim phải có `claimToken`; share public phải qua `shareToken`.

> **Decision lock v4.2 (2026-04-25):** File này vẫn giữ **phase roadmap** để chia scope lớn. Nhưng
> execution thật mỗi ngày phải theo `plan/17_execution_tracker.md`: **1 ticket nhỏ = 1 branch riêng**
> theo format `type/task-phase-scope`, squash còn 1 commit cuối trước khi mở PR.

## Mục đích file này

### WHAT — File này chứa gì?

Đây là file **"mở ra mỗi ngày"** — 1 nguồn duy nhất để biết:
1. **Task nào cần làm** — checklist `[ ]` cho từng bước nhỏ
2. **Task đó thuộc branch nào** — mapping branch → tasks
3. **Tạo file nào, implement EP nào** — mapping file → endpoint
4. **Progress bao nhiêu %** — summary per phase
5. **Git commands** — checkout, commit, PR, conflict resolution

### WHY — Tại sao cần file này?

`implementation_plan.md` có Build Order nhưng chỉ 5 dòng tóm tắt per phase. `03_be_refactor_plan.md` có file specs nhưng không có checkable tasks. File này **bridge gap** giữa high-level plan và daily implementation.

### HOW — Cách sử dụng

```bash
# Mỗi sáng:
# 1. Mở file này
# 2. Tìm task tiếp theo chưa check
# 3. Chọn/Tạo row tương ứng trong 17_execution_tracker.md
# 4. Code task đó trên branch ticket nhỏ
# 5. Update tracker + check `[x]` khi xong phase item
# 6. Squash branch còn 1 commit sạch trước PR

# Mark task done:
# Thay `- [ ]` thành `- [x]` trong editor
# Thay `- [ ]` thành `- [/]` nếu đang làm dở
```

> [!TIP]
> Neu dung Claude Code de implement theo ticket, hay mo them:
> [../CLAUDE.md](../CLAUDE.md), [../.claude/context/00_project_overview.md](../.claude/context/00_project_overview.md),
> va file phase phu hop trong `../.claude/context/`. Checklist nay van la roadmap tong; context pack la lop operational tom tat.

### WHEN — Khi nào đọc?

- **Bắt đầu sprint/tuần mới** → xem % progress, plan tasks
- **Mỗi ngày** → tìm task tiếp theo
- **Trước khi tạo PR** → verify checklist của phase đã check hết
- **Khi onboard dev mới** → xem task nào đã xong, cần tiếp tục

> [!IMPORTANT]
> Đây là **living document** — update checklist mỗi khi hoàn thành task.
> File specs chi tiết (code mẫu, function signatures) → xem [03_be_refactor_plan.md §3](03_be_refactor_plan.md).
> Daily execution tracker → xem [17_execution_tracker.md](17_execution_tracker.md).

---

## 0. Branch Structure — Overview

> [!TIP]
> Các branch trong section này là **phase bucket** để nhìn roadmap tổng. Branch thực tế dùng để code
> hằng ngày phải theo ticket nhỏ, ví dụ: `feat/12345-b1-auth-register`,
> `fix/67890-b2-itinerary-owner-check`.

### §0.1 Gitgraph

```mermaid
gitgraph
    commit id: "main (current)"
    branch feat/be-foundation
    checkout feat/be-foundation
    commit id: "A1: uv init"
    commit id: "A2: core/ layer"
    commit id: "A3: base/ ABCs"
    commit id: "A4: models/ 16 core tables"
    commit id: "A5: schemas/"
    commit id: "A6: Alembic + Docker"
    commit id: "A7: README.md"
    checkout main
    merge feat/be-foundation id: "PR #1 (Foundation)"
    branch feat/be-auth-users
    commit id: "B1: Auth repo+svc+router"
    commit id: "B2: User repo+svc+router"
    commit id: "B3: Auth+User tests"
    checkout main
    merge feat/be-auth-users id: "PR #2 (Auth+Users)"
    branch feat/be-itineraries
    commit id: "B4: Trip CRUD"
    commit id: "B5: Activity+Accommodation"
    commit id: "B6: Share+Rating"
    commit id: "B7: Guest Claim+Limit"
    commit id: "B8: Itinerary tests"
    checkout main
    merge feat/be-itineraries id: "PR #3 (Itineraries)"
    branch feat/be-places
    commit id: "B9: Places+Destinations"
    commit id: "B10: Saved Places+Redis"
    commit id: "B11: Places tests"
    checkout main
    merge feat/be-places id: "PR #4 (Places)"
    branch feat/be-ai-agent
    commit id: "C1: Itinerary Pipeline"
    commit id: "C2: Companion Patch Agent"
    commit id: "C3: WebSocket+Rate Limit"
    commit id: "C4: AI tests"
    checkout main
    merge feat/be-ai-agent id: "PR #5 (AI Agent)"
```

### §0.2 Branch → Task Summary

| Branch | Phase | Tasks | Endpoints | Tuần | Dependencies |
|--------|-------|-------|-----------|------|-------------|
| `feat/be-foundation` | A | A1–A7 (7 tasks) | 0 (health check only) | 1–2 | Không |
| `feat/be-auth-users` | B1 | B1–B3 (3 groups, ~12 tasks) | EP 1–7 (7 EPs) | 3 | Phase A |
| `feat/be-itineraries` | B2 | B4–B8 (5 groups, ~18 tasks) | EP 8–20, 32 (14 EPs) | 4 | Phase A + B1 |
| `feat/be-places` | B3 | B9–B11 | EP 21–27 (7 EPs) | 5 | Phase A |
| `feat/be-ai-agent` | C | C1–C5 core, C6 optional | EP 28–31, 33 core; EP-34 optional | 6–7 | Phase A+B2+B3 |

### §0.3 Recommended Worktree Layout

```
NT208-ai-travel-itinerary-recommendation-system/
├── .git/                          ← Shared git directory
├── Backend/                       ← Main worktree (main branch)
│   └── src/
├── worktrees/
│   ├── foundation/                ← git worktree (feat/be-foundation)
│   ├── auth-users/                ← git worktree (feat/be-auth-users)
│   └── itineraries/               ← git worktree (feat/be-itineraries)
```

```bash
# Tạo worktree cho Phase A
git worktree add worktrees/foundation feat/be-foundation

# Tạo worktree cho Phase B1 (sau khi Phase A merge)
git worktree add worktrees/auth-users feat/be-auth-users

# Xóa worktree sau khi merge
git worktree remove worktrees/foundation
```

---

## Phase A: Foundation — branch `feat/be-foundation`

> **Tuần 1–2** | **Dependencies:** Không | **Kết quả:** Server + DB + Docker hoạt động, chưa có endpoint
> **Test verify:** `uv run uvicorn src.main:app` → health check `{"status":"healthy"}`

### A1: Project Init

- [x] **A1.1** — Tạo `pyproject.toml` với uv
  - Files: `Backend/pyproject.toml`
  - Endpoint: N/A
  - Dependency: Không
  - Estimate: small
  - Owner: NOT STATED
  - Cmd: `cd Backend && uv init`

- [x] **A1.2** — Install dependencies
  - Files: `Backend/pyproject.toml`, `Backend/uv.lock`
  - Endpoint: N/A
  - Dependency: A1.1
  - Estimate: small
  - Details: `uv add fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg pydantic-settings python-jose[cryptography] passlib[bcrypt] redis structlog pyyaml`

- [x] **A1.3** — Tạo folder structure `src/`
  - Files: `src/__init__.py`, `src/api/__init__.py`, `src/api/v1/__init__.py`, `src/core/__init__.py`, `src/models/__init__.py`, `src/repositories/__init__.py`, `src/services/__init__.py`, `src/schemas/__init__.py`
  - Endpoint: N/A
  - Dependency: A1.1
  - Estimate: small

### A2: Core Layer

- [x] **A2.1** — `src/core/config.py` (~80 lines)
  - Files: `src/core/config.py`, `Backend/config.yaml`, `Backend/.env.example`
  - Endpoint: N/A
  - Dependency: A1.3
  - Estimate: medium
  - Ref: [03_be_refactor_plan.md §3.2](03_be_refactor_plan.md), [14_config_plan.md](14_config_plan.md)

- [x] **A2.2** — `src/core/database.py` (~50 lines)
  - Files: `src/core/database.py`
  - Endpoint: N/A
  - Dependency: A2.1
  - Estimate: small
  - Ref: [03_be_refactor_plan.md §3.3](03_be_refactor_plan.md)

- [x] **A2.3** — `src/core/security.py` (~120 lines)
  - Files: `src/core/security.py`
  - Endpoint: N/A
  - Dependency: A2.1
  - Estimate: medium
  - Ref: [03_be_refactor_plan.md §3.4](03_be_refactor_plan.md)

- [x] **A2.4** — `src/core/exceptions.py` (~60 lines)
  - Files: `src/core/exceptions.py`
  - Endpoint: N/A
  - Dependency: A1.3
  - Estimate: small
  - Ref: [03_be_refactor_plan.md §3.5](03_be_refactor_plan.md)

- [x] **A2.5** — `src/core/dependencies.py` (~100 lines)
  - Files: `src/core/dependencies.py`
  - Endpoint: N/A
  - Dependency: A2.1, A2.2, A2.3
  - Estimate: medium
  - Ref: [03_be_refactor_plan.md §3.6](03_be_refactor_plan.md)

- [x] **A2.6** — `src/core/logger.py` (~40 lines)
  - Files: `src/core/logger.py`
  - Endpoint: N/A
  - Dependency: A2.1
  - Estimate: small
  - Ref: [08_coding_standards.md §4](08_coding_standards.md)

- [x] **A2.7** — `src/core/middlewares.py` (~60 lines)
  - Files: `src/core/middlewares.py`
  - Endpoint: N/A
  - Dependency: A2.4, A2.6
  - Estimate: small
  - Details: CORS, logging middleware, global exception handler

### A3: Base Classes (ABCs)

- [x] **A3.1** — `src/repositories/base.py` (~80 lines)
  - Files: `src/repositories/base.py`
  - Endpoint: N/A
  - Dependency: A2.2
  - Estimate: medium
  - Details: `BaseRepository[T]` with CRUD methods: `get_by_id()`, `create()`, `update()`, `delete()`
  - Ref: [03_be_refactor_plan.md §6](03_be_refactor_plan.md)

- [x] **A3.2** — `src/services/base.py` (~30 lines)
  - Files: `src/services/base.py`
  - Endpoint: N/A
  - Dependency: A3.1
  - Estimate: small
  - Details: Abstract base service (logging, common methods)

### A4: Models (16 core tables)

- [x] **A4.1** — `src/models/user.py` — User + RefreshToken tables
  - Files: `src/models/user.py`
  - Endpoint: (used by EP 1–7)
  - Dependency: A2.2
  - Estimate: medium
  - Ref: [09_database_design.md §2.1](09_database_design.md) — tables: `users`, `refresh_tokens`

- [x] **A4.2** — `src/models/trip.py` — Trip + TripDay + Activity tables
  - Files: `src/models/trip.py`
  - Endpoint: (used by EP 8–20, 32)
  - Dependency: A2.2
  - Estimate: medium
  - Ref: [09_database_design.md §2.2–2.4](09_database_design.md) — tables: `trips`, `trip_days`, `activities`

- [x] **A4.3** — `src/models/place.py` — Place + Hotel + SavedPlace tables
  - Files: `src/models/place.py`
  - Endpoint: (used by EP 21–27, 30)
  - Dependency: A2.2
  - Estimate: medium
  - Ref: [09_database_design.md §2.5–2.7](09_database_design.md) — tables: `places`, `hotels`, `saved_places`

- [x] **A4.4** — `src/models/extras.py` — Accommodation + ExtraExpense + TripRating + ShareLink + ScrapedSource tables
  - Files: `src/models/extras.py`
  - Endpoint: (used by EP 14, 15, 19, 20)
  - Dependency: A2.2
  - Estimate: medium
  - Ref: [09_database_design.md §2.8–2.12](09_database_design.md) — 5 tables

- [x] **A4.5** — `src/models/__init__.py` — Export all models
  - Files: `src/models/__init__.py`
  - Endpoint: N/A
  - Dependency: A4.1–A4.4
  - Estimate: small

### A5: Schemas (Pydantic)

- [x] **A5.1** — `src/schemas/auth.py` — Auth request/response schemas
  - Files: `src/schemas/auth.py`
  - Endpoint: EP 1–4
  - Dependency: A1.3
  - Estimate: small
  - Details: `RegisterRequest`, `LoginRequest`, `TokenResponse`, `RefreshRequest`

- [x] **A5.2** — `src/schemas/user.py` — User schemas
  - Files: `src/schemas/user.py`
  - Endpoint: EP 5–7
  - Dependency: A1.3
  - Estimate: small
  - Details: `UserResponse`, `UpdateProfileRequest`, `ChangePasswordRequest`

- [x] **A5.3** — `src/schemas/itinerary.py` — Trip/Day/Activity schemas
  - Files: `src/schemas/itinerary.py`
  - Endpoint: EP 8–20, 32
  - Dependency: A1.3
  - Estimate: medium
  - Details: `ItineraryResponse`, `GenerateRequest`, `UpdateTripRequest`, `ActivityRequest`
  - Ref: [02_fe_revamp_analysis.md §1](02_fe_revamp_analysis.md) — source of truth from `trip.types.ts`

- [x] **A5.4** — `src/schemas/place.py` — Place/Destination schemas
  - Files: `src/schemas/place.py`
  - Endpoint: EP 21–27, 30
  - Dependency: A1.3
  - Estimate: small
  - Details: `PlaceResponse`, `DestinationResponse`, `SearchRequest`

- [x] **A5.5** — `src/schemas/common.py` — Shared schemas
  - Files: `src/schemas/common.py`
  - Endpoint: N/A
  - Dependency: A1.3
  - Estimate: small
  - Details: `PaginatedResponse`, `ErrorResponse`, `SuccessResponse`

### A6: Alembic + Docker

- [x] **A6.1** — Alembic init + initial migration
  - Files: `alembic.ini`, `alembic/env.py`, `alembic/versions/001_initial.py`
  - Endpoint: N/A
  - Dependency: A4.1–A4.4
  - Estimate: medium
  - Cmd: `uv run alembic init alembic && uv run alembic revision --autogenerate -m "initial_tables"`

- [x] **A6.2** — `src/main.py` (~60 lines) — App factory
  - Files: `src/main.py`
  - Endpoint: `GET /health` (implicit)
  - Dependency: A2.1–A2.7
  - Estimate: small
  - Ref: [03_be_refactor_plan.md §3.1](03_be_refactor_plan.md)

- [x] **A6.3** — `src/api/v1/router.py` — API router aggregator
  - Files: `src/api/v1/router.py`
  - Endpoint: N/A (wire routers)
  - Dependency: A6.2
  - Estimate: small

- [x] **A6.4** — `Dockerfile` + `docker-compose.yml`
  - Files: `Backend/Dockerfile`, `docker-compose.yml`
  - Endpoint: N/A
  - Dependency: A6.1, A6.2
  - Estimate: medium
  - Ref: [11_cicd_docker_plan.md §3](11_cicd_docker_plan.md)

- [x] **A6.5** — `.env.example` + `config.yaml`
  - Files: `Backend/.env.example`, `Backend/config.yaml`
  - Endpoint: N/A
  - Dependency: A2.1
  - Estimate: small
  - Ref: [14_config_plan.md §2](14_config_plan.md)

### A7: README + Verify

- [x] **A7.1** — `Backend/README.md`
  - Files: `Backend/README.md`
  - Endpoint: N/A
  - Dependency: A6.4
  - Estimate: small
  - Ref: [07_readme_plan.md](07_readme_plan.md)

- [x] **A7.2** — Verify: Server starts + health check
  - Files: N/A (verification task)
  - Endpoint: N/A
  - Dependency: A6.1–A6.5
  - Estimate: small
  - Test: `uv run uvicorn src.main:app --reload` → `curl http://localhost:8000/health` → `{"status":"healthy"}`

- [x] **A7.3** — Verify: Docker Compose starts
  - Files: N/A (verification task)
  - Endpoint: N/A
  - Dependency: A6.4
  - Estimate: small
  - Test: `docker compose up --build` → all 3 services healthy (api, db, redis)

- [x] **A7.4** — Verify: Alembic migration runs
  - Files: N/A (verification task)
  - Dependency: A6.1
  - Estimate: small
  - Test: `uv run alembic upgrade head` → 16 core tables created

**Phase A Total: 28 tasks** | **Status:** completed + local verify passed on 2026-04-28 | **PR:** `feat/be-foundation` → main

---

## Phase B1: Auth + Users — branch `feat/be-auth-users`

> **Tuần 3** | **Dependencies:** Phase A merged | **Kết quả:** 7 endpoints hoạt động
> **Test verify:** register → login → get profile → update profile → change password → refresh → logout

### B1: Auth Domain (4 endpoints)

- [x] **B1.1** — `src/repositories/user_repo.py` (~80 lines)
  - Files: `src/repositories/user_repo.py`
  - Endpoint: EP 1–7
  - Dependency: A3.1, A4.1
  - Estimate: medium
  - Details: `UserRepository(BaseRepository[User])`: `find_by_email()`, `create()`, `update()`

- [x] **B1.2** — `src/repositories/token_repo.py` (~60 lines)
  - Files: `src/repositories/token_repo.py`
  - Endpoint: EP 3, 4
  - Dependency: A3.1, A4.1
  - Estimate: small
  - Details: `RefreshTokenRepository`: `create()`, `find_by_hash()`, `revoke_all()`

- [x] **B1.3** — `src/services/auth_service.py` (~100 lines)
  - Files: `src/services/auth_service.py`
  - Endpoint: EP 1–4
  - Dependency: B1.1, B1.2, A2.3
  - Estimate: medium
  - Details: `AuthService`: `register()`, `login()`, `refresh()`, `logout()`

- [x] **B1.4** — `src/api/v1/auth.py` (~80 lines)
  - Files: `src/api/v1/auth.py`
  - Endpoint: EP 1 `POST /auth/register`, EP 2 `POST /auth/login`, EP 3 `POST /auth/refresh`, EP 4 `POST /auth/logout`
  - Dependency: B1.3
  - Estimate: medium
  - Ref: [12_be_crud_endpoints.md EP 1–4](12_be_crud_endpoints.md)

- [x] **B1.5** — Wire auth router in `src/api/v1/router.py`
  - Files: `src/api/v1/router.py` (modify)
  - Endpoint: N/A
  - Dependency: B1.4
  - Estimate: small

- [x] **B1.6** — Update `src/core/dependencies.py` — add auth DI
  - Files: `src/core/dependencies.py` (modify)
  - Endpoint: N/A
  - Dependency: B1.1, B1.2, B1.3
  - Estimate: small

### B2: User Domain (3 endpoints)

- [x] **B2.1** — `src/services/user_service.py` (~60 lines)
  - Files: `src/services/user_service.py`
  - Endpoint: EP 5–7
  - Dependency: B1.1
  - Estimate: small
  - Details: `UserService`: `get_profile()`, `update()`, `change_password()`

- [x] **B2.2** — `src/api/v1/users.py` (~60 lines)
  - Files: `src/api/v1/users.py`
  - Endpoint: EP 5 `GET /users/profile`, EP 6 `PUT /users/profile`, EP 7 `PUT /users/password`
  - Dependency: B2.1
  - Estimate: small
  - Ref: [12_be_crud_endpoints.md EP 5–7](12_be_crud_endpoints.md)

- [x] **B2.3** — Wire users router in `src/api/v1/router.py`
  - Files: `src/api/v1/router.py` (modify)
  - Dependency: B2.2
  - Estimate: small

### B3: Auth + Users Tests

- [x] **B3.1** — `src/tests/unit/test_security.py`
  - Files: `src/tests/unit/test_security.py`
  - Dependency: A2.3
  - Estimate: small
  - Details: Test hash_password, verify_password, create_access_token, verify_access_token

- [x] **B3.2** — `src/tests/unit/test_auth_service.py`
  - Files: `src/tests/unit/test_auth_service.py`
  - Dependency: B1.3
  - Estimate: medium
  - Details: Test register (success + duplicate email), login (success + wrong password), refresh, logout

- [x] **B3.3** — `src/tests/integration/test_auth_endpoints.py`
  - Files: `src/tests/integration/test_auth_api.py`
  - Dependency: B1.4
  - Estimate: medium
  - Details: HTTP tests for EP 1–4 with `httpx.AsyncClient`

- [x] **B3.4** — Verify: Full auth flow works
  - Test: Swagger UI → register → login → get token → GET /users/profile → 200 OK

**Phase B1 Total: 13 tasks** | **Status:** completed on 2026-04-29 | **PR:** `feat/00001-b1-auth-users` → main (PR #2)

---

## Phase B2: Itineraries — branch `feat/be-itineraries`

> **Tuần 4** | **Dependencies:** Phase A + B1 merged | **Kết quả:** 14 endpoints (EP 8–20, EP 32)
> **Test verify:** generate trip → list trips → update → auto-save → add activity → share → claim

### B4: Trip CRUD (core)

- [ ] **B4.1** — `src/repositories/trip_repo.py` (~120 lines)
  - Files: `src/repositories/trip_repo.py`
  - Endpoint: EP 8–13
  - Dependency: A3.1, A4.2
  - Estimate: large
  - Details: `TripRepository`: `create_full()`, `get_by_user()`, `get_with_full()`, `update_full()`, `delete()`

- [ ] **B4.2** — `src/services/itinerary_service.py` (~130 lines)
  - Files: `src/services/itinerary_service.py`
  - Endpoint: EP 8–20, 32
  - Dependency: B4.1
  - Estimate: large
  - Details: `ItineraryService`: `generate()`, `create_manual()`, `list_by_user()`, `get_by_id()`, `update()`, `delete()`, `claim()`
  - Note: `generate()` chỉ stub trong Phase B2 — AI logic thêm ở Phase C

- [ ] **B4.3** — `src/api/v1/itineraries.py` (~120 lines)
  - Files: `src/api/v1/itineraries.py`
  - Endpoint: EP 8 `POST /itineraries/generate`, EP 9 `POST /itineraries`, EP 10 `GET /itineraries`, EP 11 `GET /itineraries/{id}`, EP 12 `PUT /itineraries/{id}`, EP 13 `DELETE /itineraries/{id}`
  - Dependency: B4.2
  - Estimate: large
  - Ref: [12_be_crud_endpoints.md EP 8–13](12_be_crud_endpoints.md)

- [ ] **B4.4** — Wire itinerary router + update dependencies.py
  - Files: `src/api/v1/router.py` (modify), `src/core/dependencies.py` (modify)
  - Dependency: B4.3
  - Estimate: small

### B5: Activity + Accommodation

- [ ] **B5.1** — Add activity CRUD methods to `trip_repo.py`
  - Files: `src/repositories/trip_repo.py` (modify)
  - Endpoint: EP 16–18
  - Dependency: B4.1
  - Estimate: medium
  - Details: `add_activity()`, `update_activity()`, `delete_activity()`

- [ ] **B5.2** — Add accommodation CRUD methods to `trip_repo.py`
  - Files: `src/repositories/trip_repo.py` (modify)
  - Endpoint: EP 19–20
  - Dependency: B4.1
  - Estimate: small
  - Details: `add_accommodation()`, `delete_accommodation()`

- [ ] **B5.3** — Add activity/accommodation router endpoints
  - Files: `src/api/v1/itineraries.py` (modify)
  - Endpoint: EP 16–20
  - Dependency: B5.1, B5.2
  - Estimate: medium

### B6: Share + Rating

- [ ] **B6.1** — `src/repositories/shared_repo.py` (~40 lines)
  - Files: `src/repositories/shared_repo.py`
  - Endpoint: EP 15
  - Dependency: A3.1, A4.4
  - Estimate: small

- [ ] **B6.2** — Add share/rating endpoints
  - Files: `src/api/v1/itineraries.py` (modify)
  - Endpoint: EP 14 `PUT /itineraries/{id}/rating`, EP 15 `POST /itineraries/{id}/share`
  - Dependency: B6.1, B4.2
  - Estimate: small

### B7: Guest Claim + Trip Limit

- [ ] **B7.1** — Implement `claim()` in `itinerary_service.py`
  - Files: `src/services/itinerary_service.py` (modify)
  - Endpoint: EP 32 `POST /itineraries/{id}/claim`
  - Dependency: B4.2
  - Estimate: medium
  - Details: Verify one-time `claimToken` hash/expiry trong `guest_claim_tokens`, consume token, rồi mới set `user_id = current_user.id`. Không claim chỉ bằng `trip.user_id IS NULL`.
  - Ref: [04_ai_agent_plan.md §4.10](04_ai_agent_plan.md)

- [ ] **B7.2** — Implement trip limit check in `create_manual()` and `generate()`
  - Files: `src/services/itinerary_service.py` (modify)
  - Endpoint: EP 8, 9
  - Dependency: B4.2
  - Estimate: small
  - Details: `COUNT(trips WHERE user_id=X AND active) >= MAX_ACTIVE_TRIPS_PER_USER` → 403

- [ ] **B7.3** — Add claim endpoint to router
  - Files: `src/api/v1/itineraries.py` (modify)
  - Endpoint: EP 32
  - Dependency: B7.1
  - Estimate: small

### B8: Itinerary Tests

- [ ] **B8.1** — `src/tests/unit/test_itinerary_service.py`
  - Files: `src/tests/unit/test_itinerary_service.py`
  - Dependency: B4.2
  - Estimate: medium
  - Details: Test CRUD, ownership check, trip limit, guest claim

- [ ] **B8.2** — `src/tests/integration/test_itinerary_api.py`
  - Files: `src/tests/integration/test_itinerary_api.py`
  - Dependency: B4.3
  - Estimate: large
  - Details: HTTP tests for EP 8–20, 32 (happy + error paths)

- [ ] **B8.3** — Verify: Full trip flow works
  - Test: Swagger → create trip → add activities → auto-save → share → delete

**Phase B2 Total: 16 tasks** | **PR: `feat/be-itineraries` → main**

---

## File → Endpoint Mapping Table

| File | Endpoints | Phase |
|------|-----------|-------|
| `src/main.py` | health check | A |
| `src/core/config.py` | all (settings) | A |
| `src/core/database.py` | all (DB session) | A |
| `src/core/security.py` | EP 1–4 (JWT, bcrypt) | A |
| `src/core/exceptions.py` | all (error responses) | A |
| `src/core/dependencies.py` | all (DI chain) | A |
| `src/core/logger.py` | all (logging) | A |
| `src/core/middlewares.py` | all (CORS, error handler) | A |
| `src/core/rate_limiter.py` | EP 8, 28, 29, 31 | B3/C |
| `src/models/user.py` | EP 1–7 | A |
| `src/models/trip.py` | EP 8–20, 32 | A |
| `src/models/place.py` | EP 21–27, 30 | A |
| `src/models/extras.py` | EP 14, 15, 19, 20 | A |
| `src/schemas/auth.py` | EP 1–4 | A |
| `src/schemas/user.py` | EP 5–7 | A |
| `src/schemas/itinerary.py` | EP 8–20, 32 | A |
| `src/schemas/place.py` | EP 21–27, 30 | A |
| `src/repositories/base.py` | all repos | A |
| `src/repositories/user_repo.py` | EP 1–7 | B1 |
| `src/repositories/token_repo.py` | EP 3, 4 | B1 |
| `src/repositories/trip_repo.py` | EP 8–20, 32 | B2 |
| `src/repositories/shared_repo.py` | EP 15 | B2 |
| `src/repositories/place_repo.py` | EP 21–27, 30 | B3 |
| `src/repositories/saved_repo.py` | EP 25–27 | B3 |
| `src/services/auth_service.py` | EP 1–4 | B1 |
| `src/services/user_service.py` | EP 5–7 | B1 |
| `src/services/itinerary_service.py` | EP 8–20, 32 | B2 |
| `src/services/place_service.py` | EP 21–27, 30 | B3 |
| `src/api/v1/auth.py` | EP 1–4 | B1 |
| `src/api/v1/users.py` | EP 5–7 | B1 |
| `src/api/v1/itineraries.py` | EP 8–20, 32 | B2 |
| `src/api/v1/places.py` | EP 21–27 | B3 |
| `src/api/v1/agent.py` | EP 28–31, 33 | C |

---

## Progress Tracking (Batch 1)

> Xem bảng Progress Tracking đầy đủ (6 phases, 90 tasks) ở cuối file → [Updated Progress Tracking](#updated-progress-tracking).

---

## Git Conventions

### §1 Branch Naming

| Pattern | Ví dụ | Khi nào |
|---------|-------|---------|
| `feat/<task>-<phase>-<scope>` | `feat/12345-b1-auth-register` | Feature ticket |
| `fix/<task>-<phase>-<scope>` | `fix/67890-b2-itinerary-owner-check` | Bug fix ticket |
| `docs/<task>-<phase>-<scope>` | `docs/13579-c-ai-chat-docs` | Docs ticket |
| `style/<task>-<phase>-<scope>` | `style/24680-a-ruff-format` | Formatting only |
| `refactor/<task>-<phase>-<scope>` | `refactor/11223-b3-place-service-cleanup` | Refactor ticket |
| `chore/<task>-<phase>-<scope>` | `chore/44556-a-ci-bootstrap` | Tooling/config ticket |

**Regex chuẩn:**

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

### §2 Commit Message Template

```
<type>: [#<Task-ID>] <short description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `chore`

**Rule:**
- Commit này là **commit cuối sau squash**
- Description bắt đầu bằng động từ, viết thường chữ đầu
- Không dùng `update`, `fix`, `part 2`, `final`, `temp`

**Ví dụ:**
```bash
feat: [#12345] add refresh token endpoint
fix: [#67890] fix guest claim token validation
docs: [#22222] update branch and pr workflow
```

### §3 Merge Strategy

| Rule | Giá trị | WHY |
|------|---------|-----|
| **Merge type** | Squash merge | 1 PR = 1 commit trên main → history sạch |
| **PR title format** | Trùng final squash commit title | History nhất quán |
| **PR required reviews** | 1 (self-review nếu solo) | Quality gate |
| **CI must pass** | ✅ Required | No broken code on main |
| **Branch delete after merge** | ✅ Auto-delete | Clean up |

### §4 PR Checklist (Copy vào mỗi PR)

```markdown
## PR Checklist
- [ ] Mọi file mới có Google docstring
- [ ] Mọi function có type hints (input + output)
- [ ] Không file nào vượt 150 dòng
- [ ] Không function nào vượt 30 dòng  
- [ ] `uv run ruff check src/` → 0 errors
- [ ] `uv run pytest src/tests/` → all pass
- [ ] Nếu có endpoint mới/sửa endpoint → integration tests pass
- [ ] Nếu có model/schema/config change → migration/config note đã ghi trong PR
- [ ] `plan/17_execution_tracker.md` đã sync trạng thái code/docs/test/local verify
- [ ] Branch đã squash còn 1 commit final đúng format `type: [#Task-ID] description`
- [ ] Server starts: `uv run uvicorn src.main:app` → no crash
- [ ] Swagger UI renders correct endpoints
- [ ] Endpoints testable in Swagger ("Try it out")
- [ ] Security checklist passed (plan/08_coding_standards.md §7.3)
```

### §5 Conflict Resolution

**Policy:** Luôn **rebase** branch lên main mới nhất trước khi tạo PR.

```bash
# 1. Fetch latest main
git checkout main && git pull

# 2. Rebase feature branch
git checkout feat/12345-b1-auth-register
git rebase main

# 3. Nếu có conflict:
#    a. Git sẽ dừng và show conflicted files
#    b. Mở file, tìm <<<<<<< markers
#    c. Giữ code ĐÚNG, xóa markers
#    d. git add <resolved-file>
#    e. git rebase --continue

# 4. Nếu rebase quá phức tạp (>5 conflicts):
git rebase --abort  # Hủy rebase
git merge main      # Dùng merge thay vì rebase
# → Tạo merge commit, nhưng an toàn hơn

# 5. Force push (vì rebase thay đổi history)
git push --force-with-lease origin feat/12345-b1-auth-register
```

**Quy tắc conflict:**
- File config (`config.yaml`, `docker-compose.yml`): **giữ cả hai** thay đổi
- File code (`*.py`): **giữ code mới nhất** (main), merge logic riêng
- File plan (`*.md`): **giữ version mới hơn**

---

## Cross-Reference

| Cần biết | Mở file |
|---------|---------|
| File specs chi tiết (code mẫu) | [03_be_refactor_plan.md §3](03_be_refactor_plan.md) |
| Endpoint request/response JSON | [12_be_crud_endpoints.md](12_be_crud_endpoints.md) |
| DB table columns/constraints | [09_database_design.md](09_database_design.md) |
| Config parameters | [14_config_plan.md](14_config_plan.md) |
| Commit convention details | [11_cicd_docker_plan.md §1.3](11_cicd_docker_plan.md) |
| Coding standards | [08_coding_standards.md](08_coding_standards.md) |
| Build order + dependencies | [implementation_plan.md](implementation_plan.md) |
| AI Agent file structure | [04_ai_agent_plan.md §4](04_ai_agent_plan.md) |
| ETL pipeline files | [05_data_pipeline_plan.md §3](05_data_pipeline_plan.md) |

---

> **Batch 1 hoàn tất** — Phase A (28 tasks) + B1 (13 tasks) + B2 (16 tasks) = 57 tasks

---

## Phase B3: Places — branch `feat/be-places`

> **Tuần 5** | **Dependencies:** Phase A merged (B3 có thể song song với B2) | **Kết quả:** 7 endpoints (EP 21–27)
> **Test verify:** search places → list destinations → get detail → save → unsave → Redis cache hit

### B9: Places + Destinations (4 endpoints)

- [ ] **B9.1** — `src/repositories/place_repo.py` (~100 lines)
  - Files: `src/repositories/place_repo.py`
  - Endpoint: EP 21–24
  - Dependency: A3.1, A4.3
  - Estimate: medium
  - Details: `PlaceRepository(BaseRepository[Place])`: `get_destinations()`, `get_by_destination()`, `search()`, `get_by_id()`, `correlated()`

- [ ] **B9.2** — `src/services/place_service.py` (~100 lines)
  - Files: `src/services/place_service.py`
  - Endpoint: EP 21–27, 30
  - Dependency: B9.1
  - Estimate: medium
  - Details: `PlaceService`: `get_destinations()`, `get_detail()`, `search()`, `get_by_id()`, `suggest()`, `list_saved()`, `save()`, `unsave()`

- [ ] **B9.3** — `src/api/v1/places.py` (~80 lines)
  - Files: `src/api/v1/places.py`
  - Endpoint: EP 21 `GET /destinations`, EP 22 `GET /destinations/{name}/detail`, EP 23 `GET /places/search`, EP 24 `GET /places/{id}`
  - Dependency: B9.2
  - Estimate: medium
  - Ref: [12_be_crud_endpoints.md EP 21–24](12_be_crud_endpoints.md)

- [ ] **B9.4** — Wire places router + update dependencies.py
  - Files: `src/api/v1/router.py` (modify), `src/core/dependencies.py` (modify)
  - Dependency: B9.3
  - Estimate: small

### B10: Saved Places + Redis Cache (3 endpoints)

- [ ] **B10.1** — `src/repositories/saved_repo.py` (~50 lines)
  - Files: `src/repositories/saved_repo.py`
  - Endpoint: EP 25–27
  - Dependency: A3.1, A4.3
  - Estimate: small
  - Details: `SavedPlaceRepository`: `get_by_user()`, `create()`, `delete()`, `exists()`

- [ ] **B10.2** — Add saved places endpoints to places router
  - Files: `src/api/v1/places.py` (modify) hoặc `src/api/v1/users.py` (modify)
  - Endpoint: EP 25 `GET /users/saved-places`, EP 26 `POST /users/saved-places`, EP 27 `DELETE /users/saved-places/{id}`
  - Dependency: B10.1, B9.2
  - Estimate: small
  - Ref: [12_be_crud_endpoints.md EP 25–27](12_be_crud_endpoints.md)

- [ ] **B10.3** — `src/core/rate_limiter.py` (~80 lines) — Redis rate limiter
  - Files: `src/core/rate_limiter.py`
  - Endpoint: EP 8, 28, 29, 31
  - Dependency: A2.1
  - Estimate: medium
  - Details: `RateLimiter`: `check_ai_limit()`, `check_api_limit()`, `get_remaining()`
  - Ref: [03_be_refactor_plan.md §3.7](03_be_refactor_plan.md)

- [ ] **B10.4** — Add Redis cache to `place_service.py` — destinations + search
  - Files: `src/services/place_service.py` (modify)
  - Endpoint: EP 21, 23
  - Dependency: B9.2, B10.3
  - Estimate: medium
  - Details: Cache `GET /destinations` (TTL 1h), `GET /places/search` (TTL 15min)
  - Ref: [06_scalability_plan.md §2](06_scalability_plan.md)

### B11: Places Tests

- [ ] **B11.1** — `src/tests/unit/test_place_service.py`
  - Files: `src/tests/unit/test_place_service.py`
  - Dependency: B9.2
  - Estimate: medium
  - Details: Test search, destinations, saved places, cache hit/miss

- [ ] **B11.2** — `src/tests/integration/test_places_api.py`
  - Files: `src/tests/integration/test_places_api.py`
  - Dependency: B9.3
  - Estimate: medium
  - Details: HTTP tests for EP 21–27

**Phase B3 Total: 10 tasks** | **PR: `feat/be-places` → main**

---

## Phase C: AI Agent — branch `feat/be-ai-agent`

> **Tuần 6–7** | **Dependencies:** Phase A + B2 + B3 merged | **Kết quả:** 5 endpoints (EP 28–31, 33)
> **Test verify:** AI generate trip thật → chat multi-turn → suggest alternatives → rate limit triggerered

### C1: Itinerary Generator (Direct Pipeline, không qua Supervisor)

- [ ] **C1.1** — `src/agent/__init__.py` + folder structure
  - Files: `src/agent/__init__.py`, `src/agent/prompts/__init__.py`, `src/agent/tools/__init__.py`
  - Endpoint: N/A
  - Dependency: Phase A
  - Estimate: small

- [ ] **C1.2** — `src/agent/itinerary_pipeline.py` (~120 lines)
  - Files: `src/agent/itinerary_pipeline.py`
  - Endpoint: EP 8
  - Dependency: C1.1, A2.1
  - Estimate: large
  - Details: 5-step RAG pipeline: `build_context()` → `build_prompt()` → `call_llm_structured()` → `validate_output()` → `save_full_trip()`. Không route qua Supervisor vì endpoint đã rõ intent.
  - Ref: [04_ai_agent_plan.md §5](04_ai_agent_plan.md)

- [ ] **C1.3** — `src/agent/prompts/itinerary_prompt.py` (~80 lines)
  - Files: `src/agent/prompts/itinerary_prompt.py`
  - Endpoint: EP 8
  - Dependency: C1.1
  - Estimate: medium
  - Details: System prompt + few-shot examples cho Gemini 2.5 Flash

- [ ] **C1.4** — Integrate pipeline into `itinerary_service.py` `generate()`
  - Files: `src/services/itinerary_service.py` (modify)
  - Endpoint: EP 8
  - Dependency: C1.2, B4.2
  - Estimate: medium
  - Details: Replace stub `generate()` → call `itinerary_pipeline.run()`

### C2: Companion Chatbot (Agent #2)

- [ ] **C2.1** — `src/agent/companion_graph.py` (~130 lines)
  - Files: `src/agent/companion_graph.py`
  - Endpoint: EP 28, 29
  - Dependency: C1.1
  - Estimate: large
  - Details: LangGraph `StateGraph` for multi-turn chat. Nếu user muốn sửa trip, graph tạo `proposedOperations` + `requiresConfirmation=true`, chưa ghi DB.
  - Ref: [04_ai_agent_plan.md §6–§7](04_ai_agent_plan.md)

- [ ] **C2.2** — `src/agent/tools/trip_tools.py` (~100 lines)
  - Files: `src/agent/tools/trip_tools.py`
  - Endpoint: EP 28, 29
  - Dependency: C2.1
  - Estimate: medium
  - Details: Tools chỉ đọc/trả patch: `search_places`, `get_weather`, `estimate_cost`, `propose_add_activity`, `propose_remove_activity`, `propose_reorder`. DB chỉ đổi sau confirm qua itinerary update/apply endpoint.
  - Ref: [04_ai_agent_plan.md §4](04_ai_agent_plan.md)

- [ ] **C2.3** — `src/services/companion_service.py` (~80 lines)
  - Files: `src/services/companion_service.py`
  - Endpoint: EP 28, 29, 33
  - Dependency: C2.1, C2.2
  - Estimate: medium
  - Details: `CompanionService`: `chat()`, `get_history()` — wraps LangGraph graph invocation. LangGraph checkpoint dùng cho state nội bộ; API history đọc từ `chat_sessions/chat_messages`.

- [ ] **C2.4** — `src/agent/prompts/companion_prompt.py` (~60 lines)
  - Files: `src/agent/prompts/companion_prompt.py`
  - Endpoint: EP 28, 29
  - Dependency: C1.1
  - Estimate: small
  - Details: System prompt cho Companion Chatbot (travel advisor persona)

### C3: WebSocket + API Endpoints

- [ ] **C3.1** — `src/api/v1/agent.py` (~120 lines)
  - Files: `src/api/v1/agent.py`
  - Endpoint: EP 28 `POST /agent/chat`, EP 30 `GET /agent/suggest/{aid}`, EP 31 `GET /agent/rate-limit-status`, EP 33 `GET /agent/chat-history/{trip_id}`
  - Dependency: C2.3, B10.3
  - Estimate: large
  - Ref: [12_be_crud_endpoints.md EP 28–31, 33](12_be_crud_endpoints.md)

- [ ] **C3.2** — `src/api/v1/ws.py` (~80 lines) — WebSocket endpoint
  - Files: `src/api/v1/ws.py`
  - Endpoint: EP 29 `WS /ws/agent-chat/{trip_id}`
  - Dependency: C2.3
  - Estimate: large
  - Details: WebSocket connection, JWT auth via query param, message loop, error handling
  - Ref: [04_ai_agent_plan.md §8](04_ai_agent_plan.md)

- [ ] **C3.3** — Wire agent/ws routers + update dependencies.py
  - Files: `src/api/v1/router.py` (modify), `src/core/dependencies.py` (modify)
  - Dependency: C3.1, C3.2
  - Estimate: small

### C4: AI Tests

- [ ] **C4.1** — `src/tests/unit/test_itinerary_pipeline.py`
  - Files: `src/tests/unit/test_itinerary_pipeline.py`
  - Dependency: C1.2
  - Estimate: medium
  - Details: Test prompt building, LLM response parsing, validation (mock Gemini API)

- [ ] **C4.2** — `src/tests/integration/test_agent_api.py`
  - Files: `src/tests/integration/test_agent_api.py`
  - Dependency: C3.1
  - Estimate: large
  - Details: Test EP 28, 30, 31, 33. Test rate limit (429 on 4th call). Mock LLM for predictable output

- [ ] **C4.3** — Verify: Full AI flow works
  - Test: Swagger → POST /itineraries/generate → receive real trip from Gemini → open WS chat → 3 messages → rate limit check

### C5: TravelSupervisor (Orchestrator vừa đủ) — 🆕

- [ ] **C5.1** — `src/agent/supervisor.py` (~80 lines)
  - Files: `src/agent/supervisor.py`
  - Endpoint: EP 28, 29 và EP-34 nếu bật (routing layer). Không dùng cho EP-8 generate hoặc EP-30 suggest.
  - Dependency: C1.1, C2.1
  - Estimate: large
  - Details: `TravelSupervisor`: `classify_intent()` → `route()` → `validate_output()`. Dùng rule-first + LLM fallback; không bọc CRUD/direct generate để tránh over-engineering.
  - Ref: [04_ai_agent_plan.md §9](04_ai_agent_plan.md)

- [ ] **C5.2** — `src/agent/schemas/supervisor_schemas.py` (~40 lines)
  - Files: `src/agent/schemas/supervisor_schemas.py`
  - Dependency: C5.1
  - Estimate: small
  - Details: `TravelAgentState(TypedDict)`, `AgentIntent(Enum)`, `SupervisorResponse(BaseModel)`

- [ ] **C5.3** — Wire Supervisor into agent router + dependencies
  - Files: `src/api/v1/agent.py` (modify), `src/core/dependencies.py` (modify)
  - Dependency: C5.1, C3.1
  - Estimate: small
  - Details: Wire only chat/analytics natural-language calls through `Supervisor.handle()`. Keep `ItineraryService.generate()` and `PlaceService.suggest()` direct.

### C6: AnalyticsWorker (Agent #4 — Text-to-SQL, optional/MVP2+) — 🆕

- [ ] **C6.1** — `src/agent/pipelines/analytics_pipeline.py` (~100 lines)
  - Files: `src/agent/pipelines/analytics_pipeline.py`
  - Endpoint: EP 34
  - Dependency: C5.1, A2.2
  - Estimate: large
  - Details: 7-step Text-to-SQL: fetch schema → generate SQL → validate AST/allowlist → query checker → execute with read-only DB role → format response → audit log. Enforce max rows and user_id scope.
  - Ref: [04_ai_agent_plan.md §10](04_ai_agent_plan.md)

- [ ] **C6.2** — `src/agent/prompts/analytics_prompts.py` (~40 lines)
  - Files: `src/agent/prompts/analytics_prompts.py`
  - Endpoint: EP 34
  - Dependency: C1.1
  - Estimate: small
  - Details: `ANALYTICS_SYSTEM_PROMPT`, `QUERY_CHECKER_PROMPT`, `build_schema_context()`

- [ ] **C6.3** — Add EP-34 `POST /agent/analytics` to router
  - Files: `src/api/v1/agent.py` (modify), `src/schemas/agent.py` (modify)
  - Endpoint: EP 34 POST /agent/analytics
  - Dependency: C6.1, C5.3
  - Estimate: small
  - Details: `AnalyticsRequest`, `AnalyticsResponse` schemas + router handler behind feature flag. Not required for MVP2 core Definition of Done.
  - Ref: [12_be_crud_endpoints.md EP-34](12_be_crud_endpoints.md)

### C7: Prompt Framework + Guardrails + LangSmith — 🆕

- [ ] **C7.1** — Implement 4-pillar prompt framework
  - Files: `src/agent/prompts/itinerary_prompts.py` (modify), `src/agent/prompts/companion_prompts.py` (modify), `src/agent/prompts/analytics_prompts.py` (modify)
  - Dependency: C1.2, C2.4, C6.2
  - Estimate: medium
  - Details: Apply Identity+Safety+Reasoning+ToolSelection template to Itinerary/Companion prompts; Analytics prompt only if EP-34 feature flag is enabled.
  - Ref: [04_ai_agent_plan.md §11](04_ai_agent_plan.md)

- [ ] **C7.2** — Output validation layer
  - Files: `src/agent/guardrails.py` (new, ~60 lines)
  - Dependency: C5.1
  - Estimate: medium
  - Details: `validate_itinerary()`, `validate_analytics_sql()`, `validate_companion_response()` — Pydantic + business rules + safety checks
  - Ref: [04_ai_agent_plan.md §12](04_ai_agent_plan.md)

- [ ] **C7.3** — LangSmith tracing integration
  - Files: `src/agent/config.py` (modify), `.env.example` (modify)
  - Dependency: C1.1
  - Estimate: small
  - Details: Add `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT` to config. structlog for supervisor decisions.
  - Ref: [04_ai_agent_plan.md §13](04_ai_agent_plan.md)

**Phase C Total: 22 tasks** | **PR: `feat/be-ai-agent` → main**

---

## Phase D: ETL + Integration — branch `feat/be-etl-integration`

> **Tuần 8** | **Dependencies:** Phase A–C merged | **Kết quả:** Real data + FE-BE integration verified
> **Test verify:** ETL populates DB → GET /destinations returns real data → Docker Compose all healthy

### D1: ETL Pipeline

- [ ] **D1.1** — `src/etl/__init__.py` + folder structure
  - Files: `src/etl/__init__.py`, `src/etl/extractors/__init__.py`, `src/etl/transformers/__init__.py`
  - Endpoint: N/A
  - Dependency: Phase A
  - Estimate: small

- [ ] **D1.2** — `src/etl/extractors/goong_extractor.py` (~80 lines)
  - Files: `src/etl/extractors/goong_extractor.py`
  - Endpoint: N/A
  - Dependency: D1.1, A2.1
  - Estimate: medium
  - Details: Goong Places API client: autocomplete → detail → geocode
  - Ref: [05_data_pipeline_plan.md §2.1](05_data_pipeline_plan.md)

- [ ] **D1.3** — `src/etl/extractors/osm_extractor.py` (~80 lines)
  - Files: `src/etl/extractors/osm_extractor.py`
  - Endpoint: N/A
  - Dependency: D1.1
  - Estimate: medium
  - Details: Overpass API client: query POI by city area → parse JSON
  - Ref: [05_data_pipeline_plan.md §2.2](05_data_pipeline_plan.md)

- [ ] **D1.4** — `src/etl/transformers/place_transformer.py` (~60 lines)
  - Files: `src/etl/transformers/place_transformer.py`
  - Endpoint: N/A
  - Dependency: D1.2, D1.3
  - Estimate: small
  - Details: Normalize + validate + deduplicate + VN coordinate bounds check

- [ ] **D1.5** — `src/etl/runner.py` (~100 lines) — ETL orchestrator
  - Files: `src/etl/runner.py`
  - Endpoint: N/A (CLI only)
  - Dependency: D1.2, D1.3, D1.4
  - Estimate: medium
  - Details: `python -m src.etl.runner --cities "Hà Nội,Đà Nẵng"` → extract → transform → upsert
  - Ref: [05_data_pipeline_plan.md §3](05_data_pipeline_plan.md)

- [ ] **D1.6** — Hotels seed data (YAML → DB)
  - Files: `src/etl/data/hotels.yaml`, `src/etl/loaders/hotel_loader.py`
  - Endpoint: N/A
  - Dependency: D1.1, A4.3
  - Estimate: small
  - Details: Manual curation → YAML → `uv run python -m src.etl.loaders.hotel_loader`

### D2: Integration + Final Verification

- [ ] **D2.1** — Run ETL for 12 target cities
  - Cmd: `uv run python -m src.etl.runner --cities "Hà Nội,Hồ Chí Minh,Đà Nẵng,Huế,Hội An,Nha Trang,Đà Lạt,Phú Quốc,Sapa,Hạ Long,Cần Thơ,Quy Nhơn"`
  - Dependency: D1.5
  - Estimate: medium
  - Test: ≥25 places per city upserted

- [ ] **D2.2** — FE-BE integration test
  - Dependency: All phases merged
  - Estimate: large
  - Test: FE CreateTrip → real API → real AI → real DB data
  - Details: Verify all 10 items in implementation_plan Verification Checklist

- [ ] **D2.3** — Docker Compose full stack verify
  - Dependency: All phases merged
  - Estimate: medium
  - Test: `docker compose up --build` → api + db + redis healthy → Swagger UI → all 33 core endpoints render; EP-34 renders only if analytics flag enabled

**Phase D Total: 9 tasks** | **PR: `feat/be-etl-integration` → main**

---

## Updated File → Endpoint Mapping (Batch 2 additions)

| File | Endpoints | Phase |
|------|-----------|-------|
| `src/repositories/place_repo.py` | EP 21–24, 30 | B3 |
| `src/repositories/saved_repo.py` | EP 25–27 | B3 |
| `src/services/place_service.py` | EP 21–27, 30 | B3 |
| `src/core/rate_limiter.py` | EP 8, 28, 29, 31 | B3 |
| `src/agent/itinerary_pipeline.py` | EP 8 | C |
| `src/agent/companion_graph.py` | EP 28, 29 | C |
| `src/agent/tools/trip_tools.py` | EP 28, 29 | C |
| `src/agent/prompts/itinerary_prompt.py` | EP 8 | C |
| `src/agent/prompts/companion_prompt.py` | EP 28, 29 | C |
| `src/services/companion_service.py` | EP 28, 29, 33 | C |
| `src/api/v1/agent.py` | EP 28, 30, 31, 33 | C |
| `src/api/v1/ws.py` | EP 29 | C |
| `src/etl/runner.py` | N/A (CLI) | D |
| `src/etl/extractors/goong_extractor.py` | N/A (ETL) | D |
| `src/etl/extractors/osm_extractor.py` | N/A (ETL) | D |

---

## Updated Progress Tracking

| Phase | Total Tasks | Done | In Progress | Remaining | % Complete |
|-------|------------|------|-------------|-----------|------------|
| **A: Foundation** | 28 | 28 | 0 | 0 | 100% |
| **B1: Auth+Users** | 13 | 13 | 0 | 0 | 100% |
| **B2: Itineraries** | 16 | 0 | 0 | 16 | 0% |
| **B3: Places** | 10 | 0 | 0 | 10 | 0% |
| **C: AI Agent** | 14 | 0 | 0 | 14 | 0% |
| **D: ETL+Integration** | 9 | 0 | 0 | 9 | 0% |
| **TOTAL** | **90** | **41** | **0** | **49** | **46%** |

> Update bảng này mỗi khi check task `[x]`.

---

> **Batch 2 hoàn tất** — Phase B3 (10 tasks) + C (14 tasks) + D (9 tasks) = **33 tasks**
> **Grand Total:** 57 (Batch 1) + 41 (Batch 2) = **98 tasks** covering all 33 core endpoints + optional EP-34 + ETL pipeline
