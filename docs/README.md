# Tài liệu dự án DuLichViet MVP2

Thư mục `docs/` là nơi lưu tài liệu chính thức sau khi dọn các tài liệu MVP1/plan cũ. Nếu cần hiểu repo hiện tại, đọc theo thứ tự dưới đây thay vì đọc các folder legacy đã bị loại khỏi workflow.

## Thứ tự đọc khuyến nghị

1. [01_overview.md](01_overview.md) — trạng thái MVP2, phần đã xong, phần còn thiếu.
2. [02_architecture.md](02_architecture.md) — kiến trúc tổng thể FE/BE/DB/Redis/ETL/AI.
3. [03_backend.md](03_backend.md) — Backend FastAPI MVP2, module, endpoint, config.
4. [04_frontend.md](04_frontend.md) — Frontend revamp, mock/localStorage hiện tại, điểm cần nối BE.
5. [05_database_etl.md](05_database_etl.md) — schema, Alembic, Redis, ETL cities/hotels/places.
6. [06_ai_roadmap.md](06_ai_roadmap.md) — kế hoạch AI services, multi-agent vừa đủ, phần chưa implement.
7. [07_workflow_ci.md](07_workflow_ci.md) — branch, commit, PR, CI/CD, GitHub rules.
8. [08_testing_local_run.md](08_testing_local_run.md) — cách chạy local, Docker, test, smoke check.
9. [09_execution_tracker.md](09_execution_tracker.md) — tracker task đã merge và việc còn lại.

## Source of truth hiện tại

- Code runtime: `Backend/src/`, `Frontend/`, `docker-compose.yml`.
- Tài liệu vận hành: `README.md`, `Backend/README.md`, `docs/`.
- Agent memory: `CLAUDE.md`, `AGENTS.md`, `.claude/context/`.
- Không dùng lại `plan/`, `md/`, `Diagram/`, `References/`, `guidelines/`, `Backend/BE_docs.md` sau cleanup.

