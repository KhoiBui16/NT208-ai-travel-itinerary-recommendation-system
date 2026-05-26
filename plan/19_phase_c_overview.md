# Phase C — Tổng quan AI Services

> Trạng thái: Chưa bắt đầu
> Thứ tự triển khai ưu tiên: C.0 data readiness → C.1a Recommendation Context → C.1b Generate Pipeline → C.2 → C.4/C.3 → C.5

## Phân chia sub-plans

| Sub-plan | Tên | Phức tạp | Phụ thuộc | File chi tiết |
|----------|-----|----------|-----------|---------------|
| **C.1** | Generate Pipeline | ★★★★☆ | Không | [19_phase_c1_generate_pipeline.md](19_phase_c1_generate_pipeline.md) |
| **C.2** | Suggestion Service | ★☆☆☆☆ | Không | [20_phase_c2_suggestion_service.md](20_phase_c2_suggestion_service.md) |
| **C.3** | Companion Chat | ★★★★★ | C.1, C.2 | [21_phase_c3_companion_chat.md](21_phase_c3_companion_chat.md) |
| **C.4** | Chat History API | ★☆☆☆☆ | C.3 | [22_phase_c4_chat_history.md](22_phase_c4_chat_history.md) |
| **C.5** | Analytics (Optional) | ★★★☆☆ | C.1 | [23_phase_c5_analytics_optional.md](23_phase_c5_analytics_optional.md) |

**Lưu ý MVP recommendation:** C.1 là nơi chính của bài toán recommendation. C.2 chỉ là gợi ý thay thế cho một activity đã có. Vì vậy nên build recommendation context trong C.1 trước, rồi C.2 reuse lại logic filter/rank nếu cần.

## Dependency graph

```
C.0 Data readiness ──→ C.1a Recommendation Context ──→ C.1b Generate Pipeline
                                  │
                                  └──→ C.2 Suggestion Service

C.1 + C.2 ──→ C.3 Companion Chat ──→ C.4 Chat History

C.1 Generate Pipeline ──→ C.5 Analytics (optional)
```

**C.1 và C.2 có thể làm song song về mặt kỹ thuật**, nhưng để test recommendation sớm và tránh duplicate ranking logic, nên làm C.1a Recommendation Context trước rồi reuse cho C.2.

## Tổng số files cần tạo/sửa

### Backend — Tạo mới (~15 files)

```
src/agent/                          ← CHỈ chứa shared AI infra
├── __init__.py
├── config.py                       (~40 dòng)
├── llm.py                          (~50 dòng)
├── router.py                       (~80 dòng, /agent/ prefix endpoints)
├── analytics_service.py            (~100 dòng, C.5)
├── sql_validator.py                (~80 dòng, C.5)
├── prompts/
│   ├── __init__.py
│   ├── itinerary_prompts.py        (~60 dòng)
│   ├── companion_prompts.py        (~40 dòng)
│   └── analytics_prompts.py        (~40 dòng, C.5)
├── schemas/
│   ├── __init__.py
│   ├── itinerary_schemas.py        (~50 dòng, LLM output schemas)
│   └── companion_schemas.py        (~50 dòng, LLM output schemas)
├── tools/
│   ├── __init__.py                 (~10 dòng)
│   ├── search_tools.py             (~80 dòng)
│   ├── itinerary_tools.py          (~80 dòng)
│   └── budget_tools.py             (~60 dòng)
└── graph/
    ├── __init__.py
    ├── companion_graph.py          (~80 dòng)
    └── nodes.py                    (~60 dòng)

src/itineraries/                    ← Business logic theo by-domain pattern
├── pipeline.py                     (~130 dòng, C.1)
├── companion_service.py            (~100 dòng, C.3)  ← BY-DOMAIN, không phải src/agent/
└── chat_service.py                 (~70 dòng, C.4)

src/places/
└── suggestion_service.py           (~60 dòng, C.2)
```

### Backend — Sửa đổi (~8 files)

| File | C.1 | C.2 | C.3 | C.4 | C.5 |
|------|-----|-----|-----|-----|-----|
| `itineraries/service.py` | ✅ Thay stub | | | | |
| `itineraries/router.py` | ✅ Rate limit | | | ✅ Chat history | |
| `itineraries/repository.py` | ✅ search_places_for_ai | ✅ find_alternatives | | ✅ Chat queries | |
| `itineraries/schemas.py` | ✅ AI response schema | ✅ SuggestionResponse | | ✅ Chat schemas | |
| `places/router.py` | | ✅ Suggest endpoint | | | |
| `main.py` | | | ✅ Register agent router | | ✅ Analytics flag |
| `pyproject.toml` | ✅ dùng `google-generativeai` hiện có hoặc thêm `langchain-google-genai` nếu cần | | ✅ langgraph | | |
| `.env.example` | ✅ GEMINI_API_KEY note | | | | |

### Frontend — Sửa đổi (~5 files)

