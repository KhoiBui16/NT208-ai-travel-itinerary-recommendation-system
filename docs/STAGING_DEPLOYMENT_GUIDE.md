# Staging Deployment Guide

Ngày cập nhật: 2026-06-02

## 1. Mục tiêu

Tài liệu này chốt cách deploy staging theo **current source truth** (HEAD `#109`, Phase C.0–C.4 đã merge).

Mục tiêu của staging:

- deploy được frontend và backend thật trên internet;
- giữ đúng behavior hiện tại của app (`C.1` generate, auth, share, claim, workspace);
- không thêm hạ tầng/serverless mode mà source hiện tại chưa hỗ trợ;
- manual-first, chưa ép CI/CD deploy tự động khi smoke test staging còn chưa khóa.

## 2. Source truth ảnh hưởng đến deployment

| Area | Current truth | Deployment implication |
|---|---|---|
| Frontend app | Vite React SPA dùng `createBrowserRouter` | Hosting phải có SPA rewrite fallback về `index.html` |
| Frontend API base | `VITE_API_URL` | Vercel chỉ cần set đúng backend URL |
| Backend runtime | FastAPI + `uvicorn`, process dài hạn | Hợp với Render Web Service; không hợp với Vercel serverless mặc định |
| Database driver | async Postgres URL (`postgresql+asyncpg` scheme) | Cần Postgres TCP connection string chuẩn |
| Redis driver | Redis TCP URL (`redis` / `rediss` scheme) | Cần Redis TCP-compatible; không dùng Upstash REST |
| Health endpoint | `/api/v1/health` | Dùng làm health check path trên Render |
| CORS config | `CORS_ORIGINS` + `FRONTEND_URL` | Phải set rõ Vercel URL(s); `FRONTEND_URL` không thay thế `CORS_ORIGINS` |
| Migration config | Source chỉ có `DATABASE_URL`, không có `ALEMBIC_DATABASE_URL` field riêng | Nếu migration cần URI khác, override thủ công cho lệnh migration thay vì giả vờ source đã hỗ trợ sẵn |
| AI generate | Runtime cần `GEMINI_API_KEY` nếu muốn smoke generate thật | Staging không test được generate end-to-end nếu thiếu key |
| ETL | Runtime hỗ trợ `GOONG_API_KEY`, nhưng không bắt buộc cho app boot | Có thể deploy app trước, ETL/scheduler chốt sau |

## 3. Kiến trúc staging đề xuất

```mermaid
flowchart LR
    Browser["User Browser"] --> Vercel["Vercel<br/>Frontend Vite SPA"]
    Vercel --> RenderAPI["Render Web Service<br/>FastAPI + Uvicorn"]
    RenderAPI --> Postgres["Managed Postgres<br/>Render Postgres hoặc Supabase"]
    RenderAPI --> Redis["Managed Redis TCP<br/>Render Key Value / Redis provider"]
    RenderAPI --> Gemini["Gemini API"]
    RenderAPI --> Goong["Goong API (optional runtime, required for live ETL)"]
```

## 4. Quyết định platform

| Component | Platform | Reason |
|---|---|---|
| Frontend | Vercel | Vite SPA build nhanh, CDN ổn, preview URL tiện cho review |
| Backend | Render Web Service (native Python trước) | Hợp với FastAPI + `uvicorn`, không cần ép Docker từ đầu |
| Database | Render Postgres ưu tiên; Supabase là phương án 2 | Render Postgres đơn giản hơn vì app chỉ có một `DATABASE_URL`; Supabase cần chú ý pooler/migration |
| Redis | Render Key Value / Redis TCP-compatible provider | Source dùng Redis TCP client, không dùng REST |
| Deploy automation | Manual dashboard deploy trước | Giảm rủi ro trong lúc staging URL, env, migration flow còn chưa khóa |

### So sánh option

| Option | Stack | Pros | Cons | Source compatibility | Recommendation |
|---|---|---|---|---|---|
| A | Vercel + Render Python + Render Postgres + Render Redis | Thiết lập đơn giản nhất, ít moving parts | Tốn phí hơn full-free | Rất cao | **Recommended** |
| B | Vercel + Render Python + Supabase Postgres + Render Redis | Có free/cheap DB tốt, UI DB mạnh | Cần chú ý pooler/migration URL | Cao, nhưng ops phức tạp hơn | Dùng khi đã có Supabase |
| C | Vercel + Render Docker + managed Postgres/Redis | Giữ runtime giống Docker local | Build chậm hơn, debug deploy nặng hơn | Cao | Fallback nếu native Render gặp blocker thực |
| D | Vercel FE + Vercel serverless BE + Upstash REST | Có vẻ rẻ/nhanh lúc đầu | Không khớp runtime/source hiện tại | Thấp | Không khuyến nghị |

