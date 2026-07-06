# Deployment Plan — DuLichViet

> Áp dụng sau khi Phase C hoàn tất. Chưa deploy khi code chưa xong.

## 2 lựa chọn

| | Free Tier | VPS Rẻ |
|---|---|---|
| Chi phí | 0 VND/tháng | ~€4-6/tháng (~100-160K VND) |
| Cold start | Có (Render sleep 15p) | Không |
| Redis | Tính sau / Upstash | Chạy nguyên docker-compose |
| Phù hợp | Demo môn học, portfolio | Production-like, không cold start |

---

## Option A: Free Tier (0 VND/tháng)

### Kiến trúc

```
┌─────────────────────────────────────────────────┐
│                 Vercel (Free)                    │
│              FE: React/Vite SPA                 │
│         dulichviet.vercel.app (hoặc custom)     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────┐
│                Render (Free)                     │
│            BE: FastAPI + Uvicorn                 │
│        dulichviet-api.onrender.com              │
│   (sleep sau 15p idle, cold start ~30s)         │
└────────┬─────────────────────┬──────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐  ┌─────────────────┐
│  Supabase (Free)│  │ Upstash (Free)  │
│  PostgreSQL 16  │  │ Serverless Redis│
│  500MB storage  │  │ 10K cmds/ngày   │
│  Không suspend  │  │ HTTP-based      │
└─────────────────┘  └─────────────────┘
```

### Bước 1: Tạo Supabase database

1. Đăng ký https://supabase.com (dùng GitHub account)
2. Tạo new project: name `dulichviet`, region `Southeast Asia (Singapore)`
3. Chờ project provision (~2 phút)
4. Vào **Settings → Database → Connection string → URI**
5. Copy connection string dạng:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. **Lưu lại** — đây là `DATABASE_URL` cho Render

**Lưu ý:** Supabase cung cấp 2 connection modes:
- **Transaction mode** (port 6543): Dùng cho app (connection pooling, рекомендовано)
- **Session mode** (port 5432): Dùng cho Alembic migration (cần session-level features)

Alembic cần session mode, app dùng transaction mode. Cấu hình:
- `DATABASE_URL` cho app: port **6543** (pooler)
- `ALEMBIC_DATABASE_URL` cho migration: port **5432** (direct)

### Bước 2: Deploy BE lên Render

1. Đăng ký https://render.com (dùng GitHub account)
2. **New → Web Service**
3. Connect repo `NT208-ai-travel-itinerary-recommendation-system`
4. Cấu hình:

| Setting | Value |
|---------|-------|
| Name | `dulichviet-api` |
| Root Directory | `Backend` |
| Runtime | **Docker** (dùng Dockerfile sẵn có) |
| Region | Singapore |
| Instance Type | Free |

5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `ALEMBIC_DATABASE_URL` | `postgresql+asyncpg://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET_KEY` | *(generate: `python -c "import secrets; print(secrets.token_hex(32))"`)* |
| `REDIS_URL` | *(để trống — không dùng Redis trên free tier)* |
| `ENVIRONMENT` | `production` |
| `FRONTEND_URL` | `https://dulichviet.vercel.app` (điền sau bước 3) |
| `APP_DEBUG` | `false` |

6. **Start Command** (override Docker CMD):
   ```
   sh -c "DATABASE_URL=$ALEMBIC_DATABASE_URL alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port $PORT"
   ```
   Render tự set `$PORT` (thường 10000). App phải listen trên port này.

7. **Advanced → Docker Command:** Chỉnh CMD thành:
   ```
   sh -c "DATABASE_URL=$ALEMBIC_DATABASE_URL alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port $PORT"
   ```

8. Click **Create Web Service** — Render sẽ build Docker image + deploy (~5 phút lần đầu)

9. Verify: mở `https://dulichviet-api.onrender.com/api/v1/health`

### Bước 3: Deploy FE lên Vercel

1. Đăng ký https://vercel.com (dùng GitHub account)
2. **Add New → Project**
3. Import repo `NT208-ai-travel-itinerary-recommendation-system`
4. Cấu hình:

| Setting | Value |
|---------|-------|
| Framework Preset | **Vite** |
| Root Directory | `Frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://dulichviet-api.onrender.com` |

6. Click **Deploy** — Vercel build + deploy (~1 phút)

7. Verify: mở URL Vercel cung cấp (ví dụ `https://dulichviet.vercel.app`)

8. **Quay lại Render**, update `FRONTEND_URL` = URL Vercel thực tế

### Bước 4: Giữ Render awake (anti-sleep)

Render free tier sleep sau 15 phút không có request. Dùng cron ping để giữ awake:

1. Đăng ký https://cron-job.org (free)
2. Tạo cron job:
   - URL: `https://dulichviet-api.onrender.com/api/v1/health`
   - Method: GET
   - Schedule: mỗi 14 phút
   - Timezone: UTC
3. Bật cron job

Kết quả: BE luôn sẵn sàng, không cold start.

### Code changes cần làm trước khi deploy

| File | Thay đổi |
|------|----------|
| `Frontend/vercel.json` | **Đã tạo** — SPA routing rewrite |
| `Backend/src/core/config.py` | Thêm `ALEMBIC_DATABASE_URL` field |
| `Backend/src/shared/cache.py` | Đã handle `redis=None` — không cần sửa |
| `Backend/src/core/rate_limiter.py` | Rate limiter cần `Redis` instance — cần thêm fallback khi `redis=None` (fail-open: cho phép request) |
| `Backend/src/core/dependencies.py` | `get_redis()` phải trả `None` khi `REDIS_URL` trống thay vì crash |
| `Frontend/src/app/services/api.ts` | `VITE_API_URL` đã support env var — không cần sửa |

