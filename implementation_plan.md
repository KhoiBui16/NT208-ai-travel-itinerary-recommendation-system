# Implementation Plan — MVP2 Production-Grade Architecture

> **Version:** v7 (2026-04-14) — Reorganized with dedicated FE.md + BE.md
>
> **Branch status:** `feat/frontend-revamp` đã **pull về local** (KHÔNG merge). BE refactor sẽ làm trên nhánh riêng.

---

## 📋 DOCUMENT INDEX — Đọc file nào trước?

> [!IMPORTANT]
> Plan này đã được **tách thành 3 file** để dễ quản lý. Đọc theo thứ tự sau:

| # | File | Nội dung | Khi nào đọc |
|---|------|---------|------------|
| 1 | **[FE.md](FE.md)** | Phân tích chi tiết Frontend branch `feat/frontend-revamp`: schema, pages, components, hooks, mock data, API cần viết | Đọc TRƯỚC để hiểu FE cần gì từ BE |
| 2 | **[BE.md](BE.md)** | Hướng dẫn refactor Backend step-by-step: folder structure, 4 phases, 26 endpoints, DB schema, Docker, coding standards | Đọc SAU để biết cần implement gì |
| 3 | **implementation_plan.md** (file này) | Master plan: Architecture decisions, AI Agent pipeline chi tiết (prompts, LangGraph, schemas), Open Questions, Timeline | Tham khảo khi cần chi tiết kỹ thuật |

### Mỗi file chứa gì?

```
FE.md (Frontend Analysis)
├── Schema source of truth (trip.types.ts)
├── Breaking changes vs main branch
├── 6 pages mới + chức năng chi tiết
├── 6 companion components + AI integration status
├── 6 hooks + state management
├── Mock data → API mapping
└── FE → BE adapter layer

BE.md (Backend Refactoring)
├── Current state vs Target state
├── Folder structure chi tiết (src/)
├── Phase A-D: step-by-step migration
├── 26 API endpoints table
├── Database schema (13 bảng)
├── pyproject.toml + config.yaml
├── Docker setup
└── Coding standards + verification

implementation_plan.md (file này)
├── Section 1-5: Architecture + FE analysis + Agent overview + Coding standards
├── Section 6: Technical details (OOP, DI, Config, Auth, Docker)
├── Section 7: Open Questions (ĐÃ RESOLVED)
├── Section 8-10: System Architecture + Documentation + Data Management
├── Section 11-12: FE Schema deep dive + DB Migration Strategy
├── Section 13-14: Agent Pipeline + LangGraph chi tiết
├── Section 15-19: DI Chain + Files to DELETE + Dependencies + Timeline + Verification
├── Section 20-21: Open Questions v2 + Cách đọc plan
├── Section 22: FE Branch Analysis (actual file content from trip.types.ts)
├── Section 23-24: AI Agent step-by-step guide + Implementation files
└── Section 25: TODO Checklist
```

### Version History

| Version | Ngày | Nội dung |
|---------|------|---------|
| v1 | 2026-04-13 | Initial plan: BE refactor + deploy cleanup |
| v2 | 2026-04-13 | Added FE branch analysis + LangChain/LangGraph architecture |
| v3 | 2026-04-13 | Comprehensive: FE gap analysis + domain-based FastAPI + Goong API |
| v4 | 2026-04-13 | Removed Vercel, added Docker Compose, renamed ai/ → agent/ |
| v5 | 2026-04-13 | Deep FE analysis, Agent pipeline, folder naming, coding standards |
| v6 | 2026-04-13 | Restored v4 details, resolved open questions, added Sections 11-25 |
| **v7** | **2026-04-14** | **Tách thành FE.md + BE.md. Plan này giữ nguyên nội dung, thêm index** |

### Thứ tự đọc khuyến nghị (cho người mới)

```
1. FE.md (Section 1-3)     → Hiểu schema + breaking changes
2. BE.md (Section 1-3)     → Hiểu current → target state
3. Plan Section 1           → Architecture layers
4. Plan Section 13-14       → AI Agent pipeline chi tiết
5. Plan Section 22          → FE branch actual content
6. Plan Section 23-24       → Agent implementation files
7. BE.md (Section 3)        → Phase A-D step-by-step
8. Plan Section 20          → Open Questions status
```

### Trạng thái hiện tại (2026-04-14)

```
✅ Plan hoàn chỉnh (v7)
✅ FE.md — phân tích chi tiết FE branch
✅ BE.md — hướng dẫn refactor BE step-by-step
✅ Open Questions — tất cả đã resolved
⏳ Chờ user approve → bắt đầu Phase A
```

---

<!-- ═══════════════════════════════ NỘI DUNG GỐC BẮT ĐẦU TỪ ĐÂY ═══════════════════════════════ -->


## 1. Architecture Layers — Giải thích rõ tên từng folder

```
Backend/src/
│
├── core/           ← "Lõi" — Cấu hình hệ thống, KHÔNG chứa business logic
│   Đây là FOUNDATION layer. Chứa những thứ mà MỌI domain đều cần:
│   config, database connection, security, middleware, exception handlers.
│   Tương tự "infrastructure" trong Clean Architecture.
│
├── base/           ← "Bản thiết kế" — Abstract Base Classes (interfaces)
│   Chứa các ABC định nghĩa CONTRACT cho Repository và Service.
│   Concrete classes PHẢI implement các method abstract.
│   Mục đích: Đảm bảo OOP chuẩn, dễ test (swap fake repo), dễ mở rộng.
│
├── api/v1/         ← "Cổng giao tiếp" — HTTP Routers (Presentation Layer)
│   CHỈ parse request, gọi Service, trả response.
│   KHÔNG có business logic. KHÔNG query DB trực tiếp.
│   Versioned: /api/v1/ để sau này có thể thêm /api/v2/ mà không break.
│
├── models/         ← "Bảng DB" — SQLAlchemy ORM Models
│   Mỗi file = 1 table trong PostgreSQL.
│   TÁCH RIÊNG khỏi schemas (Pydantic).
│   KHÔNG BAO GIỜ return model trực tiếp từ API.
│
├── schemas/        ← "Hợp đồng dữ liệu" — Pydantic DTOs
│   Request schemas: validate input từ FE.
│   Response schemas: format output cho FE.
│   KHÔNG chứa logic, chỉ là data containers.
│
├── repositories/   ← "Kho dữ liệu" — Data Access Layer
│   Concrete implementations của BaseRepository[T].
│   CHỈ chứa SQL queries. KHÔNG có business logic.
│   Mỗi Repository = 1 aggregate root (User, Trip, Place...).
│
├── services/       ← "Bộ não" — Business Logic Layer
│   Orchestrate business rules: validate, transform, coordinate.
│   Gọi Repository để lấy/lưu data.
│   Gọi AgentService để sinh lộ trình AI.
│   KHÔNG biết về HTTP. KHÔNG biết về SQL.
│
├── agent/          ← "AI Agent" — LangChain + LangGraph
│   Itinerary Agent: sinh lộ trình từ DB metadata.
│   Companion Agent: chatbot assistant với tool-calling.
│   Suggestion Agent: gợi ý theo context.
│   TÁCH RIÊNG: Có thể test độc lập, thay model dễ dàng.
│
├── helpers/        ← "Dụng cụ" — Pure utility functions
│   Stateless functions: format tiền, validate email, parse date.
│   KHÔNG phụ thuộc vào service hay repository nào.
│   Có thể import từ BẤT KỲ layer nào.
│
└── main.py         ← "Khởi động" — FastAPI app factory
    Tạo app, register routers, setup middleware, lifespan events.
```

### Quy tắc dependencies giữa layers

```
api/ → services/ → repositories/ → models/
                 → agent/
                 → helpers/
core/ ← tất cả layers đều import
base/ ← repositories/ và services/ implement
```

> [!WARNING]
> **KHÔNG ĐƯỢC:** `api/` import trực tiếp `repositories/`. Router PHẢI đi qua Service.
> **KHÔNG ĐƯỢC:** `services/` import `fastapi.Request`. Service KHÔNG biết HTTP.
> **KHÔNG ĐƯỢC:** `repositories/` chứa business logic. Chỉ CRUD + custom queries.

---

## 2. FE Deep Analysis — Đọc kỹ code từ `feat/frontend-revamp`

### 2.1 Tổng quan code FE đã đọc

| Thành phần | Số lượng | Files đã đọc kỹ |
|-----------|---------|-----------------|
| **Pages** | 25 | `TripWorkspace.tsx` (22KB), `DailyItinerary.tsx` (33KB), `CompanionDemo.tsx` (9KB), `CreateTrip.tsx` (13KB), `ManualTripSetup.tsx` (18KB), `TripHistory.tsx` (21KB) |
| **Components** | 23 + 4 companion + figma + ui | `FloatingAIChat.tsx` (6KB), `ContextualSuggestionsPanel.tsx` (12KB), `ActivityDetailModal.tsx` (24KB), `PlaceSelectionModal.tsx` (18KB), `TripAccommodation.tsx` (22KB), `BudgetTracker.tsx` (14KB) |
| **Hooks** | 6 | `useActivityManager.ts` (7KB), `useAccommodation.ts` (3KB), `usePlacesManager.ts` (4KB), `useTripSync.ts` (7KB), `useTripCost.ts` (6KB), `useTripState.ts` |
| **Types** | 1 | `trip.types.ts` — Activity, Day, Place, Hotel, Accommodation, TravelerInfo, ExtraExpense |
| **Data (mock)** | 7 files | `tripConstants.ts` (16KB), `cities.ts` (16KB), `places.ts` (6KB), `suggestions.ts` (3KB), `trips.ts`, `destinations.ts`, `homeData.ts` |
| **Utils** | 5 | `itinerary.ts` (11KB), `auth.ts` (5KB), `analytics.ts` (3KB), `timeHelpers.ts` (2KB), `tripConstants.ts` (16KB) |

### 2.2 AI/Prompt hiện tại trong FE — Phân tích chi tiết

#### `FloatingAIChat.tsx` — Chat bubble AI (line 53-62)
```typescript
// ⚠️ HIỆN TẠI: setTimeout giả lập, KHÔNG gọi BE
// Dòng 53: "Tích hợp API gọi AI thực tế tại đây, xóa setTimeout giả lập"
setTimeout(() => {
  const aiMessage = {
    text: "Tôi đã nhận được yêu cầu. Vui lòng xác nhận các thay đổi...",
    sender: "ai",
  };
  setMessages(prev => [...prev, aiMessage]);
}, 1000);

// Quick replies: "Tối ưu lịch trình" và "Gợi ý địa điểm"
// Props: selectedCities: string[] → context cho AI biết đang ở thành phố nào
```
**→ Cần:** WebSocket/SSE kết nối đến `POST /api/v1/agent/chat` hoặc `WS /ws/agent-chat`

#### `itinerary.ts` — Sinh lộ trình (line 46-108)
```typescript
// ⚠️ HIỆN TẠI: Sinh từ hardcoded mock data, KHÔNG gọi AI
// 4 thành phố: Hà Nội, TP.HCM, Đà Nẵng, Hội An
// Logic: Vòng lặp modulo qua mảng activities → phân bổ 3 activities/ngày
// Cost: cộng thêm 500k/ngày cho accommodation + 300k/ngày cho food
```
**→ Cần:** Gọi `POST /api/v1/itineraries/generate` → Itinerary Agent (BE)

#### `CompanionDemo.tsx` — Travel Companion demo (line 9-238)
```
Đây là trang DEMO 4 tính năng companion:
1. DailyBrief      → Popup thông tin đầu ngày (thời tiết, số activities, giờ bắt đầu)
2. LiveBudgetBar   → Thanh budget cố định cuối trang, click thêm chi tiêu
3. SmartReminders  → Nhắc nhở thông minh (departure time, location)
4. PlaceSuggestions → Gợi ý địa điểm theo context (ăn/tham quan/gần đây)
```
**→ Cần:** Tất cả đang dùng mock data. PlaceSuggestions cần BE API (`GET /api/v1/places/nearby`)

#### `ContextualSuggestionsPanel.tsx` — Gợi ý sidebar (line 28-297)
```
Filters: all | dining | lodging | sightseeing | nearby
Features: Xem chi tiết, Lưu, Thêm vào lịch trình (chọn ngày + giờ)
Analytics: trackViewSuggestion, trackSaveSuggestion, trackOpenDetail, trackAddToItineraryConfirm
Mock data: từ data/suggestions.ts
```
**→ Cần:** `GET /api/v1/places/suggestions?city=X&type=Y` → Suggestion Agent (BE)

### 2.3 Post-login CRUD Workflow (từ hooks)

#### `useActivityManager.ts` — CRUD cho activities trong trip
```
Chức năng:
- addActivity(dayId, activity)     → Thêm hoạt động vào ngày
- removeActivity(dayId, actId)     → Xóa hoạt động
- updateActivity(dayId, actId, data) → Sửa chi tiết
- reorderActivities(dayId, from, to) → Kéo thả đổi thứ tự
- moveActivity(fromDay, toDay, actId) → Di chuyển giữa các ngày
```
**→ Cần:** `PUT /api/v1/itineraries/{id}` body chứa full JSON lộ trình

#### `useAccommodation.ts` — CRUD cho khách sạn
```
Chức năng:
- addAccommodation(hotel, dayIds, bookingType)
- removeAccommodation(hotelId)
- updateAccommodation(hotelId, data)
```
**→ Cần:** `POST/PUT/DELETE /api/v1/itineraries/{id}/accommodations`

#### `usePlacesManager.ts` — Quản lý saved places
```
Chức năng:
- savePlaces / unsavePlace
- getSavedPlaces
- filterByType / filterByCity
```
**→ Cần:** `GET/POST/DELETE /api/v1/users/saved-places`

#### `useTripSync.ts` — Đồng bộ trip data
```
Chức năng:
- autoSave interval (5s)
- manualSave
- loadFromStorage / saveToStorage
```
**→ Cần:** Thay localStorage → API calls. WebSocket cho real-time collab.

#### `useTripCost.ts` — Tính chi phí
```
Chức năng:
- calculateDayCost(day, travelers)  → Tính chi phí theo ngày
- calculateTotalCost(days, travelers, accommodations)
- calculateBudgetByCategory  → Tách theo food/attraction/transport/shopping/accommodation
```
**→ Cần:** Client-side OK, nhưng cần validate lại ở BE khi save.

---

## 3. Agent Architecture — Pipeline chi tiết

### 3.1 Tổng quan 3 Agent

```
┌────────────────────────────────────────────────────────────────────┐
│                      AGENT ARCHITECTURE                            │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ ITINERARY AGENT  │  │ COMPANION AGENT  │  │ SUGGESTION AGENT │ │
│  │                  │  │                  │  │                  │ │
│  │ Công nghệ:       │  │ Công nghệ:       │  │ Công nghệ:       │ │
│  │ • LangChain      │  │ • LangGraph      │  │ • LangChain      │ │
│  │ • Gemini 2.5     │  │ • LangChain      │  │ • DB Query only  │ │
│  │ • Structured Out │  │ • Gemini 2.5     │  │                  │ │
│  │                  │  │ • Tool Calling   │  │ Trigger:          │ │
│  │ Trigger:          │  │                  │  │ User xem activity│ │
│  │ POST /generate   │  │ Trigger:          │  │ → gợi ý gần đó  │ │
│  │                  │  │ FloatingAIChat   │  │                  │ │
│  │ Output:           │  │ (WebSocket)      │  │ Output:           │ │
│  │ JSON lộ trình    │  │                  │  │ List[Place]      │ │
│  │ (structured)     │  │ Output:           │  │                  │ │
│  │                  │  │ Text + actions   │  │ MVP:              │ │
│  │ MVP: 2 (core)    │  │ (streaming)      │  │ 3 (optional)     │ │
│  │                  │  │                  │  │                  │ │
│  │                  │  │ MVP: 2 (after    │  │                  │ │
│  │                  │  │ itinerary works) │  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                    │
│  Shared:                                                           │
│  • src/agent/llm.py    → LLM factory (ChatGoogleGenerativeAI)     │
│  • src/agent/config.py → AgentConfig (model, temp, retries)       │
│  • src/agent/prompts.py → Tất cả prompt templates                 │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 LangChain vs LangGraph — Khi nào dùng gì

| | LangChain | LangGraph |
|--|----------|-----------|
| **Là gì** | Framework wrapping LLM calls (prompt → LLM → output) | State machine framework cho multi-step agent workflows |
| **Khi nào dùng** | 1 câu hỏi → 1 câu trả lời (single invoke) | Multi-turn chat, branching logic, tool calling loops |
| **Ví dụ** | Itinerary Agent: user input → prompt → Gemini → JSON | Companion Agent: user chat → classify → tool → respond → loop |
| **State** | Stateless (mỗi call độc lập) | Stateful (giữ messages, itinerary context qua các turn) |
| **Dùng ở đây** | `src/agent/llm.py` — tạo LLM instance, `with_structured_output()` | `src/agent/graph.py` — `StateGraph`, nodes, edges, tools |

### 3.3 Itinerary Agent — 5-Step RAG Pipeline

```python
# src/agent/pipelines/itinerary_pipeline.py
# Pipeline: Input → DB Context → Prompt → LLM → Post-process

"""
STEP 1: Validate Input
──────────────────────
User gửi: { destination, start_date, end_date, budget, interests, travelers }
→ Validate bởi Pydantic schema (src/schemas/itinerary.py)
→ Calculate num_days = (end_date - start_date).days

STEP 2: Fetch DB Context (RAG retrieval)
──────────────────────
Query DB chỉ lấy METADATA nhẹ: name, category, avg_cost, description[:80]
→ Giảm token cost: chỉ ~50 tokens/place thay vì ~300 tokens full data
→ Filter theo: city = destination, category IN interests
Query:
  SELECT id, name, category, avg_cost, description_short, rating
  FROM places WHERE city = :dest AND category = ANY(:interests)
  ORDER BY rating DESC LIMIT 30

STEP 3: Build Prompt
──────────────────────
System prompt:
  "Bạn là chuyên gia du lịch Việt Nam. Tạo lộ trình {num_days} ngày
   tại {destination} với ngân sách {budget} VND.
   
   Quy tắc:
   - Tối đa 4 activities/ngày
   - Sáng: tham quan, trưa: ăn, chiều: khám phá, tối: giải trí
   - Chi phí phải ≤ ngân sách
   - Ưu tiên các địa điểm trong danh sách context bên dưới
   - Nếu không đủ, bạn có thể gợi ý thêm địa điểm mới
   
   Danh sách địa điểm có trong database:
   {places_metadata_json}"

User prompt:
  "Tạo lộ trình cho {travelers.adults} người lớn, {travelers.children} trẻ em.
   Sở thích: {interests}. Ngân sách: {budget} VND."

STEP 4: LLM Call (Gemini 2.5 Flash)
──────────────────────
structured_llm = llm.with_structured_output(
    AgentItinerary,        # Pydantic model
    method="json_schema"   # Native Gemini structured output
)
result: AgentItinerary = await structured_llm.ainvoke(prompt)

→ Gemini trả về Pydantic object TRỰC TIẾP — KHÔNG cần parse JSON text.
→ Retry tối đa 2 lần nếu fail.
→ Fallback: dùng mock data + random shuffle nếu AI hoàn toàn fail.

STEP 5: Post-process + Save
──────────────────────
- Map AI place names → place_ids trong DB (fuzzy match nếu cần)
- Enrich từ DB: lấy full images, coordinates, opening_hours
- Tính toán directions giữa activities qua Goong API
- Validate: total_cost ≤ budget (điều chỉnh nếu vượt)
- Save: INSERT trip + trip_places + trip_history (version 1)
- Return: ItineraryResponse → FE render TripWorkspace
"""
```

### 3.4 Companion Agent — LangGraph StateGraph

```python
# src/agent/graph.py
# LangGraph StateGraph cho FloatingAIChat / CompanionDemo

