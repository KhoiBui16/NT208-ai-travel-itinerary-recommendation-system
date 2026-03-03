# Trả Lời Yêu Cầu MVP #1 — Dựa Trên Source Code Thực Tế

> **Dự án:** Hệ thống đề xuất lộ trình du lịch thông minh bằng AI  
> **Repo:** https://github.com/KhoiBui16/NT208-ai-travel-itinerary-recommendation-system  
> **Commit hiện tại:** `d4bacb3` (31 commits trên branch `main`)  
> **Ngày soạn:** 03/03/2026  
> **Tài liệu tham chiếu:** `requirement_MVP#1.md`, `Diagram_docs.md`, `doc-MVP#1.md`

---

## 1. Người dùng & Phân tích Nhu cầu (Use-cases)

### 1.1. Phân loại người dùng

Hệ thống phân chia **2 nhóm** người dùng:

| Nhóm                             | Mô tả                                                          | Xác thực trong code                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Guest** (Khách)                | Truy cập website không cần tài khoản, sử dụng chức năng cơ bản | `get_current_user_optional` trong `Backend/app/utils/dependencies.py` — dependency `auto_error=False`, trả về `None` nếu không có token |
| **Registered User** (Đã đăng ký) | Có tài khoản, được cá nhân hóa và lưu trữ lịch trình           | `get_current_user` trong `dependencies.py` — bắt buộc JWT token hợp lệ, raise 401 nếu không có                                          |

**Minh chứng trong code:**

- Model `User` (`Backend/app/models/user.py`): có trường `role` (mặc định `"user"`), `email` (UNIQUE), `password_hash`, `interests`, `phone`
- `Trip.user_id` (`Backend/app/models/trip.py`): **nullable=True** — cho phép Guest tạo lịch trình mà không cần đăng nhập
- `Header.tsx` (`Frontend/app/components/Header.tsx`): hiển thị menu khác nhau tùy `getCurrentUser()` — Guest thấy "Đăng Nhập / Đăng Ký", Registered User thấy "Hành Trình Đã Lưu / Profile / Đăng Xuất"

### 1.2. Nhu cầu & Use-cases chi tiết

#### A. Guest (UC01 – UC07) — Mapping Code thực tế

