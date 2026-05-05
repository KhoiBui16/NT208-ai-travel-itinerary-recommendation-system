# 06. AI Services Roadmap (Phase C)

## Mục đích

File này mô tả **chi tiết kiến trúc AI target** cho Phase C — generate pipeline, companion chat, suggestion service, chat history. Tất cả chưa implement. Đọc file này khi bắt đầu Phase C để hiểu đúng design đã chốt.

**Khi nào đọc file này:**
- Bắt đầu implement Phase C → hiểu pipeline architecture
- Code review AI code → kiểm tra invariant (không tự persist, owner-check, audit-friendly)
- Thêm AI endpoint mới → follow pattern đã chốt
- Debug AI output → hiểu retry/validation flow

---

## 1. Trạng thái hiện tại

- `POST /api/v1/itineraries/generate` là **stub** — tạo empty trip, không gọi LLM.
- Chat/companion UI ở FE là **mock/demo**, không nối API thật.
- DB đã có bảng `chat_sessions` + `chat_messages` (schema sẵn), nhưng chưa có API.
- Chưa có `ItineraryPipeline`, `CompanionService`, `SuggestionService`, `ChatService`.

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
│  │  1. Validate request (dates valid, budget > 0)          │ │
│  │  2. _create_trip_record() → Trip ORM (ai_generated=True)│ │
│  │  3. ItineraryPipeline.generate(request, trip)            │ │
│  │     ├── Build prompt từ destination + params             │ │
│  │     │   ├── System prompt: role, output format, rules    │ │
│  │     │   └── User prompt: destination, dates, budget,     │ │
│  │     │       travelers, interests, constraints            │ │
│  │     ├── Call Gemini LLM (structured output JSON mode)    │ │
│  │     │   ├── model: gemini-2.0-flash (configurable)       │ │
│  │     │   ├── timeout: 30 giây                             │ │
│  │     │   └── response_schema: DaySchema[] + Accommodation │ │
│  │     ├── Pydantic validation (retry tối đa 3 lần)        │ │
│  │     │   ├── Valid → return DaySchema[] + Accommodation[] │ │
│  │     │   └── Invalid → retry with error feedback          │ │
│  │     └── Return validated data                            │ │
│  │  4. Save days + activities + accommodations to DB        │ │
│  │  5. Calculate total_cost                                 │ │
│  │  6. Return ItineraryResponse (camelCase)                 │ │
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
  └── Maximum 3 retries → không loop vô hạn
