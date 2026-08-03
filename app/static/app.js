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

function fmtAge(days) {
  if (days == null) return null;
  if (days < 0) return `due in ${Math.abs(days)}d`;
  if (days < 14) return `${days}d`;
  if (days < 70) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    return d ? `${w}w ${d}d` : `${w}w`;
  }
  const months = days / 30.44;
  return `${months.toFixed(months < 10 ? 1 : 0)}mo`;
}

function renderBabyInfoBar(profile, statuses) {
  const bar = document.getElementById("baby-info-bar");
  const weightStatus = statuses.find((s) => s.chore_type === "weight");
  const heightStatus = statuses.find((s) => s.chore_type === "height");
  const chips = [];

  const ageText = profile && fmtAge(profile.age_days);
  if (ageText) chips.push(`<div class="info-chip"><span class="info-val">${ageText}</span><span class="info-lbl">old</span></div>`);

  const w = weightStatus?.last_event?.data?.weight_g;
  if (w != null) {
    chips.push(
      `<div class="info-chip"><span class="info-val">${(w / 1000).toFixed(2)}kg</span><span class="info-lbl">weight</span></div>`
    );
  }

  const h = heightStatus?.last_event?.data?.height_cm;
  if (h != null) {
    chips.push(`<div class="info-chip"><span class="info-val">${h}cm</span><span class="info-lbl">height</span></div>`);
  }

  if (!chips.length) {
    bar.classList.add("hidden");
    bar.innerHTML = "";
    return;
  }
  bar.classList.remove("hidden");
  const name = profile && profile.name;
  bar.innerHTML = `
    ${name ? `<div class="baby-name">👶 ${name}</div>` : ""}
    <div class="info-chips">${chips.join("")}</div>
  `;
}

async function loadDashboard() {
  const [statuses, profile] = await Promise.all([api("/api/status"), api("/api/profile")]);
  state.profile = profile;
  renderBabyInfoBar(profile, statuses);
  const container = document.getElementById("cards");
  container.innerHTML = "";
  statuses.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card";
    const ct = choreType(s.chore_type);

    // "last event" chip - the headline info on the card, right above the action button
    let lastHtml = '<div class="last-chip empty">No events yet</div>';
    if (s.last_event) {
      const openBadge = s.open_event_id ? '<span class="live-pill">live</span>' : "";
      lastHtml = `<div class="last-chip">
          <div class="last-summary">${s.last_event.summary}${openBadge}</div>
          <div class="last-time">${fmtRelative(s.last_event.timestamp)}</div>
        </div>`;
    }

    let dueHtml = "";
    if (s.next_due) {
      dueHtml = `<div class="due ${s.overdue ? "overdue" : "ok"}">${s.overdue ? "Overdue by" : "Next"} ${fmtRelative(s.next_due).replace("ago", "").replace("in ", "")}</div>`;
    }

    let buttonsHtml;
    let targetEventId = null;
    if (ct && ct.has_start_end) {
      if (s.open_event_id) {
        targetEventId = s.open_event_id;
        buttonsHtml = `<button class="quick-btn end-btn" data-action="end">⏰ End ${ct.label}</button>`;
      } else {
        buttonsHtml = `<button class="quick-btn" data-action="start">${ct.icon} Start ${ct.label}</button>`;
      }
    } else if (s.active_session_event_id) {
      targetEventId = s.active_session_event_id;
      buttonsHtml = `
        <div class="row">
          <button class="quick-btn" data-action="checkpoint">+ Add checkpoint</button>
          <button class="quick-btn secondary-btn" data-action="new">+ New</button>
        </div>`;
    } else {
      buttonsHtml = `<button class="quick-btn" data-action="new">+ Log now</button>`;
    }

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
    const defaultAction = card.querySelector("[data-action]")?.dataset.action || "new";
    card.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleCardAction(s.chore_type, btn.dataset.action, targetEventId);
      });
    });
    card.addEventListener("click", () => handleCardAction(s.chore_type, defaultAction, targetEventId));
    container.appendChild(card);
  });
}

