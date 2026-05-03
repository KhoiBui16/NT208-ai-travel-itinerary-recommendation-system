# NT208 AI Travel Itinerary Recommendation System

DuLichViet is a web-based travel itinerary system with a React/Vite frontend,
FastAPI backend, PostgreSQL database, Redis cache, and planned AI itinerary
generation/chat services.

This README is the single source of truth for running the project locally.

---

## Current Status

### Implemented (BE)

- Auth: register, login, refresh-token rotation, logout, profile, change password.
- Itinerary CRUD: create/list/get/update/delete, nested days/activities/accommodations, owner-only check, rating.
- Share/claim: public `shareToken`, one-time `claimToken` with hash + expiry.
- Places: destinations, destination detail, place search/detail, saved places, Redis read cache.
- ETL: OSM/Goong extractors, transformers, DB upsert loader, sample hotel data.
- **24 API endpoints** registered, 108 tests (66 unit + 42 integration) passing.

### Implemented (FE)

- UI under `Frontend/` with Vite + React + TypeScript + Tailwind/MUI.
- Routes for home, city list/detail, auth, trip setup, workspace, history, saved places, settings.
- API client layer with JWT auto-refresh (`Frontend/src/app/services/`).
- Auth, profile, trip list, saved places connected to backend API.
- `AuthContext` manages JWT state; 7 protected routes redirect to `/login`.
- Type contract at `Frontend/src/app/types/trip.types.ts`.
- Builds successfully (production bundle 1.1 MB).

### Not yet implemented

- **Phase C AI**: `POST /itineraries/generate` is a stub (creates empty trip, no LLM call). No companion chat, no patch-confirm flow, no chat history API.
- **FE-BE integration**: Auth, profile, trip list, and saved places are connected. Trip workspace auto-save and budget still use localStorage. See [FE-BE Status](#fe-be-integration-status) below.
- Full ETL with real place data needs `GOONG_API_KEY`.

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

```powershell
copy Backend\.env.example Backend\.env
```

Edit `Backend/.env` — at minimum set `JWT_SECRET_KEY` to a long random string:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste the output into `JWT_SECRET_KEY`. Never commit `Backend/.env`.

Full recommended `.env`:

```env
# App
APP_NAME=DuLichViet API
APP_VERSION=2.0.0
ENVIRONMENT=development
APP_DEBUG=true
FRONTEND_URL=http://localhost:5173

# Local host database and Redis (used when running BE locally)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=<paste-your-random-secret-here>

# AI providers (leave empty until Phase C)
GEMINI_API_KEY=
GOONG_API_KEY=

# Optional analytics
ENABLE_ANALYTICS=false
ANALYTICS_DATABASE_URL=
```

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

Verify: open http://localhost:8000/docs — you should see Swagger UI with 24 endpoints.

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
├── Backend/                  # FastAPI MVP2 backend
│   ├── src/                  # Current backend source of truth
│   ├── tests/                # Unit + integration tests
│   ├── alembic/              # DB migrations
│   ├── config.yaml           # Shared non-secret app config
│   ├── .env.example          # Local env template
│   └── README.md             # Backend-specific notes
├── Frontend/                 # Vite React frontend
├── docs/                     # Project documentation source of truth
├── .claude/context/          # Condensed operational plan for agents
├── docker-compose.yml        # API + PostgreSQL + Redis
├── CLAUDE.md                 # Agent memory for this repo
└── AGENTS.md                 # Agent and skill coordination guide
```

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

### Frontend build check

```powershell
cd Frontend
npm run build
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

All FE pages now connect to the backend via an API client layer (`Frontend/src/app/services/`). JWT tokens are stored in `localStorage` (access + refresh) with auto-refresh on 401. The legacy `utils/auth.ts` mock is no longer imported by any page.

| FE Feature | Status | API Endpoint |
|---|---|---|
| Auth (login/register/logout) | Done | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` |
| User profile | Done | `GET /users/profile`, `PUT /users/profile` |
| Password change | Done | `PUT /users/password` |
| Trip CRUD (list/create/update/delete) | Done | `POST /itineraries`, `GET /itineraries`, `PUT /itineraries/{id}`, `DELETE /itineraries/{id}` |
| Trip rating | Done | `PUT /itineraries/{id}/rating` |
| Places/saved (all pages) | Done | `GET /places/saved`, `POST /places/saved`, `DELETE /places/saved/{id}` |
| Trip workspace save | Done | `PUT /itineraries/{id}` via `useTripSync` |
| Destinations | Hardcoded | `GET /places/destinations` (pending ETL data) |
| Trip share | Backend ready | `POST /itineraries/{id}/share`, `GET /shared/{token}` |
| Guest claim | Backend ready | `POST /itineraries/{id}/claim` |
| Budget | React state | Part of itinerary update |
| AI generate | Stub | `POST /itineraries/generate` (Phase C) |

**Remaining localStorage usage (acceptable):**

- JWT tokens (`services/api.ts`) — required
- Wizard flow state (`tripDestinations`, `tripDayAllocations`, `tripTravelers`) — passes data between pages before itinerary exists; no draft endpoint on BE
- `currentTrip` cache in `useTripSync` — quick-restore fallback when API fails
- `userPreferences` in Onboarding — FE-only, no BE endpoint

---

## What Still Needs To Be Done

- Implement Phase C AI direct itinerary pipeline (replace stub with Gemini call).
- Implement AI companion chat with patch-confirm flow.
- Persist chat history with `chat_sessions` and `chat_messages`.
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
| `docs/08_testing_local_run.md` | Local run and test guide |
| `docs/09_execution_tracker.md` | Execution tracker by branch/task |
| `docs/10_automation_testing_report.md` | Latest automation testing report |
| `.claude/context/00_project_overview.md` | Condensed current project truth |
| `CLAUDE.md` | Agent/project memory |
| `AGENTS.md` | Agent and skill coordination |

---

## Team

| Member / Area | Role / Stack |
|---|---|
| KhoiBui16 | Leader - Backend - AI |
| Frontend | React, TypeScript, Vite, Tailwind/MUI |
| Backend | FastAPI, SQLAlchemy async, Alembic, PostgreSQL |
| Cache | Redis |
| AI | Gemini planned, direct pipeline pending |
| ETL | OSM, Goong, YAML sample hotels |
