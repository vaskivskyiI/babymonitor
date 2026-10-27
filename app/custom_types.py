"""
Runtime (DB-backed) chore types created from the Settings tab, as opposed
to the Python plugins under app/chore_types/. These are intentionally
simple - a flat list of fields, no sessions/start-end/derived-stats - so
they can be fully described by data instead of code.
"""
from datetime import datetime, timezone

from app.chore_types.base import ChoreType, FieldDef, format_duration_minutes


def _parse(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


class DynamicChoreType(ChoreType):
    def __init__(
        self,
        key: str,
        label: str,
        icon: str,
        fields: list[FieldDef],
        interval_minutes: int | None,
        has_start_end: bool = False,
    ):
        self.key = key
        self.label = label
        self.icon = icon
        self.fields = list(fields)
        self.default_interval_minutes = interval_minutes
        self.interval_configurable = True
        self.has_start_end = has_start_end
        if has_start_end:
            # same shape as sleep: the event time is the start, `ended_at` the end
            self.fields += [
                FieldDef(name="ended_at", label="Ended at", type="datetime"),
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
            ]

    def compute_derived(self, data: dict, timestamp: datetime) -> dict:
        if not self.has_start_end:
            return data
        ended = _parse(data.get("ended_at"))
        if ended:
            start = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=timezone.utc)
            minutes = (ended - start).total_seconds() / 60
            data["duration_minutes"] = round(minutes) if minutes > 0 else None
        else:
            data["duration_minutes"] = None
        return data

    def is_open(self, data: dict) -> bool:
        return self.has_start_end and not data.get("ended_at")

    def reminder_anchor(self, data: dict, timestamp):
        return _parse(data.get("ended_at")) if self.has_start_end else timestamp

    def summarize(self, data: dict) -> str:
        if self.has_start_end and not data.get("ended_at"):
            return f"{self.icon} {self.label}..."
        parts = []
        for f in self.fields:
            val = data.get(f.name)
            if f.type == "boolean":
                if val:
                    parts.append(f.label)
            elif f.name in ("ended_at", "duration_minutes") and self.has_start_end:
                if f.name == "duration_minutes" and val:
                    parts.append(format_duration_minutes(val))
            elif val not in (None, ""):
                if f.type == "select" and f.options:
                    opt = next((o for o in f.options if o.value == val), None)
                    val = opt.label if opt else val
                parts.append(f"{f.label}: {val}{f.unit or ''}")
        return f"{self.icon} " + (", ".join(parts) if parts else self.label)
