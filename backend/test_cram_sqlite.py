import sqlite3
import json

def test():
    conn = sqlite3.connect('vocabulary.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, srs_data FROM user_word_progress WHERE learning_state = 'graduated'")
    rows = cursor.fetchall()
    
    none_count = 0
    for row in rows:
        pid, srs_data = row
        if srs_data is not None:
            if isinstance(srs_data, str):
                try:
                    data = json.loads(srs_data)
                    ef = data.get("easiness_factor", 2.5)
                    if ef is None:
                        none_count += 1
                        print(f"Row {pid}: easiness_factor is None")
                except Exception as e:
                    pass
    print(f"Found {none_count} rows with easiness_factor = None")

if __name__ == "__main__":
    test()
