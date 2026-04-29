# 📝 Trả lời Yêu cầu MVP #1 — Dựa trên Source Code Thực tế

> **Ngày soạn:** 2026-03-03
> **Tham chiếu:** `md/requirement_MVP#1.md`
> **Nguồn dữ liệu:** Source code FE + BE + Diagram + Documentation

---

## 1. Người dùng & Phân tích Nhu cầu (Use-cases)

### 1.1 Phân loại nhóm người dùng

Hệ thống có **2 nhóm người dùng chính** (implement trong code):

| Nhóm                             | Mô tả                                                | Minh chứng code                                                                          |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Guest** (Chưa đăng ký)         | Truy cập website, tạo lịch trình AI, xem chi tiết    | `Backend/app/utils/dependencies.py` → `get_current_user_optional()` cho phép `user=None` |
| **Registered User** (Đã đăng ký) | Đăng nhập, lưu/quản lý lịch trình, đánh giá, profile | `Backend/app/utils/dependencies.py` → `get_current_user()` bắt buộc JWT token            |

Phân quyền trong code:

- `Backend/app/models/user.py` line 71: field `role` có giá trị `'user'` (default) hoặc `'admin'`
- Guest: `trips.user_id = NULL` (line 55-61 `models/trip.py`)
- Registered: `trips.user_id = UUID` (liên kết với bảng users)

### 1.2 Use-cases chi tiết (đúng theo code)

#### Guest Use Cases (UC01-UC07)

| UC   | Mô tả                           | Status     | Minh chứng code                                                                                    |
| ---- | ------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| UC01 | Truy cập website, xem trang chủ | ✅         | `Frontend/app/pages/Home.tsx` — Hero section, 6 destinations, 4 features                           |
| UC02 | Nhập thông tin chuyến đi        | ✅         | `Frontend/app/pages/TripPlanning.tsx` — Form: destination, dates, budget (VND), interests          |
| UC03 | Nhận lộ trình AI                | ✅         | `Backend/app/services/itinerary_service.py` → `generate_itinerary()` → Gemini 1.5-flash + fallback |
| UC04 | Xem chi tiết địa điểm           | ✅         | `Frontend/app/pages/ItineraryView.tsx` — Ảnh, mô tả, chi phí, thời lượng, giờ visit                |
| UC05 | Xem trên bản đồ                 | ⚠️ Partial | UI toggle có nhưng chưa tích hợp map API. DB đã có `places.latitude`, `places.longitude`           |
| UC06 | Gợi ý đăng ký                   | ✅         | `ItineraryView.tsx` — Modal "Save Prompt" khi guest chưa lưu                                       |
| UC07 | Chỉnh sửa lộ trình              | ⚠️ Partial | ✅ Xóa activity: `DELETE /itineraries/{id}/activities/{aid}` ❌ Thêm/sửa: chưa có                  |

#### Registered User Use Cases (UC08-UC16)

| UC   | Mô tả                        | Status     | Minh chứng code                                                                   |
| ---- | ---------------------------- | ---------- | --------------------------------------------------------------------------------- |
| UC08 | Đăng ký / Đăng nhập          | ✅         | `POST /auth/register` + `POST /auth/login` → bcrypt hash + JWT HS256 (24h expiry) |
| UC09 | Quản lý profile              | ✅         | `GET/PUT /users/profile` → name, email, phone, interests (8 options)              |
| UC10 | Nhập thông tin + gắn account | ✅         | `generate_itinerary()` nhận `user_id` từ JWT → tự lưu trip                        |
| UC11 | AI cá nhân hóa               | ⚠️ Partial | ✅ Dùng interests + budget trong Gemini prompt. ❌ Chưa dùng lịch sử              |
| UC12 | Ước tính chi phí             | ✅         | `ItineraryView.tsx` — 3 cards: Hoạt động, Lưu trú (days × 800k), Tổng             |
| UC13 | Lưu lộ trình                 | ✅         | BE **tự động lưu** khi generate (INSERT trip + trip_places)                       |
| UC14 | Xem lịch trình đã lưu        | ✅         | `GET /itineraries/` → filter by `user_id` từ JWT                                  |
| UC15 | Đánh giá + phản hồi          | ✅         | `PUT /itineraries/{id}/rating` → rating 1-5 + feedback text                       |
| UC16 | Đề xuất từ lịch sử           | ❌         | Data lưu nhưng AI prompt chưa query lịch sử                                       |

**Diagrams minh chứng:**

