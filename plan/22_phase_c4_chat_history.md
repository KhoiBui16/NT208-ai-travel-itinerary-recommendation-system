# Plan C.4 — Chat History API

> Trạng thái: Chưa bắt đầu
> Độ phức tạp: ★☆☆☆☆
> Phụ thuộc: C.3 (companion chat phải hoạt động để có history)
> Endpoints mới: `GET /chat/sessions`, `GET /chat/sessions/{id}/messages`, `DELETE /chat/sessions/{id}`

## Mục tiêu

CRUD API cho lịch sử chat sessions + messages, dùng tables `chat_sessions` và `chat_messages` đã có sẵn trong DB.

## Hiện trạng

- `chat_sessions` table: id, trip_id, user_id, thread_id, status, created_at, updated_at
- `chat_messages` table: id, session_id, role, content, proposed_operations (JSON), requires_confirmation, created_at
- Alembic migration đã chạy — tables tồn tại trong DB
- **Chưa có**: Service, Repository methods, Router endpoints

## Files cần tạo/sửa

### Tạo mới

| File | Mục đích | Dự kiến dòng |
|------|----------|-------------|
| `Backend/src/itineraries/chat_service.py` | Chat session/message CRUD | ~70 |

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `Backend/src/itineraries/repository.py` | Thêm: get_chat_sessions_by_user, get_messages_by_session, create_message, delete_session |
| `Backend/src/itineraries/router.py` | Thêm 3 endpoints chat history |
| `Backend/src/itineraries/schemas.py` | Thêm ChatSessionResponse, ChatMessageResponse |

## Chi tiết kỹ thuật

### Endpoints

```python
# List user's chat sessions
GET /api/v1/chat/sessions
  → Response: { items: [ChatSessionResponse], total: int }

# Get messages in a session
GET /api/v1/chat/sessions/{session_id}/messages
  → Response: { items: [ChatMessageResponse], total: int }

# Delete a session + all messages
DELETE /api/v1/chat/sessions/{session_id}
  → Response: 204 No Content
```

### Schemas

```python
class ChatMessageResponse(CamelCaseModel):
    id: int
    role: str          # "user" | "assistant"
    content: str
    proposed_operations: list[dict] = []
    requires_confirmation: bool = False
    created_at: datetime

class ChatSessionResponse(CamelCaseModel):
    id: int
    trip_id: int
    thread_id: str
    status: str        # "active" | "closed"
    messages_count: int
    created_at: datetime
    updated_at: datetime
```

### Service Logic

```python
class ChatService:
    async def list_sessions(self, user_id: int) -> list[ChatSessionResponse]:
        sessions = await self.repo.get_chat_sessions_by_user(user_id)
        return [self._to_session_response(s) for s in sessions]

    async def get_messages(self, session_id: int, user_id: int) -> list[ChatMessageResponse]:
        session = await self.repo.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            raise ForbiddenException("Not session owner")
        messages = await self.repo.get_messages_by_session(session_id)
        return [self._to_message_response(m) for m in messages]

    async def delete_session(self, session_id: int, user_id: int) -> None:
        session = await self.repo.get_session_by_id(session_id)
        if not session or session.user_id != user_id:
            raise ForbiddenException("Not session owner")
        await self.repo.delete_session(session_id)
```

## Test plan

| Test | Loại | Mô tả |
|------|------|-------|
| `test_list_sessions` | Unit | Trả sessions của user |
| `test_list_sessions_empty` | Unit | User chưa chat → trả [] |
| `test_get_messages` | Unit | Trả messages trong session |
| `test_get_messages_owner_check` | Integration | User khác → 403 |
| `test_delete_session` | Integration | Xóa session + messages |

## Xác nhận hoàn thành

- [ ] 3 endpoints hoạt động
- [ ] Owner-check trên mọi endpoint
- [ ] Unit + integration tests pass
