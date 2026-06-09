# 00052 Deployment ETL Strategy

**Date**: 2026-05-30
**Branch**: `feat/00052-c-etl-goong-data-expansion`
**Phase**: 3A-R — Deployment Planning (no implementation)

---

## Purpose

Document production deployment strategy for ETL pipeline when migrating from local development to production infrastructure.

**Scope**:
- Planning only (no code implementation)
- Deployment target architecture
- ETL scheduler options
- Environment requirements
- Migration strategy

---

## Current State (Local Development)

| Layer | Current Setup | Notes |
|---|---|---|
| Frontend | Local Vite dev server (`npm run dev`) | Port 5173, `VITE_API_URL=http://localhost:8000` |
| Backend API | Local Docker Compose | Port 8000, `DATABASE_URL=postgresql+asyncpg://...` |
| Database | Local PostgreSQL via Docker | DB name: `dulichviet`, port 5432 |
| Redis | Local Docker | Port 6379 |
| ETL | Manual CLI only | `uv run python -m src.etl --cities "Hà Nội"` |
| Scheduler | NONE | Manual execution by developer |

**Limitations**:
- ETL chỉ chạy khi developer gõ command
- Không có auto-refresh POI data
- `last_etl_at` chỉ update khi manual run
- Không có alert khi ETL fail

---

## Deployment Target Architecture

| Layer | Planned Provider | Rationale |
|---|---|---|
| Frontend | **Vercel** | Static React/Vite deployment, global CDN, free tier sufficient |
| Backend API | **Render** | FastAPI service, managed infrastructure, supports cron jobs |
| Database | **Supabase Postgres** | Managed PostgreSQL, free tier, connection pooling |
| Redis | **Render Redis** or **Upstash** | Managed Redis, rate limit storage |
| ETL Scheduler | **Render Cron** (preferred) | Native cron support, can run Python CLI |
| Alternative Scheduler | Vercel Cron | HTTP-only, would need protected backend endpoint |
| Alternative Scheduler | Supabase Cron | SQL/HTTP only, not ideal for Python ETL |

**Why Render for Backend + Scheduler**:
- Render supports both web services (FastAPI) and cron jobs
- Cron jobs can run arbitrary Python commands from repo
- Environment variables managed centrally
- Logs accessible via Render dashboard
- Free tier sufficient for MVP

---

## ETL Scheduler Options

### Option A: Render Cron (RECOMMENDED)

**Pros**:
- Native support for Python CLI commands
- Same platform as backend API
- Centralized env vars management
- Built-in logs and monitoring

**Implementation**:
```yaml
# Render Cron Job configuration
cron: "0 2 * * 0"  # Every Sunday 2AM UTC
command: "cd Backend && uv run python -m src.etl --cities \"Hà Nội\" \"TP. Hồ Chí Minh\" \"Đà Nẵng\""
env_vars:
  - DATABASE_URL (from Supabase)
  - REDIS_URL (from Render/Upstash)
  - GOONG_API_KEY (from Render env)
  - AGENT_TIMEOUT_SECONDS=180
```

**Cons**:
- Free tier cron has limitations (execution time, concurrency)
- Need to implement manual "trigger ETL" endpoint for ad-hoc runs

### Option B: Vercel Cron (NOT RECOMMENDED)

**Pros**:
- Same platform as frontend
- Simple cron syntax

**Cons**:
- Cron jobs can only make HTTP requests
- Would need to expose protected backend endpoint `/admin/etl/trigger`
- Additional auth/security overhead
- Not ideal for long-running ETL processes

### Option C: Supabase Cron (NOT RECOMMENDED)

**Pros**:
- Same platform as database
- Can schedule SQL queries

**Cons**:
- Cannot run Python ETL directly
- Would need to call backend via HTTP (same issues as Option B)

---

## Production ETL Environment Variables

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase | PostgreSQL connection string |
| `REDIS_URL` | Render/Upstash | Redis connection for rate limit + cache |
| `GOONG_API_KEY` | Render env | REST API key (not Maptiles key) |
| `FRONTEND_URL` | Vercel deployment | For CORS configuration |
| `AGENT_TIMEOUT_SECONDS` | Render env | AI request timeout (default 120) |
| `AGENT_MAX_ACTIVITIES_PER_DAY` | Render env | Max activities per day (default 7) |
| `ETL_GOONG_REQUEST_DELAY_SECONDS` | Render env (future) | Delay between Goong requests |
| `ETL_GOONG_MAX_REQUESTS_PER_RUN` | Render env (future) | Budget tracking for rate limit |