| UC   | Tên                      | Trang FE                                                                                                 | Endpoint BE                                                                      | Trạng thái                  |
| ---- | ------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| UC01 | Truy cập website         | `Home.tsx`                                                                                               | `GET /` (health check)                                                           | ✅ Hoạt động                |
| UC02 | Nhập thông tin chuyến đi | `TripPlanning.tsx` — form: destination (select 10 TP), startDate, endDate, budget, interests (5 options) | `POST /api/v1/itineraries/generate` + `get_current_user_optional`                | ✅ Hoạt động                |
| UC03 | Nhận lộ trình đề xuất    | `ItineraryView.tsx` — hiển thị days[], activities[], totalCost                                           | Response từ `generate_itinerary()` trong `itinerary_service.py`                  | ✅ Hoạt động                |
| UC04 | Xem chi tiết địa điểm    | `ItineraryView.tsx` — mỗi activity card: image, title, description, time, duration, location, cost       | Data từ bảng `places` JOIN `trip_places` → `ActivityResponse.from_trip_place()`  | ✅ Hoạt động                |
| UC05 | Xem lộ trình trên bản đồ | `ItineraryView.tsx` — nút "Xem Bản Đồ" → hiện placeholder map                                            | `Place.latitude`, `Place.longitude` đã có trong model, chưa tích hợp Google Maps | 🟡 Placeholder (MVP#2)      |
| UC06 | Gợi ý đăng ký tài khoản  | `ItineraryView.tsx` — modal `showSavePrompt` hiện khi Guest muốn lưu, nút "Đăng Ký" → `/register`        | Logic: `if (!isAuthenticated()) setShowSavePrompt(true)`                         | ✅ Hoạt động                |
| UC07 | Chỉnh sửa lộ trình       | `ItineraryView.tsx` — nút "Chỉnh Sửa" toggle `editMode` → hiện nút xóa (Trash2) cho từng activity        | `DELETE /api/v1/itineraries/{id}/activities/{aid}` → `remove_activity()`         | ✅ Hoạt động (xóa activity) |

#### B. Registered User (UC08 – UC16) — Mapping Code thực tế

| UC   | Tên                          | Trang FE                                                                                               | Endpoint BE                                                                                    | Trạng thái                      |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| UC08 | Đăng ký / Đăng nhập          | `Register.tsx` / `Login.tsx` — validate password ≥6 chars, confirm match                               | `POST /api/v1/auth/register` + `POST /api/v1/auth/login` → JWT token + user info               | ✅ Hoạt động                    |
| UC09 | Quản lý thông tin cá nhân    | `Profile.tsx` — form: name, email (disabled), phone, interests (8 options)                             | `GET /api/v1/users/profile` + `PUT /api/v1/users/profile`                                      | ✅ Hoạt động                    |
| UC10 | Nhập thông tin chuyến đi     | `TripPlanning.tsx` — cùng form, có token → gắn `Authorization: Bearer` tự động                         | `POST /generate` nhận `user_id` từ token → lưu `Trip.user_id`                                  | ✅ Hoạt động                    |
| UC11 | Nhận lộ trình AI cá nhân hóa | `ItineraryView.tsx`                                                                                    | `_generate_with_ai()` dùng Gemini 1.5-flash, prompt có `interests` + `budget`                  | ✅ Hoạt động (AI hoặc fallback) |
| UC12 | Ước tính chi phí             | `ItineraryView.tsx` — section "Ước Tính Chi Phí": 3 cards (Hoạt động, Lưu trú & Ăn uống, Tổng Chi Phí) | `Trip.total_cost` = sum activities + 500k×days (accommodation) + 300k×days (food)              | ✅ Hoạt động                    |
| UC13 | Lưu lộ trình                 | BE auto-save khi `generate` (Trip record tạo ngay)                                                     | Guest tạo → lưu với `user_id=NULL`; User tạo → lưu với `user_id`                               | ✅ Tự động                      |
| UC14 | Xem lịch trình đã lưu        | `SavedItineraries.tsx` — grid cards, mỗi card: destination, dates, budget, rating, nút xem/xóa         | `GET /api/v1/itineraries/` (protected) → `get_user_itineraries()`                              | ✅ Hoạt động                    |
| UC15 | Đánh giá & phản hồi          | `ItineraryView.tsx` — modal rating (1-5 sao) + textarea feedback                                       | `PUT /api/v1/itineraries/{id}/rating` → `rate_itinerary()` lưu `Trip.rating` + `Trip.feedback` | ✅ Hoạt động                    |
| UC16 | Đề xuất theo lịch sử         | Chưa implement                                                                                         | Cần query `Trip` history + AI phân tích                                                        | ❌ Chưa có (planned MVP#2)      |

### 1.3. Tính năng giữ chân người dùng (Retention)

**Đã implement trong code:**

1. **Thư viện lịch trình cá nhân** — `SavedItineraries.tsx` + `GET /api/v1/itineraries/`: User xem lại tất cả lịch trình đã tạo, không mất data
2. **Chỉnh sửa trực tiếp** — `ItineraryView.tsx` edit mode: xóa activity → BE recalculate `total_cost` tự động (`remove_activity()` trong `itinerary_service.py`)
3. **Đánh giá & phản hồi** — Rating 1-5 sao + feedback text → lưu DB, hiển thị trên card
4. **Guest → Registered flow** — Modal gợi ý đăng ký khi Guest muốn lưu → `/register` → sau đăng ký tất cả trip mới sẽ gắn `user_id`
5. **AI thông minh hơn theo sở thích** — Gemini prompt nhận `interests` để cá nhân hóa ngay lần đầu

---

## 2. Phân tích Cạnh tranh & Chiến lược khác biệt

### 2.1. Đối thủ cạnh tranh

| Loại          | Tên                                 | Đặc điểm                                         | Hạn chế                                                                       |
| ------------- | ----------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Trực tiếp** | iPlan.ai, GuideGeek, Roam Around    | AI tạo lịch trình nhanh, dùng LLM lớn            | Dữ liệu không chuẩn cho VN, UI tiếng Anh, không ràng buộc ngân sách chính xác |
| **Gián tiếp** | Google Maps, TripAdvisor, Wanderlog | Kho dữ liệu địa điểm phong phú, đánh giá thực tế | Phải tự lên lịch trình, không AI tối ưu, không tính chi phí                   |

### 2.2. Lợi thế cạnh tranh (minh chứng từ code)

**a) Ràng buộc ngân sách có cấu trúc:**

- `itinerary_service.py` lines 350-390: tính `total_cost = sum(activities.cost) + days×500k (lưu trú) + days×300k (ăn uống)`
- Gemini prompt yêu cầu: _"Chi phí phải nằm trong ngân sách (trừ 500.000 VND/ngày ăn ở)"_
- FE `ItineraryView.tsx` hiển thị breakdown 3 cột: Hoạt động / Lưu trú & Ăn uống / Tổng Chi Phí

**b) Kiến trúc dữ liệu normalized (ERD đúng chuẩn):**

- 4 bảng: `users`, `trips`, `places`, `trip_places` — quan hệ N-N thông qua junction table
- `Place` là bảng CHUNG: 1 place được reuse nhiều trip → `_get_or_create_place()` kiểm tra trùng trước khi tạo mới
- Mỗi `Place` có: `cost`, `duration`, `category`, `rating`, `popularity_score`, `coordinates` → đủ dữ liệu cho AI ranking

