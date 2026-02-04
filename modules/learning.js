/* =====================================
   Learning Engine 2.0
   CEFR + Skills + SRS + Mastery
   ===================================== */

const DAY = 24 * 60 * 60 * 1000;

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1"];
const SKILLS = ["greeting", "asking", "answering", "describing", "narrating", "negotiating", "formal", "opinion"];

let _state = null;
let _cards = [];

export function initLearning(state, cards) {
  _state = state;
  _state.learning = _state.learning || {
    progress: {},       // id -> { reps, lapses, ease, interval, due }
    filters: {
      topics: [],
      cefr: ["A1", "A2", "B1", "B2", "C1"],
      skills: [...SKILLS]
    }
  };
  _cards = cards || [];
}

function getP(id) {
  if (!_state.learning.progress[id]) {
    _state.learning.progress[id] = {
      reps: 0,
      lapses: 0,
      ease: 2.3,
      interval: 0,
      due: 0
    };
  }
  return _state.learning.progress[id];
}

/* ---------- Filters ---------- */
export function setTopicFilter(topics) {
  _state.learning.filters.topics = topics;
}
export function setCefrFilter(range) {
  _state.learning.filters.cefr = range;
}
export function setSkillFilter(skills) {
  _state.learning.filters.skills = skills;
}

function passesFilters(card) {
  const f = _state.learning.filters;
  if (f.topics.length && !f.topics.includes(card.topic)) return false;
  if (f.cefr.length && !f.cefr.includes(card.cefr)) return false;
  if (f.skills.length && !f.skills.includes(card.skill)) return false;
  return true;
}

/* ---------- Scheduling ---------- */
export function schedule(cardId, grade) {
  const p = getP(cardId);
  p.reps += 1;

  const q = [1, 3, 4, 5][grade];
  p.ease = Math.max(1.3, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (grade === 0) {
    p.lapses += 1;
    p.interval = 0;
    p.due = Date.now();
  } else if (p.interval === 0) {
    p.interval = grade === 1 ? 1 : grade === 2 ? 2 : 3;
    p.due = Date.now() + p.interval * DAY;
  } else {
    const mult = grade === 1 ? 0.9 : grade === 2 ? 1.1 : 1.35;
    p.interval = Math.max(1, Math.min(120, Math.round(p.interval * p.ease * mult)));
    p.due = Date.now() + p.interval * DAY;
  }
}

/* ---------- Selectors ---------- */
export function getDueCards() {
  return _cards.filter(c => {
    const p = getP(c.id);
    return p.reps > 0 && p.due <= Date.now() && passesFilters(c);
  });
}

export function getNewCards(limit = 20) {
  return _cards.filter(c => {
    const p = getP(c.id);
    return p.reps === 0 && passesFilters(c);
  }).slice(0, limit);
}

export function getMixedSession(limit = 30) {
  const due = getDueCards();
  const fresh = getNewCards(limit);
  return shuffle([...due, ...fresh]).slice(0, limit);
}

/* ---------- Mastery ---------- */
export function masteryByTopic() {
  const result = {};
  _cards.forEach(c => {
    const p = getP(c.id);
    if (!result[c.topic]) result[c.topic] = { total: 0, mastered: 0 };
    result[c.topic].total++;
    if (p.reps > 3 && p.lapses === 0) result[c.topic].mastered++;
  });
  return result;
}

export function masteryBySkill() {
  const result = {};
  _cards.forEach(c => {
    const p = getP(c.id);
    if (!result[c.skill]) result[c.skill] = { total: 0, mastered: 0 };
    result[c.skill].total++;
    if (p.reps > 3 && p.lapses === 0) result[c.skill].mastered++;
  });
  return result;
}

/* ---------- Utilities ---------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Public API ---------- */
export const learningActions = {
  schedule,
  setTopicFilter,
  setCefrFilter,
  setSkillFilter
};

export const learningSelectors = {
  getDueCards,
  getNewCards,
  getMixedSession,
  masteryByTopic,
  masteryBySkill
};