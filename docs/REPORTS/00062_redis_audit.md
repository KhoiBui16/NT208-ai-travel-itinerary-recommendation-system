# BÁO CÁO AUDIT REDIS - AI TRAVEL ITINERARY RECOMMENDATION SYSTEM

**Ngày audit:** 2026-06-09  
**Redis Container:** nt208-ai-travel-itinerary-recommendation-system-redis-1  
**Redis Version:** 7.4.8  
**Mục đích:** Kiểm tra toàn diện Redis data, cache patterns, TTL management, và encoding issues

---

## 1. TỔNG QUAN REDIS

### 1.1 Server Information
- **Redis Version:** 7.4.8 (phiên bản ổn định, mới)
- **Mode:** Standalone (không dùng cluster)
- **Uptime:** ~10,438 giây (~3 tiếng)
- **OS:** Linux 6.6.114.1-microsoft-standard-WSL2 x86_64
- **Process ID:** 1
- **TCP Port:** 6379
- **Max Memory:** 0 (không giới hạn - CẦN SỬA)

### 1.2 Memory Usage
- **Used Memory:** 1.14MB (1199024 bytes)
- **Used Memory RSS:** 8.50MB (8912896 bytes)
- **Memory Fragmentation Ratio:** 7.68 (cao - cần monitor)
- **Max Memory Policy:** noeviction (KHÔNG xóa key khi đầy - CẦN SỬA)
- **Allocator:** jemalloc-5.3.0

### 1.3 Keyspace Stats
- **Total Keys:** 4 keys
- **Keys with Expiry:** 4 keys (100%)
- **Average TTL:** 40,095,908 ms (~11 giờ)
- **Database:** db0 (chỉ dùng 1 DB)

### 1.4 Connection Stats
- **Total Connections Received:** 1,478
- **Total Commands Processed:** 1,500
- **Instantaneous Ops/Sec:** 1
- **Rejected Connections:** 0 (tốt)
- **Current Clients:** 1

---

## 2. PHÂN TÍCH KEY PATTERNS

### 2.1 Danh sách Keys hiện tại

| Key Pattern | Type | TTL (giây) | TTL còn lại | Mục đích |
|-------------|------|------------|-------------|----------|
| `places:search:None:None:None:5` | string | 3600 | 2335 | Cache kết quả search places (không có filter) |
| `places:search:None:Hanoi:None:5` | string | 3600 | 2332 | Cache kết quả search places tại Hanoi |
| `rate:ai:user:530:20260609` | string | 86400 | 70527 | Rate limit AI cho user ID 530 (ngày 2026-06-09) |
| `destinations:all:v2` | string | 86400 | 85121 | Cache danh sách tất cả destinations (v2 với data quality) |

### 2.2 Key Naming Convention Analysis

**✅ Tốt:**
- Sử dụng delimiter `:` rõ ràng, dễ đọc
- Prefix theo domain: `places:`, `rate:ai:`, `destinations:`
- Version suffix cho cache keys: `:v2`
- Date suffix cho rate limits: `:YYYYMMDD`

**⚠️ Cần cải thiện:**
- Key `places:search:None:None:None:5` có quá nhiều `None` - redundancy cao
- Không có prefix environment (dev/staging/prod)
- Không có metadata về app version trong cache keys

### 2.3 Data Types Analysis

**Tất cả keys đều là string type:**
- Cache data được serialized thành JSON string
- Không dùng Redis structures (hash, list, set, zset)
- Điều này OK cho current use case, nhưng có thể optimize với hashes cho destination data

### 2.4 TTL Strategy Analysis

**Place Search Cache:**
- TTL: 3600s (1 giờ) - configured via `place_search_cache_ttl_seconds`
- Cân bằng tốt giữa freshness và performance

**Destination Cache:**
- TTL: 86400s (24 giờ) - configured via `destination_cache_ttl_seconds`
- Hợp lý vì destinations ít thay đổi

**Rate Limit Keys:**
- TTL: Until midnight UTC (dynamic expiry)
- Reset mỗi ngày via `expireat` với timestamp midnight
- Implementation đúng trong `rate_limiter.py`

---

## 3. KIỂM TRA ENCODING

### 3.1 Vietnamese Character Handling

**✅ Test với raw output:**
```bash
redis-cli --raw GET "places:search:None:None:None:5"
redis-cli --raw GET "destinations:all:v2"
```

