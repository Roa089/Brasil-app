/* ===============================
   PT-BR Trainer – App Core
   Router + State + UI Utilities
   =============================== */

(() => {
  const APP_VERSION = 1;
  const STORAGE_KEY = "ptbr_app_state_v1";

  /* ---------- Helpers ---------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------- Event Bus ---------- */
  const events = {};
  function on(event, handler) {
    (events[event] = events[event] || []).push(handler);
  }
  function emit(event, data) {
    (events[event] || []).forEach((h) => h(data));
  }

  /* ---------- State ---------- */
  function defaultState() {
    return {
      version: APP_VERSION,
      route: "home",
      user: { xp: 0, streak: 0 },
      settings: {
        darkMode: true
      },
      data: {}
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (parsed.version !== APP_VERSION) {
        return migrateState(parsed);
      }
      return parsed;
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function migrateState(oldState) {
    console.log("Migrating state…", oldState);
    return defaultState();
  }

  /* ---------- Router ---------- */
  const routes = ["home", "learn", "speak", "import", "stats", "settings"];

  function setRoute(route) {
    if (!routes.includes(route)) route = "home";
    state.route = route;
    saveState();
    render();
    updateTabbar();
  }

  function updateTabbar() {
    $$(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === state.route);
    });
  }

  /* ---------- UI Utilities ---------- */
  function toast(message, ms = 2000) {
    const root = $("#toast-root");
    root.innerHTML = `<div class="toast">${message}</div>`;
    setTimeout(() => (root.innerHTML = ""), ms);
  }

  function openModal(html) {
    const root = $("#modal-root");
    root.style.display = "block";
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal">${html}</div>
    `;
    root.querySelector(".modal-backdrop").onclick = closeModal;
  }

  function closeModal() {
    const root = $("#modal-root");
    root.style.display = "none";
    root.innerHTML = "";
  }

  function openSheet(html) {
    const root = $("#sheet-root");
    root.style.display = "block";
    root.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="sheet">${html}</div>
    `;
    root.querySelector(".modal-backdrop").onclick = closeSheet;
  }

  function closeSheet() {
    const root = $("#sheet-root");
    root.style.display = "none";
    root.innerHTML = "";
  }

  function confirmSheet(text, onYes) {
    openSheet(`
      <div class="title">Bestätigen</div>
      <p>${text}</p>
      <div class="row">
        <button class="btn primary" id="yesBtn">Ja</button>
        <button class="btn" id="noBtn">Nein</button>
      </div>
    `);
    $("#yesBtn").onclick = () => {
      closeSheet();
      onYes();
    };
    $("#noBtn").onclick = closeSheet;
  }

  /* ---------- Views ---------- */
  function viewHome() {
    return `
      <div class="card">
        <div class="title">🏠 Start</div>
        <p>Willkommen im PT-BR Trainer.</p>
        <p>XP: ${state.user.xp} • Streak: ${state.user.streak}</p>
        <button class="btn primary" id="demoToast">Toast testen</button>
      </div>
    `;
  }

  function viewLearn() {
    return `
      <div class="card">
        <div class="title">📚 Lernen</div>
        <p>Hier kommt deine Lernengine (Decks, Filter, Karten).</p>
      </div>
    `;
  }

  function viewSpeak() {
    return `
      <div class="card">
        <div class="title">🎤 Sprechen</div>
        <p>Shadowing & Speaking Mode kommen hier rein.</p>
      </div>
    `;
  }

  function viewImport() {
    return `
      <div class="card">
        <div class="title">⬇️ Import</div>
        <p>AI-Import & Parser kommen hier rein.</p>
      </div>
    `;
  }

  function viewStats() {
    return `
      <div class="card">
        <div class="title">📊 Stats</div>
        <p>Fortschritt, Charts, Mastery.</p>
      </div>
    `;
  }

  function viewSettings() {
    return `
      <div class="card">
        <div class="title">⚙️ Settings</div>
        <p>Einstellungen & Content Packs.</p>
        <button class="btn danger" id="resetApp">Reset App</button>
      </div>
    `;
  }

  /* ---------- Render ---------- */
  function render() {
    const app = $("#app");
    if (!app) return;

    let html = "";
    if (state.route === "home") html = viewHome();
    if (state.route === "learn") html = viewLearn();
    if (state.route === "speak") html = viewSpeak();
    if (state.route === "import") html = viewImport();
    if (state.route === "stats") html = viewStats();
    if (state.route === "settings") html = viewSettings();

    app.innerHTML = html;

    bindViewEvents();
  }

  function bindViewEvents() {
    const toastBtn = $("#demoToast");
    if (toastBtn) {
      toastBtn.onclick = () => toast("Hallo! Das ist ein Toast 👋");
    }

    const resetBtn = $("#resetApp");
    if (resetBtn) {
      resetBtn.onclick = () =>
        confirmSheet("Willst du wirklich alles zurücksetzen?", () => {
          localStorage.removeItem(STORAGE_KEY);
          state = defaultState();
          render();
          toast("App zurückgesetzt");
        });
    }
  }

  /* ---------- Init ---------- */
  function bindTabbar() {
    $$(".tab").forEach((btn) => {
      btn.onclick = () => setRoute(btn.dataset.route);
    });
  }

  function init() {
    bindTabbar();
    setRoute(state.route || "home");
  }

  document.addEventListener("DOMContentLoaded", init);

  /* ---------- Expose for modules ---------- */
  window.AppCore = {
    getState: () => state,
    setState: (s) => {
      state = s;
      saveState();
      render();
    },
    on,
    emit,
    toast,
    openModal,
    closeModal,
    openSheet,
    closeSheet,
    confirmSheet,
    setRoute
  };
})();