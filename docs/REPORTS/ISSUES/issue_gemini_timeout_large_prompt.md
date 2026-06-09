# Issue: Gemini Timeout on Large Prompt

> **Status:** ✅ RESOLVED by PR #89 (00062)
> **Resolution:** Dynamic timeout based on request size (days × interests × activities). Reduced context window. Large prompts now get proportionally longer timeouts instead of fixed 60s cutoff.

## Status
RESOLVED

## Evidence
- **B2 API Matrix** (2026-05-28):
  - `POST /generate {"destination":"Ha Noi","startDate":"2026-05-30","endDate":"2026-06-02","budget":2000000,"adults":1,"children":0,"interests":["food","nature","culture"]}` → **503 timeout**
  - `POST /generate {"destination":"Ha Noi","startDate":"2026-05-30","endDate":"2026-05-31","budget":2000000,"adults":1,"children":0,"interests":["food"]}` → **201 PASS**
- Response body: `{"detail":"Gemini request timed out","error_code":"SERVICE_UNAVAILABLE","status_code":503}`
- Backend log: `gemini_request_timeout` event

## Impact
- User generate trip 3+ ngày với nhiều interests → 503 timeout
- FE hiển thị generic error — user không biết có thể thử với ít ngày hơn
- Gemini quota bị tốn dù timeout (request đã gửi)
- Retry logic trong pipeline sẽ retry 3 lần → tốn thêm quota và thời gian

## Reproduction
1. `POST /api/v1/itineraries/generate` với 3+ ngày và 3+ interests
2. Response: 503 sau ~60 giây

## Expected
- Generate 3 ngày + 3 interests thành công trong timeout window
- Hoặc: FE hiển thị progress indicator và timeout message rõ ràng

## Actual
- 503 timeout sau ~60 giây
- FE hiển thị generic "Không thể tạo lịch trình"

## Root cause analysis
Prompt lớn = nhiều places context (15 places × 3 categories) + nhiều ngày → Gemini response time tăng.

Current timeout: `agent_timeout_seconds` (default từ `AppSettings`).

## Suggested fixes

**Option A (quick)**: Giảm `MAX_CONTEXT_PLACES` từ 15 xuống 8-10 cho prompt nhỏ hơn.

**Option B (better)**: Tăng `agent_timeout_seconds` lên 120-180 giây.

**Option C (best UX)**: Background job — FE poll status thay vì wait synchronously.

**Option D (immediate)**: FE hiển thị message rõ hơn khi 503: "Lịch trình phức tạp, vui lòng thử với ít ngày hơn hoặc ít sở thích hơn."

## Recommended branch
`fix/00050-x-gemini-timeout-handling`
