# 00060F Staging Deployment Readiness + CI/CD Plan

Ngày cập nhật: 2026-06-03
Branch báo cáo: `docs/00060-d-staging-deployment-readiness`
PR title đề xuất: `docs: [#00060] add staging deployment readiness and ci cd plan`

## 1. Executive summary

- Recommended architecture: `Vercel + Render Python Web Service + Render Postgres (or Supabase) + Redis TCP provider`
- Docker needed now? `NO`
- CI/CD needed now? `YES, nhưng manual-first rồi mới bật auto-deploy`
- Can deploy staging manually? `YES`, nếu có secret/platform values
- Biggest blocker: phase này chưa deploy thật vì còn thiếu secret/platform access cho môi trường staging

## 2. Base verification

| Check | Result | Evidence |
|---|---|---|
| `main` pulled | PASS | `a2662b2 docs: [#00060] fix final docs sync and mermaid rendering (#74)` |
| `00060D-FIX` merged | YES | Có trên `main` hiện tại |
| `00060E-R2` merged vào `main` | YES | `a2662b2 docs: [#00060] fix final docs sync and mermaid rendering (#74)` |
| Current branch | `docs/00060-d-staging-deployment-readiness` | branch sạch được tạo lại từ `main` sau khi `00060E-R2` đã merge |

## 3. Source deployment inventory

| Area | Source truth | Deployment implication |
|---|---|---|
| Frontend hosting | Vite SPA + `createBrowserRouter` | Cần SPA rewrite trên Vercel |
| Frontend env | `VITE_API_URL` | Chỉ cần set backend URL đúng |
| Backend runtime | `uvicorn src.main:app` | Hợp Render Web Service, không hợp serverless mặc định |
| Database | `DATABASE_URL` dùng async Postgres URL (`postgresql+asyncpg` scheme) | Cần managed Postgres TCP URL |
| Redis | `REDIS_URL` dùng Redis TCP URL (`redis` / `rediss` scheme) | Cần Redis TCP-compatible, không dùng REST-only |
| Health | `/api/v1/health` | Dùng Render health check path |
| CORS | `CORS_ORIGINS` + `FRONTEND_URL` | Phải set cả allowlist và canonical FE URL |
| Migration config | Không có `ALEMBIC_DATABASE_URL` trong source | Docs không được overclaim dual-URL support |
| Docker support | Có `Backend/Dockerfile` + `docker-compose.yml` | Docker là fallback deploy path, không bắt buộc ngay |
| CI | GitHub Actions có BE/FE/pr-policy checks | Nên giữ làm merge gate, deploy để manual-first |

## 4. Platform decision

| Component | Platform | Reason |
|---|---|---|
| Frontend | Vercel | Build Vite nhanh, preview URL tiện, hợp SPA |
| Backend | Render Web Service (native Python) | Source chỉ cần long-running ASGI process, chưa cần Docker |
| Database | Render Postgres ưu tiên; Supabase là phương án 2 | Render đơn giản hơn với current single-`DATABASE_URL` source |
| Redis | Render Redis / TCP Redis provider | Source hiện dùng TCP Redis client |

### Option comparison

| Option | Stack | Pros | Cons | Source compatibility | Recommendation |
|---|---|---|---|---|---|
| A | Vercel + Render Python + Render Postgres + Render Redis | Đơn giản nhất, ít drift ops | Có thể tốn phí hơn free mix | Rất cao | **Recommended** |
| B | Vercel + Render Python + Supabase + Render Redis | DB UI mạnh, dễ quan sát | Migration/pooler cần cẩn thận | Cao | Dùng khi đã có Supabase |
| C | Vercel + Render Docker + managed PG/Redis | Parity cao với local Docker | Build chậm hơn, nặng hơn | Cao | Fallback |
| D | Vercel FE + serverless BE + Upstash REST | Triển khai nghe gọn | Lệch source runtime hiện tại | Thấp | Không khuyến nghị |

## 5. Required user-provided values

| Value | Where to put | Secret? |
|---|---|---|
| Backend public URL | `Frontend: VITE_API_URL` | No |
| Frontend public URL | `Backend: FRONTEND_URL`, `CORS_ORIGINS` | No |
| Postgres connection string | `Backend: DATABASE_URL` | Yes |
| Redis connection string | `Backend: REDIS_URL` | Yes |
| JWT secret mạnh | `Backend: JWT_SECRET_KEY` | Yes |
| Gemini API key | `Backend: GEMINI_API_KEY` | Yes |
| Goong API key | `Backend: GOONG_API_KEY` | Yes nếu chạy live ETL |
| Optional SMTP creds | `Backend: SMTP_*` | Yes |

## 6. Env var checklist

