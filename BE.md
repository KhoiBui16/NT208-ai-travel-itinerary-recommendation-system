# BE.md — Backend Refactoring Guide (MVP2)

> **Mục đích:** Hướng dẫn refactor Backend từ cấu trúc cũ (`Backend/app/`) sang Clean Architecture (`Backend/src/`) chuẩn FastAPI + OOP.
> **Package Manager:** `uv` (thay pip + requirements.txt)
> **Coding Standards:** PEP8, Google docstrings, type hints, ruff linter, max 30 dòng/function.

---

## 1. Current State — BE hiện tại (MVP1)

### 1.1 Cấu trúc hiện tại

```
Backend/
├── main.py                    ← Entry point (lifespan, CORS, routers)
├── app/
│   ├── __init__.py
│   ├── config.py              ← Database URL, Gemini key (hardcoded)
│   ├── database.py            ← SessionLocal, engine, Base
│   ├── models/
│   │   ├── user.py            ← User model
│   │   ├── trip.py            ← Trip model
│   │   ├── place.py           ← Place model
│   │   └── trip_place.py      ← Trip-Place join table
│   ├── schemas/
│   │   ├── user.py            ← UserCreate, UserResponse
│   │   ├── trip.py            ← TripCreate, TripResponse
│   │   └── place.py           ← PlaceSchema
│   ├── routers/
│   │   ├── auth.py            ← /auth/register, /auth/login
│   │   ├── trips.py           ← /trips (CRUD + generate)
│   │   ├── places.py          ← /places (CRUD)
│   │   └── users.py           ← /users/profile
│   ├── services/
│   │   └── itinerary_service.py ← AI generation (Gemini API)
│   └── utils/
│       └── auth.py            ← JWT encode/decode
├── requirements.txt           ← pip dependencies
├── .env                       ← Secrets (⚠️ đã commit vào git!)
├── seed_data.py               ← Seed places data
└── test_*.py                  ← Test files
```

### 1.2 Vấn đề hiện tại

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | **Không có ABC/Interface** — không OOP chuẩn | 🔴 Critical |
| 2 | **Service gọi DB trực tiếp** — không qua Repository | 🔴 Critical |
| 3 | **Router chứa business logic** — vi phạm SRP | 🔴 Critical |
| 4 | **Config hardcoded** — secrets trong code | 🔴 Critical |
| 5 | **Không có Alembic** — dùng `create_all()` | 🟡 High |
| 6 | **Không có DI chain** — manual instantiation | 🟡 High |
| 7 | **Synchronous DB** — blocking I/O | 🟡 High |
| 8 | **`.env` bị commit** — secrets bị lộ | 🔴 Critical |
| 9 | **AI logic trong 1 file** — khó test, khó mở rộng | 🟡 High |
| 10 | **Không có error handling chuẩn** — generic 500 | 🟠 Medium |

---

## 2. Target State — BE refactored (MVP2)

### 2.1 Cấu trúc mới

```
Backend/
├── pyproject.toml                 ← uv project file (thay requirements.txt)
├── uv.lock                        ← Lock file (auto-generated)
├── config.yaml                    ← App settings (KHÔNG chứa secrets)
├── .env                           ← Secrets ONLY (KHÔNG commit!)
├── .env.example                   ← Template cho .env
├── Dockerfile                     ← Docker build
├── alembic/                       ← Migration files
│   ├── env.py
│   └── versions/
│       ├── 001_initial_mvp2_schema.py
│       └── 002_backfill_trip_days.py
│
└── src/
    ├── __init__.py
    ├── main.py                    ← FastAPI app factory
    │
    ├── core/                      ← Foundation layer
    │   ├── __init__.py
    │   ├── config.py              ← AppConfig (yaml + .env merge)
    │   ├── database.py            ← AsyncEngine, async_session_factory, Base
    │   ├── security.py            ← JWT, bcrypt, refresh token
    │   ├── exceptions.py          ← Custom HTTP exceptions
    │   ├── middlewares.py         ← CORS, logging, error handler
    │   ├── constants.py           ← HTTP codes, error messages
    │   └── dependencies.py        ← DI chain (get_db, get_*_service)
    │
    ├── base/                      ← Abstract Base Classes
    │   ├── __init__.py
    │   ├── repository.py          ← BaseRepository[T] (ABC)
    │   ├── service.py             ← BaseService (ABC)
    │   └── schema.py              ← Base Pydantic config
    │
    ├── models/                    ← SQLAlchemy ORM
    │   ├── __init__.py            ← Export ALL models
    │   ├── user.py                ← User model
    │   ├── refresh_token.py       ← RefreshToken model
    │   ├── trip.py                ← Trip model
    │   ├── trip_day.py            ← TripDay model (MỚI)
    │   ├── activity.py            ← Activity model (MỚI)
    │   ├── place.py               ← Place model (mở rộng)
    │   ├── hotel.py               ← Hotel model (MỚI)
    │   ├── accommodation.py       ← TripAccommodation model (MỚI)
    │   ├── saved_place.py         ← SavedPlace model (MỚI)
    │   ├── shared_trip.py         ← SharedTrip model (MỚI)
    │   ├── extra_expense.py       ← ExtraExpense model (MỚI)
    │   └── scraped_source.py      ← ScrapedSource model (data freshness)
    │
    ├── schemas/                   ← Pydantic DTOs
    │   ├── __init__.py
    │   ├── auth.py                ← LoginRequest, RegisterRequest, AuthResponse
    │   ├── user.py                ← UserResponse, UserUpdateRequest
    │   ├── itinerary.py           ← TripGenerateRequest, ItineraryResponse, DayResponse, ActivityResponse
    │   ├── place.py               ← PlaceResponse, PlaceSearchQuery
    │   ├── hotel.py               ← HotelResponse, HotelSearchQuery
    │   └── accommodation.py       ← AccommodationCreate, AccommodationResponse
    │
    ├── repositories/              ← Data Access Layer
    │   ├── __init__.py
    │   ├── user_repository.py     ← UserRepository(BaseRepository[User])
    │   ├── trip_repository.py     ← TripRepository(BaseRepository[Trip])
    │   ├── place_repository.py    ← PlaceRepository(BaseRepository[Place])
    │   ├── hotel_repository.py    ← HotelRepository(BaseRepository[Hotel])
    │   └── refresh_token_repository.py
    │
    ├── services/                  ← Business Logic Layer
    │   ├── __init__.py
    │   ├── auth_service.py        ← AuthService (register, login, refresh, logout)
    │   ├── user_service.py        ← UserService (profile CRUD)
    │   ├── itinerary_service.py   ← ItineraryService (trip CRUD + AI generate)
    │   ├── place_service.py       ← PlaceService (search, destinations)
    │   └── data_freshness_service.py ← DataFreshnessService
    │
    ├── api/                       ← Presentation Layer (HTTP Routers)
    │   ├── __init__.py
    │   └── v1/
    │       ├── __init__.py
    │       ├── auth.py            ← /api/v1/auth/* (4 endpoints)
    │       ├── users.py           ← /api/v1/users/* (3 endpoints)
    │       ├── itineraries.py     ← /api/v1/itineraries/* (10 endpoints)
    │       ├── places.py          ← /api/v1/places/* + destinations (6 endpoints)
    │       └── agent.py           ← /api/v1/agent/* + WS (3 endpoints)
    │
    ├── agent/                     ← AI Agent Layer
    │   ├── __init__.py
    │   ├── config.py              ← AgentConfig (from config.yaml)
    │   ├── llm.py                 ← LLM factory (ChatGoogleGenerativeAI)
    │   ├── prompts/
    │   │   ├── __init__.py
    │   │   ├── itinerary_prompts.py   ← System + User prompt templates
    │   │   └── companion_prompts.py   ← Companion system prompt
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   ├── itinerary_schemas.py   ← AgentActivity, AgentDay, AgentItinerary
    │   │   └── companion_schemas.py   ← CompanionState, IntentClassification
    │   ├── pipelines/
    │   │   ├── __init__.py
    │   │   ├── itinerary_pipeline.py  ← 5-step RAG pipeline
    │   │   └── companion_pipeline.py  ← LangGraph wrapper
    │   ├── tools/
    │   │   ├── __init__.py
    │   │   ├── companion_tools.py     ← 5 @tool functions
    │   │   └── tool_registry.py       ← Bind tools → LLM
    │   ├── graph/
    │   │   ├── __init__.py
    │   │   └── companion_graph.py     ← LangGraph StateGraph
    │   └── services/
    │       ├── __init__.py
    │       ├── agent_service.py       ← High-level Itinerary Agent wrapper
    │       └── companion_service.py   ← High-level Companion Agent wrapper
    │
    ├── helpers/                   ← Pure utility functions
    │   ├── __init__.py
    │   ├── formatters.py          ← Format tiền, date, duration
    │   ├── validators.py          ← Custom validators
    │   └── converters.py          ← Type converters (FE ↔ BE)
    │
    └── tests/                     ← Test suite
        ├── conftest.py
        ├── test_auth.py
        ├── test_itinerary.py
        └── test_agent.py
```

