# Phase A — Foundation Bootstrap

> **Generated At:** 2026-04-29 12:00:00
> **Summary:** Tạo toàn bộ lớp nền MVP2 backend: cấu trúc `Backend/src/`, config tập trung, database async, security helpers, base abstractions, 16 ORM models, schemas, Alembic migration, Docker Compose, GitHub Actions CI, và 6 tests.

---

## 1. Mục tiêu Phase

Phase A là **nền tảng** — mọi phase sau (Auth, CRUD, AI) đều dựa vào lớp này. Không có foundation thì không thể code domain logic.

**Nguyên tắc:**
- Import một chiều: `router → service → repository → models/core`
- Schema public hướng đến `camelCase`, model/db giữ `snake_case`
- Không hardcode secrets/config trong code hay shared settings
- Alembic thay thế `Base.metadata.create_all()` làm cơ chế migration chính

---

## 2. Cấu trúc thư mục

```
Backend/
├── src/
│   ├── __init__.py
│   ├── main.py                    # [NEW] FastAPI app factory
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── health.py          # [NEW] GET /api/v1/health
│   │       └── router.py          # [NEW] API v1 router aggregator
│   ├── base/
│   │   ├── __init__.py
│   │   ├── repository.py          # [NEW] BaseRepository[T] abstract CRUD
│   │   └── schema.py              # [NEW] CamelCaseModel base schema
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # [NEW] AppSettings + YAML + .env + pydantic-settings
│   │   ├── database.py            # [NEW] Async engine + session factory + Base
│   │   ├── dependencies.py        # [NEW] DI: get_current_user, get_redis, get_rate_limiter
│   │   ├── exceptions.py          # [NEW] 8 custom exceptions + 2 handlers
│   │   ├── logger.py              # [NEW] structlog configure + get_logger
│   │   ├── middlewares.py         # [NEW] CORS + request logging + error handlers
│   │   ├── rate_limiter.py        # [NEW] Redis fail-closed rate limiter
│   │   └── security.py            # [NEW] JWT + bcrypt + opaque token hashing
│   ├── models/
│   │   ├── __init__.py            # [NEW] Export all 16 models + Base
│   │   ├── extras.py              # [NEW] 7 models: Accommodation, ExtraExpense, ShareLink, TripRating, GuestClaimToken, ChatSession, ChatMessage
│   │   ├── place.py               # [NEW] 4 models: Destination, Place, Hotel, SavedPlace
│   │   ├── trip.py                # [NEW] 3 models: Trip, TripDay, Activity
│   │   └── user.py                # [NEW] 2 models: User, RefreshToken
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── base.py                # [NEW] Empty (BaseRepository ở base/repository.py)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py                # [NEW] LoginRequest, TokenPair, RefreshRequest
│   │   ├── common.py              # [NEW] ErrorResponse, PaginatedResponse, MessageResponse
│   │   ├── itinerary.py           # [NEW] TripCreate, TripUpdate, TripRead, DaySchema, ActivitySchema, v.v.
│   │   ├── place.py               # [NEW] DestinationRead, PlaceRead, SavedPlaceCreate, v.v.
│   │   └── user.py                # [NEW] UserCreate, UserRead, UserUpdate, ChangePassword
│   └── services/
│       ├── __init__.py
│       └── base.py                # [NEW] Empty placeholder
├── alembic/
│   ├── env.py                     # [NEW] Async migration runner
│   └── versions/
│       └── 20260428_0001_initial_mvp2_schema.py  # [NEW] 16 bảng
├── alembic.ini                    # [NEW]
├── config.yaml                    # [NEW] Non-secret defaults
├── .env.example                   # [NEW] Required env vars template
├── pyproject.toml                 # [NEW] uv + ruff + pytest config
├── uv.lock                       # [NEW] Locked dependencies
├── Dockerfile                     # [NEW] Multi-stage build
├── .python-version                # [NEW] 3.12
├── .dockerignore                  # [NEW]
├── tests/
│   ├── conftest.py                # [NEW] Add Backend root to sys.path
│   ├── unit/
│   │   ├── test_config.py         # [NEW] Settings defaults
│   │   ├── test_schema_base.py    # [NEW] CamelCaseModel alias
│   │   └── test_security.py       # [NEW] hash_token, opaque token
│   └── integration/
│       └── test_health_endpoint.py # [NEW] GET /api/v1/health
└── README.md                      # [NEW] Setup guide

.github/
├── PULL_REQUEST_TEMPLATE.md       # [NEW]
└── workflows/
    ├── backend-ci.yml             # [NEW] 4 CI jobs
    └── pr-policy.yml              # [NEW] Branch/title/body validation

docker-compose.yml                 # [NEW] api + postgres:16 + redis:7
.gitignore                         # [MODIFY] Thêm MVP1 legacy + *.zip
```

