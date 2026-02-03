document.addEventListener("DOMContentLoaded", () => {
  // ---------- Einstellungen ----------
  const STORAGE_KEY = "brapp_v1_progress";
  const SETTINGS_KEY = "brapp_v1_settings";

  const DEFAULT_SETTINGS = {
    ttsEnabled: false,
    dailyNew: 25,
    dailyReview: 40,
    activeTopics: ["smalltalk", "wetter", "essen", "urlaub", "geschehnisse"]
  };

  // ---------- Daten: Monat 1 Input (viel, alltagsnah, BR) ----------
  // Hinweis: "pron" ist eine einfache Aussprachehilfe für Deutschsprecher (nicht IPA).
  // "tags" steuern Filter.
  const CARDS = [
  // =====================
// C) MASSIVER INPUT-PACK (Template-basiert, erzeugt automatisch viele natürliche Sätze)
// =====================

// Kleine Helfer für deterministische IDs
function makeId(prefix, s) {
  // simple hash
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ${prefix}_${h.toString(16)};
}

const EXTRA_TEMPLATES = {
  smalltalk: {
    starters: ["E aí", "Então", "Aliás", "Na real", "Sinceramente", "Tipo assim"],
    opinions: ["eu acho que", "eu sinto que", "pra mim", "na minha opinião", "eu diria que"],
    topics: ["trabalho", "família", "viagem", "comida", "tempo", "fim de semana", "rotina", "notícias"],
    verbs: ["tá", "foi", "vai ser", "anda", "ficou", "tá ficando"],
    adj: ["legal", "tranquilo", "corrido", "complicado", "bom", "engraçado", "pesado", "de boa"],
  },
  wetter: {
    a: ["Hoje tá", "Agora tá", "De manhã tava", "De tarde deve ficar", "À noite costuma ficar"],
    b: ["calor", "frio", "nublado", "ensolarado", "abafado", "ventando", "chovendo", "garoando"],
    c: ["aqui", "por aqui", "na minha cidade", "na rua", "lá fora"],
    d: ["mesmo", "demais", "pra caramba", "um pouco", "bem de leve"],
  },
  essen: {
    want: ["Eu queria", "Eu vou querer", "Me vê", "Pra mim", "Vou pedir"],
    items: ["um café", "um suco de laranja", "uma água com gás", "uma água sem gás", "um pão de queijo", "o prato do dia", "um sanduíche", "uma salada"],
    extras: ["sem açúcar", "com gelo", "sem gelo", "sem pimenta", "bem forte", "só um pouquinho"],
    add: ["por favor", "rapidinho", "se der", "quando puder"],
    pay: ["A conta, por favor", "Pode dividir a conta?", "Cartão ou dinheiro?"],
  },
  urlaub: {
    travel: ["Cheguei", "Vou ficar", "Tô indo", "Tô voltando", "Tô de férias"],
    when: ["ontem", "hoje", "amanhã", "essa semana", "no fim de semana"],
    place: ["na praia", "no centro", "no hotel", "no aeroporto", "no mercado", "na cidade"],
    ask: ["Como eu chego", "É longe", "Dá pra ir a pé", "Quanto custa", "Que horas abre"],
  },
  geschehnisse: {
    open: ["Hoje", "Ontem", "Essa semana", "No trabalho", "Em casa"],
    happened: ["foi corrido", "foi tranquilo", "deu tudo certo", "deu ruim", "aconteceu uma coisa engraçada", "rolou uma situação chata"],
    reaction: ["mas faz parte", "então tá tudo bem", "e é isso", "pois é", "que loucura", "mas passou"],
  },
};

// Erzeugt viele zusätzliche Karten (hunderte), ohne dass du alles manuell tippst
function buildExtraCards() {
  const out = [];

  // Smalltalk: Starter + opinion + topic + adj
  for (const s of EXTRA_TEMPLATES.smalltalk.starters) {
    for (const o of EXTRA_TEMPLATES.smalltalk.opinions) {
      for (const t of EXTRA_TEMPLATES.smalltalk.topics) {
        const pt = ${s}, ${o} ${t} ${pick(EXTRA_TEMPLATES.smalltalk.verbs)} ${pick(EXTRA_TEMPLATES.smalltalk.adj)}.;
        out.push({ id: makeId("auto_smalltalk", pt), pt, pron: "", de: "Smalltalk-Variante (automatisch erzeugt)", tags: ["smalltalk","boost"] });
      }
    }
  }

  // Wetter: kombinieren
  for (const a of EXTRA_TEMPLATES.wetter.a) {
    for (const b of EXTRA_TEMPLATES.wetter.b) {
      for (const c of EXTRA_TEMPLATES.wetter.c) {
        const pt = ${a} ${b} ${c} ${pick(EXTRA_TEMPLATES.wetter.d)}.;
        out.push({ id: makeId("auto_wetter", pt), pt, pron: "", de: "Wetter-Satz (automatisch erzeugt)", tags: ["wetter","basis"] });
      }
    }
  }

  // Essen: Wunsch + Item + Extra + Add
  for (const w of EXTRA_TEMPLATES.essen.want) {
    for (const it of EXTRA_TEMPLATES.essen.items) {
      const pt = ${w} ${it}, ${pick(EXTRA_TEMPLATES.essen.extras)}, ${pick(EXTRA_TEMPLATES.essen.add)}.;
      out.push({ id: makeId("auto_essen", pt), pt, pron: "", de: "Bestell-Satz (automatisch erzeugt)", tags: ["essen","basis"] });
    }
  }

  // Urlaub: Aussagen + Fragen
  for (const tr of EXTRA_TEMPLATES.urlaub.travel) {
    for (const wh of EXTRA_TEMPLATES.urlaub.when) {
      for (const pl of EXTRA_TEMPLATES.urlaub.place) {
        const pt = ${tr} ${wh} ${pl}.;
        out.
  push({ id: makeId("auto_urlaub", pt), pt, pron: "", de: "Reise-Satz (automatisch erzeugt)", tags: ["urlaub","basis"] });
      }
    }
  }
  for (const ask of EXTRA_TEMPLATES.urlaub.ask) {
    for (const pl of EXTRA_TEMPLATES.urlaub.place) {
      const pt = ${ask} ${pl}?;
      out.push({ id: makeId("auto_urlaubq", pt), pt, pron: "", de: "Reise-Frage (automatisch erzeugt)", tags: ["urlaub","basis"] });
    }
  }

  // Geschehnisse: opener + happened + reaction
  for (const op of EXTRA_TEMPLATES.geschehnisse.open) {
    for (const h of EXTRA_TEMPLATES.geschehnisse.happened) {
      const pt = ${op} ${h}, ${pick(EXTRA_TEMPLATES.geschehnisse.reaction)}.;
      out.push({ id: makeId("auto_ges", pt), pt, pron: "", de: "Geschehnisse-Satz (automatisch erzeugt)", tags: ["geschehnisse","basis"] });
    }
  }

  // Begrenzen, damit es performant bleibt (du hast trotzdem sehr viel Input)
  return out.slice(0, 450);
}

const EXTRA_CARDS = buildExtraCards();

// Vereinheitlichung: überall dieselbe Kartenquelle verwenden
function ALL_CARDS() {
  // Manuelle CARDS + automatisch erzeugte EXTRA_CARDS
 return ALL_CARDS().filter(card => {
  const st = getCardState(card.id);
  return st.stage !== "new" && st.due && st.due <= now;
});

// =====================
// A) ROLLSPIELE (Dialog-Engine)
// =====================
const ROLEPLAYS = [
  {
    id: "rp_restaurant_1",
    title: "Restaurant: Bestellung + Sonderwunsch",
    tags: ["essen","smalltalk"],
    scene: [
      { who: "npc", pt: "Boa noite! Mesa pra quantas pessoas?", hint: "Antwort: Zahl + bitte." },
      { who: "you", slot: true, key: "mesa" },
      { who: "npc", pt: "Perfeito. Vocês vão querer beber alguma coisa?", hint: "Bestell ein Getränk." },
      { who: "you", slot: true, key: "bebida" },
      { who: "npc", pt: "E pra comer? O prato do dia tá ótimo.", hint: "Bestell Essen + Sonderwunsch (sem pimenta, etc.)." },
      { who: "you", slot: true, key: "comida" },
      { who: "npc", pt: "Beleza. Mais alguma coisa?", hint: "Kurz: só isso / por enquanto." },
      { who: "you", slot: true, key: "fim" },
    ],
    suggestions: {
      mesa: ["Mesa pra dois, por favor.", "Uma mesa pra três, por favor."],
      bebida: ["Eu queria uma água com gás, por favor.", "Me vê um café sem açúcar, por favor."],
      comida: ["Vou pedir o prato do dia, sem pimenta, por favor.", "Eu queria um sanduíche, pode tirar a cebola?"],
      fim: ["Só isso, obrigado(a).", "Por enquanto é só, valeu!"],
    }
  },
  {
    id: "rp_hotel_1",
    title: "Hotel: Check-in + Wi-Fi",
    tags: ["urlaub","smalltalk"],
    scene: [
      { who: "npc", pt: "Oi! Tudo bem? Você tem reserva?", hint: "Sag: ja, ich habe reserviert." },
      { who: "you", slot: true, key: "reserva" },
      { who: "npc", pt: "Qual é o seu nome, por favor?", hint: "Name + ggf. sobrenome." },
      { who: "you", slot: true, key: "nome" },
      { who: "npc", pt: "Perfeito. Precisa de alguma coisa?", hint: "Wi-Fi Passwort fragen." },
      { who: "you", slot: true, key: "wifi" },
      { who: "npc", pt: "A senha é 'praia2026'. Mais alguma coisa?", hint: "Danke + fertig." },
      { who: "you", slot: true, key: "fim" },
    ],
    suggestions: {
      reserva: ["Sim, eu fiz uma reserva.", "Tenho sim, fiz a reserva ontem."],
      nome: ["Meu nome é Hans Müller.", "É Hans, Müller."],
      wifi: ["Qual é a senha do Wi-Fi, por favor?", "Você pode me passar a senha do Wi-Fi?"],
      fim: ["Obrigado(a)! Só isso.", "Perfeito, valeu!"],
    }
  },
  {
    id: "rp_smalltalk_neighbors",
    title: "Nachbarn: Wetter + Wochenende",
    tags: ["smalltalk","wetter"],
    scene: [
      { who: "npc", pt: "E aí! Tudo bem?", hint: "Kurz antworten + Rückfrage." },
      { who: "you", slot: true, key: "tudobem" },
      { who: "npc", pt: "Nossa, hoje tá um calorão, né?", hint: "Reagieren + eigene Info." },
      { who: "you", slot: true, key: "wetter" },
      { who: "npc", pt: "Vai fazer alguma coisa no fim de semana?", hint: "Plan sagen." },
      { who: "you", slot: true, key: "fds" },
      { who: "npc", pt: "Que legal! Bora marcar alguma coisa?", hint: "Termin vorschlagen." },
      { who: "you", slot: true, key: "marcar" },
    ],
    suggestions: {
      tudobem: ["Tudo certo! E você?", "Tô bem! E você, tudo bem?"],
      wetter: ["Tá quente pra caramba. Vou ficar mais em casa.", "Tá abafado hoje. Acho que vai chover mais tarde."],
      fds: ["Vou descansar e talvez ir pra um café.", "Vou dar uma volta e aproveitar o sol."],
      marcar: ["Bora! Umas oito tá bom?", "Sim! Vamos ver um horário amanhã."],
    }
  },
  {
    id: "rp_whatsapp_1",
    title: "WhatsApp: Kombi aus Smalltalk + Plan",
    tags: ["smalltalk","geschehnisse"],
    scene: [
      { who: "npc", pt: "E aí, sumido(a)! Como você tá?", hint: "Antwort + kurzer Status." },
      { who: "you", slot: true, key: "status" },
      { who: "npc", pt: "Top! O que rolou essa semana?", hint: "Kurz erzählen." },
      { who: "you", slot: true, key: "rolou" },
      { who: "npc", pt: "Bora tomar um café qualquer dia?", hint: "Termin vorschlagen." },
      { who: "you", slot: true, key: "cafe" },
    ],
    suggestions: {
      status: ["Tô bem! Foi corrido, mas tudo certo. E você?", "Tô de boa. E você?"],
      rolou: ["Trabalhei bastante e o tempo mudou do nada.", "Aconteceu uma coisa engraçada no trabalho."],
      cafe: ["Bora! Amanhã no fim da tarde?", "Pode ser! Umas oito tá bom?"],
    }
  },
];

// =====================
// B) ERZÄHL-TRAINER (Gestern/Heute/Morgen, „rolou“, Alltag)
// =====================
const STORY_PROMPTS = [
  { id:"st_1", title:"Heute in 3 Sätzen", pt:"Conta como foi o seu dia em 3 frases." },
  { id:"st_2", title:"Gestern – was war gut?", pt:"O que foi a melhor parte de ontem?" },
  { id:"st_3", title:"Morgen – Plan", pt:"O que você vai fazer amanhã?" },
  { id:"st_4", title:"E aí, o que rolou?", pt:"E aí, o que rolou hoje? (2–4 frases)" },
  { id:"st_5", title:"Wetter + Stimmung", pt:"Como tá o tempo e como você tá se sentindo?" },
  { id:"st_6", title:"Essen", pt:"O que você comeu hoje? Foi bom?" },
];

function storyExamples(kind) {
  const ex = {
    short: [
      "Hoje foi corrido, mas deu tudo certo.",
      "Tá calor e eu tô meio cansado(a).",
      "Vou dormir cedo hoje."
    ],
    medium: [
      "Hoje foi corrido no trabalho, mas no fim deu tudo certo.",
      "De tarde choveu do nada e eu fiquei preso no trânsito.",
      "Agora tô de boa e vou tomar um café."
    ],
    long: [
      "Hoje eu acordei cedo e já saí com pressa. No trabalho foi bem corrido, mas consegui resolver tudo.",
      "O tempo mudou do nada: começou a chover e ficou abafado. Mesmo assim, deu tudo certo.",
      "Agora eu tô mais tranquilo(a). Vou comer alguma coisa e descansar."
    ]
  };
  return ex[kind] || ex.short;
}

// =====================
// D) KI PROMPT GENERATOR (Copy/Paste statt API)
// =====================
const PROMPTS = {
  plan: (hours) => Erstelle einen 6-Monats-Plan für brasilianisches Portugiesisch, Ziel: fließende Alltagsgespräche. Ich lerne ${hours} Stunden/Woche. Fokus: Sprechen & Hören, reale Situationen (Smalltalk, Wetter, Urlaub, Geschehnisse, Essen). Kein unnötiges Lesen/Schreiben. Strukturiere nach Monaten und Wochenzielen.,
  vocab: (topic) => Liste die wichtigsten, häufigsten Wörter und Redewendungen im brasilianischen Portugiesisch zum Thema "${topic}" (Smalltalk/Wetter/Urlaub/Geschehnisse/Essen). Gib je Eintrag: PT-BR Phrase, deutsche Bedeutung, kurze Aussprachehilfe, 1 natürlicher Beispielsatz. Alltagssprache, nicht europäisches Portugiesisch.,
  speaking: () => Sprich mit mir in einfachem brasilianischem Portugiesisch. Stelle kurze Fragen. Warte auf meine Antwort. Korrigiere sie, formuliere sie natürlicher um und stelle eine leicht schwierigere Anschlussfrage.,
  roleplay: (scene) => Rollenspiel auf brasilianischem Portugiesisch: ${scene}. Pause nach jeder Zeile, damit ich antworte. Danach: verbessere meine Antwort zu natürlichem BR-PT (2 Varianten) und erkläre kurz, was daran besser klingt.,
  grammar: (sentence) => Erkläre nur die Grammatik, die nötig ist, um diesen Satz zu verstehen und selbst zu benutzen: "${sentence}". Zeige 2–3 wiederverwendbare Muster mit Beispielen. Keine Theorie.,
  reset: () => Teste mein gesprochenes brasilianisches Portugiesisch aus dieser Woche. Stelle Fragen mit den Sätzen, die ich gelernt habe. Identifiziere Schwächen (Wörter/Satzmuster) und baue daraus einen Plan für nächste Woche.
  function showDrills() {
  content.innerHTML = `
    <div class="card">
      <h2 style="margin:0 0 10px;">🗣 Drills – Sprechen & Alltag</h2>
      <div class="row">
        <button class="btn primary" id="goDrills">🎯 Schnell-Drills</button>
        <button class="btn" id="goRoleplay">🎭 Rollenspiel</button>
        <button class="btn" id="goStory">📝 Erzählen</button>
        <button class="btn" id="goPrompt">🤖 Prompt-Generator</button>
      </div>
      <div class="small" style="margin-top:8px;">
        Tipp: Auf iPhone fürs „Sprechen“ einfach Diktat (Mikrofon in der Tastatur) nutzen.
      </div>
    </div>

    <div id="drillArea"></div>
  `;

  const area = document.getElementById("drillArea");

  document.getElementById("goDrills").addEventListener("click", renderQuickDrills);
  document.getElementById("goRoleplay").addEventListener("click", showRoleplays);
  document.getElementById("goStory").addEventListener("click", showStoryTrainer);
  document.getElementById("goPrompt").addEventListener("click", showPromptGenerator);

  renderQuickDrills();

  function renderQuickDrills() {
    area.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 10px;">Drill 1: Mini-Smalltalk (Frage → Antwort → Rückfrage)</h3>
        <div class="row">
          <button class="btn primary" id="newMini">🎲 Neue Runde</button>
          <button class="btn" id="ttsMini">🔊 Frage</button>
        </div>
        <div id="miniArea" style="margin-top:12px;"></div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Drill 2: Wetter-Update in 3 Sätzen</h3>
        <div class="row">
          <button class="btn primary" id="wetterGo">▶️ Vorlage</button>
          <button class="btn" id="wetterSpeak">🔊 Vorlesen</button>
        </div>
        <div id="wetterArea" style="margin-top:12px;"></div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 10px;">Drill 3: Essen bestellen (Varianten)</h3>
        <div class="row">
          <button class="btn primary" id="foodGo">▶️ Bestellung</button>
          <button class="btn" id="foodSpeak">🔊 Vorlesen</button>
        </div>
        <div id="foodArea" style="margin-top:12px;"></div>
      </div>
    `;

    const miniArea = document.getElementById("miniArea");
    const wetterArea = document.getElementById("wetterArea");
    const foodArea = document.getElementById("foodArea");
    let currentMini = "Tudo bem?";

    const newMini = () => {
      const Q = pick([
        "Tudo bem?",
        "Como você tá hoje?",
        "E aí, tudo certo?",
        "Como tá o dia?",
        "O que você vai fazer hoje?"
      ]);
      const A = pick([
        "Tô bem! E você?",
        "Tô de boa. E você?",
        "Mais ou menos… e você?",
        "Tô cansado(a), mas tudo certo. E você?",
        "Tô animado(a)! E você?"
      ]);
      const U1 = variantize(A);
      const U2 = variantize(A);

      currentMini = Q;
      miniArea.innerHTML = `
        <p class="phrase"><b>Pergunta:</b> ${escapeHtml(Q)}</p>
        <textarea id="miniInput" rows="2" placeholder="Deine Antwort (oder Diktat)…"></textarea>
        <div class="row" style="margin-top:10px;">
          <button class="btn good" id="miniShow">✅ Varianten zeigen</button>
        </div>
        <div id="miniOut" style="margin-top:10px;"></div>
        <hr>
        <div class="small"><b>Beispiel-Antworten:</b><br>• ${escapeHtml(A)}<br>• ${escapeHtml(U1)}<br>• ${escapeHtml(U2)}</div>
      `;

      document.getElementById("miniShow").addEventListener("click", () => {
        const txt = document.getElementById("miniInput").value || "";
        document.getElementById("miniOut").innerHTML = `
          <div class="card" style="margin:0;">
            <div class="small">Dein Input:</div>
            <div><b>${escapeHtml(txt)}</b></div>
            <div class="small" style="margin-top:8px;">Ziel: kurz, locker, mit Rückfrage.</div>
          </div>
        `;
      });
    };

    const makeWetter = () => {const a = pick(["Hoje tá calor", "Hoje tá frio", "Tá nublado", "Tá ensolarado", "Tá chovendo", "Tá abafado"]);
      const b = pick(["A previsão é de chuva", "Acho que vai abrir", "O tempo tá mudando", "Vai chover mais tarde", "De noite esfria"]);
      const c = pick(["Vou levar um casaco", "Vou ficar mais em casa", "Bora dar uma volta mesmo assim", "Vou aproveitar pra caminhar", "Vou pedir uma comida"]);
      const text = ${a}. ${b}. ${c}.;
      wetterArea.innerHTML = <p class="phrase">${escapeHtml(text)}</p><div class="small">Aufgabe: sprich das laut 3×. Dann baue 1 eigene Variante.</div>;
      wetterArea.dataset.tts = text;
    };

    const makeFood = () => {
      const drink = pick(["um café", "um suco de laranja", "uma água com gás", "uma água sem gás"]);
      const extra = pick(["sem açúcar", "com gelo", "sem gelo", "bem forte", "só um pouquinho de açúcar", "sem pimenta, por favor"]);
      const food = pick(["um pão de queijo", "o prato do dia", "um sanduíche", "uma salada"]);
      const note = pick(["pode tirar a cebola?", "tem opção vegetariana?", "pra viagem, por favor", "pra comer aqui, por favor"]);
      const text = Eu queria ${drink}, ${extra}. E também ${food}. ${note}.;
      foodArea.innerHTML = <p class="phrase">${escapeHtml(text)}</p><div class="small">Aufgabe: sprich das laut 2× und ändere dann 2 Teile (Getränk + Extra).</div>;
      foodArea.dataset.tts = text;
    };

    document.getElementById("newMini").addEventListener("click", newMini);
    document.getElementById("ttsMini").addEventListener("click", () => speak(currentMini));
    document.getElementById("wetterGo").addEventListener("click", makeWetter);
    document.getElementById("wetterSpeak").addEventListener("click", () => speak(wetterArea.dataset.tts || "Hoje tá calor."));
    document.getElementById("foodGo").addEventListener("click", makeFood);
    document.getElementById("foodSpeak").addEventListener("click", () => speak(foodArea.dataset.tts || "Eu queria um café, por favor."));
    newMini();
  }
}
// =====================
// A) Rollenspiel Screen
// =====================
function showRoleplays() {
  content.innerHTML = `
    <div class="card">
      <h2 style="margin:0 0 10px;">🎭 Rollenspiel</h2>
      <div class="small">Du antwortest Zeile für Zeile. Nutze Diktat. Danach wählst du „Sitzt/Nochmal“ (SRS optional über Session).</div>
      <div class="row" style="margin-top:10px;">
        <select id="rpSelect">
          ${ROLEPLAYS.map(r => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join("")}
        </select>
        <button class="btn primary" id="rpStart">▶️ Start</button>
        <button class="btn" id="rpBack">⬅️ Zurück</button>
      </div>
    </div>
    <div id="rpArea"></div>
  `;

  document.getElementById("rpBack").addEventListener("click", () => showDrills());
  document.getElementById("rpStart").addEventListener("click", () => {
    const id = document.getElementById("rpSelect").value;
    const rp = ROLEPLAYS.find(x => x.id === id);
    runRoleplay(rp);
  });

  runRoleplay(ROLEPLAYS[0]);
}

function runRoleplay(rp) {
  const area = document.getElementById("rpArea");
  let step = 0;
  let transcript = [];

  const render = () => {
    const s = rp.scene[step];
    if (!s) return done();

    if (s.who === "npc") {
      area.innerHTML = `
        <div class="card">
          <div class="badge">NPC</div>
          <p class="phrase"><b>${escapeHtml(s.pt)}</b></p>
          <div class="row">
            <button class="btn" id="rpSpeak">🔊</button>
            <button class="btn primary" id="rpNext">➡️ Antworten</button>
          </div>
          <div class="small" style="margin-top:8px;">${escapeHtml(s.hint || "")}</div>
        </div>
        ${transcriptView(transcript)}
      `;
      document.getElementById("rpSpeak").addEventListener("click", () => speak(s.pt));
      document.getElementById("rpNext").addEventListener("click", () => { transcript.push({who:"npc", text:s.pt}); step++; render(); });
    } else {
      const sug = (rp.suggestions && rp.suggestions[s.key]) ? rp.suggestions[s.key] : [];
      area.innerHTML = `
        <div class="card">
          <div class="badge">DU</div>
          <textarea id="rpInput" rows="3" placeholder="Deine Antwort (Diktat) …"></textarea>
          <div class="row" style="margin-top:10px;">
            <button class="btn good" id="rpUseSug">👀 Vorschläge</button>
            <button class="btn primary" id="rpSend">➡️ Senden</button>
          </div>
          <div id="rpSug" style="margin-top:10px;"></div>
        </div>
        ${transcriptView(transcript)}
      `;
      document.getElementById("rpUseSug").addEventListener("click", () => {
        document.getElementById("rpSug").innerHTML = `
          <div class="card" style="margin:0;">
            <div class="small"><b>Natürliche Beispiele:</b></div>
            <div class="small" style="margin-top:6px;">${sug.map(x => `• ${escapeHtml(x)}`).join("<br>") || "—"}</div>
          </div>
        `;
      });
      document.getElementById("rpSend").addEventListener("click", () => {
        const txt = document.getElementById("rpInput").value || "";
        transcript.push({who:"you", text:txt});
        step++;
        render();
      });
    }
  };

  const done = () => {
    area.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 8px;">✅ Rollenspiel fertig</h3>
        <div class="small">Du kannst jetzt eine KI-Korrektur über den Prompt-Generator holen (Rollenspiel-Prompt), oder direkt das nächste Szenario starten.</div>
        <div class="row" style="margin-top:10px;">
          <button class="btn primary" id="rpAgain">🎭 Nochmal</button>
          <button class="btn" id="rpNextScenario">➡️ Nächstes</button>
          <button class="btn" id="rpToPrompt">🤖 Prompt</button>
        </div>
      </div>
      ${transcriptView(transcript)}
    `;
    document.getElementById("rpAgain").addEventListener("click", () => runRoleplay(rp));
    document.getElementById("rpNextScenario").addEventListener("click", () => {
      const idx = ROLEPLAYS.findIndex(x => x.id === rp.id);
      runRoleplay(ROLEPLAYS[(idx + 1) % ROLEPLAYS.length]);
    });
    document.getElementById("rpToPrompt").addEventListener("click", () => showPromptGenerator(rp.title));
  };

  render();
}

function transcriptView(transcript) {
  if (!transcript || transcript.length === 0) return "";
  const lines = transcript.map(t => `<div class="small"><b>${t.who === "npc" ? "NPC" : "DU"}:</b> ${escapeHtml(t.text || "")}</div>`).join("");
  return <div class="card"><h3 style="margin:0 0 8px;">Transcript</h3>${lines}</div>;
}

// =====================
// B) Erzählen Screen
// =====================
function showStoryTrainer() {
  content.innerHTML = `
    <div class="card">
      <h2 style="margin:0 0 10px;">📝 Erzählen (Gestern–Heute–Morgen)</h2>
      <div class="row">
        <select id="stSel">
          ${STORY_PROMPTS.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("")}
        </select>
        <button class="btn primary" id="stGo">▶️ Start</button>
        <button class="btn" id="stBack">⬅️ Zurück</button>
      </div>
      <div class="small" style="margin-top:8px;">Ziel: 2–4 Sätze locker erzählen. Danach 2 Varianten schreiben/sprechen.</div>
    </div>
    <div id="stArea"></div>
  `;

  document.getElementById("stBack").addEventListener("click", () => showDrills());
  document.getElementById("stGo").addEventListener("click", () => {
    const id = document.getElementById("stSel").value;
    const p = STORY_PROMPTS.find(x => x.id === id);
    renderStory(p);
  });

  renderStory(STORY_PROMPTS[0]);
}

function renderStory(p) {
  const area = document.getElementById("stArea");
  const exS = storyExamples("short");
  const exM = storyExamples("medium");
  const exL = storyExamples("long");

  area.innerHTML = `
    <div class="card">
      <div class="badge">Prompt (PT-BR)</div>
      <p class="phrase"><b>${escapeHtml(p.pt)}</b></p>
      <div class="row">
        <button class="btn" id="stSpeak">🔊</button>
        <button class="btn" id="stExamples">👀 Beispiele</button>
      </div>
      <textarea id="stInput" rows="5" placeholder="Dein Text (oder Diktat)…"></textarea>
      <div class="row" style="margin-top:10px;">
        <button class="btn good" id="stVariants">✅ 2 Varianten bauen</button>
        <button class="btn" id="stToPrompt">🤖 KI-Verbesserung</button>
      </div>
      <div id="stOut" style="margin-top:10px;"></div>
    </div>
  `;

  document.getElementById("stSpeak").addEventListener("click", () => speak(p.pt));
  document.getElementById("stExamples").addEventListener("click", () => {
    document.getElementById("stOut").innerHTML = `
      <div class="card" style="margin:0;">
        <div class="small"><b>Beispiele:</b></div>
        <div class="small" style="margin-top:6px;">
          • ${escapeHtml(exS.join(" "))}<br><br>
          • ${escapeHtml(exM.join(" "))}<br><br>
          • ${escapeHtml(exL.join(" "))}
        </div>
      </div>
    `;
  });

  document.getElementById("stVariants").addEventListener("click", () => {
    const txt = (document.getElementById("stInput").value || "").trim();
    const v1 = txt ? txt.replace("Hoje", "Hoje cedo").replace("Ontem", "Ontem à noite") : "Hoje foi corrido, mas deu tudo certo.";
    const v2 = txt ? ("Na real, " + txt).replace("mas", "só que") : "Na real, hoje foi tranquilo e eu tô de boa.";
    document.getElementById("stOut").innerHTML = `
      <div class="card" style="margin:0;">
        <div class="small"><b>Variante 1:</b> ${escapeHtml(v1)}</div>
        <div class="small" style="margin-top:6px;"><b>Variante 2:</b> ${escapeHtml(v2)}</div>
      </div>
    `;
  });

  document.getElementById("stToPrompt").addEventListener("click", () => showPromptGenerator("Erzählen", document.getElementById("stInput").value || ""));
}

// =====================
// D) Prompt Generator Screen
// =====================
function showPromptGenerator(sceneTitle = "", userText = "") {
  const topics = ["Smalltalk","Wetter","Urlaub","Geschehnisse","Essen"];
  content.innerHTML = `
    <div class="card">
    <h2 style="margin:0 0 10px;">🤖 Prompt-Generator (Copy/Paste)</h2>
      <div class="small">Kein API-Key, kein Risiko. Du kopierst in ChatGPT und nimmst die Antwort zurück in deine App (später bauen wir Import als Karten).</div>
      <div class="row" style="margin-top:10px;">
        <select id="pgType">
          <option value="plan">1) 6-Monats-Plan</option>
          <option value="vocab">2) High-Frequency Vokabeln</option>
          <option value="speaking">3) Tutor-Gespräch</option>
          <option value="roleplay">4) Rollenspiel-Tutor</option>
          <option value="grammar">5) Grammatik-on-Demand</option>
          <option value="reset">6) Wochen-Reset</option>
        </select>
        <button class="btn" id="pgBack">⬅️ Zurück</button>
      </div>

      <div id="pgOpts" style="margin-top:12px;"></div>

      <div class="row" style="margin-top:10px;">
        <button class="btn primary" id="pgBuild">▶️ Prompt erzeugen</button>
        <button class="btn" id="pgCopy">📋 Kopieren</button>
      </div>

      <textarea id="pgOut" rows="10" placeholder="Prompt erscheint hier…"></textarea>
    </div>
  `;

  document.getElementById("pgBack").addEventListener("click", () => showDrills());

  const opts = document.getElementById("pgOpts");
  const renderOpts = () => {
    const type = document.getElementById("pgType").value;
    if (type === "plan") {
      opts.innerHTML = `
        <div class="small">Stunden pro Woche:</div>
        <input id="pgHours" type="number" value="6">
      `;
    } else if (type === "vocab") {
      opts.innerHTML = `
        <div class="small">Thema:</div>
        <select id="pgTopic">${topics.map(t => `<option>${t}</option>`).join("")}</select>
      `;
    } else if (type === "roleplay") {
      opts.innerHTML = `
        <div class="small">Szene:</div>
        <input id="pgScene" value="${escapeHtml(sceneTitle || "Restaurant bestellen")}" />
      `;
    } else if (type === "grammar") {
      opts.innerHTML = `
        <div class="small">Satz:</div>
        <input id="pgSentence" value="${escapeHtml(userText || "Eu queria um café, por favor.")}" />
      `;
    } else {
      opts.innerHTML = <div class="small">Keine Zusatzoptionen.</div>;
    }
  };

  renderOpts();
  document.getElementById("pgType").addEventListener("change", renderOpts);

  document.getElementById("pgBuild").addEventListener("click", () => {
    const type = document.getElementById("pgType").value;
    let prompt = "";
    if (type === "plan") prompt = PROMPTS.plan(document.getElementById("pgHours").value || 6);
    if (type === "vocab") prompt = PROMPTS.vocab(document.getElementById("pgTopic").value || "Smalltalk");
    if (type === "speaking") prompt = PROMPTS.speaking();
    if (type === "roleplay") prompt = PROMPTS.roleplay(document.getElementById("pgScene").value || "Restaurant");
    if (type === "grammar") prompt = PROMPTS.grammar(document.getElementById("pgSentence").value || "Eu queria um café, por favor.");
    if (type === "reset") prompt = PROMPTS.reset();

    document.getElementById("pgOut").value = prompt;
  });

  document.getElementById("pgCopy").addEventListener("click", async () => {
    const txt = document.getElementById("pgOut").value || "";
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      alert("Prompt kopiert ✅");
    } catch {
      // Fallback: markieren
      const ta = document.getElementById("pgOut");
      ta.focus();
      ta.select();
      alert("Bitte manuell kopieren (markiert).");
    }
  });
}
