# Part 6: Scalability Plan — Redis, RabbitMQ, Load Balancing

## Mục đích file này

### WHAT — File này chứa gì?

Hệ thống cần nhanh và ổn định. File này mô tả **chiến lược performance** trên 3 tầng: caching (Redis), rate limiting (Redis), và horizontal scaling (RabbitMQ + Nginx). Chỉ Redis (tầng 1) là bắt buộc trong MVP2.

### WHY — Tại sao cần scalability plan?

Không ai muốn chờ 5 giây để load danh sách thành phố, và không ai muốn attacker spam 1000 lần gọi AI tốn tiền. Redis giải quyết cả 2 vấn đề: cache response (nhanh 10x) + đếm API calls (chặn spam).

### HOW — File tổ chức thế nào?

| Section | Nội dung | Priority |
|---------|----------|----------|
| §1 | Priority classification | — |
| §2 | **Redis** (cache + rate limit + JWT blacklist) | 🔴 MVP2 bắt buộc |
| §3 | RabbitMQ task queue | 🟡 MVP3 optional |
| §4 | Nginx load balancing | 🟢 MVP3 optional |
| §5 | Monitoring | 🟡 MVP2 basic |

### WHEN — Khi nào đọc?

- **Phase A** (foundation): Đọc §2.2-§2.3 để implement `RedisCache` và `RateLimiter`
- **Phase B** (CRUD): Đọc §2.2 để biết endpoint nào cần cache
- **Phase C** (AI): Đọc §2.4 để implement AI rate limiting
- **MVP3** (scale): Đọc §3-§4 khi cần horizontal scaling

### Performance Targets (Mục tiêu)

| Metric | Không cache | Có Redis cache | Mục tiêu |
|--------|------------|----------------|----------|
| `GET /destinations` | ~50ms (DB query) | **<5ms** (cache hit) | <10ms (P95) |
| `GET /places/search` | ~80ms (ILIKE query) | **<5ms** | <15ms (P95) |
| `GET /itineraries/{id}` | ~100ms (JOIN 5 bảng) | **<10ms** | <20ms (P95) |
| AI generation | 10-20s (Gemini) | N/A (không cache) | <25s (P95) |
| AI rate limit check | ~5ms (DB query) | **<1ms** (Redis INCR) | <2ms |

### Quyết định thiết kế (WHY)

| Quyết định | Tại sao (WHY) | Khi nào review (WHEN) |
|------------|--------------|----------------------|
| **Redis** thay vì Memcached | Redis hỗ trợ data structures (INCR, TTL, patterns), Memcached chỉ key-value. Rate limiting cần INCR. | — (Redis tốt hơn cho use case này) |
| **Cache-aside** pattern | App kiểm tra cache trước, miss → query DB → store cache. Simple, dễ debug. | Nếu cần write-through → update pattern |
| **TTL-based invalidation** thay vì event-based | Đơn giản. Chấp nhận data cũ tối đa 5-60 phút (acceptable cho search/destinations). | Nếu cần real-time → pub/sub invalidation |
| **Fixed window** rate limiting | Simple (INCR + EXPIRE). Chấp nhận burst ở ranh giới window. | Nếu cần smooth → sliding window |

---

## 1. Priority Classification

Không phải mọi thứ cần làm ngay. Bảng dưới phân loại theo độ ưu tiên. Chỉ 2 mục 🔴 HIGH là bắt buộc trong MVP2, còn lại là "có thì tốt" cho MVP3.

| Component | Priority | MVP | Lý do |
|----------|---------|-----|-------|
| **Redis caching** | 🔴 High | MVP2 | API response cache → giảm DB load |
| **Redis rate limiting** | 🔴 High | MVP2 | Chặn spam AI generation (free: 3/day) |
| **RabbitMQ task queue** | 🟡 Medium | MVP3 | Async AI nếu >50 concurrent users |
| **Load balancing** | 🟢 Low | MVP3 | Chỉ cần khi scale horizontal |
| **Monitoring** | 🟡 Medium | MVP2 | Prometheus + Grafana basic metrics |

---

## 2. Redis Integration (MVP2)

Redis là **in-memory data store** — lưu dữ liệu trong RAM, truy xuất nhanh hơn PostgreSQL (disk-based) 10-100 lần. Chúng ta dùng Redis cho 3 việc:

