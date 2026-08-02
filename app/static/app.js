// Baby Monitor frontend - vanilla JS, no build step, no external deps.

const state = {
  choreTypes: [],
  currentEdit: null, // {mode: 'create'|'edit', choreType, eventId}
  profile: null,
};

// ---------- helpers ----------

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function fmtRelative(dateIso, futureLabel = "in") {
  const now = new Date();
  const d = new Date(dateIso);
  let diffMs = d - now;
  const future = diffMs >= 0;
  diffMs = Math.abs(diffMs);
  const mins = Math.round(diffMs / 60000);
  let text;
  if (mins < 1) text = "just now";
  else if (mins < 60) text = `${mins}m`;
  else if (mins < 60 * 24) text = `${Math.floor(mins / 60)}h ${mins % 60}m`;
  else text = `${Math.floor(mins / (60 * 24))}d ${Math.floor((mins % (60 * 24)) / 60)}h`;
  if (text === "just now") return text;
  return future ? `${futureLabel} ${text}` : `${text} ago`;
}

function toLocalInputValue(date) {
  const d = date ? new Date(date) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(str) {
  // datetime-local value is local time with no timezone; Date() parses it as local.
  return new Date(str).toISOString();
}

// ---------- tabs ----------

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "history") loadHistory();
      if (btn.dataset.tab === "stats") loadStats();
      if (btn.dataset.tab === "settings") loadSettings();
    });
  });
}

// ---------- dashboard ----------

async function loadChoreTypes() {
  state.choreTypes = await api("/api/chore-types");
}

function choreType(key) {
  return state.choreTypes.find((c) => c.key === key);
}

async function loadDashboard() {
  const statuses = await api("/api/status");
  const container = document.getElementById("cards");
  container.innerHTML = "";
  statuses.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card";
    let lastHtml = '<div class="last">No events yet</div>';
    if (s.last_event) {
      lastHtml = `<div class="last">${s.last_event.summary}<br>${fmtRelative(s.last_event.timestamp)}</div>`;
    }
    let dueHtml = "";
    if (s.next_due) {
      dueHtml = `<div class="due ${s.overdue ? "overdue" : "ok"}">${s.overdue ? "Overdue by" : "Next"} ${fmtRelative(s.next_due).replace("ago", "").replace("in ", "")}</div>`;
    }
    let buttonsHtml;
    if (s.active_session_event_id) {
      buttonsHtml = `
        <div class="row">
          <button class="quick-btn" data-action="checkpoint">+ Add checkpoint</button>
          <button class="quick-btn secondary-btn" data-action="new">+ New</button>
        </div>`;
    } else {
      buttonsHtml = `<button class="quick-btn" data-action="new">+ Log now</button>`;
    }
    const ct = choreType(s.chore_type);
    let todayHtml = "";
    if (ct) {
      const parts = ct.fields
        .filter((f) => f.numeric_stat && (s.today[f.name] || 0) > 0)
        .map((f) => `${f.label}: ${s.today[f.name]}${f.unit || ""}`);
      if (parts.length) todayHtml = `<div class="today">Today: ${parts.join(", ")}</div>`;
    }
    card.innerHTML = `
      <div class="icon">${s.icon}</div>
      <div class="label">${s.label}</div>
      ${lastHtml}
      ${dueHtml}
      ${todayHtml}
      ${buttonsHtml}
    `;
    const defaultAction = s.active_session_event_id ? "checkpoint" : "new";
    card.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleCardAction(s.chore_type, btn.dataset.action, s.active_session_event_id);
      });
    });
    card.addEventListener("click", () => handleCardAction(s.chore_type, defaultAction, s.active_session_event_id));
    container.appendChild(card);
  });
}

async function handleCardAction(choreTypeKey, action, activeSessionEventId) {
  if (action === "checkpoint" && activeSessionEventId) {
    const event = await api(`/api/events/${activeSessionEventId}`);
    openForm(choreTypeKey, "checkpoint", event);
  } else {
    openForm(choreTypeKey, "create");
  }
}

