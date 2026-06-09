# REDIS ISSUES TRACKER - 00062

> **Status:** ✅ PARTIALLY RESOLVED by PR #86 (00062)
> **Resolution:** ISSUE-001 (Redis memory limit) fixed with `maxmemory 128mb` and `allkeys-lru` policy. Other issues remain open.

**Created:** 2026-06-09
**Source:** Redis comprehensive audit
**Status:** Partially resolved

---

## P0 - CRITICAL (Must fix before production)

### ISSUE-001: Redis No Memory Limit ✅ RESOLVED
- **Severity:** P0 - CRITICAL
- **Component:** Redis Configuration
- **Description:** Redis maxmemory=0, có thể consume hết RAM
- **Impact:** System crash khi Redis fill memory
- **Location:** `docker-compose.yml`
- **Fix:** ✅ Applied in PR #86
  ```yaml
  redis:
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
  ```
- **Resolution:** Redis now has 128mb memory limit with LRU eviction policy
- **Assignee:** RESOLVED

### ISSUE-002: Cache Inconsistency After ETL
- **Severity:** P0 - CRITICAL  
- **Component:** ETL Pipeline
- **Description:** ETL cập nhật places/hotels nhưng cache không invalidate
- **Impact:** User thấy data cũ trong 24 giờ
- **Location:** `Backend/src/etl/loaders/db_loader.py`
- **Fix:** Implement cache invalidation trong ETL
- **Estimated effort:** 2-3 giờ
- **Assignee:** TBD

### ISSUE-003: Rate Limit Fail-Closed Blocking Users
- **Severity:** P0 - CRITICAL
- **Component:** Rate Limiter
- **Description:** Redis down → block all AI requests (ai_rate_limit_fail_mode="closed")
- **Impact:** User không thể tạo itinerary khi Redis maintenance
- **Location:** `Backend/src/core/config.py`, `Backend/src/core/rate_limiter.py`
- **Fix:** Implement Redis fallback hoặc change fail-open mode
- **Estimated effort:** 4-6 giờ
- **Assignee:** TBD

---

## P1 - HIGH (Should fix soon)

### ISSUE-004: Cache Hit Ratio Too Low (16.7%)
- **Severity:** P1 - HIGH
- **Component:** Cache Strategy
- **Description:** Cache ineffective với current key patterns
- **Impact:** DB queries nhiều, performance chậm
- **Location:** `Backend/src/places/service.py`
- **Fix:** Optimize cache key strategy, pre-seed cache
- **Estimated effort:** 1-2 ngày
- **Assignee:** TBD

### ISSUE-005: Cache Key Redundancy with None Values
- **Severity:** P1 - HIGH
- **Component:** Cache Key Generation
- **Description:** Keys như `places:search:None:None:None:5` có redundant None
- **Impact:** Key dài, khó đọc, tăng memory
- **Location:** `Backend/src/shared/cache.py`
- **Fix:** Filter out None parameters trong normalize_cache_key()
- **Estimated effort:** 1-2 giờ
- **Assignee:** TBD

### ISSUE-006: No Redis Persistence
- **Severity:** P1 - HIGH
- **Component:** Redis Configuration  
- **Description:** Không có RDB/AOF, mất data khi restart
- **Impact:** Rate limit counters reset, mất cache
- **Location:** `docker-compose.yml`
- **Fix:** Enable AOF cho critical data
- **Estimated effort:** 30 phút
- **Assignee:** TBD

### ISSUE-007: No Environment Prefix in Cache Keys
- **Severity:** P1 - HIGH
- **Component:** Cache Key Generation
- **Description:** Dev/staging/prod dùng cùng cache keys
- **Impact:** Cache collision khi share Redis
- **Location:** `Backend/src/shared/cache.py`
- **Fix:** Add environment prefix
- **Estimated effort:** 1-2 giờ
- **Assignee:** TBD

### ISSUE-008: Guest Rate Limiting Untested
- **Severity:** P1 - HIGH
- **Component:** Rate Limiter
- **Description:** Không có `rate:ai:guest:*` keys, chưa verify hoạt động
- **Impact:** Không biết guest rate limit có work không
- **Location:** `Backend/src/core/rate_limiter.py`
- **Fix:** Test guest rate limit, monitor logs
- **Estimated effort:** 2-3 giờ
- **Assignee:** TBD

---

## P2 - MEDIUM (Can fix later)

### ISSUE-009: Memory Fragmentation High (7.68)
- **Severity:** P2 - MEDIUM
- **Component:** Redis Memory Management
- **Description:** Fragmentation ratio cao
- **Impact:** Memory waste
- **Location:** Redis configuration
- **Fix:** Monitor fragmentation, consider activerehashing
- **Estimated effort:** 1 giờ research + monitoring setup
- **Assignee:** TBD

### ISSUE-010: No Connection Pooling
- **Severity:** P2 - MEDIUM
- **Component:** Redis Connection Management
- **Description:** Per-request connections, không có pool
- **Impact:** Latency cao khi high throughput
- **Location:** `Backend/src/core/dependencies.py`
- **Fix:** Implement connection pool cho production
- **Estimated effort:** 4-6 giờ
- **Assignee:** TBD

### ISSUE-011: No Redis Monitoring/Alerting
- **Severity:** P2 - MEDIUM
- **Component:** Observability
- **Description:** Không track Redis metrics
- **Impact:** Không biết khi Redis có vấn đề
- **Location:** Infrastructure monitoring
- **Fix:** Setup Prometheus/Grafana dashboard
- **Estimated effort:** 1-2 ngày
- **Assignee:** TBD

---

## TRACKING

### Completed
- *No issues completed yet*

### In Progress
- *No issues in progress yet*

### Blocked
- *No blocked issues*

---

## NEXT STEPS

1. **Immediate (this week):**
   - Fix ISSUE-001 (Redis memory limit) - 15 phút
   - Create task branch cho ISSUE-002 (ETL cache invalidation)

2. **Short-term (next 2 weeks):**
   - Implement ISSUE-002, ISSUE-003 (ETTL cache + rate limiter fallback)
   - Fix ISSUE-005, ISSUE-007 (cache key improvements)

3. **Long-term (next 1-2 months):**
   - Address ISSUE-004 (cache optimization)
   - Setup monitoring (ISSUE-011)

---

**Last updated:** 2026-06-09  
**Next review:** After P0 fixes completed
