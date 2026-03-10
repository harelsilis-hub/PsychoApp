"""Leaderboard endpoints — weekly and all-time rankings."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.point_event import PointEvent
from app.models.user_badge import UserBadge
from app.services.gamification import get_level_info, BADGES
from app.auth.dependencies import get_current_user

router = APIRouter()


def _get_sunday_utc() -> datetime:
    """Start of this week's Sunday at 00:00 Israel time, converted to UTC."""
    il = ZoneInfo("Asia/Jerusalem")
    now_il = datetime.now(il)
    # weekday(): Monday=0 ... Sunday=6; shift so Sunday=0
    days_since_sunday = (now_il.weekday() + 1) % 7
    sunday_il = now_il.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_sunday)
    return sunday_il.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


def _get_today_utc() -> datetime:
    """Start of today in Israel time, converted to UTC (handles DST automatically)."""
    il = ZoneInfo("Asia/Jerusalem")
    now_il = datetime.now(il)
    midnight_il = now_il.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight_il.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


def _user_entry(u: User, rank: int, weekly_xp: int | None = None) -> dict:
    level_info = get_level_info(u.xp)
    entry = {
        "rank": rank,
        "user_id": u.id,
        "display_name": u.display_name or u.email.split("@")[0],
        "xp": u.xp,
        "level_title": level_info["title"],
        "level_color": level_info["color"],
        "streak": u.current_streak,
    }
    if weekly_xp is not None:
        entry["weekly_xp"] = weekly_xp
    return entry


@router.get("")
async def get_leaderboard(
    type: str = Query(default="alltime", description="'daily', 'weekly' or 'alltime'"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return ranked leaderboard plus the calling user's own rank."""

    if type in ("weekly", "daily"):
        monday = _get_today_utc() if type == "daily" else _get_sunday_utc()

        # Fetch XP sums for the period, sorted desc, limited
        weekly_stmt = (
            select(
                PointEvent.user_id,
                func.sum(PointEvent.final_points).label("weekly_xp"),
            )
            .where(PointEvent.created_at >= monday)
            .group_by(PointEvent.user_id)
            .order_by(func.sum(PointEvent.final_points).desc(), PointEvent.user_id)
            .limit(limit)
        )
        weekly_rows = (await db.execute(weekly_stmt)).all()
        weekly_map = {r.user_id: int(r.weekly_xp) for r in weekly_rows}

        if not weekly_rows:
            return {"entries": [], "user_entry": _user_entry(current_user, 0, weekly_xp=0), "type": type}

        # Fetch user objects for those user_ids
        user_ids = [r.user_id for r in weekly_rows]
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_by_id = {u.id: u for u in users_result.scalars().all()}

        # Sort by weekly XP desc, total XP as tiebreaker (preserving period-XP order)
        scored = sorted(
            [users_by_id[uid] for uid in user_ids if uid in users_by_id],
            key=lambda u: (weekly_map.get(u.id, 0), u.xp),
            reverse=True,
        )

        entries = [
            _user_entry(u, rank, weekly_xp=weekly_map.get(u.id, 0))
            for rank, u in enumerate(scored, 1)
        ]

        user_entry = next((e for e in entries if e["user_id"] == current_user.id), None)
        if user_entry is None:
            my_xp = weekly_map.get(current_user.id, 0)
            # Count how many period users scored strictly higher
            higher_count_stmt = (
                select(func.count())
                .select_from(
                    select(
                        PointEvent.user_id,
                        func.sum(PointEvent.final_points).label("s"),
                    )
                    .where(PointEvent.created_at >= monday)
                    .group_by(PointEvent.user_id)
                    .having(func.sum(PointEvent.final_points) > my_xp)
                    .subquery()
                )
            )
            higher_count = await db.scalar(higher_count_stmt) or 0
            user_entry = _user_entry(current_user, higher_count + 1, weekly_xp=my_xp)

        return {"entries": entries, "user_entry": user_entry, "type": type}

    else:  # alltime
        top_result = await db.execute(
            select(User).order_by(User.xp.desc()).limit(limit)
        )
        top_users = top_result.scalars().all()

        entries = [_user_entry(u, rank) for rank, u in enumerate(top_users, 1)]

        user_entry = next((e for e in entries if e["user_id"] == current_user.id), None)
        if user_entry is None:
            higher_count = await db.scalar(
                select(func.count(User.id)).where(User.xp > current_user.xp)
            ) or 0
            user_entry = _user_entry(current_user, higher_count + 1)

        return {"entries": entries, "user_entry": user_entry, "type": "alltime"}


@router.get("/me/badges")
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all earned badges for the current user."""
    result = await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == current_user.id)
        .order_by(UserBadge.earned_at)
    )
    badges = result.scalars().all()
    return {
        "badges": [
            {
                "key": b.badge_key,
                "title": BADGES.get(b.badge_key, {}).get("title", b.badge_key),
                "emoji": BADGES.get(b.badge_key, {}).get("emoji", "🏅"),
                "earned_at": b.earned_at.isoformat(),
            }
            for b in badges
        ]
    }
