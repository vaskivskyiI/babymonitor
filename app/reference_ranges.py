"""
"Healthy range" guidance used to draw reference bands on the Stats charts and
to judge whether a value is in range.

These are rough, commonly-cited ranges for a full-term, otherwise healthy
baby - NOT medical advice. Always defer to your pediatrician for anything
specific to your baby. Sources are attached to each range so they show up
in the UI next to the chart.

Covered (chore type, field):
  diaper   pee / poop            wet & dirty diapers per day, by age
  feeding  count                 feeds per day, by age
  feeding  total_amount_ml       milk/formula per day, by age
  sleep    duration_minutes      total sleep per day (naps included), by age
  weight   weight_g              WHO weight-for-age, -2..+2 SD (~3rd-97th pct)
  height   height_cm             WHO length/height-for-age, -2..+2 SD
  weight   gain_g_per_day        weight gain rate, by age

Every range is a function of the baby's age in days (and, for the WHO growth
curves, sex - if it isn't set the band spans both sexes).
"""
import math
from bisect import bisect_right
from typing import Optional

from app import growth_data
from app.feeding_guidance import feeding_guidance

_SOURCES = {
    "diaper_pee": {
        "source_label": "AAP newborn wet-diaper guidance",
        "source_url": "https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/default.aspx",
    },
    "diaper_poop": {
        "source_label": "HealthyChildren.org (AAP) / La Leche League",
        "source_url": "https://www.healthychildren.org/English/ages-stages/baby/Pages/Pooping-By-the-Numbers.aspx",
    },
    "weight_gain": {
        "source_label": "WHO weight-for-age growth guidance",
        "source_url": "https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/infant-growth/faq-20058037",
    },
    "feeding": {
        "source_label": "Pampers baby feeding chart (AAP-based) / KellyMom",
        "source_url": "https://www.pampers.com/en-us/baby/feeding/article/baby-feeding-schedule",
    },
    "sleep": {
        "source_label": "AASM/AAP consensus (Paruthi 2016); NSF for 0-3 months",
        "source_url": "https://jcsm.aasm.org/doi/10.5664/jcsm.5866",
    },
    "who_weight": {
        "source_label": "WHO Child Growth Standards, weight-for-age (-2 to +2 SD)",
        "source_url": "https://www.who.int/tools/child-growth-standards/standards/weight-for-age",
    },
    "who_length": {
        "source_label": "WHO Child Growth Standards, length/height-for-age (-2 to +2 SD)",
        "source_url": "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age",
    },
}

# ---------- simple age-binned ranges ----------
# Bins are (min_age_days_inclusive, max_age_days_exclusive_or_None, low, high).

_RANGES: dict[tuple[str, str], list[tuple[int, Optional[int], float, float]]] = {
    ("diaper", "pee"): [
        (0, 1, 1, 2),
        (1, 3, 2, 4),
        (3, 4, 4, 6),
        (4, None, 6, 8),
    ],
    ("diaper", "poop"): [
        # breastfed newborns are often 3-4+/day; formula-fed 1-2/day; after
        # ~6 weeks frequency can drop a lot and still be normal.
        (0, 28, 1, 4),
        (28, None, 0, 4),
    ],
    ("weight", "gain_g_per_day"): [
        (0, 90, 20, 40),
        (90, 180, 15, 25),
        (180, 365, 7, 15),
    ],
    # total sleep in minutes per 24h, naps included
    ("sleep", "duration_minutes"): [
        (0, 122, 14 * 60, 17 * 60),  # 0-3(4) months
        (122, 365, 12 * 60, 16 * 60),  # 4-12 months
        (365, 1095, 11 * 60, 14 * 60),  # 1-2 years
        (1095, None, 10 * 60, 13 * 60),  # 3-5 years
    ],
}

_SOURCE_KEY = {
    ("diaper", "pee"): "diaper_pee",
    ("diaper", "poop"): "diaper_poop",
    ("weight", "gain_g_per_day"): "weight_gain",
    ("feeding", "count"): "feeding",
    ("feeding", "total_amount_ml"): "feeding",
    ("sleep", "duration_minutes"): "sleep",
    ("weight", "weight_g"): "who_weight",
    ("height", "height_cm"): "who_length",
}


# ---------- WHO growth standards ----------

