// Level 2 — Condo Garden
// Theme: baby explores the condo: nursery → kitchen → loft window sill.

export const LANE_Z2 = 0;

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
      if (dx < bestDx) { bestDx = dx; nearest = p; }
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

const L = LANE_Z2;

const BASE_LEVEL2 = {
  extents: { minX: -22, maxX: 42 },
  spawn: { x: -17.0, y: 1.2, z: L },
  goal:  { x: 37.5,  y: 9.0, z: L },

  checkpoints: [
    { x: -0.5, y: 3.3, z: L, label: 'Nursery' },
    { x: 18.0, y: 5.2, z: L, label: 'Kitchen' },
  ],

  ground: { x: 9.0, y: -0.75, z: L, w: 68, h: 1.5, d: 14 },

  // allPlatforms order matters — boot.js indexes these for colliders.
  // Horse (platHorse) is last non-crumble platform so level2.update can find it by name.
  platforms: [
    // Section A — Nursery / bedroom
    { name: 'platBedroom',  x: -16.0, y: 0.40,  w: 10.0, h: 0.80, d: 5.0 },  // surface 0.80
    { name: 'platBedStep',  x:  -8.5, y: 1.75,  w:  4.0, h: 0.80, d: 4.0 },  // surface 2.15
    { name: 'platHorse',    x:  -4.5, y: 0.40,  w:  2.8, h: 0.80, d: 3.0 },  // moveable; surface 0.80
    { name: 'platShelf',    x:  -0.5, y: 2.20,  w:  4.0, h: 0.80, d: 4.0 },  // surface 2.60  (CP1)
    // Section B — Kitchen corridor
    { name: 'platKitchen',  x:   6.5, y: 0.40,  w:  7.0, h: 0.80, d: 4.0 },  // surface 0.80
    { name: 'platPiano',    x:  11.0, y: 3.00,  w:  3.2, h: 0.70, d: 4.0 },  // surface 3.35
    { name: 'platLanding',  x:  18.0, y: 4.00,  w:  5.0, h: 0.80, d: 4.0 },  // surface 4.40  (CP2)
    // Section C — Loft
    { name: 'platStair1',   x:  23.5, y: 4.80,  w:  3.0, h: 0.80, d: 4.0 },  // surface 5.20
    { name: 'platStair2',   x:  27.5, y: 6.00,  w:  3.0, h: 0.80, d: 4.0 },  // surface 6.40
    { name: 'platLoft',     x:  33.0, y: 7.20,  w:  5.0, h: 0.80, d: 4.0 },  // surface 7.60
    { name: 'platRoof',     x:  37.5, y: 8.40,  w:  6.0, h: 0.80, d: 5.0 },  // surface 8.80 → goal
  ],

  pickups: [
    {
      type: 'onesie',
      x: 6.5, y: 1.7, z: L,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
    },
  ],

  hazards: [
    // Bianca static zone — touching triggers respawn (slip type, same mechanism)
    {
      type: 'slip',
      x: 14.5, y: 1.1, z: L,
      width: 1.6, depth: 3.2,
      accelMultiplier: 1.0,
      decelMultiplier: 1.0,
    },
  ],

  crumbles: [
    {
      name: 'crumbleB',
      x: 30.5, y: 6.8, z: L,
      w: 3.0, h: 0.65, d: 4.0,
    },
  ],

  coins: [
    { x: -16.5, y: 1.80, z: L },
    { x: -14.5, y: 2.10, z: L },
    { x:  -8.5, y: 2.95, z: L },
    { x:  -0.5, y: 3.40, z: L },
    { x:   2.5, y: 1.80, z: L },
    { x:   6.5, y: 1.80, z: L },
    { x:  11.0, y: 4.15, z: L },
    { x:  18.0, y: 5.20, z: L },
    { x:  23.5, y: 6.00, z: L },
    { x:  27.5, y: 7.20, z: L },
    { x:  33.0, y: 8.40, z: L },
    { x:  35.4, y: 9.25, z: L },
  ],

  // Level-2-specific runtime data (used by buildWorld2 / level2.update)
  amanda: {
    minX: 3.5, maxX: 12.5,
    y: 0.85,
    w: 1.3, h: 1.6, d: 1.3,
    speed: 2.8,
  },

  horse: {
    // platHorse starts at x=-4.5; player walks into push zone → horse slides right to snapX
    platformName: 'platHorse',
    startX: -4.5,
    snapX:  -1.5,
    pushZoneMinX: -5.5,
    pushZoneMaxX: -4.2,
    speed: 2.5,
  },

  // Asset anchor positions for GLB models
  assetAnchors: {
    babyBed:      { x: -8.5,  y: 1.75, z: L },  // sits on platBedStep
    rockingHorse: { x: -4.5,  y: 0.40, z: L },  // tracks with platHorse
    piano:        { x: 11.0,  y: 3.00, z: L },  // sits on platPiano
    bianca:       { x: 19.6,  y: 4.40, z: L },  // perched near the stairs landing
  },
};

export const LEVEL2 = {
  ...BASE_LEVEL2,
  coins: normalizeCoins(BASE_LEVEL2),
};