### Hạn chế Free Tier

| Hạn chế | Impact | Workaround |
|---------|--------|------------|
| Render cold start 30s (nếu cron fail) | User chờ lâu lần đầu | cron-job.org ping mỗi 14p |
| Render 750h/tháng | ~31 ngày → đủ 1 tháng | Không chạy nhiều service |
| Supabase 500MB | Đủ cho demo | Không滥用ETL data |
| Không có Redis | Cache miss → DB query, rate limiter fail-open | Chấp nhận cho demo |
| Upstash 10K cmds/ngày | Dành cho Phase C AI | Tính sau |

---

## Option B: VPS Rẻ (~€4-6/tháng)

### Nhà cung cấp đề xuất

| Provider | Plan | Giá | Spec |
|----------|------|-----|------|
| Hetzner | CX22 | €4.15/tháng | 2 vCPU, 4GB RAM, 40GB SSD |
| DigitalOcean | Basic | $6/tháng | 1 vCPU, 1GB RAM, 25GB SSD |
| Vultr | Regular | $5/tháng | 1 vCPU, 1GB RAM, 25GB SSD |

**Khuyến nghị: Hetzner CX22** — rẻ nhất, RAM nhiều nhất, datacenter Singapore available.

### Kiến trúc

```
┌─────────────────────────────────────────────────────┐
│              VPS Hetzner (Ubuntu 24.04)              │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌───────┐  │
│  │  Nginx   │  │ FastAPI  │  │ PG16 │  │Redis7 │  │
│  │ reverse  │→ │ Uvicorn  │  │  DB  │  │ Cache │  │
│  │ proxy    │  │ :8000    │  │:5432 │  │ :6379 │  │
│  │ :443/:80 │  │          │  │      │  │       │  │
│  └──────────┘  └──────────┘  └──────┘  └───────┘  │
│                                                      │
│  docker-compose.yml — chạy tất cả                    │
└─────────────────────────────────────────────────────┘
         ▲
         │ HTTPS (Let's Encrypt)
         │
┌─────────────────┐
│  Vercel (Free)  │
│  FE static      │
│  hoặc Nginx     │
│  serve FE cùng  │
│  VPS            │
└─────────────────┘
```

### Bước 1: Setup VPS

```bash
# SSH vào VPS
ssh root@<vps-ip>

# Cài Docker + Docker Compose
curl -fsSL https://get.docker.com | sh

# Tạo user (không chạy app bằng root)
adduser deploy
usermod -aG docker deploy
su - deploy
```

### Bước 2: Clone repo + cấu hình

```bash
git clone https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system.git
cd NT208-ai-travel-itinerary-recommendation-system

# Tạo .env cho BE
cp Backend/.env.example Backend/.env
# Sửa Backend/.env:
#   DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/dulichviet
#   REDIS_URL=redis://redis:6379/0
#   JWT_SECRET_KEY=<generate>
#   ENVIRONMENT=production
#   FRONTEND_URL=https://<domain>
#   APP_DEBUG=false
```

### Bước 3: Chạy Docker Compose

```bash
docker compose up -d
```

Tất cả services (api + db + redis) chạy trong Docker. FE có thể:
- Chạy trên Vercel (free), `VITE_API_URL` trỏ về VPS
- Hoặc Nginx serve FE static từ VPS luôn

### Bước 4: Nginx reverse proxy + SSL

```bash
apt install nginx certbot python3-certbot-nginx -y

# Cấu hình Nginx
cat > /etc/nginx/sites-available/dulichviet << 'EOF'
server {
    listen 80;
    server_name <domain>;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://localhost:8000;
    }

    location / {
        root /var/www/dulichviet/frontend;
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -s /etc/nginx/sites-available/dulichviet /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL (cần domain trỏ DNS về VPS IP trước)
certbot --nginx -d <domain>
```

### Ưu điểm VPS

- Không cold start — server luôn sẵn sàng
- Chạy nguyên `docker-compose.yml` không sửa code
- Redis hoạt động đầy đủ (cache + rate limiter)
- Full control — học được DevOps thực tế
- 1 VPS chạy tất cả (FE + BE + DB + Redis)

### Nhược điểm VPS

- Trả phí hàng tháng
- Cần tự backup database (cron pg_dump)
- Cần tự quản lý SSL renewal (certbot auto-renew OK)
- Cần tự monitor (nếu server down phải tự khởi động lại)

---

## Checklist trước khi deploy

- [ ] Phase C hoàn tất
- [ ] Tất cả tests pass (unit + integration + e2e)
- [ ] `vercel.json` đã có trong repo
- [ ] `rate_limiter.py` handle `redis=None` (fail-open)
- [ ] `get_redis()` trả `None` khi `REDIS_URL` trống
- [ ] `ALEMBIC_DATABASE_URL` thêm vào config.py (Supabase cần 2 connection strings)
- [ ] `ENVIRONMENT=production` test local — app block JWT_SECRET_KEY yếu
- [ ] `.env` production không chứa dev defaults

## Quyết định

| Tiêu chí | Free Tier | VPS Hetzner |
|----------|-----------|-------------|
| Chi phí | 0 VND | ~100K VND/tháng |
| Cold start | Có (30s) nếu cron fail | Không |
| Redis | Không / Upstash | Đầy đủ |
| Setup | 30 phút | 1-2 giờ |
| Bảo trì | Không | Tự quản lý |
| Phù hợp | Demo môn học | Portfolio + thesis |