// ---------- dynamic form ----------

function buildFieldHtml(field, value) {
  const val = value !== undefined ? value : field.default;
  const id = `f_${field.name}`;
  if (field.type === "boolean") {
    return `<div class="field field-bool">
      <input type="checkbox" id="${id}" name="${field.name}" ${val ? "checked" : ""}>
      <label for="${id}">${field.label}</label>
    </div>`;
  }
  if (field.type === "select") {
    const opts = field.options
      .map((o) => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${o.label}</option>`)
      .join("");
    return `<div class="field">
      <label for="${id}">${field.label}</label>
      <select id="${id}" name="${field.name}" ${field.required ? "required" : ""}>${opts}</select>
    </div>`;
  }
  if (field.type === "textarea") {
    return `<div class="field">
      <label for="${id}">${field.label}</label>
      <textarea id="${id}" name="${field.name}">${val || ""}</textarea>
    </div>`;
  }
  if (field.type === "number") {
    return `<div class="field">
      <label for="${id}">${field.label}${field.unit ? ` (${field.unit})` : ""}</label>
      <input type="number" step="any" id="${id}" name="${field.name}" value="${val ?? ""}">
    </div>`;
  }
  if (field.type === "number_list") {
    const items = Array.isArray(val) ? val : [];
    return `<div class="field number-list" data-name="${field.name}">
      <label>${field.label}${field.unit ? ` (${field.unit})` : ""}</label>
      <div class="number-list-rows"></div>
      <button type="button" class="btn secondary add-row-btn">+ Add value</button>
    </div>`;
  }
  if (field.type === "entries") {
    return `<div class="field entries-field" data-name="${field.name}">
      <label>${field.label}</label>
      ${field.help ? `<div class="field-help">${field.help}</div>` : ""}
      <div class="entries-rows"></div>
      <button type="button" class="btn secondary add-entry-btn">+ Add checkpoint</button>
    </div>`;
  }
  // text (default)
  return `<div class="field">
    <label for="${id}">${field.label}</label>
    <input type="text" id="${id}" name="${field.name}" value="${val || ""}">
  </div>`;
}

function attachNumberListHandlers(form, field, initialValues) {
  const wrap = form.querySelector(`.number-list[data-name="${field.name}"]`);
  const rows = wrap.querySelector(".number-list-rows");
  function addRow(v) {
    const row = document.createElement("div");
    row.className = "number-list-row";
    row.innerHTML = `<input type="number" step="any" value="${v ?? ""}"><button type="button" class="icon-btn remove-row">✕</button>`;
    row.querySelector(".remove-row").addEventListener("click", () => row.remove());
    rows.appendChild(row);
  }
  (initialValues && initialValues.length ? initialValues : [null]).forEach(addRow);
  wrap.querySelector(".add-row-btn").addEventListener("click", () => addRow(null));
}

function buildEntryRowHtml(entryFields, entry) {
  let inputsHtml = `<input type="datetime-local" class="entry-timestamp" title="Time">`;
  entryFields.forEach((f) => {
    const val = entry ? entry[f.name] : f.default;
    if (f.type === "select") {
      const opts = f.options
        .map((o) => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${o.label}</option>`)
        .join("");
      inputsHtml += `<select class="entry-field" data-name="${f.name}">${opts}</select>`;
    } else if (f.type === "number") {
      inputsHtml += `<input type="number" step="any" class="entry-field" data-name="${f.name}" placeholder="${f.label}${f.unit ? ` (${f.unit})` : ""}" value="${val ?? ""}">`;
    } else {
      inputsHtml += `<input type="text" class="entry-field" data-name="${f.name}" placeholder="${f.label}" value="${val ?? ""}">`;
    }
  });
  return `<div class="entry-row">${inputsHtml}<button type="button" class="icon-btn remove-entry">✕</button></div>`;
}

