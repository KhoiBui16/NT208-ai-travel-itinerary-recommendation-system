# 06. AI Services Roadmap (Phase C)

## Mục đích

File này mô tả **kiến trúc AI dài hạn cho Phase C** — generate pipeline, companion chat, suggestion service, chat history. Current source truth cho gate trước khi code chat/history nằm ở `docs/ARCHITECTURE_C3_C4_READINESS.md` và `docs/C3_C4_IMPLEMENTATION_PLAN.md`.

**Khi nào đọc file này:**

- Bắt đầu implement Phase C → hiểu pipeline architecture
- Code review AI code → kiểm tra invariant (không tự persist, owner-check, audit-friendly)
- Thêm AI endpoint mới → follow pattern đã chốt
- Debug AI output → hiểu retry/validation flow

---

## 1. Trạng thái hiện tại

- `POST /api/v1/itineraries/generate` đã chạy **C.1 direct pipeline**: build recommendation context từ DB, gọi Gemini JSON, validate, persist trip/day/activity/accommodation.
- `GET /api/v1/agent/suggest/{activity_id}` (EP-30) đã implement **C.2 SuggestionService** DB-only — merged PR #49. Xem `docs/REPORTS/phase_c2_suggestion_service.md`.
- Destination slug matching đã được cải thiện: `resolve_destination_for_ai()` hỗ trợ "Ha Noi" (không dấu) → slug "ha-noi" → match DB.
- Chat/companion UI ở FE hiện dùng `ChatPanel` làm runtime surface thật trong `TripWorkspace`; `FloatingAIChat` và các panel companion cũ vẫn còn trên source như legacy demo components nhưng không còn được mount trên route runtime chính.
- DB đã có bảng `chat_sessions` + `chat_messages` (schema sẵn) và C3A đã có session CRUD foundation.
- Đã có owner-only session CRUD API, message send/history API, `companion_service.py`, và chat quota riêng cho auth user.
- Live smoke 2026-06-20 xác nhận message flow/persistence là thật; pass `00101` trên 2026-06-21 đã bổ sung browser/API/DB evidence cho `apply`, `cancel`, `stale`, đồng thời lộ ra và fix 2 bug thật: alias `restaurant` làm nổ `500`, và stale status không persist vì rollback.
- Sau `PR #98-106`, Phase C.0–C.4 đã merge hoàn chỉnh: chat session/message APIs, apply-patch confirm/cancel/stale, session management (rename/delete/switcher/load-more), apply-patch rate limit riêng, ETL scheduler wired. Phần còn lại là C.5 Analytics (optional/deferred) + data enrichment cho sparse cities.
- C.1 và companion chat đều KHÔNG phải multi-agent; KHÔNG dùng Gemini function-calling/tool-calling — output là JSON prompt-driven, request JSON MIME và validate bằng Pydantic.

---

## 2. Generate Itinerary Pipeline

### 2.1 Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│              GENERATE ITINERARY PIPELINE                      │
│                                                              │
│  FE (CreateTrip.tsx)                                         │
│  → POST /api/v1/itineraries/generate                        │
│    { destination, startDate, endDate, budget,                 │
│      adults, children, interests }                            │
│                                                              │
│  ┌─ ItineraryService.generate() ───────────────────────────┐ │
│  │  1. Router enforce AI rate limit                         │ │
│  │     ├── user: rate:ai:user:{id}:{YYYYMMDD}               │ │
│  │     └── guest: rate:ai:guest:{hash(ip+ua)}:{YYYYMMDD}    │ │
│  │  2. ItineraryPipeline.generate()                         │ │
│  │     ├── Resolve destination string → Destination          │ │
│  │     ├── Query Goong-enriched places/hotels from DB        │ │
│  │     ├── Build compact Recommendation Context              │ │
│  │     ├── Call Gemini với JSON MIME (response_mime_type)                             │ │
│  │     │   ├── model: gemini-2.5-flash                       │ │
│  │     │   ├── timeout: config agent_timeout_seconds         │ │
│  │     │   └── output schema: AgentItinerary                 │ │
│  │     ├── Pydantic validation + retry invalid output        │ │
│  │     └── Persist Trip/Days/Activities/Accommodations       │ │
│  │  3. Guest nhận claimToken                                 │ │
│  │  4. Return ItineraryResponse (camelCase)                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  FE navigate /trip-workspace?tripId={id}                     │
│                                                              │
│  KEY: Generate KHÔNG qua Supervisor — gọi direct pipeline.  │
│       Supervisor chỉ điều phối companion chat/analytics.     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Retry flow chi tiết

