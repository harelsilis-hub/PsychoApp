"""
copy_sentences_to_prod.py
=========================
Copies ai_association sentences that were generated locally in vocabulary.db
directly into the Supabase production database.

Matches words by their 'english' field (safe even if IDs differ between DBs).
Only updates rows where production ai_association IS NULL (safe to re-run).

Usage:
    python copy_sentences_to_prod.py --db "postgresql://postgres.xxx:PASSWORD@aws-xxx.pooler.supabase.com:5432/postgres"
"""
import os
import sys
import sqlite3
import argparse
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 is required. Run: pip install psycopg2-binary")
    sys.exit(1)

BATCH_SIZE = 200  # rows per UPDATE batch


def main():
    parser = argparse.ArgumentParser(description="Copy local sentences to Supabase production.")
    parser.add_argument("--db", required=True, help="Supabase PostgreSQL connection string")
    parser.add_argument("--overwrite", action="store_true",
                        help="Overwrite existing sentences in production (default: skip words that already have one)")
    args = parser.parse_args()

    # ── Read from local SQLite ─────────────────────────────────────────────────
    local_db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vocabulary.db")
    local_path = local_db_url.split("///", 1)[-1]
    local_path = str((Path(__file__).parent / local_path).resolve())
    print(f"[LOCAL] Reading from: {local_path}")

    conn_local = sqlite3.connect(local_path)
    conn_local.row_factory = sqlite3.Row
    rows = conn_local.execute(
        "SELECT english, ai_association FROM words WHERE ai_association IS NOT NULL AND language = 'en'"
    ).fetchall()
    conn_local.close()

    local_data = {r["english"]: r["ai_association"] for r in rows}
    print(f"[LOCAL] Found {len(local_data)} words with sentences.")

    if not local_data:
        print("Nothing to copy. Run generate_example_sentences.py first.")
        sys.exit(0)

    # ── Connect to Supabase ────────────────────────────────────────────────────
    sync_url = args.db.replace("postgresql+asyncpg://", "postgresql://").replace("asyncpg://", "postgresql://")
    print(f"[PROD] Connecting to Supabase...")
    conn_prod = psycopg2.connect(sync_url)
    conn_prod.autocommit = False

    try:
        with conn_prod.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Fetch production words that still need sentences
            if args.overwrite:
                cur.execute("SELECT id, english FROM words WHERE language = 'en'")
            else:
                cur.execute("SELECT id, english FROM words WHERE ai_association IS NULL AND language = 'en'")
            prod_words = cur.fetchall()

        print(f"[PROD] {len(prod_words)} words need sentences in production.")

        # Build update list — match by english text
        updates = []
        missing = []
        for w in prod_words:
            sentence = local_data.get(w["english"])
            if sentence:
                updates.append((sentence, w["id"]))
            else:
                missing.append(w["english"])

        print(f"[MATCH] {len(updates)} matched | {len(missing)} not found in local DB")
        if missing[:5]:
            print(f"  (Sample unmatched: {missing[:5]})")

        if not updates:
            print("Nothing to update.")
            return

        # Write in batches
        total = len(updates)
        written = 0
        with conn_prod.cursor() as cur:
            for i in range(0, total, BATCH_SIZE):
                batch = updates[i: i + BATCH_SIZE]
                psycopg2.extras.execute_batch(
                    cur,
                    "UPDATE words SET ai_association = %s WHERE id = %s",
                    batch,
                )
                written += len(batch)
                print(f"  Progress: {written}/{total} rows updated...")

        conn_prod.commit()
        print(f"\n✅ Done! {written} sentences successfully copied to Supabase.")
        if missing:
            print(f"⚠  {len(missing)} words did not match (may not exist locally).")

    except Exception as e:
        conn_prod.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        conn_prod.close()


if __name__ == "__main__":
    main()
