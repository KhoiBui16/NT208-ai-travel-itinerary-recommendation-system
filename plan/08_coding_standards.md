# Part 8: Coding Standards & Development Workflow

## Mục đích file này

### WHAT — File này chứa gì?

Đây là **"luật chơi" khi viết code** — mọi developer (và AI) PHẢI tuân thủ để đảm bảo codebase đồng nhất, dễ đọc, dễ bảo trì. 972 dòng, 10 sections, mỗi section giải quyết 1 câu hỏi:

### WHY — Tại sao cần coding standards?

Không có standards → mỗi người viết 1 kiểu → code review mất thời gian → bug khó tìm → onboarding dev mới chậm. Standards đảm bảo: **đọc 1 file = biết style toàn project**.

### HOW — Quick Reference

| Section | Câu hỏi trả lời | Quan trọng nhất |
|---------|-----------------|-----------------|
| §1 | OOP thế nào cho đúng FastAPI? | Class rules, inheritance, DI |
| §2 | Import file ra sao? | Absolute imports, no circular |
| §3 | Config quản lý ở đâu? | AppSettings Pydantic, config.yaml |
| §4 | Log ghi thế nào? | structlog, 4 levels, file rotation |
| §5 | Folder structure? | src/ 3-layer: router → service → repo |
| §6 | File rules? | Max 150 dòng, max 30 dòng/function |
| §7 | Naming convention? | snake_case Python, camelCase JSON |
| §8 | Error handling? | Custom exceptions, global handler |
| §9 | Dev workflow? | Branch → code → test → PR → merge |
| §10 | Checklist? | Pre-commit checks |

### WHEN — Khi nào đọc?

- **Lần đầu tiên**: Đọc §1 (OOP) → §5 (Folder) → §6 (File rules)
- **Trước khi code feature mới**: Đọc §9 (workflow) → §10 (checklist)
- **Khi debug**: Đọc §4 (logging) → §8 (error handling)
- **Khi review PR**: Tra cứu rule cụ thể theo section

> [!IMPORTANT]
> Đọc file này TRƯỚC khi bắt đầu code. Mọi PR phải tuân thủ các quy tắc trong đây.

---

## 1. OOP & Design Patterns trong FastAPI

### 1.1 Tại sao dùng OOP?

FastAPI cho phép viết cả procedural (function-based) và OOP (class-based). Dự án này chọn **OOP** vì:

1. **Encapsulation** — Mỗi class quản lý state riêng (VD: `TripRepository` giữ `self.session`)
2. **Inheritance** — `BaseRepository` → `TripRepository` tránh duplicate code
3. **Dependency Injection** — Constructor injection rõ ràng: `AuthService(user_repo, token_repo)`
4. **Testability** — Mock 1 class dễ hơn mock 1 function

### 1.2 Class Design Rules

```python
# ✅ ĐÚNG: Constructor injection, type hints, docstring
class ItineraryService:
    """Orchestrates trip CRUD and AI generation.
    
    Responsibilities:
        - Trip lifecycle (create, read, update, delete)
        - AI itinerary generation via pipeline
        - Ownership validation
    
    Dependencies:
        - TripRepository: Data access for trips
        - PlaceRepository: Place metadata
        - HotelRepository: Hotel data
    """
    
    def __init__(
        self,
        trip_repo: TripRepository,
        place_repo: PlaceRepository,
        hotel_repo: HotelRepository,
    ) -> None:
        self._trip_repo = trip_repo      # Private — prefix _
        self._place_repo = place_repo
        self._hotel_repo = hotel_repo

# ❌ SAI: Global state, no injection, no types
class BadService:
    def do_something(self):
        db = get_database()  # ← Hidden dependency!
        return db.query(...)
```

### 1.3 Design Patterns sử dụng

```mermaid
graph TB
    subgraph "Patterns trong dự án"
        P1["🏭 Factory Pattern<br/>create_app(), get_async_engine()"]
        P2["💉 Dependency Injection<br/>FastAPI Depends()"]
        P3["📦 Repository Pattern<br/>BaseRepository → TripRepository"]
        P4["🎯 Service Layer Pattern<br/>AuthService, ItineraryService"]
        P5["🔗 Chain of Responsibility<br/>Middleware pipeline"]
        P6["📋 Strategy Pattern<br/>SyncResult (diff & merge)"]
        P7["👤 Singleton Pattern<br/>@lru_cache cho Settings"]
    end
```

