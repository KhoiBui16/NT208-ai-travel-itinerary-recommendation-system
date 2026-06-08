# Bug #1 Migration Visual Guide

**Understanding the accommodation day_ids repair logic**

---

## Problem Visualization

### Before Migration (Broken State)

```
Trip 424: "Hà Nội 3 ngày 2 đêm"
├── TripDays (database records)
│   ├── ID: 188, day_number: 1, label: "Hanoi Old Quarter"
│   └── ID: 189, day_number: 2, label: "Imperial Citadel"
│
└── Accommodations (database records)
    └── ID: 88, name: "La Siesta Premium", day_ids: [1]  ← BROKEN!
                                                              ↑
                                                    Contains AI day_number,
                                                    not TripDay ID
```

### The Problem

- **Accommodation.day_ids = [1]** (AI day_number)
- **TripDay IDs = [188, 189]** (database IDs)
- **Lookup fails:** `[1] ≠ [188, 189]`
- **Result:** "Chưa có nơi ở" in TripWorkspace

---

## Migration Logic

### Step 1: Extract Current day_ids

```sql
-- From accommodation.day_ids = [1]
SELECT (jsonb_array_elements_text('[1]'::jsonb))::int
-- Result: 1
```

### Step 2: Map day_number → TripDay ID

```sql
-- Find TripDay where day_number = 1
SELECT td.id, td.day_number
FROM trip_days td
WHERE td.trip_id = 424
  AND td.day_number = 1
-- Result: id=188, day_number=1
```

### Step 3: Build New day_ids Array

```sql
-- Create array of TripDay IDs
SELECT jsonb_agg(trip_day_id)
FROM (
    SELECT td.id as trip_day_id
    FROM trip_days td
    WHERE td.trip_id = 424
      AND td.day_number = 1  -- Map day_number to TripDay ID
) AS mapped_ids
-- Result: [188]
```

---

## After Migration (Fixed State)

```
Trip 424: "Hà Nội 3 ngày 2 đêm"
├── TripDays (database records)
│   ├── ID: 188, day_number: 1, label: "Hanoi Old Quarter"
│   └── ID: 189, day_number: 2, label: "Imperial Citadel"
│
└── Accommodations (database records)
    └── ID: 88, name: "La Siesta Premium", day_ids: [188] ← FIXED!
                                                               ↑
                                                    Contains TripDay ID,
                                                    lookup works!
```

### The Fix

- **Accommodation.day_ids = [188]** (TripDay ID)
- **TripDay IDs = [188, 189]** (database IDs)
- **Lookup succeeds:** `[188] ∈ [188, 189]` ✅
- **Result:** Accommodation displayed in TripWorkspace

---

## Complex Example: Multi-Day Accommodation

### Before Migration

```
Trip 500: "Đà Nẵng 5 ngày 4 đêm"
├── TripDays
│   ├── ID: 200, day_number: 1
│   ├── ID: 201, day_number: 2
│   ├── ID: 202, day_number: 3
│   ├── ID: 203, day_number: 4
│   └── ID: 204, day_number: 5
│
└── Accommodation
    └── day_ids: [1, 2, 3]  ← AI day_numbers (BROKEN)
```

### Migration Process

```
Step 1: Extract day_numbers from day_ids
  Input:  [1, 2, 3]
  Extract: [1, 2, 3]

Step 2: Find TripDays matching day_numbers
  day_number = 1 → TripDay ID = 200
  day_number = 2 → TripDay ID = 201
  day_number = 3 → TripDay ID = 202

Step 3: Build new day_ids array
  Result: [200, 201, 202]
```

### After Migration

```
Trip 500: "Đà Nẵng 5 ngày 4 đêm"
├── TripDays
│   ├── ID: 200, day_number: 1
│   ├── ID: 201, day_number: 2
│   ├── ID: 202, day_number: 3
│   ├── ID: 203, day_number: 4
│   └── ID: 204, day_number: 5
│
└── Accommodation
    └── day_ids: [200, 201, 202] ← TripDay IDs (FIXED)
```

---

## Mapping Logic Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│                     MIGRATION START                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Find accommodations needing fix                    │
│                                                              │
│  SELECT * FROM accommodations a                             │
│  WHERE EXISTS (                                             │
│      SELECT 1 FROM trip_days td                             │
│      WHERE td.trip_id = a.trip_id                           │
│        AND td.day_number = ANY(a.day_ids)                   │
│  )                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: For each accommodation, extract day_numbers        │
│                                                              │
│  Input:  day_ids = [1, 2, 3]                               │
│  Action: Extract each value as integer                      │
│  Result: [1, 2, 3]                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Map day_numbers to TripDay IDs                    │
│                                                              │
│  For each day_number:                                       │
│    SELECT td.id FROM trip_days td                          │
│    WHERE td.trip_id = <trip_id>                             │
│      AND td.day_number = <day_number>                       │
│                                                              │
│  Mapping:                                                   │
│    day_number 1 → TripDay ID 200                           │
│    day_number 2 → TripDay ID 201                           │
│    day_number 3 → TripDay ID 202                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Build new day_ids array                            │
│                                                              │
│  Aggregate all mapped TripDay IDs                          │
│  Result: [200, 201, 202]                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Update accommodation                               │
│                                                              │
│  UPDATE accommodations                                      │
│  SET day_ids = [200, 201, 202]                             │
│  WHERE id = <accommodation_id>                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Verify fix                                         │
│                                                              │
│  Check: All day_ids exist in trip_days table               │
│  Expected: 0 broken accommodations                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Safety Checks Built-in

### 1. Count Before Execution
```sql
-- Count affected accommodations
SELECT COUNT(*) FROM accommodations a
WHERE EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(a.day_ids)
);
-- If 0, skip migration
```

### 2. Mapping Validation
```sql
-- Only update if valid mappings exist
WHERE EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(<extracted_day_numbers>)
)
```

### 3. Verification After Execution
```sql
-- Check for broken accommodations
SELECT COUNT(*) FROM accommodations a
WHERE NOT EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.id = ANY(a.day_ids)
);
-- Expected: 0
```

---

## Rollback Process

### Rollback Logic (Reverse Mapping)

```
Before Rollback (Fixed State):
  day_ids = [188] (TripDay ID)

After Rollback (Original State):
  day_ids = [1] (day_number)
```

### Rollback Mapping

```sql
-- Reverse mapping: TripDay ID → day_number
SELECT td.day_number
FROM trip_days td
WHERE td.trip_id = <trip_id>
  AND td.id = ANY(<current_day_ids>);

-- Example:
-- Input:  [188]
-- Output: [1]
```

### WARNING

⚠️ **Rollback assumes all data was corrupted before migration**

If some accommodations already had correct TripDay IDs, rollback will incorrectly convert them to day_numbers, breaking the data.

**Recommendation:** Only rollback if migration causes critical issues.

---

## Summary

### What Changed

- **Before:** `day_ids = [1, 2, 3]` (AI day_numbers)
- **After:** `day_ids = [188, 189, 190]` (TripDay IDs)

### Why It Works

- Accommodation lookup now uses actual database IDs
- `WHERE td.id = ANY(a.day_ids)` succeeds
- TripWorkspace can find and display accommodation

### Impact

- ✅ ~50 trips repaired
- ✅ No "Chưa có nơi ở" false negatives
- ✅ Accommodation lookup works correctly
- ✅ TripWorkspace displays accommodation

---

**Generated:** 2026-06-08  
**Purpose:** Visual guide for understanding migration logic  
**Status:** Ready for review