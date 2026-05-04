# 06. AI Services Roadmap (Phase C)

Phase C AI services chưa hoàn thành. Tài liệu này mô tả target kiến trúc chi tiết để implement đúng. Xem thêm kiến trúc tổng thể tại `docs/02_architecture.md`.

## Trạng thái hiện tại

- `POST /api/v1/itineraries/generate` hiện là stub — tạo empty trip, không gọi LLM.
- Chat/companion UI ở FE là mock/demo, không nối API thật.
- DB đã có bảng `chat_sessions` + `chat_messages` (từ Alembic migration), nhưng chưa có API endpoints.
- Chưa có `ItineraryPipeline`, `CompanionService`, `SuggestionService`, `ChatService`.

## 1. Generate Itinerary Pipeline

### Kiến trúc

Generate là route explicit, **không cần Supervisor** — gọi trực tiếp `ItineraryPipeline`:

```text
FE (CreateTrip) → POST /api/v1/itineraries/generate
→ Validate request (destination, dates, budget, travelers)
→ ItineraryPipeline (src/services/itinerary_pipeline.py — chưa tạo)
  → Build prompt từ request params + destination context
  → Gemini LLM structured output (JSON schema enforcement)
  → Pydantic validation/retry (tối đa 3 lần)
  → Save trip + days + activities + accommodations
→ Return ItineraryResponse (camelCase)
→ FE navigate /trip-workspace?tripId={id}
```

### Yêu cầu kỹ thuật

| Yêu cầu | Chi tiết |
|---|---|
| Structured output | Dùng Gemini's JSON mode hoặc function calling để ép output theo schema, không parse text tự do |
| Schema validation | Pydantic `GenerateItineraryResponse` validate từng field; retry nếu invalid |
| Retry hữu hạn | Tối đa 3 lần retry; sau đó return error, không loop vô hạn |
| Field names | Activity dùng `name` (không dùng `title`), giá dùng `adultPrice`/`childPrice`/`extraExpenses` |
| camelCase contract | Response public dùng `CamelCaseModel`, khớp `Frontend/src/app/types/trip.types.ts` |
| Rate limit | 3 generates/ngày cho free user; check trước khi gọi LLM |
| Timeout | LLM call timeout 30 giây; không treo request |

### File cần tạo/sửa

| File | Mục đích |
|---|---|
| `src/services/itinerary_pipeline.py` | LLM orchestration, prompt building, structured output parsing |
| `src/schemas/generate.py` | `GenerateItineraryRequest` (đã có) + `GenerateItineraryResponse` (cần tạo) |

### Config cần thêm

```env
GEMINI_API_KEY=<api-key>        # Bắt buộc cho Phase C
GEMINI_MODEL=gemini-2.0-flash   # Model mặc định
AI_GENERATE_TIMEOUT=30          # Timeout giây
AI_MAX_RETRIES=3                # Số lần retry khi output invalid
```

### FE không cần sửa

`CreateTrip.tsx` đã gọi `generateItinerary` API. Khi generate endpoint trả full itinerary thay vì empty trip, FE tự navigate đúng.

## 2. Companion Chat

### Kiến trúc

Chat cần intent routing + tool-calling, **không tự persist DB** khi user chưa confirm:

```text
FE (FloatingAIChat) → POST /agent/chat
→ CompanionService (src/services/companion_service.py — chưa tạo)
  → Classify intent (modify trip, ask info, suggest places, general)
  → Load trip context (owner-check bắt buộc)
  → Call LLM với tool definitions
  → Return proposedOperations + requiresConfirmation
→ FE hiển thị proposed changes
→ User confirm → POST /agent/apply-patch
→ Backend validate + apply patch to DB
→ Return confirmation result
```

### Key invariants

| Invariant | Mô tả |
|---|---|
| **Không tự persist** | Chat chỉ trả `proposedOperations`; phải chờ user confirm qua `apply-patch` |
| **Owner-check bắt buộc** | Tool đọc/ghi trip phải verify user owns trip |
| **Audit-friendly** | Mỗi operation có type + description + target, dễ debug |
| **Rate limit** | Giới hạn số message/session để tránh滥用 |

### Proposed operations schema

```json
{
  "requiresConfirmation": true,
  "proposedOperations": [
    {
      "type": "add_activity",
      "description": "Thêm hoạt động 'Tham quan Văn Miếu' vào ngày 1 lúc 09:00",
      "target": { "dayId": 1, "activity": { "name": "Thăm Văn Miếu", "time": "09:00" } }
    }
  ],
  "message": "Tôi đề xuất thêm thăm Văn Miếu vào sáng ngày 1 nhé?"
}
```

### File cần tạo/sửa

