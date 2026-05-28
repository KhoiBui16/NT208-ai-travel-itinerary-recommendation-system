# Issue: Observability — Request ID / Correlation ID Missing

## Status
OPEN

## Evidence
- **B1.5 Observability Audit** (2026-05-28): `TRACE_PARTIAL`
- `Backend/src/core/middlewares.py`: `request_logging_middleware` log method/path/status/duration_ms nhưng không có `request_id`
- `Backend/src/itineraries/pipeline.py`: `ai_generate_started` log không có `request_id`
- Không có middleware sinh UUID per-request
- Không có `X-Request-ID` response header

## Impact
- Khi user báo lỗi, không thể trace request cụ thể trong logs
- Nhiều concurrent requests cùng destination → không phân biệt được trong logs
- FE không có request_id để hiển thị cho user khi cần support
- C3 companion chat sẽ khó debug hơn khi không có correlation ID

## Reproduction
1. Gọi `POST /api/v1/itineraries/generate`
2. Xem backend logs → không có request_id field
3. Không thể tìm log của request cụ thể nếu có nhiều concurrent requests

## Expected
- Mỗi request có `request_id = uuid4()`
- `request_id` xuất hiện trong tất cả log events của request đó
- Response header: `X-Request-ID: {request_id}`
- Error response body: `{"detail":"...","error_code":"...","request_id":"..."}`

## Actual
- Không có request_id trong logs
- Không có X-Request-ID header

## Suggested fix

```python
# Backend/src/core/middlewares.py
import uuid
import structlog

async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.bind_contextvars(request_id=request_id)
    started_at = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        # request_id auto-included via contextvars
    )
    response.headers["X-Request-ID"] = request_id
    structlog.contextvars.clear_contextvars()
    return response
```

## Recommended branch
`feat/00051-x-observability-request-id`
