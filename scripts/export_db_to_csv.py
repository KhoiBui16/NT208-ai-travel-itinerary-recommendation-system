import csv
import json
import sys
from datetime import date, datetime
import psycopg2
from psycopg2.extras import RealDictCursor

# Cấu hình DB local
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "dulichviet",
    "user": "postgres",
    "password": "postgres",
}

OUTPUT_CSV = "dulichviet_full_database_one_file.csv"

# Thứ tự bảng cần export (quan trọng để xây dựng tập ID cha trước con)
TABLES = [
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

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def main():
    print("🔌 Kết nối database local...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("   ✅ Kết nối thành công!")
    except Exception as e:
        print(f"   ❌ Không thể kết nối DB local: {e}")
        sys.exit(1)

    # Các tập lưu trữ ID của bảng cha để lọc bản ghi con mồ côi
    exported_ids = {
        "users": set(),
        "destinations": set(),
        "places": set(),
        "hotels": set(),
        "trips": set(),
        "trip_days": set(),
        "chat_sessions": set(),
    }

    try:
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["table_name", "record_id", "record_json"])

            total_records = 0
            for table in TABLES:
                print(f"📦 Đang export bảng '{table}'...")
                
                # Kiểm tra bảng có tồn tại không
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)",
                        (table,),
                    )
                    if not cur.fetchone()[0]:
                        print(f"   ⚠️ Bảng '{table}' không tồn tại, bỏ qua.")
                        continue

                # Lấy tất cả records
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(f'SELECT * FROM "{table}"')
                    rows = cur.fetchall()

                count = 0
                skipped_count = 0
                for row in rows:
                    # Lọc sạch dữ liệu rác/mồ côi để tránh vi phạm khóa ngoại (FK violations)
                    is_valid = True
                    
                    if table == "places":
                        dest_id = row.get("destination_id")
                        if dest_id not in exported_ids["destinations"]:
                            is_valid = False
                    
                    elif table == "hotels":
                        dest_id = row.get("destination_id")
                        if dest_id not in exported_ids["destinations"]:
                            is_valid = False
                    
                    elif table == "trips":
                        u_id = row.get("user_id")
                        if u_id is not None and u_id not in exported_ids["users"]:
                            is_valid = False
                            
                    elif table == "trip_days":
                        t_id = row.get("trip_id")
                        if t_id not in exported_ids["trips"]:
                            is_valid = False
                            
                    elif table == "activities":
                        trip_day_id = row.get("trip_day_id")
                        place_id = row.get("place_id")
                        if trip_day_id not in exported_ids["trip_days"]:
                            is_valid = False
                        if place_id is not None and place_id not in exported_ids["places"]:
                            is_valid = False
                            
                    elif table == "accommodations":
                        t_id = row.get("trip_id")
                        hotel_id = row.get("hotel_id")
                        if t_id not in exported_ids["trips"]:
                            is_valid = False
                        if hotel_id is not None and hotel_id not in exported_ids["hotels"]:
                            is_valid = False

                    elif table == "saved_places":
                        u_id = row.get("user_id")
                        place_id = row.get("place_id")
                        if u_id not in exported_ids["users"] or place_id not in exported_ids["places"]:
                            is_valid = False

                    elif table == "refresh_tokens":
                        u_id = row.get("user_id")
                        if u_id not in exported_ids["users"]:
                            is_valid = False

                    elif table == "guest_claim_tokens":
                        t_id = row.get("trip_id")
                        if t_id not in exported_ids["trips"]:
                            is_valid = False

                    elif table == "chat_sessions":
                        u_id = row.get("user_id")
                        if u_id is not None and u_id not in exported_ids["users"]:
                            is_valid = False

                    elif table == "chat_messages":
                        s_id = row.get("session_id")
                        if s_id not in exported_ids["chat_sessions"]:
                            is_valid = False

                    elif table == "share_links":
                        t_id = row.get("trip_id")
                        if t_id not in exported_ids["trips"]:
                            is_valid = False

                    elif table == "trip_ratings":
                        t_id = row.get("trip_id")
                        if t_id not in exported_ids["trips"]:
                            is_valid = False

                    # Nếu hợp lệ, tiến hành ghi
                    if is_valid:
                        # Lưu ID lại để so khớp ở các bảng con tiếp theo
                        row_id = row.get("id")
                        if row_id is not None and table in exported_ids:
                            exported_ids[table].add(row_id)
                            
                        record_id = str(row_id or row.get("version_num") or hash(frozenset(row.items())))
                        record_json = json.dumps(row, cls=DateTimeEncoder, ensure_ascii=False)
                        writer.writerow([table, record_id, record_json])
                        count += 1
                        total_records += 1
                    else:
                        skipped_count += 1

                print(f"   ✅ Đã export {count} records. (Bỏ qua {skipped_count} records mồ côi)")

        print(f"\n🎉 Xuất file CSV đã làm sạch thành công! Tổng cộng {total_records} records hợp lệ vào '{OUTPUT_CSV}'.")

    except Exception as e:
        print(f"❌ Lỗi trong quá trình export: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
