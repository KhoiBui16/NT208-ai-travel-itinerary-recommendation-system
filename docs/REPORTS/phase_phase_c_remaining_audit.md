# Phase Report: Phase C Remaining Audit

Ngày báo cáo: 2026-05-26  
Branch báo cáo: `docs/00046-d-phase-c-audit-sync`  
Phạm vi: đối chiếu `plan/`, `docs/`, `Backend/src/`, `Frontend/src/app/` sau khi `main` đã có PR40 + PR41 và đã tạo branch restage C1 `fix/00045-c-restage-c1-guest-flow`.

## Mục Tiêu

- Xác định chính xác Phase C còn phần nào chưa làm.
- Phân biệt rõ `main` hiện tại với các fix đang nằm ở branch chưa merge.
- Đề xuất thứ tự branch/PR để hoàn thiện C.2, C.3, C.4, C.5 mà không trộn phạm vi.
- Kiểm tra xem `.env.example` đã đủ keys hay còn thiếu.

## Source Files Đã Đối Chiếu

- `Backend/src/agent/__init__.py`
- `Backend/src/agent/config.py`
- `Backend/src/agent/llm.py`
- `Backend/src/agent/prompts/itinerary_prompts.py`
- `Backend/src/agent/schemas/itinerary_schemas.py`
- `Backend/src/itineraries/pipeline.py`
- `Backend/src/itineraries/router.py`
- `Backend/src/places/router.py`
- `Backend/src/itineraries/models/chat.py`
- `Frontend/src/app/components/FloatingAIChat.tsx`
- `Frontend/src/app/components/companion/PlaceSuggestions.tsx`
- `Frontend/src/app/services/*.ts`
- `Backend/.env.example`
- `plan/19_phase_c_overview.md`
- `plan/20_phase_c2_suggestion_service.md`
- `plan/21_phase_c3_companion_chat.md`
- `plan/22_phase_c4_chat_history.md`
- `plan/23_phase_c5_analytics_optional.md`

## Current Truth Theo Source Code

| Hạng mục | Trạng thái | Evidence |
|---|---|---|
| C.0 Goong-first ETL readiness | Done trên `main` | Có `src/etl/goong_extractor.py`, `src/etl/runner.py`, migration metadata fields, docs PR40 |
| C.1 Generate Pipeline | Done trên `main` | Có `src/itineraries/pipeline.py`, `src/agent/config.py`, `src/agent/llm.py`, router `/itineraries/generate` dùng pipeline thật |
| C.1 stabilization guest claim/reload | Chưa có trên `main`, đang ở branch riêng | `fix/00045-c-restage-c1-guest-flow` chứa changes từ PR44 |
| C.2 SuggestionService | Chưa implement | Không có `Backend/src/places/suggestion_service.py`, không có endpoint `/agent/suggest/{activity_id}` |
| C.3 Companion Chat | Chưa implement | Không có `Backend/src/agent/router.py`, `graph/`, `tools/`, `itineraries/companion_service.py`; FE `FloatingAIChat.tsx` vẫn mock `setTimeout` |
| C.4 Chat History API | Chưa implement | DB models có sẵn nhưng không có `chat_service.py` hay `/chat/sessions` endpoints |
| C.5 Analytics optional | Chưa implement | Chỉ có config flags; chưa có `analytics_service.py`, `sql_validator.py`, `/agent/analytics` |

## FE/BE Evidence Chi Tiết

### C.2 SuggestionService

- `Backend/src/places/router.py` hiện chỉ có destinations, place search/detail, saved places.
- `Frontend/src/app/components/companion/PlaceSuggestions.tsx` vẫn nhận `suggestions` qua props và render mock data.
- `Frontend/src/app/services/` chưa có `agent.ts`.

### C.3 Companion Chat

- `Frontend/src/app/components/FloatingAIChat.tsx` còn comment:
  `Tích hợp API gọi AI thực tế tại đây, xóa setTimeout giả lập`
- Component chat hiện sinh AI message giả bằng `setTimeout(...)`.
- Backend chưa có `/api/v1/agent/chat` hoặc `/api/v1/agent/apply-patch`.

### C.4 Chat History

