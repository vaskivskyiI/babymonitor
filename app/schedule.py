"""
Configurable reminder schedules - one per chore type, edited in the app.

A schedule is a plain dict (stored as the `schedule:<key>` setting):

    {"mode": "off"}                                   no reminder
    {"mode": "interval", "interval_minutes": 180}     N minutes after the last event
    {"mode": "times", "times": ["08:00", "11:30"],    aimed times of the day,
     "every_days": 1}                                 every day (or every N days)
    {"mode": "calendar_day"}                          once per calendar day (due again after midnight)

"once in 24h / 48h" is `times` with every_days 1 / 2 (or an interval of
1440 / 2880 minutes if no particular time of day matters).
"""
from __future__ import annotations

from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Optional

MODES = ("off", "interval", "times", "calendar_day")
# how early before an aimed time an event already counts for that slot
# (never more than half the gap to the previous slot)
EARLY_WINDOW_MINUTES = 60


def normalize(raw: Optional[dict]) -> dict:
    raw = raw or {}
    mode = raw.get("mode")
    if mode not in MODES:
        mode = "off"
    out: dict = {"mode": mode}
    if mode == "interval":
        m = raw.get("interval_minutes")
        out["interval_minutes"] = int(m) if isinstance(m, (int, float)) and m > 0 else None
        if out["interval_minutes"] is None:
            out = {"mode": "off"}
    elif mode == "times":
        times = sorted({t for t in (raw.get("times") or []) if _parse_hhmm(t) is not None})
        if not times:
            return {"mode": "off"}
        every = raw.get("every_days")
        out["times"] = times
        out["every_days"] = int(every) if isinstance(every, (int, float)) and 1 <= every <= 30 else 1
    return out


def from_legacy(interval_minutes: Optional[int], daily_reminder: bool) -> dict:
    """What a chore type did before schedules existed: probiotic-style
    once-per-day, an interval, or nothing."""
    if daily_reminder:
        return {"mode": "calendar_day"}
    if interval_minutes:
        return {"mode": "interval", "interval_minutes": int(interval_minutes)}
    return {"mode": "off"}


def _parse_hhmm(value) -> Optional[tuple[int, int]]:
    try:
        h, m = str(value).split(":")
        h, m = int(h), int(m)
    except (ValueError, AttributeError):
        return None
    return (h, m) if 0 <= h < 24 and 0 <= m < 60 else None


def _at(d: date, hhmm: str, tz) -> datetime:
    h, m = _parse_hhmm(hhmm)  # type: ignore[misc]
    return datetime.combine(d, dtime(h, m), tzinfo=tz).astimezone(timezone.utc)


def _slots(schedule: dict, first_day: date, days: int, tz) -> list[datetime]:
    """Aimed times (UTC, ascending) over `days` days from first_day."""
    out = []
    for i in range(days):
        for hhmm in schedule["times"]:
            out.append(_at(first_day + timedelta(days=i), hhmm, tz))
    return out


def _early(slots: list[datetime], i: int) -> timedelta:
    gap = (slots[i] - slots[i - 1]).total_seconds() / 60 if i > 0 else EARLY_WINDOW_MINUTES * 2
    return timedelta(minutes=min(EARLY_WINDOW_MINUTES, gap / 2))


def next_due(schedule: dict, last_ts: Optional[datetime], now: datetime, tz) -> Optional[datetime]:
    mode = schedule.get("mode")
    if mode == "interval":
        return last_ts + timedelta(minutes=schedule["interval_minutes"]) if last_ts else None
    if mode == "calendar_day":
        if last_ts is None:
            return None
        nxt = last_ts.astimezone(tz).date() + timedelta(days=1)
        return datetime.combine(nxt, dtime(0, 0), tzinfo=tz).astimezone(timezone.utc)
    if mode != "times":
        return None

    every = schedule.get("every_days", 1)
    today = now.astimezone(tz).date()
    if every > 1:
        # one round every N days, counted from the last event's day
        if last_ts is None:
            return _at(today, schedule["times"][0], tz)
        return _at(last_ts.astimezone(tz).date() + timedelta(days=every), schedule["times"][0], tz)

    start = (last_ts.astimezone(tz).date() if last_ts else today) - timedelta(days=1)
    slots = _slots(schedule, start, (today - start).days + 3, tz)
    for i, slot in enumerate(slots):
        if last_ts is not None and slot - _early(slots, i) <= last_ts:
            continue  # this slot was already covered by the last event
        if last_ts is None and slot < now:
            continue  # nothing logged yet: the next upcoming aimed time
        return slot
    return None


def slots_today(schedule: dict, event_times: list[datetime], now: datetime, tz) -> list[dict]:
    """Today's aimed times with whether an event already covered them."""
    if schedule.get("mode") != "times" or schedule.get("every_days", 1) != 1:
        return []
    today = now.astimezone(tz).date()
    slots = _slots(schedule, today - timedelta(days=1), 3, tz)  # yesterday, today, tomorrow
    out = []
    for i, slot in enumerate(slots):
        if slot.astimezone(tz).date() != today:
            continue
        lo = slot - _early(slots, i)
        hi = (slots[i + 1] - _early(slots, i + 1)) if i + 1 < len(slots) else lo + timedelta(days=1)
        hits = sorted(t for t in event_times if lo <= t < hi)
        out.append(
            {
                "time": slot.astimezone(tz).strftime("%H:%M"),
                "at": slot.isoformat(),
                "done_at": hits[0].isoformat() if hits else None,
                "missed": not hits and slot < now - timedelta(minutes=EARLY_WINDOW_MINUTES),
            }
        )
    return out
