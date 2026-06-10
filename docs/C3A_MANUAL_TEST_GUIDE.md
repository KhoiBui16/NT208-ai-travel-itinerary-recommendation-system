# Hướng Dẫn Test Thủ Công - C3A Chat Session

Feature C3A thêm chức năng quản lý chat session trong TripWorkspace với:
- **Backend APIs**: Tạo và liệt kê chat sessions cho trip, ownership enforcement
- **Frontend**: ChatPanel component trong TripWorkspace
- **E2E Tests**: 5 Playwright test cases

---

## 1. Chuẩn Bị Trước Khi Test

### 1.1. Khởi động Docker services

```powershell
cd <repo-root>\Backend
docker compose up -d db redis
```

Verify:
```powershell
docker ps
# Phải thấy container "db" và "redis" đang chạy
```

### 1.2. Khởi động Backend

```powershell
cd <repo-root>\Backend
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Verify: Truy cập http://localhost:8000/docs — phải thấy API Swagger UI.

### 1.3. Khởi động Frontend

```powershell
cd <repo-root>\Frontend
npm run dev
```

Verify: Truy cập http://localhost:5173 — phải thấy ứng dụng load.

### 1.4. Checklist trước khi test

- [ ] Docker containers (db, redis) đang chạy
- [ ] Backend đang chạy port 8000
- [ ] Frontend đang chạy port 5173
- [ ] Database đã chạy migrations: `uv run alembic upgrade head`
- [ ] Có ít nhất 1 user đã đăng ký để test

---

## 2. Test Case 1: Tạo Chat Session Thành Công

**Mục tiêu**: Verify user có thể tạo chat session cho trip của mình.

### Steps

1. **Đăng ký/đăng nhập user mới**
   - Truy cập http://localhost:5173/register
   - Đăng ký với email mới (ví dụ: `test1@example.com`, password: `Test123!@#`)
   - Hoặc đăng nhập nếu user đã tồn tại

2. **Tạo trip bằng AI**
   - Click vào "Tạo lịch trình mới"
   - Điền form: "Đà Lạt 3 ngày", "Ngày mai", 2 người
   - Click "Tạo bằng AI"
   - Đợi AI generate xong (khoảng 10-30 giây)

   Hoặc tạo trip manual nếu AI chưa sẵn sàng.

3. **Vào TripWorkspace**
   - Click vào trip vừa tạo từ danh sách trips
   - Verify thấy UI TripWorkspace với các tab: "Tổng quan", "Lịch trình", "AI Chat"

4. **Mở tab AI Chat**
   - Click tab "AI Chat" hoặc "Chat"
   - Verify thấy message "Bắt đầu trò chuyện với AI companion"

5. **Tạo session mới**
   - Click nút "Bắt đầu cuộc trò chuyện" hoặc "New Session"
   - Verify gọi API `POST /api/v1/trips/{tripId}/chat-sessions`

6. **Verify kết quả**
   - Session mới xuất hiện trong list với status "active"
   - UI hiển thị chat input hoặc placeholder message
   - Không có error toast/message

### Expected Results

| Checkpoint | Expected |
|------------|----------|
| API response | 201 Created với `session_id`, `trip_id`, `user_id`, `status: "active"` |
| UI render | Session item hiển thị trong danh sách |
| Error handling | Không có error message |

---

## 3. Test Case 2: Liệt Kê Chat Sessions

**Mục tiêu**: Verify hệ thống hiển thị đúng tất cả sessions của trip.

### Steps

1. **Tạo multiple sessions**
   - Vào TripWorkspace của trip đã có
   - Mở tab AI Chat
   - Tạo session đầu tiên (như TC1)
   - Tạo thêm 2-3 sessions bằng cách click "New Session" nhiều lần

2. **Verify danh sách sessions**
   - Reload trang (F5)
   - Mở lại tab AI Chat
   - Verify thấy tất cả sessions vừa tạo

3. **Kiểm tra session count**
   - Đếm số sessions trong UI
   - Gọi API `GET /api/v1/trips/{tripId}/chat-sessions`
   - Verify `total` trong response khớp với UI

4. **Verify ordering**
   - Sessions nên được sort theo `created_at DESC` (mới nhất lên đầu)

### Expected Results

| Checkpoint | Expected |
|------------|----------|
| API response | 200 OK với `items` array, `total: 3` (hoặc số lượng đã tạo) |
| UI render | Tất cả sessions hiển thị đúng số lượng |
| Sorting | Mới nhất lên đầu |

---

## 4. Test Case 3: Guest Không Thể Tạo Session

**Mục tiêu**: Verify user chưa đăng nhập (guest) không thể tạo chat session.

### Steps

1. **Logout hoặc dùng incognito**
   - Đăng xuất nếu đã đăng nhập
   - Hoặc mở incognito/private window

2. **Vào TripWorkspace với guest trip**
   - Nếu đã có guest trip từ link share, truy cập vào đó
   - Hoặc tạo trip mới (với guest flow nếu có)

3. **Mở tab AI Chat**
   - Click tab "AI Chat" hoặc "Chat"

4. **Verify block message**
   - Phải thấy message: "Lưu lịch trình để sử dụng AI Chat" hoặc tương tự
   - Phải thấy button "Đăng nhập" hoặc "Lưu lịch trình"

5. **Verify không có tạo session UI**
   - Không thấy nút "New Session" hoặc "Bắt đầu cuộc trò chuyện"
   - Không thể call API `POST /api/v1/trips/{tripId}/chat-sessions` (nếu cố gọi sẽ fail auth)

### Expected Results

| Checkpoint | Expected |
|------------|----------|
| UI message | Thấy message yêu cầu đăng nhập/lưu trip |
| Button visibility | Không có nút tạo session |
| API call (nếu cố) | 401 Unauthorized hoặc 403 Forbidden |

