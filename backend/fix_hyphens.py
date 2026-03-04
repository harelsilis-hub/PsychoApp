"""
One-time script: strips leading '- ' from all English words in the database.
Run once from the backend folder: python fix_hyphens.py
"""
import sqlite3
import re

DB_PATH = "./vocabulary.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT id, english FROM words WHERE english LIKE '%-'")
rows = cur.fetchall()

print(f"Found {len(rows)} words with trailing dash.")

for word_id, english in rows:
    cleaned = re.sub(r'\s*-$', '', english)
    cur.execute("UPDATE words SET english = ? WHERE id = ?", (cleaned, word_id))
    print(f"  #{word_id}: '{english}' → '{cleaned}'")

conn.commit()
conn.close()
print("Done.")
