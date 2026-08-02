# Baby Monitor

Self-hosted app for tracking baby chores (diaper changes, feedings, sleep,
pumping, ...) and viewing statistics. Built to run in Podman on a home
server, with a mobile-friendly web UI and a JSON API for Home Assistant.

## Features

- **Diaper changes**: mark pee / poop / both, plus separate flags for
  "peed during the change" / "pooped during the change".
- **Feeding**: a feeding is a *session* you build up as it happens. Add as
  many timestamped checkpoints as you like (breast left/right or formula,
  each with an optional baby weight and/or amount) while the feeding is
  in progress - switching breasts, topping up with formula, etc. Total
  breast milk (ml) is auto-calculated from weight gain across the
  checkpoints (or from manually-entered amounts if you don't weigh), and
  formula amount is summed separately. The dashboard offers "+ Add
  checkpoint" instead of "+ Log now" while a feeding is still open (within
  a configurable session window, default 45 min since the last
  checkpoint), and "+ New" to start a separate feeding anyway.
- **Weight**: quick weigh-in log (grams + optional notes).
- **Baby profile**: set a birth date (+ name, timezone) in Settings. Once
  set, the dashboard shows the baby's age, stats charts are labeled with
  age-in-days alongside the date, and "today" totals/day-bucketing use
  the configured timezone instead of UTC.