| Pattern | Dùng ở đâu | Tại sao |
|---------|------------|---------|
| **Factory** | `create_app()`, `get_async_engine()` | Tạo object phức tạp, dễ test với config khác |
| **DI** | Mọi Router, Service, Repository | Loose coupling, dễ mock khi test |
| **Repository** | `src/repositories/*.py` | Tách SQL khỏi business logic |
| **Service** | `src/services/*.py` | Business logic tập trung 1 chỗ |
| **Singleton** | `get_settings()` | Config chỉ load 1 lần |
| **Strategy** | `SyncResult` | Diff & merge có thể thay đổi thuật toán |
| **Scoped Ownership** 🆕 | `ItineraryService` | Endpoint theo integer ID luôn owner-only (`user_id = current_user.id`). Public read dùng `shareToken`; guest claim dùng `claimToken` one-time hash/expiry. Không claim/public-read chỉ bằng `user_id = NULL`. |

### 1.4 Layer Architecture — Ai gọi ai?

```mermaid
graph TD
    subgraph "LAYER RULES — Mũi tên = dependency direction"
        R["🌐 Router Layer<br/>src/api/v1/*.py<br/><i>Parse HTTP, return JSON</i>"]
        S["⚙️ Service Layer<br/>src/services/*.py<br/><i>Business logic, validation</i>"]
        RP["💾 Repository Layer<br/>src/repositories/*.py<br/><i>SQL queries only</i>"]
        M["📊 Model Layer<br/>src/models/*.py<br/><i>SQLAlchemy ORM</i>"]
        SC["📝 Schema Layer<br/>src/schemas/*.py<br/><i>Pydantic validation</i>"]
    end
    
    R --> S
    S --> RP
    S --> SC
    RP --> M
    
    style R fill:#e3f2fd
    style S fill:#fff3e0
    style RP fill:#e8f5e9
    style M fill:#fce4ec
    style SC fill:#f3e5f5
```

**Quy tắc cứng:**
- ✅ Router → Service → Repository → Model (từ trên xuống)
- ❌ Repository KHÔNG gọi Service (ngược chiều)
- ❌ Router KHÔNG gọi Repository trực tiếp (skip layer)
- ❌ Model KHÔNG import Router (circular dependency)

---

## 2. File Organization & Naming Conventions

### 2.1 Cấu trúc folder chuẩn

```
src/
├── main.py                         ← App factory (60 dòng max)
├── __init__.py                     ← Package marker
│
├── core/                           ← Foundation layer (không phụ thuộc domain)
│   ├── __init__.py
│   ├── config.py                   ← Centralized config (Settings class)
│   ├── database.py                 ← Engine, session factory
│   ├── security.py                 ← JWT, password hashing
│   ├── dependencies.py             ← DI chain (get_* functions)
│   ├── exceptions.py               ← Custom HTTP exceptions
│   ├── rate_limiter.py             ← Redis rate limiting
│   ├── logger.py                   ← 🆕 Logging configuration
│   └── middlewares.py              ← CORS, logging, error handler
│
├── base/                           ← Abstract base classes
│   ├── __init__.py
│   ├── repository.py               ← BaseRepository[T]
│   └── schema.py                   ← CamelCaseModel
│
├── models/                         ← SQLAlchemy ORM models
│   ├── __init__.py                 ← Export tất cả models
│   ├── user.py                     
│   ├── trip.py                     
│   ├── trip_day.py                 
│   ├── activity.py                 
│   ├── accommodation.py            
│   ├── hotel.py                    
│   ├── place.py                    
│   ├── destination.py              
│   ├── saved_place.py              
│   ├── extra_expense.py            
│   ├── refresh_token.py            
│   ├── share_link.py               
│   └── trip_rating.py              
│
├── schemas/                        ← Pydantic request/response
│   ├── __init__.py
│   ├── auth.py                     
│   ├── user.py                     
│   ├── itinerary.py                
│   ├── place.py                    
│   └── common.py                   ← PaginatedResponse, ErrorResponse
│
├── repositories/                   ← Data access layer
│   ├── __init__.py
│   ├── user_repo.py                
│   ├── trip_repo.py                
│   ├── place_repo.py               
│   ├── hotel_repo.py               
│   ├── refresh_token_repo.py       
│   └── saved_place_repo.py         
│
├── services/                       ← Business logic layer
│   ├── __init__.py
│   ├── auth_service.py             
│   ├── user_service.py             
│   ├── itinerary_service.py        
│   ├── _itinerary_sync.py          ← Private helper (prefix _)
│   ├── _itinerary_validators.py    ← Private helper
│   └── place_service.py            
│
├── api/                            ← HTTP interface
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── router.py               ← Aggregate router
│       ├── auth.py                 
│       ├── users.py                
│       ├── itineraries.py          
│       ├── places.py               
│       └── agent.py                
│
└── agent/                          ← AI module (xem Part 4)
    └── ...
```

