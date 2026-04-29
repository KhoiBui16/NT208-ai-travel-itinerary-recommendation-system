# Part 14: Config Plan — Centralized Configuration Management

> **Decision lock v4.1:** Config phải hỗ trợ contract/security update: `ENABLE_ANALYTICS=false`
> mặc định, DB URL riêng cho analytics read-only nếu bật, `CLAIM_TOKEN_EXPIRE_HOURS`,
> `SHARE_TOKEN_EXPIRE_DAYS`, và chính sách rate limit AI fail-closed/DB fallback để không
> tốn quota Gemini khi Redis lỗi.

## Mục đích file này

### WHAT — File này chứa gì?

File này định nghĩa **tất cả tham số cấu hình** dùng xuyên suốt dự án. Thay vì hardcode giá trị trong code (VD: `max_trips = 5`), tất cả đều nằm trong config files → khi cần thay đổi, chỉ sửa 1 file.

### WHY — Tại sao cần centralized config?

Không có config centralized → giá trị nằm rải rác trong 10+ files → khó tìm, dễ quên update, dev vs prod dùng khác giá trị mà không biết. Config plan đảm bảo: **1 chỗ sửa = toàn bộ hệ thống đổi**.

### HOW — Config hoạt động thế nào?

```mermaid
graph LR
    subgraph "Config Sources (low → high priority)"
        YAML["config.yaml<br/>NON-SECRET defaults<br/>committed to Git"]
        ENV[".env file<br/>SECRETS<br/>GITIGNORED"]
        ENVVAR["Environment Variables<br/>Docker/CI override"]
    end

    subgraph "Merge Layer"
        SETTINGS["AppSettings<br/>(Pydantic BaseSettings)<br/>Merge all sources"]
    end

    subgraph "Usage"
        SVC["Services<br/>settings.MAX_TRIPS"]
        MW["Middleware<br/>settings.RATE_LIMIT"]
        AI["AI Module<br/>settings.GEMINI_MODEL"]
    end

    YAML -->|"load first"| SETTINGS
    ENV -->|"override secrets"| SETTINGS
    ENVVAR -->|"highest priority"| SETTINGS
    SETTINGS --> SVC & MW & AI
```

**Nguyên tắc ưu tiên:** `Environment Variables` > `.env file` > `config.yaml` > code defaults.

Ví dụ: `MAX_ACTIVE_TRIPS_PER_USER` mặc định là `5` trong `config.yaml`. Nhưng nếu `.env` có `MAX_ACTIVE_TRIPS_PER_USER=10`, giá trị 10 sẽ được dùng. Docker có thể override tiếp bằng env var.

### WHEN — Khi nào đọc file này?

- **Phase A** (foundation): Setup `config.yaml` + `AppSettings` — đọc §1, §2, §3
- **Thêm feature mới**: Thêm config param vào §2 table trước khi code
- **Deploy staging/prod**: Đọc §4 (environment overrides)
- **Debug "tại sao giá trị khác?"**: Tra bảng §2, check override chain

---

## 1. Config Strategy — 3 Files, 3 Vai trò

### §1.1 `config.yaml` — Non-secret Defaults (committed)

File YAML chứa tất cả giá trị mặc định **KHÔNG BÍ MẬT**. File này committed vào Git → tất cả developers thấy cùng giá trị.

**Tại sao YAML?** Vì YAML dễ đọc hơn JSON (có comments), dễ sửa hơn Python code, và Pydantic hỗ trợ load YAML qua `pyyaml`.