_GROWTH_TABLES = {
    ("weight", "boy"): growth_data.WFA_BOYS,
    ("weight", "girl"): growth_data.WFA_GIRLS,
    ("height", "boy"): growth_data.LFA_BOYS,
    ("height", "girl"): growth_data.LFA_GIRLS,
}
_GROWTH_DAYS = {k: [row[0] for row in v] for k, v in _GROWTH_TABLES.items()}
# (chore, field) -> (growth metric, unit factor, decimals)
_GROWTH_FIELDS = {
    ("weight", "weight_g"): ("weight", 1000.0, 0),  # table is kg, app stores g
    ("height", "height_cm"): ("height", 1.0, 1),
}


def _lms(metric: str, sex: str, age_days: float) -> Optional[tuple[float, float, float]]:
    table = _GROWTH_TABLES[(metric, sex)]
    days = _GROWTH_DAYS[(metric, sex)]
    if age_days < 0 or age_days > days[-1]:
        return None
    i = bisect_right(days, age_days) - 1
    if i >= len(table) - 1:
        return table[-1][1:]
    d0, l0, m0, s0 = table[i]
    d1, l1, m1, s1 = table[i + 1]
    f = (age_days - d0) / (d1 - d0)
    return l0 + f * (l1 - l0), m0 + f * (m1 - m0), s0 + f * (s1 - s0)


def _value_at_z(lms: tuple[float, float, float], z: float) -> float:
    L, M, S = lms
    return M * (1 + L * S * z) ** (1 / L) if L else M * math.exp(S * z)


def _z_of(lms: tuple[float, float, float], x: float) -> float:
    L, M, S = lms
    return ((x / M) ** L - 1) / (L * S) if L else math.log(x / M) / S


def _sexes(sex: Optional[str]) -> list[str]:
    return [sex] if sex in ("boy", "girl") else ["boy", "girl"]


def growth_band(metric: str, age_days: float, sex: Optional[str]) -> Optional[tuple[float, float, float]]:
    """(low, median, high) in the table's units (kg / cm): -2 SD .. +2 SD.
    With no sex given, the band is the envelope of both sexes."""
    parts = []
    for s in _sexes(sex):
        lms = _lms(metric, s, age_days)
        if lms is None:
            return None
        parts.append((_value_at_z(lms, -2), _value_at_z(lms, 0), _value_at_z(lms, 2)))
    return (
        min(p[0] for p in parts),
        sum(p[1] for p in parts) / len(parts),
        max(p[2] for p in parts),
    )


def growth_z(metric: str, age_days: float, sex: Optional[str], value: float) -> Optional[float]:
    """WHO z-score for a reading (kg / cm). Needs a known sex - the standards
    are sex-specific and a blend would give a meaningless number."""
    if sex not in ("boy", "girl") or value <= 0:
        return None
    lms = _lms(metric, sex, age_days)
    return _z_of(lms, value) if lms else None


def growth_value_at_z(metric: str, age_days: float, sex: str, z: float) -> Optional[float]:
    lms = _lms(metric, sex, age_days)
    return _value_at_z(lms, z) if lms else None


def z_to_percentile(z: float) -> float:
    return 100 * 0.5 * (1 + math.erf(z / math.sqrt(2)))


def growth_field(chore_key: str, field_name: str) -> Optional[tuple[str, float, int]]:
    """(metric, unit factor, decimals) if this field has WHO curves."""
    return _GROWTH_FIELDS.get((chore_key, field_name))


# ---------- public lookup ----------


def reference_range(
    chore_key: str, field_name: str, age_days: Optional[int], sex: Optional[str] = None
) -> Optional[dict]:
    """{"min", "max", optional "mid", "source_label", "source_url"} for the
    given chore field at the baby's age, or None if there's no guidance."""
    if age_days is None or age_days < 0:
        return None
    key = (chore_key, field_name)
    source = _SOURCES.get(_SOURCE_KEY.get(key, ""), {})

    growth = _GROWTH_FIELDS.get(key)
    if growth:
        metric, factor, decimals = growth
        band = growth_band(metric, age_days, sex)
        if band is None:
            return None
        lo, mid, hi = (round(v * factor, decimals) for v in band)
        if decimals == 0:
            lo, mid, hi = int(lo), int(mid), int(hi)
        return {"min": lo, "max": hi, "mid": mid, **source}

    if chore_key == "feeding" and field_name in ("count", "total_amount_ml"):
        g = feeding_guidance(age_days)
        if g is None:
            return None
        span = g["feeds_per_day"] if field_name == "count" else g["per_day_ml"]
        return {"min": span["min"], "max": span["max"], **source}

    bins = _RANGES.get(key)
    if not bins:
        return None
    for lo, hi, low, high in bins:
        if age_days >= lo and (hi is None or age_days < hi):
            return {"min": low, "max": high, **source}
    return None
