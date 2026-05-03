# 00 Project Overview

## Purpose

Tóm tắt current repo, trạng thái MVP2 và quy tắc workflow sau khi tài liệu dài đã được gom về `docs/`.

## Current truth

- Backend source of truth là `Backend/src/`, chạy bằng `uv`, Alembic, FastAPI async.
- Frontend source of truth là `Frontend/`, chạy bằng Vite + React + TypeScript.
- Tài liệu chính nằm trong `docs/`; các folder legacy như `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/` không còn active.
- Execution tracker nằm ở `docs/09_execution_tracker.md`.

## Target state

- FE-BE chạy local ổn định trước deploy.
- Docs, README, Claude memory và CI workflow cùng mô tả một trạng thái repo.
- Phase C AI services được implement sau ETL/local readiness.

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

- `../../docs/README.md`
- `../../docs/01_overview.md`
- `../../docs/02_architecture.md`
