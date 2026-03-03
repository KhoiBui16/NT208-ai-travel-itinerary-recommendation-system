# 🧪 MVP #1 — Test Report (Updated)

> **Ngày test:** 2025-06-03 (lần 2 — cập nhật)  
> **Lần test trước:** 2025-03-03  
> **Môi trường:** Windows, Docker PostgreSQL 16-alpine, Python 3.12.4, FastAPI, Vite v6.3.5  
> **BE port:** 8000 | **FE port:** 5174

---

## 1. Kiểm tra môi trường

| Hạng mục                                | Trạng thái | Ghi chú                                           |
| --------------------------------------- | ---------- | ------------------------------------------------- |
| Docker PostgreSQL (dulichviet-postgres) | ✅ OK      | Port 5432, postgres:16-alpine                     |
| Python venv                             | ✅ OK      | Backend/venv, Python 3.12.4                       |
| pip packages (14+ packages)             | ✅ OK      | Tất cả 11 key packages import thành công          |
| .env file                               | ✅ OK      | DATABASE_URL, JWT_SECRET_KEY, GEMINI_API_KEY đúng |
| FE npm packages                         | ✅ OK      | Vite 6.3.5, 283+ packages                         |
| requirements.txt                        | ✅ Fixed   | Thêm `email-validator>=2.0.0` explicit            |
| Seed data                               | ✅ OK      | 22 places across 4 cities                         |

---

## 2. Kiểm tra khởi chạy

| Hạng mục                                  | Trạng thái | Ghi chú                                                   |
| ----------------------------------------- | ---------- | --------------------------------------------------------- |
| BE: uvicorn main:app --reload --port 8000 | ✅ OK      | Startup OK, 4 tables created                              |
| FE: npm run dev                           | ✅ OK      | Vite v6.3.5, port 5174                                    |
| Health check: GET /                       | ✅ 200     | `{"status":"ok","message":"Du Lịch Việt API is running"}` |
| Health check: GET /health                 | ✅ 200     | `{"status":"healthy"}`                                    |
| Swagger UI: /docs                         | ✅ 200     | 12 API paths documented                                   |
| ReDoc: /redoc                             | ✅ OK      | Available                                                 |

---

## 3. BE API Test Results — 19/19 PASS ✅

Test script: `Backend/test_full_api.py` (dùng urllib, không cần cài thêm package)

### 3.1 Health Check

| #   | Test                  | Method | Path      | Expected | Actual | Result  |
| --- | --------------------- | ------ | --------- | -------- | ------ | ------- |
| 1   | Health check root     | GET    | `/`       | 200      | 200    | ✅ PASS |
| 2   | Health check endpoint | GET    | `/health` | 200      | 200    | ✅ PASS |

### 3.2 Destinations (Seed Data)

| #   | Test              | Method | Path                    | Expected | Actual | Result  |
| --- | ----------------- | ------ | ----------------------- | -------- | ------ | ------- |
| 3   | List destinations | GET    | `/api/v1/destinations/` | 200      | 200    | ✅ PASS |

