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
    "Language": "Мова",
    "Dashboard": "Панель",
    "History": "Історія",
    "Stats": "Статистика",
    "Competition": "Змагання",
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
    "Person": "Особа",
    "Unassigned": "Не призначено",
    "People": "Люди",
    "Add person": "Додати людину",
    "This device belongs to": "Цей пристрій належить",
    "Their logged events stay, just unassigned.": "Записані події залишаться, просто без прив'язки.",
    "Events": "Подій",
    "Add people in Settings to compare stats.": "Додайте людей у Налаштуваннях, щоб порівнювати статистику.",
    "Edit exact time": "Змінити точний час",
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
    "Repeat every": "Повторювати кожні",
    "Reminder off": "Нагадування вимкнено",
    "Change the next reminder time": "Змінити час наступного нагадування",
    "Reminder time updated": "Час нагадування змінено",
    "Reminder reset to default": "Нагадування скинуто до стандартного",
    "Remind me in": "Нагадати через",
    "Or at a specific time": "Або в конкретний час",
    "Set time": "Встановити",
    "Reset to default": "Скинути до стандартного",
    // push notifications
    "Push notifications": "Push-сповіщення",
    "Push": "Push",
    "Enable on this device": "Увімкнути на цьому пристрої",
    "Enabled on this device": "Увімкнено на цьому пристрої",
    "Disable": "Вимкнути",
    "Send test": "Надіслати тест",
    "Test notification sent": "Тестове сповіщення надіслано",
    "Get a notification on this device when a reminder is due.": "Отримуйте сповіщення на цьому пристрої, коли настає час нагадування.",
    "Choose which chores notify this device in the list below.": "Оберіть у списку нижче, про які події сповіщати цей пристрій.",
    "Notifications were not allowed": "Сповіщення не дозволено",
    "Notifications are blocked for this site - allow them in your browser's site settings.": "Сповіщення для цього сайту заблоковано - дозвольте їх у налаштуваннях сайту в браузері.",
    "Push notifications need HTTPS (or localhost).": "Push-сповіщення потребують HTTPS (або localhost).",
    "On iPhone/iPad, add this app to your Home Screen first, then open it from there.": "На iPhone/iPad спочатку додайте застосунок на Початковий екран і відкрийте його звідти.",
    "This browser doesn't support push notifications.": "Цей браузер не підтримує push-сповіщення.",
    // stats: controls, charts, healthy ranges, forecast
    "Period": "Період",
    "Forecast": "Прогноз",
    "Actual": "Фактично",
    "today": "сьогодні",
    "Today": "Сьогодні",
    "Yesterday": "Вчора",
    "as of": "станом на",
    "so far": "поки що",
    "no data": "немає даних",
    "Healthy": "Норма",
    "Healthy range": "Норма",
    "Outside range": "Поза нормою",
    "Today (so far)": "Сьогодні (поки що)",
    "In range": "У нормі",
    "Below range": "Нижче норми",
    "Above range": "Вище норми",
    "Feeds per day": "Годувань на день",
    "Tap a day for details": "Торкніться дня, щоб побачити деталі",
    "At a glance": "Коротко",
    "WHO percentile": "Перцентиль ВООЗ",
    "avg per day, last {n} days": "середнє за день, останні {n} дн.",
    "{k} of {m} days in range": "{k} з {m} днів у нормі",
    "Healthy ranges ahead": "Норма на майбутнє",
    "Forecast: per-day metrics assume the last 7 days continue; weight and height keep tracking the same WHO growth percentile. Healthy ranges are the guidance for the baby's age on each date.": "Прогноз: для показників за день припускаємо, що останні 7 днів триватимуть; вага й зріст залишаються на тому ж перцентилі росту ВООЗ. Норма - це орієнтир для віку малюка на кожну дату.",
    "Set the baby's birth date in Settings to see healthy ranges and forecasts.": "Вкажіть дату народження малюка в Налаштуваннях, щоб бачити норму та прогнози.",
    "Set the baby's birth date in Settings to compare with healthy ranges and see forecasts.": "Вкажіть дату народження малюка в Налаштуваннях, щоб порівнювати з нормою та бачити прогнози.",
    "Set the baby's sex in Settings for a tighter growth range and the exact WHO percentile.": "Вкажіть стать малюка в Налаштуваннях для точнішої норми росту та перцентиля ВООЗ.",
    "Sex": "Стать",
    "Not specified": "Не вказано",
    "Girl": "Дівчинка",
    "Boy": "Хлопчик",
    "Picks the exact WHO growth curves; if not set, the healthy range spans both.": "Обирає точні криві росту ВООЗ; якщо не вказано, норма охоплює обидві.",
    "Feeding calculator": "Калькулятор годування",
    "Set a birth date in Settings to use the calculator, or enter an age below.": "Вкажіть дату народження в Налаштуваннях або введіть вік нижче.",
    "Age (days)": "Вік (днів)",
    "Weight (g)": "Вага (г)",
    "Calculate": "Розрахувати",
    "Recalculate": "Перерахувати",
    "per feed": "за годування",
    "per day": "за день",
    "feeds/day": "годувань/день",
    "suggested interval": "рекомендований інтервал",
    "Formula (weight-based rule)": "Суміш (правило за вагою)",
    "day": "день",
    "feed": "годування",
    "Sources:": "Джерела:",
    "General guidance only, not medical advice - every baby is different.": "Лише загальна інформація, не медична консультація - кожна дитина різна.",
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
// Short generic words used only as UI labels (never part of a composed
// server-side summary). Left out of tSummary()'s substring swap so they
// can't mangle unrelated text that happens to contain them.
const I18N_NO_SUMMARY = new Set([
  "Period", "Forecast", "Actual", "Healthy", "so far", "no data", "today", "Today", "Yesterday",
  "days", "Sex", "Boy", "Girl", "as of", "Latest", "day", "feed", "per feed", "per day", "feeds/day",
  "Calculate", "Recalculate", "Sources:", "Healthy range", "At a glance",
]);
const I18N_SUMMARY_KEYS = {};
for (const lang of Object.keys(I18N)) {
  I18N_SUMMARY_KEYS[lang] = Object.keys(I18N[lang])
    .filter((k) => !I18N_NO_SUMMARY.has(k))
    .sort((a, b) => b.length - a.length);
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
  syncPushLang();
  loadDashboard();
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "history") loadHistory();
  if (activeTab === "settings") loadSettings();
  if (activeTab === "competition") loadCompetition();
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
  people: [],
  push: null, // this device's push status, see loadPushState()
  // Stats page selection; period/forecast persist in cookies. Validated in init.
  stats: { key: null, days: getCookie("bm_stats_days") || "90", forecast: getCookie("bm_stats_forecast") || "0" },
};

// This device's default person (cookie, not server-side - each device/
// browser remembers who's usually logging from it). null = unassigned.
function currentPersonId() {
  const raw = getCookie("bm_person_id");
  return raw ? Number(raw) : null;
}

function setCurrentPersonId(id) {
  if (id == null || id === "") setCookie("bm_person_id", "");
  else setCookie("bm_person_id", String(id));
}

