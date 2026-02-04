/* =====================================
   Speaking Module
   Shadowing + TTS + Optional STT
   ===================================== */

let _state = null;
let _cards = [];
let _session = null;
let _recognizer = null; // <-- NEW: keep active SpeechRecognition instanc

export function initSpeaking(state, cards) {
  _state = state;
  _cards = cards || [];

  _state.speaking = _state.speaking || {
    rate: 1.0,
    voiceLang: "pt-BR",
    lastSession: null
  };
}

/* ---------- Session ---------- */
function newSession(queueCards) {
  _session = {
    queue: queueCards.map(c => c.id),
    index: 0,
    startedAt: Date.now(),
    attempts: {}, // id -> count
    lastTranscript: "",
    lastDiffHtml: ""
  };
  _state.speaking.lastSession = _session;
  return _session;
}

function getCurrentCard() {
  if (!_session || !_session.queue.length) return null;
  const id = _session.queue[_session.index];
  return _cards.find(c => c.id === id) || null;
}

function incAttempt(cardId) {
  _session.attempts[cardId] = (_session.attempts[cardId] || 0) + 1;
}

/* ---------- Build Queue ---------- */
function buildQueue({ topic = "", cefr = "", skill = "", limit = 20 } = {}) {
  let list = [..._cards];
  if (topic) list = list.filter(c => c.topic === topic);
  if (cefr) list = list.filter(c => c.cefr === cefr);
  if (skill) list = list.filter(c => c.skill === skill);

  shuffle(list);
  return list.slice(0, limit);
}

/* ---------- TTS ---------- */
function speak(text) {
  if (!window.speechSynthesis) return;

  const rate = clamp(_state.speaking.rate || 1.0, 0.7, 1.3);

  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;

  const voices = window.speechSynthesis.getVoices?.() || [];
  const br =
    voices.find(v => /pt-BR/i.test(v.lang)) ||
    voices.find(v => /^pt/i.test(v.lang));

  if (br) {
    u.voice = br;
    u.lang = br.lang;
  } else {
    u.lang = "pt-BR";
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function stopSpeak() {
  try { window.speechSynthesis.cancel(); } catch {}
}

/* ---------- Optional SpeechRecognition ---------- */
function getRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "pt-BR";
  r.interimResults = true;
  r.continuous = false;
  return r;
}

function startListen(onPartial, onFinal, onError) {
  const rec = getRecognizer();
  if (!rec) return { ok: false, reason: "SpeechRecognition nicht verfügbar." };

  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + " ";
      else interim += t;
    }
    const partial = (finalText + interim).trim();
    onPartial?.(partial);
    if (finalText.trim()) onFinal?.(finalText.trim());
  };

  rec.onerror = (e) => onError?.(e);

  rec.start();
     _recognizer = rec;
    rec.onend = () => { _recognizer = null; };

    rec.start();
  return { ok: true };
  }
  
  // NEW: stop microphone / recognition cleanly
  export function stopListening() {
    if (_recognizer) {
      try { _recognizer.stop(); } catch {}
       _recognizer = null;
   }
  }


/* ---------- Diff Highlight ---------- */
function diffWords(target, spoken) {
  const t = normalize(target).split(" ").filter(Boolean);
  const s = normalize(spoken).split(" ").filter(Boolean);

  // LCS DP
  const dp = Array(t.length + 1).fill(0).map(() => Array(s.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= s.length; j++) {
      dp[i][j] = (t[i-1] === s[j-1])
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }

  // backtrack
  let i = t.length, j = s.length;
  const keepT = new Set();
  const keepS = new Set();
  while (i > 0 && j > 0) {
    if (t[i-1] === s[j-1]) {
      keepT.add(i-1);
      keepS.add(j-1);
      i--; j--;
    } else if (dp[i-1][j] >= dp[i][j-1]) i--;
    else j--;
  }

  const targetHtml = t.map((w, idx) =>
    keepT.has(idx) ? `<span>${escapeHtml(w)}</span>` : `<span style="color:rgba(239,68,68,.95)">${escapeHtml(w)}</span>`
  ).join(" ");

  const spokenHtml = s.map((w, idx) =>
    keepS.has(idx) ? `<span>${escapeHtml(w)}</span>` : `<span style="color:rgba(56,189,248,.95)">${escapeHtml(w)}</span>`
  ).join(" ");

  return { targetHtml, spokenHtml };
}

/* ---------- Actions ---------- */
export function startShadowing(filters = {}) {
  const q = buildQueue(filters);
  if (!q.length) return null;
  return newSession(q);
}

export function current() {
  return getCurrentCard();
}

export function play() {
  const c = getCurrentCard();
  if (!c) return;
  incAttempt(c.id);
  speak(c.pt);
}

export function repeat() {
  play();
}

export function next() {
  if (!_session) return;
  stopSpeak();
  _session.index = Math.min(_session.queue.length - 1, _session.index + 1);
}

export function prev() {
  if (!_session) return;
  stopSpeak();
  _session.index = Math.max(0, _session.index - 1);
}

export function setRate(rate) {
  _state.speaking.rate = clamp(rate, 0.7, 1.3);
}

export function listenAndCompare(onUpdate) {
  const c = getCurrentCard();
  if (!c) return { ok: false, reason: "Keine Karte aktiv." };

  _session.lastTranscript = "";
  _session.lastDiffHtml = "";

  return startListen(
    (partial) => {
      _session.lastTranscript = partial;
      const d = diffWords(c.pt, partial);
      _session.lastDiffHtml = `
        <div class="small muted">Ziel (rot = fehlend):</div>
        <div class="card"><div class="pt">${d.targetHtml}</div></div>
        <div class="small muted">Du (blau = extra):</div>
        <div class="card"><div class="pt">${d.spokenHtml}</div></div>
      `;
      onUpdate?.({ partial, diffHtml: _session.lastDiffHtml });
    },
    (finalText) => {
      _session.lastTranscript = finalText;
      const d = diffWords(c.pt, finalText);
      _session.lastDiffHtml = `
        <div class="small muted">Ziel (rot = fehlend):</div>
        <div class="card"><div class="pt">${d.targetHtml}</div></div>
        <div class="small muted">Du (blau = extra):</div>
        <div class="card"><div class="pt">${d.spokenHtml}</div></div>
      `;
      onUpdate?.({ final: finalText, diffHtml: _session.lastDiffHtml });
    },
    () => {
      onUpdate?.({ error: true });
    }
  );
}

/* ---------- Selectors ---------- */
export function getSession() {
  return _session;
}

export function getProgress() {
  if (!_session) return { index: 0, total: 0 };
  return { index: _session.index + 1, total: _session.queue.length };
}

export function getLastCompareHtml() {
  return _session?.lastDiffHtml || "";
}

/* ---------- Exports ---------- */
export const speakingActions = {
  startShadowing,
  current,
  play,
  repeat,
  next,
  prev,
  setRate,
  listenAndCompare,
  stopListening // <-- NEW export
};

export const speakingSelectors = {
  getSession,
  getProgress,
  getLastCompareHtml
};

/* ---------- Utils ---------- */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}