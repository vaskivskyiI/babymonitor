"""
Web Push reminders.

Two halves:
  * a small API (`/api/push/...`) for devices to register their push
    subscription and choose which chore types they want notifications for;
  * a background loop (`reminder_loop`) that fires a notification when a
    chore type's next-due time passes - the same next-due the dashboard
    shows, incl. a reminder switched off or a one-off override.

VAPID keys are generated on first start and kept in the database (settings
table), so they survive restarts/redeploys with the rest of the data and
need no configuration. Browsers only allow push on HTTPS (or localhost).
"""
import asyncio
import base64
import json
import logging
import os
from datetime import datetime, timedelta, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException
from py_vapid import Vapid
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import (
    _compute_next_due,
    _effective_chore_types,
    _get_profile_dict,
    _last_event,
    _profile_timezone,
    _set_setting,
)
from app.db import SessionLocal, get_db
from app.models import PushSubscription, Setting, as_utc
from app.schemas import PushEndpoint, PushPreferences, PushSubscribe

log = logging.getLogger("babymonitor.push")

router = APIRouter(prefix="/api/push")

VAPID_KEY = "vapid"
# Push services (esp. Apple's) want a contact URI in the VAPID claims.
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:babymonitor@example.com")

CHECK_EVERY_SECONDS = 30
# Only notify for a due time that passed recently. This covers a restart or a
# slow tick, but stops a long-overdue chore (say a monthly weigh-in) from
# firing the moment reminders are first turned on or the server comes back
# after days offline - the dashboard already shows those as overdue.
MAX_LATE = timedelta(minutes=30)
# A reminder that couldn't be delivered within this long is no longer useful.
PUSH_TTL_SECONDS = 3600

_vapid: Vapid | None = None
_public_key: str | None = None


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def ensure_vapid_keys() -> None:
    global _vapid, _public_key
    db = SessionLocal()
    try:
        setting = db.get(Setting, VAPID_KEY)
        if setting and setting.value.get("private_pem"):
            pem = setting.value["private_pem"]
            private_key = serialization.load_pem_private_key(pem.encode(), password=None)
        else:
            private_key = ec.generate_private_key(ec.SECP256R1())
            pem = private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ).decode()
            _set_setting(db, VAPID_KEY, {"private_pem": pem})
            db.commit()
        _public_key = _b64url(
            private_key.public_key().public_bytes(
                serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
            )
        )
        _vapid = Vapid.from_pem(pem.encode())
    finally:
        db.close()


# ---------- message text ----------
#
# The UI's translations live in app.js, which the service worker can't use,
# so the server composes the notification text itself, in the language the
# device registered with. Built-in type labels only - custom types show
# whatever the user named them, same as in the UI.

_TITLE_UK = {
    "Diaper Change": "Зміна підгузка",
    "Feeding": "Годування",
    "Height": "Зріст",
    "Probiotic": "Пробіотик",
    "Pumping": "Зціджування",
    "Sleep": "Сон",
    "Weight": "Вага",
}


def _fmt_ago(minutes: float, lang: str) -> str:
    minutes = round(minutes)
    h, m = divmod(minutes, 60)
    if lang == "uk":
        return f"{h}г {m}хв" if h and m else (f"{h}г" if h else f"{m}хв")
    return f"{h}h {m}m" if h and m else (f"{h}h" if h else f"{m}m")


def _message(lang: str, label: str, icon: str, last_ts: datetime | None, now: datetime) -> tuple[str, str]:
    shown = _TITLE_UK.get(label, label) if lang == "uk" else label
    title = f"{icon} {shown}"
    body = "Час настав" if lang == "uk" else "Due now"
    if last_ts is not None:
        ago = _fmt_ago((now - last_ts).total_seconds() / 60, lang)
        body += f" · востаннє {ago} тому" if lang == "uk" else f" · last {ago} ago"
    return title, body


# ---------- sending ----------


