# Plan C.1 — AI Generate Pipeline (Itinerary Generator)

> Trạng thái: Chưa bắt đầu
> Độ phức tạp: ★★★★☆
> Phụ thuộc: Không (độc lập với các Phase C khác)
> Endpoint: `POST /api/v1/itineraries/generate` (đã tồn tại, cần thay stub bằng LLM thật)

## Mục tiêu

Thay stub `ItineraryService.generate()` bằng pipeline recommendation-first: lấy và xếp hạng ứng viên places/hotels từ DB trước, sau đó gọi Gemini LLM để sắp xếp thành lộ trình du lịch hoàn chỉnh (ngày + hoạt động + lưu trú) từ yêu cầu người dùng.

## Hiện trạng

- `ItineraryService.generate()` (service.py:50-69): Tạo trip rỗng, không gọi LLM
- `GenerateItineraryRequest` schema đã có: destination, start_date, end_date, budget, adults, children, interests
- `ItineraryResponse` schema đã có: days[], accommodations[], total_cost, traveler_info
- Rate limiter `RateLimiter` đã có, nhưng endpoint generate **chưa gọi** `enforce_ai_limit()`
- Config đã có: `gemini_api_key`, `agent_model`, `agent_max_retries`, `agent_timeout_seconds`

## Thiết kế — 5 bước RAG Pipeline

```
FE → POST /api/v1/itineraries/generate
  → ItineraryService.generate()
    1. Validate request (dates valid 1-14 ngày, budget > 0)
    2. Build Recommendation Context (query + filter + rank places/hotels theo destination/interests/budget)
    3. Build prompt (system + user template + recommendation context)
    4. Call Gemini (structured output JSON mode, retry max 2 = 3 total attempts)
    5. Save to DB (map AI names → DB IDs, validate total_cost ≤ budget×1.2)
```

## Files cần tạo/sửa

### Tạo mới

| File | Mục đích | Dự kiến dòng |
|------|----------|-------------|
| `Backend/src/itineraries/pipeline.py` | LLM orchestration: prompt building, structured output, retry | ~130 |
| `Backend/src/agent/__init__.py` | AI agent package marker | ~5 |
| `Backend/src/agent/llm.py` | `get_llm()`, `get_llm_with_tools()`, `retry_llm_call()` | ~50 |
| `Backend/src/agent/config.py` | AgentConfig dataclass | ~40 |
| `Backend/src/agent/prompts/__init__.py` | Prompts package | ~3 |
| `Backend/src/agent/prompts/itinerary_prompts.py` | SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, build_prompt() | ~60 |
| `Backend/src/agent/schemas/__init__.py` | Schemas package | ~3 |
| `Backend/src/agent/schemas/itinerary_schemas.py` | AgentActivity, AgentDay, AgentItinerary | ~50 |

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `Backend/src/itineraries/service.py` | Thay stub `generate()` bằng gọi `ItineraryPipeline` |
| `Backend/src/itineraries/router.py` | Thêm rate limiter `enforce_ai_limit()` vào endpoint generate |
| `Backend/src/itineraries/repository.py` | Thêm method `search_places_for_ai(destination, categories, limit)` + map destination string sang `destinations.id` |
| `Backend/pyproject.toml` | MVP C.1 có thể dùng dependency hiện có `google-generativeai`; chỉ thêm `langchain-google-genai` nếu chọn LangChain structured output |
| `Backend/.env.example` | Bỏ comment `GEMINI_API_KEY=` → thêm note hướng dẫn |

## Chi tiết kỹ thuật

### 1. Structured Output Schema

```python
class AgentActivity(CamelCaseModel):
    name: str
    time: str           # "09:00"
    end_time: str | None
    type: ActivityType   # food/attraction/nature/entertainment/shopping
    location: str
    description: str
    adult_price: int | None
    transportation: TransportType | None = None

class AgentDay(CamelCaseModel):
    day_number: int
    label: str
    activities: list[AgentActivity]   # ≥2 hoạt động/ngày

class AgentItinerary(CamelCaseModel):
    days: list[AgentDay]
    total_cost: int
    summary: str
```

