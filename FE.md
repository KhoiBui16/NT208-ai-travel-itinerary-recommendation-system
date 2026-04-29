# FE.md — Frontend Analysis & Migration Guide (MVP2)

> **Branch:** `feat/frontend-revamp` (đã pull về local, CHƯA merge vào `main`)
> **Mục đích:** Phân tích chi tiết tất cả thay đổi trên FE để BE biết cần adapt những gì.

---

## 1. Tổng quan Branch `feat/frontend-revamp`

### 1.1 Thống kê thay đổi

| Metric | Giá trị |
|--------|---------|
| Tổng dòng code thay đổi | ~20,408 |
| Files mới thêm | ~35+ |
| Files sửa | ~15+ |
| Cấu trúc folder | Thay đổi hoàn toàn (thêm `/src/`) |

### 1.2 Cấu trúc folder MỚI

```
Frontend/
├── main.tsx                           ← Entry point (giữ nguyên)
├── FE_docs.md                         ← Documentation FE
├── styles/
│   ├── index.css
│   └── theme.css
└── src/                               ← ⚠️ THÊM /src/ so với branch cũ
    ├── main.tsx                       ← Entry point
    └── app/
        ├── App.tsx                    ← RouterProvider setup
        ├── routes.tsx                ← 10+ routes mới
        ├── pages/
        │   ├── TripWorkspace.tsx     ← ✅ TRANG CHÍNH MỚI (22KB)
        │   ├── DailyItinerary.tsx    ← ✅ Hiển thị ngày (33KB)
        │   ├── CompanionDemo.tsx       ← ✅ Demo companion (9KB)
        │   ├── CreateTrip.tsx        ← ⚠️ Form tạo trip — KHÔNG gọi BE API
        │   ├── ManualTripSetup.tsx   ← ✅ Setup thủ công (18KB)
        │   ├── TripHistory.tsx       ← ⚠️ Đọc localStorage, KHÔNG gọi BE
        │   ├── Home.tsx
        │   ├── TripPlanning.tsx
        │   └── ItineraryView.tsx
        ├── components/
        │   ├── FloatingAIChat.tsx        ← ⚠️ MOCK — setTimeout, ko WS
        │   ├── ContextualSuggestionsPanel.tsx ← ⚠️ MOCK — mockSuggestions
        │   ├── ActivityDetailModal.tsx    ← Modal chi tiết (24KB)
        │   ├── AddPlaceModal.tsx          ← Thêm places (MỚI)
        │   ├── PlaceSelectionModal.tsx     ← Modal chọn place (18KB)
        │   ├── TripAccommodation.tsx       ← Lưu trú (22KB)
        │   ├── BudgetTracker.tsx           ← Budget tracking (14KB)
        │   ├── TripTimeline.tsx            ← Timeline view (MỚI)
        │   ├── TripSidebar.tsx             ← Sidebar (MỚI)
        │   ├── TripBudgetSidebar.tsx       ← Budget sidebar (MỚI)
        │   ├── TopActionBar.tsx            ← Action bar (MỚI)
        │   ├── SavedSuggestions.tsx         ← Saved items (MỚI)
        │   ├── CalendarModal.tsx            ← Date picker (MỚI)
        │   ├── EditTravelersModal.tsx       ← Travelers edit (MỚI)
        │   ├── AddDaysModal.tsx             ← Thêm ngày (MỚI)
        │   ├── BudgetDetailModal.tsx        ← Budget chi tiết (MỚI)
        │   ├── PlaceInfoModal.tsx           ← Place info (MỚI)
        │   ├── companion/
        │   │   ├── DailyBrief.tsx
        │   │   ├── LiveBudgetBar.tsx
        │   │   ├── PlaceSuggestions.tsx
        │   │   └── SmartReminders.tsx
        │   ├── figma/
        │   │   └── ImageWithFallback.tsx
        │   ├── Header.tsx
        │   └── ui/                        ← 30+ Radix/shadcn components
        ├── hooks/
        │   ├── trips/                     ← ⚠️ NESTED trong /trips/
        │   │   ├── useActivityManager.ts  ← CRUD activities (7KB)
        │   │   ├── useAccommodation.ts    ← CRUD accommodation (3KB)
        │   │   ├── usePlacesManager.ts    ← Quản lý saved places (4KB)
        │   │   └── useTripSync.ts         ← ⚠️ SAVES TO localStorage ONLY
        │   ├── useTripCost.ts             ← Tính chi phí (6KB)
        │   └── useTripState.ts            ← State management
        ├── types/
        │   └── trip.types.ts              ← ✅ SOURCE OF TRUTH SCHEMA
        ├── utils/
        │   ├── auth.ts                    ← getCurrentUser() from localStorage
        │   ├── itinerary.ts               ← ⚠️ GENERATES LOCALLY (mock data)
        │   ├── analytics.ts
        │   ├── timeHelpers.ts
        │   └── tripConstants.ts
        └── data/
            ├── budget.ts                  ← Budget config (MỚI)
            ├── tripConstants.ts           ← Constants (16KB)
            ├── cities.ts                  ← Danh sách thành phố (16KB)
            ├── places.ts                  ← Mock places (6KB)
            ├── suggestions.ts             ← Mock suggestions (3KB)
            ├── trips.ts                   ← Mock trips
            ├── destinations.ts            ← Mock destinations
            └── homeData.ts                ← Home page data
```

