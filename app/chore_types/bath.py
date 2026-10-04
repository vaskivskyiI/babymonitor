from app.chore_types.base import ChoreType, FieldDef, register


@register
class BathChoreType(ChoreType):
    key = "bath"
    label = "Bath"
    icon = "🛁"
    # no fixed reminder - bathing isn't on a rolling interval
    default_interval_minutes = None

    fields = [
        FieldDef(name="soap", label="With soap", type="boolean", numeric_stat=True),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def quick_actions(self) -> list[dict]:
        return [
            {"label": "🛁 Bath", "data": {"soap": False}},
            {"label": "🧼 Bath with soap", "data": {"soap": True}},
        ]

    def summarize(self, data: dict) -> str:
        return "🧼 Bath with soap" if data.get("soap") else "🛁 Bath"
