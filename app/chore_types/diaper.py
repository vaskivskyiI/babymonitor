from app.chore_types.base import ChoreType, FieldDef, register


@register
class DiaperChoreType(ChoreType):
    key = "diaper"
    label = "Diaper Change"
    icon = "🧷"
    default_interval_minutes = 180
    # a pee/poop during the change is still a pee/poop for "time since last"
    last_true_groups = {
        "pee": ["pee", "peed_during_change"],
        "poop": ["poop", "pooped_during_change"],
    }
    derived_counts = [
        {"name": "soiled", "label": "Wet or dirty diapers", "any_of": ["pee", "poop"]},
    ]

    fields = [
        FieldDef(name="pee", label="Pee", type="boolean", numeric_stat=True),
        FieldDef(name="poop", label="Poop", type="boolean", numeric_stat=True),
        FieldDef(
            name="peed_during_change",
            label="Peed during the change",
            type="boolean",
            help="Baby peed while the diaper was off",
            numeric_stat=True,
        ),
        FieldDef(
            name="pooped_during_change",
            label="Pooped during the change",
            type="boolean",
            help="Baby pooped while the diaper was off",
            numeric_stat=True,
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def quick_actions(self) -> list[dict]:
        return [
            {"label": "💧 Wet", "data": {"pee": True, "poop": False}},
            {"label": "💩 Dirty", "data": {"pee": False, "poop": True}},
            {"label": "💧💩 Both", "data": {"pee": True, "poop": True}},
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
