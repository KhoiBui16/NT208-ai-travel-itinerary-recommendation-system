# 02. Kiến trúc hệ thống

## Sơ đồ logic

```text
Frontend React/Vite
  ├─ UI pages/components/hooks
  ├─ Mock/localStorage flows còn tồn tại
  └─ Gọi REST API Backend theo camelCase contract

FastAPI Backend
  ├─ api/v1 routers
  ├─ services: business rules
  ├─ repositories: DB queries
  ├─ schemas: Pydantic request/response
  ├─ models: SQLAlchemy ORM
  ├─ core: config, database, security, dependencies, Redis
  └─ etl: extract → transform → load

PostgreSQL
  ├─ users, refresh_tokens
  ├─ trips, trip_days, activities, accommodations, extra_expenses
  ├─ destinations, places, hotels, saved_places
  ├─ share_links, guest_claim_tokens, trip_ratings
  ├─ chat_sessions, chat_messages
  └─ scraped_sources

Redis
  ├─ destinations cache
  ├─ place search cache
  └─ rate-limit/cache infrastructure
```

## Backend layering

Luồng chuẩn:

```text
router → service → repository → model/database
```

- Router chỉ parse request, auth dependency, trả response schema.
- Service giữ business rule: owner check, claim/share token, validation nghiệp vụ.
- Repository giữ query DB, không chứa logic HTTP.
- Schema public ưu tiên `camelCase`; DB/model dùng `snake_case`.

## Config

Config không secret nằm trong `Backend/config.yaml`.

Secret/local config nằm trong `Backend/.env`, không commit:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET_KEY`
- `GEMINI_API_KEY`
- `GOONG_API_KEY`

Docker Compose override host nội bộ:

- API container dùng `db` cho PostgreSQL.
- API container dùng `redis` cho Redis.
- Chạy Backend trực tiếp trên host thì dùng `localhost`.

## AI architecture target

Generate itinerary có intent rõ nên không đi qua Supervisor:

```text
FE generate request → Backend validation → ItineraryPipeline
→ structured output → Pydantic validation → save trip/day/activity/accommodation
```

Companion chat mới cần intent routing:

```text
FE chat → Supervisor/Router → tool đọc trip/context
→ proposedOperations + requiresConfirmation
→ FE confirm → Backend apply patch
```