def _send(sub: PushSubscription, payload: dict) -> str:
    """Returns "ok", "gone" (the push service says this subscription is dead
    - the user revoked permission or uninstalled) or "error"."""
    try:
        webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=json.dumps(payload),
            vapid_private_key=_vapid,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=PUSH_TTL_SECONDS,
            headers={"Urgency": "high"},
            timeout=10,
        )
        return "ok"
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        if status in (404, 410):
            return "gone"
        log.warning("push failed (%s): %s", status, e)
        return "error"
    except Exception:
        log.exception("push failed")
        return "error"


def check_reminders() -> None:
    """One pass over all chore types: push those whose due time just passed."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        tz = _profile_timezone(_get_profile_dict(db))
        subs: list[PushSubscription] | None = None  # loaded lazily
        for ct in _effective_chore_types(db, enabled_only=True):
            last = _last_event(db, ct.key)
            due, _ = _compute_next_due(db, ct, last, tz)
            if due is None or due > now or now - due > MAX_LATE:
                continue
            marker_key = f"push_notified:{ct.key}"
            marker = db.get(Setting, marker_key)
            if marker and marker.value.get("due_at") == due.isoformat():
                continue
            # record before sending: at-most-once, so a crash or a slow push
            # service can never turn into a stream of repeats
            _set_setting(db, marker_key, {"due_at": due.isoformat()})
            db.commit()

            if subs is None:
                subs = db.execute(select(PushSubscription)).scalars().all()
            last_ts = as_utc(last.timestamp) if last else None
            for sub in list(subs):
                if ct.key in (sub.muted_types or []):
                    continue
                title, body = _message(sub.lang, ct.label, ct.icon, last_ts, now)
                result = _send(sub, {"title": title, "body": body, "tag": ct.key, "url": "/"})
                if result == "gone":
                    db.delete(sub)
                    subs.remove(sub)
                    db.commit()
    finally:
        db.close()


async def reminder_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(check_reminders)
        except Exception:
            log.exception("reminder check failed")
        await asyncio.sleep(CHECK_EVERY_SECONDS)


# ---------- API ----------


def _prefs(sub: PushSubscription) -> dict:
    return {"subscribed": True, "muted_types": list(sub.muted_types or [])}


def _get_sub(db: Session, endpoint: str) -> PushSubscription | None:
    return db.execute(select(PushSubscription).where(PushSubscription.endpoint == endpoint)).scalars().first()


@router.get("/config")
def push_config():
    return {"public_key": _public_key}


@router.post("/subscribe")
def subscribe(body: PushSubscribe, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    if sub is None:
        sub = PushSubscription(endpoint=body.endpoint, muted_types=[])
        db.add(sub)
    # a re-subscribe (keys rotated, permission re-granted) keeps the device's
    # category choices
    sub.p256dh = body.keys.p256dh
    sub.auth = body.keys.auth
    if body.lang:
        sub.lang = body.lang
    db.commit()
    return _prefs(sub)


@router.post("/state")
def state(body: PushEndpoint, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    return _prefs(sub) if sub else {"subscribed": False, "muted_types": []}


@router.put("/preferences")
def update_preferences(body: PushPreferences, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    if sub is None:
        raise HTTPException(404, "This device is not subscribed")
    if body.muted_types is not None:
        sub.muted_types = sorted(set(body.muted_types))
    if body.lang:
        sub.lang = body.lang
    db.commit()
    return _prefs(sub)


@router.post("/unsubscribe")
def unsubscribe(body: PushEndpoint, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    if sub is not None:
        db.delete(sub)
        db.commit()
    return {"ok": True}


@router.post("/test")
def send_test(body: PushEndpoint, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    if sub is None:
        raise HTTPException(404, "This device is not subscribed")
    title, msg = ("👶 Baby Monitor", "Сповіщення працюють" if sub.lang == "uk" else "Notifications are working")
    result = _send(sub, {"title": title, "body": msg, "tag": "test", "url": "/"})
    if result == "gone":
        db.delete(sub)
        db.commit()
        raise HTTPException(410, "The push service dropped this subscription - enable notifications again")
    if result != "ok":
        raise HTTPException(502, "The push service rejected the message - check the server log")
    return {"ok": True}
