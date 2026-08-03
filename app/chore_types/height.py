from app.chore_types.base import ChoreType, FieldDef, register


@register
class HeightChoreType(ChoreType):
    key = "height"
    label = "Height"
    icon = "📏"
    # monthly measurement is a common cadence; fully configurable in Settings
    default_interval_minutes = 30 * 24 * 60
    interval_configurable = True

    fields = [
        FieldDef(
            name="height_cm",
            label="Height",
            type="number",
            unit="cm",
            required=True,
            numeric_stat=True,
            stat_agg="last",
            step=0.5,
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        h = data.get("height_cm")
        return f"📏 {h}cm" if h is not None else "📏 Height"
