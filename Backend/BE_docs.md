# Backend Documentation — Du Lịch Việt API (MVP #1)

> Tài liệu mô tả chi tiết Backend FastAPI, bao gồm kiến trúc, database, API endpoints, và hướng dẫn chạy.
> **Status:** Đã triển khai — Đây là tài liệu thực tế sau khi code.

---

## 1. Tổng quan kiến trúc

```
Backend/
├── main.py                 # FastAPI entry point, CORS, router registration
├── seed_data.py            # Script seed dữ liệu mẫu vào DB
├── requirements.txt        # Python dependencies
├── .env.example            # Template biến môi trường
├── BE_docs.md              # Tài liệu này
└── app/
    ├── __init__.py
    ├── config.py            # Pydantic Settings — đọc .env
    ├── database.py          # SQLAlchemy async engine + session
    ├── models/              # SQLAlchemy ORM models (4 bảng ERD)
    │   ├── __init__.py
    │   ├── user.py          # Bảng users
    │   ├── trip.py          # Bảng trips
    │   ├── place.py         # Bảng places
    │   └── trip_place.py    # Bảng trip_places (junction N-N)
    ├── schemas/             # Pydantic v2 request/response schemas
    │   ├── __init__.py
    │   ├── auth.py          # Register/Login schemas
    │   ├── user.py          # UserResponse, UserUpdateRequest
    │   ├── trip.py          # ItineraryResponse, TripCreateRequest
    │   └── place.py         # PlaceResponse, ActivityResponse
    ├── routers/             # FastAPI APIRouter endpoints
    │   ├── __init__.py
    │   ├── auth.py          # POST /register, /login
    │   ├── users.py         # GET/PUT /profile
    │   ├── trips.py         # Itinerary CRUD + AI generate
    │   └── places.py        # Destinations list
    ├── services/            # Business logic layer
    │   ├── __init__.py
    │   ├── auth_service.py  # Register/Login logic
    │   ├── user_service.py  # Profile update logic
    │   └── itinerary_service.py # AI generation + CRUD
    └── utils/               # Utilities
        ├── __init__.py
        ├── security.py      # JWT token + password hashing (bcrypt)
        └── dependencies.py  # FastAPI DI (get_current_user, get_db)
```

### Tech Stack

| Thành phần | Công nghệ                        | Phiên bản |
| ---------- | -------------------------------- | --------- |
| Framework  | FastAPI                          | 0.115.6   |
| DB         | PostgreSQL + asyncpg             | 16+       |
| ORM        | SQLAlchemy 2.0 (async)           | 2.0.36    |
| Validation | Pydantic v2                      | 2.10.3    |
| Auth       | JWT (python-jose) + bcrypt       | 3.3.0     |
| AI         | Google Gemini (gemini-1.5-flash) | 0.8.3     |
| Server     | Uvicorn                          | 0.34.0    |

---

## 2. Database Schema (ERD 4 bảng)

Theo ERD `Database_MVP.png` — 4 bảng chính + bổ sung cột cho FE compatibility:

### 2.1 Bảng `users`

```
user_id (PK, UUID)     → id
full_name (VARCHAR 255) → FE: name
email (VARCHAR 255, UNIQUE, INDEX)
password_hash (VARCHAR 255) → ERD: password
role (VARCHAR 50, default='user')
phone (VARCHAR 20, nullable)       ← FE bổ sung
interests (ARRAY[VARCHAR], nullable) ← FE bổ sung
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### 2.2 Bảng `trips`

```
trip_id (PK, UUID)     → id
user_id (FK → users.id, nullable) → guest = NULL
destination (VARCHAR 255, INDEX)
total_days (INTEGER)
budget (NUMERIC 15,2)
start_date (DATE)      ← FE bổ sung
end_date (DATE)        ← FE bổ sung
interests (ARRAY[VARCHAR], nullable) ← FE bổ sung
total_cost (NUMERIC 15,2) ← FE bổ sung
score (INTEGER, nullable) ← AI scoring
rating (INTEGER, nullable) ← User rating 1-5
feedback (TEXT, nullable)  ← User feedback
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### 2.3 Bảng `places`