```yaml
# config.yaml — committed to Git
# Tất cả giá trị ở đây là NON-SECRET defaults
# Secrets (API keys, passwords) PHẢI ở .env

app:
  name: "DuLichViet API"
  version: "2.0.0"
  debug: false
  log_level: "INFO"

server:
  host: "0.0.0.0"
  port: 8000
  workers: 2
  cors_origins:
    - "http://localhost:5173"    # FE dev
    - "http://localhost:3000"    # FE alt

# === Auth ===
auth:
  access_token_expire_minutes: 15       # JWT hết hạn 15 phút
  refresh_token_expire_days: 30         # Refresh token 30 ngày
  bcrypt_rounds: 12                     # Bcrypt cost factor
  algorithm: "HS256"                    # JWT algorithm

# === Rate Limiting ===
rate_limit:
  ai_calls_per_day: 3                   # Số lần gọi AI/ngày (free)
  api_calls_per_minute: 100             # API chung
  ai_calls_per_day_dev: 10              # Dev mode cho 10 lần
  ai_rate_limit_fail_mode: "closed"     # paid AI endpoint: closed hoặc db_fallback

# === User Limits ===
limits:
  max_active_trips_per_user: 5          # Tối đa 5 trips active
  max_trip_duration_days: 14            # Trip tối đa 14 ngày
  max_activities_per_day: 20            # Activities/ngày
  max_extra_expenses_per_item: 10       # Extra expenses/activity
  min_password_length: 6               # Password tối thiểu

# === Cache (Redis TTL) ===
cache:
  destinations_ttl_seconds: 3600        # 60 phút
  places_search_ttl_seconds: 900        # 15 phút
  trip_detail_ttl_seconds: 300          # 5 phút
  default_ttl_seconds: 600              # 10 phút

# === AI ===
ai:
  model: "gemini-2.5-flash"
  max_retries: 2
  retry_backoff_seconds: [1, 2]         # Exponential backoff
  timeout_seconds: 30                   # Timeout cho LLM call
  max_context_places: 30                # Số places gửi trong prompt
  chat_session_timeout_minutes: 30      # Chat session inactive timeout
  max_chat_history_per_trip: 100        # Số messages lưu/trip
  companion_requires_confirmation: true # AI chat trả patch, không tự ghi DB
  enable_analytics: false               # EP-34 optional/MVP2+

# === Security Tokens ===
security_tokens:
  claim_token_expire_hours: 24
  share_token_expire_days: 0            # 0 = không hết hạn mặc định
  store_raw_tokens: false               # chỉ lưu hash token

# === ETL ===
etl:
  target_cities:
    - "Hà Nội"
    - "TP. Hồ Chí Minh"
    - "Đà Nẵng"
    - "Hội An"
    - "Nha Trang"
    - "Phú Quốc"
    - "Sapa"
    - "Vịnh Hạ Long"
    - "Huế"
    - "Đà Lạt"
    - "Vũng Tàu"
    - "Cần Thơ"
  goong_rate_limit_per_second: 5
  osm_timeout_seconds: 25
  batch_size: 50                         # Upsert batch size

# === Database ===
database:
  pool_size: 5
  max_overflow: 10
  pool_timeout: 30
  echo_sql: false                        # True = print SQL queries
```

### §1.2 `.env` — Secrets (GITIGNORED)

File `.env` chứa **BÍ MẬT** — passwords, API keys, JWT secrets. File này **KHÔNG BAO GIỜ** committed vào Git.

```bash
# .env — GITIGNORED — chứa secrets
# Copy .env.example → .env → sửa giá trị

# === Database ===
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/dulichviet

# === Auth Secrets ===
JWT_SECRET_KEY=your-super-secret-key-minimum-32-characters-long

# === AI API Keys ===
GEMINI_API_KEY=your-gemini-api-key-from-google-cloud

# === Maps API Keys ===
GOONG_API_KEY=your-goong-api-key

# === Redis ===
REDIS_URL=redis://localhost:6379/0

# === Optional Analytics (MVP2+) ===
ENABLE_ANALYTICS=false
ANALYTICS_DATABASE_URL=postgresql+asyncpg://readonly_user:password@localhost:5432/dulichviet

# === Override non-secrets if needed ===
# MAX_ACTIVE_TRIPS_PER_USER=10    # uncomment to override config.yaml
# AI_CALLS_PER_DAY=10             # uncomment for dev testing
```

### §1.3 `.env.example` — Template (committed)

```bash
# .env.example — committed — template cho developers
# Copy file này: cp .env.example .env
# Sửa các giá trị dưới đây

DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@localhost:5432/dulichviet
JWT_SECRET_KEY=CHANGE_ME_TO_A_RANDOM_STRING_32_CHARS
GEMINI_API_KEY=YOUR_GEMINI_KEY
GOONG_API_KEY=YOUR_GOONG_KEY
REDIS_URL=redis://localhost:6379/0
```

---

## 2. Full Config Parameters — Bảng tổng hợp (~30+ params)

