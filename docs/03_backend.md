# 03. Backend MVP2

## Mục đích

File này mô tả **chi tiết toàn bộ Backend** — từng endpoint, từng service method, từng repository query, config, security rules. Đọc file này khi cần hiểu BE flow, debug endpoint, hoặc thêm tính năng mới.

**Khi nào đọc file này:**
- Thêm endpoint mới → hiểu router/service/repo pattern
- Debug 500 error → trace flow từ router → service → repo → DB
- Code review → kiểm tra layer boundary (router không query DB, service không parse HTTP)
- Viết test mới → hiểu data flow và dependency

---

## 1. Runtime Structure

```text
Backend/
├── src/
│   ├── main.py                    # App factory, middleware stack, router registration
│   ├── api/v1/                    # Router layer — parse request, return response
│   │   ├── __init__.py
│   │   ├── auth.py                # EP-1..4, EP-31..32: register, login, refresh, logout, forgot/reset password
│   │   ├── users.py               # EP-5..7: profile, update profile, change password
│   │   ├── itineraries.py         # EP-8..21: trip CRUD, share, claim, activity/accommodation nested CRUD
│   │   ├── places.py              # EP-23..29: destinations, search, detail, saved places
│   │   └── shared.py              # EP-22: public share read
│   ├── core/                      # Cross-cutting concerns
│   │   ├── config.py              # AppSettings (pydantic-settings), get_settings()
│   │   ├── database.py            # AsyncSession factory, Base, get_db dependency
│   │   ├── security.py            # JWT, bcrypt, opaque token, hash_token
│   │   ├── exceptions.py          # Custom exceptions: NotFound, Forbidden, Conflict, Unauthorized
│   │   ├── logger.py              # Structured logging (structlog)
│   │   └── dependencies.py        # get_current_user, get_current_user_optional, get_redis
│   ├── models/                    # ORM models — table definitions
│   │   ├── user.py                # User, RefreshToken
│   │   ├── trip.py                # Trip, TripDay, Activity
│   │   ├── place.py               # Destination, Place, Hotel, SavedPlace
│   │   └── extras.py              # ExtraExpense, Accommodation, ShareLink, TripRating, GuestClaimToken, ChatSession, ChatMessage, ScrapedSource
│   ├── repositories/              # Query layer — SQL only, no business logic
│   │   ├── base.py                # BaseRepository with common CRUD
│   │   ├── user_repo.py           # User + refresh token queries
│   │   ├── token_repo.py          # RefreshToken rotation/revoke queries
│   │   ├── trip_repo.py           # Trip + day + activity + accommodation + share/claim/rating queries
│   │   └── place_repo.py          # Destination + place + hotel + saved_place queries
│   ├── schemas/                   # Pydantic validation + serialization
│   │   ├── common.py              # CamelCaseModel, PaginatedResponse
│   │   ├── auth.py                # LoginRequest, RegisterRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest
│   │   ├── user.py                # UserResponse, UpdateProfileRequest, ChangePasswordRequest
│   │   ├── itinerary.py           # CreateTripRequest, UpdateTripRequest, ItineraryResponse, DaySchema, ActivitySchema, AccommodationSchema, etc.
│   │   └── place.py               # DestinationResponse, PlaceResponse, HotelResponse, SavedPlaceRequest, SavedPlaceResponse
│   ├── services/                  # Business logic layer
│   │   ├── base.py                # BaseService (empty base class)
│   │   ├── auth_service.py        # Register, login, refresh, logout, forgot/reset password
│   │   ├── user_service.py        # Profile read/update, change password
│   │   ├── itinerary_service.py   # Trip CRUD, share/claim, rating, activity/accommodation nested CRUD, auto-save diff/sync
│   │   ├── place_service.py       # Destinations, search, detail, saved places, Redis cache
│   │   └── email_service.py       # aiosmtplib + console fallback
│   └── etl/                       # ETL pipeline
│       ├── runner.py
│       ├── __main__.py
│       ├── extractors/
│       ├── transformers/
│       ├── loaders/
│       └── data/
├── tests/
│   ├── unit/
│   └── integration/
├── alembic/
│   └── versions/
├── config.yaml
├── pyproject.toml
└── Dockerfile
```

