# 02. Kiến Trúc Hệ Thống

## Mục đích

File này vẽ và mô tả **toàn bộ kiến trúc hệ thống** — từ trình duyệt user đến database, từ AI pipeline đến cache, từ REST API hiện tại đến các chat/session flows đã merge (#98–106). Mọi thành phần, mọi kết nối, mọi protocol đều được liệt kê và giải thích.

**Khi nào đọc file này:**
- Onboarding dev mới — đọc TRƯỚC TẤT CẢ file khác
- Debug cross-service issues — xem data flow giữa các layers
- Thêm tính năng mới — xác định tính năng ở layer nào, ảnh hưởng layers nào
- Code review — kiểm tra layer boundary vi phạm

---

## 1. Toàn cảnh hệ thống

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         👤 USER (Browser)                                │
│                                                                          │
│  ┌──────────────────────────── FRONTEND ──────────────────────────────┐  │
│  │  React 18 + Vite 6 + TypeScript + TailwindCSS + MUI + Radix UI    │  │
│  │                                                                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │CreateTrip│ │Workspace │ │TripLib   │ │CityList  │  27 pages   │  │
│  │  │(AI Gen)  │ │(Edit+AI) │ │(List)    │ │(Browse)  │             │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘             │  │
│  │       │ POST/gen    │ PUT/GET     │ GET         │ GET               │  │
│  │  ┌────┴─────────────┴────────────┴─────────────┴───────────────┐  │  │
│  │  │  API Client Layer (services/api.ts + 4 modules)              │  │  │
│  │  │  • JWT Bearer injection + auto-refresh on 401               │  │  │
│  │  │  • Optimistic update + revert-on-failure                    │  │  │
│  │  │  • Mock fallback khi BE không có data                       │  │  │
│  │  └────────────────────────────┬────────────────────────────────┘  │  │
│  └───────────────────────────────┼────────────────────────────────────┘  │
│                                  │ HTTP REST (JSON, camelCase)            │
│                                  ▼                                        │
│  ┌────────────────────── FASTAPI BACKEND ─────────────────────────────┐  │
│  │  Uvicorn (Port 8000)                                              │  │
│  │                                                                    │  │
│  │  ┌──────────────── MIDDLEWARE PIPELINE ──────────────────────┐    │  │
│  │  │  CORS → RequestLog → RateLimiter → ErrorHandler → JWT    │    │  │
│  │  └──────────────────────┬───────────────────────────────────┘    │  │
│  │                          ▼                                        │  │
│  │  ┌──────────────── ROUTER LAYER (api/v1/) ───────────────────┐   │  │
│  │  │  auth.py  │ users.py │ itineraries.py │ places.py │ shared │   │  │
│  │  │  6 EPs    │ 3 EPs    │ 14 EPs          │ 7 EPs     │ 1 EP   │   │  │
│  │  └─────┬──────┴────┬─────┴───────┬─────────┴─────┬────┴───────┘   │  │
│  │        ▼           ▼             ▼               ▼                 │  │
│  │  ┌──────────────── SERVICE LAYER ──────────────────────────────┐   │  │
│  │  │  AuthService │ UserService │ ItineraryService │ PlaceService │   │  │
│  │  │  (JWT+hash)  │ (CRUD)      │ (CRUD+generate)  │ (search)    │   │  │
│  │  │  EmailService│             │                   │             │   │  │
│  │  └──────┬───────┴──────┬──────┴────────┬──────────┴────────────┘   │  │
│  │         ▼              ▼               ▼                           │  │
│  │  ┌──────────────── REPOSITORY LAYER ───────────────────────────┐   │  │
│  │  │  UserRepo │ TripRepo │ PlaceRepo │ TokenRepo               │   │  │
│  │  └──────┬─────┴────┬────┴───────────┬────────────────────────┘   │  │
│  └─────────┼──────────┼────────────────┼─────────────────────────────┘  │
│             ▼          ▼                ▼                               │
│  ┌─────────────── POSTGRESQL ──────────┐  ┌──────── REDIS ──────────┐ │
│  │  users, refresh_tokens              │  │  destinations cache     │ │
│  │  trips, trip_days, activities       │  │  place search cache     │ │
│  │  accommodations, extra_expenses     │  │  rate-limit counter     │ │
│  │  destinations, places, hotels       │  └─────────────────────────┘ │
│  │  saved_places                       │                               │
│  │  share_links, guest_claim_tokens    │                               │
│  │  trip_ratings                       │                               │
│  │  chat_sessions, chat_messages       │                               │
│  │  scraped_sources                    │                               │
│  └─────────────────────────────────────┘                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Layering — Chi tiết từng layer

### Luồng chuẩn

```text
Router → Service → Repository → Model/Database
```

**Nguyên tắc mỗi layer:**

| Layer | Trách nhiệm | KHÔNG được làm |
|---|---|---|
| **Router** | Parse request, auth dependency, gọi service, trả response schema | Không chứa business logic, không query DB trực tiếp |
| **Service** | Business rules: owner check, token validation, validation nghiệp vụ | Không parse HTTP, không return HTTP response |
| **Repository** | Query DB (SELECT, INSERT, UPDATE, DELETE), không chứa logic | Không chứa business rules, không import HTTP types |
| **Schema** | Validate request/response shape, camelCase mapping | Không chứa DB logic |
| **Model** | ORM mapping, table definition, constraints | Không chứa API logic |

### Dependency Injection chain

```text
Router function
  ├── Depends(get_current_user)       → Auth dependency, trả User ORM hoặc 401
  ├── Depends(get_current_user_optional) → Optional auth, trả User hoặc None
  ├── Depends(get_db)                 → Async SQLAlchemy session
  └── Service(session, ...)
        └── Repository(session)
              └── Model + Database
```

### Ví dụ cụ thể: `POST /itineraries/{tripId}/activities`

```text
1. itineraries.py::add_activity()
   ├── Parse tripId từ URL path
   ├── Parse request body → ActivityCreateRequest (Pydantic)
   ├── Depends(get_current_user) → user: User
   ├── Depends(get_db) → session: AsyncSession
   └── ItineraryService(session).add_activity(tripId, user.id, activity_data)

2. ItineraryService::add_activity()
   ├── TripRepo.get_by_id(tripId) → trip (owner check: trip.user_id == user.id)
   ├── Validate: day tồn tại trong trip, time không conflict
   ├── TripRepo.add_activity(day_id, activity_data)
   ├── session.flush() + session.expire_all()
   ├── TripRepo.get_with_full_data(tripId) → refresh full trip
   └── Return ActivitySchema (camelCase)

3. TripRepo::add_activity()
   ├── activity = Activity(**data) → ORM object
   ├── session.add(activity)
   └── session.flush() → write SQL, nhận auto-generated id
```

---

## 3. Frontend Architecture

### Component hierarchy

```text
App.tsx
└── ErrorBoundary
    └── AuthProvider (AuthContext)
        └── TripWizardProvider (TripWizardContext)
            └── Router (routes.tsx)
                ├── Public routes (không cần login)
                │   ├── Home, CityList, CityDetail
                │   ├── Login, Register, ForgotPassword, ResetPassword
                │   ├── CreateTrip, DailyItinerary
                │   └── SharedTripView (/shared/:token)
                │
                ├── Protected routes (cần login → redirect /login)
                │   ├── TripLibrary, SavedPlaces, SavedItineraries
                │   ├── TripWorkspace, TripHistory
                │   ├── Account, Profile, Settings
                │   └── ManualTripSetup
                │
                └── Catch-all → NotFound (404)
```

### API Client Layer flow

```text
Component gọi hook (useTripSync, useActivityManager, ...)
  │
  ├── Hook gọi service function (createItinerary, updateActivity, ...)
  │     │
  │     └── Service gọi apiRequest() từ api.ts
  │           │
  │           ├── Thêm Authorization: Bearer {accessToken}
  │           ├── Gửi HTTP request đến BE
  │           │
  │           ├── 200 OK → return JSON data
  │           ├── 401 Unauthorized → thử refresh token
  │           │     ├── Refresh thành công → retry request gốc
  │           │     └── Refresh thất bại → redirect /login
  │           └── Other error → throw ApiError
  │
  ├── Optimistic update: cập nhật UI ngay lập tức
  │     └── Nếu API fail → revert UI về state trước
  │
  └── Mock fallback: nếu BE không có data → dùng data/ static
```

### Auth flow chi tiết

```text
┌─────────────────────────────────────────────────────────┐
│                    REGISTER FLOW                         │
│                                                          │
│  User điền form Register                                 │
│  → POST /api/v1/auth/register {email, password, name}   │
│  → BE tạo user + hash password                          │
│  → BE trả {accessToken, refreshToken}                   │
│  → FE lưu tokens vào localStorage                       │
│  → FE gọi executePendingClaim() (nếu có guest trips)    │
│  → FE redirect "/" (home)                                │
│                                                          │
│  Lưu ý: OTP BYPASSED cho đến khi BE email OTP sẵn sàng │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                            │
│                                                          │
│  User điền form Login                                    │
│  → POST /api/v1/auth/login {email, password}            │
│  → BE verify password + tạo JWT pair                    │
│  → BE trả {accessToken, refreshToken}                   │
│  → FE lưu tokens vào localStorage                       │
│  → FE gọi GET /api/v1/users/profile                     │
│  → FE gọi executePendingClaim()                         │
│  → FE redirect "/" (hoặc trang đang cố truy cập)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 TOKEN REFRESH FLOW                       │
│                                                          │
│  API call trả 401 Unauthorized                           │
│  → FE đọc refreshToken từ localStorage                   │
│  → POST /api/v1/auth/refresh {refreshToken}             │
│  → BE verify hash + tạo JWT pair mới                    │
│  → BE revoke refresh token cũ                           │
│  → FE cập nhật tokens mới trong localStorage            │
│  → FE retry request gốc với accessToken mới             │
│                                                          │
│  Nếu refresh cũng fail → xóa tokens → redirect /login   │
└─────────────────────────────────────────────────────────┘
```

### Share & Claim flow

```text
┌─────────────────────────────────────────────────────────┐
│                    SHARE FLOW                            │
│                                                          │
│  Owner click "Chia sẻ" trong ItineraryView/Workspace    │
│  → POST /api/v1/itineraries/{tripId}/share             │
│  → BE tạo shareToken (opaque, unique) trong share_links │
│  → BE trả { shareLink: "/shared/{shareToken}" }        │
│  → FE hiển thị share link + nút copy                    │
│                                                          │
│  Người khác mở share link:                               │
│  → GET /api/v1/shared/{shareToken}                      │
│  → BE tìm share_links WHERE share_token = ?             │
│  → BE trả trip data (read-only, không cần auth)        │
│  → FE hiển thị SharedTripView                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    CLAIM FLOW                            │
│                                                          │
│  Guest (chưa login) tạo trip:                           │
│  → POST /api/v1/itineraries (không Bearer token)       │
│  → BE tạo trip với user_id = NULL                       │
│  → BE tạo claimToken: hash lưu DB, raw trả response    │
│  → FE lưu claimToken vào sessionStorage (pending claim) │
│                                                          │
│  Guest đăng nhập/đăng ký:                                │
│  → AuthContext.executePendingClaim()                     │
│  → POST /api/v1/itineraries/{tripId}/claim             │
│    { claimToken: "raw_token_từ_sessionStorage" }       │
│  → BE hash claimToken → tìm match trong DB              │
│  → BE check: chưa consumed + chưa expire                │
│  → BE set trip.user_id = current_user.id                │
│  → BE set consumed_at = now()                           │
│  → Trip chuyển từ guest → owner                         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Config architecture

### Non-secret config: `Backend/config.yaml`

```yaml
app:
  name: "DuLichViet API"
  debug: false

auth:
  access_token_expire_minutes: 30
  refresh_token_expire_days: 7
  password_reset_token_expire_hours: 1

email:
  smtp_host: ""        # Trống = console fallback
  smtp_port: 587
  email_from_address: "noreply@dulichviet.local"
```

### Secret config: `Backend/.env` (không commit)

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<long-random-string>
GEMINI_API_KEY=<optional-Phase-C>
GOONG_API_KEY=<optional-ETL>
```

### Docker Compose overrides

Khi BE chạy trong Docker: `db` thay `localhost` cho PostgreSQL, `redis` thay `localhost`.

---

## 5. AI Architecture (Phase C)

### Generate Itinerary — Direct Pipeline

```text
┌─────────────────────────────────────────────────────────┐
│              GENERATE ITINERARY PIPELINE                  │
│                                                          │
│  FE (CreateTrip.tsx)                                     │
│  → POST /api/v1/itineraries/generate                    │
│    { destination, startDate, endDate, budget,            │
│      adults, children, interests }                       │
│                                                          │
│  ┌─ ItineraryService.generate() ──────────────────────┐ │
│  │  1. Validate request (dates, budget > 0)           │ │
│  │  2. ItineraryPipeline.generate(request)             │ │
│  │     ├── Resolve destination -> DB recommendation ctx│ │
│  │     ├── Gemini LLM structured output (JSON schema)  │ │
│  │     ├── Pydantic validation (2 retries, 3 attempts) │ │
│  │     └── Return validated DaySchema[] + Accommodation │ │
│  │  3. Save trip + days + activities + accommodations  │ │
│  │  4. Return ItineraryResponse (camelCase)            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  FE navigate /trip-workspace?tripId={id}                 │
└─────────────────────────────────────────────────────────┘

KEY: Generate KHÔNG qua Supervisor — gọi direct ItineraryPipeline.
     Supervisor chỉ điều phối companion chat/analytics.
     Activity pacing mặc định đúng 5 hoạt động/ngày và có thể đổi bằng env/config.
```

### Companion Chat — Patch-Confirm Flow

> **Phase C.3–C.4 đã merge (#98–106):** companion chat + apply-patch đã implement thật. Endpoint thực tế là `POST /api/v1/itineraries/chat-sessions/{sessionId}/messages` (gửi message) và `POST /api/v1/itineraries/{tripId}/apply-patch` (xác nhận patch) — KHÔNG phải `/api/v1/agent/*`. Block dưới đây mô tả conceptual flow (intent routing + JSON prompt-driven `proposedOperations`, validate bằng Pydantic; KHÔNG dùng Gemini function-calling/tools).

```text
┌─────────────────────────────────────────────────────────┐
│              COMPANION CHAT FLOW                          │
│                                                          │
│  FE (ChatPanel trong TripWorkspace)                                 │
│  → POST /itineraries/chat-sessions/{sessionId}/messages  │
│    { content }                                           │
│                                                          │
│  ┌─ CompanionService.chat() ──────────────────────────┐ │
│  │  1. Classify intent (modify/info/suggest/general)  │ │
│  │  2. Load trip context (OWNER-CHECK BẮT BUỘC)      │ │
│  │  3. Build JSON prompt + call Gemini (JSON MIME)    │ │
│  │  4. Return:                                       │ │
│  │     {                                              │ │
│  │       message: "Tôi đề xuất thêm Văn Miếu...",     │ │
│  │       requiresConfirmation: true,                   │ │
│  │       proposedOperations: [                         │ │
│  │         { type: "add_activity", description: "...", │ │
│  │           target: { dayId: 1, activity: {...} } }  │ │
│  │       ]                                            │ │
│  │     }                                              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  FE hiển thị proposed changes + confirm button           │
│  → User confirm                                         │
│  → POST /itineraries/{tripId}/apply-patch               │
│  → BE validate + apply to DB                            │
│                                                          │
│  KEY: Chat KHÔNG TỰ PERSIST DB trước khi user confirm. │
│       Mỗi operation có audit-friendly type + description.│
└─────────────────────────────────────────────────────────┘
```

### Suggestion Service — DB-Only

```text
FE hoặc companion context
→ SuggestionService (`src/places/suggestion_service.py` — đã tồn tại, merged ở C.2)
→ Query destinations/places/hotels từ DB theo filters
→ Return gợi ý (KHÔNG gọi LLM)

WHY DB-only: Gợi ý địa điểm chỉ cần filter + sort data có sẵn.
Không cần "sáng tạo" nội dung mới, chỉ lọc và xếp hạng.
```

---

## 6. Phase C File Map

| File Backend C.1 đã có | Mục đích | Layer |
|---|---|---|
| `src/itineraries/pipeline.py` | LLM orchestration cho generate | Service |
| `src/agent/config.py` | AI config facade | Shared AI infra |
| `src/agent/llm.py` | Gemini client wrapper + JSON parsing | Shared AI infra |
| `src/agent/prompts/itinerary_prompts.py` | Generate prompt builder | Shared AI infra |
| `src/agent/schemas/itinerary_schemas.py` | LLM output schema | Shared AI infra |

| File Backend còn lại cho C.2-C.5 | Mục đích | Layer |
|---|---|---|
| `src/itineraries/companion_service.py` | Message handling, apply-patch, JSON prompt-driven provider abstraction cho chat | Service (đã implement, merged #105) |
| `src/places/suggestion_service.py` | Gợi ý DB-only (không LLM) | Service |
| `src/itineraries/service.py` | Quản lý trip orchestration + chat session foundation hiện tại | Service |
| `src/itineraries/router.py` (mở rộng) | Session/message/apply-patch endpoints | Router |
| `src/itineraries/repository.py` (mở rộng) | Chat DB queries | Repository |

| File Frontend | Mục đích |
|---|---|
| `ChatPanel` | Panel companion session-aware trong `TripWorkspace`; render `proposedOperations` + confirm/cancel UI (merged #98-106) |
| `services/chat.ts` | Chat/session/apply-patch API client (merged #98-106) |
| `companion/*.tsx` | (tuỳ chọn) Nối real suggestions; hiện confirm UI nằm trong `ChatPanel` |
| `CreateTrip.tsx` | Đã wired tới C.1 `generateItinerary` |

---

## 7. Design decisions

| Quyết định | Tại sao (WHY) | Khi nào review |
|---|---|---|
| Integer PK thay UUID | FE dùng `id: number`, comparison đơn giản, index nhẹ | Nếu cần multi-DB replication |
| camelCase API boundary | FE TypeScript convention, FE `trip.types.ts` là contract | Không review — locked |
| JWT access + refresh | Access ngắn hạn (30p), refresh dài hạn (7d), hash trong DB | Nếu chuyển sang opaque token |
| shareToken opaque | Không lộ integer ID, không đoán được | Không review — locked |
| claimToken one-time | Chống replay attack, hash + expiry + consumed_at | Không review — locked |
| Generate không qua Supervisor | Direct pipeline đơn giản, không cần orchestration | Nếu thêm RAG/retrieval steps |
| Chat patch-confirm | User kiểm soát mọi thay đổi DB, audit-friendly | Không review — locked |
| Suggestion DB-only | Không cần LLM để filter + sort data có sẵn | Nếu cần "creative" suggestions |
| Redis fail-open cho places | App vẫn chạy khi Redis down (query DB trực tiếp) | Không review — locked |
| AI rate limit KHÔNG fail-open | Phải trả lỗi thay vì cho request qua | Không review — locked |
