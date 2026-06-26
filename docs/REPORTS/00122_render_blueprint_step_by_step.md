# 00122 — Render Blueprint Step-by-Step Deploy Guide

**Task:** Hướng dẫn deploy lên Render (Blueprint) + Vercel theo `render.yaml` đã merge (PR #115).
**Branch:** Không phải branch code, chỉ report docs.
**Loại:** Documentation-only (không đổi runtime code).
**Ngày:** 2026-06-26.

> Mục tiêu: hướng dẫn deploy **step-by-step, copy-paste-first** cho user. Đi từ màn hình "New Blueprint" → nhập 6 env → sửa `DATABASE_URL` → Vercel FE → copy DB → smoke test. Không phức tạp, không jargon, chỉ việc làm.

---

## 1. Context

- Repo đã có `render.yaml` ở root (merged PR #115) theo đúng **Render Blueprint YAML Reference**
- `render.yaml` định nghĩa 3 tài nguyên: Postgres + Key Value (Redis) + Web Service (FastAPI)
- Cron ETL KHÔNG có trong blueprint (Render KHÔNG cho `plan: free` cho cron)
- Backend code dùng SQLAlchemy ASYNC → scheme `postgresql+asyncpg://` BẮT BUỘC

## 2. FACTS ĐÃ VERIFY (dùng nguyên, đừng bịa)

`render.yaml` trên main (sau PR #115) đã ĐÚNG theo official Render Blueprint YAML Reference (`render.com/docs/blueprint-spec`):

### Top-level structure
- **Top-level keys:** `databases`, `services` (KHÔNG có top-level `keyvalues:` hay `redis:`)
- **Key Value (Valkey):** là 1 service `type: keyvalue` TRONG `services:`
  - Tên: `dulichviet-redis`
  - Plan: `free`
  - Region: `singapore`
  - `ipAllowList: []` (internal-only, không expose ra Internet)
- **Web Service:**
  - Tên: `dulichviet-api`
  - `type: web`
  - `runtime: python`
  - `rootDir: Backend`
  - `buildCommand: pip install uv && uv sync --frozen --no-dev`
  - `startCommand: uv run uvicorn src.main:app --host 0.0.0.0 --port $PORT`
  - `healthCheckPath: /api/v1/health`
  - `autoDeployTrigger: 'off'` (tắt auto-deploy lần đầu)
- **DATABASE:**
  - Tên: `dulichviet-db`
  - Type: Postgres 16
  - Plan: `free`
  - Region: `singapore`
  - `databaseName: dulichviet`

### Wiring env vars
- `REDIS_URL` KHÔNG phải nhập tay → Render tự wire qua:
  ```yaml
  fromService:
    type: keyvalue
    name: dulichviet-redis
    property: connectionString
  ```
- 6 env `sync: false` mà Render sẽ prompt lúc tạo Blueprint:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `GOONG_API_KEY`
  - `FRONTEND_URL`
  - `CORS_ORIGINS`

## 3. BẢNG PASTE CHO 6 Ô (khi user đang ở màn Render Blueprint)

User đang ở **MÀN HÌNH TẠO BLUEPRINT**, Render dừng hỏi 6 giá trị `sync:false`. Bảng rõ ràng để copy-paste:

| Ô env | Dán gì NGAY LÚC NÀY | Lấy từ đâu |
|---|---|---|
| `JWT_SECRET_KEY` | Bấm nút **Generate** (Render tự sinh random mạnh) | Render UI |
| `GEMINI_API_KEY` | Copy giá trị từ `GEMINI_API_KEY=` trong `Backend/.env` | `Backend/.env` (KHÔNG commit) |
| `GOONG_API_KEY` | Copy GIÁ TRỊ từ `GOONG_MAP_API_KEY=` trong `Backend/.env` (cùng value, đổi tên key) | `Backend/.env` |
| `DATABASE_URL` | `postgresql+asyncpg://placeholder:placeholder@placeholder/db` (SỬA LẠI SAU) | Placeholder tạm |
| `FRONTEND_URL` | `https://placeholder.vercel.app` (SỬA LẠI SAU) | Placeholder tạm |
| `CORS_ORIGINS` | `["https://placeholder.vercel.app"]` (SỬA LẠI SAU) | Placeholder tạm |

**Sau khi dán đủ 6 ô** → bấm **Apply** (hoặc **Create**).

**Lưu ý:**
- `JWT_SECRET_KEY`: Bấm Generate là an toàn nhất (Render sinh 32+ ký tự random mạnh)
- `GEMINI_API_KEY`: Nếu không có → app vẫn boot nhưng generate AI sẽ fail (503)
- `GOONG_API_KEY`: ETL cần. Nếu không có → ETL fail nhưng app vẫn chạy
- `DATABASE_URL`/`FRONTEND_URL`/`CORS_ORIGINS`: Dán placeholder trước, sửa sau

## 4. SAU KHI TẠO XONG — SỬA DATABASE_URL (BƯỚC QUAN TRỌNG NHẤT)

Render sẽ tạo 3 resources. `dulichviet-api` deploy lần đầu **SẼ FAIL** (do `DATABASE_URL` placeholder) → **BÌNH THƯỜNG**. Bạn cần sửa lại:

### 4.1 Lấy Internal Database URL

1. Vào resource `dulichviet-db` (trong Render Dashboard)
2. Tab **Connections**
3. Copy **Internal Database URL**
   - Dạng: `postgresql://user:pass@d-xxxx.render.com:5432/dulichviet`

### 4.2 Sửa `DATABASE_URL` trong `dulichviet-api`

1. Vào resource `dulichviet-api`
2. Tab **Environment**
3. Tìm env `DATABASE_URL` → **Edit**
4. Dán Internal URL vừa copy
5. **ĐỔNG PHẦN ĐẦU:** đổi `postgresql://` → `postgresql+asyncpg://`
   - Sai: `postgresql://user:pass@d-xxxx.render.com:5432/dulichviet`
   - Đúng: `postgresql+asyncpg://user:pass@d-xxxx.render.com:5432/dulichviet`
6. Giữ nguyên phần sau (user:pass@host:port/db)
7. **Lý do:** Code dùng SQLAlchemy ASYNC, scheme BẮT BUỘC `postgresql+asyncpg://`
8. Save Changes

### 4.3 Deploy lại

1. `dulichviet-api` → **Manual Deploy** → **Deploy latest commit**
2. Chờ build (uv install) + boot. Free tier cold-start 30–50s là bình thường.
3. Kiểm tra Logs xem có lỗi gì không

## 5. Smoke test backend

Mở trình duyệt, truy cập:
```
https://dulichviet-api.onrender.com/api/v1/health
```
Expect: HTTP 200 với body `{"status":"healthy"}`.

Nếu fail:
- Kiểm tra Render Logs (tab **Logs**)
- Thường là `DATABASE_URL` scheme sai → xem lại mục 4.2
- Đảm bảo `GEMINI_API_KEY` đã có (nếu không có → app vẫn boot nhưng generate AI fail)

## 6. BƯỚC 3 (VERCEL FE) — sau khi BE health 200

Thứ tự deploy quan trọng vì có chicken-and-egg:
- FE cần `VITE_API_URL` = URL Render (build-time)
- BE cần `CORS_ORIGINS`/`FRONTEND_URL` = URL Vercel

### 6.1 Tạo project Vercel

1. Vercel Dashboard → **Add New** → **Project**
2. Import repo GitHub: `KhoiBui16/NT208-ai-travel-itinerary-recommendation-system`
3. **Configure Project:**
   - **Project Root:** `Frontend` (KHÔNG phải repo root)
   - **Framework Preset:** Vite (auto-detect)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

### 6.2 Thêm env var

1. Vào **Settings** → **Environment Variables**
2. Thêm:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://dulichviet-api.onrender.com` (hoặc URL Render production của bạn)
3. Save

**Lưu ý:** `VITE_*` được **bake vào bundle lúc build** → mỗi lần đổi env phải **redeploy**, không nhận live.

### 6.3 Deploy

1. Bấm **Deploy**
2. Chờ build (Vite sẽ bundle code)
3. Lấy **production URL** (vd: `https://dulichviet.vercel.app`)

### 6.4 Quay lại Render BE để sửa CORS/FRONTEND_URL

1. Vào `dulichviet-api` → **Environment**
2. Sửa 2 env:
   - `FRONTEND_URL = https://dulichviet.vercel.app` (URL Vercel production)
   - `CORS_ORIGINS = ["https://dulichviet.vercel.app"]` (JSON array)
3. **QUAN TRỌNG:**
   - `CORS_ORIGINS` PHẢI là JSON array: `["https://..."]`
   - KHÔNG dùng `*` (vì app bật `allow_credentials=True`)
4. Save Changes
5. `dulichviet-api` → **Manual Deploy** lại

### 6.5 Redeploy Vercel (nếu cần)

- Thường không cần, vì `VITE_API_URL` không đổi
- Chỉ redeploy nếu bạn lỡ deploy Vercel trước khi có URL Render

## 7. BƯỚC 4 (COPY DB) — tóm tắt

### 7.1 Tại sao copy DB (Option A)

**Tại sao KHÔNG recrawl?**
- Recrawl 28 city = ~2100+ Goong Place Detail call → cạn free tier ngay
- Local đã crawl xong → quota-safe
- Destination ID non-contiguous (2, 29–78) + 267 activity reference place → dump nguyên vẹn giữ FK
- 1563 real Goong place (không dummy) → data đã có giá trị

### 7.2 Cleanup local

```bash
# Chạy từ repo root
docker compose exec api python -m src.etl.cleanup
```
- Fix 85 place contamination (80 reassignable, 5 duplicate, 1 referenced-invalid)
- Idempotent — chạy nhiều lần cũng an toàn

### 7.3 Dump data-only

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

### 7.4 Restore lên Render

```bash
# Chạy LOCAL, KHÔNG paste URL này vào chat/docs
psql "$RENDER_EXTERNAL_DB_URL" < local_data.sql
```

- `$RENDER_EXTERNAL_DB_URL`: External Database URL từ `dulichviet-db` → **Connections** → **External Database URL**
- **CHỈ DÙNG LOCAL**, KHÔNG paste vào chat/docs/commit

### 7.5 Migration — TỰ ĐỘNG qua preDeployCommand (KHÔNG cần Render Shell)

`render.yaml` (PR #117) đã có `preDeployCommand: uv run alembic upgrade head` trong web service `dulichviet-api`. Render tự chạy lệnh này **sau build, trước uvicorn, mỗi deploy** → tự tạo toàn bộ 9 bảng. Bạn **KHÔNG cần làm gì** — và cũng **KHÔNG LÀM ĐƯỢC** thủ công vì Render `plan: free` không có tab Shell (Shell chỉ có plan Starter trở lên).

Verify migration đã chạy (sau deploy thành công):
- Xem tab **Logs** của `dulichviet-api`: phải thấy `INFO [alembic.runtime.migration] Running upgrade ...` lên `0009`.
- `GET /api/v1/places/destinations` → **200 `[]`** (DB có bảng, chưa có data cho tới Bước 4 copy DB).
- Nếu trả **500** → preDeployCommand chưa tạo được schema. 2 nguyên nhân: (a) **Logs KHÔNG có dòng `Running 'uv run alembic upgrade head'`** → service chưa nhận preDeployCommand mới (vì tạo từ render.yaml cũ) → phải **Sync Blueprint** hoặc **set Pre-Deploy Command thủ công** trong Settings rồi redeploy (xem STAGING_DEPLOYMENT_GUIDE §7.9); (b) Logs CÓ chạy alembic nhưng lỗi → kiểm tra traceback (thường `DATABASE_URL` scheme sai).

### 7.6 Verify counts (psql — robust)

```bash
# Chạy LOCAL với External Database URL (KHÔNG paste URL vào chat)
psql "$RENDER_EXTERNAL_DB_URL" \
  -c "SELECT count(*) AS destinations FROM destinations;" \
  -c "SELECT count(*) AS places FROM places;"
```
- Expect: `destinations = 28`, `places ≈ 1564` (1563 Goong + 1 ETL)
- Dùng psql (robust, không phụ thuộc import Python nội bộ — tránh lỗi path symbol).

### 7.7 Redis cache — KHÔNG cần flush (tự expire)

- Redis chỉ là cache (places/destinations) + quota counter, có TTL tự expire
  (places ~1h, destinations ~24h) → sau copy DB, cache stale tự refresh, không mất data chính.
- **Restart `dulichviet-api` KHÔNG flush Redis** (Redis là service riêng `dulichviet-redis`).
- Nếu muốn flush ngay (tùy chọn, hiếm khi cần): Render Dashboard → `dulichviet-redis`
  → **Flush/Reset**, hoặc chỉ cần đợi TTL hết hạn.

## 8. RENDER FREE-TIER CAVEATS (ghi rõ)

### Postgres Free (dulichviet-db)
- **BỊ XÓA SAU THỜI HẠN FREE TIER** → Render sẽ gửi email cảnh báo trước hạn
- **Hành động cần làm:**
  - Dump dữ liệu định kỳ (ví dụ: hàng tuần)
  - **TRƯỚC KHI HẾT HẠN:** dump hoặc nâng lên plan trả phí (không mất data production)
  - External Database URL có thể thay đổi sau khi nâng plan → cần cập nhật `DATABASE_URL`

### Key Value / Redis Free (dulichviet-redis)
- **Ephemeral** → có thể restart khi Render maintenance
- **Quota AI sẽ reset** khi service restart → user cần biết điều này
- **KHÔNG mất data chính** (Redis chỉ dùng cho cache + quota, không phải DB chính)
- `ipAllowList: []` → chỉ cho phép kết nối nội bộ Render (private network)

### Web Service Free (dulichviet-api)
- **Spin-down** → idle ~15 phút → sleep
- **Cold-start 30–50s** → request đầu sau sleep sẽ chậm hơn (BÌNH THƯỜNG)
- `autoDeployTrigger: 'off'` → tắt auto-deploy lần đầu, nên bật lại sau khi staging ổn định

### Cron Jobs (ETL)
- **KHÔNG CÓ CRON FREE** → Render chỉ cho cron trên `plan: starter` (trả phí)
- **GIẢI PHÁP:** chạy ETL manual từ **local** chống Render **External Database URL** khi cần (free tier KHÔNG có Render Shell; migration/schema thì đã tự chạy qua `preDeployCommand`)
- Sau khi staging ổn định + quota reset, có thể targeted ETL từng city

## 9. Go / No-Go

**CÓ — deploy-ready ngay:**

1. Render Blueprint import + nhập 6 secret + **hand-edit DATABASE_URL scheme**
2. Vercel FE (set `VITE_API_URL`) → set CORS/FRONTEND_URL trên BE + redeploy
3. Copy DB local → Render (Option A)
4. Smoke pass

**Caveat chấp nhận:**
- 4 city degraded (Châu Đốc/Côn Đảo=0, Tây Ninh=3, Vịnh Hạ Long=5) → graceful (422 + FE advisory), **KHÔNG block**
- Render free Postgres bị xóa sau hạn → dump/nâng plan trước hạn

## 10. Report file

`docs/REPORTS/00122_render_blueprint_step_by_step.md` (file này).

## 11. Input user cần cung cấp

- Vercel project access + Render workspace access
- 6 secret VALUE (chỉ trong Render UI, KHÔNG paste chat/docs/commit):
  - `DATABASE_URL` (sau hand-edit)
  - `JWT_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `GOONG_API_KEY`
  - `CORS_ORIGINS`
  - `FRONTEND_URL`
- **Render External Database URL** (để restore dump — local-only)
- Quyết định: copy DB (Option A, YES) + bật cron ban đầu (NO)