---

## 2. Endpoint Detail — Từng endpoint

### EP-0: Health

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-0 | GET | `/api/v1/health` | Public | `{"status":"healthy"}` |

### Auth endpoints (6 endpoints)

| EP | Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|---|
| EP-1 | POST | `/api/v1/auth/register` | Public | `{email, password, name}` | `{accessToken, refreshToken, user}` |
| EP-2 | POST | `/api/v1/auth/login` | Public | `{email, password}` | `{accessToken, refreshToken, user}` |
| EP-3 | POST | `/api/v1/auth/refresh` | Public | `{refreshToken}` | `{accessToken, refreshToken, user}` |
| EP-4 | POST | `/api/v1/auth/logout` | Bearer | `{refreshToken}` | `{message}` |
| EP-31 | POST | `/api/v1/auth/forgot-password` | Public | `{email}` | `{message}` (silent nếu email không tồn tại) |
| EP-32 | POST | `/api/v1/auth/reset-password` | Public | `{token, newPassword}` | `{message}` |

### User endpoints (3 endpoints)

| EP | Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|---|
| EP-5 | GET | `/api/v1/users/profile` | Bearer | — | `UserResponse` |
| EP-6 | PUT | `/api/v1/users/profile` | Bearer | `{name?, phone?, interests?}` | `UserResponse` |
| EP-7 | PUT | `/api/v1/users/password` | Bearer | `{currentPassword, newPassword}` | `{message}` |

### Itinerary endpoints (14 endpoints)

| EP | Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|---|
| EP-8 | POST | `/api/v1/itineraries/generate` | Optional | `{destination, startDate, endDate, budget, adults, children, interests}` | `ItineraryResponse` (+ claimToken nếu guest) |
| EP-9 | POST | `/api/v1/itineraries` | Optional | `{destination, tripName, startDate, endDate, budget, adultsCount, childrenCount, interests}` | `ItineraryResponse` (+ claimToken nếu guest) |
| EP-10 | GET | `/api/v1/itineraries` | Bearer | — (query: page, size) | `PaginatedResponse<ItineraryResponse>` |
| EP-11 | GET | `/api/v1/itineraries/{tripId}` | Bearer | — | `ItineraryResponse` |
| EP-12 | PUT | `/api/v1/itineraries/{tripId}` | Bearer | `{tripName?, budget?, days?, accommodations?}` | `ItineraryResponse` |
| EP-13 | DELETE | `/api/v1/itineraries/{tripId}` | Bearer | — | `{message}` |
| EP-14 | PUT | `/api/v1/itineraries/{tripId}/rating` | Bearer | `{rating, feedback?}` | `{message}` |
| EP-15 | POST | `/api/v1/itineraries/{tripId}/share` | Bearer | — | `{shareUrl, shareToken, expiresAt?}` |
| EP-16 | POST | `/api/v1/itineraries/{tripId}/claim` | Bearer | `{claimToken}` | `{claimed, tripId}` |
| EP-17 | POST | `/api/v1/itineraries/{tripId}/activities` | Bearer | `ActivitySchema` | `ActivitySchema` |
| EP-18 | PUT | `/api/v1/itineraries/{tripId}/activities/{activityId}` | Bearer | `ActivitySchema` | `ActivitySchema` |
| EP-19 | DELETE | `/api/v1/itineraries/{tripId}/activities/{activityId}` | Bearer | — | `{message}` |
| EP-20 | POST | `/api/v1/itineraries/{tripId}/accommodations` | Bearer | `AccommodationSchema` | `AccommodationSchema` |
| EP-21 | DELETE | `/api/v1/itineraries/{tripId}/accommodations/{accommodationId}` | Bearer | — | `{message}` |

