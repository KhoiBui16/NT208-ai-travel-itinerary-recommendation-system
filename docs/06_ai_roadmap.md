# 06. AI services roadmap

Phase C AI services chưa hoàn thành. Tài liệu này mô tả target để implement đúng.

## Generate itinerary

Generate là route explicit, không cần Supervisor:

```text
POST /api/v1/itineraries/generate
→ validate request
→ direct ItineraryPipeline
→ LLM structured output
→ Pydantic validation/retry
→ save trip/day/activity/accommodation
→ return camelCase response
```

Yêu cầu kỹ thuật:

- Không parse JSON thủ công từ text tự do nếu có structured output.
- Response phải khớp FE contract.
- Retry hữu hạn khi model output invalid.
- Không tự sinh field sai như `title` thay vì `name`.

## Companion chat

Chat mới cần routing/tool-calling:

```text
POST /agent/chat hoặc WebSocket
→ classify intent
→ read trip/context
→ propose patch
→ return proposedOperations + requiresConfirmation
→ FE confirm
→ backend apply patch
```

Nguyên tắc:

- Chat không tự persist DB khi user chưa confirm.
- Patch phải có audit-friendly operation list.
- Tool đọc trip phải owner-check.
- History cần projection rõ bằng `chat_sessions` và `chat_messages`.

## Suggestion service

Nếu chỉ query DB để gợi ý địa điểm/khách sạn, gọi là `SuggestionService`, không gọi là agent.

## Analytics optional

EP-34 analytics là optional. Nếu bật Text-to-SQL:

- Dùng read-only DB role.
- Allowlist tables.
- Validate SQL.
- Enforce user-scope filter.
- Max rows.
- Audit log.

