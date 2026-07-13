# Issue: CSV database snapshot public sensitivity

**Ngày:** 2026-07-10
**Priority:** HIGH nếu repo public/nộp bài công khai; MEDIUM nếu repo private.

## Tóm tắt

Repo root hiện có `dulichviet_full_database_one_file.csv`, một snapshot/export dạng `table_name,record_id,record_json`. Audit docs 00137 xác nhận đây không phải runtime DB mới; backend vẫn dùng PostgreSQL + Alembic.

## Rủi ro

- File snapshot có thể chứa dữ liệu nguyên bảng, bao gồm user/auth-related rows hoặc hash mật khẩu.
- Nếu repo public, việc commit/publish snapshot full DB có thể lộ dữ liệu test/user không cần thiết.
- Snapshot đang ghi `alembic_version` là `20260705_0015`, trong khi code migration head là `20260707_0016_add_activity_coordinates`; import trực tiếp rồi không chạy migration có thể lệch schema.

## Guardrails

- Không paste row contents, hashed password, token, DB URL, hoặc dữ liệu cá nhân từ CSV vào docs/chat/PR.
- Nếu cần dùng CSV làm demo seed, tạo bản sanitized chỉ chứa destinations/places/hotels/public trip mẫu.
- Nếu cần dùng CSV để restore deploy, viết runbook import rõ ràng và chạy `alembic upgrade head` sau restore.

## Status

Open. Cần quyết định giữ private, sanitize, hoặc thay bằng seed/import script.