### Shared endpoint (1 endpoint)

| EP | Method | Path | Auth | Response |
|---|---|---|---|---|
| EP-22 | GET | `/api/v1/shared/{shareToken}` | Public | `ItineraryResponse` (read-only) |

### Places endpoints (7 endpoints)

| EP | Method | Path | Auth | Response |
|---|---|---|---|---|
| EP-23 | GET | `/api/v1/places/destinations` | Public | `list[DestinationResponse]` |
| EP-24 | GET | `/api/v1/places/destinations/{name}` | Public | `{destination, places, hotels}` |
| EP-25 | GET | `/api/v1/places/search` | Public | `list[PlaceResponse]` (query: query, city, category, limit) |
| EP-26 | GET | `/api/v1/places/{placeId}` | Public | `PlaceResponse` |
| EP-27 | GET | `/api/v1/places/saved/list` | Bearer | `list[SavedPlaceResponse]` |
| EP-28 | POST | `/api/v1/places/saved` | Bearer | `SavedPlaceResponse` |
| EP-29 | DELETE | `/api/v1/places/saved/{savedId}` | Bearer | `{message}` |

**Tổng: 33 endpoints** (EP-0 đến EP-32; EP-34 optional cho MVP2+)

---

## 3. Service Flow Diagrams

### 3.1 AuthService — Register Flow

```text
POST /api/v1/auth/register
│
├── auth.py::register()
│   ├── Parse body → RegisterRequest (Pydantic validate email, password ≥ 6 chars, name)
│   ├── AuthService(session, user_repo, token_repo, email_service).register(email, password, name)
│   │   ├── user_repo.get_by_email(email) → check unique
│   │   │   └── Nếu tồn tại → raise ConflictException("Email already registered")
│   │   ├── hash_password(password) → bcrypt hash
│   │   ├── user_repo.create(email, hashed_password, name) → User ORM
│   │   ├── _create_tokens(user)
│   │   │   ├── create_access_token(user.id) → JWT (HS256, 15 min)
│   │   │   ├── create_refresh_token(user.id) → raw + hash + expires
│   │   │   └── token_repo.create(user_id, token_hash, expires_at) → persist hash
│   │   └── Return AuthResponse(accessToken, refreshToken, user)
│   └── Return 201 + AuthResponse (camelCase)
```

### 3.2 AuthService — Login Flow

```text
POST /api/v1/auth/login
│
├── auth.py::login()
│   ├── Parse body → LoginRequest
│   ├── AuthService.login(email, password)
│   │   ├── user_repo.get_by_email(email)
│   │   │   └── Không tìm thấy → raise UnauthorizedException("Invalid email or password")
│   │   ├── verify_password(password, user.hashed_password)
│   │   │   └── Sai → raise UnauthorizedException (generic message, chống enumeration)
│   │   ├── Check user.is_active
│   │   │   └── Deactivated → raise UnauthorizedException
│   │   ├── _create_tokens(user) → access + refresh
│   │   └── Return AuthResponse
│   └── Return 200 + AuthResponse
```

### 3.3 AuthService — Token Refresh Flow

```text
POST /api/v1/auth/refresh
│
├── auth.py::refresh_token()
│   ├── Parse body → RefreshRequest { refreshToken }
│   ├── AuthService.refresh(raw_refresh_token)
│   │   ├── hash_token(raw_token) → SHA-256 hash
│   │   ├── token_repo.find_by_hash(token_hash)
│   │   │   └── Không tìm thấy hoặc is_revoked → raise UnauthorizedException
│   │   ├── user_repo.get_by_id(stored.user_id)
│   │   │   └── User không tồn tại/inactive → raise UnauthorizedException
│   │   ├── token_repo.revoke(stored.id) → set is_revoked = true (ROTATION)
│   │   ├── _create_tokens(user) → new access + new refresh
│   │   └── Return AuthResponse (new tokens)
│   └── Return 200 + AuthResponse
```