## 5. Env var checklist

### 5.1 Frontend (Vercel)

| Variable | Required? | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | URL backend Render, ví dụ `https://dulichviet-api.onrender.com` |

### 5.2 Backend (Render)

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres URL dùng cho app runtime; app source hiện chỉ có 1 field này |
| `REDIS_URL` | Yes | Redis TCP URL từ provider, dùng scheme `redis` hoặc `rediss` |
| `JWT_SECRET_KEY` | Yes | Secret mạnh, không dùng default local |
| `GEMINI_API_KEY` | Yes nếu muốn test generate thật | Không có thì app vẫn boot, nhưng generate AI thật sẽ fail |
| `GOONG_API_KEY` | Optional cho app runtime, required cho live ETL | Nếu staging chỉ verify app đã có data sẵn thì có thể để sau |
| `FRONTEND_URL` | Yes | Canonical Vercel URL dùng cho reset/share links |
| `CORS_ORIGINS` | Yes | Khuyến nghị format JSON array |
| `APP_DEBUG` | Yes | Set `false` trên staging internet-facing |
| `ENVIRONMENT` | Yes | Khuyến nghị `production` cho staging public để giữ production validator |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Optional | Chỉ cần nếu muốn test email reset thật |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | Optional | Có ích nếu bật SMTP |
| `ENABLE_ANALYTICS` | Optional | Giữ `false` (C.5 Analytics chưa implement) |
| `ANALYTICS_DATABASE_URL` | Optional | Chỉ cần nếu bật analytics |
| `RATE_LIMIT_AI_FREE` | Optional, default 3 | Số lượt AI generate/ngày cho guest |
| `RATE_LIMIT_AI_CHAT_USER` | Optional, default 20 | Quota companion chat/ngày cho auth user |
| `RATE_LIMIT_AI_APPLY_PATCH_USER` | Optional, default 20 | Quota apply-patch/ngày cho auth user |
| `AI_RATE_LIMIT_FAIL_MODE` | Optional, default `closed` | `closed` = fail-closed (trả 503) khi Redis down; KHÔNG set `open` trên staging internet-facing |
| `ETL_UPDATE_INTERVAL_DAYS` | Optional, default 30 | Khoảng refresh (ngày) cho ETL scheduler |
| `ETL_MAX_PLACES_PER_CITY` | Optional, default 75 | Giới hạn places crawl mỗi city khi chạy ETL |

### 5.3 CORS format đề xuất

Khuyến nghị set `CORS_ORIGINS` thành JSON array để pydantic parse ổn định:

```txt
["https://dulichviet-staging.vercel.app","https://dulichviet-git-main-<team>.vercel.app"]
```

`FRONTEND_URL` nên là canonical URL duy nhất, ví dụ:

```txt
https://dulichviet-staging.vercel.app
```

### 5.4 Goong key model (pre-deploy truth)

Ứng dụng hiện chỉ dùng **một Goong REST key server-side**, không có map-tiles key riêng:

| Mặt | Env | Vai trò | Nơi expose |
|---|---|---|---|
| Backend / ETL / geocode / autocomplete / place detail | `GOONG_API_KEY` (canonical) | REST key server-side | Chỉ backend, KHÔNG đưa ra FE |
| Frontend | — (chưa có) | FE hiện không render map và không đọc key Goong nào | — |

Lưu ý:

- `Backend/src/core/config.py` chấp nhận alias legacy `GOONG_MAP_KEY` / `GOONG_MAP_API_KEY` (đều map vào cùng trường `goong_api_key`), nhưng **canonical là `GOONG_API_KEY`** — `render.yaml` dùng tên này.
- Các alias trên **không phải** "map-tiles key public"; chúng chỉ là tên tương thích, vẫn là REST key server-side. Đừng dán vào Vercel public env.
- Goong cấp 2 loại key (map-tiles public + REST server) nhưng app hiện chỉ cần REST. Khi sau này thêm map tile thật ở FE, mới giới thiệu một public `VITE_GOONG_MAP_KEY` riêng (map-tiles key, URL-restricted) và **không bao giờ** expose REST `GOONG_API_KEY` ở FE/Vercel public env.

