# 📋 Kế hoạch Backend — FastAPI cho MVP #1

> Tài liệu chi tiết kế hoạch xây dựng Backend bằng FastAPI, bao gồm cấu trúc thư mục, API endpoints, database schema, và hướng dẫn tích hợp với Frontend React hiện tại.

---

## 🎯 Mục tiêu

Xây dựng Backend API hoàn chỉnh để:

1. Thay thế toàn bộ localStorage logic trong FE bằng API calls thực
2. Tích hợp AI service để tạo lịch trình du lịch thông minh
3. Quản lý database PostgreSQL cho users, itineraries, activities
4. Đảm bảo FE hiện tại có thể gọi đúng các API mà không cần refactor lớn

---

## 🛠️ Tech Stack Backend

| Công nghệ               | Vai trò            | Lý do chọn                                              |
| ----------------------- | ------------------ | ------------------------------------------------------- |
| **Python 3.11+**        | Ngôn ngữ backend   | Hỗ trợ AI/ML tốt, FastAPI ecosystem                     |
| **FastAPI**             | Web framework      | Async, auto-docs (Swagger), type validation, nhanh      |
| **PostgreSQL**          | Database           | Relational, hỗ trợ JSONB cho flexible data, phù hợp ERD |
| **SQLAlchemy 2.0**      | ORM                | Async support, mature, type-safe queries                |
| **Alembic**             | Database migration | Versioned schema changes                                |
| **Pydantic v2**         | Data validation    | Tích hợp sẵn với FastAPI, validation mạnh               |
| **python-jose / PyJWT** | JWT Authentication | Tạo/verify JSON Web Tokens                              |
| **passlib[bcrypt]**     | Password hashing   | Hash password an toàn                                   |
| **httpx**               | HTTP client        | Gọi AI service (async)                                  |
| **google-generativeai** | AI SDK             | Gọi Google Gemini API (hoặc OpenAI)                     |
| **uvicorn**             | ASGI server        | Production-ready server cho FastAPI                     |
| **python-dotenv**       | Environment vars   | Quản lý secrets (.env)                                  |
| **alembic**             | DB migrations      | Quản lý schema changes                                  |

---

## 📁 Cấu trúc thư mục Backend

```
Backend/
├── main.py                      # Entry point FastAPI app
├── requirements.txt             # Python dependencies
├── .env.example                 # Template environment variables
├── alembic.ini                  # Alembic migration config
├── alembic/                     # Database migrations
│   ├── env.py
│   └── versions/
│       └── 001_initial.py
├── app/
│   ├── __init__.py
│   ├── config.py                # Settings & environment variables
│   ├── database.py              # Database connection & session
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py              # User model
│   │   ├── itinerary.py         # Itinerary + ItineraryDay models
│   │   └── activity.py          # Activity model
│   ├── schemas/                 # Pydantic schemas (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py              # Login/Register request/response
│   │   ├── user.py              # User profile schemas
│   │   ├── itinerary.py         # Itinerary CRUD schemas
│   │   └── activity.py          # Activity schemas
│   ├── routers/                 # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py              # POST /auth/register, /auth/login, etc.
│   │   ├── users.py             # PUT /users/profile
│   │   └── itineraries.py       # CRUD + AI generate itineraries
│   ├── services/                # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py      # Auth business logic
│   │   ├── user_service.py      # User CRUD logic
│   │   ├── itinerary_service.py # Itinerary CRUD logic
│   │   └── ai_service.py        # AI itinerary generation
│   ├── middleware/               # Middleware
│   │   ├── __init__.py
│   │   └── cors.py              # CORS configuration
│   └── utils/                   # Utility functions
│       ├── __init__.py
│       ├── security.py          # JWT create/verify, password hash
│       └── dependencies.py      # FastAPI dependencies (get_current_user, etc.)
├── tests/                       # Unit & integration tests
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_itineraries.py
│   └── conftest.py
└── BE_docs.md                   # Backend documentation
```

