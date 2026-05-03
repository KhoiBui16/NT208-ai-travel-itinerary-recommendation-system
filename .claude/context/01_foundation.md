# 01 Foundation

## Purpose

Tóm tắt foundation Backend MVP2: config, database, migration, base structure, startup.

## Current truth

- `Backend/src/` đã có app, core, models, schemas, repositories, services, api/v1, etl.
- `Backend/pyproject.toml` + `uv.lock` là dependency source.
- Alembic là migration source of truth.
- Docker Compose chạy API + PostgreSQL + Redis.

## Target state

- Mọi feature mới bám `router -> service -> repository -> model`.
- Config tập trung ở `Backend/config.yaml` + env secret trong `Backend/.env`.
- Local run và CI cùng dùng Alembic.

## Key invariants

- Không hardcode secrets.
- Public schema camelCase, model/db snake_case.
- Không quay lại `create_all()` làm migration path.
- Startup phải pass health `/api/v1/health`.

## Do next

- Nếu sửa schema, thêm Alembic migration.
- Nếu sửa config, sync `Backend/.env.example`, `Backend/config.yaml`, docs.
- Nếu sửa startup, test Docker API health.

## Do not do

- Không để router chứa business logic.
- Không sửa DB model mà thiếu migration/check.
- Không bỏ qua `alembic check`.

## Acceptance checkpoints

- `uv run alembic upgrade head` pass.
- `uv run alembic check` pass.
- API health trả healthy.

## Read more

- `../../docs/02_architecture.md`
- `../../docs/03_backend.md`
- `../../docs/08_testing_local_run.md`
