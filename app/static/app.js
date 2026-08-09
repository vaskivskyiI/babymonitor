// Baby Monitor frontend - vanilla JS, no build step, no external deps.

// ---------- cookies ----------

function setCookie(name, value, days = 400) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; samesite=lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------- i18n ----------
//
// EN/UK dictionary keyed by the exact English source string. `t()` looks a
// string up as-is (used for static chrome and for chore-type/field labels,
// which are always fixed English strings coming from the API for built-in
// types - custom user-created types just pass through untranslated, which
// is correct since the user typed them in whatever language they wanted).
// `tSummary()` instead does a global longest-phrase-first substring swap,
// since an event's `summary` is a short string *composed* server-side from
// several of these same fixed phrases (e.g. "🤱 Breast 80ml") rather than
// one dictionary entry on its own.
const I18N = {
  uk: {
    // topbar / tabs
    "Dashboard": "Панель",
    "History": "Історія",
    "Stats": "Статистика",
    "Settings": "Налаштування",
    // dashboard
    "No events yet": "Ще немає записів",
    "Edit last entry": "Редагувати останній запис",
    "Add a calendar alarm for this": "Додати нагадування в календар",
    "Start a new one": "Почати новий запис",
    "+ Log now": "+ Записати зараз",
    "+ New": "+ Новий",
    "Today:": "Сьогодні:",
    "Next: tomorrow": "Наступний: завтра",
    "Due today": "Сьогодні",
    "Overdue by": "Прострочено на",
    "Next": "Наступний",
    "Start": "Почати",
    "End": "Завершити",
    "ago": "тому",
    "in": "через",
    "just now": "щойно",
    "old": "вік",
    "weight": "вага",
    "height": "зріст",
    // modal
    "Log ": "Записати ",
    "Add to ": "Додати до ",
    "Edit ": "Редагувати ",
    "End ": "Завершити ",
    "Delete": "Видалити",
    "Close": "Закрити",
    "Saving…": "Збереження…",
    "Saved": "Збережено",
    "+ Add value": "+ Додати значення",
    "+ Add checkpoint": "+ Додати контрольну точку",
    "Time": "Час",
    "Delete this event?": "Видалити цей запис?",
    "Deleted": "Видалено",
    // chore type labels
    "Diaper Change": "Зміна підгузка",
    "Feeding": "Годування",
    "Height": "Зріст",
    "Probiotic": "Пробіотик",
    "Pumping": "Зціджування",
    "Sleep": "Сон",
    "Weight": "Вага",
    // field labels
    "Pee": "Пісяв",
    "Poop": "Какав",
    "Peed during the change": "Пісяв під час зміни",
    "Pooped during the change": "Какав під час зміни",
    "Notes": "Нотатки",
    "Checkpoints": "Контрольні точки",
    "Type": "Тип",
    "Breast": "Груди",
    "Breast (left)": "Груди (ліва)",
    "Breast (right)": "Груди (права)",
    "Pumped milk (bottle)": "Зціджене молоко (пляшечка)",
    "Formula": "Суміш",
    "Weight before": "Вага до",
    "Weight after": "Вага після",
    "Amount": "Кількість",
    "Note": "Примітка",
    "Total breast milk": "Всього грудного молока",
    "Total formula": "Всього суміші",
    "Total food": "Всього їжі",
    "Sub-steps": "Під-кроки",
    "Side": "Сторона",
    "Left": "Ліва",
    "Right": "Права",
    "Both": "Обидві",
    "Duration": "Тривалість",
    "Total amount": "Загальна кількість",
    "Woke up at": "Прокинувся о",
    // history
    "All types": "Всі типи",
    "Refresh": "Оновити",
    "No events yet.": "Ще немає записів.",
    // stats
    "← All": "← Всі",
    "Last 24h": "Останні 24 год",
    "Last 7 days": "Останні 7 днів",
    "Last 14 days": "Останні 14 днів",
    "Last 30 days": "Останні 30 днів",
    "Last 90 days": "Останні 90 днів",
    "Last year": "Останній рік",
    "All time": "Весь час",
    "Loading…": "Завантаження…",
    "No data yet": "Ще немає даних",
    "No chore types yet.": "Ще немає типів подій.",
    "No data for this period.": "Немає даних за цей період.",
    "total": "всього",
    "Events per day": "Подій на день",
    "typical range per": "типовий діапазон за даними",
    "Shaded band = commonly-cited normal range": "Затінена смуга = загальновизнаний нормальний діапазон",
    "General guidance only, not medical advice.": "Лише загальна інформація, не медична консультація.",
    "Actual weight": "Фактична вага",
    "Trend (dashed = projected)": "Тренд (пунктир = прогноз)",
    "Ideal range (age-based)": "Ідеальний діапазон (за віком)",
    "Weight over time": "Вага з часом",
    "Weight gain (g/day, between weigh-ins)": "Приріст ваги (г/день, між зважуваннями)",
    "events": "подій",
    "avg interval": "серед. інтервал",
    // settings
    "Chore types": "Типи подій",
    "+ Add": "+ Додати",
    "Reminders": "Нагадування",
    "Save": "Зберегти",
    "Edit": "Редагувати",
    "custom": "власний",
    "This also deletes all of its logged events.": "Це також видалить усі пов'язані записи.",
    "no reminder": "без нагадування",
    "Baby profile": "Профіль малюка",
    "days old": "днів",
    "Name": "Ім'я",
    "Birth date": "Дата народження",
    "Birth weight (g)": "Вага при народженні (г)",
    "Timezone": "Часовий пояс",
    "Auto-detected from your device": "Визначено автоматично з вашого пристрою",
    "Reminder": "Нагадування",
    "Session window": "Вікно сесії",
    "min": "хв",
    "Due once per calendar day": "Раз на календарний день",
    // toasts / errors
    "Error: ": "Помилка: ",
    "Quick action added": "Швидку дію додано",
    "Label and value are required": "Потрібні мітка та значення",
    "Alarm downloaded - open it to add to your calendar": "Нагадування завантажено - відкрийте, щоб додати в календар",
    " logged": " записано",
    // summary phrases (composed server-side; matched as substrings via tSummary)
    "💊 Given": "💊 Дано",
    "😴 Sleeping...": "😴 Спить...",
    "😴 Slept": "😴 Спав",
    "😴 Sleep": "😴 Сон",
    "🍶 Pumping": "🍶 Зціджування",
    "⚖️ Weight": "⚖️ Вага",
    "📏 Height": "📏 Зріст",
    "🤱 Breast": "🤱 Груди",
    "🍼 Formula": "🍼 Суміш",
    "💧 Pee": "💧 Пісяв",
    "💩 Poop": "💩 Какав",
    "Dry change": "Суха зміна",
    "peed during change": "пісяв під час зміни",
    "pooped during change": "какав під час зміни",
    "💧 Wet": "💧 Мокрий",
    "💩 Dirty": "💩 Брудний",
    "💧💩 Both": "💧💩 Обидва",
  },
};

