# Issue: Async Generation Job Needed for Long Trips

**Phase:** `00060L`
**Severity:** P2 — affects UX cho trips > 7 ngày; P1 nếu timeout xảy ra thường xuyên
**Status:** Open — blocking REST workaround với long-trip banner deployed

---

## Tóm tắt

AI generate itinerary hiện là **blocking REST call**. Với trip dài (8–30 ngày), Gemini có thể mất 20–45 giây để respond. Nếu vượt `agent_timeout_seconds = 30`, user nhận error mà không có itinerary nào được lưu.

**Current behavior (00060J):**
- `MAX_TRIP_DAYS` đã tăng từ 14 lên 30
- Info banner xuất hiện khi `dayCount > 7`: "Lịch trình dài có thể mất nhiều thời gian hơn. Hệ thống sẽ tạo dựa trên dữ liệu hiện có."
- Timeout copy: "Dịch vụ AI phản hồi quá lâu. Chưa có lịch trình nào được lưu."
- 4 progress steps cycle mỗi 4s trong UI

**Vẫn còn rủi ro:** Trip 15–30 ngày có thể timeout. User thấy error sau 30s chờ mà không có itinerary.

---

## Root cause

Architecture hiện tại:
```
POST /api/v1/itineraries/generate
  → ItineraryPipeline.generate()
  → GeminiLLM.generate_text() [await với timeout 30s]
  → persist DB
  → return ItineraryResponse
```

Không có background job, không có job queue, không có polling endpoint.

---

## Required fix

1. `jobs` table để track generation status
2. `POST /generate` → enqueue job, return `{ jobId, status: "queued" }`
3. `GET /generate/status/{jobId}` → polling endpoint
4. Worker process chạy Gemini async
5. FE polling loop mỗi 2-3s
6. Hoặc: SSE endpoint cho real-time progress

---

## Workaround constraints

- KHÔNG promise eventual generation trong UI hiện tại (vì chưa có worker)
- Timeout copy đã đúng hướng: "Chưa có lịch trình nào được lưu"
- Long trip banner cảnh báo trước

---

## Impact if not fixed

- Trip > ~10 ngày có risk timeout cao
- User UX: 30s chờ rồi thấy error toast
- Không có retry mechanism

---

## Follow-up tag

`00060L` — Async AI Generation Job + Polling
