import os
import json
import sqlite3
import psycopg2
import psycopg2.extras
from pathlib import Path
from urllib.parse import urlparse

# Load env
env_path = Path(".env")
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vocabulary.db")
parsed = urlparse(db_url)

if "postgres" in parsed.scheme:
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("asyncpg://", "postgresql://")
    conn = psycopg2.connect(sync_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
else:
    db_path = db_url.split("///", 1)[-1]
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

print(f"Checking DB: {db_url}")

cur.execute("SELECT english, hebrew, ai_association FROM words WHERE ai_association LIKE '%word_form%' LIMIT 3")
rows = cur.fetchall()

print("\n--- NEW SENTENCES GENERATED ---")
for r in rows:
    data = json.loads(r['ai_association'])
    print(f"Word: {r['english']} ({r['hebrew']})")
    print(f"Used Form: {data['word_form']}")
    print(f"Sentence: {data['sentence']}\n")

cur.execute("SELECT count(*) as c FROM words WHERE ai_association LIKE '%word_form%'")
count_new = cur.fetchone()['c']

cur.execute("SELECT count(*) as c FROM words WHERE ai_association IS NOT NULL AND ai_association NOT LIKE '%word_form%'")
count_old = cur.fetchone()['c']

cur.execute("SELECT count(*) as c FROM words WHERE ai_association IS NULL")
count_pending = cur.fetchone()['c']

print(f"Total NEW (JSON) sentences: {count_new}")
print(f"Total OLD (String) sentences remaining: {count_old}")
print(f"Total PENDING sentences: {count_pending}")
