"""Sensors for Baby Monitor - one 'last event' + one 'next due' sensor per
chore type, one sensor per numeric field's running total for today, and a
couple of profile convenience sensors (age/weight/height at a glance)."""
from __future__ import annotations

from datetime import datetime

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import BabyMonitorCoordinator
from .entity import BabyMonitorEntity


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator: BabyMonitorCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[SensorEntity] = [BabyMonitorAgeSensor(coordinator, entry.entry_id)]

    for key, chore_type in coordinator.data["chore_types"].items():
        entities.append(BabyMonitorLastEventSensor(coordinator, entry.entry_id, key))
        if chore_type.get("interval_minutes") is not None or chore_type.get("daily_reminder"):
            entities.append(BabyMonitorNextDueSensor(coordinator, entry.entry_id, key))
        for field in chore_type.get("fields", []):
            if field.get("numeric_stat"):
                entities.append(BabyMonitorTodaySensor(coordinator, entry.entry_id, key, field))

    async_add_entities(entities)


class BabyMonitorAgeSensor(BabyMonitorEntity, SensorEntity):
    _attr_native_unit_of_measurement = "d"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:cake-variant"
    _attr_translation_key = "baby_age"

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str) -> None:
        super().__init__(coordinator, entry_id)
        self._attr_unique_id = f"{entry_id}_profile_age"

    @property
    def native_value(self) -> int | None:
        return (self.coordinator.data.get("profile") or {}).get("age_days")

    @property
    def extra_state_attributes(self) -> dict:
        profile = self.coordinator.data.get("profile") or {}
        return {"name": profile.get("name"), "birth_date": profile.get("birth_date")}


class BabyMonitorLastEventSensor(BabyMonitorEntity, SensorEntity):
    """State is the human-readable summary of the last event, e.g. '\U0001F37C Formula 90ml'.
    Full event data (id, timestamp, notes, all fields) is in the attributes,
    so you can build automations/templates off any of it."""

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._attr_unique_id = f"{entry_id}_{chore_key}_last_event"
        self._attr_translation_key = "last_event"
        self._attr_translation_placeholders = {"chore_type": self._label}

    @property
    def _label(self) -> str:
        ct = self.coordinator.data["chore_types"].get(self._chore_key, {})
        return ct.get("label", self._chore_key)

    @property
    def native_value(self) -> str | None:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        last_event = status.get("last_event")
        if not last_event:
            return "No events yet"
        return last_event.get("summary")

    @property
    def extra_state_attributes(self) -> dict:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        last_event = status.get("last_event") or {}
        return {
            "event_id": last_event.get("id"),
            "timestamp": last_event.get("timestamp"),
            "notes": last_event.get("notes"),
            "data": last_event.get("data"),
            "active_session_event_id": status.get("active_session_event_id"),
            "open_event_id": status.get("open_event_id"),
            "today": status.get("today"),
        }


class BabyMonitorNextDueSensor(BabyMonitorEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._attr_unique_id = f"{entry_id}_{chore_key}_next_due"
        self._attr_translation_key = "next_due"
        ct = coordinator.data["chore_types"].get(chore_key, {})
        self._attr_translation_placeholders = {"chore_type": ct.get("label", chore_key)}

    @property
    def native_value(self) -> datetime | None:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        return _parse_ts(status.get("next_due"))

    @property
    def extra_state_attributes(self) -> dict:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        return {"overdue": status.get("overdue", False)}


class BabyMonitorTodaySensor(BabyMonitorEntity, SensorEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str, field: dict) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._field_name = field["name"]
        self._attr_native_unit_of_measurement = field.get("unit")
        self._attr_unique_id = f"{entry_id}_{chore_key}_{self._field_name}_today"
        ct = coordinator.data["chore_types"].get(chore_key, {})
        self._attr_translation_key = "field_today"
        self._attr_translation_placeholders = {
            "chore_type": ct.get("label", chore_key),
            "field": field.get("label", self._field_name),
        }

    @property
    def native_value(self) -> float | None:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        return (status.get("today") or {}).get(self._field_name)
