# Part 7: README.md — Setup & Run Guide

## Mục đích file này

Khi một developer mới clone repo, họ cần biết: **cài gì, cấu hình gì, chạy lệnh gì**. File này là template cho `Backend/README.md` — sẽ được tạo ở đầu Phase A.

README có 6 phần: tech stack → prerequisites → 5 bước setup → commands thường dùng → project structure → troubleshooting. Mục tiêu: developer mới có thể chạy được server trong **15 phút** kể từ khi clone.

### WHO đọc file này? WHEN đọc?

| Đối tượng | Khi nào đọc | Đọc phần nào |
|-----------|------------|-------------|
| **Dev mới** join team | Ngày đầu tiên setup | Quick Start (5 bước) → Troubleshooting |
| **Dev hiện tại** | Khi cần chạy lệnh ít dùng | Commands Reference → Database → ETL |
| **Reviewer** | Khi review PR | Project Structure → API Endpoints |
| **AI** (bạn) | Khi implement code | Tech Stack → Project Structure |

> **File này sẽ trở thành `Backend/README.md` khi bắt đầu Phase A.**
> Mỗi bước setup có giải thích TẠI SAO — không chỉ command, mà còn WHAT + WHY.

---

## Nội dung README.md

```markdown
# DuLichViet API — Backend

> AI Travel Itinerary Recommendation System — FastAPI Backend

## Tech Stack

| Component | Technology | Version |
|----------|-----------|---------|
| Framework | FastAPI | ≥0.115 |
| Language | Python | 3.12+ |
| Package Manager | uv | latest |
| Database | PostgreSQL | 16+ |
| ORM | SQLAlchemy | 2.0+ (async) |
| Migration | Alembic | 1.14+ |
| Cache | Redis | 7+ |
| AI | LangChain + LangGraph + Gemini | latest |
| Auth | JWT (python-jose) + bcrypt | - |

## Prerequisites

- Python 3.12+
- PostgreSQL 16+ (running)
- Redis 7+ (running)
- uv package manager

### Cài đặt uv (chỉ lần đầu)

Windows (PowerShell):
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

Linux/macOS:
  curl -LsSf https://astral.sh/uv/install.sh | sh

Verify:
  uv --version

## Quick Start (5 bước)

### Bước 1: Clone & Navigate

  git clone https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system.git
  cd NT208-ai-travel-itinerary-recommendation-system/Backend

### Bước 2: Tạo file .env

Sao chép template:

  cp .env.example .env

Sửa .env với giá trị thật:

  # Database
  DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/dulichviet

  # Auth
  JWT_SECRET_KEY=your-secret-key-here-minimum-32-chars

  # AI (Gemini)
  GEMINI_API_KEY=your-gemini-api-key

  # Maps (optional)
  GOONG_API_KEY=your-goong-api-key

  # Redis
  REDIS_URL=redis://localhost:6379

### Bước 3: Setup database

Tạo database trong PostgreSQL:

  psql -U postgres
  CREATE DATABASE dulichviet;
  \q

### Bước 4: Cài dependencies & chạy migration

  # Cài tất cả dependencies (production + dev)
  uv sync --all-extras

  # Chạy DB migration
  uv run alembic upgrade head

### Bước 5: Chạy server

  uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

Server chạy tại: http://localhost:8000
API docs: http://localhost:8000/docs (Swagger UI)

## Các lệnh thường dùng

### Development

  # Chạy server (auto-reload)
  uv run uvicorn src.main:app --reload

  # Chạy tests
  uv run pytest src/tests/ -v

  # Chạy tests với coverage
  uv run pytest src/tests/ -v --cov=src --cov-report=html

  # Lint check
  uv run ruff check src/

  # Auto-format
  uv run ruff format src/

  # Type check
  uv run mypy src/

### Database

  # Tạo migration mới sau khi sửa models
  uv run alembic revision --autogenerate -m "mô_tả_thay_đổi"

  # Apply tất cả migrations
  uv run alembic upgrade head

  # Rollback 1 migration
  uv run alembic downgrade -1

  # Xem migration history
  uv run alembic history

  # Xem migration hiện tại
  uv run alembic current

### ETL (Data pipeline)

  # Chạy full ETL (tất cả thành phố)
  uv run python -m src.etl.runner

  # Chạy cho 1 thành phố cụ thể
  uv run python -m src.etl.runner --cities "Hà Nội"

## Docker Compose (Alternative)

Nếu không muốn cài PostgreSQL/Redis local:

  # Từ root project
  docker compose up --build

  # Chỉ backend + DB + Redis
  docker compose up db redis backend

Services:
  - Backend: http://localhost:8000
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379

## Project Structure

  Backend/
  ├── pyproject.toml          ← Dependencies + tools config
  ├── config.yaml             ← Non-secret settings (xem 14_config_plan.md)
  ├── .env                    ← Secrets (KHÔNG commit!)
  ├── alembic/                ← DB migrations
  └── src/
      ├── main.py             ← App factory
      ├── core/               ← Config, DB, Auth, Middleware
      ├── base/               ← ABC classes
      ├── models/             ← SQLAlchemy tables (13)
      ├── schemas/            ← Pydantic DTOs
      ├── repositories/       ← Data access layer
      ├── services/           ← Business logic
      ├── api/v1/             ← HTTP routers (33 core endpoints + EP-34 optional)
      ├── agent/              ← AI (direct generate pipeline + Companion LangGraph + optional Analytics)
      ├── etl/                ← ETL pipeline (Goong + OSM)
      ├── helpers/            ← Utilities
      └── tests/              ← Pytest

  Architecture overview: xem plan/13_architecture_overview.md

## API Endpoints Overview

  Auth:
    POST /api/v1/auth/register
    POST /api/v1/auth/login
    POST /api/v1/auth/refresh
    POST /api/v1/auth/logout

  Users:
    GET  /api/v1/users/profile
    PUT  /api/v1/users/profile
    PUT  /api/v1/users/password

  Itineraries:
    POST /api/v1/itineraries/generate     ← AI generation
    POST /api/v1/itineraries              ← Manual create
    GET  /api/v1/itineraries              ← List (paginated)
    GET  /api/v1/itineraries/{id}         ← Detail
    PUT  /api/v1/itineraries/{id}         ← Auto-save
    DELETE /api/v1/itineraries/{id}       ← Delete
    PUT  /api/v1/itineraries/{id}/rating  ← Rate
    POST /api/v1/itineraries/{id}/share   ← Share

  Activities (sub-resource):
    POST /api/v1/itineraries/{id}/activities
    PUT  /api/v1/itineraries/{id}/activities/{aid}
    DELETE /api/v1/itineraries/{id}/activities/{aid}

  Accommodations:
    POST /api/v1/itineraries/{id}/accommodations
    DELETE /api/v1/itineraries/{id}/accommodations/{aid}

  Places:
    GET /api/v1/destinations
    GET /api/v1/destinations/{name}/detail
    GET /api/v1/places/search
    GET /api/v1/places/{id}

  AI Agent:
    POST /api/v1/agent/chat
    WS   /ws/agent-chat/{trip_id}
    GET  /api/v1/agent/suggest/{activity_id}
    GET  /api/v1/agent/rate-limit-status
    GET  /api/v1/agent/chat-history/{trip_id}    ← NEW: xem lịch sử chat

  Saved Places:
    GET    /api/v1/users/saved-places
    POST   /api/v1/users/saved-places
    DELETE /api/v1/users/saved-places/{id}

  New in v2:
    POST /api/v1/itineraries/{id}/claim          ← NEW: guest claim trip

## Environment Variables

  Variable             Required  Description
  ────────             ────────  ───────────
  DATABASE_URL         ✅        PostgreSQL connection string
  JWT_SECRET_KEY       ✅        JWT signing key (min 32 chars)
  GEMINI_API_KEY       ✅        Google Gemini API key
  GOONG_API_KEY        ❌        Goong Maps API key (optional)
  REDIS_URL            ❌        Redis URL (default: redis://localhost:6379)

## Troubleshooting

### "ModuleNotFoundError: No module named 'src'"
  → Chạy từ Backend/ directory: uv run uvicorn src.main:app

### "Connection refused" PostgreSQL
  → Kiểm tra PostgreSQL đang chạy: pg_isready
  → Kiểm tra DATABASE_URL trong .env

### "Connection refused" Redis  
  → Redis là optional cho development
  → Cache có thể bypass sang DB, nhưng AI rate limiting không được bỏ qua âm thầm; dùng DB fallback hoặc trả 503/429 theo `AI_RATE_LIMIT_FAIL_MODE`

### Alembic lỗi "Target database is not up to date"
  → uv run alembic upgrade head
  → Nếu conflict: uv run alembic stamp head (reset)

### AI generation trả 503
  → Kiểm tra GEMINI_API_KEY trong .env
  → Kiểm tra quota Gemini API
  → Rate limit: 3 calls/day (free tier)

### Tạo trip bị 403 "MAX_TRIPS_REACHED"
  → User đã có 5 active trips (giới hạn mặc định)
  → Xóa bớt trip cũ: DELETE /api/v1/itineraries/{id}
  → Hoặc tăng limit trong config.yaml: limits.max_active_trips_per_user
  → Guest user KHÔNG bị limit này

### CORS Error "Access-Control-Allow-Origin"
  → Kiểm tra config.yaml → cors.origins có chứa FE URL không
  → Development: http://localhost:5173
  → Production: domain thật

### WebSocket "connection timeout"
  → Kiểm tra route: ws://localhost:8000/ws/agent-chat/{trip_id}
  → JWT token phải gửi qua query param: ?token=xxx
  → Nginx cần config: proxy_http_version 1.1, Upgrade headers

### Token expired "401 Unauthorized"
  → FE tự gọi POST /auth/refresh với refresh token
  → Nếu refresh token cũng hết hạn → redirect login

## Architecture

  Tổng quan kiến trúc hệ thống:

  ┌─────────┐     HTTP/WS      ┌──────────┐
  │ React   │ ──────────────── │ FastAPI  │
  │ FE      │                  │ BE       │
  │ 25 pages│                  │ 33 core  │
  │         │                  │ +EP34 opt│
  └─────────┘                  └────┬─────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
              │PostgreSQL │  │  Redis    │  │ Gemini   │
              │  16 tables│  │  Cache    │  │ AI API   │
              └───────────┘  └───────────┘  └───────────┘

  Chi tiết: xem plan/13_architecture_overview.md

## API Quick Test

  # Register
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"Test1234!","fullName":"Test User"}'

  # Login
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"Test1234!"}'
  # → Response: {"accessToken":"eyJ...","refreshToken":"...","user":{...}}

  # List destinations (public)
  curl http://localhost:8000/api/v1/destinations

## Security Best Practices

  ⚠️ PRODUCTION CHECKLIST:
  □ DEBUG=false trong .env
  □ JWT_SECRET_KEY thay bằng random 64+ chars
  □ HTTPS enabled (reverse proxy)
  □ CORS origins = domain thật (không dùng "*")
  □ .env KHÔNG commit vào git
  □ Rate limiting enabled (Redis required)
  □ Gemini API key restricted trong Google Cloud Console

## Contributing

  1. Đọc plan/08_coding_standards.md trước khi code
  2. Tạo branch theo format `type/task-phase-scope` — ví dụ `feat/12345-b1-auth-register`
  3. Mỗi file max 150 dòng, mỗi function max 30 dòng
  4. Type hints bắt buộc, Google-style docstrings cho public functions
  5. Sync trạng thái hằng ngày trong `plan/17_execution_tracker.md`
  6. Trước PR phải squash còn 1 commit: `type: [#Task-ID] description`
  7. Tests: `uv run pytest tests/unit/ -v`, và nếu có endpoint thì thêm `tests/integration/`
  8. PR rules + GitHub GUI setup: xem plan/11_cicd_docker_plan.md §2.4–§2.6
```