1. **Cache API response** — lần đầu query DB, lưu kết quả vào Redis. Lần sau trả từ Redis luôn (<5ms thay vì ~50ms).
2. **Rate limiting** — đếm số lần user gọi AI. Quá 3 lần/ngày → chặn.
3. **JWT blacklist** — khi user logout, lưu token vào blacklist để chặn ngay lập tức.

### 2.1 Use Cases

```mermaid
graph TB
    subgraph "Redis Use Cases"
        C1[API Response Cache<br/>TTL: 5-60 min]
        C2[Rate Limiting<br/>AI: 3/day free<br/>API: 100/min]
        C3[Session Cache<br/>JWT blacklist]
    end
    
    API[FastAPI] --> C1
    API --> C2
    API --> C3
    C1 --> PG[(PostgreSQL)]
    C2 -.-> |limit exceeded| API
```

### 2.2 Cache Strategy

Không phải mọi endpoint đều cần cache. Chỉ cache những endpoint được **gọi thường xuyên** và **data thay đổi chậm**. Ví dụ: danh sách thành phố chỉ thay đổi khi chạy ETL (mỗi 7 ngày) → cache 60 phút. Kết quả search thay đổi chậm → cache 15 phút. Trip data thay đổi khi user edit → cache ngắn (5 phút) và invalidate khi update.

**Cache invalidation** (khi nào xóa cache) là phần quan trọng: nếu user sửa trip nhưng cache cũ vẫn còn, user sẽ thấy data cũ. Vì vậy mỗi lần update trip → `DEL trip:{id}` trong Redis.

| Endpoint | TTL | Cache Key Pattern | Invalidation |
|---------|-----|-------------------|-------------|
| `GET /destinations` | 60 min | `dest:list` | On ETL run |
| `GET /destinations/{name}` | 30 min | `dest:{name}` | On ETL run |
| `GET /places/search` | 15 min | `places:{city}:{type}:{query}` | On ETL run |
| `GET /itineraries/{id}` | 5 min | `trip:{id}` | On trip update |
| `GET /users/saved-places` | 5 min | `saved:{user_id}` | On save/unsave |

### 2.3 Implementation

```python
# src/core/cache.py

import redis.asyncio as redis
from functools import wraps

class RedisCache:
    """Async Redis cache wrapper."""
    
    def __init__(self, url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(url, decode_responses=True)
    
    async def get(self, key: str) -> str | None:
        return await self.redis.get(key)
    
    async def set(self, key: str, value: str, ttl: int = 300):
        await self.redis.setex(key, ttl, value)
    
    async def delete(self, key: str):
        await self.redis.delete(key)
    
    async def invalidate_pattern(self, pattern: str):
        """Delete all keys matching pattern."""
        keys = []
        async for key in self.redis.scan_iter(pattern):
            keys.append(key)
        if keys:
            await self.redis.delete(*keys)


def cached(ttl: int = 300, key_prefix: str = ""):
    """Decorator cho API endpoint caching."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache()  # DI
            cache_key = f"{key_prefix}:{hash(str(args) + str(kwargs))}"
            
            # Check cache
            cached_result = await cache.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await cache.set(cache_key, json.dumps(result), ttl)
            return result
        return wrapper
    return decorator
```

### 2.4 Rate Limiting

Rate limiting giải quyết 2 vấn đề: (1) chặn attacker spam AI endpoint làm tốn tiền Gemini API, và (2) đảm bảo fair usage giữa các user.

Cơ chế: Redis lưu counter với key `rate:ai:{user_id}:{date}`. Mỗi lần gọi AI → INCR counter. Counter ≥ 3 → trả HTTP 429. Counter tự reset vào 00:00 UTC ngày hôm sau (Redis TTL). Khác với cache, **AI rate limit không được fail-open âm thầm** vì mỗi request có thể tốn tiền API; nếu Redis down thì dùng DB fallback counter, hoặc fail-closed theo cấu hình `AI_RATE_LIMIT_FAIL_MODE`.