---

## 3. Migration Plan — Từng Phase chi tiết

### Phase A: Foundation (Tuần 1-2)

#### A1: Cleanup & Init (Day 1-2)

```bash
# 1. Xóa files deploy cũ ở root
rm render.yaml vercel.json package.json package-lock.json
rm postcss.config.mjs vite.config.ts index.html
rm tsconfig.json tsconfig.app.json tsconfig.node.json

# 2. Init uv project
cd Backend
uv init --app
# Sửa pyproject.toml theo Section 4

# 3. Cài dependencies
uv add "fastapi[standard]" sqlalchemy asyncpg alembic \
  pydantic-settings pydantic pyyaml \
  python-jose passlib bcrypt python-multipart \
  langchain-core langchain-google-genai langgraph langsmith \
  httpx python-dotenv python-dateutil

uv add --dev ruff pytest pytest-asyncio pytest-cov mypy

# 4. Tạo folder structure
mkdir -p src/{core,base,models,schemas,repositories,services,api/v1,agent/{prompts,schemas,pipelines,tools,graph,services},helpers}

# 5. Rotate secrets
python -c "import secrets; print(secrets.token_hex(32))"
# Copy output → .env: JWT_SECRET_KEY=<key_mới>
```

#### A2: Core Layer (Day 3-4)

Tạo các file foundation:

| File | Nội dung | Dependencies |
|------|---------|-------------|
| `src/core/config.py` | AppConfig (yaml + .env merge) | pydantic-settings, pyyaml |
| `src/core/database.py` | AsyncEngine, session factory | sqlalchemy[asyncio], asyncpg |
| `src/core/security.py` | JWT, bcrypt, refresh token | python-jose, passlib |
| `src/core/exceptions.py` | NotFoundException, ForbiddenException | fastapi |
| `src/core/middlewares.py` | CORS, request logging | fastapi |
| `src/core/constants.py` | Error codes, HTTP status | none |
| `src/core/dependencies.py` | DI chain (get_db → get_repo → get_service) | fastapi.Depends |

#### A3: Base Layer (Day 5)

| File | Nội dung |
|------|---------|
| `src/base/repository.py` | `BaseRepository[T](ABC)` — get_by_id, get_all, create, update, delete, find_by_criteria |
| `src/base/service.py` | `BaseService(ABC)` — abstract init(repository) |
| `src/base/schema.py` | Base Pydantic config (from_attributes, alias_generator) |

#### A4: Alembic + Docker (Day 6-7)

```bash
uv run alembic init -t async alembic
# Sửa alembic/env.py → import Base + models
uv run alembic revision --autogenerate -m "001_initial_mvp2_schema"
uv run alembic upgrade head
```

Tạo:
- `Backend/Dockerfile`
- Root `docker-compose.yml` (db + backend + frontend)
- `config.yaml`
- `.env.example`

---

### Phase B: Domain Implementation (Tuần 3-4)

#### B1: Auth Domain (Day 8-9)

