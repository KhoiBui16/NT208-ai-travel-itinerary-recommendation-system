# Test Strategy Gap Analysis — 2026-05-28

## Summary

Unit tests (97 passed) và integration tests (37 passed) không đủ để chứng minh product readiness. Các gaps hiện tại bao gồm: real LLM behavior, FE-BE contract, data consistency, browser UX, rate limit UX, và error visibility.

**Evidence base**: B1.5 Observability Audit + B2 Real Generate API Matrix + B3 Browser Flow Verification

---

## Gap Matrix

| Risk area | Current tests cover | Current tests miss | How real user flow can fail | Recommended test type | Recommended branch/action |
|---|---|---|---|---|---|
| Mock AI risk | Unit tests dùng mock LLM trả JSON cố định | Real Gemini JSON quality, schema drift, hallucination, latency | Mock pass nhưng real Gemini trả JSON sai schema → 503 sau retry exhausted | Real AI smoke test với Gemini API thật | `test/00050-x-real-ai-smoke` |
| Real LLM response risk | Mock LLM không test timeout, quota, invalid JSON | Gemini timeout (B2: 3 ngày + 3 interests → 503), quota exhausted, JSON parse fail | User generate 3 ngày trip → 503 timeout, FE hiển thị generic error | Real API smoke với controlled input | B2 đã confirm — cần fix timeout/context |
| FE-BE API schema contract | Integration tests test BE schema trực tiếp | FE payload construction, FE field names, FE date format | FE gửi sai field name → 422 undetected | Playwright network capture (B3 đã làm) | B3 confirmed CONTRACT_PARTIAL |
| Destination/data consistency | Unit tests mock destination resolve | Real DB có destination không, places count đủ không | User chọn TP.HCM → 422 (B2 confirmed), FE không báo lý do | DB query + API smoke per city | B2 confirmed — cần ETL |
| Route/geography sanity | Không có route test | Activities có hợp lý về địa lý không (Quận 1 → Củ Chi → Quận 1) | AI generate trip Sài Gòn với route vô lý — user phải tự sửa | Manual review + Goong Directions integration | `feat/00052-c-etl-goong-data-expansion` |
| Rate limit/auth behavior | Integration tests test rate limit logic | FE hiển thị 429 message đúng không, quota reset behavior | User hết quota → FE hiển thị "Không thể tạo lịch trình" thay vì "Hết lượt hôm nay" (B3 confirmed) | Playwright + API smoke | **IMPROVED (00051)** — `errorHandler.ts` maps 429 to quota-specific message. Browser test deferred to regression. |
| Browser UX edge cases | Không có browser UX tests | Calendar interaction, destination input, error display, workspace scroll | User không biết cách chọn ngày, không thấy lỗi rõ ràng | Playwright e2e | B3 đã bắt đầu — cần mở rộng |
| Error handling user messages | Unit tests test exception types | FE có hiển thị đúng message không | 422 destination missing → FE generic (B3 confirmed), 429 rate limit → FE generic | Playwright network + UI assertion | **DONE (00051)** — `errorHandler.ts` maps 422/429/503/500 to specific messages. TC429/TC503 browser paths deferred to regression. |

---

## Critical Gaps Confirmed by B1.5/B2/B3

### 1. Mock LLM hides real Gemini behavior

- Unit tests dùng `MockLLM` trả JSON cố định
- Không test: Gemini timeout, quota exhausted, invalid JSON, schema drift
- **B2 evidence**: Hà Nội 3 ngày + 3 interests → 503 timeout (real Gemini)
- **Risk**: Pipeline có thể pass 97 unit tests nhưng fail với real Gemini input

### 2. API pass không chứng minh FE payload đúng

- Integration tests test BE endpoint trực tiếp với Python client
- Không test: FE JavaScript payload construction, FE date format, FE budget mapping
- **B3 evidence**: FE gửi `budget=5000000` (mid default) thay vì `budget=2000000` (low) — user chọn "tiết kiệm" nhưng FE default là "mid"
- **Risk**: FE có thể gửi sai field nếu mapping thay đổi

### 3. Browser button exists ≠ UX smooth

- Playwright test chỉ verify button click
- Không test: calendar modal blocking, suggestion dropdown empty, error message clarity
- **B3 evidence**: Calendar modal chặn click generate button, suggestions không hiển thị
- **Risk**: User bị stuck ở calendar modal, không biết cách tiếp tục

### 4. Long itinerary / 10 activities per day risk

- Unit tests test với mock data cố định
- Không test: Gemini generate 10 activities/day với real places
- **Risk**: Gemini có thể generate activities không có trong DB (hallucination), hoặc quá nhiều activities làm UI overflow

### 5. Quận 1 → Củ Chi → Quận 1 geography sanity risk

- Không có route sanity test
- Goong Directions API chưa implement
- **Risk**: AI generate trip TP.HCM với route vô lý (xa → gần → xa) — user phải tự sửa thủ công

### 6. 429/422/503 generic UI message risk

- **B3 confirmed**: Tất cả errors hiển thị "Không thể tạo lịch trình. Vui lòng thử lại."
- User không biết: hết quota (429), thành phố chưa có data (422), Gemini timeout (503)
- **Risk**: User bỏ app vì không hiểu lỗi, hoặc tiếp tục retry vô ích

---

## Test Coverage Summary

| Layer | Current coverage | Gap |
|---|---|---|
| Backend unit | 97 tests — mock LLM, mock DB | Real Gemini, real DB edge cases |
| Backend integration | 37 tests — real DB, mock LLM | Real Gemini, multi-city data |
| API smoke (B2) | Hà Nội small input PASS | Multi-city, large prompt, rate limit UX |
| Browser (B3) | 3 flows — TP.HCM error, workspace, date picker | FloatingAIChat (C3), generate success flow, claim flow |
| FE unit/typecheck | NOT_RUN — no scripts | TypeScript errors, component logic |

---

## Recommended Test Additions

| Test | Type | When | Branch |
|---|---|---|---|
| Real Gemini smoke (Hà Nội 1-2 ngày) | API smoke | Before C3 | `test/00055-c-fullstack-regression-verification` |
| FE error message per status code | Playwright | Before public demo | **DONE (00051)** — `fix/00051-c-fe-error-visibility` |
| Multi-city generate after ETL | API smoke | After ETL expansion | `feat/00052-c-etl-goong-data-expansion` |
| FloatingAIChat open/send/receive | Playwright | After C3 implement | `feat/00059-c-c3-floating-chat-integration` |
| apply-patch owner-check | API smoke | After C3 implement | `feat/00058-c-c3-apply-patch` |
| Rate limit reset behavior | API smoke | Before C3 | `test/00055-c-fullstack-regression-verification` |
| Destination selector DB-backed | Playwright | After FE fix | **DONE (00051)** — `useDestinations.ts` queries `/api/v1/places/destinations`, pre-submit validation blocks unsupported cities. Lacks `placesCount/hasData` field for data sufficiency check. |
