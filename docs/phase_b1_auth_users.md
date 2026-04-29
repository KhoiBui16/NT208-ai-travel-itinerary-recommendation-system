# Phase B1 — Auth & Users

> **Generated At:** 2026-04-29 14:00:00
> **Summary:** Triển khai 7 endpoint cho Auth (register, login, refresh, logout) và Users (get profile, update profile, change password). JWT access token + hashed refresh token rotation.

---

## 1. Mục tiêu Phase

Triển khai đầy đủ auth flow và user profile management — nền tảng cho mọi endpoint cần auth sau này (trip, share, chat...).

**Nguyên tắc:**
- Refresh token lưu **hash** trong DB, không lưu raw token
- Mỗi endpoint user profile dựa trên `current_user` từ JWT, không tin client-provided user id
- JWT rotation: refresh → revoke token cũ, tạo token mới
- Logout revoke refresh token

---

## 2. Files thay đổi

### [NEW] `src/repositories/user_repo.py`

| Method | Mục đích |
|---|---|
| `get_by_id(user_id)` | Lấy user theo PK |
| `get_by_email(email)` | Tìm user theo email (dùng cho login/register check) |
| `create(**kwargs)` | Tạo user mới |
| `update(user, **kwargs)` | Cập nhật user fields (chỉ set non-None values) |

### [NEW] `src/repositories/token_repo.py`

| Method | Mục đích |
|---|---|
| `find_by_hash(token_hash)` | Tìm refresh token theo SHA-256 hash |
| `create(user_id, token_hash, expires_at)` | Lưu refresh token hash mới |
| `revoke(token_id)` | Revoke 1 token cụ thể (dùng cho refresh rotation + logout) |
| `revoke_all_for_user(user_id)` | Revoke tất cả token của user |

### [NEW] `src/services/auth_service.py`

| Method | Mục đích | Exception |
|---|---|---|
| `register(email, password, name, phone)` | Tạo user + trả JWT pair | `ConflictException` nếu email tồn tại |
| `login(email, password)` | Verify credentials + trả JWT pair | `UnauthorizedException` nếu sai hoặc inactive |
| `refresh(raw_refresh_token)` | Revoke token cũ + tạo JWT pair mới | `UnauthorizedException` nếu revoked/invalid |
| `logout(raw_refresh_token)` | Revoke refresh token | — |

**Luồng JWT rotation:**
```
login/register → create_access_token() + create_refresh_token()
                → lưu token_hash vào DB → trả raw token cho client

refresh → hash_token(raw) → find_by_hash() → revoke(id)
        → create_access_token() + create_refresh_token()
        → lưu token_hash mới → trả raw token mới

logout → hash_token(raw) → find_by_hash() → revoke(id)
```

### [NEW] `src/services/user_service.py`

| Method | Mục đích | Exception |
|---|---|---|
| `get_profile(user)` | Trả UserResponse từ current_user | — |
| `update_profile(user, name, phone, interests)` | Cập nhật chỉ non-None fields | — |
| `change_password(user, current_password, new_password)` | Verify current + hash new | `UnauthorizedException` nếu sai current |

### [NEW] `src/api/v1/auth.py` — EP 1-4

| Endpoint | Method | Auth | Mục đích |
|---|---|---|---|
| `/api/v1/auth/register` | POST | Không | Đăng ký tài khoản mới |
| `/api/v1/auth/login` | POST | Không | Đăng nhập |
| `/api/v1/auth/refresh` | POST | Không | Làm mới JWT pair |
| `/api/v1/auth/logout` | POST | Bearer | Đăng xuất (revoke refresh token) |

### [NEW] `src/api/v1/users.py` — EP 5-7

| Endpoint | Method | Auth | Mục đích |
|---|---|---|---|
| `/api/v1/users/profile` | GET | Bearer | Lấy profile |
| `/api/v1/users/profile` | PUT | Bearer | Cập nhật profile |
| `/api/v1/users/password` | PUT | Bearer | Đổi mật khẩu |

### [MODIFY] `src/api/v1/router.py`

Thêm `auth_router` + `users_router` vào `api_v1_router`.

### [NEW] `tests/unit/test_auth_service.py` — 9 tests

- register: new email (success), existing email (conflict)
- login: valid (success), wrong password (401), nonexistent email (401), inactive user (401)
- refresh: valid token (success + revoke old), revoked token (401)
- logout: valid token (revoke)

### [NEW] `tests/unit/test_user_service.py` — 5 tests

- get_profile, update_profile name only, update_profile skip None, change_password correct, change_password wrong current

### [NEW] `tests/integration/test_auth_endpoints.py` — 10 tests (1 skipped)

- register: valid body, missing email (422), short password (422)
- login: valid body (skipped — needs DB), missing fields (422)
- refresh/logout: missing token (422)
- profile endpoints: no auth → 401

---

## 3. Security design

```
Access Token (JWT HS256):
  - Payload: {sub: user_id, exp: ..., type: "access"}
  - TTL: 15 phút (config: access_token_expire_minutes)
  - Verify: verify_access_token() → get_current_user dependency

Refresh Token (opaque):
  - Format: f"{user_id}:{random_48_bytes}:{expiry_timestamp}"
  - Stored: SHA-256 hash trong DB (refresh_tokens table)
  - TTL: 30 ngày (config: refresh_token_expire_days)
  - Rotation: mỗi refresh → revoke old + create new
```

---

## 4. Không thay đổi

- Không thêm migration mới (dùng bảng `users` + `refresh_tokens` từ Phase A)
- Không thay đổi `.env` hay `config.yaml`
- Không thay đổi `dependencies.py` (get_current_user đã có từ Phase A)

---

## 5. Open Questions

- Có thêm endpoint `POST /api/v1/auth/logout-all` không? (revoke_all_for_user đã implement sẵn)