// order longest-key-first once, so tSummary()'s substring pass never lets a
// short phrase (e.g. "Sleep") shadow a longer one that contains it (e.g.
// "Sleeping...", "Slept") before the longer one gets its turn.
const I18N_SUMMARY_KEYS = {};
for (const lang of Object.keys(I18N)) {
  I18N_SUMMARY_KEYS[lang] = Object.keys(I18N[lang]).sort((a, b) => b.length - a.length);
}

function detectDefaultLang() {
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("uk") ? "uk" : "en";
}

function t(str) {
  if (str == null) return str;
  const dict = I18N[state.lang];
  return (dict && dict[str]) ?? str;
}

// For strings *composed* elsewhere (server-side summaries) rather than
// looked up whole - swaps every known phrase it contains.
function tSummary(str) {
  if (!str || state.lang === "en") return str;
  const dict = I18N[state.lang];
  let result = str;
  for (const key of I18N_SUMMARY_KEYS[state.lang]) {
    if (result.includes(key)) result = result.split(key).join(dict[key]);
  }
  return result;
}

function setLang(lang) {
  state.lang = lang;
  setCookie("bm_lang", lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  loadDashboard();
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "history") loadHistory();
  if (activeTab === "settings") loadSettings();
  if (activeTab === "stats") {
    const detailVisible = !document.getElementById("stats-detail").classList.contains("hidden");
    if (detailVisible) loadStats();
    else loadStatsOverview();
  }
}

// Static (load-time, never-rebuilt) chrome text - tab labels, section
// headings, modal titles baked into index.html rather than generated by JS.
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

const state = {
  choreTypes: [],
  currentEdit: null, // {mode: 'create'|'edit', choreType, eventId}
  profile: null,
  lang: getCookie("bm_lang") || detectDefaultLang(),
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
  el.textContent = tSummary(msg);
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2500);
}

