from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chore_types.base import REGISTRY
from app.db import get_db
from app.feeding_guidance import feeding_guidance
from app.models import Event, Setting, as_utc
from app.reference_ranges import reference_range
from app.schemas import (
    EventCreate,
    EventOut,
    EventUpdate,
    ProfileOut,
    ProfileUpdate,
    SettingsUpdate,
    StatusOut,
)

router = APIRouter(prefix="/api")

PROFILE_KEY = "profile"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_chore_type(key: str):
    ct = REGISTRY.get(key)
    if ct is None:
        raise HTTPException(404, f"Unknown chore type '{key}'")
    return ct


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
    value = {
        "name": body.name,
        "birth_date": body.birth_date.isoformat() if body.birth_date else None,
        "birth_weight_g": body.birth_weight_g,
        "timezone": body.timezone or "UTC",
    }
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


@router.get("/chore-types")
def list_chore_types(db: Session = Depends(get_db)):
    return [
        ct.as_dict(_interval_minutes(db, ct), _session_window_minutes(db, ct))
        for ct in REGISTRY.values()
    ]


@router.put("/chore-types/{key}/settings")
def update_settings(key: str, body: SettingsUpdate, db: Session = Depends(get_db)):
    ct = _get_chore_type(key)
    _set_setting(db, f"interval:{ct.key}", {"interval_minutes": body.interval_minutes})
    if ct.session_window_configurable:
        _set_setting(
            db, f"session_window:{ct.key}", {"session_window_minutes": body.session_window_minutes}
        )
    db.commit()
    return ct.as_dict(_interval_minutes(db, ct), _session_window_minutes(db, ct))


@router.post("/events", response_model=EventOut)
def create_event(body: EventCreate, db: Session = Depends(get_db)):
    ct = _get_chore_type(body.chore_type)
    timestamp = body.timestamp or _now()
    data = ct.compute_derived(dict(body.data), timestamp)
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
    return [_event_out(_get_chore_type(e.chore_type), e) for e in events]


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return _event_out(_get_chore_type(event.chore_type), event)


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(event_id: int, body: EventUpdate, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    ct = _get_chore_type(event.chore_type)
    if body.timestamp is not None:
        event.timestamp = body.timestamp
    if body.data is not None:
        event.data = ct.compute_derived(dict(body.data), as_utc(event.timestamp))
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
    today_stmt = select(Event).where(
        Event.chore_type == ct.key, Event.timestamp >= today_start, Event.timestamp < today_end
    )
    today_events = db.execute(today_stmt).scalars().all()
    today: dict[str, float] = {}
    for f in ct.numeric_fields():
        values = [e.data.get(f.name) for e in today_events]
        values = [v for v in values if isinstance(v, (int, float))]
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
    return [_status_for(ct, db, tz) for ct in REGISTRY.values()]


@router.get("/status/{key}", response_model=StatusOut)
def status_one(key: str, db: Session = Depends(get_db)):
    ct = _get_chore_type(key)
    tz = _profile_timezone(_get_profile_dict(db))
    return _status_for(ct, db, tz)


@router.get("/stats/{key}")
def stats(key: str, days: int = Query(7, le=90), db: Session = Depends(get_db)):
    ct = _get_chore_type(key)
    profile = _get_profile_dict(db)
    tz = _profile_timezone(profile)
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
        day = e.timestamp.astimezone(tz).date().isoformat()
        daily_counts[day] += 1
        for f in numeric_fields_defs:
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