- `Backend/src/itineraries/models/chat.py` đã có `ChatSession` và `ChatMessage`.
- Nhưng `Backend/src/itineraries/router.py` chưa có 3 endpoints:
  - `GET /api/v1/chat/sessions`
  - `GET /api/v1/chat/sessions/{id}/messages`
  - `DELETE /api/v1/chat/sessions/{id}`

### C.5 Analytics

- `Backend/src/core/config.py` đã có:
  - `enable_analytics`
  - `analytics_database_url`
- Nhưng chưa có service/router/validator tương ứng.

## Plan Drift Cần Lưu Ý

| File plan | Drift | Mức độ |
|---|---|---|
| `plan/19_phase_c_overview.md` | Header vẫn ghi `Trạng thái: Chưa bắt đầu` dù C.1 đã xong trên `main` | Medium |
| `plan/19_phase_c_overview.md` | Branch examples kiểu `c1/c2/...` không còn khớp regex branch policy hiện tại | Medium |
| `docs/REPORTS/phase_plan_source_sync.md` | Đã đúng ở mức high-level nhưng chưa nêu branch restage `00045` | Low |

## Env / Secret Audit

### Keys đã có và đủ theo source hiện tại

- `JWT_SECRET_KEY`
- `GEMINI_API_KEY`
- `GOONG_API_KEY`
- `ENABLE_ANALYTICS`
- `ANALYTICS_DATABASE_URL`
- `AGENT_TIMEOUT_SECONDS`
- `AGENT_MIN_ACTIVITIES_PER_DAY`
- `AGENT_MAX_ACTIVITIES_PER_DAY`

### Kết luận về key cho các phase còn lại

| Phase | Cần key mới? | Ghi chú |
|---|---|---|
| C.2 SuggestionService | Không | DB-only |
| C.3 Companion Chat | Không bắt buộc thêm key mới | Reuse `GEMINI_API_KEY` và `GOONG_API_KEY` nếu tool cần external nearby search |
| C.4 Chat History | Không | Dùng DB hiện có |
| C.5 Analytics | Không cần key mới ngoài config đã có | Chỉ cần bật `ENABLE_ANALYTICS=true` và set `ANALYTICS_DATABASE_URL` khi thực sự implement |

Không nên thêm `LANGSMITH_*` hoặc key observability khác vào `.env.example` ở thời điểm này vì source code chưa wire chúng.

## Branch Strategy Đề Xuất

### Branch đang cần merge trước

1. `fix/00045-c-restage-c1-guest-flow`
   - Mục tiêu: mang lại toàn bộ fix của PR44 trên một branch sạch từ `main`
   - Commit hiện tại: `2bf77bd`
   - Merge trước để chốt C.1 stabilization

### Branch tiếp theo theo Phase C

2. `docs/00046-d-phase-c-audit-sync`
   - Chỉ sync report/audit/branch plan

3. `feat/00047-c-suggestion-service`
   - Scope: C.2 only

4. `feat/00048-c-companion-chat`
   - Scope: C.3 only

5. `feat/00049-c-chat-history`
   - Scope: C.4 only

6. `feat/00050-c-analytics-optional`
   - Scope: C.5 only
   - Chỉ mở khi đã có guardrails và đủ thời gian

## Thứ Tự Merge Khuyến Nghị

1. Merge `fix/00045-c-restage-c1-guest-flow`
2. Merge `docs/00046-d-phase-c-audit-sync`
3. Implement + merge `feat/00047-c-suggestion-service`
4. Implement + merge `feat/00048-c-companion-chat`
5. Implement + merge `feat/00049-c-chat-history`
6. Cân nhắc `feat/00050-c-analytics-optional` sau cùng

## Verification Used

- Source inventory bằng `rg` trên `Backend/src`, `Frontend/src/app`, `docs`, `plan`
- Đọc trực tiếp routers/services/components trọng điểm
- Đối chiếu `.env.example` với `Backend/src/core/config.py`

## Kết Luận

Phase C hiện tại mới hoàn thành phần data readiness + C.1 generate pipeline trên `main`. Fix ổn định guest claim/reload chưa vào `main`, nhưng đã được restage sang `fix/00045-c-restage-c1-guest-flow`.

Các phase còn lại C.2, C.3, C.4, C.5 đều chưa implement theo source code thực tế. `.env.example` hiện đã đủ biến môi trường cho các phase còn lại theo code hiện tại; chưa có lý do kỹ thuật để thêm key mới ngoài các key đã tồn tại.