function fmtDurationMinutes(minutes) {
  minutes = Math.round(minutes);
  if (minutes <= 90) return `${minutes}${t("min")}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Formats a field's value for display given its declared type/display hint
// (e.g. duration fields as "2h 15m" instead of raw minutes).
function fmtFieldValue(field, value) {
  if (field.display === "duration") return fmtDurationMinutes(value);
  return `${value}${field.unit || ""}`;
}

// Absolute clock time (e.g. "14:05"), shown alongside relative due text so
// it's clear exactly when "next"/"overdue" actually is, not just how long.
function fmtClockTime(dateOrIso) {
  const d = dateOrIso instanceof Date ? dateOrIso : new Date(dateOrIso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// bare=true returns just the duration ("2h 15m"), no "ago"/"in" wrapper -
// used where the caller supplies its own prefix (e.g. "Overdue by 2h 15m").
function fmtRelative(dateIso, futureLabel = "in", bare = false) {
  const now = new Date();
  const d = new Date(dateIso);
  let diffMs = d - now;
  const future = diffMs >= 0;
  diffMs = Math.abs(diffMs);
  const mins = Math.round(diffMs / 60000);
  let text;
  if (mins < 1) return t("just now");
  else if (mins < 60) text = `${mins}m`;
  else if (mins < 60 * 24) text = `${Math.floor(mins / 60)}h ${mins % 60}m`;
  else text = `${Math.floor(mins / (60 * 24))}d ${Math.floor((mins % (60 * 24)) / 60)}h`;
  if (bare) return text;
  return future ? `${t(futureLabel)} ${text}` : `${text} ${t("ago")}`;
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
      if (btn.dataset.tab === "stats") showStatsOverview();
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
  if (ageText) chips.push(`<div class="info-chip"><span class="info-val">${ageText}</span><span class="info-lbl">${t("old")}</span></div>`);

  const w = weightStatus?.last_event?.data?.weight_g;
  if (w != null) {
    chips.push(
      `<div class="info-chip"><span class="info-val">${(w / 1000).toFixed(2)}kg</span><span class="info-lbl">${t("weight")}</span></div>`
    );
  }

  const h = heightStatus?.last_event?.data?.height_cm;
  if (h != null) {
    chips.push(`<div class="info-chip"><span class="info-val">${h}cm</span><span class="info-lbl">${t("height")}</span></div>`);
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
  let [statuses, profile] = await Promise.all([api("/api/status"), api("/api/profile")]);
  if (!state.tzSynced) {
    profile = await syncTimezone(profile);
    state.tzSynced = true;
  }
  state.profile = profile;
  renderBabyInfoBar(profile, statuses);
  const container = document.getElementById("cards");
  container.innerHTML = "";
  statuses.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card";
    const ct = choreType(s.chore_type);

    // "last event" chip - the headline info on the card, right above the action button.
    // The pencil is a fast path to fix up/fill in the previous entry (e.g. add
    // the amount to a pumping session logged when it started) without going
    // through History.
    let lastHtml = `<div class="last-chip empty">${t("No events yet")}</div>`;
    if (s.last_event) {
      const openBadge = s.open_event_id ? '<span class="live-pill">live</span>' : "";
      lastHtml = `<div class="last-chip">
          <div class="last-chip-text">
            <div class="last-summary">${tSummary(s.last_event.summary)}${openBadge}</div>
            <div class="last-time">${fmtRelative(s.last_event.timestamp)}</div>
          </div>
          <button type="button" class="edit-last-btn" data-action="edit-last" title="${t("Edit last entry")}">✏️</button>
        </div>`;
    }

    let dueText = "";
    let dueClass = "ok";
    if (ct && ct.daily_reminder && s.last_event) {
      // "once per day" reminders reset at local midnight, not 24h after the
      // last dose - a live countdown-to-midnight isn't meaningful, so show
      // "Tomorrow" once satisfied, or an overdue-by based on the last dose
      // time + 24h (a more intuitive reference than "since midnight").
      if (!s.overdue) {
        dueText = t("Next: tomorrow");
      } else {
        dueClass = "overdue";
        const reference = s.last_event ? new Date(new Date(s.last_event.timestamp).getTime() + 24 * 3600 * 1000) : null;
        dueText =
          reference && reference <= new Date()
            ? `${t("Overdue by")} ${fmtRelative(reference.toISOString(), "in", true)} (${fmtClockTime(reference)})`
            : t("Due today");
      }
    } else if (s.next_due) {
      dueClass = s.overdue ? "overdue" : "ok";
      dueText = `${s.overdue ? t("Overdue by") : t("Next")} ${fmtRelative(s.next_due, "in", true)} (${fmtClockTime(s.next_due)})`;
    }
    // "Set alarm" - only for a real future due time (a plain interval-based
    // reminder, not the daily-reset kind, and not already overdue - there's
    // nothing to count down to at that point).
    const showAlarm = s.next_due && !s.overdue && !(ct && ct.daily_reminder);
    const dueHtml = dueText
      ? `<div class="due ${dueClass}">
          <span>${dueText}</span>
          ${showAlarm ? `<button type="button" class="alarm-btn" data-action="alarm" title="${t("Add a calendar alarm for this")}">🔔</button>` : ""}
        </div>`
      : "";

    let buttonsHtml;
    let targetEventId = null;
    if (ct && ct.has_start_end) {
      if (s.open_event_id) {
        targetEventId = s.open_event_id;
        buttonsHtml = `<button class="quick-btn end-btn" data-action="end">⏰ ${t("End")} ${t(ct.label)}</button>`;
      } else {
        buttonsHtml = `<button class="quick-btn" data-action="start">${ct.icon} ${t("Start")} ${t(ct.label)}</button>`;
      }
    } else if (ct && ct.quick_actions && ct.quick_actions.length) {
      // one-tap presets - logged/updated instantly, no form. Field-targeting
      // ones (increment/absolute) apply to the open session if there is one.
      // Adding a fuller checkpoint (e.g. a weighed entry) to an open session
      // happens via editing it (pencil / tap the previous entry), which has
      // its own "+ Add checkpoint" inside the entries builder - no separate
      // dashboard-level action needed.
      targetEventId = s.active_session_event_id || null;
      buttonsHtml = `
        <div class="quick-actions-row">
          ${ct.quick_actions
            .map((qa, i) => `<button class="quick-btn pill" data-quick="${i}">${tSummary(qa.label)}</button>`)
            .join("")}
          <button class="icon-btn more-btn" data-action="new" title="${t("Start a new one")}">+</button>
        </div>`;
    } else if (s.active_session_event_id) {
      targetEventId = s.active_session_event_id;
      buttonsHtml = `<button class="quick-btn secondary-btn" data-action="new">${t("+ New")}</button>`;
    } else {
      buttonsHtml = `<button class="quick-btn" data-action="new">${t("+ Log now")}</button>`;
    }

    let todayHtml = "";
    if (ct) {
      const parts = ct.fields
        .filter((f) => f.numeric_stat && (s.today[f.name] || 0) > 0)
        .map((f) => `${t(f.label)}: ${fmtFieldValue(f, s.today[f.name])}`);
      if (parts.length) todayHtml = `<div class="today">${t("Today:")} ${parts.join(", ")}</div>`;
    }
    card.innerHTML = `
      <div class="icon">${s.icon}</div>
      <div class="label">${t(s.label)}</div>
      ${lastHtml}
      ${dueHtml}
      ${todayHtml}
      ${buttonsHtml}
    `;
    card.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.dataset.action === "alarm") {
          downloadAlarmICS(s.label, s.next_due);
        } else if (btn.dataset.action === "edit-last") {
          editLastEntry(s.chore_type, s.last_event.id);
        } else {
          handleCardAction(s.chore_type, btn.dataset.action, targetEventId);
        }
      });
    });
    card.querySelectorAll("[data-quick]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const qa = ct.quick_actions[Number(btn.dataset.quick)];
        if (qa.mode === "increment" || qa.mode === "absolute") {
          runFieldQuickAction(s.chore_type, qa, s);
        } else {
          logQuickAction(s.chore_type, qa);
        }
      });
    });
    // Clicking the previous-entry display edits it (same as the pencil) -
    // creating a new entry only happens via the explicit action buttons above.
    if (s.last_event) {
      const chipEl = card.querySelector(".last-chip");
      chipEl.classList.add("clickable");
      chipEl.addEventListener("click", (e) => {
        e.stopPropagation();
        editLastEntry(s.chore_type, s.last_event.id);
      });
    }
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

async function editLastEntry(choreTypeKey, eventId) {
  const event = await api(`/api/events/${eventId}`);
  openForm(choreTypeKey, "edit", event);
}

async function logQuickAction(choreTypeKey, qa) {
  try {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({ chore_type: choreTypeKey, data: qa.data }),
    });
    toast(qa.label + " logged");
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

// Configurable quick action targeting an `entries` field, e.g. "Formula
// +10ml" (mode: increment) or "Formula 100ml" (mode: absolute). Applies to
// the last entry matching match_field/match_value within the currently
// open session (if any), or starts a new one-entry event otherwise - so
// repeated taps build up the same checkpoint instead of creating one each.
async function runFieldQuickAction(choreTypeKey, qa, status) {
  try {
    const sessionEventId = status.active_session_event_id || status.open_event_id;
    const event = sessionEventId ? await api(`/api/events/${sessionEventId}`) : null;
    const entries = event ? [...(event.data[qa.entries_field] || [])] : [];
    let idx = -1;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i][qa.match_field] === qa.match_value) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      const cur = Number(entries[idx][qa.target_field]) || 0;
      entries[idx] = { ...entries[idx], [qa.target_field]: qa.mode === "increment" ? cur + qa.value : qa.value };
    } else {
      entries.push({ timestamp: new Date().toISOString(), [qa.match_field]: qa.match_value, [qa.target_field]: qa.value });
    }
    // PUT replaces the whole `data` object, so merge onto the event's
    // existing data (e.g. a typed note) instead of dropping everything else.
    const data = { ...(event ? event.data : {}), [qa.entries_field]: entries };
    if (event) {
      await api(`/api/events/${event.id}`, { method: "PUT", body: JSON.stringify({ data }) });
    } else {
      await api("/api/events", { method: "POST", body: JSON.stringify({ chore_type: choreTypeKey, data }) });
    }
    toast(qa.label);
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

// "Set alarm" - downloads a .ics calendar event with an alarm trigger at the
// due time. Real push notifications need HTTPS (not guaranteed on a home
// LAN deployment); a calendar reminder works everywhere, no server involved.
function downloadAlarmICS(title, dueIso) {
  const dt = new Date(dueIso);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const summary = `${title} due - Baby Monitor`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baby Monitor//EN",
    "BEGIN:VEVENT",
    `UID:babymonitor-${Date.now()}@local`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(new Date(dt.getTime() + 5 * 60000))}`,
    `SUMMARY:${summary}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "babymonitor-alarm.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast("Alarm downloaded - open it to add to your calendar");
}

// ---------- dynamic form ----------

function buildFieldHtml(field, value) {
  const val = value !== undefined ? value : field.default;
  const id = `f_${field.name}`;
  if (field.type === "boolean") {
    return `<div class="field field-bool">
      <input type="checkbox" id="${id}" name="${field.name}" ${val ? "checked" : ""}>
      <label for="${id}">${t(field.label)}</label>
    </div>`;
  }
  if (field.type === "select") {
    const opts = field.options
      .map((o) => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${t(o.label)}</option>`)
      .join("");
    return `<div class="field">
      <label for="${id}">${t(field.label)}</label>
      <select id="${id}" name="${field.name}" ${field.required ? "required" : ""}>${opts}</select>
    </div>`;
  }
  if (field.type === "textarea") {
    return `<div class="field">
      <label for="${id}">${t(field.label)}</label>
      <textarea id="${id}" name="${field.name}">${val || ""}</textarea>
    </div>`;
  }
  if (field.type === "number") {
    return `<div class="field">
      <label for="${id}">${t(field.label)}${field.unit ? ` (${field.unit})` : ""}</label>
      <input type="number" step="any" inputmode="decimal" id="${id}" name="${field.name}" value="${val ?? ""}">
    </div>`;
  }
  if (field.type === "datetime") {
    return `<div class="field">
      <label for="${id}">${t(field.label)}</label>
      <input type="datetime-local" id="${id}" name="${field.name}" value="${val ? toLocalInputValue(val) : ""}">
    </div>`;
  }
  if (field.type === "number_list") {
    const items = Array.isArray(val) ? val : [];
    return `<div class="field number-list" data-name="${field.name}">
      <label>${t(field.label)}${field.unit ? ` (${field.unit})` : ""}</label>
      <div class="number-list-rows"></div>
      <button type="button" class="btn secondary add-row-btn">${t("+ Add value")}</button>
    </div>`;
  }
  if (field.type === "entries") {
    return `<div class="field entries-field" data-name="${field.name}">
      <label>${t(field.label)}</label>
      ${field.help ? `<div class="field-help">${field.help}</div>` : ""}
      <div class="entries-rows"></div>
      <button type="button" class="btn secondary add-entry-btn">${t("+ Add checkpoint")}</button>
    </div>`;
  }
  // text (default)
  return `<div class="field">
    <label for="${id}">${t(field.label)}</label>
    <input type="text" id="${id}" name="${field.name}" value="${val || ""}">
  </div>`;
}

