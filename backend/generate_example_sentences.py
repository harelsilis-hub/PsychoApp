"""
generate_example_sentences.py
==============================
Generates high-quality, psychometric-style fill-in-the-blank example sentences
for every word in the database that doesn't already have one.

Usage:
    # 1. Add your Gemini API key to backend/.env:
    #      GEMINI_API_KEY=AIza...
    #
    # 2. Run from the backend/ directory:
    #      python generate_example_sentences.py
    #
    # 3. To target Supabase production instead of local SQLite, pass the URL:
    #      python generate_example_sentences.py --db postgresql+asyncpg://...

Features:
  - Fully resumable: skips words that already have a sentence (safe to re-run)
  - Batches 20 words per API call (efficient, stays within rate limits)
  - Dry-run mode (--dry-run): prints sentences without writing to DB
  - Shows progress and estimated time remaining
  - Uses Gemini 2.0 Flash (fast + free tier: 15 req/min, 1500 req/day)
"""

import os
import sys
import json
import time
import sqlite3
import argparse
import textwrap
from pathlib import Path
from urllib.parse import urlparse

# ── Load .env ─────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BATCH_SIZE = 20          # words per API call
RATE_LIMIT_DELAY = 4.5   # seconds between calls (stays under 15 req/min free tier)

# ── Gemini API call (via httpx, already in requirements.txt) ──────────────────
try:
    import httpx
except ImportError:
    print("ERROR: httpx is not installed. Run: pip install httpx")
    sys.exit(1)

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)


def call_gemini(words: list[dict]) -> list[str]:
    """
    words: list of {"english": str, "hebrew": str}
    Returns: list of sentence strings, same order and length as input.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not set.\n"
            "Get a free key at https://aistudio.google.com/app/apikey\n"
            "Then add GEMINI_API_KEY=AIza... to backend/.env"
        )

    word_list = "\n".join(
        f"{i + 1}. {w['english']} → {w['hebrew']}" for i, w in enumerate(words)
    )

    prompt = textwrap.dedent(f"""
        You are an expert test-prep educator creating material for Israeli university entrance exams (Psychometric).

        Your task: Generate ONE example sentence for each vocabulary word below.

        Requirements for EACH sentence:
        1. Written in academic English (like SAT/Psychometric reading comprehension), but NOT overly dense or excessively long.
        2. The sentence must provide logical context clues for the missing word (cause/effect, contrast, etc).
        3. The target word must appear EXACTLY ONCE in the sentence.
        4. Length: 12–22 words maximum. Keep it concise.
        5. Use clear, understandable vocabulary for the rest of the sentence (so the student isn't struggling with the clue words too).
        6. Do NOT begin the sentence with the target word.
        7. Do NOT include the Hebrew translation.

        Words (English → Hebrew for context only):
        {word_list}

        Respond with a valid JSON array of {len(words)} strings — one sentence per word, in the same order.
        No markdown. No explanation. Just the JSON array.
    """).strip()

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
        },
    }

    resp = httpx.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()

    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    sentences = json.loads(raw_text)

    if not isinstance(sentences, list) or len(sentences) != len(words):
        raise ValueError(
            f"Expected {len(words)} sentences, got: {sentences!r:.200}"
        )

    return [str(s).strip() for s in sentences]


# ── Database helpers ───────────────────────────────────────────────────────────

def detect_db_type(db_url: str) -> str:
    """Returns 'sqlite' or 'postgres'."""
    parsed = urlparse(db_url)
    if parsed.scheme.startswith("sqlite"):
        return "sqlite"
    if "postgresql" in parsed.scheme or "postgres" in parsed.scheme:
        return "postgres"
    raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")


def get_sqlite_path(db_url: str) -> str:
    """Extract file path from a sqlite URL like sqlite+aiosqlite:///./vocabulary.db"""
    # e.g. sqlite+aiosqlite:///./vocabulary.db  → ./vocabulary.db
    path = db_url.split("///", 1)[-1]
    # Resolve relative to backend dir
    resolved = (Path(__file__).parent / path).resolve()
    return str(resolved)


# ── SQLite driver ─────────────────────────────────────────────────────────────

def sqlite_fetch_pending(db_path: str, overwrite: bool) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        where_clause = "language = 'en'"
        if not overwrite:
            where_clause += " AND ai_association IS NULL"
            
        rows = conn.execute(
            f"SELECT id, english, hebrew FROM words WHERE {where_clause} ORDER BY unit, id"
        ).fetchall()
        return [{"id": r["id"], "english": r["english"], "hebrew": r["hebrew"]} for r in rows]
    finally:
        conn.close()


def sqlite_update_batch(db_path: str, updates: list[dict]) -> None:
    """updates: list of {"id": int, "sentence": str}"""
    conn = sqlite3.connect(db_path)
    try:
        conn.executemany(
            "UPDATE words SET ai_association = ? WHERE id = ?",
            [(u["sentence"], u["id"]) for u in updates],
        )
        conn.commit()
    finally:
        conn.close()


# ── PostgreSQL driver ─────────────────────────────────────────────────────────

def pg_fetch_pending(db_url: str, overwrite: bool) -> list[dict]:
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2 is required for PostgreSQL. Run: pip install psycopg2-binary")
        sys.exit(1)

    # Convert asyncpg URL to standard psycopg2 URL
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("asyncpg://", "postgresql://")

    conn = psycopg2.connect(sync_url)
    conn.autocommit = True
    try:
        where_clause = "language = 'en'"
        if not overwrite:
            where_clause += " AND ai_association IS NULL"
            
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                f"SELECT id, english, hebrew FROM words WHERE {where_clause} ORDER BY unit, id"
            )
            rows = cur.fetchall()
        return [{"id": r["id"], "english": r["english"], "hebrew": r["hebrew"]} for r in rows]
    finally:
        conn.close()


