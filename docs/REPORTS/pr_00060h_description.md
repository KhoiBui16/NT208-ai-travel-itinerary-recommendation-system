## Mô tả

PR này harden current product boundary trước `00061A` mà không implement chat feature mới:

- migrate Gemini backend SDK từ `google-generativeai` sang `google-genai`;
- sửa generated activity images để không mất sau reload khi đã có `place_id`;
- làm rõ guest/auth flow để guest có thể xem trip vừa generate trong cùng browser session mà không bị ép login ngay;
- sync lại README/report/plan cho đúng boundary `C3A/C3B/C4`.

## Thay đổi chính

- Migrate `Backend/src/agent/llm.py` sang `google-genai` và giữ timeout/error contract `AI_PROVIDER_TIMEOUT`.
- Cập nhật dependency backend sang `google-genai` và sync `uv.lock`.
- Sửa pipeline persist image cho generated activity bằng `Place.image` khi `place_id` hợp lệ, kèm fallback match bảo thủ.
- Thêm session-trip mapper + guest workspace continuity qua `sessionStorage.currentTrip`.
- Cập nhật `ProtectedRoute` và `TripWorkspace` để guest xem được workspace local-session-backed nhưng vẫn không có full owner save/share/chat path.
- Làm rõ copy guest quota/login boundary trên `CreateTrip`.
- Thêm image fallback cho `TripTimeline` và `ActivityDetailModal`.
- Thêm Playwright regression cho guest workspace boundary; giữ full suite xanh trong phần runnable.
- Update `README.md`, `docs/C3_C4_IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE_C3_C4_READINESS.md`, `docs/REPORTS/00060h_guest_gemini_image_boundary.md`, và `docs/REPORTS/REPORT.md`.

## Cách kiểm tra (Testing)

- `npm run build -- --outDir .build-tmp\verify-00060h-guest-gemini-image`
- `npx playwright test tests/e2e/00060d-home-destination-image-fallback.spec.ts tests/e2e/00060d-ai-timeout-ux.spec.ts tests/e2e/00060h-guest-workspace-boundary.spec.ts --reporter=list`
- `npx playwright test --reporter=list`
- `uv run ruff check src tests`
- `uv run alembic check`
- `uv run pytest tests/unit/test_agent_llm.py tests/unit/test_itinerary_pipeline.py tests/unit/test_itinerary_service.py -v --tb=short`
- `uv run pytest tests/unit/ -v --tb=short`
- `uv run pytest tests/integration/ -v --tb=short -k "generate or itinerary or rate"`

## Lưu ý khác

- Phase này không implement `C3A/C3B/C4`; chỉ harden boundary và sync docs trước `00061A`.
- Guest workspace hiện là browser-session-backed cho trip vừa generate; owner-only chat/save/share vẫn cần auth/claim như current product rule.
- Việc "generate cuối cùng sẽ xong dù chậm" chưa thể cam kết với sync HTTP request; cần background job/polling ở phase tương lai nếu product muốn guarantee đó.
- Không có real Gemini call trong test suite mới.
