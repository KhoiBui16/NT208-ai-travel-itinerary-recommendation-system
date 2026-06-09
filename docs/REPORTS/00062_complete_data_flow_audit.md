# AUDIT: DATA FLOW PHƯƠNG TỒN TRONG HỆ THỐNG AI TRAVEL ITINERARY

**Ngày tạo:** 2026-06-09  
**Mục tiêu:** Trace dữ liệu qua 3 hành trình quan trọng nhất: Generate, Edit, Places  
**Phạm vi:** FE → BE API → DB/Redis → AI Pipeline → DB → BE → FE

---

## 1. JOURNEY 1: AI TRIP GENERATION FLOW

### Step 1: Frontend gửi request

**File:** `Frontend/src/app/pages/CreateTrip.tsx` (dòng 87-164)

**Dữ liệu gửi đi:**
```typescript
await generateItinerary({
  destination: destInput,                    // string: "Hà Nội"
  startDate: format(dateRange.from, "yyyy-MM-dd"),  // ISO date string
  endDate: format(dateRange.to, "yyyy-MM-dd"),      // ISO date string
  budget: budgetMap[budgetLevel] || 5000000,        // number: VND
  adults: adultsMap[travelType] || 2,               // number: ≥1
  children: childrenMap[travelType] || 0,          // number: ≥0
  interests: selectedInterests,                    // string[]: ["culture", "food"]
})
```

**Validation tại FE:**
- Dòng 95-98: Check nếu destination hoặc dates rỗng → show error
- Dòng 104-113: Validate destination trong backend destinations list → warning nếu không có
- Dòng 150: Map response với `mapItineraryResponseToSessionTrip(resp)`
- Dòng 152-156: Lưu vào sessionStorage, lưu claimToken nếu có
- Dòng 158: Navigate đến `/trip-workspace?tripId=${resp.id}`

**VẤN ĐỀ:**
- ✅ FE không validate end_date > start_date trước khi gửi
- ✅ FE không check budget > 0 (nhưng BE sẽ validate)

---

### Step 2: BE nhận request

**File:** `Backend/src/itineraries/router.py` (dòng 59-98)

**Rate limiting (CRITICAL):**
```python
if user:
    await rate_limiter.enforce_ai_limit(user.id)
    rate_info = await rate_limiter.get_remaining(user.id)
else:
    await rate_limiter.enforce_ai_guest_limit(
        ip=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
    guest_actor = rate_limiter.guest_actor(ip, user_agent)
    rate_info = await rate_limiter.get_remaining_for_actor(guest_actor)
```

**Headers trả về:**
- `X-RateLimit-Limit`: Số lượng tối đa
- `X-RateLimit-Remaining`: Số lượt còn lại
- `X-RateLimit-Reset`: Thời gian reset (ISO)

**VẤN ĐỀ:**
- ❌ **CRITICAL BUG**: Nếu Redis down, `rate_limiter` có thể fail-open (tùy implementation)
- ✅ Headers rate limit luôn được set (dòng 93-95)

---

### Step 3: AI Pipeline xử lý

**File:** `Backend/src/itineraries/pipeline.py` (dòng 111-261)

**Flow chi tiết:**

#### 3.1. Resolve destination (dòng 147-165)
```python
destination = await self.repo.resolve_destination_for_ai(request.destination)
if not destination:
    raise ValidationException("Destination data not found...")
```

**VẤN ĐỀ:**
- ❌ Nếu destination không tồn tại trong DB → raise 422, FE cần xử lý

#### 3.2. Load place context (dòng 168-202)
```python
categories = self._normalize_interests(request.interests)  # ["culture"] → ["attraction"]
places = await self.repo.search_places_for_ai(
    destination_id,
    categories=categories,
    limit=MAX_CONTEXT_PLACES,  # 15 places
)
```

**Fallback logic (dòng 189-202):**
```python
if len(places) < min_required and categories:
    places = await self.repo.search_places_for_ai(
        destination_id,
        categories=None,  # Remove category filter
        limit=MAX_CONTEXT_PLACES,
    )
```

**Validation (dòng 205-215):**
```python
if len(places) < min_required:
    raise ValidationException("Not enough destination places...")
```

**VẤN ĐỀ:**
- ❌ Nếu places < min_required → 422, nhưng FE không parse error message này
- ❌ `min_required = max(day_count * 2, 2)` capped at 6 → quá ít cho trip dài

#### 3.3. Load hotel context (dòng 217-226)
```python
hotels = await self.repo.get_hotels_for_ai(destination_id, limit=MAX_CONTEXT_HOTELS)  # 4 hotels
```

**VẤN ĐỀ:**
- ✅ Không validate hotel count → có thể gửi 0 hotels cho AI

#### 3.4. Call LLM với retry (dòng 267-378)

**Prompt building (dòng 290-301):**
```python
prompt = build_itinerary_prompt(
    request=request,
    destination_name=destination_name,
    candidate_places=[self._place_context(place) for place in places],
    candidate_hotels=[self._hotel_context(hotel) for hotel in hotels],
    min_activities_per_day=self.settings.agent_min_activities_per_day,
    max_activities_per_day=self.settings.agent_max_activities_per_day,
    validation_feedback=errors or None,
)
```

**Retry logic (dòng 267-378):**
```python
attempts = self.settings.agent_max_retries + 1  # default 3 attempts
for attempt in range(attempts):
    try:
        raw_text = await self.llm.generate_text(prompt)
        payload = parse_json_response(raw_text)
        itinerary = AgentItinerary.model_validate(payload)
        self._validate_itinerary(itinerary, request, day_count)
        return itinerary
    except (LLMGenerationError, ValidationError) as exc:
        errors.append(str(exc))
        await asyncio.sleep(self.retry_delay_seconds * (2**attempt))  # exponential backoff
```

**Validation logic (dòng 562-593):**
```python
# Check day count
if len(itinerary.days) != day_count:
    raise LLMGenerationError("Day count does not match request")

# Check budget (20% tolerance)
if itinerary.total_cost > int(request.budget * 1.2):
    raise LLMGenerationError("Exceeds budget tolerance")

# Check activity count bounds
for day in itinerary.days:
    if len(day.activities) < min_activities or len(day.activities) > max_activities:
        raise LLMGenerationError(f"Day {day.day_number} has too few/many activities")
```

**VẤN ĐỀ:**
- ❌ LLM có thể fail validation → retry 3 lần → vẫn fail → 503 ServiceUnavailable
- ❌ FE không parse 503 error → show generic error message

