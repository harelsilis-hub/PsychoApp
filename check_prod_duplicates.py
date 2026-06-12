import sys
import json

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

def main():
    prod_url = "postgresql://psychoapp_db1_0_user:ZGkGArcmqDTDt4IAFQiPoHbJcvV2TnmH@dpg-d6i9aui4d50c73fr1ud0-a.oregon-postgres.render.com/psychoapp_db1_0"
    from urllib.parse import urlparse
    p = urlparse(prod_url)

    print("Connecting to prod DB to fetch custom words...")
    try:
        conn = psycopg2.connect(
            host=p.hostname,
            port=p.port or 5432,
            dbname=p.path.lstrip("/"),
            user=p.username,
            password=p.password,
            sslmode="require",
        )
        cur = conn.cursor()
        cur.execute("SELECT english FROM words WHERE unit = 11 AND language = 'en'")
        prod_words = set([row[0].strip().lower() for row in cur.fetchall()])
        conn.close()
        print(f"Fetched {len(prod_words)} custom words from production.")
    except Exception as e:
        print(f"Failed to connect to production DB: {e}")
        return

    print("Reading local database_english.json...")
    with open('database_english.json', 'r', encoding='utf-8') as f:
        local_db = json.load(f)

    prod_duplicates = []
    local_seen = set()
    internal_duplicates = []

    for unit_name, words in local_db.items():
        for word_dict in words:
            en = word_dict['english'].strip().lower()
            
            if en in prod_words:
                prod_duplicates.append((en, unit_name))
                
            if en in local_seen:
                internal_duplicates.append((en, unit_name))
            else:
                local_seen.add(en)

    print(f"\n================ DUPLICATE REPORT ================")
    print(f"Duplicates between New Units (1-15) & Prod Expansion Pack: {len(prod_duplicates)}")
    for dup, unit in prod_duplicates:
        print(f"  - '{dup}' (found in {unit})")

    print(f"\nInternal duplicates inside Units (1-15): {len(internal_duplicates)}")
    for dup, unit in internal_duplicates:
        print(f"  - '{dup}' (found in {unit})")

    if prod_duplicates or internal_duplicates:
        print("\nDuplicates found! You should remove them from database_english.json.")
    else:
        print("\nAll clean! Zero duplicates found. Safe to deploy.")

if __name__ == "__main__":
    main()