---

## 3. Chi tiết từng file quan trọng

### 3.1 `src/core/config.py` — Cấu hình tập trung

**Bản chất:** Đọc config từ 4 nguồn theo thứ tự ưu tiên:

```
init args > env vars > .env file > config.yaml > defaults
```

**Luồng đọc:**
1. `AppSettings` kế thừa `BaseSettings` của pydantic-settings
2. `settings_customise_sources()` thiết lập priority order
3. `yaml_config_settings()` flatten nested YAML keys → flat dict matching field names
4. `@lru_cache` trên `get_settings()` đảm bảo singleton

**Key fields:**

| Field | Default | Env var | YAML key |
|---|---|---|---|
| `database_url` | `postgresql+asyncpg://...dulichviet` | `DATABASE_URL` | — |
| `jwt_secret_key` | Dev secret (32+ chars) | `JWT_SECRET_KEY` | — |
| `redis_url` | `redis://localhost:6379/0` | `REDIS_URL` | — |
| `cors_origins` | `["http://localhost:5173"]` | — | `cors.origins` |
| `ai_rate_limit_fail_mode` | `"closed"` | — | `ai.rate_limit_fail_mode` |
| `rate_limit_ai_free` | `3` | — | `ai.calls_per_day` |

**Validator quan trọng:**
- `validate_production_settings()` — fail fast nếu `JWT_SECRET_KEY` vẫn là dev default khi `environment=production`

### 3.2 `src/core/database.py` — Async engine + session

**Luồng:**
```
get_async_engine() → create_async_engine(database_url, echo=debug, pool_pre_ping=True)
get_session_factory(engine) → async_sessionmaker(expire_on_commit=False, autoflush=False)
get_db() → async context manager yield session (dùng cho FastAPI Depends)
```

**Note:** `Base = DeclarativeBase` — tất cả ORM models kế thừa `Base`, re-exported từ `src/models/__init__.py`.

### 3.3 `src/core/security.py` — JWT + bcrypt + token hashing

**3 nhóm chức năng:**

| Function | Mục đích | Sử dụng ở |
|---|---|---|
| `hash_password()` / `verify_password()` | bcrypt hashing | Auth service (Phase B1) |
| `create_access_token()` / `verify_access_token()` | JWT HS256 | DI `get_current_user` |
| `hash_token()` / `create_opaque_token()` | SHA-256 hash cho share/claim tokens | Itinerary service (Phase B2) |
| `create_refresh_token()` | Raw token + hash + expiry tuple | Auth service (Phase B1) |

**Note:** `passlib` và `jose` import lazily (trong function body) để unit test không cần cài full auth stack.

### 3.4 `src/core/exceptions.py` — 8 custom exceptions

```
AppException (base)
├── NotFoundException         → 404
├── ConflictException         → 409
├── ForbiddenException        → 403
├── UnauthorizedException     → 401
├── ValidationException       → 422
├── RateLimitException        → 429
└── ServiceUnavailableException → 503
```