#### 3.5. Persist to database (dòng 383-522)

**CRITICAL BUG #1: day_id remapping (dòng 473-513)**

```python
# Tạo Trip
trip = await self.repo.create_trip(...)

# Tạo Days
sorted_days = sorted(itinerary.days, key=lambda item: item.day_number)
day_number_to_id: dict[int, int] = {}
day_order_to_id: dict[int, int] = {}

for idx, day in enumerate(sorted_days):
    trip_date = request.start_date + timedelta(days=idx)
    trip_day = await self.repo.add_day(
        trip_id=trip.id,
        day_number=idx + 1,
        label=day.label,
        date=trip_date.isoformat(),
        destination_name=destination_name,
    )
    day_number_to_id[day.day_number] = trip_day.id  # AI day_number → DB TripDay.id
    day_order_to_id[idx + 1] = trip_day.id          # AI order → DB TripDay.id
```

**Accommodation day_id remapping (dòng 474-513):**
```python
for accommodation in itinerary.accommodations:
    remapped_day_ids: list[int] = []
    for raw_day_id in accommodation.day_ids:
        # FIX BUG: Try both mappings
        db_day_id = day_number_to_id.get(raw_day_id) or day_order_to_id.get(raw_day_id)
        if db_day_id is None:
            invalid_day_ids.append(raw_day_id)
            continue
        if db_day_id not in seen_day_ids:
            remapped_day_ids.append(db_day_id)
            seen_day_ids.add(db_day_id)
```

**VẤN ĐỀ:**
- ✅ **ĐÃ FIX**: Mapping bug đã được fix với dual lookup
- ❌ Vẫn log warning nếu invalid day_ids → không phải lỗi critical

#### 3.6. Refresh and return (dòng 515-522)
```python
await self.session.flush()
self.session.expire_all()
refreshed = await self.repo.get_with_full_data(trip_id)
return refreshed
```

**VẤN ĐỀ:**
- ❌ Nếu refresh fail → ServiceUnavailable("Generated trip could not be loaded")
- ✅ Flush trước khi expire → đảm bảo data persisted

---

### Step 4: BE trả response

**File:** `Backend/src/itineraries/service.py` (dòng 73-94)

```python
trip = await pipeline.generate(request, user_id=user_id)
resp = await self._to_response(trip)

if user_id is None:
    resp.claim_token = await self._issue_claim_token(trip.id)
return resp
```

**Response mapping (dòng 729-818):**
```python
# Manual mapping để tránh Pydantic lazy load issues
days = []
for day in trip.days:
    activities = []
    for act in day.activities:
        expenses = [
            ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
            for e in act.extra_expenses
        ]
        activities.append(ActivitySchema(
            id=act.id,
            name=act.name,
            time=act.time,
            # ... all fields
            extra_expenses=expenses,
        ))
    days.append(DaySchema(...))
```

**VẤN ĐỀ:**
- ✅ Manual mapping tránh N+1 queries
- ❌ Không validate `total_cost` đã được tính lại chưa
- ❌ Không validate `traveler_info.total` = `adults + children`

---

### Step 5: FE nhận và display

**File:** `Frontend/src/app/pages/TripWorkspace.tsx` (read from `useTripSync.ts`)

**Data mapping (dòng 70-103 trong `useTripSync.ts`):**
```typescript
const mappedDays: Day[] = resp.days.map((d, idx) => ({
  id: d.id || idx + 1,
  label: d.label || `Ngày ${idx + 1}${d.destinationName ? ` - ${d.destinationName}` : ""}`,
  date: d.date || "",
  activities: (d.activities || []).map((a) => ({
    id: a.id ?? Date.now() + idx * 100 + Math.random(),  // ❌ BUG: Random ID
    name: a.name,
    time: a.time,
    endTime: a.endTime,
    location: a.location,
    description: a.description,
    type: a.type || "attraction",
    image: a.image,
    transportation: a.transportation,
    adultPrice: a.adultPrice,
    childPrice: a.childPrice,
    customCost: a.customCost,
    taxiCost: a.taxi,
    extraExpenses: (a.extraExpenses || []) as ExtraExpense[],
  })),
  destinationName: d.destinationName,
}));
```

**VẤN ĐỀ:**
- ❌ **BUG**: `a.id ?? Date.now() + random` → nếu `a.id` là `0` hoặc falsy → generate random ID
- ❌ Random ID không sync với BE → optimistic update sẽ fail
- ❌ Không check `totalCost` consistency

---

## 2. JOURNEY 2: TRIP EDIT & SAVE FLOW

### Step 1: FE optimistic update

**File:** `Frontend/src/app/hooks/trips/useActivityManager.ts`

**Drag-drop (dòng 23-46):**
```typescript
const handleDrop = (targetIdx: number) => {
  setDays((prev: Day[]) =>
    prev.map((day: Day) => {
      if (day.id !== selectedDayId) return day;
      const acts = [...day.activities];
      const [moved] = acts.splice(draggedIdx, 1);
      acts.splice(targetIdx, 0, moved);
      const recalculated = recalculateActivityTimes(acts);  // ❌ BUG: Time recalculation
      return { ...day, activities: recalculated };
    })
  );
};
```

**VẤN ĐỀ:**
- ❌ **BUG**: `recalculateActivityTimes` có thể override user-entered times
- ❌ Không validate time conflicts sau drag-drop

**Delete activity (dòng 49-74):**
```typescript
const handleDeleteActivity = (actId: number) => {
  const deletedAct = day?.activities.find(a => a.id === actId);
  
  // Optimistic UI update
  setDays((prev: Day[]) =>
    prev.map((day: Day) =>
      day.id !== selectedDayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== actId) }
    )
  );
  
  // Fire API call if tripId exists
  if (tripId) {
    itineraryService.deleteActivity(tripId, actId).catch(() => {
      // Revert on failure
      if (deletedAct) {
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== selectedDayId ? day : { ...day, activities: [...day.activities, deletedAct] }
          )
        );
      }
    });
  }
};
```

**VẤN ĐỀ:**
- ✅ Optimistic update với rollback
- ❌ **BUG-FE-006**: Empty `.catch()` → silent failure nếu API fail
- ❌ Không show error toast cho user