```python
# src/core/rate_limit.py

class RateLimiter:
    """Token bucket rate limiter using Redis."""
    
    async def check_limit(
        self, key: str, max_requests: int, window_seconds: int
    ) -> bool:
        """Check if request is within rate limit.
        
        Args:
            key: Identifier (VD: f"ai:{user_id}")
            max_requests: Max allowed in window
            window_seconds: Time window
        
        Returns:
            True if allowed, False if exceeded.
        """
        pipe = self.redis.pipeline()
        current = int(time.time())
        window_key = f"rate:{key}:{current // window_seconds}"
        
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds)
        count, _ = await pipe.execute()
        
        return count <= max_requests

    async def check_ai_limit_or_raise(self, key: str) -> None:
        """Paid AI endpoints must not skip limits when Redis is down.

        Order:
        1. Try Redis counter (fast path).
        2. If Redis unavailable, use PostgreSQL fallback table/counter.
        3. If fallback unavailable and AI_RATE_LIMIT_FAIL_MODE=closed,
           raise 503/429 instead of calling Gemini for free.
        """

# Usage in AI endpoint:
RATE_LIMITS = {
    "free": {"max": 3, "window": 86400},   # 3/day
    "premium": {"max": 50, "window": 86400}, # 50/day
}

# Guest rate limiting:
# Guest (no JWT) → rate limit by IP address: f"ai:ip:{client_ip}"
# Auth user → rate limit by user_id: f"ai:user:{user_id}"
# Cả hai đều dùng cùng window (86400s = 24h) và max (3/day free)
```

### 2.5 Docker Compose Addition

```yaml
# docker-compose.yml (thêm service)
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis_data:/data"]
    command: redis-server --appendonly yes

  backend:
    environment:
      REDIS_URL: redis://redis:6379

volumes:
  redis_data:
```

---

## 3. RabbitMQ Task Queue (MVP3)

> [!NOTE]
> Chỉ cần khi có >50 concurrent users cùng generate itinerary.
> MVP2 dùng synchronous AI call là đủ.

Tại sao cần task queue? Khi nhiều user gọi AI cùng lúc, server phải xử lý song song nhiều lời gọi Gemini. Mỗi lời gọi mất 10-15 giây — nếu 50 người gọi cùng lúc, server cần giữ 50 connections đồng thời, tốn RAM và CPU.

Task queue giải quyết bằng cách đẩy request vào hàng đợi (RabbitMQ), worker riêng xử lý theo tốc độ của mình. User nhận task_id → polling status → kết quả khi xong. Giống đặt món online — nhà hàng nhận đơn, nấu theo thứ tự, gọi khi xong.

### 3.1 Architecture

```
┌────────┐     POST /generate      ┌──────────┐
│   FE   │ ─────────────────────── │ FastAPI  │
│        │ ◄── { task_id, status } │          │
└────────┘                          └─────┬────┘
                                          │ publish
                                    ┌─────▼─────┐
                                    │ RabbitMQ  │
                                    │  Queue    │
                                    └─────┬─────┘
                                          │ consume
                                    ┌─────▼─────┐
                                    │  Worker   │
                                    │ (Celery)  │
                                    │ AI Agent  │
                                    └───────────┘
                                          │
                                    ┌─────▼─────┐
                                    │  Webhook  │
                                    │ /callback │
                                    │ → FE SSE  │
                                    └───────────┘
```

### 3.2 Khi nào cần

| Metric | Threshold | Action |
|--------|-----------|--------|
| Concurrent AI requests | > 10 | Consider queue |
| AI response time | > 30s | Queue + polling |
| Server CPU > 80% | Sustained | Queue + workers |
| User complaints | Timeout errors | Queue required |

### 3.3 Implementation Sketch

```python
# src/tasks/itinerary_task.py (MVP3)

from celery import Celery

app = Celery("dulichviet", broker="amqp://guest:guest@rabbitmq//")

@app.task(bind=True, max_retries=2, time_limit=60)
def generate_itinerary_task(self, request_data: dict, user_id: int):
    """Background task cho AI itinerary generation.
    
    1. Mark task as 'processing' in DB
    2. Run 5-step pipeline
    3. Save result to DB
    4. Notify FE via webhook/SSE
    """
    try:
        result = run_pipeline(request_data, user_id)
        notify_completion(user_id, result.trip_id)
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
```

---

## 4. Load Balancing (MVP3)

Load balancing giúp chia tải giữa nhiều instance backend. Khi 1 server không đủ, chạy 3 containers giống nhau và Nginx phân phối request đều. Đây là bước scale horizontal — chỉ cần khi đăng ký nhiều user thật sự.

### 4.1 Docker Replicas

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
    
  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on: [backend]
