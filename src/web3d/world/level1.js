export const LANE_Z = 0; // Single source of truth: all interactables live at this Z.

const PLAYER_JUMP_VELOCITY = 14;
const PLAYER_GRAVITY = 32;
const REACHABLE_HEIGHT_FACTOR = 0.85;

function isDebugMode() {
  if (typeof window === 'undefined') return false;
  return import.meta.env.DEV || new URLSearchParams(window.location.search).get('debug') === '1';
}

function getPlatformTopY(plat) {
  return plat.y + (plat.h * 0.5);
}

function getNearestPlatformTopY(x, platforms, ground) {
  let nearest = null;
  let bestDx = Number.POSITIVE_INFINITY;
  for (const p of [...platforms, ground]) {
    const halfW = p.w * 0.5;
    const minX = p.x - halfW;
    const maxX = p.x + halfW;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const dx = Math.abs(x - clampedX);
    if (dx < bestDx) {
      bestDx = dx;
      nearest = p;
    }
  }
  return nearest ? getPlatformTopY(nearest) : null;
}

function makeReachabilityReport(coins, platforms, ground, reachableHeight) {
  const violations = [];
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    const nearestTop = getNearestPlatformTopY(c.x, platforms, ground);
    if (nearestTop === null) continue;
    const delta = c.y - nearestTop;
    if (delta > reachableHeight) {
      violations.push({ index: i, x: c.x, y: c.y, delta: Number(delta.toFixed(3)) });
    }
  }
  return violations;
}

function normalizeCoins(layout) {
  const maxHeight = (PLAYER_JUMP_VELOCITY * PLAYER_JUMP_VELOCITY) / (2 * PLAYER_GRAVITY);
  const reachableHeight = maxHeight * REACHABLE_HEIGHT_FACTOR;
  const normalized = layout.coins.map((coin) => ({ ...coin }));

  for (const coin of normalized) {
    const nearestTop = getNearestPlatformTopY(coin.x, layout.platforms, layout.ground);
    if (nearestTop === null) continue;
    const maxY = nearestTop + reachableHeight;
    if (coin.y > maxY) {
      coin.y = Number((maxY - 0.08).toFixed(3));
    }
  }

  if (isDebugMode()) {
    const violations = makeReachabilityReport(normalized, layout.platforms, layout.ground, reachableHeight);
    if (violations.length) {
      console.warn('[level] unreachable coin placements detected', violations);
    }
  }

  return normalized;
}

const L = LANE_Z; // shorthand for z fields below

const BASE_LEVEL1 = {
  extents: { minX: -20, maxX: 33 },
  spawn: { x: -15.2, y: 1.205, z: L },
  goal: { x: 30.2, y: 5.3, z: L },
  // Beat 1 (Tutorial) ends at platVert1. Beat 2 (Challenge) starts at platBridge.
  checkpoints: [
    { x: -2.1, y: 3.1, z: L, label: 'First' },
    { x: 12.8, y: 5.1, z: L, label: 'Midway' },
  ],
  ground: { x: 6.5, y: -0.75, z: L, w: 58, h: 1.5, d: 14 },
  platforms: [
    { name: 'platStart',   w: 8.2, h: 0.8, d: 5.0, x: -14.2, y: 0.4  },
    { name: 'platHop',     w: 4.4, h: 0.7, d: 4.0, x:  -8.1, y: 1.15 },
    { name: 'platVert1',   w: 4.0, h: 0.8, d: 4.0, x:  -2.1, y: 2.25 },
    { name: 'platVert2',   w: 3.6, h: 0.8, d: 4.0, x:   2.4, y: 3.55 },
    { name: 'platBuff',    w: 4.4, h: 0.8, d: 4.0, x:   7.0, y: 4.35 },
    { name: 'platBridge',  w: 4.2, h: 0.7, d: 4.0, x:  11.2, y: 3.0  },
    // platSlipRun removed — crumble now bridges the puddle gap directly.
    { name: 'platStepUp',  w: 4.8, h: 0.8, d: 4.1, x:  23.1, y: 3.35 },
    { name: 'platRoof',    w: 7.6, h: 0.8, d: 5.0, x:  28.4, y: 4.35 },
  ],
  pickups: [
    {
      type: 'onesie',
      x: 7.2,
      y: 5.05,
      z: L,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
    },
  ],
  hazards: [
    {
      // Puddle: touching it resets player to start. crumbleA sits above this zone.
      type: 'slip',
      x: 17.2,
      y: 2.75,
      z: L,
      width: 5.2,
      depth: 3.2,
      accelMultiplier: 0.70,
      decelMultiplier: 0.25,
    },
  ],
  signs: [
    { x: -10.6, y: 2.05, z: 1.6, direction: 1 },
    { x:   0.6, y: 4.6,  z: 1.7, direction: 1 },
    { x:  20.8, y: 4.4,  z: 1.7, direction: 1 },
  ],
  crumbles: [
    {
      // Centered over the puddle: when it crumbles the player falls into the puddle zone.
      name: 'crumbleA',
      x: 17.2, y: 3.1, z: L,
      w: 3.2, h: 0.65, d: 4.0,
    },
  ],
  // 12 coins along the critical path.
  coins: [
    { x: -14.8, y: 1.65, z: L },
    { x: -13.2, y: 1.95, z: L },
    { x: -10.4, y: 2.55, z: L },
    { x:  -8.8, y: 2.65, z: L },
    { x:  -2.6, y: 3.65, z: L },
    { x:   2.0, y: 4.85, z: L },
    { x:   7.6, y: 5.55, z: L },
    { x:  10.8, y: 4.45, z: L },
    { x:  12.8, y: 4.2,  z: L },
    { x:  21.7, y: 4.05, z: L },
    { x:  24.2, y: 4.8,  z: L },
    { x:  27.8, y: 5.55, z: L },
  ],
};

export const LEVEL1 = {
  ...BASE_LEVEL1,
  coins: normalizeCoins(BASE_LEVEL1),
};
