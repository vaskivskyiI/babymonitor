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
        if "custom_chore_types" in existing_tables:
            custom_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(custom_chore_types)"))}
            if "has_start_end" not in custom_cols:
                conn.execute(text("ALTER TABLE custom_chore_types ADD COLUMN has_start_end BOOLEAN DEFAULT 0"))
                conn.commit()


def _backup_before_upgrade():
    """One-time safety copy of the database before the scheduling upgrade
    touches the schema (`<db>.pre-schedules.bak`). Nothing is ever deleted or
    rewritten by the upgrade - events and settings stay as they are - this is
    just a belt-and-braces copy."""
    import shutil

    bak = DB_PATH + ".pre-schedules.bak"
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0 and not os.path.exists(bak):
        try:
            shutil.copy2(DB_PATH, bak)
        except OSError:
            pass


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    _backup_before_upgrade()
    from app import models  # noqa: F401 register models

    Base.metadata.create_all(bind=engine)
    _migrate_add_columns()