"""
STATE DEFINITION
────────────────
class CompanionState(TypedDict):
    messages: Annotated[list, add_messages]  # Chat history (auto-accumulate)
    itinerary_json: dict      # Lộ trình hiện tại (editable)
    trip_id: str              # Trip ID đang chỉnh sửa
    user_preferences: dict    # { budget, interests, travelers }
    pending_changes: list     # Danh sách thay đổi chờ confirm
    tool_results: dict        # Kết quả từ tool calls

GRAPH FLOW
──────────
    ┌──────────────┐
    │    START      │
    └──────┬───────┘
           ▼
    ┌──────────────┐
    │   agent      │  ← LLM + bound tools
    │  (reasoning) │     Phân tích user message
    └──────┬───────┘     Quyết định: gọi tool hay trả lời trực tiếp
           │
    ┌──────▼───────┐
    │ should_use   │  ← Conditional edge
    │ _tools?      │
    └──┬───────┬───┘
       │       │
  No   │       │ Yes
       │       │
       ▼       ▼
    ┌──────┐ ┌──────────┐
    │  END │ │  tools   │  ← ToolNode: execute tool calls
    └──────┘ │  execute │
             └────┬─────┘
                  │
                  ▼
           ┌──────────────┐
           │   agent      │  ← Quay lại agent để xử lý tool result
           │  (respond)   │
           └──────┬───────┘
                  │
           (loop until no more tool calls)

5 TOOLS AVAILABLE
─────────────────
@tool search_places_db
    "Tìm kiếm địa điểm trong database theo tên, loại, thành phố."
    Input: query: str, city: str, type: str
    → SELECT * FROM places WHERE city = :city AND (name ILIKE :q OR type = :type)

@tool modify_itinerary
    "Chỉnh sửa lộ trình: thêm/xóa/di chuyển/thay đổi activity."
    Input: action: str, day_id: int, activity_data: dict
    → Parse action → update itinerary_json in state
    → Return: pending_changes (chờ user confirm qua FE)

@tool search_nearby_goong
    "Tìm kiếm địa điểm gần vị trí hiện tại qua Goong API."
    Input: lat: float, lng: float, keyword: str, radius: int
    → Call Goong Places API → return top 5 results

@tool calculate_route
    "Tính khoảng cách và thời gian di chuyển giữa 2 điểm."
    Input: origin: str, destination: str
    → Call Goong Directions API → return distance, duration, route

@tool recalculate_budget
    "Tính lại tổng chi phí sau khi thay đổi lộ trình."
    Input: itinerary_json: dict, travelers: dict
    → Calculate total based on adultPrice * adults + childPrice * children + transport
"""
```

### 3.5 `src/agent/` — File structure chi tiết

```
src/agent/
├── __init__.py
│
├── config.py           ← AgentConfig: model settings từ config.yaml
│   class AgentConfig:
│       model: str          # "gemini-2.5-flash"
│       temperature: float  # 0.7
│       max_output_tokens   # 8192
│       max_retries         # 2
│       timeout_seconds     # 30
│
├── llm.py              ← LLM Factory — tạo ChatGoogleGenerativeAI instance
│   def create_llm() -> ChatGoogleGenerativeAI:
│       """Tạo LLM instance từ config. Dùng chung cho tất cả agents."""
│
├── prompts.py          ← Tất cả prompt templates
│   ITINERARY_SYSTEM_PROMPT: str
│   COMPANION_SYSTEM_PROMPT: str
│   def build_itinerary_prompt(dest, days, budget, interests, metadata) -> str
│   def build_companion_prompt(cities) -> str
│
├── schemas.py          ← Pydantic structured output cho AI
│   class AgentActivity(BaseModel):    # 1 activity output
│   class AgentDay(BaseModel):         # 1 ngày = list[AgentActivity]
│   class AgentItinerary(BaseModel):   # Full = list[AgentDay]
│
├── tools.py            ← @tool definitions cho Companion Agent
│   @tool search_places_db(query, city, type) -> list[Place]
│   @tool modify_itinerary(action, day_id, activity_data) -> dict
│   @tool search_nearby_goong(lat, lng, keyword) -> list[dict]
│   @tool calculate_route(origin, destination) -> dict
│   @tool recalculate_budget(itinerary, travelers) -> dict
│
└── graph.py            ← LangGraph StateGraph definitions
    class CompanionState(TypedDict): ...
    def create_companion_graph() -> CompiledGraph: ...
```

---

## 4. Coding Standards — PEP8, Docstrings, Clean Code

### 4.1 Quy tắc bắt buộc

| Quy tắc | Chi tiết |
|---------|---------|
| **PEP8** | Tuân thủ nghiêm ngặt. Dùng `ruff` auto-format + lint |
| **Line length** | Max 100 characters |
| **Docstrings** | Google style. MỌI class, MỌI public method PHẢI có docstring |
| **Function length** | Max **30 dòng** mỗi function. Nếu dài hơn → tách thành helper |
| **Type hints** | BẮT BUỘC cho parameters và return type |
| **Comments** | Tiếng Việt OK cho business logic. Tiếng Anh cho technical |
| **Naming** | snake_case cho variables/functions, PascalCase cho classes |
| **Imports** | Sorted by ruff. stdlib → third-party → local |
| **Constants** | UPPER_SNAKE_CASE, đặt trong `constants.py` hoặc `config.yaml` |

### 4.2 Ví dụ docstring chuẩn

```python
class AuthService(BaseService):
    """
    Service xử lý authentication.
    
    Chức năng:
        - Đăng ký tài khoản mới
        - Đăng nhập bằng email/password
        - Refresh access token
        - Đăng xuất (revoke refresh token)
    
    Dependencies:
        - UserRepository: truy vấn user
        - Security module: hash password, tạo JWT
    """
    
    async def register(self, data: RegisterRequest) -> TokenResponse:
        """
        Đăng ký tài khoản mới.
        
        Args:
            data: Thông tin đăng ký (email, password, full_name).
            
        Returns:
            TokenResponse chứa access_token và refresh_token.
            
        Raises:
            ConflictException: Email đã tồn tại.
            ValidationException: Password quá ngắn.
        """
        ...
```

### 4.3 Ví dụ function ngắn gọn

```python
# ❌ SAI: Function quá dài, làm nhiều thứ
async def generate_and_save_itinerary(self, data, db):
    # 80 dòng code...

# ✅ ĐÚNG: Tách thành các step nhỏ
async def generate_itinerary(self, data: ItineraryCreateRequest) -> ItineraryResponse:
    """Sinh lộ trình AI và lưu vào DB."""
    metadata = await self._fetch_places_metadata(data.destination, data.interests)
    ai_result = await self._call_itinerary_agent(data, metadata)
    enriched = await self._enrich_with_db_data(ai_result)
    trip = await self._save_to_database(data, enriched)
    return ItineraryResponse.from_db(trip)

async def _fetch_places_metadata(self, city: str, interests: list[str]) -> list[dict]:
    """Lấy metadata nhẹ từ DB cho RAG context."""
    ...

async def _call_itinerary_agent(self, data, metadata) -> AgentItinerary:
    """Gọi Itinerary Agent (Gemini 2.5 Flash)."""
    ...

async def _enrich_with_db_data(self, ai_result: AgentItinerary) -> dict:
    """Map AI output → full DB data (images, coords, hours)."""
    ...
```

### 4.4 Ruff configuration

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "N",    # pep8-naming
    "D",    # pydocstyle (docstrings)
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "SIM",  # flake8-simplify
]

[tool.ruff.lint.pydocstyle]
convention = "google"
```

---

## 5. Config — Naming Convention chi tiết

### 5.1 `config.yaml` — Có comment tiếng Việt

```yaml
# ============================================
# config.yaml — Cấu hình ứng dụng DuLichViet
# File này KHÔNG chứa secrets. Commit vào git OK.
# Secrets nằm trong .env (KHÔNG commit).
# ============================================

# --- Cấu hình ứng dụng chung ---
app:
  name: "DuLichViet API"              # Tên hiển thị trên Swagger docs
  version: "2.0.0"                     # Semantic versioning
  debug: false                         # true = log chi tiết, false = production
  host: "0.0.0.0"                      # Bind address (0.0.0.0 cho Docker)
  port: 8000                           # Port FastAPI
  cors_origins:                        # Danh sách FE origins được phép
    - "http://localhost:5173"           # Vite dev server
    - "http://localhost:3000"           # Docker FE

# --- Cấu hình xác thực ---
auth:
  algorithm: "HS256"                   # JWT signing algorithm
  access_token_expire_minutes: 15      # Access token hết hạn sau 15 phút
  refresh_token_expire_days: 30        # Refresh token hết hạn sau 30 ngày
  min_password_length: 6               # Độ dài password tối thiểu

# --- Cấu hình AI Agent ---
agent:
  model: "gemini-2.5-flash"            # Model LLM sử dụng
  temperature: 0.7                     # 0=deterministic, 1=creative
  max_output_tokens: 8192              # Giới hạn output tokens
  max_retries: 2                       # Số lần retry khi AI fail
  timeout_seconds: 30                  # Timeout cho 1 LLM call
  max_activities_per_day: 4            # Tối đa activities mỗi ngày
  default_accommodation_cost_vnd: 800000  # Chi phí lưu trú mặc định/đêm

# --- Cấu hình database ---
database:
  echo: false                          # true = log SQL queries (dev only)
  pool_size: 5                         # Số connection trong pool
  max_overflow: 10                     # Connection bổ sung khi pool đầy
  pool_timeout: 30                     # Timeout chờ connection (giây)

# --- Cấu hình phân trang ---
pagination:
  default_page_size: 20                # Số items mỗi trang mặc định
  max_page_size: 100                   # Tối đa items cho phép request

# --- Cấu hình tích hợp bên ngoài ---
external:
  goong_base_url: "https://rsapi.goong.io"
  osm_overpass_url: "https://overpass-api.de/api/interpreter"
  
# --- Cấu hình scraping (MVP3) ---
scraping:
  update_interval_days: 7              # Tần suất cào dữ liệu (ngày)
  max_places_per_city: 50              # Tối đa places lưu/thành phố
```

## 6. Chi tiết kỹ thuật — Nội dung đầy đủ (từ Plan v4)

> Toàn bộ nội dung chi tiết đã được restore. KHÔNG còn reference.

### 6.1 Files cần xóa

| File | Lý do |
|------|-------|
| `render.yaml` | Deploy Render — chuyển sang Docker |
| `vercel.json` | Deploy Vercel — chuyển sang Docker |
| Root `package.json` | Không dùng Node.js ở root |
| Root `package-lock.json` | Tương tự |
| Root `postcss.config.js` | FE config, không thuộc root |
| Root `vite.config.ts` | FE config, không thuộc root |
| Root `index.html` | FE entry, không thuộc root |
| Root `tsconfig*.json` | FE config, không thuộc root |

### 6.2 Full Project Structure (cập nhật với agent/ naming + Docker)

```
Project Root/
├── docker-compose.yml              ← 🐳 Orchestrate: BE + FE + PostgreSQL
├── .env.example                    ← Root env template
├── README.md                       ← Project overview
├── CONTRIBUTING.md                 ← Coding standards, git flow
│
├── Backend/
│   ├── Dockerfile                  ← 🐳 Docker image for BE
│   ├── pyproject.toml              ← uv project config + dependencies
│   ├── uv.lock                     ← Dependency lock file (auto-generated)
│   ├── .python-version             ← Python version pin (3.12)
│   ├── .env                        ← Secrets (KHÔNG commit)
│   ├── .env.example                ← Template
│   ├── config.yaml                 ← App config (commit OK)
│   │
│   ├── alembic/                    ← Database migrations
│   │   ├── alembic.ini
│   │   ├── env.py                  ← Async migration runner
│   │   └── versions/               ← Migration files
│   │
│   ├── src/                        ← Source code root
│   │   ├── __init__.py
│   │   │
│   │   ├── core/                   ← 🏗️ Lõi hệ thống
│   │   │   ├── __init__.py
│   │   │   ├── config.py           ← AppConfig (yaml + .env)
│   │   │   ├── database.py         ← Engine, SessionFactory, Base
│   │   │   ├── security.py         ← JWT, password hash
│   │   │   ├── exceptions.py       ← Custom exceptions
│   │   │   ├── dependencies.py     ← FastAPI Depends
│   │   │   ├── middlewares.py      ← CORS, logging, error handler
│   │   │   └── constants.py        ← Global constants
│   │   │
│   │   ├── base/                   ← 🧬 ABC contracts
│   │   │   ├── __init__.py
│   │   │   ├── repository.py       ← BaseRepository[T]
│   │   │   ├── service.py          ← BaseService
│   │   │   └── schema.py           ← Base Pydantic configs
│   │   │
│   │   ├── api/v1/                 ← 🌐 FastAPI Routers
│   │   │   ├── __init__.py
│   │   │   ├── router.py           ← Root router
│   │   │   ├── auth.py             ← POST /register, /login, /refresh, /logout
│   │   │   ├── users.py            ← GET/PUT /profile, /password
│   │   │   ├── itineraries.py      ← CRUD + AI generate
│   │   │   ├── places.py           ← GET /destinations, /places
│   │   │   └── agent_chat.py       ← POST /agent/chat
│   │   │
│   │   ├── models/                 ← 💾 SQLAlchemy Models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── trip.py
│   │   │   ├── trip_day.py
│   │   │   ├── activity.py
│   │   │   ├── place.py
│   │   │   ├── hotel.py
│   │   │   ├── saved_place.py
│   │   │   ├── shared_trip.py
│   │   │   ├── trip_accommodation.py
│   │   │   ├── trip_history.py
│   │   │   ├── refresh_token.py
│   │   │   └── scraped_source.py
│   │   │
│   │   ├── schemas/                ← 📋 Pydantic DTOs
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             ← RegisterReq, LoginReq, TokenResponse
│   │   │   ├── user.py             ← UserResponse, UserUpdateReq
│   │   │   ├── itinerary.py        ← ItineraryCreate, ItineraryResponse
│   │   │   ├── place.py            ← PlaceResponse, DestinationInfo
│   │   │   ├── agent.py            ← ChatRequest, ChatResponse, AgentItinerary
│   │   │   └── common.py           ← Pagination, ErrorResponse
│   │   │
│   │   ├── repositories/           ← 📦 Data Access (ABC impl)
│   │   │   ├── __init__.py
│   │   │   ├── user_repository.py
│   │   │   ├── trip_repository.py
│   │   │   ├── place_repository.py
│   │   │   └── hotel_repository.py
│   │   │
│   │   ├── services/               ← ⚙️ Business Logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── itinerary_service.py
│   │   │   ├── place_service.py
│   │   │   ├── agent_service.py
│   │   │   └── data_freshness_service.py
│   │   │
│   │   ├── agent/                  ← 🤖 AI Agent Domain
│   │   │   ├── __init__.py
│   │   │   ├── config.py           ← AgentConfig
│   │   │   ├── llm.py              ← LLM factory
│   │   │   ├── prompts.py          ← Prompt templates
│   │   │   ├── tools.py            ← @tool definitions
│   │   │   ├── graph.py            ← LangGraph StateGraph
│   │   │   └── schemas.py          ← Agent Pydantic output
│   │   │
│   │   ├── helpers/                ← 🔧 Utilities
│   │   │   ├── __init__.py
│   │   │   ├── datetime_utils.py
│   │   │   ├── string_utils.py
│   │   │   ├── currency_utils.py
│   │   │   └── validators.py
│   │   │
│   │   └── main.py                 ← 🚀 FastAPI app factory
│   │
│   ├── docs/                       ← 📚 BE Documentation
│   │   ├── README.md
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE.md
│   │   ├── AGENT_DESIGN.md
│   │   ├── DEPLOYMENT.md
│   │   └── DEVELOPMENT.md
│   │
│   ├── tests/                      ← 🧪 Tests
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_itineraries.py
│   │   └── test_agent.py
│   │
│   └── scripts/                    ← 📜 Crawl scripts
│       ├── crawl_goong.py
│       └── crawl_osm.py
│
├── Frontend/
│   ├── Dockerfile                  ← 🐳 FE image (nginx)
│   ├── nginx.conf                  ← Nginx config
│   ├── docs/                       ← 📚 FE Documentation
│   │   ├── README.md
│   │   ├── COMPONENTS.md
│   │   ├── PAGES.md
│   │   ├── STATE_MANAGEMENT.md
│   │   ├── API_INTEGRATION.md
│   │   └── DESIGN_SYSTEM.md
│   └── src/app/
│       ├── utils/api.ts            ← 🌐 API Client (cần viết mới)
│       └── ... (existing FE code)
```

### 6.3 Layer Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        FE (React/Vite)                           │
│   fetch('/api/v1/...') → JWT in Authorization header             │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼───────────────────────────────────────┐
│                     PRESENTATION LAYER                            │
│   src/api/v1/  ← FastAPI Routers                                 │
│   • Parse request (Pydantic schema validation)                   │
│   • Call Service layer                                           │
│   • Return response (Pydantic schema serialization)              │
│   • NO business logic here                                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ Depends()
┌──────────────────────────▼───────────────────────────────────────┐
│                      SERVICE LAYER                                │
│   src/services/  ← Business Logic                                │
│   • Orchestrate operations                                       │
│   • Validate business rules                                      │
│   • Call Repository for data access                              │
│   • Call Agent service for AI generation                         │
│   • NO HTTP knowledge, NO direct DB queries                      │
└────────────┬─────────────────────────────────┬───────────────────┘
             │ Depends()                       │
┌────────────▼──────────────┐    ┌─────────────▼───────────────────┐
│    REPOSITORY LAYER       │    │       AGENT DOMAIN               │
│  src/repositories/        │    │  src/agent/                      │
│  • ABC → concrete impl   │    │  • LangChain LLM calls           │
│  • SQLAlchemy queries     │    │  • LangGraph Agent workflows     │
│  • CRUD operations        │    │  • Prompt engineering            │
│  • NO business logic      │    │  • Structured output             │
└────────────┬──────────────┘    └─────────────────────────────────┘
             │
┌────────────▼──────────────┐
│     DATABASE LAYER        │
│  PostgreSQL + Alembic     │
│  • AsyncSession           │
│  • Migration versioning   │
└───────────────────────────┘
```

### 6.4 OOP — Abstract Base Classes

#### `src/base/repository.py` — ABC Repository Pattern

```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

T = TypeVar("T")  # SQLAlchemy model type


class BaseRepository(ABC, Generic[T]):
    """
    Abstract Base Class cho tất cả repositories.

    Cung cấp CRUD operations chung. Concrete classes
    implement find_by_criteria() cho domain-specific queries.
    """

    def __init__(self, session: AsyncSession, model_class: type[T]):
        self._session = session
        self._model_class = model_class

    async def get_by_id(self, id: str) -> Optional[T]:
        """Lấy entity theo primary key."""
        return await self._session.get(self._model_class, id)

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[T]:
        """Lấy danh sách có phân trang."""
        stmt = select(self._model_class).offset(skip).limit(limit)
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def create(self, entity: T) -> T:
        """Tạo mới entity."""
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: T) -> T:
        """Cập nhật entity."""
        await self._session.merge(entity)
        await self._session.flush()
        return entity

    async def delete(self, id: str) -> bool:
        """Xóa entity theo ID."""
        entity = await self.get_by_id(id)
        if entity:
            await self._session.delete(entity)
            await self._session.flush()
            return True
        return False

    @abstractmethod
    async def find_by_criteria(self, **kwargs) -> Sequence[T]:
        """Override trong concrete repos cho custom queries."""
        ...
```

#### `src/base/service.py` — ABC Service Pattern

```python
from abc import ABC, abstractmethod
from src.base.repository import BaseRepository


class BaseService(ABC):
    """
    Abstract Base Class cho tất cả services.

    Enforce rằng mỗi service phải nhận repository qua constructor.
    """

    @abstractmethod
    def __init__(self, repository: BaseRepository):
        self._repository = repository
