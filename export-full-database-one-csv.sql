BEGIN;

CREATE TEMP TABLE export_all_records (
    table_name  text NOT NULL,
    record_id   text NOT NULL,
    record_json jsonb NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
        ORDER BY c.relname
    LOOP
        EXECUTE format(
            $sql$
            INSERT INTO export_all_records (
                table_name,
                record_id,
                record_json
            )
            SELECT
                %L,
                COALESCE(
                    to_jsonb(t)->>'id',
                    to_jsonb(t)->>'version_num',
                    md5(to_jsonb(t)::text)
                ),
                to_jsonb(t)
            FROM %I.%I AS t
            $sql$,
            r.table_name,
            r.schema_name,
            r.table_name
        );
    END LOOP;
END $$;

\copy (SELECT table_name, record_id, record_json::text FROM export_all_records ORDER BY table_name, record_id) TO '/tmp/dulichviet_full_database_one_file.csv' WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8')

COMMIT;
