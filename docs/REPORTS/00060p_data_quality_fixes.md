# 00060P Data Quality Fixes - Analysis and Implementation Plan

Date: 2026-06-08  
Branch: `fix/00060-d-local-smoke-ux-data-fix`  
Scope: Backend ETL pipeline, Redis caching, Frontend URL encoding

## Executive Summary

This analysis covers three data quality issues identified in the 00060k_r2 pre-chatbot audit:

1. **All 725 places have rating = 0** - Goong API limitation (blocking issue)
2. **Redis UTF-8 encoding broken** - Cache key generation problem (medium issue)
3. **Vietnamese URL encoding** - Frontend/Backend encoding mismatch (low issue)

## Issue 1: All Places Rating = 0

### Confirmation

```sql
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE rating = 0) as zero_rating, 
       COUNT(*) FILTER (WHERE rating > 0) as positive_rating 
FROM places;
```

Results:
- Total places: 725
- Places with rating = 0: 725 (100%)
- Places with rating > 0: 0 (0%)

### Root Cause Analysis

#### 1.1 Goong API Limitation

**Finding**: Goong Places API does not provide rating data in place detail responses.

**Evidence**:
- Raw Goong API response structure in `raw_metadata` field contains no rating fields
- Goong API documentation does not list rating as available field
- Goong is primarily a geocoding/autocomplete service, not a review platform

**Impact**:
- All places are imported with `rating: 0` by default (see `place_transformer.py:100`)
- Search results are ordered by rating (line 142 in `repository.py`), but all have same value
- No meaningful quality ranking available for users
- AI generate pipeline lacks quality signals for place selection

#### 1.2 Current ETL Behavior

**File**: `Backend/src/etl/transformers/place_transformer.py`

```python
record = {
    # ...
    "rating": poi.get("rating", 0),  # Line 100 - defaults to 0
    "review_count": poi.get("review_count", 0),  # Line 101 - defaults to 0
    # ...
}
```

**File**: `Backend/src/etl/extractors/goong_extractor.py`

```python
def _build_raw_poi(self, ...) -> dict[str, Any] | None:
    return {
        # ... NO rating field extracted from Goong API ...
        "name": str(name).strip(),
        "category": category,
        "location": location,
        # ...
    }
```

#### 1.3 Database Query Impact

**File**: `Backend/src/places/repository.py`

```python
# Line 142 - Search ordered by rating (all = 0, so meaningless)
stmt = stmt.order_by(Place.rating.desc()).limit(limit)
```

### Solutions Analysis

#### Option A: Accept Limitation (DO NOTHING)

**Pros**:
- No code changes required
- No additional API costs
- Maintains current simple ETL flow

**Cons**:
- No quality ranking for users
- AI generate pipeline lacks quality signals
- Poor UX for place discovery
- Blocking issue for data quality

**Recommendation**: ❌ NOT ACCEPTABLE - Quality ranking is essential

#### Option B: Use Review Count for Ordering (WORKAROUND)

**Implementation**:
```python
# In Backend/src/places/repository.py:142
stmt = stmt.order_by(Place.review_count.desc(), Place.id.desc()).limit(limit)
```

**Pros**:
- Simple code change
- Provides some ranking signal
- No additional API dependencies

