/* =====================================
   Content Engine + Generator
   ===================================== */

const _packs = [];
let _activePacks = new Set();
let _cacheCards = [];

export function registerPack(pack) {
  _packs.push(pack);
  if (pack.enabledByDefault) _activePacks.add(pack.key);
}

export function getPacks() {
  return _packs.map(p => ({
    key: p.key,
    name: p.name,
    enabled: _activePacks.has(p.key)
  }));
}

export function togglePack(key) {
  if (_activePacks.has(key)) _activePacks.delete(key);
  else _activePacks.add(key);
  _cacheCards = [];
}

export function getAllCards(limit = 4000) {
  if (_cacheCards.length) return _cacheCards;

  const banks = {};
  let templates = [];

  _packs.forEach(p => {
    if (_activePacks.has(p.key)) {
      Object.assign(banks, p.BANK);
      templates = templates.concat(p.TEMPLATES);
    }
  });

  const out = [];
  const seen = new Set();
  let attempts = 0;
  const MAX = limit * 80;

  while (out.length < limit && attempts < MAX) {
    attempts++;
    const t = pick(templates);
    const pt = t.pt();
    const norm = normalize(pt);
    if (seen.has(norm)) continue;
    seen.add(norm);

    out.push({
      id: crypto.randomUUID(),
      topic: t.topic,
      cefr: t.cefr,
      skill: t.skill,
      pt,
      de: t.de,
      forms: t.forms || [],
      tags: t.tags || []
    });
  }

  _cacheCards = out;
  return out;
}

/* ---------- Utils ---------- */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function normalize(s) {
  return s.toLowerCase().replace(/[^\wáéíóúãõçàâêô ]+/g,"").trim();
}