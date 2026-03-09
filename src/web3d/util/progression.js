import { normalizeEra5State } from '../../game/items/items.js';

const STORAGE_KEY = 'dadaquest:progress:v1';

function emptyLevelState(total = 0) {
  return {
    total,
    collectedIds: [],
  };
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalize(raw, levelTotals = {}) {
  const source = asObject(raw);
  const levels = {};
  for (const [levelKey, total] of Object.entries(levelTotals)) {
    const levelSource = source.levels?.[levelKey];
    const collectedIds = Array.isArray(levelSource?.collectedIds)
      ? levelSource.collectedIds.filter((value) => typeof value === 'string')
      : [];
    levels[levelKey] = {
      total: Number.isFinite(levelSource?.total) ? levelSource.total : total,
      collectedIds,
    };
  }

  const levelCompleted = {};
  const completionKeys = new Set([
    ...Object.keys(levelTotals || {}),
    ...Object.keys(source.levelCompleted || {}),
  ]);
  for (const levelKey of completionKeys) {
    levelCompleted[levelKey] = !!source.levelCompleted?.[levelKey];
  }

  const state = {
    levels,
    levelCompleted,
    capeUnlocked: !!source.capeUnlocked,
    sourdoughUnlocked: !!source.sourdoughUnlocked,
    bubbleShieldUnlocked: !!source.bubbleShieldUnlocked,
    allBinkiesCollected: !!source.allBinkiesCollected,
    era5: normalizeEra5State(source.era5, { unlocked: !!source?.era5?.unlocked || !!levelCompleted['4'] }),
    unlocksShown: {
      cape: !!source.unlocksShown?.cape,
      sourdough: !!source.unlocksShown?.sourdough,
      bubbleShield: !!source.unlocksShown?.bubbleShield,
      era5: !!source.unlocksShown?.era5,
    },
  };
  recomputeFlags(state, levelTotals);
  return state;
}

function recomputeFlags(state, levelTotals = {}) {
  for (const [levelKey, total] of Object.entries(levelTotals)) {
    if (!state.levels[levelKey]) {
      state.levels[levelKey] = emptyLevelState(total);
    } else {
      state.levels[levelKey].total = total;
    }
    if (typeof state.levelCompleted[levelKey] !== 'boolean') {
      state.levelCompleted[levelKey] = false;
    }
  }

  const level1 = state.levels['1'];
  const level2 = state.levels['2'];
  const level3 = state.levels['3'];

  const level1Complete = !!level1 && level1.total > 0 && level1.collectedIds.length >= level1.total;
  const coreComplete = [level1, level2, level3].every((level) => level && level.total > 0 && level.collectedIds.length >= level.total);
  const allComplete = Object.values(state.levels).every((level) => level.total === 0 || level.collectedIds.length >= level.total);

  state.capeUnlocked = state.capeUnlocked || level1Complete;
  state.sourdoughUnlocked = state.sourdoughUnlocked || coreComplete;
  state.bubbleShieldUnlocked = !!state.bubbleShieldUnlocked;
  state.era5 = normalizeEra5State(state.era5, {
    unlocked: !!state.era5?.unlocked || !!state.levelCompleted['4'],
  });
  state.allBinkiesCollected = allComplete;
  return state;
}

export function loadProgress(levelTotals = {}) {
  if (typeof window === 'undefined') {
    return normalize({}, levelTotals);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalize({}, levelTotals);
    return normalize(JSON.parse(raw), levelTotals);
  } catch {
    return normalize({}, levelTotals);
  }
}

export function saveProgress(state, levelTotals = {}) {
  if (typeof window === 'undefined') return;
  const normalized = normalize(state, levelTotals);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function ensureProgressTotals(state, levelTotals = {}) {
  return normalize(state, levelTotals);
}

export function recordCollectedBinky(state, levelId, collectibleId, levelTotals = {}) {
  const next = normalize(state, levelTotals);
  const levelKey = String(levelId);
  if (!next.levels[levelKey]) {
    next.levels[levelKey] = emptyLevelState(levelTotals[levelKey] || 0);
  }
  if (!next.levels[levelKey].collectedIds.includes(collectibleId)) {
    next.levels[levelKey].collectedIds.push(collectibleId);
  }
  const prevCape = next.capeUnlocked;
  const prevSourdough = next.sourdoughUnlocked;
  recomputeFlags(next, levelTotals);
  return {
    state: next,
    capeUnlockedNow: !prevCape && next.capeUnlocked,
    sourdoughUnlockedNow: !prevSourdough && next.sourdoughUnlocked,
  };
}

export function markLevelCompleted(state, levelId, levelTotals = {}) {
  const next = normalize(state, levelTotals);
  const levelKey = String(levelId);
  const wasComplete = !!next.levelCompleted[levelKey];
  const prevEra5Unlocked = !!next.era5?.unlocked;
  next.levelCompleted[levelKey] = true;
  recomputeFlags(next, levelTotals);
  return {
    state: next,
    levelCompletedNow: !wasComplete && next.levelCompleted[levelKey],
    era5UnlockedNow: !prevEra5Unlocked && !!next.era5?.unlocked,
  };
}

export function markUnlockShown(state, unlockKey, levelTotals = {}) {
  const next = normalize(state, levelTotals);
  next.unlocksShown[unlockKey] = true;
  return next;
}

export function clearProgress(levelTotals = {}) {
  const next = normalize({}, levelTotals);
  saveProgress(next, levelTotals);
  return next;
}

export function getLevelProgress(state, levelId) {
  return state?.levels?.[String(levelId)] || emptyLevelState(0);
}

export function isLevelUnlocked(state, levelId) {
  if (levelId <= 1) return true;
  if (levelId === 2 || levelId === 3) return true;
  if (levelId === 4) return !!state?.sourdoughUnlocked;
  if (levelId === 5) return !!state?.levelCompleted?.['4'];
  return !!state?.levelCompleted?.[String(levelId - 1)];
}

export function getProgressStorageKey() {
  return STORAGE_KEY;
}