---

## 5. Test Case 4: Cross-User Access Bị Chặn

**Mục tiêu**: Verify user không thể thấy chat sessions của user khác.

### Steps

1. **User A tạo trip + sessions**
   - Đăng nhập với User A (`test1@example.com`)
   - Tạo trip (như TC1)
   - Tạo 2-3 chat sessions trong trip này
   - Ghi lại trip URL hoặc trip ID

2. **User B cố truy cập**
   - Logout User A
   - Đăng nhập User B (`test2@example.com`)
   - Cố truy cập URL trip của User A (nếu có direct URL)
   - Hoặc cố gọi API `GET /api/v1/trips/{tripId}/chat-sessions` với trip ID của User A

3. **Verify bị chặn**
   - User B không thấy danh sách chat sessions của User A
   - API trả về 403 Forbidden hoặc 404 Not Found
   - UI không leak thông tin session của User A

### Expected Results

| Checkpoint | Expected |
|------------|----------|
| API response | 403 Forbidden hoặc 404 Not Found |
| UI behavior | Không hiển thị sessions của user khác |
| Data leak | Không leak `session_id`, `user_id` của User A |

---

## 6. Browserbase Automation Commands

Dùng Browserbase CLI để automate các test cases trên:

### 6.1. Cài đặt browse CLI

```bash
npm install -g @browserbasehq/browse-cli
```

### 6.2. TC1: Create session automation

```bash
# TC1: Create session
browse open http://localhost:5173 --local --headless
# Trong browser automation script:
# 1. Navigate to /register
# 2. Fill email/password, click submit
# 3. Navigate to /trips, click "Tạo lịch trình mới"
# 4. Fill trip form, submit AI generate
# 5. Navigate to trip workspace
# 6. Click "AI Chat" tab
# 7. Click "Bắt đầu cuộc trò chuyện"
# 8. Verify session created (check API or UI)
```

### 6.3. TC2: List sessions automation

```bash
# TC2: List sessions
browse open http://localhost:5173 --local --headless
# Script:
# 1. Login with existing user
# 2. Navigate to trip with sessions
# 3. Click "AI Chat" tab
# 4. Verify session count > 1
# 5. Call GET /api/v1/trips/{tripId}/chat-sessions
# 6. Assert total equals UI count
```

### 6.4. TC3: Guest block automation

```bash
# TC3: Guest cannot create
browse open http://localhost:5173 --local --private --headless
# Script:
# 1. Navigate to trip workspace (guest mode)
# 2. Click "AI Chat" tab
# 3. Verify "Lưu lịch trình để sử dụng AI Chat" message visible
# 4. Verify "New Session" button NOT present
# 5. (Optional) Try POST request, verify 401/403
```

### 6.5. TC4: Cross-user block automation

```bash
# TC4: Cross-user blocked
browse open http://localhost:5173 --local --headless
# Script:
# 1. Login User A, create trip + sessions
# 2. Logout
# 3. Login User B
# 4. Try navigate to User A's trip URL
# 5. Verify sessions NOT visible
# 6. Verify 403/404 on API call
```

---

## 7. Expected Results Summary

| Test Case | Expected Result | Pass Criteria |
|-----------|----------------|----------------|
| **TC1: Create session** | 201 Created, session visible trong list | Session xuất hiện trong UI và API trả về đúng data |
| **TC2: List sessions** | 200 OK, `total` khớp số lượng trong UI | Tất cả sessions hiển thị, count chính xác |
| **TC3: Guest blocked** | UI message + không có nút tạo, API 401/403 | Thấy message "Lưu lịch trình...", không thể tạo session |
| **TC4: Cross-user blocked** | 403/404, không leak data của user khác | User B không thấy sessions của User A |

---

## 8. Troubleshooting

### 8.1. Backend không start

- Check Docker: `docker ps` — db và redis phải running
- Check port 8000: `netstat -ano | findstr :8000` — nếu đang dùng thì kill
- Check log output từ `uvicorn` command

### 8.2. Frontend không start

- Check port 5173: `netstat -ano | findstr :5173`
- Try `npm run dev -- --port 3000` nếu 5173 conflict
- Xóa `node_modules/.vite` nếu cache issue

### 8.3. API trả về 401/403 không mong muốn

- Verify user đã đăng nhập: check `localStorage` hoặc cookie
- Check API endpoint URL: phải có `/api/v1/` prefix
- Verify `Authorization` header nếu call từ REST client

### 8.4. Session không xuất hiện trong UI

- Reload trang (F5) để refresh cache
- Open DevTools Network tab, verify API `GET /chat-sessions` trả về 200
- Check console log cho error messages

### 8.5. Database migrations chưa chạy

```powershell
cd <repo-root>\Backend
uv run alembic upgrade head
uv run alembic check
```

---

## 9. Cleanup Sau Khi Test

```powershell
# Stop backend: Ctrl+C trong terminal uvicorn

# Stop frontend: Ctrl+C trong terminal npm run dev

# Stop Docker (nếu muốn)
cd <repo-root>\Backend
docker compose down

# Reset database (nếu muốn clean slate)
uv run alembic downgrade base
uv run alembic upgrade head
```

---

## 10. References

- **E2E Tests**: `<repo-root>/Frontend/tests/e2e/chat-session.spec.ts`
- **BE API Docs**: http://localhost:8000/docs (tag `/chat-sessions`)
- **FE Implementation**: `<repo-root>/Frontend/src/app/workspace/[tripId]/components/ChatPanel.tsx`
- **C3A Design**: `<repo-root>/docs/06_c3a_chat_session_design.md`

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-10  
**Feature Phase**: C3A - Chat Session Management  
**Next Phase**: C3B - Chat Message REST APIs
