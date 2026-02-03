// modules/learning.js
// Lern-Engine 2.0 – CEFR A1–C1 + Skills + SRS + Mastery
// Integriert in NotifyMindFit v4.0

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const SKILLS = [
  "greeting",     // Begrüßungen & Smalltalk-Einstieg
  "asking",       // Fragen stellen
  "answering",    // Antworten geben
  "describing",   // Beschreiben (Personen, Dinge, Situationen)
  "narrating",    // Erzählen (Geschichten, Tagesablauf)
  "negotiating",  // Verhandeln, Bitten, Vorschläge machen
  "formal",       // Formale Sprache (E-Mails, Behörden, Arbeit)
  "opinion"       // Meinungen äußern, diskutieren, zustimmen/widersprechen
];

const DAY_MS = 24 * 60 * 60 * 1000;

// ────────────────────────────────────────────────
// Hilfsfunktionen SRS (SM2-ähnlich)
// ────────────────────────────────────────────────
function getProgress(state, cardId) {
  if (!state.progress[cardId]) {
    state.progress[cardId] = {
      reps: 0,
      lapses: 0,
      ease: 2.5,
      interval: 0,      // in Tagen
      due: Date.now(),  // sofort fällig bei neu
      lastReview: 0
    };
  }
  return state.progress[cardId];
}

function schedule(state, cardId, grade) {
  // grade: 0 = wiederholen (schlecht), 1 = schwer, 2 = gut, 3 = sehr leicht
  const p = getProgress(state, cardId);
  p.reps += 1;
  p.lastReview = Date.now();

  if (grade === 0) {
    p.lapses += 1;
    p.interval = 0;
    p.ease = Math.max(1.3, p.ease - 0.2);
  } else {
    const q = grade; // 1..3 → Qualität 3,4,5
    p.ease = Math.max(1.3, p.ease + (0.1 - (5 - (q+2)) * (0.08 + (5 - (q+2)) * 0.02)));

    if (p.reps === 1) {
      p.interval = grade === 1 ? 1 : grade === 2 ? 2 : 4;
    } else {
      const mult = grade === 1 ? 0.85 : grade === 2 ? 1.0 : 1.3;
      p.interval = Math.round(p.interval * p.ease * mult);
      p.interval = Math.max(1, Math.min(180, p.interval)); // Cap bei 6 Monaten
    }
  }

  p.due = Date.now() + p.interval * DAY_MS;

  state.history.push({
    ts: Date.now(),
    type: "review",
    cardId,
    grade,
    ease: p.ease,
    interval: p.interval
  });

  saveState(); // globale Funktion aus app.js
  emit("card:reviewed", { cardId, grade });
}

// ────────────────────────────────────────────────
// Filter- & Deck-Logik
// ────────────────────────────────────────────────
function normalize(str) {
  return (str || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/gi, "");
}

function getAllCards(state) {
  // Später: Kombination aus base cards + generated + imported + active content packs
  // Für den Moment: nur imported + Platzhalter
  return [
    ...state.importedCards,
    // Hier kommen später content.js → getAllCards() Aufrufe
  ];
}

function applyFilters(state, cards) {
  const { cefrMin = "A1", cefrMax = "C1", activeSkills = SKILLS } = state.learning?.filters || {};
  const activeTopics = state.settings.activeTopics || [];

  const minIdx = CEFR_LEVELS.indexOf(cefrMin);
  const maxIdx = CEFR_LEVELS.indexOf(cefrMax);

  return cards.filter(card => {
    if (!activeTopics.includes(card.topic)) return false;

    const cefrIdx = CEFR_LEVELS.indexOf(card.cefr || "A1");
    if (cefrIdx < minIdx || cefrIdx > maxIdx) return false;

    if (card.skill && !activeSkills.includes(card.skill)) return false;

    return true;
  });
}

function getDueCards(state, options = {}) {
  const all = getAllCards(state);
  const filtered = applyFilters(state, all);

  return filtered
    .filter(card => {
      const p = getProgress(state, card.id);
      return p.reps > 0 && p.due <= Date.now();
    })
    .sort(() => Math.random() - 0.5); // Shuffle für Abwechslung
}

function getNewCards(state, limit = 30, options = {}) {
  const all = getAllCards(state);
  const filtered = applyFilters(state, all);

  return filtered
    .filter(card => getProgress(state, card.id).reps === 0)
    .slice(0, limit);
}

