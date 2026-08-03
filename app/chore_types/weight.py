from datetime import date, timedelta

from app.chore_types.base import ChoreType, FieldDef, register
from app.reference_ranges import reference_range

MAX_IDEAL_DAYS = 450  # sanity cap so a very old birth date can't blow up the response


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
            step=10,
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        w = data.get("weight_g")
        return f"⚖️ {w}g" if w is not None else "⚖️ Weight"

    def stats_extra(self, events: list, tz, profile: dict) -> dict:
        readings = sorted(
            (
                (e.timestamp, e.data.get("weight_g"))
                for e in events
                if isinstance(e.data.get("weight_g"), (int, float))
            ),
            key=lambda r: r[0],
        )

        growth_rate = []
        for (t0, w0), (t1, w1) in zip(readings, readings[1:]):
            span_days = (t1 - t0).total_seconds() / 86400
            if span_days > 0:
                growth_rate.append(
                    {
                        "date": t1.astimezone(tz).date().isoformat(),
                        "timestamp": t1.isoformat(),
                        "g_per_day": round((w1 - w0) / span_days, 1),
                    }
                )

        trend = self._trend(readings, tz)
        ideal = self._ideal(readings, profile, tz)

        return {"growth_rate": growth_rate, "trend": trend, "ideal": ideal}

    def _trend(self, readings, tz) -> list[dict]:
        """Simple linear-regression best fit through actual readings,
        extrapolated a bit into the future."""
        if len(readings) < 2:
            return []
        x0 = readings[0][0]
        xs = [(t - x0).total_seconds() / 86400 for t, _ in readings]
        ys = [w for _, w in readings]
        n = len(xs)
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        denom = sum((x - mean_x) ** 2 for x in xs)
        if denom == 0:
            return []
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom
        intercept = mean_y - slope * mean_x

        extra_days = min(21, max(7, round(xs[-1] * 0.3)))
        points = []
        for x in xs:
            d = (x0 + timedelta(days=x)).astimezone(tz).date().isoformat()
            points.append({"date": d, "value": round(intercept + slope * x), "projected": False})
        for k in range(1, extra_days + 1):
            x = xs[-1] + k
            d = (x0 + timedelta(days=x)).astimezone(tz).date().isoformat()
            points.append({"date": d, "value": round(intercept + slope * x), "projected": True})
        return points

    def _ideal(self, readings, profile: dict, tz) -> list[dict]:
        """Expected trajectory integrating the mid-point of the age-based
        weight-gain reference range day by day, anchored at the baby's
        birth weight if known (falls back to the first actual reading)."""
        birth_date_str = profile.get("birth_date")
        if not birth_date_str:
            return []
        birth_date = date.fromisoformat(birth_date_str)

        start_weight = profile.get("birth_weight_g")
        start_date = birth_date
        if start_weight is None:
            if not readings:
                return []
            start_date = readings[0][0].astimezone(tz).date()
            start_weight = readings[0][1]

        last_reading_date = readings[-1][0].astimezone(tz).date() if readings else start_date
        end_date = max(last_reading_date, date.today()) + timedelta(days=14)
        if (end_date - birth_date).days > MAX_IDEAL_DAYS:
            end_date = birth_date + timedelta(days=MAX_IDEAL_DAYS)
        if end_date < start_date:
            return []

        points = []
        cur_low = cur_mid = cur_high = float(start_weight)
        d = start_date
        while d <= end_date:
            age = (d - birth_date).days
            ref = reference_range("weight", "gain_g_per_day", age)
            lo, hi = (ref["min"], ref["max"]) if ref else (8.0, 12.0)
            mid = (lo + hi) / 2
            points.append(
                {
                    "date": d.isoformat(),
                    "low": round(cur_low),
                    "value": round(cur_mid),
                    "high": round(cur_high),
                    "projected": d > last_reading_date,
                }
            )
            cur_low += lo
            cur_mid += mid
            cur_high += hi
            d += timedelta(days=1)
        return points
