# DuLichViet API Backend

MVP2 backend for the AI travel itinerary recommendation system.

## Current state

Implemented so far:

- Foundation: `src/`, `uv`, Alembic, async SQLAlchemy, centralized config, Docker.
- Auth/users: register, login, refresh, logout, profile, password change.
- Itineraries: CRUD, nested days/activities/accommodations, owner checks, share token, claim token, rating.
- Places: destinations, place search/detail, saved places, Redis read cache.
- ETL: OSM/Goong extractors, transformers, DB upsert loader, sample hotel data.

Not implemented yet: Phase C AI services. `POST /api/v1/itineraries/generate` is still a stub until the direct AI itinerary pipeline is built.

## Quick start

```bash
cd Backend
copy .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --reload
```

Health check:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status":"healthy"}
```

## Docker

```bash
copy Backend\.env.example Backend\.env
docker compose up --build
```

Services:

- API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Development gates

```bash
cd Backend
uv run ruff check src/
uv run ruff format --check src/
uv run alembic check
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
uv run alembic upgrade head
```

Run DB-backed integration tests locally:

```bash
docker compose up -d db redis
set CI=true
uv run pytest tests/integration/ -v
```

## ETL

Without a Goong/Google Maps key, local ETL can still load sample hotels:

```bash
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Full place extraction uses OSM and optionally Goong when `GOONG_API_KEY` is configured:

```bash
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng"
```

Configured cities live in `config.yaml` under `etl.cities`.

## Notes

- Public API JSON must stay camelCase.
- `GET /itineraries/{id}` is owner-only.
- Public share uses `shareToken`.
- Guest claim uses one-time `claimToken`.
- AI generate uses the direct `ItineraryPipeline`, not Supervisor.
