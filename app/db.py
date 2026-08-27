import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_PATH = os.environ.get("DB_PATH", "/data/babymonitor.db")

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_add_columns():
    """`create_all` only creates missing *tables*, not columns added to a
    table that already exists on disk - so a column added to an existing
    model (e.g. Event.person_id) needs a manual ALTER TABLE for anyone
    upgrading from an older DB. Cheap and idempotent: checks PRAGMA
    table_info before adding, so it's a no-op on a fresh DB (table doesn't
    exist yet) or one that's already been migrated."""
    with engine.connect() as conn:
        existing_tables = {
            row[0] for row in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        }
        if "events" not in existing_tables:
            return
        columns = {row[1] for row in conn.execute(text("PRAGMA table_info(events)"))}
        if "person_id" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN person_id INTEGER REFERENCES people(id)"))
            conn.commit()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    from app import models  # noqa: F401 register models

    Base.metadata.create_all(bind=engine)
    _migrate_add_columns()
