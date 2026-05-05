# DuLichViet API Backend

MVP2 backend for the AI travel itinerary recommendation system.

## Current state

Implemented:

- Foundation: `src/`, `uv`, Alembic, async SQLAlchemy, centralized config, Docker.
- Auth/users: register, login, refresh, logout, profile, password change, forgot/reset password.
- Itineraries: CRUD, nested days/activities/accommodations, owner checks, share token, claim token, rating.
- Places: destinations, place search/detail, saved places, Redis read cache.
- ETL: OSM/Goong extractors, transformers, DB upsert loader, sample hotel data.
- Tests: 111 BE tests (75 unit + 36 integration), 11 FE e2e tests.

Not implemented yet: Phase C AI services. `POST /api/v1/itineraries/generate` is still a stub until the direct AI itinerary pipeline is built.

## Architecture overview

Source code is organized by domain (not by type):

```
src/
├── auth/              # Authentication & user profile
│   ├── router.py      #   EP 1–7, 31, 32 (auth + users + forgot/reset)
│   ├── service.py     #   AuthService: register, login, refresh, logout, forgot/reset
│   ├── profile_service.py  #   UserService: profile CRUD, change password
│   ├── repository.py  #   UserRepository, RefreshTokenRepository
│   ├── models.py      #   User, RefreshToken
│   ├── schemas.py     #   Auth + User request/response schemas
│   ├── dependencies.py #   get_current_user, get_current_user_optional
│   └── email.py       #   SMTP email sender (console fallback)
├── itineraries/       # Trip management
│   ├── router.py      #   EP 8–20, 32 (trips + activities + accommodations + share + claim)
│   ├── service.py     #   ItineraryService: CRUD, generate (stub), share, claim, rating
│   ├── repository.py  #   TripRepository
│   ├── schemas.py     #   Itinerary request/response schemas
│   └── models/
│       ├── trip.py    #   Trip, TripDay, Activity, ExtraExpense, Accommodation
│       ├── extras.py  #   ShareLink, GuestClaimToken, TripRating
│       └── chat.py    #   ChatSession, ChatMessage (for Phase C)
├── places/            # Places & destinations
│   ├── router.py      #   EP 21–27 (destinations, search, saved places)
│   ├── service.py     #   PlaceService (with CacheClient composition)
│   ├── repository.py  #   PlaceRepository
│   ├── models.py      #   Place, Hotel, Destination, SavedPlace, ScrapedSource
│   └── schemas.py     #   Place request/response schemas
├── shared/            # Shared utilities
│   ├── cache.py       #   CacheClient (composition-based Redis wrapper)
│   ├── pagination.py  #   PaginatedResponse generic
│   └── service.py     #   BaseService
├── core/              # Infrastructure
│   ├── config.py      #   AppSettings (pydantic-settings, .env + config.yaml)
│   ├── database.py    #   AsyncEngine, session factory, Base
│   ├── dependencies.py #   DI chain: get_db → get_*_repo → get_*_service
│   ├── security.py    #   JWT + bcrypt + password reset tokens
│   ├── exceptions.py  #   Custom HTTP exceptions
│   ├── logger.py      #   structlog configuration
│   ├── middlewares.py  #   CORS, logging, global error handler
│   ├── rate_limiter.py #   Redis rate limiter (AI + general)
│   └── schema.py      #   CamelCaseModel (snake_case ↔ camelCase)
├── etl/               # ETL pipeline (unchanged by refactor)
└── main.py            #   App factory with inline health + domain routers
```

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Docker & Docker Compose (for PostgreSQL and Redis)
- Node.js 18+ and npm (for Frontend)

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/NT208-ai-travel-itinerary-recommendation-system.git
cd NT208-ai-travel-itinerary-recommendation-system
```

### 2. Start PostgreSQL and Redis with Docker

```bash
docker compose up -d db redis
```

This starts:
- PostgreSQL 16 on `localhost:5432` (database: `dulichviet`, user: `postgres`, password: `postgres`)
- Redis 7 on `localhost:6379`

### 3. Configure Backend

```bash
cd Backend
copy .env.example .env
```

Edit `.env` and fill in the required values:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
JWT_SECRET_KEY=<your-secret-key>
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=          # Optional for now (Phase C)
GOONG_API_KEY=           # Optional (ETL with real data)
```

### 4. Install dependencies and run migrations

```bash
uv sync
uv run alembic upgrade head
```

### 5. Start the Backend server

```bash
uv run uvicorn src.main:app --reload
```

Verify at http://localhost:8000/api/v1/health — should return `{"status":"healthy"}`.

Swagger UI: http://localhost:8000/docs

### 6. Start the Frontend

Open a new terminal:

```bash
cd Frontend
npm install
npm run dev
```

The Frontend runs on http://localhost:5173 and connects to the Backend at `http://localhost:8000` by default.

To override the Backend URL, create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 7. Load sample data (optional)

Without a Goong/Google Maps API key, you can load sample hotel data:

```bash
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Full place extraction uses OSM and optionally Goong:

```bash
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

## Docker Compose (full stack)

To run all services together:

```bash
# From project root
copy Backend\.env.example Backend\.env
docker compose up --build
```

Services:

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:8000 | FastAPI backend |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache + rate limiter |

## Development gates

Run these before every commit:

```bash
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic check
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
```

Run DB-backed integration tests locally:

```bash
docker compose up -d db redis
set CI=true
uv run pytest tests/integration/ -v
```

## Frontend e2e tests

Requires both BE and FE servers running:

```bash
cd Frontend
npm run test:e2e          # Playwright e2e (headless)
npm run test:e2e:headed   # headed mode
```

## FE ↔ BE Communication

The Frontend connects to the Backend via `VITE_API_URL` (defaults to `http://localhost:8000`). All API calls go through `/api/v1/` prefix. The API client (`services/api.ts`) handles:

- JWT Bearer token injection on every request
- Silent token refresh on 401 responses
- Typed request/response with TypeScript interfaces

## Notes

- Public API JSON uses camelCase (via `CamelCaseModel` base).
- `GET /itineraries/{id}` is owner-only. Public share uses `shareToken`.
- Guest claim uses one-time `claimToken`.
- AI generate will use the direct `ItineraryPipeline`, not a Supervisor.