---

## 🗄️ Database Schema (PostgreSQL)

### Bảng `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    interests TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Bảng `itineraries`

```sql
CREATE TABLE itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(12, 0) NOT NULL,
    interests TEXT[] DEFAULT '{}',
    total_cost DECIMAL(12, 0) DEFAULT 0,
    score SMALLINT,                          -- Điểm đánh giá AI (0-100)
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),  -- Đánh giá user
    feedback TEXT,
    ai_prompt TEXT,                           -- Lưu prompt đã gửi AI
    ai_response TEXT,                         -- Lưu response gốc từ AI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX idx_itineraries_destination ON itineraries(destination);
```

### Bảng `itinerary_days`

```sql
CREATE TABLE itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_itinerary_days_itinerary ON itinerary_days(itinerary_id);
```

### Bảng `activities`

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
    time TIME NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200) NOT NULL,
    cost DECIMAL(10, 0) DEFAULT 0,
    duration VARCHAR(50),
    image TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    category VARCHAR(50),                    -- 'food', 'sightseeing', 'transport', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_day ON activities(day_id);
```

### Bảng `destinations` (Master data)

```sql
CREATE TABLE destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    region VARCHAR(50),                      -- 'bac', 'trung', 'nam'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Mối quan hệ

```
users (1) ←─── (N) itineraries      [ON DELETE SET NULL]
itineraries (1) ←─── (N) itinerary_days  [ON DELETE CASCADE]
itinerary_days (1) ←─── (N) activities   [ON DELETE CASCADE]
```

---

## 🔌 API Endpoints Chi tiết

### Base URL: `http://localhost:8000/api/v1`

---

### 🔐 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`

**Mục đích:** Đăng ký tài khoản mới  
**FE gọi từ:** `Register.tsx` → thay thế `registerUser()` trong `auth.ts`

**Request Body:**

```json
{
	"name": "Nguyễn Văn A",
	"email": "user@example.com",
	"password": "matkhau123"
}
```

**Response 201:**

```json
{
	"access_token": "eyJhbGciOiJIUzI1NiIs...",
	"token_type": "bearer",
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"name": "Nguyễn Văn A",
		"phone": null,
		"interests": [],
		"created_at": "2026-03-03T10:00:00Z"
	}
}
```

**Response 400:**

```json
{
	"detail": "Email đã được sử dụng"
}
```

**Logic xử lý:**

1. Validate email format + password length ≥ 6
2. Check email chưa tồn tại trong DB
3. Hash password bằng bcrypt
4. INSERT user vào bảng `users`
5. Tạo JWT access token
6. Return token + user info

---

#### `POST /api/v1/auth/login`

**Mục đích:** Đăng nhập  
**FE gọi từ:** `Login.tsx` → thay thế `loginUser()` trong `auth.ts`

**Request Body:**

```json
{
	"email": "user@example.com",
	"password": "matkhau123"
}
```

**Response 200:**

```json
{
	"access_token": "eyJhbGciOiJIUzI1NiIs...",
	"token_type": "bearer",
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"email": "user@example.com",
		"name": "Nguyễn Văn A",
		"phone": "0123456789",
		"interests": ["Văn hóa - Lịch sử", "Ẩm thực"],
		"created_at": "2026-03-03T10:00:00Z"
	}
}
```

**Response 401:**

```json
{
	"detail": "Email hoặc mật khẩu không đúng"
}
```

**Logic xử lý:**

1. Tìm user bằng email
2. Verify password bằng bcrypt
3. Tạo JWT access token (expires 24h)
4. Return token + user info

---

#### `GET /api/v1/auth/me`