```

#### Concrete Example: UserRepository + UserService

```python
# src/repositories/user_repository.py
class UserRepository(BaseRepository[User]):
    """Repository xử lý truy vấn User trong database."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def find_by_criteria(self, **kwargs) -> Sequence[User]:
        """Tìm users theo điều kiện."""
        ...

    async def find_by_email(self, email: str) -> User | None:
        """Tìm user theo email (unique)."""
        stmt = select(User).where(User.email == email)
        result = await self._session.execute(stmt)
        return result.scalars().first()


# src/services/user_service.py
class UserService(BaseService):
    """Service xử lý business logic cho User."""

    def __init__(self, repository: UserRepository):
        super().__init__(repository)
        self._repo: UserRepository = repository

    async def get_profile(self, user_id: str) -> User:
        """Lấy profile user. Raise NotFoundException nếu không tìm thấy."""
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("User not found")
        return user

    async def update_profile(self, user_id: str, data: dict) -> User:
        """Cập nhật thông tin profile."""
        user = await self.get_profile(user_id)
        for key, value in data.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        return await self._repo.update(user)
```

### 6.5 Dependency Injection Chain

```python
# src/core/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Layer 1: Database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Tạo async database session cho mỗi request."""
    async with async_session_factory() as session:
        yield session

# Layer 2: Repository (inject session)
def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    """Tạo UserRepository với session từ request."""
    return UserRepository(db)

# Layer 3: Service (inject repository)
def get_user_service(
    repo: UserRepository = Depends(get_user_repository),
) -> UserService:
    """Tạo UserService với repository."""
    return UserService(repo)

# Layer 4: Current user (inject service + token)
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    service: UserService = Depends(get_user_service),
) -> User:
    """Xác thực JWT và trả về user hiện tại."""
    payload = verify_access_token(token)
    return await service.get_profile(payload["sub"])


# Trong router:
@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """Lấy profile user đang đăng nhập."""
    return UserResponse.from_db(current_user)
```

### 6.6 Config Loader — `src/core/config.py`

```python
import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


def load_yaml_config() -> dict:
    """Load app settings từ config.yaml."""
    config_path = Path(__file__).parent.parent.parent / "config.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


_yaml = load_yaml_config()


class AppConfig(BaseSettings):
    """
    Merge config.yaml (app settings) + .env (secrets).

    .env overrides yaml. Secrets PHẢI ở .env, KHÔNG ở config.yaml.
    """
    # --- Secrets from .env ---
    DATABASE_URL: str = Field(..., description="PostgreSQL async URL")
    JWT_SECRET_KEY: str = Field(..., description="JWT signing secret")
    GEMINI_API_KEY: str = Field(default="", description="Google AI API key")
    LANGCHAIN_API_KEY: str = Field(default="", description="LangSmith key")
    GOONG_API_KEY: str = Field(default="", description="Goong Maps key")

    # --- App settings from config.yaml ---
    APP_NAME: str = _yaml["app"]["name"]
    APP_VERSION: str = _yaml["app"]["version"]
    DEBUG: bool = _yaml["app"]["debug"]
    HOST: str = _yaml["app"]["host"]
    PORT: int = _yaml["app"]["port"]
    CORS_ORIGINS: list[str] = _yaml["app"]["cors_origins"]

    # Auth
    JWT_ALGORITHM: str = _yaml["auth"]["algorithm"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = _yaml["auth"]["access_token_expire_minutes"]
    REFRESH_TOKEN_EXPIRE_DAYS: int = _yaml["auth"]["refresh_token_expire_days"]

    # Agent
    AGENT_MODEL: str = _yaml["agent"]["model"]
    AGENT_TEMPERATURE: float = _yaml["agent"]["temperature"]
    AGENT_MAX_RETRIES: int = _yaml["agent"]["max_retries"]

    # DB
    DB_POOL_SIZE: int = _yaml["database"]["pool_size"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = AppConfig()
```

### 6.7 Package Manager — `uv`

```bash
# Cài uv (Windows PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Init project
cd Backend
uv init --app
uv add "fastapi[standard]"
uv add sqlalchemy asyncpg pydantic-settings pyyaml python-jose passlib bcrypt
uv add alembic
uv add langchain-core langchain-google-genai langgraph langsmith
uv add --dev ruff pytest pytest-asyncio httpx

# Run
uv run fastapi dev src/main.py
uv run alembic upgrade head
uv run pytest
```

#### `pyproject.toml`

```toml
[project]
name = "dulichviet-api"
version = "2.0.0"
description = "AI Travel Itinerary Recommendation System - Backend"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "pydantic-settings>=2.0.0",
    "pyyaml>=6.0",
    "langchain-core>=0.3.0",
    "langchain-google-genai>=2.0.0",
    "langgraph>=0.2.0",
    "langsmith>=0.2.0",
]

[tool.uv]
dev-dependencies = [
    "ruff>=0.6.0",
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "D", "UP", "B", "SIM"]

[tool.ruff.lint.pydocstyle]
convention = "google"
```

### 6.8 Database — Alembic Async Migrations

```bash
# Setup
cd Backend
uv run alembic init -t async alembic
```

#### `alembic/env.py`
```python
from src.core.database import Base
from src.models import *  # Import ALL models for autogenerate
from src.core.config import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata
```

#### Migration Commands
```bash
uv run alembic revision --autogenerate -m "add hotels and saved_places"
uv run alembic upgrade head        # Apply
uv run alembic downgrade -1        # Rollback
uv run alembic history             # Xem history
```

#### Workflow thay đổi schema
```
1. Sửa model (src/models/*.py)
2. uv run alembic revision --autogenerate -m "description"
3. Review file migration generated
4. uv run alembic upgrade head
5. Commit migration file
```

> [!WARNING]
> **KHÔNG dùng `Base.metadata.create_all()`** trong production. Luôn dùng Alembic.

### 6.9 Auth — JWT + Refresh Token (Hybrid)

#### Flow Diagram

```
┌──────────┐  POST /login   ┌──────────┐
│  Client  │ ──────────────▶│  Server  │
│  (React) │                │ (FastAPI) │
└──────────┘                └────┬─────┘
                                 │ Returns:
              {                  │   access_token  (JWT, 15 min)
                access_token,    │   refresh_token (Opaque, 30 days, in DB)
                refresh_token,   │   token_type
              }                  │

┌──────────┐  GET /profile  ┌──────────┐
│  Client  │ ──────────────▶│  Server  │
│  Bearer  │  Authorization │  Verify  │
│  {JWT}   │  header        │  JWT     │
└──────────┘                └──────────┘

  JWT expired? → POST /refresh
  → Server: verify refresh_token in DB → rotate → issue new pair
```

#### So sánh

| | JWT Only | JWT + Refresh (chọn) | Full OAuth2 |
|--|---------|---------------------|-------------|
| **Security** | ⚠️ Token dài hạn | ✅ Access 15min + Refresh rotated | ✅ Delegated |
| **Revocation** | ❌ Không thể | ✅ Xóa refresh token | ✅ Provider |
| **UX** | Logout mỗi 24h | Seamless auto refresh | 1-click login |
| **DB** | Không cần | `refresh_tokens` table | `oauth_accounts` table |
| **MVP** | ❌ | ✅ **MVP2** | MVP3 |

#### Implementation: `src/core/security.py`

```python
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from src.core.config import settings
import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password bằng bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """So sánh plain password với hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """Tạo JWT access token (short-lived)."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {**data, "exp": expire, "type": "access"},
        settings.JWT_SECRET_KEY,
        settings.JWT_ALGORITHM,
    )


def create_refresh_token() -> str:
    """Tạo opaque refresh token (NOT JWT, stored hashed in DB)."""
    return secrets.token_urlsafe(64)


def verify_access_token(token: str) -> dict:
    """Decode + verify JWT access token."""
    payload = jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload
```

#### RefreshToken Model

```python
# src/models/refresh_token.py
class RefreshToken(Base):
    """Refresh token lưu trong DB, dùng để rotate access token."""

    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    revoked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
```

### 6.10 FE ↔ BE Connection

#### Connection Overview

```
┌────────────────────────────┐        ┌──────────────────────────────────────┐
│      FRONTEND (React)      │        │         BACKEND (FastAPI)             │
│      Vite + TailwindCSS    │  HTTP  │                                      │
│                            │◀──────▶│   src/api/v1/  ← REST Endpoints      │
│  utils/api.ts              │  REST  │                                      │
│  ├── apiClient (fetch)     │        │   Services:                          │
│  ├── JWT token management  │        │   ├── auth_service    (register/login)│
│  ├── auto-refresh token    │        │   ├── user_service    (profile CRUD) │
│  └── error handling        │        │   ├── itinerary_service (trip CRUD)  │
│                            │        │   ├── place_service   (destinations) │
│  components/FloatingAIChat │  WS    │   └── agent_service   (AI Agents)   │
│  └── WebSocket connection  │◀══════▶│       ├── Itinerary Agent (RAG gen) │
│      streaming responses   │  SSE   │       └── Companion Agent (chat)    │
└────────────────────────────┘        └──────────────────────────────────────┘
```

#### `Frontend/src/app/utils/api.ts` — ApiClient (cần viết mới)

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private async refreshAccessToken(): Promise<boolean> { /* ... */ }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return this.request(path, options);  // Retry
      this.logout();
      throw new AuthError("Session expired");
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> { /* ... */ }
  async register(email: string, password: string, name: string): Promise<AuthResponse> { /* ... */ }

  // Itineraries
  async generateItinerary(data: ItineraryCreateReq): Promise<Itinerary> { /* ... */ }
  async getItineraries(): Promise<Itinerary[]> { /* ... */ }

  // AI Chat (WebSocket)
  connectChat(tripId: string, onMessage: (msg: string) => void): WebSocket { /* ... */ }
}

export const api = new ApiClient();
```

#### API Endpoints Table (23 endpoints)

| Method | Endpoint | Service | Auth |
|--------|----------|---------|------|
| `POST` | `/api/v1/auth/register` | AuthService | ❌ Public |
| `POST` | `/api/v1/auth/login` | AuthService | ❌ Public |
| `POST` | `/api/v1/auth/refresh` | AuthService | 🔄 Refresh token |
| `POST` | `/api/v1/auth/logout` | AuthService | ✅ JWT |
| `GET` | `/api/v1/users/profile` | UserService | ✅ JWT |
| `PUT` | `/api/v1/users/profile` | UserService | ✅ JWT |
| `PUT` | `/api/v1/users/password` | UserService | ✅ JWT |
| `POST` | `/api/v1/itineraries/generate` | ItineraryService + AgentService | ✅ JWT |
| `POST` | `/api/v1/itineraries` | ItineraryService (manual) | ✅ JWT |
| `GET` | `/api/v1/itineraries` | ItineraryService | ✅ JWT |
| `GET` | `/api/v1/itineraries/{id}` | ItineraryService | ❌ Public |
| `PUT` | `/api/v1/itineraries/{id}` | ItineraryService | ✅ JWT (owner) |
| `DELETE` | `/api/v1/itineraries/{id}` | ItineraryService | ✅ JWT (owner) |
| `PUT` | `/api/v1/itineraries/{id}/rating` | ItineraryService | ✅ JWT |
| `POST` | `/api/v1/itineraries/{id}/share` | ItineraryService | ✅ JWT (owner) |
| `GET` | `/api/v1/destinations` | PlaceService | ❌ Public |
| `GET` | `/api/v1/destinations/{name}` | PlaceService | ❌ Public |
| `GET` | `/api/v1/places/search` | PlaceService + Goong | ❌ Public |
| `GET/POST/DELETE` | `/api/v1/users/saved-places` | PlaceService | ✅ JWT |
| `POST` | `/api/v1/agent/chat` | AgentService (Companion) | ✅ JWT |
| `WS` | `/ws/agent-chat/{trip_id}` | AgentService (streaming) | ✅ JWT handshake |
| `WS` | `/ws/trips/{trip_id}` | WebSocket collab | ✅ JWT handshake |

### 6.11 Docker Compose

#### `docker-compose.yml` (Root)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dulichviet
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./Backend
    ports:
      - "8000:8000"
    env_file: ./Backend/.env
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./Backend/src:/app/src    # Dev: hot reload
    command: uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./Frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

#### `Backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn src.main:app --host 0.0.0.0 --port 8000"]
```

#### `Frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

#### Docker Commands

```bash
docker compose up --build              # Dev (hot reload)
docker compose up db backend           # Chỉ BE + DB
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # Production
```

### 6.12 Timeline MVP2 (~8 tuần)

| Tuần | Phase | Nội dung |
|------|-------|---------|
| 1-2 | **A: Foundation** | Xóa files cũ, init uv, folder structure, core/, base/, Alembic |
| 3-4 | **B: Domains** | Auth, Users, Itineraries (match FE schema), Places |
| 5-6 | **C: Agent** | Itinerary Agent, Companion Agent, LangSmith |
| 7-8 | **D: Integration** | api.ts, E2E test, Docker compose, Documentation |

---

## 7. Open Questions — ĐÃ TRẢ LỜI

> [!NOTE]
> Tất cả câu hỏi đã được resolve. Quyết định cuối cùng ghi bên dưới.

| # | Câu hỏi | Quyết định | Trạng thái |
|---|---------|-----------|------------|
| 1 | Schema source of truth | ✅ Xem Section 7.1 bên dưới | Resolved |
| 2 | Start từ đâu | ✅ Refactor BE trước (Phase A) | Resolved |
| 3 | Goong API key | ⏳ Chưa tạo — chừa placeholder | Pending |
| 4 | LangSmith | ⏳ Chưa tạo — chừa placeholder | Pending |
| 5 | Seed data → Crawl data | ✅ Xem Section 10 | Resolved |
| 6 | `.env` bị commit | ✅ Xem Section 7.6 | Resolved |
| 7 | OAuth2 social login | ✅ Xem Section 7.7 | Resolved |

### 7.1 Schema Source of Truth — Giải thích chi tiết

**Vấn đề:** FE mới (`trip.types.ts`) có schema phức tạp hơn BE hiện tại rất nhiều:

```
FE trip.types.ts (mới)                    BE models (hiện tại)
─────────────────────                     ──────────────────
Activity {                                 Chỉ có: title, description,
  id, time, endTime,                       cost, duration, image
  name, location, description,
  type: "food"|"attraction"|...,
  image, transportation,
  adultPrice, childPrice,                 ❌ KHÔNG CÓ
  customCost, busTicketPrice,             ❌ KHÔNG CÓ
  taxiCost, extraExpenses[]               ❌ KHÔNG CÓ
}

Day {                                      ❌ KHÔNG CÓ concept Day
  id, label, date,
  activities[], destinationName,
  extraExpenses[]
}

Accommodation {                            ❌ KHÔNG CÓ
  hotel, dayIds[],
  bookingType, duration
}

TravelerInfo {                             ❌ KHÔNG CÓ
  adults, children, total
}
```

**Quyết định: BE adapt theo FE** (FE là source of truth)

**Lý do:**
1. FE đã thiết kế UX đầy đủ — redesign lại sẽ mất thời gian.
2. FE schema chi tiết hơn và hợp lý hơn cho travel domain.
3. BE chỉ cần tạo models + schemas match với `trip.types.ts`.

**Cách thực hiện:**
```
trip.types.ts (FE)  →  BE schemas/itinerary.py (Pydantic DTO)
                    →  BE models/trip.py (SQLAlchemy — lưu DB)
                    →  BE models/activity.py (chi tiết activity)

Mapping:
  FE: Activity.adultPrice    → BE: Activity.adult_price (snake_case)
  FE: Activity.transportation → BE: Activity.transportation_type
  FE: Day.activities[]        → BE: Trip has_many TripDay has_many Activity
  FE: Accommodation           → BE: TripAccommodation model
  FE: TravelerInfo            → BE: Trip.adults_count, Trip.children_count
```

### 7.2 Start từ đâu → Refactor BE trước

**Quyết định:** Phase A — BE refactor ngay. Vì FE đã thay đổi nhiều, cần code BE sạch từ đầu.

**Thứ tự thực hiện:**
```
Phase A (Tuần 1-2): Foundation
  1. Xóa files deploy cũ (render.yaml, vercel.json, ...)
  2. Init uv + pyproject.toml
  3. Tạo folder structure src/
  4. Setup core/ (config, database, security, exceptions)
  5. Setup base/ (ABC Repository, Service)
  6. Alembic init + migration đầu tiên

Phase B (Tuần 3-4): Domain Implementation
  1. Auth domain (register, login, refresh, logout)
  2. Users domain (profile CRUD)
  3. Itineraries domain (CRUD + match FE schema)
  4. Places domain (destinations, search)

Phase C (Tuần 5-6): Agent Integration
  1. Itinerary Agent (RAG pipeline)
  2. Companion Agent (LangGraph)
  3. Test + LangSmith observability

Phase D (Tuần 7-8): FE Connection + Polish
  1. Viết api.ts cho FE
  2. Test E2E flow
  3. Docker compose
  4. Documentation
```

### 7.3 Goong API Key — Chừa Placeholder

```bash
# .env — điền sau khi đăng ký tại https://goong.io
GOONG_API_KEY=<ĐIỀN_SAU_KHI_ĐĂNG_KÝ>
```

> Đăng ký tại: https://account.goong.io → Free tier: 10,000 requests/tháng
> Cần: API Key + Map Key (cho FE hiển thị bản đồ)

### 7.4 LangSmith — Chừa Placeholder

```bash
# .env — điền sau khi đăng ký tại https://smith.langchain.com
LANGCHAIN_API_KEY=<ĐIỀN_SAU_KHI_ĐĂNG_KÝ>
LANGCHAIN_TRACING_V2=false  # Bật true khi đã có key
LANGCHAIN_PROJECT=dulichviet-agent
```

> Đăng ký tại: https://smith.langchain.com → Free tier: 5,000 traces/tháng
> Dùng để: Trace agent calls, debug prompt, monitor performance

### 7.5 Seed Data → KHÔNG seed, dùng CRAWL — Xem Section 10

### 7.6 File `.env` bị commit — Rotate Secrets

**Vấn đề:** File `.env` chứa secrets (JWT_SECRET_KEY, GEMINI_API_KEY) đã bị commit vào git history.

**Giải thích "rotate":** Nghĩa là **tạo mới** tất cả secrets, vì key cũ đã bị lộ trên git history:

```bash
# Bước 1: Tạo JWT secret key MỚI
python -c "import secrets; print(secrets.token_hex(32))"
# Copy kết quả → .env: JWT_SECRET_KEY=<key_mới>

# Bước 2: Tạo GEMINI_API_KEY MỚI
# Vào https://aistudio.google.com/apikey → Revoke key cũ → Tạo key mới

# Bước 3: Thêm .env vào .gitignore (nếu chưa có)
echo ".env" >> .gitignore

# Bước 4: Xóa .env khỏi git tracking (giữ file local)
git rm --cached Backend/.env
git commit -m "chore: remove .env from tracking, rotate all secrets"
```

> [!WARNING]
> **Key cũ đã bị lộ** — dù xóa file, nó vẫn nằm trong git history.
> Phải **tạo key mới** (rotate), không chỉ xóa file là đủ.

### 7.7 OAuth2 Social Login → MVP3

**Quyết định:** MVP3 (sau khi core features hoạt động ổn)

**Giải thích:**
```
MVP2 (hiện tại):
  Email/Password → JWT + Refresh Token
  → Đủ cho demo, đồ án, testing

MVP3 (sau này):
  + Google Login (OAuth2)
  + GitHub Login (OAuth2)
  → Cần đăng ký Google Cloud Console, setup OAuth consent screen
  → Thêm oauth_accounts table trong DB
  → Middleware xử lý callback flow
```

**Lý do delay:** OAuth2 social login không ảnh hưởng đến core features (itinerary generation, trip management). Làm sau khi core stable.

---

## 8. System Architecture — Client-Server (KHÔNG monolithic)

