# Local Manual UAT Guide

This guide is the PowerShell-safe manual run path for `00059B`. It uses only commands confirmed from `docker-compose.yml`, `Backend/pyproject.toml`, `Backend/.env.example`, `Frontend/.env.example`, `Frontend/package.json`, and the GitHub Actions workflows.

It does not require real Gemini or Goong keys for the CI-equivalent checks. Real AI generate and real ETL are optional separate smokes and should be run only with explicit approval and valid quotas.

## Prerequisites

- Docker Desktop running.
- Python 3.12 and `uv`.
- Node.js 20+ and npm.
- Playwright Chromium installed when running browser tests.

## Start From Repo Root

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
```

## Env Setup

```powershell
if (!(Test-Path Backend\.env)) {
  Copy-Item Backend\.env.example Backend\.env
}

if (!(Test-Path Frontend\.env)) {
  Copy-Item Frontend\.env.example Frontend\.env
}
```

Before starting the backend, set a non-empty `JWT_SECRET_KEY` in `Backend\.env`. Leave `GEMINI_API_KEY` and `GOONG_API_KEY` empty for normal UAT unless you are explicitly running real AI or ETL smoke tests.

## Backend Infrastructure

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker compose up -d db redis
docker compose ps
```

Expected:

- `db` healthy on `localhost:5432`.
- `redis` healthy on `localhost:6379`.

## Backend App

Open a new PowerShell terminal:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"

uv sync
uv run alembic upgrade head
uv run alembic check
uv run uvicorn src.main:app --host localhost --port 8000
```

Verify:

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing
```

Expected response body:

```json
{"status":"healthy"}
```

## Frontend App

Open another PowerShell terminal:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Frontend"

npm ci
$env:VITE_API_URL = "http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

Verify in browser:

- Frontend: `http://localhost:5173`
- Create trip: `http://localhost:5173/create-trip`
- Backend docs: `http://localhost:8000/docs`

## CI-Equivalent Checks

Backend:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"

uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v --tb=short
$env:CI = "true"
uv run pytest tests/integration/ -v --tb=short
```

Frontend:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Frontend"

npm run build -- --outDir .build-tmp\manual-uat
$env:E2E_API_URL = "http://localhost:8000"
npx playwright test --reporter=list
```

Expected current merged-source result after `00060A` / `00060B`:

- Backend ruff check: pass.
- Backend ruff format check: pass.
- Alembic upgrade/check: pass.
- Backend unit: 187 passed.
- Backend integration: 77 collected (43 pass + 34 CI-gated skip local; đủ trên CI postgres).
- Frontend build: pass with Vite chunk-size warning only.
- Playwright: 36 tests trên 17 spec files (CI `frontend-e2e` green; latest local recorded run ~33 passed, 3 skipped — `b3/*` flows skip khi thiếu data/seed).

## Manual Browser UAT

Use `http://localhost:5173` in browser.

| Journey | Steps | Expected |
|---|---|---|
| Public browse | Open `/`, `/login`, `/register`, `/create-trip` | Pages render without fatal console errors. |
| Destination advisory | Open `/create-trip`, type/select `Đà Lạt` | Amber advisory appears, but submit is not blocked. |
| Calendar | Open date selector from create trip | Selectable future dates appear; confirm closes modal and date range is shown. |
| Auth | Register a new account, then open `/trip-library` | Protected page opens after login/register. |
| Guest claim | Create a guest trip through test/API flow, login/register with pending claim | User returns to `/trip-workspace?tripId=...` and pending claim is cleared. |
| Trip library | Create or seed an authenticated trip, open `/trip-library` | Trip card appears and links to workspace. |
| Share | Open an owned itinerary and trigger share | Share token should be opaque; public route is `/shared/<token>`. |

## Optional Real AI Generate Smoke

Run only when explicitly approved because it calls an external provider and consumes quota.

Requirements:

- `GEMINI_API_KEY` set in `Backend\.env`.
- Sufficient destination places/hotels in DB.
- Redis running.

Use a short itinerary and record any timeout, 422, 429, or 503 clearly. Do not mark real AI PASS unless the backend returns `201 Created` and the generated trip persists.

## Optional ETL Smoke

Run only when explicitly approved because it can call Goong.

Dry run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"

uv run python -m src.etl --cities "Hà Nội" --dry-run
```

Real ETL requires `GOONG_API_KEY` or an accepted alias. Do not run real ETL during UAT without approval.

## Cleanup

Stop manually-started backend/frontend terminals with `Ctrl+C`.

To stop only the local DB/Redis services:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker compose stop db redis
```

Do not stage local build/test artifacts:

- `Frontend/.build-tmp*/`
- `test-results/`
- `playwright-report/`
