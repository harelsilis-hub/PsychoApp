"""
Copies the `words` table from the production PostgreSQL DB into the local SQLite DB.

Usage:
    python sync_prod_words.py <PROD_DATABASE_URL>

Example:
    python sync_prod_words.py "postgresql://user:pass@host.render.com/dbname"
"""

import sys
import sqlite3

def main():
    if len(sys.argv) < 2:
        print("Usage: python sync_prod_words.py <PROD_DATABASE_URL>")
        sys.exit(1)

    prod_url = sys.argv[1]

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2

    print("Connecting to production PostgreSQL...")
    prod_conn = psycopg2.connect(prod_url)
    prod_cur = prod_conn.cursor()

    prod_cur.execute("""
        SELECT id, english, hebrew, unit, language, audio_url,
               ai_association, user_association,
               global_difficulty_level, is_flagged
        FROM words
        ORDER BY id
    """)
    rows = prod_cur.fetchall()
    prod_cur.close()
    prod_conn.close()
    print(f"  Fetched {len(rows)} words from production.")

    print("Writing to local SQLite (vocabulary.db)...")
    sqlite_conn = sqlite3.connect("vocabulary.db")
    sqlite_cur = sqlite_conn.cursor()

    sqlite_cur.execute("DELETE FROM words")

    sqlite_cur.executemany("""
        INSERT INTO words
            (id, english, hebrew, unit, language, audio_url,
             ai_association, user_association,
             global_difficulty_level, is_flagged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)

    sqlite_conn.commit()
    sqlite_conn.close()
    print(f"  Done — {len(rows)} words written to local DB.")

if __name__ == "__main__":
    main()
