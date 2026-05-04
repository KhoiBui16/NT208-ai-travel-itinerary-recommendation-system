# 06. AI services roadmap

Phase C AI services chưa hoàn thành. Tài liệu này mô tả target để implement đúng. Xem thêm kiến trúc chi tiết tại `docs/02_architecture.md`.

## Generate itinerary

Generate là route explicit, không cần Supervisor:

```text
POST /api/v1/itineraries/generate
→ validate request
→ direct ItineraryPipeline (src/services/itinerary_pipeline.py — chưa tạo)
→ LLM structured output
→ Pydantic validation/retry
→ save trip/day/activity/accommodation
→ return camelCase response
```

Yêu cầu kỹ thuật:

- Không parse JSON thủ công từ text tự do nếu có structured output.
- Response phải khớp FE contract (`Frontend/src/app/types/trip.types.ts`).
- Retry hữu hạn khi model output invalid.
- Không tự sinh field sai như `title` thay vì `name`.

File mới cần tạo:

- `src/services/itinerary_pipeline.py` — LLM orchestration
- `src/schemas/generate.py` — Request/response schemas

Config cần thêm:

- `GEMINI_API_KEY` trong `.env`

FE không cần sửa: `CreateTrip.tsx` đã gọi `createItinerary` API. Khi generate endpoint trả full itinerary thay vì empty trip, FE tự navigate đúng.

## Companion chat

Chat mới cần routing/tool-calling:

```text
POST /agent/chat hoặc WebSocket
→ classify intent
→ read trip/context (owner-check bắt buộc)
→ propose patch
→ return proposedOperations + requiresConfirmation
→ FE confirm
→ POST /agent/apply-patch
→ backend apply patch
```

Nguyên tắc:

- Chat không tự persist DB khi user chưa confirm.
- Patch phải có audit-friendly operation list.
- Tool đọc trip phải owner-check.
- History cần projection rõ bằng `chat_sessions` và `chat_messages`.

File mới cần tạo:

- `src/api/v1/agent.py` — Chat + apply-patch routers
- `src/services/companion_service.py` — Intent routing, tool-calling

FE cần sửa:

- `FloatingAIChat.tsx` — Thay mock bằng API thật
- Tạo mới `services/agent.ts` — Chat/apply-patch API client

## Suggestion service

Nếu chỉ query DB để gợi ý địa điểm/khách sạn, gọi là `SuggestionService`, không gọi là agent.

```text
FE hoặc companion context
→ SuggestionService (src/services/suggestion_service.py — chưa tạo)
→ query destinations/places/hotels từ DB
→ return gợi ý (không gọi LLM)
```

File mới cần tạo:

- `src/services/suggestion_service.py`

FE cần sửa:

- `companion/PlaceSuggestions.tsx` — Nối real suggestions

## Chat history

DB đã có bảng `chat_sessions` và `chat_messages` (từ Alembic migration), nhưng chưa có API endpoints.

File mới cần tạo:

- `src/api/v1/chat.py` — Chat history endpoints
- `src/services/chat_service.py` — Chat session/message management
- `src/repositories/chat_repo.py` — Chat DB queries

## Analytics optional

EP-34 analytics là optional. Nếu bật Text-to-SQL:

- Dùng read-only DB role.
- Allowlist tables.
- Validate SQL.
- Enforce user-scope filter.
- Max rows.
- Audit log.

## Password reset (đã implement — PR #20)

`ForgotPassword` FE đã nối BE API. Reset password flow hoàn chỉnh:

- `POST /api/v1/auth/forgot-password` — Gửi email reset token (silent nếu email không tồn tại)
- `POST /api/v1/auth/reset-password` — Verify token + đổi password + revoke tất cả refresh tokens

Thiết kế:

- `aiosmtplib` (async SMTP) + console fallback khi chưa cấu hình SMTP.
- Reset token hash SHA-256 trong DB, one-time use, có expiry (mặc định 1 giờ).
- `smtp_password` là `SecretStr`, chỉ set qua `.env`.
- FE: `ForgotPassword` gọi forgot-password API; `ResetPassword` nhận token từ URL param.

## Thứ tự ưu tiên implement Phase C

1. **Generate pipeline** — Core value, ảnh hưởng trực tiếp đến UX
2. **SuggestionService** — DB-only, không cần LLM, dễ implement
3. **Companion chat** — Phức tạp nhất, cần intent routing
4. **Chat history** — Cần khi companion chat hoạt động
5. **Analytics** — Optional, cuối cùng
