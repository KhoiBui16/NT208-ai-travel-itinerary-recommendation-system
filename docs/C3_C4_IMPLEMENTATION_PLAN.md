# C3/C4 Implementation Plan

Ngày cập nhật: 2026-06-21

> Ghi chú current truth: đây là plan lịch sử đã được cập nhật tối thiểu để không lệch source. Sau `00101`, C3A/C3B/C3C core đã có runtime thật; phần còn lại tập trung vào C4 session-management UX, patch-specific rate limit, ETL scheduler wiring và data enrichment.

## Current truth before planning

- `TripWorkspace` đã tồn tại và là chỗ đúng để gắn chat.
- `FloatingAIChat.tsx` hiện chỉ là mock UI.
- `00060D` đã xác minh runtime rằng mock chat từng còn hardcoded context và có thể hiển thị city không khớp trip thật.
- `00060D-FIX` đã sửa pre-C3A context bug: `TripWorkspace` derive `selectedCities` từ trip hiện tại, nhưng chat vẫn chỉ là mock UI.
- `00060D-R` đã verify một lần generate Gemini thật thành công (`201`) cho auth user trước khi vào `C3A`.
- `00060D-R` đã verify actual `429` generate contract với headers/body thật mà không cần spam Gemini quota.
- `00060D-R` đã verify browser `503` UX qua controlled provider-timeout path.
- `00060D-FIX` đã verify browser-level submit-path `429` UX bằng route-mocked Playwright regression, không gọi Gemini thật.
- `00060G` đã classify provider-timeout rõ thành `AI_PROVIDER_TIMEOUT` và giữ submit-path UX thân thiện khi generate bị chậm.
- `00060H` đã migrate Gemini SDK backend sang `google-genai` nhưng chưa thay đổi boundary rằng `C3A` không gọi AI thật.
- `00060H` đã cho phép guest giữ `currentTrip` + `pendingClaim` trong `sessionStorage` để xem workspace cùng browser session trước khi claim, nhưng owner chat rule vẫn chưa đổi.
- `00060H` đã sửa generated activity images theo `Place.image` khi `place_id` hợp lệ, nên workspace context ổn định hơn cho chat foundation.
- `chat_sessions` và `chat_messages` đã tồn tại trong source/migration.
- Current source đã có chat REST API, `CompanionService`, history API thật, và `apply-patch` confirm path cơ bản.
- Guest phải claim trip trước khi chat.
- Sync generate hiện vẫn là blocking HTTP request; nếu muốn "eventually complete even when slow" thì phải có background job/polling ở phase tương lai, không giải quyết trong `C3A/C3B` hiện tại.

## Nguyên tắc khóa trước khi implement

1. C3 là trip-bound companion chat, không phải global chatbot.
2. C3 MVP dùng REST, không dùng WebSocket/SSE.
3. Chat trả `requiresConfirmation` + `proposedOperations`, không tự persist itinerary.
4. `apply-patch` mới được đụng DB sau confirm.
5. `companion_service.py` nằm trong `Backend/src/itineraries/`.
6. `Backend/src/agent/` chỉ chứa AI infra dùng chung.
7. Guest phải claim trip trước khi chat.
8. AI quota phải fail-closed khi Redis down.

## Phase overview

| Phase | Goal | Backend | Frontend | Tests | Risks | Exit criteria |
|---|---|---|---|---|---|---|
| C3A | Chat session foundation an toàn, chưa gọi AI thật | Session APIs + ownership-safe session load/create | ChatPanel placeholder thật trong `TripWorkspace` | owner-only session tests | guest policy/quota policy phải rõ | Tạo/list/get session được cho own trip |
| C3B | Gửi message với trip context và save chat messages | Message API + fake/mock provider + persistence | Chat input/send/loading/error | context/ownership/quota tests | quota chung với generate, provider timeout | User gửi message và nhận reply từ fake provider |
| C3C | Làm chat usable trong workspace | apply/cancel/stale confirm path + retry/double-send/UX safeguards | scroll/loading/retry/friendly copy | UX/regression tests | patch rate-limit, history UX, concurrent edits | Chat dùng ổn trong workspace và proposal được resolve đúng |
| C4A | Persist và reload history | message list API + pagination | mở lại session cũ và giữ history | cross-user/history tests | session growth/performance | reload page vẫn thấy history |
| C4B | Quản lý history và security hardening | session management + access tests | session list, rename/delete nếu scope cho phép | security/e2e tests | public share confusion | session history quản lý được và không lộ chéo user |

## Risk-to-Phase Mapping

