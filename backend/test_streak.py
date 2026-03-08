"""
Streak tester — run from the backend/ folder:
  python test_streak.py

Commands:
  show              — print all users with streak fields
  fake <user_id>    — set last_goal_date to YESTERDAY so the next
                      time the user hits 15 graduated words today,
                      the streak should increment to 1 (or more)
  reset <user_id>   — zero-out streak fields for a user
"""
import sys
import sqlite3
from datetime import date, timedelta

DB = "vocabulary.db"

def show(cur):
    cur.execute("""
        SELECT id, email, current_streak, daily_words_reviewed,
               last_active_date, last_goal_date
        FROM users ORDER BY id
    """)
    rows = cur.fetchall()
    if not rows:
        print("No users found.")
        return
    print(f"{'ID':<5} {'Email':<35} {'Streak':<8} {'Daily':<7} {'last_active':<13} {'last_goal'}")
    print("-" * 90)
    for r in rows:
        print(f"{r[0]:<5} {r[1]:<35} {r[2]:<8} {r[3]:<7} {str(r[4] or '-'):<13} {r[5] or '-'}")

def fake(cur, user_id):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    today = date.today().isoformat()
    cur.execute("""
        UPDATE users
        SET last_goal_date = ?,
            last_active_date = ?,
            daily_words_reviewed = 14,
            current_streak = 1
        WHERE id = ?
    """, (yesterday, today, user_id))
    print(f"User {user_id}: last_goal_date={yesterday}, streak=1, daily=14 (one word away from goal)")
    print("Now graduate 1 word in the review session — streak should become 2.")

def reset(cur, user_id):
    cur.execute("""
        UPDATE users
        SET current_streak = 0,
            daily_words_reviewed = 0,
            last_active_date = NULL,
            last_goal_date = NULL
        WHERE id = ?
    """, (user_id,))
    print(f"User {user_id}: streak fields reset to 0/NULL.")

def main():
    try:
        con = sqlite3.connect(DB)
        cur = con.cursor()

        # Add last_goal_date column if backend hasn't run yet
        try:
            cur.execute("ALTER TABLE users ADD COLUMN last_goal_date DATE DEFAULT NULL")
            con.commit()
            print("[info] Added last_goal_date column.")
        except sqlite3.OperationalError:
            pass  # already exists

        cmd = sys.argv[1] if len(sys.argv) > 1 else "show"

        if cmd == "show":
            show(cur)
        elif cmd == "fake" and len(sys.argv) > 2:
            fake(cur, int(sys.argv[2]))
            con.commit()
            print()
            show(cur)
        elif cmd == "reset" and len(sys.argv) > 2:
            reset(cur, int(sys.argv[2]))
            con.commit()
            print()
            show(cur)
        else:
            print(__doc__)

        con.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