function attachNumberListHandlers(form, field, initialValues, onMutate) {
  const wrap = form.querySelector(`.number-list[data-name="${field.name}"]`);
  const rows = wrap.querySelector(".number-list-rows");
  function addRow(v) {
    const row = document.createElement("div");
    row.className = "number-list-row";
    row.innerHTML = `<input type="number" step="any" value="${v ?? ""}"><button type="button" class="icon-btn remove-row">✕</button>`;
    row.querySelector(".remove-row").addEventListener("click", () => {
      row.remove();
      onMutate();
    });
    rows.appendChild(row);
  }
  (initialValues && initialValues.length ? initialValues : [null]).forEach(addRow);
  wrap.querySelector(".add-row-btn").addEventListener("click", () => {
    addRow(null);
    onMutate();
  });
}

function buildEntryRowHtml(entryFields, entry) {
  let inputsHtml = `<input type="datetime-local" class="entry-timestamp" title="${t("Time")}">`;
  entryFields.forEach((f) => {
    const val = entry ? entry[f.name] : f.default;
    if (f.type === "select") {
      const opts = f.options
        .map((o) => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${t(o.label)}</option>`)
        .join("");
      inputsHtml += `<select class="entry-field" data-name="${f.name}">${opts}</select>`;
    } else if (f.type === "number") {
      inputsHtml += `<input type="number" step="any" class="entry-field" data-name="${f.name}" placeholder="${t(f.label)}${f.unit ? ` (${f.unit})` : ""}" value="${val ?? ""}">`;
    } else {
      inputsHtml += `<input type="text" class="entry-field" data-name="${f.name}" placeholder="${t(f.label)}" value="${val ?? ""}">`;
    }
  });
  return `<div class="entry-row">${inputsHtml}<button type="button" class="icon-btn remove-entry">✕</button></div>`;
}

function attachEntriesHandlers(form, field, initialEntries, onMutate) {
  const wrap = form.querySelector(`.entries-field[data-name="${field.name}"]`);
  const rows = wrap.querySelector(".entries-rows");
  function addRow(entry) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildEntryRowHtml(field.entry_fields, entry);
    const rowEl = wrapper.firstElementChild;
    rowEl.querySelector(".entry-timestamp").value = toLocalInputValue(entry ? entry.timestamp : new Date());
    rowEl.querySelector(".remove-entry").addEventListener("click", () => {
      rowEl.remove();
      onMutate();
    });
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
    onMutate();
  });
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function setSaveStatus(text) {
  const el = document.getElementById("save-status");
  if (!el) return;
  const translated = t(text);
  el.textContent = translated;
  if (text) clearTimeout(el._fadeTimer);
  if (text === "Saved") {
    el._fadeTimer = setTimeout(() => {
      if (el.textContent === translated) el.textContent = "";
    }, 1500);
  }
}

// Reads the current form into {timestamp, data} matching the API's event
// shape. Pure/side-effect-free so it can be called on every field change.
function buildEventData(ct, form) {
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

  // Absent for entries-based types - their timestamp is derived server-side
  // from the first checkpoint (see ChoreType.event_timestamp).
  const timestampField = form.querySelector("#f_timestamp");
  const timestamp = timestampField ? fromLocalInputValue(timestampField.value) : undefined;
  return { timestamp, data };
}

// autosaveChain serializes saves across the whole app (only one modal is
// ever open at a time) so two rapid field changes can't race each other.
let autosaveChain = Promise.resolve();

// #modal-form itself is never recreated (only its innerHTML is replaced on
// every openForm() call), so the change listener is bound once here and
// dispatches to whichever save function the currently-open modal registered
// - binding a fresh listener inside openForm() every time would stack up
// one extra listener per modal open, each still holding the *previous*
// modal's stale closure (wrong chore type, wrong form fields).
let currentDebouncedSave = null;
document.getElementById("modal-form").addEventListener("change", (e) => {
  if (e.target.closest(".form-actions")) return;
  if (currentDebouncedSave) currentDebouncedSave();
});

function openForm(choreTypeKey, mode, event) {
  const ct = choreType(choreTypeKey);
  state.currentEdit = { mode, choreType: choreTypeKey, eventId: event ? event.id : null };
  // local to this modal session - never read state.currentEdit for saves,
  // so a stale debounced save from a since-closed form can't be confused
  // about which event it belongs to if another modal opens in the meantime
  let currentEventId = event ? event.id : null;

  const titlePrefixes = { checkpoint: "Add to ", edit: "Edit ", end: "End " };
  document.getElementById("modal-title").textContent = t(titlePrefixes[mode] || "Log ") + t(ct.label);

  const form = document.getElementById("modal-form");
  const data = event ? { ...event.data } : {};
  const editableFields = ct.fields.filter((f) => !f.computed);

  if (mode === "end") {
    // prefill any not-yet-set datetime field (e.g. sleep's "ended_at") with now
    editableFields.forEach((f) => {
      if (f.type === "datetime" && !data[f.name]) data[f.name] = new Date().toISOString();
    });
  }

  // Entries-based types (feeding, pumping, ...) derive their own time from
  // the first checkpoint - showing a separate top-level "Time" here would
  // just be a second, independently-editable clock for the same moment.
  const hasEntries = editableFields.some((f) => f.type === "entries");
  let html = hasEntries
    ? ""
    : `<div class="field">
      <label for="f_timestamp">${t("Time")}</label>
      <input type="datetime-local" id="f_timestamp" name="timestamp" required>
    </div>`;
  html += editableFields.map((f) => buildFieldHtml(f, data[f.name])).join("");
  html += `<div class="form-actions">
      <button type="button" id="delete-btn" class="btn danger ${currentEventId ? "" : "hidden"}">${t("Delete")}</button>
      <span id="save-status" class="save-status"></span>
      <button type="button" id="close-modal-btn" class="btn secondary">${t("Close")}</button>
    </div>`;
  form.innerHTML = html;
  form.onsubmit = (e) => e.preventDefault(); // no submit button anymore, but Enter shouldn't reload the page

  const timestampInput = form.querySelector("#f_timestamp");
  if (timestampInput) timestampInput.value = toLocalInputValue(event ? event.timestamp : new Date());

  const delBtn = document.getElementById("delete-btn");

  // Every field change (blur-after-edit for text/number/date, immediate for
  // checkboxes/selects) saves right away - create on the first change, then
  // update in place. No Save button; Close just dismisses the modal.
  //
  // The form is read (buildEventData) synchronously, right when the change
  // happens - not inside the deferred flush below. #modal-form is reused
  // (only its innerHTML is swapped) across modal opens, so by the time a
  // debounced flush actually runs, the user may already have closed this
  // modal and opened a different one; reading the form lazily at flush time
  // would then read the *other* modal's fields under this one's chore type.
  const flushSave = (payload) => {
    autosaveChain = autosaveChain.then(async () => {
      setSaveStatus("Saving…");
      try {
        if (currentEventId) {
          await api(`/api/events/${currentEventId}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          const created = await api("/api/events", {
            method: "POST",
            body: JSON.stringify({ chore_type: ct.key, ...payload }),
          });
          currentEventId = created.id;
          if (delBtn) delBtn.classList.remove("hidden");
        }
        setSaveStatus("Saved");
        refreshCurrentView();
      } catch (err) {
        setSaveStatus("");
        toast("Error: " + err.message);
      }
    });
    return autosaveChain;
  };
  const debouncedFlush = debounce(flushSave, 250);
  const saveNow = () => flushSave(buildEventData(ct, form));
  const debouncedSave = () => debouncedFlush(buildEventData(ct, form));

  editableFields
    .filter((f) => f.type === "number_list")
    .forEach((f) => attachNumberListHandlers(form, f, data[f.name], debouncedSave));

  editableFields
    .filter((f) => f.type === "entries")
    .forEach((f) => {
      let initial = data[f.name] || [];
      if (mode === "checkpoint") initial = [...initial, null]; // pre-append a blank checkpoint to fill in
      attachEntriesHandlers(form, f, initial, debouncedSave);
    });

  currentDebouncedSave = debouncedSave;

  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  if (delBtn) delBtn.addEventListener("click", () => deleteEvent(currentEventId));

  document.getElementById("modal-backdrop").classList.remove("hidden");

  // "End sleep" prefills ended_at programmatically (no user interaction
  // required) - save it immediately rather than waiting for a field touch.
  if (mode === "end") saveNow();
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.add("hidden");
  state.currentEdit = null;
  currentDebouncedSave = null;
}

