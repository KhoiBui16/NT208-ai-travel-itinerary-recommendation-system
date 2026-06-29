# Báo cáo Task 00131 — Auth UX + password reset truthfulness

## 1. Branch / scope

- Branch: `fix/00131-c-auth-ux-reset-truth`
- Scope:
  - làm rõ message auth cho login / register / reset-password
  - bỏ trạng thái "đã gửi email" gây hiểu nhầm khi forgot-password không có SMTP thật
  - vá accessibility nhỏ cho auth form (`label` + `htmlFor`)
- Không đụng AI/chat/data contamination/docs sync toàn repo trong pass này.

## 2. Các thay đổi chính

### F1. FE auth error không còn phụ thuộc trực tiếp vào detail tiếng Anh

- Thêm: [Frontend/src/app/utils/authErrorHandler.ts](../../Frontend/src/app/utils/authErrorHandler.ts)
- Áp dụng vào:
  - [Frontend/src/app/pages/Login.tsx](../../Frontend/src/app/pages/Login.tsx)
  - [Frontend/src/app/pages/Register.tsx](../../Frontend/src/app/pages/Register.tsx)
  - [Frontend/src/app/pages/ForgotPassword.tsx](../../Frontend/src/app/pages/ForgotPassword.tsx)
  - [Frontend/src/app/pages/ResetPassword.tsx](../../Frontend/src/app/pages/ResetPassword.tsx)
- Kết quả:
  - `Invalid email or password` → `Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.`
  - `Email already registered` → `Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.`
  - token reset hỏng/hết hạn → message tiếng Việt rõ ràng
  - network lỗi → phân biệt khỏi lỗi business

### F2. Forgot-password trả đúng truth về khả năng gửi email

- Sửa BE:
  - [Backend/src/auth/email.py](../../Backend/src/auth/email.py)
  - [Backend/src/auth/service.py](../../Backend/src/auth/service.py)
  - [Backend/src/auth/router.py](../../Backend/src/auth/router.py)
  - [Backend/src/auth/schemas.py](../../Backend/src/auth/schemas.py)
- Contract mới:
  - `deliveryMode = "smtp"`: có gửi email thật
  - `deliveryMode = "log_only"`: chỉ log reset link trong môi trường development
  - `deliveryMode = "disabled"`: production/staging chưa cấu hình SMTP, không giả vờ đã gửi
- FE page `ForgotPassword` đổi panel theo `deliveryMode` thay vì luôn hiển thị success xanh.

### F3. Auth form có `label` đúng cho automation + accessibility

- Thêm `id` + `htmlFor` cho input trên:
  - login
  - register
  - forgot-password
  - reset-password
- Playwright `getByLabel(...)` chạy được lại.

## 3. Verification đã chạy

### Backend

```powershell
Set-Location <repo-root>\Backend
uv run pytest tests\unit\test_password_reset.py tests\integration\test_auth_endpoints.py -q
uv run ruff check src tests
uv run alembic check
```

Kết quả:

- `17 passed, 2 skipped`
- `ruff` pass
- `alembic check` pass

### Frontend

```powershell
Set-Location <repo-root>\Frontend
npm run build -- --outDir .build-tmp\00131-auth-final
npm run build -- --outDir .build-tmp\00131-auth-a11y
```

Kết quả:

- build pass
- còn chunk-size warning ~`1.2 MB`, không phải blocker của pass này

### Browser smoke local

Stack verify riêng:

- Backend: `http://localhost:8020`
- Frontend: `http://localhost:5175`

Playwright smoke đã xác nhận:

- login sai mật khẩu → `Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.`
- forgot-password khi local không có SMTP → panel vàng, không còn claim gửi email thật
- reset-password với token hỏng → `Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.`
- register trùng email → `Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.`
- `getByLabel("Email")` và `getByLabel("Email đã đăng ký")` hoạt động lại

### Visual evidence mới

- `.codex-run-logs/00131-login-invalid.png`
- `.codex-run-logs/00131-forgot-password-disabled.png`
- `.codex-run-logs/00131-reset-invalid-token.png`
- `.codex-run-logs/00131-register-duplicate.png`

## 4. Những gì pass này CHƯA giải quyết

- auth latency thật nếu Render/Vercel cold start hoặc network chậm
- SMTP production thật trên Render
- AI chat semantics / apply-patch / identifier UX
- cost estimation logic
- data contamination / sparse city / Goong image-rating gap
- docs sync toàn repo

## 5. Kết luận kỹ thuật

- Auth UX hiện rõ hơn và đúng hơn với runtime thật.
- Forgot-password không còn đánh lừa end-user trong môi trường chưa cấu hình SMTP.
- Branch này đủ sạch để mở PR riêng trước khi sang batch AI/chat/cost hoặc data tiếp theo.
