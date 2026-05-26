# NT208 AI Travel Itinerary Recommendation System

DuLichViet is a web-based travel itinerary system with a React/Vite frontend,
FastAPI backend, PostgreSQL database, Redis cache, Goong-first ETL, and a
Gemini-backed AI itinerary generation pipeline.

This README is the single source of truth for running the project locally.

---

## Current Status

### Implemented (BE)

- Auth: register, login, refresh-token rotation, logout, profile, change password, forgot-password, reset-password.
- Email service: `aiosmtplib` (async SMTP) + console fallback for local dev.
- Itinerary CRUD: create/list/get/update/delete, nested days/activities/accommodations, owner-only check, rating.
- Share/claim: public `shareToken`, one-time `claimToken` with hash + expiry.
- Places: destinations, destination detail, place search/detail, saved places, Redis read cache.
- ETL: Goong-first autocomplete/detail/geocode, OSM fallback, transformers, DB upsert loader, sample hotel data.
- AI C.1 generate: `POST /itineraries/generate` builds DB recommendation context, calls Gemini structured JSON, validates, retries, persists trip/day/activity/accommodation, and enforces user/guest AI quota.
- AI C.2 suggest (EP-30): `GET /agent/suggest/{activity_id}` — DB-only alternatives for an activity (owner-only, no LLM). Implemented on branch `feat/00047-c-suggestion-service`; FE UI not wired yet by design.
- Backend lint/format/migration checks pass; **97 unit** + **44 integration** tests pass locally (2026-05-26, branch 00047).

### Implemented (FE)

- UI under `Frontend/` with Vite + React + TypeScript + Tailwind/MUI.
- Full route set: home, city list/detail, auth, trip setup/workspace, history, saved places/itineraries, settings, profile, shared trip view, forgot-password, reset-password.
- API client layer with JWT auto-refresh (`Frontend/src/app/services/`): `api.ts`, `auth.ts` (incl. forgotPassword/resetPassword), `itinerary.ts`, `places.ts`, `users.ts`.
- `AuthContext` manages JWT state + guest-to-owner claim flow; **8 protected routes** redirect to `/login`.
- `TripWizardContext` replaces 6 sessionStorage keys for wizard flow (destinations, allocations, travelers, budget).
- `useTripSync` auto-saves via BE API (`createItinerary`/`updateItinerary`); sessionStorage only as quick-restore cache.
- `useActivityManager`/`useAccommodation`/`usePlacesManager` — optimistic CRUD with revert-on-failure.
- `CreateTrip` wired to `generateItinerary` API, stores guest pending claim when needed, and navigates to TripWorkspace with `tripId`.
- `TripWorkspace` loads generated trips from BE by `tripId` and uses `sessionStorage` only as quick-restore fallback.
- `ErrorBoundary` wraps entire app for graceful crash recovery.
- Type contract at `Frontend/src/app/types/trip.types.ts`.
- Production build compiles successfully in a clean output directory; see `docs/REPORTS/ISSUES/frontend_dist_permission_lock.md` for the local Windows `Frontend/dist` permission artifact observed on 2026-05-26.

### Not yet implemented

- **Phase C remaining (after C.2 BE)**: companion chat + apply-patch (C.3), chat history API (C.4), optional analytics (C.5), no map view.
- **C.2 FE wiring**: EP-30 API ready; UI components (`FloatingAIChat`, `PlaceSuggestions`) still mock until a separate FE wire PR is approved.
- Full ETL with real place data needs `GOONG_API_KEY`; AI generate needs `GEMINI_API_KEY`.
- Playwright e2e tests: **13** cases (auth + guest claim reload, trips, public pages). Workspace drag-and-drop / accommodation flows not fully covered yet.

### Latest Post-Merge Verification

See `docs/REPORTS/REPORT.md` for post-merge audits. Latest phase reports:

- `docs/REPORTS/phase_ai_generate_pipeline.md` — C.1 generate
- `docs/REPORTS/phase_c2_suggestion_service.md` — C.2 EP-30 suggest (BE-only, API smoke)

Includes FE/BE smoke evidence, guest claim/reload, AI quota notes, and issue files under `docs/REPORTS/ISSUES/`.

---

## Quick Start (Recommended)

> This is the fastest path to get both FE and BE running on your machine.

### Prerequisites

- **Git**
- **Docker Desktop** — must be running before any other step
- **Node.js 20 LTS**
- **uv** Python package manager

Verify:

```powershell
git --version
docker --version
node --version
uv --version
```

### Step 1: Configure environment

Copy the env templates to create your local `.env` files:

**PowerShell:**
```powershell
Copy-Item Backend\.env.example  Backend\.env
Copy-Item Frontend\.env.example Frontend\.env
```

**Bash / Git Bash / Linux:**
```bash
cp Backend/.env.example  Backend/.env
cp Frontend/.env.example Frontend/.env
```

#### Backend `.env` variables

After copying, edit `Backend/.env`. Only **one variable is required**; all others have safe defaults:

| Variable | Required? | Default | What to do |
|----------|-----------|---------|------------|
| `JWT_SECRET_KEY` | **Yes** | *(empty)* | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` then paste the output here. The server will warn on startup if this is missing. |
| `DATABASE_URL` | No | `postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet` | Keep default if using `docker compose up -d db` |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Keep default if using `docker compose up -d redis` |
| `GEMINI_API_KEY` | For AI generate / future C.3 chat | *(empty)* | Required for `POST /itineraries/generate` and companion chat (C.3); **not** used by C.2 suggest |
| `GOONG_API_KEY` | For Goong ETL | *(empty)* | Required for real Goong-first ETL data (meaningful suggest results need places in DB) |
| `AGENT_TIMEOUT_SECONDS` | No | `30` | Local multi-day Gemini smoke can use `60` or `120` if provider latency is high |
| `AGENT_MIN_ACTIVITIES_PER_DAY` | No | `5` | Product pacing for AI output |
| `AGENT_MAX_ACTIVITIES_PER_DAY` | No | `5` | Product pacing for AI output |
| `SMTP_HOST` | No | *(empty)* | Leave empty — password reset links log to console instead of email |
| `SMTP_PORT` | No | `587` | Only matters if `SMTP_HOST` is set |
| `SMTP_USERNAME` | No | *(empty)* | Only if using real SMTP |
| `SMTP_PASSWORD` | No | *(empty)* | Only if using real SMTP |
| `ENABLE_ANALYTICS` | No | `false` | Keep disabled — no guardrails yet |

Never commit `Backend/.env` (it is gitignored).

#### Frontend `.env`

`Frontend/.env` only needs `VITE_API_URL=http://localhost:8000` (the default). Change it only if BE runs on a different port.

### Step 2: Start infrastructure (Docker)

Docker only runs PostgreSQL and Redis. BE and FE run natively for fast hot-reload:

```powershell
docker compose up -d db redis
```

Verify they are healthy:

```powershell
docker compose ps
```

Both `db` and `redis` should show `healthy` status.

### Step 3: Start Backend

Terminal 1:

```powershell
cd Backend
uv sync
uv run alembic upgrade head
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"
uv run uvicorn src.main:app --reload --port 8000
```

Verify: open http://localhost:8000/docs — you should see Swagger UI with all registered endpoints.

### Step 4: Start Frontend

Terminal 2:

```powershell
cd Frontend
npm ci
npm run dev
```

Verify: open http://localhost:5173 — you should see the DuLichViet home page.

---

## When to Use Docker vs Local

| Scenario | Docker | Local (uv + npm) |
|---|---|---|
| Daily development | db + redis only | BE + FE |
| No Python/Node installed | Everything | Not possible |
| Testing BE hot-reload | No (slow rebuild) | Yes (`--reload`) |
| Testing FE hot-reload | Possible but slow | Yes (Vite HMR) |
| CI / production-like | Full `docker compose up --build` | Not applicable |