### 3.4 AuthService — Forgot/Reset Password Flow

```text
POST /api/v1/auth/forgot-password
│
├── auth.py::forgot_password()
│   ├── Parse body → ForgotPasswordRequest { email }
│   ├── AuthService.forgot_password(email)
│   │   ├── user_repo.get_by_email(email)
│   │   │   └── Không tồn tại → SILENT RETURN (chống email enumeration)
│   │   ├── create_password_reset_token() → raw_token + hash + expires_at
│   │   ├── user_repo.update(user, password_reset_token_hash=hash, password_reset_expires_at=expires)
│   │   ├── email_service.send_password_reset(to_email, raw_token)
│   │   │   ├── SMTP configured → gửi email thật
│   │   │   └── No SMTP → log reset link ra console
│   │   └── Return (no content — always 200)
│   └── Return 200 { "message": "..." }

POST /api/v1/auth/reset-password
│
├── auth.py::reset_password()
│   ├── Parse body → ResetPasswordRequest { token, newPassword }
│   ├── AuthService.reset_password(raw_token, new_password)
│   │   ├── hash_token(raw_token) → SHA-256
│   │   ├── user_repo.get_by_reset_token_hash(token_hash)
│   │   │   └── Không tìm thấy → raise UnauthorizedException
│   │   ├── Check expires_at > now
│   │   │   └── Expired → clear token fields → raise UnauthorizedException
│   │   ├── hash_password(new_password) → bcrypt
│   │   ├── user_repo.update(user, hashed_password=new_hash, reset_token_hash=NULL, reset_expires_at=NULL)
│   │   ├── token_repo.revoke_all_for_user(user.id) → FORCE RE-LOGIN trên mọi thiết bị
│   │   └── Return
│   └── Return 200 { "message": "..." }
```

### 3.5 ItineraryService — Create Manual Trip Flow

```text
POST /api/v1/itineraries
│
├── itineraries.py::create_itinerary()
│   ├── Parse body → CreateTripRequest
│   ├── Depends(get_current_user_optional) → user: User | None
│   │   ├── Có Bearer → user_id = user.id (owner trip)
│   │   └── Không Bearer → user_id = None (guest trip)
│   ├── ItineraryService(session).create_manual(request, user_id)
│   │   ├── Nếu user_id: _check_trip_limit(user_id) → max 5 active trips
│   │   ├── repo.create_trip(destination, tripName, dates, budget, adults, children, interests, user_id)
│   │   ├── repo.get_with_full_data(trip.id) → eager-load days/activities/accommodations
│   │   ├── _to_response(trip) → ItineraryResponse (camelCase)
│   │   ├── Nếu user_id is None:
│   │   │   ├── create_opaque_token("claim") → raw + hash
│   │   │   ├── repo.create_claim_token(trip_id, hash, expires_at=now+24h)
│   │   │   └── resp.claim_token = raw_token
│   │   └── Return ItineraryResponse
│   └── Return 201 + ItineraryResponse
```

### 3.6 ItineraryService — Update (Auto-Save) Flow

