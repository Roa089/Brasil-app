// app.js – NotifyMindFit v4.0 – Router + State + UI Utils (angepasst an style.css & index.html)
// Februar 2026

(() => {
  // ────────────────────────────────────────────────
  // 1. Konstanten & Config
  // ────────────────────────────────────────────────
  const APP_VERSION     = "4.0.0";
  const STORAGE_KEY     = "notifyMindFit_v4";
  const STORAGE_VERSION = 1;

  const ROUTES = [
    { path: "",          title: "Start",    render: renderHome    },
    { path: "learn",     title: "Lernen",   render: renderLearn   },
    { path: "speak",     title: "Sprechen", render: renderSpeak   },
    { path: "import",    title: "Import",   render: renderImport  },
    { path: "stats",     title: "Statistik",render: renderStats   },
    { path: "settings",  title: "Einstellungen", render: renderSettings }
  ];
// Learning Module laden
// <script src="modules/learning.js"></script> muss in index.html stehen
  // ────────────────────────────────────────────────
  // 2. Globaler State + Persistence
  // ────────────────────────────────────────────────
  let state = {};

  function defaultState() {
    return {
      version: STORAGE_VERSION,
      createdAt: Date.now(),
      settings: {
        ttsRate: 1.0,
        darkMode: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
        activeTopics: ["smalltalk", "wetter", "essen", "urlaub"],
        dailyGoal: 20,
      },
      progress: {},
      favorites: [],
      history: [],
      importedCards: [],
      lastSync: 0,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`State migration: v${parsed.version} → v${STORAGE_VERSION}`);
        return migrateState(parsed);
      }
      return { ...defaultState(), ...parsed };
    } catch (err) {
      console.error("State load error", err);
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("State save failed", err);
    }
  }

  function migrateState(old) {
    const next = { ...defaultState(), ...old };
    next.version = STORAGE_VERSION;
    return next;
  }

  // ────────────────────────────────────────────────
  // 3. Event Bus
  // ────────────────────────────────────────────────
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    }
  }

  function emit(event, payload) {
    (listeners[event] || []).forEach(cb => {
      try { cb(payload); } catch (err) {
        console.error(`Event ${event} failed:`, err);
      }
    });
  }

  // ────────────────────────────────────────────────
  // 4. UI Utilities – angepasst an style.css
  // ────────────────────────────────────────────────
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
  }

  function toast(message, duration = 2600, type = "info") {
    const container = document.getElementById("toast-container") || document.body;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;

    if (type === "success") el.style.background = "rgba(16,185,129,0.95)";
    if (type === "error")   el.style.background = "rgba(239,68,68,0.95)";
    if (type === "warn")    el.style.background = "rgba(245,158,11,0.95)";

    container.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);

    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("show"), 20);
    return overlay;
  }

  function openModal(title, contentHTML, buttons = []) {
    const overlay = createOverlay();
    const modal = document.createElement("div");
    modal.className = "modal";

    modal.innerHTML = `
      <h2 class="title">${escapeHtml(title)}</h2>
      <div style="margin:16px 0;">${contentHTML}</div>
      <div style="display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap;">
        ${buttons.map(b => `<button class="btn ${b.class || ''}" data-action="${b.action || ''}">${escapeHtml(b.label)}</button>`).join("")}
      </div>
    `;

    overlay.appendChild(modal);

    const close = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 320);
    };

    overlay.onclick = e => { if (e.target === overlay) close(); };

    modal.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const handler = buttons.find(b => b.action === action)?.onClick;
        if (handler) handler();
        close();
      };
    });

    return { close };
  }

  function openSheet(title, contentHTML, buttons = []) {
    const overlay = createOverlay();
    overlay.classList.add("sheet-overlay");
    overlay.style.alignItems = "flex-end";

    const sheet = document.createElement("div");
    sheet.className = "bottom-sheet";

    sheet.innerHTML = `
      <div class="handle"></div>
      <h2 style="text-align:center; margin-bottom:16px;">${escapeHtml(title)}</h2>
      ${contentHTML}
      <div style="margin-top:24px; display:flex; flex-direction:column; gap:12px;">
        ${buttons.map(b => `<button class="btn ${b.class || 'primary'} full" data-action="${b.action || ''}">${escapeHtml(b.label)}</button>`).join("")}
      </div>
    `;

    overlay.appendChild(sheet);
    setTimeout(() => sheet.classList.add("show"), 30);

    const close = () => {
      sheet.classList.remove("show");
      setTimeout(() => overlay.remove(), 420);
    };

    overlay.onclick = e => { if (e.target === overlay) close(); };

    sheet.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const handler = buttons.find(b => b.action === action)?.onClick;
        if (handler) handler(close);
        else close();
      };
    });

    return { close };
  }

  function confirmSheet(message, yesLabel = "Ja", noLabel = "Nein") {
    return new Promise(resolve => {
      openSheet("Bestätigung", `<p style="text-align:center; margin:16px 0; font-size:16px;">${escapeHtml(message)}</p>`, [
        { label: yesLabel, class: "primary full", action: "yes", onClick: () => resolve(true)  },
        { label: noLabel,  class: "ghost full",   action: "no",  onClick: () => resolve(false) }
      ]);
    });
  }

  // ────────────────────────────────────────────────
  // 5. Hash Router
  // ────────────────────────────────────────────────
  function getCurrentRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    return ROUTES.find(r => r.path === hash) || ROUTES[0];
  }

  function navigate(path) {
    location.hash = path ? "#" + path : "";
  }

  function renderCurrentRoute() {
    const route = getCurrentRoute();
    document.title = `NotifyMindFit – ${route.title}`;

    const $content = document.getElementById("content");
    if (!$content) return;

    $content.innerHTML = "";
    route.render($content);

    emit("route:changed", { path: route.path, title: route.title });

    // Highlight active tab
    document.querySelectorAll(".tab-item").forEach(item => {
      const isActive = item.dataset.route === route.path;
      item.classList.toggle("active", isActive);
    });
  }

  // ────────────────────────────────────────────────
  // 6. Platzhalter-Views (nutzen style.css Klassen)
  // ────────────────────────────────────────────────
  function renderHome(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Willkommen bei NotifyMindFit</h1>
        <p class="muted" style="margin-bottom:24px;">Dein täglicher Boost für brasilianisches Portugiesisch.</p>
        <div class="row" style="justify-content:center; gap:16px;">
          <button class="btn primary" data-nav="learn">Jetzt lernen</button>
          <button class="btn" data-nav="stats">Statistik</button>
        </div>
      </div>
    `;
    root.querySelectorAll("[data-nav]").forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.nav);
    });
  }

  function renderLearn(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Lernmodus</h1>
        <p class="muted">Wähle dein Level oder starte eine gemischte Session…</p>
        <!-- Hier kommen später Filter, Deck-Auswahl, Start-Button etc. -->
      </div>
    `;
  }