| # | Param | Type | Default | Source | WHY | Ví dụ |
|---|-------|------|---------|--------|-----|-------|
| **Auth** | | | | | | |
| 1 | `JWT_SECRET_KEY` | str | — | `.env` | Sign JWT tokens. Nếu lộ → attacker forge tokens | `abc123...` (32+ chars) |
| 2 | `ACCESS_TOKEN_EXPIRE_MINUTES` | int | 15 | `config.yaml` | Balance security vs UX. 15 phút = user ít bị logout | `15` |
| 3 | `REFRESH_TOKEN_EXPIRE_DAYS` | int | 30 | `config.yaml` | 30 ngày = user không cần login lại 1 tháng | `30` |
| 4 | `BCRYPT_ROUNDS` | int | 12 | `config.yaml` | Hash cost. 12 = ~250ms. Tăng → chậm hơn nhưng an toàn hơn | `12` |
| **Database** | | | | | | |
| 5 | `DATABASE_URL` | str | — | `.env` | Connection string chứa password → bí mật | `postgresql+asyncpg://...` |
| 6 | `DB_POOL_SIZE` | int | 5 | `config.yaml` | Số connections giữ sẵn. 5 đủ cho 50 concurrent users | `5` |
| 7 | `DB_MAX_OVERFLOW` | int | 10 | `config.yaml` | Connections tạm thêm khi pool hết | `10` |
| 8 | `DB_ECHO_SQL` | bool | false | `config.yaml` | True = log tất cả SQL. BẬT khi debug, TẮT ở prod | `false` |
| **Redis** | | | | | | |
| 9 | `REDIS_URL` | str | — | `.env` | Redis connection. Dev: localhost, Prod: managed Redis | `redis://localhost:6379/0` |
| 10 | `DESTINATIONS_TTL` | int | 3600 | `config.yaml` | Cache destinations 60 phút. Data ít đổi | `3600` |
| 11 | `PLACES_SEARCH_TTL` | int | 900 | `config.yaml` | Cache search 15 phút. Balance freshness vs performance | `900` |
| 12 | `TRIP_DETAIL_TTL` | int | 300 | `config.yaml` | Cache trips 5 phút. Trip thay đổi thường xuyên | `300` |
| **Rate Limiting** | | | | | | |
| 13 | `AI_CALLS_PER_DAY` | int | 3 | `config.yaml` | 3 lần/ngày miễn phí. Gemini tốn ~$0.01/call | `3` |
| 14 | `API_CALLS_PER_MINUTE` | int | 100 | `config.yaml` | Chặn DDoS. 100 calls/min cho 1 IP | `100` |
| 14b | `AI_RATE_LIMIT_FAIL_MODE` | str | `closed` | `config.yaml` | Redis lỗi thì paid AI không fail-open; dùng `closed` hoặc `db_fallback` | `closed` |
| **User Limits** | | | | | | |
| 15 | `MAX_ACTIVE_TRIPS_PER_USER` | int | 5 | `config.yaml` | 5 trips active. Xóa 1 → tạo thêm 1 | `5` |
| 16 | `MAX_TRIP_DURATION_DAYS` | int | 14 | `config.yaml` | Trip tối đa 14 ngày. AI prompt limit | `14` |
| 17 | `MAX_ACTIVITIES_PER_DAY` | int | 20 | `config.yaml` | Tránh abuse. 20 activities/ngày đủ | `20` |
| 18 | `MIN_PASSWORD_LENGTH` | int | 6 | `config.yaml` | Balance security vs UX | `6` |
| **AI** | | | | | | |
| 19 | `GEMINI_API_KEY` | str | — | `.env` | Gemini API access. Secret | `AIza...` |
| 20 | `GEMINI_MODEL` | str | `gemini-2.5-flash` | `config.yaml` | Model name. Flash = fast + cheap | `gemini-2.5-flash` |
| 21 | `AI_MAX_RETRIES` | int | 2 | `config.yaml` | Retry khi Gemini fail. 2 lần, backoff 1s/2s | `2` |
| 22 | `AI_TIMEOUT_SECONDS` | int | 30 | `config.yaml` | Max wait time. > 30s = 503 | `30` |
| 23 | `MAX_CONTEXT_PLACES` | int | 30 | `config.yaml` | Inject tối đa 30 places vào prompt. Tránh token limit | `30` |
| 24 | `CHAT_SESSION_TIMEOUT_MIN` | int | 30 | `config.yaml` | Chat session inactive 30 phút → close | `30` |
| 24b | `COMPANION_REQUIRES_CONFIRMATION` | bool | true | `config.yaml` | AI chat chỉ trả proposedOperations; DB đổi sau confirm | `true` |
| 24c | `ENABLE_ANALYTICS` | bool | false | `config.yaml`/env | Bật EP-34 Text-to-SQL optional | `false` |
| 24d | `ANALYTICS_DATABASE_URL` | SecretStr | — | `.env` | Read-only DB role cho Analytics; chỉ required nếu ENABLE_ANALYTICS=true | `postgresql+asyncpg://readonly...` |
| **Security Tokens** | | | | | | |
| 24e | `CLAIM_TOKEN_EXPIRE_HOURS` | int | 24 | `config.yaml` | Guest claim token hết hạn sau 24h | `24` |
| 24f | `SHARE_TOKEN_EXPIRE_DAYS` | int | 0 | `config.yaml` | 0 = không hết hạn; có thể set 30/90 ngày | `0` |
| **Maps** | | | | | | |
| 25 | `GOONG_API_KEY` | str | — | `.env` | Goong Maps access. Secret | `abc123` |
| 26 | `GOONG_RATE_LIMIT_PER_SEC` | int | 5 | `config.yaml` | Polite usage: 5 req/s | `5` |
| **Server** | | | | | | |
| 27 | `APP_DEBUG` | bool | false | `config.yaml` | True = detailed error messages. TẮT ở prod | `false` |
| 28 | `LOG_LEVEL` | str | INFO | `config.yaml` | DEBUG/INFO/WARNING/ERROR | `INFO` |
| 29 | `CORS_ORIGINS` | list | localhost | `config.yaml` | FE domains allowed | `["http://localhost:5173"]` |
| 30 | `UVICORN_WORKERS` | int | 2 | `config.yaml` | Số worker processes | `2` |