```
place_id (PK, UUID)    → id
place_name (VARCHAR 500, INDEX)
category (VARCHAR 100, INDEX)
rating (NUMERIC 3,1)
popularity_score (NUMERIC 5,1)
description (TEXT)     ← FE bổ sung
location (VARCHAR 500) ← FE bổ sung
cost (NUMERIC 15,2)    ← FE bổ sung
duration (VARCHAR 100) ← FE bổ sung
image (TEXT)           ← FE bổ sung
latitude (NUMERIC 10,7) ← FE bổ sung
longitude (NUMERIC 10,7) ← FE bổ sung
destination (VARCHAR 255, INDEX) ← group by city
created_at (TIMESTAMPTZ)
```

### 2.4 Bảng `trip_places` (Junction N-N)

```
trip_place_id (PK, UUID) → id
trip_id (FK → trips.id, INDEX)
place_id (FK → places.id, INDEX)
day_number (INTEGER)
visit_order (INTEGER)
time (VARCHAR 10)      ← FE bổ sung (giờ visit)
custom_cost (NUMERIC 15,2) ← override place.cost
notes (TEXT)
created_at (TIMESTAMPTZ)
```

### Relationships

```
users 1──N trips (user_id FK)
trips 1──N trip_places (trip_id FK)
places 1──N trip_places (place_id FK)
→ trips N──N places (thông qua trip_places)
```

---

## 3. API Endpoints

Base URL: `http://localhost:8000/api/v1`

### 3.1 Authentication (`/auth`)

| Method | Endpoint         | Mô tả     | Auth | FE mapping       |
| ------ | ---------------- | --------- | ---- | ---------------- |
| POST   | `/auth/register` | Đăng ký   | No   | `registerUser()` |
| POST   | `/auth/login`    | Đăng nhập | No   | `loginUser()`    |

**Register Request:**

```json
{ "email": "user@example.com", "password": "abc123", "name": "Nguyễn Văn A" }
```

**Auth Response:**

```json
{
	"success": true,
	"access_token": "eyJhbGci...",
	"token_type": "bearer",
	"user": { "id": "uuid", "email": "...", "name": "...", "createdAt": "..." }
}
```

### 3.2 Users (`/users`)

| Method | Endpoint         | Mô tả            | Auth   | FE mapping            |
| ------ | ---------------- | ---------------- | ------ | --------------------- |
| GET    | `/users/profile` | Lấy profile      | Bearer | `getCurrentUser()`    |
| PUT    | `/users/profile` | Cập nhật profile | Bearer | `updateUserProfile()` |

### 3.3 Itineraries (`/itineraries`)

| Method | Endpoint                             | Mô tả               | Auth     | FE mapping              |
| ------ | ------------------------------------ | ------------------- | -------- | ----------------------- |
| POST   | `/itineraries/generate`              | Tạo lịch trình AI   | Optional | `generateItinerary()`   |
| GET    | `/itineraries/`                      | Danh sách đã lưu    | Bearer   | `getSavedItineraries()` |
| GET    | `/itineraries/{id}`                  | Chi tiết lịch trình | No       | `getItineraryById()`    |
| DELETE | `/itineraries/{id}`                  | Xóa lịch trình      | Bearer   | `deleteItinerary()`     |
| PUT    | `/itineraries/{id}/rating`           | Đánh giá            | Optional | `rateItinerary()`       |
| DELETE | `/itineraries/{id}/activities/{aid}` | Xóa activity        | Bearer   | Edit mode               |

**Generate Request:**

```json
{
	"destination": "Hà Nội",
	"startDate": "2025-01-15",
	"endDate": "2025-01-18",
	"budget": 5000000,
	"interests": ["culture", "food"]
}
```

**Itinerary Response (khớp FE interface Itinerary):**

```json
{
	"id": "uuid",
	"userId": "uuid",
	"destination": "Hà Nội",
	"startDate": "2025-01-15",
	"endDate": "2025-01-18",
	"budget": 5000000,
	"interests": ["culture", "food"],
	"days": [
		{
			"day": 1,
			"date": "2025-01-15",
			"activities": [
				{
					"id": "trip_place_uuid",
					"time": "09:00",
					"title": "Hồ Hoàn Kiếm",
					"description": "Tham quan hồ Hoàn Kiếm và đền Ngọc Sơn",
					"location": "Quận Hoàn Kiếm, Hà Nội",
					"cost": 0,
					"duration": "2 giờ",
					"image": "https://...",
					"coordinates": null
				}
			]
		}
	],
	"totalCost": 3430000,
	"createdAt": "2025-01-15T10:00:00+07:00",
	"rating": null,
	"feedback": null
}
```