### 8.1 Phân loại kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC TỔNG THỂ HỆ THỐNG                      │
│                                                                     │
│  Loại: CLIENT-SERVER ARCHITECTURE                                   │
│  (KHÔNG phải monolithic — FE và BE TÁCH RIÊNG hoàn toàn)            │
│                                                                     │
│  ┌──────────────────┐              ┌────────────────────────────┐   │
│  │   CLIENT SIDE    │   REST API   │       SERVER SIDE          │   │
│  │   (Frontend)     │◀─── HTTP ──▶│       (Backend)            │   │
│  │                  │   + WS       │                            │   │
│  │  React + Vite    │              │  FastAPI + PostgreSQL      │   │
│  │  TailwindCSS     │              │  LangChain + LangGraph     │   │
│  │  TypeScript      │              │  Gemini 2.5 Flash          │   │
│  │                  │              │                            │   │
│  │  Runs in:        │              │  Runs in:                  │   │
│  │  Browser         │              │  Docker container          │   │
│  │  (port 3000)     │              │  (port 8000)               │   │
│  └──────────────────┘              └────────────────────────────┘   │
│                                              │                      │
│                                    ┌─────────▼──────────┐          │
│                                    │    DATABASE         │          │
│                                    │    PostgreSQL       │          │
│                                    │    (port 5432)      │          │
│                                    │    Docker container │          │
│                                    └────────────────────┘          │
│                                                                     │
│  Giao tiếp:                                                         │
│  • REST API (JSON) — CRUD operations                                │
│  • WebSocket — Real-time chat + collaboration                       │
│  • SSE (Server-Sent Events) — Agent streaming responses             │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 So sánh kiến trúc

| | Monolithic | Client-Server (chọn) | Microservices |
|--|-----------|---------------------|---------------|
| **FE + BE** | Cùng 1 codebase | **Tách riêng** | Tách riêng + BE tách nhiều service |
| **Deploy** | 1 container | **2-3 containers** | 5+ containers |
| **Độ phức tạp** | Thấp | **Trung bình** | Cao |
| **Scale** | Scale cả khối | **Scale FE/BE riêng** | Scale từng service |
| **Team** | 1-2 người | **2-4 người** | 5+ người |
| **Phù hợp** | MVP1 | **MVP2 (đồ án)** | Production lớn |

### 8.3 Tại sao Client-Server chứ không Monolithic

1. **FE và BE dùng ngôn ngữ khác nhau** (TypeScript vs Python) → tách riêng tự nhiên
2. **Docker Compose** → mỗi service 1 container, dễ manage
3. **Team có thể phát triển song song** — FE dev không cần chờ BE
4. **Chuẩn industry** — React + FastAPI là combo phổ biến nhất cho web apps

---

## 9. Documentation Standards — Chuẩn kỹ thuật

### 9.1 Backend Documentation

```
Backend/
├── docs/                              ← 📚 Tài liệu kỹ thuật
│   ├── README.md                      ← Overview + Quick start
│   ├── API_REFERENCE.md               ← Full API docs (auto-gen từ Swagger)
│   ├── ARCHITECTURE.md                ← Kiến trúc tổng thể + diagrams
│   ├── DATABASE.md                    ← ER Diagram + table descriptions
│   ├── AGENT_DESIGN.md                ← AI Agent pipeline chi tiết
│   ├── DEPLOYMENT.md                  ← Docker, env vars, migrations
│   └── DEVELOPMENT.md                 ← Setup local dev, coding standards
│
├── README.md                          ← Project overview (link đến docs/)
```

#### `docs/README.md` — Backend Quick Start

```markdown
# DuLichViet API — Backend

## Kiến trúc
- **Loại:** Client-Server, FastAPI Backend
- **Pattern:** Clean Architecture (Service → Repository → Model)
- **AI:** LangChain + LangGraph + Gemini 2.5 Flash
- **DB:** PostgreSQL (async) + Alembic migrations
- **Auth:** JWT + Refresh Token

## Cài đặt nhanh
\`\`\`bash
# 1. Cài uv
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Install dependencies
cd Backend && uv sync

# 3. Copy + điền .env
cp .env.example .env
# Sửa: DATABASE_URL, JWT_SECRET_KEY, GEMINI_API_KEY

# 4. Migration
uv run alembic upgrade head

# 5. Run
uv run fastapi dev src/main.py
# → http://localhost:8000/docs (Swagger UI)
\`\`\`

## Cấu trúc project
(link đến ARCHITECTURE.md)

## API Reference
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- (link đến API_REFERENCE.md)
```

#### `docs/ARCHITECTURE.md` — Nội dung bắt buộc

```markdown
Phải có:
1. System Architecture Diagram (Client-Server)
2. Layer diagram (api/ → services/ → repositories/ → models/)
3. Dependency injection chain
4. Request lifecycle (HTTP → Router → Service → Repo → DB → Response)
5. Error handling flow
6. Authentication flow (JWT + Refresh)
```

#### `docs/DATABASE.md` — Nội dung bắt buộc

```markdown
Phải có:
1. ER Diagram (Mermaid)
2. Mô tả từng table + columns + relationships
3. Index strategy
4. Migration history
5. Data freshness mechanism (Section 10)
```

#### `docs/AGENT_DESIGN.md` — Nội dung bắt buộc

```markdown
Phải có:
1. Tổng quan 3 Agent (Itinerary, Companion, Suggestion)
2. LangChain vs LangGraph explanation
3. Itinerary Agent pipeline (5 steps) + sequence diagram
4. Companion Agent StateGraph diagram + tools description
5. Prompt templates (full text)
6. Structured output schemas (Pydantic)
7. Fallback strategy khi AI fail
8. LangSmith tracing configuration
9. Token cost estimation per request
```

#### `docs/DEPLOYMENT.md` — Nội dung bắt buộc

```markdown
Phải có:
1. Docker Compose setup (dev + prod)
2. Environment variables table (tất cả vars + mô tả)
3. Health check endpoints
4. Logging configuration
5. Backup strategy (pg_dump schedule)
```

### 9.2 Frontend Documentation

```
Frontend/
├── docs/
│   ├── README.md                      ← Overview + Quick start
│   ├── COMPONENTS.md                  ← Component tree + props description
│   ├── PAGES.md                       ← Route → Page mapping + screenshots
│   ├── STATE_MANAGEMENT.md            ← Hooks, context, data flow
│   ├── API_INTEGRATION.md             ← api.ts usage + error handling
│   └── DESIGN_SYSTEM.md              ← Colors, typography, spacing, components
│
├── README.md
```

#### `docs/COMPONENTS.md` — Nội dung bắt buộc

```markdown
Phải có:
1. Component tree (parent → children)
2. Mỗi component: Props interface + description
3. Tách theo: pages/, components/, components/companion/, components/ui/
4. Screenshot hoặc link đến Figma
5. State management: Hook nào dùng ở component nào
```

#### `docs/STATE_MANAGEMENT.md` — Nội dung bắt buộc

```markdown
Phải có:
1. Data flow diagram: User action → Hook → API → State update → Re-render
2. Mỗi hook: Input/Output + side effects
3. useTripSync: autoSave mechanism, conflict resolution
4. useTripCost: calculation formula
5. localStorage vs API calls migration plan
```

#### `docs/API_INTEGRATION.md` — Nội dung bắt buộc

```markdown
Phải có:
1. ApiClient class documentation
2. Authentication flow (login → store token → auto-refresh)
3. Error handling (401 → refresh, 403 → redirect, 500 → toast)
4. Request/Response types mapping (FE types ↔ BE schemas)
5. WebSocket connection lifecycle
```

### 9.3 Root documentation

```
Project Root/
├── README.md                          ← Project overview
├── CONTRIBUTING.md                    ← Coding standards, git flow, PR rules
├── docker-compose.yml
├── .env.example                       ← Root-level env template
```

#### Root `README.md` — Nội dung bắt buộc

```markdown
# DuLichViet — AI Travel Itinerary Recommendation System

## 🏗️ Architecture
Client-Server: React (FE) + FastAPI (BE) + PostgreSQL + AI Agent

## 📁 Project Structure
- `Backend/` — FastAPI API + AI Agent
- `Frontend/` — React + Vite + TailwindCSS
- `docker-compose.yml` — Orchestrate all services

## 🚀 Quick Start
\`\`\`bash
docker compose up --build
# FE: http://localhost:3000
# BE: http://localhost:8000/docs
\`\`\`

## 👥 Team
- [Tên 1] — Backend + AI Agent
- [Tên 2] — Frontend

## 📖 Documentation
- [Backend Architecture](Backend/docs/ARCHITECTURE.md)
- [API Reference](Backend/docs/API_REFERENCE.md)
- [Agent Design](Backend/docs/AGENT_DESIGN.md)
- [Frontend Components](Frontend/docs/COMPONENTS.md)
```

---

## 10. Data Management — Crawl (KHÔNG Seed) + Freshness Mechanism

### 10.1 Dữ liệu được CRAWL, không seed

> [!IMPORTANT]
> Dữ liệu places, hotels, destinations đã được **crawl từ bên ngoài** (Goong, OSM, Google) 
> và **lưu vào DB**. KHÔNG dùng seed script.

```
Data Pipeline:
  1. Crawl script chạy → lấy data từ API/web
  2. Normalize data → match với schema Place, Hotel
  3. INSERT/UPDATE vào PostgreSQL
  4. Ghi lại metadata: source, crawled_at, expires_at
```

### 10.2 Data Freshness — Cơ chế kiểm tra cập nhật

```python
# src/models/scraped_source.py
class ScrapedSource(Base):
    """
    Theo dõi nguồn dữ liệu đã crawl.
    Biết được data nào cần update dựa trên thời gian.
    """
    __tablename__ = "scraped_sources"
    
    id: Mapped[UUID]          # Primary key
    source_name: Mapped[str]  # "goong_places", "osm_overpass", "booking_hotels"
    city: Mapped[str]         # "Hà Nội", "Đà Nẵng", ...
    last_crawled_at: Mapped[datetime]   # Lần cuối crawl thành công
    next_update_at: Mapped[datetime]    # Lần tiếp theo cần update
    record_count: Mapped[int]           # Số records đã crawl
    status: Mapped[str]       # "fresh" | "stale" | "updating" | "error"
    error_message: Mapped[str | None]
```

### 10.3 Freshness Check Logic

```python
# src/services/data_freshness_service.py

class DataFreshnessService:
    """
    Kiểm tra và quản lý độ mới của dữ liệu crawl.
    
    Quy tắc:
    - Places: update mỗi 7 ngày (config: scraping.update_interval_days)
    - Hotels/giá: update mỗi 3 ngày (giá thay đổi thường xuyên hơn)
    - Destinations: update mỗi 30 ngày (ít thay đổi)
    """
    
    async def check_stale_sources(self) -> list[ScrapedSource]:
        """Tìm các nguồn dữ liệu cần update."""
        return await self._repo.find_stale(
            threshold=datetime.now(timezone.utc)
        )
    
    async def mark_updated(self, source_id: str, record_count: int) -> None:
        """Đánh dấu nguồn đã được crawl xong."""
        source = await self._repo.get_by_id(source_id)
        source.last_crawled_at = datetime.now(timezone.utc)
        source.next_update_at = self._calculate_next_update(source)
        source.record_count = record_count
        source.status = "fresh"
        await self._repo.update(source)
    
    def _calculate_next_update(self, source: ScrapedSource) -> datetime:
        """Tính thời điểm update tiếp theo dựa trên loại source."""
        intervals = {
            "goong_places": timedelta(days=7),
            "hotels_pricing": timedelta(days=3),
            "destinations_info": timedelta(days=30),
        }
        interval = intervals.get(source.source_name, timedelta(days=7))
        return datetime.now(timezone.utc) + interval
```

### 10.4 Giá cả thay đổi — Cách xử lý

```
Vấn đề: Giá khách sạn, vé tham quan thay đổi theo mùa/ngày.

Giải pháp:
┌────────────────────────────────────────────────────────┐
│ Place/Hotel record trong DB:                            │
│                                                        │
│ price_min: 500000      ← Giá thấp nhất (off-peak)     │
│ price_max: 1200000     ← Giá cao nhất (peak season)    │
│ price_avg: 800000      ← Giá trung bình (dùng cho AI) │
│ price_updated_at: ...  ← Lần cuối update giá           │
│ price_source: "booking.com"  ← Nguồn giá              │
│                                                        │
│ AI Agent dùng price_avg khi sinh lộ trình.             │
│ FE hiển thị "từ {price_min}" cho user.                 │
│ Disclaimer: "Giá tham khảo, có thể thay đổi."         │
└────────────────────────────────────────────────────────┘
```

### 10.5 `.env.example` — Placeholder cho keys chưa có

```bash
# ============================================
# .env.example — COPY file này thành .env
# KHÔNG commit .env vào git!
# ============================================

# === DATABASE ===
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet

# === JWT SECRET ===
# Tạo bằng: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=<TẠO_MỚI_BẰNG_LỆNH_TRÊN>

# === AI AGENT ===
# Đăng ký tại: https://aistudio.google.com/apikey
GEMINI_API_KEY=<ĐIỀN_SAU_KHI_ĐĂNG_KÝ>

# === LANGSMITH (optional — bật khi cần trace agent) ===
# Đăng ký tại: https://smith.langchain.com
LANGCHAIN_API_KEY=<ĐIỀN_SAU_KHI_ĐĂNG_KÝ>
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=dulichviet-agent

# === GOONG MAPS (optional — bật khi cần map/directions) ===
# Đăng ký tại: https://account.goong.io
GOONG_API_KEY=<ĐIỀN_SAU_KHI_ĐĂNG_KÝ>
```

---

## 11. FE Schema — Source of Truth Thực Sự (Từ `api.ts`)

> **QUAN TRỌNG:** FE không có file `trip.types.ts`. Types được định nghĩa **inline trong `Frontend/app/utils/api.ts`** (dòng 181-252).
> Đây là nguồn chân lý schema mà BE PHẢI adapt theo.

### 11.1 Các Type Definitions hiện tại (trong `api.ts` dòng 181-252)

```typescript
// Frontend/app/utils/api.ts — FE Schema Source of Truth

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  interests?: string[];
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  access_token: string | null;
  token_type: string;
  user: User | null;
  error: string | null;
}

export interface Itinerary {
  id: string;
  userId?: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
  days: ItineraryDay[];
  totalCost: number;
  createdAt: string;
  rating?: number | null;
  feedback?: string | null;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  duration: string;
  image: string;
  coordinates?: { lat: number; lng: number } | null;
}

export interface ItineraryListResponse {
  itineraries: Itinerary[];
  total: number;
}

export interface DestinationInfo {
  destination: string;
  place_count: number;
  places: PlaceInfo[];
}

export interface PlaceInfo {
  id: string;
  place_name: string;
  category?: string;
  description?: string;
  location?: string;
  cost?: number;
  duration?: string;
  image?: string;
  destination?: string;
}
```

### 11.2 So sánh FE Schema vs BE Schema hiện tại

| Khái niệm | FE (`api.ts`) | BE (hiện tại) | Khớp? |
|-----------|-------------|--------------|-------|
| User | `name` | `full_name` → alias `name` | ✅ |
| User | `createdAt` | `created_at` → alias | ✅ |
| Itinerary | `days: ItineraryDay[]` | Flat: `trip_places` không có day concept | ❌ |
| Activity | `time, title, description, location, cost, duration, image` | `time, custom_cost, notes` + JOIN Place | ✅ |
| Activity | `coordinates?` | `place.latitude, place.longitude` → transform | ✅ |
| Itinerary | `rating?, feedback?` | Có | ✅ |
| Itinerary | `userId?` | Có (FK nullable) | ✅ |
| **Khác** | **`totalCost` TỰ TÍNH** | `total_cost` trong DB | ✅ |
| **Khác** | **KHÔNG có travelers count** | KHÔNG CÓ | ❌ |
| **Khác** | **KHÔNG có accommodation** | KHÔNG CÓ | ❌ |
| **Khác** | **KHÔNG có extraExpenses** | KHÔNG CÓ | ❌ |
| **Khác** | **KHÔNG có share link** | KHÔNG CÓ | ❌ |

### 11.3 FE Schema CẦN MỞ RỘNG (MVP2+)

Dựa trên phân tích tính năng MVP2, FE sẽ cần thêm:

```typescript
// ===== CẦN THÊM vào BE schemas =====

// 1. Travelers count (cho tính chi phí theo người)
interface ItineraryCreateRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  interests: string[];
  travelers: {
    adults: number;
    children: number;
  };
}

// 2. Activity mở rộng
interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  cost: number;
  duration: string;
  image: string;
  coordinates?: { lat: number; lng: number } | null;
  type?: "food" | "attraction" | "lodging" | "transport" | "shopping";
  adultPrice?: number;
  childPrice?: number;
  customCost?: number;
}

// 3. Accommodation (lưu trú)
interface Accommodation {
  hotelId?: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  cost: number;
  bookingType: "hotel" | "homestay" | "hostel";
  dayIds: number[];
}

// 4. Extra expense
interface ExtraExpense {
  id: string;
  dayId: number;
  category: "transport" | "shopping" | "food" | "other";
  description: string;
  amount: number;
}

// 5. Shared trip
interface SharedTrip {
  tripId: string;
  shareToken: string;
  sharedWith: string[];
  permissions: "view" | "edit";
  expiresAt: string;
}
```

### 11.4 Kết luận Schema

- **Phase A-B (MVP2 core):** BE adapt theo FE `api.ts` schema hiện tại (đã khớp ~80%)
- **Phase C+ (MVP2+):** Thêm travelers, accommodation, extraExpenses khi FE cần
- **Triết lý:** FE là consumer → BE phải adapt. FE không tự parse schema, chỉ dùng

---

## 12. Database Migration Strategy — Từ MVP1 sang MVP2 Schema

### 12.1 Current Schema (MVP1) — 4 bảng

```
users ──────────── trips ───────────── trip_places ─────────── places
users:     id, full_name, email, password_hash, role, phone, interests[], created_at, updated_at
trips:     id, user_id?, destination, total_days, budget, start_date, end_date,
           interests[], ai_prompt, ai_response, total_cost, score, rating, feedback,
           created_at, updated_at
places:    id, place_name, category, rating, popularity_score, description, location,
           cost, duration, image, latitude, longitude, destination, created_at
trip_places: id, trip_id, place_id, day_number, visit_order, time, custom_cost, notes, created_at
```

### 12.2 Target Schema (MVP2) — 13 bảng

```
users ────────────── trips ────────────── trip_days ──────────── activities
   │                                    │
   ├── refresh_tokens (auth)            └── trip_accommodations
   ├── saved_places
   └── shared_trips

places ──────────────────── hotels
                              └── scraped_sources (data freshness)
```

### 12.3 Migration Plan — Alembic (2-Phase)

**Phase 1: `001_initial_mvp2_schema`** — Tạo tất cả bảng mới (non-destructive)
- Tạo: refresh_tokens, hotels, saved_places, shared_trips, trip_history, scraped_sources, trip_days, activities, trip_accommodations
- Thêm cột: places.source, trips.is_public
- Tạo indexes cho các bảng mới

**Phase 2: `002_backfill_trip_days`** — Migrate data từ trip_places → trip_days + activities
- Chạy sau khi Phase C hoàn tất và code mới verified

### 12.4 Migration Commands

```bash
cd Backend
uv run alembic init -t async alembic
uv run alembic revision --autogenerate -m "001_initial_mvp2_schema"
uv run alembic upgrade head
uv run alembic current
uv run alembic history
```

---

## 13. Agent Pipeline — Chi tiết đầy đủ

### 13.1 Itinerary Agent — Full Prompt (tiếng Việt)

