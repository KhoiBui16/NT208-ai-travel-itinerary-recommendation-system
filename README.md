# DuLichViet — AI Travel Itinerary Recommendation System

> NT208 · Web Programming Project · UIT 2023.2

Hệ thống gợi ý và lập kế hoạch chuyến đi thông minh cho Việt Nam. User mô tả điểm đến, ngân sách, sở thích — AI tự động sinh lịch trình chi tiết theo ngày, có thể chỉnh sửa thủ công và chia sẻ.

---

## Mục lục

1. [Tính năng chính](#1-tính-năng-chính)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Low-Level Architecture](#3-low-level-architecture)
4. [Database Schema & Quan hệ](#4-database-schema--quan-hệ)
5. [API Reference](#5-api-reference)
6. [AI Pipeline Flow](#6-ai-pipeline-flow)
7. [Auth & Security Flow](#7-auth--security-flow)
8. [Trạng thái Phase C](#8-trạng-thái-phase-c)
9. [Quick Start](#9-quick-start)
10. [Tests & Verification](#10-tests--verification)
11. [ETL](#11-etl)
12. [Cấu trúc thư mục](#12-cấu-trúc-thư-mục)
13. [Team](#13-team)

---

## 1. Tính năng chính

| Nhóm | Tính năng | Trạng thái |
|---|---|---|
| **Auth** | Đăng ký / đăng nhập / đăng xuất | ✅ Done |
| **Auth** | Refresh token rotation (JWT) | ✅ Done |
| **Auth** | Quên mật khẩu / đặt lại qua email | ✅ Done |
| **Profile** | Xem / cập nhật hồ sơ, đổi mật khẩu | ✅ Done |
| **Trip** | Tạo lịch trình thủ công | ✅ Done |
| **Trip** | Chỉnh sửa ngày / hoạt động / chỗ ở (auto-save) | ✅ Done |
| **Trip** | Xem / xóa / đánh giá lịch trình | ✅ Done |
| **Trip** | Chia sẻ lịch trình qua link công khai | ✅ Done |
| **Trip** | Guest tạo trip → claim sau khi đăng nhập | ✅ Done |
| **Places** | Tìm kiếm địa điểm theo thành phố / danh mục | ✅ Done |
| **Places** | Lưu địa điểm yêu thích | ✅ Done |
| **AI C.1** | Sinh lịch trình tự động bằng Gemini AI | ✅ Done |
| **AI C.2** | Gợi ý địa điểm thay thế (DB-only, không LLM) | ✅ Done |
| **AI C.3** | Companion chat + patch-confirm flow | 🔄 Todo |
| **AI C.4** | Lịch sử chat | 🔄 Todo |
| **AI C.5** | Analytics Text-to-SQL (optional) | 🔄 Optional |
| **ETL** | Goong-first ETL nạp dữ liệu địa điểm | ✅ Done |


---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                               │
│                                                                     │
│   React 18 + Vite 6 + TypeScript + TailwindCSS + MUI               │
│   27 pages · 8 protected routes · JWT auto-refresh                  │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│   │CreateTrip│  │Workspace │  │TripLib   │  │CityList/Detail   │  │
│   │(AI Gen)  │  │(Edit+AI) │  │(CRUD)    │  │(Browse+Search)   │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│        │              │              │                  │            │
│   ┌────┴──────────────┴──────────────┴──────────────────┴────────┐  │
│   │  API Client Layer  (services/api.ts + auth/itinerary/places) │  │
│   │  Bearer injection · auto-refresh on 401 · optimistic update  │  │
│   └────────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────────┘
                                 │ HTTPS · JSON · camelCase
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend  (port 8000)                     │
│                                                                     │
│   CORS → RequestLog → RateLimiter → ErrorHandler                   │
│                                                                     │
│   /api/v1/auth/*      /api/v1/users/*    /api/v1/itineraries/*     │
│   /api/v1/places/*    /api/v1/agent/*    /api/v1/shared/*          │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │  Service Layer: AuthService · ItineraryService · PlaceService│ │
│   │  AI Layer:      ItineraryPipeline (C.1) · SuggestionService  │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │  Repository Layer: TripRepository · PlaceRepository · ...    │ │
│   └──────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┬──────────────────┘
                       │                          │
              ┌────────▼────────┐      ┌──────────▼──────────┐
              │   PostgreSQL    │      │       Redis          │
              │   (port 5432)   │      │   (port 6379)        │
              │  13 tables      │      │  destinations cache  │
              │  3 Alembic rev  │      │  place search cache  │
              └─────────────────┘      │  AI rate-limit keys  │
                                       └─────────────────────┘
                       ▲
              ┌────────┴────────┐
              │  Goong ETL      │
              │  (CLI runner)   │
              │  Goong API →    │
              │  transform →    │
              │  DB upsert      │
              └─────────────────┘
```


---

## 3. Low-Level Architecture

### Backend — By-Domain Structure

```
Backend/src/
├── main.py                    # App factory · mount /api/v1 · lifespan DB check
│
├── agent/                     # Shared AI infrastructure
│   ├── config.py              # AgentConfig (model, temp, retries, timeout, pacing)
│   ├── llm.py                 # GeminiLLM wrapper + parse_json_response()
│   ├── router.py              # /agent prefix — EP-30 suggest
│   ├── prompts/
│   │   └── itinerary_prompts.py   # build_itinerary_prompt() cho C.1
│   └── schemas/
│       └── itinerary_schemas.py   # AgentItinerary, AgentDay, AgentActivity
│
├── auth/                      # Auth + User domain
│   ├── models.py              # User, RefreshToken ORM
│   ├── router.py              # EP-1..7, EP-31..32
│   ├── service.py             # AuthService (register/login/refresh/logout/reset)
│   ├── profile_service.py     # UserService (profile/password)
│   ├── repository.py          # UserRepository, RefreshTokenRepository
│   ├── schemas.py             # AuthResponse, RegisterRequest, LoginRequest, ...
│   ├── dependencies.py        # get_current_user, get_current_user_optional
│   └── email.py               # EmailService (aiosmtplib + console fallback)
│
├── itineraries/               # Trip domain
│   ├── models/
│   │   ├── trip.py            # Trip, TripDay, Activity, ExtraExpense
│   │   ├── extras.py          # Accommodation, ShareLink, TripRating, GuestClaimToken
│   │   └── chat.py            # ChatSession, ChatMessage (schema ready, API todo)
│   ├── pipeline.py            # C.1 ItineraryPipeline (Gemini → validate → persist)
│   ├── repository.py          # TripRepository (CRUD + AI context + chat queries)
│   ├── router.py              # EP-8..21 + EP-8 generate + shared_router
│   ├── schemas.py             # GenerateItineraryRequest, ItineraryResponse, ...
│   └── service.py             # ItineraryService (business logic)
│
├── places/                    # Places domain
│   ├── models.py              # Destination, Place, Hotel, SavedPlace, ScrapedSource
│   ├── repository.py          # PlaceRepository (search, find_alternatives, saved)
│   ├── router.py              # EP-23..29
│   ├── schemas.py             # PlaceResponse, SuggestionResponse, ...
│   ├── service.py             # PlaceService + Redis cache
│   └── suggestion_service.py  # C.2 SuggestionService (DB-only, EP-30)
│
├── core/                      # Cross-cutting concerns
│   ├── config.py              # AppSettings (pydantic-settings, YAML + .env)
│   ├── database.py            # AsyncSession factory, Base, get_db
│   ├── security.py            # JWT, bcrypt, opaque token, hash_token
│   ├── exceptions.py          # NotFound, Forbidden, Conflict, Unauthorized
│   ├── rate_limiter.py        # Redis-backed AI rate limiter (fail-closed)
│   ├── logger.py              # structlog structured logging
│   └── middlewares.py         # CORS, RequestLog, ErrorHandler setup
│
├── etl/                       # ETL pipeline
│   ├── extractors/            # Goong extractor + OSM fallback
│   ├── transformers/          # Place + Hotel transformers
│   ├── loaders/               # DB upsert loader (external_id priority)
│   ├── data/hotels.yaml       # Sample hotel seed data
│   └── runner.py              # CLI entry point
│
└── geo/                       # Goong REST client (autocomplete, detail, geocode)
```

### Frontend — Component Tree

```
App.tsx
└── ErrorBoundary
    └── AuthProvider (AuthContext — JWT state, claim flow)
        └── TripWizardProvider (TripWizardContext — wizard state)
            └── Router (routes.tsx)
                ├── Public routes
                │   ├── / (Home)
                │   ├── /cities, /cities/:name (CityList, CityDetail)
                │   ├── /login, /register, /forgot-password, /reset-password
                │   ├── /create-trip (CreateTrip — AI generate)
                │   └── /shared/:token (SharedTripView — read-only)
                │
                └── Protected routes (→ /login nếu chưa auth)
                    ├── /trip-workspace (TripWorkspace — edit + AI)
                    ├── /trip-library (TripLibrary)
                    ├── /trip-history (TripHistory)
                    ├── /saved-places, /saved-itineraries
                    ├── /account, /profile, /settings
                    └── /manual-trip-setup

services/
├── api.ts          # Fetch wrapper · Bearer injection · auto-refresh on 401
├── auth.ts         # login, register, logout, forgotPassword, resetPassword
├── itinerary.ts    # CRUD, generate, share, claim, rating, activity, accommodation
├── places.ts       # destinations, search, saved places
└── users.ts        # profile, password
```


---

## 4. Database Schema & Quan hệ

### ERD tổng quan

```
users ──────────────────────────────────────────────────────────────────┐
  │ 1                                                                    │
  │ N (user_id nullable → guest trip)                                    │
  ▼                                                                      │
trips ──────────────────────────────────────────────────────────────────┤
  │ 1──N  trip_days                                                      │
  │         │ 1──N  activities ──N:1── places                           │
  │         │         │ 1──N  extra_expenses                            │
  │         │ 1──N  extra_expenses (day-level)                          │
  │ 1──N  accommodations ──N:1── hotels                                 │
  │ 1──1  trip_ratings                                                   │
  │ 1──1  share_links                                                    │
  │ 1──N  guest_claim_tokens                                             │
  │ 1──N  chat_sessions ──1──N── chat_messages                          │
  │                                                                      │
users ──1──N── refresh_tokens                                           │
users ──1──N── saved_places ──N:1── places                             │
                                                                        │
destinations ──1──N── places                                           │
destinations ──1──N── hotels                                           │
                                                                        │
scraped_sources  (ETL tracking)                                        │
```

### Bảng chính

| Bảng | Mô tả | Quan hệ chính |
|---|---|---|
| `users` | Tài khoản người dùng | → trips, refresh_tokens, saved_places, chat_sessions |
| `refresh_tokens` | Hash refresh token (rotation) | N:1 users |
| `trips` | Lịch trình (user_id nullable = guest) | → trip_days, accommodations, share_links, claim_tokens, chat_sessions |
| `trip_days` | Ngày trong chuyến đi | N:1 trips → activities |
| `activities` | Hoạt động theo giờ | N:1 trip_days, N:1 places (optional) |
| `extra_expenses` | Chi phí phát sinh | N:1 activity OR trip_day (check constraint) |
| `accommodations` | Chỗ ở | N:1 trips, N:1 hotels (optional) |
| `trip_ratings` | Đánh giá 1-5 sao | 1:1 trips |
| `share_links` | Token chia sẻ công khai (opaque hash) | 1:1 trips |
| `guest_claim_tokens` | Token claim one-time (hash + expiry) | N:1 trips |
| `destinations` | Thành phố / điểm đến | → places, hotels |
| `places` | Địa điểm tham quan (từ ETL) | N:1 destinations |
| `hotels` | Khách sạn (từ ETL) | N:1 destinations |
| `saved_places` | Địa điểm user đã lưu | N:1 users, N:1 places |
| `chat_sessions` | Phiên chat AI (schema ready) | N:1 trips, N:1 users |
| `chat_messages` | Tin nhắn chat (schema ready) | N:1 chat_sessions |
| `scraped_sources` | Tracking ETL runs | — |

### Token security pattern

Tất cả token (refresh, share, claim, reset) đều dùng cùng pattern:

```
Raw token (random bytes)  →  SHA-256 hash  →  lưu DB
Raw token                 →  trả về client (1 lần duy nhất)
Client gửi raw token      →  BE hash lại   →  so sánh với DB
```

Không bao giờ lưu raw token trong DB. Nếu DB bị compromise, token không thể recover.


---

## 5. API Reference

Base URL: `http://localhost:8000/api/v1`  
Swagger UI: `http://localhost:8000/docs`  
Tất cả response dùng **camelCase JSON**.

### Auth (6 endpoints)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký tài khoản mới |
| POST | `/auth/login` | Public | Đăng nhập, nhận JWT pair |
| POST | `/auth/refresh` | Public | Refresh token rotation |
| POST | `/auth/logout` | Bearer | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Gửi email reset (silent nếu email không tồn tại) |
| POST | `/auth/reset-password` | Public | Đặt lại mật khẩu bằng token |

### User (3 endpoints)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/users/profile` | Bearer | Xem hồ sơ |
| PUT | `/users/profile` | Bearer | Cập nhật tên / phone / interests |
| PUT | `/users/password` | Bearer | Đổi mật khẩu |

### Itinerary (14 endpoints)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/itineraries/generate` | Optional | **AI generate** lịch trình (Gemini + DB context) |
| POST | `/itineraries` | Optional | Tạo lịch trình thủ công |
| GET | `/itineraries` | Bearer | Danh sách lịch trình của user |
| GET | `/itineraries/{id}` | Bearer | Chi tiết lịch trình (owner-only) |
| PUT | `/itineraries/{id}` | Bearer | Cập nhật lịch trình (auto-save diff/sync) |
| DELETE | `/itineraries/{id}` | Bearer | Xóa lịch trình |
| PUT | `/itineraries/{id}/rating` | Bearer | Đánh giá 1-5 sao |
| POST | `/itineraries/{id}/share` | Bearer | Tạo share link công khai |
| POST | `/itineraries/{id}/claim` | Bearer | Claim guest trip sau đăng nhập |
| POST | `/itineraries/{id}/activities` | Bearer | Thêm hoạt động vào ngày |
| PUT | `/itineraries/{id}/activities/{aid}` | Bearer | Cập nhật hoạt động |
| DELETE | `/itineraries/{id}/activities/{aid}` | Bearer | Xóa hoạt động |
| POST | `/itineraries/{id}/accommodations` | Bearer | Thêm chỗ ở |
| DELETE | `/itineraries/{id}/accommodations/{aid}` | Bearer | Xóa chỗ ở |

### Shared (1 endpoint)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/shared/{shareToken}` | Public | Xem lịch trình được chia sẻ (read-only) |

### Places (7 endpoints)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/places/destinations` | Public | Danh sách thành phố (Redis cache 24h) |
| GET | `/places/destinations/{name}` | Public | Chi tiết thành phố + places + hotels |
| GET | `/places/search` | Public | Tìm kiếm địa điểm (query, city, category, limit) |
| GET | `/places/{id}` | Public | Chi tiết địa điểm |
| GET | `/places/saved/list` | Bearer | Danh sách địa điểm đã lưu |
| POST | `/places/saved` | Bearer | Lưu địa điểm |
| DELETE | `/places/saved/{id}` | Bearer | Bỏ lưu địa điểm |

### Agent (1 endpoint — C.2 done, C.3/C.5 todo)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/agent/suggest/{activity_id}?limit=5` | Bearer | **EP-30** Gợi ý địa điểm thay thế (DB-only, owner-only) |
| POST | `/agent/chat` | Bearer | **C.3 todo** Companion chat |
| POST | `/agent/apply-patch` | Bearer | **C.3 todo** Áp dụng đề xuất AI |

**Tổng: 34 endpoints đang hoạt động** (EP-0 đến EP-32 + EP-30).


---

## 6. AI Pipeline Flow

### C.1 — Generate Itinerary (Done)

```
User điền form CreateTrip
  → POST /api/v1/itineraries/generate
    { destination, startDate, endDate, budget, adults, children, interests }
  │
  ├── Rate limit check (Redis)
  │     ├── Auth user: 3 lần/ngày per user_id
  │     └── Guest: 3 lần/ngày per hash(ip+ua)
  │     └── Redis down → fail-closed (trả lỗi, không cho qua)
  │
  ├── ItineraryPipeline.generate()
  │     ├── Resolve destination string → Destination row (DB)
  │     ├── Empty context guard: < min places → 422 (không gọi Gemini)
  │     ├── Query candidate places (top 15 by rating) + hotels (top 4)
  │     ├── Build compact JSON prompt (destination, budget, days, constraints)
  │     │
  │     ├── Call Gemini (gemini-2.5-flash, JSON mode, timeout 30s)
  │     │     ├── Attempt 1: parse → Pydantic validate AgentItinerary
  │     │     │     ├── PASS → continue
  │     │     │     └── FAIL → build error feedback → retry
  │     │     ├── Attempt 2: call Gemini + error feedback
  │     │     │     ├── PASS → continue
  │     │     │     └── FAIL → retry
  │     │     └── Attempt 3: final attempt
  │     │           ├── PASS → continue
  │     │           └── FAIL → raise ServiceUnavailableException
  │     │
  │     └── Persist: Trip → TripDays → Activities → Accommodations
  │
  ├── Guest → tạo claimToken (hash lưu DB, raw trả response)
  └── Return ItineraryResponse (camelCase)

FE navigate → /trip-workspace?tripId={id}
```

### C.2 — Suggest Alternatives (Done — EP-30)

```
User click "Gợi ý thay thế" cho activity X
  → GET /api/v1/agent/suggest/{activity_id}?limit=5
  │
  ├── get_current_user (Bearer required)
  ├── get_activity_with_trip(activity_id) → load activity + trip_day + trip
  ├── Owner check: trip.user_id == user.id → else 403
  ├── Resolve trip.destination string → Destination row (by name, fallback slug)
  │     └── Không tìm thấy → trả suggestions=[] (không lỗi)
  ├── get_place_ids_in_trip(trip_id) → exclude list
  └── find_alternatives(destination_id, activity.type, exclude_ids, limit)
        → ORDER BY rating DESC, review_count DESC
        → Return SuggestionResponse { activityId, currentName, suggestions[] }

Không gọi LLM. Pure DB query. Latency < 20ms.
```

### C.3 — Companion Chat (Todo)

```
User nhắn tin trong FloatingAIChat
  → POST /api/v1/agent/chat { message, tripId }
  │
  ├── Owner check (bắt buộc)
  ├── Load trip context (days, activities, accommodations)
  ├── CompanionService + LangGraph ReAct
  │     ├── 6 tools: search_places_db, search_nearby_goong,
  │     │            propose_itinerary_patch, suggest_alternatives,
  │     │            recalculate_budget, calculate_route
  │     └── LLM quyết định: trả text HOẶC gọi tool → proposedOperations
  │
  └── Return { message, requiresConfirmation, proposedOperations[] }

User xác nhận → POST /api/v1/agent/apply-patch { operations }
  → Validate lại owner + operations → Apply to DB
  → Chat KHÔNG tự persist DB trước khi user confirm
```


---

## 7. Auth & Security Flow

### Login / Register

```
POST /auth/register hoặc /auth/login
  → BE verify credentials → bcrypt compare
  → Tạo JWT access token (HS256, 15 phút)
  → Tạo refresh token (random bytes) → hash SHA-256 → lưu DB
  → Trả { accessToken, refreshToken } cho FE
  → FE lưu vào localStorage

API call bình thường:
  → FE thêm Authorization: Bearer {accessToken}
  → BE decode JWT → lấy user_id → query user

Access token hết hạn (401):
  → FE tự động POST /auth/refresh { refreshToken }
  → BE hash raw token → tìm DB → check !revoked + !expired
  → Revoke token cũ → tạo cặp token mới
  → FE cập nhật localStorage → retry request gốc
```

### Guest Trip → Claim

```
Guest tạo trip (không Bearer):
  → POST /itineraries → trip.user_id = NULL
  → BE tạo claimToken (raw + hash + expires 24h)
  → FE lưu { tripId, claimToken } vào sessionStorage

Guest đăng nhập / đăng ký:
  → AuthContext.executePendingClaim()
  → POST /itineraries/{tripId}/claim { claimToken }
  → BE hash raw token → tìm match → check !consumed + !expired
  → trip.user_id = current_user.id
  → claimToken.consumed_at = now()  (one-time use)
  → FE navigate /trip-workspace?tripId={id}
```

### Share Trip

```
Owner click "Chia sẻ":
  → POST /itineraries/{id}/share
  → BE tạo shareToken (opaque, random) → hash lưu share_links
  → Trả { shareUrl: "/shared/{rawToken}" }

Người khác mở link:
  → GET /shared/{rawToken}
  → BE hash rawToken → tìm share_links → check !revoked + !expired
  → Trả trip data (read-only, không cần auth)
```

---

## 8. Trạng thái Phase C

| Sub-phase | Mô tả | Status | Branch | PR |
|---|---|---|---|---|
| C.0 | Goong ETL readiness | ✅ merged | feat/00040 | #40 |
| C.1 | AI generate pipeline | ✅ merged | feat/00041 | #42 |
| C.1b | Guest claim reload fix | ✅ merged | fix/00045 | #45 |
| C.2 | DB-only suggestion EP-30 | ✅ merged | feat/00047 | #47 |
| C.3 | Companion chat + apply-patch | 🔄 todo | feat/00048 | — |
| C.4 | Chat history API | 🔄 todo | feat/00049 | — |
| C.5 | Analytics Text-to-SQL | 🔄 optional | feat/00050 | — |

### Còn lại để hoàn thành Phase C

**C.3 Companion Chat** (phức tạp nhất):
- `Backend/src/itineraries/companion_service.py` — intent routing + LangGraph
- `Backend/src/agent/tools/` — 6 tools (search, patch, budget, route)
- `Backend/src/agent/graph/` — LangGraph state graph
- `Backend/src/agent/router.py` — thêm POST /agent/chat + /agent/apply-patch
- `Frontend/src/app/services/agent.ts` — API client
- `Frontend/src/app/components/FloatingAIChat.tsx` — thay mock bằng API thật
- Env cần: `GEMINI_API_KEY`

**C.4 Chat History** (đơn giản — DB tables đã có):
- `Backend/src/itineraries/chat_service.py`
- Thêm 3 endpoints: GET /chat/sessions, GET /chat/sessions/{id}/messages, DELETE /chat/sessions/{id}

**C.5 Analytics** (optional — cần guardrails bảo mật):
- Read-only DB role + allowlist tables + AST SQL validator
- Chỉ bật khi `ENABLE_ANALYTICS=true` + `ANALYTICS_DATABASE_URL`


---

## 9. Quick Start

### Yêu cầu

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Docker Desktop | 4.x | Chạy PostgreSQL + Redis |
| Python | 3.12+ | Quản lý bằng `uv` |
| uv | 0.4+ | `pip install uv` hoặc xem [docs.astral.sh/uv](https://docs.astral.sh/uv) |
| Node.js | 20+ | Chạy Frontend |
| npm | 10+ | Đi kèm Node.js |

---

### Cách 1 — Docker All-in-One (nhanh nhất)

```powershell
# 1. Clone repo
git clone https://github.com/<org>/NT208-ai-travel-itinerary-recommendation-system.git
cd NT208-ai-travel-itinerary-recommendation-system

# 2. Copy env templates
Copy-Item Backend\.env.example Backend\.env
Copy-Item Frontend\.env.example Frontend\.env

# 3. Sửa Backend\.env — bắt buộc set JWT_SECRET_KEY
#    Tạo key: python -c "import secrets; print(secrets.token_hex(32))"
notepad Backend\.env

# 4. Khởi động toàn bộ stack (API + PostgreSQL + Redis)
docker compose up --build

# 5. Truy cập
#    Backend API:  http://localhost:8000
#    Swagger UI:   http://localhost:8000/docs
#    Health check: http://localhost:8000/api/v1/health
```

> **Frontend:** Docker Compose hiện chưa có FE service. Chạy FE riêng theo Cách 2 bên dưới.

---

### Cách 2 — Local Development (khuyến nghị khi dev)

> **Lưu ý về địa chỉ IP:** Các lệnh dưới dùng `127.0.0.1` (loopback). Nếu bạn muốn truy cập từ thiết bị khác trong cùng mạng LAN, thay `127.0.0.1` bằng IPv4 của máy bạn.  
> Tìm IPv4: chạy `ipconfig` trong PowerShell → tìm dòng **IPv4 Address** (ví dụ: `192.168.1.x`).

**Bước 1: Khởi động DB + Redis qua Docker**

```powershell
docker compose up -d db redis
docker compose ps   # Kiểm tra cả 2 đều healthy
```

**Bước 2: Cấu hình Backend**

```powershell
Copy-Item Backend\.env.example Backend\.env
```

Mở `Backend\.env` và điền các giá trị bắt buộc:

```env
# BẮT BUỘC — tạo bằng: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=<your-secret-key>

# Cần cho AI generate (đăng ký tại https://aistudio.google.com)
GEMINI_API_KEY=<your-gemini-key>

# Cần cho ETL nạp dữ liệu địa điểm (đăng ký tại https://account.goong.io)
GOONG_API_KEY=<your-goong-key>

# Các giá trị sau đã có default phù hợp, chỉ thay đổi nếu cần
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0
AGENT_TIMEOUT_SECONDS=60
AGENT_MIN_ACTIVITIES_PER_DAY=5
AGENT_MAX_ACTIVITIES_PER_DAY=5
```

**Bước 3: Khởi động Backend**

```powershell
cd Backend
uv sync                          # Cài dependencies
uv run alembic upgrade head      # Chạy migrations
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

Kiểm tra: `curl http://127.0.0.1:8000/api/v1/health` → `{"status":"healthy"}`

**Bước 4: Cấu hình Frontend**

```powershell
Copy-Item Frontend\.env.example Frontend\.env
```

Nội dung `Frontend\.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

**Bước 5: Khởi động Frontend**

```powershell
cd Frontend
npm ci                                          # Cài dependencies
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run dev -- --host 127.0.0.1 --port 5173
```

Truy cập: `http://127.0.0.1:5173`

---

### Bước 6 (Tùy chọn): Nạp dữ liệu địa điểm qua ETL

> Cần `GOONG_API_KEY` trong `Backend\.env`. Không có ETL data thì AI generate sẽ trả 422.

```powershell
cd Backend

# Dry-run trước để kiểm tra
uv run python -m src.etl --cities "Hà Nội" --dry-run

# Nạp thật
uv run python -m src.etl --cities "Hà Nội"

# Kiểm tra kết quả
curl "http://127.0.0.1:8000/api/v1/places/search?city=H%C3%A0%20N%E1%BB%99i&limit=5"
```

Sau ETL, AI generate với `destination: "Hà Nội"` sẽ hoạt động.

---

### Biến môi trường đầy đủ

#### Backend (`Backend/.env`)

| Biến | Bắt buộc | Mô tả | Ví dụ |
|---|---|---|---|
| `JWT_SECRET_KEY` | ✅ | Secret key cho JWT signing | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet` |
| `REDIS_URL` | ✅ | Redis connection string | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | AI generate | Google Gemini API key | Đăng ký tại [aistudio.google.com](https://aistudio.google.com) |
| `GOONG_API_KEY` | ETL | Goong Maps API key | Đăng ký tại [account.goong.io](https://account.goong.io) |
| `AGENT_TIMEOUT_SECONDS` | — | Timeout gọi Gemini (giây) | `60` (local), `30` (default) |
| `AGENT_MIN_ACTIVITIES_PER_DAY` | — | Số hoạt động tối thiểu/ngày | `5` |
| `AGENT_MAX_ACTIVITIES_PER_DAY` | — | Số hoạt động tối đa/ngày | `5` |
| `SMTP_HOST` | Email | SMTP server (để trống = log console) | `smtp.gmail.com` |
| `SMTP_PORT` | Email | SMTP port | `587` |
| `SMTP_USERNAME` | Email | SMTP username | `your@gmail.com` |
| `SMTP_PASSWORD` | Email | SMTP password / app password | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_URL` | — | URL frontend (dùng trong share link) | `http://localhost:5173` |

#### Frontend (`Frontend/.env`)

| Biến | Bắt buộc | Mô tả | Ví dụ |
|---|---|---|---|
| `VITE_API_URL` | ✅ | URL Backend API | `http://127.0.0.1:8000` |

---

### Lưu ý khi dùng Docker Compose cho BE

Khi BE chạy trong Docker container, `localhost` trong container trỏ vào container, không phải host. Docker Compose tự inject:

```yaml
DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/dulichviet
REDIS_URL: redis://redis:6379/0
```

Chỉ cần set `JWT_SECRET_KEY`, `GEMINI_API_KEY`, `GOONG_API_KEY` trong `Backend/.env`.

---

## 10. Tests & Verification

### Chạy test Backend

```powershell
cd Backend

# Lint + format
uv run ruff check src tests
uv run ruff format --check src tests

# Migration check
uv run alembic upgrade head
uv run alembic check

# Unit tests (97 tests)
uv run pytest tests/unit/ -v --tb=short

# Integration tests (44 tests — cần DB + Redis chạy)
$env:CI="true"
uv run pytest tests/integration/ -v --tb=short

# Tất cả
$env:CI="true"
uv run pytest tests/ -v --tb=short
```

### Chạy test Frontend

```powershell
cd Frontend

# Production build
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run build

# Playwright e2e (cần BE đang chạy trên port 8000)
$env:E2E_BASE_URL="http://127.0.0.1:5173"
$env:E2E_API_URL="http://127.0.0.1:8000"
npx playwright test --reporter=line

# Headed mode (xem browser)
npx playwright test --headed
```

### Kết quả test hiện tại (2026-05-27)

| Loại | Số lượng | Trạng thái |
|---|---|---|
| BE unit tests | 97 | ✅ Pass |
| BE integration tests | 44 | ✅ 43 pass, 1 fail (test pollution local DB) |
| FE Playwright e2e | 13 | ✅ Pass |
| BE lint/format | — | ✅ Pass |
| Alembic migration | — | ✅ Pass |
| FE production build | — | ✅ Pass |

### AI Generate Smoke Test

```powershell
# Cần GEMINI_API_KEY và ETL data trong DB
cd Backend
$env:AGENT_TIMEOUT_SECONDS="60"

curl.exe -X POST "http://127.0.0.1:8000/api/v1/itineraries/generate" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer <your-token>" `
  --data-raw '{"destination":"Hà Nội","startDate":"2026-07-01","endDate":"2026-07-03","budget":5000000,"adults":2,"children":0,"interests":["food","attraction"]}'
```

Kết quả mong đợi: `201 Created` với trip có 3 ngày × 5 hoạt động.

---

## 11. ETL

ETL nạp dữ liệu địa điểm từ Goong Maps API vào PostgreSQL.

### Chạy ETL

```powershell
cd Backend

# Một thành phố
uv run python -m src.etl --cities "Hà Nội"

# Nhiều thành phố
uv run python -m src.etl --cities "Hà Nội" "Đà Nẵng" "Hội An"

# Dry-run (không ghi DB)
uv run python -m src.etl --cities "Hà Nội" --dry-run

# Xem help
uv run python -m src.etl --help
```

### Kiểm tra sau ETL

```powershell
# Kiểm tra destinations
curl.exe "http://127.0.0.1:8000/api/v1/places/destinations"

# Kiểm tra places
curl.exe "http://127.0.0.1:8000/api/v1/places/search?city=H%C3%A0%20N%E1%BB%99i&limit=10"

# Xóa Redis cache để load fresh data
docker compose exec redis redis-cli FLUSHDB
```

### Lưu ý ETL

- Cần `GOONG_API_KEY` trong `Backend/.env`
- ETL dùng `external_id` để upsert — chạy lại không tạo duplicate
- Destination phải có đủ places trước khi AI generate (tối thiểu 6 places)
- Destination string trong generate request phải khớp tên trong DB (có dấu tiếng Việt, ví dụ `"Hà Nội"` không phải `"Ha Noi"`)

### Xóa AI rate limit keys (khi test local)

```powershell
# Xóa tất cả rate limit keys
docker compose exec redis redis-cli --scan --pattern "rate:ai:*" | ForEach-Object { docker compose exec redis redis-cli DEL $_ }
```

---

## 12. Cấu trúc thư mục

```
NT208-ai-travel-itinerary-recommendation-system/
├── Backend/                    # FastAPI backend
│   ├── src/
│   │   ├── main.py             # App factory
│   │   ├── agent/              # Shared AI infrastructure
│   │   ├── auth/               # Auth + User domain
│   │   ├── itineraries/        # Trip domain
│   │   ├── places/             # Places domain
│   │   ├── core/               # Cross-cutting concerns
│   │   ├── etl/                # ETL pipeline
│   │   └── geo/                # Goong REST client
│   ├── tests/
│   │   ├── unit/               # 97 unit tests
│   │   └── integration/        # 44 integration tests
│   ├── alembic/                # DB migrations
│   ├── config.yaml             # Non-secret config
│   ├── .env.example            # Env template
│   └── pyproject.toml          # Dependencies (uv)
│
├── Frontend/                   # React + Vite frontend
│   ├── src/app/
│   │   ├── components/         # UI components
│   │   ├── contexts/           # AuthContext, TripWizardContext
│   │   ├── hooks/              # useTripSync, useActivityManager, ...
│   │   ├── pages/              # 27 pages
│   │   ├── services/           # API client layer
│   │   └── types/              # trip.types.ts (FE-BE contract)
│   ├── tests/e2e/              # 13 Playwright e2e tests
│   ├── .env.example            # Env template
│   └── package.json
│
├── docs/                       # Tài liệu kỹ thuật
│   ├── 01_overview.md
│   ├── 02_architecture.md
│   ├── 03_backend.md
│   ├── 04_frontend.md
│   ├── 05_database_etl.md
│   ├── 06_ai_roadmap.md
│   ├── 07_workflow_ci.md
│   ├── 08_testing_local_run.md
│   ├── 09_execution_tracker.md
│   ├── 10_automation_testing_report.md
│   ├── 11_phase_roadmap.md
│   └── REPORTS/                # Báo cáo kiểm thử
│
├── plan/                       # Tài liệu thiết kế Phase C
├── docker-compose.yml          # PostgreSQL + Redis + API
├── README.md                   # File này
└── AGENTS.md                   # Hướng dẫn cho AI agents

```

---

## 13. Team

| Thành viên | Vai trò | Phụ trách |
|---|---|---|
| Nguyễn Nhật Anh Khôi | Leader · Backend · AI | Architecture, BE core, AI pipeline, ETL |
| [Thành viên 2] | Frontend | React components, FE integration |
| [Thành viên 3] | Frontend | UI/UX, pages, hooks |

---

> **Môn học:** NT208 — Lập Trình Web  
> **Trường:** Đại học Công nghệ Thông tin — UIT  
> **Học kỳ:** 2023.2
