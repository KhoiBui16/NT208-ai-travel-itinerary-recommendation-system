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
