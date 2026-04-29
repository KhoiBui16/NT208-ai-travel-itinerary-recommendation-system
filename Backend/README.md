# DuLichViet API Backend

MVP2 backend foundation for the AI travel itinerary recommendation system.

## Current state

This folder now contains the new MVP2 skeleton under `src/` while the old MVP1 code still exists under `app/`. Domain features will be migrated gradually by ticket.

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
curl http://localhost:8000/health
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
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
uv run alembic upgrade head
```

## Notes

- Public API JSON must stay camelCase.
- `GET /itineraries/{id}` is owner-only.
- Public share uses `shareToken`.
- Guest claim uses one-time `claimToken`.
- AI generate uses the direct `ItineraryPipeline`, not Supervisor.
