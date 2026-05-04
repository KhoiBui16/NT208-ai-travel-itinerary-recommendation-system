# 03. Backend MVP2

## Runtime hiện tại

Backend source of truth là `Backend/src/`.

```text
Backend/
├── src/
│   ├── main.py
│   ├── api/v1/
│   ├── core/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── etl/
├── tests/
├── alembic/
├── config.yaml
├── pyproject.toml
└── Dockerfile
```

Các file MVP1 cũ như `Backend/BE_docs.md` và folder `Backend/app/` không còn là tài liệu/entrypoint chính. `Backend/app/` có thể còn tồn tại vì lịch sử repo, nhưng development mới đi qua `src/`.

## Endpoint groups đã có

### EP-0: Health

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-0 | GET | `/api/v1/health` | Public | Kiểm tra tình trạng API, trả `{"status":"healthy"}` |

### Auth endpoints (6 endpoints)

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-1 | POST | `/api/v1/auth/register` | Public | Tạo account mới + nhận JWT access/refresh token pair |
| EP-2 | POST | `/api/v1/auth/login` | Public | Xác thực email + password, trả JWT token pair |
| EP-3 | POST | `/api/v1/auth/refresh` | Public | Rotate refresh token cũ → nhận JWT pair mới; refresh cũ bị revoke |
| EP-4 | POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token đang dùng; client xóa token local |
| EP-31 | POST | `/api/v1/auth/forgot-password` | Public | Gửi email chứa reset link; silent nếu email không tồn tại (chống enumeration) |
| EP-32 | POST | `/api/v1/auth/reset-password` | Public | Tiêu hao reset token + đổi mật khẩu mới + revoke tất cả refresh tokens |

**Chi tiết password reset flow:**

```text
User nhập email
→ POST /api/v1/auth/forgot-password
→ BE tạo opaque reset token (SHA-256 hash lưu DB, raw token gửi email)
→ User nhấn link trong email → FE /reset-password?token=xxx
→ FE gọi POST /api/v1/auth/reset-password { token, newPassword }
→ BE verify token hash + expiry → đổi mật khẩu → clear token → revoke tất cả refresh tokens
```

### User endpoints (3 endpoints)

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-5 | GET | `/api/v1/users/profile` | Bearer | Đọc profile user hiện tại (name, email, avatar) |
| EP-6 | PUT | `/api/v1/users/profile` | Bearer | Cập nhật name/avatar; trả profile mới sau update |
| EP-7 | PUT | `/api/v1/users/password` | Bearer | Đổi mật khẩu (yêu cầu currentPassword + newPassword) |

### Itinerary endpoints (14 endpoints)

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-8 | POST | `/api/v1/itineraries/generate` | Optional | AI-generated itinerary; hiện là stub tạo empty trip; sẽ nối LLM pipeline ở Phase C |
| EP-9 | POST | `/api/v1/itineraries` | Optional | Tạo manual trip; nếu có Bearer → owner trip; nếu không → guest trip + claimToken |
| EP-10 | GET | `/api/v1/itineraries` | Bearer | Liệt kê trips của user hiện tại (paginated, sort by updated_at desc) |
| EP-11 | GET | `/api/v1/itineraries/{tripId}` | Bearer | Đọc trip chi tiết (owner-only, bao gồm days/activities/accommodations) |
| EP-12 | PUT | `/api/v1/itineraries/{tripId}` | Bearer | Update trip + nested days/activities/accommodations (full auto-save) |
| EP-13 | DELETE | `/api/v1/itineraries/{tripId}` | Bearer | Xóa trip (owner-only) |
| EP-14 | PUT | `/api/v1/itineraries/{tripId}/rating` | Bearer | Đánh giá trip 1-5 sao + feedback text |
| EP-15 | POST | `/api/v1/itineraries/{tripId}/share` | Bearer | Tạo shareToken cho trip; trả share link URL |
| EP-16 | POST | `/api/v1/itineraries/{tripId}/claim` | Bearer | Claim guest trip → chuyển ownership cho user đã đăng nhập |
| EP-17 | POST | `/api/v1/itineraries/{tripId}/activities` | Bearer | Thêm activity vào day cụ thể trong trip |
| EP-18 | PUT | `/api/v1/itineraries/{tripId}/activities/{activityId}` | Bearer | Cập nhật activity (time, name, location, cost...) |
| EP-19 | DELETE | `/api/v1/itineraries/{tripId}/activities/{activityId}` | Bearer | Xóa activity khỏi trip |
| EP-20 | POST | `/api/v1/itineraries/{tripId}/accommodations` | Bearer | Thêm accommodation (hotel, check-in/out, price) |
| EP-21 | DELETE | `/api/v1/itineraries/{tripId}/accommodations/{accommodationId}` | Bearer | Xóa accommodation khỏi trip |