### 2.2 Naming Conventions

| Thứ | Convention | Ví dụ |
|-----|-----------|-------|
| File | snake_case, singular | `trip_repo.py`, `auth_service.py` |
| Class | PascalCase | `TripRepository`, `AuthService` |
| Function/Method | snake_case, verb-first | `get_by_id()`, `create_full()` |
| Variable/Argument | snake_case, business meaning rõ | `trip_count`, `share_token`, `claim_token`, `current_user_id` |
| Boolean | prefix `is_`/`has_`/`can_`/`should_` | `is_active`, `has_access`, `should_retry` |
| Constant | UPPER_SNAKE | `MAX_RETRY`, `DEFAULT_PAGE_SIZE` |
| Private | prefix `_` | `_validate_ownership()`, `self._repo` |
| Type alias | PascalCase | `TripList = list[Trip]` |
| Env var | UPPER_SNAKE | `DATABASE_URL`, `JWT_SECRET_KEY` |
| Unit test function | `test_<unit>__<scenario>__<expected_result>` | `test_claim_trip__expired_token__raises_conflict()` |

### 2.2.a Function Signature Rules

- Mọi public function PHẢI có type hints cho toàn bộ input + output
- Tránh `Any` nếu có thể biểu diễn bằng type/domain object cụ thể
- Tên argument không dùng kiểu mơ hồ như `data`, `obj`, `tmp` nếu chưa có ngữ cảnh rõ
- Return type phải rõ là entity, schema, primitive, hoặc `None`

### 2.2.b Docstring Rules

- Module mới có module docstring ngắn giải thích mục đích
- Class và public function dùng **Google-style docstring**
- Docstring phải nêu rõ `Args`, `Returns`, `Raises`
- Không viết docstring kiểu lặp lại tên hàm

### 2.2.c Comment Rules

- Comment chỉ để giải thích **WHY**, không giải thích **WHAT**
- Ưu tiên comment cho transaction phức tạp, security guard, fallback logic
- `TODO` bắt buộc gắn task id

```python
# TODO(#12345): replace temporary retry policy after Redis fallback is stable.
```

### 2.3 File Size Rules

```
┌─────────────────────────────────────────────────────┐
│              FILE SIZE ENFORCEMENT                    │
├─────────────────────────────────────────────────────┤
│  Max lines per file:     150 dòng                    │
│  Max lines per function: 30 dòng                     │
│  Max parameters:         5 tham số                   │
│  Max class methods:      10 methods                  │
│                                                      │
│  NẾU vượt → PHẢI tách:                              │
│  ├── Service quá dài → _helper modules               │
│  ├── Router quá dài → tách sub-routers               │
│  └── Function quá dài → extract private methods      │
│                                                      │
│  VÍ DỤ:                                             │
│  itinerary_service.py (150)                          │
│  ├── _itinerary_sync.py (80)                         │
│  └── _itinerary_validators.py (50)                   │
└─────────────────────────────────────────────────────┘
```

---

## 3. Import Rules & Module Organization

### 3.1 Import Order (PEP 8 + isort)

```python
# 1️⃣ Standard library
import asyncio
from datetime import datetime, date
from typing import Sequence

# 2️⃣ Third-party packages
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from pydantic import BaseModel, Field

# 3️⃣ Local — core (foundation)
from src.core.config import get_settings
from src.core.database import get_db
from src.core.exceptions import NotFoundException
from src.core.logger import get_logger

# 4️⃣ Local — domain
from src.models.trip import Trip
from src.schemas.itinerary import TripGenerateRequest, ItineraryResponse
from src.services.itinerary_service import ItineraryService
```

### 3.2 Import Rules

```python
# ✅ ĐÚNG: Absolute imports từ src/
from src.core.config import get_settings
from src.models.user import User
from src.repositories.trip_repo import TripRepository

# ❌ SAI: Relative imports (khó debug, dễ circular)
from ..core.config import get_settings
from .models import User

# ✅ ĐÚNG: __init__.py re-export
# src/models/__init__.py
from src.models.user import User
from src.models.trip import Trip
from src.models.place import Place

# Sau đó import gọn:
from src.models import User, Trip, Place

# ❌ SAI: Wildcard imports
from src.models import *
```

### 3.3 Circular Import Prevention

