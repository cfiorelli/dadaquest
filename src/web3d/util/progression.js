const STORAGE_KEY = 'dadaquest:progress:v1';

function emptyLevelState(total = 0) {
  return {
    total,
    collectedIds: [],
  };
}

function normalize(raw, levelTotals = {}) {
  const levels = {};
  for (const [levelKey, total] of Object.entries(levelTotals)) {
    const source = raw?.levels?.[levelKey];
    const collectedIds = Array.isArray(source?.collectedIds)
      ? source.collectedIds.filter((value) => typeof value === 'string')
      : [];
    levels[levelKey] = {
      total: Number.isFinite(source?.total) ? source.total : total,
      collectedIds,
    };
  }

  const levelCompleted = {};
  const completionKeys = new Set([
    ...Object.keys(levelTotals || {}),
    ...Object.keys(raw?.levelCompleted || {}),
  ]);
  for (const levelKey of completionKeys) {
    levelCompleted[levelKey] = !!raw?.levelCompleted?.[levelKey];
  }

  const state = {
    levels,
    levelCompleted,
    capeUnlocked: !!raw?.capeUnlocked,
    sourdoughUnlocked: !!raw?.sourdoughUnlocked,
    bubbleShieldUnlocked: !!raw?.bubbleShieldUnlocked,
    allBinkiesCollected: !!raw?.allBinkiesCollected,
    unlocksShown: {
      cape: !!raw?.unlocksShown?.cape,
      sourdough: !!raw?.unlocksShown?.sourdough,
      bubbleShield: !!raw?.unlocksShown?.bubbleShield,
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
  state.bubbleShieldUnlocked = state.bubbleShieldUnlocked || !!state.levelCompleted['5'];
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
  const prevBubbleShield = next.bubbleShieldUnlocked;
  next.levelCompleted[levelKey] = true;
  recomputeFlags(next, levelTotals);
  return {
    state: next,
    levelCompletedNow: !wasComplete && next.levelCompleted[levelKey],
    bubbleShieldUnlockedNow: !prevBubbleShield && next.bubbleShieldUnlocked,
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
