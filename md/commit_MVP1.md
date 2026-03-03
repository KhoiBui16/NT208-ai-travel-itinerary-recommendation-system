# Git Commit Messages — MVP #1 Full Implementation

> Danh sách commit messages cho toàn bộ MVP #1: Backend + FE-BE Integration + Documentation.
> Convention: `type: description` (Conventional Commits)
>
> **Lưu ý quan trọng:** Trước khi commit bất kỳ file Backend nào, phải update `.gitignore` trước (Commit 12) để tránh commit thư mục `venv/` và `__pycache__/`.

---

## Commit 1 — Backend project setup

```
feat: init Backend project structure with FastAPI

- Add requirements.txt with all Python dependencies
- Add .env.example with environment variables template
- Tech stack: FastAPI, SQLAlchemy 2.0 async, PostgreSQL, Pydantic v2, JWT
```

**Files:**

- `Backend/requirements.txt`
- `Backend/.env.example`

---

## Commit 2 — App configuration & database setup

```
feat: add app config and async database connection

- Add Pydantic Settings to load .env configuration (config.py)
- Add SQLAlchemy async engine with asyncpg driver (database.py)
- Add get_db dependency for session injection
- Add app package init
```

**Files:**

- `Backend/app/__init__.py`
- `Backend/app/config.py`
- `Backend/app/database.py`

---

## Commit 3 — Database models (ERD 4 tables)

```
feat: add SQLAlchemy models for 4 ERD tables

- Add User model (users table) with role, phone, interests
- Add Trip model (trips table) with FE-compatible fields
- Add Place model (places table) with activity details
- Add TripPlace model (trip_places junction table) for N-N relationship
- All models follow Database_MVP.png ERD + FE extensions
```

**Files:**

- `Backend/app/models/__init__.py`
- `Backend/app/models/user.py`
- `Backend/app/models/trip.py`
- `Backend/app/models/place.py`
- `Backend/app/models/trip_place.py`

---

## Commit 4 — Pydantic schemas (FE-compatible)

```
feat: add Pydantic v2 schemas matching FE TypeScript interfaces

- Add auth schemas (RegisterRequest, LoginRequest, AuthResponse)
- Add user schemas (UserResponse with alias mapping, UserUpdateRequest)
- Add place schemas (PlaceResponse, ActivityResponse, ItineraryDayResponse)
- Add trip schemas (TripCreateRequest, ItineraryResponse, RatingRequest)
- Schema field names match FE auth.ts interfaces (camelCase aliases)
```

**Files:**

- `Backend/app/schemas/__init__.py`
- `Backend/app/schemas/auth.py`
- `Backend/app/schemas/user.py`
- `Backend/app/schemas/place.py`
- `Backend/app/schemas/trip.py`

---

## Commit 5 — Security utilities (JWT + bcrypt)

```
feat: add JWT authentication and password hashing utilities

- Add bcrypt password hashing (hash_password, verify_password)
- Add JWT token creation and verification (create_access_token, verify_token)
- Add FastAPI dependencies (get_current_user, get_current_user_optional)
- Add OAuth2PasswordBearer scheme for Swagger UI
```

**Files:**

- `Backend/app/utils/__init__.py`
- `Backend/app/utils/security.py`
- `Backend/app/utils/dependencies.py`

---

## Commit 6 — Service layer (business logic)

```
feat: add service layer for auth, user, and itinerary business logic

- Add auth_service: register + login with JWT token generation
- Add user_service: profile get + update
- Add itinerary_service: AI generation (Gemini), fallback mock data,
  CRUD operations, rating, activity removal
- Fallback data imported from FE itinerary.ts mock destinations
```

**Files:**

- `Backend/app/services/__init__.py`
- `Backend/app/services/auth_service.py`
- `Backend/app/services/user_service.py`
- `Backend/app/services/itinerary_service.py`

---

## Commit 7 — API routers (endpoints)