async function deleteEvent(id) {
  if (!confirm(t("Delete this event?"))) return;
  await api(`/api/events/${id}`, { method: "DELETE" });
  closeModal();
  toast("Deleted");
  refreshCurrentView();
}

function refreshCurrentView() {
  loadDashboard();
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "history") loadHistory();
  if (activeTab === "stats") {
    const detailVisible = !document.getElementById("stats-detail").classList.contains("hidden");
    if (detailVisible) loadStats();
    else loadStatsOverview();
  }
}

// ---------- history ----------

async function loadHistory() {
  const select = document.getElementById("history-filter");
  if (select.options.length <= 1 || select.dataset.lang !== state.lang) {
    const selected = select.value;
    select.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
    state.choreTypes.forEach((ct) => {
      const opt = document.createElement("option");
      opt.value = ct.key;
      opt.textContent = `${ct.icon} ${t(ct.label)}`;
      select.appendChild(opt);
    });
    select.dataset.lang = state.lang;
    select.value = selected;
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
        <div><strong>${ct.icon} ${tSummary(ev.summary)}</strong></div>
        <div class="meta">${d.toLocaleString(state.lang === "uk" ? "uk-UA" : undefined)}${ev.notes ? " · " + ev.notes : ""}</div>
      </div>
      <div class="actions">
        <button class="icon-btn edit-btn">✏️</button>
        <button class="icon-btn del-btn">🗑️</button>
      </div>`;
    item.querySelector(".edit-btn").addEventListener("click", () => openForm(ev.chore_type, "edit", ev));
    item.querySelector(".del-btn").addEventListener("click", () => deleteEvent(ev.id));
    list.appendChild(item);
  });
  if (!events.length) list.innerHTML = `<p style="color:var(--muted)">${t("No events yet.")}</p>`;
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

// ---------- stats: at-a-glance overview ----------

function svgSparkline(points, color) {
  const vals = points.map((p) => p.value).filter((v) => v != null);
  if (!vals.length) return `<div class="sparkline-empty">${t("No data yet")}</div>`;
  const w = 120;
  const h = 36;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = p.value == null ? null : h - ((p.value - min) / range) * (h - 4) - 2;
    return { x, y };
  });
  const path = coords
    .filter((c) => c.y != null)
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const lastVisible = [...coords].reverse().find((c) => c.y != null);
  const dot = lastVisible ? `<circle cx="${lastVisible.x}" cy="${lastVisible.y}" r="2.5" fill="${color}"></circle>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"></path>
      ${dot}
    </svg>`;
}

async function showStatsOverview() {
  document.getElementById("stats-overview").classList.remove("hidden");
  document.getElementById("stats-detail").classList.add("hidden");
  await loadStatsOverview();
}

function showStatsDetail(key) {
  document.getElementById("stats-overview").classList.add("hidden");
  document.getElementById("stats-detail").classList.remove("hidden");
  loadStats(key);
}

async function loadStatsOverview() {
  const box = document.getElementById("stats-overview");
  box.innerHTML = `<p class="muted-note">${t("Loading…")}</p>`;
  const results = await Promise.all(
    state.choreTypes.map((ct) => api(`/api/stats/${ct.key}?all_time=true`).catch(() => null))
  );
  box.innerHTML = `<div class="overview-grid"></div>`;
  const grid = box.querySelector(".overview-grid");
  state.choreTypes.forEach((ct, i) => {
    const data = results[i];
    const card = document.createElement("div");
    card.className = "overview-card";
    let sparkHtml = `<div class="sparkline-empty">${t("No data yet")}</div>`;
    let keyStat = "";
    if (data && data.days.length) {
      // pick the most meaningful numeric field for the sparkline: prefer a
      // "last"-style reading (e.g. weight), else the first numeric field,
      // else fall back to event counts
      const field = ct.fields.find((f) => f.numeric_stat && f.stat_agg === "last") || ct.fields.find((f) => f.numeric_stat);
      const points = data.days.map((d) => ({ date: d.date, value: field ? d[field.name] : d.count }));
      sparkHtml = svgSparkline(points, "var(--primary)");
      const lastVal = [...points].reverse().find((p) => p.value != null);
      keyStat = field && lastVal ? `${lastVal.value}${t(field.unit || "")}` : `${data.total_events} ${t("total")}`;
    }
    card.innerHTML = `
      <div class="overview-card-head">
        <span class="overview-icon">${ct.icon}</span>
        <span class="overview-label">${t(ct.label)}</span>
      </div>
      <div class="overview-spark">${sparkHtml}</div>
      <div class="overview-keystat">${keyStat}</div>
    `;
    card.addEventListener("click", () => showStatsDetail(ct.key));
    grid.appendChild(card);
  });
  if (!state.choreTypes.length) box.innerHTML = `<p class="muted-note">${t("No chore types yet.")}</p>`;
}

async function loadStats(explicitKey) {
  const typeSelect = document.getElementById("stats-type");
  if (typeSelect.options.length === 0) {
    typeSelect.addEventListener("change", () => loadStats());
    document.getElementById("stats-days").addEventListener("change", () => loadStats());
  }
  if (typeSelect.options.length === 0 || typeSelect.dataset.lang !== state.lang) {
    const selected = typeSelect.value;
    typeSelect.querySelectorAll("option").forEach((o) => o.remove());
    state.choreTypes.forEach((ct) => {
      const opt = document.createElement("option");
      opt.value = ct.key;
      opt.textContent = `${ct.icon} ${t(ct.label)}`;
      typeSelect.appendChild(opt);
    });
    typeSelect.dataset.lang = state.lang;
    if (selected) typeSelect.value = selected;
  }
  const key = explicitKey || typeSelect.value || state.choreTypes[0]?.key;
  if (!key) return;
  typeSelect.value = key;
  const days = document.getElementById("stats-days").value;
  const query = days === "all" ? "all_time=true" : `days=${days}`;
  const requestToken = (state.statsRequestToken = (state.statsRequestToken || 0) + 1);
  const data = await api(`/api/stats/${key}?${query}`);
  if (requestToken !== state.statsRequestToken) return; // a newer request superseded this one

  const summary = document.getElementById("stats-summary");
  summary.innerHTML = `
    <div class="stat-box"><div class="num">${data.total_events}</div><div class="lbl">${t("events")}</div></div>
    ${data.avg_interval_minutes ? `<div class="stat-box"><div class="num">${(data.avg_interval_minutes / 60).toFixed(1)}h</div><div class="lbl">${t("avg interval")}</div></div>` : ""}
  `;

  const charts = document.getElementById("stats-charts");
  if (!data.days.length && !(data.growth_rate && data.growth_rate.length)) {
    charts.innerHTML = `<p style="color:var(--muted)">${t("No data for this period.")}</p>`;
    return;
  }

  function refFooter(refInfo) {
    if (!refInfo) return "";
    const src = refInfo.source_label
      ? ` &middot; ${t("typical range per")} <a href="${refInfo.source_url}" target="_blank" rel="noopener">${refInfo.source_label}</a>`
      : "";
    return `<div class="chart-ref-note">${t("Shaded band = commonly-cited normal range")}${src}. ${t("General guidance only, not medical advice.")}</div>`;
  }

  const statCt = choreType(key);
  let html = "";
  if (data.days.length) {
    html += `<div class="chart-block"><h3>${t("Events per day")}</h3>${svgBarChart(
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
      const fieldDef = statCt && statCt.fields.find((x) => x.name === f);
      const heading = fieldDef ? t(fieldDef.label) : f.replace(/_/g, " ");
      html += `<div class="chart-block"><h3>${heading}</h3>${svgBarChart(points, "var(--ok)")}${refFooter(refMeta)}</div>`;
    });
  }

  if (key === "weight" && (data.days.some((d) => d.weight_g != null) || (data.trend && data.trend.length))) {
    const actual = data.days.filter((d) => d.weight_g != null).map((d) => ({ date: d.date, value: d.weight_g }));
    const trend = data.trend || [];
    const ideal = data.ideal || [];
    const idealLow = ideal.map((p) => ({ date: p.date, value: p.low }));
    const idealHigh = ideal.map((p) => ({ date: p.date, value: p.high }));
    const legend = `<div class="chart-legend">
        <span><i class="dot" style="background:var(--ok)"></i>${t("Actual weight")}</span>
        <span><i class="dot" style="background:var(--primary)"></i>${t("Trend (dashed = projected)")}</span>
        <span><i class="dot band"></i>${t("Ideal range (age-based)")}</span>
      </div>`;
    html = `<div class="chart-block"><h3>${t("Weight over time")}</h3>${svgLineChart({ actual, trend, idealLow, idealHigh, unit: "g" })}${legend}${refFooter({
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
    html += `<div class="chart-block"><h3>${t("Weight gain (g/day, between weigh-ins)")}</h3>${svgBarChart(points, "var(--primary)")}${refFooter(refMeta)}</div>`;
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

function detectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (err) {
    return "UTC";
  }
}

// Silently keep the profile's timezone in sync with the browser/device -
// no manual entry needed. Safe to call often; it's a no-op once they match.
async function syncTimezone(profile) {
  const detected = detectedTimezone();
  if (!detected || detected === profile.timezone) return profile;
  try {
    return await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ timezone: detected }),
    });
  } catch (err) {
    return profile;
  }
}

async function loadProfile() {
  let p = await api("/api/profile");
  p = await syncTimezone(p);
  state.profile = p;
  const box = document.getElementById("profile-box");
  box.innerHTML = `
    <div class="settings-row profile-row">
      <div><strong>👶 ${t("Baby profile")}</strong>${p.age_days != null ? ` <span class="age-pill">${p.age_days} ${t("days old")}</span>` : ""}</div>
      <div class="row">
        <label>${t("Name")} <input type="text" id="profile-name" style="width:120px" value="${p.name || ""}"></label>
        <label>${t("Birth date")} <input type="date" id="profile-birthdate" value="${p.birth_date || ""}"></label>
        <label>${t("Birth weight (g)")} <input type="number" min="0" id="profile-birthweight" style="width:100px" value="${p.birth_weight_g ?? ""}"></label>
        <label>${t("Timezone")} <span class="readonly-value" title="${t("Auto-detected from your device")}">${p.timezone} 🌐</span></label>
        <button class="btn secondary" id="save-profile-btn">${t("Save")}</button>
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
        }),
      });
      toast("Saved");
      await loadProfile();
    } catch (err) {
      toast("Error: " + err.message);
    }
  });
}