---

## 2. Schema Source of Truth — `trip.types.ts`

> [!IMPORTANT]
> File `trip.types.ts` trên branch `feat/frontend-revamp` là **source of truth** cho toàn bộ data schema.
> Mọi Pydantic model trên BE **PHẢI** khớp với các interface này.

### 2.1 Các Interface chính

```typescript
// === ExtraExpense ===
export interface ExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

// === Activity ===
export interface Activity {
  id: number;                        // integer (KHÔNG phải UUID string)
  time: string;
  endTime?: string;                  // MỚI: giờ kết thúc
  name: string;                      // ⚠️ BREAKING: "name" thay vì "title"
  location: string;
  description: string;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  transportation?: "walk" | "bike" | "bus" | "taxi";
  // Cost fields mới
  adultPrice?: number;
  childPrice?: number;
  customCost?: number;
  busTicketPrice?: number;
  taxiCost?: number;
  extraExpenses?: ExtraExpense[];
}

// === Day ===
export interface Day {
  id: number;
  label: string;                     // "Ngày 1", "Day 1"
  date: string;
  activities: Activity[];
  destinationName?: string;
  extraExpenses?: DayExtraExpense[];
}

// === Place ===
export interface Place {
  id: number;
  name: string;
  reviewCount: number;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping";
  image: string;
  price?: string;
  location?: string;
  reviews?: number;
  rating?: number;
  saved: boolean;
  city: string;
  description?: string;
}

// === Hotel ===
export interface Hotel {
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  price: number;
  image: string;
  location: string;
  city: string;
  amenities: string[];
  description: string;
}

// === Accommodation ===
export interface Accommodation {
  hotel: Hotel;                    // Embedded Hotel object
  dayIds: number[];
  bookingType?: 'hourly' | 'nightly' | 'daily';
  duration?: number;
}

// === TravelerInfo ===
export interface TravelerInfo {
  adults: number;
  children: number;
  total: number;                   // = adults + children
}

// === TimeConflictWarning ===
export interface TimeConflictWarning {
  hasConflict: boolean;
  conflictWith?: Activity;
}
```

### 2.2 Breaking Changes so với `main` branch

