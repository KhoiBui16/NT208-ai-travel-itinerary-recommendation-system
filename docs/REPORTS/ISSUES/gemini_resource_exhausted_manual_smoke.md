# Issue: Gemini ResourceExhausted During Guest AI Smoke

Ngày tạo: 2026-05-26  
Status: TO DO  
Severity: External provider quota / manual smoke blocker

## Triệu Chứng

Trong browser smoke của branch `fix/00044-c-stabilize-c1-guest-flow`, authenticated AI generate qua UI thành công, nhưng guest AI generate qua UI trả `503` do Gemini provider báo `ResourceExhausted` ở cả 3 attempts.

## Evidence

Backend log:

```text
POST /api/v1/itineraries/generate
authenticated=false
ai_generate_context_loaded places_count=15
gemini_request_failed error_type=ResourceExhausted
ai_generate_llm_validation_exhausted attempts=3
status_code=503
```

Authenticated smoke cùng phiên:

```text
POST /api/v1/itineraries/generate = 201
trip_id = 143
activities_count = 5
GET /api/v1/itineraries/143 = 200
```

## Assessment

Đây không phải bug FE claim/reload. Guest claim/reload đã được xác minh riêng bằng guest trip seeded qua API:

```text
POST /api/v1/itineraries/144/claim = 200
GET /api/v1/itineraries/144 = 200
finalUrl = /trip-workspace?tripId=144
pendingAfterClaim = null
```

## Next Action

- Kiểm tra quota/billing/rate limit của Gemini key trong Google AI Studio.
- Nếu cần test nhiều lần local, dùng ít request thật và ưu tiên mock LLM trong automated tests.
- Không retry guest AI smoke liên tục khi provider đã báo `ResourceExhausted`.
