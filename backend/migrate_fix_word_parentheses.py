"""
Migration: fix stray parentheses in word data.

English field: strip trailing ' (' left over from CSV import.
  e.g. 'czar ('  ->  'czar'
       'die (dice) ('  ->  'die (dice)'

Hebrew field: the CSV used ')word(' (reversed) for parentheticals.
  Replace unmatched ')' with '(' and close the bracket at the end.
  e.g. 'צאר )שליט רוסי'  ->  'צאר (שליט רוסי)'

Safe to run multiple times — already-fixed rows are skipped.
"""
import re
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "vocabulary.db"


def backup(db_path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = db_path.with_name(f"vocabulary.backup_{ts}.db")
    shutil.copy2(db_path, dest)
    print(f"Backup created: {dest}")
    return dest


def fix_english(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute("SELECT id, english FROM words WHERE english LIKE '%('")
    rows = cur.fetchall()
    updates = []
    for id_, english in rows:
        cleaned = re.sub(r"\s*\(\s*$", "", english).rstrip()
        updates.append((cleaned, id_))

    if updates:
        cur.executemany("UPDATE words SET english = ? WHERE id = ?", updates)
        conn.commit()
    return len(updates)


def fix_hebrew(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    # Only EN-language words whose hebrew field has more ) than ( (unmatched closing)
    cur.execute(
        "SELECT id, hebrew FROM words WHERE language = 'en' AND hebrew LIKE '%)%'"
    )
    rows = cur.fetchall()

    updates = []
    for id_, hebrew in rows:
        open_count = hebrew.count("(")
        close_count = hebrew.count(")")
        # Only fix rows where ) outnumbers ( (the old reversed-RTL convention)
        if close_count <= open_count:
            continue

        if close_count == 1 and open_count == 0:
            # Simple case: one lone ) → replace with ( and close at end
            fixed = hebrew.replace(")", "(") + ")"
        elif close_count == 1 and open_count == 1:
            # Pattern ')word(,' — both brackets reversed
            # e.g. 'הגדרה )מילה(, תוסף' → 'הגדרה (מילה), תוסף'
            fixed = re.sub(r"\(([^(]+)\(,", r"(\1),", hebrew.replace(")", "(") + ")")
        else:
            # Complex case — skip
            continue
        updates.append((fixed, id_))

    if updates:
        cur.executemany("UPDATE words SET hebrew = ? WHERE id = ?", updates)
        conn.commit()
    return len(updates)


def main():
    if not DB_PATH.exists():
        print(f"ERROR: database not found at {DB_PATH}")
        sys.exit(1)

    print(f"Database: {DB_PATH}")
    backup(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    try:
        en_fixed = fix_english(conn)
        print(f"English field: {en_fixed} rows updated")

        he_fixed = fix_hebrew(conn)
        print(f"Hebrew field:  {he_fixed} rows updated")

        if en_fixed == 0 and he_fixed == 0:
            print("Nothing to do — database already clean.")
        else:
            print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