| Layer | File | Nội dung |
|-------|------|---------|
| Model | `src/models/user.py` | User (id, email, password_hash, full_name, phone, interests[], role) |
| Model | `src/models/refresh_token.py` | RefreshToken (token_hash, user_id, expires_at, revoked) |
| Schema | `src/schemas/auth.py` | LoginRequest, RegisterRequest, AuthResponse, TokenPair |
| Repo | `src/repositories/user_repository.py` | find_by_email, find_by_criteria |
| Service | `src/services/auth_service.py` | register, login, refresh_token, logout |
| Router | `src/api/v1/auth.py` | POST register, login, refresh, logout |

**Auth Flow:**
```
POST /login → AuthService.login() → verify password → create JWT + refresh token → return pair
POST /refresh → AuthService.refresh() → verify refresh in DB → rotate → new pair
POST /logout → AuthService.logout() → revoke refresh token in DB
```

#### B2: Users Domain (Day 10-11)

| Layer | File | Nội dung |
|-------|------|---------|
| Schema | `src/schemas/user.py` | UserResponse, UserUpdateRequest |
| Service | `src/services/user_service.py` | get_profile, update_profile, change_password |
| Router | `src/api/v1/users.py` | GET/PUT profile, PUT password |

#### B3: Itineraries Domain (Day 12-13) — ⚠️ QUAN TRỌNG NHẤT

| Layer | File | Nội dung |
|-------|------|---------|
| Model | `src/models/trip.py` | Trip (destination, budget, start_date, end_date, adults_count, children_count, is_public, total_cost, rating, feedback, share_token) |
| Model | `src/models/trip_day.py` | TripDay (trip_id, day_number, label, date, destination_name) |
| Model | `src/models/activity.py` | Activity (trip_day_id, name, time, end_time, type, location, description, image, adult_price, child_price, custom_cost, transportation, bus_ticket_price, taxi_cost, visit_order) |
| Model | `src/models/extra_expense.py` | ExtraExpense (activity_id OR trip_day_id, name, amount, category) |
| Model | `src/models/accommodation.py` | TripAccommodation (trip_id, hotel_id, booking_type, duration) + M2M trip_accommodation_days |
| Model | `src/models/shared_trip.py` | SharedTrip (trip_id, share_token, permissions, expires_at) |
| Schema | `src/schemas/itinerary.py` | TripGenerateRequest, ItineraryResponse, DayResponse, ActivityResponse |
| Repo | `src/repositories/trip_repository.py` | get_with_days_and_activities, get_by_user, find_by_criteria |
| Service | `src/services/itinerary_service.py` | generate, create, update, delete, share, rate |
| Router | `src/api/v1/itineraries.py` | 10 endpoints |

**Schema Mapping (FE trip.types.ts → BE):**

```python
# FE: Activity.name → BE: Activity.name (giữ nguyên!)
# FE: Activity.adultPrice → BE: Activity.adult_price
# FE: Activity.type → BE: ActivityType Enum
# FE: Day.label → BE: TripDay.label
# FE: Accommodation.hotel → BE: TripAccommodation → Hotel (FK)
# FE: TravelerInfo → BE: Trip.adults_count + Trip.children_count
```

#### B4: Places Domain (Day 14)

| Layer | File | Nội dung |
|-------|------|---------|
| Model | `src/models/place.py` | Place (place_name, category, rating, cost, location, image, lat, lng, destination, source, price_min, price_max, price_avg) |
| Model | `src/models/hotel.py` | Hotel (name, rating, review_count, price, image, location, city, amenities JSONB, description) |
| Model | `src/models/saved_place.py` | SavedPlace (user_id, place_id) |
| Schema | `src/schemas/place.py` | PlaceResponse, PlaceSearchQuery, DestinationInfo |
| Repo | `src/repositories/place_repository.py` | get_by_destination, search, get_nearby |
| Service | `src/services/place_service.py` | search, get_destinations, toggle_save |
| Router | `src/api/v1/places.py` | 6 endpoints |

---

### Phase C: Agent Integration (Tuần 5-6)

> [!IMPORTANT]
> Tất cả AI agent PHẢI sử dụng crawled data từ DB. KHÔNG sử dụng mock data hay seed data.
> Fallback khi AI unavailable: trả lỗi 503, KHÔNG trả mock.

#### C1: Itinerary Agent — 5-step RAG Pipeline (Day 15-17)

**Current State (MVP1):**
- Dùng `google.generativeai` (raw SDK — KHÔNG phải LangChain)
- Model: `gemini-1.5-flash` (outdated)
- Prompt: raw string format, KHÔNG structured output
- Response: `json.loads()` trên text thô → dễ fail
- Fallback: hardcoded FALLBACK_DATA dict 4 thành phố

**Target State (MVP2):**
- Dùng `langchain-google-genai` (ChatGoogleGenerativeAI)
- Model: `gemini-2.5-flash`
- Prompt: Pydantic-based template
- Response: `.with_structured_output(AgentItinerary)` → 100% parse
- Fallback: trả HTTP 503 (KHÔNG mock)

**Pipeline 5 bước chi tiết:**

```python
class ItineraryAgentPipeline:
    """5-step RAG pipeline để sinh lộ trình du lịch.

    Pipeline:
        1. validate_input → kiểm tra destination có trong DB
        2. fetch_context → lấy places/hotels từ DB (RAG retrieval)
        3. build_prompt → inject context vào prompt template
        4. call_llm → Gemini 2.5 Flash + structured output
        5. post_process → validate budget, save to DB
    """

    async def step1_validate_input(
        self, request: TripGenerateRequest
    ) -> ValidatedInput:
        """Validate input và enrich từ DB.

        - Check destination tồn tại trong bảng places
        - Check ngày hợp lệ (không quá khứ)
        - Normalize budget theo level
        - Return ValidatedInput dataclass
        """

    async def step2_fetch_context(
        self, validated: ValidatedInput
    ) -> RetrievalContext:
        """RAG retrieval — lấy context từ DB.

        Queries:
        - places: WHERE destination = :dest AND category IN :interests
        - hotels: WHERE city = :dest ORDER BY rating DESC LIMIT 10
        - Nearby places: nếu có GPS, Goong nearby API

        Returns:
            RetrievalContext chứa places[], hotels[], nearby[]
        """

    async def step3_build_prompt(
        self, validated: ValidatedInput, context: RetrievalContext
    ) -> str:
        """Build prompt với context injection.

        Template: itinerary_prompts.SYSTEM_PROMPT + user_message
        Context: serialized places/hotels → inject vào prompt
        """

    async def step4_call_llm(
        self, prompt: str
    ) -> AgentItinerary:
        """Call Gemini 2.5 Flash với structured output.

        Sử dụng:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.7,
            )
            chain = llm.with_structured_output(AgentItinerary)
            result = await chain.ainvoke(prompt)

        Returns:
            AgentItinerary — Pydantic model, guaranteed parse.
        """

    async def step5_post_process(
        self,
        itinerary: AgentItinerary,
        validated: ValidatedInput,
        user_id: str,
    ) -> Trip:
        """Post-process: validate budget, save to DB.

        - Check total cost <= budget
        - Create Trip → TripDays → Activities trong DB
        - Return Trip model
        """
```

