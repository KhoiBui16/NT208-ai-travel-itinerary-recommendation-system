# 11. Phase Roadmap & Completion Tracker

> Cập nhật sau mỗi PR merge. Task ngắn: `docs/09_execution_tracker.md`. Báo cáo chi tiết: `docs/REPORTS/phase_*.md`.

## Phase C — Snapshot

| ID | Sub-phase | Status | Branch / plan source | PR | Endpoint chính | Env keys |
|----|-----------|--------|----------------------|-----|----------------|----------|
| C.0 | Goong ETL | merged | `feat/00040-c-goong-etl-readiness` | #40 | — | `GOONG_API_KEY` |
| C.1 | Generate | merged | `feat/00041-c-generate-pipeline` | #42 | `POST /itineraries/generate` | `GEMINI_API_KEY`, `AGENT_*` |
| C.1b | Guest claim reload | merged | `fix/00045-c-restage-c1-guest-flow` | #45 | — | — |
| C.2 | Suggestion | merged | `feat/00047-c-suggestion-service` | #49 | `GET /agent/suggest/{id}` | none (DB only) |
| C.3A | Chat session foundation | merged | `feat/00094-c-c3a-chat-session-apis` + `feat/00095-c-c3a-fe-chat-panel` + `chore/00096-c-c3a-chat-e2e-tests` | #98-100 | `POST/GET /itineraries/{tripId}/chat-sessions` | none |
| C.3B | Companion chat API | merged | `feat/00100-c-c3b-chat-hardening` + `docs/C3_C4_IMPLEMENTATION_PLAN.md` | #105 | `POST /itineraries/chat-sessions/{sessionId}/messages` | `GEMINI_API_KEY` |
| C.3C | Chat UX hardening + patch-confirm | merged | `feat/00101-c-c3c-apply-patch-confirm` + `docs/C3_C4_IMPLEMENTATION_PLAN.md` | #105 | FE UX + real apply/cancel/stale contract | none |
| C.4 | Chat history + session management | merged | `feat/00107-c-post-105-completion` | #106 | `GET /itineraries/{tripId}/chat-sessions`, `GET /chat-sessions/{id}/messages`, PATCH rename + DELETE | none |
| C.5 | Analytics | optional | `feat/00053-c5-analytics-optional` | — | `POST /agent/analytics` | `ENABLE_ANALYTICS`, `ANALYTICS_DATABASE_URL` |

**Status:** `todo` | `wip` | `review_ready` | `merged`

> **Current state (2026-06-24, HEAD `#109`):** Phase C.0–C.4 đã merge hoàn chỉnh — `C3C` apply/cancel/stale (#105), scheduler wiring + apply-patch rate limit + session management (#106). Phần còn lại là C.5 Analytics (optional/deferred) và data enrichment cho sparse cities (giới hạn Goong provider — không trả photo/rating).

---

## Template section (copy per sub-phase)

### C.X — Definition of Done

- [ ] Code merged với tests pass
- [ ] `docs/09_execution_tracker.md` row updated
- [ ] `docs/REPORTS/phase_<name>.md` written
- [ ] `docs/10_automation_testing_report.md` counts updated
- [ ] README env table reviewed if new keys

### Verification log

| Date | Branch | BE unit | BE int | FE e2e | API/Browser smoke |
|------|--------|---------|--------|--------|-------------------|
| | | | | | |

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| | | |

---

## C.2 — Definition of Done

- [x] SuggestionService DB-only, owner-check
- [x] EP-30 mounted in main.py
- [x] Unit + integration tests pass (97 unit + 44 int)
- [x] docs/03, docs/06, docs/09, docs/10 updated
- [x] No FE .tsx changes

### Verification log

| Date | Branch | BE unit | BE int | FE e2e | API/Browser smoke |
|------|--------|---------|--------|--------|-------------------|
| 2026-05-26 | `feat/00047-c-suggestion-service` | 97 pass | 44 pass | not re-run (no UI change) | PASS — activity 292 → 5 suggestions |

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| `JWT_SECRET_KEY` | yes | yes |
| `DATABASE_URL` | yes | yes |
| `GEMINI_API_KEY` | **no** (C.2 DB-only) | yes |

---

## C.3 — Definition of Done

- [x] `companion_service.py` nằm trong `src/itineraries/`
- [x] `POST/GET /itineraries/chat-sessions/{sessionId}/messages` mounted
- [x] Owner-check và chat quota riêng cho auth user
- [x] Chat history lưu vào `chat_sessions` / `chat_messages`
- [x] Unit + integration tests + Playwright + live smoke pass cục bộ
- [x] Active runtime mock drift đã được gỡ; `TripWorkspace` và `DailyItinerary` không còn mount `FloatingAIChat` / promo surfaces
- [x] `C3C` core: `apply-patch` confirm endpoint + DB update sau confirm (merged #105)
- [x] `C3C` follow-up: patch-specific rate limit (`rate:ai:apply_patch:user:*`) + session-management UX (merged #106)

### Verification log

| Date | Branch | BE unit | BE int | FE e2e | API/Browser smoke |
|------|--------|---------|--------|--------|-------------------|
| 2026-06-20 | `feat/00100-c-c3b-chat-hardening` | `199 passed, 30 skipped, 1 warning` | included above | latest recorded full suite `33 passed, 3 skipped`; 2026-06-20 build pass | real generate PASS; real chat persistence PASS; SQL+Redis cross-check PASS; bounded ETL `Châu Đốc` confirmed remaining data gap |

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| `DATABASE_URL` | **yes** | yes |
| `REDIS_URL` | **yes** | yes |
| `JWT_SECRET_KEY` | yes | yes |
| `GEMINI_API_KEY` | **yes** | yes |
| `GOONG_API_KEY` | optional for normal FE/BE smoke, **yes** for ETL/data enrichment | yes |
| `VITE_API_URL` | **yes** for FE local run | yes |

---

## C.4 — Definition of Done

- [x] ChatService full management CRUD (list sessions, get messages, rename/delete session) — merged #106
- [x] Read-path endpoints mounted (GET /chat-sessions, GET /chat-sessions/{id}/messages)
- [x] Delete-session + rename endpoint mounted (merged #106)
- [x] Owner-check trên mọi endpoint
- [x] Unit + integration tests pass
- [x] docs/03, docs/06, docs/09, docs/10 updated

### Verification log

| Date | Branch | BE unit | BE int | FE e2e | API/Browser smoke |
|------|--------|---------|--------|--------|-------------------|
| | | | | | |

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| `JWT_SECRET_KEY` | yes | yes |
| `DATABASE_URL` | yes | yes |

---

## C.5 — Definition of Done (Optional)

- [ ] SQL validator block DML + banned tables
- [ ] Auto-inject WHERE user_id
- [ ] Read-only DB role
- [ ] Feature flag hoạt động (OFF → 503)
- [ ] Audit log
- [ ] Unit tests cho SQL validator

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| `ENABLE_ANALYTICS` | yes (set true) | yes |
| `ANALYTICS_DATABASE_URL` | yes | yes |