```
feat: add FastAPI routers for all API endpoints

- Add auth router: POST /register, POST /login
- Add users router: GET/PUT /profile (protected)
- Add trips router: itinerary CRUD + AI generate + rating
- Add places router: destinations list + places by destination
- All endpoints documented with FE mapping in docstrings
```

**Files:**

- `Backend/app/routers/__init__.py`
- `Backend/app/routers/auth.py`
- `Backend/app/routers/users.py`
- `Backend/app/routers/trips.py`
- `Backend/app/routers/places.py`

---

## Commit 8 — FastAPI main entry point

```
feat: add FastAPI main app with CORS, lifespan, and router registration

- Add main.py with FastAPI app initialization
- Add CORS middleware for FE localhost:5173
- Add lifespan events for DB table creation and cleanup
- Register all routers with /api/v1 prefix
- Add health check endpoints (/ and /health)
```

**Files:**

- `Backend/main.py`

---

## Commit 9 — Seed data script

```
feat: add seed script to populate places from FE mock data

- Add seed_data.py with 23 places from 4 destinations
- Destinations: Hà Nội, TP.HCM, Đà Nẵng, Hội An
- Skip duplicates on re-run (idempotent)
- Data matches FE itinerary.ts destinationData
```

**Files:**

- `Backend/seed_data.py`

---

## Commit 10 — Documentation update

```
docs: update BE_docs.md and README.md with actual implementation

- Rewrite BE_docs.md with real architecture, schema, API reference
- Update README.md: mark BE tasks as completed, add full-stack run guide
- Add parallel FE+BE run instructions
```

**Files:**

- `Backend/BE_docs.md`
- `README.md`

---

## Commit 11 — Commit messages file

```
docs: add commit_MVP1.md with git commit message guide

- Add structured commit messages for all MVP #1 BE files
- Follow Conventional Commits convention
```

**Files:**

- `md/commit_MVP1.md`

---

---

## 📌 Phase 2 — FE-BE Integration & Documentation

> Các commit tiếp theo cho việc tích hợp Frontend với Backend, cập nhật documentation.

---

## Commit 12 — Update .gitignore (⚠️ PHẢI COMMIT ĐẦU TIÊN)

```
chore: update .gitignore for Backend files

- Add venv/ to prevent committing Python virtual environment
- Add __pycache__/ and *.pyc for Python bytecode
- Add Backend/.env for secrets protection
- Add test output files (test_results.*, test_output.*, test_full_*)
- Existing: node_modules, dist, .env
```

**Files:**

- `.gitignore`

**⚠️ QUAN TRỌNG:** Commit này PHẢI được thực hiện TRƯỚC khi `git add Backend/` để tránh commit ~20,000+ files trong thư mục `venv/`.

---

## Commit 13 — Fix index.html entry point path

```
fix: update index.html script src from /src/ to /Frontend/

- Change script src="/src/main.tsx" to src="/Frontend/main.tsx"
- Match actual folder structure after rename
```

**Files:**

- `index.html`

---

## Commit 14 — FE centralized API service layer

```
feat: add centralized API service layer (api.ts)

- Add API_BASE_URL pointing to localhost:8000/api/v1
- Add token management: getToken, setToken, removeToken (localStorage)
- Add HTTP helpers: get, post, put, del with auto Authorization header
- Add ApiError class for structured error handling
- Add TypeScript interfaces matching BE schemas: User, AuthResponse,
  Itinerary, ItineraryDay, Activity, ItineraryListResponse
- Add 11 API functions: apiRegister, apiLogin, apiGetProfile,
  apiUpdateProfile, apiGenerateItinerary, apiGetItineraries,
  apiGetItinerary, apiDeleteItinerary, apiRateItinerary,
  apiRemoveActivity, apiGetDestinations
```

**Files:**

- `Frontend/app/utils/api.ts` (NEW — 325 lines)

---

## Commit 15 — FE auth.ts rewrite (localStorage → async API)