**Structured Output Schemas (Pydantic — thay cho json.loads):**

```python
# src/agent/schemas/itinerary_schemas.py

class AgentActivity(BaseModel):
    """Một hoạt động do AI sinh ra."""
    name: str = Field(description="Tên địa điểm/hoạt động")
    description: str = Field(description="Mô tả ngắn 1-2 câu")
    time: str = Field(description="Giờ bắt đầu HH:MM")
    end_time: str = Field(description="Giờ kết thúc HH:MM")
    type: Literal["food", "attraction", "nature", "entertainment", "shopping"]
    location: str = Field(description="Địa chỉ cụ thể")
    adult_price: int = Field(default=0, description="Giá người lớn (VND)")
    child_price: int = Field(default=0, description="Giá trẻ em (VND)")
    transportation: Literal["walk", "bike", "bus", "taxi"] = "walk"
    image: str = Field(default="", description="URL ảnh")

class AgentDay(BaseModel):
    """Một ngày trong lộ trình."""
    day_number: int
    activities: list[AgentActivity]

class AgentItinerary(BaseModel):
    """Output schema cho Itinerary Agent."""
    days: list[AgentDay]
    estimated_total_cost: int = Field(description="Tổng chi phí VND")
    ai_notes: str = Field(default="", description="Ghi chú từ AI")
```

**Prompt chi tiết (tối ưu từ BE hiện tại):**

```python
# src/agent/prompts/itinerary_prompts.py

SYSTEM_PROMPT = """
    Bạn là chuyên gia du lịch Việt Nam. Nhiệm vụ:
    - Tạo lộ trình chi tiết theo ngày
    - Mỗi ngày 3-5 hoạt động (buổi sáng, trưa, chiều, tối)
    - Hoạt động phù hợp sở thích và ngân sách
    - Sắp xếp theo khoảng cách di chuyển hợp lý
    - Giá phải realistic (dựa trên data cung cấp)

    DATA CÓ SẴN (từ database, ƯU TIÊN sử dụng):
    {context_places}

    QUY TẮC:
    - Ưu tiên places có trong data. Bổ sung thêm nếu thiếu.
    - Mỗi activity phải có tọa độ thời gian rõ ràng.
    - type PHẢI là 1 trong: food, attraction, nature, entertainment, shopping
    - transportation: walk (< 1km), bike (1-3km), bus (3-10km), taxi (> 10km)
    - Tổng chi phí KHÔNG vượt ngân sách.
"""

USER_TEMPLATE = """
    Điểm đến: {destination}
    Ngày: {start_date} → {end_date} ({num_days} ngày)
    Ngân sách: {budget:,.0f} VND
    Sở thích: {interests}
    Đoàn: {adults} người lớn, {children} trẻ em
"""
```

**Files:**
- `src/agent/config.py` — AgentConfig dataclass
- `src/agent/llm.py` — `create_llm()`, `create_llm_with_tracing()`
- `src/agent/prompts/itinerary_prompts.py` — SYSTEM_PROMPT + USER_TEMPLATE
- `src/agent/schemas/itinerary_schemas.py` — AgentActivity, AgentDay, AgentItinerary
- `src/agent/pipelines/itinerary_pipeline.py` — `ItineraryAgentPipeline` class
- `src/agent/services/agent_service.py` — High-level wrapper

#### C2: Companion Agent — LangGraph StateGraph (Day 18-19)

**Architecture:**

```
┌──────────┐
│  START   │  ← User message via WebSocket
└────┬─────┘
     ▼
┌────────────────┐
│ route_intent   │  ← LLM classifies intent → Action type
│ (classifier)   │     Outputs: search/modify/calculate/chat/suggest
└────────┬───────┘
         │
   ┌─────┼─────┬─────────┬──────────┬──────────┐
   ▼     ▼     ▼         ▼          ▼          ▼
 search search  calc     modify    suggest   chat
 places nearby  budget   itinerary places    (LLM)
 (DB)  (Goong)  (DB)     (DB+FE)   (DB)      only
   └─────┴─────┴─────────┴──────────┴──────────┘
                         │
                         ▼
                   ┌──────────┐
                   │  respond  │  ← LLM generates NL response
                   │  (format) │     + action_data JSON nếu modify
                   └──────────┘
                         │
                         ▼
                   ┌──────────┐
                   │   END    │  → WS response to FE
                   └──────────┘
```

**6 Tools (tăng từ 5 → 6):**

| # | Tool | Input | Output | Description |
|---|------|-------|--------|-------------|
| 1 | `search_places_db` | `query: str, city: str, type: str` | `Place[]` | Tìm places trong DB theo keyword + city + type |
| 2 | `modify_itinerary` | `action: add/remove/swap, day: int, activity: dict` | `bool` | Thêm/xóa/thay activity trong trip. Lưu DB. |
| 3 | `search_nearby_goong` | `lat: float, lng: float, radius: int, type: str` | `Place[]` | Goong Places API nearby search |
| 4 | `calculate_route` | `origin: str, destination: str, mode: str` | `RouteInfo` | Goong Directions API — distance + duration |
| 5 | `recalculate_budget` | `trip_id: str` | `BudgetSummary` | Tính lại tổng chi phí trip |
| 6 | `suggest_alternatives` | `activity_id: int, reason: str` | `Place[]` | Gợi ý thay thế dựa trên category + nearby |

