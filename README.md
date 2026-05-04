# NT208 AI Travel Itinerary Recommendation System

DuLichViet is a web-based travel itinerary system with a React/Vite frontend,
FastAPI backend, PostgreSQL database, Redis cache, and planned AI itinerary
generation/chat services.

This README is the single source of truth for running the project locally.

---

## Current Status

### Implemented (BE)

- Auth: register, login, refresh-token rotation, logout, profile, change password, forgot-password, reset-password.
- Email service: `aiosmtplib` (async SMTP) + console fallback for local dev.
- Itinerary CRUD: create/list/get/update/delete, nested days/activities/accommodations, owner-only check, rating.
- Share/claim: public `shareToken`, one-time `claimToken` with hash + expiry.
- Places: destinations, destination detail, place search/detail, saved places, Redis read cache.
- ETL: OSM/Goong extractors, transformers, DB upsert loader, sample hotel data.
- **33 API endpoints** registered (EP-0 to EP-32), 117 tests (75 unit + 42 integration) passing.

### Implemented (FE)

- UI under `Frontend/` with Vite + React + TypeScript + Tailwind/MUI.
- Full route set: home, city list/detail, auth, trip setup/workspace, history, saved places/itineraries, settings, profile, shared trip view, forgot-password, reset-password.
- API client layer with JWT auto-refresh (`Frontend/src/app/services/`): `api.ts`, `auth.ts` (incl. forgotPassword/resetPassword), `itinerary.ts`, `places.ts`, `users.ts`.
- `AuthContext` manages JWT state + guest-to-owner claim flow; **8 protected routes** redirect to `/login`.
- `TripWizardContext` replaces 6 sessionStorage keys for wizard flow (destinations, allocations, travelers, budget).
- `useTripSync` auto-saves via BE API (`createItinerary`/`updateItinerary`); sessionStorage only as quick-restore cache.
- `useActivityManager`/`useAccommodation`/`usePlacesManager` — optimistic CRUD with revert-on-failure.
- `CreateTrip` wired to `createItinerary` API, navigates to TripWorkspace with `tripId`.
- `ErrorBoundary` wraps entire app for graceful crash recovery.
- Type contract at `Frontend/src/app/types/trip.types.ts`.
- Builds successfully (production bundle 1.1 MB).

### Not yet implemented

- **Phase C AI**: `POST /itineraries/generate` is a stub (creates empty trip, no LLM call). No companion chat, no patch-confirm flow, no chat history API.
- Full ETL with real place data needs `GOONG_API_KEY`.
- Playwright e2e tests exist (11 tests) but don't yet cover trip workspace drag-and-drop, calendar interaction, or accommodation CRUD.

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

Edit `Backend/.env` — at minimum set `JWT_SECRET_KEY` to a long random string:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste the output into `JWT_SECRET_KEY`. Never commit `Backend/.env`.

**SMTP for password reset** (optional): If `SMTP_HOST` is empty (default), reset links are logged to the BE console instead of being emailed. To send real emails, fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` in `Backend/.env`.

**Frontend `.env`**: `Frontend/.env` only needs `VITE_API_URL=http://localhost:8000` (the default). Change it only if BE runs on a different port.

