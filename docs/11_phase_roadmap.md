# 11. Phase Roadmap & Completion Tracker

> Cập nhật sau mỗi PR merge. Task ngắn: `docs/09_execution_tracker.md`. Báo cáo chi tiết: `docs/REPORTS/phase_*.md`.

## Phase C — Snapshot

| ID | Sub-phase | Status | Branch | PR | Endpoint chính | Env keys |
|----|-----------|--------|--------|-----|----------------|----------|
| C.0 | Goong ETL | merged | `feat/00040-c-goong-etl-readiness` | #40 | — | `GOONG_API_KEY` |
| C.1 | Generate | merged | `feat/00041-c-generate-pipeline` | #42 | `POST /itineraries/generate` | `GEMINI_API_KEY`, `AGENT_*` |
| C.1b | Guest claim reload | merged | `fix/00045-c-restage-c1-guest-flow` | #45 | — | — |
| C.2 | Suggestion | review_ready | `feat/00047-c-suggestion-service` | pending | `GET /agent/suggest/{id}` | none (DB only) |
| C.3 | Companion | todo | `feat/00048-c-companion-chat` | — | `POST /agent/chat`, apply-patch | `GEMINI_API_KEY` |
| C.4 | Chat history | todo | `feat/00049-c-chat-history` | — | `GET /agent/chat-history/{tripId}` | none |
| C.5 | Analytics | optional | `feat/00050-c-analytics-optional` | — | `POST /agent/analytics` | `ENABLE_ANALYTICS`, `ANALYTICS_DATABASE_URL` |

**Status:** `todo` | `wip` | `review_ready` | `merged`

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

- [ ] CompanionService + LangGraph graph + 6 tools
- [ ] POST /agent/chat + POST /agent/apply-patch mounted
- [ ] Owner-check trên mọi tool và apply-patch
- [ ] Chat history lưu vào chat_sessions/chat_messages
- [ ] Unit + integration tests pass
- [ ] docs/03, docs/06, docs/09, docs/10 updated
- [ ] FE FloatingAIChat wire (tách PR nếu cần)

### Verification log

| Date | Branch | BE unit | BE int | FE e2e | API/Browser smoke |
|------|--------|---------|--------|--------|-------------------|
| | | | | | |

### Env checklist (PR review)

| Key | Required for smoke? | In `.env.example`? |
|-----|---------------------|-------------------|
| `JWT_SECRET_KEY` | yes | yes |
| `GEMINI_API_KEY` | **yes** | yes |
| `GOONG_API_KEY` | optional (search_nearby tool) | yes |

---

## C.4 — Definition of Done

- [ ] ChatService CRUD (list sessions, get messages, delete session)
- [ ] 3 endpoints mounted (GET /chat/sessions, GET /chat/sessions/{id}/messages, DELETE /chat/sessions/{id})
- [ ] Owner-check trên mọi endpoint
- [ ] Unit + integration tests pass
- [ ] docs/03, docs/06, docs/09, docs/10 updated

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
