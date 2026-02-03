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
