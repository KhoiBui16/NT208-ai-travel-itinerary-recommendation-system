# 📋 Tài liệu Frontend - Du Lịch Việt (MVP #1)

> Tài liệu mô tả chi tiết toàn bộ cấu trúc, thiết kế và chức năng của phần Frontend cho hệ thống đề xuất du lịch thông minh bằng AI.

---

## 📁 Tổng quan cấu trúc thư mục

```
Frontend/
├── main.tsx                         # Entry point của ứng dụng React
├── app/
│   ├── App.tsx                      # Component gốc, khởi tạo Router
│   ├── routes.tsx                   # Định nghĩa tất cả routes (URL mapping)
│   ├── components/
│   │   ├── Header.tsx               # Thanh điều hướng chính (Header/Navbar)
│   │   ├── figma/
│   │   │   └── ImageWithFallback.tsx # Component hiển thị ảnh có xử lý lỗi
│   │   └── ui/                      # Thư viện UI components (Radix UI / shadcn)
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── ... (30+ UI components)
│   │       ├── use-mobile.ts        # Hook kiểm tra mobile viewport
│   │       └── utils.ts             # Utility function cho class names (cn)
│   ├── pages/
│   │   ├── Home.tsx                 # Trang chủ - Landing page
│   │   ├── TripPlanning.tsx         # Trang lên kế hoạch chuyến đi
│   │   ├── ItineraryView.tsx        # Trang xem chi tiết lịch trình
│   │   ├── Login.tsx                # Trang đăng nhập
│   │   ├── Register.tsx             # Trang đăng ký
│   │   ├── Profile.tsx              # Trang thông tin cá nhân
│   │   ├── SavedItineraries.tsx     # Trang danh sách hành trình đã lưu
│   │   └── NotFound.tsx             # Trang 404
│   └── utils/
│       ├── api.ts                   # ⭐ Centralized API service layer (gọi Backend)
│       ├── auth.ts                  # Xử lý xác thực (async, gọi api.ts)
│       └── itinerary.ts             # Logic tạo lịch trình (API-first + fallback)
└── styles/
    ├── index.css                    # File CSS gốc (import các file khác)
    ├── fonts.css                    # Font definitions (hiện tại trống)
    ├── tailwind.css                 # Cấu hình Tailwind CSS v4
    └── theme.css                    # Design tokens & theme variables (light/dark)
```

---

## 🛠️ Tech Stack Frontend

| Công nghệ          | Version    | Vai trò                             |
| ------------------ | ---------- | ----------------------------------- |
| **React**          | 18.3.1     | UI Library chính                    |
| **React Router**   | 7.13.0     | Client-side routing (SPA)           |
| **Vite**           | 6.3.5      | Build tool & dev server             |
| **Tailwind CSS**   | 4.1.12     | Utility-first CSS framework         |
| **Radix UI**       | Various    | Headless UI components (accessible) |
| **Lucide React**   | 0.487.0    | Icon library                        |
| **TypeScript**     | (inferred) | Type safety                         |
| **tw-animate-css** | 1.3.8      | Animation utilities                 |
| **recharts**       | 2.15.2     | Chart library (chưa sử dụng)        |

---

## 📄 Chi tiết từng file

---

### 1. `main.tsx` — Entry Point

**Mục đích:** Khởi tạo ứng dụng React và mount vào DOM.

```tsx
createRoot(document.getElementById("root")!).render(<App />);
```

**Chi tiết:**

- Import `App` component từ `./app/App.tsx`
- Import global styles từ `./styles/index.css`
- Sử dụng `createRoot` (React 18 API) để render
- Mount vào element `<div id="root">` trong `index.html`
- **Lưu ý:** `index.html` đã được cập nhật trỏ đến `/Frontend/main.tsx` (đúng với cấu trúc thư mục hiện tại)

---

### 2. `app/App.tsx` — Root Component

**Mục đích:** Component gốc của ứng dụng, khởi tạo Router Provider.