```text
PUT /api/v1/itineraries/{tripId}
│
├── itineraries.py::update_itinerary()
│   ├── Depends(get_current_user) → user: User
│   ├── ItineraryService(session).update(trip_id, data, user_id)
│   │   ├── repo.get_with_full_data(trip_id) → load trip + eager relations
│   │   ├── Owner check: trip.user_id == user_id → else ForbiddenException
│   │   │
│   │   ├── Update trip-level fields (tripName, budget) nếu non-None
│   │   │
│   │   ├── If data.days: _sync_days(trip, incoming_days)
│   │   │   ├── For each incoming day:
│   │   │   │   ├── Day có ID + tồn tại → UPDATE (label, date, destination_name)
│   │   │   │   │   └── _sync_activities(day, incoming_activities)
│   │   │   │   │       ├── Activity có ID + tồn tại → UPDATE scalar fields
│   │   │   │   │       └── Activity mới → repo.add_activity()
│   │   │   │   └── Day mới → repo.add_day() + add all activities
│   │   │   └── Days không có trong incoming → session.delete() (orphan removal)
│   │   │
│   │   ├── If data.accommodations: _sync_accommodations(trip, incoming)
│   │   │   └── Same diff pattern: UPDATE existing / CREATE new / DELETE removed
│   │   │
│   │   ├── session.flush() → write SQL
│   │   ├── trip.total_cost = _calculate_total_cost(trip) → sum all prices
│   │   ├── session.flush() → persist total_cost
│   │   ├── session.expire_all() → clear Identity Map cache
│   │   ├── repo.get_with_full_data(trip_id) → fresh load from DB
│   │   └── _to_response(trip) → ItineraryResponse
│   └── Return 200 + ItineraryResponse
```

**Key pattern:** `_sync_days` / `_sync_activities` / `_sync_accommodations` dùng **diff/sync** — so sánh incoming data với existing data, update những gì thay đổi, tạo mới những gì thêm, xóa những gì mất. Đây là pattern cho FE auto-save: mỗi lần user thay đổi, FE gửi toàn bộ trip state, BE tính diff và apply.

### 3.7 ItineraryService — Share Flow

```text
POST /api/v1/itineraries/{tripId}/share
│
├── ItineraryService.share(trip_id, user_id)
│   ├── repo.get_by_id(trip_id) → owner check
│   ├── repo.get_share_link(trip_id)
│   │   ├── Đã share + chưa revoke → return REDACTED (không recover raw token)
│   │   └── Chưa share → tiếp tục
│   ├── create_opaque_token("share") → raw_token + token_hash
│   ├── repo.create_share_link(trip_id, token_hash, user_id, permission="view")
│   └── Return ShareResponse(shareUrl, shareToken, expiresAt=null)

GET /api/v1/shared/{shareToken}
│
├── shared.py::get_shared_itinerary()
│   ├── ItineraryService.get_by_share_token(raw_token)
│   │   ├── hash_token(raw_token) → SHA-256
│   │   ├── repo.get_share_link_by_hash(hash)
│   │   │   └── Không tìm thấy / revoked → NotFoundException
│   │   ├── Check expires_at (nếu có)
│   │   │   └── Expired → NotFoundException
│   │   ├── repo.get_with_full_data(link.trip_id)
│   │   └── _to_response(trip) → ItineraryResponse
│   └── Return 200 + ItineraryResponse (public, read-only)
```

### 3.8 ItineraryService — Claim Flow

```text
POST /api/v1/itineraries/{tripId}/claim
│
├── ItineraryService.claim(trip_id, user_id, {claimToken})
│   ├── repo.get_by_id(trip_id)
│   │   └── trip.user_id is not None → ConflictException ("Trip already has owner")
│   ├── hash_token(claimToken) → SHA-256
│   ├── repo.get_claim_tokens_for_trip(trip_id)
│   ├── For each claim_token:
│   │   ├── token_hash match? → consumed_at is None? → expires_at > now?
│   │   └── Nếu valid → found
│   ├── Nếu không tìm valid token → ForbiddenException
│   ├── valid_token.consumed_at = now() → ONE-TIME USE
│   ├── trip.user_id = user_id → TRANSFER OWNERSHIP
│   ├── session.flush()
│   └── Return {claimed: true, tripId}
```

### 3.9 PlaceService — Redis Cache Flow

