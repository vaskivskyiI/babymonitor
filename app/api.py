import copy
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.chore_types.base import REGISTRY, ChoreType, FieldDef, FieldOption
from app.custom_types import DynamicChoreType
from app.db import get_db
from app.feeding_guidance import feeding_guidance
from app.models import ChoreTypeMeta, CustomChoreType, Event, Person, QuickActionDef, Setting, as_utc
from app.reference_ranges import (
    growth_band,
    growth_field,
    growth_value_at_z,
    growth_z,
    reference_range,
    z_to_percentile,
)
from app.schemas import (
    ChoreTypeMetaUpdate,
    CompetitionHiddenUpdate,
    CustomChoreTypeCreate,
    CustomChoreTypeUpdate,
    EventCreate,
    EventOut,
    EventUpdate,
    NextDueUpdate,
    PersonCreate,
    PersonOut,
    PersonUpdate,
    ProfileOut,
    ProfileUpdate,
    QuickActionCreate,
    QuickActionUpdate,
    ReorderRequest,
    SettingsUpdate,
    StatusOut,
)

router = APIRouter(prefix="/api")

PROFILE_KEY = "profile"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _custom_chore_type(row: CustomChoreType) -> DynamicChoreType:
    fields = []
    for f in row.fields_json:
        f = dict(f)
        if f.get("options"):
            f["options"] = [FieldOption(**o) for o in f["options"]]
        fields.append(FieldDef(**f))
    return DynamicChoreType(row.key, row.label, row.icon, fields, row.interval_minutes)


def _get_chore_type(key: str, db: Session | None = None):
    """Look up a chore type by key: builtin Python plugins first, then
    custom (DB-defined) types. Works regardless of enabled/sort state -
    that's only applied when *listing* types."""
    ct = REGISTRY.get(key)
    if ct is not None:
        ct = copy.copy(ct)
    elif db is not None:
        row = db.get(CustomChoreType, key)
        if row is not None:
            ct = _custom_chore_type(row)
    if ct is None:
        raise HTTPException(404, f"Unknown chore type '{key}'")
    if db is not None:
        m = db.get(ChoreTypeMeta, key)
        if m:
            if m.label_override:
                ct.label = m.label_override
            if m.icon_override:
                ct.icon = m.icon_override
    return ct


def _all_chore_type_metas(db: Session) -> dict[str, ChoreTypeMeta]:
    return {m.key: m for m in db.execute(select(ChoreTypeMeta)).scalars().all()}


def _effective_chore_types(db: Session, enabled_only: bool = True) -> list[ChoreType]:
    """Builtin + custom chore types, merged, with label/icon overrides
    applied and sorted/filtered per ChoreTypeMeta."""
    metas = _all_chore_type_metas(db)
    # shallow-copy builtins so label/icon overrides never leak into the
    # shared REGISTRY singletons used elsewhere in the process
    items: list[ChoreType] = [copy.copy(ct) for ct in REGISTRY.values()]
    items += [_custom_chore_type(c) for c in db.execute(select(CustomChoreType)).scalars().all()]

    def sort_key(ct: ChoreType):
        m = metas.get(ct.key)
        return (m.sort_order if m else 10_000, ct.key)

    items.sort(key=sort_key)

    result = []
    for ct in items:
        m = metas.get(ct.key)
        if m:
            if enabled_only and not m.enabled:
                continue
            if m.label_override:
                ct.label = m.label_override
            if m.icon_override:
                ct.icon = m.icon_override
        result.append(ct)
    return result


def _interval_minutes(db: Session, ct) -> int | None:
    setting = db.get(Setting, f"interval:{ct.key}")
    if setting and setting.value and "interval_minutes" in setting.value:
        return setting.value["interval_minutes"]
    return ct.default_interval_minutes


def _reminder_enabled(db: Session, key: str) -> bool:
    """Master on/off for a chore type's reminder, independent of its interval
    (so turning it off keeps the configured interval for when it's turned
    back on). Defaults to on."""
    setting = db.get(Setting, f"reminder:{key}")
    if setting and setting.value and "enabled" in setting.value:
        return bool(setting.value["enabled"])
    return True


def _push_lead_minutes(db: Session, key: str) -> int:
    """How many minutes before the due time the push notification goes out
    (0 = at the due time). Shares the `reminder:{key}` row with the on/off flag."""
    setting = db.get(Setting, f"reminder:{key}")
    if setting and setting.value:
        return int(setting.value.get("lead_minutes") or 0)
    return 0


def _update_reminder_setting(db: Session, key: str, **changes) -> None:
    setting = db.get(Setting, f"reminder:{key}")
    value = dict(setting.value) if setting and setting.value else {}
    value.update(changes)
    _set_setting(db, f"reminder:{key}", value)


def _last_event(db: Session, key: str) -> Event | None:
    stmt = select(Event).where(Event.chore_type == key).order_by(Event.timestamp.desc()).limit(1)
    return db.execute(stmt).scalars().first()


