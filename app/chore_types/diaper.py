from app.chore_types.base import ChoreType, FieldDef, register


@register
class DiaperChoreType(ChoreType):
    key = "diaper"
    label = "Diaper Change"
    icon = "🧷"
    default_interval_minutes = 180

    fields = [
        FieldDef(name="pee", label="Pee", type="boolean", numeric_stat=True),
        FieldDef(name="poop", label="Poop", type="boolean", numeric_stat=True),
        FieldDef(
            name="peed_during_change",
            label="Peed during the change",
            type="boolean",
            help="Baby peed while the diaper was off",
        ),
        FieldDef(
            name="pooped_during_change",
            label="Pooped during the change",
            type="boolean",
            help="Baby pooped while the diaper was off",
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        parts = []
        if data.get("pee"):
            parts.append("💧 Pee")
        if data.get("poop"):
            parts.append("💩 Poop")
        if not parts:
            parts.append("Dry change")
        extra = []
        if data.get("peed_during_change"):
            extra.append("peed during change")
        if data.get("pooped_during_change"):
            extra.append("pooped during change")
        summary = " + ".join(parts)
        if extra:
            summary += " (" + ", ".join(extra) + ")"
        return summary
