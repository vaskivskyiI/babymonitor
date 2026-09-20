"""
Web Push reminders.

Two halves:
  * a small API (`/api/push/...`) for devices to register their push
    subscription, choose which chore types they want notifications for, and
    see what the server has done on their behalf;
  * a background loop (`reminder_loop`) that sends a notification when a
    chore type's reminder comes due - the same due time the dashboard shows,
    incl. a reminder switched off or a one-off override - optionally a few
    minutes early (the chore's "push lead time").

Delivery is meant to survive a sleeping phone:
  * messages go out with `Urgency: high` (Android wakes the device for them
    even in Doze) and a TTL that lasts until the reminder stops being useful,
    so a push service holds one for a phone that is briefly unreachable;
  * a send that fails (push service down, timeout) is retried every minute;
  * the service worker acknowledges every push it receives; if none arrives
    shortly after a send, it is sent once more (replacing, never stacking);
  * the outcome of every send is kept in a small in-memory log the Settings
    page shows, so "it didn't come" can be diagnosed instead of guessed at.

VAPID keys are generated on first start and kept in the database (settings
table), so they survive restarts/redeploys with the rest of the data and
need no configuration. Browsers only allow push on HTTPS (or localhost).
"""
import asyncio
import base64
import json
import logging
import os
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException
from py_vapid import Vapid
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import (
    _effective_chore_types,
    _get_profile_dict,
    _last_event,
    _next_due_info,
    _profile_timezone,
    _push_lead_minutes,
    _reminder_enabled,
    _set_setting,
)
from app.db import SessionLocal, get_db
from app.models import PushSubscription, Setting, as_utc
from app.schemas import PushAck, PushEndpoint, PushPreferences, PushResubscribe, PushSubscribe, PushTest

log = logging.getLogger("babymonitor.push")
# uvicorn only configures its own loggers; without this the INFO lines below
# (every send, retry and receipt) would never reach `podman logs`
_app_log = logging.getLogger("babymonitor")
if not _app_log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s:     [push] %(message)s"))
    _app_log.addHandler(_handler)
_app_log.setLevel(logging.INFO)

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
RETRY_AFTER_SECONDS = 60  # a send the push service rejected/timed out on is tried again
MAX_ATTEMPTS = 6
RESEND_AFTER_SECONDS = 240  # no receipt from the device this long after a send -> one more
MAX_UNACKED_SENDS = 2  # the original plus one resend
MIN_TTL_SECONDS = 120
MAX_TTL_SECONDS = 3600

_vapid: Vapid | None = None
_public_key: str | None = None

# in-memory diagnostics (lost on restart, which is fine - they are for "what
# just happened?", not for history)
_recent: deque = deque(maxlen=40)
_loop_state = {"last_run": None, "last_error": None}
_log_lock = threading.Lock()


def _record(kind: str, key: str | None = None, sid: int | None = None, detail: str = "") -> None:
    with _log_lock:
        _recent.appendleft(
            {"t": datetime.now(timezone.utc).isoformat(), "kind": kind, "key": key, "sid": sid, "detail": detail}
        )
    log.info("%s key=%s device=%s %s", kind, key, sid, detail)


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


def _message(
    lang: str, label: str, icon: str, last_ts: datetime | None, now: datetime, due: datetime | None = None
) -> tuple[str, str]:
    shown = _TITLE_UK.get(label, label) if lang == "uk" else label
    title = f"{icon} {shown}"
    minutes_left = round((due - now).total_seconds() / 60) if due is not None else 0
    if minutes_left >= 1:
        body = f"Через {minutes_left} хв" if lang == "uk" else f"Due in {minutes_left} min"
    else:
        body = "Час настав" if lang == "uk" else "Due now"
    if last_ts is not None:
        ago = _fmt_ago((now - last_ts).total_seconds() / 60, lang)
        body += f" · востаннє {ago} тому" if lang == "uk" else f" · last {ago} ago"
    return title, body


# ---------- sending ----------


def _send(sub: PushSubscription, payload: dict, ttl: int = MAX_TTL_SECONDS) -> tuple[str, str]:
    """Returns (outcome, detail): outcome is "ok", "gone" (the push service
    says this subscription is dead - the user revoked permission or
    uninstalled) or "error"."""
    try:
        webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=json.dumps(payload),
            vapid_private_key=_vapid,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=ttl,
            # "high" is what lets a message through while the phone dozes
            headers={"Urgency": "high"},
            timeout=10,
        )
        return "ok", ""
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        if status in (404, 410):
            return "gone", f"HTTP {status}"
        log.warning("push failed (%s): %s", status, e)
        return "error", f"HTTP {status}" if status else str(e)[:120]
    except Exception as e:
        log.exception("push failed")
        return "error", str(e)[:120]