// ---------- chore type manager (add/edit/delete/reorder/enable) ----------

const FIELD_TYPES = ["text", "number", "boolean", "select", "textarea"];

async function loadChoreTypesManager() {
  const box = document.getElementById("chore-types-manager");
  const types = await api("/api/chore-types?include_disabled=true");
  box.innerHTML = "";
  types.forEach((ct, i) => {
    const row = document.createElement("div");
    row.className = "ct-manage-row" + (ct.enabled ? "" : " disabled");
    row.innerHTML = `
      <div class="ct-manage-order">
        <button type="button" class="icon-btn" data-move="up" ${i === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="icon-btn" data-move="down" ${i === types.length - 1 ? "disabled" : ""}>▼</button>
      </div>
      <div class="ct-manage-info">${ct.icon} <strong>${t(ct.label)}</strong>${ct.is_builtin ? "" : ` <span class="custom-pill">${t("custom")}</span>`}</div>
      <div class="ct-manage-actions">
        <label class="switch"><input type="checkbox" class="ct-enabled-toggle" ${ct.enabled ? "checked" : ""}><span class="slider"></span></label>
        <button type="button" class="icon-btn ct-edit-btn" title="${t("Edit")}">✏️</button>
        ${!ct.is_builtin ? `<button type="button" class="icon-btn ct-delete-btn" title="${t("Delete")}">🗑️</button>` : ""}
      </div>`;
    row.querySelector('[data-move="up"]').addEventListener("click", () => moveChoreType(types, i, -1));
    row.querySelector('[data-move="down"]').addEventListener("click", () => moveChoreType(types, i, 1));
    row.querySelector(".ct-enabled-toggle").addEventListener("change", async (e) => {
      await api(`/api/chore-types/${ct.key}/meta`, {
        method: "PUT",
        body: JSON.stringify({ enabled: e.target.checked }),
      });
      await loadChoreTypes();
      loadChoreTypesManager();
      loadDashboard();
    });
    row.querySelector(".ct-edit-btn").addEventListener("click", () => openChoreTypeBuilder(ct));
    const delBtn = row.querySelector(".ct-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm(`${t("Delete")} "${t(ct.label)}"? ${t("This also deletes all of its logged events.")}`)) return;
        await api(`/api/chore-types/${ct.key}`, { method: "DELETE" });
        toast("Deleted");
        await loadChoreTypes();
        loadChoreTypesManager();
        loadSettings();
        loadDashboard();
      });
    }
    box.appendChild(row);
  });
}

