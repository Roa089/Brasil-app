/* =====================================
   Importer 2.0
   Schema + CSV + Lines + Auto-Tagging
   ===================================== */

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1"];
const SKILLS = ["greeting", "asking", "answering", "describing", "narrating", "negotiating", "formal", "opinion"];

export function parseImport(text, defaults = {}) {
  const raw = (text || "").trim();
  if (!raw) return [];

  // Try Schema format first (TOPIC/CEFR/SKILL/PT/DE...)
  const schemaCards = parseSchema(raw, defaults);
  if (schemaCards.length) return dedupe(schemaCards);

  // Try CSV
  const csvCards = parseCSV(raw, defaults);
  if (csvCards.length) return dedupe(csvCards);

  // Fallback: one line = PT
  const lineCards = parseLines(raw, defaults);
  return dedupe(lineCards);
}

/* ---------- Schema Parser ---------- */
function parseSchema(text, defaults) {
  const blocks = splitBlocks(text);
  const cards = [];

  for (const block of blocks) {
    const obj = {};
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();

      obj[key] = val;
    }

    const pt = (obj.PT || "").trim();
    if (!pt) continue;

    const topic = normTopic(obj.TOPIC || defaults.topic || "alltag");
    const cefr = normCefr(obj.CEFR || defaults.cefr || "A1");
    const skill = normSkill(obj.SKILL || defaults.skill || guessSkill(pt, topic));
    const de = (obj.DE || defaults.de || "AI-Import").trim();

    const forms = splitPipe(obj.FORMS || "");
    const tags = mergeTags(splitPipe(obj.TAGS || ""), autoTags(pt, topic, cefr, skill));

    cards.push(makeCard({
      topic, cefr, skill, pt, de, forms, tags
    }));
  }

  return cards;
}

function splitBlocks(text) {
  // blocks separated by lines with --- (one or more dashes)
  const parts = text.split(/\n-{3,}\n/g).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

/* ---------- CSV Parser ---------- */
function parseCSV(text, defaults) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // accept separator ; or ,
  const sep = lines[0].includes(";") ? ";" : (lines[0].includes(",") ? "," : null);
  if (!sep) return [];

  const cards = [];
  for (const line of lines) {
    const cols = splitCSVLine(line, sep);
    if (cols.length < 2) continue;

    const pt = (cols[0] || "").trim();
    const de = (cols[1] || "").trim() || "AI-Import";
    if (!pt) continue;

    const topic = normTopic((cols[2] || defaults.topic || "alltag").trim());
    const cefr = normCefr((cols[3] || defaults.cefr || "A1").trim());
    const skill = normSkill((cols[4] || defaults.skill || guessSkill(pt, topic)).trim());
    const forms = splitPipe((cols[5] || "").trim());
    const tags = autoTags(pt, topic, cefr, skill);

    cards.push(makeCard({ topic, cefr, skill, pt, de, forms, tags }));
  }
  return cards;
}

function splitCSVLine(line, sep) {
  // minimal CSV splitting with quoted values
  const out = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && ch === sep) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/* ---------- Lines Parser ---------- */
function parseLines(text, defaults) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const topic = normTopic(defaults.topic || "alltag");
  const cefr = normCefr(defaults.cefr || "A1");
  const skillDefault = defaults.skill || "";

  const cards = [];
  for (const l of lines) {
    if (!l) continue;
    if (/^-{3,}$/.test(l)) continue;
    if (/^(TOPIC|CEFR|SKILL|PT|DE|FORMS|TAGS)\s*:/i.test(l)) continue;

    const pt = l;
    const skill = normSkill(skillDefault || guessSkill(pt, topic));
    const tags = autoTags(pt, topic, cefr, skill);
    cards.push(makeCard({ topic, cefr, skill, pt, de: "AI-Import", forms: [], tags }));
  }
  return cards;
}