See `Backend/.env.example` and `Frontend/.env.example` for the full list of variables with comments.

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
uv run uvicorn src.main:app --reload --port 8000
```

Verify: open http://localhost:8000/docs — you should see Swagger UI with 33 endpoints.

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
│   │   ├── api/v1/                         #   Routers (auth, users, itineraries, places, shared, health)
│   │   ├── core/                           #   Config, database, security, dependencies, Redis, middleware
│   │   ├── models/                         #   SQLAlchemy ORM (user, trip, place, extras)
│   │   ├── repositories/                   #   DB query layer (user, trip, place, token repos)
│   │   ├── schemas/                        #   Pydantic request/response (auth, user, itinerary, place)
│   │   ├── services/                       #   Business logic (auth, user, itinerary, place, email services)
│   │   └── etl/                            #   ETL pipeline
│   │       ├── extractors/                 #     OSM + Goong extractors
│   │       ├── transformers/               #     Hotel + place transformers
│   │       ├── loaders/                    #     DB upsert loader
│   │       ├── data/                       #     hotels.yaml sample data
│   │       └── runner.py                   #     ETL CLI entry point
│   ├── tests/                              # Unit + integration tests
│   │   ├── unit/                           #   9 test modules (75 tests)
│   │   └── integration/                    #   5 test modules (42 tests)
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
├── scripts/
│   └── test_fullstack_smoke.ps1            # Full-stack smoke test script (16 HTTP checks)
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
npm run test:e2e        # Playwright e2e (needs BE running on localhost:8000)
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
| Destinations list | Hardcoded | `GET /places/destinations` (pending ETL data) |
| AI generate | Stub | `POST /itineraries/generate` (Phase C) |

**Remaining sessionStorage/localStorage usage (acceptable):**

- JWT tokens (`services/api.ts`) — required for auth
- `TripWizardContext` manages wizard flow state in-memory; session survives page navigation within the same tab
- `currentTrip` cache in `useTripSync` — quick-restore fallback when API fails
- `userPreferences` in Onboarding — FE-only, no BE endpoint

---

## Phase C AI Integration Plan

Phase C will add AI capabilities to the existing system. Here is how each piece will fit into the current architecture:

### 1. Direct Itinerary Generation Pipeline

**Current state:** `POST /itineraries/generate` is a stub that creates an empty trip.

**Target architecture:**
```text
Frontend (CreateTrip.tsx)
  → POST /api/v1/itineraries/generate
  → Backend validation
  → ItineraryPipeline (new: Backend/src/services/itinerary_pipeline.py)
  → Gemini LLM structured output
  → Pydantic validation + retry
  → save trip/day/activity/accommodation to DB
  → return ItineraryResponse (camelCase)
  → FE navigates to TripWorkspace with tripId
```

**New Backend files needed:**
- `Backend/src/services/itinerary_pipeline.py` — LLM orchestration, structured output parsing
- `Backend/src/schemas/generate.py` — Request/response schemas for AI generation
- Config: `GEMINI_API_KEY` in `.env`

**FE changes:** `CreateTrip.tsx` already calls `createItinerary` API. When generate endpoint is real, it will return a full itinerary instead of an empty one — no FE wiring change needed.

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
- `Backend/src/api/v1/agent.py` — Chat + apply-patch routers
- `Backend/src/services/companion_service.py` — Intent routing, tool-calling
- `Backend/src/services/suggestion_service.py` — DB-only suggestions (no LLM)

**New/modified FE files:**
- `FloatingAIChat.tsx` — Replace mock with real API calls
- `companion/DailyBrief.tsx`, `PlaceSuggestions.tsx` — Wire to real suggestions
- New: `services/agent.ts` — Chat/apply-patch API client

**Key invariant:** Chat never auto-persists DB changes before user confirms.

### 3. Chat History

**Current state:** `chat_sessions` and `chat_messages` tables exist in DB schema but no API endpoints.

**New Backend files needed:**
- `Backend/src/api/v1/chat.py` — Chat session/message endpoints
- `Backend/src/repositories/chat_repo.py`
- `Backend/src/services/chat_service.py`

### 4. Analytics (Optional EP-34)

**Current state:** Not implemented. `ENABLE_ANALYTICS=false` in `.env`.

**If enabled:** Needs read-only DB role, SQL allowlist, validator, max rows, audit log.

### Phase C File Map Summary

| New Backend File | Purpose |
|---|---|
| `src/services/itinerary_pipeline.py` | LLM orchestration for generate |
| `src/services/companion_service.py` | Intent routing, tool-calling for chat |
| `src/services/suggestion_service.py` | DB-only place suggestions |
| `src/services/chat_service.py` | Chat session/message management |
| `src/api/v1/agent.py` | Chat + apply-patch endpoints |
| `src/api/v1/chat.py` | Chat history endpoints |
| `src/schemas/generate.py` | AI generate request/response |
| `src/repositories/chat_repo.py` | Chat DB queries |

| New/Modified Frontend File | Purpose |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Replace mock with real API |
| `companion/*.tsx` | Wire to real suggestions |
| `CreateTrip.tsx` | No change needed (already wired) |

---

## What Still Needs To Be Done

- Implement Phase C AI direct itinerary pipeline (replace stub with Gemini call).
- Implement AI companion chat with patch-confirm flow.
- Persist chat history with `chat_sessions` and `chat_messages`.
- Expand Playwright e2e tests (trip workspace, calendar, accommodation).
- Add real `GOONG_API_KEY` for full ETL runs.
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
| AI | Gemini planned, direct pipeline pending |
| ETL | OSM, Goong, YAML sample hotels |
