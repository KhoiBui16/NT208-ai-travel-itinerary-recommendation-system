# 00060H Guest/Gemini/Image Boundary

Date: 2026-06-03

Branch: `fix/00060-d-guest-gemini-image-boundary`

## 1. Executive summary

- Gemini SDK migration done? YES
- Generated activity images fixed? YES
- Guest AI workspace display fixed? YES
- Manual guest/auth UX clarified? YES
- Chatbot Gemini/rate-limit plan added? YES
- Can run `00061A` after merge? YES

## 2. RCA

| Issue | Root cause | Fix |
|---|---|---|
| Gemini SDK deprecation | Backend vẫn dùng `google.generativeai`, trong khi SDK này đã vào trạng thái legacy/deprecated | Migrate sang `google-genai`, giữ async timeout boundary, JSON parsing, và structured provider error |
| Generate chậm/timeout | Điểm chậm nằm ở external Gemini provider call; sync HTTP request vẫn bị ràng buộc bởi app/proxy/browser timeout | Giữ flow sync hiện tại nhưng harden `AI_PROVIDER_TIMEOUT`, logs, và docs; không hứa "eventually complete" nếu chưa có background job |
| Activity images mất sau reload | Generated activity có thể persist `image=""` dù đã có `place_id` hợp lệ nên UI reload lại không còn ảnh | Persist lại `Place.image` khi map được `place_id`; FE thêm fallback image khi URL rỗng/hỏng |
| Guest workspace bị đứt mạch | FE trước đây chủ yếu lưu `pendingClaim`, nhưng không luôn giữ đủ `currentTrip` để render workspace cùng browser session | Tạo mapper cho `ItineraryResponse` → session trip, lưu `currentTrip`, cho guest mở `TripWorkspace` local-state-backed trước khi claim |
| Guest/auth copy dễ gây hiểu nhầm | Copy "Người dùng miễn phí..." không nói rõ guest có thể generate nhưng chưa có full owner quyền | Đổi copy theo rule sản phẩm: guest generate thử được, đăng nhập mới có quyền lưu tài khoản/chỉnh sửa/chia sẻ đầy đủ |

## 3. Product behavior after fix

| User type | AI generate | Manual create | Save/edit/share | Quota |
|---|---|---|---|---|
| Guest / chưa đăng nhập | Generate được, nhận `claimToken`, xem ngay trip trong cùng browser session qua `currentTrip` | Dùng được ở local/browser session | Chỉ lưu tạm trong trình duyệt; owner-only save/share/list vẫn cần auth | Dùng generate quota guest hiện tại |
| Authenticated user | Generate được, đi vào workspace owner-backed | Dùng được như trước | Có đầy đủ owner quyền qua API: save/edit/share/library | Dùng generate quota auth hiện tại |

## 4. Long-running generation decision

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Increase timeout only | Nhanh, ít scope, hữu ích cho local/staging smoke | Vẫn block UI/proxy/browser; không đảm bảo request sẽ luôn hoàn tất | Chỉ dùng như hardening ngắn hạn cho local/staging |
| Stream progress / SSE | UX tốt hơn | Tăng đáng kể scope FE/BE | Để phase sau nếu cần |
| Background generation job | Là hướng đúng nếu muốn "eventually complete even if slow" | Cần job table, worker, status API, polling/retry policy | Future phase, chưa làm ở `00060H` |
| Prompt/context optimization | Có thể giảm latency thực tế | Không loại bỏ được provider latency hoặc proxy timeout | Làm dần khi an toàn, nhưng không thay background job |

## 5. C3/C4 impact

| Phase | Gemini usage | Rate-limit rule | Boundary |
|---|---|---|---|
| C3A | Không gọi Gemini thật | Chưa mở chat quota | Session foundation owner-only, trip-scoped |
| C3B | Gọi Gemini qua shared provider abstraction (`src/agent/llm.py`) | Phải tách quota chat khỏi quota generate | Fake provider trong test, real Gemini ngoài CI |
| C4 | Không thêm provider logic mới, chỉ reuse session/message data | Reuse quota policy đã chốt từ C3B | Persist/reload history owner-only |

## 6. Source changes