### 2. Retry Strategy

```
Attempt 1 → parse response
  ├── Pydantic PASS → return data
  └── Pydantic FAIL → build error feedback → retry

Attempt 2 → call LLM + error feedback → parse
  ├── PASS → return data
  └── FAIL → retry

Attempt 3 → call LLM + accumulated errors → parse
  ├── PASS → return data
  └── FAIL → raise LLMGenerationError
```

Max 2 retries (3 attempts total), timeout 30s, exponential backoff (1s, 2s).

### 3. Recommendation Context Query

Recommendation context là lõi của tính năng recommendation: DB chọn candidate đáng tin trước, Gemini chỉ đóng vai trò planner/composer để sắp xếp thành itinerary.

**Lưu ý source hiện tại:** `Trip` đang lưu `destination` dạng string, không có `destination_id`. Vì vậy pipeline/repository phải resolve `request.destination` hoặc `trip.destination` sang `destinations.id` trước khi dùng filter `places.destination_id`. Nếu không resolve được, trả context rỗng có kiểm soát hoặc fallback sang text search theo destination, không giả định `activity.trip.destination_id` đã tồn tại.

```sql
SELECT name, category, avg_cost, LEFT(description, 80) as desc
FROM places
WHERE destination_id = (SELECT id FROM destinations WHERE name ILIKE :dest)
  AND category = ANY(:interests)
ORDER BY rating DESC
LIMIT 30;
```

### 4. Save Logic

- Map AI place names → DB place IDs (fuzzy match ILIKE)
- Places không match → chỉ dùng `unverified=True` nếu đã thêm field/migration tương ứng; nếu model hiện tại chưa có field này thì lưu activity dạng text-only/place_id nullable theo schema hiện có
- Validate total_cost ≤ budget × 1.2 (cho phép vượt 20%)
- Nếu vượt → scale down proportionally

### 5. Rate Limiter Integration

```python
# router.py
@router.post("/generate", ...)
async def generate_itinerary(
    ...,
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
):
    if user:
        await rate_limiter.enforce_ai_limit(user.id)
    return await service.generate(request, user_id=user.id if user else None)
```

Vì `/generate` cho phép optional auth, cần quyết định rõ cách xử lý guest:

- Option A: yêu cầu đăng nhập để dùng AI generate thật.
- Option B: vẫn cho guest generate nhưng rate limit theo IP/session/claim-token key.

Không để guest bypass quota trong khi user đăng nhập bị giới hạn.

## Test plan

| Test | Loại | Mô tả |
|------|------|-------|
| `test_pipeline_build_prompt` | Unit | Prompt chứa đúng destination, dates, budget |
| `test_pipeline_retry_on_invalid_json` | Unit | Mock LLM trả JSON sai → retry |
| `test_pipeline_max_retry_then_fail` | Unit | 3 lần fail → raise LLMGenerationError |
| `test_pipeline_valid_output_saves` | Unit | Mock valid output → verify DB records |
| `test_pipeline_budget_validation` | Unit | total_cost > budget×1.2 → scale down |
| `test_generate_rate_limited` | Integration | Gọi 4 lần → lần 4 bị 429 |
| `test_generate_guest_claim` | Integration | Guest generate → nhận claimToken |
| `test_generate_auth_user` | Integration | Auth user → trip.user_id đúng |

## Biến môi trường

```env
GEMINI_API_KEY=<cần điền>
GOONG_API_KEY=<cần điền nếu cần ETL/data thật>
AGENT_MODEL=gemini-2.5-flash
AGENT_TIMEOUT_SECONDS=30
AGENT_MAX_RETRIES=2
RATE_LIMIT_AI_FREE=3
AI_RATE_LIMIT_FAIL_MODE=closed
```

## Xác nhận hoàn thành

