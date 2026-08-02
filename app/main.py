from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import router as api_router
from app.chore_types.base import load_builtin_types
from app.db import init_db

load_builtin_types()

app = FastAPI(title="Baby Monitor")
app.include_router(api_router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/sw.js")
def service_worker():
    # served from the root (not /static/) so its default scope covers the
    # whole app, including "/" - required for install prompts to fire
    return FileResponse("app/static/sw.js", media_type="application/javascript")