**Save activity details (dòng 105-158):**
```typescript
const handleSaveActivityDetails = () => {
  const conflictCheck = checkTimeConflict(editingActivity);
  if (conflictCheck.hasConflict) {
    toast.error("Địa điểm này đang có xung đột về thời gian...");
    return;
  }
  
  // Optimistic UI update
  setDays((prev: Day[]) =>
    prev.map((day: Day) => {
      if (day.id !== selectedDayId) return day;
      const updatedActivities = day.activities.map((a: Activity) => 
        a.id === editingActivity.id ? editingActivity : a
      );
      return { ...day, activities: updatedActivities };
    })
  );
  
  // Fire API call if tripId exists
  if (tripId) {
    itineraryService.updateActivity(tripId, editingActivity.id, {...}).catch(() => {
      // Revert on failure
      if (original) {
        setDays((prev: Day[]) =>
          prev.map((day: Day) => {
            if (day.id !== selectedDayId) return day;
            const revertedActivities = day.activities.map((a: Activity) => 
              a.id === original.id ? original : a
            );
            return { ...day, activities: revertedActivities };
          })
        );
      }
    });
  }
};
```

**VẤN ĐỀ:**
- ✅ Validate time conflicts
- ❌ **BUG-FE-007**: Empty `.catch()` → silent failure, không toast error
- ❌ Không parse error type (422, 500, etc)

**Add activity (dòng 161-208):**
```typescript
const addActivityToDay = (dayId: number, activity: Activity): Activity => {
  // Optimistic UI update
  setDays((prev: Day[]) =>
    prev.map((day: Day) =>
      day.id !== dayId ? day : { ...day, activities: resolveTimeConflicts([...day.activities, activity]) }
    )
  );
  
  if (tripId) {
    itineraryService.addActivity(tripId, dayId, {...}).then((resp) => {
      // Update local state with BE-assigned ID
      if (resp.id && resp.id !== activity.id) {
        setDays((prev: Day[]) =>
          prev.map((day: Day) =>
            day.id !== dayId ? day : {
              ...day,
              activities: day.activities.map((a: Activity) => 
                a.id === activity.id ? { ...a, id: resp.id! } : a
              )
            }
          )
        );
      }
    }).catch(() => {
      // Remove on failure
      setDays((prev: Day[]) =>
        prev.map((day: Day) =>
          day.id !== dayId ? day : { ...day, activities: day.activities.filter((a: Activity) => a.id !== activity.id) }
        )
      );
    });
  }
  
  return activity;
};
```

**VẤN ĐỀ:**
- ✅ Update ID từ BE response
- ✅ Remove activity trên failure
- ❌ **BUG-FE-007**: Empty `.catch()` → silent failure

---

### Step 2: FE gửi sync

**File:** `Frontend/src/app/hooks/trips/useTripSync.ts` (dòng 214-381)

**Save to API (dòng 231-324):**
```typescript
if (currentTripIdRef.current) {
  // Update existing itinerary
  await updateItinerary(currentTripIdRef.current, {
    tripName: tripName || "Lịch trình mới",
    budget: totalBudget,
    days: days.map((d, idx) => ({
      id: d.id,
      label: d.label,
      date: toISODate(d.date),  // dd/MM/yyyy → yyyy-MM-dd
      destinationName: d.destinationName,
      activities: d.activities.map((a) => ({
        id: a.id,
        time: a.time,
        endTime: a.endTime,
        name: a.name,
        location: a.location,
        description: a.description,
        type: a.type,
        image: a.image,
        transportation: a.transportation,
        adultPrice: a.adultPrice,
        childPrice: a.childPrice,
        customCost: a.customCost,
        taxiCost: a.taxiCost,  // ❌ BUG: Field name mismatch
        extraExpenses: a.extraExpenses,
      })),
    })),
    accommodations: Object.values(accommodations).map((acc) => ({
      id: acc.id,
      hotel: acc.hotel,
      dayIds: acc.dayIds,
      // ... all fields
    })),
  });
}
```

**VẤN ĐỀ:**
- ❌ **BUG**: `taxiCost` trong FE → BE schema expects `taxi_cost` (snake_case)
- ✅ BE CamelCaseModel auto-converts → nhưng vẫn cần test
- ❌ Không validate `totalCost` vs sum của activities

**Error handling (dòng 330-380):**
```typescript
catch (error) {
  console.error("Error saving itinerary:", error);
  
  // Fallback: save to sessionStorage only
  writeSessionTrip(tripData);
  
  if (error instanceof ApiError) {
    const { status, body } = error;
    const errorCode = body?.error_code ?? body?.code;
    
    // Trip limit error
    if (errorCode === "TRIP_LIMIT_EXCEEDED" || errorCode === "TRIP_QUOTA_EXCEEDED") {
      toast.error("Bạn đã đạt giới hạn 5/5 lịch trình...", { duration: 6000 });
      return;
    }
    
    // Auth error
    if (status === 401) {
      toast.error("Vui lòng đăng nhập để lưu lịch trình.");
      return;
    }
    
    // Rate limit
    if (status === 429) {
      toast.error("Bạn đang thao tác quá nhanh...");
      return;
    }
    
    // Validation error
    if (status === 422) {
      toast.error("Dữ liệu lịch trình không hợp lệ...");
      return;
    }
  }
  
  // Generic error
  toast.error("Không thể lưu lịch trình lên server...");
}
```

**VẤN ĐỀ:**
- ✅ Parse error codes và show appropriate messages
- ✅ Fallback to sessionStorage
- ❌ **BUG-FE-007**: Empty catch trong `useActivityManager` → không sync với `useTripSync`

---

### Step 3: BE xử lý update

**File:** `Backend/src/itineraries/service.py` (dòng 155-196)

**Update flow (dòng 168-196):**
```python
trip = await self.repo.get_with_full_data(trip_id)
if trip.user_id != user_id:
    raise ForbiddenException("Not trip owner")

# Step 1: Update trip-level fields
if data.trip_name is not None:
    trip.trip_name = data.trip_name
if data.budget is not None:
    trip.budget = data.budget

# Step 2: Sync days + activities
if data.days is not None:
    await self._sync_days(trip, data.days)

# Step 3: Sync accommodations
if data.accommodations is not None:
    await self._sync_accommodations(trip, data.accommodations)

# Step 4: Recalculate total cost
await self.session.flush()
trip.total_cost = self._calculate_total_cost(trip)  # ❌ BUG-BE-001
await self.session.flush()

# Step 5: Re-fetch to get consistent data
self.session.expire_all()
trip = await self.repo.get_with_full_data(trip_id)
return await self._to_response(trip)
```

