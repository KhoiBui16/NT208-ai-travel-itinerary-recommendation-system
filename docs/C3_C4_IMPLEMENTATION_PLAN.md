# C3/C4 Implementation Plan

Ngày cập nhật: 2026-06-01

## Current truth before planning

- `TripWorkspace` đã tồn tại và là chỗ đúng để gắn chat.
- `FloatingAIChat.tsx` hiện chỉ là mock UI.
- `chat_sessions` và `chat_messages` đã tồn tại trong source/migration.
- Chưa có chat REST API, chưa có `CompanionService`, chưa có history API thật.
- Guest phải claim trip trước khi chat.

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
| C3C | Làm chat usable trong workspace | retry/double-send/UX safeguards | scroll/loading/retry/friendly copy | UX/regression tests | stale patch, concurrent edits | Chat dùng ổn trong workspace |
| C4A | Persist và reload history | message list API + pagination | mở lại session cũ và giữ history | cross-user/history tests | session growth/performance | reload page vẫn thấy history |
| C4B | Quản lý history và security hardening | session management + access tests | session list, rename/delete nếu scope cho phép | security/e2e tests | public share confusion | session history quản lý được và không lộ chéo user |

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
- Persist:
  - message user
  - message assistant
- Trả structured payload:
  - `message`
  - `requiresConfirmation`
  - `proposedOperations`
- Quota:
  - namespace chat riêng
  - không ăn chung quota generate

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

### Exit criteria

- User gửi message được
- Reply được lưu
- Fake provider trả lời ổn
- Không dùng quota generate chung

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
- stale patch semantics chưa chốt

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
| C3C | NO | Phụ thuộc C3B |
| C4A | NO | Phụ thuộc session/message foundation trước |
| C4B | NO | Phụ thuộc history API trước |

## Future real-user validation gate

### C3A end-user check

- Auth user mở `TripWorkspace`
- Chat panel xuất hiện như session-aware placeholder, không còn chỉ là mock local-state
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
