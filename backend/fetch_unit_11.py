import sys
import json
import time

def fetch_prod_unit_11_with_retry(max_retries=20):
    try:
        import psycopg2
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2

    prod_url = "postgresql://psychoapp_db1_0_user:ZGkGArcmqDTDt4IAFQiPoHbJcvV2TnmH@dpg-d6i9aui4d50c73fr1ud0-a.oregon-postgres.render.com/psychoapp_db1_0"
    from urllib.parse import urlparse
    p = urlparse(prod_url)

    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1}/{max_retries} to connect to Render DB (waking up instance)...")
            prod_conn = psycopg2.connect(
                host=p.hostname,
                port=p.port or 5432,
                dbname=p.path.lstrip("/"),
                user=p.username,
                password=p.password,
                sslmode="require",
                connect_timeout=15
            )
            prod_cur = prod_conn.cursor()
            prod_cur.execute("SELECT english, hebrew FROM words WHERE unit = 11 AND language = 'en'")
            words = prod_cur.fetchall()
            prod_cur.close()
            prod_conn.close()
            
            result = {row[0]: row[1] for row in words}
            print(f"Success! Fetched {len(result)} words from production Unit 11.")
            
            with open("unit_11_prod.json", "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            return True
            
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print("Waiting 5 seconds for Render to spin up...")
                time.sleep(5)
            else:
                print("All connection attempts failed.")
                return False

if __name__ == "__main__":
    if fetch_prod_unit_11_with_retry():
        print("Checking duplicates now...")
        with open("unit_11_prod.json", "r", encoding="utf-8") as f:
            prod_words = json.load(f)
            prod_word_keys = {k.strip().lower() for k in prod_words.keys()}
        
        with open("../database_english.json", "r", encoding="utf-8") as f:
            local_db = json.load(f)
            
        duplicates = []
        for unit, words in local_db.items():
            for w in words:
                en = w["english"].strip().lower()
                if en in prod_word_keys:
                    duplicates.append((en, unit))
                    
        print(f"\nFound {len(duplicates)} duplicates between local DB and Prod Unit 11.")
        for d, u in duplicates:
            print(f" - {d} (in {u})")
    else:
        sys.exit(1)