```mermaid
graph TD
    subgraph "✅ ĐÚNG — Dependency flows DOWN"
        A[api/v1/auth.py] --> B[services/auth_service.py]
        B --> C[repositories/user_repo.py]
        C --> D[models/user.py]
    end
    
    subgraph "❌ SAI — Circular dependency"
        E[models/user.py] -.->|"KHÔNG import"| F[services/auth_service.py]
        F -.->|"KHÔNG import"| G[api/v1/auth.py]
    end
```

**Quy tắc:** Mỗi layer chỉ import layer BÊN DƯỚI, không bao giờ import layer bên trên.

Nếu cần type hint từ layer trên → dùng `TYPE_CHECKING`:

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.services.auth_service import AuthService  # Chỉ cho type hints
```

---

## 4. Centralized Configuration — KHÔNG HARDCODE

### 4.1 Tại sao không hardcode?

```python
# ❌ SAI — Hardcode giá trị trong code
RATE_LIMIT = 3
MODEL_NAME = "gemini-2.5-flash"
DB_URL = "postgresql://user:pass@localhost/db"

# ✅ ĐÚNG — Lấy từ centralized config
settings = get_settings()
settings.rate_limit_ai_free     # → 3
settings.agent_model            # → "gemini-2.5-flash"
settings.database_url           # → from .env
```

**Lý do:** Khi cần thay đổi giá trị, chỉ sửa 1 chỗ (`.env` hoặc `config.yaml`), không phải tìm grep qua 50 files.

### 4.2 Phân loại configuration

```mermaid
graph LR
    subgraph "🔐 Secrets → .env file"
        S1["DATABASE_URL"]
        S2["JWT_SECRET_KEY"]
        S3["GEMINI_API_KEY"]
        S4["GOONG_API_KEY"]
        S5["REDIS_URL"]
    end
    
    subgraph "⚙️ App Config → config.yaml"
        C1["app_name, app_version"]
        C2["cors_origins"]
        C3["pagination defaults"]
        C4["log_level, log_format"]
    end
    
    subgraph "🎛️ Hyperparameters → AppSettings class"
        H1["agent_model, agent_temperature"]
        H2["agent_max_retries, agent_timeout"]
        H3["rate_limit_ai_free"]
        H4["access_token_expire_minutes"]
        H5["cache_ttl_destinations"]
    end
    
    S1 & S2 & S3 & S4 & S5 --> SET["AppSettings<br/>(Pydantic BaseSettings)"]
    C1 & C2 & C3 & C4 --> SET
    H1 & H2 & H3 & H4 & H5 --> SET
```

### 4.3 Config files chi tiết

**`.env` (KHÔNG commit vào Git — đã có trong .gitignore):**
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dulviet_db

# Security
JWT_SECRET_KEY=your-super-secret-key-change-this
JWT_ALGORITHM=HS256

# AI
GEMINI_API_KEY=your-gemini-api-key

# Maps
GOONG_API_KEY=your-goong-api-key

# Redis
REDIS_URL=redis://localhost:6379/0

# Environment
ENVIRONMENT=development
DEBUG=true
```

**`.env.example` (commit vào Git — template cho developer mới):**
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dulviet_db
JWT_SECRET_KEY=change-this-in-production
GEMINI_API_KEY=
GOONG_API_KEY=
REDIS_URL=redis://localhost:6379/0
ENVIRONMENT=development
DEBUG=true
```

**`config.yaml` (commit vào Git — non-secret config):**
```yaml
app:
  name: "DuLichViet API"
  version: "2.0.0"

cors:
  origins:
    - "http://localhost:5173"
    - "http://localhost:3000"

pagination:
  default_page_size: 20
  max_page_size: 100

logging:
  level: "INFO"
  format: "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
  file: "logs/app.log"
  max_bytes: 10_485_760  # 10MB
  backup_count: 5

cache:
  ttl_destinations: 3600      # 60 min
  ttl_search: 900             # 15 min
  ttl_trip: 300               # 5 min

agent:
  model: "gemini-2.5-flash"
  temperature: 0.7
  max_retries: 2
  timeout_seconds: 30
  max_context_places: 30
```

### 4.4 AppSettings class hoàn chỉnh

```python
# src/core/config.py
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import yaml

def _load_yaml_config() -> dict:
    """Load config.yaml nếu tồn tại."""
    config_path = Path(__file__).parent.parent.parent / "config.yaml"
    if config_path.exists():
        with open(config_path) as f:
            return yaml.safe_load(f) or {}
    return {}