**Cons**:
- Review count is also always 0 (Goong doesn't provide it)
- Still no meaningful quality differentiation
- Doesn't solve root problem

**Recommendation**: ❌ INSUFFICIENT - Review count is also always 0

#### Option C: Manual Rating via Admin Panel (RECOMMENDED)

**Implementation Approach**:

1. **Add admin rating endpoints** (Phase 1):
   ```python
   # Backend/src/admin/places.py (NEW FILE)
   @router.put("/admin/places/{place_id}/rating")
   async def update_place_rating(
       place_id: int,
       rating: float,  # 0.0 to 5.0
       current_user: User = Depends(require_admin)
   ):
       # Update place rating
       
   @router.post("/admin/places/batch-rating")
   async def batch_update_ratings(
       ratings: List[dict],  # [{"place_id": 123, "rating": 4.5}, ...]
       current_user: User = Depends(require_admin)
   ):
       # Batch update ratings
   ```

2. **Import rating data from external source** (Phase 2):
   - Use Google Places API for ratings (additional cost)
   - Or import from tourism databases
   - Or manual curation by content team

3. **Frontend admin interface** (Phase 3):
   - Bulk rating editor in admin panel
   - CSV import/export for ratings
   - Quality validation UI

**Pros**:
- Provides true quality ranking
- Enables manual curation
- Can import from external sources later
- Minimal API changes initially

**Cons**:
- Requires manual data entry or external API
- Needs admin panel development
- Initial data entry effort

**Recommendation**: ✅ RECOMMENDED - Best long-term solution

#### Option D: Alternative Data Source (LONG-TERM)

**Implementation**:
- Add Google Places API as secondary source
- Extract ratings from Google Places data
- Merge with existing Goong location data

**Pros**:
- High-quality rating data
- Large review database
- Rich metadata

**Cons**:
- Additional API costs
- More complex ETL pipeline
- Rate limiting concerns
- Duplicate data handling

**Recommendation**: ⚠️ CONSIDER FOR MVP2+ - Good but not immediate priority

### Implementation Plan (Option C)

#### Phase 1: Database Schema Update

```sql
-- Add rating_source column to track manual vs API ratings
ALTER TABLE places ADD COLUMN rating_source VARCHAR(20) DEFAULT 'manual';
CREATE INDEX idx_places_rating ON places(rating DESC, review_count DESC);
```

#### Phase 2: Backend Changes

**File**: `Backend/src/admin/places.py` (NEW)
```python
"""Admin endpoints for place rating management."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import require_admin
from src.core.database import get_db
from src.places.models import Place

router = APIRouter(prefix="/api/v1/admin/places", tags=["admin"])

@router.put("/{place_id}/rating")
async def update_place_rating(
    place_id: int,
    rating: float,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update rating for a single place."""
    if not 0 <= rating <= 5:
        raise HTTPException(400, "Rating must be between 0 and 5")
    
    stmt = select(Place).where(Place.id == place_id)
    result = await db.execute(stmt)
    place = result.scalar_one_or_none()
    
    if not place:
        raise HTTPException(404, "Place not found")
    
    place.rating = rating
    place.rating_source = "manual"
    await db.commit()
    
    return {"id": place.id, "rating": place.rating}

@router.post("/batch-rating")
async def batch_update_ratings(
    ratings: List[dict],
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Batch update ratings for multiple places."""
    updated = []
    for item in ratings:
        place_id = item.get("place_id")
        rating = item.get("rating")
        
        if not place_id or rating is None:
            continue
        if not 0 <= rating <= 5:
            continue
        
        stmt = select(Place).where(Place.id == place_id)
        result = await db.execute(stmt)
        place = result.scalar_one_or_none()
        
        if place:
            place.rating = rating
            place.rating_source = "manual"
            updated.append({"id": place.id, "rating": rating})
    
    await db.commit()
    return {"updated": updated}
```

#### Phase 3: Initial Data Population

**Strategy**: Assign default ratings based on place category and name patterns

```python
# Backend/src/etl/rating_seeder.py (NEW)
"""Assign initial default ratings based on heuristics."""

DEFAULT_RATINGS = {
    # Attraction-based places get higher ratings
    "attraction": 4.2,
    "nature": 4.0,
    
    # Commercial places get moderate ratings
    "food": 3.8,
    "shopping": 3.7,
    
    # Entertainment gets baseline rating
    "entertainment": 3.9,
}

async def seed_default_ratings(db: AsyncSession):
    """Assign default ratings to places with rating = 0."""
    stmt = select(Place).where(Place.rating == 0)
    result = await db.execute(stmt)
    places = result.scalars().all()
    
    for place in places:
        default = DEFAULT_RATINGS.get(place.category, 3.5)
        place.rating = default
        place.rating_source = "seeded"
    
    await db.commit()
    return len(places)
```

#### Phase 4: Update Search Ranking

**File**: `Backend/src/places/repository.py`
```python
# Line 142 - Update search ordering
stmt = stmt.order_by(
    Place.rating.desc(), 
    Place.review_count.desc(),
    Place.id.desc()  # Fallback to newest
).limit(limit)
```

### Timeline

- **Week 1**: Schema update + admin endpoints
- **Week 2**: Rating seeder + initial data population  
- **Week 3**: Frontend admin interface (if needed)
- **Week 4**: Testing and validation

## Issue 2: Redis UTF-8 Encoding Broken

### Confirmation

```bash
# Check Redis cache keys
docker compose exec redis redis-cli --scan --pattern "places:search:*"
```

Results:
- `places:search:None:à:None:5` - Broken encoding (should be "Hà Nội")
- `places:search:None:Đà:None:3` - Partial encoding

### Root Cause Analysis

#### 2.1 Cache Key Generation

**File**: `Backend/src/places/service.py:142`

```python
async def search_places(
    self,
    query: str | None = None,
    city: str | None = None,
    category: str | None = None,
    limit: int = 20,
) -> list[PlaceResponse]:
    # Build cache key from all search parameters
    cache_key = f"places:search:{query}:{city}:{category}:{limit}"
```

**Problem**: Direct string interpolation doesn't handle UTF-8 encoding properly

#### 2.2 Redis Storage

Redis stores strings as bytes, but the cache key generation doesn't normalize Vietnamese characters before creating the key.

### Solution: Normalize Cache Keys

**Implementation**: `Backend/src/shared/cache.py`

```python
import hashlib
import urllib.parse

def normalize_cache_key(*parts: str | None) -> str:
    """Normalize cache key parts to handle UTF-8 encoding.
    
    Converts None to "None" and URL-encodes all parts to ensure
    consistent cache keys regardless of Vietnamese characters.
    
    Example:
        normalize_cache_key("Hà Nội", "food", 20) 
        -> "places:search:H%E1%BB%8i%20N%E1%BB%99i:food:20"
    """
    normalized = []
    for part in parts:
        if part is None:
            normalized.append("None")
        else:
            # URL-encode to handle UTF-8 characters
            encoded = urllib.parse.quote(str(part), safe='')
            normalized.append(encoded)
    return ":".join(normalized)
```

**Update service.py**:
```python
# Line 142 in Backend/src/places/service.py
from src.shared.cache import normalize_cache_key

async def search_places(...):
    # Build normalized cache key
    cache_key = normalize_cache_key("places", "search", query, city, category, limit)
```

### Testing

```python
# Test cases
def test_normalize_cache_key():
    assert normalize_cache_key("Hà Nội", "food", 20) == "places:search:H%E1%BB%8i%20N%E1%BB%99i:food:20"
    assert normalize_cache_key(None, "Đà Nẵng", None) == "places:search:None:%C4%90%C3%A0%20N%E1%BA%B5ng:None"
    assert normalize_cache_key("", "", 5) == "places:search:::5"
```

## Issue 3: Vietnamese URL Encoding

### Confirmation

**File**: `Frontend/src/app/services/places.ts:106`

```typescript
export async function getDestinationDetail(name: string): Promise<Record<string, unknown>> {
  return api.get(`/api/v1/places/destinations/${encodeURIComponent(name)}`);
}
```

**Status**: ✅ ALREADY HANDLED - Frontend uses `encodeURIComponent()`

### Root Cause

Frontend is already encoding Vietnamese characters properly, but there may be inconsistency in other API calls.

### Solution: Standardize URL Encoding

**Implementation**: `Frontend/src/app/services/api.ts`

```typescript
// Add centralized URL encoding helper
export function buildApiPath(path: string, params: Record<string, string | number | undefined>): string {
  const encodedParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      encodedParams.set(key, String(value));
    }
  }
  const queryString = encodedParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

// Update places.ts
export async function searchPlaces(params: {
  query?: string;
  city?: string;
  category?: string;
  limit?: number;
}): Promise<PlaceResponse[]> {
  const path = buildApiPath("/api/v1/places/search", params);
  return api.get<PlaceResponse[]>(path);
}
```

### Documentation Update

Add URL encoding guidelines to `docs/04_frontend.md`:

```markdown
## URL Encoding Guidelines

All user-generated strings in API paths MUST be URL-encoded using `encodeURIComponent()`:

✅ CORRECT:
```typescript
api.get(`/api/v1/places/destinations/${encodeURIComponent(cityName)}`);
```

❌ INCORRECT:
```typescript
api.get(`/api/v1/places/destinations/${cityName}`);
```

This ensures Vietnamese characters like "Hà Nội" are properly handled.
```

## Priority Ranking

### High Priority (Blocking)
1. **Issue 1: Rating = 0** - Blocks quality user experience and AI generate quality

### Medium Priority (UX Issue)
2. **Issue 2: Redis UTF-8** - Causes cache misses and degraded performance

### Low Priority (Already Handled)
3. **Issue 3: URL Encoding** - Already implemented in frontend, just needs standardization

## Implementation Order

1. **Phase 1 (Week 1)**: Fix Redis UTF-8 encoding (quick win)
2. **Phase 2 (Week 2-3)**: Implement rating solution (Option C)
3. **Phase 3 (Week 4)**: Standardize URL encoding across frontend

## Testing Checklist

- [ ] Verify cache keys work with Vietnamese characters
- [ ] Test rating endpoints with admin user
- [ ] Run ETL seeder to populate default ratings
- [ ] Verify search results return meaningful ordering
- [ ] Test URL encoding for all Vietnamese city names
- [ ] Add integration tests for rating endpoints
- [ ] Add cache key normalization tests

## Files to Change

### Backend
- `Backend/src/places/repository.py` - Update search ordering
- `Backend/src/shared/cache.py` - Add cache key normalization
- `Backend/src/places/service.py` - Use normalized cache keys
- `Backend/src/admin/places.py` (NEW) - Admin rating endpoints
- `Backend/src/etl/rating_seeder.py` (NEW) - Default rating assignment

### Frontend  
- `Frontend/src/app/services/places.ts` - Standardize URL encoding
- `Frontend/src/app/services/api.ts` - Add centralized URL builder

### Database
- `Backend/alembic/versions/XXXX_add_rating_source.py` (NEW) - Schema migration

## Related Issues

- #00060k - Pre-chatbot source/docs/runtime audit
- #00055 - Fullstack regression test
- Issue ETL place image pipeline gap

## Next Steps

1. Create migration file for rating_source column
2. Implement cache key normalization
3. Add admin rating endpoints
4. Create rating seeder script
5. Standardize frontend URL encoding
6. Add integration tests
7. Update documentation

---

**Status**: 📋 Analysis complete, awaiting approval to proceed with implementation
**Estimated Effort**: 2-3 weeks total
**Risk Level**: Medium (database schema change required)
