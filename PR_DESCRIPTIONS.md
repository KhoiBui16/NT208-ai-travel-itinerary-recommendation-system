# PR Descriptions — MVP2 Build Phases

> Copy nội dung từng section tương ứng vào GitHub PR.
> Sau mỗi phase code xong, cập nhật lại file này nếu có thay đổi thực tế.

---

## Phase A — `feat: [#00000] bootstrap MVP2 foundation layer`

**Branch:** `feat/00000-a-foundation-bootstrap`

---

## Mô tả
- Tạo toàn bộ Phase A Foundation cho MVP2 backend: cấu trúc `Backend/src/` thay thế MVP1 `Backend/app/`
- Task ID: #00000 (placeholder — thay bằng ClickUp ID thật)

## Thay đổi chính
- [x] `Backend/src/core/` — config (config.yaml + .env + pydantic-settings), database (async engine + session factory), security (JWT + bcrypt + opaque token hashing), exceptions (8 loại), dependencies (DI chain), logger (structlog), middlewares (CORS + request logging + error handler), rate_limiter (Redis fail-closed)
- [x] `Backend/src/base/` — BaseRepository[T] (abstract CRUD), CamelCaseModel (auto snake_case → camelCase)
- [x] `Backend/src/models/` — 16 bảng core: User, RefreshToken, Trip, TripDay, Activity, Place, Hotel, Destination, SavedPlace, Accommodation, ExtraExpense, ShareLink, TripRating, GuestClaimToken, ChatSession, ChatMessage
- [x] `Backend/src/schemas/` — auth, user, itinerary, place, common (tất cả kế thừa CamelCaseModel)
- [x] `Backend/src/api/v1/` — health check endpoint + router aggregator
- [x] Alembic migration tạo 16 bảng core
- [x] Docker Compose (api + postgres:16 + redis:7), Dockerfile
- [x] GitHub Actions CI (4 job: backend-lint, backend-unit, backend-integration, backend-migrations)
- [x] pyproject.toml + uv.lock, config.yaml, .env.example
- [x] 6 unit/integration tests pass
- [x] Remove MVP1 code khỏi git tracking (giữ file vật lý trên disk)

## Cách kiểm tra (Testing)
- Bước 1: `cd Backend && uv sync --dev`
- Bước 2: `uv run ruff check src/ tests/` → 0 errors
- Bước 3: `uv run pytest tests/ -v` → 6 passed
- Bước 4: `uv run alembic upgrade head` → 16 bảng tạo thành công
- Bước 5: `uv run uvicorn src.main:app` → `GET /api/v1/health` trả `{"status":"healthy"}`
- Kết quả mong đợi: Server boot, health check OK, 16 bảng DB, CI green

## Lưu ý khác
- Migration mới: `20260428_0001_initial_mvp2_schema.py` (16 bảng)
- `.env.example` đã cập nhật cho MVP2 (thêm REDIS_URL, GOONG_API_KEY, ENABLE_ANALYTICS)
- MVP1 code (`Backend/app/`, `Backend/main.py`, `Backend/requirements.txt`) đã remove khỏi git, file vật lý vẫn còn trên disk

---

## Phase B1 — `feat: [#00001] add auth and user endpoints`

**Branch:** `feat/00001-b1-auth-users`

---

## Mô tả
- Triển khai 7 endpoint cho Auth (register, login, refresh, logout) và Users (get profile, update profile, change password)
- Task ID: #00001

## Thay đổi chính
- [ ] `src/repositories/user_repo.py` — UserRepository: get_by_email, create, update
- [ ] `src/repositories/token_repo.py` — RefreshTokenRepository: find_by_hash, create, revoke, revoke_all
- [ ] `src/services/auth_service.py` — AuthService: register, login, refresh, logout (JWT rotation)
- [ ] `src/services/user_service.py` — UserService: get_profile, update_profile, change_password
- [ ] `src/api/v1/auth.py` — EP 1-4: POST register, POST login, POST refresh, POST logout
- [ ] `src/api/v1/users.py` — EP 5-7: GET profile, PUT profile, PUT password
- [ ] Cập nhật `src/api/v1/router.py` — thêm auth + users routers
- [ ] Cập nhật `src/core/dependencies.py` — thêm DI cho repos và services
- [ ] Viết unit tests cho auth_service + user_service
- [ ] Viết integration tests cho EP 1-7

## Cách kiểm tra (Testing)
- Bước 1: `uv run pytest tests/ -v` → tất cả pass
- Bước 2: Swagger UI → POST /api/v1/auth/register → 201 Created
- Bước 3: POST /api/v1/auth/login → nhận JWT pair
- Bước 4: GET /api/v1/users/profile với Bearer token → 200 OK
- Bước 5: POST /api/v1/auth/refresh → nhận token mới, token cũ bị revoke
- Kết quả mong đợi: Auth flow đầy đủ hoạt động, refresh token rotation đúng, logout revoke hết token

