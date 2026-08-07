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