```text
ItineraryPipeline.generate()
  │
  ├── Lần 1: Call LLM → parse response
  │   ├── Pydantic validation PASS → return data
  │   └── Pydantic validation FAIL
  │       ├── Lỗi: thiếu field, sai type, value ngoài range
  │       └── Build error feedback → retry
  │
  ├── Lần 2: Call LLM + error feedback → parse response
  │   ├── PASS → return data
  │   └── FAIL → retry
  │
  ├── Lần 3: Call LLM + accumulated errors → parse response
  │   ├── PASS → return data
  │   └── FAIL → raise LLMGenerationError
  │       └── Service trả error response cho FE
  │
  └── Maximum 2 retries (3 attempts) → không loop vô hạn
```

### 2.3 Yêu cầu kỹ thuật

| Yêu cầu             | Chi tiết                                                                          | Tại sao                                              |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Structured output   | Request `response_mime_type: application/json`, validate bằng Pydantic `AgentItinerary` | Không parse text tự do, giảm hallucination           |
| Schema validation   | Pydantic `AgentItinerary`                                                         | Catch lỗi type, missing field, value range           |
| Retry hữu hạn       | `agent_max_retries=2`, tổng 3 attempts cho invalid output                         | Không loop vô hạn                                    |
| Field names         | `name` (không `title`), `adultPrice`/`childPrice`                                 | FE contract đã chốt                                  |
| camelCase contract  | `CamelCaseModel` serializes                                                       | Khớp `trip.types.ts`                                 |
| Rate limit          | 3 AI calls/ngày cho user/guest                                                    | Chống abuse, tiết kiệm API cost                      |
| Timeout             | Code/config default 30s; local 3-day smoke khuyến nghị `AGENT_TIMEOUT_SECONDS=60` | Không treo request nhưng đủ thời gian cho Gemini     |
| Activity pacing     | Default exactly `5` activities/ngày, cấu hình bằng env/config                     | Không hardcode smoke-test limit vào product behavior |
| Owner-check         | Generate cho user authenticated hoặc guest                                        | Guest nhận claimToken                                |
| Empty context guard | Không đủ places → 422 trước khi gọi Gemini                                        | Không sinh itinerary từ context rỗng                 |
| Debug logging       | Log metadata cho context/prompt/attempt/duration                                  | Không log API key, không dump full prompt            |

### 2.4 File (C.1 đã merge #42)

| File Backend                             | Mục đích                                                                     | Layer           |
| ---------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| `src/itineraries/pipeline.py`            | C.1 orchestration, recommendation context, LLM call, validation, persistence | Domain service  |
| `src/agent/llm.py`                       | Gemini client wrapper + JSON parsing helpers                                 | Shared AI infra |
| `src/agent/prompts/itinerary_prompts.py` | Compact JSON-first prompt builder                                            | Shared AI infra |
| `src/agent/schemas/itinerary_schemas.py` | `AgentItinerary`, `AgentDay`, `AgentActivity` output schemas                 | Shared AI infra |

| File Frontend    | Mục đích                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `CreateTrip.tsx` | Gọi `generateItinerary`; guest lưu `claimToken` vào pending claim trước khi vào route protected |
| `Login.tsx`      | Sau login quay lại đúng `pathname + search` để giữ `tripId`                                     |

### 2.5 Config cần thêm