| File Backend | Mục đích |
|---|---|
| `src/api/v1/agent.py` | Chat + apply-patch endpoints |
| `src/services/companion_service.py` | Intent routing, tool-calling, LLM chat |

| File Frontend | Mục đích |
|---|---|
| `services/agent.ts` | Chat/apply-patch API client |
| `FloatingAIChat.tsx` | Thay mock bằng API thật, hiển thị proposed operations |
| `companion/*.tsx` | Nối real suggestions, confirm UI |

## 3. Suggestion Service

### Kiến trúc

**DB-only, không gọi LLM** — nếu chỉ query DB để gợi ý, gọi là `SuggestionService`, không gọi là agent:

```text
FE hoặc companion context
→ SuggestionService (src/services/suggestion_service.py — chưa tạo)
→ Query destinations/places/hotels từ DB theo context (destination, budget, interests)
→ Return gợi ý (không gọi LLM)
```

### Tại sao không cần LLM

- Gợi ý địa điểm/khách sạn dựa trên dữ liệu có sẵn trong DB.
- Filter theo destination, budget range, interests tags.
- Sort bằng rating/popularity metrics.
- Không cần "sáng tạo" nội dung mới, chỉ cần lọc và xếp hạng.

### File cần tạo

| File | Mục đích |
|---|---|
| `src/services/suggestion_service.py` | Query DB + filter + sort gợi ý |

| File Frontend | Mục đích |
|---|---|
| `companion/PlaceSuggestions.tsx` | Nối real suggestions thay vì mock data |

## 4. Chat History

### Trạng thái hiện tại

DB đã có bảng `chat_sessions` và `chat_messages` (từ Alembic migration), nhưng chưa có API endpoints.

### File cần tạo

| File | Mục đích |
|---|---|
| `src/api/v1/chat.py` | Chat history endpoints (list sessions, get messages, delete session) |
| `src/services/chat_service.py` | Chat session/message CRUD |
| `src/repositories/chat_repo.py` | Chat DB queries |

### Endpoints dự kiến

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/chat/sessions` | Liệt kê chat sessions của user |
| GET | `/api/v1/chat/sessions/{sessionId}/messages` | Đọc messages trong session |
| DELETE | `/api/v1/chat/sessions/{sessionId}` | Xóa session + messages |

## 5. Analytics (Optional)

EP-34 analytics là optional. Nếu bật Text-to-SQL, **bắt buộc** có các guardrails:

| Guardrail | Mô tả |
|---|---|
| Read-only DB role | Kết nối DB bằng role chỉ có SELECT |
| Allowlist tables | Chỉ cho phép query các bảng trong whitelist |
| Validate SQL | Parse + validate SQL trước khi execute |
| User-scope filter | Tự động thêm `WHERE user_id = ?` |
| Max rows | Giới hạn số dòng trả về (default 100) |
| Audit log | Ghi log mọi query đã execute |

## 6. Password Reset (Đã implement — PR #20)

`ForgotPassword` FE đã nối BE API. Reset password flow hoàn chỉnh:

- `POST /api/v1/auth/forgot-password` — Gửi email reset token (silent nếu email không tồn tại)
- `POST /api/v1/auth/reset-password` — Verify token + đổi password + revoke tất cả refresh tokens

Thiết kế:
- `aiosmtplib` (async SMTP) + console fallback khi chưa cấu hình SMTP.
- Reset token hash SHA-256 trong DB, one-time use, có expiry (mặc định 1 giờ).
- `smtp_password` là `SecretStr`, chỉ set qua `.env`.
- FE: `ForgotPassword` gọi forgot-password API; `ResetPassword` nhận token từ URL param.

## Thứ tự ưu tiên implement Phase C

| Thứ tự | Service | Lý do |
|---|---|---|
| 1 | Generate pipeline | Core value, ảnh hưởng trực tiếp đến UX. User tạo trip → nhận itinerary thật |
| 2 | SuggestionService | DB-only, không cần LLM, dễ implement, ít rủi ro |
| 3 | Companion chat | Phức tạp nhất, cần intent routing + tool-calling + confirm flow |
| 4 | Chat history | Cần khi companion chat hoạt động, CRUD đơn giản |
| 5 | Analytics | Optional, rủi ro bảo mật cao, cuối cùng |

## Risk assessment

| Risk | Mức độ | Mitigation |
|---|---|---|
| LLM output không khớp schema | Cao | Structured output mode + Pydantic validation + retry |
| LLM hallucination (tạo địa điểm không tồn tại) | Cao | Cross-reference với DB places; flag unverified suggestions |
| Rate limit abuse | Trung bình | Redis rate limiter; không fail-open |
| Prompt injection qua chat | Trung bình | Input sanitization; không expose raw SQL hoặc internal tools |
| Chat confirm bypass | Thấp | Apply-patch endpoint validate lại ownership + operation |
