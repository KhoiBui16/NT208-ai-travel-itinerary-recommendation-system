# PR #00047 — feat: [#00047] add db-only agent suggest endpoint

**Branch:** `feat/00047-c-suggestion-service`  
**Base:** `main`  
**Status:** review_ready  
**Squash commit:** `feat: [#00047] add db-only agent suggest endpoint`

---

## Mô tả

Implement C.2 SuggestionService — EP-30 `GET /api/v1/agent/suggest/{activity_id}`.  
Gợi ý địa điểm thay thế cho một activity trong trip, **DB-only** (không gọi LLM), **owner-only**.  
Task ID: [#00047]

## Thay đổi chính

- [x] `Backend/src/places/suggestion_service.py` — SuggestionService: owner-check, resolve destination, exclude existing place_ids, query alternatives
- [x] `Backend/src/agent/router.py` — Router prefix `/agent`, endpoint EP-30 `GET /suggest/{activity_id}`
- [x] `Backend/src/main.py` — `include_router(agent_router)`
- [x] `Backend/src/places/schemas.py` — thêm `SuggestionResponse`
- [x] `Backend/src/places/repository.py` — thêm `find_alternatives(destination_id, category, exclude_ids, limit)`
- [x] `Backend/src/itineraries/repository.py` — thêm `get_activity_with_trip()`, `get_place_ids_in_trip()`
- [x] `Backend/tests/unit/test_suggestion_service.py` — 4 unit tests
- [x] `Backend/tests/integration/test_agent_endpoints.py` — 2 integration tests (401, 404)
- [x] `docs/03_backend.md` — EP-30 + tổng 34 endpoints, cập nhật section 11
- [x] `docs/06_ai_roadmap.md` — C.2 status review_ready, bảng thứ tự ưu tiên
- [x] `docs/09_execution_tracker.md` — row 00047 review_ready
- [x] `docs/10_automation_testing_report.md` — 97 unit + 44 integration + 13 e2e
- [x] `docs/11_phase_roadmap.md` — C.2 status review_ready
- [x] `docs/REPORTS/phase_c2_suggestion_service.md` — báo cáo đầy đủ
- [x] `plan/20_phase_c2_suggestion_service.md` — header status cập nhật

**Không sửa** file `.tsx` FE (giữ UI/UX mock như cũ).

## Cách kiểm tra (Testing)

```powershell
# 1. Khởi động services
docker compose up -d db redis

# 2. Migrate + chạy BE
cd Backend
uv run alembic upgrade head
uv run uvicorn src.main:app --host localhost --port 8020

# 3. Chạy tests
uv run ruff check src tests
uv run pytest tests/unit/ -v
$env:CI="true"; uv run pytest tests/integration/ -v

# 4. API smoke (cần JWT từ login trước)
# Login → lấy access_token → tạo trip + activity → lấy activity_id
curl.exe -H "Authorization: Bearer <token>" "http://localhost:8020/api/v1/agent/suggest/<activityId>?limit=5"
# Kỳ vọng: 200 + suggestions[] (có data nếu đã ETL Hà Nội)
# Không Bearer → 401
# Activity không tồn tại → 404
```

**Kết quả mong đợi:**
- ruff check: PASS
- 97 unit tests pass
- 44 integration tests pass
- API smoke: 200 với `activityId`, `currentName`, `suggestions[]`

## Lưu ý khác

- **Không cần key mới**: C.2 chỉ query Postgres. Cần `JWT_SECRET_KEY` + `DATABASE_URL` + places trong DB.
- `GEMINI_API_KEY` **không cần** cho feature này.
- Nếu `suggestions` rỗng: chạy ETL trước — `uv run python -m src.etl --cities "Hà Nội"`.
- FE `FloatingAIChat.tsx` vẫn mock — cố ý, không thuộc scope C.2.
- Endpoint count sau merge: **34 core HTTP endpoints**.

## Required checks

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
- `frontend-build`
- `frontend-e2e`