def notify_at_for(due: datetime, lead_minutes: int, armed_at: datetime | None) -> datetime:
    """When to push for a reminder due at `due`: `lead_minutes` early, but
    never earlier than halfway between when the due time was set and the due
    time itself - so a 10-minute lead on a reminder that was only just set for
    5 minutes from now doesn't fire the instant it's created."""
    at = due - timedelta(minutes=lead_minutes or 0)
    if armed_at is not None and armed_at < due:
        at = max(at, armed_at + (due - armed_at) / 2)
    return at


def _ttl_for(due: datetime, now: datetime) -> int:
    """Keep a message queued until the reminder stops being useful."""
    return int(min(MAX_TTL_SECONDS, max(MIN_TTL_SECONDS, (due + MAX_LATE - now).total_seconds())))


def check_reminders(now: datetime | None = None) -> None:
    """One pass over all chore types: push those whose notify time has come,
    retry failed sends, and re-send once if the device never confirmed."""
    db = SessionLocal()
    try:
        now = now or datetime.now(timezone.utc)
        now_ts = now.timestamp()
        tz = _profile_timezone(_get_profile_dict(db))
        subs: list[PushSubscription] | None = None  # loaded lazily
        for ct in _effective_chore_types(db, enabled_only=True):
            last = _last_event(db, ct.key)
            info = _next_due_info(db, ct, last, tz)
            due = info["due"]
            if due is None:
                continue
            notify_at = notify_at_for(due, _push_lead_minutes(db, ct.key), info["armed_at"])
            if now < notify_at or now - due > MAX_LATE:
                continue

            nid = f"{ct.key}|{due.isoformat()}"
            marker_key = f"push_notified:{ct.key}"
            marker = db.get(Setting, marker_key)
            state = marker.value if marker and marker.value.get("due_at") == due.isoformat() else None
            if state is not None and "sent" not in state:
                continue  # marker from before per-device tracking: already handled
            sent: dict = dict(state["sent"]) if state else {}
            if state is None:
                _set_setting(db, marker_key, {"due_at": due.isoformat(), "sent": sent})
                db.commit()

            if subs is None:
                subs = db.execute(select(PushSubscription)).scalars().all()
            last_ts = as_utc(last.timestamp) if last else None
            ttl = _ttl_for(due, now)
            for sub in list(subs):
                if ct.key in (sub.muted_types or []):
                    continue
                ack = db.get(Setting, f"push_ack:{sub.id}:{ct.key}")
                if ack and ack.value.get("nid") == nid:
                    continue  # the device confirmed it has this one
                st = sent.get(str(sub.id))
                if st is None:
                    kind = "sent"
                elif not st["ok"]:
                    if st["n"] >= MAX_ATTEMPTS or now_ts - st["last"] < RETRY_AFTER_SECONDS:
                        continue
                    kind = "retry"
                else:
                    if st["n"] >= MAX_UNACKED_SENDS or now_ts - st["last"] < RESEND_AFTER_SECONDS:
                        continue
                    kind = "resend"

                title, body = _message(sub.lang, ct.label, ct.icon, last_ts, now, due)
                payload = {
                    "title": title,
                    "body": body,
                    "tag": ct.key,
                    "url": "/",
                    "nid": nid,
                    "sid": sub.id,
                    # a re-send must not buzz again if the first one turns up
                    # late - with the same tag it replaces it quietly - while a
                    # first send should always alert, even over an old one
                    "renotify": kind != "resend",
                }
                outcome, detail = _send(sub, payload, ttl)
                if outcome == "gone":
                    _record("gone", ct.key, sub.id, "push service dropped this device - removed")
                    db.delete(sub)
                    subs.remove(sub)
                    db.commit()
                    continue
                sent[str(sub.id)] = {"n": (st["n"] if st else 0) + 1, "last": now_ts, "ok": outcome == "ok"}
                _set_setting(db, marker_key, {"due_at": due.isoformat(), "sent": sent})
                db.commit()
                _record(kind if outcome == "ok" else "error", ct.key, sub.id, detail or f"due {due.isoformat()}")
    finally:
        db.close()


async def reminder_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(check_reminders)
            _loop_state["last_error"] = None
        except Exception as e:
            log.exception("reminder check failed")
            _loop_state["last_error"] = f"{type(e).__name__}: {e}"[:200]
        _loop_state["last_run"] = time.time()
        await asyncio.sleep(CHECK_EVERY_SECONDS)


# ---------- API ----------


def _prefs(sub: PushSubscription) -> dict:
    return {"subscribed": True, "muted_types": list(sub.muted_types or []), "id": sub.id}


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


@router.post("/resubscribe")
def resubscribe(body: PushResubscribe, db: Session = Depends(get_db)):
    """The browser rotated this device's subscription (the service worker's
    `pushsubscriptionchange`): carry the device's choices over to the new one
    instead of silently going quiet."""
    sub = _get_sub(db, body.old_endpoint) if body.old_endpoint else None
    if sub is None:
        sub = _get_sub(db, body.endpoint)
    if sub is None:
        sub = PushSubscription(endpoint=body.endpoint, muted_types=[])
        db.add(sub)
    sub.endpoint = body.endpoint
    sub.p256dh = body.keys.p256dh
    sub.auth = body.keys.auth
    db.commit()
    _record("resubscribed", None, sub.id, "browser rotated the push subscription")
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