**LangGraph State (typed):**

```python
class CompanionState(TypedDict):
    """State cho Companion Agent graph.

    Attributes:
        messages: Lịch sử chat (LangGraph add_messages reducer)
        trip_id: ID của trip đang thao tác
        user_id: ID của user
        itinerary_context: Tóm tắt lộ trình hiện tại (để LLM hiểu)
        pending_changes: Danh sách thay đổi chờ user confirm
        tool_results: Kết quả tool gần nhất
        turn_count: Đếm số lượt hội thoại
    """
    messages: Annotated[list[BaseMessage], add_messages]
    trip_id: str | None
    user_id: str | None
    itinerary_context: str  # Tóm tắt trip hiện tại
    pending_changes: list[dict]
    tool_results: dict
    turn_count: int
```

**Session Management — AsyncPostgresSaver:**

```python
# src/agent/graph/companion_graph.py

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

async def create_companion_graph(
    pool: AsyncConnectionPool,
) -> CompiledGraph:
    """Build và compile Companion StateGraph.

    Checkpointer: AsyncPostgresSaver lưu state vào PostgreSQL.
    Mỗi conversation có thread_id riêng.
    """
    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()  # Tạo tables lần đầu

    graph = StateGraph(CompanionState)
    graph.add_node("route_intent", route_intent_node)
    graph.add_node("tools", ToolNode(companion_tools))
    graph.add_node("respond", respond_node)

    graph.add_edge(START, "route_intent")
    graph.add_conditional_edges(
        "route_intent",
        should_use_tools,
        {"tools": "tools", "respond": "respond"}
    )
    graph.add_edge("tools", "respond")
    graph.add_edge("respond", END)

    return graph.compile(checkpointer=checkpointer)
```

**Thread ID Pattern:**

```python
# Thread scoping cho session management
def get_thread_id(trip_id: str, user_id: str) -> str:
    """Tạo unique thread_id cho mỗi conversation.

    Pattern: companion-{trip_id}-{user_id}
    Mỗi user có 1 conversation riêng cho mỗi trip.
    LangGraph PostgresSaver tự quản lý history.
    """
    return f"companion-{trip_id}-{user_id}"

# Usage trong WebSocket handler:
config = {"configurable": {"thread_id": get_thread_id(trip_id, user_id)}}
result = await compiled_graph.ainvoke(
    {"messages": [("user", user_message)]},
    config,
)
```

**WebSocket Integration:**

```python
# src/api/v1/agent.py

@router.websocket("/ws/agent-chat/{trip_id}")
async def ws_agent_chat(
    websocket: WebSocket,
    trip_id: str,
    companion_service: CompanionService = Depends(get_companion_service),
):
    """WebSocket endpoint cho Companion AI chat.

    Flow:
    1. Accept connection + authenticate JWT from query param
    2. Load trip context (summarized itinerary)
    3. Loop: receive message → invoke graph → send response
    4. Session persistence: PostgresSaver via thread_id
    """
    await websocket.accept()
    user = await authenticate_ws(websocket)
    thread_id = get_thread_id(trip_id, user.id)

    while True:
        data = await websocket.receive_text()
        response = await companion_service.chat(
            message=data,
            trip_id=trip_id,
            user_id=str(user.id),
            thread_id=thread_id,
        )
        await websocket.send_json(response)
```

**Files:**
- `src/agent/tools/companion_tools.py` — 6 @tool functions
- `src/agent/schemas/companion_schemas.py` — CompanionState, IntentClassification
- `src/agent/graph/companion_graph.py` — `build_companion_graph()` + AsyncPostgresSaver
- `src/agent/pipelines/companion_pipeline.py` — wrapper
- `src/agent/prompts/companion_prompts.py` — System prompt
- `src/agent/services/companion_service.py` — CompanionService

#### C3: Suggestion Agent (Day 20-21)

**Architecture:** DB query only (no LLM)

```
GET /api/v1/agent/suggest/{activity_id}
→ Lấy current activity info
→ Query correlated places by category + city
→ Sort by rating + distance
→ Return top 5 places
```

**Correlation Map:**
```python
CATEGORY_CORRELATION = {
    "food": ["food", "entertainment", "shopping"],
    "attraction": ["attraction", "nature", "entertainment"],
    "nature": ["nature", "attraction", "food"],
    "entertainment": ["entertainment", "food", "shopping"],
    "shopping": ["shopping", "food", "entertainment"],
}
```

---

### Phase D: Integration + Polish (Tuần 7-8)

#### D1: FE Connection Test (Day 22-23)

Verify mỗi BE endpoint trả về response khớp FE types:

| BE Response | FE Type | Status |
|-------------|---------|--------|
| `ItineraryResponse` | `Itinerary` interface (api.ts) | Verify |
| `ActivityResponse.name` | `Activity.name` | ⚠️ Breaking change |
| `ActivityResponse.adult_price` | `Activity.adultPrice` (camelCase alias) | Verify |
| `DayResponse.label` | `Day.label` | Verify |
| `AccommodationResponse.hotel` | `Accommodation.hotel` (embedded) | Verify |

#### D2: Data Migration (Day 24-25)

```bash
uv run alembic revision --autogenerate -m "002_backfill_trip_days"
uv run alembic upgrade head
```

Migrate data từ `trip_places` → `trip_days` + `activities`.

#### D3: Docker + Deploy (Day 26-27)

```bash
docker compose up --build
# Test: http://localhost:8000/docs (Swagger)
# Test: http://localhost:3000 (FE)
```

#### D4: Documentation (Day 28)

Tạo `Backend/docs/`:
- `README.md` — Quick start
- `ARCHITECTURE.md` — Layer diagram + DI chain
- `DATABASE.md` — ER diagram + table descriptions
- `AGENT_DESIGN.md` — 3 agents + prompts + pipeline
- `DEPLOYMENT.md` — Docker + env vars
- `DEVELOPMENT.md` — Coding standards

---

## 4. Dependencies — `pyproject.toml`