**c) Bản địa hóa cho Việt Nam:**

- `FALLBACK_DATA` trong `itinerary_service.py`: 4 thành phố × 5-6 địa điểm thực (Hồ Hoàn Kiếm, Phố Cổ, Bà Nà Hills, Chùa Cầu...)
- FE destinations: 10 thành phố VN (Hà Nội, TP.HCM, Đà Nẵng, Hội An, Vịnh Hạ Long, Sapa, Nha Trang, Phú Quốc, Đà Lạt, Huế)
- UI hoàn toàn tiếng Việt
- Currency: VND format (`Intl.NumberFormat('vi-VN', { currency: 'VND' })`)

### 2.3. Chống sao chép

1. **CSDL chuẩn hóa riêng:** Bảng `places` có schema mở rộng (cost, duration, category, popularity_score, coordinates) — không chỉ lấy data thô từ Google Maps
2. **Logic AI tùy chỉnh:** Prompt Gemini tiếng Việt, ràng buộc budget cụ thể, output JSON format riêng
3. **Tích lũy dữ liệu:** Mỗi trip + rating + feedback lưu DB → có thể train AI recommendation sau này (UC16)
4. **Thị trường ngách VN:** Toàn bộ UX/UI, dữ liệu, prompt đều tối ưu cho thị trường Việt Nam

### 2.4. Unique Selling Proposition (USP)

**"Tạo lịch trình du lịch Việt Nam có ràng buộc ngân sách thực tế, bằng AI, trong vài giây"**

Code minh chứng:

- `TripPlanning.tsx`: form 5 trường (destination, startDate, endDate, budget, interests) → 1 click "Tạo Lịch Trình Du Lịch"
- `itinerary_service.py`: AI generate → auto-save Trip + Places + TripPlaces → response ItineraryResponse → FE navigate hiển thị ngay
- Toàn bộ flow từ nhập → AI → hiển thị: **dưới 10 giây** (với Gemini API)

---

## 3. Sơ đồ Kiến trúc Hệ thống (System Architecture)

### 3.1. Tổng quan kiến trúc (từ code thực tế)

```
┌──────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└───────────┬──────────────────────────────┬───────────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────┐     ┌──────────────────────────┐
│   FRONTEND (Vercel)  │     │   BACKEND (Render)       │
│                      │     │                          │
│  React 18            │ ──► │  FastAPI (Python)        │
│  TypeScript          │REST │  uvicorn server          │
│  Tailwind CSS v4     │API  │  Port: $PORT             │
│  Vite 6.3.5          │     │                          │
│  React Router v7     │ ◄── │  Pydantic v2 schemas     │
│  Lucide React icons  │JSON │  SQLAlchemy 2.0 async    │
│                      │     │                          │
│  SPA (index.html)    │     │  ┌────────────────────┐  │
│  vercel.json rewrite │     │  │ Routers            │  │
│                      │     │  │ • auth.py          │  │
│  Pages:              │     │  │ • users.py         │  │
│  • Home.tsx          │     │  │ • trips.py         │  │
│  • TripPlanning.tsx  │     │  │ • places.py        │  │
│  • ItineraryView.tsx │     │  └────────┬───────────┘  │
│  • Login.tsx         │     │           │              │
│  • Register.tsx      │     │  ┌────────▼───────────┐  │
│  • Profile.tsx       │     │  │ Services           │  │
│  • SavedItineraries  │     │  │ • auth_service     │  │
│  • NotFound.tsx      │     │  │ • user_service     │  │
│                      │     │  │ • itinerary_service│  │
│  Utils:              │     │  └────────┬───────────┘  │
│  • api.ts  (HTTP)    │     │           │              │
│  • auth.ts (JWT)     │     │  ┌────────▼───────────┐  │
│  • itinerary.ts      │     │  │ Utils              │  │
│                      │     │  │ • security.py (JWT,│  │
└──────────────────────┘     │  │   bcrypt)          │  │
                             │  │ • dependencies.py  │  │
                             │  │   (DI, auth guards)│  │
                             │  └────────────────────┘  │
                             └─────┬──────────┬─────────┘
                                   │          │
                          ┌────────▼──┐ ┌─────▼──────────┐
                          │PostgreSQL │ │ Google Gemini   │
                          │ (Render)  │ │ API (External)  │
                          │           │ │                 │
                          │ Tables:   │ │ gemini-1.5-flash│
                          │ • users   │ │ JSON response   │
                          │ • trips   │ │ Fallback: mock  │
                          │ • places  │ │   data local    │
                          │ • trip_   │ │                 │
                          │   places  │ └─────────────────┘
                          └───────────┘
```

