export const LANE_Z5 = 0;

const L = LANE_Z5;
const COIN_HOVER_Y = 1.02;

const BASE_LEVEL5 = {
  totalCollectibles: 18,
  extents: { minX: -28, maxX: 132 },
  spawn: { x: -22.0, y: 1.2, z: L },
  goal: { x: 126.2, y: 2.15, z: L },

  acts: [
    { id: 'A', label: 'Entry Tunnel', range: [-28, 18], jellyfishCount: 1 },
    { id: 'B', label: 'Kelp Forest', range: [18, 58], jellyfishCount: 3 },
    { id: 'C', label: 'Glass Cylinder Climb', range: [58, 92], jellyfishCount: 2 },
    { id: 'D', label: 'Open Tank Finale', range: [92, 132], jellyfishCount: 3 },
  ],

  checkpoints: [
    { x: 16.0, y: 1.2, z: L, label: 'Current Gate' },
    { x: 54.0, y: 1.35, z: L, label: 'Kelp Heart' },
    { x: 91.5, y: 1.7, z: L, label: 'Pressure Ring' },
  ],

  ground: { x: 52, y: -0.75, z: L, w: 176, h: 1.5, d: 22 },

  platforms: [
    { name: 'entryFloorA', x: -18.0, y: 0.35, z: -0.2, w: 18.0, h: 0.70, d: 9.0 },
    { name: 'entryBridgeA', x: -1.5, y: 0.62, z: 0.4, w: 21.0, h: 0.72, d: 10.0 },
    { name: 'kelpFloorB1', x: 26.0, y: 0.95, z: -0.8, w: 18.0, h: 0.74, d: 10.0 },
    { name: 'kelpFloorB2', x: 46.5, y: 1.12, z: 0.7, w: 20.0, h: 0.74, d: 11.0 },
    { name: 'cylinderPlazaC1', x: 66.5, y: 1.45, z: -0.4, w: 18.0, h: 0.76, d: 10.0 },
    { name: 'cylinderBridgeC2', x: 84.0, y: 1.78, z: 0.5, w: 16.0, h: 0.76, d: 9.0 },
    { name: 'finaleFloorD1', x: 104.5, y: 2.0, z: -0.3, w: 22.0, h: 0.78, d: 11.0 },
    { name: 'goalDeck', x: 124.2, y: 2.22, z: L, w: 12.0, h: 0.82, d: 10.0 },
  ],

  coins: [
    { x: -20.0, y: 0, z: -2.8 }, { x: -11.2, y: 0, z: 2.5 }, { x: -2.5, y: 0, z: -1.4 }, { x: 9.5, y: 0, z: 1.8 },
    { x: 22.5, y: 0, z: 3.0 }, { x: 31.0, y: 0, z: -2.6 }, { x: 42.0, y: 0, z: 2.2 }, { x: 51.2, y: 0, z: -1.7 }, { x: 58.2, y: 0, z: 0.4 },
    { x: 63.0, y: 0, z: -0.9 }, { x: 68.2, y: 0, z: 2.6 }, { x: 76.0, y: 0, z: -2.2 }, { x: 86.2, y: 0, z: 1.4 },
    { x: 96.5, y: 0, z: -3.0 }, { x: 104.0, y: 0, z: 2.5 }, { x: 112.0, y: 0, z: -2.0 }, { x: 119.4, y: 0, z: 1.2 }, { x: 125.2, y: 0, z: 0.0 },
  ],

  currents: [
    { name: 'currentA1', x: -12.0, y: 1.35, z: -0.8, w: 8.0, h: 3.1, d: 6.0, pushX: 4.8, pushZ: -2.0 },
    { name: 'currentA2', x: 0.8, y: 1.55, z: 1.0, w: 8.2, h: 3.2, d: 6.0, pushX: -4.2, pushZ: 1.8 },
    { name: 'currentD1', x: 98.5, y: 2.25, z: -0.8, w: 7.4, h: 3.6, d: 6.0, pushX: 4.9, pushZ: -2.1 },
    { name: 'currentD2', x: 110.5, y: 2.45, z: 0.8, w: 7.4, h: 3.6, d: 6.0, pushX: -4.4, pushZ: 1.9 },
  ],

  deepWaterPockets: [
    { name: 'deepPocketB', x: 36.0, y: 1.85, z: 0.0, w: 10.2, h: 3.2, d: 7.2 },
    { name: 'deepPocketC', x: 72.5, y: 2.2, z: 0.0, w: 11.4, h: 3.6, d: 7.6 },
    { name: 'deepPocketD', x: 109.0, y: 2.45, z: 0.0, w: 12.8, h: 3.8, d: 8.2 },
  ],

  airBubblePickups: [
    { name: 'airBubbleB', x: 50.0, y: 1.95, z: 1.0, radius: 0.82, refill: 8 },
    { name: 'airBubbleC', x: 86.2, y: 2.2, z: -0.8, radius: 0.82, refill: 8 },
    { name: 'airBubbleD', x: 118.6, y: 2.45, z: 0.8, radius: 0.82, refill: 10 },
  ],

  eelRails: [
    { name: 'eelRailB', x1: 34.0, y1: 0.35, x2: 39.4, y2: 2.15, z: -0.4, phaseOffset: 0.0 },
    { name: 'eelRailC1', x1: 66.0, y1: 0.55, x2: 71.0, y2: 2.45, z: 0.5, phaseOffset: 0.35 },
    { name: 'eelRailC2', x1: 80.0, y1: 0.75, x2: 85.6, y2: 2.65, z: -0.6, phaseOffset: 0.7 },
  ],

  vents: [
    { name: 'ventC1', x: 64.8, y: 0.58, z: -1.6, w: 2.0, h: 3.2, liftVy: 16.5, phaseOffset: 0.0 },
    { name: 'ventC2', x: 76.4, y: 0.78, z: 1.6, w: 2.0, h: 3.4, liftVy: 17.2, phaseOffset: 0.45 },
    { name: 'ventD1', x: 102.0, y: 0.92, z: 0.0, w: 2.2, h: 3.4, liftVy: 16.4, phaseOffset: 0.2 },
  ],

  jellyfish: [
    { name: 'jellyA1', x: 8.5, y: 1.55, z: 0.8, bounds: { minX: 5.5, maxX: 12.0, minY: 0.8, maxY: 2.6, minZ: -1.2, maxZ: 2.0 }, speed: 0.8, turnSpeed: 2.2, act: 'A' },
    { name: 'jellyB1', x: 24.5, y: 1.8, z: 2.0, bounds: { minX: 20.8, maxX: 28.0, minY: 0.9, maxY: 2.9, minZ: 0.4, maxZ: 3.6 }, speed: 1.0, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyB2', x: 35.2, y: 1.95, z: -1.8, bounds: { minX: 31.2, maxX: 39.2, minY: 1.0, maxY: 3.1, minZ: -3.2, maxZ: -0.4 }, speed: 1.0, turnSpeed: 2.2, act: 'B' },
    { name: 'jellyB3', x: 47.0, y: 2.05, z: 1.6, bounds: { minX: 43.0, maxX: 50.8, minY: 1.1, maxY: 3.2, minZ: 0.2, maxZ: 3.2 }, speed: 1.08, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyC1', x: 70.8, y: 2.25, z: -1.6, bounds: { minX: 67.0, maxX: 74.8, minY: 1.2, maxY: 3.4, minZ: -3.2, maxZ: -0.2 }, speed: 1.12, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyC2', x: 84.0, y: 2.45, z: 1.8, bounds: { minX: 80.0, maxX: 88.0, minY: 1.3, maxY: 3.6, minZ: 0.4, maxZ: 3.2 }, speed: 1.14, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyD1', x: 98.0, y: 2.5, z: -1.8, bounds: { minX: 94.0, maxX: 101.8, minY: 1.4, maxY: 3.8, minZ: -3.4, maxZ: -0.4 }, speed: 1.14, turnSpeed: 2.6, act: 'D' },
    { name: 'jellyD2', x: 110.0, y: 2.65, z: 1.8, bounds: { minX: 106.0, maxX: 114.0, minY: 1.5, maxY: 3.9, minZ: 0.2, maxZ: 3.4 }, speed: 1.18, turnSpeed: 2.7, act: 'D' },
    { name: 'jellyD3', x: 119.0, y: 2.8, z: -0.8, bounds: { minX: 115.4, maxX: 122.8, minY: 1.6, maxY: 4.0, minZ: -2.0, maxZ: 1.0 }, speed: 1.12, turnSpeed: 2.5, act: 'D' },
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
    { x: -10.0, z: -0.4, scale: 1.0 },
    { x: 14.0, z: 0.2, scale: 1.0 },
    { x: 40.0, z: 0.1, scale: 1.05 },
    { x: 67.0, z: -0.2, scale: 1.08 },
    { x: 94.0, z: 0.2, scale: 1.08 },
    { x: 118.0, z: 0.0, scale: 1.1 },
  ],

  gateArches: [
    { x: -4.0, y: 2.4, z: 0.0, width: 10.0, height: 5.4 },
    { x: 30.0, y: 2.8, z: 0.0, width: 10.5, height: 5.8 },
    { x: 64.0, y: 3.2, z: 0.0, width: 10.2, height: 6.0 },
    { x: 100.0, y: 3.5, z: 0.0, width: 11.0, height: 6.2 },
  ],

  signage: [
    { x: 8.0, y: 4.2, z: 6.6, text: 'AQUARIUM DEPTHS →', width: 8.2, height: 2.0 },
    { x: 74.0, y: 4.5, z: 6.8, text: 'PRESSURE RING', width: 6.4, height: 1.8 },
  ],

  coralPillars: [
    { x: 12.0, y: 0.8, z: 5.0, radius: 1.0, height: 3.4 },
    { x: 44.0, y: 1.0, z: -5.4, radius: 1.2, height: 4.0 },
    { x: 79.0, y: 1.3, z: 5.2, radius: 1.1, height: 4.6 },
    { x: 110.0, y: 1.5, z: -5.0, radius: 1.3, height: 5.2 },
  ],

  glassTubes: [
    { x: 20.0, y: 4.6, z: 6.4, diameter: 4.0, length: 12.0 },
    { x: 72.0, y: 5.2, z: 6.6, diameter: 4.8, length: 14.0 },
    { x: 108.0, y: 5.8, z: 6.8, diameter: 4.6, length: 12.0 },
  ],

  kelpCurtains: [
    { x: 26.0, y: 2.8, z: 7.2, width: 8.0, height: 8.0 },
    { x: 54.0, y: 3.0, z: -7.2, width: 9.0, height: 8.4 },
    { x: 92.0, y: 3.4, z: 7.4, width: 9.6, height: 8.8 },
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