| Service | Variable | Required? |
|---|---|---|
| Frontend | `VITE_API_URL` | Yes |
| Backend | `DATABASE_URL` | Yes |
| Backend | `REDIS_URL` | Yes |
| Backend | `JWT_SECRET_KEY` | Yes |
| Backend | `GEMINI_API_KEY` | Yes để smoke AI generate thật |
| Backend | `GOONG_API_KEY` | Optional runtime / required for live ETL |
| Backend | `FRONTEND_URL` | Yes |
| Backend | `CORS_ORIGINS` | Yes |
| Backend | `APP_DEBUG=false` | Yes |
| Backend | `ENVIRONMENT=production` | Recommended |
| Backend | `SMTP_*` | Optional |
| Backend | `ENABLE_ANALYTICS` | Optional, keep `false` |
| Backend | `ANALYTICS_DATABASE_URL` | Optional unless analytics enabled |

## 7. Deployment steps

### 7.1 Frontend — Vercel

1. Import repo vào Vercel.
2. Chọn root `Frontend`.
3. Set:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Env: `VITE_API_URL=https://<render-backend>.onrender.com`
4. Deploy.
5. Ghi lại production URL và preview URL pattern.

### 7.2 Frontend deep-link fallback

Repo thêm:

```txt
Frontend/vercel.json
```

để rewrite mọi route về `index.html`, cần thiết cho `/trip-library`, `/trip-workspace`, `/shared/:token`, ...

### 7.3 Backend — Render Web Service

1. Tạo Render Web Service từ repo.
2. Root directory: `Backend`
3. Runtime: `Python`
4. Build command:

```txt
pip install uv && uv sync --frozen --no-dev
```

5. Start command:

```txt
uv run uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

6. Health path:

```txt
/api/v1/health
```

7. Set env vars backend theo checklist.

### 7.4 Database / Redis

- Ưu tiên Render Postgres + Render Redis để giảm ops mismatch.
- Nếu dùng Supabase:
  - ưu tiên pooler/session URL nào thật sự chạy ổn từ Render;
  - không ghi docs như thể source đã có `ALEMBIC_DATABASE_URL`.

### 7.5 Migration

Khuyến nghị giai đoạn đầu:

```bash
cd Backend
uv run alembic upgrade head
uv run alembic check
```

Chạy bằng Render Shell hoặc pre-deploy command sau khi đã xác nhận flow ổn định.

Nếu Supabase cần URL khác cho migration, override tạm cho lệnh migration:

```bash
cd Backend
DATABASE_URL="<migration-friendly-url>" uv run alembic upgrade head
```

### 7.6 CORS

- `FRONTEND_URL` = canonical Vercel URL
- `CORS_ORIGINS` = JSON array các allowed origin thực sự

Ví dụ:

```txt
FRONTEND_URL=https://dulichviet-staging.vercel.app
CORS_ORIGINS=["https://dulichviet-staging.vercel.app"]
```

### 7.7 Smoke test staging

- frontend `/` render
- `/login`, `/register`, `/create-trip` render
- protected routes redirect đúng
- `/api/v1/health` trả `200`
- nếu có `GEMINI_API_KEY`: generate 1 trip ngắn và verify workspace
- public share route read-only

### 7.8 Rollback

- Vercel rollback deployment trước
- Render rollback deployment trước
- DB migration rollback chỉ làm khi đã review:

```bash
cd Backend
uv run alembic downgrade -1
```

## 8. Files changed

| File | Change | Why |
|---|---|---|
| `.gitignore` | Bỏ ignore riêng cho `Frontend/vercel.json` | Để SPA rewrite config có thể được commit cùng deploy guide |
| `Frontend/vercel.json` | Thêm SPA rewrite config | Deep links trên Vercel không gãy |
| `docs/STAGING_DEPLOYMENT_GUIDE.md` | Tạo guide staging mới | Chốt platform decision và runbook |
| `docs/REPORTS/00060f_staging_deployment_readiness.md` | Tạo report phase `00060F` | Ghi inventory, blocker, decision |
| `docs/REPORTS/pr_00060f_description.md` | Tạo PR body template | Chuẩn bị PR đúng policy |
| `docs/REPORTS/REPORT.md` | Thêm snapshot `00060F` | Sync report index |
| `README.md` | Thêm pointer ngắn sang staging guide | Reviewer có entrypoint nhanh |

## 9. Remaining issues

| Issue | Target phase | Reason |
|---|---|---|
| Real staging deploy chưa chạy | manual deploy step | Chưa có platform access + secret thật trong phase này |
| Staging smoke chưa chạy trên internet-facing URL | post-merge ops | Cần deploy backend, Postgres/Redis và frontend trước khi smoke thật |
| Chat session/message API chưa có | `C3A/C3B` | Không phải blocker cho deploy current MVP, nhưng là blocker cho companion features |
| ETL scheduler staging chưa có | post-staging hardening | `00060F` mới dừng ở readiness + plan |

## 10. Decision

- Staging deployment readiness docs: `READY`
- Manual staging deploy path: `YES`
- Auto-deploy now: `NO, manual-first`
- `C3A` start permission: vẫn `YES`
- PR/merge `00060F` vào `main` ngay bây giờ: `YES`