- **Normal-range guidance**: wet/poopy diaper counts per day and weight
  gain (g/day) charts are shown against a shaded band for commonly-cited
  pediatric ranges (by the baby's age), with a source link. This is
  general guidance only, not medical advice - see
  [Reference ranges used](#reference-ranges-used) below.
- Every event's timestamp defaults to "now" but is fully editable.
- Dashboard shows time since last event, time until the next one is due
  (per chore type, based on a configurable interval), and today's totals
  (e.g. wet/poopy diaper counts, ml fed, latest weight).
- History view to browse/edit/delete past events.
- Stats view with per-day charts (event counts, amounts, average
  interval between events, weight-gain rate) over 24h/7d/14d/30d.
- **Fully modular**: chore types are plugins under `app/chore_types/`.
  The frontend renders forms and charts generically from each type's
  field definitions - adding a new chore type requires no frontend
  changes. Built-in types: `diaper`, `feeding`, `sleep`, `pumping`, `weight`.

## Run with Podman

```bash
mkdir -p data
podman build -t babymonitor -f Containerfile .
podman run -d --name babymonitor \
  -p 8000:8000 \
  -v ./data:/data:Z \
  --restart unless-stopped \
  babymonitor
```

Or with `podman-compose` (uses `podman-compose.yml`):

```bash
podman-compose up -d --build
```

Then open `http://<server-ip>:8000` on your phone or laptop.

Data is stored in a single SQLite file at `/data/babymonitor.db`, which is
persisted via the `./data` bind mount - back that folder up.

## Home Assistant integration

The API is plain JSON, so Home Assistant can both read every chore
type's status/history (and keep its own long-term statistics on it) and
trigger any of them - diaper, feeding, weight, sleep, pumping, and any
chore type you add later.

### Reading status + history into HA (`rest` sensors)

`GET /api/status/{key}` returns the last event, next-due time, an
"active session" flag, and today's totals for every numeric field of
that chore type - one poll gets you everything for a sensor group. Add
`state_class: measurement` on numeric sensors and `device_class:
timestamp` on time sensors so HA's recorder keeps long-term statistics
(history graphs, `statistics` card, etc.), not just the current state.

```yaml
rest:
  - resource: http://<server-ip>:8000/api/status/diaper
    scan_interval: 300
    sensor:
      - name: "Baby last diaper change"
        value_template: "{{ value_json.last_event.timestamp }}"
        device_class: timestamp
      - name: "Baby next diaper due"
        value_template: "{{ value_json.next_due }}"
        device_class: timestamp
      - name: "Baby wet diapers today"
        value_template: "{{ value_json.today.pee | default(0) }}"
        state_class: measurement
      - name: "Baby poopy diapers today"
        value_template: "{{ value_json.today.poop | default(0) }}"
        state_class: measurement

  - resource: http://<server-ip>:8000/api/status/feeding
    scan_interval: 300
    sensor:
      - name: "Baby last feeding"
        value_template: "{{ value_json.last_event.timestamp }}"
        device_class: timestamp
      - name: "Baby next feeding due"
        value_template: "{{ value_json.next_due }}"
        device_class: timestamp
      - name: "Baby feeding in progress"
        value_template: "{{ value_json.active_session_event_id is not none }}"
      - name: "Baby breast milk today"
        value_template: "{{ value_json.today.total_breast_amount_ml | default(0) }}"
        unit_of_measurement: "ml"
        state_class: measurement
      - name: "Baby formula today"
        value_template: "{{ value_json.today.total_formula_amount_ml | default(0) }}"
        unit_of_measurement: "ml"
        state_class: measurement

  - resource: http://<server-ip>:8000/api/status/weight
    scan_interval: 3600
    sensor:
      - name: "Baby weight"
        value_template: "{{ value_json.last_event.data.weight_g }}"
        unit_of_measurement: "g"
        state_class: measurement
      - name: "Baby weight last measured"
        value_template: "{{ value_json.last_event.timestamp }}"
        device_class: timestamp

  - resource: http://<server-ip>:8000/api/profile
    scan_interval: 3600
    sensor:
      - name: "Baby age"
        value_template: "{{ value_json.age_days }}"
        unit_of_measurement: "d"
        state_class: measurement
```

Copy the `diaper` block's pattern for `sleep` and `pumping`, or any
chore type you add - `GET /api/chore-types` tells you each type's field
names/units, and every numeric field also appears under `today.<field>`.

### Triggering events from HA (`rest_command`)

Every chore type is logged the same way: `POST /api/events` with
`{"chore_type": "<key>", "data": {...}, "timestamp": "<optional ISO8601>"}`.
Omit `timestamp` to use "now". A few ready-to-use examples:

```yaml
rest_command:
  # Diaper - wet only / poopy only / both, with "happened during the change" flags
  log_diaper_wet:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "diaper", "data": {"pee": true, "poop": false}}'

  log_diaper_poop:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "diaper", "data": {"pee": false, "poop": true}}'

  log_diaper_both:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "diaper", "data": {"pee": true, "poop": true}}'

  # Weight - value comes from an HA input_number (e.g. a Bluetooth scale integration)
  log_weight:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "weight", "data": {"weight_g": {{ states("input_number.baby_scale") | float }} }}'

  # Feeding - starts a brand-new feeding session with one checkpoint (see
  # the note below for appending to an already-open session instead).
  log_feeding_bottle:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: >
      {"chore_type": "feeding", "data": {"entries": [{"timestamp": "{{ now().isoformat() }}", "method": "formula", "amount_ml": {{ states("input_number.bottle_ml") | int }} }]}}

  # Sleep / pumping
  log_sleep_start:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "sleep", "data": {}}'

  log_pumping:
    url: http://<server-ip>:8000/api/events
    method: POST
    content_type: "application/json"
    payload: '{"chore_type": "pumping", "data": {"amount_ml": {{ states("input_number.pump_ml") | int }} }}'
```

Call these from a script, automation, or a dashboard button
(`rest_command.log_diaper_wet` etc).

Note on **appending a checkpoint to an already-open feeding** from HA:
`POST /api/events` always creates a brand-new event, so
`log_feeding_bottle` above starts a *separate* feeding rather than
joining one in progress. `PUT /api/events/{id}` replaces the whole
`data.entries` array, so appending correctly means read the existing
entries, add one, then write the whole list back - a genuine
read-modify-write that plain `rest_command` templating can't do safely
on its own (no atomic "append"). If you want this fully automated from
HA, the reliable way is a small `pyscript`/`python_script` that does a
GET on `/api/events/{active_session_event_id}`, appends an entry to
`data.entries`, and PUTs it back; otherwise, use the app's own "+ Add
checkpoint" button for that part and let HA handle the rest (reminders,
one-shot logs, weight, etc).

### Baby profile from HA

`PUT /api/profile` with `{"birth_date": "2026-05-01", "name": "...",
"timezone": "Europe/Ljubljana"}` lets you set the birth date from HA
too (e.g. once, from a script), though it's normally a one-time setup
done in the app's Settings tab.

## API overview

- `GET /api/chore-types` - list chore types with their field schemas
- `PUT /api/chore-types/{key}/settings` - set reminder interval / session window (minutes)
- `GET /api/profile` / `PUT /api/profile` - baby's name, birth date, timezone (drives age display and day-bucketing)
- `POST /api/events` - log an event `{chore_type, timestamp?, data, notes?}`
- `GET /api/events?chore_type=&since=&until=&limit=` - list events
- `GET/PUT/DELETE /api/events/{id}` - fetch/edit/delete a single event
- `GET /api/status` / `GET /api/status/{key}` - last event, next due time, active session id, and today's totals per numeric field
- `GET /api/stats/{key}?days=7` - daily aggregation for charts, incl. `age_days`, `<field>_ref_min`/`_ref_max` reference-range bands where available, and `growth_rate` for `weight`

Interactive OpenAPI docs are available at `/docs`.

## Reference ranges used

The wet/poopy-diaper-per-day and weight-gain-per-day bands shown on the
Stats charts come from commonly-cited pediatric guidance, keyed to the
baby's age (via the birth date set in Settings):

- Wet diapers/day: day 1: 1-2, days 2-3: 2-4, day 4: 4-6, day 5+: 6-8
  ([AAP / HealthyChildren.org](https://www.healthychildren.org/English/ages-stages/baby/diapers-clothing/Pages/default.aspx)).
- Poopy diapers/day: roughly 1-4/day in the first month (breastfed
  babies are often at the higher end, formula-fed at the lower end);
  after ~6 weeks frequency can drop a lot and still be normal
  ([AAP - Pooping By the Numbers](https://www.healthychildren.org/English/ages-stages/baby/Pages/Pooping-By-the-Numbers.aspx)).
- Weight gain: ~20-40 g/day at 0-3 months, ~15-25 g/day at 3-6 months,
  ~7-15 g/day at 6-12 months
  ([WHO weight-for-age guidance, via Mayo Clinic](https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/infant-growth/faq-20058037)).

These are rough guides for a full-term, otherwise-healthy baby, **not
medical advice** - every baby is different, and you should talk to your
pediatrician about anything specific to yours. The source and this
disclaimer are shown next to each chart. To adjust or add ranges, edit
`app/reference_ranges.py`.

## Adding a new chore type

Create `app/chore_types/mytype.py`:

```python
from app.chore_types.base import ChoreType, FieldDef, register

@register
class MyChoreType(ChoreType):
    key = "mytype"
    label = "My Chore"
    icon = "🧴"
    default_interval_minutes = 60  # or None for no reminder

    fields = [
        FieldDef(name="amount", label="Amount", type="number", unit="ml", numeric_stat=True),
        FieldDef(name="notes", label="Notes", type="textarea"),
    ]

    def summarize(self, data: dict) -> str:
        return f"🧴 {data.get('amount', '')}ml"
```

Then add the import to `load_builtin_types()` in
`app/chore_types/base.py`. The dashboard card, log form, history entries,
and stats charts appear automatically - no other changes needed.

Supported field types: `text`, `number`, `boolean`, `select`, `textarea`,
`number_list`, `entries` (a repeatable list of timestamped mini-records,
each described by its own `entry_fields` - used by `feeding` for
checkpoints). Mark a field `computed=True` to have it appear in
history/stats without being user-editable (filled in by
`compute_derived()`). Set `session_window_configurable = True` and
`default_session_window_minutes` on a `ChoreType` to get the "add
checkpoint to the same event" dashboard behavior for session-style
chores.

`numeric_stat=True` includes a field in stats/`today` aggregation
(booleans count as 0/1, e.g. diaper's `pee`/`poop`). `stat_agg` controls
how same-day values combine: `"sum"` (default - amounts, counts),
`"avg"`, or `"last"` (e.g. `weight`'s `weight_g` - a reading isn't
additive). Override `stats_extra(events, tz)` for derived series that
aren't a simple per-day aggregate - `weight` uses it to compute a
weight-gain-rate (g/day) series between consecutive readings.

## Local development (without Podman)

```bash
python -m venv .venv && . .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
DB_PATH=./data/babymonitor.db uvicorn app.main:app --reload
```
