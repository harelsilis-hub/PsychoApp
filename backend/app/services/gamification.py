"""Gamification service — XP, levels, badges, and multipliers."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.point_event import PointEvent
from app.models.user_badge import UserBadge
from app.models.word_interaction_event import WordInteractionEvent
from app.models.user_word_progress import UserWordProgress, WordStatus
from app.models.association import Association

# ── Level thresholds ───────────────────────────────────────────────────────────
LEVELS = [
    (0,       "Bronze I",     "#CD7F32"),
    (1000,    "Bronze II",    "#CD7F32"),
    (3000,    "Bronze III",   "#CD7F32"),
    (7000,    "Silver I",     "#C0C0C0"),
    (15000,   "Silver II",    "#C0C0C0"),
    (25000,   "Silver III",   "#C0C0C0"),
    (40000,   "Gold I",       "#FFD700"),
    (60000,   "Gold II",      "#FFD700"),
    (85000,   "Gold III",     "#FFD700"),
    (120000,  "Platinum I",   "#00CED1"),
    (160000,  "Platinum II",  "#00CED1"),
    (210000,  "Platinum III", "#00CED1"),
    (270000,  "Diamond I",    "#00BFFF"),
    (340000,  "Diamond II",   "#00BFFF"),
    (420000,  "Champion",     "#FFD700"),
]

# ── Base point values ──────────────────────────────────────────────────────────
POINTS = {
    "triage_known":          30,
    "triage_unknown":        10,
    "review_q1":             10,
    "review_q2":             10,
    "review_q3":             50,
    "review_q4":             80,
    "review_q5":            120,
    "graduation_review":    150,
    "graduation_mastered":  300,
    "daily_goal":           200,
    "placement_complete":   500,
    "association_posted":    50,
    "association_liked":     20,
}

# ── Badge definitions ──────────────────────────────────────────────────────────
BADGES = {
    "first_review":     {"title": "ביקורת ראשונה",      "emoji": "⭐"},
    "streak_3":         {"title": "3 ימי רצף",           "emoji": "🔥"},
    "streak_7":         {"title": "7 ימי רצף",           "emoji": "🔥"},
    "streak_30":        {"title": "30 ימי רצף",          "emoji": "🔥"},
    "words_100":        {"title": "100 מילים",            "emoji": "📚"},
    "words_500":        {"title": "500 מילים",            "emoji": "📚"},
    "first_mastered":   {"title": "מילה ראשונה שנשלטה", "emoji": "🏆"},
    "associations_10":  {"title": "10 אסוציאציות",       "emoji": "💡"},
}


def get_multiplier(streak: int) -> float:
    """Return streak-based XP multiplier."""
    if streak >= 30:
        return 3.0
    if streak >= 7:
        return 2.0
    if streak >= 3:
        return 1.5
    return 1.0


def get_level_info(xp: int) -> dict:
    """Compute level details from raw XP value."""
    level_num = 0
    for i, (threshold, _title, _color) in enumerate(LEVELS):
        if xp >= threshold:
            level_num = i
        else:
            break

    title = LEVELS[level_num][1]
    color = LEVELS[level_num][2]
    xp_current_start = LEVELS[level_num][0]

    if level_num + 1 < len(LEVELS):
        xp_next = LEVELS[level_num + 1][0]
        xp_in_level = xp - xp_current_start
        xp_needed = xp_next - xp_current_start
        progress_pct = min(100, int((xp_in_level / xp_needed) * 100))
    else:
        xp_next = None
        progress_pct = 100

    return {
        "level_num": level_num,
        "title": title,
        "color": color,
        "xp_current": xp,
        "xp_next": xp_next,
        "progress_pct": progress_pct,
    }


async def award_xp(db: AsyncSession, user, source: str, base_points: int) -> dict:
    """
    Award XP to user. Adds PointEvent to the session.
    Does NOT commit — caller must commit.
    Does NOT check badges — call check_and_award_badges separately.
    """
    multiplier = get_multiplier(user.current_streak)
    final_points = int(base_points * multiplier)

    old_level_num = get_level_info(user.xp)["level_num"]

    db.add(PointEvent(
        user_id=user.id,
        source=source,
        base_points=base_points,
        multiplier=multiplier,
        final_points=final_points,
    ))

    user.xp += final_points

    new_level_info = get_level_info(user.xp)
    level_up = new_level_info["level_num"] > old_level_num

    return {
        "xp_earned": final_points,
        "new_xp": user.xp,
        "level_up": level_up,
        "new_level_info": new_level_info,
    }


async def check_and_award_badges(db: AsyncSession, user) -> list[str]:
    """
    Check all badge conditions and award newly earned badges.
    Flushes each new badge so duplicate queries within the same session work.
    Returns list of newly awarded badge keys.
    """
    # Already-earned badges
    result = await db.execute(
        select(UserBadge.badge_key).where(UserBadge.user_id == user.id)
    )
    earned = set(result.scalars().all())

    # Interaction event count
    event_count = await db.scalar(
        select(func.count(WordInteractionEvent.id)).where(
            WordInteractionEvent.user_id == user.id
        )
    ) or 0

    # Mastered word count
    mastered_count = await db.scalar(
        select(func.count(UserWordProgress.id)).where(
            UserWordProgress.user_id == user.id,
            UserWordProgress.status == WordStatus.MASTERED,
        )
    ) or 0

    # Association count
    assoc_count = await db.scalar(
        select(func.count(Association.id)).where(Association.user_id == user.id)
    ) or 0

    badge_conditions = {
        "first_review":    event_count >= 1,
        "streak_3":        user.current_streak >= 3,
        "streak_7":        user.current_streak >= 7,
        "streak_30":       user.current_streak >= 30,
        "words_100":       event_count >= 100,
        "words_500":       event_count >= 500,
        "first_mastered":  mastered_count >= 1,
        "associations_10": assoc_count >= 10,
    }

    new_badges = []
    for badge_key, condition in badge_conditions.items():
        if badge_key not in earned and condition:
            db.add(UserBadge(user_id=user.id, badge_key=badge_key))
            earned.add(badge_key)  # prevent duplicate within same call
            new_badges.append(badge_key)

    return new_badges