- `Diagram/UML-Guest.png` — 7 use cases cho Guest
- `Diagram/UML-Register.png` — 9 use cases cho Registered User
- `Diagram/Sequence_Guest.png` — Flow: Guest → Website → AI → Kết quả
- `Diagram/Sequence_Register.png` — Flow: User → Đăng ký → Lưu → Xem lại

### 1.3 Tính năng giữ chân (Retention)

| Tính năng                | Mô tả                                             | Code minh chứng                                                                   |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Thư viện cá nhân**     | Lưu nhiều lịch trình, quay lại xem bất cứ lúc nào | `SavedItineraries.tsx` + `GET /itineraries/` filter by user                       |
| **Chỉnh sửa real-time**  | Xóa activity khỏi lịch trình                      | `DELETE /itineraries/{id}/activities/{aid}`                                       |
| **Rating + Feedback**    | Đánh giá 1-5 sao + nhận xét text                  | `PUT /itineraries/{id}/rating` → lưu trong `trips.rating`, `trips.feedback`       |
| **Tích lũy dữ liệu**     | Lưu interests, budget history, destinations       | `users.interests` (ARRAY), `trips.interests`, `trips.budget`, `trips.destination` |
| **Fallback khi offline** | FE vẫn hoạt động với mock data khi BE down        | `itinerary.ts` → try API → catch → fallback local data                            |

**Lý do giữ chân:**

- Càng dùng nhiều → hệ thống lưu càng nhiều dữ liệu → đề xuất cá nhân hóa hơn
- Thư viện lịch trình không bao giờ mất (lưu trong PostgreSQL)
- Giao diện trực quan, thao tác đơn giản, load nhanh

---

## 2. Phân tích Cạnh tranh & Chiến lược Khác biệt

### 2.1 Đối thủ

| Đối thủ                    | Loại      | Hạn chế so với sản phẩm                                  |
| -------------------------- | --------- | -------------------------------------------------------- |
| TripAdvisor / Booking      | Gián tiếp | Chỉ hiển thị review, không tạo lịch trình tự động        |
| Google Travel              | Gián tiếp | Chỉ quản lý trip thủ công, không AI generation           |
| Wanderlog                  | Trực tiếp | Ít tập trung vào du lịch Việt Nam, không ước tính VND    |
| ChatGPT (trực tiếp hỏi AI) | Gián tiếp | Output dạng text thuần, không lưu, không edit, không VND |

### 2.2 Lợi thế cạnh tranh

| Lợi thế                | Chi tiết                                                         | Code minh chứng                                               |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| **AI có cấu trúc**     | Gemini trả về JSON → parse thành activities có time, cost, image | `itinerary_service.py` → `_generate_with_ai()` → JSON parsing |
| **Bản địa hóa VN**     | 22 địa điểm VN seed sẵn, chi phí VND, quán ăn địa phương         | `seed_data.py` — Hà Nội, TP.HCM, Đà Nẵng, Hội An              |
| **Full-stack web app** | Không phải chatbot — có UI chuyên dụng, lưu trữ, edit            | FE 8 pages + BE 12 endpoints + DB 4 tables                    |
| **Fallback mechanism** | Khi AI/BE down, FE vẫn hoạt động với mock data                   | `api.ts` + `itinerary.ts` fallback logic                      |

### 2.3 Chống sao chép

- **Dữ liệu tích lũy:** Càng nhiều user → càng nhiều trip data → cải thiện đề xuất (network effect)
- **Gemini API Key riêng:** Prompt đã được tune cho du lịch VN, prompt engineering là know-how
- **Architecture chặt chẽ:** FE → api.ts → BE → DB, không phải copy 1 file là chạy được

### 2.4 USP (Unique Selling Proposition)

**"Hệ thống phân bổ ngân sách + tạo lịch trình AI cho du lịch Việt Nam"**

Điểm khác biệt nhất:

1. **Ngân sách → Lịch trình:** Nhập budget VND → AI tạo activities fit ngân sách (code: `TripCreateRequest.budget` → Gemini prompt: "with a budget of {budget} VND")
2. **Structured output:** AI trả về JSON activities (không phải text) → FE render cards có ảnh, giờ, chi phí
3. **Kết hợp dữ liệu thực:** Seed data 22 địa điểm thật VN + Gemini knowledge → lịch trình realistical

---

## 3. Sơ đồ Kiến trúc Hệ thống (System Architecture)