**Response format thống nhất:**
```json
{
  "detail": "Resource not found",
  "error_code": "NOT_FOUND",
  "status_code": 404
}
```

2 handler đăng ký trong `middlewares.py`:
- `app_exception_handler` — cho `AppException` subclass
- `http_exception_handler` — cho FastAPI `HTTPException` gốc

### 3.5 `src/core/dependencies.py` — DI chain

```
get_db()           → AsyncSession
get_redis()        → Redis client
get_rate_limiter() → RateLimiter(redis, settings)
get_current_user() → User (bắt buộc auth, raise 401 nếu fail)
get_current_user_optional() → User | None (auth tùy chọn)
```

**`oauth2_scheme`** trỏ đến `tokenUrl="/api/v1/auth/login"` — sẽ hoạt động đầy đủ sau Phase B1.

### 3.6 `src/core/rate_limiter.py` — Redis fail-closed

**Luồng rate limiting:**
```
check_ai_limit(user_id)
  → redis.incr(key)                # Tăng counter
  → Nếu count == 1: expireat()     # Set TTL đến nửa đêm UTC
  → Nếu Redis down + fail_mode=closed → raise ServiceUnavailableException
  → Nếu Redis down + fail_mode=open → return True (cho phép)
```

**Key format:** `rate:ai:{user_id}:{YYYYMMDD}`
**Reset:** nửa đêm UTC mỗi ngày

### 3.7 `src/core/middlewares.py` — 3 layers

| Layer | Mục đích |
|---|---|
| `CORSMiddleware` | Cho phép FE origin từ `settings.cors_origins` |
| `request_logging_middleware` | Log method + path + status + duration_ms (không log body/secrets) |
| Exception handlers | AppException → JSON chuẩn, HTTPException → JSON chuẩn |

### 3.8 `src/base/repository.py` — BaseRepository[T]

Abstract base class cho tất cả repository:

```python
class BaseRepository(ABC, Generic[T]):
    get_by_id(id) → T | None
    get_all(skip, limit) → Sequence[T]
    create(**kwargs) → T
    update(id, **kwargs) → T | None
    delete(id) → bool
```

Mỗi concrete repository (UserRepository, TripRepository...) sẽ implement 5 methods này + thêm domain-specific queries.

### 3.9 `src/base/schema.py` — CamelCaseModel

```python
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,      # Cho phép tạo từ ORM object
        alias_generator=to_camel,  # snake_case → camelCase
        populate_by_name=True,     # Chấp nhận cả 2 dạng input
    )
```

**Ví dụ:**
```python
class ExampleSchema(CamelCaseModel):
    adult_price: int

# Python: schema.adult_price == 100
# JSON:   {"adultPrice": 100}
# Input:  ExampleSchema(adultPrice=100)  # Cả 2 đều OK
```

### 3.10 `src/models/` — 16 bảng core

| File | Models | Bảng DB |
|---|---|---|
| `user.py` | User, RefreshToken | `users`, `refresh_tokens` |
| `trip.py` | Trip, TripDay, Activity | `trips`, `trip_days`, `activities` |
| `place.py` | Destination, Place, Hotel, SavedPlace | `destinations`, `places`, `hotels`, `saved_places` |
| `extras.py` | Accommodation, ExtraExpense, ShareLink, TripRating, GuestClaimToken, ChatSession, ChatMessage | 7 bảng |

**Re-export:** `src/models/__init__.py` import tất cả + `Base` → Alembic env dùng `from src.models import Base`.

### 3.11 `src/main.py` — App factory

```python
def create_app(verify_database: bool = True) -> FastAPI:
    # 1. Load settings
    # 2. Configure logging
    # 3. Create FastAPI với lifespan (kiểm tra DB connection)
    # 4. Setup middlewares (CORS + logging + error handlers)
    # 5. Mount router tại /api/v1
```

**`verify_database=False`** — dùng cho test, bỏ qua lifespan (không connect DB).

### 3.12 `alembic/env.py` — Async migration runner