```tsx
export default function App() {
	return <RouterProvider router={router} />;
}
```

**Chi tiết:**

- Sử dụng `RouterProvider` từ React Router v7
- Import router config từ `./routes.tsx`
- Không có global state management (context/redux) ở thời điểm này
- Không wrap bởi AuthProvider hay ThemeProvider → **cần bổ sung khi tích hợp Backend**

---

### 3. `app/routes.tsx` — Routing Configuration

**Mục đích:** Định nghĩa tất cả URL paths và mapping đến page components.

| Path                 | Component          | Mô tả                                     | Auth Required           |
| -------------------- | ------------------ | ----------------------------------------- | ----------------------- |
| `/`                  | `Home`             | Trang chủ / Landing page                  | ❌                      |
| `/trip-planning`     | `TripPlanning`     | Form lên kế hoạch du lịch                 | ❌                      |
| `/itinerary/:id`     | `ItineraryView`    | Xem chi tiết 1 lịch trình (dynamic route) | ❌                      |
| `/login`             | `Login`            | Đăng nhập                                 | ❌                      |
| `/register`          | `Register`         | Đăng ký                                   | ❌                      |
| `/profile`           | `Profile`          | Thông tin cá nhân                         | ✅ (redirect to /login) |
| `/saved-itineraries` | `SavedItineraries` | Danh sách lịch trình đã lưu               | ✅ (redirect to /login) |
| `*`                  | `NotFound`         | Trang 404 catch-all                       | ❌                      |

**Lưu ý:**

- Sử dụng `createBrowserRouter` (React Router v7 data API)
- Chưa có route guards/middleware — hiện tại các page tự kiểm tra auth bằng `useEffect`
- Route `/itinerary/:id` dùng dynamic param `:id` để lấy itinerary từ localStorage

---

### 4. `app/components/Header.tsx` — Navigation Bar

**Mục đích:** Thanh điều hướng chính, hiển thị ở mọi trang (được gọi trong từng page).

**Thiết kế:**

- **Sticky header** với `backdrop-blur-md` (glassmorphism effect)
- **Logo:** Icon Plane + text "Du Lịch Việt" → link về trang chủ `/`
- **Responsive:** Desktop nav (hidden on mobile) + Hamburger menu (mobile only)
- **Conditional rendering:** Hiển thị khác nhau tùy trạng thái đăng nhập

**Trạng thái chưa đăng nhập (Guest):**

- Link "Lên Kế Hoạch" → `/trip-planning`
- Link "Đăng Nhập" → `/login`
- Button "Đăng Ký" → `/register`

**Trạng thái đã đăng nhập (Registered User):**

- Link "Lên Kế Hoạch" → `/trip-planning`
- Link "Hành Trình Đã Lưu" (icon BookOpen) → `/saved-itineraries`
- Link tên user (icon User) → `/profile`
- Button "Đăng Xuất" (icon LogOut, màu đỏ) → gọi `logoutUser()` + navigate `/`

**State:**

- `mobileMenuOpen: boolean` — toggle menu mobile

**Dependencies:**

- `getCurrentUser()` từ `utils/auth.ts` — kiểm tra user hiện tại
- `logoutUser()` từ `utils/auth.ts` — xóa session
- Icons: `Plane`, `User`, `LogOut`, `BookOpen`, `Menu`, `X` từ lucide-react

---

### 5. `app/components/figma/ImageWithFallback.tsx` — Image Component

**Mục đích:** Hiển thị ảnh với fallback khi load lỗi (ví dụ URL hết hạn, 404).

**Logic:**

1. Render `<img>` bình thường
2. Nếu `onError` → set `didError = true`
3. Khi lỗi → hiển thị placeholder SVG (base64 encoded) thay thế
4. Giữ lại `data-original-url` để debug

**Sử dụng:** Chưa được sử dụng trực tiếp trong các page hiện tại (nhưng sẵn sàng để thay thế các `<img>` tags).

---

### 6. `app/pages/Home.tsx` — Trang chủ / Landing Page