function personName(id) {
  const p = state.people.find((p) => p.id === id);
  return p ? p.name : null;
}

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
      if (btn.dataset.tab === "competition") loadCompetition();
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
  const u = state.lang === "uk" ? { d: "д", w: "тиж", mo: "міс" } : { d: "d", w: "w", mo: "mo" };
  if (days < 0) return `due in ${Math.abs(days)}${u.d}`;
  if (days < 14) return `${days}${u.d}`;
  if (days < 70) {
    const w = Math.floor(days / 7);
    const d = days % 7;
    return d ? `${w}${u.w} ${d}${u.d}` : `${w}${u.w}`;
  }
  const months = days / 30.44;
  return `${months.toFixed(months < 10 ? 1 : 0)}${u.mo}`;
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
    const hasReminder = s.interval_minutes != null || (ct && ct.daily_reminder);
    if (!s.reminder_enabled) {
      // switched off in Settings - say so (only for chores that have a
      // reminder to switch off), rather than silently showing nothing
      if (hasReminder) {
        dueText = `🔕 ${t("Reminder off")}`;
        dueClass = "off";
      }
    } else if (ct && ct.daily_reminder && s.last_event && !s.next_due_overridden) {
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
    if (s.next_due_overridden && s.reminder_enabled) dueText += " ✎";
    // "Set alarm" - only for a real future due time (a plain interval-based
    // reminder, not the daily-reset kind, and not already overdue - there's
    // nothing to count down to at that point).
    const showAlarm = s.next_due && !s.overdue && !(ct && ct.daily_reminder && !s.next_due_overridden);
    // "Change next time" - whenever there's a live reminder to adjust
    const showEditDue = s.reminder_enabled && hasReminder;
    const dueHtml = dueText
      ? `<div class="due ${dueClass}">
          <span>${dueText}</span>
          <span class="due-btns">
            ${showEditDue ? `<button type="button" class="alarm-btn" data-action="edit-due" title="${t("Change the next reminder time")}">⏱</button>` : ""}
            ${showAlarm ? `<button type="button" class="alarm-btn" data-action="alarm" title="${t("Add a calendar alarm for this")}">🔔</button>` : ""}
          </span>
        </div>`
      : "";

    let buttonsHtml;
    let targetEventId = null;
    if (ct && ct.has_start_end) {
      // Primary button is instant (no popup) since start/end almost always
      // just means "right now"; the "+" opens the modal for a specific
      // time instead (e.g. logging a nap that already happened).
      if (s.open_event_id) {
        targetEventId = s.open_event_id;
        buttonsHtml = `<div class="quick-actions-row">
            <button class="quick-btn end-btn" data-action="quick-end">⏰ ${t("End")} ${t(ct.label)}</button>
            <button class="icon-btn more-btn" data-action="end" title="${t("Edit exact time")}">+</button>
          </div>`;
      } else {
        buttonsHtml = `<div class="quick-actions-row">
            <button class="quick-btn" data-action="quick-start">${ct.icon} ${t("Start")} ${t(ct.label)}</button>
            <button class="icon-btn more-btn" data-action="start" title="${t("Edit exact time")}">+</button>
          </div>`;
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
        } else if (btn.dataset.action === "edit-due") {
          openDueModal(s);
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
        if (qa.mode === "increment" || qa.mode === "absolute" || qa.mode === "log") {
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

// ---------- change next reminder time ----------
//
// A one-off override for the current cycle (e.g. a longer gap after a night
// feed) - it reverts to the normal interval as soon as the next event is
// logged. The server just stores an absolute instant.

function closeDueModal() {
  document.getElementById("due-modal-backdrop").classList.add("hidden");
}

async function setNextDue(key, date) {
  try {
    await api(`/api/chore-types/${key}/next-due`, {
      method: "PUT",
      body: JSON.stringify({ due_at: date ? date.toISOString() : null }),
    });
  } catch (err) {
    toast(t("Error: ") + err.message);
    return;
  }
  closeDueModal();
  toast(date ? "Reminder time updated" : "Reminder reset to default");
  loadDashboard();
}

function openDueModal(s) {
  document.getElementById("due-modal-title").textContent = `${s.icon} ${t(s.label)}`;
  const presets = [30, 60, 120, 180, 240];
  const presetLabel = (m) => (m < 60 ? `${m}${t("min")}` : `${m / 60}h`);
  const current = s.next_due
    ? `${t(s.overdue ? "Overdue by" : "Next")} ${fmtRelative(s.next_due, "in", true)} (${fmtClockTime(s.next_due)})`
    : "";
  const body = document.getElementById("due-modal-body");
  body.innerHTML = `
    ${current ? `<div class="due-current">${current}</div>` : ""}
    <div class="field">
      <label>${t("Remind me in")}</label>
      <div class="preset-row">
        ${presets.map((m) => `<button type="button" class="btn secondary" data-min="${m}">${presetLabel(m)}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label>${t("Or at a specific time")}</label>
      <div class="row">
        <input type="time" id="due-time" style="flex:1 1 120px">
        <button type="button" class="btn" id="due-time-set">${t("Set time")}</button>
      </div>
    </div>
    ${s.next_due_overridden ? `<button type="button" class="btn secondary" id="due-reset" style="width:100%">${t("Reset to default")}</button>` : ""}
  `;
  const timeInput = body.querySelector("#due-time");
  if (s.next_due) timeInput.value = fmtClockTime24(new Date(s.next_due));
  body.querySelectorAll("[data-min]").forEach((btn) =>
    btn.addEventListener("click", () => setNextDue(s.chore_type, new Date(Date.now() + Number(btn.dataset.min) * 60000)))
  );
  body.querySelector("#due-time-set").addEventListener("click", () => {
    if (!timeInput.value) return;
    const [hh, mm] = timeInput.value.split(":").map(Number);
    const at = new Date();
    at.setHours(hh, mm, 0, 0);
    if (at <= new Date()) at.setDate(at.getDate() + 1); // that time already passed today -> tomorrow
    setNextDue(s.chore_type, at);
  });
  const reset = body.querySelector("#due-reset");
  if (reset) reset.addEventListener("click", () => setNextDue(s.chore_type, null));
  document.getElementById("due-modal-backdrop").classList.remove("hidden");
}

// "HH:MM" in 24h, as <input type="time"> requires (fmtClockTime is locale-formatted)
function fmtClockTime24(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

document.getElementById("due-modal-close").addEventListener("click", closeDueModal);
document.getElementById("due-modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "due-modal-backdrop") closeDueModal();
});

async function handleCardAction(choreTypeKey, action, targetEventId) {
  if (action === "quick-start") {
    await quickStart(choreTypeKey);
  } else if (action === "quick-end" && targetEventId) {
    await quickEnd(targetEventId);
  } else if ((action === "checkpoint" || action === "end") && targetEventId) {
    const event = await api(`/api/events/${targetEventId}`);
    openForm(choreTypeKey, action, event);
  } else if (action === "new" && targetEventId) {
    // targetEventId is only set here when there's a still-open session
    // (within the chore type's session window) - starting a genuinely new
    // one right on top of it is usually a mis-tap, so confirm first.
    const ct = choreType(choreTypeKey);
    if (confirm(sessionConflictMessage(t(ct ? ct.label : choreTypeKey)))) {
      const event = await api(`/api/events/${targetEventId}`);
      openForm(choreTypeKey, "checkpoint", event);
    } else {
      openForm(choreTypeKey, "create");
    }
  } else {
    openForm(choreTypeKey, "create");
  }
}

function sessionConflictMessage(label) {
  if (state.lang === "uk") {
    return `Є нещодавній відкритий запис "${label}" - додати контрольну точку до нього замість нового запису?`;
  }
  return `There's already a recent "${label}" open - add a checkpoint to it instead of starting a new one?`;
}

async function editLastEntry(choreTypeKey, eventId) {
  const event = await api(`/api/events/${eventId}`);
  openForm(choreTypeKey, "edit", event);
}

async function logQuickAction(choreTypeKey, qa) {
  try {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({ chore_type: choreTypeKey, data: qa.data, person_id: currentPersonId() }),
    });
    toast(qa.label + " logged");
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

// Instant start/end for has_start_end types (sleep, ...) - no popup, since
// "right now" is almost always what's meant. The dashboard's "+" button is
// the escape hatch for a specific time via the regular modal instead.
async function quickStart(choreTypeKey) {
  try {
    await api("/api/events", {
      method: "POST",
      body: JSON.stringify({ chore_type: choreTypeKey, data: {}, person_id: currentPersonId() }),
    });
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

async function quickEnd(eventId) {
  try {
    const event = await api(`/api/events/${eventId}`);
    await api(`/api/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify({ data: { ...event.data, ended_at: new Date().toISOString() } }),
    });
    refreshCurrentView();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

// Configurable quick action targeting an `entries` field: "Formula +10ml"
// (mode: increment) or "Formula 100ml" (mode: absolute) apply to the last
// entry matching match_field/match_value within the currently open session
// (if any), or start a new one-entry event otherwise - so repeated taps
// build up the same checkpoint instead of creating one each. Mode "log"
// (e.g. feeding's Breast/Formula/Pumped buttons) is simpler: always just
// appends a fresh checkpoint stamped with match_field=match_value, no
// amount - the same "log now, fill in the rest later" pattern as anywhere
// else in the app, just one tap instead of opening the modal.
async function runFieldQuickAction(choreTypeKey, qa, status) {
  try {
    const sessionEventId = status.active_session_event_id || status.open_event_id;
    const event = sessionEventId ? await api(`/api/events/${sessionEventId}`) : null;
    const entries = event ? [...(event.data[qa.entries_field] || [])] : [];
    if (qa.mode === "log") {
      entries.push({ timestamp: new Date().toISOString(), [qa.match_field]: qa.match_value });
    } else {
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
    }
    // PUT replaces the whole `data` object, so merge onto the event's
    // existing data (e.g. a typed note) instead of dropping everything else.
    const data = { ...(event ? event.data : {}), [qa.entries_field]: entries };
    if (event) {
      await api(`/api/events/${event.id}`, { method: "PUT", body: JSON.stringify({ data }) });
    } else {
      await api("/api/events", {
        method: "POST",
        body: JSON.stringify({ chore_type: choreTypeKey, data, person_id: currentPersonId() }),
      });
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
  const personField = form.querySelector("#f_person");
  const person_id = personField && personField.value !== "" ? Number(personField.value) : null;
  return { timestamp, data, person_id };
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
  let html = `<div class="field">
      <label for="f_person">${t("Person")}</label>
      <select id="f_person" name="person_id">
        <option value="">${t("Unassigned")}</option>
        ${state.people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
      </select>
    </div>`;
  html += hasEntries
    ? ""
    : `<div class="field">
      <label for="f_timestamp">${t("Time")}</label>
      <input type="datetime-local" id="f_timestamp" name="timestamp" required>
    </div>`;
  html += editableFields.map((f) => buildFieldHtml(f, data[f.name])).join("");
  html += `<div class="form-actions">
      <button type="button" id="delete-btn" class="btn danger ${currentEventId ? "" : "hidden"}">${t("Delete")}</button>
      <span id="save-status" class="save-status"></span>
      <button type="button" id="save-btn" class="btn">${t("Save")}</button>
      <button type="button" id="close-modal-btn" class="btn secondary">${t("Close")}</button>
    </div>`;
  form.innerHTML = html;
  form.onsubmit = (e) => e.preventDefault(); // no submit button anymore, but Enter shouldn't reload the page

  const timestampInput = form.querySelector("#f_timestamp");
  if (timestampInput) timestampInput.value = toLocalInputValue(event ? event.timestamp : new Date());

  const personInput = form.querySelector("#f_person");
  const defaultPersonId = event && event.person_id != null ? event.person_id : currentPersonId();
  if (personInput && defaultPersonId != null) personInput.value = String(defaultPersonId);

  const delBtn = document.getElementById("delete-btn");

  // Every field change (blur-after-edit for text/number/date, immediate for
  // checkboxes/selects) already saves on its own - create on the first
  // change, then update in place. The Save button just forces an immediate
  // flush (e.g. of a field that hasn't blurred yet) for reassurance; Close
  // just dismisses the modal since nothing is ever left unsaved.
  //
  // The form is read (buildEventData) synchronously, right when the change
  // happens - not inside the deferred flush below. #modal-form is reused
  // (only its innerHTML is swapped) across modal opens, so by the time a
  // debounced flush actually runs, the user may already have closed this
  // modal and opened a different one; reading the form lazily at flush time
  // would then read the *other* modal's fields under this one's chore type.
  // Resolves to true/false (never rejects) so callers - e.g. the Save
  // button, which should only close the modal once the save actually
  // succeeded - can tell a failed save apart from a completed one.
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
        return true;
      } catch (err) {
        setSaveStatus("");
        toast("Error: " + err.message);
        return false;
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
  document.getElementById("save-btn").addEventListener("click", async () => {
    const ok = await saveNow();
    if (ok) closeModal();
  });
  if (delBtn) delBtn.addEventListener("click", () => deleteEvent(currentEventId));

  document.getElementById("modal-backdrop").classList.remove("hidden");
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
        <div><strong>${ct.icon} ${tSummary(ev.summary)}</strong>${ev.person_name ? ` <span class="person-pill">${ev.person_name}</span>` : ""}</div>
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

// ---------- stats: charts ----------
//
// One date-scaled line-chart engine for every metric. Charts are rendered at
// a fixed *native* pixel width - never squeezed to fit - so text stays legible
// however many days are plotted; a long period scrolls horizontally inside
// .chart-scroll, while the y-axis lives in its own SVG beside it so the
// scale stays visible while scrolling.
//
// Each point may carry the healthy range for that date (refMin/refMax/refMid),
// including days in the future, and a `forecast` series is drawn dashed.

const DAY_MS = 86400000;

function isoToMs(s) {
  return Date.parse(s + "T00:00:00Z");
}

function fmtShortDate(s) {
  return new Date(isoToMs(s)).toLocaleDateString(state.lang === "uk" ? "uk-UA" : undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

// "ok" | "low" | "high" | null (no range to judge against)
function rangeStatus(v, min, max) {
  if (v == null || min == null || max == null) return null;
  if (v < min) return "low";
  if (v > max) return "high";
  return "ok";
}

function statusText(status) {
  return status === "ok" ? t("In range") : status === "low" ? t("Below range") : status === "high" ? t("Above range") : "";
}

// How one metric is labeled/formatted. `name` is a numeric field name, or
// "count" for events per day. Durations (minutes) chart in hours.
function metricMeta(ct, name) {
  if (name === "count") {
    const label = ct && ct.key === "feeding" ? t("Feeds per day") : t("Events per day");
    return {
      name, label, unit: "", scale: 1, zeroBased: true, last: false,
      fmt: (v) => `${round1(v)}`,
      axisFmt: (v) => `${round1(v)}`,
      range: (a, b) => `${round1(a)}–${round1(b)}`,
    };
  }
  const f = ct && ct.fields.find((x) => x.name === name);
  const label = f ? t(f.label) : name.replace(/_/g, " ");
  const last = !!(f && f.stat_agg === "last");
  if (f && f.display === "duration") {
    return {
      name, label, unit: "h", scale: 60, zeroBased: true, last,
      fmt: (v) => fmtDurationMinutes(v),
      axisFmt: (v) => `${round1(v)}h`,
      range: (a, b) => `${fmtDurationMinutes(a)}–${fmtDurationMinutes(b)}`,
    };
  }
  const unit = (f && f.unit) || "";
  // whole numbers for ml/g - a decimal on "748.4ml" is false precision
  const n = unit === "ml" || unit === "g" ? Math.round : round1;
  return {
    name, label, unit, scale: 1, zeroBased: !last, last,
    fmt: (v) => `${n(v)}${unit}`,
    axisFmt: (v) => `${n(v)}`,
    range: (a, b) => `${n(a)}–${n(b)}${unit}`,
  };
}

// `hours` = the axis is in hours, where 1/2/3/4/6/12 read better than 2.5/5
function niceTicks(lo, hi, target = 4, hours = false) {
  const span = hi - lo || 1;
  const raw = span / target;
  let step;
  if (hours && raw >= 1) {
    step = [1, 2, 3, 4, 6, 12, 24].find((s) => s >= raw) || 24;
  } else {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  }
  const ticks = [];
  for (let k = Math.ceil(lo / step); k * step <= hi + 1e-9; k++) ticks.push(+(k * step).toFixed(6));
  return ticks;
}

// cfg: {title, meta, points:[{date,value,refMin,refMax,refMid,partial,future,age_days}],
//       forecast:[{date,value}], today, refSource:{source_label,source_url}|null, forecastOn}
// Returns a .chart-block element (or null if there is nothing to draw).
function buildChart(cfg) {
  const { meta, points, today } = cfg;
  const forecast = cfg.forecast || [];
  if (!points.length) return null;

  const vals = [];
  points.forEach((p) => {
    [p.value, p.refMin, p.refMax].forEach((v) => v != null && vals.push(v));
  });
  forecast.forEach((p) => vals.push(p.value));
  if (!vals.length) return null;

  const h = 220, padTop = 22, padBottom = 30, padLeft = 8, padRight = 18, axisW = 46;
  const plotH = h - padTop - padBottom;
  const sc = (v) => v / meta.scale;

  const allMs = points.map((p) => isoToMs(p.date)).concat(forecast.map((p) => isoToMs(p.date)));
  const minMs = Math.min(...allMs);
  const maxMs = Math.max(...allMs);
  const spanDays = Math.max(1, Math.round((maxMs - minMs) / DAY_MS));
  const nDays = spanDays + 1;
  const pxPerDay = nDays <= 14 ? 34 : nDays <= 45 ? 18 : nDays <= 100 ? 11 : nDays <= 200 ? 7 : 4;
  const plotW = Math.max(300, spanDays * pxPerDay);
  const w = plotW + padLeft + padRight;
  const xFor = (ds) => padLeft + ((isoToMs(ds) - minMs) / DAY_MS / spanDays) * plotW;

  let lo = Math.min(...vals.map(sc));
  let hi = Math.max(...vals.map(sc));
  if (meta.zeroBased) lo = 0;
  const pad = (hi - lo) * 0.08 || 1;
  if (!meta.zeroBased) lo -= pad;
  hi += pad;
  const yS = (sv) => padTop + plotH - ((sv - lo) / (hi - lo)) * plotH;
  const yFor = (v) => yS(sc(v));
  const ticks = niceTicks(lo, hi, 4, meta.scale === 60);

  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const linePath = (list, val) => list.map((p, i) => `${i ? "L" : "M"}${P(xFor(p.date), yFor(val(p)))}`).join(" ");

  // --- healthy band: contiguous runs of days that have a range ---
  const runs = [];
  let cur = [];
  points.forEach((p) => {
    if (p.refMin != null && p.refMax != null) cur.push(p);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  });
  if (cur.length) runs.push(cur);
  let band = "";
  runs.forEach((run) => {
    if (run.length === 1) {
      const x = xFor(run[0].date);
      const y1 = yFor(run[0].refMax);
      band += `<rect x="${(x - 6).toFixed(1)}" y="${y1.toFixed(1)}" width="12" height="${(yFor(run[0].refMin) - y1).toFixed(1)}" fill="var(--ok)" opacity="0.2"></rect>`;
      return;
    }
    const top = linePath(run, (p) => p.refMax);
    const bottomPts = [...run].reverse();
    const bottom = linePath(bottomPts, (p) => p.refMin);
    band += `<path d="${top} L${bottom.slice(1)} Z" fill="var(--ok)" opacity="0.16"></path>`;
    band += `<path d="${top}" fill="none" stroke="var(--ok)" stroke-width="1" opacity="0.6"></path>`;
    band += `<path d="${bottom}" fill="none" stroke="var(--ok)" stroke-width="1" opacity="0.6"></path>`;
    const mids = run.filter((p) => p.refMid != null);
    if (mids.length > 1) {
      band += `<path d="${linePath(mids, (p) => p.refMid)}" fill="none" stroke="var(--ok)" stroke-width="1" stroke-dasharray="2 4" opacity="0.7"></path>`;
    }
  });

  // --- grid ---
  let grid = "";
  ticks.forEach((tv) => {
    grid += `<line x1="0" x2="${w}" y1="${yS(tv).toFixed(1)}" y2="${yS(tv).toFixed(1)}" stroke="currentColor" opacity="0.09"></line>`;
  });

  // --- future region + today marker ---
  const hasFuture = points.some((p) => p.future);
  const todayMs = today ? isoToMs(today) : null;
  const todayInRange = todayMs != null && todayMs >= minMs && todayMs <= maxMs;
  let marker = "";
  if (todayInRange) {
    const tx = xFor(today);
    if (hasFuture) {
      marker += `<rect x="${tx.toFixed(1)}" y="${padTop}" width="${(w - tx).toFixed(1)}" height="${plotH}" fill="currentColor" opacity="0.05"></rect>`;
      marker += `<text x="${(tx + 5).toFixed(1)}" y="${padTop - 8}" font-size="9.5" fill="currentColor" opacity="0.7">${t("Forecast")} →</text>`;
    }
    marker += `<line x1="${tx.toFixed(1)}" x2="${tx.toFixed(1)}" y1="${padTop}" y2="${h - padBottom}" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" opacity="0.4"></line>`;
    marker += `<text x="${(tx - 4).toFixed(1)}" y="${padTop - 8}" font-size="9.5" text-anchor="end" fill="currentColor" opacity="0.7">${t("today")}</text>`;
  }

  // --- actual values ---
  const actual = points.filter((p) => p.value != null && !p.partial && !p.future);
  const partial = points.filter((p) => p.value != null && p.partial);
  let actualSvg = "";
  if (actual.length) {
    actualSvg += `<path d="${linePath(actual, (p) => p.value)}" fill="none" stroke="var(--primary)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"></path>`;
  }
  if (partial.length && actual.length) {
    actualSvg += `<path d="${linePath([actual[actual.length - 1], partial[0]], (p) => p.value)}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.7"></path>`;
  }
  let outliers = 0;
  const showDots = actual.length <= 60;
  // label every point only when there is room for the text; otherwise just
  // the ends (the readout below shows any day's exact value on hover/tap)
  const labelLen = actual.length ? meta.fmt(actual[0].value).length : 0;
  const labelAll = actual.length <= 8 || (labelLen <= 3 && pxPerDay >= 18 && actual.length <= 20);
  actual.forEach((p, i) => {
    const isEnd = i === 0 || i === actual.length - 1;
    const st = rangeStatus(p.value, p.refMin, p.refMax);
    const out = st === "low" || st === "high";
    if (out) outliers++;
    const x = xFor(p.date);
    const y = yFor(p.value);
    if (showDots || isEnd || out) {
      actualSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${out ? "var(--warn)" : "var(--primary)"}" stroke="var(--surface)" stroke-width="1"></circle>`;
    }
    if (labelAll || isEnd) {
      const anchor = i === 0 && actual.length > 1 ? "start" : i === actual.length - 1 && actual.length > 1 ? "end" : "middle";
      actualSvg += `<text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" font-size="10" text-anchor="${anchor}" fill="currentColor" font-weight="${i === actual.length - 1 ? 600 : 400}">${meta.fmt(p.value)}</text>`;
    }
  });
  partial.forEach((p) => {
    actualSvg += `<circle cx="${xFor(p.date).toFixed(1)}" cy="${yFor(p.value).toFixed(1)}" r="3.6" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.8"></circle>`;
  });

  // --- forecast ---
  let forecastSvg = "";
  if (forecast.length) {
    forecastSvg += `<path d="${linePath(forecast, (p) => p.value)}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-dasharray="6 5" opacity="0.75" stroke-linecap="round"></path>`;
    const end = forecast[forecast.length - 1];
    const ex = xFor(end.date);
    const ey = yFor(end.value);
    forecastSvg += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.4" fill="var(--surface)" stroke="var(--primary)" stroke-width="1.6"></circle>`;
    forecastSvg += `<text x="${ex.toFixed(1)}" y="${(ey - 9).toFixed(1)}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.85">${meta.fmt(end.value)}</text>`;
  }

  // --- x-axis labels ---
  const tickN = Math.max(2, Math.min(14, Math.floor(plotW / 78)));
  let xLabels = "";
  for (let i = 0; i <= tickN; i++) {
    const ds = new Date(minMs + Math.round((spanDays * i) / tickN) * DAY_MS).toISOString().slice(0, 10);
    const anchor = i === 0 ? "start" : i === tickN ? "end" : "middle";
    xLabels += `<text x="${xFor(ds).toFixed(1)}" y="${h - 9}" font-size="9.5" text-anchor="${anchor}" fill="currentColor" opacity="0.65">${fmtShortDate(ds)}</text>`;
  }

  // --- hit targets (hover on desktop, tap on phones) ---
  const half = Math.max(7, plotW / spanDays / 2);
  const hits = points
    .map((p, i) => `<rect class="hit" data-i="${i}" x="${(xFor(p.date) - half).toFixed(1)}" y="${padTop}" width="${(half * 2).toFixed(1)}" height="${plotH}" fill="transparent"></rect>`)
    .join("");

  const axisSvg = `<svg class="chart-axis" width="${axisW}" height="${h}" viewBox="0 0 ${axisW} ${h}">${ticks
    .map((tv) => `<text x="${axisW - 6}" y="${(yS(tv) + 3.5).toFixed(1)}" text-anchor="end" font-size="9.5" fill="currentColor" opacity="0.65">${meta.axisFmt(tv)}</text>`)
    .join("")}</svg>`;
  const plotSvg = `<svg class="chart-plot" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${grid}${marker}${band}${forecastSvg}${actualSvg}${xLabels}<line class="cursor" y1="${padTop}" y2="${h - padBottom}" stroke="currentColor" stroke-width="1" opacity="0.5" style="display:none"></line>${hits}</svg>`;

  const legendBits = [`<span><i class="dot" style="background:var(--primary)"></i>${t("Actual")}</span>`];
  if (runs.length) legendBits.push(`<span><i class="dot band"></i>${t("Healthy range")}</span>`);
  if (forecast.length) legendBits.push(`<span><i class="dash"></i>${t("Forecast")}</span>`);
  if (partial.length) legendBits.push(`<span><i class="dot hollow"></i>${t("Today (so far)")}</span>`);
  if (outliers) legendBits.push(`<span><i class="dot" style="background:var(--warn)"></i>${t("Outside range")}</span>`);

  const src = cfg.refSource;
  const footer = src
    ? `<div class="chart-ref-note">${t("Healthy range")}: <a href="${src.source_url}" target="_blank" rel="noopener">${src.source_label}</a>. ${t("General guidance only, not medical advice.")}</div>`
    : "";

  const el = document.createElement("div");
  el.className = "chart-block";
  el.innerHTML = `
    <h3>${cfg.title || meta.label}${meta.unit ? ` <span class="chart-unit">${meta.unit}</span>` : ""}</h3>
    <div class="chart-wrap">${axisSvg}<div class="chart-scroll">${plotSvg}</div></div>
    <div class="chart-readout"></div>
    <div class="chart-legend">${legendBits.join("")}</div>
    ${footer}`;

  // --- interaction: a readout for the hovered/tapped day ---
  const readout = el.querySelector(".chart-readout");
  const cursor = el.querySelector(".cursor");
  const fcByDate = Object.fromEntries(forecast.map((p) => [p.date, p.value]));
  const show = (i) => {
    const p = points[i];
    const bits = [`<strong>${fmtShortDate(p.date)}</strong>`];
    if (p.age_days != null) bits.push(fmtAge(p.age_days));
    if (p.value != null) {
      const st = p.partial ? null : rangeStatus(p.value, p.refMin, p.refMax);
      bits.push(`<span class="ro-val ${st || ""}">${meta.fmt(p.value)}${p.partial ? ` (${t("so far")})` : ""}</span>`);
    } else if (fcByDate[p.date] != null) {
      const st = rangeStatus(fcByDate[p.date], p.refMin, p.refMax);
      bits.push(`${t("Forecast")}: <span class="ro-val ${st || ""}">${meta.fmt(fcByDate[p.date])}</span>`);
    } else if (!p.future) {
      bits.push(`<span class="muted">${t("no data")}</span>`);
    }
    if (p.refMin != null) bits.push(`${t("Healthy")}: ${meta.range(p.refMin, p.refMax)}`);
    readout.innerHTML = bits.join(" · ");
    const x = xFor(p.date);
    cursor.setAttribute("x1", x.toFixed(1));
    cursor.setAttribute("x2", x.toFixed(1));
    cursor.style.display = "";
  };
  el.querySelectorAll(".hit").forEach((r) => {
    r.addEventListener("mouseenter", () => show(Number(r.dataset.i)));
    r.addEventListener("click", () => show(Number(r.dataset.i)));
  });
  let initial = -1;
  points.forEach((p, i) => {
    if (p.value != null) initial = i;
  });
  if (initial >= 0) show(initial);
  else readout.innerHTML = `<span class="muted">${t("Tap a day for details")}</span>`;

  // start scrolled to the interesting part: recent data, or today with the
  // forecast stretching off to the right
  const scroller = el.querySelector(".chart-scroll");
  requestAnimationFrame(() => {
    if (hasFuture && todayInRange) scroller.scrollLeft = Math.max(0, xFor(today) - scroller.clientWidth * 0.5);
    else scroller.scrollLeft = scroller.scrollWidth;
  });
  return el;
}

// ---------- stats: at-a-glance overview ----------

// points: [{value, refMin, refMax}] in day order (evenly spaced)
function svgSparkline(points, color, zeroBased = true) {
  const actual = points.map((p) => p.value).filter((v) => v != null);
  if (!actual.length) return `<div class="sparkline-empty">${t("No data yet")}</div>`;
  const all = points.flatMap((p) => [p.value, p.refMin, p.refMax]).filter((v) => v != null);
  const w = 160;
  const h = 40;
  let min = Math.min(...all);
  const max = Math.max(...all, 1);
  if (zeroBased) min = Math.min(min, 0);
  const range = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const yFor = (v) => h - ((v - min) / range) * (h - 6) - 3;

  const bandPts = points.map((p, i) => ({ x: i * step, lo: p.refMin, hi: p.refMax })).filter((b) => b.lo != null && b.hi != null);
  let band = "";
  if (bandPts.length > 1) {
    const top = bandPts.map((b, i) => `${i ? "L" : "M"}${b.x.toFixed(1)},${yFor(b.hi).toFixed(1)}`).join(" ");
    const bottom = [...bandPts].reverse().map((b) => `L${b.x.toFixed(1)},${yFor(b.lo).toFixed(1)}`).join(" ");
    band = `<path d="${top} ${bottom} Z" fill="var(--ok)" opacity="0.18"></path>`;
  }
  const coords = points.map((p, i) => ({ x: i * step, y: p.value == null ? null : yFor(p.value) })).filter((c) => c.y != null);
  const path = coords.map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
      ${band}
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"></path>
      <circle cx="${last.x}" cy="${last.y}" r="2.5" fill="${color}"></circle>
    </svg>`;
}

// ---------- competition (per-person stats) ----------

async function loadCompetition() {
  const box = document.getElementById("competition-content");
  box.innerHTML = `<p class="muted-note">${t("Loading…")}</p>`;
  const days = document.getElementById("competition-days").value;
  const query = days === "all" ? "all_time=true" : `days=${days}`;
  const data = await api(`/api/competition?${query}`);

  if (!data.people.length) {
    box.innerHTML = `<p class="muted-note">${t("Add people in Settings to compare stats.")}</p>`;
    return;
  }
  if (!data.chore_types.length) {
    box.innerHTML = `<p class="muted-note">${t("No data for this period.")}</p>`;
    return;
  }

  const peopleById = {};
  data.people.forEach((p) => (peopleById[p.id] = p));
  const bucketLabel = (bucket) => (bucket === "unassigned" ? t("Unassigned") : peopleById[bucket]?.name || bucket);

  // one ranked bar-row per bucket (person or "unassigned"), sorted highest
  // first, zero entries dropped entirely - nothing to compete over there
  function metricHtml(label, unit, valuesByBucket) {
    const entries = Object.entries(valuesByBucket).filter(([, v]) => v);
    if (!entries.length) return "";
    entries.sort((a, b) => b[1] - a[1]);
    const max = entries[0][1];
    const rows = entries
      .map(([bucket, val], i) => {
        const display = Number.isInteger(val) ? val : Math.round(val * 10) / 10;
        return `<div class="comp-row">
            <span class="comp-name">${i === 0 ? "🏆 " : ""}${bucketLabel(bucket)}</span>
            <div class="comp-bar-track"><div class="comp-bar" style="width:${(val / max) * 100}%"></div></div>
            <span class="comp-val">${display}${unit || ""}</span>
          </div>`;
      })
      .join("");
    return `<div class="comp-metric"><div class="comp-metric-label">${label}</div>${rows}</div>`;
  }

  box.innerHTML = data.chore_types
    .map((ct) => {
      const countsHtml = metricHtml(t("Events"), "", ct.counts);
      const fieldsHtml = ct.fields
        .map((f) =>
          metricHtml(
            t(f.label),
            f.unit || "",
            Object.fromEntries(Object.entries(ct.totals).map(([bucket, vals]) => [bucket, vals[f.name] || 0]))
          )
        )
        .join("");
      return `<div class="comp-card">
          <div class="comp-card-head">${ct.icon} ${t(ct.label)}</div>
          ${countsHtml}
          ${fieldsHtml}
        </div>`;
    })
    .join("");
}

// ---------- stats: overview + detail ----------

// Period / forecast choices. Short chip text is language-specific inline (not
// in the I18N dictionary) so these tiny abbreviations can't collide with the
// substring-based summary translation.
const STATS_PERIODS = [
  { v: "1", en: "24h", uk: "24 год" },
  { v: "7", en: "7d", uk: "7 д" },
  { v: "14", en: "14d", uk: "14 д" },
  { v: "30", en: "30d", uk: "30 д" },
  { v: "90", en: "90d", uk: "90 д" },
  { v: "365", en: "1y", uk: "1 р" },
  { v: "all", en: "All", uk: "Все" },
];
const STATS_FORECASTS = [
  { v: "0", en: "Off", uk: "Вимк" },
  { v: "7", en: "+1w", uk: "+1 тиж" },
  { v: "14", en: "+2w", uk: "+2 тиж" },
  { v: "30", en: "+1m", uk: "+1 міс" },
  { v: "90", en: "+3m", uk: "+3 міс" },
  { v: "180", en: "+6m", uk: "+6 міс" },
  { v: "365", en: "+1y", uk: "+1 р" },
];

function chipLabel(chip) {
  return state.lang === "uk" ? chip.uk : chip.en;
}

function renderChips(container, chips, current, onPick) {
  container.innerHTML = chips
    .map((c) => `<button type="button" class="chip ${String(c.v) === String(current) ? "active" : ""}" data-v="${c.v}">${c.html || chipLabel(c)}</button>`)
    .join("");
  container.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => onPick(b.dataset.v)));
}

// What the overview cards and the "at a glance" block need to know about one
// metric: for per-day metrics the last full day and the recent average, for
// point-in-time readings (weight/height) the latest reading - each judged
// against the healthy range for that date.
function metricSummary(data, name, meta) {
  const days = data.days;
  const refOf = (d) =>
    d && d[`${name}_ref_min`] != null
      ? { min: d[`${name}_ref_min`], max: d[`${name}_ref_max`], mid: d[`${name}_ref_mid`] }
      : null;

  if (meta.last) {
    const latest = data.latest && data.latest[name];
    if (!latest) return null;
    const ref = refOf(days.find((d) => d.date === latest.date));
    return {
      kind: "last",
      value: latest.value,
      date: latest.date,
      ref,
      status: ref ? rangeStatus(latest.value, ref.min, ref.max) : null,
      percentile: latest.percentile,
    };
  }

  // only full days from the first logged event on - today is unfinished and
  // days before tracking began aren't "zero", they're just not recorded
  const done = days.filter((d) => !d.future && !d.partial);
  const firstIdx = done.findIndex((d) => d.count > 0);
  const seen = firstIdx < 0 ? [] : done.slice(firstIdx);
  const valued = seen.filter((d) => (name === "count" ? true : d[name] != null));
  if (!valued.length) return null;
  const value = (d) => (name === "count" ? d.count : d[name]);

  const recent = valued.slice(-7);
  const avg = recent.reduce((s, d) => s + value(d), 0) / recent.length;
  const lastDay = valued[valued.length - 1];
  const ref = refOf(lastDay);
  const withRef = recent.filter((d) => refOf(d));
  const inRange = withRef.filter((d) => {
    const r = refOf(d);
    return rangeStatus(value(d), r.min, r.max) === "ok";
  }).length;
  return {
    kind: "avg",
    avg,
    n: recent.length,
    lastDay: { date: lastDay.date, value: value(lastDay) },
    ref,
    status: ref ? rangeStatus(avg, ref.min, ref.max) : null,
    dayStatus: ref ? rangeStatus(value(lastDay), ref.min, ref.max) : null,
    inRange,
    of: withRef.length,
  };
}

function metricNames(ct, data) {
  const hasLast = data.numeric_fields.some((n) => metricMeta(ct, n).last);
  // "events per day" is noise for a weigh-in / measurement log
  return hasLast ? [...data.numeric_fields] : ["count", ...data.numeric_fields];
}

function hasRef(data, name) {
  return data.days.some((d) => d[`${name}_ref_min`] != null);
}

function flagGlyph(status) {
  return status === "ok" ? "✓" : status === "low" ? "▼" : status === "high" ? "▲" : "";
}

// ----- overview -----

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
    state.choreTypes.map((ct) => {
      // weigh-ins are sparse, so show their whole history; everything else, the last month
      const hasLast = ct.fields.some((f) => f.numeric_stat && f.stat_agg === "last");
      return api(`/api/stats/${ct.key}?${hasLast ? "all_time=true" : "days=30"}`).catch(() => null);
    })
  );
  if (!state.choreTypes.length) {
    box.innerHTML = `<p class="muted-note">${t("No chore types yet.")}</p>`;
    return;
  }

  let html = "";
  if (results.some((d) => d && d.has_guidance && d.age_days == null)) {
    html += `<div class="stats-notice">${t("Set the baby's birth date in Settings to compare with healthy ranges and see forecasts.")}</div>`;
  }
  box.innerHTML = `${html}<div class="overview-grid"></div>`;
  const grid = box.querySelector(".overview-grid");

  state.choreTypes.forEach((ct, i) => {
    const data = results[i];
    const card = document.createElement("div");
    card.className = "overview-card";
    let body = `<div class="sparkline-empty">${t("No data yet")}</div>`;
    let badge = "";

    if (data && data.total_events > 0) {
      // metrics that have a healthy range come first; fall back to the first metric
      const names = metricNames(ct, data);
      const candidates = names.filter((n) => hasRef(data, n));
      const chosen = (candidates.length ? candidates : names.slice(0, 1))
        .map((n) => ({ name: n, meta: metricMeta(ct, n) }))
        .map((m) => ({ ...m, sum: metricSummary(data, m.name, m.meta) }))
        .filter((m) => m.sum)
        .slice(0, 3);

      if (chosen.length) {
        const first = chosen[0];
        const points = data.days
          // today is unfinished, so it would draw a misleading dip - except for
          // point-in-time readings, which aren't cumulative
          .filter((d) => !d.future && (first.meta.last || !d.partial))
          .map((d) => ({
            value: first.name === "count" ? d.count : d[first.name],
            refMin: d[`${first.name}_ref_min`],
            refMax: d[`${first.name}_ref_max`],
          }));
        const spark = svgSparkline(points, "var(--primary)", first.meta.zeroBased);
        const rows = chosen
          .map((m) => {
            const s = m.sum;
            const status = s.kind === "last" ? s.status : s.dayStatus;
            const val = s.kind === "last" ? s.value : s.lastDay.value;
            const when =
              s.kind === "last"
                ? fmtShortDate(s.date)
                : s.lastDay.date === addDaysIso(data.today, -1)
                  ? t("Yesterday")
                  : fmtShortDate(s.lastDay.date);
            const pct = s.kind === "last" && s.percentile != null ? ` <span class="ov-pct">P${Math.round(s.percentile)}</span>` : "";
            return `<div class="ov-row">
                <span class="ov-label">${m.meta.label}<span class="ov-when">${when}</span></span>
                <span class="ov-val">${m.meta.fmt(val)}${pct}</span>
                <span class="ov-flag ${status || ""}" title="${status ? statusText(status) : ""}">${flagGlyph(status)}</span>
              </div>
              ${s.ref ? `<div class="ov-range">${t("Healthy")}: ${m.meta.range(s.ref.min, s.ref.max)}</div>` : ""}`;
          })
          .join("");
        const statuses = chosen.map((m) => (m.sum.kind === "last" ? m.sum.status : m.sum.dayStatus)).filter(Boolean);
        if (statuses.length) {
          const bad = statuses.some((s) => s !== "ok");
          badge = `<span class="badge ${bad ? "warn" : "ok"}">${bad ? "⚠" : "✓"}</span>`;
        }
        body = `<div class="overview-spark">${spark}</div>${rows}`;
      } else {
        body = `<div class="sparkline-empty">${t("No data yet")}</div>`;
      }
    }
    card.innerHTML = `
      <div class="overview-card-head">
        <span class="overview-icon">${ct.icon}</span>
        <span class="overview-label">${t(ct.label)}</span>
        ${badge}
      </div>
      ${body}`;
    card.addEventListener("click", () => showStatsDetail(ct.key));
    grid.appendChild(card);
  });
}

function addDaysIso(ds, n) {
  return new Date(isoToMs(ds) + n * DAY_MS).toISOString().slice(0, 10);
}

// ----- detail -----

function renderStatsControls() {
  const s = state.stats;
  renderChips(
    document.getElementById("stats-type-chips"),
    state.choreTypes.map((ct) => ({ v: ct.key, html: `${ct.icon} ${t(ct.label)}` })),
    s.key,
    (v) => loadStats(v)
  );
  renderChips(document.getElementById("stats-period-chips"), STATS_PERIODS, s.days, (v) => {
    s.days = v;
    setCookie("bm_stats_days", v);
    loadStats();
  });
  renderChips(document.getElementById("stats-forecast-chips"), STATS_FORECASTS, s.forecast, (v) => {
    s.forecast = v;
    setCookie("bm_stats_forecast", v);
    loadStats();
  });
}

function insightCardHtml(m) {
  const s = m.sum;
  const status = s.status;
  let value;
  let sub;
  if (s.kind === "last") {
    value = m.meta.fmt(s.value);
    sub = `${t("as of")} ${fmtShortDate(s.date)}`;
  } else {
    value = m.meta.fmt(s.avg);
    sub = t("avg per day, last {n} days").replace("{n}", s.n);
  }
  const extra = [];
  if (s.ref) extra.push(`${t("Healthy")}: <strong>${m.meta.range(s.ref.min, s.ref.max)}</strong>`);
  if (s.kind === "last" && s.percentile != null) extra.push(`${t("WHO percentile")}: <strong>${Math.round(s.percentile)}</strong>`);
  if (s.kind === "avg" && s.of) extra.push(t("{k} of {m} days in range").replace("{k}", s.inRange).replace("{m}", s.of));
  return `<div class="insight ${status || ""}">
      <div class="insight-top"><span class="insight-label">${m.meta.label}</span>${status ? `<span class="badge ${status}">${flagGlyph(status)} ${statusText(status)}</span>` : ""}</div>
      <div class="insight-value">${value}</div>
      <div class="insight-sub">${sub}</div>
      ${extra.map((x) => `<div class="insight-extra">${x}</div>`).join("")}
    </div>`;
}

// Healthy ranges at a few dates ahead, next to where the forecast expects you to be
function aheadTableHtml(data, ct, metrics) {
  const fut = data.days.filter((d) => d.future);
  const todayEntry = data.days.find((d) => d.date === data.today);
  if (!fut.length || !todayEntry) return "";
  const horizon = fut.length;
  const offsets = [...new Set([Math.ceil(horizon / 4), Math.ceil(horizon / 2), Math.ceil((horizon * 3) / 4), horizon])].filter((k) => k >= 1);
  const cols = [{ head: t("Today"), entry: todayEntry }].concat(
    offsets.map((k) => ({
      head: k < 14 ? `+${k}${state.lang === "uk" ? " д" : "d"}` : k <= 56 ? `+${Math.round(k / 7)}${state.lang === "uk" ? " тиж" : "w"}` : `+${Math.round(k / 30.44)}${state.lang === "uk" ? " міс" : "mo"}`,
      entry: fut[k - 1],
    }))
  );
  const rows = metrics
    .filter((m) => cols.some((c) => c.entry[`${m.name}_ref_min`] != null))
    .map((m) => {
      const fc = Object.fromEntries(((data.forecast && data.forecast[m.name]) || []).map((p) => [p.date, p.value]));
      const cells = cols
        .map((c) => {
          const lo = c.entry[`${m.name}_ref_min`];
          const hi = c.entry[`${m.name}_ref_max`];
          if (lo == null) return `<td class="muted">–</td>`;
          const fv = fc[c.entry.date];
          const st = rangeStatus(fv, lo, hi);
          return `<td><div class="ah-range">${m.meta.range(lo, hi)}</div>${fv != null ? `<div class="ah-fc ${st || ""}">${t("Forecast")}: ${m.meta.fmt(fv)}</div>` : ""}</td>`;
        })
        .join("");
      return `<tr><th>${m.meta.label}</th>${cells}</tr>`;
    })
    .join("");
  if (!rows) return "";
  const head = cols
    .map((c) => `<th><div>${c.head}</div><div class="ah-date">${fmtShortDate(c.entry.date)}${c.entry.age_days != null ? ` · ${fmtAge(c.entry.age_days)}` : ""}</div></th>`)
    .join("");
  return `<div class="chart-block ahead">
      <h3>${t("Healthy ranges ahead")}</h3>
      <div class="ahead-wrap"><table class="ahead-table"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="chart-ref-note">${t("Forecast: per-day metrics assume the last 7 days continue; weight and height keep tracking the same WHO growth percentile. Healthy ranges are the guidance for the baby's age on each date.")}</div>
    </div>`;
}

async function loadStats(explicitKey) {
  const s = state.stats;
  if (explicitKey) s.key = explicitKey;
  if (!s.key || !choreType(s.key)) s.key = state.choreTypes[0]?.key;
  if (!s.key) return;
  renderStatsControls();

  const ct = choreType(s.key);
  const query = `${s.days === "all" ? "all_time=true" : `days=${s.days}`}&forecast_days=${s.forecast}`;
  const requestToken = (state.statsRequestToken = (state.statsRequestToken || 0) + 1);
  const notice = document.getElementById("stats-notice");
  const insights = document.getElementById("stats-insights");
  const ahead = document.getElementById("stats-ahead");
  const charts = document.getElementById("stats-charts");
  charts.innerHTML = `<p class="muted-note">${t("Loading…")}</p>`;

  const data = await api(`/api/stats/${s.key}?${query}`);
  if (requestToken !== state.statsRequestToken) return; // a newer request superseded this one

  // --- notices: what would unlock more information ---
  const notes = [];
  if (data.has_guidance && data.age_days == null) {
    notes.push(t("Set the baby's birth date in Settings to see healthy ranges and forecasts."));
  } else if (!data.sex && Object.keys(data.latest || {}).some((n) => hasRef(data, n))) {
    notes.push(t("Set the baby's sex in Settings for a tighter growth range and the exact WHO percentile."));
  }
  notice.innerHTML = notes.map((n) => `<div class="stats-notice">${n}</div>`).join("");

  const names = metricNames(ct, data);
  const metrics = names
    .map((n) => ({ name: n, meta: metricMeta(ct, n) }))
    .map((m) => ({ ...m, sum: metricSummary(data, m.name, m.meta), ref: hasRef(data, m.name) }));
  // metrics with a healthy range first - they're the informative ones
  metrics.sort((a, b) => Number(b.ref) - Number(a.ref));

  // --- at a glance ---
  const cards = metrics.filter((m) => m.sum && (m.ref || m.sum.kind === "avg")).map(insightCardHtml);
  const evLine = `<div class="insight-summary">${data.total_events} ${t("events")}${data.avg_interval_minutes ? ` · ${t("avg interval")} ${(data.avg_interval_minutes / 60).toFixed(1)}h` : ""}</div>`;
  insights.innerHTML = `${evLine}${cards.length ? `<div class="insight-grid">${cards.join("")}</div>` : ""}`;

  // --- healthy ranges ahead ---
  ahead.innerHTML = Number(s.forecast) > 0 ? aheadTableHtml(data, ct, metrics) : "";

  // --- charts ---
  charts.innerHTML = "";
  let drawn = 0;
  metrics.forEach((m) => {
    const points = data.days.map((d) => ({
      date: d.date,
      value: m.name === "count" ? d.count : d[m.name],
      refMin: d[`${m.name}_ref_min`],
      refMax: d[`${m.name}_ref_max`],
      refMid: d[`${m.name}_ref_mid`],
      partial: d.partial,
      future: d.future,
      age_days: d.age_days,
    }));
    const forecast = (data.forecast && data.forecast[m.name]) || [];
    // skip metrics with nothing to show (e.g. an all-empty optional field)
    // ("events per day" is all zeros when nothing was logged - not worth a chart)
    const hasValues = m.name === "count" ? data.total_events > 0 : points.some((p) => p.value != null);
    if (!hasValues && !points.some((p) => p.refMin != null) && !forecast.length) return;
    if (!hasValues && data.total_events === 0 && m.name === "count") return;
    const el = buildChart({
      meta: m.meta,
      points,
      forecast,
      today: data.today,
      refSource: data.references && data.references[m.name],
    });
    if (el) {
      charts.appendChild(el);
      drawn++;
    }
  });

  if (data.growth_rate && data.growth_rate.length) {
    const points = data.growth_rate.map((r) => ({ date: r.date, value: r.g_per_day, refMin: r.ref_min, refMax: r.ref_max }));
    const src = data.growth_rate.find((r) => r.ref_source_label);
    const meta = {
      name: "g_per_day", label: t("Weight gain (g/day, between weigh-ins)"), unit: "", scale: 1, zeroBased: false, last: false,
      fmt: (v) => `${round1(v)} g/day`,
      axisFmt: (v) => `${round1(v)}`,
      range: (a, b) => `${round1(a)}–${round1(b)} g/day`,
    };
    const el = buildChart({
      title: meta.label,
      meta,
      points,
      today: data.today,
      refSource: src ? { source_label: src.ref_source_label, source_url: src.ref_source_url } : null,
    });
    if (el) {
      charts.appendChild(el);
      drawn++;
    }
  }
  if (!drawn) charts.innerHTML = `<p class="muted-note">${t("No data for this period.")}</p>`;

  const calc = document.getElementById("calculator-box");
  if (s.key === "feeding") {
    loadFeedingCalculator();
    calc.classList.remove("hidden");
  } else {
    calc.classList.add("hidden");
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
    box.innerHTML = `<div class="chart-block"><h3>🍽️ ${t("Feeding calculator")}</h3><p style="color:var(--muted)">${t("Set a birth date in Settings to use the calculator, or enter an age below.")}</p>
      <div class="row"><label>${t("Age (days)")} <input type="number" min="0" id="calc-age" style="width:80px"></label>
      <button class="btn secondary" id="calc-recalc">${t("Calculate")}</button></div></div>`;
    document.getElementById("calc-recalc").addEventListener("click", () => {
      loadFeedingCalculator({ age_days: document.getElementById("calc-age").value });
    });
    return;
  }

  const formula = data.formula_weight_based;
  box.innerHTML = `
    <div class="chart-block">
      <h3>🍽️ ${t("Feeding calculator")}</h3>
      <div class="row calc-inputs">
        <label>${t("Age (days)")} <input type="number" min="0" id="calc-age" value="${data.age_days ?? ""}" style="width:80px"></label>
        <label>${t("Weight (g)")} <input type="number" min="0" id="calc-weight" value="${data.weight_g ?? ""}" style="width:90px"></label>
        <button class="btn secondary" id="calc-recalc">${t("Recalculate")}</button>
      </div>
      <div class="stats-summary">
        <div class="stat-box"><div class="num">${data.per_feed_ml.min}–${data.per_feed_ml.max}<span class="unit">ml</span></div><div class="lbl">${t("per feed")}</div></div>
        <div class="stat-box"><div class="num">${data.per_day_ml.min}–${data.per_day_ml.max}<span class="unit">ml</span></div><div class="lbl">${t("per day")}</div></div>
        <div class="stat-box"><div class="num">${data.feeds_per_day.min}–${data.feeds_per_day.max}</div><div class="lbl">${t("feeds/day")}</div></div>
        <div class="stat-box"><div class="num">${data.interval_hours.min}–${data.interval_hours.max}h</div><div class="lbl">${t("suggested interval")}</div></div>
      </div>
      ${
        formula
          ? `<div class="chart-ref-note">${t("Formula (weight-based rule)")}: ~${formula.per_day_ml}ml/${t("day")} (~${formula.per_feed_ml}ml/${t("feed")}) &middot; ${formula.basis}</div>`
          : ""
      }
      ${data.note ? `<div class="chart-ref-note">${data.note}</div>` : ""}
      <div class="chart-ref-note">${t("Sources:")} ${data.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(" &middot; ")}. ${t("General guidance only, not medical advice - every baby is different.")}</div>
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
        <label title="${t("Picks the exact WHO growth curves; if not set, the healthy range spans both.")}">${t("Sex")}
          <select id="profile-sex" style="width:130px">
            <option value="">${t("Not specified")}</option>
            <option value="girl" ${p.sex === "girl" ? "selected" : ""}>${t("Girl")}</option>
            <option value="boy" ${p.sex === "boy" ? "selected" : ""}>${t("Boy")}</option>
          </select>
        </label>
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
          sex: document.getElementById("profile-sex").value || null,
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

// ---------- people ----------

async function loadPeopleSettings() {
  const box = document.getElementById("people-manager");
  box.innerHTML = "";

  state.people.forEach((p) => {
    const row = document.createElement("div");
    row.className = "person-row";
    row.innerHTML = `
      <input type="text" class="person-name-input" value="${p.name}">
      <button type="button" class="icon-btn person-delete-btn" title="${t("Delete")}">🗑️</button>
    `;
    const input = row.querySelector(".person-name-input");
    input.addEventListener("change", async () => {
      const name = input.value.trim();
      if (!name) {
        input.value = p.name;
        return;
      }
      await api(`/api/people/${p.id}`, { method: "PUT", body: JSON.stringify({ name }) });
      await loadPeople();
    });
    row.querySelector(".person-delete-btn").addEventListener("click", async () => {
      if (!confirm(`${t("Delete")} "${p.name}"? ${t("Their logged events stay, just unassigned.")}`)) return;
      await api(`/api/people/${p.id}`, { method: "DELETE" });
      await loadPeople();
      loadPeopleSettings();
    });
    box.appendChild(row);
  });

  const addRow = document.createElement("div");
  addRow.className = "row";
  addRow.innerHTML = `
    <input type="text" id="new-person-name" placeholder="${t("Add person")}">
    <button type="button" class="btn secondary" id="add-person-btn">${t("+ Add")}</button>
  `;
  box.appendChild(addRow);
  const nameInput = document.getElementById("new-person-name");
  const addPerson = async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await api("/api/people", { method: "POST", body: JSON.stringify({ name }) });
    await loadPeople();
    loadPeopleSettings();
  };
  document.getElementById("add-person-btn").addEventListener("click", addPerson);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPerson();
    }
  });

  const deviceRow = document.createElement("div");
  deviceRow.className = "settings-row";
  deviceRow.innerHTML = `
    <div>${t("This device belongs to")}</div>
    <select id="device-person-select">
      <option value="">${t("Unassigned")}</option>
      ${state.people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
    </select>
  `;
  box.appendChild(deviceRow);
  const devSelect = deviceRow.querySelector("#device-person-select");
  const cur = currentPersonId();
  if (cur != null) devSelect.value = String(cur);
  devSelect.addEventListener("change", () => setCurrentPersonId(devSelect.value));
}

// ---------- push notifications ----------
//
// Subscription is per device/browser; the server keeps which chore types
// each device has muted. `state.push` mirrors the server's record for this
// device: {subscribed, muted_types, endpoint} (null until loaded).

function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Why push can't work here, as a user-facing hint (null if it can).
function pushUnsupportedReason() {
  if (pushSupported()) return null;
  if (!window.isSecureContext) return "Push notifications need HTTPS (or localhost).";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    return "On iPhone/iPad, add this app to your Home Screen first, then open it from there.";
  }
  return "This browser doesn't support push notifications.";
}

function urlB64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameBytes(a, b) {
  if (!a || a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  return x.every((v, i) => v === b[i]);
}

async function browserPushSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function registerPushWithServer(sub) {
  const json = sub.toJSON();
  const res = await api("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, lang: state.lang }),
  });
  state.push = { ...res, endpoint: json.endpoint };
}

// Reads this device's push status. If the browser is still subscribed but
// the server has forgotten it (e.g. the DB was reset), quietly re-register.
async function loadPushState() {
  state.push = null;
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const sub = await browserPushSubscription();
    if (!sub) return;
    const res = await api("/api/push/state", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
    if (res.subscribed) state.push = { ...res, endpoint: sub.endpoint };
    else await registerPushWithServer(sub);
  } catch (err) {
    state.push = null;
  }
}

async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    toast(t("Notifications were not allowed"));
    return;
  }
  const { public_key } = await api("/api/push/config");
  const key = urlB64ToBytes(public_key);
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // a subscription made against a different server key (fresh database)
  // can't be reused - the browser refuses a mismatched key
  if (sub && !sameBytes(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await registerPushWithServer(sub);
}

async function disablePush() {
  const sub = await browserPushSubscription();
  if (sub) {
    await api("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
  state.push = null;
}

// Keep the notification text language in step with the UI language.
function syncPushLang() {
  if (!state.push || !state.push.subscribed) return;
  api("/api/push/preferences", {
    method: "PUT",
    body: JSON.stringify({ endpoint: state.push.endpoint, lang: state.lang }),
  }).catch(() => {});
}

function renderPushBox() {
  const box = document.getElementById("push-box");
  const reason = pushUnsupportedReason();
  let inner;
  if (reason) {
    inner = `<div class="push-note">${t(reason)}</div>`;
  } else if (Notification.permission === "denied") {
    inner = `<div class="push-note">${t("Notifications are blocked for this site - allow them in your browser's site settings.")}</div>`;
  } else if (state.push && state.push.subscribed) {
    inner = `
      <div class="push-status">✅ ${t("Enabled on this device")}</div>
      <div class="row">
        <button type="button" class="btn secondary" id="push-test-btn">${t("Send test")}</button>
        <button type="button" class="btn secondary" id="push-disable-btn">${t("Disable")}</button>
      </div>
      <div class="push-note">${t("Choose which chores notify this device in the list below.")}</div>`;
  } else {
    inner = `
      <div class="push-note">${t("Get a notification on this device when a reminder is due.")}</div>
      <button type="button" class="btn" id="push-enable-btn">${t("Enable on this device")}</button>`;
  }
  box.innerHTML = inner;

  const guard = (fn) => async () => {
    try {
      await fn();
    } catch (err) {
      toast(t("Error: ") + err.message);
    }
    renderPushBox();
    renderReminderRows();
  };
  const enableBtn = box.querySelector("#push-enable-btn");
  if (enableBtn) enableBtn.addEventListener("click", guard(enablePush));
  const disableBtn = box.querySelector("#push-disable-btn");
  if (disableBtn) disableBtn.addEventListener("click", guard(disablePush));
  const testBtn = box.querySelector("#push-test-btn");
  if (testBtn) {
    testBtn.addEventListener("click", async () => {
      try {
        await api("/api/push/test", { method: "POST", body: JSON.stringify({ endpoint: state.push.endpoint }) });
        toast("Test notification sent");
      } catch (err) {
        toast(t("Error: ") + err.message);
      }
    });
  }
}

// ---------- settings ----------

async function loadSettings() {
  await loadProfile();
  await loadPeople();
  loadPeopleSettings();
  await loadChoreTypesManager();
  await loadPushState();
  renderPushBox();
  renderReminderRows();
}

// One row per chore type: master reminder on/off, the interval, the session
// window (where it applies), and whether *this device* gets pushes for it.
function renderReminderRows() {
  const list = document.getElementById("settings-list");
  list.innerHTML = "";
  const pushOn = !!(state.push && state.push.subscribed);
  state.choreTypes.forEach((ct) => {
    const hasReminder = ct.interval_configurable || ct.daily_reminder;
    const muted = new Set((state.push && state.push.muted_types) || []);
    const row = document.createElement("div");
    row.className = "settings-row reminder-row";
    row.innerHTML = `
      <div class="reminder-head">
        <div>${ct.icon} <strong>${t(ct.label)}</strong></div>
        ${
          hasReminder
            ? `<label class="switch-label"><input type="checkbox" class="reminder-toggle" ${ct.reminder_enabled ? "checked" : ""}> ${t("Reminder")}</label>`
            : `<span style="color:var(--muted)">${t("no reminder")}</span>`
        }
      </div>
      <div class="row reminder-controls ${hasReminder && !ct.reminder_enabled ? "dimmed" : ""}">
        ${
          ct.interval_configurable
            ? `<label>${t("Repeat every")} <input type="number" min="0" class="interval-input" style="width:92px" value="${ct.interval_minutes ?? ""}"> ${t("min")}</label>`
            : ct.fixed_reminder_note
              ? `<span style="color:var(--muted)">${t(ct.fixed_reminder_note)}</span>`
              : ""
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
        ${
          pushOn && hasReminder
            ? `<label class="switch-label push-toggle"><input type="checkbox" ${muted.has(ct.key) ? "" : "checked"}> 🔔 ${t("Push")}</label>`
            : ""
        }
      </div>`;

    const reminderToggle = row.querySelector(".reminder-toggle");
    if (reminderToggle) {
      reminderToggle.addEventListener("change", async () => {
        try {
          await api(`/api/chore-types/${ct.key}/settings`, {
            method: "PUT",
            body: JSON.stringify({ reminder_enabled: reminderToggle.checked }),
          });
        } catch (err) {
          reminderToggle.checked = !reminderToggle.checked;
          toast(t("Error: ") + err.message);
          return;
        }
        row.querySelector(".reminder-controls").classList.toggle("dimmed", !reminderToggle.checked);
        toast("Saved");
        await loadChoreTypes();
        loadDashboard();
      });
    }

    const saveBtn = row.querySelector(".save-settings-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const intervalInput = row.querySelector(".interval-input");
        const sessionInput = row.querySelector(".session-window-input");
        // only send what this row actually has, so saving one never resets the other
        const body = {};
        if (intervalInput) body.interval_minutes = intervalInput.value !== "" ? Number(intervalInput.value) : null;
        if (sessionInput) body.session_window_minutes = sessionInput.value !== "" ? Number(sessionInput.value) : null;
        await api(`/api/chore-types/${ct.key}/settings`, { method: "PUT", body: JSON.stringify(body) });
        toast("Saved");
        await loadChoreTypes();
        loadDashboard();
      });
    }

    const pushToggle = row.querySelector(".push-toggle input");
    if (pushToggle) {
      pushToggle.addEventListener("change", async () => {
        const next = new Set((state.push && state.push.muted_types) || []);
        if (pushToggle.checked) next.delete(ct.key);
        else next.add(ct.key);
        try {
          const res = await api("/api/push/preferences", {
            method: "PUT",
            body: JSON.stringify({ endpoint: state.push.endpoint, muted_types: [...next] }),
          });
          state.push = { ...res, endpoint: state.push.endpoint };
          toast("Saved");
        } catch (err) {
          pushToggle.checked = !pushToggle.checked;
          toast(t("Error: ") + err.message);
        }
      });
    }
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
// stats period/forecast come from cookies (see state.stats); fall back if a stale value is stored
if (!STATS_PERIODS.some((c) => c.v === state.stats.days)) state.stats.days = "90";
if (!STATS_FORECASTS.some((c) => c.v === state.stats.forecast)) state.stats.forecast = "0";

const competitionDaysSelect = document.getElementById("competition-days");
const savedCompetitionDays = getCookie("bm_competition_days");
if (savedCompetitionDays && [...competitionDaysSelect.options].some((o) => o.value === savedCompetitionDays)) {
  competitionDaysSelect.value = savedCompetitionDays;
}
competitionDaysSelect.addEventListener("change", () => {
  setCookie("bm_competition_days", competitionDaysSelect.value);
  loadCompetition();
});

async function loadPeople() {
  state.people = await api("/api/people");
}

initTabs();
(async function init() {
  await Promise.all([loadChoreTypes(), loadPeople()]);
  await loadDashboard();
  setInterval(loadDashboard, 30000);
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
