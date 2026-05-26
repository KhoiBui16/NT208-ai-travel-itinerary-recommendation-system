# Issue: Ruff Cache Permission Warning

Ngày tạo: 2026-05-26  
Status: TO DO  
Severity: Low

## Triệu Chứng

Both Ruff commands passed, but emitted warnings:

```text
Failed to write cache file Backend/.ruff_cache/... Access is denied.
```

## Assessment

This does not block lint/format correctness. It is a local workspace cache permission warning.

## Next Action

Clean or recreate `.ruff_cache` locally if the warning becomes noisy. Do not treat this as a source failure.
