---
name: c3-c4-readiness-review
description: Audit generate pipeline, rate limit, auth/AuthZ, C3/C4 API contract, Goong/ETL data readiness, and branch roadmap before implementing Phase C3 or C4. Output is a set of Vietnamese reports under docs/REPORTS and issue notes under docs/REPORTS/ISSUES. Do not implement C3/C4 in this audit branch.
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(docker:*), Bash(uv:*), Bash(pytest:*), Bash(ruff:*)
---

# C3/C4 Readiness Review

Use this skill before implementing Phase C3 (companion chat) or C4 (chat history). The goal is evidence-based readiness reports, not code.

## Non-Negotiables

- Do not implement C3/C4 features in this audit branch.
- Do not create global chatroom or WebSocket/SSE in C3.
- Do not let chat self-persist itinerary before user confirms.
- Do not place companion_service.py inside `src/agent/`.
- Do not open PR if reports are incomplete or issues are unresolved.

## Read First (in order)

1. `CLAUDE.md`
2. `AGENTS.md`
3. `.claude/context/00_project_overview.md`
4. `.claude/context/05_ai_services.md`
5. `docs/06_ai_roadmap.md`
6. `docs/05_database_etl.md`
7. Latest reports under `docs/REPORTS/`
8. Source code: `Backend/src/itineraries/pipeline.py`, `Backend/src/itineraries/service.py`, `Backend/src/agent/llm.py`, `Backend/src/core/config.py`, `Backend/src/core/rate_limiter.py`

## Audit Checklist

### 1. Generate Itinerary Pipeline

- [ ] `POST /itineraries/generate` goes direct ItineraryPipeline (not via Supervisor)
- [ ] Destination resolve handles slug/no-accent
- [ ] Context places/hotels from DB (check `MAX_CONTEXT_PLACES` and `MAX_CONTEXT_HOTELS`)
- [ ] Fallback when category interest is too narrow
- [ ] Minimum places validated before LLM call
- [ ] Pydantic output validation
- [ ] Retry on invalid output (check retry count)
- [ ] Budget tolerance checked
- [ ] Max days / max activities/day enforced
- [ ] Transaction/rollback on persist failure
- [ ] No secret/API key in logs
- [ ] FE receives `claimToken` for guest, navigates to workspace correctly

### 2. Rate Limit Design

- [ ] Auth user: generate has its own quota (3/day default)
- [ ] Auth user: companion chat has separate quota from generate
- [ ] Guest: generate key is `SHA256(ip+UA)[:16]`, not raw IP
- [ ] Redis down: AI generate/chat returns 503 (fail-closed), not unlimited calls
- [ ] Goong AutoComplete/Detail/Directions: cache + quota check

### 3. Auth/AuthZ Use Cases

- [ ] Guest generate → receives claimToken
- [ ] Guest login/register → claim trip with token
- [ ] Auth user: own trip readable/editable
- [ ] Auth user: other user's trip NOT readable/editable via integer ID
- [ ] Auth user: companion chat only works in own trip
- [ ] Auth user: cannot apply-patch another user's trip
- [ ] User A: cannot read chat sessions or messages of User B
- [ ] SharedTripView: read-only, no companion chat
- [ ] Expired access token → refresh → retry
- [ ] Expired refresh token → logout/redirect login
- [ ] Stale patch → reject with 409
- [ ] Claim token expired/reused → 403/404

### 4. C3/C4 API Contract (not implemented yet — plan only)

- [ ] `POST /itineraries/{tripId}/chat` returns `requiresConfirmation` + `proposedOperations`
- [ ] `POST /itineraries/{tripId}/apply-patch` validates ownership before applying
- [ ] `companion_service.py` lives in `Backend/src/itineraries/`
- [ ] `src/agent/` only contains shared AI infra (llm.py, prompts, schemas)
- [ ] `GET /itineraries/{tripId}/chat/sessions` lists chat history for C4
- [ ] `GET /itineraries/{tripId}/chat/sessions/{sessionId}/messages` returns messages

### 5. Goong/ETL Data Readiness

- [ ] Places: which Goong endpoints are used (autocomplete, place_detail, geocode)
- [ ] Hotel data: from YAML or ETL
- [ ] Cities populated: Hà Nội only? Đà Nẵng? TP.HCM?
- [ ] `opening_hours` present in DB
- [ ] `photos`/`images` stored for places
- [ ] Travel-time/route optimization available via Goong Directions/Distance Matrix
- [ ] Rating and review_count used in ranking

### 6. Branch Roadmap

Define next branches after audit:

```
feat/00051-c-c3-companion-chat   # companion chat REST API
feat/00052-c-c4-chat-history     # chat history API
docs/00050-c-c3-design-readiness-audit  # audit branch (no code)
```

## Output

Create all reports in Vietnamese under `docs/REPORTS/`:

```
docs/REPORTS/generate_pipeline_readiness.md
docs/REPORTS/rate_limit_policy_review.md
docs/REPORTS/auth_authorization_use_cases_for_c3.md
docs/REPORTS/phase_c3_design_readiness.md
docs/REPORTS/phase_c3_data_readiness.md
```

Create issues (only if real mismatch found) under `docs/REPORTS/ISSUES/`.

Final summary must state:

```
Generate pipeline: READY / PARTIALLY_READY / NOT_READY
Rate limit policy: ...
Auth/AuthZ gaps: ...
Goong/ETL readiness: READY / PARTIALLY_READY / NOT_READY
C3 readiness: READY / PARTIALLY_READY / NOT_READY
C4 readiness: READY / PARTIALLY_READY / NOT_READY
Recommended next branch: ...
```