function attachEntriesHandlers(form, field, initialEntries) {
  const wrap = form.querySelector(`.entries-field[data-name="${field.name}"]`);
  const rows = wrap.querySelector(".entries-rows");
  function addRow(entry) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildEntryRowHtml(field.entry_fields, entry);
    const rowEl = wrapper.firstElementChild;
    rowEl.querySelector(".entry-timestamp").value = toLocalInputValue(entry ? entry.timestamp : new Date());
    rowEl.querySelector(".remove-entry").addEventListener("click", () => rowEl.remove());
    rows.appendChild(rowEl);
  }
  (initialEntries && initialEntries.length ? initialEntries : [null]).forEach(addRow);
  wrap.querySelector(".add-entry-btn").addEventListener("click", () => addRow(null));
}

function openForm(choreTypeKey, mode, event) {
  const ct = choreType(choreTypeKey);
  state.currentEdit = { mode, choreType: choreTypeKey, eventId: event ? event.id : null };
  const titlePrefix = mode === "checkpoint" ? "Add to " : mode === "edit" ? "Edit " : "Log ";
  document.getElementById("modal-title").textContent = titlePrefix + ct.label;

  const form = document.getElementById("modal-form");
  const data = event ? { ...event.data } : {};
  const editableFields = ct.fields.filter((f) => !f.computed);

  let html = `<div class="field">
      <label for="f_timestamp">Time</label>
      <input type="datetime-local" id="f_timestamp" name="timestamp" required>
    </div>`;
  html += editableFields.map((f) => buildFieldHtml(f, data[f.name])).join("");
  html += `<div class="form-actions">
      ${mode === "edit" ? '<button type="button" id="delete-btn" class="btn danger">Delete</button>' : ""}
      <button type="button" id="cancel-btn" class="btn secondary">Cancel</button>
      <button type="submit" class="btn">Save</button>
    </div>`;
  form.innerHTML = html;

  form.querySelector("#f_timestamp").value = toLocalInputValue(event ? event.timestamp : new Date());

  editableFields
    .filter((f) => f.type === "number_list")
    .forEach((f) => attachNumberListHandlers(form, f, data[f.name]));

  editableFields
    .filter((f) => f.type === "entries")
    .forEach((f) => {
      let initial = data[f.name] || [];
      if (mode === "checkpoint") initial = [...initial, null]; // pre-append a blank checkpoint to fill in
      attachEntriesHandlers(form, f, initial);
    });

  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  const delBtn = document.getElementById("delete-btn");
  if (delBtn) delBtn.addEventListener("click", () => deleteEvent(event.id));

  form.onsubmit = async (e) => {
    e.preventDefault();
    await submitForm(ct, form, event);
  };

  document.getElementById("modal-backdrop").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.add("hidden");
  state.currentEdit = null;
}

async function submitForm(ct, form, existingEvent) {
  const data = {};
  ct.fields
    .filter((f) => !f.computed)
    .forEach((f) => {
      if (f.type === "boolean") {
        data[f.name] = form.querySelector(`[name="${f.name}"]`).checked;
      } else if (f.type === "number") {
        const raw = form.querySelector(`[name="${f.name}"]`).value;
        data[f.name] = raw === "" ? null : Number(raw);
      } else if (f.type === "number_list") {
        const wrap = form.querySelector(`.number-list[data-name="${f.name}"]`);
        const vals = Array.from(wrap.querySelectorAll(".number-list-row input"))
          .map((i) => (i.value === "" ? null : Number(i.value)))
          .filter((v) => v !== null);
        data[f.name] = vals;
      } else if (f.type === "entries") {
        const wrap = form.querySelector(`.entries-field[data-name="${f.name}"]`);
        data[f.name] = Array.from(wrap.querySelectorAll(".entry-row")).map((row) => {
          const obj = { timestamp: fromLocalInputValue(row.querySelector(".entry-timestamp").value) };
          row.querySelectorAll(".entry-field").forEach((input) => {
            const fdef = f.entry_fields.find((x) => x.name === input.dataset.name);
            let val = input.value;
            if (fdef.type === "number") val = val === "" ? null : Number(val);
            else val = val || null;
            obj[input.dataset.name] = val;
          });
          return obj;
        });
      } else {
        data[f.name] = form.querySelector(`[name="${f.name}"]`).value || null;
      }
    });

  const timestamp = fromLocalInputValue(form.querySelector("#f_timestamp").value);

  try {
    if (existingEvent) {
      await api(`/api/events/${existingEvent.id}`, {
        method: "PUT",
        body: JSON.stringify({ timestamp, data }),
      });
      toast("Updated");
    } else {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify({ chore_type: ct.key, timestamp, data }),
      });
      toast("Logged " + ct.label);
    }
    closeModal();
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

