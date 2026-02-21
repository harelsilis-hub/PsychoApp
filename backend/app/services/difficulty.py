"""
Service for calculating global word difficulty based on crowd-sourced user performance.

Algorithm
---------
For each word, across ALL users:

  success_rate = (REVIEW + MASTERED records) / (LEARNING + REVIEW + MASTERED records)

  • REVIEW / MASTERED → user rated the word as "I Know It" (quality ≥ 3) and SM-2 has
    confirmed their recall.  These represent successful outcomes.
  • LEARNING           → user is still struggling (initial triage "Don't Know", or quality
    rating < 3 reset their progress).
  • NEW                → word was never touched by this user; excluded from the denominator.

Mapping to 1-20 scale (matching the existing difficulty_rank on Word):
  success_rate = 1.0  →  level 1   (everybody knows it — easiest)
  success_rate = 0.0  →  level 20  (nobody can remember it — hardest)
  formula: level = round(1 + (1 - success_rate) * 19)
"""
from sqlalchemy import select, func, case, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.word import Word
from app.models.user_word_progress import UserWordProgress, WordStatus


class DifficultyService:

    MIN_LEVEL = 1
    MAX_LEVEL = 20

    @staticmethod
    def _success_rate_to_level(success_rate: float) -> int:
        """Map a [0.0, 1.0] success rate to the [1, 20] difficulty scale."""
        level = round(1.0 + (1.0 - success_rate) * 19.0)
        return max(DifficultyService.MIN_LEVEL, min(DifficultyService.MAX_LEVEL, level))

    @staticmethod
    async def recalculate_all(db: AsyncSession) -> dict:
        """
        Recalculate global_difficulty_level for every word that has review data.

        Words with no UserWordProgress records (never touched by any user) are left at
        NULL — they have no crowd-sourced signal yet.

        Returns a summary dict:
            {
                "total_words":        int,   # all words in DB
                "words_updated":      int,   # words that had data and were updated
                "words_without_data": int,   # words with no review data (kept NULL)
                "level_distribution": {1: n, 2: n, ...},  # counts per level
            }
        """
        # ── 1. Aggregate per-word success counts across all users ──────────────
        #
        # We count only non-NEW records because NEW means the user has never
        # actually clicked "I Know It" or "I Don't Know" on that word.
        #
        # successes = rows where status is REVIEW or MASTERED
        # total     = all non-NEW rows for that word
        successes_expr = func.coalesce(
            func.sum(
                case(
                    (UserWordProgress.status.in_([WordStatus.REVIEW, WordStatus.MASTERED]), 1),
                    else_=0,
                )
            ),
            0,
        ).label("successes")

        stats_stmt = (
            select(
                UserWordProgress.word_id,
                func.count(UserWordProgress.id).label("total"),
                successes_expr,
            )
            .where(UserWordProgress.status != WordStatus.NEW)
            .group_by(UserWordProgress.word_id)
        )

        rows = (await db.execute(stats_stmt)).all()

        if not rows:
            total_words_count = (await db.execute(select(func.count(Word.id)))).scalar() or 0
            return {
                "total_words": total_words_count,
                "words_updated": 0,
                "words_without_data": total_words_count,
                "level_distribution": {},
            }

        # ── 2. Compute a difficulty level for each word that has data ──────────
        difficulty_map: dict[int, int] = {}
        level_distribution: dict[int, int] = {i: 0 for i in range(1, 21)}

        for row in rows:
            if row.total == 0:
                continue
            success_rate = row.successes / row.total
            level = DifficultyService._success_rate_to_level(success_rate)
            difficulty_map[row.word_id] = level
            level_distribution[level] += 1

        # ── 3. Bulk-update words that have data ───────────────────────────────
        #
        # Use a single prepared statement executed with multiple parameter sets —
        # much faster than N individual UPDATE queries.
        if difficulty_map:
            # SQLAlchemy 2.0 ORM "bulk UPDATE by primary key":
            # pass a list of dicts that include the PK field ("id") and the
            # columns to set.  SQLAlchemy generates a single prepared statement
            # executed N times — much faster than individual UPDATE calls.
            await db.execute(
                update(Word).execution_options(synchronize_session=False),
                [{"id": wid, "global_difficulty_level": lvl} for wid, lvl in difficulty_map.items()],
            )

        await db.commit()

        # ── 4. Build response summary ──────────────────────────────────────────
        total_words_count = (await db.execute(select(func.count(Word.id)))).scalar() or 0
        words_updated = len(difficulty_map)
        words_without_data = total_words_count - words_updated

        return {
            "total_words": total_words_count,
            "words_updated": words_updated,
            "words_without_data": words_without_data,
            "level_distribution": {k: v for k, v in level_distribution.items() if v > 0},
        }