```toml
[project]
name = "dulichviet-api"
version = "2.0.0"
description = "AI Travel Itinerary Recommendation System - Backend"
requires-python = ">=3.12"
dependencies = [
    # Core
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    # Database
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    # Config & Validation
    "pydantic-settings>=2.7.0",
    "pydantic[email-validator]>=2.10.0",
    "pyyaml>=6.0.2",
    # Auth
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "bcrypt>=4.0.1,<4.2.0",
    # AI Agent
    "langchain-core>=0.3.0",
    "langchain-google-genai>=2.0.0",
    "langgraph>=0.4.0",
    "langgraph-checkpoint-postgres>=2.0.0",  # AsyncPostgresSaver
    "psycopg[binary,pool]>=3.2.0",           # psycopg3 + connection pool
    "langsmith>=0.3.0",
    # HTTP Client
    "httpx>=0.28.0",
    "python-multipart>=0.0.20",
    # Utilities
    "python-dotenv>=1.0.0",
    "python-dateutil>=2.8.2",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.8.0",
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "pytest-cov>=6.0.0",
    "mypy>=1.13.0",
    "aiosqlite>=0.20.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "W", "F", "I", "N", "D", "UP", "B", "SIM", "C4"]
ignore = ["D100", "D104", "E501"]

[tool.ruff.lint.pydocstyle]
convention = "google"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

## 5. Config Files

### 5.1 `config.yaml`

```yaml
# config.yaml — App Settings (KHÔNG chứa secrets)
# Secrets phải nằm trong .env

app:
  name: "DuLichViet API"
  version: "2.0.0"
  debug: true                    # false khi production
  host: "0.0.0.0"
  port: 8000
  cors_origins:
    - "http://localhost:3000"    # Dev FE
    - "http://localhost:5173"    # Vite dev

auth:
  algorithm: "HS256"
  access_token_expire_minutes: 15
  refresh_token_expire_days: 30

database:
  pool_size: 10
  max_overflow: 5
  pool_recycle: 3600              # seconds

agent:
  model: "gemini-2.5-flash"
  temperature: 0.7
  max_output_tokens: 2048
  timeout_seconds: 30
  max_retries: 1
  fallback_to_mock: false           # KHÔNG dùng mock data — trả 503 nếu AI unavailable
  langsmith_project: "dulichviet-agent"

scraping:
  update_intervals:
    places: 7                     # days
    hotels_pricing: 3             # days
    destinations: 30              # days
```

### 5.2 `.env.example`

```bash
# ============================================
# .env.example — COPY file này thành .env
# KHÔNG commit .env vào git!
# ============================================

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet

# JWT Secret — tạo bằng: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=<TẠO_MỚI>

# AI Agent — https://aistudio.google.com/apikey
GEMINI_API_KEY=<ĐIỀN_SAU>

# LangSmith (optional) — https://smith.langchain.com
LANGCHAIN_API_KEY=<ĐIỀN_SAU>
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=dulichviet-agent

# Goong Maps (optional) — https://account.goong.io
GOONG_API_KEY=<ĐIỀN_SAU>
```

---

## 6. Database Schema — MVP2 (13 bảng)

### 6.1 ER Diagram

```
users ─────────────── trips ─────────────── trip_days ──────── activities
  │                     │                      │                    │
  ├── refresh_tokens    ├── trip_accommodations │                    └── extra_expenses
  ├── saved_places      ├── shared_trips        └── day_extra_expenses
  │                     │
  │                     └── trip_accommodations ── hotels
  │
  └── saved_places ── places ── scraped_sources
