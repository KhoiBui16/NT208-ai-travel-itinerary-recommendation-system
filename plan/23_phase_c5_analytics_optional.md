# Plan C.5 — Analytics (Optional / MVP2+)

> Trạng thái: Chưa bắt đầu
> Độ phức tạp: ★★★☆☆
> Phụ thuộc: C.1 (generate pipeline đã hoạt động để có data phân tích)
> Endpoint: `POST /api/v1/agent/analytics` (EP-34, optional)

## Mục tiêu

Text-to-SQL cho phép user hỏi bằng tiếng Việt về dữ liệu du lịch của mình ("Tôi đã tạo mấy trips?", "Tổng chi phí các chuyến đi?"). Gemini sinh SQL → validate → execute → trả kết quả.

## Rủi ro bảo mật — PHẢI CÓ guardrails

Analytics dùng Text-to-SQL, tức là LLM sinh SQL từ user input. **Rất nguy hiểm** nếu không có guardrails:

| Rủi ro | Mức độ | Guardrail |
|---------|---------|-----------|
| SQL Injection | CAO | Read-only DB role, parse AST, block DML |
| Truy cập data user khác | CAO | Auto-inject `WHERE user_id = X` |
| Truy cập banned tables (users, tokens) | CAO | Allowlist tables, block trong AST |
| SQL quá nặng | TRUNG BÌNH | Timeout 5s, LIMIT 100 rows |
| Prompt injection qua câu hỏi | TRUNG BÌNH | Input sanitization |

**Chỉ triển khai nếu có đủ thời gian test guardrails. Nếu thiếu thời gian → skip, không deploy.**

## Guardrails bắt buộc

1. **Read-only DB role** — kết nối bằng role chỉ có SELECT
2. **Allowlist tables** — chỉ cho phép: trips, trip_days, activities, places, destinations, hotels, trip_ratings
   - BLOCK: users, refresh_tokens, share_links, guest_claim_tokens, chat_sessions, chat_messages
3. **Validate SQL** — parse → AST:
   - Không INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE
   - Không subquery trỏ banned table
   - Không UNION với banned query
4. **User-scope filter** — auto-add `WHERE user_id = ?` hoặc `OR user_id IS NULL`
5. **Max rows** — LIMIT 100 (default)
6. **Audit log** — log mọi query: user_id, question, SQL, rows returned, latency

## Files cần tạo/sửa

### Tạo mới

| File | Mục đích | Dự kiến dòng |
|------|----------|-------------|
| `Backend/src/agent/analytics_service.py` | Text-to-SQL pipeline | ~100 |
| `Backend/src/agent/prompts/analytics_prompts.py` | ANALYTICS_SYSTEM_PROMPT, build_schema_context() | ~40 |
| `Backend/src/agent/sql_validator.py` | Parse AST, validate safety | ~80 |

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `Backend/src/agent/router.py` | Thêm endpoint `POST /agent/analytics` |
| `Backend/src/core/config.py` | `enable_analytics` flag đã có |

## Flow — 7 bước

```
1. Fetch Schema  → Lấy schema từ allowlist tables
2. Generate SQL  → Gemini sinh SELECT query + auto-inject WHERE user_id
3. SQL Validator → Parse AST + LLM verify
4. Execute SQL   → Read-only role, 5s timeout, LIMIT 100
5. Retry/Error   → Gửi error cho Gemini → fix SQL, max 2 retries
6. Format        → Gemini tổng hợp kết quả thành tiếng Việt
7. Return        → { answer, sql_executed, rows_preview, source: "database" }
```

## Feature Flag

```env
ENABLE_ANALYTICS=false   # Default OFF, chỉ bật khi guardrails sẵn sàng
```

Endpoint trả 503 nếu `ENABLE_ANALYTICS=false`.

## Xác nhận hoàn thành

- [ ] SQL validator block DML keywords
- [ ] SQL validator block banned tables
- [ ] Auto-inject WHERE user_id
- [ ] Read-only DB role
- [ ] Audit log
- [ ] LIMIT 100 rows
- [ ] Feature flag hoạt động (OFF → 503)
- [ ] Unit tests cho SQL validator (các case injection)
