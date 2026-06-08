import sqlite3
import json
import re

def fix_sentences():
    conn = sqlite3.connect('vocabulary.db')
    c = conn.cursor()
    c.execute("SELECT id, english, ai_association FROM words WHERE language='en' AND ai_association IS NOT NULL")
    rows = c.fetchall()
    
    bad_ids = []
    
    for r in rows:
        word_id, english, raw = r
        try:
            d = json.loads(raw)
            s = d.get('sentence', '').lower()
            w = d.get('word_form', '').lower()
            
            s_clean = re.sub(r'[^\w\s]', '', s)
            if w not in s_clean.split() and w not in s:
                print(f"Bad match - Word: {english} | Form: {w} | Sentence: {s}")
                bad_ids.append(word_id)
        except Exception:
            pass

    print(f"Found {len(bad_ids)} imperfect sentences.")
    if bad_ids:
        c.execute(f"UPDATE words SET ai_association = NULL WHERE id IN ({','.join(map(str, bad_ids))})")
        conn.commit()
        print("Set them to NULL. Ready to regenerate.")

if __name__ == '__main__':
    fix_sentences()