## Lưu ý khác
- Không thay đổi migration mới (dùng bảng users + refresh_tokens đã có từ Phase A)
- Không thay đổi `.env` hay config
- Refresh token lưu hash trong DB, không lưu raw token

---

## Phase B2 — `feat: [#00002] add itinerary CRUD, share, and claim endpoints`

**Branch:** `feat/00002-b2-itineraries`

---

## Mô tả
- Triển khai 14 endpoint cho Trip CRUD, Activity, Accommodation, Rating, Share, Guest Claim
- Task ID: #00002

## Thay đổi chính
- [ ] `src/repositories/trip_repo.py` — TripRepository: create_full, get_with_full_data, get_by_user, update_full, delete, add_activity, update_activity, delete_activity, add_accommodation, delete_accommodation
- [ ] `src/repositories/shared_repo.py` — SharedRepository: find_by_token_hash, create_share_link
- [ ] `src/services/itinerary_service.py` — ItineraryService: generate (stub), create_manual, get_by_id, list_by_user, update (diff&sync), delete, rate, share, claim
- [ ] `src/services/_itinerary_sync.py` — Sync helpers: sync_days, sync_activities, sync_accommodations
- [ ] `src/api/v1/itineraries.py` — EP 8-20: generate, create, list, get, update, delete, rate, share, claim, activities CRUD, accommodations CRUD
- [ ] `src/api/v1/shared.py` — EP 15b: GET /shared/{shareToken} (public read-only)
- [ ] Cập nhật router + dependencies
- [ ] Viết unit + integration tests cho itinerary endpoints

## Cách kiểm tra (Testing)
- Bước 1: `uv run pytest tests/ -v` → tất cả pass
- Bước 2: Swagger → POST /api/v1/itineraries (create manual) → 201
- Bước 3: PUT /api/v1/itineraries/{id} (auto-save với nested days/activities) → 200
- Bước 4: POST /api/v1/itineraries/{id}/share → nhận shareToken
- Bước 5: GET /api/v1/shared/{shareToken} (không cần auth) → 200 read-only
- Bước 6: POST /api/v1/itineraries/{id}/claim với claimToken → 200 claimed
- Kết quả mong đợi: CRUD đầy đủ, owner-only check, shareToken đọc public, claimToken one-time đúng

## Lưu ý khác
- `generate()` trong PR này chỉ là **stub** (trả trip rỗng hoặc placeholder) — AI pipeline thực tế thêm ở Phase C
- Không thay đổi migration mới
- Diff & Sync algorithm: incoming `id=null` → CREATE, `id=int` → UPDATE, DB id không có trong incoming → DELETE

---

## Phase B3 — `feat: [#00003] add places, destinations, saved places, and Redis cache`

**Branch:** `feat/00003-b3-places-cache`

---

## Mô tả
- Triển khai 7 endpoint cho Destinations, Places, Saved Places, và Redis cache
- Task ID: #00003

## Thay đổi chính
- [ ] `src/repositories/place_repo.py` — PlaceRepository: search, get_by_destination, get_destinations, get_destination_by_name, get_correlated
- [ ] `src/repositories/saved_repo.py` — SavedPlaceRepository: get_by_user, create, delete_by_id
- [ ] `src/services/place_service.py` — PlaceService: get_destinations, get_destination_detail, search_places, get_place_by_id, suggest_alternatives (DB-only), list_saved_places, save_place, unsave_place
- [ ] `src/api/v1/places.py` — EP 21-27: destinations list, destination detail, places search, place detail, saved places CRUD
- [ ] Thêm Redis cache cho destinations (TTL 60min) và places/search (TTL 15min)
- [ ] Cập nhật router + dependencies
- [ ] Viết unit + integration tests

## Cách kiểm tra (Testing)
- Bước 1: `uv run pytest tests/ -v` → tất cả pass
- Bước 2: GET /api/v1/destinations → danh sách thành phố
- Bước 3: GET /api/v1/destinations/Hà Nội/detail → places + hotels
- Bước 4: GET /api/v1/places/search?q=phở&city=Hà Nội → kết quả search
- Bước 5: POST /api/v1/users/saved-places (auth) → bookmark place
- Bước 6: Gọi lại GET /destinations → cache hit (nhanh hơn lần đầu)
- Kết quả mong đợi: Search hoạt động, cache tăng tốc read, saved places CRUD đúng

