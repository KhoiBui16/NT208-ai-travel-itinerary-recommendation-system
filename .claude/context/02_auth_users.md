# 02 Auth Users

## Purpose

Tóm tắt auth/user flow đã implement và rule an toàn khi sửa.

## Current truth

- Auth/users đã có register, login, refresh, logout, profile, update profile, change password.
- Forgot-password (EP-30) và reset-password (EP-31) endpoints đã implement.
- Refresh token lưu hash trong DB.
- JWT dependency lấy `current_user`, không tin user id từ client.
- Register page bypass OTP phía client cho đến khi BE email OTP sẵn sàng.

## Target state

- Token rotation rõ ràng.
- Logout revoke refresh token.
- Profile endpoints owner-only theo current user.

## Key invariants

- Không lưu raw refresh token.
- Password luôn hash bằng helper security.
- Không expose secret/token trong log.
- Response public vẫn camelCase.

## Do next

- Khi sửa auth, chạy unit + integration auth tests.
- Khi sửa token model, chạy Alembic + security tests.
- Cập nhật docs nếu đổi TTL/env/config.

## Do not do

- Không nhận `userId` từ client để update profile.
- Không bypass inactive/revoked token.
- Không commit `.env`.

## Acceptance checkpoints

- `tests/unit/test_auth_service.py` pass.
- `tests/unit/test_user_service.py` pass.
- `tests/integration/test_auth_endpoints.py` pass.

## Read more

- `../../docs/03_backend.md`
- `../../docs/07_workflow_ci.md`
- `../../docs/08_testing_local_run.md`
