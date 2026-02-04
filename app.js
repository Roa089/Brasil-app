/* ==========================================
   PT-BR Trainer — App 3.x (Module Integrated)
   Routes: home / learn / speak / import / stats / settings
   ========================================== */

import { getAllCards, getPacks, togglePack } from "./modules/content.js";
import "./content_packs/pack_alltag_A1_A2.js";
import "./content_packs/pack_story_B1_B2.js";
import "./content_packs/pack_formal_C1.js";

import { initLearning, learningActions, learningSelectors } from "./modules/learning.js";
import { initSpeaking, speakingActions, speakingSelectors } from "./modules/speaking.js";
import { initMissions, missionActions, missionSelectors } from "./modules/missions.js";
import { initStats, statsSelectors, statsActions } from "./modules/stats.js";
import { parseImport } from "./modules/importer.js";

/* ---------- Constants ---------- */
const APP_VERSION = 1;
const STORAGE_KEY = "ptbr_app_state_v1";

/* ---------- DOM Helpers ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- State ---------- */
function defaultState() {
  return {
    version: APP_VERSION,
    route: "home",
    user: { name: "", },
    settings: {
      genLimit: 4000,
      activeTopics: [],     // optional (not used yet)
      cefr: ["A1", "A2", "B1", "B2", "C1"],
      skills: ["greeting", "asking", "answering", "describing", "narrating", "negotiating", "formal", "opinion"],
    },
    learning: { progress: {}, filters: { topics: [], cefr: ["A1","A2","B1","B2","C1"], skills: ["greeting","asking","answering","describing","narrating","negotiating","formal","opinion"] } },
    missions: null,
    stats: null,
    data: {
      imported: [] // user-imported cards
    }
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.version || parsed.version !== APP_VERSION) return defaultState();
    return merge(defaultState(), parsed);
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function merge(a, b) {
  // shallow-ish merge
  const out = { ...a };
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) out[k] = merge(a[k] || {}, b[k]);
    else out[k] = b[k];
  }
  return out;
}

/* ---------- Router ---------- */
const ROUTES = ["home", "learn", "speak", "import", "stats", "settings"];

function setRoute(route) {
  state.route = ROUTES.includes(route) ? route : "home";
  saveState();
  render();
  updateTabbar();
}

function updateTabbar() {
  $$(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.route === state.route));
}

/* ---------- UI Utilities ---------- */
let toastTimer = null;

function toast(msg, ms = 2200) {
  const root = $("#toast-root");
  if (!root) return;
  root.innerHTML = `<div class="toast">${escapeHtml(String(msg))}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (root.innerHTML = ""), ms);
}

function openModal(html) {
  const root = $("#modal-root");
  if (!root) return;
  root.style.display = "block";
  root.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal">${html}</div>
  `;
  root.querySelector("[data-close]")?.addEventListener("click", closeModal);
}
function closeModal() {
  const root = $("#modal-root");
  if (!root) return;
  root.style.display = "none";
  root.innerHTML = "";
}

