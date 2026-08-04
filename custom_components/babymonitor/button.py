"""Buttons for Baby Monitor - one per configured quick action (both simple
'log' presets and field-targeting increment/absolute ones), plus Start/End
buttons for session-based chore types like sleep."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .api import BabyMonitorApiError
from .const import DOMAIN
from .coordinator import BabyMonitorCoordinator
from .entity import BabyMonitorEntity

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator: BabyMonitorCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities: list[ButtonEntity] = []
    for key, chore_type in coordinator.data["chore_types"].items():
        if chore_type.get("has_start_end"):
            entities.append(BabyMonitorStartButton(coordinator, entry.entry_id, key))
            entities.append(BabyMonitorEndButton(coordinator, entry.entry_id, key))
        for i, qa in enumerate(chore_type.get("quick_actions", [])):
            entities.append(BabyMonitorQuickActionButton(coordinator, entry.entry_id, key, i, qa))

    async_add_entities(entities)


class BabyMonitorQuickActionButton(BabyMonitorEntity, ButtonEntity):
    def __init__(
        self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str, index: int, qa: dict
    ) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._index = index
        # a DB-configured quick action has a stable id; a Python-defined
        # preset doesn't, so fall back to its position for a stable unique_id
        qa_id = qa.get("id", f"i{index}")
        self._attr_unique_id = f"{entry_id}_{chore_key}_qa_{qa_id}"
        ct = coordinator.data["chore_types"].get(chore_key, {})
        self._attr_translation_key = "quick_action"
        self._attr_translation_placeholders = {"chore_type": ct.get("label", chore_key), "action": qa["label"]}

    @property
    def _quick_action(self) -> dict | None:
        ct = self.coordinator.data["chore_types"].get(self._chore_key, {})
        actions = ct.get("quick_actions", [])
        return actions[self._index] if self._index < len(actions) else None

    async def async_press(self) -> None:
        qa = self._quick_action
        if qa is None:
            _LOGGER.warning("Quick action no longer exists for %s", self._chore_key)
            return
        status = self.coordinator.data["status"].get(self._chore_key, {})
        try:
            await self.coordinator.client.run_quick_action(self._chore_key, status, qa)
        except BabyMonitorApiError as err:
            _LOGGER.error("Failed to run quick action '%s': %s", qa.get("label"), err)
            raise
        await self.coordinator.async_request_refresh()


class BabyMonitorStartButton(BabyMonitorEntity, ButtonEntity):
    _attr_icon = "mdi:play-circle-outline"

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._attr_unique_id = f"{entry_id}_{chore_key}_start"
        ct = coordinator.data["chore_types"].get(chore_key, {})
        self._attr_translation_key = "start"
        self._attr_translation_placeholders = {"chore_type": ct.get("label", chore_key)}

    async def async_press(self) -> None:
        await self.coordinator.client.create_event(self._chore_key)
        await self.coordinator.async_request_refresh()


class BabyMonitorEndButton(BabyMonitorEntity, ButtonEntity):
    _attr_icon = "mdi:stop-circle-outline"

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str, chore_key: str) -> None:
        super().__init__(coordinator, entry_id)
        self._chore_key = chore_key
        self._attr_unique_id = f"{entry_id}_{chore_key}_end"
        ct = coordinator.data["chore_types"].get(chore_key, {})
        self._attr_translation_key = "end"
        self._attr_translation_placeholders = {"chore_type": ct.get("label", chore_key)}

    async def async_press(self) -> None:
        status = self.coordinator.data["status"].get(self._chore_key, {})
        open_event_id = status.get("open_event_id")
        if not open_event_id:
            _LOGGER.warning("No open %s to end", self._chore_key)
            return
        # PUT replaces the whole `data` object, so merge onto the current
        # event's data (e.g. a user-entered note) rather than clobbering it.
        current = await self.coordinator.client.get_event(open_event_id)
        data = {**current.get("data", {}), "ended_at": datetime.now(timezone.utc).isoformat()}
        await self.coordinator.client.update_event(open_event_id, data=data)
        await self.coordinator.async_request_refresh()
