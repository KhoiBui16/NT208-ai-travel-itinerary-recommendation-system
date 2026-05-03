# 04 Places Cache

## Purpose

Tóm tắt destinations/places/saved places và Redis cache.

## Current truth

- Places endpoints đã có destinations, destination detail, search, place detail, saved places.
- Redis dùng cho read cache và cache invalidation sau ETL.
- Cache read fail-open để app vẫn chạy khi Redis down.

## Target state

- FE city/hotel/place views dần nối BE thay vì chỉ mock.
- ETL cập nhật places/hotels theo city config.
- Cache TTL lấy từ centralized config.

## Key invariants

- Saved places là owner-only.
- Redis cache không được làm request public fail nếu cache lỗi.
- ETL upsert dựa unique constraints `name + destination_id`.

## Do next

- Khi sửa places service, chạy unit place service + integration place endpoints.
- Khi sửa ETL loader/schema, chạy Alembic + ETL integration smoke.
- Khi đổi cache config, sync `Backend/config.yaml` và docs.

## Do not do

- Không hardcode TTL nếu config đã có.
- Không gọi LLM cho suggestion DB-only.
- Không bỏ cache invalidation sau ETL load.

## Acceptance checkpoints

- Destination list/detail hoạt động.
- Place search cache hit/miss/Redis down đều có test.
- Saved/unsaved place owner check pass.

## Read more

- `../../docs/03_backend.md`
- `../../docs/05_database_etl.md`
- `../../docs/08_testing_local_run.md`