```

### 2.3 Yêu cầu kỹ thuật

| Yêu cầu | Chi tiết | Tại sao |
|---|---|---|
| Structured output | Gemini JSON mode ép output theo schema | Không parse text tự do, giảm hallucination |
| Schema validation | Pydantic `GenerateItineraryResponse` | Catch lỗi type, missing field, value range |
| Retry hữu hạn | Tối đa 3 lần; sau đó return error | Không loop vô hạn, không treo request |
| Field names | `name` (không `title`), `adultPrice`/`childPrice` | FE contract đã chốt |
| camelCase contract | `CamelCaseModel` serializes | Khớp `trip.types.ts` |
| Rate limit | 3 generates/ngày cho free user | Chống abuse, tiết kiệm API cost |
| Timeout | LLM call timeout 30 giây | Không treo request |
| Owner-check | Generate cho user authenticated hoặc guest | Guest nhận claimToken |

### 2.4 File cần tạo

| File Backend | Mục đích | Layer |
|---|---|---|
| `src/itineraries/pipeline.py` | LLM orchestration, prompt building, structured output parsing, retry | Service |
| `src/itineraries/schemas.py` (mở rộng) | `GenerateItineraryResponse` (cần tạo, `GenerateItineraryRequest` đã có) | Schema |

| File Frontend | Mục đích |
|---|---|
| `CreateTrip.tsx` | Không cần sửa — đã gọi `generateItinerary` API |

### 2.5 Config cần thêm

```env
GEMINI_API_KEY=<api-key>        # Bắt buộc cho Phase C
GEMINI_MODEL=gemini-2.0-flash   # Model mặc định
AI_GENERATE_TIMEOUT=30          # Timeout giây
AI_MAX_RETRIES=3                # Số lần retry khi output invalid
AI_RATE_LIMIT_DAILY=3           # Giới hạn generate/ngày cho free user
```

---

## 3. Companion Chat — Patch-Confirm Flow

### 3.1 Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│              COMPANION CHAT FLOW                              │
│                                                              │
│  FE (FloatingAIChat.tsx)                                     │
│  → POST /api/v1/agent/chat { message, tripId }              │
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
│  │     ├── System prompt: role, tools, constraints         │ │
│  │     ├── Trip data: days, activities, accommodations     │ │
│  │     ├── Chat history: previous messages in session      │ │
│  │     └── Tool definitions: add_activity, remove_activity,│ │
│  │         update_activity, add_accommodation, etc.        │ │
│  │                                                          │ │
│  │  4. Call LLM với tool definitions                       │ │
│  │     ├── LLM decides: trả text HOẶC gọi tool            │ │
│  │     ├── Text response → return directly                 │ │
│  │     └── Tool call → build proposedOperations            │ │
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
│  → POST /api/v1/agent/apply-patch                            │
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

| Type | Mô tả | Target fields |
|---|---|---|
| `add_activity` | Thêm activity vào day | `dayId`, `activity` |
| `remove_activity` | Xóa activity | `activityId` |
| `update_activity` | Sửa activity | `activityId`, `updates` |
| `add_accommodation` | Thêm accommodation | `accommodation` |
| `remove_accommodation` | Xóa accommodation | `accommodationId` |
| `update_budget` | Thay đổi ngân sách | `budget` |

### 3.4 Key invariants

| Invariant | Mô tả | Tại sao |
|---|---|---|
| **Không tự persist** | Chat chỉ trả `proposedOperations` | User kiểm soát mọi thay đổi DB |
| **Owner-check bắt buộc** | Tool đọc/ghi trip phải verify owner | Chống user sửa trip người khác |
| **Audit-friendly** | Mỗi operation có type + description + target | Dễ debug, dễ trace |
| **Rate limit** | Giới hạn message/session | Chống abuse |
| **Re-validate on apply** | `apply-patch` validate lại tất cả | Không tin FE input |

### 3.5 File cần tạo

| File Backend | Mục đích | Layer |
|---|---|---|
| `src/itineraries/router.py` (mở rộng) | Chat + apply-patch endpoints | Router |
| `src/itineraries/companion.py` | Intent routing, tool-calling, LLM chat | Service |

| File Frontend | Mục đích |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Thay mock bằng API thật, hiển thị proposed operations |
| `companion/*.tsx` | Nối real suggestions, confirm UI |

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

### 4.2 File cần tạo

| File | Mục đích | Layer |
|---|---|---|
| `src/places/suggestion_service.py` | Query DB + filter + sort | Service |

| File Frontend | Mục đích |
|---|---|
| `companion/PlaceSuggestions.tsx` | Nối real suggestions thay mock |

---

## 5. Chat History

### 5.1 Trạng thái

DB đã có bảng `chat_sessions` + `chat_messages` (schema sẵn qua Alembic), nhưng chưa có API.

### 5.2 Endpoints dự kiến

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/v1/chat/sessions` | Liệt kê chat sessions của user | Bearer |
| GET | `/api/v1/chat/sessions/{sessionId}/messages` | Đọc messages trong session | Bearer |
| DELETE | `/api/v1/chat/sessions/{sessionId}` | Xóa session + messages | Bearer |

### 5.3 File cần tạo

| File | Mục đích | Layer |
|---|---|---|
| `src/itineraries/router.py` (mở rộng) | Chat history endpoints | Router |
| `src/itineraries/chat_service.py` | Chat session/message CRUD | Service |
| `src/itineraries/repository.py` (mở rộng) | Chat DB queries | Repository |

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

| Thứ tự | Service | Lý do | Độ phức tạp |
|---|---|---|---|
| 1 | Generate pipeline | Core value, ảnh hưởng trực tiếp UX | Cao |
| 2 | SuggestionService | DB-only, không cần LLM, ít rủi ro | Thấp |
| 3 | Companion chat | Phức tạp nhất: intent routing + tool-calling + confirm | Rất cao |
| 4 | Chat history | Cần khi companion hoạt động, CRUD đơn giản | Thấp |
| 5 | Analytics | Optional, rủi ro bảo mật cao | Rất cao |

---

## 8. Risk Assessment

| Risk | Mức độ | Mitigation | Giải thích |
|---|---|---|---|
| LLM output không khớp schema | Cao | Structured output + Pydantic + retry 3 lần | LLM có thể trả sai format, thiếu field |
| LLM hallucination (tạo địa điểm không tồn tại) | Cao | Cross-reference DB places; flag unverified | LLM có thể "bịa" tên địa điểm |
| Rate limit abuse | Trung bình | Redis rate limiter; không fail-open | Chống gọi LLM quá nhiều |
| Prompt injection qua chat | Trung bình | Input sanitization; không expose SQL/tools | User cố gắng inject prompt |
| Chat confirm bypass | Thấp | `apply-patch` validate lại ownership + operation | Phía server luôn validate |
| LLM API down/timeout | Trung bình | Timeout 30s; fallback message | Gemini API có thể down |
| Cost vượt ngân sách | Trung bình | Rate limit 3 generates/ngày; monitor usage | Gemini API có phí |

---

## 9. File tổng hợp cần tạo cho Phase C

| File Backend | Mục đích | Layer |
|---|---|---|
| `src/itineraries/pipeline.py` | LLM orchestration cho generate | Service |
| `src/itineraries/companion.py` | Intent routing, tool-calling cho chat | Service |
| `src/places/suggestion_service.py` | Gợi ý DB-only (không LLM) | Service |
| `src/itineraries/chat_service.py` | Quản lý chat session/message | Service |
| `src/itineraries/router.py` (mở rộng) | Chat + apply-patch endpoints | Router |
| `src/itineraries/router.py` (mở rộng) | Chat history endpoints | Router |
| `src/itineraries/schemas.py` (mở rộng) | AI generate response schema | Schema |
| `src/itineraries/repository.py` (mở rộng) | Chat DB queries | Repository |

| File Frontend | Mục đích |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Thay mock bằng API thật |
| `companion/*.tsx` | Nối real suggestions, confirm UI |
