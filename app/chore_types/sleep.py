from datetime import datetime, time, timedelta, timezone

from app.chore_types.base import ChoreType, FieldDef, format_duration_minutes, register


def _parse_ts(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


@register
class SleepChoreType(ChoreType):
    key = "sleep"
    label = "Sleep"
    icon = "😴"
    # no fixed reminder interval for sleep
    default_interval_minutes = None
    interval_configurable = False

    # A sleep event's own timestamp is the start; mark the end via
    # `ended_at` and duration is computed automatically.
    has_start_end = True

    fields = [
        FieldDef(name="ended_at", label="Woke up at", type="datetime"),
        FieldDef(
            name="duration_minutes",
            label="Duration",
            type="number",
            unit="min",
            numeric_stat=True,
            stat_agg="sum",
            computed=True,
            display="duration",
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def compute_derived(self, data: dict, timestamp: datetime) -> dict:
        ended = _parse_ts(data.get("ended_at"))
        if ended:
            start = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=timezone.utc)
            duration = (ended - start).total_seconds() / 60
            data["duration_minutes"] = round(duration) if duration > 0 else None
        else:
            data["duration_minutes"] = None
        return data

    def is_open(self, data: dict) -> bool:
        return not data.get("ended_at")

    def split_across_days(self, data: dict, start: datetime, tz) -> dict[str, dict[str, float]] | None:
        ended = _parse_ts(data.get("ended_at"))
        if not ended:
            return None  # still open - no duration to attribute yet
        start_local = start.astimezone(tz)
        end_local = ended.astimezone(tz)
        if start_local.date() == end_local.date():
            return None  # didn't cross midnight - default single-day path is fine

        result: dict[str, dict[str, float]] = {}
        cur = start_local
        for _ in range(32):  # sanity cap - a sleep spanning a month would be a data error, not real use
            next_midnight = datetime.combine(cur.date() + timedelta(days=1), time.min, tzinfo=tz)
            segment_end = min(end_local, next_midnight)
            minutes = (segment_end - cur).total_seconds() / 60
            if minutes > 0:
                result[cur.date().isoformat()] = {"duration_minutes": round(minutes)}
            cur = segment_end
            if cur >= end_local:
                break
        return result

    def summarize(self, data: dict) -> str:
        if data.get("ended_at"):
            dur = data.get("duration_minutes")
            return f"😴 Slept {format_duration_minutes(dur)}" if dur else "😴 Sleep"
        return "😴 Sleeping..."


# ---------------------------------------------------------------------------
# Detailed sleep tracking: how long the last sleep was, how long the baby has
# been awake, and how regular the rhythm is.
# ---------------------------------------------------------------------------

import statistics

from app.models import as_utc


def _utc(value) -> datetime | None:
    dt = _parse_ts(value)
    return as_utc(dt) if dt else None


def _sleep_span(event) -> tuple[datetime, datetime] | None:
    """(start, end) of a finished sleep event, else None."""
    start = as_utc(event.timestamp)
    end = _utc(event.data.get("ended_at"))
    if start is None or end is None or end <= start or (end - start) > timedelta(hours=20):
        return None
    return start, end


def _status_extra(self, events, now):
    out: dict = {}
    if not events:
        return out
    done = [(e, sp) for e, sp in ((e, _sleep_span(e)) for e in events) if sp]
    first = events[0]
    sleeping = not first.data.get("ended_at")
    if done:
        out["last_sleep_minutes"] = round((done[0][1][1] - done[0][1][0]).total_seconds() / 60)
        out["last_sleep_ended_at"] = done[0][1][1].isoformat()
    if sleeping:
        start = as_utc(first.timestamp)
        out["sleeping_minutes"] = max(0, round((now - start).total_seconds() / 60))
        if done:
            out["awake_before_minutes"] = max(0, round((start - done[0][1][1]).total_seconds() / 60))
    elif done:
        out["awake_minutes"] = max(0, round((now - done[0][1][1]).total_seconds() / 60))
        if len(done) > 1:
            out["awake_before_minutes"] = max(0, round((done[0][1][0] - done[1][1][1]).total_seconds() / 60))
    return out


def _reminder_anchor(self, data, timestamp):
    # awake windows are counted from waking up; nothing to remind while asleep
    return _utc(data.get("ended_at"))


# (age in days below which it applies, awake window min, max in minutes) -
# rough, commonly cited guidance only
_AWAKE_REF = [
    (30, 30, 60),
    (60, 45, 90),
    (122, 60, 120),
    (183, 90, 150),
    (274, 120, 180),
    (365, 150, 210),
    (548, 180, 300),
    (730, 240, 360),
    (10**6, 300, 420),
]


def sleep_reference(age_days):
    """Typical awake window (minutes) and total sleep per 24h (hours) for the
    age of the baby - not medical advice."""
    if age_days is None or age_days < 0:
        return None
    awake = next((r for r in _AWAKE_REF if age_days < r[0]), _AWAKE_REF[-1])
    if age_days < 122:
        total = (14, 17)
    elif age_days < 365:
        total = (12, 15)
    elif age_days < 1095:
        total = (11, 14)
    else:
        total = (10, 13)
    return {"awake_min": awake[1], "awake_max": awake[2], "total_min_h": total[0], "total_max_h": total[1]}


def _is_night(start_local: datetime, minutes: float) -> bool:
    h = start_local.hour
    return h >= 19 or h < 5 or (minutes >= 240 and h >= 17)


def _mean_sd(values):
    if not values:
        return None, None
    return statistics.fmean(values), (statistics.pstdev(values) if len(values) > 1 else 0.0)


def _minute_of_day(dt: datetime, tz) -> int:
    local = dt.astimezone(tz)
    return local.hour * 60 + local.minute


def _stats_extra(self, events, tz, profile):
    spans = sorted((sp for sp in (_sleep_span(e) for e in events) if sp), key=lambda s: s[0])
    if not spans:
        return {}
    now = datetime.now(timezone.utc)
    age_days = None
    if profile.get("birth_date"):
        from datetime import date as _date

        age_days = (now.astimezone(tz).date() - _date.fromisoformat(profile["birth_date"])).days
    ref = sleep_reference(age_days)

    durations = [(e - s).total_seconds() / 60 for s, e in spans]

    # awake windows: end of one sleep -> start of the next (gaps over 16 h are missing data)
    windows = []
    for (s0, e0), (s1, _e1) in zip(spans, spans[1:]):
        gap = (s1 - e0).total_seconds() / 60
        if 0 < gap <= 16 * 60:
            windows.append({"start": e0.isoformat(), "minutes": round(gap), "tod": _minute_of_day(e0, tz)})

    # per day: totals split at midnight, naps (day sleeps) and night sleep
    per: dict[str, dict] = {}

    def day(d):
        return per.setdefault(
            d, {"date": d, "total_min": 0.0, "night_min": 0.0, "day_min": 0.0, "naps": 0, "longest_min": 0.0}
        )

    segments: dict[str, list] = {}
    hours = [0.0] * 24
    for (s, e), dur in zip(spans, durations):
        s_l, e_l = s.astimezone(tz), e.astimezone(tz)
        night = _is_night(s_l, dur)
        d0 = day(s_l.date().isoformat())
        d0["longest_min"] = max(d0["longest_min"], dur)
        if not night:
            d0["naps"] += 1
        cur = s_l
        while cur < e_l:
            nxt = min(e_l, datetime.combine(cur.date() + timedelta(days=1), time.min, tzinfo=tz))
            m = (nxt - cur).total_seconds() / 60
            dd = day(cur.date().isoformat())
            dd["total_min"] += m
            dd["night_min" if night else "day_min"] += m
            start_min = cur.hour * 60 + cur.minute
            segments.setdefault(cur.date().isoformat(), []).append([start_min, min(1440, start_min + round(m))])
            # typical-day profile: minutes asleep per clock hour
            t = cur
            while t < nxt:
                hr_end = min(nxt, t.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
                hours[t.hour] += (hr_end - t).total_seconds() / 60
                t = hr_end
            cur = nxt

    # nights: a night's sleeps grouped by the evening's date (start - 12h)
    nights: dict[str, list] = {}
    for (s, e), dur in zip(spans, durations):
        s_l = s.astimezone(tz)
        if _is_night(s_l, dur):
            nights.setdefault((s_l - timedelta(hours=12)).date().isoformat(), []).append((s_l, e.astimezone(tz), dur))
    bed, wake, night_rows = [], [], []
    for key, group in sorted(nights.items()):
        if sum(g[2] for g in group) < 120:
            continue
        first_start, last_end = group[0][0], group[-1][1]
        b = first_start.hour * 60 + first_start.minute
        b = b + 1440 if b < 720 else b  # after-midnight bedtimes sort after evening ones
        w = last_end.hour * 60 + last_end.minute
        bed.append(b)
        wake.append(w)
        night_rows.append({"date": key, "bedtime_min": b % 1440, "wake_min": w, "wakeups": len(group) - 1})
        day(key)["bedtime_min"] = b % 1440
        day(key)["wake_min"] = w

    b_mean, b_sd = _mean_sd(bed)
    w_mean, w_sd = _mean_sd(wake)
    regularity = None
    if b_sd is not None and w_sd is not None and len(bed) >= 3:
        # no drift = 100; an hour and a half or more = 0
        regularity = round(max(0.0, min(100.0, 100 - (max(0.0, (b_sd + w_sd) / 2 - 10) / 80) * 100)))

    days_sorted = sorted(per.values(), key=lambda d: d["date"])
    for d in days_sorted:
        for k in ("total_min", "night_min", "day_min", "longest_min"):
            d[k] = round(d[k])
    today = now.astimezone(tz).date().isoformat()
    full_days = [d for d in days_sorted if d["date"] != today and d["total_min"] > 0]
    awake_mins = [w["minutes"] for w in windows]
    in_range = None
    if ref and awake_mins:
        ok = [w for w in awake_mins if ref["awake_min"] <= w <= ref["awake_max"]]
        in_range = round(100 * len(ok) / len(awake_mins))

    n_days = max(1, len({d["date"] for d in days_sorted}))
    return {
        "sleep_analysis": {
            "count": len(spans),
            "avg_sleep_minutes": round(statistics.fmean(durations)),
            "median_sleep_minutes": round(statistics.median(durations)),
            "longest_sleep_minutes": round(max(durations)),
            "avg_awake_minutes": round(statistics.fmean(awake_mins)) if awake_mins else None,
            "median_awake_minutes": round(statistics.median(awake_mins)) if awake_mins else None,
            "longest_awake_minutes": max(awake_mins) if awake_mins else None,
            "avg_total_per_day_minutes": round(statistics.fmean([d["total_min"] for d in full_days])) if full_days else None,
            "avg_naps_per_day": round(statistics.fmean([d["naps"] for d in full_days]), 1) if full_days else None,
            "bedtime": {"mean_min": round(b_mean) % 1440, "sd_min": round(b_sd), "n": len(bed)} if bed else None,
            "wake": {"mean_min": round(w_mean), "sd_min": round(w_sd), "n": len(wake)} if wake else None,
            "regularity": regularity,
            "awake_in_range_pct": in_range,
            "ref": ref,
            "age_days": age_days,
            "per_day": days_sorted,
            "awake_windows": windows,
            "nights": night_rows,
            "hour_profile": [round(100 * h / (60 * n_days)) for h in hours],
            "timeline": [{"date": d, "segs": segments[d]} for d in sorted(segments)[-14:]],
            "avg_wakeups_per_night": round(statistics.fmean([n["wakeups"] for n in night_rows]), 1) if night_rows else None,
        }
    }


SleepChoreType.wants_status_extra = True
SleepChoreType.status_extra = _status_extra
SleepChoreType.reminder_anchor = _reminder_anchor
SleepChoreType.stats_extra = _stats_extra