**Kết quả:**
- Vietnamese characters được lưu **ĐÚNG** dưới dạng Unicode escape sequences:
  - `Hà Nội` → `H\u00e0 N\u1ed9i`
  - `Đà Nẵng` → `\u0110\u00e0 N\u1eb5ng`
  - `Nhà hàng Đầm Rong` → `Nh\u00e0 h\u00e0ng \u0110\u1ea7m Rong`

### 3.2 Cache Key Normalization

**Function `normalize_cache_key()` trong `cache.py`:**
```python
def normalize_cache_key(*parts: str | None) -> str:
    normalized = []
    for part in parts:
        if part is None:
            normalized.append("None")
        else:
            # URL-encode to handle UTF-8 Vietnamese characters
            encoded = urllib.parse.quote(str(part), safe="")
            normalized.append(encoded)
    return ":".join(normalized)
```

**✅ Tốt:**
- Xử lý UTF-8 đúng cách bằng URL encoding
- Chuyển `None` thành string "None" (consistent)
- Tránh collision giữa các cache keys có tiếng Việt

**⚠️ Vấn đề:**
- Key hiện tại: `places:search:None:Hanoi:None:5`
- "Hanoi" là ASCII, nhưng nếu user search "Hà Nội" → key sẽ là: `places:search:None:H%E1%BB%8i%20N%E1%BB%99i:None:5`
- Điều này tạo ra **2 keys khác nhau** cho cùng một query (Hanoi vs Hà Nội)

### 3.3 Value Serialization

**✅ JSON serialization đúng:**
```python
await self.cache.set(cache_key, json.dumps([i.model_dump() for i in items]), ttl)
```

- Dùng `json.dumps()` với default Python behavior
- Vietnamese characters được escape thành Unicode sequences
- Khi deserialize về FE, hiển thị đúng tiếng Việt

---

## 4. RATE LIMIT STATE

### 4.1 Current Rate Limit Keys

**Key hiện tại:**
- `rate:ai:user:530:20260609` = `1`
  - User ID 530 đã dùng 1 lượt AI hôm nay
  - Limit: 3 lượt/ngày (free tier)
  - Còn lại: 2 lượt

### 4.2 Rate Limit Implementation Analysis

**✅ Implementation đúng theo policy:**

```python
# Key format: rate:ai:{actor}:{YYYYMMDD}
key = f"rate:ai:{actor}:{today}"

# Workflow:
1. Increment counter: INCR key
2. Set expiry on first call: EXPIREAT key midnight_utc
3. Check against limit: count <= rate_limit_ai_free
```

**Fail mode behavior:**
- **Closed mode (default):** Nếu Redis down → raise 503 ServiceUnavailableException
- **Open mode:** Nếu Redis down → allow request through

**Config trong `config.py`:**
```python
ai_rate_limit_fail_mode: str = "closed"  # ✅ Đúng theo policy
rate_limit_ai_free: int = 3              # ✅ Free tier: 3 lượt/ngày
```

### 4.3 Guest Rate Limiting

**✅ Implementation đúng:**
```python
def guest_actor(ip: str | None, user_agent: str | None) -> str:
    fingerprint = f"{ip or 'unknown'}|{user_agent or 'unknown'}"
    digest = sha256(fingerprint.encode("utf-8")).hexdigest()[:16]
    return f"guest:{digest}"
```

- Fingerprint dựa trên IP + User-Agent hash
- Stable trong session, nhưng reset nếu đổi network/browser
- Khshare quota với auth users (tighter limit)

### 4.4 Vấn đề phát hiện

**❌ KHÔNG CÓ guest rate limit keys hiện tại:**
- Chỉ có `rate:ai:user:530:20260609`
- Không có `rate:ai:guest:*` keys
- Có thể do:
  1. Chưa có guest request
  2. Hoặc guest rate limit chưa được test

---

## 5. CACHE STRATEGY ANALYSIS

### 5.1 Cache Hit/Miss Analysis

**Redis Stats:**
- `keyspace_hits: 1`
- `keyspace_misses: 5`
- **Hit ratio:** 1/(1+5) = **16.7%** (rất thấp)

**Nguyên nhân hit ratio thấp:**
1. App mới start, cache chưa có data
2. User queries đa dạng (không trùng lặp)
3. Cache keys có quá nhiều parameter combinations

### 5.2 Cache Invalidation Strategy

**✅ TTL-based invalidation (đúng):**
- Không có manual cache invalidation
- Tất cả keys tự expire theo TTL
- Đơn giản, dễ maintain

