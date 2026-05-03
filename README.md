# NT208 AI Travel Itinerary Recommendation System

DuLichViet is a web-based travel itinerary system with a React/Vite frontend,
FastAPI backend, PostgreSQL database, Redis cache, and planned AI itinerary
generation/chat services.

This README is the main local setup guide for the current MVP2 codebase.

---

## Current Status

Implemented:

- Frontend revamp UI under `Frontend/` with Vite + React + TypeScript.
- Backend MVP2 foundation under `Backend/src/` with `uv`, FastAPI, async SQLAlchemy, Alembic, and centralized config.
- Auth/users, itinerary CRUD, share token, guest claim token, places, saved places, Redis read cache.
- ETL foundation with OSM/Goong extractors, transformers, DB upsert loader, and sample hotel data.
- Docker Compose for Backend API + PostgreSQL + Redis.

Not complete yet:

- Phase C AI services are still pending. `POST /api/v1/itineraries/generate` is still a stub until the direct AI pipeline is implemented.
- Full ETL with real place data needs `GOONG_API_KEY`.
- Docker Compose does not yet include a dedicated frontend service. Frontend can be run with host Node.js or a temporary Node Docker container.
- FE mock datasets are still sparser than the backend ETL data for some cities/hotels/places.

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
├── plan/                     # Long-form BE/AI/ETL roadmap and tracker
├── .claude/context/          # Condensed operational plan for agents
├── docker-compose.yml        # API + PostgreSQL + Redis
├── CLAUDE.md                 # Agent memory for this repo
└── AGENTS.md                 # Agent/skill coordination guide
```

---

## Prerequisites

### Option A: Docker-only minimum

Install:

- Git
- Docker Desktop

With only Docker, you can run:

- PostgreSQL
- Redis
- Backend API container
- Frontend via a temporary `node:20-alpine` container

### Option B: Full local development

Install:

- Git
- Docker Desktop
- Node.js 20 LTS
- `uv` Python package manager

Recommended checks:

```powershell
git --version
docker --version
node --version
uv --version
```

---

## Environment Setup

Copy the backend environment template:

```powershell
copy Backend\.env.example Backend\.env
```

Never commit `Backend/.env`.

Recommended local `Backend/.env`:

```env
# App
APP_NAME=DuLichViet API
APP_VERSION=2.0.0
ENVIRONMENT=development
APP_DEBUG=true
FRONTEND_URL=http://localhost:5173

# Local host database and Redis
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=replace-with-a-long-random-secret-for-local-dev

# AI providers
GEMINI_API_KEY=
GOONG_API_KEY=

# Optional analytics, keep disabled until guardrails are implemented
ENABLE_ANALYTICS=false
ANALYTICS_DATABASE_URL=
```

Generate a local JWT secret:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

If Python is not installed, use any password/secret generator and paste a long
random string into `JWT_SECRET_KEY`.

### Redis URL Rules

Use this when running Backend directly on your machine:

```env
REDIS_URL=redis://localhost:6379/0
```

Use this inside Docker Compose API container:

```env
REDIS_URL=redis://redis:6379/0
```

`docker-compose.yml` already overrides container values:

```yaml
DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/dulichviet
REDIS_URL: redis://redis:6379/0
FRONTEND_URL: http://localhost:5173
```

So `Backend/.env` can keep `localhost` values for local host development, while
Compose uses `db` and `redis` service names inside containers.

---

## Run With Docker Only

Use this path when the machine only has Docker Desktop and Git.

### 1. Start Backend, PostgreSQL, Redis

```powershell
docker compose up --build
```

Open:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The API container runs Alembic migrations automatically before starting Uvicorn.

### 2. Run Frontend With Node Docker Container

Open a second terminal at the repo root:

```powershell
docker run --rm -it `
  --name dulichviet-fe `
  -p 5173:5173 `
  -v "${PWD}\Frontend:/app" `
  -w /app `
  node:20-alpine `
  sh -c "npm ci && npm run dev -- --host 0.0.0.0"
```

Open:

- Frontend: http://localhost:5173

Stop servers with `Ctrl+C`.

Stop backend containers:

```powershell
docker compose down
```

Reset database data if needed:

```powershell
docker compose down -v
```

---

## Run With Local Node + uv

Use this path for normal development.

### 1. Start Infrastructure

```powershell
docker compose up -d db redis
```

### 2. Start Backend

```powershell
cd Backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --reload --port 8000
```

Backend URLs:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

### 3. Start Frontend

Open a new terminal:

```powershell
cd Frontend
npm ci
npm run dev
```

Frontend URL:

- http://localhost:5173

---

## Tests And Verification

Backend gates:

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v
```

DB-backed integration tests:

```powershell
docker compose up -d db redis
cd Backend
$env:CI="true"
uv run pytest tests/integration/ -v
```

Full backend test suite:

```powershell
cd Backend
$env:CI="true"
uv run pytest tests/ -v
```

Frontend build:

```powershell
cd Frontend
npm run build
```

---

## ETL

ETL config lives in:

- `Backend/config.yaml`
- `Backend/src/core/config.py`

Configured values:

- `etl.cities`
- `etl.update_interval_days`
- `etl.max_places_per_city`

Load sample hotels without Goong/Google key:

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Run ETL for selected cities:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

Full real-data ETL needs:

```env
GOONG_API_KEY=your-goong-api-key
```

Do not commit real API keys.

---

## Local Ports

| Service | Local URL / Port |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Health | http://localhost:8000/api/v1/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

If port `8000` is blocked on Windows, run Backend on another port:

```powershell
cd Backend
uv run uvicorn src.main:app --reload --port 8001
```

Then update frontend API config if the FE code expects port `8000`.

---

## What Still Needs To Be Added

- Add real `GOONG_API_KEY` for full ETL runs.
- Implement Phase C AI direct itinerary pipeline.
- Implement AI companion chat with patch-confirm flow.
- Persist chat history with `chat_sessions` and `chat_messages`.
- Decide whether to add a real frontend service to `docker-compose.yml`.
- Expand FE mock data or connect all city/hotel/place views fully to BE APIs.
- Run final full-stack verification after API keys are configured.
- Keep `plan/17_execution_tracker.md` updated for every branch/PR.

---

## Useful Docs

| File | Purpose |
|---|---|
| `Backend/README.md` | Backend quick start and gates |
| `plan/15_todo_checklist.md` | Long task checklist |
| `plan/17_execution_tracker.md` | Execution tracker by branch/task |
| `.claude/context/00_project_overview.md` | Condensed current project truth |
| `CLAUDE.md` | Agent/project memory |
| `AGENTS.md` | Agent and skill coordination |

---

## Team

| Area | Stack |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind/MUI |
| Backend | FastAPI, SQLAlchemy async, Alembic, PostgreSQL |
| Cache | Redis |
| AI | Gemini planned, direct pipeline pending |
| ETL | OSM, Goong, YAML sample hotels |