**Mục đích:** Lấy thông tin user hiện tại từ JWT token  
**FE gọi từ:** `Header.tsx`, `Profile.tsx` → thay thế `getCurrentUser()` từ localStorage  
**Auth:** 🔒 Required (Bearer token)

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response 200:**

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"email": "user@example.com",
	"name": "Nguyễn Văn A",
	"phone": "0123456789",
	"interests": ["Văn hóa - Lịch sử", "Ẩm thực"],
	"created_at": "2026-03-03T10:00:00Z"
}
```

**Response 401:**

```json
{
	"detail": "Token không hợp lệ hoặc đã hết hạn"
}
```

---

#### `POST /api/v1/auth/logout`

**Mục đích:** Đăng xuất (client-side: xóa token)  
**FE gọi từ:** `Header.tsx` → thay thế `logoutUser()`

> **Lưu ý:** Với JWT stateless, logout chủ yếu là client xóa token. Nếu cần blacklist token ở server, cần thêm bảng `token_blacklist`.

---

### 👤 Users (`/api/v1/users`)

#### `PUT /api/v1/users/profile`

**Mục đích:** Cập nhật thông tin cá nhân  
**FE gọi từ:** `Profile.tsx` → thay thế `updateUserProfile()`  
**Auth:** 🔒 Required

**Request Body:**

```json
{
	"name": "Nguyễn Văn B",
	"phone": "0987654321",
	"interests": ["Ẩm thực", "Biển", "Phiêu lưu"]
}
```

**Response 200:**

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"email": "user@example.com",
	"name": "Nguyễn Văn B",
	"phone": "0987654321",
	"interests": ["Ẩm thực", "Biển", "Phiêu lưu"],
	"created_at": "2026-03-03T10:00:00Z"
}
```

---

### 🗺️ Itineraries (`/api/v1/itineraries`)

#### `POST /api/v1/itineraries/generate`

**Mục đích:** AI tạo lịch trình du lịch mới  
**FE gọi từ:** `TripPlanning.tsx` → thay thế `generateItinerary()` trong `itinerary.ts`  
**Auth:** 🔓 Optional (guest có thể dùng, registered user được cá nhân hóa)

**Request Body:**

```json
{
	"destination": "Đà Nẵng",
	"start_date": "2026-04-01",
	"end_date": "2026-04-04",
	"budget": 5000000,
	"interests": ["culture", "food", "beach"]
}
```

**Response 201:**

```json
{
	"id": "660e8400-e29b-41d4-a716-446655440001",
	"user_id": "550e8400-e29b-41d4-a716-446655440000",
	"destination": "Đà Nẵng",
	"start_date": "2026-04-01",
	"end_date": "2026-04-04",
	"budget": 5000000,
	"interests": ["culture", "food", "beach"],
	"total_cost": 4850000,
	"score": 95,
	"days": [
		{
			"day": 1,
			"date": "2026-04-01",
			"activities": [
				{
					"id": "activity-uuid-1",
					"time": "09:00",
					"title": "Bãi biển Mỹ Khê",
					"description": "Tắm biển và thư giãn",
					"location": "Đà Nẵng",
					"cost": 0,
					"duration": "3 giờ",
					"image": "https://...",
					"coordinates": { "lat": 16.0544, "lng": 108.2272 }
				},
				{
					"id": "activity-uuid-2",
					"time": "13:00",
					"title": "Ăn trưa tại Mì Quảng Bà Vị",
					"description": "Thưởng thức mì Quảng đặc sản",
					"location": "166 Lê Đình Dương, Đà Nẵng",
					"cost": 45000,
					"duration": "1 giờ",
					"image": "https://...",
					"coordinates": { "lat": 16.0678, "lng": 108.2208 }
				}
			]
		}
	],
	"created_at": "2026-03-03T10:00:00Z",
	"rating": null,
	"feedback": null
}
```

**Logic xử lý chi tiết:**

1. Validate input (dates, budget > 0, interests not empty)
2. Nếu có JWT → lấy user info + sở thích + lịch sử để cá nhân hóa
3. **Phân bổ ngân sách:**
   - 40% ăn uống
   - 30% tham quan
   - 20% di chuyển
   - 10% dự phòng
