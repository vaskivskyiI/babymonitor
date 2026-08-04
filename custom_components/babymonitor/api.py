"""Thin async client for the Baby Monitor REST API.

Shared by the coordinator (reads), buttons, and services (writes) so the
HTTP/JSON handling lives in exactly one place.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

_LOGGER = logging.getLogger(__name__)

_TIMEOUT = aiohttp.ClientTimeout(total=15)


class BabyMonitorApiError(Exception):
    """Raised when a request to the Baby Monitor server fails."""


class BabyMonitorClient:
    def __init__(self, session: aiohttp.ClientSession, base_url: str) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")

    @property
    def base_url(self) -> str:
        return self._base_url

    async def _request(self, method: str, path: str, json: dict | None = None) -> Any:
        url = f"{self._base_url}{path}"
        try:
            async with self._session.request(method, url, json=json, timeout=_TIMEOUT) as resp:
                if resp.status == 404:
                    raise BabyMonitorApiError(f"Not found: {path}")
                resp.raise_for_status()
                if resp.status == 204 or resp.content_length == 0:
                    return None
                return await resp.json()
        except asyncio.TimeoutError as err:
            raise BabyMonitorApiError(f"Timed out calling {url}") from err
        except aiohttp.ClientError as err:
            raise BabyMonitorApiError(f"Error calling {url}: {err}") from err

    async def healthz(self) -> bool:
        try:
            await self._request("GET", "/healthz")
        except BabyMonitorApiError:
            return False
        return True

    async def get_chore_types(self) -> list[dict]:
        return await self._request("GET", "/api/chore-types")

    async def get_status(self) -> list[dict]:
        return await self._request("GET", "/api/status")

    async def get_profile(self) -> dict:
        return await self._request("GET", "/api/profile")

    async def get_event(self, event_id: int) -> dict:
        return await self._request("GET", f"/api/events/{event_id}")

    async def create_event(
        self, chore_type: str, data: dict | None = None, timestamp: str | None = None, notes: str | None = None
    ) -> dict:
        body: dict[str, Any] = {"chore_type": chore_type, "data": data or {}}
        if timestamp:
            body["timestamp"] = timestamp
        if notes is not None:
            body["notes"] = notes
        return await self._request("POST", "/api/events", json=body)

    async def update_event(
        self, event_id: int, data: dict | None = None, timestamp: str | None = None, notes: str | None = None
    ) -> dict:
        body: dict[str, Any] = {}
        if data is not None:
            body["data"] = data
        if timestamp:
            body["timestamp"] = timestamp
        if notes is not None:
            body["notes"] = notes
        return await self._request("PUT", f"/api/events/{event_id}", json=body)

    async def delete_event(self, event_id: int) -> None:
        await self._request("DELETE", f"/api/events/{event_id}")

    async def run_quick_action(self, chore_type: str, status_for_type: dict, qa: dict) -> dict:
        """Execute a quick action exactly like the web UI does: a plain
        "log" preset always creates a new event; a field-targeting
        increment/absolute action updates the last matching entry of the
        currently open session (if any), or starts a new one-entry event."""
        mode = qa.get("mode")
        if mode not in ("increment", "absolute"):
            return await self.create_event(chore_type, data=qa.get("data") or {})

        session_event_id = status_for_type.get("active_session_event_id") or status_for_type.get("open_event_id")
        entries_field = qa["entries_field"]
        match_field = qa["match_field"]
        match_value = qa["match_value"]
        target_field = qa["target_field"]
        value = qa["value"]

        event = await self.get_event(session_event_id) if session_event_id else None
        entries = list((event["data"].get(entries_field) or [])) if event else []

        idx = -1
        for i in range(len(entries) - 1, -1, -1):
            if entries[i].get(match_field) == match_value:
                idx = i
                break

        if idx >= 0:
            current = entries[idx].get(target_field) or 0
            entries[idx] = {
                **entries[idx],
                target_field: (current + value) if mode == "increment" else value,
            }
        else:
            from datetime import datetime, timezone

            entries.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    match_field: match_value,
                    target_field: value,
                }
            )

        # PUT replaces the whole `data` object, so merge onto the event's
        # existing data (e.g. a typed note) instead of dropping everything else.
        data = {**(event["data"] if event else {}), entries_field: entries}
        if event:
            return await self.update_event(event["id"], data=data)
        return await self.create_event(chore_type, data=data)