**Mục đích:** Trang đầu tiên người dùng nhìn thấy, giới thiệu website và hướng dẫn sử dụng.

**Cấu trúc layout (từ trên xuống):**

1. **Header** — Navigation bar
2. **Hero Section** — Banner chính
   - Gradient background (blue → purple)
   - Tiêu đề "Khám Phá Việt Nam Của Bạn"
   - Mô tả ngắn về dịch vụ AI
   - CTA button "Bắt Đầu Lên Kế Hoạch" → `/trip-planning`
3. **Features Section** — 4 tính năng nổi bật (grid 4 cột)
   - AI Thông Minh (icon Sparkles)
   - Xem Trên Bản Đồ (icon Map)
   - Ước Tính Chi Phí (icon DollarSign)
   - Lưu Hành Trình (icon Save)
4. **Popular Destinations** — 6 điểm đến phổ biến (grid 3 cột)
   - Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hội An, Vịnh Hạ Long, Sapa
   - Mỗi card có ảnh Unsplash, tên, mô tả
   - Click → navigate đến `/trip-planning?destination=<tên>`
5. **CTA Section** — Call-to-action cuối trang
   - "Sẵn Sàng Cho Chuyến Phiêu Lưu?"
   - Button "Lên Kế Hoạch Ngay" → `/trip-planning`

**Dữ liệu tĩnh:**

- `destinations[]` — 6 điểm đến với ảnh Unsplash
- `features[]` — 4 tính năng

---

### 7. `app/pages/TripPlanning.tsx` — Trang lên kế hoạch chuyến đi

**Mục đích:** Form nhập thông tin chuyến đi để AI tạo lịch trình.

**Form fields:**

| Field           | Type           | UI Component           | Validation |
| --------------- | -------------- | ---------------------- | ---------- |
| Điểm đến        | `select`       | Dropdown (10 điểm đến) | Required   |
| Ngày bắt đầu    | `date`         | Input date             | Required   |
| Ngày kết thúc   | `date`         | Input date             | Required   |
| Ngân sách (VND) | `number`       | Input number           | Required   |
| Sở thích        | `multi-select` | Button grid (toggle)   | Ít nhất 1  |

**Danh sách điểm đến (hardcoded):**
Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hội An, Vịnh Hạ Long, Sapa, Nha Trang, Phú Quốc, Đà Lạt, Huế

**Danh sách sở thích:**

- Văn hóa - Lịch sử (id: culture)
- Ẩm thực (id: food)
- Thiên nhiên (id: nature)
- Biển (id: beach)
- Phiêu lưu (id: adventure)

**Luồng xử lý khi submit:**

1. Validate tất cả fields
2. Gọi `await generateItinerary()` từ `utils/itinerary.ts` (gọi BE API, fallback mock data nếu BE không khả dụng)
3. BE tự động lưu lịch trình vào DB
4. Navigate đến `/itinerary/<id>` để xem kết quả
5. Hiển thị loading spinner (Loader2) trong lúc chờ AI tạo lịch trình

**Lưu ý quan trọng:**

- Nhận `?destination=` từ URL params (khi user click từ Home page)
- **Đã tích hợp Backend:** Gọi `POST /api/v1/itineraries/generate` qua `api.ts`
- Fallback: Nếu BE không khả dụng, dùng mock data local

---

### 8. `app/pages/ItineraryView.tsx` — Trang xem chi tiết lịch trình

**Mục đích:** Hiển thị chi tiết lịch trình du lịch đã tạo, cho phép chỉnh sửa, lưu, đánh giá.

**Dữ liệu:** Lấy từ BE API bằng `await getItineraryById(id)` (param `:id` từ URL)

**Cấu trúc layout:**

1. **Header banner** — Gradient card hiển thị:
   - Tên điểm đến (h1)
   - Ngày bắt đầu - kết thúc
   - Ngân sách
   - Rating (nếu đã đánh giá)
   - Action buttons: Lưu, Xem Bản Đồ, Chỉnh Sửa, Đánh Giá