async function handleCardAction(choreTypeKey, action, targetEventId) {
  if ((action === "checkpoint" || action === "end") && targetEventId) {
    const event = await api(`/api/events/${targetEventId}`);
    openForm(choreTypeKey, action, event);
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
      <input type="number" step="any" inputmode="decimal" id="${id}" name="${field.name}" value="${val ?? ""}">
    </div>`;
  }
  if (field.type === "datetime") {
    return `<div class="field">
      <label for="${id}">${field.label}</label>
      <input type="datetime-local" id="${id}" name="${field.name}" value="${val ? toLocalInputValue(val) : ""}">
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
    return rowEl;
  }
  (initialEntries && initialEntries.length ? initialEntries : [null]).forEach(addRow);
  wrap.querySelector(".add-entry-btn").addEventListener("click", () => {
    const prevRow = rows.lastElementChild;
    const newRow = addRow(null);
    // carry values forward from the previous row for any field with carry_from set
    if (prevRow) {
      field.entry_fields.forEach((f) => {
        if (!f.carry_from) return;
        const srcInput = prevRow.querySelector(`.entry-field[data-name="${f.carry_from}"]`);
        const destInput = newRow.querySelector(`.entry-field[data-name="${f.name}"]`);
        if (srcInput && destInput && srcInput.value !== "") destInput.value = srcInput.value;
      });
    }
  });
}

