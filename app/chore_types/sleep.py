from app.chore_types.base import ChoreType, FieldDef, register


@register
class SleepChoreType(ChoreType):
    key = "sleep"
    label = "Sleep"
    icon = "😴"
    # no fixed reminder interval for sleep
    default_interval_minutes = None
    interval_configurable = False

    fields = [
        FieldDef(
            name="duration_minutes",
            label="Duration",
            type="number",
            unit="min",
            numeric_stat=True,
            help="Leave empty to just log a nap start time",
        ),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        dur = data.get("duration_minutes")
        return f"😴 Slept {dur} min" if dur else "😴 Sleep"
