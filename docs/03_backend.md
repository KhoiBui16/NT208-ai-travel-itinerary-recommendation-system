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

- Health: `/api/v1/health` (1 endpoint)
- Auth: register, login, refresh, logout, forgot-password, reset-password (6 endpoints)
- Users: profile, update profile, password (3 endpoints)
- Itineraries: create/list/get/update/delete, generate, nested day/activity/accommodation, share, claim, rating (16 endpoints)
- Shared: public read by shareToken (1 endpoint)
- Places: destinations, destination detail, search, detail, saved places CRUD (8 endpoints)

**Total: 32 endpoints** (EP-34 `/agent/analytics` optional cho MVP2+)

### Auth endpoints chi tiết

| EP | Method | Path | Auth | Mô tả |
|---|---|---|---|---|
| EP-1 | POST | `/api/v1/auth/register` | Public | Tạo account + nhận JWT pair |
| EP-2 | POST | `/api/v1/auth/login` | Public | Xác thực credentials + nhận JWT pair |
| EP-3 | POST | `/api/v1/auth/refresh` | Public | Rotate refresh token + nhận JWT pair mới |
| EP-4 | POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| EP-31 | POST | `/api/v1/auth/forgot-password` | Public | Gửi email reset password (silent nếu email không tồn tại) |
| EP-32 | POST | `/api/v1/auth/reset-password` | Public | Tiêu hao reset token + đổi mật khẩu mới |

### Password reset flow

```text
User nhập email
→ POST /api/v1/auth/forgot-password
→ BE tạo opaque reset token (SHA-256 hash lưu DB, raw token gửi email)
→ User nhấn link trong email → /reset-password?token=xxx
→ FE gọi POST /api/v1/auth/reset-password { token, newPassword }
→ BE verify token hash + expiry → đổi mật khẩu → clear token → revoke tất cả refresh tokens
```

Thiết kế bảo mật:
- Reset token lưu hash trong DB (giống refresh/share/claim tokens).
- Token one-time use: sau khi dùng, hash + expiry bị clear.
- Token có thời hạn (mặc định 1 giờ, cấu hình `auth.password_reset_token_expire_hours`).
- Sau khi reset, tất cả refresh tokens bị revoke (force re-login trên mọi thiết bị).
- `forgot-password` luôn trả success dù email không tồn tại (chống email enumeration).
- `smtp_password` là `SecretStr`, chỉ set qua `.env` hoặc env var, không qua `config.yaml`.

## Security rules

- JWT access token ngắn hạn.
- Refresh token lưu hash, revoke khi refresh/logout.
- Trip integer ID endpoint luôn owner-only.
- Public share qua opaque `shareToken`, không public bằng raw integer ID.
- Guest claim qua `claimToken` one-time.

## Config cần biết

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

## Backend còn thiếu

- AI generate pipeline thật (stub hiện tại tạo empty trip).
- AI companion chat.
- Analytics optional EP-34 với SQL guardrails.

