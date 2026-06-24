# 08. Chạy local và kiểm thử

> Guide UAT mới nhất: `docs/LOCAL_MANUAL_UAT_GUIDE.md`. Các command bên dưới dùng `localhost:<port>` cho tài liệu human-facing.

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
uv run uvicorn src.main:app --host localhost --port 8000 --reload
```

Terminal 3:

```powershell
cd Frontend
npm ci
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
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
$env:VITE_API_URL="http://localhost:8000"
npm run build
npm run test:e2e        # Playwright e2e (cần BE server chạy)
npm run test:e2e:headed # Chạy e2e với browser hiển thị
```

Optional ETL smoke (only when explicitly approved):

```powershell
cd Backend
uv run python -m src.etl --cities "Hà Nội" --dry-run
uv run python -m src.etl --cities "Hà Nội"
curl.exe "http://localhost:8000/api/v1/places/search?city=H%C3%A0%20N%E1%BB%99i&limit=5"
```

Optional real AI generate smoke (only when explicitly approved):

```powershell
cd Backend
# Optional local override for 3-day Gemini smoke
$env:AGENT_TIMEOUT_SECONDS="60"
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"

curl.exe -X POST "http://localhost:8000/api/v1/itineraries/generate" `
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
- `GET /api/v1/places/search?city=Hà Nội&limit=5` trả list non-empty sau ETL khi bạn chủ động chạy ETL smoke.
- `POST /api/v1/itineraries/generate` trả `201 Created` sau khi có Goong data + Gemini key và khi bạn chủ động chạy AI smoke.
- Guest generate lưu `pendingClaim` vào `sessionStorage` rồi chuyển login; sau login claim trip và quay lại đúng `tripId`.
- Authenticated generate vào `/trip-workspace?tripId=...` và workspace load itinerary từ BE.
- Docker API container health endpoint trả healthy.

## FE verification

```powershell
cd Frontend
npm run build           # Production build phải pass
npm run test:e2e        # Playwright e2e tests (cần BE chạy trên localhost:8000)
```

FE build phải pass (production bundle). Playwright e2e tests hiện có `17` spec files ở `tests/e2e/` (14 top-level + 3 trong `b3/`; CI `frontend-e2e` green trên PR #109). Yêu cầu BE server chạy trước khi chạy e2e.

### Current evidence snapshot (2026-06-19)

```powershell
Set-Location "<repo-root>\\Backend"
uv run pytest tests/unit tests/integration -v --tb=short
```

Kết quả collect local (2026-06-24):

- Backend unit: `187 tests` collected
- Backend integration: `77 tests` collected (43 pass + 34 CI-gated skip local; chạy đủ trên CI postgres)

Companion chat smoke đã verify trên stack thật FE -> BE -> DB -> Redis:

- `POST /api/v1/itineraries/generate` → `201`
- `POST /api/v1/itineraries/chat-sessions/{sessionId}/messages` → `201`
- `GET /api/v1/itineraries/chat-sessions/{sessionId}/messages` → `200`

ETL scheduler smoke đã verify trên DB thật của project:

```powershell
Set-Location "<repo-root>\\Backend"
uv run python -m src.etl.scheduler --once --cities "Buôn Ma Thuột"
```

Kết quả mẫu:

- `Buôn Ma Thuột`: từ `0 places` lên `69 places`
- Scheduler hiện chạy local/manual loop; chưa được wire vào compose service hoặc CI schedule

### 00057 Manual Verification — Destination Data Quality Advisory

**Test destination selector and data quality warning**:

```powershell
# Start BE/FE
cd Backend
uv run uvicorn src.main:app --host localhost --port 8000

cd Frontend
npm run dev -- --host localhost --port 5173
```

**Browser test steps**:
1. Open http://localhost:5173/create-trip
2. Type "Đà Lạt" in destination field
3. Select "Đà Lạt" from suggestions (should show ⚠️ icon for partial city)
4. **Expected**: Yellow/amber warning box appears with text "Dữ liệu cho Đà Lạt hiện còn hạn chế..."
5. Select dates and click "Tạo Lịch Trình Với AI"
6. **Expected**: Submit allowed, generate API called, warning stays visible
7. Change destination to "Hà Nội"
8. **Expected**: Warning disappears (Hà Nội is ready city)
9. Type unsupported city like "Không Tồn Tại City"
10. **Expected**: Red validation error "chưa có trong danh sách được hỗ trợ", submit blocked

**API verification**:
```powershell
# Check Đà Lạt response has readiness fields
curl http://localhost:8000/api/v1/places/destinations | python -m json.tool | grep -A 10 "Đà Lạt"

# Verify:
# - placesCount: 10
# - hotelsCount: 2
# - isGenerateReady: true
# - readinessStatus: "partial"
# - readinessReason: "Dữ liệu cho Đà Lạt..."
```

Giữ đồng bộ URL khi chạy local:

```powershell
$env:VITE_API_URL="http://localhost:8000"
$env:E2E_BASE_URL="http://localhost:5173"
$env:E2E_API_URL="http://localhost:8000"
```

Backend CORS allow local frontend origins; docs/manual run should prefer `localhost:<port>`.

## Full-stack smoke script

```powershell
.\scripts\test_fullstack_smoke.ps1
```

Kiểm 16 luồng HTTP thật: health, auth, profile, trip CRUD, share/claim, places, FE home. Xem chi tiết kịch bản tại `docs/10_automation_testing_report.md`.

