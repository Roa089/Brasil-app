/* =========================================================
   NotifyMindFit – PT-BR Lern-App (Version 3.0)
   Datei: app.js

   Ziel:
   - Riesige „KI-Datenbank“ ohne alles einzutippen:
     -> Template-/Kombi-Generator erzeugt HUNDERTE bis TAUSENDE Sätze/Phrasen
     -> plus „AI-Import“: du kopierst ChatGPT-Ausgaben rein, App macht daraus Karten
   - Keine „einzelnen Funktionen ändern“:
     -> Alles greift zentral auf getAllCards() zu (manuell + generiert + importiert)
   - Fokus: Smalltalk, Wetter, Urlaub, Essen, Geschehnisse
   - iPhone: läuft als GitHub Pages Webapp, „Zum Home-Bildschirm“ möglich

   Voraussetzungen in index.html (minimal):
   - <div id="content"></div>
   Optional:
   - Buttons mit IDs: btnHome, btnLearn, btnRoleplay, btnStory, btnImport, btnPrompts, btnStats
   Wenn sie fehlen, erzeugt app.js eine einfache Navigation automatisch.
========================================================= */

(() => {
  // -------------------------
  // Helpers
  // -------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const now = () => Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalize = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const makeId = (prefix, s) => {
    let h = 2166136261;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${prefix}_${(h >>> 0).toString(16)}`;
  };

  // simple TTS (BR voice if available)
  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis?.getVoices?.() || [];
      const br = voices.find((v) => /pt-BR/i.test(v.lang)) || voices.find((v) => /^pt/i.test(v.lang));
      if (br) u.voice = br;
      u.lang = br?.lang || "pt-BR";
      u.rate = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // -------------------------
  // UI Styles (inject)
  // -------------------------
  function ensureStyles() {
    if ($("#v3styles")) return;
    const style = document.createElement("style");
    style.id = "v3styles";
    style.textContent = `
      :root { --bd:#eaeaea; --bg:#fff; --tx:#111; --mut:rgba(0,0,0,.65); --pill:#f7f7f7; }
      body { color:var(--tx); }
      .nav { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 14px; }
      .btn { padding:10px 12px; border:1px solid var(--bd); background:var(--bg); border-radius:12px; cursor:pointer; }
      .btn.primary { border-color:#111; }
      .btn.good { border-color:#0a7; }
      .btn.warn { border-color:#b60; }
      .btn.danger { border-color:#b00; }
      .card { border:1px solid var(--bd); border-radius:16px; padding:14px; background:var(--bg); margin-bottom:12px; }
      .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      .grid { display:grid; grid-template-columns:1fr; gap:12px; }
      .pill { background:var(--pill); border:1px solid var(--bd); border-radius:999px; padding:6px 10px; font-size:12px; }
      .title { font-weight:800; font-size:18px; margin:0 0 10px; }
      .muted { color:var(--mut); }
      .pt { font-size:22px; font-weight:800; margin:0; }
      .de { font-size:15px; margin:8px 0 0; }
      .small { font-size:13px; }
      textarea, input, select { width:100%; border:1px solid var(--bd); border-radius:12px; padding:10px; font-size:14px; }
      hr { border:none; height:1px; background:var(--bd); margin:12px 0; }
      .kpi { display:flex; gap:10px; flex-wrap:wrap; }
      .kpi .box { border:1px solid var(--bd); border-radius:14px; padding:10px 12px; min-width:120px; background:var(--bg); }
      .kpi .num { font-size:18px; font-weight:900; }
      .kpi .lbl { font-size:12px; color:var(--mut); }
      .chip { border-radius:999px; padding:8px 10px; border:1px solid var(--bd); background:var(--bg); cursor:pointer; }
      .chip.on { border-color:#111; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    `;
    document.head.appendChild(style);
  }

  // -------------------------
  // Topics
  // -------------------------
const TOPICS = [
  { key: "smalltalk", label: "Smalltalk" },
  { key: "wetter", label: "Wetter" },
  { key: "urlaub", label: "Urlaub" },
  { key: "essen", label: "Essen" },
  { key: "geschehnisse", label: "Geschehnisse" },

  { key: "arbeit", label: "Arbeit" },
  { key: "freunde", label: "Freunde & Familie" },
  { key: "einkaufen", label: "Einkaufen" },
  { key: "arzt", label: "Arzt & Gesundheit" },
  { key: "notfall", label: "Notfall" },
  { key: "verkehr", label: "Unterwegs & Verkehr" },
  { key: "telefon", label: "Telefon & Nachrichten" },
  { key: "date", label: "Dating & Flirten" },
  { key: "behoerde", label: "Behörde & Formulare" },
  { key: "wohnung", label: "Wohnen & Reparaturen" },
  { key: "hobbys", label: "Hobbys & Sport" },
  { key: "meinung", label: "Meinung & Diskussion" },
  { key: "zeitformen", label: "Zeitformen & Erzählen" },
];

   const TOPIC_ICON = {
  smalltalk:"💬", wetter:"☀️", urlaub:"✈️", essen:"🍽️", geschehnisse:"🗞️",
  arbeit:"💼", freunde:"👥", einkaufen:"🛒", arzt:"🩺", notfall:"🚨",
  verkehr:"🚗", telefon:"📱", date:"❤️", behorde:"🏛️", wohnung:"🏠",
  hobbys:"🏃", meinung:"🧠", zeitformen:"⏳"
};

  // -------------------------
  // Base Cards (klein & sauber)
  // -------------------------
  // c(topic, pt, de, opts)
  const BASE_CARDS = [];
  function c(topic, pt, de, opts = {}) {
    BASE_CARDS.push({
      id: opts.id || makeId("base", `${topic}|${pt}|${de}`),
      topic,
      pt,
      de,
      tags: opts.tags || [topic],
      forms: opts.forms || [],
      exPT: opts.exPT || "",
      exDE: opts.exDE || "",
      level: opts.level || 1,
    });
  }

  // Core (handverlesen, wenige Zeilen)
  c("smalltalk", "Oi! Tudo bem?", "Hi! Alles gut?", { forms: ["E aí, tudo bem?", "Tudo certo?"], level: 1 });
  c("smalltalk", "Tudo sim, e você?", "Alles gut, und bei dir?", { forms: ["Tô bem, e você?"], level: 1 });
  c("smalltalk", "Qual é o seu nome?", "Wie heißt du?", { forms: ["Como você se chama?"], level: 1 });
  c("smalltalk", "Prazer!", "Freut mich!", { forms: ["Muito prazer!"], level: 1 });
  c("wetter", "Como tá o tempo aí?", "Wie ist das Wetter bei dir?", { forms: ["Que tempo está fazendo?"], level: 1 });
  c("wetter", "Tá chovendo.", "Es regnet.", { forms: ["Tá garoando.", "Parece que vai chover."], level: 1 });
  c("urlaub", "Você vai viajar nas férias?", "Fährst du in den Ferien weg?", { level: 1 });
  c("urlaub", "Quanto tempo você vai ficar?", "Wie lange bleibst du?", { forms: ["Por quanto tempo?"], level: 2 });
  c("essen", "Vamos comer fora hoje?", "Wollen wir heute auswärts essen?", { forms: ["Bora comer fora?"], level: 1 });
  c("essen", "Pode ser sem pimenta, por favor?", "Kann es ohne Chili sein, bitte?", { forms: ["Sem pimenta, por favor."], level: 2 });
  c("geschehnisse", "Você viu o que aconteceu?", "Hast du gesehen, was passiert ist?", { level: 2 });
  c("geschehnisse", "Que loucura!", "Was für ein Wahnsinn!", { forms: ["Que doideira!"], level: 2 });

  // -------------------------
  // "KI Datenbank" Generator (riesig, ohne eintippen)
  // -------------------------
  // Idee:
  // - Wir haben Wortbanken + Satz-Schablonen
  // - Daraus erzeugen wir viele, alltagstaugliche Phrasen
  // - Du kannst die Größe steuern (Default: 1200)
  const BANK = {
    starters: ["E aí", "Então", "Olha", "Na real", "Tipo", "Sinceramente", "Aliás"],
    soften: ["um pouco", "meio que", "bem", "pra caramba", "demais", "de boa"],
    reactions: ["Que legal!", "Que massa!", "Que bom!", "Nossa!", "Entendi."],
    connectors: ["porque", "só que", "então", "mas", "por isso", "aí"],
    times: ["hoje", "ontem", "amanhã", "essa semana", "no fim de semana", "agora", "mais tarde"],
    places: ["aqui", "por aqui", "lá", "na rua", "no centro", "em casa", "no trabalho", "na cidade"],
    people: ["eu", "você", "a gente", "meu amigo", "minha amiga"],
    weatherState: ["calor", "frio", "nublado", "ensolarado", "abafado", "ventando", "chovendo", "garoando"],
    weatherVerbs: ["tá", "tava", "vai ficar", "deve ficar", "costuma ficar"],
    travelVerbs: ["vou viajar", "tô planejando uma viagem", "tô de férias", "tô indo", "tô voltando", "cheguei"],
    travelPlaces: ["pra praia", "pro Nordeste", "pro centro", "pro hotel", "pro aeroporto", "pra Bahia", "pro Rio", "pra São Paulo"],
    foodWant: ["Eu queria", "Vou pedir", "Pra mim", "Me vê", "Eu vou querer"],
    foodItems: ["um café", "uma água com gás", "uma água sem gás", "um suco", "um pão de queijo", "um sanduíche", "o prato do dia", "uma salada"],
    foodExtras: ["sem açúcar", "com gelo", "sem gelo", "sem pimenta", "bem forte", "só um pouco"],
    events: ["foi corrido", "foi tranquilo", "deu tudo certo", "rolou uma coisa engraçada", "aconteceu uma situação chata", "tô na correria"],
  };

  const TEMPLATES = [
    // smalltalk
    { topic: "smalltalk", pt: () => `${pick(BANK.starters)}, tudo bem?`, de: "Smalltalk-Einstieg" },
    { topic: "smalltalk", pt: () => `${pick(BANK.reactions)} E você?`, de: "Reaktion + Rückfrage" },
    { topic: "smalltalk", pt: () => `Como foi ${pick(["seu dia", "seu fim de semana"])}?`, de: "Wie war dein Tag/WE?" },
    { topic: "smalltalk", pt: () => `O que você acha disso?`, de: "Was hältst du davon?" },
    { topic: "smalltalk", pt: () => `Bora tomar um café ${pick(["hoje", "qualquer dia", "mais tarde"])}?`, de: "Kaffee vorschlagen" },

    // wetter
    { topic: "wetter", pt: () => `${pick(["Hoje", "Agora", "De manhã"])} ${pick(BANK.weatherVerbs)} ${pick(BANK.weatherState)} ${pick(BANK.places)} ${pick(BANK.soften)}.`, de: "Wetter-Satz" },
    { topic: "wetter", pt: () => `Parece que vai chover ${pick(["mais tarde", "daqui a pouco", "hoje"])}.`, de: "Sieht nach Regen aus" },
    { topic: "wetter", pt: () => `Tá com cara de chuva. Melhor levar guarda-chuva.`, de: "Regen-Ankündigung" },

    // urlaub
    { topic: "urlaub", pt: () => `${pick(BANK.travelVerbs)} ${pick(BANK.times)} ${pick(BANK.travelPlaces)}.`, de: "Reise/Urlaub Aussage" },
    { topic: "urlaub", pt: () => `Quanto tempo você vai ficar ${pick(BANK.places)}?`, de: "Wie lange bleibst du?" },
    { topic: "urlaub", pt: () => `Você já foi ${pick(BANK.travelPlaces)}?`, de: "Warst du schon dort?" },

    // essen
    { topic: "essen", pt: () => `${pick(BANK.foodWant)} ${pick(BANK.foodItems)}, ${pick(BANK.foodExtras)}, por favor.`, de: "Bestellen" },
    { topic: "essen", pt: () => `Tá uma delícia!`, de: "Sehr lecker!" },
    { topic: "essen", pt: () => `A conta, por favor.`, de: "Die Rechnung bitte." },

    // geschehnisse
    { topic: "geschehnisse", pt: () => `${pick(BANK.times)} ${pick(BANK.events)}, ${pick(BANK.connectors)} ${pick(["faz parte", "passou", "tá tudo bem"])}.`, de: "Alltag/Geschehnisse" },
    { topic: "geschehnisse", pt: () => `Você viu o que aconteceu ${pick(["ontem", "hoje cedo", "essa semana"])}?`, de: "Hast du gesehen...?" },
    { topic: "geschehnisse", pt: () => `${pick(BANK.reactions)} Que loucura!`, de: "Reaktion" },
  ];

  function buildGeneratedCards(limit) {
    const out = [];
    const used = new Set();

    // Balanced topic generation
    const topicWeights = [
      "smalltalk","smalltalk","smalltalk",
      "wetter","wetter",
      "essen","essen",
      "urlaub","urlaub",
      "geschehnisse","geschehnisse"
    ];

    let attempts = 0;
    while (out.length < limit && attempts < limit * 20) {
      attempts++;
      const topic = pick(topicWeights);
      const tpl = pick(TEMPLATES.filter(t => t.topic === topic));
      const pt = tpl.pt();
      const key = normalize(pt);
      if (used.has(key)) continue;
      used.add(key);

      out.push({
        id: makeId("gen", `${topic}|${pt}`),
        topic,
        pt,
        de: tpl.de,
        tags: [topic, "gen"],
        forms: [],
        exPT: "",
        exDE: "",
        level: 1
      });
    }
    return out;
  }

  // -------------------------
  // Roleplays (A)
  // -------------------------
  const ROLEPLAYS = [
    {
      id: "rp_restaurant",
      title: "Restaurant: Bestellung + Sonderwunsch",
      topic: "essen",
      lines: [
        { who: "npc", pt: "Boa noite! Mesa pra quantas pessoas?" },
        { who: "you", hint: "Antworte z.B.: Mesa pra dois, por favor." },
        { who: "npc", pt: "Vocês vão querer beber alguma coisa?" },
        { who: "you", hint: "Bestell ein Getränk." },
        { who: "npc", pt: "E pra comer? O prato do dia tá ótimo." },
        { who: "you", hint: "Bestell Essen + Sonderwunsch (sem pimenta etc.)." },
        { who: "npc", pt: "Perfeito. Mais alguma coisa?" },
        { who: "you", hint: "Kurz: por enquanto é só." },
      ]
    },
    {
      id: "rp_hotel",
      title: "Hotel: Check-in + Wi-Fi",
      topic: "urlaub",
      lines: [
        { who: "npc", pt: "Oi! Tudo bem? Você tem reserva?" },
        { who: "you", hint: "Ja, ich habe reserviert." },
        { who: "npc", pt: "Qual é o seu nome, por favor?" },
        { who: "you", hint: "Name sagen." },
        { who: "npc", pt: "Precisa de alguma coisa?" },
        { who: "you", hint: "Nach Wi-Fi fragen." },
        { who: "npc", pt: "A senha do Wi-Fi é 'praia2026'." },
        { who: "you", hint: "Bedanken." },
      ]
    },
    {
      id: "rp_neighbors",
      title: "Nachbarn: Wetter + Wochenende",
      topic: "wetter",
      lines: [
        { who: "npc", pt: "E aí! Tudo bem?" },
        { who: "you", hint: "Kurz + Rückfrage." },
        { who: "npc", pt: "Nossa, hoje tá um calorão, né?" },
        { who: "you", hint: "Reagieren + eigener Satz." },
        { who: "npc", pt: "Vai fazer alguma coisa no fim de semana?" },
        { who: "you", hint: "Plan sagen." },
      ]
    }
  ];

  // -------------------------
  // Story Trainer (B)
  // -------------------------
  const STORY = [
    { id: "st_today", title: "Heute in 3 Sätzen", pt: "Conta como foi o seu dia em 3 frases." },
    { id: "st_yesterday", title: "Gestern – was war gut?", pt: "O que foi a melhor parte de ontem?" },
    { id: "st_tomorrow", title: "Morgen – Plan", pt: "O que você vai fazer amanhã?" },
    { id: "st_rolou", title: "„O que rolou?“", pt: "E aí, o que rolou hoje? (2–4 frases)" },
    { id: "st_weather_mood", title: "Wetter + Stimmung", pt: "Como tá o tempo e como você tá se sentindo?" },
  ];

  // -------------------------
  // Prompt Generator (D) - Copy/Paste (no API)
  // -------------------------
  const PROMPTS = {
    vocab: (topic) =>
      `Liste die wichtigsten, häufigsten Wörter und Redewendungen im brasilianischen Portugiesisch zum Thema "${topic}" (Alltagssprache). Pro Eintrag: PT-BR Phrase, deutsche Bedeutung, kurze Aussprachehilfe (für Deutschsprachige), 1 natürlicher Beispielsatz. Bitte 60 Einträge.`,
    roleplay: (title) =>
      `Rollenspiel auf brasilianischem Portugiesisch: ${title}. Du bist die andere Person. Pause nach jeder Zeile, damit ich antworte. Danach: verbessere meine Antwort in 2 natürlicheren Varianten (BR-PT) und erkläre kurz die wichtigsten Verbesserungen.`,
    story: (text) =>
      `Verbessere diesen Text in brasilianischem Portugiesisch: """${text}""". Gib 1) korrigierte Version 2) 2 natürlichere Varianten 3) 5 häufige Alternativphrasen, die Brasilianer dafür nutzen.`,
    importFormat: () =>
      `Gib mir 80 kurze, alltagstaugliche PT-BR Phrasen für Smalltalk/Wetter/Urlaub/Essen/Geschehnisse im Format:\nPT: ...\nDE: ...\n---\n(und wiederholen)`,
  };

  // -------------------------
  // State / Storage
  // -------------------------
  const STORAGE_KEY = "ptbr_app_v3";
  const DEFAULT_GEN_LIMIT = 1200; // "riesig", aber noch flott

  function defaultState() {
    return {
      createdAt: now(),
      genLimit: DEFAULT_GEN_LIMIT,
      activeTopics: TOPICS.map(t => t.key),
      // progress by cardId
      progress: {},
      // imported cards (user adds from AI)
      imported: [],
      // streak
      streak: 0,
      lastDay: null, // yyyy-mm-dd
      history: []
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      // merge defaults
      const d = defaultState();
      return { ...d, ...s, progress: s.progress || {}, imported: s.imported || [] };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function touchStreak() {
    const t = todayKey();
    if (state.lastDay === t) return;
    if (state.lastDay) {
      const prev = new Date(state.lastDay);
      const cur = new Date(t);
      const diff = Math.round((cur - prev) / DAY);
      state.streak = diff === 1 ? (state.streak + 1) : 1;
    } else {
      state.streak = 1;
    }
    state.lastDay = t;
    saveState();
  }

  // progress init
  function getP(id) {
    if (!state.progress[id]) {
      state.progress[id] = {
        reps: 0,
        lapses: 0,
        ease: 2.3,
        interval: 0, // days
        due: 0,
        fav: false
      };
    }
    return state.progress[id];
  }

  // -------------------------
  // Central Card Source (NO per-function edits needed)
  // -------------------------
  let _genCache = { limit: -1, cards: [] };

  function getGeneratedCards() {
    const limit = Math.max(0, Math.min(6000, Number(state.genLimit) || DEFAULT_GEN_LIMIT));
    if (_genCache.limit !== limit) {
      _genCache = { limit, cards: buildGeneratedCards(limit) };
    }
    return _genCache.cards;
  }

  function getAllCards() {
    const imported = (state.imported || []).map((x) => ({
      id: x.id,
      topic: x.topic,
      pt: x.pt,
      de: x.de,
      tags: x.tags || [x.topic, "import"],
      forms: x.forms || [],
      exPT: x.exPT || "",
      exDE: x.exDE || "",
      level: x.level || 1
    }));
    return [...BASE_CARDS, ...getGeneratedCards(), ...imported];
  }

  function topicLabel(key) {
    return TOPICS.find(t => t.key === key)?.label || key;
  }

  // -------------------------
  // Spaced repetition (simple SM2-ish)
  // grade: 0=again,1=hard,2=good,3=easy
  // -------------------------
  function schedule(id, grade) {
    const p = getP(id);
    p.reps += 1;

    // Update ease
    const q = [1, 3, 4, 5][grade];
    p.ease = Math.max(1.3, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    if (grade === 0) {
      p.lapses += 1;
      p.interval = 0;
      p.due = now(); // again today
    } else if (p.interval === 0) {
      p.interval = grade === 1 ? 1 : grade === 2 ? 2 : 3;
      p.due = now() + p.interval * DAY;
    } else {
      const mult = grade === 1 ? 0.9 : grade === 2 ? 1.1 : 1.35;
      p.interval = Math.max(1, Math.min(60, Math.round(p.interval * p.ease * mult)));
      p.due = now() + p.interval * DAY;
    }

    state.history.push({ ts: now(), type: "review", id, grade });
    saveState();
    touchStreak();
  }

  // -------------------------
  // Selection (due/new/search)
  // -------------------------
  function isTopicActive(topic) {
    return state.activeTopics.includes(topic);
  }

  function getDueCards({ onlyFav = false, query = "" } = {}) {
    const q = normalize(query);
    const all = getAllCards();
    const out = [];
    for (const card of all) {
      if (!isTopicActive(card.topic)) continue;
      const p = getP(card.id);
      if (onlyFav && !p.fav) continue;
      const due = (p.due || 0) <= now() && p.reps > 0;
      if (!due) continue;

      if (q) {
        const ok =
          normalize(card.pt).includes(q) ||
          normalize(card.de).includes(q) ||
          (card.tags || []).some(t => normalize(t).includes(q));
        if (!ok) continue;
      }
      out.push(card);
    }
    shuffle(out);
    return out;
  }

  function getNewCards({ limit = 40, query = "" } = {}) {
    const q = normalize(query);
    const all = getAllCards();
    const out = [];
    for (const card of all) {
      if (!isTopicActive(card.topic)) continue;
      const p = getP(card.id);
      if (p.reps > 0) continue; // unseen
      if (q) {
        const ok =
          normalize(card.pt).includes(q) ||
          normalize(card.de).includes(q) ||
          (card.tags || []).some(t => normalize(t).includes(q));
        if (!ok) continue;
      }
      out.push(card);
      if (out.length >= limit) break;
    }
    return out;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function stats() {
    const all = getAllCards();
    let seen = 0, due = 0, fav = 0;
    for (const c of all) {
      const p = getP(c.id);
      if (p.reps > 0) seen++;
      if ((p.due || 0) <= now() && p.reps > 0) due++;
      if (p.fav) fav++;
    }
    return {
      total: all.length,
      base: BASE_CARDS.length,
      gen: getGeneratedCards().length,
      imported: (state.imported || []).length,
      seen, due, fav, streak: state.streak
    };
  }

  // -------------------------
  // UI Shell / Navigation
  // -------------------------
  function ensureShell() {
    ensureStyles();
    let content = $("#content");
    if (!content) {
      content = document.createElement("div");
      content.id = "content";
      document.body.prepend(content);
    }

    // If user doesn't have nav buttons, create them.
    if (!$("#btnHome")) {
      const nav = document.createElement("div");
      nav.className = "nav";
      nav.innerHTML = `
        <button class="btn" id="btnHome">Start</button>
        <button class="btn primary" id="btnLearn">Lernen</button>
        <button class="btn" id="btnRoleplay">Rollenspiel</button>
        <button class="btn" id="btnStory">Erzählen</button>
        <button class="btn" id="btnImport">AI-Import</button>
        <button class="btn" id="btnPrompts">Prompts</button>
        <button class="btn" id="btnStats">Stats</button>
      `;
      content.before(nav);
    }

    $("#btnHome").onclick = showHome;
    $("#btnLearn").onclick = showLearn;
    $("#btnRoleplay").onclick = showRoleplay;
    $("#btnStory").onclick = showStory;
    $("#btnImport").onclick = showImport;
    $("#btnPrompts").onclick = showPrompts;
    $("#btnStats").onclick = showStats;
  }

  // Topic chips
  function renderTopicChips() {
    return TOPICS.map(t => {
      const on = state.activeTopics.includes(t.key);
      return `<button class="chip ${on ? "on" : ""}" data-topic="${t.key}">${escapeHtml(t.label)}</button>`;
    }).join("");
  }

  function bindTopicChips(root = document) {
    root.querySelectorAll(".chip[data-topic]").forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.topic;
        const idx = state.activeTopics.indexOf(key);
        if (idx >= 0) state.activeTopics.splice(idx, 1);
        else state.activeTopics.push(key);
        if (state.activeTopics.length === 0) state.activeTopics = ["smalltalk"];
        saveState();
        // rerender current view lightly: easiest go home
        showHome();
      };
    });
  }

  // -------------------------
  // Views
  // -------------------------
  let deck = [];
  let deckIdx = 0;
  let deckMode = "due"; // due | new

  function showHome() {
    touchStreak();
    const s = stats();
    $("#content").innerHTML = `
      <div class="grid">
        <div class="card">
          <div class="title">PT-BR Lern-App 3.0 – 1 Monat Einstieg (viel Input)</div>
          <div class="kpi">
            <div class="box"><div class="num">${s.total}</div><div class="lbl">Karten gesamt</div></div>
            <div class="box"><div class="num">${s.seen}</div><div class="lbl">gesehen</div></div>
            <div class="box"><div class="num">${s.due}</div><div class="lbl">fällig</div></div>
            <div class="box"><div class="num">${s.fav}</div><div class="lbl">Favoriten</div></div>
            <div class="box"><div class="num">${s.streak}</div><div class="lbl">Streak</div></div>
          </div>

          <hr>
          <div class="row">
            <button class="btn primary" id="startDue">Fällige Wiederholung</button>
            <button class="btn" id="startNew">Neue Karten (40)</button>
            <button class="btn" id="startNew80">Neue Karten (80)</button>
            <button class="btn" id="searchAll">Suche</button>
          </div>
        </div>

        <div class="card">
          <div class="title">Themenfokus</div>
          <div class="row" id="chips">${renderTopicChips()}</div>
          <div class="small muted" style="margin-top:8px;">Tippe Themen an/aus. Dein Lernen filtert automatisch.</div>
        </div>

        <div class="card">
          <div class="title">Riesige „KI-Datenbank“</div>
          <div class="small muted">
            Generator erzeugt automatisch viele Sätze. Du steuerst die Größe hier – ohne Code-Änderungen.
          </div>
          <div class="row" style="margin-top:10px;">
            <div style="flex:1; min-width:220px;">
              <div class="small muted">Generator-Größe (empfohlen 800–2500):</div>
              <input id="genLimit" type="number" min="0" max="6000" value="${escapeHtml(state.genLimit)}" />
            </div>
            <button class="btn" id="applyGen">Anwenden</button>
          </div>
          <div class="small muted" style="margin-top:8px;">Aktuell: Base ${s.base} • Gen ${s.gen} • Import ${s.imported}</div>
        </div>

        <div class="card">
          <div class="title">Reset</div>
          <div class="row">
            <button class="btn danger" id="resetAll">Alles löschen (Fortschritt + Import)</button>
          </div>
        </div>
      </div>
    `;

    bindTopicChips($("#content"));

    $("#startDue").onclick = () => startDeck("due");
    $("#startNew").onclick = () => startDeck("new", 40);
    $("#startNew80").onclick = () => startDeck("new", 80);
    $("#searchAll").onclick = () => showLearn({ openSearch: true });

    $("#applyGen").onclick = () => {
      const v = Number($("#genLimit").value || DEFAULT_GEN_LIMIT);
      state.genLimit = Math.max(0, Math.min(6000, v));
      saveState();
      _genCache.limit = -1; // refresh
      showHome();
    };

    $("#resetAll").onclick = () => {
      const ok = confirm("Wirklich alles löschen?");
      if (!ok) return;
      resetAll();
      _genCache.limit = -1;
      showHome();
    };
  }

  function showLearn({ openSearch = false } = {}) {
    const s = stats();
    $("#content").innerHTML = `
      <div class="card">
        <div class="title">Lernen</div>
        <div class="row">
          <button class="btn primary" id="dueBtn">Fällige</button>
          <button class="btn" id="newBtn">Neue (40)</button>
          <button class="btn" id="favDueBtn">Favoriten (fällig)</button>
          <button class="btn" id="browseBtn">Browser</button>
        </div>
        <hr>
        <div class="row">
          <input id="q" type="text" placeholder="Suche (PT/DE/Tags)…" />
          <button class="btn" id="qGo">Suchen</button>
          <button class="btn" id="qClear">Reset</button>
        </div>
        <div class="small muted" style="margin-top:8px;">Gesamt: ${s.total} • Fällig: ${s.due} • Streak: ${s.streak}</div>
        <hr>
        <div class="row" id="chips">${renderTopicChips()}</div>
      </div>

      <div class="card" id="resultsCard">
        <div class="title">Treffer</div>
        <div id="results" class="small muted">Nutze Suche oder starte ein Deck.</div>
      </div>
    `;

    bindTopicChips($("#content"));

    const runSearch = () => {
      const q = $("#q").value || "";
      const due = getDueCards({ query: q }).slice(0, 12);
      const fresh = getNewCards({ query: q, limit: 12 });
      const html = `
        <div class="small"><b>Fällig</b></div>
        ${due.length ? due.map(renderCardPreview).join("") : `<div class="small muted">—</div>`}
        <hr>
        <div class="small"><b>Neu</b></div>
        ${fresh.length ? fresh.map(renderCardPreview).join("") : `<div class="small muted">—</div>`}
      `;
      $("#results").innerHTML = html;
      bindPreviewActions();
    };

    const bindPreviewActions = () => {
      $$("button[data-open]").forEach(b => {
        b.onclick = () => openSingleCard(b.dataset.open);
      });
      $$("button[data-fav]").forEach(b => {
        b.onclick = () => {
          const id = b.dataset.fav;
          const p = getP(id);
          p.fav = !p.fav;
          saveState();
          runSearch();
        };
      });
      $$("button[data-tts]").forEach(b => {
        b.onclick = () => {
          const id = b.dataset.tts;
          const card = getAllCards().find(x => x.id === id);
          if (card) speak(card.pt);
        };
      });
    };

    $("#dueBtn").onclick = () => startDeck("due");
    $("#newBtn").onclick = () => startDeck("new", 40);
    $("#favDueBtn").onclick = () => startDeck("due", 999, { onlyFav: true });
    $("#browseBtn").onclick = runSearch;
    $("#qGo").onclick = runSearch;
    $("#qClear").onclick = () => { $("#q").value = ""; runSearch(); };

    if (openSearch) runSearch();
  }

  function renderCardPreview(card) {
    const p = getP(card.id);
    return `
      <div class="card" style="margin-top:10px;">
        <div class="row">
          <span class="pill">${escapeHtml(topicLabel(card.topic))}</span>
          <span class="pill">reps ${p.reps}</span>
          <span class="pill">${p.fav ? "★" : "☆"}</span>
        </div>
        <div class="pt" style="margin-top:8px;">${escapeHtml(card.pt)}</div>
        <div class="de">${escapeHtml(card.de)}</div>
        <div class="row" style="margin-top:10px;">
          <button class="btn" data-tts="${card.id}">🔊</button>
          <button class="btn" data-open="${card.id}">Öffnen</button>
          <button class="btn" data-fav="${card.id}">${p.fav ? "★ entfernen" : "☆ Favorit"}</button>
        </div>
      </div>
    `;
  }

  function openSingleCard(id) {
    const card = getAllCards().find(x => x.id === id);
    if (!card) return;
    const p = getP(id);

    $("#content").innerHTML = `
      <div class="card">
        <div class="row">
          <button class="btn" id="back">← Zurück</button>
          <button class="btn" id="tts">🔊</button>
          <button class="btn" id="fav">${p.fav ? "★ Favorit entfernen" : "☆ Favorit"}</button>
        </div>
      </div>

      <div class="card">
        <div class="row">
          <span class="pill">${escapeHtml(topicLabel(card.topic))}</span>
          <span class="pill">reps ${p.reps}</span>
          <span class="pill">due ${p.due ? new Date(p.due).toLocaleDateString() : "-"}</span>
        </div>

        <p class="pt" style="margin-top:10px;">${escapeHtml(card.pt)}</p>
        <p class="de">${escapeHtml(card.de)}</p>

        ${card.forms?.length ? `
          <hr>
          <div class="small"><b>Varianten</b></div>
          <div class="small">${card.forms.map(f => `• ${escapeHtml(f)}`).join("<br>")}</div>
        ` : ""}

        <hr>
        <div class="row">
          <button class="btn" id="g0">Nochmal</button>
          <button class="btn" id="g1">Schwer</button>
          <button class="btn primary" id="g2">Gut</button>
          <button class="btn" id="g3">Sehr leicht</button>
        </div>

        <div class="small muted" style="margin-top:10px;">
          Tipp: iPhone Diktat nutzen → laut sprechen, dann „Gut“ drücken.
        </div>
      </div>
    `;

    $("#back").onclick = () => showLearn({ openSearch: true });
    $("#tts").onclick = () => speak(card.pt);
    $("#fav").onclick = () => { p.fav = !p.fav; saveState(); openSingleCard(id); };

    $("#g0").onclick = () => { schedule(id, 0); openSingleCard(id); };
    $("#g1").onclick = () => { schedule(id, 1); openSingleCard(id); };
    $("#g2").onclick = () => { schedule(id, 2); openSingleCard(id); };
    $("#g3").onclick = () => { schedule(id, 3); openSingleCard(id); };
  }

  function startDeck(mode, newLimit = 40, opts = {}) {
    deckMode = mode;
    if (mode === "due") {
      deck = getDueCards({ onlyFav: !!opts.onlyFav, query: opts.query || "" });
    } else {
      deck = getNewCards({ limit: newLimit, query: opts.query || "" });
    }
    if (!deck.length) {
      alert(mode === "due" ? "Keine fälligen Karten." : "Keine neuen Karten (für diese Themen).");
      return;
    }
    deckIdx = 0;
    showDeckCard();
  }

  function showDeckCard() {
    const card = deck[deckIdx];
    if (!card) {
      alert("Deck fertig ✅");
      showHome();
      return;
    }
    const p = getP(card.id);

    $("#content").innerHTML = `
      <div class="card">
        <div class="row" style="justify-content:space-between;">
          <div><b>${deckMode === "due" ? "Wiederholung" : "Neue Karten"}</b> — ${deckIdx + 1}/${deck.length}</div>
          <div class="small muted">${escapeHtml(topicLabel(card.topic))}</div>
        </div>
        <div class="row" style="margin-top:10px;">
          <button class="btn" id="exit">Beenden</button>
          <button class="btn" id="tts">🔊</button>
          <button class="btn" id="fav">${p.fav ? "★" : "☆"} Favorit</button>
          <button class="btn" id="open">Details</button>
        </div>
      </div>

      <div class="card">
        <p class="pt">${escapeHtml(card.pt)}</p>
        <p class="de"><b>DE:</b> ${escapeHtml(card.de)}</p>

        ${card.forms?.length ? `
          <hr>
          <div class="small"><b>Sprechformen</b></div>
          <div class="small">${card.forms.map(f => `• ${escapeHtml(f)}`).join("<br>")}</div>
        ` : ""}

        <hr>
        <div class="row">
          <button class="btn" id="g0">Nochmal</button>
          <button class="btn" id="g1">Schwer</button>
          <button class="btn primary" id="g2">Gut</button>
          <button class="btn" id="g3">Sehr leicht</button>
        </div>

        <div class="small muted" style="margin-top:10px;">
          Mini-Regel: Wenn du den Satz laut sagen kannst → „Gut“ oder „Sehr leicht“.
        </div>
      </div>
    `;

    $("#exit").onclick = showHome;
    $("#tts").onclick = () => speak(card.pt);
    $("#fav").onclick = () => { p.fav = !p.fav; saveState(); showDeckCard(); };
    $("#open").onclick = () => openSingleCard(card.id);

    $("#g0").onclick = () => { schedule(card.id, 0); nextDeck(); };
    $("#g1").onclick = () => { schedule(card.id, 1); nextDeck(); };
    $("#g2").onclick = () => { schedule(card.id, 2); nextDeck(); };
    $("#g3").onclick = () => { schedule(card.id, 3); nextDeck(); };
  }

  function nextDeck() {
    deckIdx++;
    showDeckCard();
  }

  function showRoleplay() {
    $("#content").innerHTML = `
      <div class="card">
        <div class="title">🎭 Rollenspiel</div>
        <div class="row">
          <select id="rpSel">
            ${ROLEPLAYS.map(r => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join("")}
          </select>
          <button class="btn primary" id="rpStart">Start</button>
          <button class="btn" id="rpPrompt">Prompt (Tutor)</button>
        </div>
        <div class="small muted" style="margin-top:8px;">
          Ablauf: NPC sagt → du antwortest (Diktat) → nächste Zeile.
        </div>
      </div>
      <div id="rpArea"></div>
    `;

    const run = (rp) => {
      const area = $("#rpArea");
      let i = 0;
      const transcript = [];

      const render = () => {
        const line = rp.lines[i];
        if (!line) return done();

        if (line.who === "npc") {
          area.innerHTML = `
            <div class="card">
              <span class="pill">NPC</span>
              <p class="pt" style="margin-top:10px;">${escapeHtml(line.pt)}</p>
              <div class="row">
                <button class="btn" id="tts">🔊</button>
                <button class="btn primary" id="next">Ich antworte</button>
              </div>
            </div>
            ${renderTranscript(transcript)}
          `;
          $("#tts").onclick = () => speak(line.pt);
          $("#next").onclick = () => { transcript.push({ who: "NPC", text: line.pt }); i++; render(); };
        } else {
          area.innerHTML = `
            <div class="card">
              <span class="pill">DU</span>
              <div class="small muted" style="margin-top:8px;">${escapeHtml(line.hint || "")}</div>
              <textarea id="inp" rows="3" placeholder="Deine Antwort (Diktat)…"></textarea>
              <div class="row" style="margin-top:10px;">
                <button class="btn primary" id="send">Senden</button>
              </div>
            </div>
            ${renderTranscript(transcript)}
          `;
          $("#send").onclick = () => {
            const txt = $("#inp").value || "";
            transcript.push({ who: "DU", text: txt });
            i++;
            render();
          };
        }
      };

      const done = () => {
        area.innerHTML = `
          <div class="card">
            <div class="title">✅ Rollenspiel fertig</div>
            <div class="row">
              <button class="btn primary" id="again">Nochmal</button>
              <button class="btn" id="copy">Transcript kopieren</button>
            </div>
            <div class="small muted" style="margin-top:8px;">
              Tipp: Kopiere den Transcript und nutze „Prompts → Rollenspiel Tutor“, um Korrekturen zu bekommen.
            </div>
          </div>
          ${renderTranscript(transcript)}
        `;
        $("#again").onclick = () => run(rp);
        $("#copy").onclick = async () => {
          const t = transcript.map(x => `${x.who}: ${x.text}`).join("\n");
          try { await navigator.clipboard.writeText(t); alert("Kopiert ✅"); }
          catch { alert("Kopieren nicht möglich (iOS). Markiere manuell."); }
        };
      };

      render();
    };

    const getSelected = () => ROLEPLAYS.find(r => r.id === $("#rpSel").value) || ROLEPLAYS[0];

    $("#rpStart").onclick = () => run(getSelected());
    $("#rpPrompt").onclick = () => {
      const rp = getSelected();
      showPrompts({ preset: "roleplay", roleplayTitle: rp.title });
    };

    run(ROLEPLAYS[0]);
  }

  function renderTranscript(items) {
    if (!items.length) return "";
    return `
      <div class="card">
        <div class="small"><b>Transcript</b></div>
        <div class="small mono" style="margin-top:8px;">${items.map(x => `${escapeHtml(x.who)}: ${escapeHtml(x.text)}`).join("<br>")}</div>
      </div>
    `;
  }

  function showStory() {
    $("#content").innerHTML = `
      <div class="card">
        <div class="title">📝 Erzählen</div>
        <div class="row">
          <select id="stSel">
            ${STORY.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("")}
          </select>
          <button class="btn primary" id="stGo">Start</button>
          <button class="btn" id="stPrompt">Prompt (Verbessern)</button>
        </div>
        <div class="small muted" style="margin-top:8px;">Ziel: 2–4 Sätze locker erzählen. Danach als Import-Karten speichern (wenn du willst).</div>
      </div>

      <div class="card">
        <div id="stPromptLine" class="pt"></div>
        <div class="row" style="margin-top:10px;">
          <button class="btn" id="tts">🔊</button>
          <button class="btn" id="examples">Beispiele</button>
        </div>
        <textarea id="txt" rows="6" placeholder="Dein Text (PT-BR)…"></textarea>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="makeVariants">2 Varianten</button>
          <button class="btn" id="toImport">Als Karten speichern</button>
        </div>
        <div id="out" style="margin-top:10px;"></div>
      </div>
    `;

    const getSel = () => STORY.find(s => s.id === $("#stSel").value) || STORY[0];

    const render = () => {
      const p = getSel();
      $("#stPromptLine").innerHTML = escapeHtml(p.pt);
    };

    $("#stGo").onclick = () => { render(); };
    $("#tts").onclick = () => speak(getSel().pt);

    $("#examples").onclick = () => {
      const ex = [
        "Hoje foi corrido, mas deu tudo certo.",
        "De tarde choveu do nada e eu fiquei em casa.",
        "Agora tô de boa e vou descansar."
      ];
      $("#out").innerHTML = `<div class="small"><b>Beispiele:</b><br>• ${ex.map(escapeHtml).join("<br>• ")}</div>`;
    };

    $("#makeVariants").onclick = () => {
      const t = ($("#txt").value || "").trim();
      const v1 = t ? `Na real, ${t}` : "Na real, hoje foi tranquilo e eu tô de boa.";
      const v2 = t ? t.replace(/\bmas\b/gi, "só que") : "Hoje foi corrido, só que no fim deu tudo certo.";
      $("#out").innerHTML = `
        <div class="small"><b>Variante 1:</b> ${escapeHtml(v1)}</div>
        <div class="small" style="margin-top:8px;"><b>Variante 2:</b> ${escapeHtml(v2)}</div>
      `;
    };

    $("#stPrompt").onclick = () => {
      showPrompts({ preset: "story", storyText: $("#txt").value || "" });
    };

    $("#toImport").onclick = () => {
      const raw = ($("#txt").value || "").trim();
      if (!raw) return alert("Erst Text schreiben.");
      // split into sentences and import as cards
      const sentences = raw
        .split(/[\n]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 20);

      const added = [];
      for (const s of sentences) {
        const pt = s.replace(/\s+/g, " ").trim();
        if (!pt) continue;
        added.push({
          id: makeId("imp", `story|${pt}`),
          topic: "geschehnisse",
          pt,
          de: "Story (aus deinem Text)",
          tags: ["geschehnisse", "import", "story"],
          forms: [],
          level: 1
        });
      }
      if (!added.length) return alert("Keine Sätze gefunden.");

      // add unique
      const existing = new Set((state.imported || []).map(x => x.id));
      let n = 0;
      for (const a of added) {
        if (existing.has(a.id)) continue;
        state.imported.push(a);
        n++;
      }
      saveState();
      _genCache.limit = -1;
      alert(`${n} Karten gespeichert ✅`);
    };

    render();
  }

  function showImport() {
    const s = stats();
    $("#content").innerHTML = `
      <div class="card">
        <div class="title">AI-Import (riesiger Ausbau ohne Tippen)</div>
        <div class="small muted">
          Du kopierst z.B. ChatGPT-Antworten in folgendem Format. Die App macht daraus Karten.
        </div>
        <hr>
        <div class="small"><b>Format 1 (empfohlen):</b></div>
        <div class="small mono">
          PT: ...<br>
          DE: ...<br>
          ---<br>
          (wiederholen)
        </div>
        <hr>
        <div class="small"><b>Format 2 (schnell):</b> eine Zeile = eine PT-Phrase (DE wird automatisch „AI-Import“)</div>
      </div>

      <div class="card">
        <div class="row">
          <select id="impTopic">
            ${TOPICS.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join("")}
          </select>
          <button class="btn" id="impClear">Leeren</button>
          <button class="btn danger" id="impDeleteAll">Alle Import-Karten löschen</button>
        </div>
        <textarea id="impTxt" rows="12" placeholder="Hier einfügen…"></textarea>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="impParse">Importieren</button>
          <button class="btn" id="impPrompt">Prompt für Import erzeugen</button>
        </div>
        <div class="small muted" style="margin-top:10px;">Aktuell Import: ${s.imported} Karten</div>
      </div>
    `;

    $("#impClear").onclick = () => { $("#impTxt").value = ""; };
    $("#impPrompt").onclick = () => showPrompts({ preset: "import" });

    $("#impDeleteAll").onclick = () => {
      const ok = confirm("Alle importierten Karten löschen?");
      if (!ok) return;
      state.imported = [];
      saveState();
      _genCache.limit = -1;
      showImport();
    };

    $("#impParse").onclick = () => {
      const topic = $("#impTopic").value || "smalltalk";
      const raw = ($("#impTxt").value || "").trim();
      if (!raw) return alert("Nichts eingefügt.");

      const parsed = parseImport(raw, topic);
      if (!parsed.length) return alert("Konnte nichts erkennen. Nutze Format 1 oder 2.");

      const existing = new Set((state.imported || []).map(x => x.id));
      let added = 0;
      for (const card of parsed) {
        if (existing.has(card.id)) continue;
        state.imported.push(card);
        added++;
      }
      saveState();
      _genCache.limit = -1;
      alert(`${added} Karten importiert ✅`);
    };
  }

  function parseImport(text, topic) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length);
    const out = [];

    // Try Format 1 blocks
    // PT: ...
    // DE: ...
    // ---
    let i = 0;
    while (i < lines.length) {
      if (/^PT\s*:/i.test(lines[i])) {
        const pt = lines[i].replace(/^PT\s*:\s*/i, "").trim();
        let de = "AI-Import";
        if (i + 1 < lines.length && /^DE\s*:/i.test(lines[i + 1])) {
          de = lines[i + 1].replace(/^DE\s*:\s*/i, "").trim() || de;
          i += 2;
        } else {
          i += 1;
        }
        // skip optional separator
        if (i < lines.length && /^---+$/.test(lines[i])) i++;

        if (pt) {
          out.push({
            id: makeId("imp", `${topic}|${pt}|${de}`),
            topic,
            pt,
            de,
            tags: [topic, "import"],
            forms: [],
            level: 1
          });
        }
        continue;
      }
      i++;
    }

    if (out.length) return out;

    // Fallback Format 2: each line is PT
    for (const l of lines) {
      if (/^---+$/.test(l)) continue;
      if (/^DE\s*:/i.test(l) || /^PT\s*:/i.test(l)) continue;
      out.push({
        id: makeId("imp", `${topic}|${l}`),
        topic,
        pt: l,
        de: "AI-Import",
        tags: [topic, "import"],
        forms: [],
        level: 1
      });
    }
    return out;
  }

  function showPrompts(opts = {}) {
    const preset = opts.preset || "vocab";
    const roleplayTitle = opts.roleplayTitle || ROLEPLAYS[0].title;
    const storyText = opts.storyText || "";
    $("#content").innerHTML = `
      <div class="card">
        <div class="title">Prompts (Copy/Paste)</div>
        <div class="small muted">Kein API-Key. Prompt kopieren → ChatGPT → Antwort ggf. in AI-Import einfügen.</div>
        <hr>
        <div class="row">
          <select id="ptype">
            <option value="vocab">High-Frequency Vokabeln</option>
            <option value="roleplay">Rollenspiel Tutor</option>
            <option value="story">Text verbessern</option>
            <option value="import">Import-Liste erzeugen</option>
          </select>
          <button class="btn" id="build">Prompt erzeugen</button>
          <button class="btn primary" id="copy">Kopieren</button>
        </div>
        <div id="poptions" style="margin-top:12px;"></div>
        <textarea id="pout" rows="10" placeholder="Prompt erscheint hier…"></textarea>
      </div>
    `;

    $("#ptype").value = preset;
    const renderOptions = () => {
      const type = $("#ptype").value;
      if (type === "vocab") {
        $("#poptions").innerHTML = `
          <div class="small muted">Thema:</div>
          <select id="ptopic">
            ${TOPICS.map(t => `<option value="${t.label}">${escapeHtml(t.label)}</option>`).join("")}
          </select>
        `;
      } else if (type === "roleplay") {
        $("#poptions").innerHTML = `
          <div class="small muted">Szene:</div>
          <input id="prp" value="${escapeHtml(roleplayTitle)}">
        `;
      } else if (type === "story") {
        $("#poptions").innerHTML = `
          <div class="small muted">Text:</div>
          <textarea id="pstory" rows="5" placeholder="Text…">${escapeHtml(storyText)}</textarea>
        `;
      } else {
        $("#poptions").innerHTML = `<div class="small muted">Keine Optionen.</div>`;
      }
    };

    const buildPrompt = () => {
      const type = $("#ptype").value;
      let prompt = "";
      if (type === "vocab") prompt = PROMPTS.vocab($("#ptopic").value || "Smalltalk");
      if (type === "roleplay") prompt = PROMPTS.roleplay($("#prp").value || "Restaurant");
      if (type === "story") prompt = PROMPTS.story($("#pstory").value || "");
      if (type === "import") prompt = PROMPTS.importFormat();
      $("#pout").value = prompt;
    };

    $("#ptype").onchange = renderOptions;
    $("#build").onclick = buildPrompt;

    $("#copy").onclick = async () => {
      const txt = $("#pout").value || "";
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        alert("Kopiert ✅");
      } catch {
        const ta = $("#pout");
        ta.focus(); ta.select();
        alert("Bitte manuell kopieren (markiert).");
      }
    };

    renderOptions();
    buildPrompt();
  }

  function showStats() {
    const s = stats();
    // show top trouble cards
    const all = getAllCards();
    const trouble = all
      .map(c => ({ c, p: getP(c.id) }))
      .filter(x => x.p.reps >= 3)
      .sort((a, b) => (b.p.lapses - a.p.lapses))
      .slice(0, 12);

    $("#content").innerHTML = `
      <div class="card">
        <div class="title">Stats</div>
        <div class="kpi">
          <div class="box"><div class="num">${s.total}</div><div class="lbl">gesamt</div></div>
          <div class="box"><div class="num">${s.base}</div><div class="lbl">base</div></div>
          <div class="box"><div class="num">${s.gen}</div><div class="lbl">generator</div></div>
          <div class="box"><div class="num">${s.imported}</div><div class="lbl">import</div></div>
          <div class="box"><div class="num">${s.seen}</div><div class="lbl">gesehen</div></div>
          <div class="box"><div class="num">${s.due}</div><div class="lbl">fällig</div></div>
          <div class="box"><div class="num">${s.streak}</div><div class="lbl">streak</div></div>
        </div>
      </div>

      <div class="card">
        <div class="title">„Trouble Cards“ (meiste Fehler)</div>
        ${trouble.length ? trouble.map(x => `
          <div class="card" style="margin-top:10px;">
            <div class="row">
              <span class="pill">${escapeHtml(topicLabel(x.c.topic))}</span>
              <span class="pill">reps ${x.p.reps}</span>
              <span class="pill">lapses ${x.p.lapses}</span>
            </div>
            <div class="pt" style="margin-top:8px;">${escapeHtml(x.c.pt)}</div>
            <div class="de">${escapeHtml(x.c.de)}</div>
            <div class="row" style="margin-top:10px;">
              <button class="btn" data-tts="${x.c.id}">🔊</button>
              <button class="btn primary" data-open="${x.c.id}">Üben</button>
            </div>
          </div>
        `).join("") : `<div class="small muted">Noch keine Daten.</div>`}
      </div>
    `;

    $$("button[data-tts]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.tts;
        const c = getAllCards().find(x => x.id === id);
        if (c) speak(c.pt);
      };
    });
    $$("button[data-open]").forEach(b => {
      b.onclick = () => openSingleCard(b.dataset.open);
    });
  }

  // -------------------------
  // Init
  // -------------------------
  function init() {
    ensureShell();
    ensureStyles();
    touchStreak();

    // Warm up voices on iOS (sometimes needed)
    try { window.speechSynthesis?.getVoices?.(); } catch {}

    showHome();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
