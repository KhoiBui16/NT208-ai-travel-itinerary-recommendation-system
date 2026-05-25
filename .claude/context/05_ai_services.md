# 05 AI Services

## Purpose

Tóm tắt AI target architecture để implement Phase C không sai hướng.

## Current truth

- C.0 Goong-first ETL readiness đã có branch riêng để làm giàu DB places/hotels.
- C.1 direct generate pipeline đã implement local-ready: DB recommendation context → Gemini JSON → Pydantic validation → persist trip/day/activity/accommodation.
- DB đã có bảng chat target: `chat_sessions`, `chat_messages`, nhưng C.3 companion chat chưa implement.

## Target state

- Generate itinerary dùng direct pipeline với structured output.
- Companion chat dùng intent routing/tool-calling và trả patch cần confirm.
- SuggestionService nếu chỉ query DB thì không gọi là agent.
- Analytics EP-34 optional, cần guardrails nếu bật.

## Key invariants

- Không parse JSON tự do nếu có structured output.
- Không đưa generate explicit route qua Supervisor.
- Chat không tự persist trước confirm.
- Text-to-SQL không được chạy nếu thiếu read-only role, allowlist, validator, max rows, audit.

## Do next

- Thiết kế Pydantic output schema khớp FE contract.
- Implement retry hữu hạn cho invalid structured output.
- Implement chat proposedOperations + apply endpoint riêng.
- Viết unit tests cho invalid output, patch confirmation, rate limit.

## Do not do

- Không gọi LLM cho DB-only suggestions.
- Không fail-open rate limit AI trả phí.
- Không lưu prompt/secret key vào DB/log.

## Acceptance checkpoints

- Generate valid output lưu trip/day/activity/accommodation.
- Invalid output retry rồi fail rõ.
- Generate không gọi Gemini nếu DB recommendation context rỗng.
- AI rate limit không fail-open khi Redis lỗi.
- Chat modify chỉ trả patch.
- Confirmed patch mới update DB.

## Read more

- `../../docs/06_ai_roadmap.md`
- `../../docs/02_architecture.md`
- `../../docs/03_backend.md`
