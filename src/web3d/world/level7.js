import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

// NEW LAYOUT 2026-03-09: broken cliff path with offset ledges.
// Z sequence: -3, +1.5, -2, +2.5, -4, +2, -2, +3, 0
// Width varies: narrow wind-exposed ledges vs wider safe shelves.
// Identity: exposed rock, wind cables, kite masts, no indoor grammar.
const BASE_LEVEL7 = {
  totalCollectibles: 20,
  extents: { minX: -30, maxX: 146 },
  spawn: { x: -24, y: 1.2, z: L },
  goal: { x: 139.8, y: 2.65, z: L },
  theme: 'storm',
  showGroundVisual: false,
  showRouteRibbons: false,

  acts: [
    { id: 'A', label: 'Exposed Ledge',   range: [-30,  34] },
    { id: 'B', label: 'Storm Crossings', range: [ 34,  94] },
    { id: 'C', label: 'Summit Lookout',  range: [ 94, 146] },
  ],

  checkpoints: [
    { x:  30.0, y: 1.35, z: -1.0, label: 'Ridge Gate' },
    { x:  88.0, y: 1.70, z:  0.5, label: 'Storm Lantern' },
    { x: 121.5, y: 2.10, z:  1.5, label: 'Skybridge Rail' },
  ],

  ground: { x: 58, y: -0.82, z: L, w: 184, h: 1.64, d: 28 },

  platforms: [
    // Act A — cliff ledge (offset -Z) → gap crossing (+Z) → kite anchor (-Z)
    { name: 'ridgeLedgeA1', x: -18.0, y: 0.32, z: -4.4, w: 18.0, h: 0.72, d:  7.6 },
    { name: 'gapCrossA2',   x:  -4.0, y: 0.56, z:  3.2, w: 10.0, h: 0.66, d:  4.8 },
    { name: 'kiteAnchorA3', x:  14.0, y: 0.80, z: -2.8, w: 18.0, h: 0.72, d:  9.0 },
    // Act B — wind span (+Z) → rock shelf (-Z wide) → storm peak (+Z) → summit approach (-Z)
    { name: 'windSpanB1',   x:  32.0, y: 1.10, z:  2.5, w: 12.0, h: 0.72, d:  6.0 },
    { name: 'rockShelfB2',  x:  52.0, y: 1.40, z: -5.2, w: 18.0, h: 0.76, d:  8.6 },
    { name: 'stormPeakB3',  x:  70.0, y: 1.72, z:  3.4, w: 12.0, h: 0.76, d:  7.0 },
    { name: 'summitApprC1', x:  90.0, y: 1.98, z: -2.8, w: 18.0, h: 0.80, d:  9.2 },
    // Act C — WIDE summit ledge (+Z) → goal lookout (centered)
    { name: 'summitLedgeC2', x: 114.0, y: 2.24, z:  3.0, w: 22.0, h: 0.84, d: 10.0 },
    { name: 'lookoutGoal',   x: 136.5, y: 2.46, z:  0.0, w: 14.0, h: 0.88, d: 11.0 },
    { name: 'recoveryShelfA', x: -10.0, y: 0.34, z:  7.8, w: 12.0, h: 0.56, d: 5.0 },
    { name: 'cliffShelfWest', x: -22.0, y: 0.32, z:  8.8, w: 10.0, h: 0.54, d: 5.2 },
    { name: 'windShelfB',     x:  42.0, y: 1.10, z:  8.6, w: 14.0, h: 0.62, d: 5.4 },
    { name: 'stormShelfLow',  x:  60.0, y: 1.40, z: -10.2, w: 12.0, h: 0.58, d: 4.8 },
    { name: 'cliffForkB',     x:  84.0, y: 1.92, z:  7.8, w: 16.0, h: 0.64, d: 5.6 },
    { name: 'summitSpurC',    x: 118.0, y: 2.24, z: -8.4, w: 18.0, h: 0.68, d: 5.8 },
  ],

  decorPlatforms: [
    { name: 'stormBridgeFrameA', x:  14.0, y: 4.6, z: -7.8, w: 20.0, h: 0.32, d: 2.0 },
    { name: 'kiteRigFrameB',     x:  70.0, y: 5.2, z:  6.8, w: 24.0, h: 0.34, d: 2.2 },
    { name: 'summitMastWalkC',   x: 126.0, y: 5.8, z: -6.8, w: 20.0, h: 0.34, d: 2.0 },
    { name: 'windGateA',         x:  -6.0, y: 5.4, z:  8.6, w: 18.0, h: 0.30, d: 1.8, rotationZ: -0.10 },
    { name: 'summitCableB',      x:  92.0, y: 6.0, z: -8.8, w: 22.0, h: 0.28, d: 1.6, rotationZ: 0.08 },
  ],

  decorBlocks: [
    { name: 'cliffFaceA',   x: -18.0, y: 5.0, z: -9.4, w: 24.0, h: 10.0, d: 5.0, rgb: [48, 52, 58], emissiveScale: 0.02, roughness: 0.94, rotationZ: 0.05 },
    { name: 'cliffFaceB',   x:  40.0, y: 5.4, z:  9.4, w: 32.0, h: 10.8, d: 5.2, rgb: [52, 58, 64], emissiveScale: 0.02, roughness: 0.94, rotationZ: -0.04 },
    { name: 'canyonWall',   x:  84.0, y: 5.8, z: -9.2, w: 26.0, h: 11.6, d: 4.8, rgb: [44, 48, 56], emissiveScale: 0.02, roughness: 0.95, rotationZ: 0.06 },
    { name: 'summitCliff',  x: 122.0, y: 6.6, z:  9.0, w: 30.0, h: 12.8, d: 5.2, rgb: [54, 60, 68], emissiveScale: 0.02, roughness: 0.94, rotationZ: -0.03 },
    { name: 'stormWallNear', x:  10.0, y: 4.8, z: 11.6, w: 18.0, h: 9.6, d: 4.0, rgb: [56, 62, 70], emissiveScale: 0.02, roughness: 0.94, rotationZ: -0.05 },
  ],

  decorColumns: [
    { name: 'mastA', x:  18.0, y: 5.8, z:  8.8, diameter: 1.2, height: 11.0, rgb: [96, 82, 60], roughness: 0.88, cardboard: true },
    { name: 'mastB', x:  70.0, y: 6.4, z: -8.6, diameter: 1.4, height: 12.8, rgb: [96, 82, 60], roughness: 0.88, cardboard: true },
    { name: 'mastC', x: 128.0, y: 7.0, z:  8.4, diameter: 1.3, height: 13.4, rgb: [96, 82, 60], roughness: 0.88, cardboard: true },
    { name: 'mastD', x:  -6.0, y: 5.6, z: -8.8, diameter: 1.2, height: 10.8, rgb: [96, 82, 60], roughness: 0.88, cardboard: true },
  ],

  drops: [
    {
      name: 'kiteRig',
      type: 'item',
      defId: 'kite_rig',
      x: -18.0,
      y: 1.4,
      z: -2.5,
      radius: 1.0,
      autoEquip: true,
      title: 'Kite Rig',
      subtitle: 'Hold Jump in air to glide',
    },
    {
      name: 'whip',
      type: 'item',
      defId: 'kite_string_whip',
      x: 46.0,
      y: 1.96,
      z: -3.5,
      radius: 0.95,
      autoEquip: true,
      title: 'Kite String Whip',
      subtitle: 'Ctrl / Enter / Click for a stun sweep',
    },
    {
      name: 'raincoat',
      type: 'item',
      defId: 'raincoat',
      x: 88.0,
      y: 2.24,
      z: -1.5,
      radius: 0.95,
      autoEquip: true,
      title: 'Raincoat',
      subtitle: '+20% wind resist',
    },
    {
      name: 'rubberBoots',
      type: 'item',
      defId: 'rubber_boots',
      x: 120.0,
      y: 2.72,
      z:  2.5,
      radius: 0.95,
      autoEquip: true,
      title: 'Rubber Boots',
      subtitle: '+20% electric resist',
    },
  ],

  coins: [
    // Act A — cliff ledge, gap crossing, kite anchor
    { x: -20.0, y: 0, z: -3.5 }, { x: -11.0, y: 0, z: -2.0 },
    { x:  -5.0, y: 0, z:  1.0 }, { x:   8.0, y: 0, z: -0.5 },
    { x:  14.0, y: 0, z: -2.5 }, { x:  22.0, y: 0, z: -1.0 },
    // Act B — wind span, rock shelf, storm peak, summit approach
    { x:  32.0, y: 0, z:  2.8 }, { x:  44.0, y: 0, z: -0.5 },
    { x:  52.0, y: 0, z: -4.5 }, { x:  62.0, y: 0, z: -3.0 },
    { x:  70.0, y: 0, z:  2.5 }, { x:  80.0, y: 0, z:  1.0 },
    { x:  90.0, y: 0, z: -2.5 }, { x: 100.0, y: 0, z: -1.0 },
    // Act C — summit ledge, lookout
    { x: 109.0, y: 0, z:  1.0 }, { x: 116.0, y: 0, z:  3.5 },
    { x: 124.0, y: 0, z:  2.0 }, { x: 132.0, y: 0, z:  0.5 },
    { x: 137.0, y: 0, z: -0.5 }, { x: 139.0, y: 0, z:  0.2 },
  ],

  gusts: [
    { name: 'gustA1', x:  -6.0, y: 1.25, z: -1.0, w: 10.0, h: 2.8, d: 7.0, pushX:  3.4, pushZ:  0.6, cycle: 3.4, phaseOffset: 0.00 },
    { name: 'gustA2', x:  24.0, y: 1.48, z:  0.0, w: 10.0, h: 2.8, d: 7.0, pushX: -3.2, pushZ: -0.4, cycle: 3.2, phaseOffset: 0.55 },
    { name: 'gustC1', x: 108.0, y: 2.05, z:  0.5, w: 12.0, h: 3.0, d: 7.6, pushX:  4.2, pushZ:  0.0, cycle: 3.0, phaseOffset: 0.25 },
  ],

  lightning: [
    { name: 'lightningB1', x:  52.0, y: 1.52, z: -2.5, w: 5.6, h: 2.6, d: 5.5, warn: 1.0, active: 0.5, cooldown: 1.2, phaseOffset: 0.00 },
    { name: 'lightningB2', x:  65.0, y: 1.72, z:  0.0, w: 5.8, h: 2.8, d: 5.5, warn: 1.0, active: 0.5, cooldown: 1.3, phaseOffset: 0.50 },
    { name: 'lightningC1', x: 118.0, y: 2.42, z:  2.0, w: 6.2, h: 3.0, d: 6.0, warn: 1.0, active: 0.5, cooldown: 1.2, phaseOffset: 0.90 },
  ],

  sweepers: [
    { name: 'sweeperB', xMin:  72.0, xMax:  88.0, y: 1.85, z: -5.5, width: 7.5, warn: 0.9, active: 0.9, cooldown: 1.1, phaseOffset: 0.25 },
    { name: 'sweeperC', xMin: 112.0, xMax: 130.0, y: 2.40, z:  5.5, width: 7.8, warn: 0.9, active: 0.9, cooldown: 1.0, phaseOffset: 0.75 },
  ],

  enemies: [
    { name: 'sparkA1', kind: 'spark', x:  10.0, y: 2.2, z: -1.5, radius: 0.70, bounds: { minX:  4.0, maxX: 20.0, minY: 1.5, maxY: 2.8, minZ: -4.0, maxZ:  1.5 }, speed: 1.2, turnSpeed: 2.8 },
    { name: 'sparkB1', kind: 'spark', x:  62.0, y: 2.6, z: -3.0, radius: 0.72, bounds: { minX: 56.0, maxX: 68.0, minY: 1.7, maxY: 3.0, minZ: -6.0, maxZ: -1.5 }, speed: 1.3, turnSpeed: 2.9 },
    { name: 'sparkC1', kind: 'spark', x: 122.0, y: 2.9, z:  2.5, radius: 0.74, bounds: { minX: 116.0, maxX: 130.0, minY: 2.1, maxY: 3.4, minZ:  1.0, maxZ:  5.0 }, speed: 1.4, turnSpeed: 3.0 },
  ],

  signage: [
    { x:  -2.0, y: 4.8, z:  8.0, text: 'CLIFF RIDGE →',   width: 7.4, height: 1.8 },
    { x:  60.0, y: 5.2, z: -8.5, text: 'STORM CROSSING',  width: 8.0, height: 1.8 },
    { x: 118.0, y: 5.8, z:  8.5, text: 'SUMMIT LOOKOUT',  width: 9.0, height: 1.8 },
  ],
};

export const LEVEL7 = {
  ...BASE_LEVEL7,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL7, { defaultZ: L }),
};
