# 04 Places Cache

## Purpose

Tom tat places, destinations, saved places, va Redis cache behavior de implement dung scope.

## Current truth

- FE moi can browse/search/save places
- Backend hien tai chua co day du places API theo contract moi
- Redis duoc dua vao cho cache va mot phan rate limiting

## Target state

- Endpoints destinations, place detail, place search, saved places
- Cache danh cho read-heavy query nhu destination/place search
- Saved places gan voi user

## Key invariants

- Cache fail-open chi hop le cho read cache
- AI rate limit khong duoc fail-open im lang khi Redis down
- `SuggestionService` DB-only chi dung data/place context, khong goi LLM
- Public JSON van dung camelCase neu co field alias

## Do next

- Implement repositories/services/routers cho destinations va places
- Implement saved places CRUD theo user
- Them Redis cache cho read endpoints co loi ich ro
- Viet tests cho search/detail/saved places va cache fallback behavior

## Do not do

- Khong dung Redis nhu single source of truth
- Khong goi LLM cho feature "suggest alternatives" neu chi can query DB
- Khong bo qua fallback khi cache down

## Acceptance checkpoints

- Destinations va places endpoints chay dung
- Saved places hoat dong theo user
- Cache giup read path, khong lam sai behavior khi Redis loi

## Read more

- `../../plan/12_be_crud_endpoints.md`
- `../../plan/03_be_refactor_plan.md`
- `../../plan/06_scalability_plan.md`
- `../../plan/14_config_plan.md`