### Docker-only mode (no Python/Node on host)

If you only have Docker Desktop and Git:

```powershell
# Start BE + PostgreSQL + Redis
docker compose up --build

# Start FE in a separate terminal
docker run --rm -it `
  --name dulichviet-fe `
  -p 5173:5173 `
  -v "${PWD}\Frontend:/app" `
  -w /app `
  node:20-alpine `
  sh -c "npm ci && npm run dev -- --host 0.0.0.0"
```

The API container runs Alembic migrations automatically before starting Uvicorn.

Stop everything:

```powershell
docker compose down        # Stop containers, keep data
docker compose down -v     # Stop and reset database data
```

### Docker URL rules

When BE runs **inside** Docker Compose, `docker-compose.yml` overrides env vars:

```yaml
DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/dulichviet
REDIS_URL: redis://redis:6379/0
FRONTEND_URL: http://localhost:5173
```

When BE runs **locally** (recommended), keep `localhost` in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0
```

---

## Repository Layout

```text
.
├── Backend/                                # FastAPI MVP2 backend
│   ├── src/                                # Current backend source of truth
│   │   ├── main.py                         #   App factory, mount router /api/v1
│   │   ├── agent/                          #   AI shared infra for C.1 (Gemini config/client, prompts, schemas)
│   │   ├── auth/                           #   Auth domain (router, service, repo, models, schemas, deps, email)
│   │   ├── geo/                            #   Goong REST client infrastructure
│   │   ├── itineraries/                    #   Itinerary domain (router, service, repo, schemas, models/)
│   │   ├── places/                         #   Places domain (router, service, repo, models, schemas)
│   │   ├── shared/                         #   Shared utilities (CacheClient, pagination, BaseService)
│   │   ├── core/                           #   Config, database, security, dependencies, Redis, middleware
│   │   └── etl/                            #   ETL pipeline
│   │       ├── extractors/                 #     OSM + Goong extractors
│   │       ├── transformers/               #     Hotel + place transformers
│   │       ├── loaders/                    #     DB upsert loader
│   │       ├── data/                       #     hotels.yaml sample data
│   │       └── runner.py                   #     ETL CLI entry point
│   ├── tests/                              # Unit + integration tests
│   │   ├── unit/                           #   97 tests (incl. C.2 suggestion_service)
│   │   └── integration/                    #   44 tests (incl. C.2 agent endpoints)
│   ├── alembic/                            # DB migrations (3 revisions)
│   ├── config.yaml                         # Shared non-secret app config
│   ├── pyproject.toml                      # uv dependencies
│   ├── .env.example                        # Local env template — copy to .env before running
│   └── README.md                           # Backend-specific notes
├── Frontend/                               # Vite React frontend
│   ├── src/
│   │   ├── main.tsx                        #   Entry point
│   │   ├── app/
│   │   │   ├── App.tsx                     #     Root component (ErrorBoundary > AuthProvider > TripWizardProvider > Router)
│   │   │   ├── routes.tsx                  #     Route definitions + ProtectedRoute guards
│   │   │   ├── services/                   #     API client layer
│   │   │   │   ├── api.ts                  #       Fetch wrapper, JWT Bearer injection, auto-refresh on 401
│   │   │   │   ├── auth.ts                 #       login, register, logout, forgotPassword, resetPassword
│   │   │   │   ├── itinerary.ts            #       CRUD, generate, share, claim, rating
│   │   │   │   ├── places.ts               #       destinations, search, saved places
│   │   │   │   └── users.ts                #       profile, password
│   │   │   ├── contexts/                   #     React Context providers
│   │   │   │   ├── AuthContext.tsx          #       JWT state, login/logout/register, guest→owner claim
│   │   │   │   └── TripWizardContext.tsx    #       Wizard flow (destinations, allocations, travelers, budget)
│   │   │   ├── hooks/                      #     Custom hooks
│   │   │   │   ├── useTripCost.ts          #       Budget calculations
│   │   │   │   ├── useTripState.ts         #       Trip state helpers
│   │   │   │   └── trips/                  #       BE API integration hooks
│   │   │   │       ├── useTripSync.ts      #         Auto-save create/update/get itinerary
│   │   │   │       ├── useActivityManager.ts #       Activity CRUD + optimistic update
│   │   │   │       ├── useAccommodation.ts #         Accommodation CRUD + optimistic update
│   │   │   │       └── usePlacesManager.ts #         Debounced search, save/unsave, add to itinerary
│   │   │   ├── pages/                      #     27 page components (see Route Map in docs/04_frontend.md)
│   │   │   ├── components/                 #     Shared UI components
│   │   │   │   ├── ErrorBoundary.tsx       #       React crash recovery
│   │   │   │   ├── ProtectedRoute.tsx      #       Auth guard for 8 protected routes
│   │   │   │   ├── TopActionBar.tsx        #       Trip workspace actions (save, share, edit travelers)
│   │   │   │   ├── Header.tsx              #       Navigation header with auth state
│   │   │   │   ├── FloatingAIChat.tsx      #       AI chat UI (mock, Phase C will replace with real LLM)
│   │   │   │   ├── AIPromoBubble.tsx       #       AI promo tooltip (mock)
│   │   │   │   ├── ContextualSuggestionsPanel.tsx #  Contextual tips (mock)
│   │   │   │   ├── companion/              #       AI companion sub-components (mock)
│   │   │   │   │   ├── DailyBrief.tsx
│   │   │   │   │   ├── LiveBudgetBar.tsx
│   │   │   │   │   ├── PlaceSuggestions.tsx
│   │   │   │   │   └── SmartReminders.tsx
│   │   │   │   ├── figma/                  #       Design-to-code components
│   │   │   │   └── ui/                     #       shadcn/ui primitives (40+ components)
│   │   │   ├── types/                      #     TypeScript type definitions
│   │   │   │   └── trip.types.ts           #       Itinerary contract (Activity, Day, Accommodation, etc.)
│   │   │   ├── data/                       #     Static/mock data (fallback when BE has no data)
│   │   │   │   ├── cities.ts, destinations.ts, places.ts, trips.ts
│   │   │   │   └── suggestions.ts, budget.ts, homeData.ts
│   │   │   └── utils/                      #     Utility functions
│   │   │       ├── tripConstants.ts        #       Initial data, filters, labels, colors
│   │   │       ├── timeHelpers.ts          #       Time parsing, conflict resolution
│   │   │       ├── itinerary.ts            #       Itinerary helpers
│   │   │       └── analytics.ts            #       Analytics utilities
│   │   ├── styles/                         # CSS (fonts, theme, tailwind, index)
│   │   └── imports/                        # Design audit JSON
│   ├── .env.example                        # Local env template — copy to .env before running
│   ├── package.json
│   └── vite.config.ts
├── docs/                                   # Project documentation source of truth
│   ├── 01_overview.md                      #   MVP2 status, reading order, doc rules
│   ├── 02_architecture.md                  #   System architecture (FE, BE, DB, Redis, ETL, AI target)
│   ├── 03_backend.md                       #   Backend modules, endpoints, config
│   ├── 04_frontend.md                      #   Frontend routes, components, API integration status
│   ├── 05_database_etl.md                  #   Database, Redis, ETL details
│   ├── 06_backend_phases.md                #   Implemented Backend phases (A, B1-B3, D)
│   ├── 06_ai_roadmap.md                    #   AI services target and roadmap (Phase C)
│   ├── 07_workflow_ci.md                   #   Workflow, branch, commit, PR and CI rules
│   ├── 08_testing_local_run.md             #   Local run and test guide
│   ├── 09_execution_tracker.md             #   Execution tracker by branch/task
│   └── 10_automation_testing_report.md     #   Latest automation testing report
├── scripts/                               # Full-stack smoke test
│   └── test_fullstack_smoke.ps1            #   16 HTTP checks (PowerShell)
├── .claude/context/                        # Condensed operational plan for agents
│   ├── 00_project_overview.md              #   Current repo truth and target state
│   ├── 01_foundation.md                    #   Phase A foundation details
│   ├── 02_auth_users.md                    #   Phase B1 auth/users
│   ├── 03_itineraries_share_claim.md       #   Phase B2 itinerary/share/claim
│   ├── 04_places_cache.md                  #   Phase B3 places/cache
│   ├── 05_ai_services.md                   #   Phase C AI target architecture
│   └── 06_ops_workflow_ci.md               #   Ops/workflow/CI details
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md            # PR template (4 required Vietnamese sections)
│   └── workflows/
│       ├── backend-ci.yml                  #   BE lint, unit, integration, migration checks
│       ├── frontend-ci.yml                 #   FE production build + e2e checks
│       └── pr-policy.yml                   #   Branch regex, commit format, PR body validation
├── docker-compose.yml                      # API + PostgreSQL + Redis
├── CLAUDE.md                               # Agent/project memory
├── AGENTS.md                               # Agent and skill coordination guide
└── README.md                               # This file
```

### Legacy folders (not active, kept for reference)

These folders exist in the repo but are **not** part of the active development workflow:

- `plan/` — Original project plans, superseded by `.claude/context/` and `docs/`
- `md/` — Legacy markdown files, consolidated into `docs/`
- `Diagram/` — Original diagrams
- `References/` — Reference materials
- `guidelines/` — Old guidelines
- `asserts/` — Contains `videos/MVP#1_Demo.mp4`