async function moveChoreType(types, index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= types.length) return;
  const keys = types.map((t) => t.key);
  [keys[index], keys[newIndex]] = [keys[newIndex], keys[index]];
  await api("/api/chore-types/reorder", { method: "POST", body: JSON.stringify({ keys }) });
  await loadChoreTypes();
  loadChoreTypesManager();
  loadDashboard();
}

function fieldBuilderRowHtml(f) {
  const field = f || { name: "", label: "", type: "number", unit: "", numeric_stat: false, options: [] };
  const optionsStr = (field.options || []).map((o) => `${o.value}:${o.label}`).join(", ");
  return `<div class="field-builder-row">
    <input type="text" class="cf-name" placeholder="field_name" value="${field.name}">
    <input type="text" class="cf-label" placeholder="Label" value="${field.label}">
    <select class="cf-type">
      ${FIELD_TYPES.map((t) => `<option value="${t}" ${t === field.type ? "selected" : ""}>${t}</option>`).join("")}
    </select>
    <input type="text" class="cf-unit" placeholder="unit" value="${field.unit || ""}" style="width:70px">
    <label class="cf-numeric"><input type="checkbox" class="cf-numeric-input" ${field.numeric_stat ? "checked" : ""}> track in stats</label>
    <input type="text" class="cf-options" placeholder="options: value:Label, value2:Label2" value="${optionsStr}">
    <button type="button" class="icon-btn cf-remove">✕</button>
  </div>`;
}

function openChoreTypeBuilder(existing) {
  const isCustomEdit = existing && !existing.is_builtin;
  const isBuiltinEdit = existing && existing.is_builtin;
  document.getElementById("ct-modal-title").textContent = existing ? `Edit ${existing.label}` : "Add chore type";
  const form = document.getElementById("ct-modal-form");

  if (isBuiltinEdit) {
    // built-ins only allow renaming/re-iconing from here; their fields and
    // behavior are code-defined
    const entriesField = existing.fields.find((f) => f.type === "entries");
    form.innerHTML = `
      <div class="field"><label>Label</label><input type="text" id="ct-label" value="${existing.label}" required></div>
      <div class="field"><label>Icon (emoji)</label><input type="text" id="ct-icon" value="${existing.icon}" required></div>
      ${entriesField ? `<div class="field"><label>Quick actions</label><div id="qa-section"></div></div>` : ""}
      <div class="form-actions">
        <button type="button" id="ct-cancel-btn" class="btn secondary">Cancel</button>
        <button type="submit" class="btn">Save</button>
      </div>`;
    if (entriesField) renderQuickActionsSection(existing, entriesField);
    form.onsubmit = async (e) => {
      e.preventDefault();
      await api(`/api/chore-types/${existing.key}/meta`, {
        method: "PUT",
        body: JSON.stringify({
          label_override: document.getElementById("ct-label").value,
          icon_override: document.getElementById("ct-icon").value,
        }),
      });
      toast("Saved");
      closeChoreTypeModal();
      await loadChoreTypes();
      loadChoreTypesManager();
      loadDashboard();
    };
  } else {
    const fieldsRowsHtml = (existing ? existing.fields.filter((f) => !f.computed) : [null]).map(fieldBuilderRowHtml).join("");
    form.innerHTML = `
      <div class="field"><label>Label</label><input type="text" id="ct-label" value="${existing ? existing.label : ""}" required></div>
      <div class="field"><label>Icon (emoji)</label><input type="text" id="ct-icon" value="${existing ? existing.icon : "🍼"}" required></div>
      ${!isCustomEdit ? `<div class="field"><label>Key (no spaces, used internally)</label><input type="text" id="ct-key" placeholder="e.g. tummy_time" required></div>` : ""}
      <div class="field"><label>Reminder interval (minutes, optional)</label><input type="number" min="0" id="ct-interval" value="${existing && existing.interval_minutes != null ? existing.interval_minutes : ""}"></div>
      <div class="field">
        <label>Fields</label>
        <div id="ct-fields-rows">${fieldsRowsHtml}</div>
        <button type="button" class="btn secondary" id="ct-add-field-btn">+ Add field</button>
      </div>
      <div class="form-actions">
        <button type="button" id="ct-cancel-btn" class="btn secondary">Cancel</button>
        <button type="submit" class="btn">Save</button>
      </div>`;

    const rowsBox = document.getElementById("ct-fields-rows");
    function attachRemove(rowEl) {
      rowEl.querySelector(".cf-remove").addEventListener("click", () => rowEl.remove());
    }
    rowsBox.querySelectorAll(".field-builder-row").forEach(attachRemove);
    document.getElementById("ct-add-field-btn").addEventListener("click", () => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = fieldBuilderRowHtml(null);
      const rowEl = wrapper.firstElementChild;
      rowsBox.appendChild(rowEl);
      attachRemove(rowEl);
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fields = Array.from(rowsBox.querySelectorAll(".field-builder-row"))
        .map((row) => {
          const name = row.querySelector(".cf-name").value.trim();
          if (!name) return null;
          const type = row.querySelector(".cf-type").value;
          const optionsStr = row.querySelector(".cf-options").value.trim();
          const options =
            type === "select" && optionsStr
              ? optionsStr.split(",").map((pair) => {
                  const [value, label] = pair.split(":").map((s) => s.trim());
                  return { value, label: label || value };
                })
              : null;
          return {
            name,
            label: row.querySelector(".cf-label").value.trim() || name,
            type,
            unit: row.querySelector(".cf-unit").value.trim() || null,
            numeric_stat: row.querySelector(".cf-numeric-input").checked,
            options,
          };
        })
        .filter(Boolean);

      const intervalRaw = document.getElementById("ct-interval").value;
      const body = {
        label: document.getElementById("ct-label").value,
        icon: document.getElementById("ct-icon").value,
        fields,
        interval_minutes: intervalRaw === "" ? null : Number(intervalRaw),
      };

      try {
        if (isCustomEdit) {
          await api(`/api/chore-types/${existing.key}/definition`, { method: "PUT", body: JSON.stringify(body) });
        } else {
          const key = document.getElementById("ct-key").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
          await api("/api/chore-types", { method: "POST", body: JSON.stringify({ key, ...body }) });
        }
        toast("Saved");
        closeChoreTypeModal();
        await loadChoreTypes();
        loadChoreTypesManager();
        loadDashboard();
      } catch (err) {
        toast("Error: " + err.message);
      }
    };
  }

  document.getElementById("ct-cancel-btn").addEventListener("click", closeChoreTypeModal);
  document.getElementById("ct-modal-backdrop").classList.remove("hidden");
}

