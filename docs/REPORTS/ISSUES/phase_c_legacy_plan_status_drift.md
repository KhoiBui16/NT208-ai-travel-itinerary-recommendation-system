# Issue: Phase C Legacy Plan Status Drift

Ngày tạo: 2026-05-26  
Status: TO DO  
Severity: Low for runtime / Medium for planning clarity

## Triệu Chứng

`plan/19_phase_c_overview.md` còn ghi:

- `Trạng thái: Chưa bắt đầu`
- branch examples kiểu `feat/00040-c1-generate-pipeline`

Trong khi source code và workflow hiện tại cho thấy:

- C.0 Goong-first ETL readiness đã có trên `main`
- C.1 AI Generate Pipeline đã có trên `main`
- branch regex hiện tại không dùng suffix `c1/c2/c3/c4/c5`

## Evidence

- `Backend/src/itineraries/pipeline.py` đã tồn tại
- `Backend/src/agent/config.py`, `llm.py`, prompt/schema C.1 đã tồn tại
- `docs/09_execution_tracker.md` đã có task `00040` và `00041`
- branch regex trong `CLAUDE.md` / workflow:

```text
^(feat|fix|docs|style|refactor|chore)/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

## Assessment

Đây không phải bug runtime, nhưng là drift planning dễ làm lệch branch naming và nhận định tiến độ nếu team tiếp tục đọc `plan/` như tài liệu chính.

## Suggested Fix

- Không dùng `plan/19_phase_c_overview.md` làm source of truth trực tiếp nữa nếu chưa refresh.
- Ghi rõ trong report/docs rằng:
  - `docs/` + source code mới là current truth
  - branch strategy cho phần còn lại của Phase C nên dùng:
    - `feat/00047-c-suggestion-service`
    - `feat/00048-c-companion-chat`
    - `feat/00049-c-chat-history`
    - `feat/00050-c-analytics-optional`
