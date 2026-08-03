"""
Runtime (DB-backed) chore types created from the Settings tab, as opposed
to the Python plugins under app/chore_types/. These are intentionally
simple - a flat list of fields, no sessions/start-end/derived-stats - so
they can be fully described by data instead of code.
"""
from app.chore_types.base import ChoreType, FieldDef


class DynamicChoreType(ChoreType):
    def __init__(self, key: str, label: str, icon: str, fields: list[FieldDef], interval_minutes: int | None):
        self.key = key
        self.label = label
        self.icon = icon
        self.fields = fields
        self.default_interval_minutes = interval_minutes
        self.interval_configurable = True

    def summarize(self, data: dict) -> str:
        parts = []
        for f in self.fields:
            val = data.get(f.name)
            if f.type == "boolean":
                if val:
                    parts.append(f.label)
            elif val not in (None, ""):
                if f.type == "select" and f.options:
                    opt = next((o for o in f.options if o.value == val), None)
                    val = opt.label if opt else val
                parts.append(f"{f.label}: {val}{f.unit or ''}")
        return f"{self.icon} " + (", ".join(parts) if parts else self.label)