```
refactor: rewrite auth.ts to use Backend API instead of localStorage

- Import and use api.ts functions for all auth operations
- All auth functions now async: registerUser, loginUser,
  updateUserProfile, getSavedItineraries, getItineraryById,
  deleteItinerary, rateItinerary, refreshUserProfile
- Token-based auth: JWT stored via api.ts token management
- localStorage now used only as cache (source of truth is BE)
- saveItinerary() is now no-op (BE auto-saves on generate)
- Password no longer stored client-side (bcrypt on server)
- Re-export types from api.ts for backward compatibility
```

**Files:**

- `Frontend/app/utils/auth.ts` (REWRITTEN)

---

## Commit 16 — FE itinerary.ts rewrite (API-first + fallback)

```
refactor: rewrite itinerary.ts with API-first generation + fallback

- generateItinerary() now calls apiGenerateItinerary() first
- Fallback to local mock data if BE is unavailable
- Keep destinationData for 4 cities as offline fallback
- formatCurrency() unchanged
```

**Files:**

- `Frontend/app/utils/itinerary.ts` (REWRITTEN)

---

## Commit 17 — FE Login & Register pages async

```
refactor: add async handlers and loading states to Login & Register

- Login.tsx: async handleLogin with try-catch-finally, Loader2 spinner,
  disabled button during loading
- Register.tsx: async handleRegister with try-catch-finally, Loader2
  spinner, disabled button during loading
- Both pages now call BE API through auth.ts → api.ts
```

**Files:**

- `Frontend/app/pages/Login.tsx`
- `Frontend/app/pages/Register.tsx`

---

## Commit 18 — FE TripPlanning page async

```
refactor: add async AI generation to TripPlanning page

- handleSubmit now async: await generateItinerary()
- Add loading state with Loader2 spinner during AI generation
- Remove manual saveItinerary() call (BE auto-saves)
- Add try-catch error handling for API failures
```

**Files:**

- `Frontend/app/pages/TripPlanning.tsx`

---

## Commit 19 — FE ItineraryView, SavedItineraries, Profile pages async

```
refactor: add async API calls to remaining FE pages

- ItineraryView.tsx: async loadItinerary, handleRatingSubmit, handleDelete
  with loading states and Loader2 spinner
- SavedItineraries.tsx: async loadItineraries, handleDelete with loading
  state and Loader2 spinner
- Profile.tsx: async handleSave with loading state and Loader2 spinner
- All pages: try-catch-finally pattern, disabled buttons during loading
```

**Files:**

- `Frontend/app/pages/ItineraryView.tsx`
- `Frontend/app/pages/SavedItineraries.tsx`
- `Frontend/app/pages/Profile.tsx`

---

## Commit 20 — BE CORS update for port 5174

```
fix: add localhost:5174 and 127.0.0.1:5174 to CORS allowed origins

- FE dev server may use port 5174 when 5173 is occupied
- Add both localhost and 127.0.0.1 variants
```

**Files:**

- `Backend/main.py`

---

## Commit 21 — Fix .env.example database name

```
fix: correct database name in .env.example from travel_ai_db to dulichviet

- Match actual PostgreSQL database name used in project
```

**Files:**

- `Backend/.env.example`

---

## Commit 22 — Update README.md (full-stack guide)

```
docs: update README.md with full-stack setup and FE-BE integration status

- Add full-stack run guide: Prerequisites, DB setup (Docker + native),
  Backend setup, .env config, seed data, run both servers
- Mark FE-BE integration as completed
- Add Swagger/ReDoc/Health URLs
- Update project structure tree
- Update MVP status checklist
```

**Files:**

- `README.md`

---

## Commit 23 — Update plan_be.md

```
docs: update plan_be.md with completed implementation status

- Mark all BE phases as completed ✅
- Add "Thực tế triển khai" section documenting what was built
```

**Files:**

- `md/plan_be.md`

---

## Commit 24 — Update FE_docs.md (API integration)

