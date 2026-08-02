"""
General pediatric "normal range" guidance for a few well-known metrics, used
to draw a reference band on the relevant stats charts.

These are rough, commonly-cited ranges for a full-term, otherwise healthy
baby - NOT medical advice. Always defer to your pediatrician for anything
specific to your baby. Sources are attached to each range so they show up
in the UI next to the chart.

Age bins are (min_age_days_inclusive, max_age_days_exclusive_or_None, low, high).
"""
from typing import Optional

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
}

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
}

_SOURCE_KEY = {
    ("diaper", "pee"): "diaper_pee",
    ("diaper", "poop"): "diaper_poop",
    ("weight", "gain_g_per_day"): "weight_gain",
}


def reference_range(chore_key: str, field_name: str, age_days: Optional[int]) -> Optional[dict]:
    if age_days is None or age_days < 0:
        return None
    bins = _RANGES.get((chore_key, field_name))
    if not bins:
        return None
    for lo, hi, low, high in bins:
        if age_days >= lo and (hi is None or age_days < hi):
            source = _SOURCES.get(_SOURCE_KEY.get((chore_key, field_name), ""), {})
            return {"min": low, "max": high, **source}
    return None
