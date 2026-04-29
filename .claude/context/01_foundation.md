# 01 Foundation

## Purpose

Chot cac viec nen truoc khi code domain: config, database, structure, base abstractions, Alembic, startup.

## Current truth

- Chua co `Backend/src/`
- Chua co `Backend/pyproject.toml`
- Chua co Alembic-driven schema refactor MVP2
- Code hien tai van tron trong `Backend/app/`

## Target state

- `Backend/src/` co `core/`, `base/`, `models/`, `schemas/`, `repositories/`, `services/`, `api/v1/`, `agent/`
- Centralized config
- Database session, security helpers, exceptions, dependencies, logger ro rang
- Alembic thay cho `Base.metadata.create_all()`

## Key invariants

- Foundation phai xong truoc khi mo rong feature domain
- Khong hardcode secrets/config trong code hoac shared Claude settings
- Kien truc import mot chieu: router -> service -> repository -> models/core
- Schema public huong den camelCase, model/db van snake_case

## Do next

- Tao `pyproject.toml`, lock dependencies bang `uv`
- Tao `src/` skeleton + `__init__.py`
- Tao `core/config.py`, `database.py`, `security.py`, `exceptions.py`, `dependencies.py`, `logger.py`
- Them `base/` cho repository/service abstractions
- Khoi tao models + schemas base
- Setup Alembic va health/startup path

## Do not do

- Khong them AI chat hoac CRUD domain truoc khi core layer ro rang
- Khong de `create_all()` la co che migration chinh
- Khong lai de router xu ly business logic

## Acceptance checkpoints

- App boot duoc local
- DB session va config tap trung hoat dong
- Alembic co the `upgrade head`
- Co skeleton du de domain sau do bam vao

## Read more

- `../../plan/03_be_refactor_plan.md`
- `../../plan/08_coding_standards.md`
- `../../plan/09_database_design.md`
- `../../plan/14_config_plan.md`