```env
GEMINI_API_KEY=<api-key>        # Bắt buộc cho Phase C
GOONG_API_KEY=<api-key>         # Bắt buộc để ETL tạo DB recommendation context
AGENT_MODEL=gemini-2.5-flash    # Code default
AGENT_TIMEOUT_SECONDS=60        # Local smoke 3 ngày; code/config default 30
AGENT_MAX_RETRIES=2             # 2 retries, tổng 3 attempts khi output invalid
AGENT_MIN_ACTIVITIES_PER_DAY=5  # Default product pacing
AGENT_MAX_ACTIVITIES_PER_DAY=5
```

### 2.6 Local smoke đã xác nhận

Ngày 2026-05-25:

- Goong ETL Hà Nội: 60 places + 3 hotels được load vào DB.
- `GET /api/v1/places/search?city=Hà Nội&limit=5` trả dữ liệu từ DB.
- Generate 1 ngày với timeout 30s trả `201 Created`.
- Generate 3 ngày cần `AGENT_TIMEOUT_SECONDS=60` trong `.env`, trả `201 Created`, có `claimToken` cho guest.
- Sau khi bật pacing default `5-5`, smoke phải trả đúng 5 activities/ngày để giữ chất lượng nhưng tránh output quá dài.
- Browser debug 4 ngày: prompt khoảng 6.4k chars (~1.6k token), response khoảng 11.7k chars; timeout không do context window mà do latency/output length của Gemini.
- Guest browser flow: API trả `201`, FE lưu `pendingClaim` vào `sessionStorage`, rồi route protected chuyển login; authenticated flow vào workspace và load trip từ BE.
- FE/BE browser e2e pass 11/11 khi FE `localhost:5173` gọi BE local qua `E2E_API_URL`; CORS đã bổ sung origin `localhost:5173`.
- Browser AI smoke sau fix: authenticated generate 1 ngày trả 201, workspace load đúng generated trip từ BE và `useTripSync` chỉ gọi `GET /itineraries/{id}` một lần.

---

## 3. Companion Chat — Patch-Confirm Flow