```python
# src/agent/prompts/itinerary_agent.py

SYSTEM_PROMPT = """Bạn là chuyên gia du lịch Việt Nam với kiến thức sâu về ẩm thực, văn hóa, danh lam thắng cảnh, và lịch sử Việt Nam.

## Nhiệm vụ
Tạo lịch trình du lịch chi tiết cho du khách, tối ưu hóa trải nghiệm dựa trên ngân sách và sở thích.

## Nguyên tắc quan trọng
1. **Ngân sách thực tế**: Chi phí các hoạt động (không tính ăn ở) PHẢI ≤ ngân sách - (500.000 VND × số ngày)
2. **Phân bổ đều**: Mỗi ngày có 2-4 hoạt động, sáng/chiều/tối hợp lý
3. **Đa dạng**: Xen kẽ các loại hoạt động (ăn uống, tham quan, nghỉ ngơi)
4. **Thời gian thực**: Tổng thời gian các hoạt động trong ngày ≤ 10 giờ
5. **Kinh tế**: Ưu tiên địa điểm miễn phí hoặc ít phí nếu ngân sách hạn chế
6. **Văn hóa**: Đưa vào trải nghiệm văn hóa địa phương
7. **An toàn**: Gợi ý thời gian di chuyển hợp lý

## Định dạng phản hồi
LUÔN trả về JSON theo schema Pydantic được cung cấp. KHÔNG thêm text giải thích."""

USER_PROMPT_TEMPLATE = """## Yêu cầu lịch trình
- **Điểm đến**: {destination}
- **Số ngày**: {num_days} ngày
- **Ngân sách**: {budget_formatted} VND
- **Sở thích**: {interests_str}
- **Ngày bắt đầu**: {start_date}
- **Thành phần**: {num_travelers} người

## Dữ liệu địa điểm có sẵn trong DB
{db_context}

## Yêu cầu định dạng
Trả về JSON array theo schema:
{{
  "days": [
    {{
      "day_number": 1,
      "date": "2025-01-15",
      "activities": [
        {{
          "place_name": "Tên địa điểm",
          "category": "culture|food|nature|beach|adventure|sightseeing|shopping",
          "time": "09:00",
          "end_time": "11:00",
          "duration": "2 giờ",
          "cost": 0,
          "description": "Mô tả ngắn 1-2 câu",
          "location": "Địa chỉ cụ thể",
          "notes": "Mẹo hoặc lưu ý đặc biệt",
          "is_custom": false
        }}
      ],
      "daily_cost": 50000
    }}
  ],
  "total_cost": 1500000,
  "score": 85,
  "itinerary_summary": "Tóm tắt 1-2 câu về lộ trình"
}}

Chỉ trả về JSON, không có text khác."""
```

### 13.2 Companion Agent — Full System Prompt

```python
COMPANION_SYSTEM_PROMPT = """Bạn là TRỢ LÝ DU LỊCH THÔNG MINH cho ứng dụng DuLichViet.
Bạn có quyền truy cập vào các CÔNG CỤ (tools) để trả lời chính xác.

VAI TRÒ:
- Tư vấn lịch trình du lịch
- Trả lời câu hỏi về địa điểm, giá cả, thời gian
- Chỉnh sửa lộ trình theo yêu cầu
- Gợi ý địa điểm gần đó
- Tính toán chi phí

NGUYÊN TẮC:
1. Luôn trả lời bằng TIẾNG VIỆT
2. Thân thiện, nhiệt tình, chuyên nghiệp
3. Nếu không chắc chắn → dùng tool tra cứu
4. Khi user muốn chỉnh sửa → hỏi xác nhận trước khi áp dụng
5. Không bịa đặt thông tin (giá, địa chỉ, giờ mở cửa)

CÁC TÌNH HUỐNG THƯỜNG GẶP:
- "Tôi muốn đổi ngày 2": → confirm → dùng modify_itinerary
- "Thêm bãi biển vào ngày 3": → confirm → dùng search_places_db + modify_itinerary
- "Chi phí hết bao nhiêu?": → dùng recalculate_budget
- "Chỗ này có gần ga không?": → dùng search_nearby_goong
- "Gợi ý quán ăn ngon": → dùng search_places_db(type=food)"""
```

### 13.3 Structured Output Schemas (Agent Pydantic Models)

```python
# src/agent/schemas/itinerary.py

from pydantic import BaseModel, Field
from typing import Optional


class ActivitySchema(BaseModel):
    """1 hoạt động trong lịch trình AI."""
    time: str = Field(description="Thời gian, format HH:MM")
    title: str = Field(description="Tên hoạt động")
    description: str = Field(description="Mô tả ngắn 2-3 câu")
    location: str = Field(description="Địa chỉ hoặc khu vực")
    cost: int = Field(description="Chi phí VND", ge=0)
    duration: str = Field(description="Thời lượng, ví dụ '2 giờ'")
    image: Optional[str] = Field(default=None, description="URL ảnh minh họa")
    type: str = Field(description="Loại: attraction|food|lodging|transport|shopping")
    coordinates: Optional[dict] = Field(default=None, description="Tọa độ lat/lng")


class DaySchema(BaseModel):
    """1 ngày trong lịch trình."""
    day: int = Field(description="Số thứ tự ngày", ge=1)
    date: str = Field(description="Ngày, format YYYY-MM-DD")
    activities: list[ActivitySchema] = Field(description="Danh sách hoạt động trong ngày")
    extra_expenses: list[dict] = Field(default=[], description="Chi phí phát sinh thêm")


class AgentItinerary(BaseModel):
    """Lịch trình đầy đủ do AI sinh ra."""
    days: list[DaySchema] = Field(description="Danh sách các ngày")
    estimated_total_cost: int = Field(description="Chi phí ước tính tổng")
    budget_breakdown: dict = Field(
        description="Chi phí theo danh mục: accommodation, food, attractions, transport, other"
    )
    warnings: list[str] = Field(default=[], description="Cảnh báo")
```

---

## 14. LangGraph — Companion Agent StateGraph Chi tiết

### 14.1 State Definition

```python
# src/agent/graph/companion_graph.py

from typing import Annotated, TypedDict
from langgraph.graph import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage


class CompanionState(TypedDict):
    """
    State cho Companion Agent (LangGraph StateGraph).
    
    - messages dùng operator.add để accumulate (thay vì ghi đè)
    - itinerary_json là editable state - thay đổi sẽ persist qua các turn
    """
    messages: Annotated[list[BaseMessage], add_messages]
    itinerary_json: dict | None          # Lộ trình hiện tại
    trip_id: str | None                  # Trip ID đang chỉnh sửa
    user_preferences: dict               # {budget, interests, destination, travelers}
    pending_changes: list[dict]          # Thay đổi chờ confirm
    tool_results: dict                   # Cache kết quả tool
    turn_count: int                      # Đếm số turn (prevent infinite loop)
```

### 14.2 Graph Flow Diagram

```
                    ┌──────────────┐
                    │ route_intent │
                    └──────┬───────┘
                           │
            ┌───────────────┼───────────────┬─────────────┬──────────────┐
            ▼               ▼               ▼             ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
    │search_places │ │search_nearby │ │calculate │ │ modify  │ │  chat    │
    │    (DB)      │ │  (Goong)    │ │(budget)  │ │ (DB)    │ │ (LLM)    │
    └──────┬───────┘ └──────┬───────┘ └────┬────┘ └────┬────┘ └────┬──────┘
           └───────────────┴───────────────┴───────────┴────────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │   respond    │──→ END
                       │ (LLM gen NL) │
                       └──────────────┘
```

### 14.3 5 Tools cho Companion Agent

```python
# src/agent/tools/companion_tools.py

@tool
async def search_places_db(
    query: str,
    city: str | None = None,
    type: str | None = None,
    limit: int = 10
) -> list[dict]:
    """Tìm kiếm địa điểm trong database."""
    pass

@tool
async def modify_itinerary(
    action: str,           # "add"|"remove"|"move"|"update"|"replace"
    trip_id: str,
    day_id: int,
    activity_data: dict,
    confirm: bool = False
) -> dict:
    """Chỉnh sửa lộ trình: thêm/xóa/di chuyển/thay đổi activity."""
    pass

@tool
async def search_nearby_goong(
    lat: float,
    lng: float,
    keyword: str,
    radius: int = 3000,
    type: str = "restaurant"
) -> list[dict]:
    """Tìm kiếm địa điểm gần vị trí hiện tại qua Goong API."""
    pass

@tool
async def calculate_route(
    waypoints: list[dict]  # [{lat, lng, name}, ...]
) -> dict:
    """Tính khoảng cách và thời gian di chuyển giữa 2+ điểm."""
    pass

@tool
async def recalculate_budget(
    itinerary_json: dict,
    travelers: dict  # {adults: int, children: int}
) -> dict:
    """Tính lại tổng chi phí sau khi thay đổi lộ trình."""
    pass
```

---

## 15. Dependency Injection Chain — Đầy đủ

```python
# src/core/dependencies.py

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Tạo async database session cho mỗi request."""
    async with async_session_factory() as session:
        yield session

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """Decode JWT → trả về user_id."""
    payload = verify_access_token(token)
    return payload["sub"]

# ===== Repository Factories =====
def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)

def get_trip_repository(db: AsyncSession = Depends(get_db)) -> TripRepository:
    return TripRepository(db)

def get_place_repository(db: AsyncSession = Depends(get_db)) -> PlaceRepository:
    return PlaceRepository(db)

# ===== Service Factories =====
def get_auth_service(repo: UserRepository = Depends(get_user_repository)) -> AuthService:
    return AuthService(repo)

def get_user_service(repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repo)

def get_itinerary_service(
    trip_repo: TripRepository = Depends(get_trip_repository),
    place_repo: PlaceRepository = Depends(get_place_repository),
) -> ItineraryService:
    return ItineraryService(trip_repo, place_repo)

def get_agent_service(
    trip_repo: TripRepository = Depends(get_trip_repository),
) -> AgentService:
    return AgentService(trip_repo)
```

---

## 16. Files to DELETE — Danh sách chi tiết

### 16.1 Root Level — XÓA

| File | Lý do |
|------|-------|
| `render.yaml` | Deploy BE sang Render — chuyển sang Docker |
| `vercel.json` | Deploy FE sang Vercel — chuyển sang Docker |
| `package.json` | Root-level Node config (FE có package.json riêng) |
| `package-lock.json` | Tương tự |
| `postcss.config.mjs` | FE config ở root |
| `vite.config.ts` | FE config ở root |
| `index.html` | FE entry ở root |
| `tsconfig*.json` | FE TypeScript config ở root |

### 16.2 Backend Level — Refactor

| File | Hành động | Ghi chú |
|------|----------|---------|
| `Backend/main.py` | **REFACTOR** → `src/main.py` | Di chuyển + tái cấu trúc |
| `Backend/app/` | **XÓA** sau khi refactor xong | Thay bằng `src/` |
| `Backend/requirements.txt` | **GIỮ** tạm thời | Thay bằng `pyproject.toml` |
| `Backend/seed_data.py` | **GIỮ** | Chuyển thành crawl script |
| `Backend/.env` | **GIỮ** (local) | Rotate JWT_SECRET_KEY + GEMINI_API_KEY |
| `Backend/BE_docs.md` | **GIỮ** | Sẽ chuyển vào `docs/` |

### 16.3 Frontend Level — GIỮ NGUYÊN

| File | Hành động | Ghi chú |
|------|----------|---------|
| **TẤT CẢ** | **GIỮ NGUYÊN** | Chưa refactor (FE sẽ làm sau BE) |

> **Lưu ý:** FE code KHÔNG xóa trong phase này. Plan này chỉ refactor BE.

---

## 17. Dependencies to Add — Chi tiết đầy đủ

### 17.1 pyproject.toml (uv)

```toml
[project]
name = "dulichviet-api"
version = "2.0.0"
description = "AI Travel Itinerary Recommendation System - Backend"
requires-python = ">=3.12"
dependencies = [
    # === Core ===
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    # === Database ===
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    # === Config & Validation ===
    "pydantic-settings>=2.7.0",
    "pydantic[email-validator]>=2.10.0",
    "email-validator>=2.0.0",
    "pyyaml>=6.0.2",
    # === Auth ===
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "bcrypt>=4.0.1,<4.2.0",
    # === AI Agent (LangChain + LangGraph) ===
    "langchain-core>=0.3.0",
    "langchain-google-genai>=0.1.0",
    "langgraph>=0.2.0",
    "langsmith>=0.1.0",
    # === HTTP Client ===
    "httpx>=0.28.0",
    "python-multipart>=0.0.20",
    # === Utilities ===
    "python-dotenv>=1.0.0",
    "python-dateutil>=2.8.2",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.8.0",
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "pytest-cov>=6.0.0",
    "mypy>=1.13.0",
    "aiosqlite>=0.20.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "W", "F", "I", "N", "D", "UP", "B", "SIM", "C4"]
ignore = ["D100", "D104", "E501"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### 17.2 uv Commands

```bash
# 1. Cài uv (Windows PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Init project
cd Backend
uv init --app

# 3. Thêm dependencies
uv add fastapi uvicorn sqlalchemy asyncpg alembic \
  pydantic-settings pydantic pyyaml \
  python-jose passlib bcrypt python-multipart \
  langchain-core langchain-google-genai langgraph langsmith \
  httpx python-dotenv python-dateutil

# 4. Thêm dev dependencies
uv add --dev ruff pytest pytest-asyncio pytest-cov mypy

# 5. Chạy dev
uv run fastapi dev src/main.py --host 0.0.0.0 --port 8000

# 6. Format code
uv run ruff check --fix src/
uv run ruff format src/

# 7. Run tests
uv run pytest -v
```

---

## 18. Timeline Chi tiết — 8 tuần

### Phase A: Foundation (Tuần 1-2)

```
Week 1:
├── Day 1-2: Setup
│   ├── Xóa files cũ (render.yaml, vercel.json, root configs)
│   ├── Init uv project + pyproject.toml
│   ├── Tạo folder structure src/
│   └── git commit
│
├── Day 3-4: Core Layer
│   ├── src/core/config.py (yaml + .env merge)
│   ├── src/core/database.py (async engine, session factory)
│   ├── src/core/security.py (JWT + bcrypt + refresh token)
│   ├── src/core/exceptions.py (custom exceptions)
│   ├── src/core/middlewares.py (CORS, logging, error handler)
│   ├── src/core/constants.py (HTTP codes, error codes)
│   └── src/core/dependencies.py (DI chain)
│
├── Day 5: Base Layer
│   ├── src/base/repository.py (ABC Repository[T])
│   ├── src/base/service.py (ABC Service)
│   └── src/base/schema.py (Base Pydantic config)
│
└── Day 6-7: Alembic + Docker
    ├── uv run alembic init
    ├── Tạo first migration (001_initial_mvp2_schema.py)
    ├── uv run alembic upgrade head
    ├── Tạo Dockerfile (Backend/)
    ├── Tạo docker-compose.yml (root)
    └── git commit
```

### Phase B: Domain Implementation (Tuần 3-4)

```
Week 2 (Day 8-14):
├── Day 8-9: Auth Domain
│   ├── src/models/user.py, refresh_token.py
│   ├── src/schemas/auth.py
│   ├── src/repositories/user_repository.py
│   ├── src/services/auth_service.py
│   └── src/api/v1/auth.py
│
├── Day 10-11: Users Domain
│   ├── src/models/user.py (thêm phone, interests[])
│   ├── src/schemas/user.py
│   ├── src/repositories/user_repository.py
│   ├── src/services/user_service.py
│   └── src/api/v1/users.py
│
├── Day 12-13: Itineraries Domain
│   ├── src/models/trip.py, trip_day.py, activity.py
│   ├── src/schemas/itinerary.py
│   ├── src/repositories/trip_repository.py
│   ├── src/services/itinerary_service.py
│   └── src/api/v1/itineraries.py (10 endpoints)
│
└── Day 14: Places Domain
    ├── src/models/place.py, hotel.py
    ├── src/schemas/place.py
    ├── src/repositories/place_repository.py
    ├── src/services/place_service.py
    └── src/api/v1/places.py
```

### Phase C: Agent Integration (Tuần 5-6)

```
Week 3 (Day 15-21):
├── Day 15-17: Itinerary Agent (LangChain)
│   ├── src/agent/config.py (AgentConfig)
│   ├── src/agent/llm.py (LLM factory)
│   ├── src/agent/schemas.py (AgentActivity, AgentDay, AgentItinerary)
│   ├── src/agent/prompts.py
│   ├── src/agent/pipelines/itinerary_pipeline.py (5-step RAG)
│   └── src/api/v1/agent.py
│
├── Day 18-19: Companion Agent (LangGraph)
│   ├── src/agent/tools.py (5 @tool definitions)
│   ├── src/agent/graph.py (StateGraph, nodes, edges)
│   └── src/api/v1/agent_chat.py (POST /agent/chat)
│
└── Day 20-21: Suggestion Agent + LangSmith
    ├── src/agent/suggestion_agent.py (DB query-based)
    └── git commit
```

### Phase D: Integration + Polish (Tuần 7-8)

```
Week 4 (Day 22-28):
├── Day 22-23: FE Connection
│   ├── Test tất cả BE endpoints với FE api.ts types
│   ├── Verify: BE response khớp FE interface
│   └── API documentation
│
├── Day 24-25: Data + Migrations
│   ├── Alembic migration: 002_backfill_trip_days.py
│   └── Seed script → crawl script
│
├── Day 26-27: Docker Compose + Deploy
│   ├── Update docker-compose.yml (BE + FE + DB)
│   ├── Create Frontend/Dockerfile + nginx.conf
│   └── Test: docker compose up --build
│
└── Day 28: Documentation + Final Polish
    ├── Backend/docs/ (README, ARCHITECTURE, AGENT_DESIGN, DEPLOYMENT)
    ├── Run ruff format + lint
    └── git tag "v2.0.0"
```

---

## 19. Verification & Testing Plan

### 19.1 Local Verification Steps

```bash
# 1. Setup
cd Backend
uv sync --frozen

# 2. Migration
uv run alembic upgrade head

# 3. Run server
uv run fastapi dev src/main.py

# 4. Swagger docs
# → http://localhost:8000/docs

# 5. Test endpoints:
# POST /api/v1/auth/register
# POST /api/v1/auth/login
# POST /api/v1/itineraries/generate
# GET  /api/v1/itineraries/
# GET  /api/v1/destinations/
# GET  /health

# 6. Run full test suite
uv run pytest -v --tb=short

# 7. Run linter
uv run ruff check src/ --fix
uv run ruff format src/
```

### 19.2 Docker Verification

```bash
# Build all services
docker compose up --build

# Check all containers
docker compose ps

# Test health endpoints
curl http://localhost:8000/health

# E2E test
docker compose exec db psql -U postgres -d dulichviet -c "SELECT * FROM trips LIMIT 1;"
```

---

## 20. Trạng thái Open Questions — Cập nhật mới nhất

| # | Câu hỏi | Quyết định | Trạng thái |
|---|---------|-----------|------------|
| 1 | Schema source of truth | **FE `api.ts` inline types** (không có trip.types.ts) | ✅ Resolved |
| 2 | Start từ đâu | Phase A: Foundation (refactor BE trước) | ✅ Resolved |
| 3 | Goong API key | `GOONG_API_KEY=<ĐIỀN_SAU>` — placeholder trong .env | ✅ Resolved |
| 4 | LangSmith | `LANGCHAIN_API_KEY=<ĐIỀN_SAU>` — placeholder trong .env | ✅ Resolved |
| 5 | Seed data vs Crawl | Crawl (không seed). Data đã có trong DB từ MVP1. Cần cơ chế refresh | ✅ Resolved |
| 6 | .env bị commit | Rotate JWT_SECRET_KEY + GEMINI_API_KEY. Tạo key mới | ✅ Resolved |
| 7 | OAuth2 social login | MVP3 (sau core features stable) | ✅ Resolved |
| 8 | FE trip.types.ts | **KHÔNG TỒN TẠI** — types inline trong `api.ts` dòng 181-252 | ✅ Resolved |
| 9 | `feat/frontend-revamp` branch | Đã pull về local nhưng CHƯA merge. FE hiện tại là `main` | ✅ Resolved |
| 10 | Files cần xóa | `render.yaml`, `vercel.json`, root FE configs | ✅ Resolved |
| 11 | Deploy target | **Docker ONLY** — KHÔNG Vercel, KHÔNG Render | ✅ Resolved |
| 12 | Agent naming | `agent/` folder — 3 agents: itinerary, companion, suggestion | ✅ Resolved |
| 13 | Config location | `config.yaml` (app settings) + `.env` (secrets) | ✅ Resolved |
| 14 | Docstrings | Google style, BẮT BUỘC cho mọi class/method public | ✅ Resolved |
| 15 | uv package manager | Dùng `uv` thay vì pip. pyproject.toml thay vì requirements.txt | ✅ Resolved |

### 20.1 Những việc CẦN LÀM TRƯỚC KHI BẮT ĐẦU IMPLEMENT

```
□ 1. Rotate secrets (JWT_SECRET_KEY, GEMINI_API_KEY) — key cũ đã bị lộ
□ 2. Đăng ký tài khoản mới:
    - https://aistudio.google.com/apikey (GEMINI_API_KEY)
    - https://account.goong.io (GOONG_API_KEY)
    - https://smith.langchain.com (LANGCHAIN_API_KEY) — optional