---

## ETL Scheduler Implementation Requirements

### Before Implementing Scheduler

**Prerequisites**:
1. ✅ Phase 3A: Hà Nội real import validated (DONE)
2. ⚠️ Phase 3B: TP.HCM + Đà Nẵng import (TODO)
3. ⚠️ Phase 3C: 5 cities total (TODO)
4. ⚠️ Phase 4: API + generate readiness matrix (TODO)
5. ⚠️ Supabase connection verified
6. ⚠️ Render env vars configured
7. ⚠️ Rollback/disable plan documented

### Scheduler Logic Requirements

**Must-have**:
- Concurrency lock: prevent overlapping ETL runs
- City batching: 1-3 cities per run to avoid rate limit
- Error classification: `config_error`, `rate_limited`, `success`
- Logging: store `scraped_sources`, update `last_etl_at`
- Failure alerting: log to Render dashboard

**Nice-to-have**:
- Manual trigger endpoint: `POST /admin/etl/trigger` (protected)
- Status endpoint: `GET /admin/etl/status` (last run, next run)
- Per-city scheduling: different cities on different days

---

## Migration Strategy

### Phase 1: Local to Supabase Migration

1. **Create Supabase project**:
   - Enable PostgreSQL
   - Get connection string
   - Enable connection pooling

2. **Run migrations on Supabase**:
   ```bash
   export DATABASE_URL="<supabase-pooler-url>"
   cd Backend
   uv run alembic upgrade head
   ```

3. **Seed initial data**:
   - Run ETL manually against Supabase
   - Verify `destinations.last_etl_at` updated

### Phase 2: Backend Deployment

1. **Deploy to Render**:
   - Connect GitHub repo
   - Set build command: `cd Backend && uv sync`
   - Set start command: `uvicorn src.main:app --host 0.0.0.0 --port 8000`
   - Configure env vars

2. **Verify deployment**:
   - Health check: `GET /api/v1/health`
   - Destinations API: `GET /api/v1/places/destinations`

### Phase 3: ETL Scheduler Setup

1. **Create Render Cron Job**:
   - Set schedule (e.g., weekly)
   - Set command: ETL CLI with city list
   - Configure env vars

2. **Test first run**:
   - Manual trigger via Render dashboard
   - Verify logs show successful ETL
   - Check Supabase `last_etl_at` updated

### Phase 4: Frontend Deployment

1. **Deploy to Vercel**:
   - Connect GitHub repo
   - Set build command: `cd Frontend && npm ci && npm run build`
   - Set output directory: `Frontend/dist`
   - Configure `VITE_API_URL` to Render backend URL

2. **Verify end-to-end**:
   - Generate trip with Hà Nội
   - Verify AI pipeline uses Supabase data

---

## Rollback Plan

If ETL scheduler fails in production:

1. **Disable cron job** via Render dashboard
2. **Revert to manual CLI**:
   ```bash
   uv run python -m src.etl --cities "Hà Nội"
   ```
3. **Verify data integrity**:
   - Check `last_etl_at` not stale
   - Verify places count stable

---

## Open Questions

| Question | Impact | Decision Needed |
|---|---|---|
| ETL frequency | Data freshness | Weekly vs bi-weekly? |
| City batching strategy | Rate limit risk | 1 city/run vs 3 cities/run? |
| Failure alerting | Ops visibility | Email alerts vs dashboard only? |
| Manual trigger endpoint | Dev convenience | Implement or defer? |
| Concurrency lock implementation | Data safety | Redis key vs DB flag? |

---

## Conclusion

Phase 3A-R confirms local ETL pipeline works for Hà Nội. Production deployment requires:

1. **Supabase database** for production data
2. **Render deployment** for backend API + ETL cron
3. **Vercel deployment** for frontend
4. **Render Cron** for scheduled ETL (preferred)

**No implementation in Phase 3A-R** — planning only.

**Next phase** (after 3B/3C/Phase 4):
- Implement Render Cron job
- Configure production env vars
- Test first production ETL run

---

**Generated**: 2026-05-30
**Status**: PLANNING_ONLY
**Next action**: None until Phase 3B/3C/Phase 4 complete