### 3.1 Kiến trúc tổng quan (từ code)

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
├──────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Tailwind CSS + Vite                    │
│  ├── 8 Pages: Home, TripPlanning, ItineraryView, Login,         │
│  │   Register, Profile, SavedItineraries, NotFound              │
│  ├── api.ts (Centralized HTTP layer + JWT token management)     │
│  ├── auth.ts (Async auth functions → gọi api.ts)                │
│  └── itinerary.ts (API-first + fallback mock data)              │
│  Deploy: Vercel (CDN + Edge Network)                            │
└─────────────┬────────────────────────────────────────────────────┘
              │ HTTP/HTTPS (REST API)
              │ Authorization: Bearer <JWT>
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
├──────────────────────────────────────────────────────────────────┤
│  Python 3.12 + FastAPI 0.115.6 + Uvicorn                        │
│  ├── Routers: auth.py, users.py, trips.py, places.py            │
│  │   (12 API endpoints, prefix /api/v1)                         │
│  ├── Services: auth_service, user_service, itinerary_service    │
│  ├── Security: JWT (python-jose HS256) + bcrypt (passlib)       │
│  ├── CORS: allow FE origins (5173, 5174, Vercel URL)            │
│  └── config.py: Pydantic Settings (đọc .env)                    │
│  Deploy: Render (Docker container, Free tier)                   │
└──────┬──────────────────────────┬────────────────────────────────┘
       │ SQLAlchemy 2.0 async     │ HTTP (google-generativeai)
       │ asyncpg driver           │
       ▼                          ▼