---

## 3. AppSettings Implementation — Merge tất cả sources

### §3.1 Code Structure

```python
# src/core/config.py

import yaml
from pydantic_settings import BaseSettings
from pathlib import Path

def _load_yaml_config() -> dict:
    """Load config.yaml nếu tồn tại, trả {} nếu không."""
    config_path = Path(__file__).parent.parent.parent / "config.yaml"
    if config_path.exists():
        with open(config_path) as f:
            return yaml.safe_load(f) or {}
    return {}

_yaml = _load_yaml_config()

class AppSettings(BaseSettings):
    """Centralized settings — merge config.yaml + .env + env vars.
    
    Priority: env vars > .env > config.yaml > defaults below.
    
    Usage:
        from src.core.config import settings
        print(settings.MAX_ACTIVE_TRIPS_PER_USER)  # → 5
    """

    # --- Auth ---
    JWT_SECRET_KEY: str  # REQUIRED — phải có trong .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = _yaml.get("auth", {}).get(
        "access_token_expire_minutes", 15
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = _yaml.get("auth", {}).get(
        "refresh_token_expire_days", 30
    )
    BCRYPT_ROUNDS: int = _yaml.get("auth", {}).get("bcrypt_rounds", 12)

    # --- Database ---
    DATABASE_URL: str  # REQUIRED
    DB_POOL_SIZE: int = _yaml.get("database", {}).get("pool_size", 5)
    DB_ECHO_SQL: bool = _yaml.get("database", {}).get("echo_sql", False)

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379/0"
    AI_RATE_LIMIT_FAIL_MODE: str = _yaml.get("rate_limit", {}).get(
        "ai_rate_limit_fail_mode", "closed"
    )

    # --- AI ---
    GEMINI_API_KEY: str  # REQUIRED
    GEMINI_MODEL: str = _yaml.get("ai", {}).get("model", "gemini-2.5-flash")
    AI_MAX_RETRIES: int = _yaml.get("ai", {}).get("max_retries", 2)
    AI_TIMEOUT_SECONDS: int = _yaml.get("ai", {}).get("timeout_seconds", 30)
    COMPANION_REQUIRES_CONFIRMATION: bool = _yaml.get("ai", {}).get(
        "companion_requires_confirmation", True
    )
    ENABLE_ANALYTICS: bool = _yaml.get("ai", {}).get("enable_analytics", False)
    ANALYTICS_DATABASE_URL: str | None = None

    # --- Security Tokens ---
    CLAIM_TOKEN_EXPIRE_HOURS: int = _yaml.get("security_tokens", {}).get(
        "claim_token_expire_hours", 24
    )
    SHARE_TOKEN_EXPIRE_DAYS: int = _yaml.get("security_tokens", {}).get(
        "share_token_expire_days", 0
    )

    # --- Maps ---
    GOONG_API_KEY: str = ""  # Optional, placeholder

    # --- Limits ---
    MAX_ACTIVE_TRIPS_PER_USER: int = _yaml.get("limits", {}).get(
        "max_active_trips_per_user", 5
    )
    AI_CALLS_PER_DAY: int = _yaml.get("rate_limit", {}).get("ai_calls_per_day", 3)

    # --- Server ---
    APP_DEBUG: bool = _yaml.get("app", {}).get("debug", False)
    LOG_LEVEL: str = _yaml.get("app", {}).get("log_level", "INFO")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# Singleton — import này ở bất kỳ đâu
settings = AppSettings()
```

