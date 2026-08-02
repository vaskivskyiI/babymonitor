from app.chore_types.base import ChoreType, FieldDef, register


@register
class PumpingChoreType(ChoreType):
    key = "pumping"
    label = "Pumping"
    icon = "🍶"
    default_interval_minutes = 240

    fields = [
        FieldDef(name="amount_ml", label="Amount", type="number", unit="ml", numeric_stat=True),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        amt = data.get("amount_ml")
        return f"🍶 Pumped {amt}ml" if amt else "🍶 Pumping"
