# Part 13: Architecture Overview — Kiến trúc Tổng thể Hệ thống

> **Decision lock v4.1:** Architecture chuẩn cho MVP2 là **contract-first + security-first**:
> FE `trip.types.ts` quyết định public JSON shape, BE dùng camelCase ở API boundary.
> MVP2 core có 33 endpoints; `EP-34 Analytics` là optional/MVP2+. Generate itinerary đi
> direct `ItineraryPipeline`; Supervisor chỉ điều phối chat/analytics natural-language.
> Share public qua `shareToken`, claim guest qua `claimToken`, chat history lưu ở
> `chat_sessions/chat_messages` thay vì expose raw LangGraph checkpoints.

## Mục đích file này

### WHAT — File này chứa gì?

File này vẽ và mô tả **toàn bộ kiến trúc hệ thống** — từ trình duyệt user đến database, từ AI Agent đến Cache, từ WebSocket đến REST API. Mọi thành phần, mọi kết nối, mọi protocol đều được liệt kê và giải thích.

### WHY — Tại sao cần file riêng cho architecture?

Các file plan khác (03, 04, 06...) mô tả chi tiết **bên trong** từng module. File này cho **cái nhìn từ trên xuống** — "hệ thống gồm những gì, kết nối ra sao". Khi debug production issue, developer cần biết nhanh: "request đi qua đâu" → mở file này.

### WHEN — Khi nào đọc?

- **Onboarding dev mới** — đọc file này TRƯỚC TẤT CẢ file khác
- **Debug cross-service issues** — xem data flow giữa các layers
- **Thêm tính năng mới** — xác định tính năng ở layer nào, ảnh hưởng layers nào
- **Deploy/scale** — xem deployment topology

---

## 1. Full System Architecture — Toàn cảnh