4. **Gọi AI Service** (Google Gemini / OpenAI):
   - Tạo prompt với: destination, dates, budget breakdown, interests
   - Yêu cầu AI trả về JSON có cấu trúc (activities per day)
5. **Parse AI response** → validate & format theo Pydantic schema
6. **Tính score:** So sánh chi phí thực tế vs phân bổ ban đầu
7. **Lưu vào DB:** INSERT itinerary + days + activities
8. Return kết quả

---

#### `GET /api/v1/itineraries`

**Mục đích:** Lấy danh sách itineraries của user hiện tại  
**FE gọi từ:** `SavedItineraries.tsx` → thay thế `getSavedItineraries(userId)`  
**Auth:** 🔒 Required

**Query Params:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response 200:**

```json
{
	"items": [
		{
			"id": "660e8400...",
			"destination": "Đà Nẵng",
			"start_date": "2026-04-01",
			"end_date": "2026-04-04",
			"budget": 5000000,
			"total_cost": 4850000,
			"interests": ["culture", "food", "beach"],
			"rating": 4,
			"feedback": "Lịch trình rất hợp lý!",
			"days_count": 3,
			"created_at": "2026-03-03T10:00:00Z"
		}
	],
	"total": 5,
	"page": 1,
	"limit": 20
}
```

---

#### `GET /api/v1/itineraries/{id}`

**Mục đích:** Lấy chi tiết 1 itinerary  
**FE gọi từ:** `ItineraryView.tsx` → thay thế `getItineraryById(id)`  
**Auth:** 🔓 Optional (public itineraries hoặc kiểm tra ownership)

**Response 200:** Giống response của `/generate` — full itinerary object với days + activities

---

#### `PUT /api/v1/itineraries/{id}`

**Mục đích:** Cập nhật itinerary (chỉnh sửa activities)  
**FE gọi từ:** `ItineraryView.tsx` — khi user xóa/sửa activity  
**Auth:** 🔒 Required (chỉ owner)

**Request Body:**

```json
{
	"days": [
		{
			"day": 1,
			"date": "2026-04-01",
			"activities": [
				{
					"id": "activity-uuid-1",
					"time": "09:00",
					"title": "Bãi biển Mỹ Khê",
					"description": "Tắm biển và thư giãn",
					"location": "Đà Nẵng",
					"cost": 0,
					"duration": "3 giờ",
					"image": "https://..."
				}
			]
		}
	]
}
```

**Logic:** Xóa days + activities cũ → INSERT mới → recalculate total_cost + score

---

#### `DELETE /api/v1/itineraries/{id}`

**Mục đích:** Xóa itinerary  
**FE gọi từ:** `SavedItineraries.tsx` → thay thế `deleteItinerary(id)`  
**Auth:** 🔒 Required (chỉ owner)

**Response 204:** No content

---

#### `POST /api/v1/itineraries/{id}/rate`

**Mục đích:** Đánh giá lịch trình  
**FE gọi từ:** `ItineraryView.tsx` → thay thế `rateItinerary()`  
**Auth:** 🔓 Optional

**Request Body:**

```json
{
	"rating": 4,
	"feedback": "Lịch trình rất hợp lý, tuy nhiên nên thêm nhiều quán ăn hơn"
}
```

**Response 200:**

```json
{
	"id": "660e8400...",
	"rating": 4,
	"feedback": "Lịch trình rất hợp lý, tuy nhiên nên thêm nhiều quán ăn hơn"
}
```

---

#### `POST /api/v1/itineraries/{id}/save`

**Mục đích:** Gán itinerary cho user (guest → registered)  
**FE gọi từ:** `ItineraryView.tsx` → `handleSave()`  
**Auth:** 🔒 Required

**Logic:** UPDATE `itineraries SET user_id = current_user.id WHERE id = :id`