□ 3. Xóa files deploy cũ (render.yaml, vercel.json, root FE configs)
□ 4. Init uv project + tạo pyproject.toml
□ 5. Pull feat/frontend-revamp branch (nếu muốn xem FE mới)
□ 6. Review plan → approve → bắt đầu Phase A
```

### 20.2 Những việc ĐÃ LÊN PLAN nhưng CHƯA CẦN LÀM NGAY

```
→ FE refactor: làm SAU khi BE refactor xong
→ Map integration (Goong Map): làm sau khi có key
→ OAuth2 social login: MVP3
→ Real-time collaboration (WebSocket): MVP3
→ Crawl script thực tế: sau khi có Goong API key
→ LangSmith observability: optional, làm sau khi có key
→ Admin dashboard: MVP3
```

---

## 21. Cách Đọc Plan Này

### 21.1 Thứ tự đọc khuyến nghị

1. **Đọc Section 1-3 trước** — Architecture + FE analysis + Agent overview
2. **Section 6** — Technical details (files to delete, structure, OOP, DI)
3. **Section 11** — FE Schema (source of truth thực sự)
4. **Section 12** — DB Migration
5. **Section 13-14** — Agent chi tiết (prompts, LangGraph)
6. **Section 18** — Timeline 8 tuần
7. **Section 20** — Open Questions status

### 21.2 Plan Version History

| Version | Ngày | Nội dung |
|---------|------|---------|
| v1-v4 | Trước | Initial architecture + Agent design |
| **v6** | 2026-04-14 | Update Section 22 với ACTUAL content từ `trip.types.ts` — xác minh `Activity.name` vs `Activity.title`, Activity type enum, Hotel embedded, TravelerInfo, Accommodation. Sửa breaking change trong schema comparison table |

---

## 22. FE Branch Analysis — `feat/frontend-revamp`

> **Trạng thái:** Branch đã fetch về local (`origin/feat/frontend-revamp`). CHƯA merge vào `main`. Code FE mới có **20,408 dòng thay đổi** so với `main`.

### 22.1 Cấu trúc folder MỚI trên branch

```
Frontend/src/                          ← KHÁC: có thêm /src/
├── main.tsx                           ← Entry point (giữ nguyên)
├── types/
│   └── trip.types.ts                   ← ✅ CÓ FILE NÀY RỒI!
│                                        ← Đây là source of truth schema!
├── app/
│   ├── App.tsx                        ← RouterProvider setup
│   ├── routes.tsx                    ← 10 routes mới (TripWorkspace, CompanionDemo, ...)
│   ├── pages/
│   │   ├── TripWorkspace.tsx        ← ✅ TRANG CHÍNH MỚI (22KB)
│   │   ├── DailyItinerary.tsx       ← ✅ Component hiển thị ngày (33KB)
│   │   ├── CompanionDemo.tsx          ← ✅ Demo companion features (9KB)
│   │   ├── CreateTrip.tsx           ← ✅ Form tạo trip (13KB)
│   │   ├── ManualTripSetup.tsx      ← ✅ Setup thủ công (18KB)
│   │   ├── TripHistory.tsx          ← ✅ Lịch sử trip (21KB)
│   │   ├── Home.tsx
│   │   ├── TripPlanning.tsx         ← (giữ từ main)
│   │   └── ItineraryView.tsx        ← (giữ từ main)
│   ├── components/
│   │   ├── companion/
│   │   │   ├── FloatingAIChat.tsx  ← ✅ Chat bubble AI (6KB) — CHƯA kết nối BE
│   │   │   ├── ContextualSuggestionsPanel.tsx ← ✅ Gợi ý sidebar (12KB)
│   │   │   ├── ActivityDetailModal.tsx ← ✅ Modal chi tiết activity (24KB)
│   │   │   ├── PlaceSelectionModal.tsx  ← ✅ Modal chọn place (18KB)
│   │   │   ├── TripAccommodation.tsx   ← ✅ Component lưu trú (22KB)
│   │   │   └── BudgetTracker.tsx       ← ✅ Component theo dõi budget (14KB)
│   │   ├── Header.tsx
│   │   └── ui/                        ← 30+ Radix UI components
│   ├── hooks/
│   │   ├── useActivityManager.ts    ← ✅ CRUD activities (7KB)
│   │   ├── useAccommodation.ts      ← ✅ CRUD accommodation (3KB)
│   │   ├── usePlacesManager.ts      ← ✅ Quản lý saved places (4KB)
│   │   ├── useTripSync.ts           ← ✅ Sync trip data (7KB)
│   │   ├── useTripCost.ts           ← ✅ Tính chi phí (6KB)
│   │   └── useTripState.ts          ← ✅ State management
│   └── utils/
│       ├── api.ts                   ← ✅ API client MỚI
│       ├── auth.ts                  ← (giữ từ main)
│       └── itinerary.ts              ← (giữ từ main)
├── data/
│   ├── tripConstants.ts             ← ✅ Constants cho trip (16KB)
│   ├── cities.ts                   ← ✅ Danh sách thành phố (16KB)
│   ├── places.ts                    ← ✅ Mock places (6KB)
│   └── suggestions.ts               ← ✅ Mock suggestions (3KB)
└── styles/
    ├── index.css
    └── theme.css
```

### 22.2 Schema quan trọng: `trip.types.ts` (FILE MỚI — ACTUAL CONTENT)

Đây là **source of truth schema** trên branch mới. Agent đã đọc trực tiếp file từ `origin/feat/frontend-revamp`:

```typescript
// Frontend/src/app/types/trip.types.ts
// Source: git show origin/feat/frontend-revamp:Frontend/src/app/types/trip.types.ts

export interface ExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

export interface Activity {
  id: number;                        // ← Số nguyên, không phải string
  time: string;
  endTime?: string;                  // ← MỚI: giờ kết thúc
  name: string;                      // ← Tên activity (KHÔNG PHẢI title!)
  location: string;
  description: string;
  type: "food" | "attraction" | "nature" | "entertainment" | "shopping"; // ← Enum
  image: string;
  transportation?: "walk" | "bike" | "bus" | "taxi"; // ← MỚI
  // Cost fields
  adultPrice?: number;              // ← MỚI: giá người lớn (per person)
  childPrice?: number;             // ← MỚI: giá trẻ em (per person)
  customCost?: number;             // ← MỚI: chi phí tùy chỉnh (shopping, entertainment)
  busTicketPrice?: number;         // ← MỚI: vé bus per person
  taxiCost?: number;               // ← MỚI: chi phí taxi tổng
  extraExpenses?: ExtraExpense[];  // ← MỚI: chi tiêu phụ
}

export interface DayExtraExpense {
  id: number;
  name: string;
  amount: number;
  category: "food" | "attraction" | "entertainment" | "transportation" | "shopping";
}

export interface Day {
  id: number;                        // ← Số nguyên
  label: string;                     // ← MỚI: "Ngày 1", "Day 1"
  date: string;
  activities: Activity[];
  destinationName?: string;          // ← MỚI
  extraExpenses?: DayExtraExpense[]; // ← MỚI (khác với Activity.extraExpenses)
}

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

export interface Destination {
  id: number;
  name: string;
  country: string;
  image: string;
  rating: number;
}

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

export interface Accommodation {
  hotel: Hotel;                    // ← Embedded Hotel object, KHÔNG phải hotelName
  dayIds: number[];                 // ← MỚI: áp dụng cho những ngày nào
  bookingType?: 'hourly' | 'nightly' | 'daily'; // ← MỚI
  duration?: number;               // ← MỚI
}

export interface TravelerInfo {
  adults: number;
  children: number;
  total: number;                   // ← Tổng = adults + children
}

export interface TimeConflictWarning {
  hasConflict: boolean;
  conflictWith?: Activity;
}

// ⚠️ LƯU Ý: Trip interface KHÔNG tồn tại trong trip.types.ts!
// trip.types.ts chỉ định nghĩa các interface thành phần (Activity, Day, ...)
// FE sử dụng Trip dưới dạng anonymous object trong state (xem TripWorkspace.tsx)
```

### 22.3 So sánh Schema: Branch MỚI vs Branch CŨ (main) — ACTUAL VERIFIED

| Trường | Branch `main` (`api.ts`) | Branch `feat/frontend-revamp` (`trip.types.ts`) | Thay đổi BE? |
|--------|--------------------------|----------------------------------------------|-------------|
| `Activity.id` | `string` (UUID) | `number` (integer) | Có — int primary key |
| `Activity.name` | `title` | `name` ❗ | Có — đổi `title` → `name` |
| `Activity.endTime` | ❌ Không có | ✅ Có | Có — thêm vào schema |
| `Activity.type` | ❌ Không có | ✅ Có (5 giá trị enum) | Có — thêm column |
| `Activity.adultPrice` | ❌ (dùng `cost`) | ✅ Có | Có — thêm column |
| `Activity.childPrice` | ❌ | ✅ Có | Có — thêm column |
| `Activity.customCost` | ❌ | ✅ Có (shopping/entertainment) | Có |
| `Activity.transportation` | ❌ | ✅ Có (walk/bike/bus/taxi) | Có — thêm column |
| `Activity.busTicketPrice` | ❌ | ✅ Có | Có |
| `Activity.taxiCost` | ❌ | ✅ Có | Có |
| `Activity.extraExpenses` | ❌ | ✅ Có | Có — thêm bảng |
| `Day.id` | `string` (UUID) | `number` (integer) | Có — int PK |
| `Day.label` | ❌ Không có | ✅ Có ("Ngày 1", ...) | Có — thêm column |
| `Day.extraExpenses` | ❌ | ✅ Có (DayExtraExpense[]) | Có — thêm bảng |
| `TravelerInfo.adults` | ❌ | ✅ Có | Có — thêm field |
| `TravelerInfo.children` | ❌ | ✅ Có | Có — thêm field |
| `TravelerInfo.total` | ❌ | ✅ Có | Có — computed field |
| `Accommodation.hotel` | ❌ | ✅ Có (embedded Hotel object) | Có — bảng mới |
| `Accommodation.dayIds` | ❌ | ✅ Có (number[]) | Có |
| `Accommodation.bookingType` | ❌ | ✅ Có (hourly/nightly/daily) | Có |
| `Hotel` (embedded) | ❌ | ✅ Có (9 fields) | Có — bảng mới |

> **⚠️ CRITICAL**: `Activity.title` trên main branch CẦN ĐỔI THÀNH `Activity.name` trên BE response! FE mới dùng `name`, không phải `title`. Đây là breaking change trong API response.

### 22.4 Các tính năng MỚI trên branch cần BE hỗ trợ

```
Tính năng MVP2 trên FE mới:
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. TRIP WORKSPACE — Trang chính sau khi tạo trip                      │
│    - Hiển thị lộ trình dạng timeline/canvas                            │
│    - Kéo thả activities giữa các ngày                                   │
│    - Theo dõi budget real-time                                          │
│    → Cần: PUT /api/v1/trips/{id} (update full trip JSON)              │
│                                                                        │
│ 2. FLOATING AI CHAT — Chat bubble trên màn hình                        │
│    - Hiện tại: setTimeout giả lập (ko gọi BE)                         │
│    → Cần: WS /ws/agent-chat/{trip_id} hoặc POST /api/v1/agent/chat   │
│                                                                        │
│ 3. COMPANION AGENT — Trợ lý du lịch thông minh                        │
│    - DailyBrief: thông tin đầu ngày (thời tiết, số activities)         │
│    - SmartReminders: nhắc nhở thông minh                              │
│    - PlaceSuggestions: gợi ý địa điểm theo context                    │
│    → Cần: GET /api/v1/agent/suggest/{activity_id}                     │
│                                                                        │
│ 4. BUDGET TRACKER — Theo dõi chi phí real-time                        │
│    - Breakdown theo category (food, transport, lodging, ...)            │
│    - Per-person cost calculation                                      │
│    → Cần: tính toán ở BE hoặc FE (FE có thể tự tính)               │
│                                                                        │
│ 5. ACCOMMODATION MANAGEMENT — Quản lý lưu trú                         │
│    - CRUD khách sạn trong trip                                       │
│    → Cần: POST/PUT/DELETE /api/v1/trips/{id}/accommodations           │
│                                                                        │
│ 6. SHARE TRIP — Chia sẻ lộ trình qua link/QR                          │
│    → Cần: POST /api/v1/trips/{id}/share → shareToken                 │
│    → Cần: GET /api/v1/trips/shared/{token} (public, không cần auth)   │
│                                                                        │
│ 7. TRIP SYNC — Đồng bộ dữ liệu (auto-save interval 5s)              │
│    → Cần: WebSocket cho real-time collab (MVP3)                       │
│    → MVP2: polling hoặc auto-save qua PUT /api/v1/trips/{id}         │
└────────────────────────────────────────────────────────────────────────┘
```

### 22.5 API endpoints MỚI cần thêm ở BE

```typescript
// Frontend/src/app/utils/api.ts — endpoints MỚI cần gọi

// 1. Trip CRUD mở rộng
PUT    /api/v1/trips/{id}                    // Update full trip (reorder, modify)
POST   /api/v1/trips/{id}/activities        // Thêm activity
PUT    /api/v1/trips/{id}/activities/{aid}  // Update activity
DELETE /api/v1/trips/{id}/activities/{aid}  // Xóa activity
POST   /api/v1/trips/{id}/accommodations   // Thêm accommodation
PUT    /api/v1/trips/{id}/accommodations/{id} // Update accommodation
DELETE /api/v1/trips/{id}/accommodations/{id} // Xóa accommodation

// 2. Share trip
POST   /api/v1/trips/{id}/share             // Tạo share link → { shareToken, url }
GET    /api/v1/trips/shared/{token}         // Lấy trip công khai qua token

// 3. Agent endpoints
POST   /api/v1/agent/chat                  // Companion Agent chat
WS     /ws/agent-chat/{trip_id}             // Streaming chat
GET    /api/v1/agent/suggest/{activity_id}  // Suggestion Agent

// 4. Places mở rộng
GET    /api/v1/places/suggestions           // Gợi ý places theo context
GET    /api/v1/places/nearby                 // Places gần tọa độ
GET    /api/v1/destinations/{name}/detail    // Chi tiết destination
```

### 22.6 Kết luận: BE cần thay đổi gì cho FE mới

> **Quyết định:** Branch `feat/frontend-revamp` là **source of truth** mới. BE PHẢI adapt theo schema này.

```
□ Thêm fields mới vào ItineraryResponse (endTime, category, adultPrice, childPrice, ...)
□ Thêm bảng mới: accommodations, shared_trips, extra_expenses
□ Thêm travelers_count vào Trip model
□ Thêm endpoints mới (share, accommodations CRUD, agent chat)
□ Update AI prompts để sinh ra đầy đủ schema mới
```

---

## 23. AI Agent — Chi Tiết Từng Bước (Step-by-Step Guide)

### 23.1 Tổng quan 3 Agent

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        AI AGENT SYSTEM OVERVIEW                            │
│                                                                            │
│   USER ────▶ TripPlanning Form ────▶ ITINERARY AGENT ────▶ Trip JSON     │
│                 (POST generate)       (LangChain, RAG)                    │
│                                       Sinh lộ trình chi tiết               │
│                                                                            │
│   USER ────▶ FloatingAIChat ───────▶ COMPANION AGENT ────▶ Response        │
│                 (WS/POST chat)         (LangGraph, Tools)                   │
│                                       Chat, chỉnh sửa, gợi ý             │
│                                                                            │
│   USER ────▶ ContextualPanel ──────▶ SUGGESTION AGENT ──▶ Place[]        │
│                 (GET suggest)          (DB Query, no LLM)                  │
│                                       Gợi ý places gần đó                 │
└────────────────────────────────────────────────────────────────────────────┘
```

### 23.2 Agent 1: Itinerary Agent — Từng bước chi tiết

#### Step 1: FE gọi API

```typescript
// Frontend: TripWorkspace.tsx hoặc TripPlanning.tsx
const trip = await api.post('/trips/generate', {
  destination: "Hà Nội",
  startDate: "2026-04-15",
  endDate: "2026-04-17",
  budget: 5000000,
  interests: ["culture", "food", "nature"],
  travelers: { adults: 2, children: 0, infants: 0 }  // ← Từ FE mới
});
```

#### Step 2: Router nhận request

```python
# src/api/v1/trips.py

@router.post("/generate", response_model=ItineraryResponse, status_code=201)
async def generate_trip(
    data: TripGenerateRequest,
    current_user: User | None = Depends(get_optional_user),
    service: TripService = Depends(get_trip_service),
) -> ItineraryResponse:
    """
    Sinh lịch trình du lịch bằng AI.
    
    Flow:
    1. Validate request
    2. Gọi ItineraryService.generate()
    3. Service gọi AgentService.get_itinerary()
    4. Agent fetch DB metadata → build prompt → call LLM
    5. Parse response → save to DB → return
    """
    trip = await service.generate(data=data, user_id=current_user.id if current_user else None)
    return ItineraryResponse.model_validate(trip)
```

#### Step 3: Service gọi Agent

```python
# src/services/trip_service.py

class TripService:
    def __init__(self, repo: TripRepository, agent: AgentService):
        self._repo = repo
        self._agent = agent
    
    async def generate(self, data: TripGenerateRequest, user_id: str | None) -> Trip:
        # ── Gọi AI Agent ────────────────────────────────────────
        agent_result = await self._agent.generate_itinerary(
            destination=data.destination,
            start_date=data.startDate,
            end_date=data.endDate,
            budget=data.budget,
            interests=data.interests,
            travelers=data.travelers,  # ← Travelers từ FE mới
        )
        
        # ── Map AI output → DB models ───────────────────────────
        trip = await self._create_trip_from_agent(data, agent_result, user_id)
        
        # ── Tính total_cost ─────────────────────────────────────
        trip.total_cost = self._calculate_total_cost(agent_result, data.travelers)
        
        await self._repo.create(trip)
        await self._repo.commit()
        
        return trip
```