---

## Tests And Verification

### Backend lint + unit tests (no Docker needed)

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v
```

### Backend integration tests (needs Docker for db + redis)

```powershell
docker compose up -d db redis
cd Backend
$env:CI="true"
uv run pytest tests/integration/ -v
```

### Full backend suite

```powershell
cd Backend
$env:CI="true"
uv run pytest tests/ -v
```

### Frontend build check + e2e tests

```powershell
cd Frontend
npm run build
npm run test:e2e        # Playwright e2e (needs BE running on localhost:8000, or E2E_API_URL override)
npm run test:e2e:headed # Run e2e with visible browser
```

---

## ETL

ETL config lives in `Backend/config.yaml` and `Backend/src/core/config.py`.

Load sample hotels (no API key needed):

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Run ETL for selected cities (needs `GOONG_API_KEY`):

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

---

## Local Ports

| Service | URL / Port |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/v1/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

If port `8000` is blocked, run BE on another port:

```powershell
uv run uvicorn src.main:app --reload --port 8001
```

---

## FE-BE Integration Status

All FE pages connect to the backend via an API client layer (`Frontend/src/app/services/`). JWT tokens are stored in `localStorage` (access + refresh) with auto-refresh on 401. The legacy `utils/auth.ts` mock is no longer imported by any page.

| FE Feature | Status | API Endpoint |
|---|---|---|
| Auth (login/register/logout) | Done | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` |
| Forgot/Reset password | Done | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| User profile | Done | `GET /users/profile`, `PUT /users/profile` |
| Password change | Done | `PUT /users/password` |
| Trip CRUD (list/create/update/delete) | Done | `POST /itineraries`, `GET /itineraries`, `PUT /itineraries/{id}`, `DELETE /itineraries/{id}` |
| Trip rating | Done | `PUT /itineraries/{id}/rating` |
| CreateTrip | Done | `POST /itineraries` → navigate `/trip-workspace?tripId=` |
| Trip workspace auto-save | Done | `POST/PUT /itineraries` via `useTripSync` |
| Activity CRUD (add/update/delete) | Done | `POST/PUT/DELETE /itineraries/{id}/activities/{aid}` |
| Accommodation CRUD (add/delete) | Done | `POST/DELETE /itineraries/{id}/accommodations/{aid}` |
| Places search (debounced 300ms) | Done | `GET /places/search?query=...&city=...` |
| Places/saved (all pages) | Done | `GET /places/saved`, `POST /places/saved`, `DELETE /places/saved/{id}` |
| City detail | Done | `GET /places/destinations/{name}` + mock fallback |
| Share trip | Done | `POST /itineraries/{id}/share` → `TopActionBar` + `ItineraryView` |
| View shared trip | Done | `GET /shared/{shareToken}` → `SharedTripView` |
| Guest claim | Done | `POST /itineraries/{id}/claim` → `AuthContext` after login |
| Destinations list | Done | `GET /places/destinations` (uses DB/ETL data, with FE fallback data still present) |
| AI generate | Done (C.1) | `POST /itineraries/generate` → Gemini + DB recommendation context |

