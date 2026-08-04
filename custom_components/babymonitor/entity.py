"""Shared base entity for Baby Monitor - groups everything under one device."""
from __future__ import annotations

from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BabyMonitorCoordinator


class BabyMonitorEntity(CoordinatorEntity[BabyMonitorCoordinator]):
    """Base entity tying everything to a single 'Baby Monitor' device."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: BabyMonitorCoordinator, entry_id: str) -> None:
        super().__init__(coordinator)
        self._entry_id = entry_id
        profile = coordinator.data.get("profile") or {}
        baby_name = profile.get("name")
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name=f"Baby Monitor ({baby_name})" if baby_name else "Baby Monitor",
            manufacturer="Baby Monitor (self-hosted)",
            model="babymonitor",
            configuration_url=coordinator.base_url,
        )