#### Step 4: Agent — RAG Pipeline chi tiết (5 bước)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    ITINERARY AGENT — 5-STEP RAG PIPELINE                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  STEP 1: VALIDATE INPUT (src/agent/pipelines/itinerary_pipeline.py)      ║
║  ────────────────────────────────────────────────────────────────────     ║
║  data = {                                                                 ║
║    destination: "Hà Nội",                                                  ║
║    start_date: "2026-04-15",                                              ║
║    end_date: "2026-04-17",                                                ║
║    budget: 5000000,                                                       ║
║    interests: ["culture", "food"],                                         ║
║    travelers: { adults: 2, children: 0 }                                  ║
║  }                                                                        ║
║  Validation:                                                              ║
║    □ destination not empty                                                 ║
║    □ budget >= 100,000 VND                                                ║
║    □ 1 <= num_days <= 14                                                 ║
║    □ travelers.adults >= 1                                                ║
║  num_days = (end_date - start_date).days = 2                              ║
║                                                                           ║
║                              ▼                                             ║
║                                                                           ║
║  STEP 2: FETCH DB METADATA (RAG Retrieval)                               ║
║  ────────────────────────────────────────────────────────────────────     ║
║  Query:                                                                   ║
║  SELECT place_name, category, rating, cost, location, duration           ║
║  FROM places                                                              ║
║  WHERE destination = "Hà Nội"                                             ║
║    AND category = ANY(ARRAY["culture", "food"])                          ║
║  ORDER BY rating DESC LIMIT 50                                            ║
║                                                                           ║
║  Result: ~30-50 places → chuyển thành text context (tối đa 2000 chars)   ║
║  Ví dụ:                                                                  ║
║  "- Hồ Hoàn Kiếm | culture | 4.5/5 | 0 VND | Hà Nội"                    ║
║  "- Phố Cổ Hà Nội | culture | 4.3/5 | 0 VND | Hà Nội"                    ║
║  "- Bún Chả Hương | food | 4.7/5 | 80,000 VND | Hà Nội"                 ║
║                                                                           ║
║                              ▼                                             ║
║                                                                           ║
║  STEP 3: BUILD PROMPT                                                     ║
║  ────────────────────────────────────────────────────────────────────     ║
║  System Prompt:                                                           ║
║  "Bạn là chuyên gia du lịch Việt Nam. Tạo lịch trình chi tiết..."       ║
║                                                                           ║
║  User Prompt:                                                             ║
║  "Điểm đến: Hà Nội                                                      ║
║   Số ngày: 3 ngày                                                        ║
║   Ngân sách: 5.000.000 VND                                                ║
║   Sở thích: văn hóa, ẩm thực                                              ║
║   Thành phần: 2 người lớn                                                 ║
║                                                                           ║
║   Dữ liệu địa điểm có sẵn:                                              ║
║   [từ STEP 2]                                                            ║
║                                                                           ║
║   Yêu cầu định dạng JSON..."                                            ║
║                                                                           ║
║                              ▼                                             ║
║                                                                           ║
║  STEP 4: LLM CALL (LangChain + Gemini Structured Output)                 ║
║  ────────────────────────────────────────────────────────────────────     ║
║  Code:                                                                   ║
║  ```python                                                                ║
║  llm = create_llm()  # ChatGoogleGenerativeAI(gemini-2.0-flash)          ║
║  structured_llm = llm.with_structured_output(ItinerarySchema)            ║
║  result: ItinerarySchema = await structured_llm.ainvoke([                ║
║    ("system", SYSTEM_PROMPT),                                             ║
║    ("human", user_prompt)                                                ║
║  ])                                                                       ║
║  ```                                                                      ║
║                                                                           ║
║  Gemini trả về TRỰC TIẾP Pydantic object (không parse JSON text)          ║
║  Temperature: 0.7 (cân bằng sáng tạo và độ chính xác)                   ║
║  Timeout: 30s                                                             ║
║  Retry: 1 lần nếu fail                                                   ║
║                                                                           ║
║                              ▼                                             ║
║                                                                           ║
║  STEP 5: POST-PROCESS + SAVE                                              ║
║  ────────────────────────────────────────────────────────────────────     ║
║  1. Validate Pydantic output (tự động bởi Pydantic)                     ║
║  2. Map place names → place_ids (fuzzy match nếu cần)                   ║
║  3. Enrich: lấy full images, coordinates từ DB                          ║
║  4. Validate budget: total_cost <= budget                                 ║
║     → Nếu vượt: trừ activities ít quan trọng hoặc gợi ý giảm          ║
║  5. Tính total_cost với travelers:                                       ║
║     total = Σ(activity.cost × adults) + accommodation + food              ║
║  6. Save to DB: INSERT Trip, TripDays, Activities                        ║
║  7. Return: ItineraryResponse (khớp với FE trip.types.ts)               ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

#### Step 5: Fallback khi AI fail

```
AI FAIL SCENARIOS:
─────────────────
1. Gemini API timeout (30s)
2. Gemini API rate limit
3. Gemini API error (500, 403)
4. Invalid JSON response (LLM hallucinate format)
5. Validation error (Pydantic reject output)

FALLBACK STRATEGY:
─────────────────
config.agent.fallback_to_mock = True (trong config.yaml)
    ↓
_generate_fallback_itinerary() được gọi
    ↓
Dùng mock data cứng cho 4 thành phố:
- Hà Nội: Hồ Hoàn Kiếm, Phố Cổ, Lăng Bác, Văn Miếu
- TP.HCM: Dinh Độc Lập, Nhà Thờ Đức Bà, Chợ Bến Thành
- Đà Nẵng: Bãi Biển Mỹ Khê, Bà Nà Hills, Ngũ Hành Sơn
- Hội An: Phố Cổ, Chùa Cầu, Bãi Biển An Bàng

Logic:
- Shuffle activities theo ngày
- Thêm 500k/ngày accommodation + 300k/ngày food
- Gán place_ids từ DB nếu có

User thấy: vẫn có itinerary, không bị crash
→ Message: "AI temporarily unavailable. Showing sample itinerary."
```

### 23.3 Agent 2: Companion Agent — Từng bước chi tiết

#### Luồng hoạt động

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                  COMPANION AGENT — LangGraph StateGraph                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  FE: User gõ tin nhắn vào FloatingAIChat                                ║
║  ```                                                                    ║
║  POST /api/v1/agent/chat                                                ║
║  {                                                                       ║
║    "trip_id": "uuid-của-trip",                                          ║
║    "message": "Thêm bãi biển Mỹ Khê vào ngày 2"                        ║
║  }                                                                       ║
║  ```                                                                    ║
║                              ▼                                           ║
║                                                                           ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ NODE 1: route_intent (intent classification)                    │   ║
║  │───────────────────────────────────────────────────────────────│   ║
║  │ Input: user message                                              │   ║
║  │ "Thêm bãi biển Mỹ Khê vào ngày 2"                               │   ║
║  │                                                                   │   ║
║  │ Classification:                                                   │   ║
║  │ - intent = "MODIFY" (muốn thêm địa điểm)                        │   ║
║  │ - needs_tool = True                                              │   ║
║  │ - reason = "user muốn thêm activity vào lộ trình"                │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              │                                            ║
║                     ┌────────┴────────┐                                  ║
║                     │  should_use_tools? │                                 ║
║                     │  (conditional edge) │                                 ║
║                     └────────┬────────┘                                  ║
║                              │ needs_tool=True                            ║
║                              ▼                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ NODE 2: tools (execute tools based on intent)                     │   ║
║  │───────────────────────────────────────────────────────────────│   ║
║  │                                                                   │   ║
║  │ Intent = MODIFY → 2 tool calls:                                   │   ║
║  │                                                                   │   ║
║  │ @tool search_places_db(                                           │   ║
║  │     query="Mỹ Khê",                                               │   ║
║  │     city="Đà Nẵng",                                              │   ║
║  │     type="beach"                                                  │   ║
║  │ ) → returns: [Place{id, name, cost, location, ...}]              │   ║
║  │                                                                   │   ║
║  │ @tool modify_itinerary(                                            │   ║
║  │     action="add_activity",                                         │   ║
║  │     trip_id="uuid",                                               │   ║
║  │     day_id=2,                                                     │   ║
║  │     activity_data={                                                 │   ║
║  │       place_id="place-uuid",                                       │   ║
║  │       time="09:00",                                                │   ║
║  │       cost=0                                                       │   ║
║  │     }                                                             │   ║
║  │ ) → returns: { success: true, changes: [...] }                     │   ║
║  │                                                                   │   ║
║  │ tool_results = {                                                   │   ║
║  │   "search_places_db": { places: [...] },                           │   ║
║  │   "modify_itinerary": { success: true, changes_applied: 1 }        │   ║
║  │ }                                                                 │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              │                                            ║
║                              ▼                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ NODE 3: respond (LLM generates natural language response)         │   ║
║  │───────────────────────────────────────────────────────────────│   ║
║  │                                                                   │   ║
║  │ System: "Bạn là trợ lý du lịch..."                               │   ║
║  │ Human: "Kết quả công cụ: {tool_results}"                        │   ║
║  │        "Câu hỏi: Thêm bãi biển Mỹ Khê vào ngày 2"              │   ║
║  │                                                                   │   ║
║  │ LLM Response:                                                    │   ║
║  │ "Đã thêm Bãi Biển Mỹ Khê vào ngày 2 (09:00)!                    │   ║
║  │                                                                   │   ║
║  │ Chi phí: Miễn phí                                               │   ║
║  │ Gợi ý: Kết hợp với Bà Nà Hills buổi chiều để tận hưởng          │   ║
║  │ biển Mỹ Khê buổi sáng rồi đi cáp treo Bà Nà."                  │   ║
║  │                                                                   │   ║
║  │ Ngoài ra, bạn có muốn tôi gợi ý thêm quán ăn gần đó không?"     │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              ▼                                            ║
║                         FE: Hiển thị response trong FloatingAIChat         ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

#### Intent Classification Examples

| User message | Intent | Tool(s) cần gọi | Response |
|-------------|--------|-----------------|---------|
| "Thêm bãi biển vào ngày 2" | `MODIFY` | `search_places_db` + `modify_itinerary` | "Đã thêm..." |
| "Quán ăn ngon ở đây?" | `QUERY_PLACE` | `search_places_db(type=food)` | Danh sách quán |
| "Có gần ga không?" | `QUERY_NEARBY` | `search_nearby_goong` | "Ga cách..." |
| "Tổng chi phí hết bao nhiêu?" | `QUERY_COST` | `recalculate_budget` | Breakdown chi phí |
| "Đường đi từ Bà Nà đến Ngũ Hành Sơn?" | `QUERY_ROUTE` | `calculate_route` | "30 phút, 15km..." |
| "Cảm ơn nhé!" | `GREETING` | Không | "Chúc bạn..." |
| "Tôi nên đi mấy ngày?" | `GENERAL` | Không (LLM trả lời trực tiếp) | Advice |

### 23.4 Agent 3: Suggestion Agent — Từng bước chi tiết

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                     SUGGESTION AGENT — DB Query Only                     ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Trigger: User mở ContextualSuggestionsPanel hoặc xem Activity chi tiết  ║
║                                                                           ║
║  FE gọi:                                                                 ║
║  GET /api/v1/agent/suggest/{activity_id}                                  ║
║                              │                                            ║
║                              ▼                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ 1. Lấy current activity                                          │   ║
║  │    SELECT * FROM activities WHERE id = :activity_id               │   ║
║  │    → current = { category: "beach", place_id: "...",             │   ║
║  │                   trip.destination: "Đà Nẵng" }                   │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              │                                            ║
║                              ▼                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ 2. Query correlated places                                       │   ║
║  │    SELECT * FROM places                                          │   ║
║  │    WHERE destination = "Đà Nẵng"                                 │   ║
║  │      AND category IN (correlated_categories["beach"])              │   ║
║  │      AND id != current_place_id                                   │   ║
║  │    ORDER BY rating DESC LIMIT 5                                   │   ║
║  │                                                                   │   ║
║  │    correlated_categories = {                                      │   ║
║  │      "beach": ["beach", "nature", "food"],                        │   ║
║  │      "food": ["food", "culture", "sightseeing"],                  │   ║
║  │      "culture": ["culture", "sightseeing", "nature"],              │   ║
║  │      "nature": ["nature", "beach", "adventure"],                   │   ║
║  │    }                                                             │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                              │                                            ║
║                              ▼                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │ 3. Trả về cho FE                                                  │   ║
║  │    return [Place, Place, Place, Place, Place]                     │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                                                                           ║
║  FE hiển thị:                                                            ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │  Gợi ý cho bạn                                                    │    ║
║  │  ─────────────────────────────────────────────────────────────── │    ║
║  │  🏖️ Bãi Biển An Bàng    | ⭐4.5 | Miễn phí | 2km               │    ║
║  │  🍜 Quán Lẩu Gánh          | ⭐4.7 | ~100k  | 1.5km            │    ║
║  │  🏞️ Ngũ Hành Sơn         | ⭐4.3 | 40k    | 3km               │    ║
║  │                                                                   │    ║
║  │  [Xem chi tiết] [Thêm vào ngày 2] [Lưu]                       │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 23.5 AI Integration với LangSmith (Observability)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        LANGSMITH INTEGRATION                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Mục đích: Trace tất cả LLM calls → debug prompt, monitor cost          ║
║  Activated khi: LANGCHAIN_TRACING_V2=true + LANGCHAIN_API_KEY set        ║
║                                                                           ║
║  .env:                                                                    ║
║  LANGCHAIN_API_KEY=<ĐIỀN_SAU>                                           ║
║  LANGCHAIN_TRACING_V2=false  ← MVP2: false, MVP3: true                  ║
║  LANGCHAIN_PROJECT=dulichviet-agent                                       ║
║                                                                           ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │  Mỗi LLM call tạo 1 trace trên LangSmith dashboard:             │   ║
║  │                                                                   │   ║
║  │  Trace #001                                                         │   ║
║  │  ├─ Model: gemini-2.0-flash                                        │   ║
║  │  ├─ Tokens: 450 in / 1200 out                                       │   ║
║  │  ├─ Latency: 1.2s                                                   │   ║
║  │  ├─ Input Tokens: $0.001                                           │   ║
║  │  ├─ Output Tokens: $0.002                                           │   ║
║  │  ├─ Total Cost: $0.003                                             │   ║
║  │  ├─ Tags: ["itinerary-agent", "hanoi"]                              │   ║
║  │  └─ Feedback: 👍 (user rated)                                       │   ║
║  │                                                                   │   ║
║  │  Trace #002                                                         │   ║
║  │  ├─ Model: gemini-2.0-flash                                        │   ║
║  │  ├─ Tool Calls: [search_places_db, modify_itinerary]              │   ║
║  │  ├─ Tags: ["companion-agent", "chat"]                              │   ║
║  │  └─ Status: success                                                  │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║                                                                           ║
║  Cost estimation per request:                                            ║
║  - Itinerary Agent: ~1,500 tokens → ~$0.003 (Gemini 2.0 Flash)         ║
║  - Companion Agent: ~500 tokens → ~$0.001                                ║
║  - 100 trips/day = ~$0.30/day = ~$9/month                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 23.6 Goong API Integration (Map + Directions)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                         GOONG API INTEGRATION                             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  Mục đích: Thay thế Google Maps API (miễn phí cho VN)                  ║
║  Đăng ký: https://account.goong.io                                       ║
║  Free tier: 10,000 requests/tháng                                        ║
║                                                                           ║
║  .env:                                                                    ║
║  GOONG_API_KEY=<ĐIỀN_SAU>                                               ║
║                                                                           ║
║  2 API endpoints chính:                                                   ║
║                                                                           ║
║  1. Place Search (dùng trong Companion Agent)                           ║
║  ────────────────────────────────────────────────────────────────────     ║
║  GET https://rsapi.goong.io/place/api_textsearch                         ║
║  Params:                                                                 ║
║    api_key: <GOONG_API_KEY>                                              ║
║    query: "quán ăn ngon"                                                 ║
║    location: 16.0544,108.2022  (Đà Nẵng)                                ║
║    radius: 3000  (3km)                                                   ║
║  Response:                                                                ║
║    { results: [{ name, formatted_address, lat, lng, rating }, ...] }   ║
║                                                                           ║
║  2. Directions (dùng trong Companion Agent)                             ║
║  ────────────────────────────────────────────────────────────────────     ║
║  GET https://rsapi.goong.io/direction/v1/driving                         ║
║  Params:                                                                 ║
║    api_key: <GOONG_API_KEY>                                              ║
║    origin: 16.0544,108.2022  (Bà Nà Hills)                              ║
║    destination: 16.0479,108.2449  (Ngũ Hành Sơn)                        ║
║  Response:                                                                ║
║    { routes: [{ distance: 15000 (meters), duration: 1800 (seconds) }] } ║
║                                                                           ║
║  Lưu ý:                                                                   ║
║  - Goong API key FREE có daily limit → cần cache kết quả              ║
║  - Cache: Redis hoặc simple in-memory cache (MVP2)                     ║
║  - Ví dụ: same route query → trả từ cache trong 24h                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 24. Step-by-Step Implementation Guide — AI Agent

### 24.1 File Structure cho Agent

```
src/agent/
│
├── __init__.py                     # export AgentService, CompanionService
│
├── config.py                       # AgentConfig từ config.yaml
│   class AgentConfig:              # model, temperature, timeout, fallback
│
├── llm.py                          # LLM factory
│   def create_llm() -> ChatGoogleGenerativeAI
│   def create_llm_with_tracing()   # có LangSmith tracing
│
├── prompts/
│   ├── __init__.py
│   ├── itinerary_prompts.py        # ITINERARY_SYSTEM_PROMPT + USER_TEMPLATE
│   └── companion_prompts.py        # COMPANION_SYSTEM_PROMPT
│
├── schemas/
│   ├── __init__.py
│   ├── itinerary_schemas.py        # AgentActivity, AgentDay, AgentItinerary
│   └── companion_schemas.py        # CompanionState, IntentClassification
│
├── pipelines/
│   ├── __init__.py
│   ├── itinerary_pipeline.py      # 5-step RAG pipeline
│   └── companion_pipeline.py       # LangGraph StateGraph wrapper
│
├── tools/
│   ├── __init__.py
│   ├── companion_tools.py         # 5 @tool decorated functions
│   └── tool_registry.py           # bind tools → LLM
│
├── graph/
│   ├── __init__.py
│   └── companion_graph.py         # build_companion_graph() → CompiledGraph
│
└── services/
    ├── __init__.py
    ├── agent_service.py            # ItineraryService (high-level wrapper)
    └── companion_service.py        # CompanionService (high-level wrapper)
```

### 24.2 Từng file cần tạo — Chi tiết

#### File 1: `src/agent/config.py`

```python
"""
src/agent/config.py
====================
Agent configuration — đọc từ config.yaml và .env.

Mỗi field giải thích:
- model_name: Gemini model dùng cho tất cả agents
- temperature: 0.0 = deterministic, 1.0 = creative
  → 0.7 là sweet spot cho travel: đủ sáng tạo nhưng không hallucinate
- max_output_tokens: giới hạn response length
  → 2048 tokens = ~1500 words tiếng Việt = đủ cho 1 lộ trình 3 ngày
- timeout_seconds: nếu LLM không respond sau X giây → fail
- fallback_to_mock: nếu AI fail → dùng mock data thay vì lỗi
"""
from dataclasses import dataclass
from src.core.config.settings import AppConfig


@dataclass(frozen=True)
class AgentConfig:
    """Cấu hình cho tất cả agents. Immutable — đọc lúc startup."""
    
    model_name: str
    temperature: float
    max_output_tokens: int
    timeout_seconds: int
    fallback_to_mock: bool
    gemini_api_key: str
    langsmith_api_key: str
    langsmith_project: str
    langsmith_tracing: bool

    @classmethod
    def from_settings(cls) -> "AgentConfig":
        """Load từ AppConfig (merge config.yaml + .env)."""
        _yml = AppConfig.yaml
        _settings = AppConfig.settings
        return cls(
            model_name=_yml.agent.model_name,
            temperature=_yml.agent.temperature,
            max_output_tokens=_yml.agent.max_output_tokens,
            timeout_seconds=_yml.agent.timeout_seconds,
            fallback_to_mock=_yml.agent.fallback_to_mock,
            gemini_api_key=_settings.GEMINI_API_KEY,
            langsmith_api_key=_settings.LANGCHAIN_API_KEY,
            langsmith_project=_yml.agent.langsmith_project,
            langsmith_tracing=_settings.LANGCHAIN_TRACING_V2,
        )


# Singleton instance — dùng khắp nơi trong agent code
agent_config = AgentConfig.from_settings()
```

#### File 2: `src/agent/llm.py`