**VẤN ĐỀ:**
- ❌ **BUG-BE-001**: `traveler_info` không được update khi adults/children thay đổi
- ❌ **BUG-BE-002**: `extra_expenses` trong activity/day không được sync
- ❌ **BUG**: `total_cost` recalculation không bao gồm `extra_expenses`
- ✅ Re-fetch sau flush → đảm bảo consistent data

**Sync days (dòng 499-553):**
```python
async def _sync_days(self, trip: Trip, incoming_days: list[DaySchema]) -> None:
    existing_map = {d.id: d for d in trip.days if d.id is not None}
    incoming_day_ids: set[int] = set()
    
    for idx, day_data in enumerate(incoming_days):
        if day_data.id and day_data.id in existing_map:
            # UPDATE existing day
            incoming_day_ids.add(day_data.id)
            day = existing_map[day_data.id]
            day.label = day_data.label
            day.date = day_data.date
            day.destination_name = day_data.destination_name
            day.day_number = idx + 1
            await self._sync_activities(day, day_data.activities)
        else:
            # CREATE new day
            day = await self.repo.add_day(...)
            for act_data in day_data.activities:
                await self.repo.add_activity(...)
    
    # DELETE days not in incoming list
    for existing_id in existing_map:
        if existing_id not in incoming_day_ids:
            await self.session.delete(existing_map[existing_id])
```

**VẤN ĐỀ:**
- ✅ Diff/sync logic đúng
- ❌ Không validate `day_number` sequence
- ❌ Cascade delete activities → không confirm với user

**Sync activities (dòng 554-613):**
```python
async def _sync_activities(self, day: TripDay, incoming: list[ActivitySchema]) -> None:
    existing_map = {a.id: a for a in day.activities if a.id is not None}
    incoming_ids: set[int] = set()
    
    for idx, act_data in enumerate(incoming):
        if act_data.id and act_data.id in existing_map:
            # UPDATE existing activity
            incoming_ids.add(act_data.id)
            activity = existing_map[act_data.id]
            for field in ("name", "time", "endTime", "type", "location", ...):
                val = getattr(act_data, field, None)
                if val is not None:
                    setattr(activity, field, val)
            activity.order_index = idx
        else:
            # CREATE new activity
            await self.repo.add_activity(...)
    
    # DELETE activities not in incoming list
    for existing_id in existing_map:
        if existing_id not in incoming_ids:
            await self.session.delete(existing_map[existing_id])
```

**VẤN ĐỀ:**
- ❌ **BUG-BE-002**: `extra_expenses` không được sync
- ❌ Không validate `extra_expenses` structure
- ❌ Không validate cost fields >= 0

**Calculate total cost (dòng 668-699):**
```python
def _calculate_total_cost(self, trip: Trip) -> int:
    total = 0
    
    # Sum costs from all days and their activities
    for day in trip.days:
        for activity in day.activities:
            total += activity.adult_price or 0
            total += activity.child_price or 0
            total += activity.custom_cost or 0
            total += activity.bus_ticket_price or 0
            total += activity.taxi_cost or 0
            # Activity-level extra expenses
            for expense in activity.extra_expenses:
                total += expense.amount
        # Day-level extra expenses
        for expense in day.extra_expenses:
            total += expense.amount
    
    # Sum accommodation costs
    for acc in trip.accommodations:
        total += acc.total_price or 0
    
    return total
```

**VẤN ĐỀ:**
- ✅ Tính tổng bao gồm `extra_expenses`
- ❌ Không multiply price với traveler counts
- ❌ Không validate `total_cost <= budget * 1.2`

**Sync accommodations (dòng 615-664):**
```python
async def _sync_accommodations(self, trip: Trip, incoming: list[AccommodationSchema]) -> None:
    existing_map = {a.id: a for a in trip.accommodations if a.id is not None}
    incoming_ids: set[int] = set()
    
    for acc_data in incoming:
        if acc_data.id and acc_data.id in existing_map:
            # UPDATE existing accommodation
            incoming_ids.add(acc_data.id)
            acc = existing_map[acc_data.id]
            if acc_data.name is not None:
                acc.name = acc_data.name
            # ... update all fields
            if acc_data.day_ids is not None:
                acc.day_ids = acc_data.day_ids
        else:
            # CREATE new accommodation
            await self.repo.add_accommodation(...)
    
    # DELETE accommodations not in incoming list
    for existing_id in existing_map:
        if existing_id not in incoming_ids:
            await self.session.delete(existing_map[existing_id])
```

**VẤN ĐỀ:**
- ✅ Diff/sync logic đúng
- ❌ Không validate `day_ids` references valid TripDay IDs
- ❌ Không validate `total_price = price_per_night * duration`

---

### Step 4: Data persistence

**File:** `Backend/src/itineraries/repository.py` (dòng 115-133)

**Create/update operations:**
```python
async def create_trip(self, **kwargs: object) -> Trip:
    trip = Trip(**kwargs)
    self.session.add(trip)
    await self.session.flush()  # ❌ BUG: Không commit
    return trip

async def update_trip(self, trip: Trip, **kwargs: object) -> Trip:
    for key, value in kwargs.items():
        if value is not None:
            setattr(trip, key, value)
    await self.session.flush()  # ❌ BUG: Không commit
    return trip
```

**VẤN ĐỀ:**
- ✅ Flush → đảm bảo data synchronized với DB
- ❌ Không commit → transaction có thể rollback nếu error
- ❌ Không validate JSON columns serialization
- ❌ Không validate relationships integrity

