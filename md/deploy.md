# 🚀 Hướng Dẫn Deploy & Chạy Local — Du Lịch Việt

> **Cập nhật:** 2025-03-03  
> **Repo:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system

---

# MỤC LỤC

- [PHẦN 1 — Chạy Local (FE + BE)](#phần-1--chạy-local-fe--be)
- [PHẦN 2 — Deploy Backend lên Render](#phần-2--deploy-backend-lên-render)
- [PHẦN 3 — Deploy Frontend lên Vercel](#phần-3--deploy-frontend-lên-vercel)
- [PHẦN 4 — Kết nối FE ↔ BE sau deploy](#phần-4--kết-nối-fe--be-sau-deploy)
- [PHẦN 5 — Kiểm tra End-to-End](#phần-5--kiểm-tra-end-to-end)
- [PHẦN 6 — Troubleshooting](#phần-6--troubleshooting)

---

# PHẦN 1 — Chạy Local (FE + BE)

## 1.1 Yêu cầu phần mềm

| Phần mềm         | Phiên bản | Kiểm tra           | Tải về                                         |
| ---------------- | --------- | ------------------ | ---------------------------------------------- |
| **Node.js**      | 18+       | `node --version`   | https://nodejs.org/                            |
| **Python**       | 3.11+     | `python --version` | https://www.python.org/downloads/              |
| **Docker**       | —         | `docker --version` | https://www.docker.com/products/docker-desktop |
| **Git**          | 2.x       | `git --version`    | https://git-scm.com/                           |

> Nếu dùng Docker cho PostgreSQL thì **không cần** cài PostgreSQL trực tiếp.

---

## 1.2 Các bước chi tiết

Cần **3 Terminal** chạy song song:

### 📌 Terminal 1 — Database (PostgreSQL via Docker)

```bash
# Lần đầu: tạo container PostgreSQL
docker run --name dulichviet-postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=dulichviet ^
  -p 5432:5432 -d postgres:16-alpine

# Kiểm tra container đang chạy
docker ps
```

> **Lần sau:** chỉ cần `docker start dulichviet-postgres`

> **Nếu không dùng Docker:** Cài PostgreSQL trực tiếp, tạo database `dulichviet`:
> ```sql
> CREATE DATABASE dulichviet;
> ```

---

### 📌 Terminal 2 — Backend (FastAPI)

```bash
# 1. Clone repo (bỏ qua nếu đã clone)
git clone https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system.git
cd NT208-ai-travel-itinerary-recommendation-system

# 2. Vào thư mục Backend
cd Backend

# 3. Tạo virtual environment (lần đầu)
python -m venv venv

# 4. Kích hoạt venv
venv\Scripts\activate              # Windows CMD / PowerShell
# source venv/bin/activate         # Linux / Mac

# 5. Cài đặt thư viện (lần đầu hoặc khi requirements.txt thay đổi)
pip install -r requirements.txt

# 6. Tạo file .env từ template
copy .env.example .env             # Windows
# cp .env.example .env             # Linux / Mac
```

**Mở file `Backend/.env` và sửa:**

```dotenv
# Database — giữ nguyên nếu dùng Docker command ở trên
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet

# JWT — thay bằng chuỗi random bất kỳ
# Tạo random: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=paste-chuoi-random-vao-day
JWT_ALGORITHM=HS256

# Gemini API key — lấy tại https://aistudio.google.com/apikey
# Nếu chưa có thì để trống, BE sẽ dùng fallback mock data
GEMINI_API_KEY=your-gemini-api-key

# CORS
FRONTEND_URL=http://localhost:5173
```

**Tiếp tục chạy:**

```bash
# 7. Seed 22 địa điểm mẫu (chạy 1 lần)
python seed_data.py
# Output: ✅ Seed hoàn tất: 22 places tạo mới, 0 đã tồn tại (skip)

# 8. Chạy Backend server
uvicorn main:app --port 8000
```

> ⚠️ **Windows:** Không dùng `--reload` vì có thể gây timeout. Chỉ dùng `uvicorn main:app --port 8000`.

**Kiểm tra BE đã chạy:**

```bash
# Mở browser hoặc dùng curl:
# Health check
curl http://localhost:8000/health
# → {"status":"healthy"}

# Swagger UI (mở trong browser)
http://localhost:8000/docs

# Danh sách destinations
curl http://localhost:8000/api/v1/destinations/
# → [...22 places...]
```

---

### 📌 Terminal 3 — Frontend (Vite + React)

```bash
# 1. Mở terminal MỚI, quay về thư mục gốc project
cd NT208-ai-travel-itinerary-recommendation-system

# 2. Cài đặt dependencies (lần đầu)
npm install
# ⏳ Có thể mất 2-5 phút

# 3. Chạy FE dev server
npm run dev
```

**Output:**

```
  VITE v6.3.5  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

---

### 📌 Terminal 4 — Chạy Test (tuỳ chọn)

```bash
cd Backend
venv\Scripts\activate
python test_full_api.py
# Output: 19/19 tests passed ✅
```

---

## 1.3 Truy cập ứng dụng

| Service      | URL                          | Mô tả                    |
| ------------ | ---------------------------- | ------------------------- |
| **Frontend** | http://localhost:5173        | Giao diện web             |
| **Backend**  | http://localhost:8000        | API server                |
| **Swagger**  | http://localhost:8000/docs   | API documentation & test  |
| **ReDoc**    | http://localhost:8000/redoc  | API docs (read-only)      |
| **Health**   | http://localhost:8000/health | Health check endpoint     |

## 1.4 Test flow trên browser

1. Mở http://localhost:5173
2. Click **Đăng ký** → Nhập email + password → Submit
3. Trang tự chuyển sang **Login** → Đăng nhập bằng email vừa tạo
4. Vào **Lập Kế Hoạch** → Chọn thành phố, ngày, budget → **Tạo Lịch Trình**
5. Xem kết quả → Đánh giá → Lưu
6. Vào **Lịch Trình Đã Lưu** → Xem danh sách trips
7. Vào **Hồ Sơ** → Xem/sửa thông tin cá nhân

**Dừng server:** Nhấn `Ctrl + C` ở mỗi terminal.

---

# PHẦN 2 — Deploy Backend lên Render

## 2.1 Đăng ký tài khoản Render

1. Truy cập **https://render.com**
2. Click **Get Started for Free**
3. Chọn **Sign up with GitHub** (nhanh nhất, tự link repo)
4. Authorize Render truy cập GitHub repositories

---

## 2.2 Tạo PostgreSQL Database

### Bước 1: Vào Dashboard → New → PostgreSQL

1. Ở Dashboard, click nút **New +** (góc trên phải)
2. Chọn **PostgreSQL**

### Bước 2: Điền form "Configure and deploy your new database"

| Field                  | Giá trị điền                | Ghi chú                                          |
| ---------------------- | --------------------------- | ------------------------------------------------- |
| **Name**               | `dulichviet-db`             | Tên hiển thị trên Dashboard                       |
| **Database** (Optional)| `dulichviet`                | Tên database thực tế, nếu để trống Render tự tạo random |
| **User** (Optional)    | _(để trống)_                | Render tự tạo random username, **KHÔNG cần điền** |
| **Region**             | `Oregon (US West)`          | Free tier chỉ có Oregon                           |
| **PostgreSQL Version** | `16`                        | Tương thích với project                           |
| **Datadog API Key**    | _(để trống)_                | Không cần                                         |
| **Datadog Region**     | `US1 (default)`             | Không cần thay đổi                                |
| **Plan**               | **Free**                    | $0/month, 256MB RAM, 1GB storage                  |

### Bước 3: Click "Create Database"

Đợi 1-2 phút để Render tạo xong.

### Bước 4: Copy thông tin kết nối

Sau khi tạo xong, vào trang database → tab **Info** hoặc **Connections**:

Bạn sẽ thấy:

```
Internal Database URL:
postgresql://dulichviet_db_xxxx_user:AbCdEfGh12345@dpg-xxxx-a.oregon-postgres.render.com/dulichviet

External Database URL:
postgresql://dulichviet_db_xxxx_user:AbCdEfGh12345@dpg-xxxx-a.oregon-postgres.render.com/dulichviet
```

**⚠️ QUAN TRỌNG:** Copy **Internal Database URL** và sửa thành async driver:

```
# GỐC (Render cung cấp):
postgresql://dulichviet_db_xxxx_user:AbCdEfGh12345@dpg-xxxx.oregon-postgres.render.com/dulichviet

# SỬA THÀNH (thêm +asyncpg):
postgresql+asyncpg://dulichviet_db_xxxx_user:AbCdEfGh12345@dpg-xxxx.oregon-postgres.render.com/dulichviet
```

> Chỉ thêm `+asyncpg` vào sau `postgresql` — giữ nguyên toàn bộ phần còn lại.

**Lưu URL này lại** — sẽ dùng ở bước tiếp theo.

---

## 2.3 Tạo Web Service (FastAPI Backend)

### Bước 1: Dashboard → New + → Web Service

1. Click **New +** → **Web Service**
2. Chọn **Build and deploy from a Git repository** → **Next**
3. Tìm và chọn repo: `KhoiBui16/NT208-ai-travel-itinerary-recommendation-system`
4. Click **Connect**

### Bước 2: Điền thông tin service

| Field              | Giá trị                                           | Ghi chú                        |
| ------------------ | ------------------------------------------------- | ------------------------------ |
| **Name**           | `dulichviet-api`                                  | Sẽ thành URL subdomain         |
| **Region**         | `Oregon (US West)`                                | Cùng region với database       |
| **Branch**         | `main`                                            |                                |
| **Root Directory** | `Backend`                                         | ⚠️ Quan trọng! Chỉ deploy thư mục Backend |
| **Runtime**        | `Python`                                          |                                |
| **Build Command**  | `pip install -r requirements.txt`                 |                                |
| **Start Command**  | `uvicorn main:app --host 0.0.0.0 --port $PORT`   | ⚠️ Không dùng --reload, dùng $PORT |
| **Instance Type**  | **Free**                                          | $0/month                       |

### Bước 3: Thêm Environment Variables

Cuộn xuống phần **Environment Variables**, click **Add Environment Variable** cho từng cặp:

| Key                          | Value                                                                 | Cách lấy                        |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `DATABASE_URL`               | `postgresql+asyncpg://xxxx...` (URL đã sửa ở bước 2.2)              | Copy từ PostgreSQL Info + thêm `+asyncpg` |
| `JWT_SECRET_KEY`             | `a1b2c3d4e5f6...` (chuỗi random 64 ký tự)                           | Chạy local: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM`              | `HS256`                                                               | Giữ nguyên                      |
| `GEMINI_API_KEY`             | `AIza...` (API key của bạn)                                          | Lấy tại https://aistudio.google.com/apikey |
| `FRONTEND_URL`               | _(để trống trước, sẽ update sau khi deploy FE)_                     | Update ở Phần 4                  |
| `DEBUG`                      | `False`                                                               | Tắt debug cho production        |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `1440`                                                                | Token hết hạn sau 24h           |

### Bước 4: Click "Create Web Service"

Render bắt đầu build:
1. **Clone repo** → chỉ lấy thư mục `Backend/`
2. **Install dependencies** → `pip install -r requirements.txt`
3. **Start server** → `uvicorn main:app --host 0.0.0.0 --port $PORT`

Đợi **3-5 phút** → Thấy **"Your service is live 🎉"** là thành công.

### Bước 5: Kiểm tra URL Backend

Render cho bạn URL dạng:
```
https://dulichviet-api.onrender.com
```

**Test ngay trên browser:**

| URL | Expect |
|-----|--------|
| `https://dulichviet-api.onrender.com/` | `{"status":"ok","message":"Du Lịch Việt API is running","docs":"/docs"}` |
| `https://dulichviet-api.onrender.com/health` | `{"status":"healthy"}` |
| `https://dulichviet-api.onrender.com/docs` | Swagger UI — 12 API endpoints |

> ⚠️ **Free tier:** Server tự tắt sau 15 phút không có request. Lần truy cập đầu tiên sẽ "cold start" khoảng 30-60 giây. Đây là bình thường.

---

## 2.4 Seed Data trên Production

Vì DB mới trống (không có places), cần seed data. **2 cách:**

### Cách A — Dùng Swagger UI (đơn giản nhất)

1. Mở `https://dulichviet-api.onrender.com/docs`
2. Bảng sẽ **tự tạo** khi server start (do `create_all()` trong lifespan)
3. Đăng ký user: `POST /api/v1/auth/register` → thử generate itinerary
4. **Lưu ý:** Nếu không seed thì danh sách destinations sẽ trống, nhưng AI generate vẫn hoạt động (Gemini tạo data)

### Cách B — Chạy seed_data.py qua Shell (nếu có paid plan)

Render Shell chỉ có trên **Starter plan ($7/month)**:
```bash
cd /opt/render/project/src
python seed_data.py
```

### Cách C — Tạo endpoint seed tạm thời (nếu cần seed cho free tier)

Thêm endpoint vào `main.py`:

```python
@app.post("/api/v1/admin/seed", tags=["Admin"])
async def seed_database():
    """Seed data — XÓA endpoint này sau khi seed xong!"""
    import subprocess
    result = subprocess.run(["python", "seed_data.py"], capture_output=True, text=True)
    return {"stdout": result.stdout, "stderr": result.stderr}
```

Gọi 1 lần: `POST https://dulichviet-api.onrender.com/api/v1/admin/seed` → Xong thì xóa endpoint.

---

# PHẦN 3 — Deploy Frontend lên Vercel

## 3.1 Đăng ký tài khoản Vercel

1. Truy cập **https://vercel.com**
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel truy cập GitHub

---

## 3.2 Import Project

### Bước 1: Add New Project

1. Dashboard → **Add New...** → **Project**
2. **Import Git Repository** → Tìm repo `NT208-ai-travel-itinerary-recommendation-system`
3. Click **Import**

### Bước 2: Configure Project

| Field                | Giá trị            | Ghi chú                                |
| -------------------- | ------------------ | --------------------------------------- |
| **Project Name**     | `dulichviet`       | Tự chọn, sẽ thành URL subdomain        |
| **Framework Preset** | `Vite`             | Vercel auto-detect từ vite.config.ts    |
| **Root Directory**   | `.` (mặc định)     | Giữ nguyên — package.json ở root       |
| **Build Command**    | `npm run build`    | Auto-filled                             |
| **Output Directory** | `dist`             | Auto-filled                             |
| **Install Command**  | `npm install`      | Auto-filled                             |

### Bước 3: Environment Variables

Click **Environment Variables** → Add:

| Key                  | Value                                               |
| -------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL`  | `https://dulichviet-api.onrender.com/api/v1`        |

> ⚠️ Thay `dulichviet-api` bằng tên thật Render đã cho bạn ở Phần 2.

> ⚠️ Biến Vite **phải** bắt đầu bằng `VITE_` thì FE mới đọc được.

### Bước 4: Click "Deploy"

Vercel bắt đầu build:
1. `npm install` → cài 283+ packages
2. `npm run build` → Vite build → output vào `dist/`
3. CDN deploy → URL public

**Đợi 1-2 phút** → Thấy **"Congratulations!"** + screenshot trang web.

### Bước 5: Lấy URL public

Vercel cho URL dạng:
```
https://dulichviet.vercel.app
```

hoặc:
```
https://nt208-ai-travel-itinerary-recommendation-system.vercel.app
```

**Mở browser → Thấy trang Home → Done!** 🎉

---

## 3.3 Cấu hình SPA Routing

File `vercel.json` đã có sẵn trong repo:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Đảm bảo mọi route (ví dụ `/login`, `/trip-planning`) đều trả về `index.html` để React Router xử lý. **Không cần làm gì thêm.**

---

# PHẦN 4 — Kết nối FE ↔ BE sau deploy

Sau khi có URL của cả 2:

## 4.1 Update CORS trên Render (cho BE nhận request từ FE)

1. Vào **Render Dashboard** → click vào service `dulichviet-api`
2. Tab **Environment** → Tìm `FRONTEND_URL`
3. Sửa value thành **URL Vercel đầy đủ**:
   ```
   https://dulichviet.vercel.app
   ```
4. Click **Save Changes**
5. Render **tự restart** service → Đợi 1-2 phút

## 4.2 Verify CORS hoạt động

Mở browser Console (F12) tại trang Vercel, chạy:

```javascript
fetch('https://dulichviet-api.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

Nếu thấy `{"status":"healthy"}` → CORS OK ✅  
Nếu thấy `CORS error` → kiểm tra lại `FRONTEND_URL` trên Render.

---

# PHẦN 5 — Kiểm tra End-to-End

## 5.1 Checklist sau deploy

| #  | Kiểm tra                              | URL / Action                                       | Expect                        |
| -- | ------------------------------------- | -------------------------------------------------- | ----------------------------- |
| 1  | BE Health                             | `GET https://YOUR-BE.onrender.com/health`          | `{"status":"healthy"}`        |
| 2  | BE Swagger                            | `https://YOUR-BE.onrender.com/docs`                | 12 API paths hiện             |
| 3  | BE Destinations                       | `GET https://YOUR-BE.onrender.com/api/v1/destinations/` | Response 200 + list places |
| 4  | FE Homepage                           | `https://YOUR-FE.vercel.app`                       | Trang Home load OK            |
| 5  | FE → BE Register                      | Click Đăng ký → điền form → submit                 | 201 Created, redirect login   |
| 6  | FE → BE Login                         | Đăng nhập email vừa tạo                            | Token lưu, redirect home      |
| 7  | FE → BE Generate                      | Trip Planning → tạo lịch trình                     | AI trả về itinerary           |
| 8  | FE → BE Saved                         | Vào Saved Itineraries                              | Hiện trips đã tạo             |
| 9  | FE → BE Profile                       | Vào Profile → xem/sửa info                        | 200 OK                        |
| 10 | CORS check                            | F12 Console → không có CORS error                  | Không lỗi cross-origin        |

## 5.2 URL tổng hợp

| Service          | Local                        | Production                                  |
| ---------------- | ---------------------------- | ------------------------------------------- |
| **Frontend**     | http://localhost:5173        | https://YOUR-FE.vercel.app                  |
| **Backend API**  | http://localhost:8000/api/v1 | https://YOUR-BE.onrender.com/api/v1         |
| **Swagger UI**   | http://localhost:8000/docs   | https://YOUR-BE.onrender.com/docs           |
| **Health Check** | http://localhost:8000/health | https://YOUR-BE.onrender.com/health         |

---

# PHẦN 6 — Troubleshooting

## 6.1 Render — Backend issues

### BE không start / build fail

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `ModuleNotFoundError` | Thiếu package | Kiểm tra `requirements.txt`, redeploy |
| `sqlalchemy.exc.OperationalError` | DATABASE_URL sai | Kiểm tra đã thêm `+asyncpg` chưa |
| `Connection refused` | DB chưa ready | Đợi 1-2 phút, check DB status trên Dashboard |
| Build timeout | requirements nặng | Render free tier slow, đợi 5-10 phút |

### Cold start lâu (30-60s)

- **Bình thường** với free tier — server tự tắt sau 15 phút
- Gửi 1 request "warm up" trước khi demo: `curl https://YOUR-BE.onrender.com/health`
- Upgrade **Starter plan ($7/month)** nếu cần always-on

### DATABASE_URL format

```
❌ SAI:  postgresql://user:pass@host/db
✅ ĐÚNG: postgresql+asyncpg://user:pass@host/db
```

## 6.2 Vercel — Frontend issues

### Blank page / 404 trên routes

- Kiểm tra `vercel.json` có rewrite rule: `"source": "/(.*)"` → `"/index.html"`
- Nếu chưa có, tạo file `vercel.json` ở root project

### API calls fail (CORS error)

- Kiểm tra `FRONTEND_URL` trên Render = URL Vercel chính xác (có `https://`, không có `/` cuối)
- Kiểm tra `VITE_API_BASE_URL` trên Vercel = URL Render + `/api/v1`
- Sau khi sửa env trên Vercel → **Redeploy** (Vercel → Deployments → Redeploy)

### Env var không nhận

- Biến Vite **phải** bắt đầu bằng `VITE_`
- Sau khi thêm/sửa env var trên Vercel → phải **Redeploy** mới có hiệu lực
- Check trong browser Console: `console.log(import.meta.env.VITE_API_BASE_URL)`

## 6.3 Local — Issues thường gặp

### `uvicorn --reload` bị timeout trên Windows

```bash
# KHÔNG dùng --reload:
uvicorn main:app --port 8000

# CHỈ dùng --reload khi chấp nhận restart chậm:
uvicorn main:app --reload --port 8000
```

### Port 5173 bị chiếm

```bash
# FE dùng port khác:
npx vite --port 5174
```

Nhớ cập nhật `FRONTEND_URL` trong `Backend/.env` thành `http://localhost:5174`.

### Docker PostgreSQL không kết nối

```bash
# Kiểm tra container đang chạy
docker ps

# Nếu container đã tạo nhưng chưa start
docker start dulichviet-postgres

# Xem logs
docker logs dulichviet-postgres
```

### pip install lỗi trên Windows

```bash
# Nếu lỗi bcrypt hoặc cryptography:
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

---

## 📝 Ghi chú quan trọng

### Giới hạn Free Tier

| Platform | Giới hạn | Ghi chú |
|----------|----------|---------|
| **Render Web Service** | Tự tắt sau 15p không request, cold start ~30-60s | Upgrade Starter $7/month để always-on |
| **Render PostgreSQL** | 256MB RAM, 1GB storage, **tự xóa sau 90 ngày** | Backup data trước khi hết hạn |
| **Vercel** | 100GB bandwidth/month, 100 deployments/day | Dư sức cho project |
| **Gemini API** | 60 requests/phút (free tier) | Đủ cho demo |

### Workflow tự động

- Mỗi lần `git push origin main`:
  - **Render:** Tự build lại Backend (2-5 phút)
  - **Vercel:** Tự build lại Frontend (1-2 phút)
- Không cần deploy thủ công sau lần đầu
