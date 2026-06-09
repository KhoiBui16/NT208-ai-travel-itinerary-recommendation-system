# Phase Report: C.2 SuggestionService (EP-30)

Ngày báo cáo: 2026-05-26  
Branch: `feat/00047-c-suggestion-service`  
Status: **IMPLEMENTED** (BE-only) + local API smoke PASS

## Mục tiêu

`GET /api/v1/agent/suggest/{activity_id}` — gợi ý địa điểm thay thế cho một activity trong trip, **DB-only**, **không LLM**, **owner-only**.

## Files đã thêm/sửa

| File | Thay đổi |
|------|----------|
| `Backend/src/places/suggestion_service.py` | Orchestration: owner-check, resolve destination, exclude places, query alternatives |
| `Backend/src/agent/router.py` | Router prefix `/agent`, endpoint EP-30 |
| `Backend/src/main.py` | `include_router(agent_router)` |
| `Backend/src/places/schemas.py` | `SuggestionResponse` |
| `Backend/src/places/repository.py` | `find_alternatives()` |
| `Backend/src/itineraries/repository.py` | `get_activity_with_trip()`, `get_place_ids_in_trip()` |
| `Backend/tests/unit/test_suggestion_service.py` | 4 unit tests |
| `Backend/tests/integration/test_agent_endpoints.py` | 401 + CI 404 |

**Không sửa** file `.tsx` FE (giữ UI/UX mock như cũ).

## API contract

**Request**

```http
GET /api/v1/agent/suggest/{activity_id}?limit=5
Authorization: Bearer <access_token>
```

**Response** (`camelCase`)

```json
{
  "activityId": 292,
  "currentName": "Phở",
  "suggestions": [
    {
      "id": 10,
      "name": "...",
      "type": "food",
      "city": "Hà Nội",
      "rating": 4.5,
      "reviewCount": 10
    }
  ]
}
```

**Errors**

| Case | Status |
|------|--------|
| Không auth | 401 |
| Không phải owner | 403 |
| Activity không tồn tại | 404 |
| Destination chưa có trong DB | 200, `suggestions: []` |

## Logic flow

```text
get_current_user
→ get_activity_with_trip(activity_id)
→ trip.user_id == user.id
→ resolve destinations.name/slug from trip.destination
→ exclude place_ids already on trip (+ current activity.place_id)
→ find_alternatives(destination_id, activity.type, exclude_ids, limit)
→ SuggestionResponse
```

**Invariant:** không gọi `GEMINI_API_KEY`; không fail-open rate limit (endpoint không dùng AI quota).

## Env keys (C.2)

| Key | Cần cho C.2? | Ghi chú |
|-----|--------------|---------|
| `JWT_SECRET_KEY` | Có (auth) | Đã có trong `.env.example` |
| `DATABASE_URL` | Có | Postgres — cần places ETL cho kết quả có ý nghĩa |
| `REDIS_URL` | Không bắt buộc | Endpoint không cache riêng |
| `GEMINI_API_KEY` | **Không** | C.2 DB-only |
| `GOONG_API_KEY` | **Không** (cho suggest) | Chỉ cần nếu chạy ETL bổ sung data |

## Verification log

| Gate | Kết quả | Ghi chú |
|------|---------|---------|
| `uv run ruff check src tests` | PASS | Cache warning Windows — xem ISSUE ruff_cache |
| `uv run pytest tests/unit/` | **97 passed** | +4 tests C.2 |
| `CI=true uv run pytest tests/integration/` | **44 passed** | +2 agent tests |
| Docker db/redis | healthy | `docker compose ps` |
| `GET /api/v1/health` @8020 | 200 | BE local port 8020 |
| API smoke suggest | PASS | trip 164, activity 292 → **5 suggestions** |
| API smoke 401 | PASS | no Bearer → 401 |
| API smoke 404 | PASS | activity 999999999 → 404 |
| FE e2e | not re-run | C.2 không đổi UI — không bắt buộc cho PR này |
| Browser UI test | **Skipped** | Không có UI entry cho EP-30; `FloatingAIChat` vẫn mock |

### Smoke commands (tái hiện)

```powershell
docker compose up -d db redis
cd Backend
uv run alembic upgrade head
uv run uvicorn src.main:app --host localhost --port 8020

# Sau khi login + có trip với activity id X:
curl.exe -H "Authorization: Bearer <token>" http://localhost:8020/api/v1/agent/suggest/X
```

## Endpoint count

Sau merge C.2: **34 core HTTP endpoints** (thêm EP-30). EP-34 analytics vẫn optional.

## Known gaps / follow-ups

- FE chưa wire `GET /agent/suggest` — cố ý (không đổi UI/UX). Có thể thêm `Frontend/src/app/services/agent.ts` ở PR riêng khi team sẵn sàng nối component hiện có.
- `ContextualSuggestionsPanel` là use case khác (city-level mock) — không thuộc C.2.
- Cần ETL places cho destination (`uv run python -m src.etl --cities "Hà Nội"`) nếu `suggestions` rỗng.

## Liên quan Phase C tiếp theo

- **C.3 Companion** (`plan/21`) — xem giải thích trong báo cáo tổng / README.
- **C.4 Chat history** — sau C.3.
- **EP-33 rate-limit-status** — có thể branch nhỏ `00051` sau C.2.
