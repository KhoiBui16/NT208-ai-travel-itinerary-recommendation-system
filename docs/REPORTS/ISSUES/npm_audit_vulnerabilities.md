# Issue: Frontend npm Audit Vulnerabilities

Ngày tạo: 2026-05-26  
Ngày xử lý: 2026-05-26
Status: DONE
Severity: Fixed in branch `fix/00044-c-stabilize-c1-guest-flow`

## Triệu Chứng

`npm ci` completed successfully but reported:

```text
3 vulnerabilities (1 moderate, 2 high)
```

## Assessment

This branch does not change package versions, so no dependency fix is included here. The issue should be triaged separately with `npm audit` and compatibility review.

## Next Action

Open a dedicated dependency maintenance branch if the vulnerable packages affect runtime or CI policy.

## Resolution

Branch: `fix/00044-c-stabilize-c1-guest-flow`

- Upgraded direct dev dependency `vite` from `6.3.5` to `6.4.2`.
- Ran `npm audit fix` to update transitive vulnerable packages in `package-lock.json`.
- No runtime source changes were needed for dependency audit.

## Verification

```text
npm audit --json
total vulnerabilities = 0
```

Additional gates after dependency update:

```text
npm ci --no-audit
npm run build -- --outDir ..\.codex-run-logs\frontend-dist-fix-00044-after-audit --emptyOutDir=true
npx playwright test --reporter=list
13 passed
```