```python
# Override sqlalchemy.url từ settings
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata

# Online mode: chạy async
asyncio.run(run_migrations_online())
```

**Note:** `get_settings()` đọc `DATABASE_URL` từ env var → CI job có thể override URL.

---

## 4. CI/CD Setup chi tiết

### 4.1 Tổng quan 2 workflow files

| File | Trigger | Mục đích |
|---|---|---|
| `.github/workflows/backend-ci.yml` | Push to `feat/**`, PR to `main` | 4 jobs: lint, unit, integration, migrations |
| `.github/workflows/pr-policy.yml` | PR to `main` | Validate branch name, PR title, PR body |

### 4.2 `backend-ci.yml` — 4 jobs

#### Job 1: `backend-lint`

```yaml
Runs on: ubuntu-latest
Steps:
  1. Checkout
  2. Setup Python 3.12
  3. Setup uv
  4. Install: cd Backend && uv sync --frozen --dev
  5. Run: uv run ruff check src tests
```

**Fallback:** Nếu `pyproject.toml` không tồn tại → `pip install -r requirements.txt ruff pytest` + `compileall`.

#### Job 2: `backend-unit`

```yaml
Runs on: ubuntu-latest
Steps:
  1-4. Same as lint
  5. Run: uv run pytest tests/unit/ -v --tb=short
```

**Không cần** postgres/redis service vì unit tests không kết nối DB.

#### Job 3: `backend-integration`

```yaml
Runs on: ubuntu-latest
Services:
  postgres:16-alpine  (port 5432)
  redis:7-alpine      (port 6379)
Steps:
  1-4. Same as lint
  5. Run: uv run pytest tests/integration/ -v --tb=short
```

**Env vars mặc định cho CI:**

```yaml
DATABASE_URL: "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/test_db"
REDIS_URL: "redis://127.0.0.1:6379/0"
JWT_SECRET_KEY: "ci-test-secret-key-not-for-production"
GEMINI_API_KEY: "dummy-ci-key"
GOONG_API_KEY: "dummy-ci-key"
```

**Note:** Integration test hiện tại dùng `verify_database=False` nên không cần DB, nhưng có services sẵn cho future integration tests.

#### Job 4: `backend-migrations`

```yaml
Runs on: ubuntu-latest
Services:
  postgres:16-alpine  (port 5432)
Steps:
  1-4. Same as lint (không install dev deps)
  5. Run: cd Backend && uv run alembic upgrade head
```

**Luồng:** Alembic đọc `DATABASE_URL` từ env var → connect postgres service → tạo 16 bảng.

### 4.3 `pr-policy.yml` — PR validation

#### Check 1: Branch name regex