**Remaining sessionStorage/localStorage usage (acceptable):**

- JWT tokens (`services/api.ts`) — required for auth
- `TripWizardContext` manages wizard flow state in-memory; session survives page navigation within the same tab
- `currentTrip` cache in `useTripSync` — quick-restore fallback when API fails
- `userPreferences` in Onboarding — FE-only, no BE endpoint

---

## Phase C AI Integration Plan

Phase C adds AI capabilities incrementally. C.1 direct itinerary generation is implemented; C.2-C.5 remain roadmap items.

### 1. Direct Itinerary Generation Pipeline

**Current state:** `POST /itineraries/generate` is implemented for C.1 direct generation.

**Target architecture:**
```text
Frontend (CreateTrip.tsx)
  → POST /api/v1/itineraries/generate
  → Backend validation
  → ItineraryPipeline (Backend/src/itineraries/pipeline.py)
  → DB recommendation context from Goong-enriched places/hotels
  → Gemini structured JSON output
  → Pydantic validation + retry
  → save trip/day/activity/accommodation to DB
  → return ItineraryResponse (camelCase)
  → FE navigates to TripWorkspace with tripId
```

**Implemented Backend files:**
- `Backend/src/itineraries/pipeline.py` — LLM orchestration, DB context, validation, persistence
- `Backend/src/agent/` — Gemini config/client, prompts, output schemas
- Config: `GEMINI_API_KEY`, activity pacing, timeout, retry settings

