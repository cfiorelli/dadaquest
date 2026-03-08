function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

const STATES = Object.freeze({
  WARN: 'warn',
  ACTIVE: 'active',
  COOLDOWN: 'cooldown',
});

function getDuration(config, state) {
  if (state === STATES.WARN) return config.warnDuration;
  if (state === STATES.ACTIVE) return config.activeDuration;
  return config.cooldownDuration;
}

function getNextState(state) {
  if (state === STATES.WARN) return STATES.ACTIVE;
  if (state === STATES.ACTIVE) return STATES.COOLDOWN;
  return STATES.WARN;
}

export function createTelegraphedHazard(config = {}) {
  const {
    name = 'hazard',
    warnDuration = 0.8,
    activeDuration = 1.0,
    cooldownDuration = 0.8,
    phaseOffset = 0,
    singleHitPerActive = true,
    onWarnVisual,
    onActiveVisual,
    onCooldownVisual,
    isPlayerHit,
    onHit,
  } = config;

  const cycleDuration = Math.max(0.001, warnDuration + activeDuration + cooldownDuration);
  const normalizedOffset = ((phaseOffset % cycleDuration) + cycleDuration) % cycleDuration;

  let state = STATES.WARN;
  let stateElapsed = 0;
  let hitConsumed = false;

  function applyStateVisual(dt, ctx) {
    const duration = Math.max(0.001, getDuration(config, state));
    const progress = clamp01(stateElapsed / duration);
    const info = {
      name,
      state,
      dt,
      progress,
      remaining: Math.max(0, duration - stateElapsed),
      duration,
      cycleDuration,
      hitConsumed,
      api,
      ctx,
    };
    if (state === STATES.WARN) onWarnVisual?.(info);
    else if (state === STATES.ACTIVE) onActiveVisual?.(info);
    else onCooldownVisual?.(info);
  }

  function setState(nextState, elapsed = 0) {
    state = nextState;
    stateElapsed = Math.max(0, elapsed);
    if (state !== STATES.ACTIVE) {
      hitConsumed = false;
    }
  }

  function seek(offsetSec) {
    let remaining = offsetSec;
    setState(STATES.WARN, 0);
    const order = [STATES.WARN, STATES.ACTIVE, STATES.COOLDOWN];
    for (const candidate of order) {
      const duration = getDuration(config, candidate);
      if (remaining < duration) {
        setState(candidate, remaining);
        return;
      }
      remaining -= duration;
    }
    setState(STATES.WARN, 0);
  }

  function advanceState(dt) {
    stateElapsed += dt;
    let duration = getDuration(config, state);
    while (stateElapsed >= duration && duration > 0) {
      stateElapsed -= duration;
      setState(getNextState(state), stateElapsed);
      duration = getDuration(config, state);
    }
  }

  const api = {
    name,
    update(dt, ctx = {}) {
      advanceState(dt);
      applyStateVisual(dt, ctx);
      if (state !== STATES.ACTIVE || typeof isPlayerHit !== 'function') {
        return false;
      }
      if (singleHitPerActive && hitConsumed) {
        return false;
      }
      const hit = !!isPlayerHit(ctx, api);
      if (!hit) return false;
      hitConsumed = true;
      onHit?.(ctx, api);
      return true;
    },
    reset() {
      seek(normalizedOffset);
    },
    forceState(nextState, elapsed = 0) {
      setState(nextState, elapsed);
      applyStateVisual(0, {});
    },
    getState() {
      return {
        name,
        state,
        elapsed: stateElapsed,
        duration: getDuration(config, state),
        hitConsumed,
      };
    },
    isActive() {
      return state === STATES.ACTIVE;
    },
    isWarning() {
      return state === STATES.WARN;
    },
  };

  api.reset();
  return api;
}

export const TELEGRAPH_STATES = STATES;
