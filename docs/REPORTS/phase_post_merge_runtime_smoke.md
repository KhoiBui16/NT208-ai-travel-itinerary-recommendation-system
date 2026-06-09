# Phase Report: Post-Merge Runtime Smoke

Ngày báo cáo: 2026-05-26  
Status: PASS với local caveat về `Frontend/dist`.

## Files Liên Quan

- `docker-compose.yml`
- `Backend/src/main.py`
- `Backend/src/core/config.py`
- `Frontend/src/app/services/api.ts`
- `.claude/skills/fullstack-browser-debug/SKILL.md`

## Commands Đã Chạy

```powershell
git pull --ff-only origin main
docker compose up -d db redis
cd Backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --host localhost --port 8000
cd Frontend
npm ci
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

## Kết Quả

| Check | Result |
|---|---|
| Docker db | Healthy, port 5432 |
| Docker redis | Healthy, port 6379 |
| Backend | Healthy, port 8000 |
| Frontend | Running, port 5173 |
| Vite API base | `VITE_API_URL=http://localhost:8000` |
| Browser smoke | Pass |

## Browser Evidence

- Auth generate: `POST /api/v1/itineraries/generate` -> 201, trip `136`, 1 day, 5 activities.
- Guest generate: `POST /api/v1/itineraries/generate` -> 201, trip `137`, 1 day, 5 activities, returned claim token.
- Guest claim: `POST /api/v1/itineraries/137/claim` -> 200.
- Guest rate limit: direct smoke with fake destination returned `[422, 422, 422, 429]`, proving quota blocks on 4th call without Gemini.
- Browser console errors: none captured.

## Screenshots

- [Home](assets/2026-05-26/home.png)
- [Cities](assets/2026-05-26/cities.png)
- [City detail Hà Nội](assets/2026-05-26/city-detail-ha-noi.png)
- [Auth generated trip reload](assets/2026-05-26/auth-trip-workspace-136-reload.png)
- [Guest login pending claim](assets/2026-05-26/guest-login-pending-137.png)
- [Guest claimed workspace](assets/2026-05-26/guest-claimed-trip-workspace-137.png)

## Caveat

`npm run build` default failed locally because ignored `Frontend/dist/assets` could not be deleted on Windows. A clean alternate `outDir` build passed, so this is tracked as local artifact issue rather than source compile failure.