2. **Map View** (toggle) — Placeholder cho tích hợp bản đồ
   - Hiện tại chỉ hiển thị placeholder text
   - **Cần tích hợp:** Google Maps / Mapbox / Leaflet

3. **Cost Summary** — 3 cards:
   - Hoạt động (tổng chi phí activities)
   - Lưu trú & Ăn uống (days × 800,000 VND)
   - Tổng Chi Phí

4. **Itinerary Days** — Danh sách các ngày:
   - Mỗi ngày có số thứ tự, ngày tháng
   - Mỗi ngày chứa danh sách activities
   - Mỗi activity hiển thị: ảnh, tên, mô tả, giờ, thời lượng, địa điểm, chi phí
   - Chế độ Edit: hiện nút Xóa trên mỗi activity

**Modals:**

| Modal       | Trigger                  | Chức năng                        |
| ----------- | ------------------------ | -------------------------------- |
| Save Prompt | Tự động (guest chưa lưu) | Gợi ý đăng ký để lưu lịch trình  |
| Rating      | Click "Đánh Giá"         | Đánh giá 1-5 sao + nhận xét text |

**Chức năng chính:**

- `handleSave()` — Lịch trình được BE tự động lưu khi generate, nút này hiển thị thông báo
- `handleDelete(dayIndex, activityId)` — Gọi `apiRemoveActivity()` qua BE API, fallback xóa local
- `handleRatingSubmit()` — Gọi `await rateItinerary()` qua BE API

**Đã tích hợp Backend:**

- Lấy itinerary từ API (`GET /api/v1/itineraries/{id}`)
- Xóa activity qua API (`DELETE /api/v1/itineraries/{id}/activities/{aid}`)
- Rating qua API (`PUT /api/v1/itineraries/{id}/rating`)
- Bản đồ vẫn là placeholder (chưa tích hợp Google Maps)

---

### 9. `app/pages/Login.tsx` — Trang đăng nhập

**Mục đích:** Form đăng nhập cho người dùng đã có tài khoản.

**Form fields:**

- Email (type: email, required)
- Password (type: password, required)

**Luồng xử lý:**

1. Submit form
2. Gọi `await loginUser(email, password)` từ `utils/auth.ts`
3. Nếu thành công → navigate `/` (token được lưu tự động trong api.ts)
4. Nếu thất bại → hiển thị error message
5. Hiển thị loading spinner trong lúc chờ

**UI:** Card với gradient background, link "Đăng ký ngay" nếu chưa có tài khoản

**Đã tích hợp Backend:** Gọi `POST /api/v1/auth/login` qua `api.ts`

---

### 10. `app/pages/Register.tsx` — Trang đăng ký

**Mục đích:** Form đăng ký tài khoản mới.

**Form fields:**

- Họ và tên (type: text, required)
- Email (type: email, required)
- Mật khẩu (type: password, required, min 6 chars)
- Xác nhận mật khẩu (type: password, required, phải khớp)

**Luồng xử lý:**

1. Validate: password match, min length 6
2. Gọi `await registerUser(email, password, name)` từ `utils/auth.ts`
3. Nếu thành công → navigate `/` (token được lưu tự động)
4. Nếu thất bại (email trùng) → hiển thị error
5. Hiển thị loading spinner trong lúc chờ

**Đã tích hợp Backend:** Gọi `POST /api/v1/auth/register` qua `api.ts`

---

### 11. `app/pages/Profile.tsx` — Trang thông tin cá nhân

**Mục đích:** Xem và chỉnh sửa thông tin cá nhân.

**Auth Guard:** `useEffect` kiểm tra `isAuthenticated()` → redirect `/login` nếu chưa đăng nhập.

**Form fields:**

- Họ và tên (editable)
- Email (disabled — không thể thay đổi)
- Số điện thoại (editable)
- Sở thích (multi-select toggle từ 8 options)

