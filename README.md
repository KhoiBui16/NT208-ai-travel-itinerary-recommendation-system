# NT208-ai-travel-itinerary-recommendation-system

A web-based AI recommendation system that generates personalized travel itineraries from user inputs.

---

## ✅ Prerequisites — Cần cài trước

| Phần mềm         | Phiên bản | Kiểm tra           | Tải về                                         |
| ---------------- | --------- | ------------------ | ---------------------------------------------- |
| **Node.js**      | 18+       | `node --version`   | https://nodejs.org/                            |
| **Python**       | 3.11+     | `python --version` | https://www.python.org/downloads/              |
| **PostgreSQL**   | 16+       | `psql --version`   | https://www.postgresql.org/download/           |
| **Git**          | 2.x       | `git --version`    | https://git-scm.com/                           |
| **Docker** (tuỳ) | -         | `docker --version` | https://www.docker.com/products/docker-desktop |

> **Lưu ý:** Nếu dùng Docker cho PostgreSQL thì **không cần** cài PostgreSQL trực tiếp.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Bước 1️⃣: Clone & Cài Frontend

```bash
# Clone repository
git clone https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system.git
cd NT208-ai-travel-itinerary-recommendation-system

# Cài đặt FE dependencies
npm install
```

**⏳ Lưu ý:** `npm install` có thể mất vài phút tùy thuộc vào tốc độ internet.

### Bước 2️⃣: Tạo Database PostgreSQL

**Cách A — Docker (khuyên dùng, nhanh nhất):**

```bash
# Pull và chạy PostgreSQL container
docker run --name dulichviet-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=dulichviet \
  -p 5432:5432 -d postgres:16-alpine

# Kiểm tra container đang chạy
docker ps
```

> Nếu lần sau muốn chạy lại: `docker start dulichviet-postgres`

**Cách B — Cài PostgreSQL trực tiếp:**

1. Tải PostgreSQL tại https://www.postgresql.org/download/
2. Cài đặt với password mặc định `postgres`
3. Mở pgAdmin hoặc psql, tạo database:

```sql
CREATE DATABASE dulichviet;
```

### Bước 3️⃣: Setup Backend (Python)

```bash
# Vào thư mục Backend
cd Backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
venv\Scripts\activate          # Windows (CMD hoặc PowerShell)
# source venv/bin/activate     # Linux/Mac

# Cài đặt thư viện Python
pip install -r requirements.txt
```

### Bước 4️⃣: Cấu hình file .env

```bash
# Copy file template .env
copy .env.example .env         # Windows
# cp .env.example .env         # Linux/Mac
```

Mở file `Backend/.env` và sửa các giá trị:

```dotenv
# Database — sửa password nếu khác 'postgres'
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet

# JWT — thay bằng chuỗi random (quan trọng cho bảo mật)
# Tạo random: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=thay-bang-chuoi-random-cua-ban

# Google Gemini API key (lấy tại https://aistudio.google.com/apikey)
# Nếu chưa có key thì để trống — BE sẽ dùng fallback mock data
GEMINI_API_KEY=your-gemini-api-key

# CORS — port FE đang chạy
FRONTEND_URL=http://localhost:5173
```

### Bước 5️⃣: Seed dữ liệu mẫu & Chạy Backend

```bash
# Seed 22 địa điểm từ 4 thành phố
python seed_data.py

# Chạy Backend server
uvicorn main:app --reload --port 8000
```

### Bước 6️⃣: Chạy Frontend (Terminal mới)

```bash
# Mở terminal mới, quay về thư mục gốc
cd NT208-ai-travel-itinerary-recommendation-system

# Chạy FE dev server
npm run dev
```

### 📱 Truy cập

| Service      | URL                          |
| ------------ | ---------------------------- |
| **Frontend** | http://localhost:5173        |
| **Backend**  | http://localhost:8000        |
| **Swagger**  | http://localhost:8000/docs   |
| **ReDoc**    | http://localhost:8000/redoc  |
| **Health**   | http://localhost:8000/health |

**Gợi ý:** Nhấn `Ctrl + C` (hoặc `Cmd + C` trên Mac) để dừng server.

---

## 🏗️ Kiến trúc Dự án (MVP #1)

### Tech Stack

