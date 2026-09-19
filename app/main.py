import asyncio
import time

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import router as api_router
from app.chore_types.base import REGISTRY, load_builtin_types
from app.db import SessionLocal, init_db
from app.models import ChoreTypeMeta, QuickActionDef
from app.push import ensure_vapid_keys, reminder_loop
from app.push import router as push_router

load_builtin_types()

app = FastAPI(title="Baby Monitor")
app.include_router(api_router)
app.include_router(push_router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Cache-busts style.css/app.js on every process restart (i.e. every deploy),
# so browsers don't need a manual hard-refresh to pick up UI changes.
ASSET_VERSION = str(int(time.time()))


def _seed_chore_type_order() -> None:
    """Give every builtin chore type a stable sort_order on first run, so
    later custom chore types (which pick sort_order = max + 1) append
    after them instead of jumping to the front."""
    db = SessionLocal()
    try:
        existing = {m.key for m in db.query(ChoreTypeMeta).all()}
        next_order = db.query(ChoreTypeMeta).count()
        for key in REGISTRY:
            if key not in existing:
                db.add(ChoreTypeMeta(key=key, sort_order=next_order, enabled=True))
                next_order += 1
        db.commit()
    finally:
        db.close()


def _seed_feeding_quick_actions() -> None:
    """One-tap "Breast" / "Formula" / "Pumped" buttons on the feeding card -
    each just appends a new checkpoint entry stamped with that method (mode
    "log": no target field/value, unlike the increment/absolute quick
    actions a user can configure themselves). Seeded once; if the user later
    deletes or edits them, an empty table for feeding means "no quick
    actions", not "reseed" - only seed when there are truly none yet."""
    if "feeding" not in REGISTRY:
        return
    db = SessionLocal()
    try:
        has_any = db.query(QuickActionDef).filter(QuickActionDef.chore_type_key == "feeding").count()
        if has_any:
            return
        defaults = [
            ("🤱 Breast", "breast"),
            ("🍼 Formula", "formula"),
            ("🍶 Pumped", "pumped"),
        ]
        for i, (label, method) in enumerate(defaults):
            db.add(
                QuickActionDef(
                    chore_type_key="feeding",
                    label=label,
                    mode="log",
                    entries_field="entries",
                    match_field="method",
                    match_value=method,
                    target_field="",
                    value=0.0,
                    sort_order=i,
                )
            )
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
async def on_startup():
    init_db()
    _seed_chore_type_order()
    _seed_feeding_quick_actions()
    ensure_vapid_keys()
    # keep a reference so the loop isn't garbage-collected
    app.state.reminder_task = asyncio.create_task(reminder_loop())


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "asset_version": ASSET_VERSION})


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/sw.js")
def service_worker():
    # served from the root (not /static/) so its default scope covers the
    # whole app, including "/" - required for install prompts to fire
    return FileResponse("app/static/sw.js", media_type="application/javascript")