| Trường | `main` (api.ts) | `feat/frontend-revamp` (trip.types.ts) | Impact |
|--------|-----------------|---------------------------------------|--------|
| `Activity.id` | `string` (UUID) | `number` (integer) | ⚠️ Breaking |
| `Activity.name` | `title` | `name` | ⚠️ Breaking — BE response phải đổi |
| `Activity.endTime` | ❌ | ✅ | Thêm field mới |
| `Activity.type` | ❌ | ✅ (5 enum values) | Thêm column |
| `Activity.adultPrice` | ❌ | ✅ | Thêm column |
| `Activity.childPrice` | ❌ | ✅ | Thêm column |
| `Activity.customCost` | ❌ | ✅ | Thêm column |
| `Activity.transportation` | ❌ | ✅ (4 enum values) | Thêm column |
| `Activity.busTicketPrice` | ❌ | ✅ | Thêm column |
| `Activity.taxiCost` | ❌ | ✅ | Thêm column |
| `Activity.extraExpenses` | ❌ | ✅ | Thêm bảng mới |
| `Day.id` | `string` | `number` | ⚠️ Breaking |
| `Day.label` | ❌ | ✅ | Thêm column |
| `Day.extraExpenses` | ❌ | ✅ | Thêm bảng mới |
| `TravelerInfo` | ❌ | ✅ | Hoàn toàn mới |
| `Accommodation` | ❌ | ✅ | Hoàn toàn mới |
| `Hotel` | ❌ | ✅ (9 fields) | Bảng mới |

---

## 3. Các trang (Pages) MỚI — Chi tiết chức năng

### 3.1 TripWorkspace.tsx (22KB) — Trang chính

**Mô tả:** Workspace sau khi tạo trip, hiển thị lộ trình dạng timeline/canvas.

**Chức năng:**
- Hiển thị lịch trình theo ngày (Day tabs)
- Kéo thả activities giữa các ngày
- Theo dõi budget real-time (BudgetTracker)
- Floating AI Chat bubble
- Contextual suggestions panel
- Auto-save (5-giây interval qua `useTripSync`)

**BE API cần:**
- `PUT /api/v1/trips/{id}` — Update full trip JSON
- `POST /api/v1/trips/{id}/activities` — Thêm activity
- `PUT /api/v1/trips/{id}/activities/{aid}` — Update activity
- `DELETE /api/v1/trips/{id}/activities/{aid}` — Xóa activity

### 3.2 DailyItinerary.tsx (33KB) — Component lớn nhất

**Mô tả:** Hiển thị chi tiết 1 ngày trong lịch trình.

**Chức năng:**
- Timeline view theo giờ
- Drag & drop reorder activities
- Time conflict detection (`TimeConflictWarning`)
- Inline editing cho cost, time, notes
- Extra expenses per day

### 3.3 CreateTrip.tsx (13KB) — Form tạo trip

**Mô tả:** Form đầu vào cho AI sinh lộ trình.

**Input fields:**
- Destination (dropdown + search)
- Start date / End date (date picker)
- Budget (VND)
- Interests (multi-select: culture, food, nature, beach, adventure, shopping)
- Travelers count (adults, children)

**BE API cần:**
- `POST /api/v1/itineraries/generate` — AI sinh lộ trình

### 3.4 ManualTripSetup.tsx (18KB) — Setup thủ công

**Mô tả:** User tự tạo lịch trình mà không cần AI.

**Chức năng:**
- Thêm ngày thủ công
- Search và thêm places
- Tùy chỉnh cost, time, notes cho từng activity

**BE API cần:**
- `POST /api/v1/itineraries` — Tạo trip manual
- `GET /api/v1/places/search` — Search places
- `GET /api/v1/destinations` — Danh sách điểm đến

### 3.5 TripHistory.tsx (21KB) — Lịch sử trips

**Mô tả:** Danh sách tất cả trips của user.

**Chức năng:**
- List view + Grid view toggle
- Filter: theo destination, date range, rating
- Sort: theo date, budget, rating
- Delete trip
- Share trip

**BE API cần:**
- `GET /api/v1/itineraries` — List trips (paginated)
- `DELETE /api/v1/itineraries/{id}` — Xóa trip
- `POST /api/v1/itineraries/{id}/share` — Tạo share link

