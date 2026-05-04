# 02. Kiến trúc hệ thống

## Sơ đồ logic

```text
Frontend React/Vite
  ├─ UI pages/components/hooks
  ├─ API client layer (services/api.ts + 4 modules) với JWT auto-refresh
  ├─ AuthContext (JWT state, claim flow) + TripWizardContext (wizard flow)
  ├─ ErrorBoundary bọc toàn app
  ├─ Mock data chỉ làm fallback khi BE không có data
  └─ Gọi REST API Backend theo camelCase contract

FastAPI Backend
  ├─ api/v1 routers (auth, users, itineraries, places, shared, health)
  ├─ services: business rules (auth, user, itinerary, place)
  ├─ repositories: DB queries (user, trip, place, token)
  ├─ schemas: Pydantic request/response (camelCase)
  ├─ models: SQLAlchemy ORM (snake_case)
  ├─ core: config, database, security, dependencies, Redis, middleware
  └─ etl: extract (OSM, Goong) → transform → load (DB upsert)

PostgreSQL
  ├─ users, refresh_tokens
  ├─ trips, trip_days, activities, accommodations, extra_expenses
  ├─ destinations, places, hotels, saved_places
  ├─ share_links, guest_claim_tokens, trip_ratings
  ├─ chat_sessions, chat_messages (schema sẵn, chưa có API)
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

## Backend folder structure

```text
Backend/src/
  ├─ main.py                 # App factory, mount /api/v1
  ├─ api/v1/
  │   ├─ router.py           # Gộp tất cả sub-routers
  │   ├─ auth.py             # 4 endpoints: register, login, refresh, logout
  │   ├─ users.py            # 3 endpoints: profile GET/PUT, password PUT
  │   ├─ itineraries.py      # 14 endpoints: CRUD, generate, share, claim, rating, nested activity/accommodation
  │   ├─ places.py           # 7 endpoints: destinations, search, detail, saved CRUD
  │   ├─ shared.py           # 1 endpoint: public read by shareToken
  │   └─ health.py           # 1 endpoint: health check
  ├─ services/
  │   ├─ auth_service.py
  │   ├─ user_service.py
  │   ├─ itinerary_service.py
  │   └─ place_service.py
  ├─ repositories/
  │   ├─ user_repo.py
  │   ├─ trip_repo.py
  │   ├─ place_repo.py
  │   └─ token_repo.py
  ├─ schemas/
  │   ├─ auth.py
  │   ├─ user.py
  │   ├─ itinerary.py
  │   ├─ place.py
  │   └─ common.py
  ├─ models/
  │   ├─ user.py
  │   ├─ trip.py
  │   ├─ place.py
  │   └─ extras.py
  ├─ core/
  │   ├─ config.py, database.py, security.py, dependencies.py
  │   ├─ exceptions.py, logger.py, middlewares.py, rate_limiter.py
  │   └─ __init__.py
  └─ etl/
      ├─ runner.py, __main__.py
      ├─ extractors/  (osm_extractor.py, goong_extractor.py)
      ├─ transformers/ (hotel_transformer.py, place_transformer.py)
      ├─ loaders/     (db_loader.py)
      └─ data/        (hotels.yaml)
```

## Frontend folder structure

```text
Frontend/src/
  ├─ main.tsx
  └─ app/
      ├─ App.tsx              # ErrorBoundary > AuthProvider > TripWizardProvider > Router
      ├─ routes.tsx           # 30+ routes, 8 protected by ProtectedRoute
      ├─ services/            # API client layer
      │   ├─ api.ts           # Fetch wrapper, JWT Bearer, auto-refresh on 401
      │   ├─ auth.ts          # login, register, logout, refresh
      │   ├─ itinerary.ts     # CRUD, generate, share, claim, rating
      │   ├─ places.ts        # destinations, search, saved
      │   └─ users.ts         # profile, password
      ├─ contexts/
      │   ├─ AuthContext.tsx   # JWT state + guest→owner claim flow
      │   └─ TripWizardContext.tsx  # Wizard flow (thay 6 sessionStorage keys)
      ├─ hooks/
      │   ├─ useTripCost.ts, useTripState.ts
      │   └─ trips/
      │       ├─ useTripSync.ts       # Auto-save create/update/get itinerary
      │       ├─ useActivityManager.ts # Activity CRUD + optimistic
      │       ├─ useAccommodation.ts   # Accommodation CRUD + optimistic
      │       └─ usePlacesManager.ts   # Debounced search, save/unsave
      ├─ pages/              # 26 page components
      ├─ components/
      │   ├─ ErrorBoundary.tsx, ProtectedRoute.tsx
      │   ├─ TopActionBar.tsx, Header.tsx, SimpleFooter.tsx
      │   ├─ FloatingAIChat.tsx, AIPromoBubble.tsx (mock → Phase C)
      │   ├─ companion/       # AI companion (mock → Phase C)
      │   ├─ figma/           # Design-to-code
      │   └─ ui/              # shadcn/ui primitives (40+ components)
      ├─ types/trip.types.ts  # Itinerary contract
      ├─ data/                # Static/mock fallback data
      └─ utils/               # tripConstants, timeHelpers, itinerary, analytics
```

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

### Generate itinerary (direct pipeline, không qua Supervisor)

```text
FE (CreateTrip) → POST /itineraries/generate
→ Backend validation
→ ItineraryPipeline (src/services/itinerary_pipeline.py — chưa tạo)
→ Gemini LLM structured output
→ Pydantic validation + retry hữu hạn
→ save trip/day/activity/accommodation
→ return ItineraryResponse camelCase
→ FE navigate TripWorkspace?tripId={id}
```

### Companion chat (cần intent routing)

```text
FE (FloatingAIChat) → POST /agent/chat
→ Supervisor/Router (src/services/companion_service.py — chưa tạo)
→ tool đọc trip/context (owner-check)
→ proposedOperations + requiresConfirmation
→ FE hiển thị proposed changes
→ User confirm → POST /agent/apply-patch
→ Backend apply patch to DB
```

**Key invariant:** Chat không tự persist DB trước khi user confirm.

### SuggestionService (DB-only, không gọi LLM)

```text
FE → GET /places/suggestions hoặc companion context
→ SuggestionService query DB
→ return gợi ý địa điểm/khách sạn
```

### File mới cần tạo cho Phase C

| File Backend | Mục đích |
|---|---|
| `src/services/itinerary_pipeline.py` | LLM orchestration cho generate |
| `src/services/companion_service.py` | Intent routing, tool-calling cho chat |
| `src/services/suggestion_service.py` | Gợi ý DB-only (không LLM) |
| `src/services/chat_service.py` | Quản lý chat session/message |
| `src/api/v1/agent.py` | Chat + apply-patch endpoints |
| `src/api/v1/chat.py` | Chat history endpoints |
| `src/schemas/generate.py` | AI generate request/response |
| `src/repositories/chat_repo.py` | Chat DB queries |

| File Frontend | Mục đích |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Thay mock bằng API thật |
| `companion/*.tsx` | Nối real suggestions |
| `CreateTrip.tsx` | Không cần sửa (đã wired) |