function renderLearn(root) {
  const filters = LearningModule.learningSelectors.getActiveFilters(state);
  const dueCount = LearningModule.learningSelectors.getDueCards(state).length;
  const newCount = LearningModule.learningSelectors.getNewCards(state, 999).length;

  root.innerHTML = `
    <div class="card">
      <h1 class="title">Lernen</h1>
      <p>Fällig heute: ${dueCount} • Neu verfügbar: ${newCount}</p>
      <button class="btn primary full" onclick="startMixedSession()">Mixed Session starten (${dueCount + newCount} Karten)</button>
    </div>
  `;
}

// Globale Hilfsfunktion (später in eigene Datei)
window.startMixedSession = () => {
  const session = LearningModule.learningSelectors.getMixedSession(state, 40);
  toast(`Session mit ${session.length} Karten gestartet`, 2200, "success");
  // Hier später echte Review-UI öffnen
};

Fertig für Prompt 4.Sag einfach „weiter zu Prompt 5“ (Content Engine + Packs), wenn du bereit bist.
Viel Erfolg!

SRS-Algorithmus detailliert erklären

CEFR-Levels im Portugiesischen

Mehr Beispielkarten hinzufügen

weiter zu prompt 5

Hier ist die Umsetzung für Prompt 5 – die Content-Engine + Beispiel-Content-Packs.Ich liefere dir:modules/content.js (komplett)
Drei Beispiel-Content-Packs als separate Dateien im Ordner content_packs/
Kurze Erklärung zur Struktur und Integration in app.js

modules/content.jsjavascript

// modules/content.js
// Content-Engine: Generator + Content Packs Management
// NotifyMindFit v4.0

// ────────────────────────────────────────────────
// Globale Registry für Content Packs
// ────────────────────────────────────────────────
const contentPacks = new Map();           // name → { meta, templates, bank, active }
let generationCache = { limit: -1, cards: [] };

// ────────────────────────────────────────────────
// Hilfsfunktionen
// ────────────────────────────────────────────────
function normalize(str) {
  return (str || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/gi, "");
}