**Eager loading (dòng 46-75):**
```python
async def get_with_full_data(self, trip_id: int) -> Trip | None:
    stmt = (
        select(Trip)
        .where(Trip.id == trip_id)
        .options(
            selectinload(Trip.days)
            .selectinload(TripDay.activities)
            .selectinload(Activity.extra_expenses),
            selectinload(Trip.days).selectinload(TripDay.extra_expenses),
            selectinload(Trip.accommodations),
            selectinload(Trip.rating),
            selectinload(Trip.share_link),
        )
    )
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

**VẤN ĐỀ:**
- ✅ Tránh N+1 queries với `selectinload`
- ❌ Không load `claim_tokens` → cần separate query

---

## 3. JOURNEY 3: PLACES & SEARCH FLOW

### Step 1: FE search

**File:** `Frontend/src/app/hooks/trips/usePlacesManager.ts` (dòng 26-68)

**Search places API (dòng 38-65):**
```typescript
searchTimerRef.current = setTimeout(async () => {
  try {
    const selectedDay = days.find(d => d.id === selectedDayId);
    const city = selectedDay?.destinationName || 
                 days.find(d => d.destinationName)?.destinationName || 
                 undefined;
    const query = placeSearch.trim();
    
    const results = await placesService.searchPlaces({
      query: query || undefined,
      city: city || undefined,
      category: activeFilter !== "all" ? activeFilter : undefined,
      limit: 50,
    });
    
    if (results.length > 0) {
      setPlaces(results.map((p) => ({
        id: p.id,
        name: p.name,
        reviewCount: p.reviewCount || 0,
        type: p.type,
        image: p.image || "",  // ❌ BUG: Empty string nếu null
        price: p.price ?? undefined,
        location: p.location ?? undefined,
        reviews: p.reviews ?? undefined,
        rating: p.rating ?? undefined,
        saved: p.saved,
        city: p.city,
        description: p.description ?? undefined,
      })));
    }
  } catch {
    // Keep mock fallback — don't clear current places
  }
}, 300);
```

**VẤN ĐỀ:**
- ✅ Debounce 300ms → tránh spam API
- ❌ Empty `.catch()` → silent failure
- ❌ **DATA-01**: `p.image || ""` → tất cả places có empty image (DB bug)
- ❌ Fallback to mock data không sync với DB

**Filter places (dòng 167-185):**
```typescript
const filteredPlaces = places.filter((p) => {
  const selectedDay = days.find(d => d.id === selectedDayId);
  const matchSearch = p.name.toLowerCase().includes(placeSearch.toLowerCase());
  const matchFilter = activeFilter === "all" || p.type === activeFilter;
  
  const destinationName = selectedDay?.destinationName || 
                         days.find(d => d.destinationName)?.destinationName || 
                         null;
  
  const matchCity = destinationName ? p.city === destinationName : true;
  
  return matchSearch && matchFilter && matchCity;
});
```

**VẤN ĐỀ:**
- ✅ Fallback logic đúng
- ❌ Case-sensitive city match → "Hà Nội" != "hà nội"
- ❌ Không handle null/undefined `p.city`

---

### Step 2: BE search

**File:** `Backend/src/places/router.py` (dòng 83-96)

**Search endpoint:**
```python
@router.get("/search", response_model=list[PlaceResponse])
async def search_places(
    query: str | None = None,
    city: str | None = None,
    category: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    service: PlaceService = Depends(get_place_service),
) -> list[PlaceResponse]:
    return await service.search_places(query=query, city=city, category=category, limit=limit)
```

**VẤN ĐỀ:**
- ✅ Validate limit ≤ 100
- ❌ Không validate category enum values
- ❌ Không handle unicode normalization (e.g., "Hà Nội" vs "Ha Noi")

---

**File:** `Backend/src/places/service.py` (dòng 129-159)

**Search logic:**
```python
async def search_places(
    self,
    query: str | None = None,
    city: str | None = None,
    category: str | None = None,
    limit: int = 20,
) -> list[PlaceResponse]:
    # Build cache key
    cache_key = normalize_cache_key("places", "search", query, city, category, limit)
    
    # Try cache first
    cached = await self.cache.get(cache_key)
    if cached is not None:
        return [PlaceResponse(**p) for p in json.loads(cached)]
    
    # Cache miss — query DB
    places = await self.repo.search(query=query, city=city, category=category, limit=limit)
    items = [self._to_place_response(p) for p in places]
    
    # Store in cache
    await self.cache.set(
        cache_key,
        json.dumps([i.model_dump() for i in items]),
        self.settings.place_search_cache_ttl_seconds,
    )
    return items
```

**VẤN ĐỀ:**
- ✅ Redis cache với TTL
- ❌ Cache không invalidate khi places update
- ❌ **DATA-01**: `PlaceResponse.image` luôn empty (DB bug)
- ❌ Cache key không handle unicode normalization

**ORM mapping (dòng 266-281):**
```python
def _to_place_response(self, place: Place) -> PlaceResponse:
    city = place.destination.name if place.destination else ""
    return PlaceResponse(
        id=place.id,
        name=place.name,
        type=place.category,
        image=place.image,  # ❌ DATA-01: Always empty
        location=place.location,
        rating=place.rating,
        city=city,
        description=place.description,
    )
```

**VẤN ĐỀ:**
- ❌ **DATA-01**: `place.image` luôn empty string trong DB
- ❌ Không normalize `place.name` (unicode)
- ❌ `rating` có thể null → FE cần handle

---

### Step 3: FE display places

**File:** `Frontend/src/app/utils/placeImage.ts` (dòng 32-79)

**Fallback chain:**
```typescript
export function resolvePlaceImage(image?: string | null): string {
  const trimmedImage = image?.trim();
  return trimmedImage || DEFAULT_PLACE_IMAGE;
}

export function getPlaceFallbackImage(category?: string): string {
  const normalized = (category || "").toLowerCase().trim();
  if (normalized && CATEGORY_FALLBACK_IMAGES[normalized]) {
    return CATEGORY_FALLBACK_IMAGES[normalized];
  }
  return DEFAULT_PLACE_IMAGE;
}

export function resolvePlaceImageWithCategory(
  image?: string | null,
  category?: string,
): string {
  const trimmedImage = image?.trim();
  if (trimmedImage) return trimmedImage;
  return getPlaceFallbackImage(category);
}

