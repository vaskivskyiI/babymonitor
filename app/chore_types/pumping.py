from datetime import datetime, timezone

from app.chore_types.base import ChoreType, FieldDef, FieldOption, register


def _parse_ts(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


@register
class PumpingChoreType(ChoreType):
    key = "pumping"
    label = "Pumping"
    icon = "🍶"
    default_interval_minutes = 240

    fields = [
        FieldDef(
            name="entries",
            label="Sub-steps",
            type="entries",
            help="Add one per side/session, e.g. left then right, each with its own amount and duration.",
            entry_fields=[
                FieldDef(
                    name="side",
                    label="Side",
                    type="select",
                    required=True,
                    default="left",
                    options=[
                        FieldOption(value="left", label="Left"),
                        FieldOption(value="right", label="Right"),
                        FieldOption(value="both", label="Both"),
                    ],
                ),
                FieldDef(name="amount_ml", label="Amount", type="number", unit="ml", step=5),
                FieldDef(name="duration_min", label="Duration", type="number", unit="min", step=1),
            ],
        ),
        FieldDef(
            name="total_amount_ml",
            label="Total amount",
            type="number",
            unit="ml",
            numeric_stat=True,
            computed=True,
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def compute_derived(self, data: dict, timestamp: datetime) -> dict:
        entries = [e for e in (data.get("entries") or []) if e]
        entries.sort(key=lambda e: _parse_ts(e.get("timestamp")) or datetime.min.replace(tzinfo=timezone.utc))
        data["entries"] = entries

        amounts = [e["amount_ml"] for e in entries if isinstance(e.get("amount_ml"), (int, float))]
        data["total_amount_ml"] = round(sum(amounts)) if amounts else None
        return data

    def summarize(self, data: dict) -> str:
        total = data.get("total_amount_ml")
        entries = data.get("entries") or []
        summary = f"🍶 {total}ml" if total else "🍶 Pumping"
        if len(entries) > 1:
            summary += f" ×{len(entries)}"
        return summary