### 3.2. Các module chính và chức năng

| Module                     | File(s)                                     | Chức năng                                                                                                                                     |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Layer (FE)**         | `api.ts` (328 lines)                        | Quản lý token JWT, HTTP helpers (GET/POST/PUT/DELETE), error handling, type definitions khớp BE schemas                                       |
| **Auth Module (FE)**       | `auth.ts` (217 lines)                       | Register, login, logout, profile CRUD, itinerary CRUD wrappers, `isAuthenticated()` check                                                     |
| **Itinerary Module (FE)**  | `itinerary.ts` (165 lines)                  | `generateItinerary()`: gọi BE API → fallback mock data nếu lỗi; `formatCurrency()`                                                            |
| **Auth Router (BE)**       | `routers/auth.py` (103 lines)               | `POST /register`, `POST /login` — delegate to `auth_service.py`                                                                               |
| **User Router (BE)**       | `routers/users.py` (78 lines)               | `GET /profile`, `PUT /profile` — protected, JWT required                                                                                      |
| **Trip Router (BE)**       | `routers/trips.py` (203 lines)              | `POST /generate` (guest+user), `GET /` (protected), `GET /{id}` (public), `DELETE /{id}`, `PUT /{id}/rating`, `DELETE /{id}/activities/{aid}` |
| **Places Router (BE)**     | `routers/places.py` (99 lines)              | `GET /destinations/` (list), `GET /destinations/{name}/places`                                                                                |
| **Itinerary Service (BE)** | `services/itinerary_service.py` (654 lines) | Core business logic: AI generation (Gemini), fallback mock, CRUD, rating, remove activity                                                     |
| **Auth Service (BE)**      | `services/auth_service.py` (130 lines)      | Register (check email, hash password, create user, create JWT), Login (find user, verify password, create JWT)                                |
| **Security Utils (BE)**    | `utils/security.py` (132 lines)             | bcrypt hash/verify, JWT create/verify (python-jose)                                                                                           |
| **Dependencies (BE)**      | `utils/dependencies.py` (129 lines)         | OAuth2 scheme, `get_current_user()`, `get_current_user_optional()` — DI cho FastAPI                                                           |
| **Database (BE)**          | `database.py` (81 lines)                    | Async engine (asyncpg), session factory, `get_db()` dependency                                                                                |
| **Config (BE)**            | `config.py` (80 lines)                      | Pydantic Settings (`.env`), auto-convert `postgresql://` → `postgresql+asyncpg://`                                                            |

### 3.3. Luồng giao tiếp FE ↔ BE

```
Browser → api.ts (HTTP layer, JWT auto-attach)
       → FastAPI Router (validate request via Pydantic)
       → Service Layer (business logic)
       → SQLAlchemy async (DB queries)
       → PostgreSQL
       → (Optional) Google Gemini API
       ← ItineraryResponse (Pydantic model)
       ← JSON response
       ← api.ts parse + return
       ← React component setState + render
```

---

## 4. Thiết kế Luồng dữ liệu & UML

### 4.1. Biểu đồ luồng dữ liệu (DFD) — Mô tả từ `DFD.png`

**External Entities:**

