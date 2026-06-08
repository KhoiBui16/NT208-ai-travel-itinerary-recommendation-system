# Bug #1 Migration Quick Start Guide

**For:** Reviewers and operators executing migration `20260608_0006_fix_accommodation_day_ids.py`

---

## Pre-Execution (5 minutes)

### 1. Backup Database
```bash
cd <repo-root>
docker-compose exec db pg_dump -U postgres nt208_db > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Current State
```bash
cd Backend
uv run alembic current
# Expected: 20260525_0005
```

### 3. Check Affected Rows
```bash
uv run python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import get_settings

async def check():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text('''
            SELECT COUNT(*) FROM accommodations a
            WHERE EXISTS (
                SELECT 1 FROM trip_days td
                WHERE td.trip_id = a.trip_id AND td.day_number = ANY(a.day_ids)
            )
        '''))
        count = result.scalar()
        print(f'Affected accommodations: {count}')
asyncio.run(check())
"
```

---

## Execution (2 minutes)

### 1. Run Migration
```bash
cd Backend
uv run alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 20260525_0005 -> 20260608_0006
Found <N> accommodations to fix
Executing migration query...
Migration completed successfully
All accommodations verified - day_ids correctly remapped
```

---

## Post-Execution (5 minutes)

### 1. Verify Migration
```bash
uv run alembic current
# Expected: 20260608_0006
```

### 2. Verify Data (Trip 424)
```bash
uv run python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import get_settings

async def verify():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text('''
            SELECT a.id, a.name, a.day_ids FROM accommodations a WHERE a.trip_id = 424
        '''))
        rows = result.fetchall()
        for row in rows:
            print(f'Accommodation {row[0]}: {row[1]}, day_ids={row[2]}')
asyncio.run(verify())
"
# Expected: day_ids=[188] (TripDay ID, not [1])
```

### 3. Verify No Broken Data
```bash
uv run python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from src.core.config import get_settings

async def verify():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text('''
            SELECT COUNT(*) FROM accommodations a
            WHERE a.day_ids IS NOT NULL AND a.day_ids::jsonb != 'null'::jsonb
              AND NOT EXISTS (
                  SELECT 1 FROM trip_days td
                  WHERE td.id = ANY(
                      SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                  )
              )
        '''))
        count = result.scalar()
        print(f'Broken accommodations: {count}')
asyncio.run(verify())
"
# Expected: 0
```

---

## Frontend Verification (5 minutes)

### 1. Start Services
```bash
docker-compose up -d
cd Backend && uv run uvicorn src.main:app
cd Frontend && npm run dev
```

### 2. Test in Browser
1. Login to application
2. Open trip 424 (or any AI-generated trip)
3. Verify accommodation is displayed (no "Chưa có nơi ở")
4. Check accommodation details show correctly

---

## Rollback (If Needed)

```bash
cd Backend
uv run alembic downgrade -1
# Expected: Downgrade to 20260525_0005
```

---

## Troubleshooting

### Issue: "No accommodations need fixing"
- **Meaning:** All accommodations already have correct day_ids
- **Action:** Migration complete, no changes needed

### Issue: "WARNING: N accommodations still have invalid day_ids"
- **Meaning:** Some accommodations couldn't be remapped
- **Cause:** TripDays were deleted or day_ids don't match any day_number
- **Action:** Manual investigation required

### Issue: Migration fails mid-execution
- **Meaning:** Database transaction rolled back automatically
- **Action:** Check logs, fix issue, re-run migration

---

## Safety Reminders

⚠️ **ALWAYS** create backup before execution  
⚠️ **ALWAYS** verify on staging first (if available)  
⚠️ **NEVER** run migration on production without peer review  
✅ **DO** monitor console output during execution  
✅ **DO** verify results immediately after migration  

---

## Summary Checklist

- [ ] Database backup created
- [ ] Current migration state verified (20260525_0005)
- [ ] Affected accommodations counted (~50 expected)
- [ ] Migration reviewed and approved
- [ ] Migration executed successfully
- [ ] New migration state verified (20260608_0006)
- [ ] Sample trip verified (424)
- [ ] No broken accommodations remaining
- [ ] Frontend displays accommodation correctly
- [ ] Backup stored safely

---

**Duration:** 15-20 minutes total  
**Risk:** Low (with backup)  
**Rollback:** Available via `alembic downgrade -1`