**FE state:** `CreateTrip.tsx` calls `generateItinerary`; authenticated users navigate directly to `/trip-workspace?tripId=...`, guests keep a pending claim token before the protected-route login flow.

### 2. AI Companion Chat

**Current state:** `FloatingAIChat`, `AIPromoBubble`, `ContextualSuggestionsPanel`, and `companion/` components exist in FE but are mock/placeholder.

**Target architecture:**
```text
Frontend (FloatingAIChat.tsx)
  → POST /api/v1/agent/chat (new endpoint)
  → Backend intent routing (Supervisor/Router)
  → Read trip context (owner-check required)
  → Return proposedOperations + requiresConfirmation
  → FE shows proposed changes to user
  → User confirms → POST /api/v1/agent/apply-patch (new endpoint)
  → Backend applies patch to DB
```

**New Backend files needed:**
- `Backend/src/itineraries/router.py` (extend) — Chat + apply-patch endpoints
- `Backend/src/itineraries/companion.py` — Intent routing, tool-calling
- `Backend/src/places/suggestion_service.py` — DB-only suggestions (no LLM)

**New/modified FE files:**
- `FloatingAIChat.tsx` — Replace mock with real API calls
- `companion/DailyBrief.tsx`, `PlaceSuggestions.tsx` — Wire to real suggestions
- New: `services/agent.ts` — Chat/apply-patch API client

**Key invariant:** Chat never auto-persists DB changes before user confirms.

### 3. Chat History

**Current state:** `chat_sessions` and `chat_messages` tables exist in DB schema but no API endpoints.