---

### 📍 Destinations (`/api/v1/destinations`)

#### `GET /api/v1/destinations`

**Mục đích:** Lấy danh sách điểm đến cho dropdown  
**FE gọi từ:** `TripPlanning.tsx` (thay thế hardcoded array), `Home.tsx` (popular destinations)  
**Auth:** 🔓 Public

**Response 200:**

```json
[
	{
		"id": 1,
		"name": "Hà Nội",
		"description": "Thủ đô ngàn năm văn hiến",
		"image": "https://...",
		"region": "bac"
	},
	{
		"id": 2,
		"name": "TP. Hồ Chí Minh",
		"description": "Thành phố năng động và hiện đại",
		"image": "https://...",
		"region": "nam"
	}
]
```

---

## 🤖 AI Service — Chi tiết thiết kế

### Kiến trúc

```
TripPlanning (FE)
    ↓ POST /api/v1/itineraries/generate
Backend (FastAPI)
    ↓ ai_service.py
    ↓ Tạo structured prompt
    ↓ Gọi Google Gemini API / OpenAI API
AI Service (External)
    ↓ JSON response
Backend (FastAPI)
    ↓ Parse + validate + save to DB
    ↓ Return to FE
ItineraryView (FE)
```

### Prompt Template (ví dụ)

```python
PROMPT_TEMPLATE = """
Bạn là chuyên gia du lịch Việt Nam. Hãy tạo lịch trình du lịch chi tiết dựa trên:

- Điểm đến: {destination}
- Số ngày: {num_days} (từ {start_date} đến {end_date})
- Ngân sách tổng: {budget} VND
- Phân bổ ngân sách:
  + Ăn uống: {food_budget} VND (40%)
  + Tham quan: {sightseeing_budget} VND (30%)
  + Di chuyển: {transport_budget} VND (20%)
  + Dự phòng: {reserve_budget} VND (10%)
- Sở thích: {interests}

Yêu cầu:
1. Mỗi ngày có 3-4 hoạt động (sáng, trưa, chiều, tối)
2. Chi phí mỗi hoạt động phải nằm trong phân bổ ngân sách
3. Bao gồm địa chỉ cụ thể + tọa độ GPS
4. Thời gian dự kiến cho mỗi hoạt động
5. Mô tả ngắn gọn về mỗi địa điểm

Trả về JSON format:
{{
    "days": [
        {{
            "day": 1,
            "activities": [
                {{
                    "time": "09:00",
                    "title": "Tên địa điểm",
                    "description": "Mô tả ngắn",
                    "location": "Địa chỉ chi tiết",
                    "cost": 50000,
                    "duration": "2 giờ",
                    "category": "sightseeing",
                    "latitude": 16.0544,
                    "longitude": 108.2272
                }}
            ]
        }}
    ]
}}
"""
```

### Xử lý AI Response

```python
# Pseudo code
async def generate_itinerary(request: ItineraryGenerateRequest, user: Optional[User]):
    # 1. Phân bổ ngân sách
    budget_breakdown = allocate_budget(request.budget)

    # 2. Nếu user có lịch sử → điều chỉnh prompt
    user_context = ""
    if user:
        history = get_user_history(user.id)
        user_context = f"Lịch sử: {history.preferred_categories}, Ngân sách trung bình: {history.avg_budget}"

    # 3. Tạo prompt
    prompt = PROMPT_TEMPLATE.format(
        destination=request.destination,
        budget=request.budget,
        food_budget=budget_breakdown['food'],
        ...
    )

    # 4. Gọi AI
    ai_response = await call_gemini_api(prompt)

    # 5. Parse & validate
    itinerary_data = parse_ai_response(ai_response)

    # 6. Tính score
    score = calculate_score(itinerary_data, budget_breakdown)

    # 7. Lưu DB
    itinerary = save_to_db(itinerary_data, request, user, score)

    return itinerary
```

