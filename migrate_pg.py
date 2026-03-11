"""
Render → Supabase migration.
Handles: custom ENUM types, JSONB columns, sequences, indexes, foreign keys.
"""

import psycopg2
import psycopg2.extras
import psycopg2.extensions
import json
import sys

SRC = "postgresql://postgres.uvxfxyekmgrnhgxrhpej:vrNHPkLofFut68dG@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
DST = "postgresql://postgres.yhqnwexctzmhvfqttruk:8JJumrwXMZNPSu9Y@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require"

def connect(url, label):
    print(f"Connecting to {label}...", end=" ", flush=True)
    conn = psycopg2.connect(url)
    conn.autocommit = True   # use autocommit; we'll manage transactions explicitly
    print("OK")
    return conn

# ── helpers ──────────────────────────────────────────────────────────────────

def get_enum_types(cur):
    """Return all user-defined ENUM types and their values."""
    cur.execute("""
        SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        GROUP BY t.typname;
    """)
    return cur.fetchall()  # [(type_name, [val1, val2, ...]), ...]

def get_table_order(cur):
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    """)
    return [r[0] for r in cur.fetchall()]

def get_create_statement(cur, table):
    cur.execute("""
        SELECT column_name, data_type, character_maximum_length,
               is_nullable, column_default, numeric_precision, numeric_scale,
               udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position;
    """, (table,))
    cols = cur.fetchall()
    col_defs = []
    for col in cols:
        name, dtype, maxlen, nullable, default, num_prec, num_scale, udt = col
        if dtype == 'USER-DEFINED':
            dtype = udt          # e.g. wordstatus
        elif dtype == 'character varying':
            dtype = f'VARCHAR({maxlen})' if maxlen else 'VARCHAR'
        elif dtype == 'character':
            dtype = f'CHAR({maxlen})' if maxlen else 'CHAR'
        elif dtype == 'numeric' and num_prec:
            dtype = f'NUMERIC({num_prec},{num_scale or 0})'
        elif dtype == 'ARRAY':
            dtype = udt.lstrip('_') + '[]'

        col_def = f'  "{name}" {dtype}'
        if default is not None:
            col_def += f' DEFAULT {default}'
        if nullable == 'NO':
            col_def += ' NOT NULL'
        col_defs.append(col_def)

    # Primary key
    cur.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = %s
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position;
    """, (table,))
    pk_cols = [r[0] for r in cur.fetchall()]
    if pk_cols:
        col_defs.append(f'  PRIMARY KEY ({", ".join(chr(34)+c+chr(34) for c in pk_cols)})')

    return f'CREATE TABLE IF NOT EXISTS "{table}" (\n' + ',\n'.join(col_defs) + '\n);'

def get_sequences(cur):
    cur.execute("""
        SELECT sequencename, increment_by, min_value, max_value, cycle, last_value
        FROM pg_sequences
        WHERE schemaname = 'public';
    """)
    rows = cur.fetchall()
    result = []
    for seq_name, inc, min_val, max_val, cycle, last_val in rows:
        start = last_val if last_val is not None else min_val
        result.append((seq_name, start, inc, min_val, max_val, cycle))
    return result

def get_indexes(cur, table):
    cur.execute("""
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = %s
          AND indexname NOT IN (
              SELECT constraint_name FROM information_schema.table_constraints
              WHERE table_name = %s AND constraint_type = 'PRIMARY KEY'
          );
    """, (table, table))
    return [r[0] for r in cur.fetchall()]

def get_foreign_keys(cur):
    cur.execute("""
        SELECT
            tc.table_name, kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
    """)
    fks = []
    for tbl, col, ftbl, fcol, cname in cur.fetchall():
        fks.append(
            f'ALTER TABLE "{tbl}" ADD CONSTRAINT "{cname}" '
            f'FOREIGN KEY ("{col}") REFERENCES "{ftbl}" ("{fcol}");'
        )
    return fks

def serialize_row(row):
    """Convert any dict/list values (JSONB) to JSON strings for psycopg2."""
    out = []
    for v in row:
        if isinstance(v, (dict, list)):
            out.append(json.dumps(v, ensure_ascii=False))
        else:
            out.append(v)
    return tuple(out)

# ── main migration ────────────────────────────────────────────────────────────

