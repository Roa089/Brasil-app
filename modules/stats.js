/* =====================================
   Stats Module
   KPIs + Mastery + Simple SVG Charts
   ===================================== */

let _state = null;
let _cards = [];

export function initStats(state, cards) {
  _state = state;
  _cards = cards || [];

  _state.stats = _state.stats || {
    sessions: 0,
    xpLog: {} // dayKey -> xp earned that day
  };

  // ensure missions exists
  _state.missions = _state.missions || { xp: 0, streak: 0, lastActiveDay: null };
  _state.learning = _state.learning || { progress: {} };
}

/* ---------- KPIs ---------- */
export function getKpis() {
  const total = _cards.length;

  const progress = _state.learning.progress || {};
  const seen = Object.values(progress).filter(p => p.reps > 0).length;

  const due = _cards.filter(c => {
    const p = progress[c.id];
    if (!p) return false;
    return p.reps > 0 && (p.due || 0) <= Date.now();
  }).length;

  const xp = _state.missions?.xp || 0;
  const streak = _state.missions?.streak || 0;
  const sessions = _state.stats.sessions || 0;

  return { total, seen, due, xp, streak, sessions };
}

/* ---------- Mastery ---------- */
export function masteryByTopic() {
  const progress = _state.learning.progress || {};
  const out = {};

  for (const c of _cards) {
    const p = progress[c.id] || { reps: 0, lapses: 0 };
    if (!out[c.topic]) out[c.topic] = { total: 0, mastered: 0 };
    out[c.topic].total++;

    // "Mastered" = stable: reps>=4 and lapses==0
    if (p.reps >= 4 && (p.lapses || 0) === 0) out[c.topic].mastered++;
  }
  return out;
}

export function masteryBySkill() {
  const progress = _state.learning.progress || {};
  const out = {};

  for (const c of _cards) {
    const p = progress[c.id] || { reps: 0, lapses: 0 };
    if (!out[c.skill]) out[c.skill] = { total: 0, mastered: 0 };
    out[c.skill].total++;

    if (p.reps >= 4 && (p.lapses || 0) === 0) out[c.skill].mastered++;
  }
  return out;
}

export function masteryPercent() {
  const progress = _state.learning.progress || {};
  let total = 0;
  let mastered = 0;

  for (const c of _cards) {
    total++;
    const p = progress[c.id];
    if (p && p.reps >= 4 && (p.lapses || 0) === 0) mastered++;
  }
  return total ? Math.round((mastered / total) * 100) : 0;
}

/* ---------- XP logging ---------- */
export function logXp(amount, date = new Date()) {
  const day = toDayKey(date);
  _state.stats.xpLog[day] = (_state.stats.xpLog[day] || 0) + Math.max(0, amount || 0);
}

export function getWeeklyXp(days = 7) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDayKey(d);
    out.push({ day: key, xp: _state.stats.xpLog[key] || 0 });
  }
  return out;
}

/* ---------- Charts (SVG) ---------- */
export function svgWeeklyXpBarChart(width = 320, height = 120) {
  const data = getWeeklyXp(7);
  const max = Math.max(10, ...data.map(x => x.xp));
  const pad = 14;

  const barW = (width - pad * 2) / data.length;
  const bars = data.map((d, i) => {
    const h = Math.round((d.xp / max) * (height - pad * 2));
    const x = pad + i * barW + 6;
    const y = height - pad - h;
    const w = Math.max(10, barW - 12);
    const label = d.day.slice(5);
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="rgba(101,163,13,.9)" />
      <text x="${x + w/2}" y="${height - 4}" font-size="10" text-anchor="middle" fill="rgba(244,246,255,.65)">${label}</text>
    `;
  }).join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.10)"/>
    ${bars}
  </svg>`;
}

export function svgMasteryDonut(size = 140) {
  const p = masteryPercent();
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="rgba(255,255,255,.10)" stroke-width="12" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}"
      stroke="rgba(34,197,94,.95)" stroke-width="12" fill="none"
      stroke-linecap="round"
      stroke-dasharray="${c}"
      stroke-dashoffset="${offset}"
      transform="rotate(-90 ${size/2} ${size/2})"
    />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="22" fill="rgba(244,246,255,.92)" font-weight="900">${p}%</text>
    <text x="50%" y="64%" dominant-baseline="middle" text-anchor="middle" font-size="11" fill="rgba(244,246,255,.60)">Mastery</text>
  </svg>`;
}

/* ---------- UI Snippets ---------- */
export function statsHtmlOverview() {
  const k = getKpis();
  const donut = svgMasteryDonut(150);
  const bars = svgWeeklyXpBarChart(360, 130);

  return `
    <div class="card">
      <div class="title">📊 Stats</div>

      <div class="row" style="justify-content:space-between; gap:14px;">
        <div style="flex:1; min-width:220px;">
          <div class="pill">Cards: <b>${k.total}</b></div>
          <div class="pill">Gesehen: <b>${k.seen}</b></div>
          <div class="pill">Fällig: <b>${k.due}</b></div>
          <div class="pill">XP: <b>${k.xp}</b></div>
          <div class="pill">Streak: <b>${k.streak}</b></div>
        </div>

        <div style="min-width:150px; display:flex; justify-content:center;">
          ${donut}
        </div>
      </div>

      <hr />
      <div class="small muted">XP der letzten 7 Tage</div>
      <div style="margin-top:10px;">${bars}</div>
    </div>
  `;
}

export function statsHtmlMasteryTables() {
  const byTopic = masteryByTopic();
  const bySkill = masteryBySkill();

  const topicRows = Object.entries(byTopic)
    .sort((a,b)=> (b[1].mastered/b[1].total) - (a[1].mastered/a[1].total))
    .map(([k,v]) => {
      const pct = v.total ? Math.round((v.mastered/v.total)*100) : 0;
      return `<div class="row" style="justify-content:space-between;">
        <div>${escapeHtml(k)}</div>
        <div class="muted">${v.mastered}/${v.total} • ${pct}%</div>
      </div>`;
    }).join("");

  const skillRows = Object.entries(bySkill)
    .sort((a,b)=> (b[1].mastered/b[1].total) - (a[1].mastered/a[1].total))
    .map(([k,v]) => {
      const pct = v.total ? Math.round((v.mastered/v.total)*100) : 0;
      return `<div class="row" style="justify-content:space-between;">
        <div>${escapeHtml(k)}</div>
        <div class="muted">${v.mastered}/${v.total} • ${pct}%</div>
      </div>`;
    }).join("");

  return `
    <div class="grid two">
      <div class="card">
        <div class="title">Mastery nach Topic</div>
        ${topicRows || `<div class="muted small">Noch keine Daten.</div>`}
      </div>
      <div class="card">
        <div class="title">Mastery nach Skill</div>
        ${skillRows || `<div class="muted small">Noch keine Daten.</div>`}
      </div>
    </div>
  `;
}

/* ---------- Public API ---------- */
export const statsSelectors = {
  getKpis,
  masteryByTopic,
  masteryBySkill,
  masteryPercent,
  getWeeklyXp,
  svgWeeklyXpBarChart,
  svgMasteryDonut,
  statsHtmlOverview,
  statsHtmlMasteryTables
};

export const statsActions = {
  logXp
};

/* ---------- Utils ---------- */
function toDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}