### Cơ chế Scoring (Chấm điểm lịch trình)

```python
def calculate_score(itinerary_data, budget_breakdown):
    score = 100

    # Tính chi phí thực tế theo category
    actual_costs = {
        'food': sum(a.cost for a in activities if a.category == 'food'),
        'sightseeing': sum(a.cost for a in activities if a.category == 'sightseeing'),
        'transport': sum(a.cost for a in activities if a.category == 'transport'),
    }

    # Trừ điểm nếu vượt phân bổ
    for category, planned in budget_breakdown.items():
        actual = actual_costs.get(category, 0)
        if actual > planned:
            deviation = (actual - planned) / planned * 100
            score -= min(deviation / 4, 15)  # Tối đa trừ 15 điểm/category

    # Trừ điểm nếu mật độ hoạt động bất hợp lý
    for day in itinerary_data.days:
        if len(day.activities) < 2:
            score -= 5  # Ngày quá ít hoạt động
        elif len(day.activities) > 5:
            score -= 3  # Ngày quá nhiều hoạt động

    return max(0, round(score))
```

---

## 🔐 Authentication Flow

### JWT Token Flow

```
1. User register/login → Backend tạo JWT (secret key + expiry 24h)
2. Frontend lưu JWT vào localStorage (hoặc httpOnly cookie)
3. Mỗi request → FE gửi Header: Authorization: Bearer <token>
4. Backend verify JWT → extract user_id → proceed
5. Token expired → FE redirect /login
```

### Security Configuration

```python
# config.py
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# security.py
def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> str:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload["sub"]  # user_id

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

---

## 🔧 CORS Configuration

FE chạy trên `localhost:5173` (Vite dev server), BE chạy trên `localhost:8000`.

```python
# middleware/cors.py
from fastapi.middleware.cors import CORSMiddleware

