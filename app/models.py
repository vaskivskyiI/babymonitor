from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime | None) -> datetime | None:
    """SQLite drops tzinfo on round-trip; reattach UTC (values are always
    stored as UTC instants) so comparisons/serialization stay correct."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    chore_type: Mapped[str] = mapped_column(String(64), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)


class ChoreTypeMeta(Base):
    """Per-chore-type display/ordering overrides - applies to both builtin
    (Python-defined) and custom (user-defined) chore types."""

    __tablename__ = "chore_type_meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    label_override: Mapped[str | None] = mapped_column(String(128), nullable=True)
    icon_override: Mapped[str | None] = mapped_column(String(16), nullable=True)


class CustomChoreType(Base):
    """A user-defined chore type created from the app's Settings tab. Simple
    declarative fields only (text/number/boolean/select/textarea) - no
    sessions/start-end/derived-stats behavior, which remain Python plugins
    under app/chore_types/."""

    __tablename__ = "custom_chore_types"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(128))
    icon: Mapped[str] = mapped_column(String(16))
    fields_json: Mapped[list] = mapped_column(JSON, default=list)
    interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class QuickActionDef(Base):
    """A user-configured dashboard quick-action button for an `entries`-type
    field, e.g. "Formula +10ml" (increment) or "Formula 100ml" (absolute).
    Applied to the last matching entry of the chore type's open/last event,
    or starts a new one-entry event if none is open - see
    app/static/app.js's runFieldQuickAction()."""

    __tablename__ = "quick_action_defs"

    id: Mapped[int] = mapped_column(primary_key=True)
    chore_type_key: Mapped[str] = mapped_column(String(64), index=True)
    label: Mapped[str] = mapped_column(String(64))
    mode: Mapped[str] = mapped_column(String(16))  # "increment" | "absolute"
    entries_field: Mapped[str] = mapped_column(String(64), default="entries")
    match_field: Mapped[str] = mapped_column(String(64))
    match_value: Mapped[str] = mapped_column(String(64))
    target_field: Mapped[str] = mapped_column(String(64))
    value: Mapped[float] = mapped_column(Float)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