class AppSettings(BaseSettings):
    """Centralized application configuration.
    
    Priority order: .env > environment variables > defaults
    Mọi HYPERPARAMETER, URL, API key đều ở đây.
    Không bao giờ hardcode giá trị trong code.
    """
    
    # === SECRETS (from .env) ===
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    gemini_api_key: str = ""
    goong_api_key: str = ""
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"
    debug: bool = False
    
    # === APP CONFIG (from config.yaml or defaults) ===
    app_name: str = "DuLichViet API"
    app_version: str = "2.0.0"
    cors_origins: list[str] = ["http://localhost:5173"]
    
    # === AUTH HYPERPARAMETERS ===
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    min_password_length: int = 6
    
    # === AI AGENT HYPERPARAMETERS ===
    agent_model: str = "gemini-2.5-flash"
    agent_temperature: float = 0.7
    agent_max_retries: int = 2
    agent_timeout_seconds: int = 30
    agent_max_context_places: int = 30
    
    # === RATE LIMITING ===
    rate_limit_ai_free: int = 3          # AI calls/day per user
    rate_limit_api: int = 100            # API calls/minute per IP
    
    # === CACHE TTL (seconds) ===
    cache_ttl_destinations: int = 3600   # 60 min
    cache_ttl_search: int = 900          # 15 min
    cache_ttl_trip: int = 300            # 5 min
    
    # === PAGINATION ===
    default_page_size: int = 20
    max_page_size: int = 100
    
    # === LOGGING ===
    log_level: str = "INFO"
    log_format: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    log_file: str = "logs/app.log"
    log_max_bytes: int = 10_485_760      # 10MB
    log_backup_count: int = 5
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

@lru_cache
def get_settings() -> AppSettings:
    """Singleton settings — loaded once, reused everywhere."""
    return AppSettings()
```

---

## 5. Logging Strategy

### 5.1 Tại sao cần logging?

Khi production server trả HTTP 500 lúc 3 giờ sáng, developer cần biết CHÍNH XÁC line nào đã fail, request nào gây ra, và kết quả ra sao. Logging giải quyết điều này.

### 5.2 Architecture

```mermaid
graph TD
    subgraph "Log Sources"
        R["Router<br/>request/response log"]
        S["Service<br/>business logic log"]
        A["Agent<br/>AI call log"]
        M["Middleware<br/>error log"]
    end
    
    subgraph "Logger Module"
        L["src/core/logger.py<br/>get_logger(name)"]
    end
    
    subgraph "Outputs"
        C["Console<br/>(development)"]
        F["File: logs/app.log<br/>(rotation 10MB × 5)"]
        E["File: logs/error.log<br/>(ERROR+ only)"]
    end
    
    R & S & A & M --> L
    L --> C
    L --> F
    L --> E
