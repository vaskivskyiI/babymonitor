from datetime import datetime, timezone

from app.chore_types.base import ChoreType, FieldDef, FieldOption, register


def _parse_ts(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


@register
class FeedingChoreType(ChoreType):
    key = "feeding"
    label = "Feeding"
    icon = "🍼"
    default_interval_minutes = 180

    # A feeding is a session: you can keep adding timestamped checkpoints
    # (weight / amount / type) to the same feeding as it happens, e.g.
    # while switching breasts, rather than filling in one static form.
    session_window_configurable = True
    default_session_window_minutes = 45

    fields = [
        FieldDef(
            name="entries",
            label="Checkpoints",
            type="entries",
            help="Add one per switch / top-up as the feeding happens. Weigh before "
            "and after each breast sub-step (dressed weight is fine - only the "
            "difference is used) and the amount is calculated automatically; "
            "the next sub-step's 'before' is pre-filled from this one's 'after'.",
            entry_fields=[
                FieldDef(
                    name="method",
                    label="Type",
                    type="select",
                    required=True,
                    default="breast",
                    options=[
                        FieldOption(value="breast", label="Breast"),
                        FieldOption(value="breast_left", label="Breast (left)"),
                        FieldOption(value="breast_right", label="Breast (right)"),
                        FieldOption(value="formula", label="Formula"),
                    ],
                ),
                FieldDef(
                    name="weight_before_g",
                    label="Weight before",
                    type="number",
                    unit="g",
                    carry_from="weight_after_g",
                ),
                FieldDef(name="weight_after_g", label="Weight after", type="number", unit="g"),
                FieldDef(name="amount_ml", label="Amount", type="number", unit="ml"),
                FieldDef(name="note", label="Note", type="text"),
            ],
        ),
        FieldDef(
            name="total_breast_amount_ml",
            label="Total breast milk",
            type="number",
            unit="ml",
            numeric_stat=True,
            computed=True,
        ),
        FieldDef(
            name="total_formula_amount_ml",
            label="Total formula",
            type="number",
            unit="ml",
            numeric_stat=True,
            computed=True,
        ),
        FieldDef(
            name="total_amount_ml",
            label="Total food",
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

        weighed_deltas = []
        for e in entries:
            wb, wa = e.get("weight_before_g"), e.get("weight_after_g")
            if isinstance(wb, (int, float)) and isinstance(wa, (int, float)):
                delta = wa - wb
                if delta > 0:
                    weighed_deltas.append(delta)
        total_breast = round(sum(weighed_deltas)) if weighed_deltas else None
        if total_breast is None:
            manual = [
                e["amount_ml"]
                for e in entries
                if str(e.get("method", "")).startswith("breast") and isinstance(e.get("amount_ml"), (int, float))
            ]
            if manual:
                total_breast = round(sum(manual))
        data["total_breast_amount_ml"] = total_breast

        formula_amounts = [
            e["amount_ml"]
            for e in entries
            if e.get("method") == "formula" and isinstance(e.get("amount_ml"), (int, float))
        ]
        data["total_formula_amount_ml"] = round(sum(formula_amounts)) if formula_amounts else None

        total = (data["total_breast_amount_ml"] or 0) + (data["total_formula_amount_ml"] or 0)
        data["total_amount_ml"] = total or None
        return data

    def last_activity(self, data: dict, fallback: datetime) -> datetime:
        timestamps = [t for e in (data.get("entries") or []) if (t := _parse_ts(e.get("timestamp")))]
        return max(timestamps) if timestamps else fallback

    def summarize(self, data: dict) -> str:
        entries = data.get("entries") or []
        methods = {e.get("method") for e in entries}
        parts = []
        if any(m and m.startswith("breast") for m in methods):
            tb = data.get("total_breast_amount_ml")
            parts.append("🤱 Breast" + (f" {tb}ml" if tb else ""))
        if "formula" in methods:
            tf = data.get("total_formula_amount_ml")
            parts.append("🍼 Formula" + (f" {tf}ml" if tf else ""))
        summary = " + ".join(parts) if parts else "Feeding"
        n = len(entries)
        if n > 1:
            summary += f" ({n} checkpoints)"
        return summary