## 6. Vercel frontend setup

### 6.1 Cấu hình project

| Setting | Value |
|---|---|
| Project root | `Frontend` |
| Framework | `Vite` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` |

### 6.2 SPA rewrite

Frontend dùng `createBrowserRouter`, nên deep links như `/trip-library`, `/trip-workspace`, `/shared/:token` cần fallback về `index.html`.

Repo đã thêm file:

```txt
Frontend/vercel.json
```

với rewrite:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 6.3 Bước 3 (Vercel FE) — sau khi BE health 200

Thứ tự deploy quan trọng vì có chicken-and-egg:
- FE cần `VITE_API_URL` = URL Render (build-time)
- BE cần `CORS_ORIGINS`/`FRONTEND_URL` = URL Vercel

**Các bước:**

1. **Tạo project Vercel:**
   - Vercel Dashboard → **New Project** → Import repo GitHub
   - Project root = `Frontend` (KHÔNG phải repo root)
   - Framework preset = **Vite** (auto-detect từ `vite.config.ts`)

2. **Thiết lập môi trường (Environment Variables):**
   - Vào **Settings** → **Environment Variables**
   - Thêm: `VITE_API_URL = https://dulichviet-api.onrender.com` (hoặc URL Render production của bạn)
   - Lưu ý: `VITE_*` được **bake vào bundle lúc build** → mỗi lần đổi env phải **redeploy**, không nhận live.

3. **Deploy:**
   - Bấm **Deploy**
   - Chờ build (Vite sẽ bundle code)
   - Lấy **production URL** (vd: `https://dulichviet.vercel.app`)

4. **Quay lại Render BE để sửa CORS/FRONTEND_URL:**
   - Vào `dulichviet-api` → **Environment** → sửa 2 env:
     - `FRONTEND_URL = https://dulichviet.vercel.app` (URL Vercel production)
     - `CORS_ORIGINS = ["https://dulichviet.vercel.app"]` (JSON array, KHÔNG dùng `*` vì app bật `allow_credentials=True`)
   - Save Changes → **Manual Deploy** lại `dulichviet-api`

5. **Redeploy Vercel nếu cần:**
   - Thường không cần, vì `VITE_API_URL` không đổi
   - Chỉ redeploy nếu bạn lỡ deploy Vercel trước khi có URL Render

**Ghi lại:**
- Production URL (canonical)
- Preview URL pattern (nếu dùng preview deployments)

**Lưu ý quan trọng:**
- Tổng env trên Vercel giới hạn 64KB
- `vercel.json` đã có rewrite rule cho SPA (`/(.*) → /index.html`)
- Nếu URL Render đổi → phải cập nhật `VITE_API_URL` → redeploy Vercel

## 7. Render backend setup với Blueprint