```

### 6.2 Bảng mới so với MVP1

| Bảng | Trạng thái | Mô tả |
|------|-----------|-------|
| `users` | **SỬA** | Thêm: phone, interests JSONB |
| `trips` | **SỬA** | Thêm: adults_count, children_count, is_public, share_token |
| `trip_days` | **MỚI** | Day concept (thay thế trip_places) |
| `activities` | **MỚI** | Chi tiết activity (thay thế trip_places) |
| `extra_expenses` | **MỚI** | Chi phí phát sinh per activity/day |
| `refresh_tokens` | **MỚI** | JWT refresh token |
| `hotels` | **MỚI** | Khách sạn |
| `trip_accommodations` | **MỚI** | Lưu trú trong trip |
| `trip_accommodation_days` | **MỚI** | M2M: accommodation ↔ days |
| `saved_places` | **MỚI** | Bookmark places |
| `shared_trips` | **MỚI** | Chia sẻ trip |
| `scraped_sources` | **MỚI** | Data freshness tracking |
| `places` | **SỬA** | Thêm: source, price_min/max/avg |
| `trip_places` | **GIỮ TẠM** | Sẽ xóa sau migration Phase D |

---

## 7. API Endpoints — Đầy đủ (26 endpoints)

### Auth (4)
| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `POST` | `/api/v1/auth/register` | AuthService | ❌ Public |
| `POST` | `/api/v1/auth/login` | AuthService | ❌ Public |
| `POST` | `/api/v1/auth/refresh` | AuthService | 🔄 Refresh |
| `POST` | `/api/v1/auth/logout` | AuthService | ✅ JWT |

### Users (5)
| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `GET` | `/api/v1/users/profile` | UserService | ✅ JWT |
| `PUT` | `/api/v1/users/profile` | UserService | ✅ JWT |
| `PUT` | `/api/v1/users/password` | UserService | ✅ JWT |
| `GET` | `/api/v1/users/saved-places` | PlaceService | ✅ JWT |
| `POST/DELETE` | `/api/v1/users/saved-places` | PlaceService | ✅ JWT |

### Itineraries (10)
| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `POST` | `/api/v1/itineraries/generate` | Itinerary + Agent | ✅ JWT |
| `POST` | `/api/v1/itineraries` | ItineraryService | ✅ JWT |
| `GET` | `/api/v1/itineraries` | ItineraryService | ✅ JWT |
| `GET` | `/api/v1/itineraries/{id}` | ItineraryService | ❌ Public |
| `PUT` | `/api/v1/itineraries/{id}` | ItineraryService | ✅ Owner |
| `DELETE` | `/api/v1/itineraries/{id}` | ItineraryService | ✅ Owner |
| `PUT` | `/api/v1/itineraries/{id}/rating` | ItineraryService | ✅ JWT |
| `POST` | `/api/v1/itineraries/{id}/share` | ItineraryService | ✅ Owner |
| `POST` | `/api/v1/itineraries/{id}/activities` | ItineraryService | ✅ Owner |
| `POST` | `/api/v1/itineraries/{id}/accommodations` | ItineraryService | ✅ Owner |

### Places (4)
| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `GET` | `/api/v1/destinations` | PlaceService | ❌ Public |
| `GET` | `/api/v1/destinations/{name}` | PlaceService | ❌ Public |
| `GET` | `/api/v1/places/search` | PlaceService + Goong | ❌ Public |
| `GET` | `/api/v1/places/nearby` | PlaceService + Goong | ❌ Public |

### Agent (3)
| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `POST` | `/api/v1/agent/chat` | CompanionService | ✅ JWT |
| `GET` | `/api/v1/agent/suggest/{activity_id}` | SuggestionAgent | ✅ JWT |
| `WS` | `/ws/agent-chat/{trip_id}` | CompanionService | ✅ Handshake |

---

## 8. Coding Standards

### 8.1 Quy tắc bắt buộc

| Rule | Mô tả |
|------|-------|
| **PEP8** | Tuân thủ hoàn toàn |
| **Google Docstrings** | BẮT BUỘC cho mọi class, method public |
| **Type Hints** | BẮT BUỘC tất cả parameters + return |
| **Max 30 dòng/function** | Split nếu quá dài |
| **Max 100 chars/line** | Ruff enforce |
| **snake_case** | Files, functions, variables |
| **PascalCase** | Classes, Pydantic models |
| **Ruff linter** | `uv run ruff check --fix src/` |

### 8.2 Ví dụ docstring chuẩn

```python
class UserService(BaseService):
    """Service xử lý business logic cho User.

    Responsibilities:
        - Profile CRUD operations
        - Password management
        - Interests management

    Dependencies:
        - UserRepository: data access

    Raises:
        NotFoundException: user không tồn tại
        ForbiddenException: không có quyền
    """

    async def get_profile(self, user_id: str) -> User:
        """Lấy profile user theo ID.

        Args:
            user_id: UUID string của user.

        Returns:
            User model nếu tìm thấy.

        Raises:
            NotFoundException: user không tồn tại.
        """
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user
```

---

## 9. Docker Setup

### 9.1 `Backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000"]
```

### 9.2 Root `docker-compose.yml`

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dulichviet
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./Backend
    ports:
      - "8000:8000"
    env_file: ./Backend/.env
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./Backend/src:/app/src    # Hot reload
    command: uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./Frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## 10. Verification Checklist

```bash
# 1. uv sync
cd Backend && uv sync --frozen

# 2. Migrations
uv run alembic upgrade head

# 3. Run server
uv run fastapi dev src/main.py

# 4. Swagger
# → http://localhost:8000/docs

# 5. Test endpoints
# POST /api/v1/auth/register
# POST /api/v1/auth/login
# POST /api/v1/itineraries/generate
# GET  /api/v1/itineraries/
# GET  /api/v1/destinations/
# GET  /health

# 6. Run tests
uv run pytest -v --tb=short

# 7. Lint
uv run ruff check src/ --fix
uv run ruff format src/