- [ ] `ItineraryPipeline.generate()` gọi Gemini thật
- [ ] Structured output + Pydantic validation + retry
- [ ] Recommendation context query/filter/rank trước khi gọi LLM
- [ ] Destination string được map sang `destinations.id` trước khi filter places
- [ ] Rate limiter trên endpoint generate cho auth user
- [ ] Guest generate có rate limit riêng hoặc bị yêu cầu login
- [ ] Guest generate vẫn nhận claimToken
- [ ] Quyết định dependency C.1: dùng `google-generativeai` hiện có hoặc thêm `langchain-google-genai`
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] `ruff check` + `ruff format` pass

---

## CORRECTIONS (so sánh source code 2026-05-19)

### 1. Retry count: 2, KHÔNG phải 3

`config.py:145` có `agent_max_retries: int = 2`. Nghĩa là **2 lần retry** sau lần gọi đầu → **3 total attempts**.

| Nơi cần sửa | Plan gốc | Sửa thành |
|-------------|---------------------|-----------|
| Thiết kế bước 4 | `retry max 3` | `retry max 2 (3 total attempts)` |
| Retry Strategy | `Max 3 retries, timeout 30s` | `Max 2 retries (3 attempts total), timeout 30s` |
| Env variable | `AI_MAX_RETRIES=3` | `AGENT_MAX_RETRIES=2` |

### 2. Schema placement: giữ `src/agent/schemas/` nhưng ghi rõ lý do

`AgentActivity`, `AgentDay`, `AgentItinerary` là **LLM output schemas** (structured output cho Gemini), khác với API schemas (`ActivityResponse`, `DayResponse`) trong `src/itineraries/schemas.py`.

**Quyết định**: Giữ `src/agent/schemas/itinerary_schemas.py` vì:
- LLM schemas có fields khác (transportation, end_time, description) vs API schemas (id, placeId, tripId)
- Pipeline `src/itineraries/pipeline.py` sẽ import từ cả hai: `from src.agent.schemas import AgentItinerary` + `from src.itineraries.schemas import ItineraryResponse`, rồi map giữa chúng
- Giữ separation of concerns: LLM parsing vs API contract

### 3. Model name: `gemini-2.5-flash` đúng theo code

`config.py:142` có `agent_model: str = "gemini-2.5-flash"`. Plan ghi `GEMINI_MODEL=gemini-2.5-flash` ở env section → **đúng rồi, không cần sửa**. (Lưu ý: docs cũ trong `plan/04_ai_agent_plan.md` nói `gemini-2.0-flash` nhưng code là nguồn chính xác.)

### 4. File pipeline placement đã đúng

Plan ghi `Backend/src/itineraries/pipeline.py` → đúng theo by-domain pattern. Không cần sửa.

### 5. `src/agent/` chỉ chứa shared infra

Khi tạo `src/agent/`, chỉ chứa các file shared cho nhiều services:
- `__init__.py`, `config.py`, `llm.py` — shared AI infra
- `prompts/` — prompt templates
- `schemas/` — LLM output schemas (không phải API schemas)
- `tools/` — LangChain tools (C.3 mới cần)
- `graph/` — LangGraph definitions (C.3 mới cần)

Business logic (pipeline, companion, suggestion) nằm trong domain folders tương ứng (`src/itineraries/`, `src/places/`).

### 6. Recommendation context là phần chính của bài toán recommendation

C.1 không chỉ là "fetch DB context". Cần build một lớp recommendation context trước khi gọi LLM:

- Resolve destination string → `destinations.id`
- Query places/hotels theo destination
- Filter theo interests/category/budget
- Rank theo rating/review_count/cost fit
- Chọn top-K đủ đa dạng để đưa vào prompt

Gemini không nên tự bịa địa điểm; Gemini dùng candidate đã được recommend từ DB để lập lịch trình.

### 7. Dependency C.1: dùng SDK hiện có trước nếu muốn MVP nhanh

Source hiện tại đã có `google-generativeai`. `langchain-google-genai` và `langgraph` chưa có trong `pyproject.toml`.

**Quyết định khuyến nghị cho C.1:** dùng `google-generativeai` hiện có để build Generate Pipeline trước. Chỉ thêm `langchain-google-genai` nếu cần LangChain structured output trong C.1. `langgraph` để dành cho C.3 Companion Chat.
