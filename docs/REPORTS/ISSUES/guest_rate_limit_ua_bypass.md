# ISSUE: Guest Rate Limit Bypass via User-Agent Spoofing

**Ngày phát hiện:** 2026-05-27  
**Severity:** Medium  
**Status:** Open  
**Phát hiện bởi:** Kiro Agent (system test 2026-05-27)

---

## Mô tả

Guest AI rate limit (`POST /api/v1/itineraries/generate`) có thể bị bypass bằng cách thay đổi `User-Agent` header trong mỗi request.

## Root Cause

Rate limit key cho guest được tính theo fingerprint:

```python
fingerprint = f"{ip or 'unknown'}|{user_agent or 'unknown'}"
digest = sha256(fingerprint.encode("utf-8")).hexdigest()[:16]
actor = f"guest:{digest}"
```

Redis key: `rate:ai:guest:{hash(ip+ua)}:{YYYYMMDD}`

Khi User-Agent thay đổi, fingerprint thay đổi → key Redis khác → counter mới → bypass hoàn toàn.

## Bằng chứng thực tế (2026-05-27)

```powershell
# UA1: 3 lần → lần 4 = 429 (đúng)
curl -H "User-Agent: TestUA1/1.0" POST /itineraries/generate  # 503 (Gemini timeout)
curl -H "User-Agent: TestUA1/1.0" POST /itineraries/generate  # 503
curl -H "User-Agent: TestUA1/1.0" POST /itineraries/generate  # 503
curl -H "User-Agent: TestUA1/1.0" POST /itineraries/generate  # 429 ✅ rate limited

# UA2: lần 1 → 201 (bypass!)
curl -H "User-Agent: TestUA2/2.0" POST /itineraries/generate  # 201 ✅ BYPASS
```

Với UA2, request thành công và tạo được trip đầy đủ (3 ngày × 5 hoạt động).

## Impact

- Attacker có thể tạo vô số AI requests bằng cách rotate User-Agent
- Mỗi lần đổi UA = 3 lượt mới
- Dễ tự động hóa với script đơn giản
- Tốn Gemini API quota và server resources

## Severity Assessment

| Yếu tố | Đánh giá |
|---|---|
| Exploitability | Dễ — chỉ cần thay header |
| Impact | Medium — tốn API quota, không lộ data |
| Scope | Guest only (auth user dùng user_id, không bị ảnh hưởng) |
| Severity | **Medium** |

## Giải pháp đề xuất

### Option 1: IP-only fingerprint (đơn giản nhất)
```python
actor = f"guest:{sha256(ip.encode()).hexdigest()[:16]}"
```
- Ưu: Không thể bypass bằng UA
- Nhược: Nhiều user cùng IP (NAT, VPN) bị chung quota

### Option 2: IP + device fingerprint (tốt hơn)
- Thêm fingerprint từ Accept-Language, Accept-Encoding, screen resolution (qua FE)
- Khó bypass hơn nhưng vẫn không hoàn hảo

### Option 3: Stricter IP-based limit + CAPTCHA
- Rate limit theo IP (không dùng UA)
- Sau khi hết quota → yêu cầu CAPTCHA hoặc đăng ký

### Option 4: Token bucket per IP (recommended)
- Dùng IP làm primary key
- Thêm UA như secondary signal (không phải primary)
- Nếu IP đã hết quota, UA khác cũng không được

## Workaround hiện tại

Không có workaround tự động. Cần code fix.

## Files liên quan

- `Backend/src/core/rate_limiter.py` — `guest_actor()` method
- `Backend/src/itineraries/router.py` — `enforce_ai_guest_limit()` call

## Liên kết

- Xem thêm: `docs/REPORTS/ISSUES/guest_trip_no_limit.md`
- Test report: `docs/REPORTS/phase_full_system_test_2026_05_27.md`