def _next_due_override(db: Session, key: str, last: Event | None) -> tuple[datetime, datetime | None] | None:
    """A one-off "remind me at X instead" for the current cycle (e.g. a
    longer gap after a night feed) as (due, when it was set). It's tied to
    the event it was set for, so logging the next event drops it and the
    normal interval applies again."""
    setting = db.get(Setting, f"next_due_override:{key}")
    if not setting or not setting.value:
        return None
    if setting.value.get("event_id") != (last.id if last else None):
        return None
    try:
        due = as_utc(datetime.fromisoformat(setting.value["due_at"]))
    except (KeyError, ValueError):
        return None
    set_at = setting.value.get("set_at")
    try:
        return due, (as_utc(datetime.fromisoformat(set_at)) if set_at else None)
    except ValueError:
        return due, None


def _next_due_info(db: Session, ct, last: Event | None, tz: ZoneInfo) -> dict:
    """{"due", "overridden", "armed_at"}: when the reminder is due, whether
    that was set by hand, and when this due time came into being (the last
    event, or the moment it was overridden) - push uses that to avoid
    announcing a due time the instant it was set. `due` is None when the
    reminder is switched off or there is nothing to count from."""
    if not _reminder_enabled(db, ct.key):
        return {"due": None, "overridden": False, "armed_at": None}
    override = _next_due_override(db, ct.key, last)
    if override is not None:
        due, set_at = override
        return {"due": due, "overridden": True, "armed_at": set_at}
    last_ts = as_utc(last.timestamp) if last else None
    return {
        "due": ct.next_due(last_ts, _interval_minutes(db, ct), tz),
        "overridden": False,
        "armed_at": last_ts,
    }


def _compute_next_due(db: Session, ct, last: Event | None, tz: ZoneInfo) -> tuple[datetime | None, bool]:
    """(next_due, is_overridden). None when the reminder is switched off."""
    info = _next_due_info(db, ct, last, tz)
    return info["due"], info["overridden"]


def _session_window_minutes(db: Session, ct) -> int | None:
    if not ct.session_window_configurable:
        return None
    setting = db.get(Setting, f"session_window:{ct.key}")
    if setting and setting.value and "session_window_minutes" in setting.value:
        return setting.value["session_window_minutes"]
    return ct.default_session_window_minutes


def _set_setting(db: Session, key: str, value: dict) -> None:
    setting = db.get(Setting, key)
    if setting is None:
        setting = Setting(key=key, value={})
        db.add(setting)
    setting.value = value


def _event_out(ct, event: Event, db: Session | None = None) -> EventOut:
    event.timestamp = as_utc(event.timestamp)
    event.created_at = as_utc(event.created_at)
    event.updated_at = as_utc(event.updated_at)
    out = EventOut.model_validate(event)
    out.summary = ct.summarize(event.data)
    if db is not None and event.person_id is not None:
        person = db.get(Person, event.person_id)
        out.person_name = person.name if person else None
    return out


# ---------- people ----------


@router.get("/people", response_model=list[PersonOut])
def list_people(db: Session = Depends(get_db)):
    return db.execute(select(Person).order_by(Person.sort_order, Person.id)).scalars().all()