```python
"""
src/agent/llm.py
===============
LLM Factory — tạo ChatGoogleGenerativeAI instance.

2 factory functions:
- create_llm(): LLM thường (không tracing)
- create_llm_with_tracing(): LLM + LangSmith tracing

Tại sao cần factory?
- Tránh hardcode model name ở nhiều chỗ
- Dễ swap model (gemini-2.0-flash → gemini-2.5-pro)
- Có thể mock trong tests
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from src.agent.config import agent_config


def create_llm(
    model: str | None = None,
    temperature: float | None = None,
) -> ChatGoogleGenerativeAI:
    """
    Tạo LLM instance (không tracing).
    
    Args:
        model: Override model name (default từ config)
        temperature: Override temperature (default từ config)
    
    Returns:
        ChatGoogleGenerativeAI instance sẵn sàng gọi
    
    Ví dụ:
        llm = create_llm()
        result = await llm.ainvoke("Hello")
        
        # Override temperature cho creative task
        llm = create_llm(temperature=1.0)
    """
    return ChatGoogleGenerativeAI(
        model=model or agent_config.model_name,
        api_key=agent_config.gemini_api_key,
        temperature=temperature or agent_config.temperature,
        max_output_tokens=agent_config.max_output_tokens,
    )


def create_llm_with_tracing(
    model: str | None = None,
) -> ChatGoogleGenerativeAI:
    """
    Tạo LLM instance với LangSmith tracing.
    
    Tracing được bật nếu:
    - LANGCHAIN_TRACING_V2=true
    - LANGCHAIN_API_KEY đã set
    
    Tác dụng:
    - Tất cả LLM calls được ghi lại trên https://smith.langchain.com
    - Xem được input/output/token count/cost latency
    - Debug prompt dễ dàng
    
    Dùng cho: development + production monitoring
    """
    if agent_config.langsmith_tracing and agent_config.langsmith_api_key:
        import os
        os.environ["LANGCHAIN_API_KEY"] = agent_config.langsmith_api_key
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = agent_config.langsmith_project
    
    return create_llm(model=model)
```

#### File 3: `src/agent/prompts/itinerary_prompts.py`

```python
"""
src/agent/prompts/itinerary_prompts.py
======================================
Tất cả prompt templates cho Itinerary Agent.

2 phần:
1. SYSTEM_PROMPT: persona + rules cho LLM (luôn giống nhau)
2. USER_TEMPLATE: dynamic input (thay đổi theo user request)

Design rationale:
- System prompt phải rõ ràng, có examples để LLM hiểu đúng format
- USER_TEMPLATE dùng f-string format với các biến đã được validate
- KHÔNG gửi full place database vào prompt → token explosion
  → Chỉ gửi metadata nhẹ (name, category, rating, cost) → ~50 tokens/place
"""
from typing import Any


ITINERARY_SYSTEM_PROMPT = """Bạn là CHUYÊN GIA DU LỊCH VIỆT NAM với 20 năm kinh nghiệm.
Bạn tạo lịch trình DUYỆT THÍCH, THỰC TẾ, và TỐI ƯU NGÂN SÁCH cho du khách.

## NGUYÊN TẮC BẮT BUỘC

1. **Ngân sách**: 
   - Tổng chi phí (không tính ăn ở) PHẢI ≤ budget - 2.400.000 VND (2 người)
   - Nếu budget < 2.000.000: ưu tiên địa điểm MIỄN PHÍ

2. **Phân bổ thời gian**:
   - Sáng (08:00-12:00): hoạt động nặng (tham quan, di chuyển)
   - Trưa (12:00-14:00): ăn + nghỉ
   - Chiều (14:00-18:00): hoạt động nhẹ
   - Tối (18:00-22:00): ăn + giải trí

3. **Đa dạng loại hình**:
   - Xen kẽ: tham quan ↔ ẩm thực ↔ nghỉ ngơi
   - KHÔNG liệt kê 4 hoạt động nặng liên tiếp

4. **Tính thực tế**:
   - THỜI GIAN di chuyển giữa địa điểm: estimate 30-60 phút
   - KHÔNG nhét quá 4 giờ hoạt động liên tục

5. **Ưu tiên dữ liệu có sẵn**:
   - Gợi ý ưu tiên địa điểm trong danh sách CÓ SẴN
   - Nếu danh sách thiếu → tự gợi ý từ kiến thức

6. **Định dạng PHẢN HỒI**:
   - Trả về CHÍNH XÁC JSON theo schema được cung cấp
   - KHÔNG có text giải thích trước hoặc sau JSON
   - KHÔNG bọc trong ```json ... ```
"""


ITINERARY_USER_TEMPLATE = """## YÊU CẦU LỊCH TRÌNH

**Thông tin chuyến đi:**
- Điểm đến: {destination}
- Số ngày: {num_days} ngày
- Ngân sách: {budget_formatted} VND
- Sở thích: {interests_str}
- Ngày bắt đầu: {start_date}
- Thành phần: {adults} người lớn, {children} trẻ em

## DỮ LIỆU ĐỊA ĐIỂM CÓ SẴN TRONG DATABASE

{db_context}

## YÊU CẦU ĐỊNH DẠNG JSON

Trả về CHÍNH XÁC JSON sau (KHÔNG thêm gì khác):

{{
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {{
          "title": "Tên hoạt động",
          "category": "culture|food|nature|beach|adventure|sightseeing|shopping",
          "time": "09:00",
          "end_time": "11:00",
          "duration": "2 giờ",
          "cost": 0,
          "description": "Mô tả ngắn 1-2 câu",
          "location": "Địa chỉ cụ thể",
          "notes": "Mẹo: ..." ,
          "is_custom": false
        }}
      ]
    }}
  ],
  "total_cost": 1500000,
  "budget_breakdown": {{
    "accommodation": 0,
    "food": 0,
    "attractions": 0,
    "transport": 0,
    "other": 0
  }},
  "score": 85,
  "itinerary_summary": "Tóm tắt 1-2 câu về lộ trình"
}}

CHỈ TRẢ VỀ JSON, KHÔNG CÓ TEXT KHÁC."""


def build_itinerary_user_prompt(
    destination: str,
    num_days: int,
    budget: float,
    interests: list[str],
    start_date: str,
    adults: int,
    children: int,
    db_context: str,
) -> str:
    """
    Build user prompt từ template + dynamic data.
    
    Args:
        destination: Tên thành phố (VD: "Hà Nội")
        num_days: Số ngày đi (1-14)
        budget: Ngân sách VND
        interests: Danh sách sở thích (VD: ["culture", "food"])
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        adults: Số người lớn
        children: Số trẻ em
        db_context: Place metadata string từ DB
    
    Returns:
        User prompt string đã format sẵn
    
    Ví dụ:
        prompt = build_itinerary_user_prompt(
            destination="Đà Nẵng",
            num_days=3,
            budget=5000000,
            interests=["beach", "food"],
            start_date="2026-04-15",
            adults=2,
            children=0,
            db_context="- Bãi Biển Mỹ Khê | beach | 4.5 | 0 VND\n..."
        )
    """
    budget_formatted = f"{budget:,.0f}"
    interests_str = ", ".join(interests) if interests else "tổng hợp"
    children_str = f", {children} trẻ em" if children > 0 else ""
    
    return ITINERARY_USER_TEMPLATE.format(
        destination=destination,
        num_days=num_days,
        budget_formatted=budget_formatted,
        interests_str=interests_str,
        start_date=start_date,
        adults=adults,
        children=children,
        children_str=children_str,
        db_context=db_context or "Không có dữ liệu. Sử dụng kiến thức của bạn.",
    )
```

#### File 4: `src/agent/schemas/itinerary_schemas.py`

```python
"""
src/agent/schemas/itinerary_schemas.py
======================================
Pydantic models cho structured output của Itinerary Agent.

Tại sao dùng structured output?
- Thay vì parse JSON text từ LLM (có thể sai format)
- Gemini trả về TRỰC TIẾP Pydantic object
- Validation tự động bởi Pydantic
- KHÔNG cần try/except json.loads()

Cấu trúc:
- AgentActivity: 1 hoạt động
- AgentDay: 1 ngày = nhiều activities
- AgentItinerary: toàn bộ lộ trình
"""
from pydantic import BaseModel, Field
from typing import Optional


class AgentActivity(BaseModel):
    """1 hoạt động trong lịch trình AI.
    
    Đây là output của LLM — không phải database model.
    Map sang ActivityResponse khi trả về cho FE.
    """
    title: str = Field(
        description="Tên hoạt động (VD: 'Hồ Hoàn Kiếm')",
        min_length=1,
        max_length=200,
    )
    category: str = Field(
        description="Loại: culture|food|nature|beach|adventure|sightseeing|shopping|entertainment",
    )
    time: str = Field(
        description="Giờ bắt đầu, format HH:MM (VD: '09:00')",
        pattern=r"^\d{2}:\d{2}$",
    )
    end_time: Optional[str] = Field(
        default=None,
        description="Giờ kết thúc, format HH:MM (VD: '11:00')",
    )
    duration: str = Field(
        description="Thời lượng, ví dụ '2 giờ', '1.5 giờ'",
        max_length=50,
    )
    cost: float = Field(
        default=0,
        ge=0,
        description="Chi phí VND (0 = miễn phí)",
    )
    description: str = Field(
        description="Mô tả ngắn 1-2 câu, thực tế có thể tin được",
        min_length=5,
        max_length=500,
    )
    location: str = Field(
        description="Địa chỉ cụ thể hoặc khu vực",
        max_length=300,
    )
    notes: Optional[str] = Field(
        default=None,
        description="Mẹo hoặc lưu ý đặc biệt (VD: 'Nên đến sớm tránh đông')",
        max_length=300,
    )
    is_custom: bool = Field(
        default=False,
        description="True = user tự thêm thủ công, False = AI sinh ra",
    )


class AgentDay(BaseModel):
    """1 ngày trong lịch trình."""
    day_number: int = Field(
        ge=1,
        le=30,
        description="Số thứ tự ngày (1-indexed)",
    )
    date: str = Field(
        description="Ngày thực tế, format YYYY-MM-DD",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    activities: list[AgentActivity] = Field(
        description="Danh sách hoạt động trong ngày (2-5 activities)",
        min_length=1,
        max_length=6,
    )
    notes: Optional[str] = Field(
        default=None,
        description="Ghi chú cho cả ngày (VD: 'Ngày nghỉ ngơi, không lịch trình dày đặc')",
    )


class BudgetBreakdown(BaseModel):
    """Chi phí theo từng danh mục."""
    accommodation: float = Field(default=0, ge=0, description="Lưu trú VND")
    food: float = Field(default=0, ge=0, description="Ăn uống VND")
    attractions: float = Field(default=0, ge=0, description="Vé tham quan VND")
    transport: float = Field(default=0, ge=0, description="Di chuyển VND")
    other: float = Field(default=0, ge=0, description="Chi phí khác VND")


class AgentItinerary(BaseModel):
    """Lịch trình đầy đủ do AI sinh ra.
    
    Đây là structured output cuối cùng từ LLM.
    Service layer sẽ map cái này → Trip + TripDay + Activity records in DB.
    """
    days: list[AgentDay] = Field(
        description="Danh sách các ngày",
        min_length=1,
    )
    total_cost: float = Field(
        ge=0,
        description="Tổng chi phí ƯỚC TÍNH (bao gồm ăn ở)",
    )
    budget_breakdown: BudgetBreakdown = Field(
        default_factory=BudgetBreakdown,
        description="Chi phí theo danh mục",
    )
    score: int = Field(
        ge=0,
        le=100,
        default=70,
        description="Điểm tối ưu của lộ trình (0-100). "
                    "100 = perfect fit ngân sách + đa dạng + thực tế.",
    )
    itinerary_summary: str = Field(
        default="",
        max_length=300,
        description="Tóm tắt 1-2 câu về lộ trình (để hiển thị trên FE header)",
    )
    warnings: list[str] = Field(
        default=[],
        description="Cảnh báo (VD: ['Ngân sách hơi chật, nên giảm 1 activity ngày 2'])",
    )
```

#### File 5: `src/agent/pipelines/itinerary_pipeline.py`

```python
"""
src/agent/pipelines/itinerary_pipeline.py
=========================================
Itinerary Agent — 5-step RAG pipeline.

Step 1: Validate input
Step 2: Fetch places metadata from DB (RAG retrieval)
Step 3: Build prompt with DB context
Step 4: Call LLM with structured output
Step 5: Post-process + return

Đây là CORE LOGIC của Itinerary Agent.
Mọi thứ khác (prompts, schemas, config) chỉ là supporting.
"""
from datetime import date
from typing import Optional
from src.agent.config import agent_config
from src.agent.llm import create_llm_with_tracing
from src.agent.prompts.itinerary_prompts import (
    ITINERARY_SYSTEM_PROMPT,
    build_itinerary_user_prompt,
)
from src.agent.schemas.itinerary_schemas import AgentItinerary
from src.repositories.place_repository import PlaceRepository


class ItineraryAgentPipeline:
    """
    5-step RAG pipeline cho Itinerary Agent.
    
    Usage:
        pipeline = ItineraryAgentPipeline(db_session)
        result = await pipeline.generate(
            destination="Đà Nẵng",
            start_date=date(2026, 4, 15),
            end_date=date(2026, 4, 17),
            budget=5000000,
            interests=["beach", "food"],
            travelers={"adults": 2, "children": 0},
        )
        # result: AgentItinerary | None (None nếu AI fail + fallback disabled)
    """
    
    def __init__(self, db_session):
        self._db = db_session
        self._place_repo = PlaceRepository(db_session)
    
    async def generate(
        self,
        destination: str,
        start_date: date,
        end_date: date,
        budget: float,
        interests: list[str],
        travelers: dict,  # {"adults": int, "children": int}
    ) -> Optional[AgentItinerary]:
        """
        Generate itinerary qua 5-step pipeline.
        
        Returns:
            AgentItinerary nếu thành công
            None nếu AI fail VÀ fallback_to_mock = False
        
        Raises:
            ValidationError: nếu input không hợp lệ
        """
        # ── STEP 1: Validate ────────────────────────────────────────────
        num_days = (end_date - start_date).days
        if num_days < 1:
            num_days = 1
        if num_days > 14:
            num_days = 14  # Cap 2 weeks
        
        if budget < 100_000:
            return None  # Invalid budget
        
        # ── STEP 2: Fetch DB Metadata ─────────────────────────────────
        db_context = await self._fetch_places_metadata(destination, interests)
        
        # ── STEP 3: Build Prompt ───────────────────────────────────────
        user_prompt = build_itinerary_user_prompt(
            destination=destination,
            num_days=num_days,
            budget=budget,
            interests=interests,
            start_date=start_date.isoformat(),
            adults=travelers.get("adults", 1),
            children=travelers.get("children", 0),
            db_context=db_context,
        )
        
        # ── STEP 4: LLM Call ───────────────────────────────────────────
        try:
            llm = create_llm_with_tracing()
            structured_llm = llm.with_structured_output(AgentItinerary)
            
            result = await structured_llm.ainvoke([
                ("system", ITINERARY_SYSTEM_PROMPT),
                ("human", user_prompt),
            ])
        except Exception as exc:
            # LLM call fail (timeout, API error, rate limit, etc.)
            if agent_config.fallback_to_mock:
                return await self._generate_fallback(destination, num_days, start_date)
            return None
        
        # ── STEP 5: Post-process ───────────────────────────────────────
        if result is None:
            if agent_config.fallback_to_mock:
                return await self._generate_fallback(destination, num_days, start_date)
            return None
        
        # Re-score based on budget fit
        result = self._adjust_score(result, budget, num_days)
        
        return result
    
    async def _fetch_places_metadata(
        self,
        destination: str,
        interests: list[str],
    ) -> str:
        """
        Fetch place metadata từ DB (RAG retrieval).
        
        Chỉ lấy: name, category, rating, cost, destination
        KHÔNG lấy full description → tiết kiệm tokens
        
        Returns:
            Multi-line string, max ~2000 chars (để fit trong prompt)
        """
        places = await self._place_repo.get_by_destination(
            destination=destination,
            limit=50,
        )
        
        if not places:
            return ""
        
        lines = []
        for p in places:
            # Filter by interests if provided
            if interests and p.category not in interests:
                continue
            
            rating_str = f"{p.rating:.1f}" if p.rating else "?"
            cost_str = f"{int(p.cost or 0):,}" if p.cost else "0"
            lines.append(
                f"- {p.place_name} | {p.category or 'unknown'} | "
                f"⭐{rating_str} | ~{cost_str} VND"
            )
        
        # Limit to ~2000 chars để không overflow prompt
        context = "\n".join(lines)
        if len(context) > 2000:
            context = context[:2000] + "\n..."
        
        return context
    
    def _adjust_score(
        self,
        itinerary: AgentItinerary,
        budget: float,
        num_days: int,
    ) -> AgentItinerary:
        """
        Điều chỉnh score dựa trên budget fit.
        
        Budget analysis:
        - Accommodation: 500,000 VND/ngày
        - Food: 300,000 VND/ngày
        - Activities: còn lại
        
        Score adjustment:
        - Trong budget: +10
        - Vượt budget: -15
        - Quá nhiều activities/ngày: -5
        """
        accommodation = num_days * 500_000
        food = num_days * 300_000
        activities_budget = budget - accommodation - food
        
        total_activities_cost = sum(
            act.cost * (travelers.get("adults", 1))
            for day in itinerary.days
            for act in day.activities
        )
        
        if total_activities_cost <= activities_budget:
            itinerary.score = min(100, itinerary.score + 10)
        else:
            itinerary.score = max(0, itinerary.score - 15)
        
        # Warning if too many activities
        for day in itinerary.days:
            if len(day.activities) > 4:
                itinerary.warnings.append(
                    f"Ngày {day.day_number}: Có {len(day.activities)} activities, "
                    "nên giảm bớt để không quá dày đặc."
                )
        
        return itinerary
    
    async def _generate_fallback(
        self,
        destination: str,
        num_days: int,
        start_date: date,
    ) -> AgentItinerary:
        """
        Generate fallback itinerary khi AI fail.
        
        Dùng mock data cứng cho 4 thành phố đã biết.
        Đây là last resort — vẫn cho user thấy kết quả.
        """
        # Placeholder — implement với same FALLBACK_DATA từ MVP1
        ...
```

---

## 25. TODO Checklist Trước Khi Bắt Đầu Implement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRƯỚC KHI BẮT ĐẦU CODE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ 1. Review plan (Section 11-24 trong implementation_plan.md)            │
│  ✅ 2. Pull feat/frontend-revamp (fetched, CHƯA merge)                    │
│  ✅ 3. Đọc FE schema mới từ trip.types.ts (Section 22.2)                 │
│  ✅ 4. Hiểu AI Agent pipeline (Section 23)                                 │
│  ✅ 5. Hiểu LangGraph flow (Section 14)                                    │
│  ✅ 6. Hiểu từng file cần tạo cho Agent (Section 24)                      │
│                                                                             │
│  ⬜ 7. Rotate secrets (JWT_SECRET_KEY + GEMINI_API_KEY mới)                │
│       → python -c "import secrets; print(secrets.token_urlsafe(32))"       │
│                                                                             │
│  ⬜ 8. Đăng ký tài khoản:                                                  │
│       → https://aistudio.google.com/apikey (GEMINI_API_KEY)                 │
│       → https://account.goong.io (GOONG_API_KEY)                           │
│       → https://smith.langchain.com (LANGCHAIN_API_KEY) — optional          │
│                                                                             │
│  ⬜ 9. Xóa files cũ:                                                       │
│       rm render.yaml vercel.json package.json package-lock.json \          │
│         postcss.config.mjs vite.config.ts index.html                       │
│                                                                             │
│  ⬜ 10. Init uv project:                                                    │
│       cd Backend && uv init --app && uv add ...                             │
│                                                                             │
│  ⬜ 11. Review lại Section 13-14 (Agent Prompts) — có cần chỉnh không?       │
│                                                                             │
│  Sau khi hoàn thành checklist trên → gọi tôi để bắt đầu Phase A           │
└─────────────────────────────────────────────────────────────────────────────┘
```
