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
- Auth: register, login, refresh, logout (4 endpoints)
- Users: profile, update profile, password (3 endpoints)
- Itineraries: create/list/get/update/delete, generate, nested day/activity/accommodation, share, claim, rating (16 endpoints)
- Shared: public read by shareToken (1 endpoint)
- Places: destinations, destination detail, search, detail, saved places CRUD (8 endpoints)

**Total: 30 endpoints** (EP-34 `/agent/analytics` optional cho MVP2+, password reset 2 endpoints chưa implement)

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
```

## Backend còn thiếu

- AI generate pipeline thật (stub hiện tại tạo empty trip).
- AI companion chat.
- Password reset endpoint cho `ForgotPassword` FE.
- Analytics optional EP-34 với SQL guardrails.