**Lưu ý quan trọng về optional auth (EP-8, EP-9):**

- Endpoint dùng `get_current_user_optional` dependency: nếu có Bearer token → user authenticated; nếu không → guest.
- Guest tạo trip nhận thêm `claimToken` (one-time, hash + expiry) để claim ownership sau khi đăng ký/đăng nhập.
- FE `AuthContext` thực hiện `executePendingClaim()` tự động sau khi user login/register.

### Shared endpoint (1 endpoint)

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-22 | GET | `/api/v1/shared/{shareToken}` | Public | Đọc-only shared trip qua opaque shareToken (không cần đăng nhập) |

### Places endpoints (7 endpoints)

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-23 | GET | `/api/v1/places/destinations` | Public | Liệt kê destinations có sẵn (Redis cache, fail-open) |
| EP-24 | GET | `/api/v1/places/destinations/{name}` | Public | Chi tiết destination theo tên (places, hotels, description) |
| EP-25 | GET | `/api/v1/places/search` | Public | Tìm kiếm places theo query, city, category (Redis cache) |
| EP-26 | GET | `/api/v1/places/{placeId}` | Public | Chi tiết place theo ID |
| EP-27 | GET | `/api/v1/places/saved/list` | Bearer | Danh sách places user đã lưu |
| EP-28 | POST | `/api/v1/places/saved` | Bearer | Lưu place vào collection |
| EP-29 | DELETE | `/api/v1/places/saved/{savedId}` | Bearer | Xóa place khỏi saved collection |

**Tổng: 33 endpoints** (EP-0 đến EP-32; EP-34 `/agent/analytics` optional cho MVP2+)

> **Lưu ý EP numbering:** Plan gốc (plan/12_be_crud_endpoints.md) đánh EP-31 là `GET /agent/rate-limit-status` và EP-32 là `POST /itineraries/{id}/claim`. Code thực tế dùng EP-31 cho `POST /auth/forgot-password` và EP-32 cho `POST /auth/reset-password`. Guest claim đã nằm trong itineraries router (không có số EP riêng). Phase C endpoints renumbered: EP-33 rate-limit-status, EP-34 claim, EP-35 chat-history, EP-36 analytics. Tổng core sau Phase C: 34 endpoints.

## Security rules

- JWT access token ngắn hạn.
- Refresh token lưu hash, revoke khi refresh/logout.
- Trip integer ID endpoint luôn owner-only.
- Public share qua opaque `shareToken`, không public bằng raw integer ID.
- Guest claim qua `claimToken` one-time.

## Config cần biết

Trước khi chạy lần đầu, copy template:

```powershell
Copy-Item Backend\.env.example Backend\.env
```

Sửa `Backend/.env` — bắt buộc set `JWT_SECRET_KEY`. Xem chi tiết trong file `.env.example`.

`Backend/.env` local nên có:

```env
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<local-secret>
GEMINI_API_KEY=<optional>
GOONG_API_KEY=<optional>
ENABLE_ANALYTICS=false
ANALYTICS_DATABASE_URL=
# SMTP (optional — nếu không có, reset link log ra console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM_ADDRESS=noreply@dulichviet.local
```

## Email service

`Backend/src/services/email_service.py` gửi email qua `aiosmtplib` (async SMTP native cho FastAPI):

- **SMTP mode**: Khi `smtp_host` được cấu hình, gửi email thật qua SMTP server.
- **Console mode**: Khi `smtp_host` trống (default), log reset link ra stdout — phù hợp local dev mà không cần SMTP server.

## Async Session Lifecycle Patterns

Các bug PR #24 có chung root pattern: SQLAlchemy async session lifecycle. Ghi lại để tránh lặp:

1. **Không truyền ORM object qua session boundary**: `get_current_user` tạo User trong session A (request-scoped), service dùng session B. Truyền `user.id` và re-fetch trong service.

2. **`flush()` ≠ `refresh()`**: `flush()` write SQL nhưng không reload Python object. Gọi `session.refresh(obj)` để load server-generated columns (id, timestamps, defaults).

3. **`expire_all()` trước re-fetch**: SQLAlchemy Identity Map cache object state sau `flush()`. Nếu update nested relations rồi re-fetch, gọi `session.expire_all()` trước để query fresh data.

4. **Lazy relationship ngoài eager-load context**: `model_validate(orm_obj, from_attributes=True)` trigger `MissingGreenlet` trên lazy-loaded attrs. Build schema từ scalar fields, default lazy collections thành `[]`.

## Backend còn thiếu

- AI generate pipeline thật (stub hiện tại tạo empty trip).
- AI companion chat.
- Analytics optional EP-34 với SQL guardrails.

