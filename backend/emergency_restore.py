import os
import sys
import csv

def main():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("No DATABASE_URL found. Skipping emergency restore.")
        return

    try:
        import psycopg2
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2

    print("Connecting to production PostgreSQL for EMERGENCY RESTORE...")
    from urllib.parse import urlparse
    p = urlparse(database_url)
    ssl_mode = "require" if "render.com" in database_url and "internal" not in database_url else "prefer"
    
    conn = psycopg2.connect(
        host=p.hostname,
        port=p.port or 5432,
        dbname=p.path.lstrip("/"),
        user=p.username,
        password=p.password,
        sslmode=ssl_mode,
    )
    cur = conn.cursor()

    # 1. Restore the 699 custom words as Unit 16
    print("Restoring custom words to Unit 16...")
    csv_path = "../MilaWords_Expansion_Pack_2.csv"
    if os.path.exists(csv_path):
        cur.execute("SELECT COUNT(*) FROM words WHERE unit = 16")
        if cur.fetchone()[0] == 0:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    english = row["word"].strip()
                    hebrew = row["translation"].strip()
                    if english and hebrew:
                        cur.execute(
                            "INSERT INTO words (english, hebrew, unit, language) VALUES (%s, %s, 16, 'en') ON CONFLICT DO NOTHING",
                            (english, hebrew)
                        )
            print("Successfully restored custom words to Unit 16!")
        else:
            print("Unit 16 already exists. Skipping insertion.")
    else:
        print(f"CSV file not found at {csv_path}")

    # 2. Upgrade all users to Admin
    print("Upgrading all users to Admin...")
    cur.execute("UPDATE users SET is_admin = TRUE, is_superuser = TRUE")
    print(f"Successfully upgraded {cur.rowcount} users to admin.")

    conn.commit()
    cur.close()
    conn.close()
    print("Emergency restore completed!")

if __name__ == "__main__":
    main()
