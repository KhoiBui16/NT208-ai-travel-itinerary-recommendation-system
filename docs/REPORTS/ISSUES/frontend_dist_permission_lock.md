# Issue: Frontend Dist Permission Lock

Ngày tạo: 2026-05-26  
Status: TO DO  
Severity: Low for source, Medium for local developer experience

## Triệu Chứng

`npm run build` fails locally:

```text
EPERM, Permission denied: Frontend/dist/assets
```

`Frontend/dist/` is ignored by Git and contains locked build artifacts from prior local runs.

## Evidence

- Default `npm run build`: fail at Vite `emptyDir`.
- Clean alternate build:

```powershell
npm run build -- --outDir ..\.codex-run-logs\frontend-dist-20260526 --emptyOutDir=true
```

Result: build success, 3192 modules transformed.

## Assessment

This is not a TypeScript/Vite source compile error. It is a local Windows filesystem permission/lock issue around ignored `dist` artifacts.

## Next Action

Clean or unlock `Frontend/dist` outside the docs PR, then rerun exact `npm run build`. CI should run on a clean checkout and should not inherit this local artifact.

## CI Recheck In Fix 00044

Branch `fix/00044-c-stabilize-c1-guest-flow` verified the CI-clean scenario in a temporary clean worktree:

```text
git worktree add --detach <temp> HEAD
cd <temp>/Frontend
npm ci
npm run build
```

Result:

```text
found 0 vulnerabilities
vite v6.4.2 building for production
dist/ generated successfully
```

Conclusion: this remains a local working-copy artifact, not a CI source/build failure.
