from datetime import datetime, timedelta, timezone
from typing import Optional

from app.chore_types.base import ChoreType, FieldDef, register


@register
class ProbioticChoreType(ChoreType):
    key = "probiotic"
    label = "Probiotic"
    icon = "💊"
    # "once per day" means due again at the start of the next calendar day,
    # not simply 24 hours after the last dose - so there's no minutes-based
    # interval to configure.
    default_interval_minutes = None
    interval_configurable = False
    fixed_reminder_note = "Due once per calendar day"

    fields = [
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def next_due(self, last_timestamp: Optional[datetime], interval_minutes, tz) -> Optional[datetime]:
        if last_timestamp is None:
            return None
        local_last = last_timestamp.astimezone(tz)
        next_day_start = (local_last + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return next_day_start.astimezone(timezone.utc)

    def summarize(self, data: dict) -> str:
        return "💊 Given"