```

### 5.3 Logger Implementation

```python
# src/core/logger.py (~60 lines)
"""Centralized logging configuration.

Usage:
    from src.core.logger import get_logger
    
    logger = get_logger(__name__)
    logger.info("User registered", extra={"user_id": 42})
    logger.error("AI call failed", exc_info=True)
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from src.core.config import get_settings

def setup_logging() -> None:
    """Configure root logger — call once at startup."""
    settings = get_settings()
    
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    
    # Root logger
    root = logging.getLogger()
    root.setLevel(settings.log_level)
    
    # Formatter
    formatter = logging.Formatter(settings.log_format)
    
    # Console handler (always)
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(settings.log_level)
    console.setFormatter(formatter)
    root.addHandler(console)
    
    # File handler (rotating — 10MB × 5 backups)
    file_handler = RotatingFileHandler(
        settings.log_file,
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(settings.log_level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)
    
    # Error-only file handler
    error_handler = RotatingFileHandler(
        "logs/error.log",
        maxBytes=settings.log_max_bytes,
        backupCount=3,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    root.addHandler(error_handler)

def get_logger(name: str) -> logging.Logger:
    """Get named logger for a module.
    
    Args:
        name: Module name (__name__). VD: "src.services.auth_service"
    
    Returns:
        Configured Logger instance.
    
    Usage:
        logger = get_logger(__name__)
        logger.info("Processing request", extra={"trip_id": 42})
    """
    return logging.getLogger(name)
```

### 5.4 Log Levels & Khi nào dùng

```
┌──────────────────────────────────────────────────────────────┐
│                    LOG LEVEL GUIDELINES                       │
├──────────┬───────────────────────────────────────────────────┤
│ LEVEL    │ Khi nào dùng                                      │
├──────────┼───────────────────────────────────────────────────┤
│ DEBUG    │ Chi tiết cho dev: SQL queries, request body        │
│          │ logger.debug(f"Query: {query}")                    │
│          │ CHỈ BẬT ở development                             │
├──────────┼───────────────────────────────────────────────────┤
│ INFO     │ Sự kiện quan trọng: user login, trip created       │
│          │ logger.info("User registered", extra={...})        │
│          │ PRODUCTION: bật level này                          │
├──────────┼───────────────────────────────────────────────────┤
│ WARNING  │ Không critical nhưng bất thường:                   │
│          │ Goong API key missing, rate limit approaching      │
│          │ logger.warning("Goong key not configured")         │
├──────────┼───────────────────────────────────────────────────┤
│ ERROR    │ Lỗi cần xử lý nhưng app vẫn chạy:               │
│          │ AI call failed (fallback), DB query timeout        │
│          │ logger.error("AI failed", exc_info=True)           │
├──────────┼───────────────────────────────────────────────────┤
│ CRITICAL │ App không thể tiếp tục: DB down, out of memory    │
│          │ logger.critical("Database connection lost")        │
│          │ Hiếm khi dùng                                     │
└──────────┴───────────────────────────────────────────────────┘
```

### 5.5 Log trong mỗi layer

```python
# Router — log request/response
@router.post("/generate")
async def generate_itinerary(request: TripGenerateRequest, ...):
    logger.info(
        "Generate itinerary requested",
        extra={"destination": request.destination, "user_id": user.id}
    )
    result = await service.generate(request, user.id)
    logger.info(
        "Itinerary generated",
        extra={"trip_id": result.id, "duration_ms": elapsed}
    )
    return result

# Service — log business events
class ItineraryService:
    async def generate(self, request, user_id):
        logger.info(f"Starting AI pipeline for {request.destination}")
        try:
            trip = await self._pipeline.run(request, user_id)
            logger.info(f"Pipeline completed: trip_id={trip.id}")
            return trip
        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            raise ServiceUnavailableException("AI service unavailable")

# Repository — log queries (DEBUG only)
class TripRepository:
    async def get_with_full_data(self, id: int):
        logger.debug(f"Loading trip {id} with full relations")
        result = await self.session.execute(query)
        logger.debug(f"Trip {id} loaded: {len(result.days)} days")
        return result
```

### 5.6 Request Logging Middleware

```python
# src/core/middlewares.py (thêm vào)

async def log_request_middleware(request: Request, call_next):
    """Log mọi HTTP request với timing."""
    request_id = str(uuid4())[:8]
    start = time.time()
    
    logger.info(
        f"→ {request.method} {request.url.path}",
        extra={"request_id": request_id}
    )
    
    response = await call_next(request)
    duration = (time.time() - start) * 1000  # ms
    
    log_fn = logger.warning if duration > 5000 else logger.info
    log_fn(
        f"← {response.status_code} ({duration:.0f}ms)",
        extra={"request_id": request_id}
    )
    
    # Header cho FE debug
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{duration:.0f}ms"
    return response
```

---

## 6. Development Workflow — Code gì trước?

### 6.1 Thứ tự code cho mỗi domain (feature)

```mermaid
graph LR
    subgraph "Bước 1: Data Layer"
        M["1. Model<br/>SQLAlchemy ORM"]
        MG["2. Migration<br/>alembic revision"]
    end
    
    subgraph "Bước 2: Schema"
        SCR["3. Request Schema<br/>Pydantic validation"]
        SCP["4. Response Schema<br/>CamelCaseModel"]
    end
    
    subgraph "Bước 3: Repository"
        R["5. Repository<br/>SQL operations"]
    end
    
    subgraph "Bước 4: Service"
        S["6. Service<br/>Business logic"]
    end
    
    subgraph "Bước 5: API"
        RT["7. Router<br/>Endpoints"]
        DI["8. DI Registration<br/>dependencies.py"]
    end
    
    subgraph "Bước 6: Test"
        T["9. Unit Tests"]
        I["10. Integration Tests"]
    end
    
    M --> MG --> SCR --> SCP --> R --> S --> RT --> DI --> T --> I
```

**Tại sao thứ tự này?** Vì mỗi layer phụ thuộc vào layer bên dưới:
1. Model trước — vì Repository cần biết bảng nào tồn tại
2. Migration — tạo bảng thật trong DB
3. Schema — vì Service cần validate input/output
4. Repository — vì Service gọi repo để đọc/ghi DB
5. Service — vì Router gọi service
6. Router + DI — expose HTTP endpoint
7. Test — verify tất cả hoạt động đúng

### 6.2 Khi gặp bug — Problem Identification Workflow

```mermaid
flowchart TD
    BUG["🐛 Bug phát hiện"] --> WHERE{"Bug ở layer nào?"}
    
    WHERE -->|"HTTP 422"| SCHEMA["Schema validation fail<br/>→ Check Pydantic schema<br/>→ Check FE request format"]
    WHERE -->|"HTTP 401/403"| AUTH["Auth/Permission issue<br/>→ Check JWT token<br/>→ Check ownership logic"]
    WHERE -->|"HTTP 404"| REPO["Data not found<br/>→ Check query params<br/>→ Check DB has data"]
    WHERE -->|"HTTP 500"| SERVICE["Service/logic crash<br/>→ Check error.log<br/>→ Check stack trace"]
    WHERE -->|"HTTP 503"| AI["AI service down<br/>→ Check Gemini API key<br/>→ Check rate limit"]
    
    SCHEMA --> FIX["Fix & write test"]
    AUTH --> FIX
    REPO --> FIX
    SERVICE --> FIX
    AI --> FIX
    
    FIX --> VERIFY["Run test suite"]
    VERIFY -->|Pass| DONE["✅ PR ready"]
    VERIFY -->|Fail| BUG
```

### 6.3 Checklist trước khi tạo PR

```
□ Code follows naming conventions (Section 2.2)
□ File ≤ 150 lines, function ≤ 30 lines
□ All functions have type hints
□ All public functions have Google-style docstrings
□ No hardcoded values (use Settings)
□ Proper logging (Section 5)
□ Import order correct (Section 3.1)
□ Unit tests written and passing
□ Nếu đổi endpoint → integration test tương ứng đã pass
□ `plan/17_execution_tracker.md` đã sync với code/docs/tests
□ No circular imports
□ Migration file created (if model changed)
```

---

## 7. Error Handling — Quy tắc xử lý lỗi

### 7.1 Exception Flow

```mermaid
sequenceDiagram
    participant C as Client (FE)
    participant R as Router
    participant S as Service
    participant RP as Repository
    participant M as Middleware (Error Handler)
    
    C->>R: POST /itineraries/generate
    R->>S: service.generate(request)
    S->>RP: repo.get_by_dest(city)
    RP-->>S: [] (empty)
    S->>S: raise NotFoundException("Không tìm thấy địa điểm")
    S-->>M: Exception propagates up
    M->>M: global_exception_handler()
    M-->>C: {"detail": "Không tìm thấy", "error_code": "NOT_FOUND", "status_code": 404}
```

### 7.2 Rules

```python
# ✅ ĐÚNG: Throw specific exception, catch ở middleware
async def get_by_id(self, trip_id: int) -> ItineraryResponse:
    trip = await self._trip_repo.get_with_full_data(trip_id)
    if not trip:
        raise NotFoundException(f"Trip {trip_id} not found")
    if trip.user_id != user_id:
        raise ForbiddenException("Not trip owner")
    return ItineraryResponse.model_validate(trip)

# ❌ SAI: Catch-all exception, return None
async def get_by_id(self, trip_id: int):
    try:
        trip = await self._trip_repo.get_with_full_data(trip_id)
        return trip
    except:
        return None  # ← Swallow error, caller doesn't know why
```

---

## 8. Endpoint API Design — RESTful Rules

### 8.1 URL Convention

```
GET    /api/v1/itineraries              → List (paginated)
GET    /api/v1/itineraries/{id}         → Get single
POST   /api/v1/itineraries              → Create
PUT    /api/v1/itineraries/{id}         → Full update
DELETE /api/v1/itineraries/{id}         → Delete

POST   /api/v1/itineraries/generate     → AI generate (special action)
POST   /api/v1/itineraries/{id}/rate    → Rate trip (sub-resource action)
POST   /api/v1/itineraries/{id}/share   → Generate share link

Quy tắc:
├── Nouns, not verbs: /itineraries (không phải /getTrips)
├── Plural: /itineraries (không phải /itinerary)
├── Lowercase + hyphens: /saved-places (không phải /savedPlaces)
├── Nesting max 2 levels: /itineraries/{id}/rate
└── Version prefix: /api/v1/
```

### 8.2 Response Format chuẩn

```python
# Success — single item
{
    "id": 42,
    "destination": "Hà Nội",
    "tripName": "Hà Nội 3 ngày",
    ...
}

# Success — paginated list
{
    "items": [...],
    "total": 45,
    "page": 1,
    "size": 20,
    "pages": 3
}

# Error — always same shape
{
    "detail": "Trip not found",
    "error_code": "NOT_FOUND",
    "status_code": 404
}
```

### 8.3 FE ↔ BE Field Mapping

```
FE (TypeScript camelCase)  →  BE (Python snake_case)  →  DB (snake_case)
═══════════════════════════════════════════════════════════════════════
tripName                   →  trip_name               →  trip_name
adultPrice                 →  adult_price              →  adult_price
startDate                  →  start_date               →  start_date
childrenCount              →  children_count            →  children_count
extraExpenses              →  extra_expenses            →  (relation)

CamelCaseModel tự động convert:
    Python: adult_price = 50000
    JSON:   "adultPrice": 50000
    
from_attributes=True cho phép:
    ORM object → Pydantic → JSON response (automatic)
```

---

## 9. Tóm tắt — Quick Reference

```
┌──────────────────────────────────────────────────────────────┐
│                    CODING STANDARDS CHECKLIST                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ OOP: Constructor injection, not global state             │
│  ✅ Layers: Router → Service → Repository → Model           │
│  ✅ Files: Max 150 lines, Max 30 per function                │
│  ✅ Imports: Absolute from src/, no wildcards                │
│  ✅ Config: ALL values in AppSettings, NO hardcode           │
│      └─ Non-secret → config.yaml (see 14_config_plan.md)    │
│      └─ Secrets → .env (GITIGNORED)                         │
│  ✅ Logging: get_logger(__name__), proper levels             │
│  ✅ Errors: Custom exceptions, caught by middleware          │
│  ✅ API: RESTful, nouns, plural, /api/v1/ prefix            │
│  ✅ Types: All functions type-hinted                         │
│  ✅ Naming: snake_case files, PascalCase classes             │
│  ✅ FE sync: CamelCaseModel for all responses               │
│                                                              │
│  Workflow: Model → Migration → Schema → Repo → Service →    │
│            Router → DI → Tests                               │
│                                                              │
│  New features (v4.0):                                        │
│  ✅ Guest mode: user_id=NULL trips + one-time claimToken     │
│  ✅ Trip limit: MAX_ACTIVE_TRIPS_PER_USER from config        │
│  ✅ Chat history: chat_sessions/chat_messages projection     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Security Coding Guidelines 🆕

### §7.1 Tại sao cần security rules riêng?

Coding standards §1-§6 đảm bảo code **đúng** và **đẹp**. Section này đảm bảo code **an toàn**. 1 lỗi bảo mật có thể expose toàn bộ DB — nghiêm trọng hơn 100 lỗi logic.

### §7.2 Security Rules — Bắt buộc

| # | Rule | ❌ SAI | ✅ ĐÚNG | WHY |
|---|------|-------|---------|-----|
| S1 | **Không log secrets** | `logger.info(f"Key: {api_key}")` | `logger.info("Key loaded successfully")` | Log files accessible, key leaks |
| S2 | **Parameterized queries** | `f"WHERE id={user_id}"` | `session.execute(select(Trip).where(Trip.id == trip_id))` | SQL injection prevention |
| S3 | **Validate all input** | Dùng raw `request.body()` | Dùng Pydantic schema với constraints | Reject malformed data early |
| S4 | **Hash passwords** | `password_hash = password` | `password_hash = bcrypt.hash(password, rounds=12)` | Plaintext passwords = catastrophic |
| S5 | **Check ownership** | Return trip without checking user | `if trip.user_id != current_user.id: raise ForbiddenException` | IDOR vulnerability |
| S6 | **SecretStr for secrets** | `api_key: str` in Settings | `api_key: SecretStr` in Settings | Prevents accidental repr/logging |
| S7 | **No hardcoded secrets** | `JWT_SECRET = "my-secret"` | `settings.jwt_secret_key.get_secret_value()` | Secrets in code = secrets in Git |
| S8 | **Sanitize user display** | `return {"name": user.input}` | `return {"name": html.escape(user.input)}` | XSS prevention |

### §7.3 Security Checklist — Pre-PR

```
□ Không có secret/API key nào trong code (grep: API_KEY, SECRET, PASSWORD)
□ Tất cả DB queries dùng ORM (không raw SQL với f-string)
□ Tất cả endpoints có ownership check (trừ public endpoints)
□ Pydantic schemas validate tất cả user input
□ Sensitive fields dùng SecretStr trong AppSettings
□ Error messages không expose internal details (no stack trace to user)
□ Rate limiting áp dụng cho AI endpoints
□ JWT tokens có expiry hợp lý (access: 15min, refresh: 30 days)
```

> [!CAUTION]
> **Khi phát hiện lỗ hổng bảo mật:** 1. KHÔNG commit fix vào branch public → 2. Báo team lead → 3. Fix trong branch private → 4. Deploy hotfix → 5. SAU ĐÓ mới merge vào main.
