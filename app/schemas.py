from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    chore_type: str
    timestamp: Optional[datetime] = None
    data: dict[str, Any] = {}
    notes: Optional[str] = None


class EventUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    data: Optional[dict[str, Any]] = None
    notes: Optional[str] = None


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