/* ---------- Auto-Tagging ---------- */
function autoTags(pt, topic, cefr, skill) {
  const s = normalize(pt);

  const tags = [];
  tags.push(`topic:${topic}`);
  tags.push(`cefr:${cefr}`);
  tags.push(`skill:${skill}`);

  // Question
  if (pt.includes("?") || /\b(onde|como|quanto|quando|por que|porque|qual|quais)\b/.test(s)) tags.push("is:question");

  // Polite / request
  if (/\b(por favor|por gentileza|poderia|pode|tem como|seria possível|gostaria)\b/.test(s)) tags.push("tone:polite");

  // Negation
  if (/\b(não|nunca|nem)\b/.test(s)) tags.push("is:negation");

  // Time hints
  if (/\b(hoje|amanhã|ontem|agora|mais tarde|de manhã|à noite|semana|mês)\b/.test(s)) tags.push("has:time");

  // Modality
  if (/\b(preciso|tenho que|devo|posso|consigo|quero|pretendo)\b/.test(s)) tags.push("has:modal");

  // Greetings
  if (/\b(oi|olá|bom dia|boa tarde|boa noite|tchau)\b/.test(s)) tags.push("is:greeting");

  // Numbers/money
  if (/\b(r\$|\d+|quanto custa|preço|taxa|fatura)\b/.test(s)) tags.push("has:money");

  return tags;
}

/* ---------- Skill Guess ---------- */
function guessSkill(pt, topic) {
  const s = normalize(pt);

  if (/\b(oi|olá|bom dia|boa tarde|boa noite|tchau)\b/.test(s)) return "greeting";
  if (pt.includes("?")) return "asking";
  if (/\b(eu acho|na minha opinião|depende|por um lado|por outro lado)\b/.test(s)) return "opinion";
  if (/\b(venho|gostaria|solicitar|atenciosamente|fico no aguardo)\b/.test(s)) return "formal";
  if (/\b(ontem|semana passada|depois|aí|no fim|quando)\b/.test(s)) return "narrating";
  if (/\b(pode ser|dá pra|tem como|mais barato|desconto|renegociar)\b/.test(s)) return "negotiating";
  return "describing";
}

/* ---------- Normalize Helpers ---------- */
function normTopic(topic) {
  const t = (topic || "").trim().toLowerCase();
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "") || "alltag";
}

function normCefr(cefr) {
  const c = (cefr || "").toUpperCase().trim();
  if (CEFR_ORDER.includes(c)) return c;
  // allow ranges like "A1-A2" -> pick first
  const m = c.match(/(A1|A2|B1|B2|C1)/);
  return m ? m[1] : "A1";
}

function normSkill(skill) {
  const s = (skill || "").toLowerCase().trim();
  if (!s) return "describing";
  const map = {
    greet: "greeting",
    greeting: "greeting",
    ask: "asking",
    asking: "asking",
    answer: "answering",
    answering: "answering",
    describe: "describing",
    describing: "describing",
    narrate: "narrating",
    narrating: "narrating",
    negotiate: "negotiating",
    negotiating: "negotiating",
    formal: "formal",
    opinion: "opinion"
  };
  const out = map[s] || s;
  return SKILLS.includes(out) ? out : "describing";
}

function splitPipe(s) {
  return (s || "")
    .split("|")
    .map(x => x.trim())
    .filter(Boolean);
}

function mergeTags(tagsA, tagsB) {
  const set = new Set([...(tagsA || []), ...(tagsB || [])].map(t => t.trim()).filter(Boolean));
  return Array.from(set);
}

/* ---------- Card Factory ---------- */
function makeCard({ topic, cefr, skill, pt, de, forms = [], tags = [] }) {
  return {
    id: stableId(topic, cefr, skill, pt, de),
    topic,
    cefr,
    skill,
    pt: (pt || "").trim(),
    de: (de || "").trim(),
    forms,
    tags
  };
}

function stableId(topic, cefr, skill, pt, de) {
  // deterministic hash-like id
  const str = `${topic}|${cefr}|${skill}|${pt}|${de}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `imp_${(h >>> 0).toString(16)}`;
}

/* ---------- Dedupe ---------- */
function dedupe(cards) {
  const out = [];
  const seen = new Set();

  for (const c of cards) {
    const key = normalize(c.pt);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
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