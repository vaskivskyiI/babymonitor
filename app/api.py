import copy
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chore_types.base import REGISTRY, ChoreType, FieldDef, FieldOption
from app.custom_types import DynamicChoreType
from app.db import get_db
from app.feeding_guidance import feeding_guidance
from app.models import ChoreTypeMeta, CustomChoreType, Event, QuickActionDef, Setting, as_utc
from app.reference_ranges import reference_range
from app.schemas import (
    ChoreTypeMetaUpdate,
    CustomChoreTypeCreate,
    CustomChoreTypeUpdate,
    EventCreate,
    EventOut,
    EventUpdate,
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


def _event_out(ct, event: Event) -> EventOut:
    event.timestamp = as_utc(event.timestamp)
    event.created_at = as_utc(event.created_at)
    event.updated_at = as_utc(event.updated_at)
    out = EventOut.model_validate(event)
    out.summary = ct.summarize(event.data)
    return out


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
        result.append(d)
    return result


@router.post("/chore-types/{key}/quick-actions")
def create_quick_action(key: str, body: QuickActionCreate, db: Session = Depends(get_db)):
    _get_chore_type(key, db)  # 404s if unknown
    max_order = db.execute(
        select(QuickActionDef).where(QuickActionDef.chore_type_key == key)
    ).scalars().all()
    next_order = (max((r.sort_order for r in max_order), default=-1)) + 1
    row = QuickActionDef(chore_type_key=key, sort_order=next_order, **body.model_dump())
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
    _set_setting(db, f"interval:{ct.key}", {"interval_minutes": body.interval_minutes})
    if ct.session_window_configurable:
        _set_setting(
            db, f"session_window:{ct.key}", {"session_window_minutes": body.session_window_minutes}
        )
    db.commit()
    return ct.as_dict(_interval_minutes(db, ct), _session_window_minutes(db, ct))


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
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_out(ct, event)


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
    return [_event_out(_get_chore_type(e.chore_type, db), e) for e in events]


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return _event_out(_get_chore_type(event.chore_type, db), event)


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
    db.commit()
    db.refresh(event)
    return _event_out(ct, event)


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
    stmt = (
        select(Event)
        .where(Event.chore_type == ct.key)
        .order_by(Event.timestamp.desc())
        .limit(1)
    )
    last = db.execute(stmt).scalars().first()
    interval = _interval_minutes(db, ct)
    last_out = _event_out(ct, last) if last else None
    next_due = ct.next_due(last_out.timestamp if last_out else None, interval, tz)
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


@router.get("/status/{key}", response_model=StatusOut)
def status_one(key: str, db: Session = Depends(get_db)):
    ct = _get_chore_type(key, db)
    tz = _profile_timezone(_get_profile_dict(db))
    return _status_for(ct, db, tz)


@router.get("/stats/{key}")
def stats(
    key: str,
    days: int = Query(90, le=3650),
    all_time: bool = False,
    db: Session = Depends(get_db),
):
    ct = _get_chore_type(key, db)
    profile = _get_profile_dict(db)
    tz = _profile_timezone(profile)
    if all_time:
        first_stmt = (
            select(Event).where(Event.chore_type == ct.key).order_by(Event.timestamp.asc()).limit(1)
        )
        first = db.execute(first_stmt).scalars().first()
        since = as_utc(first.timestamp) if first else _now()
    else:
        since = _now() - timedelta(days=days)
    stmt = (
        select(Event)
        .where(Event.chore_type == ct.key, Event.timestamp >= since)
        .order_by(Event.timestamp.asc())
    )
    events = db.execute(stmt).scalars().all()
    for e in events:
        e.timestamp = as_utc(e.timestamp)

    numeric_fields_defs = ct.numeric_fields()
    numeric_fields = [f.name for f in numeric_fields_defs]
    daily_counts: dict[str, int] = defaultdict(int)
    daily_values: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    intervals_minutes: list[float] = []

    prev_ts = None
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

        if prev_ts is not None:
            intervals_minutes.append((e.timestamp - prev_ts).total_seconds() / 60)
        prev_ts = e.timestamp

    # zero-fill every calendar day in the window (not just days with events)
    # so charts have a true continuous date axis
    start_date = since.astimezone(tz).date()
    end_date = _now().astimezone(tz).date()
    days_list = [
        (start_date + timedelta(days=i)).isoformat() for i in range((end_date - start_date).days + 1)
    ]
    avg_interval = sum(intervals_minutes) / len(intervals_minutes) if intervals_minutes else None

    day_dicts = []
    for d in days_list:
        day_age = _age_days(profile, datetime.fromisoformat(d).replace(tzinfo=tz))
        entry = {"date": d, "count": daily_counts[d]}
        if day_age is not None:
            entry["age_days"] = day_age
        for f in numeric_fields_defs:
            agg = _agg_value(f, daily_values[d][f.name])
            entry[f.name] = round(agg, 1) if agg is not None else None
            ref = reference_range(ct.key, f.name, day_age)
            if ref:
                entry[f"{f.name}_ref_min"] = ref["min"]
                entry[f"{f.name}_ref_max"] = ref["max"]
                entry[f"{f.name}_ref_source_label"] = ref.get("source_label")
                entry[f"{f.name}_ref_source_url"] = ref.get("source_url")
        day_dicts.append(entry)

    extra = ct.stats_extra(events, tz, profile)
    for rate in extra.get("growth_rate", []):
        age = _age_days(profile, datetime.fromisoformat(rate["timestamp"]).astimezone(tz))
        ref = reference_range(ct.key, "gain_g_per_day", age)
        if ref:
            rate["ref_min"] = ref["min"]
            rate["ref_max"] = ref["max"]
            rate["ref_source_label"] = ref.get("source_label")
            rate["ref_source_url"] = ref.get("source_url")

    return {
        "chore_type": ct.key,
        "days": day_dicts,
        "numeric_fields": numeric_fields,
        "total_events": len(events),
        "avg_interval_minutes": round(avg_interval, 1) if avg_interval else None,
        **extra,
    }
