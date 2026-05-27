# Phase C3 Design Readiness — 2026-05-28

## Audit Result: PARTIALLY READY

C3 design foundation tốt, nhưng có 4 design gaps cần bổ sung trước khi implement.

---

## 1. Design Baseline — đúng

### ✅ C3 là trip-bound companion chat

Docs và code confirm: companion chat gắn với trip cụ thể, không phải global chatroom.

### ✅ C3 MVP REST

Current `agent/router.py` dùng FastAPI REST. Companion chat (C3) sẽ thêm endpoint REST, không WebSocket/SSE.

### ✅ Chat trả proposedOperations, không persist trước confirm

`docs/06_ai_roadmap.md` chốt rõ: "Chat không tự persist itinerary."

### ✅ apply-patch mới update DB

Plan trong `docs/06_ai_roadmap.md` section 3.1: `apply-patch` re-verify ownership + validate operations.

### ✅ companion_service.py trong src/itineraries/

Plan trong `docs/06_ai_roadmap.md` section 3.5: `src/itineraries/companion.py`.

### ✅ src/agent/ chỉ chứa AI infra chung

Current `src/agent/` chỉ có: `llm.py`, `prompts/`, `schemas/`, `router.py` (suggest EP-30).

### ✅ Guest claim trip trước chat

`service.py:196-221` claim flow đúng. FloatingAIChat sau claim mới hoạt động.

---

## 2. Design Gaps cần bổ sung

### Gap 1 — Stale patch handling chưa có design

**Mức độ: CAO**

C3 apply-patch không có mechanism để reject stale patches. Nếu user A và B cùng chat về cùng trip, last-write-wins có thể overwrite.

**Cần bổ sung**:
- Option A: `version` field trên day/trip, client gửi version khi apply-patch, reject nếu version không match (409 Conflict).
- Option B: Optimistic locking trên DB level.
- Option C: "Last write wins" — accept race condition (không recommended cho production).

**Recommend**: Option A — thêm `day.version` + `apply-patch` validation.

### Gap 2 — Companion chat rate limit quota riêng

**Mức độ: CAO**

Hiện tại `rate_limit_ai_free` (3/day) shared giữa generate và chat. Nếu user dùng hết 3 lần generate, companion chat không hoạt động.

**Cần bổ sung**:
- Companion chat quota riêng: `rate:ai:chat:user:{user_id}:{YYYYMMDD}` = 20-50/day
- Generate quota giữ nguyên: 3/day

### Gap 3 — Chat session vs trip session chưa tách biệt rõ

**Mức đề: TRUNG BÌNH**

DB có `chat_sessions` với `trip_id` (theo schema migration 20260525_0006), nhưng:
- Mỗi trip có thể có nhiều chat sessions?
- Hay mỗi trip chỉ có 1 active session?
- Session expire policy chưa có.

**Cần bổ sung**:
- Session lifecycle: how long does a session live?
- If user opens 2 trips, do they share a session or have separate sessions?
- `chat_sessions.trip_id` → `trip_id` NULLable không? (guest chưa claim)

### Gap 4 — C3 API contract chưa final

**Mức độ: TRUNG BÌNH**

`docs/06_ai_roadmap.md` section 3 có design, nhưng chưa có formal API schema file.

**Cần bổ sung**:
- `POST /api/v1/itineraries/{tripId}/chat` request/response schema
- `POST /api/v1/itineraries/{tripId}/apply-patch` request/response schema
- Pydantic schemas cho `proposedOperations` operation types

---

## 3. Branch Roadmap

Sau audit, recommended branches:

```
1. feat/00051-c-c3-chat-session-foundation  # C3 chat sessions table + API
2. feat/00052-c-c3-companion-chat-rest        # Companion chat endpoint
3. feat/00053-c-c3-apply-patch                 # Apply-patch endpoint
4. feat/00054-c-c3-floating-chat-integration  # FE integration
```

---

## 4. C3/C4 Readiness Summary

| Component | Status | Ghi chú |
|---|---|---|
| C3 trip-bound companion chat | ✅ | Design đúng |
| C3 REST MVP | ✅ | Không WebSocket/SSE MVP |
| proposedOperations + confirm | ✅ | Design đúng |
| apply-patch owner-check | ⚠️ | Design đúng, verify code |
| companion_service.py location | ✅ | Trong src/itineraries/ |
| src/agent/ AI infra separation | ✅ | Đúng |
| Stale patch handling | ❌ | Chưa có design |
| Chat rate limit riêng | ❌ | Chưa có |
| Chat session lifecycle | ⚠️ | Cần bổ sung |
| C3 API contract schema | ⚠️ | Chưa final formal |
| C4 chat history | ⚠️ | Schema sẵn, API chưa có |

---

## Recommended next steps

1. **Trước C3 code**: Bổ sung stale patch version mechanism.
2. **Trước C3 code**: Định nghĩa chat session lifecycle (1 per trip? expiration?).
3. **Trước C3 code**: Finalize API contract schema.
4. **Khi C3 implement**: Tách companion chat quota riêng (20-50/day).
5. **Khi C4 implement**: Chat history API với user isolation.