```regex
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

**Ví dụ hợp lệ:**
- `feat/00000-a-foundation-bootstrap` ✓
- `feat/00001-b1-auth-users` ✓
- `fix/00002-b2-trip-validation` ✓

**Ví dụ không hợp lệ:**
- `feature/auth` ✗ (thiếu task ID + phase code)
- `feat/auth` ✗ (thiếu task ID + phase code)

#### Check 2: PR title regex

```regex
^(feat|fix|docs|style|refactor|chore): \[#([0-9]+)\] [a-z].+$
```

**Ví dụ hợp lệ:**
- `feat: [#00000] bootstrap MVP2 foundation layer` ✓
- `fix: [#00001] correct token expiry calculation` ✓

**Ví dụ không hợp lệ:**
- `feat: [00000] missing hash` ✗ (thiếu `#` trong `[#00000]`)
- `feat: [#00000] Bootstrap MVP2` ✗ (chữ hoa B sau `]`)

#### Check 3: PR body sections

Bắt buộc 4 section header:

```markdown
## Mô tả
## Thay đổi chính
## Cách kiểm tra (Testing)
## Lưu ý khác
```

Thiếu bất kỳ section nào → `pr-policy` job fail.

### 4.4 Required checks tổng hợp

Để merge PR vào `main`, tất cả 5 checks phải pass:

1. `pr-policy` — branch + title + body
2. `backend-lint` — ruff check
3. `backend-unit` — pytest tests/unit/
4. `backend-integration` — pytest tests/integration/
5. `backend-migrations` — alembic upgrade head

---

## 5. Quy tắc CI/CD

### Quy tắc branch/commit/PR

| Quy tắc | Giá trị |
|---|---|
| Branch format | `type/taskID-phaseCode-scope` |
| Commit format | `type: [#taskID] description` |
| PR title | Phải trùng final squash commit title |
| PR body | 4 section bắt buộc |
| Merge method | Squash merge only |
| Direct push to main | Không cho phép |

### Quy tắc test

- Unit tests: `Backend/tests/unit/` — không kết nối DB/Redis
- Integration tests: `Backend/tests/integration/` — cần DB/Redis (CI có services)
- Test file naming: `test_<module>_<scenario>__<expected>.py`
- Test function naming: `test_<unit>__<condition>__<expected>()`

### Quy tắc lint

- Tool: `ruff` (thay thế cả flake8 + isort + black)
- Config: `pyproject.toml` → `[tool.ruff]`
- Select rules: `E, F, I, B, UP`
- Line length: 100
- Target: Python 3.11+

### Quy tắc migration

- Mỗi migration 1 file trong `Backend/alembic/versions/`
- Naming: `YYYYMMDD_NNNN_descriptive_name.py`
- Luôn test `alembic upgrade head` trước khi merge
- Không sửa migration đã merge

---

## 6. Docker Compose

### Services

| Service | Image | Port | Mục đích |
|---|---|---|---|
| `api` | Build from `Backend/Dockerfile` | 8000 | FastAPI app |
| `db` | `postgres:16-alpine` | 5432 | Database |
| `redis` | `redis:7-alpine` | 6379 | Cache + rate limiter |

### Startup order

```
db (healthy) → api
redis (healthy) → api
```

### API startup command

```bash
alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Chạy migration trước khi start server — đảm bảo schema luôn đồng bộ.

---

## 7. Local development setup

```bash
# 1. Cài uv (nếu chưa có)
# Windows: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Sync dependencies
cd Backend
uv sync --dev

# 3. Copy .env
cp .env.example .env
# Chỉnh DATABASE_URL, JWT_SECRET_KEY, v.v.

# 4. Chạy migration
uv run alembic upgrade head

# 5. Start server
uv run uvicorn src.main:app --reload

# 6. Verify
# GET http://localhost:8000/api/v1/health → {"status":"healthy"}

# 7. Lint
uv run ruff check src/ tests/

# 8. Test
uv run pytest tests/ -v
```

### Docker Compose local

```bash
# Tạo Backend/.env từ .env.example trước
docker compose up --build
# API: http://localhost:8000
# DB:  localhost:5432
# Redis: localhost:6379
```

---

## 8. Files đã remove khỏi git tracking

Các file MVP1 vẫn còn trên disk nhưng không còn được git track:

| File | Lý do remove |
|---|---|
| `Backend/app/` | MVP1 code, thay bằng `Backend/src/` |
| `Backend/main.py` | MVP1 entry point |
| `Backend/requirements.txt` | Thay bằng `pyproject.toml` + `uv.lock` |
| `Backend/seed_data.py` | MVP1 seed script |
| `Backend/venv/` | Virtual env không commit |
| `render.yaml` | MVP1 deploy config |
| `vercel.json` | MVP1 deploy config |
| `BE.md` | Stale planning doc |
| `FE.md` | Stale planning doc |
| `implementation_plan.md` | Stale planning doc |

---

## 9. Open Questions

- EP-34 Analytics có triển khai trong MVP2 không? Hiện tại `enable_analytics=False` và schema chưa có bảng analytics riêng.
- Migration `20260428_0001` là initial migration — có cần seed data sau khi merge Phase D (ETL) không?