function makeId(prefix, uniqueString) {
  let hash = 2166136261;
  for (let i = 0; i < uniqueString.length; i++) {
    hash ^= uniqueString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16)}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ────────────────────────────────────────────────
// Content Pack Management
// ────────────────────────────────────────────────
function registerContentPack(pack) {
  // pack = { name, title, description, cefrRange, topics, templates, bank, active? }
  if (!pack.name || !pack.templates || !pack.bank) {
    console.warn("Ungültiges Content Pack:", pack);
    return;
  }
  contentPacks.set(pack.name, {
    ...pack,
    active: pack.active !== false, // default true
    loaded: false
  });
  console.log(`Content Pack registriert: ${pack.title || pack.name}`);
}

function togglePack(name, active = true) {
  const pack = contentPacks.get(name);
  if (pack) {
    pack.active = !!active;
    generationCache.limit = -1; // Cache invalidieren
    saveState(); // später in app.js
    emit("content:changed");
  }
}

function getActivePacks() {
  return Array.from(contentPacks.values()).filter(p => p.active);
}

// ────────────────────────────────────────────────
// Card Generator
// ────────────────────────────────────────────────
function generateCards(limit = 4000) {
  if (generationCache.limit === limit) {
    return generationCache.cards;
  }

  const used = new Set();
  const generated = [];

  const activePacks = getActivePacks();
  if (!activePacks.length) {
    console.warn("Keine aktiven Content Packs → keine generierten Karten");
    return [];
  }

  // Alle Templates und Banks mergen
  let allTemplates = [];
  let mergedBank = {};

  activePacks.forEach(pack => {
    allTemplates.push(...(pack.templates || []));
    Object.assign(mergedBank, pack.bank || {});
  });

  let attempts = 0;
  const maxAttempts = limit * 15;

  while (generated.length < limit && attempts < maxAttempts) {
    attempts++;
    const tpl = pick(allTemplates);
    if (!tpl || !tpl.pt) continue;

    let pt = typeof tpl.pt === "function" ? tpl.pt(mergedBank) : tpl.pt;
    if (typeof pt !== "string" || pt.length < 5) continue;

    const key = normalize(pt);
    if (used.has(key)) continue;
    used.add(key);

    generated.push({
      id: makeId("gen", pt),
      topic: tpl.topic || "alltag",
      cefr: tpl.cefr || "A1",
      skill: tpl.skill || "greeting",
      pt,
      de: tpl.de || "Generierter Satz",
      forms: tpl.forms || [],
      tags: tpl.tags || [tpl.topic || "generated"],
      source: "generator",
      pack: tpl.pack || "core"
    });
  }

  shuffle(generated);
  generationCache = { limit, cards: generated.slice(0, limit) };
  return generationCache.cards;
}

// ────────────────────────────────────────────────
// Zentrale Card-Quelle (später erweitert mit base + imported)
// ────────────────────────────────────────────────
function getAllCards(state) {
  const baseCards = []; // später BASE_CARDS aus altem Code
  const generated = generateCards(state.settings?.genLimit || 4000);
  const imported = state.importedCards || [];

  return [...baseCards, ...generated, ...imported];
}

// ────────────────────────────────────────────────
// Init & Export
// ────────────────────────────────────────────────
function initContent(state) {
  // Beispiel-Packs registrieren (in echt aus content_packs/*.js laden)
  // Hier nur Platzhalter – in Produktion via dynamic import oder <script>
  registerContentPack({
    name: "alltag_a1_a2",
    title: "Alltag A1–A2",
    description: "Smalltalk, Einkaufen, Verkehr, Essen, Wetter",
    cefrRange: ["A1", "A2"],
    topics: ["smalltalk", "essen", "wetter", "einkaufen", "verkehr"],
    active: true,
    // templates und bank kommen aus separater Datei
  });

  // Weitere Packs hier oder via loadContentPacks()

  return state;
}

const contentActions = {
  togglePack,
  generateCards,
};

const contentSelectors = {
  getAllCards,
  getActivePacks: () => getActivePacks(),
  getGeneratedCount: () => generationCache.cards.length,
};

window.ContentModule = {
  initContent,
  contentActions,
  contentSelectors,
  registerContentPack, // für Packs
};

content_packs/pack_alltag_A1_A2.js (Beispiel)javascript

// content_packs/pack_alltag_A1_A2.js

