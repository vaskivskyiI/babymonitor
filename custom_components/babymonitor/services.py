"""Services for Baby Monitor - the generic escape hatch for anything the
buttons/sensors don't cover directly: logging an arbitrary event, editing
or deleting one, running a quick action by name, or forcing a refresh.
Registered once per HA instance (domain-global), not per config entry."""
from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .api import BabyMonitorApiError
from .const import (
    ATTR_CHORE_TYPE,
    ATTR_CONFIG_ENTRY_ID,
    ATTR_DATA,
    ATTR_EVENT_ID,
    ATTR_LABEL,
    ATTR_NOTES,
    ATTR_TIMESTAMP,
    DOMAIN,
    SERVICE_DELETE_EVENT,
    SERVICE_LOG_EVENT,
    SERVICE_QUICK_ACTION,
    SERVICE_REFRESH,
    SERVICE_UPDATE_EVENT,
)
from .coordinator import BabyMonitorCoordinator

_LOGGER = logging.getLogger(__name__)

_LOG_EVENT_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Required(ATTR_CHORE_TYPE): cv.string,
        vol.Optional(ATTR_DATA, default=dict): dict,
        vol.Optional(ATTR_TIMESTAMP): cv.string,
        vol.Optional(ATTR_NOTES): cv.string,
    }
)

_UPDATE_EVENT_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Required(ATTR_EVENT_ID): cv.positive_int,
        vol.Optional(ATTR_DATA): dict,
        vol.Optional(ATTR_TIMESTAMP): cv.string,
        vol.Optional(ATTR_NOTES): cv.string,
    }
)

_DELETE_EVENT_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Required(ATTR_EVENT_ID): cv.positive_int,
    }
)

_QUICK_ACTION_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
        vol.Required(ATTR_CHORE_TYPE): cv.string,
        vol.Required(ATTR_LABEL): cv.string,
    }
)

_REFRESH_SCHEMA = vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string})


def _get_coordinator(hass: HomeAssistant, call: ServiceCall) -> BabyMonitorCoordinator:
    coordinators: dict[str, BabyMonitorCoordinator] = hass.data.get(DOMAIN, {})
    entry_id = call.data.get(ATTR_CONFIG_ENTRY_ID)
    if entry_id:
        coordinator = coordinators.get(entry_id)
        if coordinator is None:
            raise ServiceValidationError(f"Unknown Baby Monitor config_entry_id: {entry_id}")
        return coordinator
    if len(coordinators) == 1:
        return next(iter(coordinators.values()))
    if not coordinators:
        raise ServiceValidationError("No Baby Monitor server is configured")
    raise ServiceValidationError(
        "Multiple Baby Monitor servers are configured - specify config_entry_id"
    )


def async_setup_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, SERVICE_LOG_EVENT):
        return  # already registered by an earlier config entry

    async def handle_log_event(call: ServiceCall) -> ServiceResponse:
        coordinator = _get_coordinator(hass, call)
        try:
            result = await coordinator.client.create_event(
                chore_type=call.data[ATTR_CHORE_TYPE],
                data=call.data.get(ATTR_DATA) or {},
                timestamp=call.data.get(ATTR_TIMESTAMP),
                notes=call.data.get(ATTR_NOTES),
            )
        except BabyMonitorApiError as err:
            raise ServiceValidationError(str(err)) from err
        await coordinator.async_request_refresh()
        return result

    async def handle_update_event(call: ServiceCall) -> ServiceResponse:
        coordinator = _get_coordinator(hass, call)
        try:
            result = await coordinator.client.update_event(
                event_id=call.data[ATTR_EVENT_ID],
                data=call.data.get(ATTR_DATA),
                timestamp=call.data.get(ATTR_TIMESTAMP),
                notes=call.data.get(ATTR_NOTES),
            )
        except BabyMonitorApiError as err:
            raise ServiceValidationError(str(err)) from err
        await coordinator.async_request_refresh()
        return result

    async def handle_delete_event(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass, call)
        try:
            await coordinator.client.delete_event(call.data[ATTR_EVENT_ID])
        except BabyMonitorApiError as err:
            raise ServiceValidationError(str(err)) from err
        await coordinator.async_request_refresh()

    async def handle_quick_action(call: ServiceCall) -> ServiceResponse:
        coordinator = _get_coordinator(hass, call)
        chore_type = call.data[ATTR_CHORE_TYPE]
        label = call.data[ATTR_LABEL]
        ct = coordinator.data["chore_types"].get(chore_type)
        if ct is None:
            raise ServiceValidationError(f"Unknown chore_type: {chore_type}")
        qa = next((a for a in ct.get("quick_actions", []) if a["label"] == label), None)
        if qa is None:
            available = ", ".join(a["label"] for a in ct.get("quick_actions", []))
            raise ServiceValidationError(f"No quick action '{label}' for {chore_type}. Available: {available}")
        status = coordinator.data["status"].get(chore_type, {})
        try:
            result = await coordinator.client.run_quick_action(chore_type, status, qa)
        except BabyMonitorApiError as err:
            raise ServiceValidationError(str(err)) from err
        await coordinator.async_request_refresh()
        return result

    async def handle_refresh(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass, call)
        await coordinator.async_request_refresh()

    hass.services.async_register(
        DOMAIN, SERVICE_LOG_EVENT, handle_log_event, schema=_LOG_EVENT_SCHEMA, supports_response=SupportsResponse.OPTIONAL
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_EVENT,
        handle_update_event,
        schema=_UPDATE_EVENT_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(DOMAIN, SERVICE_DELETE_EVENT, handle_delete_event, schema=_DELETE_EVENT_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_QUICK_ACTION,
        handle_quick_action,
        schema=_QUICK_ACTION_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(DOMAIN, SERVICE_REFRESH, handle_refresh, schema=_REFRESH_SCHEMA)


def async_unload_services(hass: HomeAssistant) -> None:
    for service in (
        SERVICE_LOG_EVENT,
        SERVICE_UPDATE_EVENT,
        SERVICE_DELETE_EVENT,
        SERVICE_QUICK_ACTION,
        SERVICE_REFRESH,
    ):
        hass.services.async_remove(DOMAIN, service)
