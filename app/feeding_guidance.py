"""
Rough age-based feeding guidance (amount per feed/day, feeds per day,
interval between feeds), used by the Stats page calculator.

General guidance for a full-term, otherwise-healthy baby - NOT medical
advice. Every baby is different; talk to your pediatrician about anything
specific to yours.

Bins are (min_age_days_inclusive, max_age_days_exclusive_or_None).
Amounts are in ml, applicable to breast milk or formula volume alike
(formula additionally has a weight-based rule, see `formula_amount_from_weight`).
"""
from typing import Optional

_SOURCES = [
    {"label": "Pampers baby feeding chart (AAP-based)", "url": "https://www.pampers.com/en-us/baby/feeding/article/baby-feeding-schedule"},
    {"label": "KellyMom - milk intake by age", "url": "https://kellymom.com/bf/pumpingmoms/pumping/milkcalc/"},
]

# (min_days, max_days_exclusive, per_feed_ml_low, per_feed_ml_high,
#  feeds_per_day_low, feeds_per_day_high, interval_hours_low, interval_hours_high,
#  total_ml_low, total_ml_high, note)
_BINS: list[tuple] = [
    (0, 1, 10, 15, 8, 12, 2, 3, 60, 100, "Day 1: tiny, very frequent feeds are completely normal."),
    (1, 4, 15, 45, 8, 12, 2, 3, 250, 500, "Volume increases quickly over the first few days."),
    (4, 7, 45, 60, 8, 12, 2, 3, 500, 600, ""),
    (7, 30, 60, 90, 8, 12, 2, 3, 600, 800, ""),
    (30, 90, 90, 150, 6, 8, 3, 3, 700, 900, ""),
    (90, 180, 120, 180, 5, 6, 3, 4, 750, 900, ""),
    (180, 365, 180, 240, 4, 5, 4, 5, 500, 950, "Solids are usually introduced around 6 months; milk volume may naturally taper as solids increase."),
]

# AAP rule-of-thumb for formula: ~2.5 oz per lb of body weight per day, capped at 32 oz/day.
_FORMULA_ML_PER_KG_DAY = 165.3  # 2.5 oz/lb -> ml/kg
_FORMULA_MAX_ML_DAY = 960  # 32 oz


def feeding_guidance(age_days: Optional[int], weight_g: Optional[float] = None) -> Optional[dict]:
    if age_days is None or age_days < 0:
        return None
    binned = None
    for lo, hi, *_rest in _BINS:
        if age_days >= lo and (hi is None or age_days < hi):
            binned = (lo, hi, *_rest)
            break
    if binned is None:
        return None
    _, _, feed_lo, feed_hi, freq_lo, freq_hi, int_lo, int_hi, day_lo, day_hi, note = binned

    result = {
        "age_days": age_days,
        "per_feed_ml": {"min": feed_lo, "max": feed_hi},
        "per_day_ml": {"min": day_lo, "max": day_hi},
        "feeds_per_day": {"min": freq_lo, "max": freq_hi},
        "interval_hours": {"min": int_lo, "max": int_hi},
        "note": note,
        "sources": _SOURCES,
    }

    if weight_g and weight_g > 0:
        weight_kg = weight_g / 1000
        formula_day_ml = min(weight_kg * _FORMULA_ML_PER_KG_DAY, _FORMULA_MAX_ML_DAY)
        feeds_mid = (freq_lo + freq_hi) / 2
        result["formula_weight_based"] = {
            "per_day_ml": round(formula_day_ml),
            "per_feed_ml": round(formula_day_ml / feeds_mid) if feeds_mid else None,
            "basis": "~2.5 oz per lb of body weight per day (AAP rule of thumb), capped at 32 oz/day",
        }

    return result