| File | C.1 | C.2 | C.3 | C.4 |
|------|-----|-----|-----|-----|
| `services/agent.ts` (mới) | | | ✅ Chat/apply-patch API | |
| `FloatingAIChat.tsx` | | | ✅ Thay mock bằng API | |
| `companion/PlaceSuggestions.tsx` | | ✅ Kết nối thật | ✅ | |
| `CreateTrip.tsx` | ✅ Không cần sửa (đã gọi API) | | | |

## Tổng endpoints mới

| Endpoint | Method | Auth | Sub-plan |
|----------|--------|------|----------|
| `/api/v1/itineraries/generate` | POST | Optional (guest OK) | C.1 (sửa, thêm LLM) |
| `/api/v1/agent/suggest/{activity_id}` | GET | Bearer | C.2 |
| `/api/v1/agent/chat` | POST | Bearer | C.3 |
| `/api/v1/agent/apply-patch` | POST | Bearer | C.3 |
| `/api/v1/chat/sessions` | GET | Bearer | C.4 |
| `/api/v1/chat/sessions/{id}/messages` | GET | Bearer | C.4 |
| `/api/v1/chat/sessions/{id}` | DELETE | Bearer | C.4 |
| `/api/v1/agent/analytics` | POST | Bearer | C.5 (optional) |

**Từ 32 endpoints → 39 endpoints** (hoặc 38 nếu skip C.5)

---

## CORRECTIONS (so sánh source code 2026-05-19)

### 1. By-domain placement cho business logic

File listing gốc đặt `companion_service.py` trong `src/agent/` → **SAI theo by-domain pattern**. Đã sửa thành `src/itineraries/companion_service.py`.

**Nguyên tắc**: `src/agent/` chỉ chứa shared AI infra (llm, prompts, tools, graph, schemas, router). Business logic nằm trong domain folder tương ứng.

### 2. Retry count: `agent_max_retries = 2` (config.py:145)

Plan C.1 gốc ghi "Max 3 retries" và `AI_MAX_RETRIES=3` → sai. Thực tế `config.py` có `agent_max_retries: int = 2`, tức 2 lần retry (3 total attempts). Đã ghi correction trong C.1 plan.

### 3. Model name: `gemini-2.5-flash` đúng theo code

`config.py:142` có `agent_model: str = "gemini-2.5-flash"`. Docs cũ nói `gemini-2.0-flash` nhưng code là nguồn chính xác.

### 4. Chat ORM models đã tồn tại

`src/itineraries/models/chat.py` đã có `ChatSession` + `ChatMessage` ORM models. Không cần tạo mới — chỉ cần service/repository/router để dùng chúng (C.3, C.4).

### 5. Recommendation context cần đứng trước LLM

C.1 không chỉ fetch DB context. Cần query/filter/rank places/hotels trước, rồi đưa top candidates vào Gemini. LLM là planner/composer, còn recommendation core là phần DB + scoring/ranking trong pipeline.

### 6. C.2 không phải "độ chính xác 100%"

C.2 DB-only giúp không hallucinate vì chỉ trả dữ liệu đang có trong DB. Tuy nhiên độ liên quan vẫn phụ thuộc chất lượng dữ liệu, destination mapping, category mapping và ranking.

### 7. Destination hiện là string

Source hiện tại lưu trip destination dạng string, không có `Trip.destination_id`. Các plan dùng `destination_id` phải thêm bước resolve string sang `destinations.id` trước khi filter places.

### 8. Guest AI generate phải có quota riêng

`/api/v1/itineraries/generate` đang là optional auth. Nếu thêm rate limit chỉ theo `user.id`, guest sẽ bypass quota. Cần chọn: bắt buộc login cho AI generate thật, hoặc rate limit guest theo IP/session/claim-token key.

### 9. `unverified=True` cần schema/migration nếu muốn dùng

Plan C.1 có ý tưởng flag place không match DB là `unverified=True`. Chỉ dùng được nếu model/schema/migration có field tương ứng. Nếu chưa thêm field, fallback an toàn là lưu activity dạng text-only/place_id nullable theo schema hiện có.

### 10. Dependency AI nên tách theo giai đoạn

Source hiện có `google-generativeai`. C.1 có thể dùng SDK này trước để ra MVP nhanh. `langgraph` nên để C.3 Companion Chat; không cần kéo vào C.1 nếu chưa dùng agent graph.

## Checklist trước khi bắt đầu C.1

- [ ] `GEMINI_API_KEY` đã có (đăng ký Google AI Studio)
- [ ] `GOONG_API_KEY` đã có nếu cần ETL/import places thật cho recommendation
- [ ] DB có places/hotels đủ để recommendation context không rỗng
- [ ] Docker services đang chạy (PostgreSQL + Redis)
- [ ] BE tests pass
- [ ] FE build hoặc FE smoke test pass
- [ ] Branch mới: `feat/00040-c1-generate-pipeline`

## Quy ước branch cho Phase C

```
feat/00040-c1-generate-pipeline
feat/00041-c2-suggestion-service
feat/00042-c3-companion-chat
feat/00043-c4-chat-history
feat/00044-c5-analytics-optional    (chỉ nếu có thời gian)
```