async function deleteEvent(id) {
  if (!confirm("Delete this event?")) return;
  await api(`/api/events/${id}`, { method: "DELETE" });
  closeModal();
  toast("Deleted");
  refreshCurrentView();
}

function refreshCurrentView() {
  loadDashboard();
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "history") loadHistory();
  if (activeTab === "stats") loadStats();
}

// ---------- history ----------

async function loadHistory() {
  const select = document.getElementById("history-filter");
  if (select.options.length <= 1) {
    state.choreTypes.forEach((ct) => {
      const opt = document.createElement("option");
      opt.value = ct.key;
      opt.textContent = `${ct.icon} ${ct.label}`;
      select.appendChild(opt);
    });
  }
  const type = select.value;
  const events = await api(`/api/events${type ? `?chore_type=${type}` : ""}`);
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  events.forEach((ev) => {
    const ct = choreType(ev.chore_type);
    const item = document.createElement("div");
    item.className = "history-item";
    const d = new Date(ev.timestamp);
    item.innerHTML = `
      <div>
        <div><strong>${ct.icon} ${ev.summary}</strong></div>
        <div class="meta">${d.toLocaleString()}${ev.notes ? " · " + ev.notes : ""}</div>
      </div>
      <div class="actions">
        <button class="icon-btn edit-btn">✏️</button>
        <button class="icon-btn del-btn">🗑️</button>
      </div>`;
    item.querySelector(".edit-btn").addEventListener("click", () => openForm(ev.chore_type, "edit", ev));
    item.querySelector(".del-btn").addEventListener("click", () => deleteEvent(ev.id));
    list.appendChild(item);
  });
  if (!events.length) list.innerHTML = '<p style="color:var(--muted)">No events yet.</p>';
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("history-filter").addEventListener("change", loadHistory);
  document.getElementById("history-refresh").addEventListener("click", loadHistory);
});

// ---------- stats ----------