> **Lưu ý:** Companion editing đã merge (#98-106). Current source có owner-only session/message APIs, real Gemini call, persisted history, `apply-patch` confirm/cancel/stale path, và session management (rename/delete/switcher/load-more). Phần dưới mô tả conceptual flow; cơ chế thực là JSON prompt-driven `proposedOperations` (request JSON MIME + validate Pydantic), KHÔNG dùng Gemini tool-calling/function-calling.

### 3.1 Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│              COMPANION CHAT FLOW                              │
│                                                              │
│  FE (ChatPanel + confirm UI)                          │
│  → POST /api/v1/itineraries/chat-sessions/{sessionId}/messages │
│                                                              │
│  ┌─ CompanionService.chat() ──────────────────────────────┐ │
│  │  1. Classify intent                                     │ │
│  │     ├── "modify" → user muốn sửa trip                  │ │
│  │     ├── "info" → user hỏi thông tin                    │ │
│  │     ├── "suggest" → user muốn gợi ý                    │ │
│  │     └── "general" → câu hỏi chung                      │ │
│  │                                                          │ │
│  │  2. Load trip context (OWNER-CHECK BẮT BUỘC)           │ │
│  │     ├── get_current_user → user_id                     │ │
│  │     ├── repo.get_with_full_data(tripId)                │ │
│  │     └── trip.user_id == user_id → else Forbidden       │ │
│  │                                                          │ │
│  │  3. Build LLM context                                   │ │
│  │     ├── System prompt: role, operation contract, constraints │ │
│  │     ├── Trip data: days, activities, accommodations     │ │
│  │     ├── Chat history: previous messages in session      │ │
│  │     └── Operation contract: add_activity, remove_activity,│ │
│  │         update_activity, add_accommodation, etc.        │ │
│  │                                                          │ │
│  │  4. Call Gemini với JSON prompt template                 │ │
│  │     ├── LLM trả structured JSON response                │ │
│  │     ├── Text-only response → return directly            │ │
│  │     └── JSON có operations → build proposedOperations   │ │
│  │                                                          │ │
│  │  5. Return response:                                     │ │
│  │     {                                                    │ │
│  │       message: "Tôi đề xuất thêm Văn Miếu...",          │ │
│  │       requiresConfirmation: true,                        │ │
│  │       proposedOperations: [                              │ │
│  │         { type: "add_activity",                          │ │
│  │           description: "Thêm 'Thăm Văn Miếu' ngày 1",   │ │
│  │           target: { dayId: 1, activity: {...} } }       │ │
│  │       ]                                                  │ │
│  │     }                                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  FE hiển thị proposed changes + confirm button               │
│                                                              │
│  → User confirm                                              │
│  → POST /api/v1/itineraries/{tripId}/apply-patch             │
│    { operations: proposedOperations }                         │
│                                                              │
│  ┌─ CompanionService.apply_patch() ───────────────────────┐ │
│  │  1. Owner-check lại (không tin FE input)               │ │
│  │  2. Validate mỗi operation (type, target, data)        │ │
│  │  3. Apply operations to DB                              │ │
│  │     ├── "add_activity" → repo.add_activity()           │ │
│  │     ├── "remove_activity" → repo.delete_activity()     │ │
│  │     ├── "update_activity" → repo.update_activity()     │ │
│  │     └── ...                                             │ │
│  │  4. Return confirmation result                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  KEY: Chat KHÔNG TỰ PERSIST DB trước khi user confirm.     │
│       Mỗi operation có audit-friendly type + description.    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Proposed operations schema

```json
{
	"requiresConfirmation": true,
	"proposedOperations": [
		{
			"type": "add_activity",
			"description": "Thêm hoạt động 'Tham quan Văn Miếu' vào ngày 1 lúc 09:00",
			"target": {
				"dayId": 1,
				"activity": {
					"name": "Thăm Văn Miếu",
					"time": "09:00",
					"type": "attraction",
					"location": "Quốc Tử Giám, Đống Đa, Hà Nội",
					"adultPrice": 30000
				}
			}
		},
		{
			"type": "remove_activity",
			"description": "Xóa hoạt động 'Lunch at Pho 10' khỏi ngày 1",
			"target": {
				"activityId": 42
			}
		}
	],
	"message": "Tôi đề xuất thay đổi lịch trình ngày 1 nhé?"
}
```

### 3.3 Operation types

| Type                   | Mô tả                 | Target fields           |
| ---------------------- | --------------------- | ----------------------- |
| `add_activity`         | Thêm activity vào day | `dayId`, `activity`     |
| `remove_activity`      | Xóa activity          | `activityId`            |
| `update_activity`      | Sửa activity          | `activityId`, `updates` |
| `add_accommodation`    | Thêm accommodation    | `accommodation`         |
| `remove_accommodation` | Xóa accommodation     | `accommodationId`       |
| `update_budget`        | Thay đổi ngân sách    | `budget`                |

### 3.4 Key invariants

| Invariant                | Mô tả                                        | Tại sao                        |
| ------------------------ | -------------------------------------------- | ------------------------------ |
| **Không tự persist**     | Chat chỉ trả `proposedOperations`            | User kiểm soát mọi thay đổi DB |
| **Owner-check bắt buộc** | Tool đọc/ghi trip phải verify owner          | Chống user sửa trip người khác |
| **Audit-friendly**       | Mỗi operation có type + description + target | Dễ debug, dễ trace             |
| **Rate limit**           | Giới hạn message/session                     | Chống abuse                    |
| **Re-validate on apply** | `apply-patch` validate lại tất cả            | Không tin FE input             |

### 3.5 File (C.3 đã merge #98–105)

| File Backend                          | Mục đích                               | Layer   |
| ------------------------------------- | -------------------------------------- | ------- |
| `src/itineraries/router.py` (mở rộng) | Message + apply-patch endpoints        | Router  |
| `src/itineraries/companion_service.py`| Message handling, apply-patch, JSON prompt-driven provider abstraction | Service (đã implement) |

| File Frontend        | Mục đích                                              |
| -------------------- | ----------------------------------------------------- |
| `services/agent.ts` hoặc `services/chat.ts` | Chat/apply-patch API client                 |
| `FloatingAIChat.tsx` / `ChatPanel`          | Thay mock bằng panel/session-aware UI       |
| `companion/*.tsx`    | Nối real suggestions, confirm UI                      |

---

## 4. Suggestion Service — DB-Only

### 4.1 Kiến trúc

```text
┌─────────────────────────────────────────────────────────────┐
│              SUGGESTION SERVICE (DB-Only)                     │
│                                                              │
│  FE hoặc companion context                                   │
│  → SuggestionService (src/places/suggestion_service.py)    │
│                                                              │
│  ┌─ Suggest flow ──────────────────────────────────────────┐ │
│  │  Input: destination, budget?, interests?, category?      │ │
│  │                                                          │ │
│  │  1. Query destinations by name                          │ │
│  │  2. Query places by destination_id + filters            │ │
│  │     ├── category filter (attraction, restaurant, etc.)  │ │
│  │     ├── budget filter (avg_cost <= budget_per_day)      │ │
│  │     └── rating sort (descending)                        │ │
│  │  3. Query hotels by destination_id                       │ │
│  │     ├── price filter (price_per_night <= budget)        │ │
│  │     └── rating sort                                     │ │
│  │  4. Return structured suggestions                       │ │
│  │     ├── places: top N by rating + category match        │ │
│  │     └── hotels: top N by rating + price match           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  KEY: KHÔNG gọi LLM. Chỉ filter + sort data có sẵn.        │
│  WHY: Gợi ý địa điểm chỉ cần lọc, không cần "sáng tạo".     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 File (C.2 đã merge #49)

| File                               | Mục đích                 | Layer   |
| ---------------------------------- | ------------------------ | ------- |
| `src/places/suggestion_service.py` | Query DB + filter + sort | Service |

| File Frontend                    | Mục đích                       |
| -------------------------------- | ------------------------------ |
| `companion/PlaceSuggestions.tsx` | Nối real suggestions thay mock |

---

## 5. Chat History

### 5.1 Trạng thái

DB đã có bảng `chat_sessions` + `chat_messages`, và current source đã có session/message/apply-patch APIs thật.

### 5.2 Endpoints dự kiến

| Method | Path                                         | Mô tả                          | Auth   |
| ------ | -------------------------------------------- | ------------------------------ | ------ |
| GET    | `/api/v1/chat/sessions`                      | Liệt kê chat sessions của user | Bearer |
| GET    | `/api/v1/chat/sessions/{sessionId}/messages` | Đọc messages trong session     | Bearer |
| DELETE | `/api/v1/chat/sessions/{sessionId}`          | Xóa session + messages         | Bearer |

### 5.3 File (C.4 đã merge #106)

| File                                      | Mục đích                  | Layer      |
| ----------------------------------------- | ------------------------- | ---------- |
| `src/itineraries/router.py` (mở rộng)     | Chat history endpoints    | Router     |
| `src/itineraries/service.py`              | Chat session foundation hiện tại | Service    |
| `src/itineraries/repository.py` (mở rộng) | Chat DB queries           | Repository |

---

## 6. Analytics (Optional — MVP2+)

### 6.1 Guardrails

Nếu bật Text-to-SQL analytics (EP-34), **bắt buộc** có các guardrails:

```text
┌─────────────────────────────────────────────────────────────┐
│              ANALYTICS GUARDRAILS                            │
│                                                              │
│  FE → POST /api/v1/agent/analytics { question }             │
│  │                                                           │
│  ├── 1. Read-only DB role                                   │
│  │   └── Kết nối bằng role chỉ có SELECT                    │
│  │                                                           │
│  ├── 2. Allowlist tables                                    │
│  │   └── Chỉ cho phép query: trips, activities, places,    │
│  │       destinations, hotels, ratings                      │
│  │       → BLOCK: users, refresh_tokens, share_links,      │
│  │          guest_claim_tokens, chat_*                       │
│  │                                                           │
│  ├── 3. Validate SQL                                        │
│  │   ├── Parse SQL → AST                                    │
│  │   ├── No INSERT/UPDATE/DELETE/DROP/ALTER                 │
│  │   ├── No subquery với banned table                       │
│  │   └── No UNION với banned query                          │
│  │                                                           │
│  ├── 4. User-scope filter                                   │
│  │   └── Tự động thêm WHERE user_id = ? OR user_id IS NULL│
│  │                                                           │
│  ├── 5. Max rows                                            │
│  │   └── LIMIT 100 (default), configurable                  │
│  │                                                           │
│  └── 6. Audit log                                           │
│      └── Ghi log mọi query: user_id, question, SQL, rows   │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Thứ tự ưu tiên implement Phase C

| Thứ tự | Service           | Lý do                                                  | Độ phức tạp | Trạng thái |
| ------ | ----------------- | ------------------------------------------------------ | ----------- | ---------- |
| 1      | Generate pipeline | Core value, ảnh hưởng trực tiếp UX                     | Cao         | ✅ merged #42 |
| 2      | SuggestionService | DB-only, không cần LLM, ít rủi ro                      | Thấp        | ✅ merged feat/00047 (PR #49) |
| 3      | Companion chat    | Phức tạp nhất: intent routing + JSON prompt + confirm  | Rất cao     | ✅ merged #98-105 |
| 4      | Chat history      | Cần khi companion hoạt động, CRUD đơn giản             | Thấp        | ✅ merged #106 |
| 5      | Analytics         | Optional, rủi ro bảo mật cao                           | Rất cao     | ⏸ optional/deferred (C.5 chưa implement) |

---

## 8. Risk Assessment

| Risk                                           | Mức độ     | Mitigation                                            | Giải thích                             |
| ---------------------------------------------- | ---------- | ----------------------------------------------------- | -------------------------------------- |
| LLM output không khớp schema                   | Cao        | Structured output + Pydantic + 2 retries (3 attempts) | LLM có thể trả sai format, thiếu field |
| LLM hallucination (tạo địa điểm không tồn tại) | Cao        | Cross-reference DB places; flag unverified            | LLM có thể "bịa" tên địa điểm          |
| Rate limit abuse                               | Trung bình | Redis rate limiter; không fail-open                   | Chống gọi LLM quá nhiều                |
| Prompt injection qua chat                      | Trung bình | Input sanitization; không expose SQL/tools            | User cố gắng inject prompt             |
| Chat confirm bypass                            | Thấp       | `apply-patch` validate lại ownership + operation      | Phía server luôn validate              |
| LLM API down/timeout                           | Trung bình | Timeout 30s; fallback message                         | Gemini API có thể down                 |
| Cost vượt ngân sách                            | Trung bình | Rate limit 3 generates/ngày; monitor usage            | Gemini API có phí                      |

---

## 9. File tổng hợp Phase C (C.0–C.4 đã merge)

| File Backend                              | Mục đích                              | Layer      |
| ----------------------------------------- | ------------------------------------- | ---------- |
| `src/itineraries/pipeline.py`             | LLM orchestration cho generate        | Service    |
| `src/itineraries/companion_service.py`    | Message handling, apply-patch, JSON prompt-driven cho chat | Service (đã implement) |
| `src/places/suggestion_service.py`        | Gợi ý DB-only (không LLM)             | Service    |
| `src/itineraries/service.py`              | Quản lý trip + chat session foundation | Service |
| `src/itineraries/router.py` (mở rộng)     | Session/message/apply-patch endpoints | Router     |
| `src/itineraries/schemas.py` (mở rộng)    | AI generate response schema           | Schema     |
| `src/itineraries/repository.py` (mở rộng) | Chat DB queries                       | Repository |

| File Frontend                           | Mục đích                                  |
| --------------------------------------- | ----------------------------------------- |
| `services/chat.ts` | Chat/session/apply-patch API client (đã merge #98–106) |
| `FloatingAIChat.tsx` / `ChatPanel`      | Thay mock bằng session-aware UI           |
| `companion/*.tsx`                       | Nối real suggestions, confirm UI          |
