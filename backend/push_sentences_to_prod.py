import sqlite3
import psycopg2
import psycopg2.extras
import os
import sys

def main():
    prod_url = os.environ.get("PROD_DB_URL")
    if not prod_url:
        print("ERROR: PROD_DB_URL environment variable is not set.")
        print("Please set it with your Render PostgreSQL connection string.")
        sys.exit(1)

    # 1. Read from local SQLite
    print("Connecting to local SQLite database...")
    local_conn = sqlite3.connect("vocabulary.db")
    local_cur = local_conn.cursor()

    local_cur.execute("SELECT english, language, ai_association FROM words WHERE ai_association IS NOT NULL")
    rows = local_cur.fetchall()
    print(f"Found {len(rows)} sentences in local database.")

    # 2. Push to remote Postgres
    print("Connecting to production PostgreSQL database...")
    try:
        prod_conn = psycopg2.connect(prod_url)
        prod_cur = prod_conn.cursor()
    except Exception as e:
        print(f"Failed to connect to production: {e}")
        sys.exit(1)

    print("Pushing sentences to production...")
    
    # We use psycopg2.extras.execute_batch for high performance
    update_query = """
        UPDATE words 
        SET ai_association = %s 
        WHERE english = %s AND language = %s
    """
    
    # Restructure data for batch execution: (ai_association, english, language)
    batch_data = [(row[2], row[0], row[1]) for row in rows]
    
    try:
        psycopg2.extras.execute_batch(prod_cur, update_query, batch_data, page_size=500)
        prod_conn.commit()
        print(f"SUCCESS: Successfully updated {len(batch_data)} words in production!")
    except Exception as e:
        prod_conn.rollback()
        print(f"ERROR: Error updating production: {e}")
    finally:
        prod_cur.close()
        prod_conn.close()
        local_cur.close()
        local_conn.close()

if __name__ == "__main__":
    main()