```
docs: update FE_docs.md with api.ts docs and async integration details

- Add section 14: api.ts centralized API service layer documentation
- Add section 15: auth.ts rewrite documentation (async, JWT-based)
- Add section 16: itinerary.ts API-first + fallback documentation
- Update all page sections with "Đã tích hợp Backend" notes
- Add API Integration architecture section
- Add FE ↔ BE mapping table
- Update user flow documentation
```

**Files:**

- `Frontend/FE_docs.md`

---

## Commit 25 — Update BE_docs.md

```
docs: update BE_docs.md with CORS and FE mapping details

- Add CORS note for ports 5173, 5174, 3000, 127.0.0.1 variants
- Confirm FE mapping for all endpoints
```

**Files:**

- `Backend/BE_docs.md`

---

## Commit 26 — Add test files and results

```
test: add API test suite and results (19/19 pass)

- Add test_api.py: basic endpoint tests
- Add test_full_api.py: comprehensive full-flow tests
- Add test results: test_results.json, test_full_results.json,
  test_output.txt, test_results.txt
- All 19 tests passing
```

**Files:**

- `Backend/test_api.py`
- `Backend/test_full_api.py`
- `Backend/test_results.json`
- `Backend/test_full_results.json`
- `Backend/test_output.txt`
- `Backend/test_results.txt`
- `md/test.md`

---

## Commit 27 — Add Diagram folder

```
docs: add system diagrams (ERD, DFD, UML, Sequence)

- Add Database_MVP.png: ERD with 4 tables
- Add DFD.png: Data Flow Diagram
- Add UML-Guest.png + UML-Register.png: Use Case Diagrams
- Add Sequence_Guest.png + Sequence_Register.png: Sequence Diagrams
- Add Diagram_docs.md: diagram descriptions
```

**Files:**

- `Diagram/Diagram_docs.md`
- `Diagram/*.png` (6 files)

---

## Commit 28 — Add project documentation files

```
docs: add MVP analysis, requirements, and commit guide

- Add doc-MVP#1.md: use-cases, competitive analysis, USP
- Add requirement_MVP#1.md: 6 requirement categories
- Add MVP1_summary.md: MVP status matrix and analysis
- Add MVP1_update.md: gap analysis (doc vs implementation)
- Update commit_MVP1.md: add Phase 2 commits (FE-BE integration)
```

**Files:**

- `md/doc-MVP#1.md`
- `md/requirement_MVP#1.md`
- `md/MVP1_summary.md`
- `md/MVP1_update.md`
- `md/commit_MVP1.md`

---

## Quick Reference — All Commits (Thực thi)

> **Lưu ý:** Vì tất cả code đã được phát triển xong trước khi commit, một số commit mô tả ở trên đã được gộp lại (ví dụ: `Backend/main.py` đã chứa CORS 5174, `.env.example` đã có tên DB đúng, `README.md` đã có full-stack guide). Các commit 20, 21, 22, 25 được merge vào commit 8, 1, 10, 10 tương ứng.

### Phase 0 — .gitignore (PHẢI LÀM ĐẦU TIÊN)

```bash
git add .gitignore
git commit -m "chore: update .gitignore for Backend files"
```

### Phase 1 — Backend Implementation

