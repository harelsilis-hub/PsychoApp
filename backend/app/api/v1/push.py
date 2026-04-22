import os
import json
import asyncio
import logging
import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from pywebpush import webpush, WebPushException
from apscheduler.triggers.date import DateTrigger

from app.db.session import get_db, AsyncSessionLocal
from app.models.push_subscription import PushSubscription
from app.models.user import User
from app.auth.dependencies import get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter()

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_CLAIMS = {"sub": "mailto:harel.silis@gmail.com"}


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


class SendAllRequest(BaseModel):
    title: str
    body: str
    send_at: Optional[datetime] = None  # UTC datetime; if None, send immediately


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201)
async def subscribe(
    body: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Remove existing subscription for this endpoint (re-subscribe)
    await db.execute(
        delete(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )
    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.keys["p256dh"],
        auth=body.keys["auth"],
    )
    db.add(sub)
    await db.commit()
    return {"ok": True}


@router.delete("/subscribe")
async def unsubscribe(
    body: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    await db.commit()
    return {"ok": True}


@router.post("/test", dependencies=[Depends(require_admin)])
async def test_push(current_user: User = Depends(get_current_user)):
    """Admin-only: send a test push to the current admin user."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == current_user.id)
        )
        subs = result.scalars().all()

    if not subs:
        return {"ok": False, "detail": "No subscription found for your account. Enable notifications first."}

    payload = json.dumps({
        "title": "Mila",
        "body": "הרצף שלך עומד להתאפס! 🔥 היכנס עכשיו כדי לשמור על הרצף",
        "icon": "/mila_logo.png",
        "url": "/",
    })

    sent = 0
    for sub in subs:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
            sent += 1
        except WebPushException as e:
            logger.warning(f"[Push] Test failed: {e}")

    return {"ok": True, "sent": sent}


@router.post("/send-all", dependencies=[Depends(require_admin)])
async def send_push_to_all(
    body: SendAllRequest,
    current_user: User = Depends(get_current_user),
):
    """Admin-only: broadcast a custom push notification to ALL subscribed users.
    If send_at is provided (UTC), the broadcast is scheduled for that time.
    """
    # ── Scheduled send ────────────────────────────────────────────────────────
    if body.send_at is not None:
        from app.main import scheduler  # import here to avoid circular import at module load
        if scheduler is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="Scheduler not available")

        job_id = f"broadcast_{uuid.uuid4().hex[:8]}"
        scheduler.add_job(
            _do_broadcast,
            DateTrigger(run_date=body.send_at),
            id=job_id,
            kwargs={"title": body.title, "body": body.body},
            replace_existing=False,
        )
        logger.info(f"[Push] send-all scheduled at {body.send_at} UTC (job={job_id})")
        return {"ok": True, "scheduled": True, "scheduled_at": body.send_at.isoformat(), "job_id": job_id}

    # ── Immediate send ────────────────────────────────────────────────────────
    result = await _do_broadcast(body.title, body.body)
    return {"ok": True, "scheduled": False, **result}


async def _do_broadcast(title: str, body: str) -> dict:
    """Core broadcast logic — called directly or by the scheduler."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(PushSubscription))
        subs = result.scalars().all()

    if not subs:
        logger.info("[Push] send-all: no subscribers.")
        return {"sent": 0, "failed": 0, "total": 0}

    payload = json.dumps({
        "title": title,
        "body": body,
        "icon": "/mila_logo.png",
        "url": "/",
    })

    sent = 0
    failed = 0
    stale_endpoints = []

    for sub in subs:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
            sent += 1
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                stale_endpoints.append(sub.endpoint)
            else:
                logger.warning(f"[Push] send-all failed for subscription {sub.id}: {e}")
            failed += 1

    if stale_endpoints:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(PushSubscription).where(
                    PushSubscription.endpoint.in_(stale_endpoints)
                )
            )
            await db.commit()
        logger.info(f"[Push] send-all: cleaned up {len(stale_endpoints)} stale subscriptions.")

    logger.info(f"[Push] send-all: sent={sent}, failed={failed}, total={len(subs)}")
    return {"sent": sent, "failed": failed, "total": len(subs)}


async def send_streak_reminders():
    """Called by the scheduler at 20:00 Israel time. Notifies users whose streak is about to reset."""
    today = date.today()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PushSubscription, User)
            .join(User, User.id == PushSubscription.user_id)
            .where(User.current_streak > 0)
            .where(
                (User.last_active_date == None) | (User.last_active_date < today)  # noqa: E711
            )
        )
        rows = result.all()

    if not rows:
        logger.info("[Push] No streak reminders to send.")
        return

    logger.info(f"[Push] Sending streak reminders to {len(rows)} subscribers.")

    payload = json.dumps({
        "title": "Mila",
        "body": "הרצף שלך עומד להתאפס! 🔥 היכנס עכשיו כדי לשמור על הרצף",
        "icon": "/mila_logo.png",
        "url": "/",
    })

    stale_endpoints = []
    for sub, user in rows:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                stale_endpoints.append(sub.endpoint)
            else:
                logger.warning(f"[Push] Failed for user {user.id}: {e}")

    if stale_endpoints:
        async with AsyncSessionLocal() as db:
            await db.execute(
                delete(PushSubscription).where(
                    PushSubscription.endpoint.in_(stale_endpoints)
                )
            )
            await db.commit()
        logger.info(f"[Push] Cleaned up {len(stale_endpoints)} stale subscriptions.")


async def notify_admins(db: AsyncSession, title: str, body: str) -> None:
    """Send a push notification to all admin users."""
    result = await db.execute(
        select(PushSubscription)
        .join(User, User.id == PushSubscription.user_id)
        .where(User.is_admin == True)  # noqa: E712
    )
    subs = result.scalars().all()
    if not subs:
        return
    payload = json.dumps({"title": title, "body": body, "icon": "/mila_logo.png", "url": "/"})
    for sub in subs:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except WebPushException as e:
            logger.warning(f"[Push] Admin notify failed: {e}")