### 3.6 CompanionDemo.tsx (9KB) — Demo companion features

**Mô tả:** Demo 4 tính năng companion.

**Components:**
- `DailyBrief` — Thông tin đầu ngày
- `LiveBudgetBar` — Budget bar real-time
- `SmartReminders` — Nhắc nhở thông minh
- `PlaceSuggestions` — Gợi ý địa điểm

---

## 4. Components Companion — Phân tích AI Integration

### 4.1 FloatingAIChat.tsx (6KB) — ⚠️ MOCK hiện tại

**Trạng thái:** Dùng `setTimeout` để giả lập response AI. **CHƯA** kết nối BE.

```typescript
// HIỆN TẠI (mock):
setTimeout(() => {
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: 'Đây là response giả lập...',
  }]);
}, 1500);

// CẦN THAY BẰNG (real):
// Option A: REST
const response = await api.post('/agent/chat', { trip_id, message });

// Option B: WebSocket (streaming)
const ws = new WebSocket(`ws://localhost:8000/ws/agent-chat/${tripId}`);
ws.onmessage = (event) => { /* append streaming text */ };
```

**BE API cần:**
- `POST /api/v1/agent/chat` — REST endpoint
- `WS /ws/agent-chat/{trip_id}` — WebSocket streaming

### 4.2 ContextualSuggestionsPanel.tsx (12KB) — ⚠️ MOCK hiện tại

**Trạng thái:** Lấy data từ `data/suggestions.ts` (mock). **CHƯA** gọi BE.

**BE API cần:**
- `GET /api/v1/agent/suggest/{activity_id}` — Lấy gợi ý theo context
- `GET /api/v1/places/suggestions` — Gợi ý tổng hợp

### 4.3 ActivityDetailModal.tsx (24KB)

**Chức năng:**
- Hiển thị chi tiết activity: image, description, cost breakdown
- Edit inline: tên, giờ, cost
- Delete activity
- Add extra expense

### 4.4 PlaceSelectionModal.tsx (18KB)

**Chức năng:**
- Search places theo keyword + category
- Filter theo: rating, cost range, distance
- Preview place trước khi thêm
- Add to specific day

**BE API cần:**
- `GET /api/v1/places/search?q=...&category=...&city=...`
- `GET /api/v1/places/nearby?lat=...&lng=...&radius=...`

### 4.5 TripAccommodation.tsx (22KB)

**Chức năng:**
- CRUD khách sạn trong trip
- Search hotels
- Assign hotel cho specific days
- Cost calculation per night

**BE API cần:**
- `POST /api/v1/trips/{id}/accommodations`
- `PUT /api/v1/trips/{id}/accommodations/{aid}`
- `DELETE /api/v1/trips/{id}/accommodations/{aid}`
- `GET /api/v1/hotels/search?city=...`

### 4.6 BudgetTracker.tsx (14KB)

**Chức năng:**
- Budget breakdown theo category (food, transport, accommodation, attractions)
- Per-person cost calculation
- Warning khi vượt budget
- Visual progress bar

---

## 5. Hooks — State Management

### 5.1 useActivityManager.ts (7KB) — `hooks/trips/useActivityManager.ts`

**Chức năng:** CRUD operations cho activities trong 1 trip.

**Actual API (đọc từ source):**
```typescript
const {
  handleDeleteActivity,    // Xóa activity theo actId
  handleViewDetails,       // Mở modal chi tiết
  handleSaveActivityDetails, // Lưu edit (local state)
  handleDragStart/Drop,    // Drag & drop reorder
  handleAddExtraExpense,   // Thêm chi phí phát sinh
  handleUpdateExtraExpense, // Sửa chi phí phát sinh
  handleRemoveExtraExpense, // Xóa chi phí phát sinh
  handleAddDayExtraExpense, // Chi phí phát sinh cấp Day
  checkTimeConflict,       // Kiểm tra xung đột thời gian
} = useActivityManager(days, setDays, selectedDayId);
```

**⚠️ THỰC TẾ:** Tất cả hoạt động trên **React local state** (`setDays`). KHÔNG gọi bất kỳ API nào.
**Cần:** Sync với BE qua `PUT /api/v1/trips/{id}` sau mỗi thay đổi.

### 5.2 useAccommodation.ts (3KB) — `hooks/trips/useAccommodation.ts`

**Chức năng:** Quản lý accommodation trong trip.
**⚠️ THỰC TẾ:** Local state only.

### 5.3 usePlacesManager.ts (4KB) — `hooks/trips/usePlacesManager.ts`

**Chức năng:** Quản lý saved places (bookmark).
**⚠️ THỰC TẾ:** Local state only.

**BE API cần:**
- `GET /api/v1/users/saved-places`
- `POST /api/v1/users/saved-places`
- `DELETE /api/v1/users/saved-places/{id}`

### 5.4 useTripSync.ts (7KB) — ⚠️ CRITICAL — `hooks/trips/useTripSync.ts`

**Chức năng:** Auto-save trip data khi có thay đổi.

**⚠️ THỰC TẾ (đọc từ source):**
- Lưu vào `localStorage.setItem("currentTrip", JSON.stringify(tripData))`
- Cập nhật `localStorage.setItem("savedTrips", ...)` cho danh sách trip
- Dùng `useEffect` trigger khi `[days, accommodations, totalBudget, tripName]` thay đổi
- `handleSaveItinerary()` → check `isAuthenticated` → nếu CHƯA login thì show modal → nếu login thì save vào localStorage + toast

**Cần thay đổi:**
```
User thay đổi → useEffect detect → debounce 3s → PUT /api/v1/trips/{id} → success
handleSaveItinerary() → POST /api/v1/itineraries (tạo mới) hoặc PUT (update)
```

### 5.5 useTripCost.ts (6KB)

**Chức năng:** Tính tổng chi phí real-time.

**Formula:**
```
totalCost = Σ(activity.adultPrice × adults + activity.childPrice × children)
          + Σ(day.extraExpenses)
          + Σ(accommodation.hotel.price × duration)