- **Người dùng** (Guest / Registered User) — React Frontend
- **Quản trị viên** — Admin panel (chưa implement trong MVP#1)

**Processes (mapping → code):**

| Process                                   | Mô tả                          | Code thực tế                                                                                         |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **P1** — Nhập & xử lý thông tin chuyến đi | Validate input từ user         | `TripPlanning.tsx` form validation (FE) + Pydantic `TripCreateRequest` (BE)                          |
| **P2** — Đề xuất lộ trình bằng AI         | Xử lý data + AI tạo lịch trình | `itinerary_service.py`: `_generate_with_ai()` (Gemini) hoặc `_generate_fallback_activities()` (mock) |
| **P3** — Ước tính chi phí                 | Tính tổng chi phí              | `itinerary_service.py` line 382: `total_cost += num_days * 500000 + num_days * 300000`               |
| **P4** — Quản lý lộ trình                 | Lưu, xóa, đánh giá             | `itinerary_service.py`: `get_user_itineraries()`, `delete_itinerary()`, `rate_itinerary()`           |

**Data Stores (mapping → DB tables):**

| Data Store           | Code thực tế                                                            |
| -------------------- | ----------------------------------------------------------------------- |
| D1 — CSDL Người dùng | Bảng `users` (`models/user.py`)                                         |
| D2 — CSDL Địa điểm   | Bảng `places` (`models/place.py`)                                       |
| D3 — CSDL Lộ trình   | Bảng `trips` + `trip_places` (`models/trip.py`, `models/trip_place.py`) |
| D4 — CSDL Phản hồi   | Trường `trips.rating` + `trips.feedback` (trong bảng `trips`)           |

### 4.2. Use-case Diagrams — Có 2 sơ đồ

**UML-Guest.png** — 7 use cases (UC01→UC07):

- Guest → UC01 (Truy cập) → UC02 (Nhập thông tin) → UC03 (Nhận lộ trình) → UC04 (Xem chi tiết) → UC05 (Xem bản đồ) → UC06 (Gợi ý đăng ký) → UC07 (Chỉnh sửa)

**UML-Register.png** — 9 use cases (UC08→UC16):

- Registered User → UC08 (Đăng ký/Đăng nhập) → UC09 (Quản lý profile) → UC10 (Nhập thông tin) → UC11 (AI cá nhân hóa) → UC12 (Ước tính chi phí) → UC13 (Lưu lộ trình) → UC14 (Xem đã lưu) → UC15 (Đánh giá) → UC16 (Đề xuất lịch sử)

### 4.3. Sequence Diagrams — Có 2 sơ đồ

**Sequence_Guest.png** — 5 lifelines: Guest → Web Interface → Server → Database → AI Recommendation Engine

Luồng chính theo code:

```
Guest → TripPlanning form (Web Interface)
     → POST /api/v1/itineraries/generate (Server)
     → _generate_with_ai() (AI Engine)
     → _get_or_create_place() → INSERT places, trip_places (Database)
     → ItineraryResponse (Server → Web Interface)
     → ItineraryView.tsx hiển thị (Web Interface → Guest)
     → Modal gợi ý đăng ký (UC06)
```

**Sequence_Register.png** — 5 lifelines tương tự

Luồng chính:

```
User → Login form → POST /auth/login (verify email+password, create JWT)
    → Profile form → GET/PUT /users/profile
    → TripPlanning form → POST /generate (token gắn user_id)
    → ItineraryView → PUT /{id}/rating (đánh giá)
    → SavedItineraries → GET / (danh sách) → DELETE /{id} (xóa)
```

---

## 5. Thiết kế Cơ sở dữ liệu

### 5.1. ERD (Entity Relationship Diagram) — Từ `Database_MVP.png` + Code thực tế

**4 bảng chính**, dùng PostgreSQL 16 (RDBMS) với async driver asyncpg:

#### Bảng `users` — Model: `Backend/app/models/user.py`

| Cột             | Kiểu DB       | Ràng buộc                | Ghi chú                          |
| --------------- | ------------- | ------------------------ | -------------------------------- |
| `id`            | UUID          | PK, default uuid4        | ERD: `user_id`                   |
| `full_name`     | VARCHAR(255)  | NOT NULL                 | ERD: `full_name`                 |
| `email`         | VARCHAR(255)  | NOT NULL, UNIQUE, INDEX  | ERD: `email` ★                   |
| `password_hash` | VARCHAR(255)  | NOT NULL                 | ERD: `password` (đã hash bcrypt) |
| `role`          | VARCHAR(50)   | NOT NULL, default="user" | ERD: `role`                      |
| `phone`         | VARCHAR(20)   | nullable                 | Bổ sung cho FE Profile           |
| `interests`     | ARRAY(String) | nullable                 | Bổ sung cho FE Profile           |
| `created_at`    | TIMESTAMPTZ   | server_default=now()     | Tracking                         |
| `updated_at`    | TIMESTAMPTZ   | onupdate=now()           | Tracking                         |

#### Bảng `trips` — Model: `Backend/app/models/trip.py`

| Cột           | Kiểu DB       | Ràng buộc                                   | Ghi chú                |
| ------------- | ------------- | ------------------------------------------- | ---------------------- |
| `id`          | UUID          | PK                                          | ERD: `trip_id`         |
| `user_id`     | UUID          | FK → users.id, CASCADE, **NULLABLE**, INDEX | NULL = guest trip      |
| `destination` | VARCHAR(255)  | NOT NULL, INDEX                             | ERD: `destination`     |
| `total_days`  | INTEGER       | NOT NULL                                    | ERD: `total_days`      |
| `budget`      | NUMERIC(15,2) | NOT NULL                                    | ERD: `budget` (VND)    |
| `start_date`  | DATE          | NOT NULL                                    | Bổ sung cho FE         |
| `end_date`    | DATE          | NOT NULL                                    | Bổ sung cho FE         |
| `interests`   | ARRAY(String) | nullable                                    | Sở thích cho trip      |
| `total_cost`  | NUMERIC(15,2) | nullable, default=0                         | Tổng chi phí tính toán |
| `score`       | INTEGER       | nullable                                    | AI scoring 0-100       |
| `rating`      | INTEGER       | nullable                                    | User rating 1-5        |
| `feedback`    | TEXT          | nullable                                    | User feedback          |
| `created_at`  | TIMESTAMPTZ   | server_default=now()                        |                        |
| `updated_at`  | TIMESTAMPTZ   | onupdate=now()                              |                        |

#### Bảng `places` — Model: `Backend/app/models/place.py`

| Cột                | Kiểu DB       | Ràng buộc            | Ghi chú                         |
| ------------------ | ------------- | -------------------- | ------------------------------- |
| `id`               | UUID          | PK                   | ERD: `place_id`                 |
| `place_name`       | VARCHAR(500)  | NOT NULL, INDEX      | ERD: `place_name`               |
| `category`         | VARCHAR(100)  | nullable, INDEX      | ERD: `category`                 |
| `rating`           | NUMERIC(3,1)  | nullable             | ERD: `rating` (1.0-5.0)         |
| `popularity_score` | NUMERIC(5,1)  | nullable             | ERD: `popularity_score` (0-100) |
| `description`      | TEXT          | nullable             | Bổ sung cho FE Activity         |
| `location`         | VARCHAR(500)  | nullable             | Địa chỉ chi tiết                |
| `cost`             | NUMERIC(15,2) | nullable, default=0  | Chi phí trung bình VND          |
| `duration`         | VARCHAR(100)  | nullable             | "2 giờ", "30 phút"              |
| `image`            | TEXT          | nullable             | URL ảnh Unsplash                |
| `latitude`         | NUMERIC(10,7) | nullable             | GPS                             |
| `longitude`        | NUMERIC(10,7) | nullable             | GPS                             |
| `destination`      | VARCHAR(255)  | nullable, INDEX      | Thành phố                       |
| `created_at`       | TIMESTAMPTZ   | server_default=now() |                                 |

#### Bảng `trip_places` (Junction/Trung gian) — Model: `Backend/app/models/trip_place.py`

| Cột           | Kiểu DB       | Ràng buộc                      | Ghi chú                       |
| ------------- | ------------- | ------------------------------ | ----------------------------- |
| `id`          | UUID          | PK                             | ERD: `trip_place_id`          |
| `trip_id`     | UUID          | FK → trips.id, CASCADE, INDEX  | ERD: `trip_id`                |
| `place_id`    | UUID          | FK → places.id, CASCADE, INDEX | ERD: `place_id`               |
| `day_number`  | INTEGER       | NOT NULL                       | ERD: `day_number` (1,2,3...)  |
| `visit_order` | INTEGER       | NOT NULL                       | ERD: `visit_order` (1,2,3...) |
| `time`        | VARCHAR(10)   | nullable                       | "09:00", "13:00", "17:00"     |
| `custom_cost` | NUMERIC(15,2) | nullable                       | Override Place.cost           |
| `notes`       | TEXT          | nullable                       | Ghi chú riêng                 |
| `created_at`  | TIMESTAMPTZ   | server_default=now()           |                               |

### 5.2. Mối quan hệ

```
users (1) ←────── (N) trips           [1 user có nhiều trips, CASCADE delete]
trips (1) ←────── (N) trip_places     [1 trip có nhiều trip_places, CASCADE delete]
places (1) ←────── (N) trip_places    [1 place xuất hiện trong nhiều trips]

Quan hệ N-N: trips ←→ places (qua trip_places junction table)
```

### 5.3. Tự động tạo bảng

```python
# main.py → lifespan()
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

Dev mode: SQLAlchemy auto-create tables. Production: nên dùng Alembic migrations.

---

## 6. Minimum Viable Product (MVP)

### 6.1. MVP đã hoàn thiện — Luồng nghiệp vụ cốt lõi chạy được

#### Luồng Guest (chưa đăng ký):

```
Home.tsx → Click "Bắt Đầu Lên Kế Hoạch" hoặc chọn destination card
→ TripPlanning.tsx → Điền form (10 destinations, dates, budget, 5 interests)
→ Click "Tạo Lịch Trình Du Lịch" → Loading "Đang tạo lịch trình (AI)..."
→ POST /api/v1/itineraries/generate → Gemini AI hoặc fallback mock
→ Navigate → ItineraryView.tsx → Hiển thị days, activities, cost breakdown
→ Modal "Đăng ký để lưu lịch trình" → /register
```

#### Luồng Registered User (đã đăng ký):

```
Register.tsx → Đăng ký (email, password ≥6, name)
→ Home.tsx (auto-login, JWT saved)
→ TripPlanning.tsx → Tạo lịch trình (AI + auto-save với user_id)
→ ItineraryView.tsx → Đánh giá (1-5 sao + feedback) → Chỉnh sửa (xóa activity)
→ SavedItineraries.tsx → Xem tất cả lịch trình → Xóa lịch trình
→ Profile.tsx → Cập nhật name, phone, interests
→ Đăng xuất
```

### 6.2. Tech Stack & Lý do chọn

| Layer         | Công nghệ                            | Lý do                                                                               |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| **Frontend**  | React 18 + TypeScript + Vite 6       | SPA nhanh, type-safe, hot reload dev; Vite build nhanh hơn Webpack 10-100x          |
| **UI**        | Tailwind CSS v4 + Lucide React       | Utility-first CSS nhanh, responsive built-in; Lucide icons nhẹ                      |
| **Routing**   | React Router v7                      | Client-side routing cho SPA, `useNavigate`, `useParams`, `useLocation`              |
| **Backend**   | Python FastAPI                       | **Async native** cho I/O-bound (DB, AI API), auto Swagger docs, Pydantic validation |
| **ORM**       | SQLAlchemy 2.0 async + asyncpg       | Async DB queries, mapped_column type hints, relationship lazy loading               |
| **Database**  | PostgreSQL 16                        | ACID transactions, ARRAY type (cho interests), UUID support, free tier Render       |
| **Auth**      | JWT (python-jose) + bcrypt (passlib) | Stateless auth, FE lưu localStorage, không cần session server-side                  |
| **AI**        | Google Gemini 1.5-flash              | Free tier, tiếng Việt tốt, JSON output, nhanh (< 5s per request)                    |
| **Deploy FE** | Vercel                               | Free, auto-deploy từ GitHub, SPA rewrite support                                    |
| **Deploy BE** | Render                               | Free tier Python + PostgreSQL, auto-deploy từ GitHub                                |

### 6.3. Minh chứng làm việc nhóm

**GitHub commit history:** 31 commits trên branch `main`

| Phase | Nội dung                                                       | Số commits |
| ----- | -------------------------------------------------------------- | ---------- |
| 0     | .gitignore                                                     | 1          |
| 1     | Backend core (models, schemas, routers, services, tests)       | 11         |
| 2     | FE-BE Integration (api.ts, auth.ts, itinerary.ts, pages async) | 8          |
| 3     | Documentation (FE_docs, Diagrams, MVP docs)                    | 3          |
| 4     | Post-MVP fixes, deployment configs, deploy guide               | 7          |
| 5     | Runtime bug fixes                                              | 1          |

**Contributors (3 thành viên):**

- @KhoiBui16 (Anh Khoi)
- @DngChinh9h
- @vanchi-3

**Languages (GitHub stats):** TypeScript 65.9%, Python 32.3%, CSS 1.6%

### 6.4. UI/UX — Giao diện cơ bản, luồng trơn tru

**UI highlights:**

- Gradient backgrounds (blue-50 → purple-50)
- Responsive grid (sm:grid-cols-2, lg:grid-cols-3/4)
- Hover effects (shadow-xl, -translate-y-1, scale-105)
- Loading states (Loader2 animate-spin)
- Error messages (red-50 bg, red-600 text)
- Success feedback (green-50, alert)
- Sticky header with backdrop-blur-md
- Mobile hamburger menu (md:flex / md:hidden)

**UX validations đã implement:**

- TripPlanning: required destination, startDate, endDate, budget, ≥1 interest, **endDate > startDate**
- Register: password ≥6 chars, password confirm match
- Login: email required, password required
- Profile: email disabled (không cho đổi)
- ItineraryView: fallback redirect to `/trip-planning` (not homepage) khi lỗi

---

## 7. Kiểm tra Deployment (Vercel + Render)

### 7.1. Cấu hình deployment hiện tại

**Frontend (Vercel):**

- File: `vercel.json` — SPA rewrite `/(.*) → /index.html`
- Build: `npm run build` (Vite)
- Env var cần set: `VITE_API_BASE_URL` = URL backend trên Render

**Backend (Render):**

- File: `render.yaml` — Blueprint
  - PostgreSQL 16, free tier, region Oregon
  - Python web service, `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Env vars: `DATABASE_URL` (auto from DB), `JWT_SECRET_KEY` (auto generate), `GEMINI_API_KEY`, `FRONTEND_URL`
- `config.py`: auto-convert `postgresql://` → `postgresql+asyncpg://` cho Render

### 7.2. Checklist kiểm tra deployment

| #   | Mục kiểm tra               | Cách test                                                   | Cần kiểm tra                                                               |
| --- | -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | BE health check            | `curl https://<render-url>/health` → `{"status":"healthy"}` | ✅ render.yaml đúng                                                        |
| 2   | Swagger docs               | `https://<render-url>/docs` → Swagger UI                    | ✅ FastAPI auto-gen                                                        |
| 3   | CORS                       | FE gọi BE không bị block                                    | Cần set `FRONTEND_URL` = Vercel URL trong Render Dashboard                 |
| 4   | DB auto-create tables      | BE startup log "✅ Database tables created"                 | ✅ `main.py` lifespan                                                      |
| 5   | DATABASE_URL fix           | Render provides `postgresql://`                             | ✅ `config.py` `model_post_init()` auto-convert to `postgresql+asyncpg://` |
| 6   | FE SPA routing             | `https://<vercel-url>/trip-planning` không 404              | ✅ `vercel.json` rewrite                                                   |
| 7   | FE → BE API                | `api.ts` gọi `VITE_API_BASE_URL`                            | Cần set env var trong Vercel Dashboard                                     |
| 8   | Register + Login           | POST /auth/register, POST /auth/login                       | Cần DB + JWT_SECRET_KEY                                                    |
| 9   | Generate itinerary (Guest) | POST /itineraries/generate (no token)                       | Cần GEMINI_API_KEY hoặc fallback                                           |
| 10  | Generate itinerary (User)  | POST /itineraries/generate (with token)                     | Trip.user_id sẽ được set                                                   |

### 7.3. Các việc cần làm sau deploy

Nếu chưa set đủ environment variables, cần:

1. **Render Dashboard → Environment:**
   - `FRONTEND_URL` = `https://<your-vercel-domain>.vercel.app`
   - `GEMINI_API_KEY` = API key từ https://aistudio.google.com/apikey
   - `JWT_SECRET_KEY` = (auto-generated bởi Render)
   - `DATABASE_URL` = (auto from Render PostgreSQL)

2. **Vercel Dashboard → Settings → Environment Variables:**
   - `VITE_API_BASE_URL` = `https://<your-render-service>.onrender.com/api/v1`

3. **Sau khi set xong:** Trigger redeploy cả 2 (Render auto-deploy khi push, Vercel cũng vậy)

### 7.4. Lưu ý quan trọng

- **Render free tier:** Server tự sleep sau 15 phút không có request → cold start mất 30-60s lần đầu
- **Vercel free tier:** Unlimited static hosting, phù hợp SPA
- **CORS:** `main.py` đã config `allowed_origins` gồm cả `settings.FRONTEND_URL` và localhost variants
- **Fallback mode:** Nếu BE down, FE `itinerary.ts` tự fallback sang mock data local → app vẫn chạy được (nhưng không lưu DB)

---

## 8. Tổng hợp Diagram ↔ Code mapping

| Diagram                  | File                                                        | Mapping Code                                                             |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Database_MVP.png` (ERD) | 4 models: `user.py`, `trip.py`, `place.py`, `trip_place.py` | ERD đúng + bổ sung fields cho FE compat                                  |
| `DFD.png`                | Routers + Services + Database                               | P1→TripPlanning, P2→itinerary_service+Gemini, P3→totalCost calc, P4→CRUD |
| `Sequence_Guest.png`     | `Home→TripPlanning→generate→ItineraryView→register modal`   | 5 lifelines đúng luồng FE→BE→DB→AI                                       |
| `Sequence_Register.png`  | `Login→Profile→TripPlanning→ItineraryView→SavedItineraries` | Bao gồm auth flow + CRUD đầy đủ                                          |
| `UML-Guest.png`          | 7 UC (UC01-UC07)                                            | Tất cả map đúng FE pages + BE endpoints                                  |
| `UML-Register.png`       | 9 UC (UC08-UC16)                                            | UC16 chưa implement (MVP#2 planned)                                      |

---

## 9. Tổng kết

| Yêu cầu                   | Trạng thái       | Chi tiết                                                                   |
| ------------------------- | ---------------- | -------------------------------------------------------------------------- |
| 1. Use-cases & Người dùng | ✅ Đầy đủ        | 2 nhóm user, 16 UC, 15/16 đã implement                                     |
| 2. Cạnh tranh & USP       | ✅ Đầy đủ        | 3 nhóm đối thủ, 4 lợi thế, 4 rào cản sao chép, USP rõ ràng                 |
| 3. System Architecture    | ✅ Mô tả text    | FE(Vercel)↔BE(Render)↔PostgreSQL↔Gemini AI — cần vẽ diagram bổ sung        |
| 4. DFD + UML              | ✅ Có 6 diagrams | DFD, 2 Sequence, 2 UML Use-case + ERD                                      |
| 5. Database (ERD)         | ✅ Đầy đủ        | 4 bảng normalized, N-N qua junction, ERD có ảnh + code khớp                |
| 6. MVP chạy được          | ✅ Hoạt động     | FE 8 pages + BE 19 API endpoints + AI + deploy configs                     |
| Tech Stack giải thích     | ✅               | React (SPA) + FastAPI (async AI) + PostgreSQL (ACID) + Gemini (tiếng Việt) |
| Minh chứng nhóm           | ✅               | 31 commits, 3 contributors trên GitHub                                     |
| UI/UX trơn tru            | ✅               | Responsive, loading states, validation, error handling                     |