function openForm(choreTypeKey, mode, event) {
  const ct = choreType(choreTypeKey);
  state.currentEdit = { mode, choreType: choreTypeKey, eventId: event ? event.id : null };
  const titlePrefixes = { checkpoint: "Add to ", edit: "Edit ", end: "End " };
  document.getElementById("modal-title").textContent = (titlePrefixes[mode] || "Log ") + ct.label;

  const form = document.getElementById("modal-form");
  const data = event ? { ...event.data } : {};
  const editableFields = ct.fields.filter((f) => !f.computed);

  if (mode === "end") {
    // prefill any not-yet-set datetime field (e.g. sleep's "ended_at") with now
    editableFields.forEach((f) => {
      if (f.type === "datetime" && !data[f.name]) data[f.name] = new Date().toISOString();
    });
  }

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
      } else if (f.type === "datetime") {
        const raw = form.querySelector(`[name="${f.name}"]`).value;
        data[f.name] = raw === "" ? null : fromLocalInputValue(raw);
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
  // Defensive: always show newest-first by actual event time, regardless of
  // insertion order or any backend sort quirks (e.g. backdated entries).
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
    const val = p.value;
    if (val != null) {
      const barH = (val / max) * plotH;
      const y = padTop + plotH - barH;
      bars += `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, val ? 2 : 0)}" rx="3" fill="${color}"></rect>`;
      bars += `<text x="${x + barW / 2}" y="${y - 4}" font-size="10" text-anchor="middle" fill="currentColor">${val}</text>`;
    }
    const dateLabel = p.date.slice(5);
    const ageLabel = p.ageDays != null ? `d${p.ageDays}` : "";
    labels += `<text x="${x + barW / 2}" y="${h - 20}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">${dateLabel}</text>`;
    if (ageLabel) {
      labels += `<text x="${x + barW / 2}" y="${h - 8}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.45">${ageLabel}</text>`;
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="color:inherit">${band}${bars}${labels}</svg>`;
}

// True date-proportional line chart (x-position reflects actual calendar
// gaps, not evenly-spaced buckets). Used for weight: actual readings +
// linear-regression trend extrapolation + an "ideal" reference trajectory.
function svgLineChart({ actual = [], trend = [], idealLow = [], idealHigh = [], unit = "" }) {
  const allDates = [...actual, ...trend, ...idealLow, ...idealHigh].map((p) => p.date);
  if (!allDates.length) return "";
  const minDate = allDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
  const dayMs = 86400000;
  const spanDays = Math.max(1, (new Date(maxDate) - new Date(minDate)) / dayMs);

  const w = Math.max(360, Math.min(spanDays * 14, 1400));
  const h = 200;
  const padTop = 16;
  const padBottom = 28;
  const padLeft = 4;
  const padRight = 4;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const allVals = [...actual, ...trend, ...idealLow, ...idealHigh].map((p) => p.value).filter((v) => v != null);
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const valPad = Math.max(1, (maxVal - minVal) * 0.1);
  const yMin = minVal - valPad;
  const yMax = maxVal + valPad;

  const xFor = (dateStr) => padLeft + ((new Date(dateStr) - new Date(minDate)) / dayMs / spanDays) * plotW;
  const yFor = (v) => padTop + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const pathFor = (points) =>
    points
      .filter((p) => p.value != null)
      .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.date).toFixed(1)},${yFor(p.value).toFixed(1)}`)
      .join(" ");

  let svg = "";

  // ideal band (shaded low-high area)
  if (idealLow.length && idealHigh.length) {
    const top = idealHigh.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.date)},${yFor(p.value)}`).join(" ");
    const bottom = [...idealLow]
      .reverse()
      .map((p) => `L${xFor(p.date)},${yFor(p.value)}`)
      .join(" ");
    svg += `<path d="${top} ${bottom} Z" fill="var(--ok)" opacity="0.12"></path>`;
  }

  // trend line (actual portion solid, projected portion dashed)
  if (trend.length) {
    const solid = trend.filter((p) => !p.projected);
    const dashedPart = trend.filter((p, i) => p.projected || (i > 0 && trend[i - 1].projected === false && p.projected !== false));
    if (solid.length) svg += `<path d="${pathFor(solid)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3"></path>`;
    const proj = trend.filter((p) => p.projected);
    const bridge = solid.length ? [solid[solid.length - 1], ...proj] : proj;
    if (proj.length) svg += `<path d="${pathFor(bridge)}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"></path>`;
  }

  // actual readings - solid line + dots
  if (actual.length) {
    svg += `<path d="${pathFor(actual)}" fill="none" stroke="var(--ok)" stroke-width="2.5"></path>`;
    actual.forEach((p) => {
      if (p.value == null) return;
      svg += `<circle cx="${xFor(p.date)}" cy="${yFor(p.value)}" r="3.5" fill="var(--ok)"></circle>`;
    });
    // label first/last point
    const first = actual[0];
    const last = actual[actual.length - 1];
    svg += `<text x="${xFor(first.date)}" y="${yFor(first.value) - 8}" font-size="10" text-anchor="start" fill="currentColor">${first.value}${unit}</text>`;
    if (last !== first) {
      svg += `<text x="${xFor(last.date)}" y="${yFor(last.value) - 8}" font-size="10" text-anchor="end" fill="currentColor" font-weight="600">${last.value}${unit}</text>`;
    }
  }

  // x-axis date labels (sparse, ~6 ticks)
  const tickCount = Math.min(6, Math.round(spanDays) + 1);
  let labels = "";
  for (let i = 0; i <= tickCount; i++) {
    const t = new Date(new Date(minDate).getTime() + (spanDays * dayMs * i) / tickCount);
    const dstr = t.toISOString().slice(0, 10);
    labels += `<text x="${xFor(dstr)}" y="${h - 8}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.6">${dstr.slice(5)}</text>`;
  }

  // "today" marker
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayLine = "";
  if (todayStr >= minDate && todayStr <= maxDate) {
    todayLine = `<line x1="${xFor(todayStr)}" y1="${padTop}" x2="${xFor(todayStr)}" y2="${h - padBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity="0.35"></line>`;
  }

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="color:inherit">${svg}${todayLine}${labels}</svg>`;
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
      // weight_g gets the richer date-scaled chart with trend + ideal band instead
      if (key === "weight" && f === "weight_g") return;
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

  if (key === "weight" && (data.days.some((d) => d.weight_g != null) || (data.trend && data.trend.length))) {
    const actual = data.days.filter((d) => d.weight_g != null).map((d) => ({ date: d.date, value: d.weight_g }));
    const trend = data.trend || [];
    const ideal = data.ideal || [];
    const idealLow = ideal.map((p) => ({ date: p.date, value: p.low }));
    const idealHigh = ideal.map((p) => ({ date: p.date, value: p.high }));
    const legend = `<div class="chart-legend">
        <span><i class="dot" style="background:var(--ok)"></i>Actual weight</span>
        <span><i class="dot" style="background:var(--primary)"></i>Trend (dashed = projected)</span>
        <span><i class="dot band"></i>Ideal range (age-based)</span>
      </div>`;
    html = `<div class="chart-block"><h3>Weight over time</h3>${svgLineChart({ actual, trend, idealLow, idealHigh, unit: "g" })}${legend}${refFooter({
      source_label: "WHO weight-for-age growth guidance",
      source_url: "https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/infant-growth/faq-20058037",
    })}</div>` + html;
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

  if (key === "feeding") {
    loadFeedingCalculator();
    document.getElementById("calculator-box").classList.remove("hidden");
  } else {
    document.getElementById("calculator-box").classList.add("hidden");
  }
}

// ---------- feeding calculator ----------

async function loadFeedingCalculator(overrides = {}) {
  const box = document.getElementById("calculator-box");
  const params = new URLSearchParams();
  if (overrides.age_days != null && overrides.age_days !== "") params.set("age_days", overrides.age_days);
  if (overrides.weight_g != null && overrides.weight_g !== "") params.set("weight_g", overrides.weight_g);

  let data;
  try {
    data = await api(`/api/calculators/feeding${params.toString() ? "?" + params.toString() : ""}`);
  } catch (err) {
    box.innerHTML = `<div class="chart-block"><h3>🍽️ Feeding calculator</h3><p style="color:var(--muted)">Set a birth date in Settings to use the calculator, or enter an age below.</p>
      <div class="row"><label>Age (days) <input type="number" min="0" id="calc-age" style="width:80px"></label>
      <button class="btn secondary" id="calc-recalc">Calculate</button></div></div>`;
    document.getElementById("calc-recalc").addEventListener("click", () => {
      loadFeedingCalculator({ age_days: document.getElementById("calc-age").value });
    });
    return;
  }

  const formula = data.formula_weight_based;
  box.innerHTML = `
    <div class="chart-block">
      <h3>🍽️ Feeding calculator</h3>
      <div class="row calc-inputs">
        <label>Age (days) <input type="number" min="0" id="calc-age" value="${data.age_days ?? ""}" style="width:80px"></label>
        <label>Weight (g) <input type="number" min="0" id="calc-weight" value="${data.weight_g ?? ""}" style="width:90px"></label>
        <button class="btn secondary" id="calc-recalc">Recalculate</button>
      </div>
      <div class="stats-summary">
        <div class="stat-box"><div class="num">${data.per_feed_ml.min}–${data.per_feed_ml.max}<span class="unit">ml</span></div><div class="lbl">per feed</div></div>
        <div class="stat-box"><div class="num">${data.per_day_ml.min}–${data.per_day_ml.max}<span class="unit">ml</span></div><div class="lbl">per day</div></div>
        <div class="stat-box"><div class="num">${data.feeds_per_day.min}–${data.feeds_per_day.max}</div><div class="lbl">feeds/day</div></div>
        <div class="stat-box"><div class="num">${data.interval_hours.min}–${data.interval_hours.max}h</div><div class="lbl">suggested interval</div></div>
      </div>
      ${
        formula
          ? `<div class="chart-ref-note">Formula (weight-based rule): ~${formula.per_day_ml}ml/day (~${formula.per_feed_ml}ml/feed) &middot; ${formula.basis}</div>`
          : ""
      }
      ${data.note ? `<div class="chart-ref-note">${data.note}</div>` : ""}
      <div class="chart-ref-note">Sources: ${data.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(" &middot; ")}. General guidance only, not medical advice - every baby is different.</div>
    </div>`;
  document.getElementById("calc-recalc").addEventListener("click", () => {
    loadFeedingCalculator({
      age_days: document.getElementById("calc-age").value,
      weight_g: document.getElementById("calc-weight").value,
    });
  });
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
        <label>Birth weight (g) <input type="number" min="0" id="profile-birthweight" style="width:100px" value="${p.birth_weight_g ?? ""}"></label>
        <label>Timezone <input type="text" id="profile-timezone" style="width:150px" placeholder="e.g. Europe/Ljubljana" value="${p.timezone || "UTC"}"></label>
        <button class="btn secondary" id="save-profile-btn">Save</button>
      </div>
    </div>`;
  document.getElementById("save-profile-btn").addEventListener("click", async () => {
    try {
      const bw = document.getElementById("profile-birthweight").value;
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: document.getElementById("profile-name").value || null,
          birth_date: document.getElementById("profile-birthdate").value || null,
          birth_weight_g: bw === "" ? null : Number(bw),
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
            : ct.fixed_reminder_note
              ? `<span style="color:var(--muted)">${ct.fixed_reminder_note}</span>`
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