```text
GET /api/v1/places/destinations
│
├── PlaceService.get_destinations()
│   ├── _cache_get("destinations:all")
│   │   ├── Redis available?
│   │   │   ├── YES → redis.get(key)
│   │   │   │   ├── HIT → parse JSON → return cached list
│   │   │   │   └── MISS → continue to DB
│   │   │   └── NO (Redis down) → log warning, continue to DB (FAIL-OPEN)
│   │   └── Exception → log warning, continue to DB
│   │
│   ├── repo.get_destinations() → query PostgreSQL
│   ├── Convert to DestinationResponse list
│   ├── _cache_set("destinations:all", json, ttl=1h)
│   │   └── If Redis available → redis.setex(key, ttl, value)
│   └── Return list

GET /api/v1/places/search?query=...&city=...&category=...
│
├── PlaceService.search_places(query, city, category, limit)
│   ├── cache_key = "places:search:{query}:{city}:{category}:{limit}"
│   ├── _cache_get(cache_key) → same pattern as above
│   ├── repo.search(query, city, category, limit)
│   ├── _cache_set(cache_key, json, ttl=30min)
│   └── Return list
```

---

## 4. Dependency Injection Chain

```text
FastAPI Router Function
  │
  ├── Depends(get_db) → AsyncSession (request-scoped, auto-close)
  │     └── async_session_factory() → AsyncSession
  │
  ├── Depends(get_current_user) → User ORM (401 nếu không có token)
  │     ├── oauth2_scheme(request) → Bearer token string
  │     ├── decode_access_token(token) → payload {user_id, exp}
  │     └── user_repo.get_by_id(user_id) → User
  │
  ├── Depends(get_current_user_optional) → User | None
  │     ├── _optional_token(request) → token string | None
  │     │     └── Read Authorization header manually (auto_error=False)
  │     └── Nếu có token → same as get_current_user
  │         Nếu không → return None
  │
  ├── Depends(get_redis) → Redis | None
  │     └── redis.from_url(settings.redis_url) → fail gracefully
  │
  └── Service(session, redis, ...)
        └── Repository(session)
              └── Model + Database
```

---

## 5. Middleware Pipeline

```text
HTTP Request
  │
  ├── CORS middleware
  │     └── Allow origins: [FRONTEND_URL], methods: *, headers: *
  │
  ├── RequestLog middleware
  │     └── Log method + path + status_code + duration
  │
  ├── RateLimiter middleware (nếu có Redis)
  │     └── Check rate limit per IP
  │
  ├── ExceptionHandler middleware
  │     ├── NotFoundException → 404
  │     ├── ForbiddenException → 403
  │     ├── ConflictException → 409
  │     ├── UnauthorizedException → 401
  │     └── Generic Exception → 500 (log full traceback)
  │
  └── Router dispatch
```

---

## 6. Schema Layer — CamelCase Contract

### CamelCaseModel

Tất cả response schema kế thừa `CamelCaseModel` (trong `schemas/common.py`):

```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        from_attributes=True,
    )
```

**Tác dụng:** Python `snake_case` fields tự động serialize thành `camelCase` JSON. FE nhận `tripName` thay vì `trip_name`.

### Key schemas

| Schema | Fields (camelCase) | Dùng cho |
|---|---|---|
| `AuthResponse` | `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `user` | EP-1, EP-2, EP-3 |
| `UserResponse` | `id`, `email`, `name`, `phone`, `interests`, `createdAt`, `updatedAt` | EP-5, EP-6 |
| `ItineraryResponse` | `id`, `destination`, `tripName`, `startDate`, `endDate`, `budget`, `totalCost`, `travelerInfo`, `interests`, `days`, `accommodations`, `createdAt`, `updatedAt` | EP-8..12 |
| `ActivitySchema` | `id`, `name`, `time`, `endTime`, `type`, `location`, `description`, `image`, `transportation`, `adultPrice`, `childPrice`, `customCost`, `busTicketPrice`, `taxiCost`, `extraExpenses` | Nested trong DaySchema |
| `DaySchema` | `id`, `label`, `date`, `destinationName`, `activities`, `extraExpenses` | Nested trong ItineraryResponse |
| `AccommodationSchema` | `id`, `name`, `checkIn`, `checkOut`, `pricePerNight`, `totalPrice`, `bookingType`, `duration`, `dayIds` | Nested trong ItineraryResponse |
| `ShareResponse` | `shareUrl`, `shareToken`, `expiresAt` | EP-15 |

---

## 7. Config Architecture

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

cache:
  destination_cache_ttl_seconds: 3600    # 1 giờ
  place_search_cache_ttl_seconds: 1800   # 30 phút
```

