# Phase Report: Backend Flow

Ngày báo cáo: 2026-05-26  
Status: PASS.

## Files Liên Quan

- `Backend/src/main.py`
- `Backend/src/core/dependencies.py`
- `Backend/src/core/rate_limiter.py`
- `Backend/src/itineraries/router.py`
- `Backend/src/itineraries/service.py`
- `Backend/src/itineraries/repository.py`
- `Backend/src/itineraries/pipeline.py`
- `Backend/src/places/models.py`

## Luồng BE Tổng Thể

```text
FastAPI app
-> /api/v1 router
-> domain router
-> dependencies
-> service
-> repository
-> SQLAlchemy models / Redis / external provider
```

## Storage

| Data | Storage |
|---|---|
| Trips, days, activities, accommodations | PostgreSQL |
| Places, hotels, destinations, scraped source | PostgreSQL |
| Guest claim token hash | PostgreSQL |
| Refresh token hash | PostgreSQL |
| AI quota | Redis |
| Places/destinations read cache | Redis |

## Generate Endpoint

```text
POST /api/v1/itineraries/generate
-> optional auth
-> RateLimiter user/guest
-> ItineraryService.generate()
-> ItineraryPipeline.generate()
-> TripRepository recommendation context
-> GeminiLLM
-> persist Trip/TripDay/Activity/Accommodation
-> return ItineraryResponse
```

## Kết Quả Test

- `uv run ruff check src tests`: pass.
- `uv run ruff format --check src tests`: pass.
- `uv run alembic upgrade head`: pass.
- `uv run alembic check`: pass.
- `uv run pytest tests/unit/ -v --tb=short`: 93 passed.
- `uv run pytest tests/integration/ -v --tb=short`: 36 passed, 6 skipped.
