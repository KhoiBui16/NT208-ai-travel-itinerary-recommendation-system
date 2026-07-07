#!/usr/bin/env python3
"""
Import full database CSV (dulichviet_full_database_one_file.csv) vào PostgreSQL.

Format CSV:
    table_name, record_id, record_json

Script này sẽ:
1. Đọc file CSV và nhóm theo bảng
2. Tắt tạm foreign-key constraints
3. Truncate các bảng cần import (theo thứ tự phụ thuộc ngược)
4. Insert lại dữ liệu từ CSV (theo thứ tự phụ thuộc xuôi)
5. Reset auto-increment sequences
6. Bật lại constraints

Usage:
    python scripts/import_csv_to_db.py [--csv PATH] [--tables TABLE1,TABLE2,...] [--dry-run]

Options:
    --csv PATH           Đường dẫn tới file CSV (mặc định: D:/dulichviet_full_database_one_file.csv)
    --tables TABLE1,...  Chỉ import các bảng chỉ định (mặc định: import tất cả)
    --dry-run            Chỉ phân tích CSV, không ghi vào DB
"""

import argparse
import csv
import json
import sys
import time
from collections import defaultdict

import psycopg2
from psycopg2.extras import execute_values

# ─── Cấu hình ──────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "dulichviet",
    "user": "postgres",
    "password": "postgres",
}

DEFAULT_CSV = r"D:\dulichviet_full_database_one_file.csv"

# Thứ tự import (parent → child) để tránh FK violation
TABLE_ORDER = [
    "alembic_version",
    "users",
    "destinations",
    "places",
    "hotels",
    "scraped_sources",
    "trips",
    "trip_days",
    "activities",
    "accommodations",
    "extra_expenses",
    "saved_places",
    "refresh_tokens",
    "guest_claim_tokens",
    "chat_sessions",
    "chat_messages",
    "share_links",
    "trip_ratings",
]


def read_csv(csv_path: str) -> dict[str, list[dict]]:
    """Đọc CSV và nhóm records theo table_name."""
    tables = defaultdict(list)
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            table = row["table_name"]
            record_json_str = row["record_json"]
            try:
                record = json.loads(record_json_str)
                tables[table].append(record)
            except json.JSONDecodeError as e:
                print(f"  ⚠️  Lỗi parse JSON ở bảng '{table}', record_id={row['record_id']}: {e}")
    return dict(tables)