| Layer        | Công nghệ                                   | Vai trò                    |
| ------------ | ------------------------------------------- | -------------------------- |
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite | Giao diện người dùng (SPA) |
| **Backend**  | Python + FastAPI                            | REST API server            |
| **Database** | PostgreSQL                                  | Lưu trữ dữ liệu            |
| **AI**       | Google Gemini / OpenAI                      | Tạo lịch trình thông minh  |

### Cấu trúc thư mục

```
📁 Root
├── Frontend/           # React app (FE code)
│   ├── FE_docs.md      # 📋 Tài liệu FE chi tiết
│   ├── main.tsx        # Entry point
│   ├── app/            # Components, pages, utils
│   └── styles/         # CSS, theme, Tailwind
├── Backend/            # FastAPI app (BE code) — Đã triển khai ✅
│   ├── BE_docs.md      # 📋 Tài liệu BE chi tiết
│   ├── main.py         # FastAPI entry point
│   ├── seed_data.py    # Seed dữ liệu mẫu
│   ├── requirements.txt
│   └── app/            # Config, models, schemas, routers, services
├── Diagram/            # Sơ đồ thiết kế hệ thống
│   ├── Database_MVP.png
│   ├── DFD.png
│   ├── Sequence_Guest.png
│   ├── Sequence_Register.png
│   ├── UML-Guest.png
│   ├── UML-Register.png
│   └── Diagram_docs.md  # 📋 Mô tả chi tiết diagrams
├── md/                 # Tài liệu dự án
│   ├── doc-MVP#1.md         # Phân tích use-cases & cạnh tranh
│   ├── requirement_MVP#1.md # Yêu cầu MVP #1
│   ├── MVP1_summary.md      # 📋 Tổng hợp phân tích MVP
│   └── plan_be.md           # 📋 Kế hoạch Backend chi tiết
├── guidelines/         # Hướng dẫn coding
└── MVP/                # (Reserved)
```

---

## 📊 Tình trạng MVP #1

### Đã hoàn thành ✅

- [x] Frontend giao diện đầy đủ (8 pages, responsive)
- [x] Luồng Guest: Home → Trip Planning → Itinerary View
- [x] Luồng Registered User: Register/Login → Create → Save → View Saved
- [x] Mock data cho phép demo offline
- [x] Diagrams: ERD, DFD, UML, Sequence (6 files)
- [x] Documentation: Use-cases, Requirements, Analysis
- [x] Backend FastAPI — Auth endpoints (register/login)
- [x] Backend FastAPI — User profile endpoints (get/update)
- [x] Backend FastAPI — Itinerary CRUD + AI generate endpoints
- [x] Backend FastAPI — Destinations/Places endpoints
- [x] PostgreSQL — Database schema (4 bảng ERD + FE extensions)
- [x] Seed data script — Import mock data từ FE
- [x] FE-BE Integration — Frontend gọi Backend API qua api.ts service layer
- [x] CORS — Backend cho phép FE gọi từ port 5173, 5174

### Cần triển khai 🔧

- [ ] AI Enhancement — Tuning Gemini prompt cho lịch trình tốt hơn
- [ ] Map integration — Bản đồ tương tác thực tế
- [ ] Alembic migrations — Database version control
- [ ] Admin panel (DFD có admin actor)
- [ ] System Architecture Diagram — Bổ sung

---

## 📚 Tài liệu tham khảo

| File                      | Nội dung                                                    |
| ------------------------- | ----------------------------------------------------------- |
| `Frontend/FE_docs.md`     | Mô tả chi tiết từng file FE, API mapping, user flows        |
| `Backend/BE_docs.md`      | API Reference, Database models, hướng dẫn chạy BE           |
| `md/plan_be.md`           | Kế hoạch Backend chi tiết (endpoints, AI service, timeline) |
| `md/MVP1_summary.md`      | Phân tích tổng hợp MVP #1 (status, gaps, priorities)        |
| `md/doc-MVP#1.md`         | Use-cases, cạnh tranh, USP                                  |
| `md/requirement_MVP#1.md` | Yêu cầu bắt buộc cho MVP #1                                 |
| `Diagram/Diagram_docs.md` | Mô tả chi tiết các sơ đồ                                    |

---

## � Nhóm phát triển

| Vai trò            | Công nghệ                             |
| ------------------ | ------------------------------------- |
| Frontend Developer | React, TypeScript, Tailwind CSS       |
| Backend Developer  | Python, FastAPI, PostgreSQL           |
| AI Integration     | Google Gemini API, Prompt Engineering |
