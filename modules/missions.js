/* =====================================
   Missions Module
   Daily Missions + XP + Streak + Badges
   ===================================== */

let _state = null;

export function initMissions(state) {
  _state = state;
  _state.missions = _state.missions || {
    xp: 0,
    streak: 0,
    lastActiveDay: null,      // YYYY-MM-DD
    daily: {},                // day -> mission object
    completed: {},            // day -> {reviewDone,newDone,speakDone,storyDone}
    badges: {}                // key -> {earnedAt}
  };
}

/* ---------- Daily Mission Generator ---------- */
export function dailyMission(date = new Date()) {
  const dayKey = toDayKey(date);

  if (_state.missions.daily[dayKey]) return _state.missions.daily[dayKey];

  // Simple “Ultimate” mission set
  const m = {
    dayKey,
    tasks: {
      review: { target: 20, xp: 2, label: "Reviews" },     // 20 due/old cards
      new: { target: 15, xp: 3, label: "Neue Karten" },    // 15 new cards
      speak: { target: 10, xp: 4, label: "Shadowing" },    // 10 shadowing plays
      story: { target: 1, xp: 20, label: "Mini-Story" }    // 1 story (B1+)
    }
  };

  _state.missions.daily[dayKey] = m;

  if (!_state.missions.completed[dayKey]) {
    _state.missions.completed[dayKey] = {
      reviewDone: 0,
      newDone: 0,
      speakDone: 0,
      storyDone: 0
    };
  }

  return m;
}

/* ---------- Activity & Streak ---------- */
export function markActive() {
  const today = toDayKey(new Date());
  const last = _state.missions.lastActiveDay;

  if (!last) {
    _state.missions.streak = 1;
  } else if (isYesterday(last, today)) {
    _state.missions.streak += 1;
  } else if (last !== today) {
    _state.missions.streak = 1;
  }

  _state.missions.lastActiveDay = today;
  awardBadges();
}

/* ---------- XP ---------- */
export function addXP(amount) {
  _state.missions.xp += Math.max(0, amount || 0);
  awardBadges();
}

/* ---------- Task Progress ---------- */
export function addProgress(type, amount = 1) {
  const m = dailyMission(new Date());
  const dayKey = m.dayKey;
  const prog = _state.missions.completed[dayKey];

  markActive();

  if (type === "review") prog.reviewDone += amount;
  if (type === "new") prog.newDone += amount;
  if (type === "speak") prog.speakDone += amount;
  if (type === "story") prog.storyDone += amount;

  // Award XP for this increment (cap to target)
  const t = m.tasks[type];
  if (t) {
    const doneNow = getDone(type);
    const target = t.target;

    // Add XP only for “newly” counted units up to target.
    // We approximate by checking if we were below target before increment.
    const before = doneNow - amount;
    const effective = Math.max(0, Math.min(target, doneNow) - Math.min(target, before));
    if (effective > 0) addXP(effective * t.xp);
  }

  awardBadges();
}

export function isTaskComplete(type) {
  const m = dailyMission(new Date());
  const done = getDone(type);
  return done >= m.tasks[type].target;
}

export function isAllComplete() {
  return ["review", "new", "speak", "story"].every(isTaskComplete);
}

/* ---------- Badges ---------- */
function awardBadges() {
  const xp = _state.missions.xp;
  const streak = _state.missions.streak;

  // XP badges
  earnOnce("xp_500", xp >= 500, "500 XP");
  earnOnce("xp_2000", xp >= 2000, "2000 XP");
  earnOnce("xp_10000", xp >= 10000, "10000 XP");

  // streak badges
  earnOnce("streak_7", streak >= 7, "7 Tage Streak");
  earnOnce("streak_30", streak >= 30, "30 Tage Streak");
  earnOnce("streak_100", streak >= 100, "100 Tage Streak");

  // daily complete badges
  earnOnce("daily_first", isAllComplete(), "Erste Tagesmission abgeschlossen");

  // “Consistency” badge: 5 completed days total
  const completedDays = Object.keys(_state.missions.completed).filter(d => {
    const p = _state.missions.completed[d];
    const m = _state.missions.daily[d];
    if (!m) return false;
    return (
      p.reviewDone >= m.tasks.review.target &&
      p.newDone >= m.tasks.new.target &&
      p.speakDone >= m.tasks.speak.target &&
      p.storyDone >= m.tasks.story.target
    );
  }).length;
  earnOnce("consistency_5", completedDays >= 5, "5 Tage komplett");
}

function earnOnce(key, condition, name) {
  if (!condition) return;
  if (_state.missions.badges[key]) return;
  _state.missions.badges[key] = { name, earnedAt: Date.now() };
}

/* ---------- Selectors ---------- */
export function getTodayMission() {
  return dailyMission(new Date());
}

export function getTodayProgress() {
  const dayKey = toDayKey(new Date());
  return _state.missions.completed[dayKey] || {
    reviewDone: 0,
    newDone: 0,
    speakDone: 0,
    storyDone: 0
  };
}

export function getBadges() {
  return Object.entries(_state.missions.badges || {}).map(([key, val]) => ({
    key,
    ...val
  })).sort((a, b) => (a.earnedAt || 0) - (b.earnedAt || 0));
}

export function getXP() {
  return _state.missions.xp || 0;
}

export function getStreak() {
  return _state.missions.streak || 0;
}

export function getDone(type) {
  const p = getTodayProgress();
  if (type === "review") return p.reviewDone;
  if (type === "new") return p.newDone;
  if (type === "speak") return p.speakDone;
  if (type === "story") return p.storyDone;
  return 0;
}

/* ---------- Public API ---------- */
export const missionActions = {
  dailyMission,
  markActive,
  addXP,
  addProgress,
  isTaskComplete,
  isAllComplete
};

export const missionSelectors = {
  getTodayMission,
  getTodayProgress,
  getBadges,
  getXP,
  getStreak,
  getDone
};

/* ---------- Utils ---------- */
function toDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isYesterday(lastKey, todayKey) {
  // parse lastKey
  const [y, m, d] = lastKey.split("-").map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date(todayKey.split("-")[0], todayKey.split("-")[1] - 1, todayKey.split("-")[2]);
  const diff = today - last;
  return diff >= (24 * 60 * 60 * 1000) && diff < (48 * 60 * 60 * 1000);
}