```

### 4.2 Nginx Config

```nginx
upstream backend {
    least_conn;
    server backend:8000;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 5. Monitoring (MVP2 Basic)

Để biết hệ thống hoạt động tốt hay không, cần monitor. MVP2 implement cơ bản: log mọi request với thời gian xử lý, cảnh báo nếu request chậm (>5s), và health check endpoint cho Docker.

### 5.1 Application Metrics

```python
# src/core/middlewares.py

import time
import logging

logger = logging.getLogger("dulichviet")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with timing."""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} ({duration:.2f}s)"
    )
    
    # Alert if slow
    if duration > 5.0:
        logger.warning(f"SLOW REQUEST: {request.url.path} took {duration:.2f}s")
    
    return response
```

### 5.2 Health Check Endpoint

```python
# src/api/v1/router.py

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check cho Docker/load balancer."""
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "version": settings.app_version,
        }
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )
```

---

## 6. Tóm tắt Roadmap

Nhìn tổng thể: MVP2 chỉ cần Redis + basic logging. Các thành phần phức tạp hơn (RabbitMQ, Nginx, Kubernetes) để dành cho MVP3 khi thật sự cần scale.

```
MVP2 (Now):
  ✅ Redis cache (API responses)
  ✅ Redis rate limiting (AI: 3/day)
  ✅ Basic request logging
  ✅ Health check endpoint
  ✅ Docker Compose (BE + FE + PG + Redis)
  ✅ Active trips limit (5/user — see §7)

MVP3 (Later):
  ⏳ RabbitMQ + Celery workers
  ⏳ Nginx load balancing
  ⏳ Prometheus + Grafana dashboards
  ⏳ Auto-scaling (Kubernetes)
```

---

## 7. Tính năng mới — Design trong MVP2

### §7.1 Feature B: 5 Active Trips Limit

**WHAT:** Auth user chỉ được có tối đa **5 active trips**. Khi tạo thêm → bị từ chối.

**WHY:**
- Tránh user vô tình tích lũy hàng chục trips rác → DB bloat
- Khuyến khích user xóa/clean up trips cũ
- Bảo vệ hệ thống (AI generation quota + DB storage per user)

**HOW — Implementation:**

```python
# src/services/itinerary_service.py
MAX_ACTIVE_TRIPS = settings.max_active_trips_per_user  # từ config.yaml: 5

async def check_creation_limit(self, user_id: int) -> None:
    """Kiểm tra giới hạn 5 trips trước khi tạo mới.
    
    Raises TripLimitExceededError nếu đã đạt 5 active trips.
    """
    count = await self._trip_repo.count_active(user_id)
    if count >= MAX_ACTIVE_TRIPS:
        raise TripLimitExceededError(
            f"Đã đạt giới hạn {MAX_ACTIVE_TRIPS} lộ trình. "
            "Xóa 1 lộ trình cũ để tạo mới."
        )
```

**Config param** (config.yaml):
```yaml
limits:
  max_active_trips_per_user: 5  # Configurable không cần deploy lại
```

**API behavior:**
- `POST /itineraries/generate` → check limit trước khi gọi AI (tránh lãng phí quota)
- `POST /itineraries` → check limit tương tự
- **DELETE trip → ngay lập tức giảm count** → user có thể tạo mới

**FE behavior:**
- Danh sách trips (`GET /itineraries`) trả `total` → FE hiển thị `3/5 lộ trình`
- Khi `total >= 5` → disable nút "Tạo lộ trình" + hiện warning
- Khi `total >= 4` → hiện warning nhẹ: "Bạn còn 1 lộ trình trước giới hạn"

**Guest policy:** Guest KHÔNG bị limit (trip không persist permanently → xóa sau 24h)

### §7.2 Feature A: Guest Trip Claim

**WHAT → WHY → HOW:** Xem [04_ai_agent_plan.md §4.10](04_ai_agent_plan.md) và [12_be_crud_endpoints.md EP-32](12_be_crud_endpoints.md)

### §7.3 Feature C: Share Link Read-Only

**WHAT:** `POST /itineraries/{id}/share` tạo share token → `GET /shared/{token}` cho phép đọc trip

**Read-only enforcement:**
- Share link endpoint KHÔNG có JWT requirement → public access
- Response chứa `ItineraryResponse` đầy đủ nhưng FE render chế độ view-only (disable edit buttons)
- **Không có write permission qua share link** — FE không render save/edit controls

**Future (MVP3):** Add collaborator, realtime colab edit via WS

---

## 8. Failure Modes & Graceful Degradation 🆕

> [!WARNING]
> Redis cache là **optional** — hệ thống PHẢI hoạt động (chậm hơn) khi Redis down. Riêng paid AI rate limit là security/cost control nên không fail-open: dùng DB fallback hoặc fail-closed.

### §8.1 Redis Failure Scenarios

| Scenario | Phát hiện bằng | Hệ thống phản ứng | User impact |
|----------|---------------|-------------------|-------------|
| **Redis connection refused** | `ConnectionError` khi `redis.ping()` | Bypass cache → query DB trực tiếp. Log `WARNING: Redis unavailable, cache disabled` | Chậm hơn ~10x cho cached endpoints, nhưng vẫn hoạt động |
| **Redis timeout (>500ms)** | `TimeoutError` | Treat as cache miss → query DB. Không retry cache write | Transparent |
| **Redis memory full (maxmemory)** | `OOM command not allowed` | Redis tự evict keys (policy `allkeys-lru`). Nếu vẫn fail → bypass | Transparent |
| **Rate limit key corrupted** | Counter > max_int hoặc NaN | Reset key: `DEL rate:ai:{user_id}:*` | User bị block sai → tự hết sau TTL (24h) |
| **Redis down khi gọi AI** | `ConnectionError` trong `RateLimiter` | Dùng DB fallback counter; nếu fallback cũng fail và mode=`closed` thì trả 503/429 | Tránh phát sinh chi phí API không kiểm soát |

```python
# src/core/cache.py — graceful degradation pattern
async def cached_get(self, key: str) -> str | None:
    """Get from cache with graceful degradation.
    
    Nếu Redis down → return None (cache miss) → caller query DB.
    KHÔNG raise exception → KHÔNG break request flow.
    """
    try:
        return await asyncio.wait_for(
            self.redis.get(key), timeout=0.5  # 500ms max
        )
    except (ConnectionError, TimeoutError, RedisError) as e:
        logger.warning(f"Redis unavailable: {e}. Falling back to DB.")
        return None  # Treat as cache miss
```

### §8.2 Cache Stampede Prevention

**Vấn đề:** Khi cache expire cho 1 key phổ biến (VD: `dest:list`), 100 request đồng thời đều miss cache → 100 DB queries cùng lúc → DB overload.

**Giải pháp: Stale-while-revalidate pattern**
```python
# Set cache with stale period: data valid 60 min, stale OK for 5 min more
await cache.set(key, value, ttl=3600)  # 60 min
# Khi TTL < 300s (5 min remaining):
#   → Trả stale data ngay cho user (fast)
#   → Background task refresh cache (async)
#   → Chỉ 1 request refresh, không stampede
```

---

## 9. Acceptance Tests — Scalability Features 🆕

### §9.1 Cache Tests

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| SC-01 | Cache hit cho destinations | 1. `GET /destinations` lần 1 (cold) → 2. `GET /destinations` lần 2 | Lần 2: header `X-Cache: HIT`, latency < 5ms |
| SC-02 | Cache invalidate sau ETL | 1. Cache destinations → 2. Chạy ETL → 3. `GET /destinations` | Lần 3: data mới từ DB, không phải cached data cũ |
| SC-03 | Redis down graceful | 1. Stop Redis → 2. `GET /destinations` | Vẫn trả 200 OK (từ DB), log warning, latency ~50ms |

### §9.2 Rate Limit Tests

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| RL-01 | Free tier limit (3/day) | Gọi `POST /itineraries/generate` 4 lần trong 1 ngày | Lần 1-3: 201 Created. Lần 4: 429 `{\"error_code\": \"RATE_LIMIT_EXCEEDED\", \"remaining\": 0}` |
| RL-02 | Guest rate limit by IP | Gọi 4 lần generate không có JWT, cùng IP | Lần 4: 429 (limit by IP) |
| RL-03 | Rate limit status check | `GET /agent/rate-limit-status` sau 2 lần generate | `{\"used\": 2, \"limit\": 3, \"remaining\": 1, \"reset_at\": \"2026-05-01T00:00:00Z\"}` |
| RL-04 | Redis down khi gọi AI | Stop Redis → gọi `POST /itineraries/generate` | Dùng DB fallback counter; nếu fallback fail thì trả 503/429, không gọi Gemini không giới hạn |

### §9.3 Trip Limit Tests

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| TL-01 | 5 trips limit | Tạo 6 trips cho cùng user | Trip 1-5: 201. Trip 6: 403 `{\"error_code\": \"MAX_TRIPS_REACHED\"}` |
| TL-02 | Delete frees slot | Tạo 5 trips → DELETE 1 → Generate trip mới | Trip mới: 201 Created |
| TL-03 | Guest no limit | Guest tạo 6 trips (cùng IP, không JWT) | Tất cả 201 (guest không bị trip limit, chỉ rate limit) |