```

---

## 6. Mock Data — Cần thay thế bằng BE API

| File | Nội dung | BE API thay thế |
|------|---------|-----------------|
| `data/tripConstants.ts` | Budget levels, durations | Giữ ở FE (config) |
| `data/cities.ts` | 10+ thành phố VN | `GET /api/v1/destinations` |
| `data/places.ts` | ~50 places mock | `GET /api/v1/places/search` |
| `data/suggestions.ts` | Gợi ý mock | `GET /api/v1/agent/suggest` |
| `utils/itinerary.ts` | Sinh lộ trình mock | `POST /api/v1/itineraries/generate` |

---

## 7. API Client — `utils/api.ts`

### 7.1 Existing Types (inline trong api.ts dòng 181-252)

Trên branch `main`, FE đã có API client class với types:
- `User`, `AuthResponse`, `Itinerary`, `ItineraryDay`, `Activity`
- `ItineraryListResponse`, `DestinationInfo`, `PlaceInfo`

### 7.2 Cần mở rộng cho MVP2

```typescript
// Thêm vào api.ts:
// 1. Trip CRUD mở rộng
PUT    /api/v1/trips/{id}
POST   /api/v1/trips/{id}/activities
PUT    /api/v1/trips/{id}/activities/{aid}
DELETE /api/v1/trips/{id}/activities/{aid}
POST   /api/v1/trips/{id}/accommodations
PUT    /api/v1/trips/{id}/accommodations/{id}
DELETE /api/v1/trips/{id}/accommodations/{id}

// 2. Share trip
POST   /api/v1/trips/{id}/share
GET    /api/v1/trips/shared/{token}

// 3. Agent
POST   /api/v1/agent/chat
WS     /ws/agent-chat/{trip_id}
GET    /api/v1/agent/suggest/{activity_id}