### §3.2 Cách dùng trong code

```python
# Trong service — DI qua constructor
class ItineraryService:
    def __init__(self, trip_repo: TripRepo):
        self.trip_repo = trip_repo

    async def create_manual(self, user_id: int, data: TripCreateRequest):
        # Check trip limit
        count = await self.trip_repo.count_active_by_user(user_id)
        if count >= settings.MAX_ACTIVE_TRIPS_PER_USER:
            raise MaxTripsExceeded(
                f"Bạn đã đạt giới hạn {settings.MAX_ACTIVE_TRIPS_PER_USER} lộ trình"
            )
        # ... create trip
```

---

## 4. Environment Overrides — Dev / Staging / Prod

| Param | Dev | Staging | Prod |
|-------|-----|---------|------|
| `APP_DEBUG` | `true` | `false` | `false` |
| `LOG_LEVEL` | `DEBUG` | `INFO` | `WARNING` |
| `DB_ECHO_SQL` | `true` | `false` | `false` |
| `AI_CALLS_PER_DAY` | `10` | `5` | `3` |
| `MAX_ACTIVE_TRIPS_PER_USER` | `50` | `10` | `5` |
| `CORS_ORIGINS` | `localhost:5173` | `staging.app.com` | `app.dulviet.com` |
| `UVICORN_WORKERS` | `1` | `2` | `4` |

**How to override cho từng environment:**

```bash
# Development — .env file
APP_DEBUG=true
AI_CALLS_PER_DAY=10
MAX_ACTIVE_TRIPS_PER_USER=50

# Docker staging — docker-compose.staging.yml
environment:
  - APP_DEBUG=false
  - AI_CALLS_PER_DAY=5

# Docker prod — docker-compose.prod.yml
environment:
  - APP_DEBUG=false
  - AI_CALLS_PER_DAY=3
  - MAX_ACTIVE_TRIPS_PER_USER=5
```

---

## 5. uv + .env Integration

### §5.1 Cách uv tự load .env

`uv run` KHÔNG tự load `.env`. Cần dùng `python-dotenv` (đã có trong pydantic-settings).

```bash
# Cách 1: uv run (dotenv loaded by Pydantic BaseSettings)
uv run uvicorn src.main:app --reload

# Cách 2: Explicit dotenv cho scripts
uv run python -c "from dotenv import load_dotenv; load_dotenv(); ..."
```

### §5.2 pyproject.toml dependencies

```toml
[project]
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic-settings>=2.0",    # BaseSettings + .env loading
    "pyyaml>=6.0",                # config.yaml loading
    "python-dotenv>=1.0",         # .env file loading
    # ...
]
```

---

## 6. Cross-Reference — Config ảnh hưởng file nào?

| Config Param | Ảnh hưởng file | Ảnh hưởng component |
|-------------|---------------|---------------------|
| `MAX_ACTIVE_TRIPS_PER_USER` | 03 (service), 10 (UC-19), 12 (EP-08/09) | ItineraryService.create* |
| `AI_CALLS_PER_DAY` | 04 (rate limit), 06 (Redis), 10 (UC-17) | RateLimitMiddleware |
| `AI_RATE_LIMIT_FAIL_MODE` | 06 (Redis failure), 10/16 tests | Paid AI protection |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 03 (auth service), 10 (UC-02) | AuthService.create_token |
| `GEMINI_MODEL` | 04 (AI pipeline) | ItineraryPipeline, CompanionService |
| `CHAT_SESSION_TIMEOUT_MIN` | 04 (companion) | CompanionService session mgmt |
| `COMPANION_REQUIRES_CONFIRMATION` | 04 (AI patch flow), 12 (EP-28/29) | CompanionService proposedOperations |
| `ENABLE_ANALYTICS` + `ANALYTICS_DATABASE_URL` | 04, 12, 16 | Optional EP-34 Text-to-SQL |
| `CLAIM_TOKEN_EXPIRE_HOURS` | 03, 09, 12 | Guest claim security |
| `SHARE_TOKEN_EXPIRE_DAYS` | 03, 09, 12 | Share link expiry |
| Cache TTLs | 06 (Redis strategy) | PlaceService, DestinationService |