**QUAN TRỌNG:** Repo đã có `render.yaml` ở root (merged PR #115). Bạn KHÔNG cần config thủ công từng service. Render Blueprint sẽ tự động tạo và kết nối tất cả resources.

### 7.1 render.yaml — Đặc tả hạ tầng (Infrastructure as Code)

`render.yaml` khai báo 3 tài nguyên chính theo đúng **Render Blueprint YAML Reference** (`render.com/docs/blueprint-spec`):

| Tài nguyên | Type | Tên trong render.yaml | Mục đích |
|---|---|---|---|
| **Postgres Database** | `databases` | `dulichviet-db` | Database chính (plan: free, region: singapore, databaseName: dulichviet) |
| **Key Value (Redis)** | `services` → `type: keyvalue` | `dulichviet-redis` | Cache + AI rate limit fail-closed (plan: free, region: singapore, ipAllowList: [] = internal-only) |
| **Web Service (FastAPI)** | `services` → `type: web` | `dulichviet-api` | Backend API (runtime: python, rootDir: Backend, plan: free, region: singapore) |

**LƯU Ý QUAN TRỌNG về schema:**
- KHÔNG có top-level `redis:` hay `keyvalues:` — Key Value là 1 service `type: keyvalue` TRONG `services:`
- REDIS_URL được wire tự động qua `fromService: { type: keyvalue, name: dulichviet-redis, property: connectionString }`
- Cron ETL KHÔNG có trong blueprint (Render KHÔNG cho `plan: free` cho cron). Chạy ETL manual qua Render Shell khi cần.

### 7.2 Bước 1 — Tạo Blueprint trên Render Dashboard

1. Vào **Render Dashboard** → **New** → **Blueprint**.
2. Chọn repo: `KhoiBui16/NT208-ai-travel-itinerary-recommendation-system`.
3. Chọn branch: `main` (hoặc branch có `render.yaml` mới nhất).
4. Render sẽ đọc `render.yaml` và hiển thị danh sách resources sẽ tạo + các env var cần nhập.

### 7.3 Bước 2 — Nhập 6 env var khi Render prompt

Render sẽ dừng và yêu cầu bạn nhập 6 giá trị cho env `sync:false`. **Bảng này để bạn copy-paste ngay lúc đó:**

| Ô env | Dán gì NGAY LÚC NÀY | Lấy từ đâu |
|---|---|---|
| `JWT_SECRET_KEY` | Bấm nút **Generate** (Render tự sinh random mạnh) | Render UI |
| `GEMINI_API_KEY` | Copy giá trị từ `GEMINI_API_KEY=` trong `Backend/.env` | `Backend/.env` (KHÔNG commit file này) |
| `GOONG_API_KEY` | Copy GIÁ TRỊ từ `GOONG_MAP_API_KEY=` trong `Backend/.env` (cùng value, đổi tên key thành `GOONG_API_KEY`) | `Backend/.env` |
| `DATABASE_URL` | `postgresql+asyncpg://placeholder:placeholder@placeholder/db` (SỬA LẠI SAU — DB chưa tạo lúc này) | Placeholder tạm |
| `FRONTEND_URL` | `https://placeholder.vercel.app` (SỬA LẠI SAU — cần URL Vercel) | Placeholder tạm |
| `CORS_ORIGINS` | `["https://placeholder.vercel.app"]` (SỬA LẠI SAU — cần URL Vercel) | Placeholder tạm |

**Sau khi dán đủ 6 ô** → bấm **Apply** (hoặc **Create**).

### 7.4 Bước 3 — Sửa DATABASE_URL (QUAN TRỌNG NHẤT)

Render sẽ tạo 3 resources. `dulichviet-api` deploy lần đầu **SẼ FAIL** (do `DATABASE_URL` placeholder) → **BÌNH THƯỜNG**. Bạn cần sửa lại:

1. Vào resource `dulichviet-db` → tab **Connections** → copy **Internal Database URL**.
   - Dạng: `postgresql://user:pass@d-xxxx.render.com:5432/dulichviet`
2. Vào resource `dulichviet-api` → **Environment** → tìm env `DATABASE_URL` → **Edit**:
   - Dán Internal URL vừa copy
   - **ĐỔNG PHẦN ĐẦU**: đổi `postgresql://` → `postgresql+asyncpg://`
   - Giữ nguyên phần sau (user:pass@host:port/db)
   - Lý do: Code dùng SQLAlchemy ASYNC, scheme BẮT BUỘC `postgresql+asyncpg://`
3. Save Changes.
4. `dulichviet-api` → **Manual Deploy** → **Deploy latest commit**.
5. Chờ build (uv install) + boot. Free tier cold-start 30–50s là bình thường.

### 7.5 Bước 4 — Smoke test backend

Mở trình duyệt, truy cập:
```
https://dulichviet-api.onrender.com/api/v1/health
```
Expect: HTTP 200 với body `{"status":"healthy"}`.

Nếu fail:
- Kiểm tra Render Logs xem có lỗi gì không (thường là `DATABASE_URL` scheme sai)
- Đảm bảo `GEMINI_API_KEY` đã có (nếu không có, app vẫn boot nhưng generate AI sẽ fail)

### 7.6 Cấu hình web service trong render.yaml

| Setting | Giá trị trong render.yaml | Ghi chú |
|---|---|---|
| Root directory | `Backend` | Đã hardcode trong YAML |
| Runtime | `python` | Native Python, không Docker |
| Build command | `pip install uv && uv sync --frozen --no-dev` | `uv` package manager, lockfile |
| Start command | `uv run uvicorn src.main:app --host 0.0.0.0 --port $PORT` | `$PORT` do Render inject |
| Health check path | `/api/v1/health` | Render dùng để check service alive |

### 7.7 Vì sao ưu tiên native Python trước

- Source hiện không cần system package lạ ngoài Python deps.
- `pyproject.toml` + `uv.lock` đã đủ cho build deterministic.
- Debug deploy nhanh hơn Docker build trong phase staging đầu.

### 7.8 Khi nào mới dùng Docker trên Render

Chỉ chuyển sang `Backend/Dockerfile` nếu có blocker thật như:
- native Python build không giữ được `uv` runtime như mong đợi;
- cần system dependency mà Render native khó cấp;
- cần parity chặt với local Docker hơn mức native service đang cho.

## 8. Database options

### Option 1 — Render Postgres (ưu tiên)

Pros:

- đơn giản nhất với current source;
- app chỉ cần 1 `DATABASE_URL`;
- migration/app thường dùng cùng một connection string được.

Khuyến nghị:

1. Tạo Render Postgres cùng region với Web Service.
2. Gán `DATABASE_URL` từ Render secret.
3. Chạy migration thủ công lần đầu.

### Option 2 — Supabase Postgres

Pros:

- dashboard và backup experience tốt;
- pooler thuận tiện cho app runtime.

Lưu ý rất quan trọng:

- Current source **không** có env riêng như `ALEMBIC_DATABASE_URL`.
- Nếu app runtime dùng một Supabase pooler URL còn migration cần URL khác, hãy override **thủ công cho lệnh migration** chứ không ghi docs như thể source đã hỗ trợ sẵn nhiều DB URL.

Ví dụ one-off migration trong Render Shell:

```bash
cd Backend
DATABASE_URL="<migration-friendly-postgres-url>" uv run alembic upgrade head
```

Nếu pooler/session URL hiện tại dùng được cho cả runtime và migration, cứ giữ một `DATABASE_URL` thống nhất.

### Bước 4 (Copy DB) — Import data local lên Render

**Tại sao copy DB (Option A) thay vì recrawl?**
- **Quota-safe:** Recrawl 28 city = ~2100+ Goong Place Detail call → cạn free tier ngay. Local đã crawl xong.
- **FK-safe:** Destination ID non-contiguous (2, 29–78) + 267 activity reference place → dump nguyên vẹn giữ FK, sạch hơn re-import rời rạc.
- **Data đã có giá trị:** 1563 real Goong place (không dummy).
- **Nhanh hơn:** Dump + restore < 30 phút vs recrawl multi-hour + quota risk.

**Các bước:**

1. **Cleanup local DB trước (fix contamination):**
   ```bash
   # Chạy từ repo root
   docker compose exec api python -m src.etl.cleanup
   ```
   - Lệnh này fix 85 place contamination (80 reassignable, 5 duplicate, 1 referenced-invalid)
   - Idempotent — chạy nhiều lần cũng an toàn

2. **Dump data-only từ local Postgres (trong Docker):**
   ```bash
   # Chạy từ repo root
   docker compose exec -T db pg_dump -U postgres -d dulichviet \
     --data-only \
     --exclude-table-data=alembic_version \
     -t destinations -t places -t hotels -t scraped_sources \
     -t users -t refresh_tokens -t itineraries -t trips -t trip_days \
     -t activities -t accommodations -t chat_sessions -t chat_messages \
     > local_data.sql
   ```
   - `--data-only`: chỉ dump data, không dump schema (schema đã có từ migration)
   - `--exclude-table-data=alembic_version`: không dump version migration (để alembic quản lý)
   - Dump theo FK order để tránh lỗi reference khi restore

3. **Restore lên Render Postgres:**
   ```bash
   # Chạy LOCAL, KHÔNG paste URL này vào chat/docs
   psql "$RENDER_EXTERNAL_DB_URL" < local_data.sql
   ```
   - `$RENDER_EXTERNAL_DB_URL`: External Database URL từ `dulichviet-db` → **Connections** → **External Database URL**
   - **CHỈ DÙNG LOCAL**, KHÔNG paste vào chat/docs/commit
   - Nếu cần TRUNCATE trước (restore đè):
     ```bash
     psql "$RENDER_EXTERNAL_DB_URL" -c \
       "TRUNCATE TABLE accommodations, activities, trip_days, trips, itineraries, refresh_tokens, users, scraped_sources, hotels, places, destinations CASCADE;"
     ```

4. **Chạy migration trên Render Shell:**
   ```bash
   # Render Shell → dulichviet-api
   cd Backend
   uv run alembic upgrade head
   uv run alembic check
   ```

5. **Verify data counts (psql — robust, không phụ thuộc import Python):**
   ```bash
   # Chạy LOCAL với External Database URL (KHÔNG paste URL vào chat)
   psql "$RENDER_EXTERNAL_DB_URL" \
     -c "SELECT count(*) AS destinations FROM destinations;" \
     -c "SELECT count(*) AS places FROM places;"
   ```
   - Expect: `destinations = 28`, `places ≈ 1564` (1563 Goong + 1 ETL)

6. **Redis cache — KHÔNG cần flush (tự expire):**
   - Redis chỉ là cache (places/destinations) + quota counter, có TTL tự expire
     (places ~1h, destinations ~24h) → sau copy DB, cache stale tự refresh, không mất data chính.
   - **Restart `dulichviet-api` KHÔNG flush Redis** (Redis là service riêng `dulichviet-redis`).
   - Nếu muốn flush ngay (tùy chọn, hiếm khi cần): Render Dashboard → `dulichviet-redis`
     → **Flush/Reset**, hoặc chỉ cần đợi TTL hết hạn.

**Lưu ý:**
- 4 city degraded (Châu Đốc/Côn Đảo=0, Tây Ninh=3, Vịnh Hạ Long=5) → graceful (422 + FE advisory), **KHÔNG block** deploy
- Sau khi staging ổn định, có thể chạy ETL targeted từng city: `python -m src.etl --cities "Châu Đốc"`

## 9. Redis options

| Option | Use? | Notes |
|---|---|---|
| Render Key Value / managed Redis | Yes | Phù hợp nhất với source contract hiện tại |
| Redis Cloud / provider TCP-compatible | Yes | Miễn là cấp TCP URI chuẩn |
| Upstash REST-only | No | Source hiện không dùng REST Redis client |

Redis staging cần cho:

- destination/place cache;
- AI rate limit fail-closed;
- behavior parity với local/fullstack evidence.

## 10. Migration strategy

Khuyến nghị giai đoạn đầu: **manual migration first**.

### 10.1 Cách làm an toàn

1. Tạo DB service trước.
2. Set đủ backend env vars.
3. Deploy backend lần đầu.
4. Mở Render Shell hoặc Pre-deploy Command.
5. Chạy:

```bash
cd Backend
uv run alembic upgrade head
uv run alembic check
```

6. Sau đó verify:

```txt
GET /api/v1/health
```

### 10.2 Sau khi staging ổn định hơn

- Có thể chuyển `uv run alembic upgrade head` vào Render Pre-Deploy Command.
- Chỉ làm sau khi đã xác nhận migration path ổn định và rollback plan rõ ràng.

## 11. Staging smoke test checklist

### 11.1 Backend / infra

- `GET /api/v1/health` trả `200` với `{"status":"healthy"}`
- Backend logs không có crash loop
- DB connection pass
- Redis connection pass

### 11.2 Frontend

- `/` render
- `/login` render
- `/register` render
- `/create-trip` render
- `/trip-library` redirect/login đúng
- `/shared/:token` load đúng khi có share link

### 11.3 Product flow

- auth register/login/logout
- trip library load
- workspace load
- share/public read-only boundary
- rate-limit error copy không crash UI
- nếu có `GEMINI_API_KEY`: generate một trip ngắn và verify workspace open

## 12. Rollback

### 12.1 Frontend

- Vercel: rollback về deployment trước qua dashboard

### 12.2 Backend

- Render: rollback về deployment trước
- nếu migration gây lỗi:

```bash
cd Backend
uv run alembic downgrade -1
```

Chỉ downgrade khi đã review migration impact; không làm mù.

## 13. CI/CD recommendation

### Giai đoạn 1 — manual-first

- Vercel manual deploy hoặc auto-deploy preview
- Render manual deploy
- migration manual
- smoke test manual

### Giai đoạn 2 — sau khi staging ổn định

- bật Vercel auto-deploy trên `main`
- bật Render auto-deploy trên `main`
- giữ GitHub required checks hiện tại làm merge gate
- sau khi URL staging ổn định, mới cân nhắc thêm:

```txt
.github/workflows/staging-smoke.yml
```

Workflow đó chỉ nên chạy safe checks như:

- `curl` frontend URL
- `curl` backend health
- optional Playwright smoke không cần secret mới ngoài URL

## 14. Known limitations (sau merge C3A/C3B/C3C/C4)

| Area | Current limitation |
|---|---|
| C3A/C3B/C3C/C4 | **Đã merge (#98–106):** chat session API, chat quota riêng, apply-patch stale handling, persisted chat history + session management |
| ETL scheduler | Opt-in qua compose profile `etl`; chưa auto-schedule 24/7 trên staging (chạy seed một lần trước deploy) |
| Analytics (C.5) | Chưa implement; `ENABLE_ANALYTICS=false`. Optional/deferred — cần guardrails (read-only role, allowlist, validator, audit) nếu bật |
| Goong data | 2 city zero-place (Châu Đốc, Côn Đảo) + 2 marginal (Tây Ninh=3, Vịnh Hạ Long=5); 23 city còn lại ≥15 place. Provider Goong không trả photo/rating/opening_hours → `places.image` rỗng + `rating`=0 (transformer default); FE dùng fallback có nhãn. Đây là giới hạn provider, KHÔNG phải bug |
| Render free-tier | **Postgres free bị xóa sau thời hạn free tier của Render** (kiểm tra dashboard/email cảnh báo — cần dump hoặc nâng plan trước hạn). Redis/Key Value dùng cho cache + AI quota (ephemeral chấp nhận được); **quota AI sẽ reset khi service restart** |
| Vercel env | `VITE_*` được bake lúc build → đổi env **phải redeploy** (không nhận live). Tổng env giới hạn 64KB |

## 14.1 Render Free-tier Caveats (QUAN TRỌNG)

Khi deploy dùng **Render free tier**, bạn PHẢI biết các giới hạn sau:

### Postgres Free (dulichviet-db)
- **BỊ XÓA SAU THỜI HẠN FREE TIER** → Render sẽ gửi email cảnh báo trước hạn
- **Hành động cần làm:**
  - Dump dữ liệu định kỳ (ví dụ: hàng tuần)
  - **TRƯỚC KHI HẾT HẠN:** dump hoặc nâng lên plan trả phí (không mất data production)
  - External Database URL có thể thay đổi sau khi nâng plan → cần cập nhật `DATABASE_URL`

### Key Value / Redis Free (dulichviet-redis)
- **Ephemeral** → có thể restart khi Render maintenance
- **Quota AI sẽ reset** khi service restart → user cần biết điều này (UX: hiện message "quota reset khi maintain")
- **KHÔNG mất data chính** (Redis chỉ dùng cho cache + quota, không phải DB chính)
- `ipAllowList: []` → chỉ cho phép kết nối nội bộ Render (private network), **KHÔNG expose ra Internet**

### Web Service Free (dulichviet-api)
- **Spin-down** → idle ~15 phút → sleep
- **Cold-start 30–50s** → request đầu sau sleep sẽ chậm hơn (BÌNH THƯỜNG)
- **Free tier có giới hạn CPU/RAM** → có thể chậm hơn plan trả phí
- `autoDeployTrigger: 'off'` → tắt auto-deploy lần đầu (để kiểm soát), nên bật lại sau khi staging ổn định

### Cron Jobs (ETL)
- **KHÔNG CÓ CRON FREE** → Render chỉ cho cron trên `plan: starter` (trả phí)
- **GIẢI PHÁP:** chạy ETL manual qua Render Shell khi cần (`cd Backend && uv run python -m src.etl`)
- Sau khi staging ổn định + quota reset, có thể targeted ETL từng city thay vì full crawl

### Monitoring
- Kiểm tra **Render Dashboard** thường xuyên:
  - `dulichviet-db` → tab **Metrics** (disk usage, connection count)
  - `dulichviet-redis` → tab **Metrics** (memory usage)
  - `dulichviet-api` → tab **Events** (deploy logs, crash history)
- **Đăng ký email alerts** cho:
  - Database disk usage > 80%
  - Service crash loop
  - Free tier expiration warning

## 15. Deployment recommendation ngắn gọn

Nếu cần một đường đi ít rủi ro nhất ngay bây giờ:

1. Deploy frontend lên **Vercel**
2. Deploy backend lên **Render native Python**
3. Dùng **Render Postgres** nếu muốn đơn giản nhất
4. Dùng **Render Redis** hoặc Redis TCP-compatible provider
5. Chạy migration **thủ công** lần đầu
6. Smoke test xong mới bật auto-deploy