┌──────────────┐     ┌──────────────────────────┐
│  PostgreSQL  │     │  Google Gemini API        │
│  16-alpine   │     │  (gemini-1.5-flash)       │
│              │     │                          │
│  4 tables:   │     │  Input: destination,     │
│  • users     │     │  days, budget, interests │
│  • trips     │     │  Output: JSON activities │
│  • places    │     │  Fallback: mock data     │
│  • trip_places│    │  nếu API key trống/lỗi   │
│              │     │                          │
│  Dev: Docker │     └──────────────────────────┘
│  Prod: Render│
│  PostgreSQL  │
└──────────────┘
```

### 3.2 Modules chính — chức năng tương ứng

| Module               | File(s)                                                              | Chức năng                                                       |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Authentication**   | `routers/auth.py` + `services/auth_service.py` + `utils/security.py` | Đăng ký (bcrypt hash), đăng nhập (JWT token HS256, 24h expiry)  |
| **User Management**  | `routers/users.py` + `services/user_service.py`                      | GET/PUT profile (name, phone, interests)                        |
| **Itinerary Engine** | `routers/trips.py` + `services/itinerary_service.py`                 | AI generate (Gemini), CRUD lịch trình, rating, remove activity  |
| **Destinations**     | `routers/places.py`                                                  | List cities + places (from seed data)                           |
| **Database**         | `models/*.py` + `database.py`                                        | SQLAlchemy 2.0 async ORM, 4 tables, auto create_all()           |
| **Config**           | `config.py` + `.env`                                                 | Pydantic Settings: DB_URL, JWT_KEY, GEMINI_KEY, CORS            |
| **FE API Layer**     | `api.ts`                                                             | 11 functions, auto JWT header, error handling, token management |

---

## 4. Thiết kế Luồng dữ liệu & UML

### 4.1 Data Flow Diagram (DFD)

**Diagram file:** `Diagram/DFD.png`

Luồng dữ liệu chính (đúng theo code):

```
Guest/User ──(input: destination, dates, budget, interests)──→ TripPlanning form
  │
  ▼
api.ts ──(POST /api/v1/itineraries/generate)──→ FastAPI Router (trips.py)
  │
  ▼
itinerary_service.generate_itinerary()
  ├── Thử _generate_with_ai()
  │     ├── Gọi Gemini API → nhận JSON activities
  │     └── Nếu lỗi → fallback
  ├── Fallback: _generate_fallback_activities()
  │     └── Mock data từ FALLBACK_DATA (4 cities × 5-6 activities)
  │
  ├── INSERT trip vào bảng trips
  ├── _get_or_create_place() cho mỗi activity → INSERT places
  ├── INSERT trip_places (junction N-N)
  └── Tính total_cost = SUM(activity costs)
  │
  ▼
Response: ItineraryResponse (JSON) → FE render ItineraryView.tsx
```

### 4.2 UML Use Case Diagrams

**Diagram files:**

- `Diagram/UML-Guest.png` — Guest: 7 use cases (UC01-UC07)
- `Diagram/UML-Register.png` — Registered User: 9 use cases (UC08-UC16)

(Chi tiết đã liệt kê ở Phần 1.2)

### 4.3 Sequence Diagrams

**Diagram files:**

- `Diagram/Sequence_Guest.png` — Guest tạo lịch trình
- `Diagram/Sequence_Register.png` — Registered User đăng ký → tạo → lưu → xem lại

Sequence chính (theo code `auth_service.py` + `itinerary_service.py`):

```
Guest Flow:
  Browser → TripPlanning → api.ts/POST /generate → FastAPI → Gemini AI → DB → Response → ItineraryView

Register Flow:
  Browser → Register → api.ts/POST /register → auth_service → bcrypt hash → INSERT user → JWT token → Response
  Browser → Login → api.ts/POST /login → auth_service → verify_password → JWT token → Response
  Browser → TripPlanning → api.ts/POST /generate (with JWT) → trip.user_id = UUID → auto-save
  Browser → SavedItineraries → api.ts/GET /itineraries (with JWT) → filter user_id → list
```

---

## 5. Thiết kế Cơ sở dữ liệu

### 5.1 ERD — 4 bảng PostgreSQL

**Diagram file:** `Diagram/Database_MVP.png`

```
┌─────────────────┐     ┌─────────────────────────┐
│     USERS       │     │         TRIPS            │
├─────────────────┤     ├─────────────────────────┤
│ id (PK, UUID)   │──1:N│ id (PK, UUID)            │
│ full_name       │     │ user_id (FK → users, NULL)│
│ email (UNIQUE)  │     │ destination              │
│ password_hash   │     │ total_days               │
│ role            │     │ budget (NUMERIC 15,2)    │
│ phone           │     │ start_date, end_date     │
│ interests (ARRAY)│    │ interests (ARRAY)        │
│ created_at      │     │ total_cost, score        │
│ updated_at      │     │ rating, feedback         │
└─────────────────┘     │ created_at, updated_at   │
                        └────────┬────────────────┘
                                 │ 1
                                 │
                                 │ N
                        ┌────────┴────────────────┐
                        │     TRIP_PLACES          │
                        │     (Junction N-N)       │
                        ├─────────────────────────┤
                        │ id (PK, UUID)            │
                        │ trip_id (FK → trips)     │──N:1──┐
                        │ place_id (FK → places)   │──N:1──┤
                        │ day_number               │       │
                        │ visit_order              │       │
                        │ time (VARCHAR)           │       │
                        │ custom_cost (NUMERIC)    │       │
                        │ notes (TEXT)             │       │
                        └─────────────────────────┘       │
                                                          │
                        ┌─────────────────────────┐       │
                        │       PLACES            │───────┘
                        ├─────────────────────────┤
                        │ id (PK, UUID)            │
                        │ place_name (INDEX)       │
                        │ category                 │
                        │ rating, popularity_score │
                        │ description, location    │
                        │ cost (NUMERIC 15,2)      │
                        │ duration, image          │
                        │ latitude, longitude      │
                        │ destination (INDEX)      │
                        │ created_at               │
                        └─────────────────────────┘
```

### 5.2 Mối quan hệ

| Quan hệ                       | Mô tả                               | Code                                                                          |
| ----------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| **Users → Trips (1:N)**       | 1 user có nhiều trips               | `user.py` line 106: `relationship("Trip", cascade="all, delete-orphan")`      |
| **Trips → TripPlaces (1:N)**  | 1 trip có nhiều trip_places         | `trip.py` line 136: `relationship("TripPlace", cascade="all, delete-orphan")` |
| **Places → TripPlaces (1:N)** | 1 place xuất hiện trong nhiều trips | `place.py`: `relationship("TripPlace", back_populates="place")`               |
| **Trips ↔ Places (N:N)**      | Qua junction table `trip_places`    | `trip_place.py`: FK `trip_id` + FK `place_id`                                 |

### 5.3 Seed data

File `seed_data.py` tạo **22 places** từ **4 thành phố**: Hà Nội (6), TP.HCM (6), Đà Nẵng (5), Hội An (5).

---

## 6. MVP (Minimum Viable Product)

### 6.1 Luồng nghiệp vụ cốt lõi — ĐÃ CHẠY ĐƯỢC ✅

Test results: **19/19 API tests PASS** (chi tiết: `md/test.md`)

| Luồng                    | Steps                                                        | Status |
| ------------------------ | ------------------------------------------------------------ | ------ |
| **Guest tạo lịch trình** | Home → Trip Planning → Nhập info → AI generate → Xem kết quả | ✅     |
| **Register + Login**     | Đăng ký (email, password, name) → Đăng nhập → JWT token      | ✅     |
| **Lưu + Xem lại**        | Tạo trip (auto-save) → Saved Itineraries → Xem chi tiết      | ✅     |
| **Đánh giá**             | Xem trip → Rate 1-5 sao + feedback → Lưu                     | ✅     |
| **Quản lý**              | Xóa trip, xóa activity, cập nhật profile                     | ✅     |

### 6.2 Tech Stack — Lý do chọn

| Công nghệ                | Lý do chọn                                                                  |
| ------------------------ | --------------------------------------------------------------------------- |
| **React + TypeScript**   | SPA render nhanh, type safety, ecosystem shadcn/Radix UI lớn                |
| **Tailwind CSS**         | Utility-first, responsive dễ, dark mode sẵn                                 |
| **Vite**                 | Build nhanh (HMR <100ms), hỗ trợ TypeScript native                          |
| **FastAPI (Python)**     | Async native phù hợp gọi AI API, auto-gen Swagger docs, Pydantic validation |
| **PostgreSQL**           | RDBMS mạnh, hỗ trợ ARRAY type (interests), UUID PK, free trên Render        |
| **SQLAlchemy 2.0 async** | ORM hiện đại, type hints, async session tránh blocking khi gọi AI           |
| **Google Gemini**        | Free tier 60 req/phút, JSON mode output, kiến thức du lịch VN tốt           |
| **JWT (HS256)**          | Stateless auth, không cần session store, FE giữ token trong localStorage    |
| **bcrypt**               | Industry standard password hashing, brute-force resistant                   |
| **Docker**               | PostgreSQL setup 1 command, consistent across environments                  |
| **Vercel + Render**      | Free tier, auto-deploy từ GitHub push, zero DevOps                          |

### 6.3 Giao diện (UI/UX)

| Page              | Route                | Chức năng                            | UX                                     |
| ----------------- | -------------------- | ------------------------------------ | -------------------------------------- |
| Home              | `/`                  | Hero section, features, destinations | Gradient, cards, CTA responsive        |
| Trip Planning     | `/trip-planning`     | Form tạo lịch trình                  | Dropdown, datepicker, interest toggles |
| Itinerary View    | `/itinerary/:id`     | Xem kết quả AI                       | Timeline, cost cards, rating modal     |
| Login             | `/login`             | Đăng nhập                            | Loading spinner, error messages        |
| Register          | `/register`          | Đăng ký                              | Validation, password confirm           |
| Profile           | `/profile`           | Quản lý thông tin                    | Edit form, interest multi-select       |
| Saved Itineraries | `/saved-itineraries` | Danh sách trips                      | Grid cards, delete confirm             |
| 404               | `*`                  | Not found                            | Friendly message                       |

**UX luồng chính trơn tru:** Loading spinners (Loader2) trên mọi async action, disabled buttons khi đang xử lý, try-catch error handling, redirect tự động sau login/register.

### 6.4 Deploy Production

| Platform   | Service              | URL Pattern                     | Status      |
| ---------- | -------------------- | ------------------------------- | ----------- |
| **Vercel** | Frontend (React SPA) | `https://YOUR-APP.vercel.app`   | ✅ Deployed |
| **Render** | Backend (FastAPI)    | `https://YOUR-API.onrender.com` | ✅ Deployed |
| **Render** | PostgreSQL (Free)    | Internal connection             | ✅ Running  |

⚠️ **Cần xác nhận URL thực tế** — các URL placeholder trong `deploy.md` (`dulichviet-api.onrender.com`) trả về 404. Cần URL Vercel/Render thật để test production.

---

## Tổng kết theo 6 yêu cầu

| #   | Yêu cầu                | Status | Minh chứng                                          |
| --- | ---------------------- | ------ | --------------------------------------------------- |
| 1   | Người dùng & Use-cases | ✅     | 2 nhóm, 16 UC, retention features                   |
| 2   | Phân tích cạnh tranh   | ✅     | 4 đối thủ, 4 lợi thế, USP rõ ràng                   |
| 3   | System Architecture    | ✅     | FE(Vercel) → BE(Render) → DB + AI                   |
| 4   | DFD + UML              | ✅     | 6 diagrams PNG + Diagram_docs.md                    |
| 5   | Database ERD           | ✅     | 4 tables, relationships 1:N + N:N                   |
| 6   | MVP chạy được          | ✅     | 19/19 API tests, 6/6 FE pages, deploy Vercel+Render |