```bash
# Commit 1: Project setup (.env.example đã có DB name đúng → merge commit 21)
git add Backend/requirements.txt Backend/.env.example
git commit -m "feat: init Backend project structure with FastAPI"

# Commit 2: App config + DB
git add Backend/app/__init__.py Backend/app/config.py Backend/app/database.py
git commit -m "feat: add app config and async database connection"

# Commit 3: Models
git add Backend/app/models/__init__.py Backend/app/models/user.py Backend/app/models/trip.py Backend/app/models/place.py Backend/app/models/trip_place.py
git commit -m "feat: add SQLAlchemy models for 4 ERD tables"

# Commit 4: Schemas
git add Backend/app/schemas/__init__.py Backend/app/schemas/auth.py Backend/app/schemas/user.py Backend/app/schemas/place.py Backend/app/schemas/trip.py
git commit -m "feat: add Pydantic v2 schemas matching FE TypeScript interfaces"

# Commit 5: Security utils
git add Backend/app/utils/__init__.py Backend/app/utils/security.py Backend/app/utils/dependencies.py
git commit -m "feat: add JWT authentication and password hashing utilities"

# Commit 6: Services
git add Backend/app/services/__init__.py Backend/app/services/auth_service.py Backend/app/services/user_service.py Backend/app/services/itinerary_service.py
git commit -m "feat: add service layer for auth, user, and itinerary business logic"

# Commit 7: Routers
git add Backend/app/routers/__init__.py Backend/app/routers/auth.py Backend/app/routers/users.py Backend/app/routers/trips.py Backend/app/routers/places.py
git commit -m "feat: add FastAPI routers for all API endpoints"

# Commit 8: Main app (đã chứa CORS 5174 → merge commit 20)
git add Backend/main.py
git commit -m "feat: add FastAPI main app with CORS, lifespan, and router registration"

# Commit 9: Seed data
git add Backend/seed_data.py
git commit -m "feat: add seed script to populate places from FE mock data"

# Commit 10: BE docs + README (đã chứa full-stack guide → merge commits 22, 25)
git add Backend/BE_docs.md README.md
git commit -m "docs: update BE_docs.md and README.md with actual implementation"

# Commit 11: Test suite
git add Backend/test_api.py Backend/test_full_api.py
git commit -m "test: add API test suite (19/19 pass)"
```

### Phase 2 — FE-BE Integration

```bash
# Commit 12: Fix index.html path
git add index.html
git commit -m "fix: update index.html script src from /src/ to /Frontend/"

# Commit 13: API service layer (NEW file)
git add Frontend/app/utils/api.ts
git commit -m "feat: add centralized API service layer (api.ts)"

# Commit 14: Auth rewrite
git add Frontend/app/utils/auth.ts
git commit -m "refactor: rewrite auth.ts to use Backend API instead of localStorage"

# Commit 15: Itinerary rewrite
git add Frontend/app/utils/itinerary.ts
git commit -m "refactor: rewrite itinerary.ts with API-first generation + fallback"

# Commit 16: Login + Register async
git add Frontend/app/pages/Login.tsx Frontend/app/pages/Register.tsx
git commit -m "refactor: add async handlers and loading states to Login & Register"

# Commit 17: TripPlanning async
git add Frontend/app/pages/TripPlanning.tsx
git commit -m "refactor: add async AI generation to TripPlanning page"

# Commit 18: Remaining pages async
git add Frontend/app/pages/ItineraryView.tsx Frontend/app/pages/SavedItineraries.tsx Frontend/app/pages/Profile.tsx
git commit -m "refactor: add async API calls to remaining FE pages"

# Commit 19: package-lock
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

### Phase 3 — Documentation

```bash
# Commit 20: FE docs
git add Frontend/FE_docs.md
git commit -m "docs: add FE_docs.md with api.ts docs and async integration details"

# Commit 21: Diagrams
git add Diagram/
git commit -m "docs: add system diagrams (ERD, DFD, UML, Sequence)"

# Commit 22: Project docs (md/ folder)
git add md/
git commit -m "docs: add MVP analysis, requirements, plan, and commit guide"
```

### Push

```bash
git push origin main
```

### 📊 Tổng kết

| Phase | Commits        | Nội dung                          |
| ----- | -------------- | --------------------------------- |
| 0     | 1 commit       | .gitignore (PHẢI LÀM ĐẦU TIÊN)    |
| 1     | 11 commits     | Backend core + docs + tests       |
| 2     | 8 commits      | FE-BE integration + package-lock  |
| 3     | 3 commits      | FE docs + diagrams + project docs |
| **Σ** | **23 commits** | **Toàn bộ MVP #1**                |
