from app.chore_types.base import ChoreType, FieldDef, register


@register
class WaterChoreType(ChoreType):
    key = "water"
    label = "Water"
    icon = "🚰"
    # drinks aren't on a rolling schedule - no "next due"
    default_interval_minutes = None

    fields = [
        FieldDef(
            name="amount_ml",
            label="Water",
            type="number",
            unit="ml",
            numeric_stat=True,
            step=5,
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def quick_actions(self) -> list[dict]:
        return [{"label": f"🚰 {ml} ml", "data": {"amount_ml": ml}} for ml in (10, 30, 50, 100)]

    def summarize(self, data: dict) -> str:
        ml = data.get("amount_ml")
        return f"🚰 {ml}ml" if ml is not None else "🚰 Water"
