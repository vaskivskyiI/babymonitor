# Baby Monitor

Self-hosted app for tracking baby chores (diaper changes, feedings, sleep,
pumping, ...) and viewing statistics. Built to run in Podman on a home
server, with a mobile-friendly web UI and a JSON API for Home Assistant.

## Features

- **Diaper changes**: mark pee / poop / both, plus separate flags for
  "peed during the change" / "pooped during the change".
- **Feeding**: a feeding is a *session* you build up as it happens. Add as
  many timestamped checkpoints as you like (breast - either side or
  unspecified - or formula) while the feeding is in progress - switching
  breasts, topping up with formula, etc. Weigh before and after a breast
  sub-step (the reading doesn't need to be the baby's real weight -
  dressed weight on a kitchen/bathroom scale is fine, only the difference
  matters) and the amount is calculated automatically, with the next
  sub-step's "weight before" pre-filled from this one's "weight after" -
  or skip weighing entirely and type the amount directly, e.g. a bottle
  of previously pumped milk. Each sub-step contributes its own amount
  (weighed or typed) to the total, so a session can freely mix both.
  Formula amount is summed separately. The session's own time is always
  the *first* checkpoint's time - there's one clock, not a separate
  "event time" and "first checkpoint time" to keep in sync. The
  dashboard offers quick actions and "+ New" while a feeding is still
  open (within a configurable session window, default 45 min since the
  last checkpoint) to start a separate feeding anyway; adding a fuller
  checkpoint to the open session happens by editing it (tap the previous
  entry, or ✏️).
- **Sleep**: tap "Start Sleep" / "End Sleep" - duration is calculated
  automatically from the two timestamps, no manual entry, and displayed
  as "2h 15m" rather than raw minutes once it's over 90 min.
- **Weight** and **Height**: quick weigh-in / measurement log.
- **Pumping**: also a checkpoint-based log, one sub-step per side/session
  (amount + duration each), so a left-then-right pump adds up correctly.