| Risk / Gap | Source evidence | Blocker for C3A? | Target phase | Required action |
|---|---|---:|---|---|
| FloatingAIChat vẫn mock | `FloatingAIChat.tsx`, `TripWorkspace.tsx`, `00060D-FIX` | YES | C3A | thay mock bằng session-aware ChatPanel placeholder |
| Chưa có session ownership API | `itineraries/router.py`, `models/chat.py` | YES | C3A | tạo/list/get session trip-scoped owner-only |
| Chưa có message ownership/send API | `router.py`, `models/chat.py` | NO | C3B/C4 | thêm message send/history ownership checks |
| Chat quota chưa tách generate quota | `rate_limiter.py`, issue `c3_chat_quota_shared_with_generate.md` | NO | C3B | thêm namespace quota chat riêng |
| Chat/live provider behavior chưa có | `00060D-R`, `00059C`, `00060B` | NO | C3B / provider smoke | dùng fake provider trong test và kế thừa contract `429/503` đã verify ở generate |
| Sync generate không đảm bảo eventually-complete | `00060G`, `00060H`, current blocking HTTP flow | NO | future async job phase | không hứa "generate xong dù chậm" nếu chưa có worker + polling/status API |
| Goong/live ETL partial | `00059C`, ETL reports | NO | generate/data hardening | không block chat foundation |
| Stale patch handling còn mở | issue `c3_stale_patch_handling_missing.md` | NO | C3C hardening follow-up | current source đã có `trip.updated_at` snapshot strategy; phần còn mở là policy/rate-limit/UX polish |

## C3A — Chat Session Foundation

### Goal

Tạo nền tảng chat session gắn với trip, không cần AI thật.

### Backend

- Audit schema hiện có:
  - `chat_sessions`
  - `chat_messages`
- Không tạo migration mới nếu schema hiện tại đã đủ cho session foundation.
- Chỉ thêm migration nếu thật sự cần:
  - index phục vụ list/get
  - status semantics rõ hơn
  - constraint phục vụ owner-only access
- API đề xuất:
  - `POST /api/v1/itineraries/{trip_id}/chat-sessions`
  - `GET /api/v1/itineraries/{trip_id}/chat-sessions`
  - `GET /api/v1/itineraries/chat-sessions/{session_id}`
- Ownership rules:
  - user phải là owner của trip
  - shared viewer không được tạo/đọc session
  - guest chưa claim không được tạo session

### Frontend

- Thay mock `FloatingAIChat` bằng `ChatPanel` foundation trong `TripWorkspace`.
- `ChatPanel` cần:
  - create session
  - list session theo trip
  - open session empty state
  - loading state
  - 401/403/503 error state

### Tests

- Tạo session cho own trip: pass
- Tạo session cho trip người khác: reject
- List session chỉ trả session của own trip
- `GET /chat-sessions/{id}` chặn cross-user
- Frontend smoke:
  - workspace mở được chat panel
  - empty state rõ ràng

### Exit criteria

- Không có AI thật
- Ownership-safe session foundation hoạt động
- FE không còn chỉ là mock local-state

### C3A must not do

- Không gọi Gemini thật
- Không gửi message thật
- Không dùng shared viewer như owner chat
- Không cho guest chưa claim tạo session
- Không giải quyết quota chat riêng trong phase này
- Không apply-patch vào itinerary

## C3B — Companion Chat API

### Goal

User gửi message vào AI với context của trip hiện tại.

### Backend

- Tạo `companion_service.py` trong `Backend/src/itineraries/`
- API:
  - `POST /api/v1/itineraries/chat-sessions/{session_id}/messages`
- Build context từ trip:
  - destination
  - date range
  - trip days
  - activities
  - accommodations
  - budget/travelers/preferences nếu có
- AI abstraction:
  - fake/mock provider trong tests
  - real provider bật bằng env/config khi cần smoke riêng
  - provider implementation đi qua shared `src/agent/llm.py` (đã migrate sang `google-genai`)
  - CI/test suite không gọi real Gemini
- Persist:
  - message user
  - message assistant
- Trả structured payload:
  - `message`
  - `requiresConfirmation`
  - `proposedOperations`
- Quota:
  - giữ generate namespace hiện tại làm baseline:
    - `rate:ai:user:{id}:{YYYYMMDD}`
    - `rate:ai:guest:{hash}:{YYYYMMDD}`
  - plan tách namespace riêng ở `C3B`:
    - `rate:ai:generate:user:{id}:{YYYYMMDD}`
    - `rate:ai:generate:guest:{hash}:{YYYYMMDD}`
    - `rate:ai:chat:user:{id}:{YYYYMMDD}`
  - default recommendation: guest chat chưa mở cho đến khi có explicit policy và abuse guard
  - không ăn chung quota generate
  - fail-closed khi Redis down

### Frontend

- Chat input
- Send button
- Loading state
- Response rendering
- Error states cho 401/403/429/503/network

### Tests