def setup_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",     # Vite dev
            "http://localhost:3000",     # Fallback
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
```

---

## 📝 Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/travel_ai_db

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Service
GEMINI_API_KEY=your-gemini-api-key
# OPENAI_API_KEY=your-openai-api-key  (alternative)

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 📋 Mapping FE Functions → BE APIs

Bảng chi tiết mapping giữa hàm FE hiện tại và API BE tương ứng:

| FE File        | FE Function             | Hiện tại     | BE API thay thế                      | Method |
| -------------- | ----------------------- | ------------ | ------------------------------------ | ------ |
| `auth.ts`      | `registerUser()`        | localStorage | `POST /api/v1/auth/register`         | POST   |
| `auth.ts`      | `loginUser()`           | localStorage | `POST /api/v1/auth/login`            | POST   |
| `auth.ts`      | `logoutUser()`          | localStorage | Client-side (xóa token)              | —      |
| `auth.ts`      | `getCurrentUser()`      | localStorage | `GET /api/v1/auth/me`                | GET    |
| `auth.ts`      | `setCurrentUser()`      | localStorage | Client-side (lưu token)              | —      |
| `auth.ts`      | `updateUserProfile()`   | localStorage | `PUT /api/v1/users/profile`          | PUT    |
| `auth.ts`      | `saveItinerary()`       | localStorage | `POST /api/v1/itineraries/{id}/save` | POST   |
| `auth.ts`      | `getSavedItineraries()` | localStorage | `GET /api/v1/itineraries`            | GET    |
| `auth.ts`      | `getItineraryById()`    | localStorage | `GET /api/v1/itineraries/{id}`       | GET    |
| `auth.ts`      | `deleteItinerary()`     | localStorage | `DELETE /api/v1/itineraries/{id}`    | DELETE |
| `auth.ts`      | `rateItinerary()`       | localStorage | `POST /api/v1/itineraries/{id}/rate` | POST   |
| `auth.ts`      | `isAuthenticated()`     | localStorage | Client-side (check token exists)     | —      |
| `itinerary.ts` | `generateItinerary()`   | Mock data    | `POST /api/v1/itineraries/generate`  | POST   |
| `itinerary.ts` | `formatCurrency()`      | Utility      | Giữ nguyên ở FE                      | —      |

---

## 🚀 Kế hoạch triển khai (Phân pha)

### Phase 1: Foundation (Tuần 1) ✅

- [x] Khởi tạo project FastAPI + cấu hình
- [x] Setup PostgreSQL database (Docker, không dùng Alembic — tạo bảng tự động qua `Base.metadata.create_all`)
- [x] Tạo models SQLAlchemy (users, trips, places, trip_places — 4 bảng thay vì 5)
- [x] Tạo Pydantic schemas
- [x] Setup CORS middleware

### Phase 2: Auth (Tuần 1-2) ✅

- [x] Implement JWT auth (register, login)
- [x] Password hashing với bcrypt
- [x] Auth dependencies (get_current_user)
- [x] Test auth endpoints

### Phase 3: CRUD Itineraries (Tuần 2) ✅

- [x] GET /itineraries (list by user)
- [x] GET /itineraries/:id (detail)
- [x] DELETE /itineraries/:id
- [x] PUT /itineraries/:id/rating (rate)
- [x] DELETE /itineraries/:id/activities/:aid (remove activity)
- [x] GET /destinations

### Phase 4: AI Integration (Tuần 2-3) ✅

- [x] Setup Gemini client (google-generativeai SDK)
- [x] Design prompt template
- [x] POST /itineraries/generate
- [x] Parse AI response → structured data
- [x] Fallback khi AI fail (dùng seed data)
- [x] Error handling

### Phase 5: FE Integration (Tuần 3) ✅

- [x] Tạo API service layer: `Frontend/app/utils/api.ts`
- [x] Rewrite auth.ts — thay localStorage calls bằng async API calls
- [x] Rewrite itinerary.ts — API-first với local fallback
- [x] Update tất cả 6 pages cho async (Login, Register, TripPlanning, ItineraryView, SavedItineraries, Profile)
- [x] Thêm JWT token vào headers (auto qua api.ts)
- [x] Handle loading states + error states
- [x] CORS cho port 5173 + 5174

### Phase 6: Polish (Tuần 3-4) — Chưa hoàn thành

- [ ] Map integration (Google Maps / Leaflet)
- [ ] System Architecture Diagram
- [x] BE_docs.md hoàn chỉnh
- [ ] Unit tests cho critical paths
- [ ] Review UX flow E2E

---

## ⚡ Lệnh chạy Backend

```bash
# Setup
cd Backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc: venv\Scripts\activate  # Windows

pip install -r requirements.txt

