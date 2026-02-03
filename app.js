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
