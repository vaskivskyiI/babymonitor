"""DataUpdateCoordinator for Baby Monitor."""
from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import BabyMonitorApiError, BabyMonitorClient
from .const import CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class BabyMonitorCoordinator(DataUpdateCoordinator[dict]):
    """Polls the Baby Monitor server and keeps chore types/status/profile fresh."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, client: BabyMonitorClient) -> None:
        scan_interval = entry.options.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self.client = client
        self.base_url = client.base_url

    async def _async_update_data(self) -> dict:
        try:
            chore_types = await self.client.get_chore_types()
            status = await self.client.get_status()
            profile = await self.client.get_profile()
        except BabyMonitorApiError as err:
            raise UpdateFailed(str(err)) from err

        return {
            "chore_types": {c["key"]: c for c in chore_types},
            "status": {s["chore_type"]: s for s in status},
            "profile": profile,
        }