### Secret config: `Backend/.env` (không commit)

```env
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<long-random-string>
GEMINI_API_KEY=<optional-Phase-C>
GOONG_API_KEY=<optional-Goong-ETL>
AGENT_TIMEOUT_SECONDS=60
AGENT_MIN_ACTIVITIES_PER_DAY=5
AGENT_MAX_ACTIVITIES_PER_DAY=5
ENABLE_ANALYTICS=false
ANALYTICS_DATABASE_URL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM_ADDRESS=noreply@dulichviet.local
```

### Config loading flow

```text
AppSettings (pydantic-settings)
  ├── Read from .env (secrets)
  ├── Read from config.yaml (non-secrets)
  ├── Override from environment variables
  └── get_settings() → cached singleton
```

---

## 8. Async Session Lifecycle Patterns

Các bug PR #24/#7 có chung root pattern: SQLAlchemy async session lifecycle.

### Pattern 1: Không truyền ORM object qua session boundary

```text
❌ SAI: get_current_user tạo User trong session A (request-scoped)
        → truyền User object vào service (dùng session B)
        → Access lazy attribute → MissingGreenlet

✅ ĐÚNG: get_current_user trả user.id
         → service re-fetch user trong session riêng
         → user = user_repo.get_by_id(user_id)
```

### Pattern 2: `flush()` ≠ `refresh()`

```text
session.add(obj)
session.flush()     # Write SQL, nhận auto-generated id
                     # NHƯNG Python object chưa reload

session.refresh(obj) # Reload từ DB → có đầy đủ server-generated values
```

### Pattern 3: `expire_all()` trước re-fetch

```text
session.flush()           # Write SQL
session.expire_all()      # Clear Identity Map cache
trip = repo.get_with_full_data(trip_id)  # Fresh query → load từ DB
```

### Pattern 4: Lazy relationship ngoài eager-load context

```text
❌ SAI: ActivitySchema.model_validate(fresh_activity, from_attributes=True)
        → Trigger lazy load extra_expenses → MissingGreenlet

✅ ĐÚNG: _activity_to_schema(activity)
        → Build schema từ scalar fields
        → Default extra_expenses = []
```

---

## 9. Security Rules

| Rule | Chi tiết |
|---|---|
| JWT access token ngắn hạn | 15-30 phút, HS256 signed |
| Refresh token lưu hash | SHA-256 hash trong DB, raw token chỉ cho client |
| Token rotation | Mỗi refresh = revoke cũ + issue mới |
| Trip integer ID owner-only | `GET /itineraries/{id}` check `trip.user_id == user.id` |
| Share token opaque | Không đoán được, hash trong DB |
| Claim token one-time | `consumed_at` + `expires_at` + hash |
| Password reset silent | Không tiết lộ email có tồn tại hay không |
| Force re-login on reset | Revoke tất cả refresh tokens khi đổi password |
| CORS origin | Allow local FE origins: `localhost:5173` và `127.0.0.1:5173` |

---

## 10. Email Service

```text
EmailService
  ├── smtp_host được cấu hình?
  │   ├── YES → aiosmtplib.send() (async SMTP native)
  │   └── NO → log reset link ra console
  │
  └── send_password_reset(to_email, reset_token)
      ├── Build reset URL: {FRONTEND_URL}/reset-password?token={raw_token}
      ├── Send email (hoặc log)
      └── Return
```

---

## 11. Backend còn thiếu

- AI companion chat + patch-confirm flow.
- Chat history API endpoints.
- Analytics optional EP-34 với SQL guardrails.
- `SuggestionService` DB-only (không LLM).
