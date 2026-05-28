# Browser Flow Test Plan for C3 — 2026-05-28

## Status: PARTIALLY_VERIFIED (B3 Playwright Evidence)

---

## B3 Playwright Evidence (2026-05-28)

Tool: Playwright 1.59.1 Chromium  
Frontend: `http://127.0.0.1:5173`  
Backend: `http://127.0.0.1:8000`  
Test files: `Frontend/tests/e2e/b3/` (untracked)

### Flow A — TP.HCM Generate Error Visibility

| Item | Result |
|---|---|
| UI selected destination | `TP. Hồ Chí Minh` (free text input) |
| Request payload destination | `"TP. Hồ Chí Minh"` |
| Request payload full | `{"destination":"TP. Hồ Chí Minh","startDate":"2026-05-28","endDate":"2026-05-30","budget":5000000,"adults":1,"children":0,"interests":["culture","food"]}` |
| Response status | **422** |
| Response body | `{"detail":"Destination data not found. Please run ETL for this destination first.","error_code":"VALIDATION_ERROR","status_code":422}` |
| UI error text | **"Không thể tạo lịch trình. Vui lòng thử lại."** |
| Console error | `Failed to load resource: the server responded with a status of 422` |
| Classification | **FE_GENERIC_ERROR_MASKING_BACKEND_REASON** |

**Kết luận**: Backend trả 422 với message rõ ràng. FE hiển thị generic error — user không biết lý do thật.

### Flow B — TripWorkspace Hà Nội (trip_id=235)

| Item | Result |
|---|---|
| Login | PASS — `b2test_matrix@example.com` |
| Route | `http://127.0.0.1:5173/trip-workspace?tripId=235` |
| Render status | **PASS** |
| Redirect to login | NO — workspace renders correctly |
| Hà Nội content visible | YES |
| Activities visible | YES |
| Network errors (4xx/5xx) | **0** |
| Console errors | **0** |
| FloatingAIChat | **NOT VISIBLE** — C3 chưa implement |
| C2 suggestions | NOT VISIBLE in workspace |

### Flow C — Date Picker Observation

| Item | Result |
|---|---|
| Past dates | DISABLED (28 ngày trong tháng hiện tại bị disable) |
| Today/future | SELECTABLE |
| Confirm button | Disabled cho đến khi chọn đủ 2 ngày |
| Destination suggestions | **EMPTY** — FE dùng hardcoded list, không query API |
| Rate limit notice | Hiển thị đúng: "tối đa 3 lịch trình AI mỗi ngày" |

---

## Destination Suggestions — Static vs DB-backed

**Phát hiện quan trọng từ B3**:

FE dùng `popularDestinations` hardcoded trong `tripConstants.ts`, không query `/api/v1/places/destinations`.

- User gõ "Hà" → không có suggestion dropdown
- User gõ "TP" → không có suggestion dropdown
- User có thể gõ bất kỳ tên nào → generate sẽ fail 422 nếu không có trong DB

Xem issue: `issue_destination_selector_not_db_backed.md`

---

## Flows Cần Test Sau Khi C3 Implement

| Flow | Prerequisite | Priority |
|---|---|---|
| FloatingAIChat open/close | C3 implement | HIGH |
| Chat message send/receive | C3 implement | HIGH |
| proposedOperations display | C3 implement | HIGH |
| apply-patch confirm | C3 implement | HIGH |
| apply-patch non-owner reject | C3 implement | HIGH |
| Chat session persistence | C3 implement | MEDIUM |
| Rate limit companion chat | C3 implement | HIGH |
| Multi-city workspace | ETL data expansion | MEDIUM |
| Guest claim → workspace → chat | C3 + ETL | HIGH |

---

## Screenshots Evidence

```
Frontend/tests/e2e/b3/screenshots/
  flow-a-01-create-trip-loaded.png      — Create Trip page
  flow-a-02-destination-filled.png      — TP.HCM typed, no suggestions
  flow-a-03-calendar-open.png           — Calendar modal
  flow-a-04-dates-selected.png          — 2 dates selected
  flow-a-05-after-calendar.png          — Calendar closed
  flow-a-06-after-submit.png            — After submit, generic error shown
  flow-b-01-login-page.png              — Login page
  flow-b-02-after-login.png             — Home after login
  flow-b-03-workspace-loaded.png        — TripWorkspace loaded
  flow-b-05-workspace-scrolled.png      — Workspace scrolled
  flow-c-01-create-trip-full.png        — Create Trip full
  flow-c-04-calendar-open.png           — Calendar with disabled days
```
