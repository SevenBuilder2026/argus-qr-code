import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLevel } from '../data/levels';
import { QUESTS } from '../data/quests';

const STORAGE_KEY = 'argus_game_state';

const STREAK_MILESTONES = {
  daily:   [3, 7, 14, 30, 60, 100],
  weekly:  [4, 8, 13, 26, 52],
  monthly: [3, 6, 12],
  yearly:  [2, 3, 5],
};

const XP_PER_STATUS = { authentic: 1, suspicious: 2, fake: 3 };

const DEFAULT_STATE = {
  xpTotal: 0,
  scansTotal: 0,
  scansToday: 0,
  todayDate: null,
  streaks: {
    daily:   { currentRun: 0, lastPeriod: null },
    weekly:  { currentRun: 0, lastPeriod: null },
    monthly: { currentRun: 0, lastPeriod: null },
    yearly:  { currentRun: 0, lastPeriod: null },
  },
  badges: {},
  quests: {},
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export { getCurrentLevel };

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getCurrentPeriods() {
  const now = new Date();
  const ymd = todayStr();
  return {
    daily:   ymd,
    weekly:  isoWeek(now),
    monthly: ymd.slice(0, 7),
    yearly:  String(now.getFullYear()),
  };
}

function isNextPeriod(track, last, current) {
  if (!last) return true;
  if (last === current) return false;
  // Check if it's consecutive (next expected period after last)
  if (track === 'daily') {
    const lastDate = new Date(last);
    lastDate.setDate(lastDate.getDate() + 1);
    return lastDate.toISOString().slice(0, 10) === current;
  }
  if (track === 'weekly') {
    const [ly, lw] = last.split('-W').map(Number);
    const [cy, cw] = current.split('-W').map(Number);
    if (cy === ly) return cw === lw + 1;
    if (cy === ly + 1) return lw >= 52 && cw === 1;
    return false;
  }
  if (track === 'monthly') {
    const [ly, lm] = last.split('-').map(Number);
    const [cy, cm] = current.split('-').map(Number);
    if (cy === ly) return cm === lm + 1;
    if (cy === ly + 1) return lm === 12 && cm === 1;
    return false;
  }
  if (track === 'yearly') {
    return Number(current) === Number(last) + 1;
  }
  return false;
}

function updateStreaks(streaks, badgesEarned, today) {
  const periods = getCurrentPeriods();
  const updated = { ...streaks };
  for (const track of ['daily', 'weekly', 'monthly', 'yearly']) {
    const s = { ...updated[track] };
    const current = periods[track];
    if (s.lastPeriod === current) {
      // same period, no change
    } else if (isNextPeriod(track, s.lastPeriod, current)) {
      s.currentRun += 1;
      s.lastPeriod = current;
    } else {
      s.currentRun = 1;
      s.lastPeriod = current;
    }
    updated[track] = s;
    // Check milestones
    for (const threshold of STREAK_MILESTONES[track]) {
      if (s.currentRun === threshold) {
        badgesEarned.push({
          id: `streak_${track}_${threshold}`,
          name: `${track.charAt(0).toUpperCase() + track.slice(1)} ${threshold}`,
          icon: track === 'daily' ? '🔥' : track === 'weekly' ? '📅' : track === 'monthly' ? '🌙' : '🌟',
          count: 1,
        });
      }
    }
  }
  return updated;
}

function checkQuests(scanStatus, state, badgesEarned) {
  const completed = [];
  const updatedQuests = { ...state.quests };

  for (const quest of QUESTS) {
    const qState = updatedQuests[quest.id] ?? { completedCount: 0, lastCompletedDate: null };
    if (!quest.repeatable && qState.completedCount > 0) continue;

    if (quest.check(scanStatus, state)) {
      // For repeatable quests, only fire once per scan session (handled by caller)
      // For "three_in_day" / "five_in_day": fire each time threshold is crossed
      // Simple approach: for repeatable, fire once per scan (caller guards re-entry)
      const newCount = qState.completedCount + 1;
      updatedQuests[quest.id] = {
        completedCount: newCount,
        lastCompletedDate: todayStr(),
      };
      completed.push({ ...quest, completedCount: newCount });
      badgesEarned.push({
        id: `quest_${quest.id}`,
        name: quest.badgeName,
        icon: quest.icon,
        count: newCount,
      });
    }
  }

  return { completed, updatedQuests };
}

function applyBadges(existingBadges, earned) {
  const badges = { ...existingBadges };
  for (const b of earned) {
    if (badges[b.id]) {
      badges[b.id] = { ...badges[b.id], count: badges[b.id].count + 1 };
    } else {
      badges[b.id] = { name: b.name, icon: b.icon, count: 1, earnedAt: new Date().toISOString() };
    }
  }
  return badges;
}

export async function awardScan(scanStatus) {
  const state = await loadState();
  const today = todayStr();

  // Reset scansToday if calendar day changed
  const scansToday = state.todayDate === today ? state.scansToday + 1 : 1;

  const baseXp = XP_PER_STATUS[scanStatus] ?? 1;
  const levelBefore = getCurrentLevel(state.xpTotal);

  const badgesEarned = [];

  // Update streaks (may push streak badges)
  const updatedStreaks = updateStreaks(state.streaks, badgesEarned, today);

  // Build intermediate state for quest checks (with updated counts)
  const intermediateState = {
    ...state,
    scansTotal: state.scansTotal + 1,
    scansToday,
    todayDate: today,
    streaks: updatedStreaks,
  };

  // Check quests (may push quest badges + bonus XP)
  const { completed: questsCompleted, updatedQuests } = checkQuests(
    scanStatus,
    intermediateState,
    badgesEarned,
  );

  const bonusXp = questsCompleted.reduce((sum, q) => sum + q.xpBonus, 0);
  const xpEarned = baseXp + bonusXp;
  const newXpTotal = state.xpTotal + xpEarned;

  const levelAfter = getCurrentLevel(newXpTotal);
  const leveledUp = levelAfter.level > levelBefore.level;

  const updatedBadges = applyBadges(state.badges, badgesEarned);

  const newState = {
    xpTotal: newXpTotal,
    scansTotal: intermediateState.scansTotal,
    scansToday,
    todayDate: today,
    streaks: updatedStreaks,
    badges: updatedBadges,
    quests: updatedQuests,
  };

  await saveState(newState);

  return {
    xpEarned,
    newXpTotal,
    leveledUp,
    newLevel: levelAfter,
    badgesEarned,
    questsCompleted,
  };
}