def migrate():
    src = connect(SRC, "Render (source)")
    dst = connect(DST, "Supabase (target)")
    sc = src.cursor()
    dc = dst.cursor()

    tables = get_table_order(sc)
    print(f"\nFound {len(tables)} tables: {tables}\n")

    # 1. Drop existing tables (disable triggers first)
    print("Dropping existing tables in target (if any)...")
    dc.execute("SET session_replication_role = replica;")
    for t in reversed(tables):
        dc.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE;')
    print("Done.\n")

    # 2. Drop & re-create ENUM types
    print("Migrating ENUM types...")
    enums = get_enum_types(sc)
    for type_name, values in enums:
        dc.execute(f'DROP TYPE IF EXISTS "{type_name}" CASCADE;')
        vals = ', '.join(f"'{v}'" for v in values)
        dc.execute(f'CREATE TYPE "{type_name}" AS ENUM ({vals});')
        print(f"  ENUM {type_name}: {values}")
    print()

    # 3. Sequences
    print("Migrating sequences...")
    sequences = get_sequences(sc)
    for seq_name, start, inc, min_val, max_val, cycle in sequences:
        cycle_str = "CYCLE" if cycle else "NO CYCLE"
        dc.execute(f'DROP SEQUENCE IF EXISTS "{seq_name}" CASCADE;')
        dc.execute(
            f'CREATE SEQUENCE "{seq_name}" INCREMENT {inc} MINVALUE {min_val} '
            f'MAXVALUE {max_val} START {start} {cycle_str};'
        )
    print(f"  {len(sequences)} sequences created.\n")

    # 4. Create tables (each in its own autocommit statement)
    print("Creating tables...")
    created = []
    for table in tables:
        ddl = get_create_statement(sc, table)
        try:
            dc.execute(ddl)
            print(f"  {table} — OK")
            created.append(table)
        except Exception as e:
            print(f"  {table} — ERROR: {e}")
    print()

    # 5. Copy data
    print("Copying data...")
    total_rows = 0
    for table in created:
        sc.execute(f'SELECT * FROM "{table}";')
        rows = sc.fetchall()
        if not rows:
            print(f"  {table}: 0 rows (skipped)")
            continue
        cols = [desc[0] for desc in sc.description]
        placeholders = ','.join(['%s'] * len(cols))
        col_list = ','.join(f'"{c}"' for c in cols)
        insert_sql = (
            f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) '
            f'ON CONFLICT DO NOTHING;'
        )
        serialized = [serialize_row(r) for r in rows]
        try:
            psycopg2.extras.execute_batch(dc, insert_sql, serialized, page_size=500)
            print(f"  {table}: {len(rows)} rows copied")
            total_rows += len(rows)
        except Exception as e:
            print(f"  {table}: ERROR — {e}")
    print(f"\nTotal rows copied: {total_rows}\n")

    # 6. Indexes
    print("Creating indexes...")
    for table in created:
        for idx_def in get_indexes(sc, table):
            try:
                dc.execute(idx_def)
            except Exception as e:
                print(f"  Index warning ({table}): {e}")
    print("Indexes done.\n")

    # 7. Foreign keys + re-enable FK checks
    dc.execute("SET session_replication_role = DEFAULT;")
    fks = get_foreign_keys(sc)
    print(f"Adding {len(fks)} foreign keys...")
    for fk in fks:
        try:
            dc.execute(fk)
        except Exception as e:
            print(f"  FK warning: {e}")
    print("Foreign keys done.\n")

    # 8. Advance sequences past migrated data (prevent PK conflicts on new inserts)
    print("Advancing sequences...")
    seqs = get_sequences(sc)
    for seq_name, _start, _inc, _min, _max, _cycle in seqs:
        # Derive table name from sequence name convention: <table>_id_seq
        table_guess = seq_name.replace("_id_seq", "")
        if table_guess in created:
            dc.execute(f'SELECT COALESCE(MAX("id"), 1) FROM "{table_guess}";')
            max_val = dc.fetchone()[0]
            dc.execute(f"SELECT setval('{seq_name}', {max_val});")
            print(f"  {seq_name} -> {max_val}")
    print("Sequences advanced.\n")

    # 9. Verify
    print("=== Verification ===")
    all_match = True
    for table in tables:
        sc.execute(f'SELECT COUNT(*) FROM "{table}";')
        src_count = sc.fetchone()[0]
        try:
            dc.execute(f'SELECT COUNT(*) FROM "{table}";')
            dst_count = dc.fetchone()[0]
        except Exception:
            dst_count = "MISSING"
        match = "✓" if src_count == dst_count else "✗ MISMATCH"
        if src_count != dst_count:
            all_match = False
        print(f"  {table}: src={src_count}, dst={dst_count} {match}")

    src.close()
    dst.close()
    print()
    if all_match:
        print("Migration COMPLETE — all row counts match.")
    else:
        print("Migration finished with mismatches — review above.")

if __name__ == "__main__":
    migrate()