| File | Change | Why |
|---|---|---|
| `Backend/pyproject.toml` | Replace `google-generativeai` bằng `google-genai` | Loại bỏ SDK deprecated |
| `Backend/uv.lock` | Sync dependency graph | Giữ lockfile đúng với dependency mới |
| `Backend/src/agent/llm.py` | Migrate async Gemini client + keep timeout/error contract | Giữ provider boundary hiện tại nhưng theo SDK mới |
| `Backend/src/itineraries/pipeline.py` | Persist generated activity images từ `Place.image` khi có `place_id`; fallback match bảo thủ | Fix missing image sau reload |
| `Backend/tests/unit/test_agent_llm.py` | Mock new SDK + timeout contract | Prove `AI_PROVIDER_TIMEOUT` vẫn đúng |
| `Backend/tests/unit/test_itinerary_pipeline.py` | Verify image persistence/fallback theo `place_id` | Prove generated activity image fix |
| `Backend/tests/unit/test_itinerary_service.py` | Verify guest generate gets `claimToken` | Khóa lại guest flow contract |
| `Frontend/src/app/utils/placeImage.ts` | Default/fallback image helpers | Tránh activity/home image blank |
| `Frontend/src/app/utils/tripResponseMapper.ts` | Map API response sang `currentTrip` session shape | Dùng lại cho guest workspace continuity |
| `Frontend/src/app/pages/CreateTrip.tsx` | Store `currentTrip`, clarify guest quota copy | Guest generate flow rõ ràng hơn |
| `Frontend/src/app/hooks/trips/useTripSync.ts` | Read/write local session trip snapshot | Cho guest workspace render ổn định |
| `Frontend/src/app/components/ProtectedRoute.tsx` | Allow guest workspace only when local trip context is valid | Không ép login ngay sau guest generate |
| `Frontend/src/app/pages/TripWorkspace.tsx` | Keep guest workspace local-only for owner actions; hide share owner path | Đúng boundary guest vs owner |
| `Frontend/src/app/components/TripTimeline.tsx` | Activity image fallback | Không để blank image khi reload |
| `Frontend/src/app/components/ActivityDetailModal.tsx` | Detail image fallback | UI ổn định hơn khi data image thiếu |
| `Frontend/tests/e2e/00060h-guest-workspace-boundary.spec.ts` | Cover guest session workspace + auth API-preferred workspace | Prove boundary đúng ở browser level |
| `README.md`, `docs/C3_C4_IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE_C3_C4_READINESS.md`, `docs/REPORTS/REPORT.md` | Sync current truth và plan trước `00061A` | Tránh docs drift sau hardening |

## 7. Tests

| Command | Status | Notes |
|---|---|---|
| `npm run build -- --outDir .build-tmp\verify-00060h-guest-gemini-image` | PASS | Frontend build clean cho scope này |
| `npx playwright test tests/e2e/00060d-home-destination-image-fallback.spec.ts tests/e2e/00060d-ai-timeout-ux.spec.ts tests/e2e/00060h-guest-workspace-boundary.spec.ts --reporter=list` | PASS | 4 passed |
| `npx playwright test --reporter=list` | PASS | 17 passed, 11 skipped |
| `uv run ruff check src tests` | PASS | Ruff cache warning là local-only, non-blocking |
| `uv run pytest tests/unit/test_agent_llm.py tests/unit/test_itinerary_pipeline.py tests/unit/test_itinerary_service.py -v --tb=short` | PASS | 32 passed |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | 131 passed, 1 warning |
| `uv run alembic check` | PASS | No new upgrade operations detected |
| `uv run pytest tests/integration/ -v --tb=short -k "generate or itinerary or rate"` | PASS | 17 passed, 9 skipped, 25 deselected |

## 8. Remaining risks

| Risk | Follow-up |
|---|---|
| Real Gemini provider latency vẫn có thể xảy ra | Theo dõi timing logs và cân nhắc phase background job/polling riêng nếu muốn eventual completion |
| Guest workspace hiện là browser-session-backed, không phải owner-backed server session | Đây là chủ đích; owner chat/save/share vẫn chờ auth/claim |
| Chat quota riêng vẫn chưa tồn tại trong source | Thực hiện ở `C3B`, không kéo vào `C3A` |
| C3 chatbot vẫn chưa có API/session foundation thật | Tiếp tục theo `00061A` sau khi merge phase này |

## 9. Decision

- Guest/auth boundary: READY
- Gemini SDK migration: READY
- Generated activity image persistence: READY
- Chat quota / provider plan before `00061A`: DOCUMENTED
- Có thể đi tiếp `00061A C3/C4 preflight`: YES