def get_table_columns(conn, table_name: str) -> list[str]:
    """Lấy danh sách cột của bảng từ information_schema."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table_name,),
        )
        return [row[0] for row in cur.fetchall()]


def get_primary_key(conn, table_name: str) -> list[str]:
    """Lấy primary key columns của bảng."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = %s
            ORDER BY kcu.ordinal_position
            """,
            (table_name,),
        )
        return [row[0] for row in cur.fetchall()]


def coerce_value(val, col_name: str):
    """Chuyển đổi giá trị JSON sang dạng phù hợp với PostgreSQL."""
    if val is None:
        return None
    # JSON/JSONB columns — giữ nguyên dạng JSON string
    if isinstance(val, (list, dict)):
        return json.dumps(val, ensure_ascii=False)
    return val


def import_table(conn, table_name: str, records: list[dict], db_columns: list[str], pk_columns: list[str]):
    """Import records vào một bảng, dùng execute_values để batch insert cực nhanh."""
    if not records:
        return 0

    # Chỉ lấy các cột có trong DB schema (bỏ qua cột thừa trong CSV)
    csv_keys = set(records[0].keys())
    columns = [c for c in db_columns if c in csv_keys]

    if not columns:
        print(f"  ⚠️  Không có cột nào khớp giữa CSV và DB cho bảng '{table_name}'")
        return 0

    # Tạo danh sách tuple values
    values_list = []
    for rec in records:
        row = tuple(coerce_value(rec.get(c), c) for c in columns)
        values_list.append(row)

    col_str = ", ".join(f'"{c}"' for c in columns)

    if pk_columns:
        # ON CONFLICT DO UPDATE
        pk_str = ", ".join(f'"{c}"' for c in pk_columns)
        update_cols = [c for c in columns if c not in pk_columns]
        if update_cols:
            update_str = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in update_cols)
            sql = f"""
                INSERT INTO "{table_name}" ({col_str})
                VALUES %s
                ON CONFLICT ({pk_str}) DO UPDATE SET {update_str}
            """
        else:
            sql = f"""
                INSERT INTO "{table_name}" ({col_str})
                VALUES %s
                ON CONFLICT ({pk_str}) DO NOTHING
            """
    else:
        sql = f"""INSERT INTO "{table_name}" ({col_str}) VALUES %s"""

    from psycopg2.extras import execute_values
    with conn.cursor() as cur:
        execute_values(cur, sql, values_list)

    return len(values_list)


def reset_sequence(conn, table_name: str, pk_columns: list[str]):
    """Reset auto-increment sequence cho bảng sau khi import."""
    if not pk_columns or len(pk_columns) != 1:
        return
    pk = pk_columns[0]
    seq_name = f"{table_name}_{pk}_seq"
    with conn.cursor() as cur:
        # Kiểm tra sequence tồn tại
        cur.execute(
            "SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = %s",
            (seq_name,),
        )
        if cur.fetchone():
            cur.execute(
                f"""SELECT setval('{seq_name}', COALESCE((SELECT MAX("{pk}") FROM "{table_name}"), 1))"""
            )
            print(f"    ↻ Reset sequence '{seq_name}'")


def main():
    parser = argparse.ArgumentParser(description="Import CSV vào PostgreSQL database")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="Đường dẫn file CSV")
    parser.add_argument("--tables", default=None, help="Chỉ import các bảng (phân cách bởi dấu phẩy)")
    parser.add_argument("--url", default=None, help="Chuỗi kết nối database PostgreSQL (ví dụ: postgresql://user:pass@host/dbname)")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ phân tích, không import")
    parser.add_argument("--mode", choices=["truncate", "upsert"], default="truncate",
                        help="truncate = xóa sạch rồi insert lại; upsert = insert/update từng record")
    args = parser.parse_args()

    target_tables = None
    if args.tables:
        target_tables = [t.strip() for t in args.tables.split(",")]

    # ── Bước 1: Đọc CSV ────────────────────────────────────────────────────
    print(f"\n📂 Đọc file CSV: {args.csv}")
    start = time.time()
    tables_data = read_csv(args.csv)
    elapsed = time.time() - start
    print(f"   ✅ Đọc xong trong {elapsed:.1f}s")
    print(f"   📊 Tìm thấy {len(tables_data)} bảng, tổng {sum(len(v) for v in tables_data.values())} records\n")

    # Hiển thị thống kê
    print("   ┌─────────────────────────┬───────────┐")
    print("   │ Bảng                    │ Số records│")
    print("   ├─────────────────────────┼───────────┤")
    for table in sorted(tables_data.keys()):
        count = len(tables_data[table])
        marker = " ★" if table in ("places", "destinations") else ""
        print(f"   │ {table:<23} │ {count:>9} │{marker}")
    print("   └─────────────────────────┴───────────┘")
    print("   ★ = bảng bạn đã chỉnh sửa nhiều\n")

    if args.dry_run:
        print("🔍 [DRY-RUN] Chỉ phân tích, không import.")
        return

    # ── Bước 2: Kết nối DB ──────────────────────────────────────────────────
    db_url = args.url
    if db_url:
        print("🔌 Kết nối PostgreSQL qua URL cung cấp...")
    else:
        print(f"🔌 Kết nối PostgreSQL ({DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']})...")
    try:
        if db_url:
            conn = psycopg2.connect(db_url)
        else:
            conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        print("   ✅ Kết nối thành công!\n")
    except psycopg2.Error as e:
        print(f"   ❌ Không thể kết nối: {e}")
        print("   💡 Đảm bảo Docker đang chạy hoặc kiểm tra lại URL kết nối.")
        sys.exit(1)

    # ── Bước 3: Import ──────────────────────────────────────────────────────
    try:
        # Sắp xếp bảng theo thứ tự dependency
        ordered_tables = []
        for t in TABLE_ORDER:
            if t in tables_data and (target_tables is None or t in target_tables):
                ordered_tables.append(t)
        # Thêm bảng không có trong TABLE_ORDER (nếu có)
        for t in tables_data:
            if t not in ordered_tables and (target_tables is None or t in target_tables):
                ordered_tables.append(t)

        triggers_disabled = False
        if args.mode == "truncate":
            # Tắt FK constraints tạm
            print("🔓 Tạm tắt trigger (FK constraints)...")
            try:
                with conn.cursor() as cur:
                    for table in reversed(ordered_tables):
                        cur.execute(f'ALTER TABLE "{table}" DISABLE TRIGGER ALL')
                print("   ✅ Done\n")
                triggers_disabled = True
            except psycopg2.errors.InsufficientPrivilege:
                conn.rollback()  # Rollback current transaction to clear error state
                print("   ⚠️  Không có quyền superuser để tắt trigger (bình thường đối với Cloud DB như Render).")
                print("   👉 Sẽ tiến hành truncate và import trực tiếp theo đúng thứ tự phụ thuộc bảng.\n")

            # Truncate
            print("🗑️  Truncate các bảng...")
            with conn.cursor() as cur:
                for table in reversed(ordered_tables):
                    cur.execute(f'TRUNCATE TABLE "{table}" CASCADE')
                    print(f"   🗑️  {table}")
            print()

        # Insert
        print("📥 Import dữ liệu...")
        total_imported = 0
        for table in ordered_tables:
            records = tables_data[table]
            db_columns = get_table_columns(conn, table)
            pk_columns = get_primary_key(conn, table)

            if args.mode == "truncate":
                # Simple insert (no conflict) vì đã truncate
                count = import_table(conn, table, records, db_columns, [])
            else:
                count = import_table(conn, table, records, db_columns, pk_columns)

            total_imported += count
            print(f"   ✅ {table}: {count} records")

            # Reset sequence
            reset_sequence(conn, table, pk_columns)

        if args.mode == "truncate" and triggers_disabled:
            # Bật lại FK constraints
            print("\n🔒 Bật lại trigger (FK constraints)...")
            with conn.cursor() as cur:
                for table in ordered_tables:
                    cur.execute(f'ALTER TABLE "{table}" ENABLE TRIGGER ALL')
            print("   ✅ Done")

        # Commit
        conn.commit()
        print(f"\n🎉 Import thành công! Tổng: {total_imported} records vào {len(ordered_tables)} bảng.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Lỗi khi import: {e}")
        print("   ↩️ Đã rollback toàn bộ thay đổi.")
        raise
    finally:
        conn.close()
        print("🔌 Đã đóng kết nối database.\n")


if __name__ == "__main__":
    main()