### 3.4 Destinations (`/destinations`)

| Method | Endpoint                      | Mô tả                  | Auth | FE mapping            |
| ------ | ----------------------------- | ---------------------- | ---- | --------------------- |
| GET    | `/destinations/`              | Danh sách điểm đến     | No   | TripPlanning dropdown |
| GET    | `/destinations/{name}/places` | Places của destination | No   | —                     |

---

## 4. Flow chính

### 4.1 Đăng ký + Đăng nhập

```
FE Register form → POST /auth/register
  → auth_service.register_user()
    → Check email trùng (SELECT)
    → hash_password() (bcrypt)
    → INSERT users
    → create_access_token() (JWT)
  → Response: { success, access_token, user }

FE Login form → POST /auth/login
  → auth_service.login_user()
    → SELECT user BY email
    → verify_password()
    → create_access_token()
  → Response: { success, access_token, user }
```

### 4.2 Tạo lịch trình (AI)

```
FE TripPlanning → POST /itineraries/generate
  → get_current_user_optional() → user hoặc None
  → itinerary_service.generate_itinerary()
    → Thử _generate_with_ai() (Gemini API)
      → Gửi prompt → Nhận JSON activities
    → Fallback: _generate_fallback_activities()
      → Mock data từ FALLBACK_DATA (giống FE itinerary.ts)
    → INSERT trip
    → _get_or_create_place() cho mỗi activity
    → INSERT trip_places (junction)
    → Tính total_cost
  → Response: ItineraryResponse
```

### 4.3 Xem + Quản lý lịch trình

```
FE SavedItineraries → GET /itineraries/
  → get_current_user() (bắt buộc đăng nhập)
  → itinerary_service.get_user_itineraries()
  → Response: { itineraries[], total }

FE ItineraryView → GET /itineraries/{id}
  → itinerary_service.get_itinerary_by_id()
  → SELECT trip JOIN trip_places JOIN places
  → Response: ItineraryResponse (full days + activities)
```

---

## 5. Naming Convention (ERD ↔ FE)

| Domain     | ERD (DB)          | FE (TypeScript) | API URL             |
| ---------- | ----------------- | --------------- | ------------------- |
| Lịch trình | Trip              | Itinerary       | `/itineraries`      |
| Hoạt động  | TripPlace + Place | Activity        | activities (nested) |
| Người dùng | User              | User            | `/users`            |
| Tên người  | full_name         | name            | alias mapping       |
| Ngày tạo   | created_at        | createdAt       | alias mapping       |

---

## 6. Hướng dẫn chạy

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- (Optional) Gemini API key

### Setup

```bash
# 1. Vào thư mục Backend
cd Backend

# 2. Tạo virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# 3. Cài dependencies
pip install -r requirements.txt

# 4. Tạo database PostgreSQL
# psql -U postgres
# CREATE DATABASE dulichviet;

# 5. Copy .env.example → .env, sửa DATABASE_URL
copy .env.example .env
# Sửa: DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/dulichviet

# 6. Seed dữ liệu mẫu
python seed_data.py

# 7. Chạy server
uvicorn main:app --reload --port 8000
```

### Test

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/
- Run FE: `npm run dev` (port 5173 hoặc 5174) → FE gọi API tới port 8000
- CORS cho phép: localhost:5173, 5174, 3000, 127.0.0.1:5173, 127.0.0.1:5174

---

## 7. Biến môi trường (.env)

| Biến                          | Mô tả                        | Mặc định                                                           |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet` |
| `JWT_SECRET_KEY`              | Secret key ký JWT            | `super-secret-key-change-in-production`                            |
| `JWT_ALGORITHM`               | Thuật toán JWT               | `HS256`                                                            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expire (phút)          | `1440` (24h)                                                       |
| `GEMINI_API_KEY`              | Google Gemini API key        | `""` (empty = dùng fallback)                                       |
| `FRONTEND_URL`                | FE URL cho CORS              | `http://localhost:5173`                                            |
| `DEBUG`                       | Debug mode                   | `True`                                                             |