**⚠️ Missing cache invalidation:**
- ETL process cập nhật places/hotels nhưng KHÔNG invalid cache
- Code trong `etl/loaders/db_loader.py` có parameter `redis: Redis | None` nhưng chưa implement

### 5.3 Cache Key Granularity

**✅ Đúng granularity:**
- Destination cache: coarse-grained (tất cả destinations trong 1 key)
- Place search cache: fine-grained (mỗi combination query 1 key)

**⚠️ Issue:**
- `places:search:None:None:None:5` cache key có redundant "None" values
- Có thể optimize bằng cách bỏ qua None parameters

### 5.4 Memory Usage Analysis

**✅ Memory usage thấp:**
- Total: 1.14MB với 4 keys
- Cần monitor khi số keys tăng lên

**⚠️ Fragmentation ratio cao (7.68):**
- Fragmentation có thể do:
  1. Many small allocations/deallocations
  2. Memory allocator behavior
  3. Need to monitor over time

---

## 6. KẾT NỐI TỪ BACKEND

### 6.1 Redis Connection Pool

**Implementation trong `dependencies.py`:**

```python
async def get_redis(settings: AppSettings = Depends(get_settings)) -> AsyncGenerator[Redis, None]:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.aclose()
```

**✅ Tốt:**
- Dùng `decode_responses=True` → tự động decode bytes→strings
- Per-request connection (avoid connection pooling complexity)
- Auto-close với async generator

**⚠️ Cần cải thiện:**
- Không có connection pooling cho high throughput
- Không có retry logic khi Redis reconnects
- Không có health check trước khi yield

### 6.2 Error Handling

**✅ Graceful degradation trong `CacheClient`:**

```python
async def get(self, key: str) -> str | None:
    if not self._redis:
        return None
    try:
        return await self._redis.get(key)
    except Exception:
        logger.warning("Redis cache read failed for key=%s", key, exc_info=True)
        return None  # Cache miss → fallback to DB
```

**✅ Fail-closed cho Rate Limiter:**
```python
except Exception as exc:
    if self.settings.ai_rate_limit_fail_mode == "closed":
        raise ServiceUnavailableException("AI rate limiter unavailable") from exc
    return True  # Fail-open mode
```

### 6.3 Configuration

**Config trong `docker-compose.yml`:**
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 5s
    retries: 10
