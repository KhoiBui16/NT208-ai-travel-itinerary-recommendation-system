# Issue: Frontend Build EPERM

## Status
OPEN

## Evidence
- Command: `npm run build` (cwd: Frontend/)
- Output summary: `EPERM, Permission denied: \\?\...\Frontend\dist\assets` — `rmSync` fails at `emptyDir` step
- Error occurs at Vite's `prepareOutDir` → `emptyDir(dist/assets)` → `rmSync`
- Reproduced twice with `Remove-Item -Recurse -Force dist` before build — still fails

## Impact
- Cannot verify production build artifact
- Cannot confirm TypeScript compilation errors are absent in production mode
- Dev server (`npm run dev`) works fine — this is a build-only issue

## Reproduction
1. `cd Frontend`
2. `npm run build`
3. Fails with EPERM on `dist/assets`

## Expected
Build completes, `dist/` folder created with compiled assets.

## Actual
```
EPERM, Permission denied: \\?\...\Frontend\dist\assets
at Object.rmSync (node:fs:1236:18)
at emptyDir (vite/dist/node/chunks/dep-Dq2t6Dq0.js:6855:19)
```

## Suggested fix
1. Close any process holding a lock on `dist/assets` (e.g., antivirus, Windows Explorer, previous Vite process)
2. Run `taskkill /F /IM node.exe` to kill all Node processes, then retry build
3. Or run build from a terminal with elevated permissions
4. Long-term: add `dist/` to `.gitignore` and ensure CI builds in a clean environment