@router.post("/ack")
def ack(body: PushAck, db: Session = Depends(get_db)):
    """The service worker calls this the moment a push reaches the device -
    it proves delivery (and stops the automatic re-send)."""
    key = body.nid.split("|", 1)[0]
    _set_setting(db, f"push_ack:{body.sid}:{key}", {"nid": body.nid, "at": datetime.now(timezone.utc).isoformat()})
    db.commit()
    _record("received", key, body.sid)
    return {"ok": True}


def _deferred_test(sub_id: int) -> None:
    db = SessionLocal()
    try:
        sub = db.get(PushSubscription, sub_id)
        if sub is None:
            return
        outcome, detail = _send(sub, _test_payload(sub))
        _record("test" if outcome == "ok" else "error", "test", sub.id, detail or "delayed test")
        if outcome == "gone":
            db.delete(sub)
            db.commit()
    finally:
        db.close()


def _test_payload(sub: PushSubscription) -> dict:
    title = "👶 Baby Monitor"
    body = "Сповіщення працюють" if sub.lang == "uk" else "Notifications are working"
    return {"title": title, "body": body, "tag": "test", "url": "/", "nid": f"test|{time.time():.0f}", "sid": sub.id, "renotify": True}


@router.post("/test")
def send_test(body: PushTest, db: Session = Depends(get_db)):
    sub = _get_sub(db, body.endpoint)
    if sub is None:
        raise HTTPException(404, "This device is not subscribed")
    if body.delay_seconds > 0:
        timer = threading.Timer(body.delay_seconds, _deferred_test, args=(sub.id,))
        timer.daemon = True
        timer.start()
        _record("test-scheduled", "test", sub.id, f"in {body.delay_seconds}s")
        return {"ok": True, "scheduled_in": body.delay_seconds}
    outcome, detail = _send(sub, _test_payload(sub))
    if outcome == "gone":
        db.delete(sub)
        db.commit()
        raise HTTPException(410, "The push service dropped this subscription - enable notifications again")
    if outcome != "ok":
        _record("error", "test", sub.id, detail)
        raise HTTPException(502, f"The push service rejected the message ({detail}) - check the server log")
    _record("test", "test", sub.id, "sent")
    return {"ok": True}


@router.get("/status")
def push_status(db: Session = Depends(get_db)):
    """Everything needed to see why a reminder did or didn't arrive: whether
    the background checker is alive, what is scheduled and when, and the most
    recent sends/receipts."""
    now = datetime.now(timezone.utc)
    tz = _profile_timezone(_get_profile_dict(db))
    schedule = []
    for ct in _effective_chore_types(db, enabled_only=True):
        last = _last_event(db, ct.key)
        info = _next_due_info(db, ct, last, tz)
        due = info["due"]
        lead = _push_lead_minutes(db, ct.key)
        entry = {
            "key": ct.key,
            "reminder_enabled": _reminder_enabled(db, ct.key),
            "lead_minutes": lead,
            "next_due": due.isoformat() if due else None,
            "notify_at": None,
            "state": "off" if not _reminder_enabled(db, ct.key) else ("none" if due is None else "scheduled"),
            "sent_at": None,
            "received": False,
        }
        if due is not None:
            notify_at = notify_at_for(due, lead, info["armed_at"])
            entry["notify_at"] = notify_at.isoformat()
            marker = db.get(Setting, f"push_notified:{ct.key}")
            if marker and marker.value.get("due_at") == due.isoformat():
                sent = marker.value.get("sent") or {}
                if sent:
                    entry["state"] = "sent"
                    entry["sent_at"] = datetime.fromtimestamp(max(s["last"] for s in sent.values()), timezone.utc).isoformat()
                    nid = f"{ct.key}|{due.isoformat()}"
                    entry["received"] = any(
                        (a := db.get(Setting, f"push_ack:{sid}:{ct.key}")) and a.value.get("nid") == nid for sid in sent
                    )
            if entry["state"] == "scheduled" and now - due > MAX_LATE:
                entry["state"] = "missed"  # already overdue by the time nothing was sent - skipped on purpose
        schedule.append(entry)

    last_run = _loop_state["last_run"]
    with _log_lock:
        recent = list(_recent)
    return {
        "loop": {
            "running": last_run is not None and time.time() - last_run < CHECK_EVERY_SECONDS * 4,
            "seconds_since_check": None if last_run is None else round(time.time() - last_run),
            "last_error": _loop_state["last_error"],
            "check_every_seconds": CHECK_EVERY_SECONDS,
        },
        "devices": db.query(PushSubscription).count(),
        "schedule": schedule,
        "recent": recent,
    }