```

**✅ Tốt:**
- Dùng Alpine image (nhỏ gọn)
- Có health check
- Depends_on health check trong API service

**❌ Missing configs:**
- **KHÔNG CÓ** memory limit (có thể fill disk)
- **KHÔNG CÓ** maxmemory policy (default noeviction)
- **KHÔNG CÓ** persistence (RDB/AOF)
- **KHÔNG CÓ** eviction policy

---

## 7. VẤN ĐỀ PHÁT HIỆN

### 7.1 P0 - CRITICAL (Phải fix ngay)

1. **Redis không có maxmemory limit**
   - **Issue:** `maxmemory: 0` trong Redis config
   - **Impact:** Redis có thể consume hết RAM, crash toàn bộ system
   - **Fix:** Set maxmemory trong `docker-compose.yml`:
     ```yaml
     redis:
       command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
     ```

2. **Rate limit KHÔNG fail-open khi Redis down**
   - **Issue:** Config `ai_rate_limit_fail_mode: "closed"` → block request khi Redis down
   - **Impact:** User không thể tạo itinerary khi Redis maintenance
   - **Fix:** Hoặc implement Redis fallback, hoặc set `"open"` cho non-critical operations

3. **Cache inconsistency sau ETL**
   - **Issue:** ETL cập nhật places nhưng cache không invalidate
   - **Impact:** User thấy data cũ trong ~24 giờ
   - **Fix:** Implement cache invalidation trong ETL pipeline

### 7.2 P1 - HIGH (Nên fix sớm)

4. **Hit ratio quá thấp (16.7%)**
   - **Issue:** Cache ineffective với current patterns
   - **Impact:** DB queries nhiều, performance chậm
   - **Fix:** Optimize cache key strategy, pre-seed cache

5. **Cache key redundancy với None values**
   - **Issue:** `places:search:None:None:None:5` có 3 None values
   - **Impact:** Key dài, khó đọc, tăng memory usage
   - **Fix:** Filter out None parameters trước khi tạo key

6. **Không có Redis persistence**
   - **Issue:** Không có RDB/AOF
   - **Impact:** Mất hết cache data khi Redis restart
   - **Fix:** Enable AOF cho critical data (rate limits), cache có thể rebuild

7. **Không có environment prefix trong cache keys**
   - **Issue:** Dev/staging/prod dùng cùng cache keys
   - **Impact:** Cache collision khi share Redis instance
   - **Fix:** Add prefix như `dev:places:search:*`

8. **Guest rate limiting chưa được test**
   - **Issue:** Không có `rate:ai:guest:*` keys trong Redis
   - **Impact:** Không verify guest rate limit hoạt động
   - **Fix:** Test guest rate limit, monitor logs

### 7.3 P2 - MEDIUM (Có thể fix sau)

9. **Memory fragmentation ratio cao (7.68)**
   - **Issue:** Fragmentation cao
   - **Impact:** Memory waste
   - **Fix:** Monitor, consider activerehashing

10. **Không có connection pooling**
    - **Issue:** Per-request Redis connections
    - **Impact:** Latency cao khi high throughput
    - **Fix:** Implement connection pool cho production

11. **Không có Redis monitoring/alerting**
    - **Issue:** Không track metrics
    - **Impact:** Không biết khi Redis có vấn đề
    - **Fix:** Setup monitoring với Prometheus/Grafana

---

## 8. KHUYẾN NGHĨ

### 8.1 Immediate Actions (trước khi deploy production)

1. **Configure Redis memory limits:**
   ```yaml
   redis:
     command: >
       redis-server
       --maxmemory 256mb
       --maxmemory-policy allkeys-lru
       --save 900 1
       --save 300 10
   ```

2. **Implement ETL cache invalidation:**
   ```python
   # Trong ETL loader
   async def invalidate_destination_cache(redis: Redis | None) -> None:
       if redis:
           await redis.delete("destinations:all:v2")
           # Delete all place search keys
           keys = await redis.keys("places:search:*")
           if keys:
               await redis.delete(*keys)
   ```

3. **Fix cache key normalization:**
   ```python
   def normalize_cache_key(*parts: str | None) -> str:
       normalized = []
       for part in parts:
           if part is not None and part != "":
               encoded = urllib.parse.quote(str(part), safe="")
               normalized.append(encoded)
       return ":".join(normalized) if normalized else "default"
   ```

### 8.2 Short-term Improvements (trong 1-2 tuần)

4. **Add environment prefix:**
   ```python
   def get_cache_key_prefix() -> str:
       env = get_settings().environment
       return f"{env}:"
   ```

5. **Implement Redis health check:**
   ```python
   async def redis_health_check(redis: Redis) -> bool:
       try:
           await redis.ping()
           return True
       except Exception:
           return False
   ```

6. **Add cache metrics:**
   ```python
   cache_hit_counter = Counter("cache_hits", "Cache hit count", ["cache_type"])
   cache_miss_counter = Counter("cache_misses", "Cache miss count", ["cache_type"])
   ```

### 8.3 Long-term Improvements (trong 1-2 tháng)

7. **Implement cache warming:**
   - Pre-seed destination cache on startup
   - Pre-seed popular place searches

8. **Add Redis monitoring:**
   - Setup Redis Exporter
   - Dashboard cho: memory, hit ratio, connections, commands/sec

9. **Consider Redis alternatives cho production:**
   - Redis Cluster cho high availability
   - Memcached cho simple caching (nếu không cần persistence)

---

## 9. KẾT LUẬN

**Tổng quan:**
- Redis đang hoạt động **BẢN THẢO**, không có lỗi critical
- Implementation cache và rate limit **ĐÚNG** theo design
- Vietnamese encoding **ĐÚNG**, không có corruption

**Điểm mạnh:**
- ✅ Code quality tốt, error handling đúng
- ✅ Vietnamese encoding không có vấn đề
- ✅ Rate limit implementation robust
- ✅ Cache key normalization tốt

**Điểm yếu:**
- ❌ Redis config thiếu memory limits (P0)
- ❌ Cache inconsistency sau ETL (P0)
- ❌ Hit ratio thấp (P1)
- ❌ Không có persistence (P1)

**Khuyến nghị:** 
Ưu tiên fix P0 issues trước khi deploy production. P1/P2 có thể implement dần trong 1-2 tháng tới.

---

**Audit by:** Claude Code Agent  
**Report generated:** 2026-06-09  
**Next audit recommended:** Sau khi implement P0 fixes