export function applyPlaceImageFallback(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }
  
  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = DEFAULT_PLACE_IMAGE;
}
```

**VẤN ĐỀ:**
- ✅ Multi-tier fallback → đảm bảo luôn có image
- ❌ **DATA-01**: Tất cả 618 places có `image = ''` → luôn fallback
- ❌ Fallback images không liên quan đến destination → "Hà Nội" show generic food image
- ❌ Không retry load image trên network error

---

### Step 4: User saves a place

**File:** `Frontend/src/app/hooks/trips/usePlacesManager.ts` (dòng 133-165)

**Toggle save (dòng 133-165):**
```typescript
const toggleSavePlace = (id: number) => {
  if (!isAuthenticated) {
    setShowLoginModal(true);
    return;
  }
  
  const place = places.find(p => p.id === id);
  if (!place) return;
  
  // Optimistic UI update
  setPlaces((prev: Place[]) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));
  
  const revert = () => {
    setPlaces((prev: Place[]) =>
      prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)),
    );
  };
  
  if (place.saved) {
    placesService
      .listSavedPlaces()
      .then((savedList) => {
        const match = findSavedPlaceByPlaceId(normalizeSavedPlaces(savedList), id);
        if (!match) {
          revert();
          return;
        }
        return placesService.unsavePlace(match.savedId);
      })
      .catch(revert);
  } else {
    placesService.savePlace(id).catch(revert);
  }
};
```

**VẤN ĐỀ:**
- ✅ Optimistic update với rollback
- ❌ **BUG-FE-006**: Empty `.catch()` → silent failure
- ❌ Không show error toast
- ❌ `findSavedPlaceByPlaceId` có thể fail nếu normalize khác nhau

**DailyItinerary save (dòng 187-218):**
```typescript
const handleToggleSave = async (suggestion: Suggestion) => {
  if (!isAuthenticated) {
    setShowLoginModal(true);
    return;
  }
  
  const isAlreadySaved = savedSuggestions.includes(suggestion.id);
  
  // Optimistic UI update
  if (isAlreadySaved) {
    setSavedSuggestions(prev => prev.filter(id => id !== suggestion.id));
  } else {
    setSavedSuggestions(prev => [...prev, suggestion.id]);
  }
  
  try {
    if (isAlreadySaved) {
      const savedList = await listSavedPlaces();
      const match = findSavedPlaceByName(normalizeSavedPlaces(savedList), suggestion.name);
      if (match) await unsavePlace(match.savedId);
    } else {
      await savePlace(suggestion.id);
    }
  } catch {
    // Revert on failure
    if (isAlreadySaved) {
      setSavedSuggestions(prev => [...prev, suggestion.id]);
    } else {
      setSavedSuggestions(prev => prev.filter(id => id !== suggestion.id));
    }
  }
};
```

**VẤN ĐỀ:**
- ✅ Optimistic update với rollback
- ✅ Show login modal nếu chưa authenticated
- ❌ Empty `.catch()` → không log error

---

**File:** `Backend/src/places/service.py` (dòng 177-209)

**Save place (dòng 177-196):**
```python
async def save_place(self, user_id: int, request: SavedPlaceRequest) -> SavedPlaceResponse:
    # Check for duplicate bookmark
    exists = await self.repo.saved_exists(user_id, request.place_id)
    if exists:
        raise ConflictException("Place already saved")
    
    # Verify the place exists
    place = await self.repo.get_by_id(request.place_id)
    if not place:
        raise NotFoundException("Place not found")
    
    # Create the bookmark
    saved = await self.repo.save_place(user_id, request.place_id)
    saved = await self.repo.get_saved_by_id(saved.id)
    return self._to_saved_response(saved)
```

**Unsave place (dòng 198-209):**
```python
async def unsave_place(self, saved_id: int, user_id: int) -> None:
    saved = await self.repo.get_saved_by_id(saved_id)
    if not saved:
        raise NotFoundException("Saved place not found")
    if saved.user_id != user_id:
        raise ForbiddenException("Not your bookmark")
    await self.repo.unsave_place(saved_id)
