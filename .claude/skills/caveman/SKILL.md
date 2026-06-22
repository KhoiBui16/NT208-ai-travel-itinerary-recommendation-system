---
name: caveman
description: Token-efficient delegation style for audit/review sub-agents. One narrow task, exact output schema, file-path-first evidence, no prose.
allowed-tools: Read, Grep, Glob, Bash
---

# Caveman — Token-Efficient Delegation

Dùng khi spawn sub-agent cho audit/review. Mục tiêu: nhiều tín hiệu nhất / token.

## Quy tắc
- MỘT scope hẹp mỗi sub-agent.
- Yêu cầu ĐÚNG output schema (không tự do dạng).
- CHỈ trả findings, không narration, không "I will now...", không nhắc lại task.
- Mỗi finding bắt đầu bằng `path:line`.
- Nếu scope quá lớn, trả đúng: `too-big`.

## Output schema mặc định
`path:line — finding — evidence — status`
trong đó status ∈ {ok, warn, bug, stale, missing, n/a}

## Khi nào dùng
- Fan-out code/audit cần kết luận, không cần file dump.
- Điều tra read-only song song.
