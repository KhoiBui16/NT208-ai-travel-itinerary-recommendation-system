# 00 Project Overview

## Purpose

Tóm tắt current repo, trạng thái MVP2 và quy tắc workflow sau khi tài liệu dài đã được gom về `docs/`.

## Current truth

- Backend source of truth là `Backend/src/`, chạy bằng `uv`, Alembic, FastAPI async.
- Frontend source of truth là `Frontend/`, chạy bằng Vite + React + TypeScript.
- Active backend contract có 41 `/api/v1` routes (C.0–C.4 merged: EP-37/38/39 chat sessions + apply-patch + session management; 14 GET / 16 POST / 5 PUT / 5 DELETE / 1 PATCH).
- Current verified BE test inventory là 187 unit tests + 77 integration tests (43 int pass + 34 CI-gated skip local; chạy đủ trên CI postgres).
- Playwright suite hiện có 17 spec files (14 top-level + 3 `b3/`) ở `Frontend/tests/e2e/` (CI `frontend-e2e` green).
- Register bypass OTP cho đến khi BE email OTP sẵn sàng.
- Tài liệu chính nằm trong `docs/`; các folder legacy như `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/` không còn active.
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
