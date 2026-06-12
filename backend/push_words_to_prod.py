"""
Push local SQLite words table → production PostgreSQL.
Preserves user_word_progress by re-mapping word IDs via (english, language).

Usage:
    python push_words_to_prod.py <PROD_DATABASE_URL>

Example:
    python push_words_to_prod.py "postgresql://user:pass@host/dbname"
"""

import sys
import os
import sqlite3

WORD_COLUMNS = [
    "id", "english", "hebrew", "unit", "language",
    "audio_url", "ai_association", "user_association",
    "global_difficulty_level", "is_flagged",
]


def main():
    prod_url = os.environ.get("DATABASE_URL") or "postgresql://psychoapp_db1_0_user:ZGkGArcmqDTDt4IAFQiPoHbJcvV2TnmH@dpg-d6i9aui4d50c73fr1ud0-a.oregon-postgres.render.com/psychoapp_db1_0"

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2

    # Connect to prod
    print("Connecting to production PostgreSQL...")
    from urllib.parse import urlparse
    p = urlparse(prod_url)
    
    # Internal Render connections don't strictly require SSL, but external ones do
    ssl_mode = "require" if "render.com" in prod_url and "internal" not in prod_url else "prefer"
    
    try:
        prod_conn = psycopg2.connect(
            host=p.hostname,
            port=p.port or 5432,
            dbname=p.path.lstrip("/"),
            user=p.username,
            password=p.password,
            sslmode=ssl_mode,
        )
        prod_cur = prod_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        sys.exit(1)

    # Check if migration already ran (Unit 16 exists)
    prod_cur.execute("SELECT 1 FROM words WHERE unit = 16 LIMIT 1")
    if prod_cur.fetchone():
        print("Migration already applied (Unit 16 detected). Skipping push safely.")
        prod_cur.close()
        prod_conn.close()
        sys.exit(0)

    # Read local SQLite words
    print("Reading local vocabulary.db...")
    if not os.path.exists("vocabulary.db"):
        print("vocabulary.db not found. Run seed_psychometric_data first.")
        sys.exit(1)
        
    local_conn = sqlite3.connect("vocabulary.db")
    local_cur = local_conn.cursor()
    local_cur.execute(f"SELECT {', '.join(WORD_COLUMNS)} FROM words ORDER BY id")
    local_words = local_cur.fetchall()
    local_cur.close()
    local_conn.close()
    print(f"  {len(local_words)} words read from local DB.")

    # Duplicate Safety Check
    print("Running Duplicate Safety Check against custom Unit 11...")
    prod_cur.execute("SELECT english FROM words WHERE unit = 11 AND language = 'en'")
    prod_custom_words = {row[0].strip().lower() for row in prod_cur.fetchall()}
    
    local_english_words = {row[1].strip().lower() for row in local_words if row[4] == 'en'}
    
    duplicates = prod_custom_words.intersection(local_english_words)
    if duplicates:
        print("\n" + "="*50)
        print("CRITICAL ERROR: DUPLICATES DETECTED!")
        print("="*50)
        print("The following custom words (Unit 11) overlap with the new dictionary:")
        for d in sorted(list(duplicates)):
            print(f" - {d}")
        print("="*50)
        print("MIGRATION ABORTED. Production database was NOT modified.")
        print("Please delete these words from database_english.json and try again.")
        sys.exit(1)
        
    print("Zero duplicates found! Proceeding safely.")

    # Step 1: Back up prod progress, joined with word text for remapping later
    print("Backing up user progress from production...")
    prod_cur.execute("""
        SELECT uwp.user_id, w.english, w.language,
               uwp.status, uwp.next_review, uwp.srs_data
        FROM user_word_progress uwp
        JOIN words w ON w.id = uwp.word_id
    """)
    progress_backup = prod_cur.fetchall()
    print(f"  {len(progress_backup)} progress rows backed up.")

    # Step 1.5: Back up Unit 11 (user-submitted custom words)
    print("Backing up Unit 11 words from production...")
    # Get columns except ID (let it auto-generate on reinsert)
    prod_cur.execute("""
        SELECT english, hebrew, unit, language, audio_url, ai_association, user_association, global_difficulty_level, is_flagged 
        FROM words WHERE unit = 11
    """)
    unit_11_backup = prod_cur.fetchall()
    print(f"  {len(unit_11_backup)} Unit 11 words backed up.")

    # === NEW: COMPREHENSIVE DUPLICATE CHECK ===
    print("Checking for duplicates against production Expansion Pack...")
    prod_custom_words = {row[0].strip().lower() for row in unit_11_backup if row[3] == 'en'}
    
    # local_words format: id, english, hebrew, unit, ...
    duplicates = []
    for row in local_words:
        if row[4] == 'en': # language check
            en_word = row[1].strip().lower()
            if en_word in prod_custom_words:
                duplicates.append((en_word, row[3]))

    if duplicates:
        print("\n" + "!" * 60)
        print("CRITICAL ERROR: DUPLICATES DETECTED!")
        print("The following local words already exist in your 699 production Expansion Pack words:")
        for word, unit in duplicates:
            print(f"  - '{word}' (in Local Unit {unit})")
        print("!" * 60)
        print("ABORTING PUSH to protect data. Please remove these duplicates from database_english.json and re-seed locally before pushing again.")
        prod_cur.close()
        prod_conn.close()
        sys.exit(1)
    print("  Zero duplicates found! Proceeding safely.")
    # === END DUPLICATE CHECK ===

    # Step 2: Clear words (FK will block unless we clear progress first)
    print("Clearing production words and progress...")
    prod_cur.execute("DELETE FROM user_word_progress")
    prod_cur.execute("DELETE FROM words")

    # Step 3: Insert new local words
    print("Inserting words into production...")
    from psycopg2.extras import execute_values
    col_names = ", ".join(WORD_COLUMNS)
    # SQLite stores booleans as 0/1 — convert is_flagged (last column) to bool
    local_words = [row[:-1] + (bool(row[-1]),) for row in local_words]
    execute_values(
        prod_cur,
        f"INSERT INTO words ({col_names}) VALUES %s",
        local_words,
        page_size=500,
    )

    # Restore Unit 11 as Unit 16
    if unit_11_backup:
        print("Restoring Unit 11 custom words as Unit 16...")
        unit_16_restore = [row[:2] + (16,) + row[3:] for row in unit_11_backup]
        execute_values(
            prod_cur,
            "INSERT INTO words (english, hebrew, unit, language, audio_url, ai_association, user_association, global_difficulty_level, is_flagged) VALUES %s",
            unit_16_restore,
            page_size=500,
        )

    # Step 4: Build lookup (english, language) → new word_id
    prod_cur.execute("SELECT id, english, language FROM words")
    word_lookup = {(english, language): word_id for word_id, english, language in prod_cur.fetchall()}

    # Step 5: Re-insert progress with remapped word IDs
    print("Restoring user progress with remapped word IDs...")
    from psycopg2.extras import execute_values, Json
    progress_rows = []
    skipped = 0
    for user_id, english, language, status, next_review, srs_data in progress_backup:
        new_word_id = word_lookup.get((english, language))
        if new_word_id is None:
            skipped += 1
            continue
        progress_rows.append((user_id, new_word_id, status, next_review, Json(srs_data) if srs_data is not None else None))

    if progress_rows:
        execute_values(
            prod_cur,
            "INSERT INTO user_word_progress (user_id, word_id, status, next_review, srs_data) VALUES %s",
            progress_rows,
            page_size=500,
        )
    restored = len(progress_rows)

    prod_conn.commit()
    prod_cur.close()
    prod_conn.close()

    print(f"\nDone!")
    print(f"  {len(local_words)} words pushed to production.")
    print(f"  {restored} progress rows restored.")
    if skipped:
        print(f"  {skipped} progress rows skipped (words no longer exist).")


if __name__ == "__main__":
    main()