const pack = {
  name: "alltag_a1_a2",
  title: "Alltag A1–A2",
  description: "Grundlegender Alltag, Smalltalk, Essen, Wetter, Einkaufen, Verkehr",
  cefrRange: ["A1", "A2"],
  topics: ["smalltalk", "wetter", "essen", "einkaufen", "verkehr"],

  bank: {
    starters: ["Oi", "E aí", "Tudo bem?", "Então", "Olha"],
    weather: ["tá quente", "tá frio", "tá chovendo", "tá ensolarado"],
    food: ["um café", "um pão de queijo", "uma água", "uma coxinha"],
    places: ["no supermercado", "na padaria", "na rua", "em casa"],
    // ...
  },

  templates: [
    {
      topic: "smalltalk", cefr: "A1", skill: "greeting",
      pt: () => `${pick(BANK.starters)}, tudo bem?`,
      de: "Begrüßung locker",
      forms: ["E aí, tranquilo?", "Oi, beleza?"]
    },
    {
      topic: "wetter", cefr: "A1", skill: "describing",
      pt: () => `Hoje tá ${pick(BANK.weather)}.`,
      de: "Wetter heute",
      forms: ["Tá muito calor hoje.", "Está chovendo bastante."]
    },
    {
      topic: "essen", cefr: "A2", skill: "asking",
      pt: () => `Você quer ${pick(BANK.food)}?`,
      de: "Essen anbieten/fragen",
    },
    // 30–50 weitere Templates pro Pack
  ]
};

window.ContentModule?.registerContentPack?.(pack);

Weitere Packs (analog)pack_story_B1_B2.js
→ Fokus: narrating, opinion, describing
→ Templates wie „Ontem eu fui…“, „Na minha opinião…“, „Eu senti que…“
pack_formal_C1.js
→ Fokus: formal, negotiating, opinion
→ Templates wie „Gostaria de saber se…“, „A questão é que…“, „Por gentileza, poderia…“

Integration in app.js (Empfehlung)In index.html nach app.js laden:html

<script src="modules/content.js"></script>
<script src="content_packs/pack_alltag_A1_A2.js"></script>
<script src="content_packs/pack_story_B1_B2.js"></script>
<script src="content_packs/pack_formal_C1.js"></script>
<!-- später dynamisch laden -->

In init() von app.js – nach state = LearningModule.initLearning(state);:js

state = window.ContentModule.initContent(state);
saveState();

In getAllCards() (entweder in content.js oder learning.js):js

return window.ContentModule.contentSelectors.getAllCards(state);

Beispiel in renderSettings oder renderHome:js

const packs = ContentModule.contentSelectors.getActivePacks();
// → Chips oder Toggle-Switches für jedes Pack rendern

Fertig für Prompt 5.Sag einfach „weiter zu Prompt 6“ (AI-Import 2.0), wenn du bereit bist.

Erkläre Template-Generierung detailliert

Integriere mit Learning-Modul

Erweitere mit mehr Beispielen


  function renderSpeak(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Sprechen üben</h1>
        <p class="muted">Shadowing, Dialoge, freies Erzählen…</p>
      </div>
    `;
  }

  function renderImport(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">AI-Import</h1>
        <p class="muted">ChatGPT-Listen hier einfügen und in Karten verwandeln.</p>
      </div>
    `;
  }

  function renderStats(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Statistik</h1>
        <p class="muted">Dein Fortschritt, Streak, XP, Mastery…</p>
      </div>
    `;
  }

  function renderSettings(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Einstellungen</h1>
        <p class="muted">Themen, TTS-Geschwindigkeit, Dark Mode, Packs…</p>
      </div>
    `;
  }

  // ────────────────────────────────────────────────
  // 7. Navigation & Init
  // ────────────────────────────────────────────────
  function init() {
    state = loadState();
    state = window.LearningModule.initLearning(state);
    saveState();
    

    // Router
    window.addEventListener("hashchange", renderCurrentRoute);
    renderCurrentRoute();

    // Tab-Navigation (aus index.html)
    document.querySelectorAll(".tab-item").forEach(tab => {
      tab.onclick = () => {
        const path = tab.dataset.route;
        navigate(path);
      };
    });

    // Service Worker (PWA)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registered", reg))
        .catch(err => console.warn("Service Worker failed", err));
    }

    // Beispiel: Toast beim Start (entfernen wenn gewünscht)
    // setTimeout(() => toast("App geladen – viel Spaß beim Lernen!", 2200, "success"), 800);
  }

  document.addEventListener("DOMContentLoaded", init);

})();
