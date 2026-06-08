import sqlite3
import json
import re

def check_sentences():
    conn = sqlite3.connect('vocabulary.db')
    c = conn.cursor()
    c.execute("SELECT id, english, ai_association FROM words WHERE language='en' AND ai_association IS NOT NULL")
    rows = c.fetchall()
    
    invalid_json = 0
    missing_fields = 0
    word_not_in_sentence = 0
    
    for r in rows:
        word_id, english, raw = r
        try:
            d = json.loads(raw)
            s = d.get('sentence', '').lower()
            w = d.get('word_form', '').lower()
            
            if not s or not w:
                missing_fields += 1
            else:
                s_clean = re.sub(r'[^\w\s]', '', s)
                if w not in s_clean.split() and w not in s:
                    word_not_in_sentence += 1
        except Exception:
            invalid_json += 1

    print(f"Checked {len(rows)} total sentences.")
    print(f"Invalid JSON format: {invalid_json}")
    print(f"Missing 'sentence' or 'word_form': {missing_fields}")
    print(f"Word form not found in sentence: {word_not_in_sentence}")

if __name__ == '__main__':
    check_sentences()