def pg_update_batch(db_url: str, updates: list[dict]) -> None:
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("ERROR: psycopg2 is required for PostgreSQL. Run: pip install psycopg2-binary")
        sys.exit(1)

    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("asyncpg://", "postgresql://")
    conn = psycopg2.connect(sync_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "UPDATE words SET ai_association = %s WHERE id = %s",
                [(u["sentence"], u["id"]) for u in updates],
            )
    finally:
        conn.close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate example sentences for all vocabulary words.")
    parser.add_argument(
        "--db",
        default=None,
        help="DATABASE_URL override (default: reads from .env)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print generated sentences without writing to the database.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing ai_association data (otherwise, only processes words where it is NULL)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process at most N words (useful for a quick quality check). E.g. --limit 20",
    )
    args = parser.parse_args()

    db_url = args.db or os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./vocabulary.db")
    db_type = detect_db_type(db_url)

    print(f"[DB] Type: {db_type.upper()}")
    print(f"[API] Gemini key: {'SET ✓' if GEMINI_API_KEY else 'MISSING ✗'}")
    if not GEMINI_API_KEY:
        print()
        print("  ➜ Get a free key at https://aistudio.google.com/app/apikey")
        print("  ➜ Add to backend/.env:  GEMINI_API_KEY=AIza...")
        sys.exit(1)

    # Fetch pending words
    print("[DB] Fetching words…")
    if db_type == "sqlite":
        db_path = get_sqlite_path(db_url)
        print(f"[DB] SQLite path: {db_path}")
        pending = sqlite_fetch_pending(db_path, args.overwrite)
    else:
        pending = pg_fetch_pending(db_url, args.overwrite)

    if args.limit:
        pending = pending[: args.limit]

    total = len(pending)
    if total == 0:
        print("✅ All words already have example sentences. Nothing to do.")
        return

    print(f"[DB] {total} words need sentences. Processing in batches of {BATCH_SIZE}…")
    if args.dry_run:
        print("[MODE] DRY RUN — sentences will NOT be saved to the database.\n")

    # Chunk into batches
    batches = [pending[i : i + BATCH_SIZE] for i in range(0, total, BATCH_SIZE)]
    processed = 0
    start_time = time.time()

    for batch_idx, batch in enumerate(batches):
        batch_num = batch_idx + 1
        print(f"\n{'─'*60}")
        print(f"Batch {batch_num}/{len(batches)}  [{processed}/{total} words done]")

        # ETA
        if batch_idx > 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed  # words per second
            remaining = (total - processed) / rate if rate > 0 else 0
            print(f"ETA: ~{int(remaining // 60)}m {int(remaining % 60)}s remaining")

        # Show what we're processing
        for w in batch:
            print(f"  • {w['english']} ({w['hebrew']})")

        # Call the API (with retry on transient errors)
        sentences = None
        for attempt in range(1, 4):
            try:
                sentences = call_gemini(batch)
                break
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    wait = 60 * attempt
                    print(f"  [Rate limit] Waiting {wait}s before retry {attempt}/3…")
                    time.sleep(wait)
                else:
                    print(f"  [HTTP {e.response.status_code}] {e.response.text[:200]}")
                    break
            except Exception as e:
                print(f"  [Error] {e}")
                if attempt < 3:
                    time.sleep(5 * attempt)

        if sentences is None:
            print(f"  ⚠ Skipping batch {batch_num} after 3 failed attempts.")
            continue

        # Show generated sentences
        updates = []
        for word, sentence in zip(batch, sentences):
            print(f"\n  [{word['english']}]")
            print(f"  → {sentence}")
            updates.append({"id": word["id"], "sentence": sentence})

        # Write to DB
        if not args.dry_run:
            if db_type == "sqlite":
                sqlite_update_batch(db_path, updates)
            else:
                pg_update_batch(db_url, updates)
            print(f"\n  ✅ Saved {len(updates)} sentences to database.")
        else:
            print(f"\n  [DRY RUN] Would save {len(updates)} sentences.")

        processed += len(batch)

        # Rate-limit delay before next batch
        if batch_idx < len(batches) - 1:
            print(f"  ⏳ Waiting {RATE_LIMIT_DELAY}s before next batch…")
            time.sleep(RATE_LIMIT_DELAY)

    print(f"\n{'='*60}")
    elapsed_total = time.time() - start_time
    print(f"✅ Done! {processed}/{total} sentences generated in {elapsed_total:.0f}s.")
    if args.dry_run:
        print("   (DRY RUN — no data was written)")


if __name__ == "__main__":
    main()