### §1.1 Block Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          👤 USER (Browser)                              │
│                                                                         │
│  ┌──────────────────────────── FRONTEND ─────────────────────────────┐  │
│  │  React 18 + Vite 5 + TypeScript                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │CreateTrip│ │Workspace │ │TripHist  │ │CityList  │  25 pages  │  │
│  │  │(AI Gen)  │ │(Edit+AI) │ │(List)    │ │(Browse)  │            │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │  │
│  │       │ POST        │ PUT/WS     │ GET         │ GET              │  │
│  │  ┌────┴─────────────┴────────────┴─────────────┴──────────────┐  │  │
│  │  │  Axios (HTTP) + WebSocket Client + React Hooks              │  │  │
│  │  │  useTripSync · useActivityManager · useAccommodation        │  │  │
│  │  └────────────────────────────┬───────────────────────────────┘  │  │
│  └───────────────────────────────┼───────────────────────────────────┘  │
│                                  │ HTTP REST (JSON) / WebSocket          │
│                                  ▼                                       │
│  ┌──────────────────────── API GATEWAY ──────────────────────────────┐  │
│  │  FastAPI + Uvicorn (Port 8000)                                    │  │
│  │  ┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │ CORS │→│ Log  │→│Rate Limit│→│Error Hdlr│→│Auth (JWT)│      │  │
│  │  └──────┘ └──────┘ └──────────┘ └──────────┘ └──────────┘      │  │
│  │  ┌────────────────────────────────────────┐  │ │  │
│  │  │  🎯 TravelSupervisor (AI chat/analytics)│  │ │  │
│  │  │  Intent Classification → Route → Validate│  │ │  │
│  │  │  Không bọc CRUD/direct generate          │  │ │  │
│  │  └────┬─────────┬─────────────┬──────────┘  │ │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐ │ │  │
│  │  │ItineraryPipeline│  │CompanionService │  │SuggestionSvc │  │Analytics  │ │ │  │
│  │  │(direct RAG)     │  │(LangGraph+Tools)│  │(Pure DB)      │  │(T2SQL opt)│ │ │  │
│  │  │Stateless        │  │Stateful (PG)    │  │Stateless      │  │Read-only  │ │ │  │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘  └─────┬──────┘ │ │  │
│  └───────────┤────────────────────┤───────────────────┤───────────────┘ │  │─────────────────┘  │
│                                  ▼                                       │
│  ┌─────────────────── PRESENTATION LAYER ────────────────────────────┐  │
│  │  Routers (api/v1/)                                                │  │
│  │  ┌────────┐ ┌────────┐ ┌────────────┐ ┌────────┐ ┌───────┐      │  │
│  │  │auth.py │ │users.py│ │itineraries │ │places  │ │agent  │      │  │
│  │  │4 EPs   │ │3 EPs   │ │14 EPs core │ │4+3 EPs │ │5 EPs core │  │
│  │  └───┬────┘ └───┬────┘ └─────┬──────┘ └───┬────┘ └───┬───┘      │  │
│  └──────┼──────────┼────────────┼─────────────┼──────────┼───────────┘  │
│         ▼          ▼            ▼             ▼          ▼               │
│  ┌─────────────────── BUSINESS LOGIC LAYER ──────────────────────────┐  │
│  │  Services (DI injected)                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐        │  │
│  │  │AuthSvc   │ │UserSvc   │ │ItinerarySvc  │ │PlaceSvc  │        │  │
│  │  │(JWT+bcrypt│ │(CRUD)    │ │(CRUD+AI pipe)│ │(search)  │        │  │
│  │  └──────────┘ └──────────┘ └──────┬───────┘ └──────────┘        │  │
│  │                                    │                               │  │
│  │  ┌─────────────────── AI MODULE ──┴────────────────────────────┐ │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │ │  │
│  │  │  │ItineraryPipeline│  │CompanionService │  │ContextSuggest│ │ │  │
│  │  │  │(RAG 5 steps)    │  │(LangGraph+Tools)│  │(Pure DB)    │  │ │  │
│  │  │  │Stateless        │  │Stateful (PG)    │  │Stateless    │  │ │  │
│  │  │  └────────┬────────┘  └────────┬────────┘  └──────┬─────┘  │ │  │
│  │  └───────────┼────────────────────┼───────────────────┼────────┘ │  │
│  └──────────────┼────────────────────┼───────────────────┼──────────┘  │
│                 ▼                    ▼                   ▼              │
│  ┌─────────────────── DATA ACCESS LAYER ─────────────────────────────┐  │
│  │  Repositories (SQLAlchemy 2.0 async)                              │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  │  │UserRepo│ │TripRepo│ │PlaceRepo│ │HotelRepo│ │TokenRepo│        │  │
│  │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬─────┘ └───┬────┘         │  │
│  └──────┼──────────┼──────────┼──────────┼────────────┼──────────────┘  │
│         ▼          ▼          ▼          ▼            ▼                  │
│  ┌─────────────────── INFRASTRUCTURE LAYER ──────────────────────────┐  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │  │
│  │  │PostgreSQL 16 │  │ Redis 7      │  │ External APIs        │    │  │
│  │  │  16 tables   │  │ Cache(TTL)   │  │ ┌────────────────┐   │    │  │
│  │  │  Alembic     │  │ Rate limit   │  │ │Gemini 2.5 Flash│   │    │  │
│  │  │  migrations  │  │ JWT blacklist│  │ │Goong Maps API  │   │    │  │
│  │  └──────────────┘  └──────────────┘  │ └────────────────┘   │    │  │
│  │                                       └──────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### §1.2 Mermaid Architecture Graph

```mermaid
graph TB
    subgraph "Frontend — React + Vite + TypeScript"
        FE_PAGES["25 Pages<br/>CreateTrip · Workspace · TripHistory<br/>CityList · SavedPlaces · Account"]
        FE_HOOKS["6 Custom Hooks<br/>useTripSync · useActivityManager<br/>useAccommodation · useTripState"]
        FE_API["API Client<br/>Axios (HTTP) + WebSocket"]
        FE_PAGES --> FE_HOOKS --> FE_API
    end

    subgraph "API Gateway — FastAPI Middleware Chain"
        MW_CORS["1. CORS<br/>Allow FE domain"]
        MW_LOG["2. Logging<br/>Request + timing"]
        MW_RATE["3. Rate Limit<br/>Redis counter"]
        MW_ERR["4. Error Handler<br/>JSON format"]
        MW_CORS --> MW_LOG --> MW_RATE --> MW_ERR
    end

    subgraph "Routers — Presentation Layer (api/v1/)"
        R_AUTH["auth.py<br/>4 endpoints"]
        R_USER["users.py<br/>3 endpoints"]
        R_ITIN["itineraries.py<br/>14 core endpoints"]
        R_PLACE["places.py<br/>7 endpoints"]
        R_AGENT["agent.py<br/>5 core endpoints<br/>+ EP-34 optional"]
    end

    subgraph "Services — Business Logic Layer"
        S_AUTH["AuthService"]
        S_USER["UserService"]
        S_ITIN["ItineraryService"]
        S_PLACE["PlaceService"]
    end

    subgraph "AI Module — Direct Pipeline + Supervisor vừa đủ"
        AI_GEN["🤖 ItineraryPipeline<br/>RAG 5 steps · Stateless"]
        AI_CHAT["💬 CompanionService<br/>LangGraph · Stateful"]
        AI_SUG["📊 SuggestionService<br/>Pure DB · Stateless"]
    end

    subgraph "Repositories — Data Access"
        REPO["UserRepo · TripRepo · PlaceRepo<br/>HotelRepo · TokenRepo · SavedRepo"]
    end

    subgraph "Infrastructure"
        PG[("PostgreSQL 16<br/>16 core tables")]
        RD[("Redis 7<br/>Cache + Rate")]
        GEMINI["☁️ Gemini 2.5 Flash"]
        GOONG["🗺️ Goong Maps API"]
    end

    FE_API -->|"HTTP REST<br/>JSON"| MW_CORS
    FE_API -->|"WebSocket<br/>JSON messages"| R_AGENT

    MW_ERR --> R_AUTH & R_USER & R_ITIN & R_PLACE & R_AGENT

    R_AUTH --> S_AUTH
    R_USER --> S_USER
    R_ITIN --> S_ITIN
    R_PLACE --> S_PLACE
    R_AGENT --> AI_CHAT

    S_ITIN --> AI_GEN
    S_PLACE --> AI_SUG

    S_AUTH & S_USER & S_ITIN & S_PLACE --> REPO
    AI_GEN --> REPO
    AI_CHAT -->|"6 tools"| REPO
    AI_SUG --> REPO

    REPO --> PG
    MW_RATE --> RD
    S_PLACE -->|"cache"| RD
    AI_GEN -->|"LLM call"| GEMINI
    AI_CHAT -->|"LLM call"| GEMINI
    AI_CHAT -->|"nearby search"| GOONG
```

### §1.3 Giải thích từng Layer

**Layer 1 — Frontend (React + Vite):**
- **Vai trò:** Hiển thị UI, thu thập input, gửi API requests, hiển thị responses.
- **Tech stack:** React 18, Vite 5, TypeScript, React Router, CSS modules.
- **Communication:** Axios cho HTTP REST, native WebSocket API cho chat.
- **State management:** 6 custom hooks, KHÔNG dùng Redux/Zustand — hooks đủ cho app này.
- **UI/UX:** KHÔNG thay đổi trong MVP2 — chỉ thay data source (localStorage → API).

**Layer 2 — API Gateway (Middleware Chain):**
- **Vai trò:** Lọc requests trước khi đến routers. Mỗi request đi qua 4 middleware theo thứ tự.
- **CORS:** Chỉ cho phép domain FE (`localhost:5173` dev, `app.dulviet.com` prod).
- **Logging:** Ghi lại method, path, status code, duration. Cảnh báo nếu > 5s.
- **Rate Limit:** Redis counter. AI endpoints: 3 calls/day. API chung: 100 calls/min.
- **Error Handler:** Catch exceptions → format thành `{error_code, message, detail}` JSON.

**Layer 3 — Presentation (Routers):**
- **Vai trò:** Parse HTTP requests → gọi Services → format HTTP responses.
- **33 core endpoints** chia 5 nhóm: Auth (4), Users (3), Itineraries (14 — bao gồm EP-32 claim), Places (7), Agent/Suggestion (5 — bao gồm EP-33 chat-history). `EP-34 analytics` là optional/MVP2+.
- **Quy tắc:** Router KHÔNG chứa business logic — chỉ parse + validate + delegate.

**Layer 4 — Business Logic (Services + AI):**
- **Vai trò:** Xử lý logic nghiệp vụ. Mỗi Service nhận Repositories qua DI.
- **AI Module** tách riêng: `ItineraryPipeline` direct cho generate, `CompanionService` + `TravelSupervisor` cho chat, `SuggestionService` DB-only, `AnalyticsWorker` optional/MVP2+.
- **Chi tiết AI:** Xem [04_ai_agent_plan.md](04_ai_agent_plan.md).

**Layer 5 — Data Access (Repositories + Infrastructure):**
- **Vai trò:** CRUD operations trên database. Mỗi Repo = 1 entity.
- **SQLAlchemy 2.0 async** — tất cả queries đều async, không block event loop.
- **Redis:** Cache responses (TTL 5-60 phút) + Rate limit counters + JWT blacklist.

---

## 2. Communication Protocols — Ai nói chuyện với ai?

### §2.1 Protocol Matrix

| Source | Target | Protocol | Data Format | Latency Target | Khi nào dùng |
|--------|--------|----------|-------------|----------------|-------------|
| FE → BE | REST API | HTTP/1.1 | JSON | < 200ms (CRUD) | Mọi CRUD operations |
| FE → BE | Chat | WebSocket | JSON messages | < 10s/msg | AI Companion chat |
| BE → DB | Queries | asyncpg | SQL (parameterized) | < 50ms | Mọi data read/write |
| BE → Redis | Cache/Rate | Redis protocol | Key-Value strings | < 5ms | Cache hit, rate check |
| BE → Gemini | LLM call | HTTPS | JSON (REST API) | 5-20s | AI generation, chat |
| BE → Goong | Maps API | HTTPS | JSON (REST API) | 200-500ms | Geocoding, nearby |
| ETL → DB | Bulk insert | asyncpg | SQL (batch upsert) | N/A (background) | ETL pipeline |

### §2.2 Data Flow Diagrams

#### Luồng 1: User tạo lộ trình AI

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🌐 React FE
    participant MW as 🛡️ Middleware
    participant R as 📡 Router
    participant S as ⚙️ Service
    participant AI as 🤖 AI Pipeline
    participant DB as 💾 PostgreSQL
    participant LLM as ☁️ Gemini
    participant RD as 🔴 Redis

    U->>FE: Chọn destination, dates, budget
    FE->>MW: POST /itineraries/generate
    MW->>RD: Rate limit check
    RD-->>MW: OK (2/3 used)
    MW->>R: Pass to router
    R->>S: ItineraryService.generate()
    S->>AI: Pipeline.run(request)
    AI->>DB: Fetch places context (30 items)
    DB-->>AI: Places + Hotels metadata
    AI->>LLM: Prompt + context → structured output
    LLM-->>AI: AgentItinerary (Pydantic)
    AI->>DB: Save Trip + Days + Activities (1 transaction)
    DB-->>AI: Trip with IDs
    AI-->>S: Trip object
    S-->>R: ItineraryResponse
    R-->>FE: 201 Created {id, days[], activities[]}
    FE-->>U: Navigate to TripWorkspace
```

#### Luồng 2: Auto-save (Drag-drop → API)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🌐 React FE
    participant R as 📡 Router
    participant S as ⚙️ Service
    participant DB as 💾 PostgreSQL
    participant RD as 🔴 Redis

    U->>FE: Kéo thả activity sang vị trí khác
    Note over FE: onDragEnd → update React state
    U->>FE: Sửa tên activity (2 giây sau)
    Note over FE: Debounce timer reset (3s)
    Note over FE: ... 3 giây không thay đổi ...
    FE->>R: PUT /itineraries/42 {full JSON}
    R->>S: ItineraryService.update()
    S->>DB: Load current trip
    Note over S: Diff & Sync Algorithm:<br/>- Compare day IDs<br/>- Compare activity IDs<br/>- Classify: CREATE/UPDATE/DELETE
    S->>DB: Execute changes (1 transaction)
    S->>RD: DEL trip:42 (invalidate cache)
    S-->>R: Updated ItineraryResponse
    R-->>FE: 200 OK
    Note over FE: Update local state (silent)
```

#### Luồng 3: AI Chat qua WebSocket

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🌐 FloatingAIChat
    participant WS as 🔌 WebSocket
    participant LG as 🧠 LangGraph
    participant T as 🔧 Tool
    participant DB as 💾 PostgreSQL

    FE->>WS: Connect ws://host/ws/agent-chat/42?token=JWT
    WS-->>FE: Connection accepted
    U->>FE: "Thêm quán phở ngon cho ngày 1"
    FE->>WS: {"type":"message", "content":"..."}
    WS->>LG: Invoke graph (thread_id="companion-42-7")
    LG->>LG: agent_node: LLM analyze intent
    LG->>T: tool_calls: search_places_db("phở", "Hà Nội")
    T->>DB: SELECT FROM places...
    DB-->>T: [Phở Bát Đàn, Phở Thìn, Phở 10]
    T-->>LG: Results
    LG->>LG: agent_node: choose best, build patch
    LG->>T: propose_itinerary_patch("addActivity", day=1, ...)
    T-->>LG: {requiresConfirmation: true, proposedOperations: [...]}
    LG->>LG: agent_node: compose response
    LG-->>WS: Response text + proposedOperations
    WS-->>FE: {"type":"response", "content":"Mình tìm được...", "requiresConfirmation":true, "proposedOperations":[...]}
    FE->>FE: Hiện UI xác nhận
    FE->>API: POST /itineraries/{id}/apply-patch hoặc PUT /itineraries/{id}
    API->>DB: Apply patch trong transaction sau khi owner check
```

---

## 3. Tech Stack Matrix

### §3.1 Mỗi Layer dùng công nghệ gì?

| Layer | Technology | Version | WHY chọn? |
|-------|-----------|---------|-----------|
| **Frontend** | React | 18 | Component-based, hooks, large ecosystem |
| | Vite | 5 | HMR nhanh, ESM-first, nhẹ hơn CRA |
| | TypeScript | 5 | Type safety, IDE support, `trip.types.ts` source of truth |
| | Axios | 1.x | Promise-based HTTP, interceptors (refresh token) |
| | React Router | 6 | Client-side routing, 25 pages |
| **API** | FastAPI | 0.115+ | Async native, Pydantic validation, auto OpenAPI docs |
| | Uvicorn | 0.30+ | ASGI server, async workers |
| | Pydantic | 2.x | Request/response validation, JSON schema |
| **Auth** | python-jose | 3.x | JWT encode/decode |
| | bcrypt | 4.x | Password hashing (salt + hash) |
| **ORM** | SQLAlchemy | 2.0 | Async ORM, type-safe queries, relationship loading |
| | Alembic | 1.14+ | Database migrations, version control for schema |
| **Database** | PostgreSQL | 16+ | ACID, JSON columns, trigram search, robust |
| **Cache** | Redis | 7+ | In-memory, TTL, INCR (rate limit), sub-millisecond |
| **AI** | LangChain | 0.2+ | LLM abstraction, tool binding, structured output |
| | LangGraph | 0.2+ | StateGraph for multi-turn chat, checkpoints |
| | Gemini 2.5 Flash | latest | Fast, cheap, Vietnamese support, structured output |
| **Maps** | Goong Maps API | v1 | Vietnam-specific, Vietnamese address geocoding |
| **Package** | uv | latest | 10-100x faster than pip, deterministic lockfile |
| **Container** | Docker | 24+ | Containerization, multi-stage builds |
| | Docker Compose | 3.9 | Multi-service orchestration (BE + DB + Redis) |
| **CI/CD** | GitHub Actions | v4 | Integrated with repo, free for public repos |

### §3.2 WHY NOT — Tại sao KHÔNG chọn alternatives?

| Không chọn | Thay bằng | Lý do |
|-----------|----------|-------|
| Django | FastAPI | Django sync-first, FastAPI async-first (cần cho AI + WebSocket) |
| MongoDB | PostgreSQL | Relational data (trips → days → activities), ACID, strong schema |
| Memcached | Redis | Redis có INCR (rate limit), TTL, patterns. Memcached chỉ key-value |
| OpenAI GPT | Gemini | Gemini rẻ hơn, native Vietnamese, structured output tốt |
| pip/poetry | uv | uv nhanh 10-100x, better lockfile, Rust-based |
| Kubernetes | Docker Compose | K8s quá phức tạp cho 1-3 containers. Docker Compose đủ cho MVP |
| Redux/Zustand | React Hooks | App không lớn đủ cần global store. Custom hooks đủ |

---

## 4. Deployment Architecture

### §4.1 Docker Compose Topology

```mermaid
graph TB
    subgraph "Docker Network: dulviet-net"
        API["🐍 Backend API<br/>Port 8000<br/>FastAPI + Uvicorn<br/>2 workers"]
        DB["🐘 PostgreSQL 16<br/>Port 5432<br/>Volume: pgdata<br/>16 core tables"]
        REDIS["🔴 Redis 7<br/>Port 6379<br/>Volume: redisdata<br/>100MB max"]
    end

    subgraph "Host Machine"
        FE["🌐 Frontend Dev<br/>Port 5173<br/>Vite dev server"]
    end

    subgraph "External Services"
        GEMINI["☁️ Gemini API<br/>HTTPS<br/>us-central1"]
        GOONG["🗺️ Goong API<br/>HTTPS<br/>Vietnam"]
    end

    FE -->|"HTTP :8000<br/>WS :8000"| API
    API -->|"asyncpg :5432"| DB
    API -->|"redis :6379"| REDIS
    API -->|"HTTPS"| GEMINI
    API -->|"HTTPS"| GOONG
```

### §4.2 Environment Matrix

| Setting | Development | Staging | Production |
|---------|------------|---------|------------|
| DEBUG | true | false | false |
| LOG_LEVEL | DEBUG | INFO | WARNING |
| DB | localhost:5432 | staging-db | prod-db |
| Workers | 1 | 2 | 4 |
| CORS | localhost:5173 | staging.app.com | app.dulviet.com |
| Rate limit (AI) | 10/day | 5/day | 3/day |
| Rate limit (API) | 1000/min | 100/min | 100/min |
| Max trips/user | 50 | 10 | 5 |
| Redis maxmemory | 50MB | 100MB | 256MB |

---

## 5. Cross-Reference Map — File nào mô tả phần nào?

```mermaid
graph LR
    THIS["📐 13 Architecture<br/>(file này)<br/>Toàn cảnh hệ thống"]
    
    F02["📊 02 FE Analysis<br/>FE pages + hooks"]
    F03["📝 03 BE Refactor<br/>Function signatures"]
    F04["🤖 04 AI Agent<br/>3 AI mechanisms"]
    F05["🔄 05 Data Pipeline<br/>ETL logic"]
    F06["📈 06 Scalability<br/>Redis + performance"]
    F09["🗄️ 09 Database<br/>16 core tables + ERD"]
    F11["🐳 11 CI/CD<br/>Docker + deploy"]
    F14["⚙️ 14 Config<br/>Config params"]

    THIS --> F02 & F03 & F04 & F05 & F06 & F09 & F11 & F14
```

| Muốn biết chi tiết... | Mở file |
|----------------------|---------|
| FE pages cần API nào? | [02_fe_revamp_analysis.md](02_fe_revamp_analysis.md) |
| Function signature cụ thể? | [03_be_refactor_plan.md](03_be_refactor_plan.md) |
| AI pipeline + tools + WS? | [04_ai_agent_plan.md](04_ai_agent_plan.md) |
| ETL luồng data nào? | [05_data_pipeline_plan.md](05_data_pipeline_plan.md) |
| Redis cache strategy? | [06_scalability_plan.md](06_scalability_plan.md) |
| DB schema + ERD? | [09_database_design.md](09_database_design.md) |
| Docker + deploy? | [11_cicd_docker_plan.md](11_cicd_docker_plan.md) |
| Config parameters? | [14_config_plan.md](14_config_plan.md) |

---

## 7. System Failure Scenarios & Resilience 🆕

Kiến trúc hệ thống cần chịu tải và xử lý lỗi graceful. Bảng dưới phân tích từng component và hành vi khi fail:

### §7.1 Component Failure Matrix

```mermaid
graph TB
    subgraph "Failure Impact Analysis"
        PG["💾 PostgreSQL DOWN<br/>━━━━━━━━━━━━━━━<br/>Impact: 🔴 CRITICAL<br/>Toàn bộ API fail<br/>━━━━━━━━━━━━━━━<br/>Mitigation:<br/>Docker restart policy<br/>Health check → 503"]
        
        RD["🔴 Redis DOWN<br/>━━━━━━━━━━━━━━━<br/>Impact: 🟡 DEGRADED<br/>Chậm hơn, no rate limit<br/>━━━━━━━━━━━━━━━<br/>Mitigation:<br/>Graceful degradation<br/>Bypass cache → DB"]
        
        AI["🤖 Gemini DOWN<br/>━━━━━━━━━━━━━━━<br/>Impact: 🟡 PARTIAL<br/>AI features disabled<br/>CRUD vẫn hoạt động<br/>━━━━━━━━━━━━━━━<br/>Mitigation:<br/>Circuit breaker<br/>HTTP 503 rõ ràng"]
        
        WS["🔌 WebSocket DROP<br/>━━━━━━━━━━━━━━━<br/>Impact: 🟢 MINOR<br/>Chat reconnect auto<br/>━━━━━━━━━━━━━━━<br/>Mitigation:<br/>FE auto-reconnect<br/>Chat history persisted"]
    end
    
    style PG fill:#f44336,color:#fff
    style RD fill:#ff9800,color:#fff
    style AI fill:#ff9800,color:#fff
    style WS fill:#4CAF50,color:#fff
```

### §7.2 Resilience Patterns áp dụng

| Pattern | Component | Mô tả |
|---------|-----------|--------|
| **Graceful Degradation** | Redis | Khi Redis down → system vẫn hoạt động (chậm hơn), query DB trực tiếp |
| **Circuit Breaker** | Gemini API | Sau 3 lần fail liên tiếp → ngưng gọi AI 60s → trả 503 ngay |
| **Retry with Backoff** | ETL Pipeline | API call fail → retry 3 lần (5s, 15s, 45s) trước khi skip |
| **Auto-Reconnect** | WebSocket | FE tự reconnect với exponential backoff (1s→2s→4s→8s max) |
| **Health Check** | Docker | `GET /health` kiểm tra DB + Redis connectivity. Docker restart on unhealthy |
| **Idempotent Operations** | Auto-save | PUT /itineraries/{id} là idempotent — gọi nhiều lần cho cùng kết quả |

### §7.3 Single Point of Failure (SPOF) Analysis

| Component | SPOF? | MVP2 Strategy | MVP3 Strategy |
|-----------|-------|---------------|---------------|
| PostgreSQL | ✅ Yes | Docker restart policy `on-failure`, pg_dump daily | Read replica + connection pooling (PgBouncer) |
| Redis | ❌ No | Optional — system works without it | Redis Sentinel for HA |
| Gemini API | ❌ No | AI features disabled when down | Multi-provider fallback (Gemini → Claude) |
| Backend | ❌ No | Single container, Docker restart | 3 replicas + Nginx load balancer |

> [!IMPORTANT]
> **MVP2 chấp nhận PostgreSQL là SPOF duy nhất.** Risk thấp vì: (1) PostgreSQL rất stable, (2) Docker restart tự động, (3) pg_dump daily backup. MVP3 sẽ thêm read replica.

> 📖 Chi tiết failure modes cho từng endpoint: [00_overview_changes.md §18](00_overview_changes.md)
> 📖 Redis graceful degradation code: [06_scalability_plan.md §8](06_scalability_plan.md)