---

## 7. Failure Modes — Config Loading 🆕

> [!WARNING]
> AppSettings load khi app startup. Nếu config sai → app KHÔNG khởi động được. Đây là **fail-fast by design**.

| Scenario | Nguyên nhân | Hệ thống phản ứng | Cách fix |
|----------|------------|-------------------|----------|
| `.env` file missing | Quên tạo `.env` từ `.env.example` | `ValidationError` on startup → app crash ngay | `cp .env.example .env` rồi fill secrets |
| `config.yaml` syntax error | YAML indent sai, tab thay vì space | `yaml.YAMLError` on startup → crash với dòng lỗi cụ thể | Fix YAML syntax (dùng YAML linter) |
| Required secret empty | `GEMINI_API_KEY=` (empty string) | `ValidationError: field required` → crash | Fill giá trị thật trong `.env` |
| Analytics enabled but missing read-only URL | `ENABLE_ANALYTICS=true` nhưng thiếu `ANALYTICS_DATABASE_URL` | Startup crash hoặc EP-34 trả 503 nếu flag được bật runtime | Tạo read-only DB role và set URL |
| Invalid type | `ACCESS_TOKEN_EXPIRE_MINUTES=abc` | Pydantic validation error → crash | Sửa giá trị đúng type (integer) |
| Config.yaml not found | File bị xóa hoặc renamed | Dùng defaults từ `AppSettings` class | Tạo lại `config.yaml` từ template |
| Env var override conflict | `REDIS_URL` trong cả `.env` và Docker env | Env var > `.env` > `config.yaml` (priority order) | Kiểm tra `docker-compose.yml` environment |

```python
# Fail-fast validation on startup (src/core/config.py)
@lru_cache
def get_settings() -> AppSettings:
    """Load settings once on startup. Crash immediately if invalid."""
    try:
        return AppSettings()  # Pydantic validates everything
    except ValidationError as e:
        # Log exactly which fields are wrong
        logger.critical(f"Config validation failed:\n{e}")
        sys.exit(1)  # Don't start with bad config
```

---

## 8. Security Considerations — Config 🆕

| Concern | Risk | Mitigation |
|---------|------|------------|
| **Secrets in Git** | API keys, DB password exposed | `.env` in `.gitignore`. NEVER commit secrets. Use `.env.example` as template |
| **JWT_SECRET_KEY rotation** | Key leaked → attacker forges tokens | 1. Change key in `.env` → 2. Restart server → 3. All existing tokens invalidate → 4. Users must re-login |
| **GEMINI_API_KEY abuse** | Key leaked → attacker uses quota | 1. Regenerate key in Google Cloud Console → 2. Update `.env` → 3. Restart |
| **Config in logs** | Secrets accidentally logged | AppSettings uses `SecretStr` for sensitive fields → `repr()` shows `"***"` not actual value |
| **Docker env injection** | Attacker sets malicious env vars | Whitelist known env vars in `docker-compose.yml`. Don't use `env_file: .env` in production |

```python
# SecretStr usage (src/core/config.py)
class AppSettings(BaseSettings):
    jwt_secret_key: SecretStr  # repr: SecretStr('***')
    gemini_api_key: SecretStr  # Won't appear in logs
    database_url: SecretStr    # Protected
    
    # Usage: settings.jwt_secret_key.get_secret_value()
```

---

## 9. Acceptance Tests — Config 🆕

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| CF-01 | App starts with valid config | Tạo `.env` đúng + `config.yaml` đúng → start server | Server start OK, log `"Settings loaded successfully"` |
| CF-02 | App fails without `.env` | Xóa `.env` → start server | Crash ngay với `ValidationError`, message chỉ rõ field thiếu |
| CF-03 | Env var overrides `.env` | Set `export REDIS_URL=redis://other:6379` → start | Server dùng `redis://other:6379`, không phải giá trị trong `.env` |
| CF-04 | Invalid YAML does not crash silently | Sửa `config.yaml` thành YAML invalid → start | Crash với `yaml.YAMLError`, dòng lỗi cụ thể |
| CF-05 | Secrets not in logs | Start server với `DEBUG=true` → check logs | Logs chứa `SecretStr('***')`, KHÔNG chứa actual key values |