function openSheet(html) {
  const root = $("#sheet-root");
  if (!root) return;
  root.style.display = "block";
  root.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="sheet">${html}</div>
  `;
  root.querySelector("[data-close]")?.addEventListener("click", closeSheet);
}
function closeSheet() {
  const root = $("#sheet-root");
  if (!root) return;
  root.style.display = "none";
  root.innerHTML = "";
}

function confirmSheet(text, onYes) {
  openSheet(`
    <div class="title">Bestätigen</div>
    <p class="muted">${escapeHtml(text)}</p>
    <div class="row" style="margin-top:12px;">
      <button class="btn primary" id="yesBtn">Ja</button>
      <button class="btn" id="noBtn">Nein</button>
    </div>
  `);
  $("#yesBtn").onclick = () => { closeSheet(); onYes?.(); };
  $("#noBtn").onclick = closeSheet;
}

/* ---------- Cards Source (Generated + Imported) ---------- */
function getCards() {
  const generated = getAllCards(state.settings.genLimit || 4000);
  const imported = Array.isArray(state.data.imported) ? state.data.imported : [];
  // Imported should override duplicates if same id; simplest: concat
  return [...generated, ...imported];
}

/* ---------- Init modules ---------- */
let cards = [];

function initModules() {
  cards = getCards();

  initLearning(state, cards);
  initSpeaking(state, cards);
  initMissions(state);
  initStats(state, cards);

  // keep learning filters synced with state.settings defaults (optional)
  learningActions.setCefrFilter(state.settings.cefr || ["A1","A2","B1","B2","C1"]);
  learningActions.setSkillFilter(state.settings.skills || ["greeting","asking","answering","describing","narrating","negotiating","formal","opinion"]);
}

/* ---------- Views ---------- */
function viewHome() {
  const m = missionSelectors.getTodayMission();
  const p = missionSelectors.getTodayProgress();
  const xp = missionSelectors.getXP();
  const streak = missionSelectors.getStreak();

  const row = (label, done, target) => {
    const pct = Math.min(100, Math.round((done / target) * 100));
    return `
      <div style="margin:10px 0;">
        <div class="row" style="justify-content:space-between;">
          <div class="small">${escapeHtml(label)}</div>
          <div class="small muted">${done}/${target}</div>
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
      </div>
    `;
  };

  const allDone = missionActions.isAllComplete();

  return `
    <div class="card">
      <div class="title">🏠 Heute</div>
      <div class="row" style="justify-content:space-between;">
        <div class="pill">XP: <b>${xp}</b></div>
        <div class="pill">Streak: <b>${streak}</b></div>
        <div class="pill">Cards: <b>${cards.length}</b></div>
      </div>

      <hr/>
      <div class="small muted">Tagesmission (${escapeHtml(m.dayKey)})</div>
      ${row("Reviews", p.reviewDone, m.tasks.review.target)}
      ${row("Neue Karten", p.newDone, m.tasks.new.target)}
      ${row("Shadowing", p.speakDone, m.tasks.speak.target)}
      ${row("Mini-Story", p.storyDone, m.tasks.story.target)}

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="goLearn">${allDone ? "Bonus-Session starten" : "Session starten"}</button>
        <button class="btn" id="goSpeak">Shadowing</button>
      </div>
    </div>

    <div class="card">
      <div class="title">🏅 Badges</div>
      ${renderBadges()}
    </div>
  `;
}

function renderBadges() {
  const b = missionSelectors.getBadges();
  if (!b.length) return `<div class="muted small">Noch keine Badges – starte mit der Tagesmission.</div>`;
  return b.slice(-10).reverse().map(x => `
    <div class="row" style="justify-content:space-between;">
      <div>${escapeHtml(x.name || x.key)}</div>
      <div class="muted small">${new Date(x.earnedAt).toLocaleDateString()}</div>
    </div>
  `).join("");
}

/* ---------- Learn View ---------- */
let learnSession = [];
let learnIndex = 0;

let learnFlipped = false; // merkt Flip-Status für aktuelle Karte

function startLearnSession() {
  learnSession = learningSelectors.getMixedSession(30);
  learnIndex = 0;
  learnFlipped = false;

  if (!learnSession.length) {
    toast("Keine Karten gefunden (Filter zu streng?)");
    return;
  }
  toast("Session gestartet ✅");
  render();
}

function currentLearnCard() {
  return learnSession[learnIndex] || null;
}

function gradeLearn(grade) {
  const c = currentLearnCard();
  if (!c) return;

  learningActions.schedule(c.id, grade);
  saveState();

  // mission progress
  if (c && (state.learning.progress?.[c.id]?.reps || 0) <= 1) {
    // treated as "new" early
    missionActions.addProgress("new", 1);
    statsActions.logXp(3);
  } else {
    missionActions.addProgress("review", 1);
    statsActions.logXp(2);
  }

  saveState();

  learnIndex++;
  learnFlipped = false;
  if (learnIndex >= learnSession.length) {
    toast("Session fertig 🎉");
    learnIndex = learnSession.length - 1;
  }
  render();
}

function viewLearn() {
  const c = currentLearnCard();

  const filters = `
    <div class="card">
      <div class="title">📚 Lernen</div>
      <div class="small muted">Filter</div>

      <div class="row" style="margin-top:10px;">
        <button class="chip" data-cefr="A1">A1</button>
        <button class="chip" data-cefr="A2">A2</button>
        <button class="chip" data-cefr="B1">B1</button>
        <button class="chip" data-cefr="B2">B2</button>
        <button class="chip" data-cefr="C1">C1</button>
      </div>

      <div class="row" style="margin-top:10px;">
        ${["greeting","asking","answering","describing","narrating","negotiating","formal","opinion"].map(s =>
          `<button class="chip" data-skill="${s}">${escapeHtml(s)}</button>`
        ).join("")}
      </div>

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="startSession">Session starten (30)</button>
        <button class="btn" id="resetFilters">Filter reset</button>
      </div>

      <div class="small muted" style="margin-top:10px;">
        Aktive Karten in Session: <b>${learnSession.length}</b>
      </div>
    </div>
  `;

    const cardUi = c ? `
    <div class="flip-wrap">
      <div class="flip-card ${learnFlipped ? "is-flipped" : ""}" id="flipCard" title="Tippe zum Umdrehen">
        <!-- FRONT: PT -->
        <div class="flip-face flip-front">
          <div class="row" style="justify-content:space-between;">
            <div class="pill">Topic: <b>${escapeHtml(c.topic)}</b></div>
            <div class="pill">CEFR: <b>${escapeHtml(c.cefr)}</b></div>
            <div class="pill">Skill: <b>${escapeHtml(c.skill)}</b></div>
          </div>

          <hr/>
          <div class="pt">${escapeHtml(c.pt)}</div>
          <div class="flip-hint">Tippe die Karte, um die Übersetzung zu sehen.</div>

          <div class="flip-actions">
            <button class="btn" id="ttsCard" type="button">🔊 Anhören</button>
            <button class="btn primary" id="revealBtn" type="button">Übersetzung zeigen</button>
            <div class="pill">Karte ${learnIndex + 1}/${learnSession.length}</div>
          </div>
        </div>

        <!-- BACK: DE + Forms -->
        <div class="flip-face flip-back">
          <div class="row" style="justify-content:space-between;">
            <div class="pill">Übersetzung</div>
            <button class="btn" id="hideBtn" type="button">Zurück</button>
          </div>

          <hr/>
          <div class="pt">${escapeHtml(c.de)}</div>

          ${c.forms?.length ? `
            <hr/>
            <div class="small muted">Varianten</div>
            ${c.forms.map(f => `<div class="pill" style="margin-top:8px;">${escapeHtml(f)}</div>`).join("")}
          ` : ""}

          <hr/>
          <div class="small muted">Bewertung (SRS)</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn danger" id="g0" type="button">0 – falsch</button>
            <button class="btn" id="g1" type="button">1 – schwer</button>
            <button class="btn primary" id="g2" type="button">2 – ok</button>
            <button class="btn" id="g3" type="button">3 – leicht</button>
          </div>
        </div>
      </div>
    </div>
  ` : `
    <div class="card">
      <div class="title">Bereit?</div>
      <div class="muted">Starte eine Session, dann erscheinen Karten hier.</div>
    </div>
  `;

  return filters + cardUi;
}

function bindLearnEvents() {
  $("#startSession")?.addEventListener("click", startLearnSession);
  $("#resetFilters")?.addEventListener("click", () => {
    const allCefr = ["A1","A2","B1","B2","C1"];
    const allSkills = ["greeting","asking","answering","describing","narrating","negotiating","formal","opinion"];
    learningActions.setCefrFilter(allCefr);
    learningActions.setSkillFilter(allSkills);
    toast("Filter zurückgesetzt");
    render();
  });

  $$(".chip[data-cefr]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.cefr;
      const cur = new Set(state.learning.filters?.cefr || ["A1","A2","B1","B2","C1"]);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      const arr = Array.from(cur);
      learningActions.setCefrFilter(arr.length ? arr : ["A1"]);
      state.learning.filters.cefr = learningSelectors.getNewCards ? state.learning.filters.cefr : arr; // harmless
      saveState();
      render();
    });
  });

  $$(".chip[data-skill]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.skill;
      const cur = new Set(state.learning.filters?.skills || []);
      if (cur.has(v)) cur.delete(v); else cur.add(v);
      const arr = Array.from(cur);
      learningActions.setSkillFilter(arr.length ? arr : ["describing"]);
      state.learning.filters.skills = arr;
      saveState();
      render();
    });
  });

  // grade buttons
  $("#g0")?.addEventListener("click", () => gradeLearn(0));
  $("#g1")?.addEventListener("click", () => gradeLearn(1));
  $("#g2")?.addEventListener("click", () => gradeLearn(2));
  $("#g3")?.addEventListener("click", () => gradeLearn(3));

  $("#ttsCard")?.addEventListener("click", () => {
    const c = currentLearnCard();
    if (!c) return;
    // quick TTS reuse from speaking module by temporary session
    // simplest: start a speak session with this card only
    speakingActions.startShadowing({ limit: 1 });
    // but we want exactly this sentence:
    // use speakingActions.play by setting internal current card:
    // -> easiest: just use SpeechSynthesis directly here:
    try {
      const u = new SpeechSynthesisUtterance(c.pt);
      u.lang = "pt-BR";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  });

  // set chip active states based on current filters
  const cefrSet = new Set(state.learning.filters?.cefr || []);
  $$(".chip[data-cefr]").forEach(btn => btn.classList.toggle("on", cefrSet.has(btn.dataset.cefr)));

  const skillSet = new Set(state.learning.filters?.skills || []);
  $$(".chip[data-skill]").forEach(btn => btn.classList.toggle("on", skillSet.has(btn.dataset.skill)));
}

/* ---------- Speak View ---------- */
function viewSpeak() {
  const s = speakingSelectors.getSession();
  const c = speakingActions.current();
  const prog = speakingSelectors.getProgress();
  const compare = speakingSelectors.getLastCompareHtml();

  return `
    <div class="card">
      <div class="title">🎤 Shadowing</div>

      <div class="row">
        <button class="btn primary" id="startSpeak">Shadowing starten</button>
        <button class="btn" id="prevSpeak">◀︎</button>
        <button class="btn" id="playSpeak">▶︎</button>
        <button class="btn" id="repeatSpeak">↻</button>
        <button class="btn" id="nextSpeak">▶︎▶︎</button>
      </div>

      <div style="margin-top:12px;">
        <div class="row" style="justify-content:space-between;">
          <div class="pill">Karte ${prog.index}/${prog.total}</div>
          <div class="pill">Speed: <b id="rateLabel">${(state.speaking?.rate || 1.0).toFixed(1)}x</b></div>
        </div>
        <input id="rate" type="range" min="0.7" max="1.3" step="0.1" value="${(state.speaking?.rate || 1.0)}" style="margin-top:12px;">
      </div>

      <hr/>
      ${c ? `
        <div class="pt">${escapeHtml(c.pt)}</div>
        <div class="de">${escapeHtml(c.de)}</div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" id="sttBtn">🎙️ Sprechen & Vergleichen</button>
          <button class="btn" id="markSpeakDone">✅ zählt als Mission</button>
        </div>

        <div id="compare" style="margin-top:12px;">
          ${compare || `<div class="muted small">Tipp: “Sprechen & Vergleichen” zeigt dir Unterschiede.</div>`}
        </div>
      ` : `<div class="muted">Starte Shadowing, dann erscheint hier die Karte.</div>`}
    </div>
  `;
}

function bindSpeakEvents() {
  $("#startSpeak")?.addEventListener("click", () => {
    speakingActions.startShadowing({ limit: 20 });
    toast("Shadowing gestartet ✅");
    render();
  });

  $("#prevSpeak")?.addEventListener("click", () => { speakingActions.prev(); render(); });
  $("#nextSpeak")?.addEventListener("click", () => { speakingActions.next(); render(); });

  $("#playSpeak")?.addEventListener("click", () => { speakingActions.play(); });
  $("#repeatSpeak")?.addEventListener("click", () => { speakingActions.repeat(); });

  $("#rate")?.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    speakingActions.setRate(v);
    saveState();
    $("#rateLabel").textContent = `${v.toFixed(1)}x`;
  });

  $("#sttBtn")?.addEventListener("click", () => {
    const res = speakingActions.listenAndCompare(({ diffHtml, error }) => {
      if (error) toast("SpeechRecognition Fehler/blocked (iOS kann zickig sein).");
      if (diffHtml) {
        const el = $("#compare");
        if (el) el.innerHTML = diffHtml;
      }
    });
    if (!res.ok) toast(res.reason);
  });

  $("#markSpeakDone")?.addEventListener("click", () => {
    missionActions.addProgress("speak", 1);
    statsActions.logXp(4);
    saveState();
    toast("Shadowing gezählt ✅");
    render();
  });
}

/* ---------- Import View ---------- */
function viewImport() {
  return `
    <div class="card">
      <div class="title">⬇️ AI-Import</div>
      <div class="small muted">Füge Schema, CSV oder Zeilen ein. Defaults helfen (Topic/CEFR/Skill).</div>

      <div class="grid two" style="margin-top:12px;">
        <div>
          <div class="small muted">Default Topic</div>
          <input id="impTopic" placeholder="z.B. einkaufen" value="alltag"/>
        </div>
        <div>
          <div class="small muted">Default CEFR</div>
          <select id="impCefr">
            ${["A1","A2","B1","B2","C1"].map(x => `<option value="${x}">${x}</option>`).join("")}
          </select>
        </div>
      </div>

      <div style="margin-top:12px;">
        <div class="small muted">Default Skill</div>
        <select id="impSkill">
          ${["greeting","asking","answering","describing","narrating","negotiating","formal","opinion"].map(x => `<option value="${x}">${x}</option>`).join("")}
        </select>
      </div>

      <textarea id="impText" rows="10" style="margin-top:12px;" placeholder="TOPIC: einkaufen
CEFR: A2
SKILL: asking
PT: Você aceita cartão?
DE: Akzeptieren Sie Karte?
FORMS: Aceita cartão? | Posso pagar no cartão?
TAGS: pagamento | loja
---"></textarea>

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="previewImport">Preview</button>
        <button class="btn" id="applyImport">Importieren</button>
        <button class="btn danger" id="clearImport">Leeren</button>
      </div>

      <div id="impOut" style="margin-top:12px;"></div>
    </div>
  `;
}

function bindImportEvents() {
  $("#previewImport")?.addEventListener("click", () => {
    const { cardsPreview, html } = previewImport();
    $("#impOut").innerHTML = html;
    toast(`${cardsPreview.length} Karten erkannt`);
  });

  $("#applyImport")?.addEventListener("click", () => {
    const { cardsPreview } = previewImport();
    if (!cardsPreview.length) { toast("Nichts zum Importieren"); return; }

    // merge with existing imported, dedupe by normalize(pt)
    const existing = Array.isArray(state.data.imported) ? state.data.imported : [];
    const merged = dedupeByPt([...existing, ...cardsPreview]);
    state.data.imported = merged;

    saveState();
    initModules(); // refresh cards in modules
    toast(`Importiert: ${cardsPreview.length} (gesamt imported: ${merged.length})`);
    render();
  });

  $("#clearImport")?.addEventListener("click", () => {
    $("#impText").value = "";
    $("#impOut").innerHTML = "";
  });
}

function previewImport() {
  const topic = ($("#impTopic")?.value || "alltag").trim();
  const cefr = ($("#impCefr")?.value || "A1").trim();
  const skill = ($("#impSkill")?.value || "describing").trim();
  const txt = $("#impText")?.value || "";

  const cardsPreview = parseImport(txt, { topic, cefr, skill });

  const html = cardsPreview.slice(0, 6).map(c => `
    <div class="card">
      <div class="row" style="justify-content:space-between;">
        <div class="pill">${escapeHtml(c.topic)}</div>
        <div class="pill">${escapeHtml(c.cefr)}</div>
        <div class="pill">${escapeHtml(c.skill)}</div>
      </div>
      <hr/>
      <div class="pt">${escapeHtml(c.pt)}</div>
      <div class="de">${escapeHtml(c.de)}</div>
      ${c.forms?.length ? `<div class="small muted" style="margin-top:10px;">Forms: ${escapeHtml(c.forms.join(" | "))}</div>` : ""}
    </div>
  `).join("") + (cardsPreview.length > 6 ? `<div class="muted small">+ ${cardsPreview.length - 6} weitere…</div>` : "");

  return { cardsPreview, html };
}

function dedupeByPt(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const k = normalize(c.pt);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/* ---------- Stats View ---------- */
function viewStats() {
  return `
    ${statsSelectors.statsHtmlOverview()}
    ${statsSelectors.statsHtmlMasteryTables()}
  `;
}

/* ---------- Settings View ---------- */
function viewSettings() {
  const packs = getPacks();

  return `
    <div class="card">
      <div class="title">⚙️ Settings</div>

      <div class="small muted">Generator</div>
      <div class="row" style="margin-top:10px;">
        <div class="pill">Gen-Limit: <b>${state.settings.genLimit}</b></div>
        <button class="btn" id="regen">Neu generieren</button>
      </div>

      <div style="margin-top:12px;">
        <div class="small muted">Gen-Limit ändern</div>
        <input id="genLimit" type="number" min="500" max="12000" step="100" value="${state.settings.genLimit}">
      </div>

      <hr/>
      <div class="small muted">Content Packs</div>
      <div style="margin-top:10px;">
        ${packs.map(p => `
          <div class="row" style="justify-content:space-between; margin:10px 0;">
            <div>${escapeHtml(p.name)}</div>
            <button class="chip ${p.enabled ? "on" : ""}" data-pack="${escapeHtml(p.key)}">${p.enabled ? "AN" : "AUS"}</button>
          </div>
        `).join("")}
      </div>

      <hr/>
      <button class="btn danger" id="resetAll">Alles zurücksetzen</button>
    </div>
  `;
}

function bindSettingsEvents() {
  $("#regen")?.addEventListener("click", () => {
    initModules();
    toast("Neu generiert ✅");
    render();
  });

  $("#genLimit")?.addEventListener("change", (e) => {
    const v = clamp(Number(e.target.value || 4000), 500, 12000);
    state.settings.genLimit = v;
    saveState();
    toast(`Gen-Limit: ${v}`);
  });

  $$("[data-pack]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.pack;
      togglePack(key);
      initModules();
      toast("Pack geändert ✅");
      render();
    });
  });

  $("#resetAll")?.addEventListener("click", () => {
    confirmSheet("Wirklich alles löschen (State, Progress, Imports)?", () => {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState();
      initModules();
      toast("Reset ✅");
      setRoute("home");
    });
  });
}

/* ---------- Render ---------- */
function render() {
  const app = $("#app");
  if (!app) return;

  if (state.route === "home") app.innerHTML = viewHome();
  if (state.route === "learn") app.innerHTML = viewLearn();
  if (state.route === "speak") app.innerHTML = viewSpeak();
  if (state.route === "import") app.innerHTML = viewImport();
  if (state.route === "stats") app.innerHTML = viewStats();
  if (state.route === "settings") app.innerHTML = viewSettings();

  bindCommon();
  if (state.route === "home") bindHomeEvents();
  if (state.route === "learn") bindLearnEvents();
  if (state.route === "speak") bindSpeakEvents();
  if (state.route === "import") bindImportEvents();
  if (state.route === "settings") bindSettingsEvents();
}

function bindCommon() {
  // tabs
  $$(".tab").forEach(btn => btn.onclick = () => setRoute(btn.dataset.route));
  updateTabbar();
}

function bindHomeEvents() {
  $("#goLearn")?.addEventListener("click", () => setRoute("learn"));
  $("#goSpeak")?.addEventListener("click", () => setRoute("speak"));
}

/* ---------- Service Worker (optional safety) ---------- */
function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/* ---------- Init ---------- */
function init() {
  registerSW();
  initModules();
  setRoute(state.route || "home");
  render();
}

/* ---------- Utility ---------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

document.addEventListener("DOMContentLoaded", init);

// Optional Debug handle
window.App = {
  get state() { return state; },
  setRoute,
  toast,
  openModal,
  openSheet,
  closeModal,
  closeSheet,
  confirmSheet
};