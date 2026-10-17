from app.chore_types.base import ChoreType, FieldDef, register


@register
class WaterChoreType(ChoreType):
    key = "water"
    label = "Water"
    icon = "🚰"
    # drinks aren't on a rolling schedule - no "next due"
    default_interval_minutes = None
    board_weights = {"count": 0.5, "amount_ml": 0.5}
    adaptive_amount_field = "amount_ml"
    default_amounts = [10, 30, 50, 100]

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

    def amount_quick_actions(self, amounts: list) -> list[dict]:
        return [{"label": f"🚰 {ml} ml", "data": {"amount_ml": ml}} for ml in amounts]

    def quick_actions(self) -> list[dict]:
        return self.amount_quick_actions(self.default_amounts)

    def summarize(self, data: dict) -> str:
        ml = data.get("amount_ml")
        return f"🚰 {ml}ml" if ml is not None else "🚰 Water"