**Sở thích có thể chọn:**
Văn hóa - Lịch sử, Ẩm thực, Thiên nhiên, Biển, Phiêu lưu, Chụp ảnh, Mua sắm, Thể thao

**Additional Section:** "Thông Tin Tài Khoản" hiển thị ngày tạo + account ID

**Khi tích hợp Backend:** ✅ Đã tích hợp — Gọi `PUT /api/v1/users/profile` qua `api.ts`, async handler với loading state

---

### 12. `app/pages/SavedItineraries.tsx` — Hành trình đã lưu

**Mục đích:** Danh sách tất cả lịch trình đã lưu của user.

**Auth Guard:** `useEffect` kiểm tra `isAuthenticated()` → redirect `/login`

**Dữ liệu:** `await getSavedItineraries()` gọi BE API (không cần userId, BE lấy từ JWT token)

**UI:**

- Empty state: Icon + message + CTA "Lên Kế Hoạch Ngay"
- Grid 2 cột (desktop): Cards hiển thị:
  - Header gradient: tên điểm đến, ngày, rating
  - Body: số ngày, chi phí, tags sở thích, feedback
  - Actions: "Xem Chi Tiết" (link) + "Xóa" (button)

**Chức năng:**

- View → navigate `/itinerary/<id>`
- Delete → `await deleteItinerary(id)` gọi BE API + confirm dialog

**Đã tích hợp Backend:** Gọi `GET /api/v1/itineraries` + `DELETE /api/v1/itineraries/:id` qua `api.ts`

Hiển thị loading spinner (Loader2) khi đang tải dữ liệu.

---

### 13. `app/pages/NotFound.tsx` — Trang 404

**Mục đích:** Hiển thị khi URL không match bất kỳ route nào.

**UI:** Centered layout, số "404" lớn, message "Không Tìm Thấy Trang", button "Về Trang Chủ"

---

### 14. `app/utils/api.ts` — Centralized API Service Layer (MỚI)

**Mục đích:** Tầng dịch vụ API trung tâm, xử lý tất cả HTTP calls đến Backend.

**Cấu trúc:**

- `API_BASE_URL = 'http://localhost:8000/api/v1'`
- Token management: `getToken()`, `setToken()`, `removeToken()` (localStorage)
- HTTP helpers: `get()`, `post()`, `put()`, `del()` với auto Authorization header
- `ApiError` class cho error handling

**Type definitions** (khớp BE schemas):

```typescript
interface User { id, email, name, phone?, interests?, createdAt }
interface AuthResponse { success, access_token, token_type, user?, error? }
interface Itinerary { id, userId?, destination, startDate, endDate, budget, interests, days[], totalCost, createdAt, rating?, feedback? }
interface ItineraryDay { day, date, activities[] }
interface Activity { id, time, title, description, location, cost, duration, image, coordinates? }
interface ItineraryListResponse { itineraries[], total }
```

**API Functions:**

| Function                 | Method | Endpoint                             | Mô tả                |
| ------------------------ | ------ | ------------------------------------ | -------------------- |
| `apiRegister()`          | POST   | `/auth/register`                     | Đăng ký              |
| `apiLogin()`             | POST   | `/auth/login`                        | Đăng nhập            |
| `apiGetProfile()`        | GET    | `/users/profile`                     | Lấy profile          |
| `apiUpdateProfile()`     | PUT    | `/users/profile`                     | Cập nhật profile     |
| `apiGenerateItinerary()` | POST   | `/itineraries/generate`              | AI tạo lịch trình    |
| `apiGetItineraries()`    | GET    | `/itineraries/`                      | Danh sách lịch trình |
| `apiGetItinerary()`      | GET    | `/itineraries/{id}`                  | Chi tiết lịch trình  |
| `apiDeleteItinerary()`   | DELETE | `/itineraries/{id}`                  | Xóa lịch trình       |
| `apiRateItinerary()`     | PUT    | `/itineraries/{id}/rating`           | Đánh giá             |
| `apiRemoveActivity()`    | DELETE | `/itineraries/{id}/activities/{aid}` | Xóa activity         |
| `apiGetDestinations()`   | GET    | `/destinations/`                     | Danh sách điểm đến   |