function closeChoreTypeModal() {
  document.getElementById("ct-modal-backdrop").classList.add("hidden");
}

// Manage configured (DB-backed) quick actions for an entries-based chore
// type, e.g. "Formula +10ml" - increments/sets a field on the last
// matching entry of the open session, or starts one. Lives inside the
// chore-type edit modal, saves immediately per-action (not tied to the
// modal's own Save button).
async function renderQuickActionsSection(ct, entriesField) {
  const box = document.getElementById("qa-section");
  if (!box) return;
  const matchField = entriesField.entry_fields.find((f) => f.type === "select");
  const numericFields = entriesField.entry_fields.filter((f) => f.type === "number");
  const configured = (ct.quick_actions || []).filter((qa) => qa.id != null);

  const listHtml = configured.length
    ? configured
        .map(
          (qa) => `<div class="qa-row" data-id="${qa.id}">
            <span class="qa-label">${qa.label}</span>
            <button type="button" class="icon-btn qa-delete-btn" data-id="${qa.id}">🗑️</button>
          </div>`
        )
        .join("")
    : '<p class="muted-note">No quick actions yet.</p>';

  box.innerHTML = `
    <div class="qa-list">${listHtml}</div>
    ${
      matchField && numericFields.length
        ? `<button type="button" class="btn secondary" id="qa-add-toggle-btn">+ Add quick action</button>
           <div id="qa-add-form" class="qa-add-form hidden">
             <input type="text" id="qa-new-label" placeholder="Label, e.g. Formula +10ml">
             <select id="qa-new-match">
               ${matchField.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("")}
             </select>
             <select id="qa-new-target">
               ${numericFields.map((f) => `<option value="${f.name}">${f.label}${f.unit ? ` (${f.unit})` : ""}</option>`).join("")}
             </select>
             <select id="qa-new-mode">
               <option value="increment">Increment by</option>
               <option value="absolute">Set to</option>
             </select>
             <input type="number" id="qa-new-value" placeholder="Value" step="any">
             <button type="button" class="btn" id="qa-new-save-btn">Add</button>
           </div>`
        : ""
    }
  `;

  box.querySelectorAll(".qa-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/chore-types/${ct.key}/quick-actions/${btn.dataset.id}`, { method: "DELETE" });
      await loadChoreTypes();
      const refreshed = choreType(ct.key);
      renderQuickActionsSection(refreshed, entriesField);
      loadDashboard();
    });
  });

  const toggleBtn = document.getElementById("qa-add-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.getElementById("qa-add-form").classList.toggle("hidden");
    });
    document.getElementById("qa-new-save-btn").addEventListener("click", async () => {
      const label = document.getElementById("qa-new-label").value.trim();
      const value = document.getElementById("qa-new-value").value;
      if (!label || value === "") {
        toast("Label and value are required");
        return;
      }
      try {
        await api(`/api/chore-types/${ct.key}/quick-actions`, {
          method: "POST",
          body: JSON.stringify({
            label,
            mode: document.getElementById("qa-new-mode").value,
            match_field: matchField.name,
            match_value: document.getElementById("qa-new-match").value,
            target_field: document.getElementById("qa-new-target").value,
            value: Number(value),
          }),
        });
        toast("Quick action added");
        await loadChoreTypes();
        const refreshed = choreType(ct.key);
        renderQuickActionsSection(refreshed, entriesField);
        loadDashboard();
      } catch (err) {
        toast("Error: " + err.message);
      }
    });
  }
}

document.getElementById("add-chore-type-btn").addEventListener("click", () => openChoreTypeBuilder(null));
document.getElementById("ct-modal-close").addEventListener("click", closeChoreTypeModal);
document.getElementById("ct-modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "ct-modal-backdrop") closeChoreTypeModal();
});

// ---------- settings ----------

async function loadSettings() {
  await loadProfile();
  await loadChoreTypesManager();
  const list = document.getElementById("settings-list");
  list.innerHTML = "";
  state.choreTypes.forEach((ct) => {
    const row = document.createElement("div");
    row.className = "settings-row";
    row.innerHTML = `
      <div>${ct.icon} <strong>${t(ct.label)}</strong></div>
      <div class="row">
        ${
          ct.interval_configurable
            ? `<label>${t("Reminder")} <input type="number" min="0" class="interval-input" style="width:92px" value="${ct.interval_minutes ?? ""}"> ${t("min")}</label>`
            : ct.fixed_reminder_note
              ? `<span style="color:var(--muted)">${t(ct.fixed_reminder_note)}</span>`
              : `<span style="color:var(--muted)">${t("no reminder")}</span>`
        }
        ${
          ct.session_window_configurable
            ? `<label>${t("Session window")} <input type="number" min="0" class="session-window-input" style="width:92px" value="${ct.session_window_minutes ?? ""}"> ${t("min")}</label>`
            : ""
        }
        ${
          ct.interval_configurable || ct.session_window_configurable
            ? `<button class="btn secondary save-settings-btn">${t("Save")}</button>`
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
document.getElementById("stats-back-btn").addEventListener("click", showStatsOverview);

const langSwitcher = document.getElementById("lang-switcher");
langSwitcher.value = state.lang;
document.documentElement.lang = state.lang;
langSwitcher.addEventListener("change", (e) => setLang(e.target.value));
applyStaticTranslations();

// stats period (days) persists across visits, same as language
const statsDaysSelect = document.getElementById("stats-days");
const savedStatsDays = getCookie("bm_stats_days");
if (savedStatsDays && [...statsDaysSelect.options].some((o) => o.value === savedStatsDays)) {
  statsDaysSelect.value = savedStatsDays;
}
statsDaysSelect.addEventListener("change", () => setCookie("bm_stats_days", statsDaysSelect.value));

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
