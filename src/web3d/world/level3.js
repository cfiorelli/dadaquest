// Level 3 — Grandma's House
// Theme beats: vegetable garden -> dinner table -> dog crossing.

export const LANE_Z3 = 0;

const PLAYER_JUMP_VELOCITY = 14;
const PLAYER_GRAVITY = 32;
const REACHABLE_HEIGHT_FACTOR = 0.85;

function normalizeCoins(layout) {
  const maxHeight = (PLAYER_JUMP_VELOCITY * PLAYER_JUMP_VELOCITY) / (2 * PLAYER_GRAVITY);
  const reachableHeight = maxHeight * REACHABLE_HEIGHT_FACTOR;

  function getPlatformTopY(plat) {
    return plat.y + plat.h * 0.5;
  }

  function getNearestPlatformTopY(x) {
    let nearest = null;
    let bestDx = Number.POSITIVE_INFINITY;
    for (const p of [...layout.platforms, layout.ground]) {
      const halfW = p.w * 0.5;
      const clampedX = Math.max(p.x - halfW, Math.min(p.x + halfW, x));
      const dx = Math.abs(x - clampedX);
      if (dx < bestDx) {
        bestDx = dx;
        nearest = p;
      }
    }
    return nearest ? getPlatformTopY(nearest) : null;
  }

  return layout.coins.map((coin) => {
    const nearestTop = getNearestPlatformTopY(coin.x);
    if (nearestTop === null) return { ...coin };
    const maxY = nearestTop + reachableHeight;
    return coin.y > maxY
      ? { ...coin, y: Number((maxY - 0.08).toFixed(3)) }
      : { ...coin };
  });
}

const L = LANE_Z3;

const BASE_LEVEL3 = {
  extents: { minX: -24, maxX: 82 },
  spawn: { x: -18.4, y: 1.205, z: L },
  goal: { x: 77.2, y: 7.15, z: L },

  checkpoints: [
    { x: 8.8, y: 3.15, z: L, label: 'Porch Step' },
    { x: 36.8, y: 10.00, z: L, label: 'Dinner End' },
    { x: 43.4, y: 5.75, z: L, label: 'Crossing' },
  ],

  ground: { x: 28.0, y: -0.75, z: L, w: 112, h: 1.5, d: 14 },

  platforms: [
    { name: 'gardenStart',  x: -17.2, y: 0.40, w: 8.0, h: 0.80, d: 5.0 },
    { name: 'gardenRow1',   x: -10.2, y: 0.62, w: 5.4, h: 0.72, d: 4.1 },
    { name: 'gardenRow2',   x:  -4.2, y: 1.02, w: 4.8, h: 0.72, d: 4.0 },
    { name: 'gardenRow3',   x:   1.8, y: 1.42, w: 5.0, h: 0.78, d: 4.0 },
    { name: 'porchWall',    x:   6.0, y: 0.90, w: 1.4, h: 4.6, d: 4.6 },
    { name: 'porchStep',    x:   8.8, y: 2.35, w: 5.0, h: 0.80, d: 4.4 },

    { name: 'tableEntry',   x:  14.8, y: 3.55, w: 4.8, h: 0.80, d: 4.2 },
    { name: 'tableStone1',  x:  20.4, y: 4.85, w: 3.4, h: 0.72, d: 4.0 },
    { name: 'tableStone2',  x:  26.2, y: 8.15, w: 3.2, h: 0.72, d: 4.0 },
    { name: 'tableStone3',  x:  31.8, y: 9.20, w: 3.6, h: 0.72, d: 4.0 },
    { name: 'tableExit',    x:  36.8, y: 9.20, w: 4.8, h: 0.80, d: 4.2 },
    { name: 'tableDrop',    x:  40.6, y: 7.10, w: 3.0, h: 0.72, d: 4.0 },

    { name: 'crossingStart', x: 43.0, y: 4.95, w: 4.6, h: 0.80, d: 4.0 },
    { name: 'lane1',         x: 48.4, y: 4.95, w: 4.8, h: 0.60, d: 4.0 },
    { name: 'lane2',         x: 53.8, y: 4.95, w: 4.8, h: 0.60, d: 4.0 },
    { name: 'safeIsland',    x: 59.2, y: 5.20, w: 4.6, h: 0.80, d: 4.0 },
    { name: 'lane3',         x: 64.8, y: 5.20, w: 4.8, h: 0.60, d: 4.0 },
    { name: 'lane4',         x: 70.4, y: 5.20, w: 4.8, h: 0.60, d: 4.0 },
    { name: 'grandmaPorch',  x: 76.4, y: 6.35, w: 6.6, h: 0.80, d: 5.0 },
  ],

  pickups: [
    {
      type: 'onesie',
      x: 15.0,
      y: 4.70,
      z: L,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
    },
  ],

  coins: [
    { x: -18.5, y: 1.90, z: L },
    { x: -12.0, y: 2.15, z: L },
    { x:  -6.0, y: 2.55, z: L },
    { x:   2.0, y: 3.05, z: L },
    { x:  14.8, y: 4.95, z: L },
    { x:  20.4, y: 6.20, z: L },
    { x:  26.2, y: 9.40, z: L },
    { x:  31.8, y: 10.20, z: L },
    { x:  36.8, y: 10.35, z: L },
    { x:  48.4, y: 6.05, z: L },
    { x:  59.2, y: 6.40, z: L },
    { x:  70.4, y: 6.05, z: L },
  ],

  sprinklers: [
    { name: 'sprinklerA', x: -13.2, y: 1.20, z: L, width: 1.2, height: 1.9, onMs: 1100, offMs: 1350, phaseMs: 0 },
    { name: 'sprinklerB', x:  -7.0, y: 1.55, z: L, width: 1.1, height: 1.8, onMs: 1100, offMs: 1350, phaseMs: 650 },
  ],

  steamVents: [
    { name: 'steamA', x: 23.2, y: 5.20, z: L, width: 1.3, height: 1.8, onMs: 900, offMs: 1150, phaseMs: 0 },
    { name: 'steamB', x: 29.2, y: 6.45, z: L, width: 1.3, height: 1.9, onMs: 900, offMs: 1150, phaseMs: 500 },
  ],

  dogLanes: [
    { name: 'dogLane1', y: 5.35, minX: 46.0, maxX: 50.8, speed: 2.5, dogs: [{ startX: 46.1, dir: 1 }] },
    { name: 'dogLane2', y: 5.35, minX: 51.5, maxX: 56.2, speed: -2.8, dogs: [{ startX: 55.8, dir: -1 }] },
    { name: 'dogLane3', y: 5.55, minX: 62.6, maxX: 67.2, speed: 3.0, dogs: [{ startX: 62.9, dir: 1 }] },
    { name: 'dogLane4', y: 5.55, minX: 68.0, maxX: 72.8, speed: -3.2, dogs: [{ startX: 72.4, dir: -1 }] },
  ],
};

export const LEVEL3 = {
  ...BASE_LEVEL3,
  coins: normalizeCoins(BASE_LEVEL3),
};