# Database
alembic upgrade head

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Truy cập Swagger docs
# http://localhost:8000/docs
# http://localhost:8000/redoc
```

---

## 📌 Lưu ý quan trọng

1. **Response format:** Tất cả API response đều trả JSON. FE cần parse đúng theo schemas mô tả ở trên.
2. **Error handling:** Tất cả error trả về dạng `{"detail": "Error message"}` với HTTP status code phù hợp (400, 401, 403, 404, 500).
3. **Date format:** Sử dụng ISO 8601 (`YYYY-MM-DD` cho date, `YYYY-MM-DDTHH:MM:SSZ` cho datetime).
4. **Currency:** Tất cả chi phí tính bằng VND (number integer, không có decimal).
5. **Pagination:** Các endpoint list hỗ trợ `page` + `limit` query params.
6. **API Versioning:** Sử dụng `/api/v1/` prefix để dễ upgrade sau này.

---

## 📌 Thực tế triển khai — So sánh Plan vs Code

> Phần này cập nhật sau khi code hoàn thành, ghi nhận những khác biệt giữa kế hoạch ban đầu và code thực tế.

### Database Schema — Khác biệt

| Plan (5 bảng)    | Thực tế (4 bảng)         | Lý do                                                         |
| ---------------- | ------------------------ | ------------------------------------------------------------- |
| `itineraries`    | `trips`                  | Đổi tên cho ngắn gọn, logic tương đương                       |
| `itinerary_days` | _(merged into response)_ | Ngày được tính dynamic từ `start_date` + `trip_places.day`    |
| `activities`     | `trip_places` + `places` | Tách thành: `places` (master data) + `trip_places` (junction) |
| `destinations`   | `places` (city field)    | Gộp vào bảng `places`, dùng `DISTINCT city` cho destinations  |

**Thực tế 4 bảng:**

- `users` — giữ nguyên như plan
- `trips` — thay `itineraries`, thêm `ai_prompt`, `ai_response`, `score`
- `places` — master data (name, city, category, description, cost, duration, image, lat, lng)
- `trip_places` — junction table (trip_id, place_id, day, time_slot, custom_note)

### Model Files — Khác biệt

| Plan                       | Thực tế                                             |
| -------------------------- | --------------------------------------------------- |
| `models/itinerary.py`      | `models/trip.py`                                    |
| `models/activity.py`       | `models/place.py` + `models/trip_place.py`          |
| `schemas/itinerary.py`     | `schemas/trip.py`                                   |
| `schemas/activity.py`      | `schemas/place.py`                                  |
| `routers/itineraries.py`   | `routers/trips.py`                                  |
| `services/ai_service.py`   | `services/itinerary_service.py` (AI logic built-in) |
| `middleware/cors.py`       | Cấu hình CORS trực tiếp trong `main.py`             |
| `tests/`                   | `test_api.py`, `test_full_api.py` ở root Backend    |
| `alembic/` + `alembic.ini` | Không dùng — `Base.metadata.create_all` cho dev     |

### API Endpoints — Khác biệt

| Plan                                  | Thực tế                                     | Status          |
| ------------------------------------- | ------------------------------------------- | --------------- |
| `GET /auth/me`                        | `GET /users/profile`                        | Đổi path        |
| `POST /auth/logout`                   | Client-side only (xóa token)                | Không cần API   |
| `PUT /itineraries/{id}` (full update) | Không có (dùng remove activity thay)        | Bỏ              |
| `POST /itineraries/{id}/save`         | Không cần (auto-save khi generate)          | Bỏ              |
| `POST /itineraries/{id}/rate`         | `PUT /itineraries/{id}/rating`              | Đổi method/path |
| —                                     | `DELETE /itineraries/{id}/activities/{aid}` | Thêm mới        |

### FE Integration — Đã hoàn thành

| File mới / sửa                                                                    | Vai trò                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `Frontend/app/utils/api.ts`                                                       | Centralized API service layer (~280 lines)      |
| `Frontend/app/utils/auth.ts`                                                      | Rewrite: localStorage → async BE API calls      |
| `Frontend/app/utils/itinerary.ts`                                                 | Rewrite: mock data → API-first + local fallback |
| 6 pages (Login, Register, TripPlanning, ItineraryView, SavedItineraries, Profile) | Async handlers + loading states                 |

### Công nghệ — Khác biệt

| Plan          | Thực tế               | Ghi chú                       |
| ------------- | --------------------- | ----------------------------- |
| Alembic       | Không dùng            | Dev mode dùng create_all      |
| httpx         | google-generativeai   | SDK trực tiếp, không cần HTTP |
| OpenAI backup | Chỉ Gemini + fallback | Fallback = seed data local    |
| MySQL         | -                     | Plan chỉ dùng PostgreSQL      |

### CORS — Cập nhật

```python
allow_origins=[
    settings.FRONTEND_URL,    # http://localhost:5173
    "http://localhost:5174",  # Vite dev fallback port
    "http://localhost:3000",  # Fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
```

### .env — Database name

```
# Plan:  travel_ai_db
# Thực tế: dulichviet
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
```