---

### 15. `app/utils/auth.ts` — Authentication & Data Management

**Mục đích:** Quản lý xác thực người dùng và dữ liệu lịch trình. **Đã rewrite để gọi Backend API** qua `api.ts`.

#### TypeScript Interfaces:

Re-export từ `api.ts`: `User`, `Itinerary`, `ItineraryDay`, `Activity`

#### Các hàm chính (tất cả async):

| Hàm                                    | Return                              | Mô tả                                    |
| -------------------------------------- | ----------------------------------- | ---------------------------------------- |
| `getCurrentUser()`                     | `User \| null`                      | Lấy user từ localStorage cache           |
| `registerUser(email, password, name)`  | `Promise<{success, error?, user?}>` | Gọi `apiRegister()`, lưu token + user    |
| `loginUser(email, password)`           | `Promise<{success, error?, user?}>` | Gọi `apiLogin()`, lưu token + user       |
| `logoutUser()`                         | `void`                              | Xóa token + user cache từ localStorage   |
| `updateUserProfile(userId, updates)`   | `Promise<User \| null>`             | Gọi `apiUpdateProfile()`, cập nhật cache |
| `saveItinerary(itinerary)`             | `void`                              | No-op (BE tự động lưu khi generate)      |
| `getSavedItineraries()`                | `Promise<Itinerary[]>`              | Gọi `apiGetItineraries()`                |
| `getItineraryById(id)`                 | `Promise<Itinerary \| null>`        | Gọi `apiGetItinerary()`                  |
| `deleteItinerary(id)`                  | `Promise<void>`                     | Gọi `apiDeleteItinerary()`               |
| `rateItinerary(id, rating, feedback?)` | `Promise<void>`                     | Gọi `apiRateItinerary()`                 |
| `isAuthenticated()`                    | `boolean`                           | Check token + user cache                 |
| `refreshUserProfile()`                 | `Promise<User \| null>`             | Fetch fresh data từ BE                   |

#### localStorage Keys (cache only, source of truth là BE):

| Key            | Data Type     | Mô tả                      |
| -------------- | ------------- | -------------------------- |
| `access_token` | `string`      | JWT access token           |
| `currentUser`  | `User (JSON)` | User cache (đồng bộ từ BE) |

**Bảo mật:** Password không còn lưu ở client. Hash bằng bcrypt ở server, JWT token được gửi qua Authorization header.

---

### 16. `app/utils/itinerary.ts` — Itinerary Generation (API-first + Fallback)

**Mục đích:** Tạo lịch trình du lịch. **Đã tích hợp Backend: gọi AI API trước, fallback mock data nếu BE không khả dụng.**

#### Hàm `generateItinerary()` (async)

**Params:** `destination, startDate, endDate, budget, interests`

**Logic:**

1. Gọi `await apiGenerateItinerary()` → BE AI service (Google Gemini)
2. Nếu thành công: return Itinerary từ BE (đã lưu DB, có ID thực)
3. Nếu thất bại (BE down / lỗi): `console.warn` + fallback mock data local
4. Fallback: Tạo lịch trình từ `destinationData` (giở cố định 09:00, 13:00, 17:00)

#### Dữ liệu mẫu fallback

Giữ lại data cho 4 điểm đến (Hà Nội, TP.HCM, Đà Nẵng, Hội An) để demo khi offline.

#### Hàm `formatCurrency(amount)` (giữ nguyên)

Format số thành tiền Việt: `1000000` → `1.000.000 ₫`

---

### 17. `styles/` — CSS & Theme

#### `index.css`

File entry point, import:

1. `fonts.css` — Font definitions (hiện trống)
2. `tailwind.css` — Tailwind CSS config
3. `theme.css` — Design tokens

#### `tailwind.css`