// 4. Places mở rộng
GET    /api/v1/places/suggestions
GET    /api/v1/places/nearby
GET    /api/v1/destinations/{name}/detail

// 5. Saved places
GET    /api/v1/users/saved-places
POST   /api/v1/users/saved-places
DELETE /api/v1/users/saved-places/{id}
```

---

## 8. Mapping FE → BE (Adapter Layer)

### 8.1 Field Name Convention

| FE (camelCase) | BE (snake_case) | Notes |
|---------------|-----------------|-------|
| `Activity.name` | `Activity.name` | ✅ Giữ nguyên |
| `Activity.endTime` | `Activity.end_time` | snake_case |
| `Activity.adultPrice` | `Activity.adult_price` | snake_case |
| `Activity.childPrice` | `Activity.child_price` | snake_case |
| `Activity.customCost` | `Activity.custom_cost` | snake_case |
| `Activity.busTicketPrice` | `Activity.bus_ticket_price` | snake_case |
| `Activity.taxiCost` | `Activity.taxi_cost` | snake_case |
| `Activity.extraExpenses` | JSONB hoặc bảng riêng | Xem BE.md |
| `Day.destinationName` | `Day.destination_name` | snake_case |
| `Accommodation.dayIds` | Many-to-many | `trip_accommodation_days` |
| `Accommodation.bookingType` | `Accommodation.booking_type` | snake_case |
| `TravelerInfo.total` | computed: `adults + children` | Không lưu DB |

### 8.2 Pydantic Response Model Convention

```python
# BE dùng alias_generator cho camelCase output:
class ActivityResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=lambda s: ''.join(
            word.capitalize() if i else word
            for i, word in enumerate(s.split('_'))
        ),
        populate_by_name=True,
    )
```

---

## 9. Tổng kết — Việc FE cần làm sau khi BE xong

```
□ 1. CreateTrip.tsx handleGenerateAI() → POST /api/v1/itineraries/generate (THAY navigate)
□ 2. TripHistory.tsx → GET /api/v1/itineraries (THAY localStorage)
□ 3. useTripSync.ts → PUT /api/v1/trips/{id} (THAY localStorage)
□ 4. FloatingAIChat.tsx → WS /ws/agent-chat/{trip_id} (THAY setTimeout)
□ 5. ContextualSuggestionsPanel.tsx → GET /api/v1/agent/suggest (THAY mockSuggestions)
□ 6. Thay data/cities.ts → GET /api/v1/destinations
□ 7. Thay data/places.ts → GET /api/v1/places/search
□ 8. Thay utils/itinerary.ts → TOÀN BỘ logic sinh lộ trình chuyển sang BE
□ 9. Update usePlacesManager.ts → GET/POST/DELETE /api/v1/users/saved-places
□ 10. Tạo api.ts client class mới khớp với BE response schemas
□ 11. Test E2E flow: CreateTrip → Generate → DailyItinerary → Edit → Save
```

---

## 10. Data Flow Analysis — Luồng dữ liệu hiện tại vs MVP2

> [!WARNING]
> Hiện tại FE hoạt động **HOÀN TOÀN OFFLINE** — không gọi BE cho bất kỳ flow nào liên quan đến trip.

### 10.1 Flow hiện tại (feat/frontend-revamp)

```
┌─── FLOW 1: TẠO TRIP BẰNG AI ──────────────────────────────────────────────┐
│                                                                             │
│  CreateTrip.tsx                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  User nhập: destination, dateRange, budgetLevel, interests            │ │
│  │  handleGenerateAI() → setTimeout(1500ms) → navigate("/daily-itinerary")│ │
│  │  ⚠️ KHÔNG GỌI BE — chỉ navigate đến trang DailyItinerary              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                    ↓                                                       │
│  DailyItinerary.tsx (= TripWorkspace)                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  useTripSync → localStorage.getItem("currentTrip")                    │ │
│  │  → Nếu KHÔNG có → đọc tripDestinations + tripDayAllocations           │ │
│  │  → Generate days[] dựa trên allocations                               │ │
│  │  → KHÔNG có activities (mảng rỗng)                                     │ │
│  │  → User phải tự thêm activities từ AddPlaceModal/PlaceSelectionModal  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                    ↓                                                       │
│  Auto-save: days thay đổi → localStorage.setItem("currentTrip")           │
│  handleSaveItinerary → localStorage.setItem("savedTrips")                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─── FLOW 2: TẠO TRIP THỦ CÔNG ─────────────────────────────────────────────┐
│  ManualTripSetup.tsx                                                       │
│  → User chọn destinations + date allocations                              │
│  → localStorage.setItem("tripDestinations") + ("tripDayAllocations")       │
│  → navigate("/daily-itinerary")                                            │
│  → DailyItinerary reads localStorage → create empty days                  │
│  → User tự thêm activities                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─── FLOW 3: XEM LỊCH SỬ TRIP ──────────────────────────────────────────────┐
│  TripHistory.tsx                                                           │
│  → localStorage.getItem("savedTrips") → parse → display list              │
│  → handleViewDetails → set localStorage("currentTrip") + selectedTripId   │
│  → navigate("/daily-itinerary")                                            │
│  ⚠️ KHÔNG GỌI BE                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Flow MVP2 (sau refactor)

