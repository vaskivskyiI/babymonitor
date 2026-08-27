from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    chore_type: str
    timestamp: Optional[datetime] = None
    data: dict[str, Any] = {}
    notes: Optional[str] = None
    person_id: Optional[int] = None


class EventUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    data: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    person_id: Optional[int] = None
    # person_id is nullable, so "clear the person" and "field wasn't sent"
    # both look like `person_id=None` - only re-assign it when the client
    # actually included the key (checked via model_fields_set in the route).


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chore_type: str
    timestamp: datetime
    created_at: datetime
    updated_at: datetime
    data: dict[str, Any]
    notes: Optional[str] = None
    summary: str = ""
    person_id: Optional[int] = None
    person_name: Optional[str] = None


class PersonCreate(BaseModel):
    name: str
    color: Optional[str] = None


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: Optional[str] = None


class SettingsUpdate(BaseModel):
    interval_minutes: Optional[int] = None
    session_window_minutes: Optional[int] = None


class StatusOut(BaseModel):
    chore_type: str
    label: str
    icon: str
    last_event: Optional[EventOut] = None
    next_due: Optional[datetime] = None
    interval_minutes: Optional[int] = None
    overdue: bool = False
    active_session_event_id: Optional[int] = None
    open_event_id: Optional[int] = None
    today: dict[str, float] = {}


class ProfileOut(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[date] = None
    birth_weight_g: Optional[float] = None
    timezone: str = "UTC"
    age_days: Optional[int] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[date] = None
    birth_weight_g: Optional[float] = None
    timezone: Optional[str] = None


class CustomFieldIn(BaseModel):
    name: str
    label: str
    type: str  # text | number | boolean | select | textarea
    unit: Optional[str] = None
    numeric_stat: bool = False
    options: Optional[list[dict]] = None  # [{value,label}]


class CustomChoreTypeCreate(BaseModel):
    key: str
    label: str
    icon: str
    fields: list[CustomFieldIn] = []
    interval_minutes: Optional[int] = None


class CustomChoreTypeUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    fields: Optional[list[CustomFieldIn]] = None
    interval_minutes: Optional[int] = None


class ChoreTypeMetaUpdate(BaseModel):
    enabled: Optional[bool] = None
    label_override: Optional[str] = None
    icon_override: Optional[str] = None


class ReorderRequest(BaseModel):
    keys: list[str]


class QuickActionCreate(BaseModel):
    label: str
    mode: str  # "increment" | "absolute" | "log"
    entries_field: str = "entries"
    match_field: str
    match_value: str
    # unused for mode="log" (always just appends a new entry stamped with
    # match_field=match_value, e.g. "start a breastfeeding checkpoint now")
    target_field: Optional[str] = None
    value: Optional[float] = None


class QuickActionUpdate(BaseModel):
    label: Optional[str] = None
    mode: Optional[str] = None
    match_field: Optional[str] = None
    match_value: Optional[str] = None
    target_field: Optional[str] = None
    value: Optional[float] = None
