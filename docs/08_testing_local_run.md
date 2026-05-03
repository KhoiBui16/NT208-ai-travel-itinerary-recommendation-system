# 08. Chạy local và kiểm thử

## Docker-only

```powershell
copy Backend\.env.example Backend\.env
docker compose up --build
```

Truy cập:

- Backend: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

Frontend bằng container Node tạm:

```powershell
docker run --rm -it `
  --name dulichviet-fe `
  -p 5173:5173 `
  -v "${PWD}\Frontend:/app" `
  -w /app `
  node:20-alpine `
  sh -c "npm ci && npm run dev -- --host 0.0.0.0"
```

## Local development

Terminal 1:

```powershell
docker compose up -d db redis
```

Terminal 2:

```powershell
cd Backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --reload --port 8000
```

Terminal 3:

```powershell
cd Frontend
npm ci
npm run dev
```

## Test gates

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v
$env:CI="true"; uv run pytest tests/integration/ -v
$env:CI="true"; uv run pytest tests/ -v
```

Frontend:

```powershell
cd Frontend
npm run build
```

ETL smoke:

```powershell
cd Backend
uv run python -m src.etl --hotels-only --cities "Hà Nội"
```

## Smoke start kỳ vọng

- BE health trả `{"status":"healthy"}`.
- FE dev server trả HTTP 200 ở `/`.
- Docker API container health endpoint trả healthy.