```css
@import "tailwindcss" source(none);
@source '../**/*.{js,ts,jsx,tsx}';
@import "tw-animate-css";
```

Cấu hình Tailwind CSS v4 với:

- `source(none)` + `@source` — Chỉ scan Frontend folder
- `tw-animate-css` — Animation utilities

#### `theme.css`

Design system tokens cho light/dark mode:

- **Colors:** background, foreground, primary, secondary, accent, destructive, muted, border...
- **Sidebar colors:** Riêng cho sidebar component
- **Chart colors:** 5 màu cho biểu đồ
- **Radius:** `--radius: 0.625rem` (10px) với các variant sm/md/lg/xl
- **Typography base styles:** h1-h4, label, button, input

---

### 18. `app/components/ui/` — UI Component Library

Thư mục chứa **30+ UI components** dựa trên **Radix UI primitives** (pattern shadcn/ui). Các components này là building blocks có thể tái sử dụng:

| Component     | File                | Mô tả                      |
| ------------- | ------------------- | -------------------------- |
| Accordion     | `accordion.tsx`     | Collapsible content panels |
| Alert Dialog  | `alert-dialog.tsx`  | Confirmation dialogs       |
| Alert         | `alert.tsx`         | Notification banners       |
| Avatar        | `avatar.tsx`        | User avatar display        |
| Badge         | `badge.tsx`         | Status/tag badges          |
| Button        | `button.tsx`        | Styled buttons (variants)  |
| Calendar      | `calendar.tsx`      | Date picker calendar       |
| Card          | `card.tsx`          | Content container cards    |
| Carousel      | `carousel.tsx`      | Image/content slider       |
| Checkbox      | `checkbox.tsx`      | Checkbox input             |
| Dialog        | `dialog.tsx`        | Modal dialogs              |
| Drawer        | `drawer.tsx`        | Slide-in panels            |
| Dropdown Menu | `dropdown-menu.tsx` | Dropdown menus             |
| Form          | `form.tsx`          | Form with react-hook-form  |
| Input         | `input.tsx`         | Text input fields          |
| Label         | `label.tsx`         | Form labels                |
| Popover       | `popover.tsx`       | Popup content              |
| Progress      | `progress.tsx`      | Progress bars              |
| Select        | `select.tsx`        | Select dropdowns           |
| Separator     | `separator.tsx`     | Visual dividers            |
| Sheet         | `sheet.tsx`         | Side sheet panels          |
| Skeleton      | `skeleton.tsx`      | Loading placeholders       |
| Slider        | `slider.tsx`        | Range sliders              |
| Switch        | `switch.tsx`        | Toggle switches            |
| Table         | `table.tsx`         | Data tables                |
| Tabs          | `tabs.tsx`          | Tab navigation             |
| Textarea      | `textarea.tsx`      | Multi-line text input      |
| Tooltip       | `tooltip.tsx`       | Hover tooltips             |
| Sonner        | `sonner.tsx`        | Toast notifications        |
| Sidebar       | `sidebar.tsx`       | Sidebar navigation         |

**`utils.ts`** — Utility function `cn()` sử dụng `clsx` + `tailwind-merge` để merge class names an toàn.

**`use-mobile.ts`** — Custom hook kiểm tra viewport có phải mobile không (breakpoint-based).

**Lưu ý:** Phần lớn UI components trong folder này **chưa được sử dụng** trong các pages hiện tại. Chúng là thư viện sẵn sàng để dùng khi phát triển thêm features.

---

## 🔄 Luồng nghiệp vụ chính (User Flows)

### Flow 1: Guest tạo lịch trình

```
Home → Click "Bắt Đầu Lên Kế Hoạch"
     → TripPlanning: Điền form (destination, dates, budget, interests)
     → Submit → await generateItinerary() → BE AI tạo lịch trình
     → (fallback: mock data nếu BE down)
     → Navigate → ItineraryView: Xem lịch trình
     → Modal gợi ý "Đăng ký để lưu" (nếu guest)
```