// points: [{date, value, refMin?, refMax?, ageDays?}]
function svgBarChart(points, color) {
  const w = Math.max(320, points.length * 44);
  const h = 180;
  const padBottom = 34;
  const padTop = 14;
  const plotH = h - padBottom - padTop;
  const refVals = points.flatMap((p) => [p.refMin, p.refMax]).filter((v) => v != null);
  const max = Math.max(1, ...points.map((p) => p.value || 0), ...refVals);
  const slotW = w / points.length;
  const barW = slotW * 0.55;
  const yFor = (v) => padTop + plotH - (v / max) * plotH;

  let band = "";
  if (refVals.length) {
    // draw the reference band as a step area across the plotted days
    let top = "";
    let bottom = "";
    points.forEach((p, i) => {
      const x0 = slotW * i;
      const x1 = slotW * (i + 1);
      if (p.refMin == null || p.refMax == null) return;
      top += `L${x0},${yFor(p.refMax)} L${x1},${yFor(p.refMax)} `;
      bottom = `L${x1},${yFor(p.refMin)} L${x0},${yFor(p.refMin)} ` + bottom;
    });
    if (top) {
      band = `<path d="M0,0 ${top}${bottom}Z" fill="var(--ok)" opacity="0.15"></path>`;
    }
  }

  let bars = "";
  let labels = "";
  points.forEach((p, i) => {
    const x = slotW * i + (slotW - barW) / 2;
    const val = p.value || 0;
    const barH = (val / max) * plotH;
    const y = padTop + plotH - barH;
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, val ? 2 : 0)}" rx="3" fill="${color}"></rect>`;
    bars += `<text x="${x + barW / 2}" y="${y - 4}" font-size="10" text-anchor="middle" fill="currentColor">${val || ""}</text>`;
    const dateLabel = p.date.slice(5);
    const ageLabel = p.ageDays != null ? `d${p.ageDays}` : "";
    labels += `<text x="${x + barW / 2}" y="${h - 20}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">${dateLabel}</text>`;
    if (ageLabel) {
      labels += `<text x="${x + barW / 2}" y="${h - 8}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.45">${ageLabel}</text>`;
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="color:inherit">${band}${bars}${labels}</svg>`;
}

async function loadStats() {
  const typeSelect = document.getElementById("stats-type");
  if (typeSelect.options.length === 0) {
    state.choreTypes.forEach((ct) => {
      const opt = document.createElement("option");
      opt.value = ct.key;
      opt.textContent = `${ct.icon} ${ct.label}`;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener("change", loadStats);
    document.getElementById("stats-days").addEventListener("change", loadStats);
  }
  const key = typeSelect.value || state.choreTypes[0]?.key;
  if (!key) return;
  typeSelect.value = key;
  const days = document.getElementById("stats-days").value;
  const requestToken = (state.statsRequestToken = (state.statsRequestToken || 0) + 1);
  const data = await api(`/api/stats/${key}?days=${days}`);
  if (requestToken !== state.statsRequestToken) return; // a newer request superseded this one

  const summary = document.getElementById("stats-summary");
  summary.innerHTML = `
    <div class="stat-box"><div class="num">${data.total_events}</div><div class="lbl">events</div></div>
    ${data.avg_interval_minutes ? `<div class="stat-box"><div class="num">${(data.avg_interval_minutes / 60).toFixed(1)}h</div><div class="lbl">avg interval</div></div>` : ""}
  `;

  const charts = document.getElementById("stats-charts");
  if (!data.days.length && !(data.growth_rate && data.growth_rate.length)) {
    charts.innerHTML = '<p style="color:var(--muted)">No data for this period.</p>';
    return;
  }

  function refFooter(refInfo) {
    if (!refInfo) return "";
    const src = refInfo.source_label
      ? ` &middot; typical range per <a href="${refInfo.source_url}" target="_blank" rel="noopener">${refInfo.source_label}</a>`
      : "";
    return `<div class="chart-ref-note">Shaded band = commonly-cited normal range${src}. General guidance only, not medical advice.</div>`;
  }

  let html = "";
  if (data.days.length) {
    html += `<div class="chart-block"><h3>Events per day</h3>${svgBarChart(
      data.days.map((d) => ({ date: d.date, value: d.count, ageDays: d.age_days })),
      "var(--primary)"
    )}</div>`;
    data.numeric_fields.forEach((f) => {
      const points = data.days.map((d) => ({
        date: d.date,
        value: d[f],
        ageDays: d.age_days,
        refMin: d[`${f}_ref_min`],
        refMax: d[`${f}_ref_max`],
      }));
      const refInfo = data.days.find((d) => d[`${f}_ref_source_label`]);
      const refMeta = refInfo
        ? { source_label: refInfo[`${f}_ref_source_label`], source_url: refInfo[`${f}_ref_source_url`] }
        : null;
      html += `<div class="chart-block"><h3>${f.replace(/_/g, " ")}</h3>${svgBarChart(points, "var(--ok)")}${refFooter(refMeta)}</div>`;
    });
  }

  if (data.growth_rate && data.growth_rate.length) {
    const points = data.growth_rate.map((r) => ({
      date: r.date,
      value: r.g_per_day,
      refMin: r.ref_min,
      refMax: r.ref_max,
    }));
    const refEntry = data.growth_rate.find((r) => r.ref_source_label);
    const refMeta = refEntry ? { source_label: refEntry.ref_source_label, source_url: refEntry.ref_source_url } : null;
    html += `<div class="chart-block"><h3>Weight gain (g/day, between weigh-ins)</h3>${svgBarChart(points, "var(--primary)")}${refFooter(refMeta)}</div>`;
  }

  charts.innerHTML = html;
}

// ---------- profile ----------

async function loadProfile() {
  state.profile = await api("/api/profile");
  const box = document.getElementById("profile-box");
  const p = state.profile;
  box.innerHTML = `
    <div class="settings-row profile-row">
      <div><strong>👶 Baby profile</strong>${p.age_days != null ? ` <span class="age-pill">${p.age_days} days old</span>` : ""}</div>
      <div class="row">
        <label>Name <input type="text" id="profile-name" style="width:120px" value="${p.name || ""}"></label>
        <label>Birth date <input type="date" id="profile-birthdate" value="${p.birth_date || ""}"></label>
        <label>Timezone <input type="text" id="profile-timezone" style="width:150px" placeholder="e.g. Europe/Ljubljana" value="${p.timezone || "UTC"}"></label>
        <button class="btn secondary" id="save-profile-btn">Save</button>
      </div>
    </div>`;
  document.getElementById("save-profile-btn").addEventListener("click", async () => {
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: document.getElementById("profile-name").value || null,
          birth_date: document.getElementById("profile-birthdate").value || null,
          timezone: document.getElementById("profile-timezone").value || "UTC",
        }),
      });
      toast("Saved");
      await loadProfile();
    } catch (err) {
      toast("Error: " + err.message);
    }
  });
}

// ---------- settings ----------

async function loadSettings() {
  await loadProfile();
  const list = document.getElementById("settings-list");
  list.innerHTML = "";
  state.choreTypes.forEach((ct) => {
    const row = document.createElement("div");
    row.className = "settings-row";
    row.innerHTML = `
      <div>${ct.icon} <strong>${ct.label}</strong></div>
      <div class="row">
        ${
          ct.interval_configurable
            ? `<label>Reminder <input type="number" min="0" class="interval-input" style="width:80px" value="${ct.interval_minutes ?? ""}"> min</label>`
            : '<span style="color:var(--muted)">no reminder</span>'
        }
        ${
          ct.session_window_configurable
            ? `<label>Session window <input type="number" min="0" class="session-window-input" style="width:80px" value="${ct.session_window_minutes ?? ""}"> min</label>`
            : ""
        }
        ${
          ct.interval_configurable || ct.session_window_configurable
            ? '<button class="btn secondary save-settings-btn">Save</button>'
            : ""
        }
      </div>`;
    if (!ct.interval_configurable && !ct.session_window_configurable) {
      list.appendChild(row);
      return;
    }
    row.querySelector(".save-settings-btn").addEventListener("click", async () => {
      const intervalInput = row.querySelector(".interval-input");
      const sessionInput = row.querySelector(".session-window-input");
      await api(`/api/chore-types/${ct.key}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          interval_minutes: intervalInput && intervalInput.value !== "" ? Number(intervalInput.value) : null,
          session_window_minutes: sessionInput && sessionInput.value !== "" ? Number(sessionInput.value) : null,
        }),
      });
      toast("Saved");
      await loadChoreTypes();
      loadDashboard();
    });
    list.appendChild(row);
  });
}

// ---------- init ----------

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});

initTabs();
(async function init() {
  await loadChoreTypes();
  await loadDashboard();
  setInterval(loadDashboard, 30000);
})();
