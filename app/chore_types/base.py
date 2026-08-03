"""
Plugin system for "chore types" (diaper change, feeding, ...).

To add a new chore type: create a new module in this package, subclass
ChoreType, describe its input fields declaratively, and decorate the
class with @register. The frontend renders forms and stats automatically
from the field definitions returned by GET /api/chore-types - no frontend
changes needed for a new type.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from pydantic import BaseModel


class FieldOption(BaseModel):
    value: str
    label: str


class FieldDef(BaseModel):
    name: str
    label: str
    # text | number | boolean | select | textarea | number_list | entries | datetime
    type: str
    unit: Optional[str] = None
    required: bool = False
    options: Optional[list[FieldOption]] = None
    default: Optional[Any] = None
    help: Optional[str] = None
    # if true, this field is included in stats aggregation (numbers, and
    # booleans - where True counts as 1, e.g. "wet diapers per day")
    numeric_stat: bool = False
    # how numeric_stat values are combined per day: "sum" (default, e.g. ml,
    # counts), "avg", or "last" (e.g. a weight reading - not additive)
    stat_agg: str = "sum"
    # if true, the field is derived by compute_derived() and not user-editable
    computed: bool = False
    # step size for the +/- stepper shown on "number" fields (also used
    # within entries), so common values can be tapped instead of typed
    step: float = 1
    # only for type == "entries": schema for each item in the repeatable list.
    # Every entry automatically also gets a "timestamp" (datetime).
    entry_fields: Optional[list["FieldDef"]] = None
    # only within entry_fields: when adding a new entry, prefill this field
    # from the *previous* entry's field of this name (e.g. a weight-before
    # field carrying forward the previous entry's weight-after reading).
    carry_from: Optional[str] = None


FieldDef.model_rebuild()


REGISTRY: dict[str, "ChoreType"] = {}


def register(cls):
    instance = cls()
    REGISTRY[instance.key] = instance
    return cls


class ChoreType:
    key: str = ""
    label: str = ""
    icon: str = ""
    fields: list[FieldDef] = []
    # default reminder interval in minutes; None = no "next due" tracking
    default_interval_minutes: Optional[int] = None
    interval_configurable: bool = True
    # shown in Settings instead of a minutes input when interval_configurable
    # is False but there's still a real (just non-numeric) reminder concept,
    # e.g. probiotic's "once per calendar day"
    fixed_reminder_note: Optional[str] = None
    # True for "once per calendar day" reminders (resets at local midnight,
    # not 24h after the last dose) - the frontend shows "Tomorrow" instead
    # of a countdown when satisfied, and an overdue-by-24h reference when not
    daily_reminder: bool = False

    # "Session" support: lets a chore type keep appending timestamped
    # checkpoints (via an "entries" field) to the same event instead of
    # always creating a new one, e.g. a feeding with several weigh-ins.
    # If enabled, the dashboard offers "add checkpoint" instead of
    # "log now" while the last event is still within the session window.
    session_window_configurable: bool = False
    default_session_window_minutes: Optional[int] = None

    # "Start/end" support: the event's own timestamp marks the start, and a
    # designated field (see is_open()) marks the end - e.g. sleep. While the
    # last event has no end recorded yet, the dashboard offers "End X"
    # instead of "Start X".
    has_start_end: bool = False

    def compute_derived(self, data: dict, timestamp: datetime) -> dict:
        """Hook to fill in computed fields (e.g. amount from weights, or
        duration from timestamp/end fields) before saving. `timestamp` is
        the event's own (start) time."""
        return data

    def is_open(self, data: dict) -> bool:
        """For has_start_end types: True if this event has no end recorded yet."""
        return False

    def quick_actions(self) -> list[dict]:
        """Optional one-tap dashboard presets: [{"label": str, "data": dict}].
        Logged instantly with the current timestamp - no form needed. For
        types where a form is unavoidable (numeric input, checkpoints),
        leave this empty and rely on the regular log/checkpoint button."""
        return []

    def summarize(self, data: dict) -> str:
        """Short human readable summary of an event, used in history/cards."""
        return self.label

    def numeric_fields(self) -> list[FieldDef]:
        return [f for f in self.fields if f.numeric_stat]

    def next_due(self, last_timestamp: Optional[datetime], interval_minutes: Optional[int], tz) -> Optional[datetime]:
        """`tz` is the profile's timezone, for chore types whose "next due"
        depends on calendar days rather than a rolling interval (e.g.
        `probiotic`'s once-per-day reset)."""
        if last_timestamp is None or not interval_minutes:
            return None
        return last_timestamp + timedelta(minutes=interval_minutes)

    def last_activity(self, data: dict, fallback: datetime) -> datetime:
        """Most recent timestamp within this event, used to decide whether a
        session is still open. Defaults to the event's own timestamp."""
        return fallback

    def stats_extra(self, events: list, tz, profile: dict) -> dict:
        """Hook for extra derived series in GET /api/stats/{key}, beyond the
        per-day numeric_stat aggregation (e.g. weight-gain rate, trend
        extrapolation, and an "ideal" reference trajectory for `weight`,
        computed from consecutive readings and the baby profile)."""
        return {}

    def as_dict(self, interval_minutes: Optional[int], session_window_minutes: Optional[int] = None) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "icon": self.icon,
            "fields": [f.model_dump() for f in self.fields],
            "interval_minutes": interval_minutes,
            "interval_configurable": self.interval_configurable,
            "fixed_reminder_note": self.fixed_reminder_note,
            "daily_reminder": self.daily_reminder,
            "session_window_configurable": self.session_window_configurable,
            "session_window_minutes": session_window_minutes,
            "has_start_end": self.has_start_end,
            "quick_actions": self.quick_actions(),
        }


def load_builtin_types() -> None:
    # importing the modules triggers @register
    from app.chore_types import (  # noqa: F401
        diaper,
        feeding,
        height,
        probiotic,
        pumping,
        sleep,
        weight,
    )