function getMixedSession(state, total = 40) {
  const due = getDueCards(state);
  const remaining = total - due.length;
  const newOnes = getNewCards(state, Math.max(0, remaining));

  const session = [...due, ...newOnes];
  session.sort(() => Math.random() - 0.5);
  return session.slice(0, total);
}

// ────────────────────────────────────────────────
// Mastery Berechnung
// ────────────────────────────────────────────────
function computeMastery(state, key, type = "topic") {
  const all = getAllCards(state);
  const relevant = all.filter(c =>
    type === "topic" ? c.topic === key : c.skill === key
  );

  if (!relevant.length) return 0;

  let seen = 0;
  let totalEase = 0;
  let longTerm = 0;

  relevant.forEach(card => {
    const p = getProgress(state, card.id);
    if (p.reps > 0) {
      seen++;
      totalEase += p.ease;
      if (p.interval >= 21 && p.ease >= 2.4 && p.lapses <= 2) {
        longTerm++;
      }
    }
  });

  if (seen === 0) return 0;

  const coverage = seen / relevant.length;
  const avgEase = totalEase / seen;
  const retention = longTerm / seen;

  // Gewichtung: Abdeckung 40%, Ease 30%, Langzeitstabilität 30%
  const score = coverage * 0.4 + (avgEase / 5) * 0.3 + retention * 0.3;
  return Math.min(100, Math.round(score * 100));
}

function getTopicMastery(state, topic) {
  return computeMastery(state, topic, "topic");
}

function getSkillMastery(state, skill) {
  return computeMastery(state, skill, "skill");
}

function getOverallMastery(state) {
  const topics = state.settings.activeTopics || [];
  const topicScores = {};
  topics.forEach(t => {
    topicScores[t] = getTopicMastery(state, t);
  });

  const skillScores = {};
  SKILLS.forEach(s => {
    skillScores[s] = getSkillMastery(state, s);
  });

  return { topics: topicScores, skills: skillScores };
}

// ────────────────────────────────────────────────
// Initialisierung & API
// ────────────────────────────────────────────────
function initLearning(state) {
  if (!state.learning) {
    state.learning = {
      filters: {
        cefrMin: "A1",
        cefrMax: "C1",
        activeSkills: [...SKILLS]
      }
    };
  }
  // Sicherstellen, dass activeTopics existiert
  if (!state.settings.activeTopics) {
    state.settings.activeTopics = ["smalltalk", "wetter", "essen", "urlaub"];
  }
  return state;
}

const learningActions = {
  schedule,
  setCefrRange: (state, min, max) => {
    if (CEFR_LEVELS.includes(min) && CEFR_LEVELS.includes(max)) {
      state.learning.filters.cefrMin = min;
      state.learning.filters.cefrMax = max;
      saveState();
      emit("filters:changed");
    }
  },
  toggleSkill: (state, skill) => {
    const idx = state.learning.filters.activeSkills.indexOf(skill);
    if (idx === -1) {
      state.learning.filters.activeSkills.push(skill);
    } else {
      state.learning.filters.activeSkills.splice(idx, 1);
    }
    saveState();
    emit("filters:changed");
  },
  toggleTopic: (state, topic) => {
    const idx = state.settings.activeTopics.indexOf(topic);
    if (idx === -1) {
      state.settings.activeTopics.push(topic);
    } else {
      state.settings.activeTopics.splice(idx, 1);
      if (state.settings.activeTopics.length === 0) {
        state.settings.activeTopics = ["smalltalk"];
      }
    }
    saveState();
    emit("filters:changed");
  }
};

const learningSelectors = {
  getDueCards,
  getNewCards,
  getMixedSession,
  getTopicMastery,
  getSkillMastery,
  getOverallMastery,
  getActiveFilters: (state) => ({
    cefrMin: state.learning?.filters?.cefrMin || "A1",
    cefrMax: state.learning?.filters?.cefrMax || "C1",
    activeSkills: state.learning?.filters?.activeSkills || [...SKILLS],
    activeTopics: state.settings?.activeTopics || []
  })
};

// Global export (da wir Vanilla + <script> nutzen)
window.LearningModule = {
  initLearning,
  learningActions,
  learningSelectors,
  CEFR_LEVELS,
  SKILLS
};