- Không gọi Gemini thật trong test
- Unit tests cho context builder
- Ownership tests cho session/trip mismatch
- Rate-limit tests cho quota chat riêng
- Error mapping tests cho 429/503
- Mock provider tests phải cover cả timeout/path `503` giống contract generate hiện tại

### Exit criteria

- User gửi message được
- Reply được lưu
- Fake provider trả lời ổn
- Không dùng quota generate chung

### Provider + long-running boundary

- Tăng timeout chỉ là giải pháp hỗ trợ local/staging smoke; nó không đảm bảo request HTTP sẽ luôn hoàn tất nếu provider hoặc proxy chậm.
- `C3B` nên kế thừa timeout/error contract thân thiện từ generate (`429/503`, retryable provider timeout).
- Nếu product thật sự cần "eventually generates/sends even when slow", phải mở phase async/background job riêng với worker + status endpoint/polling; không nên hứa điều đó trong sync MVP hiện tại.

## C3C — Companion Chat UX Hardening

### Goal

Làm chat usable trong `TripWorkspace`.

### Scope

- retry failed message
- disable double-send
- scroll tới message mới nhất
- responsive layout
- empty states
- copy 429/503 thân thiện
- text giải thích rằng AI đang dùng itinerary hiện tại

### Risks

- user spam send
- UI overlap với workspace edit tools
- stale patch semantics cơ bản đã có và đã được verify với `409` + persisted `confirmationStatus='stale'`; phần còn lại là UX/copy/policy polish

### Exit criteria

- ChatPanel dùng được liên tục trong workspace
- Không gây khó chịu khi lỗi mạng/quota

## C4A — Chat History Persistence

### Goal

Persist và reload conversation theo trip/session.

### Backend

- API:
  - `GET /api/v1/itineraries/chat-sessions/{session_id}/messages`
  - `GET /api/v1/itineraries/{trip_id}/chat-sessions`
- Pagination cơ bản cho message list
- Continue old session
- Ownership check ở cả trip và session

### Frontend

- Mở lại session cũ
- Refresh trang vẫn thấy history
- Continue conversation trong session cũ

### Tests

- Reload history pass
- Cross-user blocked
- Pagination basic

### Exit criteria

- History thực sự reload được
- Không lộ message chéo user

## C4B — Chat History UX + Security Tests

### Goal

Làm history dễ quản lý và giữ an toàn ownership.

### Scope

- session list per trip
- rename/delete session nếu scope cho phép
- security tests cho cross-user access
- xác nhận share trip không kéo theo public chat

### Tests

- session list chỉ của own trip
- delete/rename đúng owner
- shared viewer không đọc được chat
- session không lộ khi đổi trip

### Exit criteria

- History quản lý được
- Security behavior rõ và test được

## Suggested implementation order

1. `C3A — Chat Session Foundation`
2. `C3B — Companion Chat API`
3. `C3C — Companion Chat UX Hardening`
4. `C4A — Chat History Persistence`
5. `C4B — Chat History UX + Security Tests`

## Why this order

- `C3A` không cần AI thật nên rủi ro thấp nhất.
- `C3A` cũng khóa luôn ownership model cho chat trước khi có message/persistence phức tạp.
- `C3B` chỉ nên bắt đầu sau khi session foundation đã tồn tại.
- `C4` chỉ có ý nghĩa sau khi message flow của `C3B` đã có.

## Explicit go/no-go for phases

| Phase | Start now? | Reason |
|---|---|---|
| C3A | YES | Source đã có schema chat và trip ownership đủ tin cậy sau 00060A |
| C3B | NO | Cần session foundation + quota policy rõ trước |
| C3C | YES | Current source đã có patch-confirm core; follow-up còn lại là hardening |
| C4A | PARTIAL | Current source đã có history list/get read-path; phần còn lại là pagination/perf và session UX |
| C4B | NO | Phụ thuộc history API trước |

## Future real-user validation gate

### C3A end-user check

- Auth user mở `TripWorkspace`
- Chat panel xuất hiện như session-aware placeholder, không còn chỉ là mock local-state gắn cứng vào flow hiện tại
- Session có thể được tạo hoặc load theo đúng `tripId`
- Public shared view không có owner chat controls
- User khác không truy cập được session của trip không thuộc mình

### C3B end-user check

- User gửi câu hỏi có ngữ cảnh trip hiện tại
- Assistant trả lời dựa trên itinerary context, không như chatbot chung chung
- UI hiển thị loading state và chặn double-send
- `429` / `503` / network error có copy rõ ràng
- Test suite dùng fake provider; không gọi real Gemini trong test

### C4 end-user check

- Reload `TripWorkspace` vẫn thấy session cũ
- User mở lại conversation cũ được
- History được persist theo session/trip
- Cross-user access bị chặn
- Shared trip view không lộ chat history nếu chưa có thiết kế public riêng