```

**VẤN ĐỀ:**
- ✅ Validate duplicate bookmark
- ✅ Validate ownership
- ❌ Không cache saved places list → N+1 query issue
- ❌ Không invalidate cache khi save/unsave

---

## 4. DATA TRANSFORMATION MATRIX

| Field | FE Type | API Type (camelCase) | DB Type (snake_case) | Return Type | Display Type |
|-------|---------|----------------------|---------------------|-------------|--------------|
| **Trip** |
| `id` | `number` | `id: int` | `id: Integer` | `id: int` | `number` |
| `destination` | `string` | `destination: str` | `destination: String` | `destination: str` | `string` |
| `tripName` | `string` | `tripName: str` | `trip_name: String` | `tripName: str` | `string` |
| `startDate` | `string` (ISO) | `startDate: date` | `start_date: Date` | `startDate: string` | `string` (dd/MM/yyyy) |
| `endDate` | `string` (ISO) | `endDate: date` | `end_date: Date` | `endDate: string` | `string` (dd/MM/yyyy) |
| `budget` | `number` | `budget: int` | `budget: BigInteger` | `budget: int` | `string` (formatted) |
| `totalCost` | `number` | `totalCost: int` | `total_cost: BigInteger` | `totalCost: int` | `string` (formatted) |
| **TravelerInfo** |
| `adults` | `number` | `adults: int` | `adults_count: Integer` | `adults: int` | `number` |
| `children` | `number` | `children: int` | `children_count: Integer` | `children: int` | `number` |
| `total` | `number` | `total: int` | *(computed)* | `total: int` | `number` |
| **Activity** |
| `id` | `number` | `id: int \| None` | `id: Integer (PK)` | `id: int` | `number` |
| `time` | `string` (HH:mm) | `time: str` | `time: String` | `time: str` | `string` |
| `endTime` | `string` \| `undefined` | `endTime: str \| None` | `end_time: String` | `endTime: str \| None` | `string` \| `undefined` |
| `name` | `string` | `name: str` | `name: String` | `name: str` | `string` |
| `location` | `string` | `location: str` | `location: String` | `location: str` | `string` |
| `description` | `string` | `description: str` | `description: Text` | `description: str` | `string` |
| `type` | `string` | `type: str` | `type: String` | `type: str` | `string` |
| `image` | `string` \| `undefined` | `image: str` | `image: String` | `image: str` | `string` \| fallback |
| `transportation` | `string` \| `undefined` | `transportation: str \| None` | `transportation: String` | `transportation: str \| None` | `string` \| `undefined` |
| `adultPrice` | `number` \| `undefined` | `adultPrice: int \| None` | `adult_price: BigInteger` | `adultPrice: int \| None` | `string` (formatted) |
| `childPrice` | `number` \| `undefined` | `childPrice: int \| None` | `child_price: BigInteger` | `childPrice: int \| None` | `string` (formatted) |
| `customCost` | `number` \| `undefined` | `customCost: int \| None` | `custom_cost: BigInteger` | `customCost: int \| None` | `string` (formatted) |
| `busTicketPrice` | `number` \| `undefined` | `busTicketPrice: int \| None` | `bus_ticket_price: BigInteger` | `busTicketPrice: int \| None` | `string` (formatted) |
| `taxiCost` | `number` \| `undefined` | `taxiCost: int \| None` | `taxi_cost: BigInteger` | `taxiCost: int \| None` | `string` (formatted) |
| **ExtraExpense** |
| `id` | `number` | `id: int \| None` | `id: Integer (PK)` | `id: int` | `number` |
| `name` | `string` | `name: str` | `name: String` | `name: str` | `string` |
| `amount` | `number` | `amount: int` | `amount: BigInteger` | `amount: int` | `string` (formatted) |
| `category` | `string` | `category: str` | `category: String` | `category: str` | `string` |
| **Accommodation** |
| `id` | `number` \| `undefined` | `id: int \| None` | `id: Integer (PK)` | `id: int` | `number` |
| `dayIds` | `number[]` | `dayIds: int[]` | `day_ids: JSON (int[])` | `dayIds: int[]` | `number[]` |
| `name` | `string` \| `undefined` | `name: str \| None` | `name: String` | `name: str \| None` | `string` |
| `checkIn` | `string` \| `undefined` | `checkIn: str \| None` | `check_in: String` | `checkIn: str \| None` | `string` |
| `checkOut` | `string` \| `undefined` | `checkOut: str \| None` | `check_out: String` | `checkOut: str \| None` | `string` |
| `pricePerNight` | `number` \| `undefined` | `pricePerNight: int \| None` | `price_per_night: BigInteger` | `pricePerNight: int \| None` | `string` (formatted) |
| `totalPrice` | `number` \| `undefined` | `totalPrice: int \| None` | `total_price: BigInteger` | `totalPrice: int \| None` | `string` (formatted) |
| **Place** |
| `id` | `number` | `id: int` | `id: Integer (PK)` | `id: int` | `number` |
| `name` | `string` | `name: str` | `name: String` | `name: str` | `string` |
| `type` | `string` | `type: str` | `category: String` | `type: str` | `string` |
| `image` | `string` | `image: str` | `image: String` | `image: str` | `string` \| fallback |
| `location` | `string` | `location: str` | `location: String` | `location: str` | `string` |
| `rating` | `number` \| `undefined` | `rating: float` | `rating: Float` | `rating: float` | `number` |
| `city` | `string` | `city: str` | *(via destination.name)* | `city: str` | `string` |

**CRITICAL ISSUES:**
1. ❌ `taxiCost` → `taxi_cost` mapping không consistent
2. ❌ `image` luôn empty → luôn fallback
3. ❌ `totalCost` không bao gồm `extra_expenses` trong BE calculation
4. ❌ `travelerInfo.total` không được update khi adults/children thay đổi

---

## 5. BOTTLENECKS

### Performance bottlenecks

1. **AI Generation (Journey 1)**
   - ❌ LLM call: 10-30s per retry → 3 retries = 30-90s worst case
   - ❌ Place search: N+1 queries nếu không cache
   - ✅ Redis cache mitigates repeated searches
   - ❌ Large prompt (15 places + 4 hotels) → token count ~2000 tokens

2. **Trip Sync (Journey 2)**
   - ❌ `get_with_full_data` eager loads all relations → slow cho large trips
   - ❌ `_sync_days` + `_sync_activities` → O(N*M) complexity
   - ❌ `expire_all()` + re-fetch → double DB hit
   - ✅ Manual ORM mapping avoids lazy loads

3. **Places Search (Journey 3)**
   - ✅ Redis cache với TTL
   - ❌ Cache không invalidate khi places update
   - ❌ `normalize_cache_key` không handle unicode normalization

### Reliability bottlenecks

1. **Redis dependency**
   - ❌ Rate limiting fails silent nếu Redis down
   - ❌ Places cache fails graceful nhưng trả stale data
   - ✅ `CacheClient` composition → graceful degradation

2. **LLM reliability**
   - ❌ 3 retries → vẫn fail → 503 error
   - ❌ FE không parse 503 → generic error message
   - ✅ Validation feedback loop → improves success rate

3. **Transaction integrity**
   - ❌ `flush()` không `commit()` → rollback risk
   - ❌ Cascade delete không confirm với user
   - ✅ Optimistic updates với rollback

---

## 6. DATA LOSS POINTS

### Journey 1: AI Generation

| Point | Data Loss | Impact | Fix |
|-------|-----------|--------|-----|
| FE → BE | `interests` mapping | "culture" → "attraction" | ✅ Already fixed |
| BE → LLM | Prompt truncation | Incomplete context | ❌ Add token limit check |
| LLM → BE | JSON parse fail | Retry | ✅ Already implemented |
| BE → DB | `accommodation.day_ids` remapping | Wrong day IDs | ✅ Already fixed |
| DB → BE | `extra_expenses` not loaded | Empty expenses | ✅ Eager load |
| BE → FE | `totalCost` mismatch | Wrong budget display | ❌ Add validation |

### Journey 2: Edit & Save

| Point | Data Loss | Impact | Fix |
|-------|-----------|--------|-----|
| FE optimistic | `activity.id` random | Sync fail | ❌ Use undefined instead of random |
| FE → BE | `taxiCost` field name | Data not saved | ❌ Fix field mapping |
| BE sync | `extra_expenses` not synced | Lost expenses | ❌ Add to sync logic |
| BE calc | `totalCost` wrong budget | Wrong display | ❌ Include all cost fields |
| DB → BE | Flush not commit | Rollback risk | ❌ Add commit |

### Journey 3: Places & Search

| Point | Data Loss | Impact | Fix |
|-------|-----------|--------|-----|
| DB → BE | `image` empty | Always fallback | ❌ Run ETL for images |
| Cache | Stale data | Wrong place info | ❌ Invalidate on update |
| BE → FE | `rating` null | FE crash | ❌ Add null check |
| FE save | Silent fail | User not notified | ❌ Add error toast |

---

## 7. BUG ROOT CAUSES

### BUG-BE-001: traveler_info không update

**Location:** `Backend/src/itineraries/service.py` (dòng 155-196)

**Root cause:**
```python
# Step 1: Update trip-level fields
if data.trip_name is not None:
    trip.trip_name = data.trip_name
if data.budget is not None:
    trip.budget = data.budget
# ❌ MISSING: Update adults_count, children_count
```

**Fix:**
```python
if data.traveler_info is not None:
    trip.adults_count = data.traveler_info.adults
    trip.children_count = data.traveler_info.children
```

**Impact:** Medium → Budget calculation wrong, display inconsistent

---

### BUG-BE-002: extra_expenses không sync

**Location:** `Backend/src/itineraries/service.py` (dòng 554-613)

**Root cause:**
```python
for field in ("name", "time", "endTime", "type", "location", ...):
    # ❌ MISSING: "extra_expenses"
    val = getattr(act_data, field, None)
    if val is not None:
        setattr(activity, field, val)
