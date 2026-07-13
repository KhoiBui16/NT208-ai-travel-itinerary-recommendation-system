# 00 Project Overview

## Purpose

Tóm tắt current repo, trạng thái MVP2 và quy tắc workflow sau khi tài liệu dài đã được gom về `docs/`.

## Current truth

- Backend source of truth là `Backend/src/`, chạy bằng `uv`, Alembic, FastAPI async.
- Frontend source of truth là `Frontend/`, chạy bằng Vite + React + TypeScript.
- Active backend contract có 41 `/api/v1` routes (C.0–C.4 merged: EP-37/38/39 chat sessions + apply-patch + session management) và 1 root asset route `/img/{file_path:path}`.
- Current BE test inventory là 194 unit tests + 79 integration tests collected (collect-only 2026-07-10). Older full-pass snapshot was 187 unit + 77 integration; re-run before claiming current green.
- Playwright suite hiện có 18 spec files (15 top-level + 3 `b3/`) ở `Frontend/tests/e2e/`; source inventory có 37 `test(...)` declarations.
- Register bypass OTP cho đến khi BE email OTP sẵn sàng.
- Tài liệu chính nằm trong `docs/`; các folder legacy như `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/` không còn active.
- Database runtime vẫn là PostgreSQL + Alembic; `dulichviet_full_database_one_file.csv` là snapshot/export artifact, không phải CSV runtime backend.
- Alembic head hiện tại là `20260707_0016_add_activity_coordinates`; static image contract là `asserts/images/` source archive -> `Backend/static/img/` runtime -> DB `/img/...`.
- Execution tracker nằm ở `docs/09_execution_tracker.md`.

## Target state

- FE-BE chạy local ổn định trước deploy.
- Docs, README, Claude memory và CI workflow cùng mô tả một trạng thái repo.
- Phase C C.0/C.1 đang được triển khai theo stack: Goong-first ETL readiness trước, direct AI generate pipeline sau.

## Key invariants

- Public API trả `camelCase`.
- Integer ID itinerary endpoints là owner-only.
- Share public bằng `shareToken`.
- Guest claim bằng `claimToken` one-time.
- Generate itinerary đi direct pipeline, không qua Supervisor.
- Companion chat trả proposed patch và cần user confirm trước khi persist.

## Do next

- Đọc file phase phù hợp trong `.claude/context/`.
- Đối chiếu tài liệu chi tiết trong `docs/`.
- Cập nhật `docs/09_execution_tracker.md` nếu thay đổi task/PR.
- Chạy local verification theo scope.

## Do not do

- Không khôi phục docs legacy nếu chưa có lý do rõ.
- Không public trip bằng raw integer ID.
- Không dùng `.env` hoặc `.claude/settings.local.json` làm shared source.

## Acceptance checkpoints

- Biết code runtime hiện nằm ở `Backend/src/` và `Frontend/`.
- Biết docs chính nằm ở `docs/`.
- Biết tracker mới nằm ở `docs/09_execution_tracker.md`.

## Read more

- `../../docs/01_overview.md`
- `../../docs/02_architecture.md`
- `../../docs/11_phase_roadmap.md`
- `../../docs/12_current_source_audit_sync.md`