**Ghi chú:** 22 places đã seed. Có 5 destinations (bao gồm "Ha Noi" không dấu từ AI generation trước đó — xem Warning #4 bên dưới).

### 3.3 Authentication

| #   | Test                     | Method | Path                    | Expected | Actual | Result  |
| --- | ------------------------ | ------ | ----------------------- | -------- | ------ | ------- |
| 4   | Register new user        | POST   | `/api/v1/auth/register` | 201      | 201    | ✅ PASS |
| 5   | Register duplicate email | POST   | `/api/v1/auth/register` | 400      | 400    | ✅ PASS |
| 6   | Login correct password   | POST   | `/api/v1/auth/login`    | 200      | 200    | ✅ PASS |
| 7   | Login wrong password     | POST   | `/api/v1/auth/login`    | 401      | 401    | ✅ PASS |

### 3.4 User Profile (Protected)

| #   | Test                     | Method | Path                    | Expected | Actual | Result  |
| --- | ------------------------ | ------ | ----------------------- | -------- | ------ | ------- |
| 8   | GET profile (with token) | GET    | `/api/v1/users/profile` | 200      | 200    | ✅ PASS |
| 9   | GET profile (no token)   | GET    | `/api/v1/users/profile` | 401      | 401    | ✅ PASS |
| 10  | UPDATE profile           | PUT    | `/api/v1/users/profile` | 200      | 200    | ✅ PASS |

### 3.5 Itinerary CRUD

| #   | Test                          | Method | Path                                        | Expected | Actual | Result  |
| --- | ----------------------------- | ------ | ------------------------------------------- | -------- | ------ | ------- |
| 11  | Generate (with token)         | POST   | `/api/v1/itineraries/generate`              | 201      | 201    | ✅ PASS |
| 12  | Generate (guest, no token)    | POST   | `/api/v1/itineraries/generate`              | 201      | 201    | ✅ PASS |
| 13  | List itineraries (with token) | GET    | `/api/v1/itineraries/`                      | 200      | 200    | ✅ PASS |
| 14  | List itineraries (no token)   | GET    | `/api/v1/itineraries/`                      | 401      | 401    | ✅ PASS |
| 15  | Get itinerary by ID           | GET    | `/api/v1/itineraries/{id}`                  | 200      | 200    | ✅ PASS |
| 16  | Rate itinerary                | PUT    | `/api/v1/itineraries/{id}/rating`           | 200      | 200    | ✅ PASS |
| 17  | Remove activity               | DELETE | `/api/v1/itineraries/{id}/activities/{aid}` | 200      | 200    | ✅ PASS |
| 18  | Delete itinerary              | DELETE | `/api/v1/itineraries/{id}`                  | 204      | 204    | ✅ PASS |
| 19  | GET deleted (should 404)      | GET    | `/api/v1/itineraries/{id}`                  | 404      | 404    | ✅ PASS |

---

## 4. FE Browser Test Results — 6/6 pages OK ✅

| #   | Page              | URL                  | HTTP Status | Ghi chú                     |
| --- | ----------------- | -------------------- | ----------- | --------------------------- |
| 1   | Homepage          | `/`                  | ✅ 200      | Load OK, title "Travel app" |
| 2   | Login             | `/login`             | ✅ 200      | Form đăng nhập hiển thị     |
| 3   | Register          | `/register`          | ✅ 200      | Form đăng ký hiển thị       |
| 4   | Trip Planning     | `/trip-planning`     | ✅ 200      | Form tạo lịch trình         |
| 5   | Saved Itineraries | `/saved-itineraries` | ✅ 200      | Danh sách lịch trình        |
| 6   | Profile           | `/profile`           | ✅ 200      | Thông tin user              |

> **Lưu ý:** FE hiện tại dùng **localStorage** và mock data (`app/utils/auth.ts`, `app/utils/itinerary.ts`). **Chưa kết nối BE API** — FE-BE Integration nằm trong roadmap MVP #2.

---

## 5. Bugs đã phát hiện & fix

### Bug #1: `remove_activity` trả về 500 Internal Server Error ❌ → ✅ FIXED

| Item            | Detail                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Endpoint**    | `DELETE /api/v1/itineraries/{id}/activities/{aid}`                                                                                                                                                                                                                                                 |
| **Nguyên nhân** | Sau `db.delete(trip_place)` + `db.commit()`, SQLAlchemy async session giữ stale objects trong identity map. Khi reload trip với `selectinload`, session trả về cached TripPlace objects mà `.place` relationship chưa eager-load → gọi lazy load trong async context → `MissingGreenlet` exception |
| **Lỗi cụ thể**  | `sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here`                                                                                                                                                                                                 |
| **Fix**         | Thêm `db.expire_all()` trước khi reload trip để xóa stale cache                                                                                                                                                                                                                                    |
| **File sửa**    | `Backend/app/services/itinerary_service.py` — hàm `remove_activity()`                                                                                                                                                                                                                              |

```python
# FIX applied:
await db.delete(trip_place)
await db.commit()
db.expire_all()  # ← FIX: expire cache trước reload
result = await db.execute(
    select(Trip).where(Trip.id == trip_uuid)
    .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
)
```

### Bug #2: `rate_itinerary` — cùng pattern MissingGreenlet ❌ → ✅ FIXED

| Item            | Detail                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Endpoint**    | `PUT /api/v1/itineraries/{id}/rating`                                                      |
| **Nguyên nhân** | Cùng pattern Bug #1: `db.commit()` → reload trip → stale relationships → `MissingGreenlet` |
| **Fix**         | Thêm `db.expire_all()` trước reload query (preventive fix)                                 |
| **File sửa**    | `Backend/app/services/itinerary_service.py` — hàm `rate_itinerary()`                       |

### Bug #3: `requirements.txt` thiếu `email-validator` ❌ → ✅ FIXED

| Item            | Detail                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Triệu chứng** | `ImportError: email-validator is not installed` khi pydantic validate email                                      |
| **Nguyên nhân** | `pydantic[email-validator]` khai báo extra dependency, nhưng pip có thể cache pydantic core mà không pull extras |
| **Fix**         | Thêm `email-validator>=2.0.0` explicit vào `requirements.txt`                                                    |

### Bug #4: `.env.example` sai tên biến JWT ❌ → ✅ FIXED (session trước)

| Item      | Detail                                                       |
| --------- | ------------------------------------------------------------ |
| **Trước** | `SECRET_KEY=...` → config.py không tìm thấy `JWT_SECRET_KEY` |
| **Sau**   | `JWT_SECRET_KEY=...` + thêm `JWT_ALGORITHM=HS256`            |

### Warning #5: Duplicate destination "Ha Noi" vs "Hà Nội" ⚠️ KNOWN

| Item                           | Detail                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mô tả**                      | Bảng places có 2 destination strings: "Ha Noi" (không dấu, từ AI Gemini generation) và "Hà Nội" (có dấu, từ seed data) → 5 destinations thay vì 4 |
| **Impact**                     | Low — chỉ ảnh hưởng hiển thị dropdown list                                                                                                        |
| **Giải pháp đề xuất (MVP #2)** | Normalize destination names hoặc dùng destination ID thay vì free text                                                                            |

---

## 6. Kiểm tra .md files so với source code

| File               | Status         | Ghi chú                                                                                                                                                                                          |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`        | ✅ Updated     | Thêm hướng dẫn Docker PostgreSQL, fix số places (22 thay vì 23)                                                                                                                                  |
| `BE_docs.md`       | ✅ Updated     | Fix Gemini version 0.8.0 → 0.8.3                                                                                                                                                                 |
| `plan_be.md`       | ⚠️ Khác actual | Plan gốc dùng 5 tables (users, itineraries, itinerary_days, activities, destinations) nhưng actual dùng 4 tables (users, trips, places, trip_places). Đây là kế hoạch ban đầu — khác biệt hợp lý |
| `MVP1_summary.md`  | ✅ Chính xác   | Status matrix phản ánh đúng thực trạng                                                                                                                                                           |
| `.env.example`     | ✅ Fixed       | JWT_SECRET_KEY + JWT_ALGORITHM đúng                                                                                                                                                              |
| `requirements.txt` | ✅ Fixed       | Thêm email-validator explicit                                                                                                                                                                    |

---

## 7. Files đã sửa trong quá trình test

| File                                        | Thay đổi                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `Backend/app/services/itinerary_service.py` | Thêm `db.expire_all()` trong `remove_activity()` và `rate_itinerary()` |
| `Backend/requirements.txt`                  | Thêm `email-validator>=2.0.0`                                          |
| `Backend/.env.example`                      | Fix `SECRET_KEY` → `JWT_SECRET_KEY`, thêm `JWT_ALGORITHM`              |
| `README.md`                                 | Thêm Docker PostgreSQL setup, fix seed count 22                        |
| `Backend/BE_docs.md`                        | Fix Gemini version 0.8.0 → 0.8.3                                       |
| `Backend/test_full_api.py`                  | Tạo mới — 19 test cases dùng urllib                                    |

---

## 8. Tổng kết

### Kết quả test

| Hạng mục            | Passed | Failed | Total  |
| ------------------- | ------ | ------ | ------ |
| BE API endpoints    | 19     | 0      | 19     |
| FE pages (HTTP 200) | 6      | 0      | 6      |
| Environment checks  | 7      | 0      | 7      |
| **TỔNG**            | **32** | **0**  | **32** |

### Bugs fixed: 4 | Known issues: 1

### Roadmap — Chưa triển khai (MVP #2+)

1. **FE-BE Integration** — FE hiện dùng localStorage, cần thay bằng API calls tới BE
2. **AI Enhancement** — Tuning Gemini prompt, caching responses
3. **Map integration** — Bản đồ tương tác thực tế (Google Maps / Leaflet)
4. **Alembic migrations** — Database version control (hiện dùng `create_all()` auto)
5. **Admin panel** — DFD có admin actor nhưng chưa implement
6. **Destination normalization** — Fix duplicate names (Ha Noi vs Hà Nội)
7. **Unit tests** — pytest + httpx async test client
8. **CORS production** — Cập nhật `FRONTEND_URL` cho domain thực
9. **Security** — Thay `JWT_SECRET_KEY` và `GEMINI_API_KEY` cho production, bỏ `DEBUG=True`
