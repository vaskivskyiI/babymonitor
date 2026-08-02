from app.chore_types.base import ChoreType, FieldDef, register


@register
class WeightChoreType(ChoreType):
    key = "weight"
    label = "Weight"
    icon = "⚖️"
    # weekly weigh-in is a common cadence; fully configurable in Settings
    default_interval_minutes = 7 * 24 * 60
    interval_configurable = True

    fields = [
        FieldDef(
            name="weight_g",
            label="Weight",
            type="number",
            unit="g",
            required=True,
            numeric_stat=True,
            stat_agg="last",
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        w = data.get("weight_g")
        return f"⚖️ {w}g" if w is not None else "⚖️ Weight"

    def stats_extra(self, events: list, tz) -> dict:
        readings = [
            (e.timestamp, e.data.get("weight_g"))
            for e in events
            if isinstance(e.data.get("weight_g"), (int, float))
        ]
        readings.sort(key=lambda r: r[0])
        rates = []
        for (t0, w0), (t1, w1) in zip(readings, readings[1:]):
            span_days = (t1 - t0).total_seconds() / 86400
            if span_days > 0:
                rates.append(
                    {
                        "date": t1.astimezone(tz).date().isoformat(),
                        "timestamp": t1.isoformat(),
                        "g_per_day": round((w1 - w0) / span_days, 1),
                    }
                )
        return {"growth_rate": rates}