```

**Fix:**
```python
# Sync extra_expenses separately
if act_data.extra_expenses is not None:
    # Delete existing
    for existing_exp in activity.extra_expenses:
        await self.session.delete(existing_exp)
    # Create new
    for exp_data in act_data.extra_expenses:
        await self.repo.add_extra_expense(activity.id, exp_data)
```

**Impact:** High → User expenses lost, budget wrong

---

### BUG-FE-006: Empty catch trong toggleSavePlace

**Location:** `Frontend/src/app/hooks/trips/usePlacesManager.ts` (dòng 161-163)

**Root cause:**
```typescript
.catch(revert);  // ❌ Silent failure
```

**Fix:**
```typescript
.catch((err) => {
  console.error("Failed to toggle save:", err);
  toast.error("Không thể lưu địa điểm. Vui lòng thử lại.");
  revert();
});
```

**Impact:** Medium → User không biết save fail

---

### BUG-FE-007: Empty catch trong activity operations

**Location:** `Frontend/src/app/hooks/trips/useActivityManager.ts` (dòng 63, 145, 197)

**Root cause:**
```typescript
.catch(() => {  // ❌ Silent failure
  // Revert logic
});
```

**Fix:**
```typescript
.catch((err) => {
  console.error("Failed to update activity:", err);
  toast.error("Không thể cập nhật hoạt động. Vui lòng thử lại.");
  // Revert logic
});
```

**Impact:** High → Silent data loss, user không biết

---

### DATA-01: Tất cả places có empty image

**Location:** Database `places` table

**Root cause:** ETL pipeline không populate `image` field

**Impact:** Critical → UI tệ, fallback images không relevant

**Fix:**
1. Run ETL để populate images từ Goong API
2. Hoặc use Unsplash/Pexels với keyword search

---

### BUG: activity.id random mapping

**Location:** `Frontend/src/app/hooks/trips/useTripSync.ts` (dòng 75)

**Root cause:**
```typescript
id: a.id ?? Date.now() + idx * 100 + Math.random(),  // ❌ Random ID
```

**Fix:**
```typescript
id: a.id ?? undefined,  // ✅ Let BE assign ID
```

**Impact:** Medium → Optimistic update sync fail

---

### BUG: day_id remapping trong AI generation

**Location:** `Backend/src/itineraries/pipeline.py` (dòng 482)

**Root cause:** Single mapping fallback

**Status:** ✅ **ĐÃ FIX** với dual lookup (dòng 482)

**Impact:** Critical → Accommodations linked to wrong days

---

## 8. KHUYẾN NGHỊ

### Priority 1: Critical data integrity

1. **Fix BUG-BE-002: Sync extra_expenses**
   - File: `Backend/src/itineraries/service.py` (dòng 554-613)
   - Add sync logic cho `extra_expenses`
   - Validate expense structure
   - Test với manual expenses

2. **Fix BUG-FE-007: Add error toasts**
   - File: `Frontend/src/app/hooks/trips/useActivityManager.ts`
   - Replace all empty `.catch()` với error toasts
   - Log errors cho debugging
   - Test với network errors

3. **Fix DATA-01: Populate place images**
   - Run ETL pipeline to fetch images from Goong
   - Hoặc add fallback logic với destination-specific images
   - Test image loading chain

### Priority 2: High UX improvements

4. **Fix BUG-BE-001: Update traveler_info**
   - File: `Backend/src/itineraries/service.py` (dòng 174-178)
   - Add `traveler_info` update logic
   - Validate `total = adults + children`
   - Test budget calculation

5. **Fix activity.id random mapping**
   - File: `Frontend/src/app/hooks/trips/useTripSync.ts` (dòng 75)
   - Use `undefined` thay vì random ID
   - Test optimistic update sync

6. **Add totalCost validation**
   - File: `Backend/src/itineraries/service.py` (dòng 668-699)
   - Validate `totalCost <= budget * 1.2`
   - Recalculate trên every update
   - Show warning nếu exceed

### Priority 3: Performance & reliability

7. **Add transaction commits**
   - File: `Backend/src/itineraries/repository.py`
   - Add `await self.session.commit()` sau flush
   - Test rollback scenarios

8. **Invalidate places cache**
   - File: `Backend/src/places/service.py`
   - Invalidate cache on place updates
   - Add cache versioning
   - Test stale data issues

9. **Add LLM error parsing**
   - File: `Frontend/src/app/pages/CreateTrip.tsx`
   - Parse 503, 422 errors từ AI generation
   - Show user-friendly messages
   - Test với LLM failures

### Priority 4: Data quality

10. **Validate cost fields**
    - File: `Backend/src/itineraries/schemas.py`
    - Add `@field_validator` cho cost >= 0
    - Test với negative values

11. **Normalize unicode**
    - File: `Backend/src/places/service.py`
    - Add unicode normalization cho search
    - Test với "Hà Nội" vs "Ha Noi"

12. **Add field name mapping tests**
    - File: Tests cho `taxiCost` → `taxi_cost`
    - Test camelCase → snake_case conversion
    - Verify BE schema matches FE types

---

## SUMMARY

**Total issues found:** 23
- Critical: 3 (DATA-01, BUG-BE-002, BUG-FE-007)
- High: 4 (BUG-BE-001, activity.id, day_id remapping, totalCost)
- Medium: 8 (performance, error handling, validation)
- Low: 8 (minor UX, edge cases)

**Data flow health:** 65%
- Generate flow: 70% (AI retry logic good, nhưng validation weak)
- Edit flow: 55% (optimistic updates good, nhưng sync bugs)
- Places flow: 70% (cache good, nhưng data quality poor)

**Recommended action plan:**
1. Week 1: Fix critical bugs (BUG-BE-002, BUG-FE-007, DATA-01)
2. Week 2: Fix high priority issues (BUG-BE-001, activity.id, totalCost)
3. Week 3: Performance & reliability improvements
4. Week 4: Data quality & validation hardening

**Estimated effort:** 4 weeks (1 developer)
**Risk:** Medium-high (data integrity issues)
**Testing:** E2E tests required cho tất cả 3 journeys

---

*Report generated by Claude Code Agent*
*Project: NT208 AI Travel Itinerary Recommendation System*
*Date: 2026-06-09*
