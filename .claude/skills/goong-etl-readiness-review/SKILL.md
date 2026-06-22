---
name: goong-etl-readiness-review
description: Check Goong API coverage, ETL pipeline completeness, data richness for intelligent itinerary generation. Use before C3/C4 work and before improving the generate pipeline. Output is a Vietnamese readiness report under docs/REPORTS/phase_*_data_readiness.md.
allowed-tools: Read, Grep, Glob, Bash(docker:*), Bash(curl:*)
---

# Goong ETL Readiness Review

Use this skill to assess whether the Goong/ETL data layer is rich enough for intelligent itinerary generation.

## Read First

1. `docs/05_database_etl.md`
2. `docs/REPORTS/phase_goong_etl_coverage_analysis.md` (if exists)
3. `Backend/src/geo/goong_client.py`
4. `Backend/src/etl/extractors/goong_extractor.py`
5. `Backend/src/etl/loaders/`
6. `Backend/alembic/versions/` (check latest migration for places schema)

## Goong API Coverage Checklist

### Endpoints currently used

- [ ] `GET /1.2/places/autocomplete` — category-based place search
- [ ] `GET /1.2/places/{place_id}` — place detail (rating, review_count, address, geometry)
- [ ] `GET /1.2/geocoding` — address to lat/lng + city bias

### Endpoints NOT used (gaps)

- [ ] `GET /1.2/directions` — route planning, travel time between places
- [ ] `GET /1.2/distancematrix` — travel duration matrix for multi-stop optimization
- [ ] Place `photos`/`images` not stored in DB
- [ ] `opening_hours` not extracted from place_detail

### Data richness

- [ ] Places count per city
- [ ] Hotel data source: YAML (test-only) or ETL from Goong?
- [ ] Categories available: how many, from which keywords?
- [ ] Lat/lng available for all places?
- [ ] `rating`, `review_count`, `user_rating` in DB?
- [ ] `avg_cost` or price level available?

### ETL pipeline quality

- [ ] Extract: 5 categories × 3 keywords per city = 15 autocomplete calls
- [ ] Transform: validation, deduplication, field mapping
- [ ] Load: insert with `ON CONFLICT DO UPDATE`?
- [ ] Cache invalidation: Redis key pattern for places?
- [ ] Retry on API error?
- [ ] Error log for failed items?

### City coverage

- [ ] Hà Nội: fully populated?
- [ ] Đà Nẵng: populated?
- [ ] TP.HCM (Hồ Chí Minh): populated?
- [ ] Other cities?

## Commands to Run

```powershell
# Check how many places are in DB
docker compose exec db psql -U postgres -d dulichviet -c "SELECT COUNT(*), city FROM places GROUP BY city;"

# Check places with rating
docker compose exec db psql -U postgres -d dulichviet -c "SELECT name, rating, review_count FROM places WHERE rating IS NOT NULL LIMIT 10;"

# Check if opening_hours exists
docker compose exec db psql -U postgres -d dulichviet -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'places' AND column_name LIKE '%hour%';"

# Check latest migration
docker compose exec db psql -U postgres -d dulichviet -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'places' ORDER BY column_name;"
```

## Output Format

```markdown
# Phase C3 Data Readiness — Goong/ETL Coverage

## Goong API Usage (as-implemented)
- Endpoints used: ...
- Endpoints NOT used: ...

## Data Richness
- Places count by city: ...
- Hotel data source: ...
- Rating/review_count: ...
- Opening hours: ...
- Photos: ...
- Lat/lng: ...

## Gaps
1. Gap description
   - Impact on itinerary intelligence
   - Recommended fix

## Readiness: READY / PARTIALLY_READY / NOT_READY

## Recommended next action
```

Write to `docs/REPORTS/phase_c3_data_readiness.md`.