@router.post("/people", response_model=PersonOut)
def create_person(body: PersonCreate, db: Session = Depends(get_db)):
    max_order = db.execute(select(Person)).scalars().all()
    next_order = (max((p.sort_order for p in max_order), default=-1)) + 1
    row = Person(name=body.name.strip(), color=body.color, sort_order=next_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/people/{person_id}", response_model=PersonOut)
def update_person(person_id: int, body: PersonUpdate, db: Session = Depends(get_db)):
    row = db.get(Person, person_id)
    if row is None:
        raise HTTPException(404, "Person not found")
    if body.name is not None:
        row.name = body.name.strip()
    if "color" in body.model_fields_set:
        row.color = body.color
    db.commit()
    return row


@router.delete("/people/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    row = db.get(Person, person_id)
    if row is None:
        raise HTTPException(404, "Person not found")
    # events keep their history - just drop the attribution rather than
    # deleting logged chores when a person is removed
    for e in db.execute(select(Event).where(Event.person_id == person_id)).scalars().all():
        e.person_id = None
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------- profile (baby's birth date / name / timezone) ----------


def _get_profile_dict(db: Session) -> dict:
    setting = db.get(Setting, PROFILE_KEY)
    return dict(setting.value) if setting and setting.value else {}


def _profile_timezone(profile: dict) -> ZoneInfo:
    name = profile.get("timezone") or "UTC"
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("UTC")


def _age_days(profile: dict, at: datetime) -> int | None:
    bd = profile.get("birth_date")
    if not bd:
        return None
    birth = date.fromisoformat(bd)
    return (at.date() - birth).days


@router.get("/profile", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    profile = _get_profile_dict(db)
    tz = _profile_timezone(profile)
    age = _age_days(profile, _now().astimezone(tz))
    return ProfileOut(
        name=profile.get("name"),
        birth_date=date.fromisoformat(profile["birth_date"]) if profile.get("birth_date") else None,
        birth_weight_g=profile.get("birth_weight_g"),
        sex=profile.get("sex"),
        timezone=profile.get("timezone") or "UTC",
        age_days=age,
    )


@router.put("/profile", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db)):
    value = _get_profile_dict(db)
    fields_set = body.model_fields_set
    if "name" in fields_set:
        value["name"] = body.name
    if "birth_date" in fields_set:
        value["birth_date"] = body.birth_date.isoformat() if body.birth_date else None
    if "birth_weight_g" in fields_set:
        value["birth_weight_g"] = body.birth_weight_g
    if "timezone" in fields_set:
        value["timezone"] = body.timezone or "UTC"
    if "sex" in fields_set:
        if body.sex not in (None, "", "boy", "girl"):
            raise HTTPException(400, "sex must be 'boy', 'girl' or empty")
        value["sex"] = body.sex or None
    _set_setting(db, PROFILE_KEY, value)
    db.commit()
    return get_profile(db)


@router.get("/calculators/feeding")
def calculator_feeding(
    age_days: int | None = None,
    weight_g: float | None = None,
    db: Session = Depends(get_db),
):
    profile = _get_profile_dict(db)
    tz = _profile_timezone(profile)
    if age_days is None:
        age_days = _age_days(profile, _now().astimezone(tz))
    if weight_g is None:
        stmt = select(Event).where(Event.chore_type == "weight").order_by(Event.timestamp.desc()).limit(1)
        last_weight = db.execute(stmt).scalars().first()
        if last_weight:
            weight_g = last_weight.data.get("weight_g")
    result = feeding_guidance(age_days, weight_g)
    if result is None:
        raise HTTPException(400, "Set a birth date in Settings, or pass ?age_days= explicitly")
    result["weight_g"] = weight_g
    return result


def _quick_action_dict(row: QuickActionDef) -> dict:
    return {
        "id": row.id,
        "label": row.label,
        "mode": row.mode,
        "entries_field": row.entries_field,
        "match_field": row.match_field,
        "match_value": row.match_value,
        "target_field": row.target_field,
        "value": row.value,
    }


def _configured_quick_actions(db: Session, key: str) -> list[dict]:
    stmt = (
        select(QuickActionDef)
        .where(QuickActionDef.chore_type_key == key)
        .order_by(QuickActionDef.sort_order, QuickActionDef.id)
    )
    return [_quick_action_dict(r) for r in db.execute(stmt).scalars().all()]


@router.get("/chore-types")
def list_chore_types(include_disabled: bool = False, db: Session = Depends(get_db)):
    metas = _all_chore_type_metas(db)
    result = []
    for ct in _effective_chore_types(db, enabled_only=not include_disabled):
        d = ct.as_dict(_interval_minutes(db, ct), _session_window_minutes(db, ct))
        d["quick_actions"] = list(d.get("quick_actions") or []) + _configured_quick_actions(db, ct.key)
        d["is_builtin"] = ct.key in REGISTRY
        d["enabled"] = metas[ct.key].enabled if ct.key in metas else True
        d["reminder_enabled"] = _reminder_enabled(db, ct.key)
        d["push_lead_minutes"] = _push_lead_minutes(db, ct.key)
        result.append(d)
    return result


@router.post("/chore-types/{key}/quick-actions")
def create_quick_action(key: str, body: QuickActionCreate, db: Session = Depends(get_db)):
    _get_chore_type(key, db)  # 404s if unknown
    max_order = db.execute(
        select(QuickActionDef).where(QuickActionDef.chore_type_key == key)
    ).scalars().all()
    next_order = (max((r.sort_order for r in max_order), default=-1)) + 1
    values = body.model_dump()
    # mode="log" (just append a new checkpoint entry) has no target field/
    # value - the DB columns stay NOT NULL for the increment/absolute modes,
    # so store harmless sentinels rather than migrating column nullability.
    if values.get("target_field") is None:
        values["target_field"] = ""
    if values.get("value") is None:
        values["value"] = 0.0
    row = QuickActionDef(chore_type_key=key, sort_order=next_order, **values)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _quick_action_dict(row)


@router.put("/chore-types/{key}/quick-actions/{action_id}")
def update_quick_action(key: str, action_id: int, body: QuickActionUpdate, db: Session = Depends(get_db)):
    row = db.get(QuickActionDef, action_id)
    if row is None or row.chore_type_key != key:
        raise HTTPException(404, "Quick action not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    return _quick_action_dict(row)


@router.delete("/chore-types/{key}/quick-actions/{action_id}")
def delete_quick_action(key: str, action_id: int, db: Session = Depends(get_db)):
    row = db.get(QuickActionDef, action_id)
    if row is None or row.chore_type_key != key:
        raise HTTPException(404, "Quick action not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/chore-types")
def create_custom_chore_type(body: CustomChoreTypeCreate, db: Session = Depends(get_db)):
    if body.key in REGISTRY or db.get(CustomChoreType, body.key):
        raise HTTPException(409, f"Chore type '{body.key}' already exists")
    if not body.key.isidentifier() or not body.key.islower():
        raise HTTPException(400, "Key must be lowercase letters/numbers/underscores, e.g. 'tummy_time'")
    row = CustomChoreType(
        key=body.key,
        label=body.label,
        icon=body.icon,
        fields_json=[f.model_dump() for f in body.fields],
        interval_minutes=body.interval_minutes,
    )
    db.add(row)
    # place new types at the end of the list
    max_order = db.execute(select(ChoreTypeMeta)).scalars().all()
    next_order = (max((m.sort_order for m in max_order), default=-1)) + 1
    db.add(ChoreTypeMeta(key=body.key, sort_order=next_order, enabled=True))
    db.commit()
    return _get_chore_type(body.key, db).as_dict(body.interval_minutes)


@router.put("/chore-types/{key}/definition")
def update_custom_chore_type(key: str, body: CustomChoreTypeUpdate, db: Session = Depends(get_db)):
    row = db.get(CustomChoreType, key)
    if row is None:
        raise HTTPException(404, f"'{key}' is not a custom chore type (built-in types can only have their "
                                  f"label/icon/order/enabled changed via PUT /api/chore-types/{{key}}/meta)")
    if body.label is not None:
        row.label = body.label
    if body.icon is not None:
        row.icon = body.icon
    if body.fields is not None:
        row.fields_json = [f.model_dump() for f in body.fields]
    if "interval_minutes" in body.model_fields_set:
        row.interval_minutes = body.interval_minutes
    db.commit()
    return _get_chore_type(key, db).as_dict(row.interval_minutes)


@router.put("/chore-types/{key}/meta")
def update_chore_type_meta(key: str, body: ChoreTypeMetaUpdate, db: Session = Depends(get_db)):
    _get_chore_type(key, db)  # 404s if the key doesn't exist at all
    m = db.get(ChoreTypeMeta, key)
    if m is None:
        m = ChoreTypeMeta(key=key, sort_order=0)
        db.add(m)
    if body.enabled is not None:
        m.enabled = body.enabled
    if "label_override" in body.model_fields_set:
        m.label_override = body.label_override
    if "icon_override" in body.model_fields_set:
        m.icon_override = body.icon_override
    db.commit()
    return {"ok": True}


@router.post("/chore-types/reorder")
def reorder_chore_types(body: ReorderRequest, db: Session = Depends(get_db)):
    metas = _all_chore_type_metas(db)
    for i, key in enumerate(body.keys):
        m = metas.get(key)
        if m is None:
            m = ChoreTypeMeta(key=key, sort_order=i, enabled=True)
            db.add(m)
        else:
            m.sort_order = i
    db.commit()
    return {"ok": True}


@router.delete("/chore-types/{key}")
def delete_custom_chore_type(key: str, db: Session = Depends(get_db)):
    row = db.get(CustomChoreType, key)
    if row is None:
        raise HTTPException(400, "Only custom chore types can be deleted (built-in types can be disabled instead)")
    deleted_events = db.execute(select(Event).where(Event.chore_type == key)).scalars().all()
    for e in deleted_events:
        db.delete(e)
    db.delete(row)
    meta = db.get(ChoreTypeMeta, key)
    if meta:
        db.delete(meta)
    for qa in db.execute(select(QuickActionDef).where(QuickActionDef.chore_type_key == key)).scalars().all():
        db.delete(qa)
    db.commit()
    return {"ok": True, "deleted_events": len(deleted_events)}


@router.put("/chore-types/{key}/settings")
def update_settings(key: str, body: SettingsUpdate, db: Session = Depends(get_db)):
    ct = _get_chore_type(key, db)
    # partial update: only fields the client actually sent are touched, so
    # e.g. toggling reminder_enabled never resets the interval
    fields_set = body.model_fields_set
    if "interval_minutes" in fields_set:
        if body.interval_minutes != _interval_minutes(db, ct):
            # a new interval should take effect right away, not be shadowed
            # by an older one-off next-due override
            override = db.get(Setting, f"next_due_override:{ct.key}")
            if override is not None:
                db.delete(override)
        _set_setting(db, f"interval:{ct.key}", {"interval_minutes": body.interval_minutes})
    if ct.session_window_configurable and "session_window_minutes" in fields_set:
        _set_setting(
            db, f"session_window:{ct.key}", {"session_window_minutes": body.session_window_minutes}
        )
    if body.reminder_enabled is not None:
        _update_reminder_setting(db, ct.key, enabled=body.reminder_enabled)
    if "push_lead_minutes" in fields_set:
        _update_reminder_setting(db, ct.key, lead_minutes=body.push_lead_minutes or 0)
    db.commit()
    d = ct.as_dict(_interval_minutes(db, ct), _session_window_minutes(db, ct))
    d["reminder_enabled"] = _reminder_enabled(db, ct.key)
    d["push_lead_minutes"] = _push_lead_minutes(db, ct.key)
    return d


@router.put("/chore-types/{key}/next-due", response_model=StatusOut)
def update_next_due(key: str, body: NextDueUpdate, db: Session = Depends(get_db)):
    """Override when the next reminder fires, for this cycle only (`due_at`
    null clears the override). Reverts to the normal interval once the next
    event is logged."""
    ct = _get_chore_type(key, db)
    tz = _profile_timezone(_get_profile_dict(db))
    existing = db.get(Setting, f"next_due_override:{ct.key}")
    if body.due_at is None:
        if existing is not None:
            db.delete(existing)
    else:
        last = _last_event(db, ct.key)
        _set_setting(
            db,
            f"next_due_override:{ct.key}",
            {
                "due_at": as_utc(body.due_at).isoformat(),
                "event_id": last.id if last else None,
                "set_at": _now().isoformat(),
            },
        )
    db.commit()
    return _status_for(ct, db, tz)


@router.post("/events", response_model=EventOut)
def create_event(body: EventCreate, db: Session = Depends(get_db)):
    ct = _get_chore_type(body.chore_type, db)
    timestamp = body.timestamp or _now()
    data = ct.compute_derived(dict(body.data), timestamp)
    timestamp = ct.event_timestamp(data, timestamp)
    event = Event(
        chore_type=ct.key,
        timestamp=timestamp,
        data=data,
        notes=body.notes,
        person_id=body.person_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_out(ct, event, db)


@router.get("/events", response_model=list[EventOut])
def list_events(
    chore_type: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    stmt = select(Event).order_by(Event.timestamp.desc()).limit(limit)
    if chore_type:
        stmt = stmt.where(Event.chore_type == chore_type)
    if since:
        stmt = stmt.where(Event.timestamp >= since)
    if until:
        stmt = stmt.where(Event.timestamp <= until)
    events = db.execute(stmt).scalars().all()
    return [_event_out(_get_chore_type(e.chore_type, db), e, db) for e in events]


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return _event_out(_get_chore_type(event.chore_type, db), event, db)


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(event_id: int, body: EventUpdate, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    ct = _get_chore_type(event.chore_type, db)
    if body.timestamp is not None:
        event.timestamp = body.timestamp
    if body.data is not None:
        event.data = ct.compute_derived(dict(body.data), as_utc(event.timestamp))
        event.timestamp = ct.event_timestamp(event.data, as_utc(event.timestamp))
    if body.notes is not None:
        event.notes = body.notes
    if "person_id" in body.model_fields_set:
        event.person_id = body.person_id
    db.commit()
    db.refresh(event)
    return _event_out(ct, event, db)


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    db.delete(event)
    db.commit()
    return {"ok": True}


def _agg_value(field, values: list[float]) -> float | None:
    """None means "no data" (as opposed to a real 0), so charts can leave a
    gap instead of drawing a misleading zero - important for stat_agg="last"
    fields like a weight reading, where 0 would be nonsensical."""
    if not values:
        return None
    if field.stat_agg == "avg":
        return sum(values) / len(values)
    if field.stat_agg == "last":
        return values[-1]
    return sum(values)


def _today_bounds(tz: ZoneInfo) -> tuple[datetime, datetime]:
    local_now = _now().astimezone(tz)
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    start = local_midnight.astimezone(timezone.utc)
    end = (local_midnight + timedelta(days=1)).astimezone(timezone.utc)
    return start, end


def _status_for(ct, db: Session, tz: ZoneInfo) -> StatusOut:
    last = _last_event(db, ct.key)
    interval = _interval_minutes(db, ct)
    last_out = _event_out(ct, last, db) if last else None
    next_due, next_due_overridden = _compute_next_due(db, ct, last, tz)
    overdue = bool(next_due and next_due < _now())

    active_session_event_id = None
    window = _session_window_minutes(db, ct)
    if last_out and window:
        last_activity = ct.last_activity(last.data, last_out.timestamp)
        if _now() - last_activity <= timedelta(minutes=window):
            active_session_event_id = last.id

    open_event_id = None
    if last_out and ct.has_start_end and ct.is_open(last.data):
        open_event_id = last.id

    today_start, today_end = _today_bounds(tz)
    today_key = today_start.astimezone(tz).date().isoformat()
    # look back a few days too, so a chore type like sleep that started
    # yesterday (or earlier) but spans into today via split_across_days
    # still contributes its today-portion - everything else just gets
    # filtered back out below since it didn't start today and isn't split.
    lookback_start = today_start - timedelta(days=3)
    today_stmt = select(Event).where(
        Event.chore_type == ct.key, Event.timestamp >= lookback_start, Event.timestamp < today_end
    )
    candidate_events = db.execute(today_stmt).scalars().all()
    today: dict[str, float] = {}
    for f in ct.numeric_fields():
        values: list[float] = []
        for e in candidate_events:
            e_ts = as_utc(e.timestamp)
            split = ct.split_across_days(e.data, e_ts, tz)
            if split:
                contribution = split.get(today_key, {}).get(f.name)
                if contribution is not None:
                    values.append(contribution)
                continue
            if e_ts < today_start:
                continue  # didn't start today and isn't a split-eligible span
            val = e.data.get(f.name)
            if isinstance(val, (int, float)):
                values.append(val)
        agg = _agg_value(f, values)
        today[f.name] = round(agg, 1) if agg is not None else 0.0

    return StatusOut(
        chore_type=ct.key,
        label=ct.label,
        icon=ct.icon,
        last_event=last_out,
        next_due=next_due,
        next_due_overridden=next_due_overridden,
        reminder_enabled=_reminder_enabled(db, ct.key),
        interval_minutes=interval,
        overdue=overdue,
        active_session_event_id=active_session_event_id,
        open_event_id=open_event_id,
        today=today,
    )


@router.get("/status", response_model=list[StatusOut])
def status_all(db: Session = Depends(get_db)):
    tz = _profile_timezone(_get_profile_dict(db))
    return [_status_for(ct, db, tz) for ct in _effective_chore_types(db, enabled_only=True)]


# ---------- competition (per-person stats) ----------

COMPETITION_PERIODS = ("today", "7", "30", "all")
COMPETITION_HIDDEN_KEY = "competition_hidden"


def _competition_hidden(db: Session) -> list[str]:
    """Board ids the household has decided not to compete in. One list for
    everybody: what is worth competing over is a shared rule, so it must not
    differ from phone to phone."""
    setting = db.get(Setting, COMPETITION_HIDDEN_KEY)
    return sorted(setting.value.get("boards", [])) if setting and setting.value else []


@router.put("/competition/hidden")
def update_competition_hidden(body: CompetitionHiddenUpdate, db: Session = Depends(get_db)):
    hidden = set(_competition_hidden(db))
    hidden.update(body.hide)
    hidden.difference_update(body.show)
    _set_setting(db, COMPETITION_HIDDEN_KEY, {"boards": sorted(hidden)})
    db.commit()
    return {"hidden": sorted(hidden)}


@router.get("/competition")
def competition(db: Session = Depends(get_db)):
    """Everything the Competition tab needs, for every period at once, so the
    UI can show today / last 7 days / last 30 days leaders side by side and
    switch periods without another round trip.

    A "board" is one ranking: either how many entries someone logged for a
    chore type (`<key>:count`) or the total of one of its summable numeric
    fields (`<key>:<field>`, e.g. `feeding:total_amount_ml`). `scores[period]
    [board_id][bucket]` is that total, where `bucket` is a person id or
    "unassigned". Periods: "today" (since local midnight), "7" and "30"
    (rolling days) and "all". Buckets with no score are omitted."""
    tz = _profile_timezone(_get_profile_dict(db))
    now = _now()
    since = {
        "today": _today_bounds(tz)[0],
        "7": now - timedelta(days=7),
        "30": now - timedelta(days=30),
        "all": None,
    }
    people = db.execute(select(Person).order_by(Person.sort_order, Person.id)).scalars().all()

    chore_type_results = []
    scores: dict[str, dict[str, dict[str, float]]] = {p: {} for p in COMPETITION_PERIODS}
    for ct in _effective_chore_types(db, enabled_only=True):
        events = db.execute(select(Event).where(Event.chore_type == ct.key)).scalars().all()
        if not events:
            continue  # nothing ever logged - not worth a category

        # "last"-aggregated fields (e.g. weight_g, height_cm) are point-in-
        # time readings, not something to sum - summing several weight
        # readings across a period is meaningless. Competition is about
        # totals/counts, so only sum-aggregated numeric fields qualify.
        fields = [f for f in ct.numeric_fields() if f.stat_agg == "sum"]
        boards = [{"id": f"{ct.key}:count", "metric": "count", "label": "Events", "unit": "", "display": None}] + [
            {"id": f"{ct.key}:{f.name}", "metric": f.name, "label": f.label, "unit": f.unit or "", "display": f.display}
            for f in fields
        ]
        for period in COMPETITION_PERIODS:
            for b in boards:
                scores[period][b["id"]] = defaultdict(float)

        for e in events:
            ts = as_utc(e.timestamp)
            bucket = str(e.person_id) if e.person_id is not None else "unassigned"
            for period in COMPETITION_PERIODS:
                lower = since[period]
                if lower is not None and ts < lower:
                    continue
                board_scores = scores[period]
                board_scores[f"{ct.key}:count"][bucket] += 1
                for f in fields:
                    val = e.data.get(f.name)
                    # bool is a subclass of int in Python, so True/False already
                    # contribute 1/0 here - no separate boolean-counting branch
                    if isinstance(val, (int, float)):
                        board_scores[f"{ct.key}:{f.name}"][bucket] += val

        chore_type_results.append({"key": ct.key, "label": ct.label, "icon": ct.icon, "boards": boards})

    return {
        "people": [{"id": p.id, "name": p.name, "color": p.color} for p in people],
        "today": now.astimezone(tz).date().isoformat(),
        "periods": list(COMPETITION_PERIODS),
        # boards the household excluded from the competition (shared by all devices)
        "hidden": _competition_hidden(db),
        "chore_types": chore_type_results,
        "scores": {
            period: {
                board: {bucket: round(v, 1) for bucket, v in by_bucket.items() if v}
                for board, by_bucket in boards.items()
            }
            for period, boards in scores.items()
        },
    }


@router.get("/status/{key}", response_model=StatusOut)
def status_one(key: str, db: Session = Depends(get_db)):
    ct = _get_chore_type(key, db)
    tz = _profile_timezone(_get_profile_dict(db))
    return _status_for(ct, db, tz)


STATS_LOOKBACK_DAYS = 30  # history always loaded, so a short view window still has data to forecast from
LAST_FIELD_LOOKBACK_DAYS = 120  # point-in-time readings (weight/height) are sparse - look further back
FORECAST_RECENT_DAYS = 7  # per-day metrics are forecast as the mean of this many recent full days


def _age_on(profile: dict, d: date) -> int | None:
    bd = profile.get("birth_date")
    return (d - date.fromisoformat(bd)).days if bd else None


def _linear_forecast(readings: list[tuple[date, float]], last_date: date) -> list[dict]:
    """Least-squares line through recent readings, continued to `last_date`.
    The fallback for point-in-time fields with no growth standard (or no
    birth date to look one up with)."""
    if len(readings) < 2:
        return []
    x0 = readings[0][0]
    xs = [(d - x0).days for d, _ in readings]
    ys = [v for _, v in readings]
    n = len(xs)
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0:
        return []
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom
    intercept = mean_y - slope * mean_x
    start = readings[-1][0]
    return [
        {"date": (start + timedelta(days=k)).isoformat(),
         "value": round(max(0.0, intercept + slope * ((start - x0).days + k)), 1)}
        for k in range((last_date - start).days + 1)
    ]


def _growth_forecast(
    ct_key: str, field, profile: dict, sex: str | None, reading: tuple[date, float], last_date: date
) -> list[dict] | None:
    """Where the baby will be if they keep tracking along the same WHO growth
    curve as at the last reading: same z-score if sex is known, otherwise the
    same relative position within the (both-sex) band. None if there's no
    standard for this field or no birth date."""
    growth = growth_field(ct_key, field.name)
    if not growth or not profile.get("birth_date"):
        return None
    metric, factor, decimals = growth
    r_date, r_val = reading
    age0 = _age_on(profile, r_date)
    if age0 is None or age0 < 0:
        return None
    kg = r_val / factor
    z = growth_z(metric, age0, sex, kg)
    band0 = growth_band(metric, age0, sex)
    if band0 is None:
        return None
    pos = (kg - band0[0]) / (band0[2] - band0[0]) if band0[2] > band0[0] else 0.5

    points = []
    for k in range((last_date - r_date).days + 1):
        d = r_date + timedelta(days=k)
        age = age0 + k
        if z is not None:
            v = growth_value_at_z(metric, age, sex, z)
        else:
            band = growth_band(metric, age, None)
            v = band[0] + pos * (band[2] - band[0]) if band else None
        if v is None:
            break  # ran past the end of the WHO tables (5 years)
        points.append({"date": d.isoformat(), "value": round(v * factor, decimals)})
    return points


@router.get("/stats/{key}")
def stats(
    key: str,
    days: int = Query(90, le=3650),
    all_time: bool = False,
    forecast_days: int = Query(0, ge=0, le=730),
    db: Session = Depends(get_db),
):
    """Per-day aggregation for charts, zero-filled for every calendar day.
    Each day carries the healthy range for the baby's age at that date
    (`<field>_ref_min/_ref_max[/_ref_mid]`), including days in the future when
    `forecast_days` > 0 (those have `future: true` and no values). Today is
    flagged `partial: true` - it isn't finished, so it shouldn't be judged.
    With a forecast horizon, `forecast[<field>]` is a projection of each metric."""
    ct = _get_chore_type(key, db)
    profile = _get_profile_dict(db)
    tz = _profile_timezone(profile)
    sex = profile.get("sex")
    now = _now()
    today = now.astimezone(tz).date()

    if all_time:
        first_stmt = (
            select(Event).where(Event.chore_type == ct.key).order_by(Event.timestamp.asc()).limit(1)
        )
        first = db.execute(first_stmt).scalars().first()
        since = as_utc(first.timestamp) if first else now
    else:
        since = now - timedelta(days=days)

    numeric_fields_defs = ct.numeric_fields()
    has_last_field = any(f.stat_agg == "last" for f in numeric_fields_defs)
    lookback = LAST_FIELD_LOOKBACK_DAYS if has_last_field else STATS_LOOKBACK_DAYS
    history_start = min(since, now - timedelta(days=lookback))

    stmt = (
        select(Event)
        .where(Event.chore_type == ct.key, Event.timestamp >= history_start)
        .order_by(Event.timestamp.asc())
    )
    events = db.execute(stmt).scalars().all()
    for e in events:
        e.timestamp = as_utc(e.timestamp)
    in_range = [e for e in events if e.timestamp >= since]

    numeric_fields = [f.name for f in numeric_fields_defs]
    daily_counts: dict[str, int] = defaultdict(int)
    daily_values: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    intervals_minutes: list[float] = []

    for e in events:
        # events belong to the day they *started* - except chore types with
        # a real duration that can cross midnight (sleep), whose split
        # values across the days it actually spans (see split_across_days).
        day = e.timestamp.astimezone(tz).date().isoformat()
        daily_counts[day] += 1

        split = ct.split_across_days(e.data, e.timestamp, tz)
        claimed_fields: set[str] = set()
        if split:
            for split_day, fields in split.items():
                for fname, contribution in fields.items():
                    daily_values[split_day][fname].append(contribution)
                    claimed_fields.add(fname)

        for f in numeric_fields_defs:
            if f.name in claimed_fields:
                continue
            val = e.data.get(f.name)
            if isinstance(val, (int, float)):
                daily_values[day][f.name].append(val)

    for prev, cur in zip(in_range, in_range[1:]):
        intervals_minutes.append((cur.timestamp - prev.timestamp).total_seconds() / 60)

    # zero-fill every calendar day in the window (not just days with events)
    # so charts have a true continuous date axis, then run on into the future
    # if a forecast was asked for
    hist_start_date = history_start.astimezone(tz).date()
    since_date = since.astimezone(tz).date()
    # nothing to show before the baby was born, or before this chore was first
    # logged - a long period would otherwise open with months of blank axis
    floor = profile.get("birth_date")
    if floor:
        since_date = max(since_date, date.fromisoformat(floor))
    first_ts = db.execute(select(func.min(Event.timestamp)).where(Event.chore_type == ct.key)).scalar()
    if first_ts is not None:
        since_date = max(since_date, as_utc(first_ts).astimezone(tz).date())
    since_date = min(since_date, today)
    last_date = today + timedelta(days=forecast_days)
    references: dict[str, dict] = {}

    def add_ref(entry: dict, name: str, age: int | None) -> None:
        ref = reference_range(ct.key, name, age, sex)
        if not ref:
            return
        entry[f"{name}_ref_min"] = ref["min"]
        entry[f"{name}_ref_max"] = ref["max"]
        if "mid" in ref:
            entry[f"{name}_ref_mid"] = ref["mid"]
        references.setdefault(
            name, {"source_label": ref.get("source_label"), "source_url": ref.get("source_url")}
        )

    entries = []
    for i in range((last_date - hist_start_date).days + 1):
        d = hist_start_date + timedelta(days=i)
        ds = d.isoformat()
        age = _age_on(profile, d)
        is_future = d > today
        entry: dict = {"date": ds, "count": None if is_future else daily_counts[ds]}
        if age is not None:
            entry["age_days"] = age
        if is_future:
            entry["future"] = True
        elif d == today:
            entry["partial"] = True
        for f in numeric_fields_defs:
            if is_future:
                entry[f.name] = None
            else:
                agg = _agg_value(f, daily_values[ds][f.name])
                entry[f.name] = round(agg, 1) if agg is not None else None
            add_ref(entry, f.name, age)
        add_ref(entry, "count", age)
        entries.append(entry)

    forecast: dict[str, list[dict]] = {}
    if forecast_days > 0 and events:
        first_event_date = events[0].timestamp.astimezone(tz).date().isoformat()
        complete = [e for e in entries if not e.get("future") and not e.get("partial")]
        recent = [e for e in complete[-FORECAST_RECENT_DAYS:] if e["date"] >= first_event_date]
        ahead = [e["date"] for e in entries if e.get("future")]

        def flat(name: str, values: list[float]) -> None:
            # "if things carry on as lately": the recent mean, from today on
            if len(values) >= 2:
                mean = round(sum(values) / len(values), 1)
                forecast[name] = [{"date": today.isoformat(), "value": mean}] + [
                    {"date": ds, "value": mean} for ds in ahead
                ]

        flat("count", [e["count"] for e in recent])
        for f in numeric_fields_defs:
            if f.stat_agg == "last":
                readings = [
                    (date.fromisoformat(e["date"]), e[f.name])
                    for e in complete
                    if e[f.name] is not None
                ]
                if not readings:
                    continue
                points = _growth_forecast(ct.key, f, profile, sex, readings[-1], last_date)
                if points is None:
                    cutoff = today - timedelta(days=30)
                    points = _linear_forecast([r for r in readings if r[0] >= cutoff], last_date)
                if points:
                    forecast[f.name] = [p for p in points if p["date"] >= since_date.isoformat()]
            else:
                flat(f.name, [e[f.name] for e in recent if e[f.name] is not None])

    # latest point-in-time reading with its WHO percentile (needs sex + birth date)
    latest: dict[str, dict] = {}
    for f in numeric_fields_defs:
        if f.stat_agg != "last":
            continue
        reading = next(
            ((e["date"], e[f.name]) for e in reversed(entries) if not e.get("future") and e[f.name] is not None),
            None,
        )
        if not reading:
            continue
        info = {"date": reading[0], "value": reading[1]}
        growth = growth_field(ct.key, f.name)
        age = _age_on(profile, date.fromisoformat(reading[0]))
        if growth and age is not None:
            metric, factor, _ = growth
            z = growth_z(metric, age, sex, reading[1] / factor)
            if z is not None:
                info["z"] = round(z, 2)
                info["percentile"] = round(z_to_percentile(z), 1)
        latest[f.name] = info

    day_dicts = [e for e in entries if e["date"] >= since_date.isoformat()]

    extra = ct.stats_extra(in_range, tz, profile)
    for rate in extra.get("growth_rate", []):
        age = _age_days(profile, datetime.fromisoformat(rate["timestamp"]).astimezone(tz))
        ref = reference_range(ct.key, "gain_g_per_day", age, sex)
        if ref:
            rate["ref_min"] = ref["min"]
            rate["ref_max"] = ref["max"]
            rate["ref_source_label"] = ref.get("source_label")
            rate["ref_source_url"] = ref.get("source_url")

    avg_interval = sum(intervals_minutes) / len(intervals_minutes) if intervals_minutes else None
    return {
        "chore_type": ct.key,
        "days": day_dicts,
        "numeric_fields": numeric_fields,
        "total_events": len(in_range),
        "avg_interval_minutes": round(avg_interval, 1) if avg_interval else None,
        "today": today.isoformat(),
        "age_days": _age_on(profile, today),
        "sex": sex,
        # whether *any* healthy-range guidance exists for this chore type, so
        # the UI can ask for a birth date when it's the only thing missing
        "has_guidance": any(reference_range(ct.key, n, 30, sex) for n in ["count", *numeric_fields]),
        "forecast_days": forecast_days,
        "forecast": forecast,
        "references": references,
        "latest": latest,
        **extra,
    }