- **Probiotic** (or any once-a-day supplement): a single tap logs it
  given. It's due once per *calendar day*, not "24 hours since last
  dose" - so giving it early one day doesn't push tomorrow's reminder
  later; it resets at local midnight and the dashboard flags it overdue
  automatically, same as any other reminder. The dashboard shows a plain
  "Tomorrow" once it's done for the day rather than a countdown to
  midnight, and while it's still due today shows how overdue relative to
  ~24h after the last dose (a more intuitive reference than "since
  midnight").
- **One-tap quick actions**: diaper (wet/dirty/both) and probiotic log
  instantly from the dashboard with a single tap - no form, no typing.
  Number fields elsewhere (weight, amounts) use large +/- steppers sized
  per field, so most logging never needs the keyboard at all.
- **Configurable quick actions** for feeding/pumping-style (checkpoint-
  based) chore types: from a type's Edit screen in Settings, add buttons
  like "Formula +10ml" (increments the matching checkpoint's amount each
  tap) or "Formula 100ml" (sets it outright). They apply to the
  currently-open session if there is one - repeated taps build up the
  same checkpoint - or start a new one otherwise.
- **Fast edit of the previous entry**: every dashboard card's last-event
  line - tap it (or its ✏️) to jump straight to editing that entry, e.g.
  log "started pumping" with just a side selected, then tap it later to
  fill in the amount, no need to go through History. New entries are
  only created via the explicit action buttons, never by tapping the
  card itself.
- **Set an alarm for the next feed** (or any reminder): tap the 🔔 next
  to a "Next due" time to download a calendar event with an alarm at
  that moment - works on any phone via its own Calendar app, no push
  infrastructure or HTTPS required.
- **Baby info bar**: the Dashboard leads with the baby's name, current
  age, latest weight and latest height at a glance.
- **Add your own chore types from the app** - no code required. Settings
  → Chore types → "+ Add": give it a label, icon, an optional reminder
  interval, and a few fields (text/number/boolean/select/textarea, with
  "track in stats" for anything that should show up in Today/Stats). All
  chore types - built-in or custom - can be renamed, re-ordered
  (▲/▼), and hidden without deleting their history; only custom ones can
  be deleted outright.
- **Feeding calculator**: on the Stats tab, suggested amount per
  feed/day, feeds per day, and interval between feeds for the baby's
  current age (and a weight-based formula estimate if a recent weight is
  on record) - editable to try other ages/weights.
- **Installable as an app (PWA)**: add it to your phone's home screen
  (Safari: Share → Add to Home Screen; Chrome: menu → Install app) for a
  full-screen, app-like experience with an icon - no app store needed.
- **Home Assistant custom integration**, installable via HACS as a
  custom repository: sensors for every chore type's status/today totals,
  buttons for every quick action, and services to log/edit/delete events
  or run a quick action from an automation. See
  [Home Assistant custom integration](#home-assistant-custom-integration-hacs)
  below.
- **Baby profile**: set a birth date (+ name) in Settings. Once set, the
  dashboard shows the baby's age and stats charts are labeled with
  age-in-days alongside the date. Timezone is detected automatically
  from the browser/device (no manual entry) and kept in sync, driving
  "today" totals and day-bucketing.
- **Normal-range guidance**: wet/poopy diaper counts per day and weight
  gain (g/day) charts are shown against a shaded band for commonly-cited
  pediatric ranges (by the baby's age), with a source link. This is
  general guidance only, not medical advice - see
  [Reference ranges used](#reference-ranges-used) below.
- Every event's timestamp defaults to "now" but is fully editable.
- Dashboard shows time since last event, time until the next one is due
  alongside the actual clock time it's due at (e.g. "Next 2h 15m
  (14:30)") - per chore type, based on a configurable interval - and
  today's totals (e.g. wet/poopy diaper counts, ml fed, latest weight).
- History view to browse/edit/delete past events, always sorted
  chronologically by event time regardless of the order they were
  entered in (so backdating one doesn't leave it out of place).
- **Stats**: an at-a-glance overview grid (one card per chore type, each
  with a sparkline and its latest/key number over all recorded history)
  is the default landing view - tap a card to drill into full detail
  charts (event counts, amounts, average interval, total food/day) with
  a period selector defaulting to a long range (90 days; also
  24h/7d/14d/30d/1y/all time). The weight chart is date-scaled (not just
  evenly-spaced buckets) and shows a linear-regression trend extrapolated
  a bit into the future alongside an "ideal" age-based growth band
  (anchored at birth weight if set).
- **Fully modular**: chore types are plugins under `app/chore_types/`.
  The frontend renders forms and charts generically from each type's
  field definitions - adding a new chore type requires no frontend
  changes. Built-in types: `diaper`, `feeding`, `sleep`, `pumping`,
  `weight`, `height`, `probiotic`.

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

## Home Assistant custom integration (HACS)

The recommended way to use Baby Monitor from Home Assistant is the
custom integration in [`custom_components/babymonitor`](custom_components/babymonitor),
installable and updatable through [HACS](https://hacs.xyz) as a custom
repository. It talks to your server's existing REST API - no changes on
the server side - and gives you:

- **Sensors** (visualize): a "last event" sensor per chore type (state =
  human summary like "🍼 Formula 90ml", full event JSON in attributes), a
  "next due" timestamp sensor, one sensor per numeric field's running
  total for today (with `state_class: measurement`, so HA keeps long-term
  statistics automatically), and a baby-age sensor.
- **Buttons** (control): one button per configured quick action (exactly
  the ones on the app's dashboard - "💧 Wet", "Formula +10ml", etc.), plus
  Start/End buttons for session-based types like sleep. Drop them on a
  dashboard or trigger them from automations (an NFC tag by the changing
  table, a physical button, a voice command).
- **Services** (add/change entries generically): `babymonitor.log_event`,
  `babymonitor.update_event`, `babymonitor.delete_event`,
  `babymonitor.quick_action`, and `babymonitor.refresh` - for anything
  the fixed buttons don't cover, e.g. logging a weight reading with a
  value from a Bluetooth scale, from an automation.

### Install via HACS

1. HACS → the "⋮" menu (top right) → **Custom repositories**.
2. Repository: `https://github.com/vaskivskyiI/babymonitor`, category:
   **Integration**. Add.
3. Find **Baby Monitor** in HACS → Integrations, install it, restart Home
   Assistant.
4. Settings → Devices & Services → **Add Integration** → search "Baby
   Monitor" → enter your server's URL (e.g. `http://192.168.1.50:8000`).

HACS will offer updates here the same way it does for any other custom
integration, whenever a new release is tagged on the repository.

### Example: NFC tag / dashboard button that logs a wet diaper

Every quick action becomes a `button` entity automatically - e.g.
`button.baby_monitor_diaper_wet` - so this needs no YAML at all: assign
the entity directly to a dashboard tile or an NFC tag automation's
action. For anything a quick action doesn't cover, call a service
instead:

```yaml
service: babymonitor.log_event
data:
  chore_type: weight
  data:
    weight_g: "{{ states('sensor.baby_scale') | float }}"
```

See [`custom_components/babymonitor/services.yaml`](custom_components/babymonitor/services.yaml)
for the full service reference (also visible in Home Assistant's
Developer Tools → Actions, with autocomplete).

### Prefer no custom component? Raw REST also works

Everything below (`rest:` sensors and `rest_command:`) works with
stock Home Assistant and no HACS install, if you'd rather not add a
custom integration.

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

Copy the `diaper` block's pattern for `sleep`, `pumping`, `height`
(`value_json.last_event.data.height_cm`), `probiotic` (its `next_due`
is exactly "when the once-a-day dose is next expected"), or any other
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

  # Sleep - start creates a new event; ending it requires knowing which
  # event is open (see /api/status/sleep's open_event_id), so "end" is a
  # PUT to that event's id, e.g. from a templated rest_command/script:
  #   PUT /api/events/{{ open_event_id }}  {"data": {"ended_at": "{{ now().isoformat() }}"}}
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

- `GET /api/chore-types?include_disabled=` - list chore types (built-in + custom) with field schemas, in display order
- `POST /api/chore-types` - create a custom chore type `{key, label, icon, fields, interval_minutes?}`
- `PUT /api/chore-types/{key}/definition` - edit a custom chore type's label/icon/fields/interval
- `PUT /api/chore-types/{key}/meta` - rename/re-icon/enable/disable any chore type (built-in or custom)
- `POST /api/chore-types/reorder` - `{keys: [...]}` in the desired display order
- `DELETE /api/chore-types/{key}` - delete a custom chore type and its events (built-ins can only be disabled)
- `POST /api/chore-types/{key}/quick-actions` / `PUT .../{action_id}` / `DELETE .../{action_id}` - manage configurable quick actions (`{label, mode: "increment"|"absolute", match_field, match_value, target_field, value}`) for entries-based chore types
- `PUT /api/chore-types/{key}/settings` - set reminder interval / session window (minutes)
- `GET /api/profile` / `PUT /api/profile` (partial updates supported) - baby's name, birth date, birth weight, timezone (auto-synced from the browser; drives age display and day-bucketing)
- `POST /api/events` - log an event `{chore_type, timestamp?, data, notes?}`
- `GET /api/events?chore_type=&since=&until=&limit=` - list events
- `GET/PUT/DELETE /api/events/{id}` - fetch/edit/delete a single event
- `GET /api/status` / `GET /api/status/{key}` - last event, next due time, active session id, `open_event_id` (for start/end types like sleep), and today's totals per numeric field
- `GET /api/stats/{key}?days=90` or `?all_time=true` - daily aggregation for charts (zero-filled for every calendar day in range), incl. `age_days`, `<field>_ref_min`/`_ref_max` reference-range bands where available, and `growth_rate`/`trend`/`ideal` for `weight`
- `GET /api/calculators/feeding?age_days=&weight_g=` - suggested feeding amounts/interval for an age (defaults to the profile's age and latest weight if omitted)

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

The feeding calculator (Stats tab) uses separate age-based guidance for
amount per feed/day, feeds per day, and interval - see
[Pampers' AAP-based feeding chart](https://www.pampers.com/en-us/baby/feeding/article/baby-feeding-schedule)
and [KellyMom's milk-intake-by-age guide](https://kellymom.com/bf/pumpingmoms/pumping/milkcalc/),
plus the AAP's ~2.5oz-per-lb-per-day rule of thumb for formula. Edit
`app/feeding_guidance.py` to adjust.

These are rough guides for a full-term, otherwise-healthy baby, **not
medical advice** - every baby is different, and you should talk to your
pediatrician about anything specific to yours. The source and this
disclaimer are shown next to each chart. To adjust or add ranges, edit
`app/reference_ranges.py`.

## Adding a new chore type

**From the app, no code needed:** Settings → Chore types → "+ Add" - give
it a label, icon, optional reminder interval, and a few fields. This
covers most simple trackers (a checkbox, a number, a dropdown). It's
stored in the database (`custom_chore_types` table) and merged into the
same registry as the built-in types at request time - it shows up on the
Dashboard/History/Stats exactly like any other type, just without
sessions/start-end/derived-stats behavior (those need code, below).

**In code**, for anything needing custom logic (sessions, start/end,
derived fields, extra stats series): create `app/chore_types/mytype.py`:

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

    # optional: fill in computed fields; `timestamp` is the event's own time
    # def compute_derived(self, data: dict, timestamp: datetime) -> dict:
    #     return data
```

Then add the import to `load_builtin_types()` in
`app/chore_types/base.py`. The dashboard card, log form, history entries,
and stats charts appear automatically - no other changes needed.

Supported field types: `text`, `number`, `boolean`, `select`, `textarea`,
`number_list`, `datetime` (a single date/time picker, separate from the
event's own timestamp - used by `sleep`'s `ended_at`), `entries` (a
repeatable list of timestamped mini-records, each described by its own
`entry_fields` - used by `feeding` for checkpoints and `pumping` for
sub-steps). Within `entry_fields`, set `carry_from="<other field name>"`
on a field to have it pre-filled from the *previous* entry's value for
that field when you add a new one - `feeding` uses this so each
sub-step's "weight before" defaults to the last sub-step's "weight
after". Mark a field `computed=True` to have it appear in history/stats
without being user-editable (filled in by `compute_derived()`, which
receives the event's own `(data, timestamp)`). Set
`session_window_configurable = True` and
`default_session_window_minutes` on a `ChoreType` to get the "add
checkpoint to the same event" dashboard behavior for session-style
chores (e.g. `feeding`).

For a **start/end** chore type (log a start, then log an end, with a
derived duration - like `sleep`), set `has_start_end = True`, add a
`datetime` field for the end time, override `is_open(data)` to report
whether that field is still unset, and compute the duration in
`compute_derived()` from `timestamp` (the start) to the end field. The
dashboard automatically shows "Start X" / "End X" instead of "Log now"
for such types, based on `GET /api/status`'s `open_event_id`.

`numeric_stat=True` includes a field in stats/`today` aggregation
(booleans count as 0/1, e.g. diaper's `pee`/`poop`). `stat_agg` controls
how same-day values combine: `"sum"` (default - amounts, counts),
`"avg"`, or `"last"` (e.g. `weight`'s `weight_g` - a reading isn't
additive). Override `stats_extra(events, tz, profile)` for derived
series that aren't a simple per-day aggregate - `weight` uses it to
compute a weight-gain-rate series, a linear trend extrapolation, and an
"ideal" age-based trajectory band.

Override `next_due(last_timestamp, interval_minutes, tz)` for a reminder
that isn't a simple rolling interval - `probiotic` uses it to reset at
the start of the next *calendar day* (in the profile's timezone) rather
than exactly 24h after the last dose. Pair it with
`interval_configurable = False` and a `fixed_reminder_note` string so
Settings shows something more informative than "no reminder" for a type
that has a real, just non-numeric, reminder rule.

## Local development (without Podman)

```bash
python -m venv .venv && . .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
DB_PATH=./data/babymonitor.db uvicorn app.main:app --reload
```
