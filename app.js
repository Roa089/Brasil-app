// =========================================================
// NotifyMindFit – PT-BR Lern-App (Version 4.0 – Router + State + UI Utils)
// Neues Grundgerüst – Februar 2026
// =========================================================

(() => {
  // ────────────────────────────────────────────────
  // 1. Konstanten & Config
  // ────────────────────────────────────────────────
  const APP_VERSION     = "4.0.0";
  const STORAGE_KEY     = "notifyMindFit_v4";
  const STORAGE_VERSION = 1; // erhöhen bei Breaking Changes

  const ROUTES = [
    { path: "",          title: "Home",    render: renderHome    },
    { path: "learn",     title: "Lernen",  render: renderLearn   },
    { path: "speak",     title: "Sprechen",render: renderSpeak   },
    { path: "import",    title: "Import",  render: renderImport  },
    { path: "stats",     title: "Statistik",render: renderStats  },
    { path: "settings",  title: "Einstellungen", render: renderSettings }
  ];

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
        darkMode: false,
        activeTopics: ["smalltalk", "wetter", "essen"],
        dailyGoal: 20,
      },
      progress: {},       // cardId → { reps, ease, due, ... }
      favorites: [],      // cardIds
      history: [],        // { ts, type:"review", cardId, grade }
      importedCards: [],  // { id, pt, de, topic, tags?, ... }
      lastSync: 0,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const parsed = JSON.parse(raw);
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`State version mismatch: ${parsed.version} → migrating to ${STORAGE_VERSION}`);
        return migrateState(parsed);
      }
      return { ...defaultState(), ...parsed };
    } catch (err) {
      console.error("State load failed", err);
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
    // Stub – hier kommen später Migrationen rein
    console.log("Migration stub called – old version:", old.version);
    const next = { ...defaultState(), ...old };
    next.version = STORAGE_VERSION;
    return next;
  }

  // ────────────────────────────────────────────────
  // 3. Event Bus (Pub/Sub)
  // ────────────────────────────────────────────────
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, payload) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(payload); } catch (err) { console.error(`Event ${event} listener failed`, err); }
    });
  }

  // ────────────────────────────────────────────────
  // 4. UI Utilities (Toast, Modal, Sheet, Confirm)
  // ────────────────────────────────────────────────
  function createOverlay(className = "overlay") {
    const el = document.createElement("div");
    el.className = className;
    el.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:9998;
      display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;
    `;
    setTimeout(() => el.style.opacity = "1", 10);
    return el;
  }

  function toast(message, duration = 2800, type = "info") {
    const el = document.createElement("div");
    el.textContent = message;
    el.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#222; color:white; padding:12px 20px; border-radius:12px;
      z-index:10000; font-size:15px; max-width:90%; box-shadow:0 4px 12px rgba(0,0,0,0.4);
      opacity:0; transition:all 0.3s; white-space:pre-wrap;
    `;
    if (type === "success") el.style.background = "#0a7";
    if (type === "error")   el.style.background = "#c33";
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = "1", 50);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  function openModal(title, contentHTML, buttons = []) {
    const overlay = createOverlay();
    const modal = document.createElement("div");
    modal.style.cssText = `
      background:#fff; border-radius:16px; width:90%; max-width:420px; max-height:88vh;
      overflow-y:auto; box-shadow:0 10px 30px rgba(0,0,0,0.35); padding:20px;
      transform:scale(0.92); transition:transform 0.22s;
    `;
    modal.innerHTML = `
      <h2 style="margin:0 0 16px; font-size:20px;">${escapeHtml(title)}</h2>
      <div style="margin-bottom:20px;">${contentHTML}</div>
      <div style="display:flex; gap:12px; justify-content:flex-end;">
        ${buttons.map(b => `<button class="btn ${b.class||''}" data-action="${b.action||''}">${escapeHtml(b.label)}</button>`).join("")}
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => modal.style.transform = "scale(1)", 20);

    const close = () => {
      modal.style.transform = "scale(0.92)"; overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.onclick = e => { if (e.target === overlay) close(); };
    modal.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const btnObj = buttons.find(b => b.action === action);
        if (btnObj?.onClick) btnObj.onClick();
        close();
      };
    });

    return { close };
  }

  function openSheet(title, contentHTML, buttons = []) {
    const overlay = createOverlay("sheet-overlay");
    overlay.style.alignItems = "flex-end";
    const sheet = document.createElement("div");
    sheet.style.cssText = `
      background:#fff; border-radius:20px 20px 0 0; width:100%; max-height:92vh;
      overflow-y:auto; box-shadow:0 -6px 20px rgba(0,0,0,0.25); padding:20px 20px 34px;
      transform:translateY(100%); transition:transform 0.28s cubic-bezier(0.32,0,0.12,1);
    `;
    sheet.innerHTML = `
      <div style="height:4px; width:36px; background:#ccc; border-radius:2px; margin:0 auto 16px;"></div>
      <h2 style="margin:0 0 16px; font-size:19px; text-align:center;">${escapeHtml(title)}</h2>
      ${contentHTML}
      <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
        ${buttons.map(b => `<button class="btn ${b.class||'primary'} full" data-action="${b.action||''}">${escapeHtml(b.label)}</button>`).join("")}
      </div>
    `;
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    setTimeout(() => sheet.style.transform = "translateY(0)", 20);

    const close = () => {
      sheet.style.transform = "translateY(100%)";
      setTimeout(() => overlay.remove(), 380);
    };

    overlay.onclick = e => { if (e.target === overlay) close(); };

    sheet.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const btnObj = buttons.find(b => b.action === action);
        if (btnObj?.onClick) btnObj.onClick(close);
        else close();
      };
    });

    return { close };
  }

  function confirmSheet(message, yesLabel = "Ja", noLabel = "Nein") {
    return new Promise(resolve => {
      openSheet("Bestätigung", `<p style="margin:8px 0 20px; text-align:center;">${escapeHtml(message)}</p>`, [
        { label: yesLabel, class: "primary", action: "yes", onClick: () => resolve(true)  },
        { label: noLabel,  class: "",        action: "no",  onClick: () => resolve(false) }
      ]);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  // ────────────────────────────────────────────────
  // 5. Simple Hash Router
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
    document.title = "NotifyMindFit – " + route.title;

    const $content = document.getElementById("content");
    if (!$content) {
      console.error("Kein #content gefunden");
      return;
    }

    $content.innerHTML = "";
    route.render($content);
    emit("route:changed", { path: route.path, title: route.title });
  }

  // ────────────────────────────────────────────────
  // 6. Platzhalter-Render-Funktionen (später ersetzen)
  // ────────────────────────────────────────────────
  function renderHome(root) {
    root.innerHTML = `
      <div class="card">
        <h1 class="title">Willkommen bei NotifyMindFit 4.0</h1>
        <p>Heute ist ein guter Tag, um Portugiesisch zu lernen.</p>
        <div style="margin:24px 0; display:flex; flex-wrap:wrap; gap:12px;">
          <button class="btn primary" data-nav="learn">Jetzt lernen</button>
          <button class="btn" data-nav="stats">Statistik</button>
        </div>
      </div>
    `;
    root.querySelectorAll("[data-nav]").forEach(el => {
      el.onclick = () => navigate(el.dataset.nav);
    });
  }

  function renderLearn(root) {
    root.innerHTML = `<div class="card"><h1 class="title">Lernmodus</h1><p>(Platzhalter – Deck-Auswahl & Karten kommen hierher)</p></div>`;
  }

  function renderSpeak(root) {
    root.innerHTML = `<div class="card"><h1 class="title">Sprechen üben</h1><p>(Roleplays, Story-Teller, TTS-Feedback …)</p></div>`;
  }

  function renderImport(root) {
    root.innerHTML = `<div class="card"><h1 class="title">AI-Import</h1><p>ChatGPT-Ausgabe hier einfügen …</p></div>`;
  }

  function renderStats(root) {
    root.innerHTML = `<div class="card"><h1 class="title">Statistik</h1><p>Streak, Kartenanzahl, Fortschritt …</p></div>`;
  }

  function renderSettings(root) {
    root.innerHTML = `<div class="card"><h1 class="title">Einstellungen</h1><p>Themen, TTS, Dark Mode, Reset …</p></div>`;
  }

  // ────────────────────────────────────────────────
  // 7. Navigation & Init
  // ────────────────────────────────────────────────
  function initNavigation() {
    // Bottom Tab Bar (kann später schöner werden)
    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.innerHTML = `
      <div style="position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid #ddd; z-index:100; display:flex; justify-content:space-around; padding:8px 0;">
        ${ROUTES.map(r => `
          <button class="btn tab-btn" data-path="${r.path}" style="flex:1; padding:10px 4px; font-size:13px;">
            ${r.title}
          </button>
        `).join("")}
      </div>
    `;
    document.body.appendChild(nav);

    nav.querySelectorAll(".tab-btn").forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.path);
    });

    // aktiven Tab highlighten
    on("route:changed", ({ path }) => {
      nav.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.path === path);
      });
    });
  }

  function init() {
    state = loadState();
    saveState(); // ggf. migriert / defaults gesetzt

    // Shell sicherstellen
    if (!document.getElementById("content")) {
      const div = document.createElement("div");
      div.id = "content";
      document.body.appendChild(div);
    }

    // Styles (minimal – erweitern!)
    const style = document.createElement("style");
    style.textContent = `
      :root { --bg:#fff; --text:#111; --border:#ddd; --primary:#0066cc; }
      body { margin:0; font-family:system-ui, sans-serif; background:var(--bg); color:var(--text); }
      #content { padding:16px; padding-bottom:80px; }
      .card { border:1px solid var(--border); border-radius:16px; padding:20px; background:#fff; margin-bottom:16px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
      .title { margin:0 0 16px; font-size:22px; font-weight:700; }
      .btn { padding:10px 16px; border:1px solid #ccc; border-radius:12px; background:#f8f8f8; cursor:pointer; }
      .btn.primary { background:var(--primary); color:white; border-color:var(--primary); }
      .btn.full { width:100%; }
      .tab-btn.active { font-weight:bold; color:var(--primary); }
      .bottom-nav { box-shadow:0 -2px 10px rgba(0,0,0,0.1); }
    `;
    document.head.appendChild(style);

    // Router starten
    window.addEventListener("hashchange", renderCurrentRoute);
    renderCurrentRoute();
    initNavigation();

    // Optional: Service Worker
    // if ("serviceWorker" in navigator) {
    //   navigator.serviceWorker.register("/sw.js").catch(console.warn);
    // }

    // Beispiel: globaler Event
    // on("card:reviewed", data => console.log("Karte bewertet:", data));
  }

  // ────────────────────────────────────────────────
  // Start
  // ────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);

})();
