# DuLichViet Backend

FastAPI backend for the NT208 AI travel itinerary recommendation system.

## Current State

| Area | Status |
|---|---|
| Foundation | `src/`, `uv`, Alembic, async SQLAlchemy, centralized config, Docker |
| Auth/users | Register, login, refresh rotation, logout, profile, change password, forgot/reset password |
| Itineraries | CRUD, days, activities, accommodations, share token, guest claim token, rating |
| Places | Destinations, search/detail, saved places, Redis read cache |
| ETL | Goong-first autocomplete/detail/geocode, OSM fallback, transformers, DB upsert loader, sample hotels |
| AI C.1 | Implemented: `POST /api/v1/itineraries/generate` builds DB recommendation context, calls Gemini, validates, retries, persists generated trip data, and enforces user/guest quota |
| AI C.2 | Implemented: `GET /api/v1/agent/suggest/{activity_id}` DB-only suggestion service |
| AI C.3A | Implemented: Chat session REST APIs (EP-37/38/39), FE ChatPanel component, e2e tests |
| AI C.3B/C.3C | Merged (#105): trip-bound `POST/GET /itineraries/chat-sessions/{sessionId}/messages`, `POST /itineraries/{tripId}/apply-patch`, real Gemini call, persisted `chat_messages`, stale proposal handling, auth-user chat quota riêng |
| AI C.4 | Merged (#106): chat history persisted + session management (rename/delete/switcher/load-more); apply-patch rate limit riêng + ETL scheduler wired vào compose (profile `etl`) |
| Remaining AI | C.5 Analytics Text-to-SQL — optional/deferred (chưa implement; cần guardrails nếu bật) |
| Verified 2026-06-24 | Ruff check pass, Alembic upgrade/check pass, `187 unit + 77 integration` collected (43 int pass + 34 CI-gated skip local), ETL scheduler compose profile smoke pass |

## Architecture

The backend is organized by domain:

```text
src/
├── main.py                  # App factory and /api/v1 routers
├── auth/                    # Auth, refresh tokens, profile, password reset
├── itineraries/             # Trip CRUD, share/claim, C.1 AI generate pipeline, C.3A/C.3B chat
│   ├── pipeline.py          # DB context -> Gemini -> validation -> persistence
│   ├── companion_service.py # Trip-bound companion message flow + provider abstraction
│   ├── router.py            # /api/v1/itineraries endpoints
│   ├── repository.py        # DB queries including recommendation context
│   ├── service.py           # Trip CRUD + guest claim + chat session orchestration
│   └── models/              # Trip, activity, accommodation, claim/share/chat models
├── places/                  # Destinations, places, hotels, saved places
├── geo/                     # Goong REST client infrastructure
├── etl/                     # Goong/OSM extract-transform-load pipeline
├── agent/                   # C.1 AI config, Gemini client, prompts, output schemas
├── core/                    # Config, DB, security, dependencies, middleware, rate limiter
└── shared/                  # CacheClient, pagination, base service helpers
```

## Environment

Copy the template and fill local secrets:

```powershell
cd Backend
Copy-Item .env.example .env
```

| Variable | Required? | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | Required for real auth | Sign access/refresh JWTs |
| `DATABASE_URL` | Default works with local Docker | PostgreSQL async URL |
| `REDIS_URL` | Default works with local Docker | Cache and AI quota |
| `GOONG_API_KEY` | Required for real Goong ETL | Autocomplete, place detail, geocode. Backend cũng chấp nhận alias `GOONG_MAP_KEY` / `GOONG_MAP_API_KEY` (cùng field). Key map-tiles public `VITE_GOONG_MAP_API_KEY` chỉ dùng ở FE (Vercel), **không** cần set ở backend. |
| `GEMINI_API_KEY` | Required for real AI generate | Gemini C.1 generation |
| `AGENT_TIMEOUT_SECONDS` | Optional, default 30 | Local smoke can use 60 or 120 if provider latency is high |
| `AGENT_MIN_ACTIVITIES_PER_DAY` | Optional, default 5 | Minimum C.1 activities per day |
| `AGENT_MAX_ACTIVITIES_PER_DAY` | Optional, default 5 | Maximum C.1 activities per day |
| `RATE_LIMIT_AI_CHAT_USER` | Optional, default from config | Daily auth-user quota for companion chat |
| `ENABLE_ANALYTICS` | Optional, default false | Keep disabled until C.5 guardrails exist |

Never commit `Backend/.env`.

## Local Start

Terminal 1, from repo root:

```powershell
docker compose up -d db redis
docker compose ps
```

Terminal 2:

```powershell
cd Backend
uv sync
uv run alembic upgrade head
$env:AGENT_TIMEOUT_SECONDS="120"
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"
uv run uvicorn src.main:app --host localhost --port 8000 --reload
```

Health and Swagger:

```powershell
curl.exe http://localhost:8000/api/v1/health
start http://localhost:8000/docs
```

## Data Pipeline

Sample hotels only:

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

Goong-first ETL for places:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội"
```

ETL flow:

```text
city -> Goong geocode city center
     -> Goong autocomplete by category keyword
     -> Goong place detail
     -> OSM fallback when needed
     -> transform/validate/dedupe
     -> upsert destinations/places/hotels
     -> invalidate Redis places/destinations cache
```

## AI Generate Flow

Endpoint:

```http
POST /api/v1/itineraries/generate
```

Request shape:

```json
{
  "destination": "Hà Nội",
  "startDate": "2026-06-01",
  "endDate": "2026-06-03",
  "budget": 5000000,
  "adults": 2,
  "children": 0,
  "interests": ["food", "attraction"]
}
```

Runtime flow:

```text
router optional auth
-> user or guest AI rate limit in Redis
-> ItineraryService.generate()
-> ItineraryPipeline.generate()
-> resolve destination
-> load Goong-enriched places/hotels from PostgreSQL
-> build compact recommendation prompt
-> Gemini structured JSON
-> Pydantic + business validation
-> persist Trip/TripDay/Activity/Accommodation
-> return ItineraryResponse
```

Guest behavior:

- Guest generate is allowed.
- The returned `claimToken` is raw only in the API response.
- The database stores only the token hash in `guest_claim_tokens`.
- After login/register, FE calls `POST /api/v1/itineraries/{tripId}/claim`.

AI quota:

| Scope | Actor | Redis key |
|---|---|---|
| Generate | Auth user | `rate:ai:user:{user_id}:{YYYYMMDD}` |
| Generate | Guest | `rate:ai:guest:{hash(ip + user-agent)}:{YYYYMMDD}` |
| Companion chat | Auth user | `rate:ai:chat:user:{user_id}:{YYYYMMDD}` |
| Apply-patch | Auth user | `rate:ai:apply_patch:user:{user_id}:{YYYYMMDD}` |

Redis fail mode is closed by default, so AI endpoints return 503 if quota tracking is unavailable.

## Test Gates

Run before opening a PR:

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v --tb=short
uv run pytest tests/integration/ -v --tb=short
```

Expected local result (verified 2026-06-24):

| Gate | Result |
|---|---|
| Ruff check | Pass |
| Ruff format check | Pass |
| Alembic upgrade/check | Pass |
| Backend unit | `187 passed` |
| Backend integration | `77 collected` (43 pass + 34 CI-gated skip local; đủ trên CI postgres) |
| Real AI smoke | Generate + companion chat (phụ thuộc tình trạng provider Gemini) |

## Debug Notes

| Symptom | Meaning | Check |
|---|---|---|
| `422` from `/generate` | Destination missing or insufficient DB context | Run Goong ETL and confirm places exist |
| `429` from `/generate` | User/guest AI quota exhausted | Check Redis `rate:ai:*` keys |
| `429` from `/chat-sessions/{id}/messages` | Auth user chat quota exhausted | Check Redis `rate:ai:chat:user:*` keys |
| `503 Gemini request timed out` | Provider latency exceeded timeout | Timeout is now dynamic per request size; inspect `ai_generate_*` logs |
| `503 AI companion...` | Chat provider invalid response or Redis fail-closed | Inspect `companion_chat_*` logs and Redis health |
| `503 AI rate limiter unavailable` | Redis unavailable and fail-closed | Start Redis or fix `REDIS_URL` |
| FE shows generic generate error | FE hides detailed BE error | Inspect network response and backend logs |

Do not log provider keys, JWTs, refresh tokens, or raw claim tokens.

## Recent Fixes (00062 - 2026-06-09)

Four PRs were merged to fix critical data flow and UX issues:

| PR | Focus | Key fixes |
|---|---|---|
| #86 | Data contracts | SQLAlchemy async eager loading for `extra_expenses`; case-insensitive + fuzzy destination matching; trip_days auto-seeding for manual trips |
| #87 | FE error handling | Toast notifications for silent failures instead of generic errors |
| #89 | AI pipeline | Dynamic timeout based on request size; reduced prompt context |
| #90 | DB data quality | Migration 20260609_0007 to seed trip_days for existing manual trips |

## Recent Fixes (BUG-BE-003 - 2026-06-10)

One PR merged to fix destination slugify fuzzy matching:

| PR | Focus | Key fixes |
|---|---|---|
| #92 | Destination slugify | Extracted `slugify()` to `core/slugify.py`; places service now uses slugify for "Ha Noi" → "ha-noi" → DB match; itineraries repository refactored to use shared slugify; added Browserbase automation skill and MCP skills guide |

**Infrastructure improvements:**
- Redis `maxmemory` configured to 128mb with `allkeys-lru` eviction policy
- SQLAlchemy async relationship loading fixed for nested accommodations/activities
- Destination matching now handles case variations and partial matches (e.g., "Hà Nội" matches "ha noi")

---

## Documentation

📖 **Comprehensive documentation:** See [`docs/INDEX.md`](../docs/INDEX.md) for:
- Architecture and design docs
- API reference and endpoint documentation
- Testing strategies and results
- Issue tracking and bug reports
- Phase C implementation status

**Key docs for Backend:**
- [`docs/03_backend.md`](../docs/03_backend.md) - Backend architecture and API reference
- [`docs/05_database_etl.md`](../docs/05_database_etl.md) - Database schema and ETL pipeline
- [`docs/06_ai_roadmap.md`](../docs/06_ai_roadmap.md) - AI implementation roadmap
- [`docs/08_testing_local_run.md`](../docs/08_testing_local_run.md) - Local testing guide
- [`docs/REPORTS/00060k_r2_backend_testing_report.md`](../docs/REPORTS/00060k_r2_backend_testing_report.md) - Backend testing report (snapshot 2026-06-09; current inventory xem `docs/08_testing_local_run.md`)