```
┌─── FLOW 1: TẠO TRIP BẰNG AI ──────────────────────────────────────────────┐
│  CreateTrip.tsx                                                            │
│  → User nhập: destination, dateRange, budget, interests, travelers         │
│  → POST /api/v1/itineraries/generate                                       │
│    → BE: ItineraryService → ItineraryAgentPipeline (RAG 5-step)           │
│    → BE: Gemini 2.5 Flash structured output → AgentItinerary              │
│    → BE: Map → Trip + TripDays + Activities → DB                          │
│    → BE: Return ItineraryResponse (khớp trip.types.ts)                    │
│  → FE nhận response → navigate("/daily-itinerary/{id}")                    │
│  → DailyItinerary loads trip từ API, KHÔNG localStorage                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─── FLOW 2: COMPANION AI CHAT ─────────────────────────────────────────────┐
│  FloatingAIChat.tsx                                                        │
│  → User gõ message                                                         │
│  → WS /ws/agent-chat/{trip_id}                                             │
│    → BE: CompanionService → LangGraph StateGraph                          │
│    → route_intent → tools (search/modify/calculate) → respond             │
│    → BE: PostgresSaver checkpointer (session persistence)                 │
│    → thread_id = f"companion-{trip_id}-{user_id}"                         │
│  → FE nhận streaming response → display                                   │
│  → Nếu modify_itinerary → FE re-fetch GET /trips/{id} → update UI        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─── FLOW 3: AUTO-SAVE ─────────────────────────────────────────────────────┐
│  useTripSync.ts                                                            │
│  → User edit activities/accommodations/budget                              │
│  → useEffect detect thay đổi → debounce 3s                                │
│  → PUT /api/v1/itineraries/{id} (full trip JSON body)                     │
│  → BE: ItineraryService.update() → DB update                              │
│  → FE: toast success/error                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Lưu trữ lộ trình: Relational DB (KHÔNG phải JSON blob)

> [!IMPORTANT]
> Lộ trình được lưu **relational** (Trip → TripDay → Activity), KHÔNG phải JSON blob.
> Lý do: Companion Agent cần query/modify từng activity, FE cần CRUD riêng từng activity.

```
DB structure:
  trips (1)  →  trip_days (N)  →  activities (N)
                                    →  extra_expenses (N)
                 →  trip_accommodations (N)  →  hotels (1)

FE nhận: ItineraryResponse { ...trip fields, days: DayResponse[] }
  DayResponse { id, label, date, activities: ActivityResponse[] }
  ActivityResponse { id, name, time, endTime, type, adultPrice, ... }
```
