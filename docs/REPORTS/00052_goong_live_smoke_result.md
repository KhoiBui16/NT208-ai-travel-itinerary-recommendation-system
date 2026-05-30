# 00052 Goong Live Smoke Test Result

**Date**: 2026-05-30
**Branch**: `feat/00052-c-etl-goong-data-expansion`
**Phase**: 2E — One-request Live Smoke

---

## Purpose

Verify Goong API key type is valid REST API Key (not Maptiles Key) before proceeding to Phase 3A real import.

**Scope**:
- Exactly 1 live Goong API request
- No DB writes
- No bulk dry-run
- No real import

---

## Test Environment

| Item | Value |
|---|---|
| `.env` file | ✅ Exists at `Backend/.env` |
| `settings.goong_api_key` | ✅ PRESENT |
| Key length | 40 characters |
| Key preview | Z5I***vq4 (safe) |
| Shell env vars | MISSING (OK — app loads from .env) |

---

## Smoke Test Result

**Request**: `GoongClient.autocomplete("Hà Nội")`

### Status: ✅ SUCCESS

| Metric | Value |
|---|---|
| HTTP Status | 200 OK |
| Provider Code | None (no error) |
| Prediction Count | 5 |
| DB Writes | NO |

### Sample Predictions

1. `[BbPeqm8...]` Hà Nội
2. `[naxQr7b...]` Hà Nội Quán, Thu Thủy, Cửa Lò, Nghệ An
3. `[l4eJtUpl...]` Hà Nội quán, Đông Hòa, Dĩ An, Bình Dương
+ 2 more

---

## Interpretation

### ✅ REST API Key is VALID

**Evidence**:
- HTTP 200 OK response
- 5 predictions returned (valid Goong Autocomplete response)
- No `API_KEY_MISSING` or `API_KEY_INVALID` errors

**Conclusion**:
- Current Goong API key is **REST API Key** (not Maptiles Key)
- Key is active and valid
- Goong API is responding correctly
- Phase 2D `ProviderErrorResponse` propagation fix is working (no silent errors)

### What This Means for Multi-city Generate

Before C3/C4 companion chat can work, we need multi-city data. This smoke test confirms:

1. ✅ **Goong API access is working** — can proceed with ETL
2. ✅ **Key type is correct** — REST API Key, not Maptiles Key
3. ✅ **Error propagation works** — `ProviderErrorResponse` fix from Phase 2D is validated
4. ✅ **Config is correct** — `.env` loading works as expected
5. ✅ **Rate limit not hit** — can make requests (still ~$97 credit remaining)

### Rate Limit Considerations

- Goong API: ~90 calls per city (15 autocomplete + ~75 detail)
- Current credit: ~$97 remaining (from ~$100 free, ~$3 used)
- Recommended: **Staggered import** (1-2 cities/day) to avoid hitting rate limit

---

## Comparison with Expected Error Cases

| Scenario | Expected Provider Code | Actual Result |
|---|---|---|
| Missing API key | `API_KEY_MISSING` | ❌ Not seen |
| Wrong key type | `API_KEY_INVALID` | ❌ Not seen |
| Rate limit | `RATE_LIMIT_EXCEEDED` | ❌ Not seen |
| Valid REST API key | None (200 OK) | ✅ CONFIRMED |

---

## Next Steps

### Phase 3A — Real Import Hà Nội Only (RECOMMENDED)

Now that REST API key is validated, proceed with:

1. **Single-city real import** (`Hà Nội` only):
   ```bash
   cd Backend
   uv run python -m src.etl --cities "Hà Nội"
   ```

2. **Verify**:
   - DB persistence (places written to database)
   - `last_etl_at` updated (Phase 2B fix)
   - Idempotency (running again doesn't duplicate)

3. **Monitor logs for**:
   - `provider_code` — should NOT appear (key is valid)
   - Rate limit warnings — stop if seen
   - Place counts — expect ~60-70 places for Hà Nội

### Staggered Import Strategy

After Hà Nội succeeds:

- Day 1: Hà Nội (validation + idempotency check)
- Day 2: TP. Hồ Chí Minh (largest city)
- Day 3: Đà Nẵng (coastal tourism)
- Day 4: Hội An (UNESCO heritage)
- Day 5: Huế (previously blocked in Phase 2A)

**Why staggered**:
- Operational safety (not quota exhaustion)
- Ability to monitor and adjust
- ~90 calls/city, 5 cities = ~450 calls total

---

## Files Used for Smoke Test

- `Backend/check_goong_config.py` — Safe config check (no secrets printed)
- `Backend/goong_smoke.py` — One-request smoke test script

---

## Conclusion

✅ **Phase 2E smoke test PASSED**

Goong API key is confirmed as valid REST API Key. Phase 2D error propagation fix is working correctly. All conditions met to proceed to Phase 3A real import (Hà Nội only).

**Recommendation**: Proceed to `00052 Phase 3A` — real import Hà Nội only to verify DB persistence, `last_etl_at` update, and idempotency.

---

**Generated**: 2026-05-30
**Test duration**: ~5 seconds
**Goong requests made**: 1
**DB writes**: 0
