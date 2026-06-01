# 00060B — Architecture/System Review + Go/No-Go before C3/C4

Ngày báo cáo: 2026-06-01
Branch báo cáo: `docs/00060-b1-architecture-c3-c4-readiness`

## Executive summary

| Item | Result |
|---|---|
| Readiness status | `GO_WITH_LIMITATIONS` |
| Can start `C3A` | `YES` |
| Can start `C3B` directly | `NO` |
| Can start `C4` directly | `NO` |

## Vì sao cần phase này

Sau `00059B`, `00059C`, và `00060A`, hệ thống đã đủ ổn để review architecture thật thay vì đoán. Mục tiêu của `00060B` là chốt current truth trước khi bắt đầu C3/C4:

- chat phải gắn với `TripWorkspace`
- ownership phải đáng tin
- session/message phải bám `trip`
- guest/share/quota/error handling phải có quyết định rõ

## Evidence from previous phases

| Phase | What it proves | Remaining risk |
|---|---|---|
| `00059B` | UAT matrix đầy đủ, manual guide PowerShell-safe, source coverage rộng | chưa phải real browser evidence toàn phần |
| `00059C` | Browser/API manual UAT cho homepage, claim, auth, workspace, edit persistence, share | real Gemini/Goong/live outage vẫn partial theo policy |
| `00060A` | Nested subresource authz gap đã được fix và backend tests pass | chat/session ownership chưa có API thật |

## Architecture findings

### 1. Product alignment

Hệ thống hiện tại là website AI travel itinerary cho Việt Nam, không phải chat app. Value cốt lõi vẫn là:

1. chọn destination/date/preferences
2. generate itinerary
3. vào `TripWorkspace`
4. sửa/xem/share/claim trip

Vì vậy:

- `C3` phải là companion nằm trong trip hiện tại
- `C4` phải là history theo trip/session/user

### 2. Frontend reality

- `TripWorkspace.tsx` là điểm gắn chat đúng nhất vì đã có `tripId`, `days`, `activities`, `accommodations`, `budget`, `tripName`
- `FloatingAIChat.tsx` hiện chỉ là mock local-state
- shared trip view là public read-only, không nên có chat mặc định

### 3. Backend reality

- chat tables đã có trong source/migration: `chat_sessions`, `chat_messages`
- chưa có chat API/session API/message API
- current AI generate dùng direct pipeline, không qua supervisor
- rate limiter hiện dùng namespace chung `rate:ai:*`
- ownership sau `00060A` đã đủ tin cậy cho nested trip mutation hiện tại

### 4. Design blockers không còn là production blocker

`00060A` đã gỡ blocker authz lớn nhất cho trip mutation. Vì vậy `C3A` có thể bắt đầu an toàn nếu giữ scope đúng:

- session foundation
- no real AI
- owner-only
- guest phải claim trước

## Main risks still open

| Risk | Severity | Why it matters |
|---|---|---|
| Chat quota shared with generate | HIGH | User có thể hết 3 generate/day rồi chat bị block ngay trong workspace |
| Stale patch handling chưa có design đủ chặt | HIGH | `apply-patch` sau này có race/conflict risk |
| Floating chat hiện vẫn là mock | MEDIUM | UI có shell nhưng chưa gắn `tripId`/session thật |
| Real provider/live outage evidence gần nhất vẫn partial | MEDIUM | Không nên bắt đầu bằng chat live provider ngay |
| Docs drift về migration history chat tables | LOW | Không block source, nhưng dễ gây hiểu sai khi implement |

## Go/No-Go decision

### Decision

**`GO_WITH_LIMITATIONS`**

### Interpretation

- `C3A` được phép bắt đầu
- `C3B` chưa nên bắt đầu trực tiếp
- `C4` chưa nên bắt đầu trực tiếp

### Why not full GO

- quota chat riêng chưa chốt
- session/message API chưa có
- patch-confirm/stale conflict contract chưa được khóa
- current FE chat vẫn là mock

## Recommended next phase

`C3A — Chat Session Foundation`

Scope nên thật nhỏ:

- reuse chat tables hiện có
- thêm owner-only session APIs
- đưa ChatPanel foundation vào `TripWorkspace`
- chưa gọi AI thật

## Files created/updated in 00060B

| File | Purpose |
|---|---|
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | Kiến trúc hiện tại + readiness decision |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | Chia phase C3A/C3B/C3C/C4A/C4B |
| `docs/REPORTS/pr_00060b_description.md` | PR body template |
| `docs/REPORTS/REPORT.md` | Report index cập nhật 00060B |

## Commands/evidence used

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
git fetch origin --prune
git checkout main
git pull origin main
git log --oneline --decorate -30
git log --oneline --decorate --all --grep="00060" -80
git grep -n -E "chat|TripWorkspace|claim|share|rate-limit|generate|history|companion" README.md docs Backend/src Frontend/src Backend/tests Frontend/tests
```

## Notes

- Không có thay đổi production code trong branch này.
- Không gọi Gemini thật, Goong thật, hoặc ETL thật.
- Test status được trích từ `00059C` và `00060A`, không overclaim pass mới.