**New Backend files needed:**
- `Backend/src/itineraries/router.py` (extend) — Chat history endpoints
- `Backend/src/itineraries/repository.py` (extend) — Chat DB queries
- `Backend/src/itineraries/chat_service.py`

### 4. Analytics (Optional EP-34)

**Current state:** Not implemented. `ENABLE_ANALYTICS=false` in `.env`.

**If enabled:** Needs read-only DB role, SQL allowlist, validator, max rows, audit log.

### Phase C File Map Summary

| Implemented C.1 Backend File | Purpose |
|---|---|
| `src/itineraries/pipeline.py` | LLM orchestration for generate |
| `src/agent/config.py` | AI config facade |
| `src/agent/llm.py` | Gemini client wrapper + JSON parsing |
| `src/agent/prompts/itinerary_prompts.py` | Generate prompt builder |
| `src/agent/schemas/itinerary_schemas.py` | Structured LLM output schemas |

| Remaining Backend File | Purpose |
|---|---|
| `src/itineraries/companion_service.py` | Intent routing, tool-calling for chat (C.3) |
| `src/itineraries/chat_service.py` | Chat session/message management (C.4) |
| `src/itineraries/router.py` (extend) | Chat + apply-patch endpoints (C.3) |
| `src/itineraries/router.py` (extend) | Chat history endpoints (C.4) |
| `src/itineraries/repository.py` (extend) | Chat DB queries (C.4) |

| New/Modified Frontend File | Purpose |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Replace mock with real API |
| `companion/*.tsx` | Wire to real suggestions |
| `CreateTrip.tsx` | Already wired to C.1 `generateItinerary` |

---

## What Still Needs To Be Done

- Implement AI companion chat with patch-confirm flow (C.3 — `feat/00048`).
- Implement C.4 chat history API after companion works.
- Wire C.2 FE: EP-30 API ready; `FloatingAIChat` / `PlaceSuggestions` still mock until a separate FE wire PR is approved.
- Expand Playwright e2e tests (trip workspace, calendar, accommodation).
- Add/run real `GOONG_API_KEY` ETL for more cities beyond the current local smoke data.
- Keep `docs/09_execution_tracker.md` updated for every branch/PR.

---

## Useful Docs

| File | Purpose |
|---|---|
| `Backend/README.md` | Backend quick start and gates |
| `docs/01_overview.md` | MVP2 status, reading order, doc rules |
| `docs/02_architecture.md` | System architecture |
| `docs/03_backend.md` | Backend modules, endpoints, flows |
| `docs/04_frontend.md` | Frontend routes, mock/API integration status |
| `docs/05_database_etl.md` | Database, Redis, ETL details |
| `docs/06_backend_phases.md` | Implemented Backend phases |
| `docs/06_ai_roadmap.md` | AI services target and roadmap |
| `docs/07_workflow_ci.md` | Workflow, branch, commit, PR and CI rules |
| `docs/08_testing_local_run.md` | Local run and test guide |
| `docs/09_execution_tracker.md` | Execution tracker by branch/task |
| `docs/10_automation_testing_report.md` | Latest automation testing report |
| `docs/11_phase_roadmap.md` | Phase C roadmap, DoD checklist, env per sub-phase |
| `.claude/context/00_project_overview.md` | Condensed current project truth |
| `CLAUDE.md` | Agent/project memory |
| `AGENTS.md` | Agent and skill coordination |

---

## Team

| Member | Role |
|---|---|
| KhoiBui16 | Leader - Backend - AI |
| DngChinh9h | Frontend |
| vanchi-3 | Frontend |

| Area | Stack |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind/MUI |
| Backend | FastAPI, SQLAlchemy async, Alembic, PostgreSQL |
| Cache | Redis |
| AI | Gemini C.1 direct generate implemented; companion chat pending |
| ETL | Goong-first ETL, OSM fallback, YAML sample hotels |