# 8. Docker
docker compose up --build
docker compose ps
curl http://localhost:8000/health
```

---

## 11. Checklist trước khi bắt đầu code

```
□ 1. Rotate secrets: JWT_SECRET_KEY + GEMINI_API_KEY
□ 2. Đăng ký tài khoản Goong (https://account.goong.io)
□ 3. Đăng ký tài khoản LangSmith (optional: https://smith.langchain.com)
□ 4. Xóa files root cũ (render.yaml, vercel.json, package.json, ...)
□ 5. Init uv project (uv init --app)
□ 6. Tạo config.yaml + .env.example
□ 7. Tạo folder structure Backend/src/
□ 8. Review plan → Approve → Phase A
```

---

## 12. AI Agent System Architecture

> [!IMPORTANT]
> Toàn bộ AI Agent System phải tuân thủ:
> - **OOP**: Mỗi agent là 1 class, có abstract base
> - **DI**: Inject qua FastAPI Depends chain
> - **Structured Output**: `.with_structured_output(PydanticModel)` — KHÔNG `json.loads()`
> - **Session**: AsyncPostgresSaver — KHÔNG localStorage/in-memory
> - **Data**: Từ crawled DB — KHÔNG mock/seed

### 12.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           AGENT LAYER (src/agent/)                          │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────────┐ │
│  │ Itinerary Agent     │  │ Companion Agent     │  │ Suggestion Agent      │ │
│  │ (RAG Pipeline)      │  │ (LangGraph)         │  │ (DB Query)            │ │
│  │                     │  │                     │  │                       │ │
│  │ Input: Trip params  │  │ Input: Chat message │  │ Input: activity_id    │ │
│  │ Output: Trip JSON   │  │ Output: NL + actions│  │ Output: Place[]       │ │
│  │ LLM: Gemini 2.5     │  │ LLM: Gemini 2.5     │  │ LLM: NONE (DB only)  │ │
│  │ Session: NO         │  │ Session: PostgreSQL │  │ Session: NO           │ │
│  └──────┬──────────────┘  └──────┬──────────────┘  └──────┬────────────────┘ │
│         │                        │                        │                  │
│  ┌──────▼──────────────────────────────────────────────────▼──────────────┐  │
│  │                    TOOLS + SCHEMAS + PROMPTS                           │  │
│  │  tools/companion_tools.py (6 @tool)                                   │  │
│  │  schemas/itinerary_schemas.py (AgentItinerary — structured output)    │  │
│  │  schemas/companion_schemas.py (CompanionState — TypedDict)             │  │
│  │  prompts/itinerary_prompts.py (system + user templates)               │  │
│  │  prompts/companion_prompts.py (companion system prompt)               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│         │                        │                                          │
│  ┌──────▼─────────────────────────▼──────────────────────────────────────┐  │
│  │                    LLM FACTORY (src/agent/llm.py)                     │  │
│  │  create_llm() → ChatGoogleGenerativeAI(model="gemini-2.5-flash")     │  │
│  │  create_llm_with_tracing() → + LangSmith callbacks                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                │                        │
                ▼                        ▼
┌───────────────────────┐  ┌───────────────────────────┐
│ SERVICE LAYER         │  │ REPOSITORY LAYER           │
│ itinerary_service.py  │  │ trip_repository.py         │
│ companion_service.py  │  │ place_repository.py        │
└───────────────────────┘  └───────────────────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│                    PostgreSQL                          │
│  trips, trip_days, activities    ← App data            │
│  checkpoints, checkpoint_writes ← LangGraph sessions   │
│  places, hotels                 ← Crawled data         │
└────────────────────────────────────────────────────────┘
```

### 12.2 DI Chain cho Agent

```python
# src/core/dependencies.py

async def get_agent_llm(config: AppConfig = Depends(get_config)) -> ChatGoogleGenerativeAI:
    """Factory LLM singleton."""
    return create_llm(config.agent)

async def get_itinerary_pipeline(
    llm = Depends(get_agent_llm),
    place_repo = Depends(get_place_repository),
) -> ItineraryAgentPipeline:
    """Pipeline inject LLM + PlaceRepository."""
    return ItineraryAgentPipeline(llm=llm, place_repo=place_repo)

async def get_companion_service(
    pool = Depends(get_async_pool),  # psycopg AsyncConnectionPool
    trip_repo = Depends(get_trip_repository),
) -> CompanionService:
    """Companion inject pool (for checkpointer) + TripRepo."""
    return CompanionService(pool=pool, trip_repo=trip_repo)
```

### 12.3 Session Lifecycle

```
User opens trip DailyItinerary
  → FloatingAIChat mounts
  → WS connect: /ws/agent-chat/{trip_id}?token=JWT
  → BE: authenticate → create thread_id = f"companion-{trip_id}-{user_id}"
  → BE: create_companion_graph(pool) → compile with AsyncPostgresSaver
  → BE: graph.ainvoke({messages: [system_prompt]}, {thread_id})

User sends message #1
  → WS receive
  → graph.ainvoke({messages: [("user", msg)]}, {thread_id})
  → PostgresSaver loads previous state → model reasons → tool use → respond
  → WS send response

User closes tab
  → WS disconnect
  → Session data PERSISTED in PostgreSQL
  → User reopens → WS reconnect → same thread_id → history restored

Pruning (background job every 24h)
  → DELETE FROM checkpoints WHERE created_at < NOW() - INTERVAL '30 days'
```

---

## 13. ETL / Data Freshness Pipeline

> [!CAUTION]
> **KHÔNG SỬ DỤNG mock data, seed data, hay FALLBACK_DATA.**
> Tất cả data phải từ crawled sources đã lưu trong DB.
> Khi AI unavailable → HTTP 503 Service Unavailable.

### 13.1 Data Sources

| Source | Bảng target | Interval | Status |
|--------|------------|----------|--------|
| Google Maps (crawl) | `places` | 7 ngày | ✅ Đã có data |
| Booking.com (crawl) | `hotels` | 3 ngày | ✅ Đã có data |
| Goong API (live) | — (không lưu) | Realtime | ⏳ Cần tạo account |

### 13.2 Freshness Tracking

```python
# src/models/scraped_source.py

class ScrapedSource(Base):
    """Track data freshness cho crawled sources.

    Mỗi row = 1 lần crawl cho 1 nguồn + 1 thành phố.
    Dùng để check xem data có cần re-crawl không.
    """
    __tablename__ = "scraped_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_type: Mapped[str]  # "places", "hotels", "destinations"
    city: Mapped[str]          # "Hà Nội", "TP.HCM"
    last_scraped_at: Mapped[datetime]
    record_count: Mapped[int]
    status: Mapped[str]        # "success", "failed", "in_progress"
    error_message: Mapped[str | None]
```

### 13.3 Freshness Check Service

```python
# src/services/data_freshness_service.py

class DataFreshnessService(BaseService):
    """Kiểm tra và quản lý data freshness.

    Intervals (từ config.yaml):
      - places: 7 ngày → cần re-crawl
      - hotels_pricing: 3 ngày → cần re-crawl
      - destinations: 30 ngày → cần re-crawl
    """

    async def check_freshness(self, source_type: str, city: str) -> bool:
        """Check data có fresh không.

        Returns:
            True nếu data còn mới (trong interval).
            False nếu cần re-crawl.
        """

    async def mark_scraped(
        self, source_type: str, city: str, record_count: int
    ) -> None:
        """Đánh dấu đã crawl xong."""

    async def get_stale_sources(self) -> list[ScrapedSource]:
        """Lấy danh sách sources cần re-crawl."""
```

### 13.4 Endpoint kiểm tra

```python
# GET /api/v1/admin/data-freshness
# → Trả về danh sách sources + last_scraped + status
# → Dùng để monitor data quality
```

---

## 14. Trip History Management

### 14.1 Flow

```
FE: TripHistory.tsx
  → GET /api/v1/itineraries (list owned trips)
  → Response: ItineraryListResponse { itineraries[], total }

Mỗi trip card hiển thị:
  - name (editable inline)
  - destinations (cities)
  - dates (start → end)
  - estimated_cost
  - status (planning/upcoming/completed)
  - cover_image (first activity image)

Actions:
  - View → GET /api/v1/itineraries/{id} → navigate /daily-itinerary/{id}
  - Edit name → PUT /api/v1/itineraries/{id} { name }
  - Delete → DELETE /api/v1/itineraries/{id}
  - Bulk delete → DELETE /api/v1/itineraries/bulk { ids[] }
```

### 14.2 Trip Status Logic

```python
def compute_trip_status(trip: Trip) -> str:
    """Tính status dựa trên ngày."""
    today = date.today()
    if trip.end_date < today:
        return "completed"
    elif trip.start_date <= today:
        return "ongoing"
    elif trip.start_date > today:
        return "upcoming"
    return "planning"
```
