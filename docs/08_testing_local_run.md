# 08. Chạy local và kiểm thử

## Docker-only

```powershell
Copy-Item Backend\.env.example  Backend\.env
Copy-Item Frontend\.env.example Frontend\.env
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

**Trước khi chạy lần đầu**, copy env template:

```powershell
Copy-Item Backend\.env.example  Backend\.env
Copy-Item Frontend\.env.example Frontend\.env
```

Sửa `Backend/.env`:

- Bắt buộc set `JWT_SECRET_KEY` (xem hướng dẫn trong file `.env.example`).
- Goong ETL cần `GOONG_API_KEY` hoặc alias `GOONG_MAP_KEY` / `GOONG_MAP_API_KEY`.
- AI generate cần `GEMINI_API_KEY`.
- Local smoke 3 ngày với Gemini nên set `AGENT_TIMEOUT_SECONDS=60`; code/config default vẫn là 30s.
- Nếu cần gửi email reset password thật, điền thêm `SMTP_*`.

Terminal 1:

```powershell
docker compose up -d db redis
```

Terminal 2:

```powershell
cd Backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 3:

```powershell
cd Frontend
npm ci
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run dev -- --host 127.0.0.1 --port 5173
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
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run build
npm run test:e2e        # Playwright e2e (cần BE server chạy)
npm run test:e2e:headed # Chạy e2e với browser hiển thị
```

ETL smoke:

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" --dry-run
uv run python -m src.etl --cities "Hà Nội"
curl.exe "http://127.0.0.1:8000/api/v1/places/search?city=H%C3%A0%20N%E1%BB%99i&limit=5"
```

AI generate smoke:

```powershell
cd Backend
# Optional local override for 3-day Gemini smoke
$env:AGENT_TIMEOUT_SECONDS="60"
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"

curl.exe -X POST "http://127.0.0.1:8000/api/v1/itineraries/generate" `
  -H "Content-Type: application/json" `
  --data-raw '{"destination":"Hà Nội","startDate":"2026-06-01","endDate":"2026-06-03","budget":5000000,"adults":2,"children":0,"interests":["food","attraction"]}'
```

AI debug logs to watch in BE stdout:

```text
ai_generate_context_loaded        # destination/category/candidate counts
ai_generate_llm_attempt_started   # prompt chars, estimated tokens, timeout, model
gemini_request_timeout            # provider call exceeded timeout
ai_generate_llm_attempt_invalid   # JSON/schema/business validation failed
ai_generate_llm_attempt_validated # generated days/activities/cost accepted
ai_generate_completed             # persisted trip summary
```

Local browser note: if repeated guest tests return `429`, clear only local AI quota keys:

```powershell
docker compose exec redis redis-cli --scan --pattern "rate:ai:*" |
  ForEach-Object { docker compose exec redis redis-cli DEL $_ }
```

## Smoke start kỳ vọng

- BE health trả `{"status":"healthy"}`.
- FE dev server trả HTTP 200 ở `/`.
- `GET /api/v1/places/search?city=Hà Nội&limit=5` trả list non-empty sau ETL.
- `POST /api/v1/itineraries/generate` trả `201 Created` sau khi có Goong data + Gemini key.
- Guest generate lưu `pendingClaim` vào `sessionStorage` rồi chuyển login; sau login claim trip và quay lại đúng `tripId`.
- Authenticated generate vào `/trip-workspace?tripId=...` và workspace load itinerary từ BE.
- Docker API container health endpoint trả healthy.

## FE verification

```powershell
cd Frontend
npm run build           # Production build phải pass
npm run test:e2e        # Playwright e2e tests (cần BE chạy trên localhost:8000)
```

FE build phải pass (production bundle). Playwright e2e tests kiểm tra 11 flow: auth (3), trip CRUD (3), public pages (5). Yêu cầu BE server chạy trước khi chạy e2e.

Nếu dùng `127.0.0.1` thay vì `localhost`, hãy giữ đồng bộ:

```powershell
$env:VITE_API_URL="http://127.0.0.1:8000"
$env:E2E_BASE_URL="http://127.0.0.1:5173"
$env:E2E_API_URL="http://127.0.0.1:8000"
```

Backend CORS đã allow cả `http://localhost:5173` và `http://127.0.0.1:5173`.

## Full-stack smoke script

```powershell
.\scripts\test_fullstack_smoke.ps1
```

Kiểm 16 luồng HTTP thật: health, auth, profile, trip CRUD, share/claim, places, FE home. Xem chi tiết kịch bản tại `docs/10_automation_testing_report.md`.

