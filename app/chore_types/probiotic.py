from app.chore_types.base import ChoreType, FieldDef, register


@register
class ProbioticChoreType(ChoreType):
    key = "probiotic"
    label = "Probiotic"
    icon = "💊"
    # once a day is the usual dosing; fully configurable in Settings
    default_interval_minutes = 24 * 60
    interval_configurable = True

    fields = [
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        return "💊 Given"
