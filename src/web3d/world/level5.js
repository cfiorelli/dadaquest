export const LANE_Z5 = 0;

const L = LANE_Z5;
const COIN_HOVER_Y = 1.02;

// NEW LAYOUT 2026-03-09: segmented aquarium service hall.
// Platforms now have alternating Z offsets so the top-down footprint reads as
// a zigzag hall — not a straight runway. Width varies: narrow catwalks vs wide
// tank chambers. Z sequence: -2, +1, -2.5, +2, -4, +2.5, -1, +0.5, 0
const BASE_LEVEL5 = {
  totalCollectibles: 18,
  extents: { minX: -28, maxX: 132 },
  spawn: { x: -22.0, y: 1.2, z: L },
  goal: { x: 126.2, y: 2.15, z: L },

  acts: [
    { id: 'A', label: 'Entry Dock', range: [-28, 18], jellyfishCount: 1 },
    { id: 'B', label: 'Tank Chamber', range: [18, 58], jellyfishCount: 3 },
    { id: 'C', label: 'Service Catwalk', range: [58, 92], jellyfishCount: 2 },
    { id: 'D', label: 'Exhibit Hall', range: [92, 132], jellyfishCount: 3 },
  ],

  checkpoints: [
    { x: 16.0, y: 1.2, z: -1.0, label: 'Current Gate' },
    { x: 54.0, y: 1.35, z: 1.5, label: 'Kelp Heart' },
    { x: 91.5, y: 1.7, z: 1.0, label: 'Pressure Ring' },
  ],

  ground: { x: 52, y: -0.75, z: L, w: 176, h: 1.5, d: 22 },

  platforms: [
    // Act A — entry dock to glass bridge (Z: -2 → +1 zigzag)
    { name: 'entryDock',      x: -18.0, y: 0.35, z: -2.0, w: 16.0, h: 0.70, d: 10.0 },
    { name: 'glassBridge',    x:  -3.0, y: 0.58, z:  1.0, w:  9.0, h: 0.64, d:  4.5 },
    // Act B — wide tank chamber → isolated kelp island (Z: -2.5 → +2)
    { name: 'tankChamber',    x:  18.0, y: 0.94, z: -2.5, w: 22.0, h: 0.74, d: 13.0 },
    { name: 'kelpIsland',     x:  37.0, y: 1.10, z:  2.0, w: 13.0, h: 0.74, d:  8.0 },
    // Act C — narrow service catwalk → cylinder plaza → inner bridge (Z: -4 → +2.5 → -1)
    { name: 'serviceCatwalk', x:  53.0, y: 1.42, z: -4.0, w:  9.0, h: 0.68, d:  3.5 },
    { name: 'cylinderPlaza',  x:  68.0, y: 1.70, z:  2.5, w: 16.0, h: 0.76, d: 10.0 },
    { name: 'innerBridge',    x:  82.0, y: 1.94, z: -1.0, w:  9.0, h: 0.70, d:  4.0 },
    // Act D — wide exhibit hall → goal dock (Z: +0.5 → 0)
    { name: 'exhibitHall',    x: 103.0, y: 2.00, z:  0.5, w: 24.0, h: 0.78, d: 13.0 },
    { name: 'goalDeck',       x: 124.2, y: 2.22, z:  0.0, w: 12.0, h: 0.82, d: 10.0 },
  ],

  coins: [
    // Act A — on entryDock and glassBridge
    { x: -20.0, y: 0, z: -2.8 }, { x: -12.0, y: 0, z: -1.2 },
    { x:  -5.5, y: 0, z:  0.8 }, { x:   8.5, y: 0, z: -0.5 },
    // Act B — on tankChamber and kelpIsland
    { x:  18.5, y: 0, z: -3.5 }, { x:  24.0, y: 0, z: -1.8 },
    { x:  33.5, y: 0, z:  1.2 }, { x:  38.0, y: 0, z:  2.8 },
    { x:  44.0, y: 0, z:  1.5 },
    // Act C — service catwalk, plaza, bridge
    { x:  53.0, y: 0, z: -3.8 }, { x:  63.0, y: 0, z: -1.2 },
    { x:  68.0, y: 0, z:  3.2 }, { x:  78.0, y: 0, z:  1.8 },
    { x:  82.5, y: 0, z: -0.5 },
    // Act D — exhibit hall and goal
    { x:  96.5, y: 0, z:  1.5 }, { x: 104.0, y: 0, z: -0.8 },
    { x: 114.0, y: 0, z:  1.0 }, { x: 124.5, y: 0, z:  0.0 },
  ],

  currents: [
    // Help cross from glassBridge → tankChamber (z: +1 → -2.5)
    { name: 'currentA1', x:  -0.5, y: 1.35, z: -0.5, w: 8.0, h: 3.1, d: 6.0, pushX: 4.0, pushZ: -2.0 },
    // Help cross from glassBridge left side
    { name: 'currentA2', x:   8.5, y: 1.55, z:  0.5, w: 8.0, h: 3.2, d: 6.0, pushX: -3.5, pushZ: -1.5 },
    // Help cross from kelpIsland → serviceCatwalk (z: +2 → -4)
    { name: 'currentD1', x:  98.0, y: 2.25, z:  0.0, w: 7.4, h: 3.6, d: 6.0, pushX: 4.9, pushZ: -1.5 },
    { name: 'currentD2', x: 110.5, y: 2.45, z:  0.5, w: 7.4, h: 3.6, d: 6.0, pushX: -3.8, pushZ:  1.5 },
  ],

  deepWaterPockets: [
    { name: 'deepPocketB', x:  37.0, y: 1.85, z:  1.0, w: 13.0, h: 3.2, d:  9.0 },
    { name: 'deepPocketC', x:  68.0, y: 2.20, z:  1.0, w: 16.0, h: 3.6, d: 11.0 },
    { name: 'deepPocketD', x: 105.0, y: 2.45, z:  0.5, w: 18.0, h: 3.8, d: 13.0 },
  ],

  airBubblePickups: [
    { name: 'airBubbleB', x:  40.0, y: 1.95, z:  2.0, radius: 0.82, refill: 8 },
    { name: 'airBubbleC', x:  82.5, y: 2.20, z: -0.8, radius: 0.82, refill: 8 },
    { name: 'airBubbleD', x: 118.6, y: 2.45, z:  0.5, radius: 0.82, refill: 10 },
  ],

  eelRails: [
    // On kelpIsland (z=+2)
    { name: 'eelRailB',  x1: 34.0, y1: 0.35, x2: 40.0, y2: 2.15, z:  2.0, phaseOffset: 0.00 },
    // On cylinderPlaza (z=+2.5)
    { name: 'eelRailC1', x1: 65.0, y1: 0.55, x2: 71.0, y2: 2.45, z:  2.5, phaseOffset: 0.35 },
    // On innerBridge (z=-1)
    { name: 'eelRailC2', x1: 79.0, y1: 0.75, x2: 85.0, y2: 2.65, z: -1.0, phaseOffset: 0.70 },
  ],

  vents: [
    // On cylinderPlaza (z=+2.5 area)
    { name: 'ventC1', x: 65.0, y: 0.58, z:  3.0, w: 2.0, h: 3.2, liftVy: 16.5, phaseOffset: 0.00 },
    { name: 'ventC2', x: 74.0, y: 0.78, z:  1.8, w: 2.0, h: 3.4, liftVy: 17.2, phaseOffset: 0.45 },
    // On exhibitHall (z=+0.5 area)
    { name: 'ventD1', x: 102.0, y: 0.92, z: 0.5, w: 2.2, h: 3.4, liftVy: 16.4, phaseOffset: 0.20 },
  ],

  jellyfish: [
    { name: 'jellyA1', x:   8.0, y: 1.55, z: -0.5, bounds: { minX:  5.0, maxX: 12.0, minY: 0.8, maxY: 2.6, minZ: -2.0, maxZ:  1.5 }, speed: 0.8, turnSpeed: 2.2, act: 'A' },
    { name: 'jellyB1', x:  23.0, y: 1.80, z: -1.5, bounds: { minX: 18.0, maxX: 28.0, minY: 0.9, maxY: 2.9, minZ: -4.0, maxZ: -0.5 }, speed: 1.0, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyB2', x:  36.0, y: 1.95, z:  2.5, bounds: { minX: 32.0, maxX: 42.0, minY: 1.0, maxY: 3.1, minZ:  0.5, maxZ:  4.0 }, speed: 1.0, turnSpeed: 2.2, act: 'B' },
    { name: 'jellyB3', x:  47.0, y: 2.05, z:  0.5, bounds: { minX: 43.0, maxX: 51.0, minY: 1.1, maxY: 3.2, minZ: -1.0, maxZ:  2.5 }, speed: 1.08, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyC1', x:  68.0, y: 2.25, z:  2.0, bounds: { minX: 64.0, maxX: 74.0, minY: 1.2, maxY: 3.4, minZ:  0.5, maxZ:  4.0 }, speed: 1.12, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyC2', x:  82.5, y: 2.45, z: -0.5, bounds: { minX: 79.0, maxX: 87.0, minY: 1.3, maxY: 3.6, minZ: -2.5, maxZ:  1.0 }, speed: 1.14, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyD1', x:  99.0, y: 2.50, z:  1.5, bounds: { minX: 95.0, maxX: 103.0, minY: 1.4, maxY: 3.8, minZ: -0.5, maxZ:  3.5 }, speed: 1.14, turnSpeed: 2.6, act: 'D' },
    { name: 'jellyD2', x: 110.0, y: 2.65, z: -0.5, bounds: { minX: 106.0, maxX: 115.0, minY: 1.5, maxY: 3.9, minZ: -2.5, maxZ:  1.5 }, speed: 1.18, turnSpeed: 2.7, act: 'D' },
    { name: 'jellyD3', x: 119.5, y: 2.80, z:  0.5, bounds: { minX: 116.0, maxX: 124.0, minY: 1.6, maxY: 4.0, minZ: -1.5, maxZ:  2.5 }, speed: 1.12, turnSpeed: 2.5, act: 'D' },
  ],

  sharkSweep: {
    name: 'sharkSweepFinale',
    xMin: 103.0,
    xMax: 121.6,
    y: 2.55,
    z: L,
    width: 3.8,
    height: 2.6,
    phaseOffset: 0.25,
  },

  routeMarkers: [
    { x: -10.0, z: -2.0, scale: 1.0 },
    { x:  14.0, z: -0.5, scale: 1.0 },
    { x:  40.0, z:  1.5, scale: 1.05 },
    { x:  67.0, z:  1.0, scale: 1.08 },
    { x:  94.0, z:  0.5, scale: 1.08 },
    { x: 118.0, z:  0.0, scale: 1.10 },
  ],

  gateArches: [
    { x:  -4.0, y: 2.4, z:  0.0, width: 10.0, height: 5.4 },
    { x:  26.0, y: 2.8, z: -1.5, width: 10.5, height: 5.8 },
    { x:  64.0, y: 3.2, z:  1.5, width: 10.2, height: 6.0 },
    { x: 100.0, y: 3.5, z:  0.5, width: 11.0, height: 6.2 },
  ],

  signage: [
    { x:  8.0, y: 4.2, z:  6.0, text: 'AQUARIUM DEPTHS →', width: 8.2, height: 2.0 },
    { x: 74.0, y: 4.5, z: -6.5, text: 'PRESSURE RING',     width: 6.4, height: 1.8 },
  ],

  coralPillars: [
    { x:  12.0, y: 0.8, z:  5.5, radius: 1.0, height: 3.4 },
    { x:  40.0, y: 1.0, z: -5.8, radius: 1.2, height: 4.0 },
    { x:  75.0, y: 1.3, z:  5.5, radius: 1.1, height: 4.6 },
    { x: 110.0, y: 1.5, z: -5.5, radius: 1.3, height: 5.2 },
  ],

  glassTubes: [
    { x:  20.0, y: 4.6, z:  6.5, diameter: 4.0, length: 12.0 },
    { x:  72.0, y: 5.2, z: -6.8, diameter: 4.8, length: 14.0 },
    { x: 108.0, y: 5.8, z:  6.8, diameter: 4.6, length: 12.0 },
  ],

  kelpCurtains: [
    { x:  30.0, y: 2.8, z:  7.2, width: 8.0, height: 8.0 },
    { x:  54.0, y: 3.0, z: -7.5, width: 9.0, height: 8.4 },
    { x:  92.0, y: 3.4, z:  7.4, width: 9.6, height: 8.8 },
  ],
};

function pointInsideSurface(surface, x, z = L) {
  return x >= (surface.x - (surface.w * 0.5))
    && x <= (surface.x + (surface.w * 0.5))
    && z >= ((surface.z ?? L) - (surface.d * 0.5))
    && z <= ((surface.z ?? L) + (surface.d * 0.5));
}

function surfaceTop(surface) {
  return surface.y + (surface.h * 0.5);
}

function getNearestSurfaceTopY(layout, x, z = L) {
  const surfaces = [layout.ground, ...(layout.platforms || [])];
  let bestTop = null;
  for (const surface of surfaces) {
    if (!pointInsideSurface(surface, x, z)) continue;
    const top = surfaceTop(surface);
    if (bestTop === null || top > bestTop) {
      bestTop = top;
    }
  }
  return bestTop;
}

function normalizeCoins(layout) {
  return layout.coins.map((coin) => {
    const top = getNearestSurfaceTopY(layout, coin.x, coin.z ?? L);
    if (top === null) return { ...coin };
    return {
      ...coin,
      y: Number((top + COIN_HOVER_Y).toFixed(3)),
    };
  });
}

export const LEVEL5 = {
  ...BASE_LEVEL5,
  coins: normalizeCoins(BASE_LEVEL5),
};