## Lưu ý khác
- Redis cache: fail-open cho read cache (không ảnh hưởng nếu Redis down), nhưng rate limiter vẫn fail-closed
- `suggest_alternatives` (EP-30) là DB-only query, KHÔNG gọi LLM
- Không thay đổi migration mới

---

## Phase C — `feat: [#00004] add AI agent with itinerary pipeline, companion chat, and suggest`

**Branch:** `feat/00004-c-ai-agent`

---

## Mô tả
- Triển khai 5 endpoint AI: generate (thay stub bằng pipeline thật), companion chat, WebSocket chat, suggest, rate-limit-status, chat-history
- Task ID: #00004

## Thay đổi chính
- [ ] `src/agent/__init__.py` + cấu trúc thư mục agent
- [ ] `src/agent/itinerary_pipeline.py` — 5-step RAG pipeline: build_context → build_prompt → call_llm_structured → validate_output → save_full_trip
- [ ] `src/agent/prompts/itinerary_prompt.py` — System prompt + few-shot cho Gemini 2.5 Flash
- [ ] `src/agent/companion_graph.py` — LangGraph StateGraph cho multi-turn chat
- [ ] `src/agent/tools/trip_tools.py` — Tools đọc DB + propose patch (không tự ghi DB)
- [ ] `src/agent/prompts/companion_prompt.py` — Companion system prompt
- [ ] `src/services/companion_service.py` — CompanionService: chat, get_history
- [ ] `src/api/v1/agent.py` — EP 28, 30, 31, 33: chat REST, suggest, rate-limit-status, chat-history
- [ ] `src/api/v1/ws.py` — EP 29: WebSocket /ws/agent-chat/{trip_id}
- [ ] Thay stub `generate()` bằng pipeline thật trong itinerary_service
- [ ] Cập nhật router + dependencies
- [ ] Viết unit + integration tests (mock Gemini API)

## Cách kiểm tra (Testing)
- Bước 1: `uv run pytest tests/ -v` → tất cả pass
- Bước 2: POST /api/v1/itineraries/generate (auth) → nhận trip thật từ Gemini → 201
- Bước 3: POST /api/v1/agent/chat với message → nhận response + proposedOperations + requiresConfirmation=true
- Bước 4: WS /ws/agent-chat/{trip_id}?token=JWT → gửi message → nhận typing + response
- Bước 5: GET /api/v1/agent/suggest/{activity_id} → 5 alternatives (DB-only, <100ms)
- Bước 6: Gọi generate lần 4 → 429 Rate limit exceeded
- Kết quả mong đợi: AI generate ổn định, chat trả patch-confirm, suggest DB-only, rate limit đúng

## Lưu ý khác
- **Thay đổi `.env`**: Cần `GEMINI_API_KEY` thật cho AI pipeline hoạt động
- **Dependency mới**: Cần thêm `langgraph`, `langchain-core` vào pyproject.toml
- Companion chat KHÔNG tự persist DB khi user chưa confirm — chỉ trả proposedOperations
- `SuggestionService` là DB-only, không gọi LLM
- EP-34 Analytics là optional/MVP2+ — không triển khai trong PR này

---

## Phase D — `feat: [#00005] add ETL pipeline and FE-BE integration`

**Branch:** `feat/00005-d-etl-integration`

---

## Mô tả
- ETL pipeline crawl places từ Goong/OSM, seed hotels, và verify FE-BE integration
- Task ID: #00005

## Thay đổi chính
- [ ] `src/etl/extractors/goong_extractor.py` — Goong Places API client
- [ ] `src/etl/extractors/osm_extractor.py` — Overpass API client
- [ ] `src/etl/transformers/place_transformer.py` — Normalize + validate + deduplicate
- [ ] `src/etl/runner.py` — ETL orchestrator CLI
- [ ] `src/etl/loaders/hotel_loader.py` — YAML seed → DB
- [ ] Chạy ETL cho 12 thành phố target
- [ ] Docker Compose full stack verify
- [ ] FE-BE integration test

## Cách kiểm tra (Testing)
- Bước 1: `uv run python -m src.etl.runner --cities "Hà Nội"` → ≥25 places upserted
- Bước 2: GET /api/v1/destinations/Hà Nội/detail → trả places + hotels thật
- Bước 3: `docker compose up --build` → 3 services healthy → Swagger UI → 33 endpoints render
- Bước 4: FE CreateTrip → API thật → AI thật → DB data thật
- Kết quả mong đợi: ETL populate DB, all endpoints hoạt động với data thật, Docker Compose healthy

## Lưu ý khác
- **Thay đổi `.env`**: Cần `GOONG_API_KEY` thật cho ETL Goong extractor
- ETL chạy CLI local, không expose endpoint
- Data từ OSM là public (không cần key), Goong cần API key