### Flow 2: Guest click điểm đến từ Home

```
Home → Click destination card (ví dụ "Đà Nẵng")
     → Navigate → /trip-planning?destination=Đà Nẵng
     → TripPlanning: Dropdown tự động chọn "Đà Nẵng"
     → Tiếp tục Flow 1
```

### Flow 3: Registered User tạo & lưu lịch trình

```
Login → Nhập email + password → await loginUser() → JWT token được lưu
      → Home → TripPlanning → await generateItinerary() → BE tự động lưu
      → ItineraryView → Lịch trình đã được lưu tự động
      → SavedItineraries: await getSavedItineraries() từ BE
```

### Flow 4: Đánh giá lịch trình

```
ItineraryView → Click "Đánh Giá"
              → Modal: Chọn 1-5 sao + nhập feedback
              → Submit → await rateItinerary() → BE lưu rating
```

### Flow 5: Chỉnh sửa lịch trình

```
ItineraryView → Click "Chỉnh Sửa" → editMode = true
              → Hiện nút Xóa trên mỗi activity
              → Click Xóa → await apiRemoveActivity() → BE cập nhật
              → Click "Xong" → editMode = false
```

---

## 🔌 API Integration — Đã hoàn thành ✅

FE đã được kết nối với BE thông qua `api.ts` service layer.

### Architecture:

```
Pages (Login, Register, TripPlanning, ...)
  → auth.ts / itinerary.ts (business logic layer)
    → api.ts (HTTP layer, token management)
      → Backend API (http://localhost:8000/api/v1)
```

### Mapping FE ↔ BE:

| FE Function             | BE Endpoint                                        | Method |
| ----------------------- | -------------------------------------------------- | ------ |
| `registerUser()`        | `POST /api/v1/auth/register`                       | POST   |
| `loginUser()`           | `POST /api/v1/auth/login`                          | POST   |
| `logoutUser()`          | Client-side (xóa token)                            | —      |
| `getCurrentUser()`      | localStorage cache                                 | —      |
| `refreshUserProfile()`  | `GET /api/v1/users/profile`                        | GET    |
| `updateUserProfile()`   | `PUT /api/v1/users/profile`                        | PUT    |
| `generateItinerary()`   | `POST /api/v1/itineraries/generate`                | POST   |
| `getSavedItineraries()` | `GET /api/v1/itineraries/`                         | GET    |
| `getItineraryById()`    | `GET /api/v1/itineraries/{id}`                     | GET    |
| `deleteItinerary()`     | `DELETE /api/v1/itineraries/{id}`                  | DELETE |
| `rateItinerary()`       | `PUT /api/v1/itineraries/{id}/rating`              | PUT    |
| `apiRemoveActivity()`   | `DELETE /api/v1/itineraries/{id}/activities/{aid}` | DELETE |

---

## ⚠️ Các vấn đề còn lại

1. ~~**Authentication:** Chuyển từ localStorage sang JWT tokens~~ ✅ Đã xong
2. ~~**API Integration:** Thay tất cả localStorage calls bằng API calls~~ ✅ Đã xong
3. **State Management:** Cân nhắc React Context hoặc Zustand cho global state
4. ~~**Error Handling:** Xử lý lỗi mạng, timeout, token expired~~ ✅ Cơ bản đã xử lý
5. ~~**Loading States:** Thêm skeleton/spinner khi chờ API response~~ ✅ Đã thêm Loader2
6. **Map Integration:** Tích hợp bản đồ thực tế (Google Maps / Leaflet)
7. ~~**Environment Variables:** Thêm `.env` cho API base URL~~ ✅ Hardcoded trong api.ts
8. **Input Validation:** Validate date range, budget min/max ở cả FE và BE
9. **Responsive Testing:** Kiểm tra UI trên nhiều kích thước màn hình
10. **SEO & Accessibility:** Thêm meta tags, ARIA labels
11. **Performance:** Lazy loading cho pages, image optimization
