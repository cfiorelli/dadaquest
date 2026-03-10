import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

// NEW LAYOUT 2026-03-09: outdoor clearing with boardwalks and a bonfire landmark.
// Z sequence: -2, +3, -3.5, +2.5, -1, +3.5, -1.5, 0
// Width varies: narrow lantern boardwalks vs wide bonfire clearing (landmark).
// Identity: forest earth, plank seams, ember glow, no indoor grammar.
const BASE_LEVEL9 = {
  totalCollectibles: 20,
  extents: { minX: -28, maxX: 156 },
  spawn: { x: -22.5, y: 1.2, z: L },
  goal: { x: 147.0, y: 2.7, z: L },
  theme: 'camp',
  showGroundVisual: false,
  showRouteRibbons: false,

  acts: [
    { id: 'A', label: 'Forest Entry',   range: [-28,  42] },
    { id: 'B', label: 'Grove Path',     range: [ 42,  98] },
    { id: 'C', label: 'Bonfire Summit', range: [ 98, 156] },
  ],

  checkpoints: [
    { x:  26.0, y: 1.34, z:  3.0, label: 'Lantern Fork' },
    { x:  72.0, y: 1.72, z: -1.0, label: 'Bonfire Clearing' },
    { x: 110.0, y: 2.02, z:  3.5, label: 'Overlook Rise' },
    { x: 130.0, y: 2.28, z: -1.5, label: 'Lantern Bench' },
  ],

  ground: { x: 63, y: -0.84, z: L, w: 192, h: 1.68, d: 30 },

  platforms: [
    // Act A — forest entry (-Z) → narrow lantern boardwalk (+Z) → grove (-Z)
    { name: 'forestEntry',    x:  -8.0, y: 0.34, z: -2.6, w: 22.0, h: 0.72, d: 11.8 },
    { name: 'lanternPath',    x:  14.0, y: 0.56, z:  3.6, w: 12.0, h: 0.68, d:  6.0 },
    { name: 'grove',          x:  34.0, y: 0.88, z: -4.2, w: 20.0, h: 0.74, d: 12.8 },
    // Act B — bonfire approach (+Z) → WIDE bonfire clearing (-Z, LANDMARK)
    { name: 'bonfireApproach', x:  58.0, y: 1.20, z:  3.0, w: 16.0, h: 0.76, d:  9.6 },
    { name: 'bonfireClearing', x:  82.0, y: 1.56, z: -1.0, w: 30.0, h: 0.82, d: 16.8 },
    // Act C — overlook rise (+Z) → final overlook (-Z) → goal (centered)
    { name: 'overlookRise',   x: 108.0, y: 1.92, z:  4.0, w: 13.0, h: 0.78, d:  8.0 },
    { name: 'finalOverlook',  x: 128.0, y: 2.22, z: -1.8, w: 18.0, h: 0.84, d: 11.6 },
    { name: 'goalPeak',       x: 147.0, y: 2.50, z:  0.0, w: 12.0, h: 0.88, d: 10.0 },
    { name: 'lanternForkEast', x:  18.0, y: 0.58, z:  8.6, w: 12.0, h: 0.56, d: 5.0 },
    { name: 'lanternForkWest', x:   2.0, y: 0.48, z: -9.0, w: 10.0, h: 0.54, d: 5.0 },
    { name: 'groveBranchB',    x:  58.0, y: 1.20, z: -8.0, w: 16.0, h: 0.62, d: 5.8 },
    { name: 'clearingRingB',   x:  82.0, y: 1.56, z:  8.4, w: 18.0, h: 0.60, d: 6.8 },
    { name: 'campCircleWest',  x:  74.0, y: 1.56, z: -9.0, w: 14.0, h: 0.58, d: 5.4 },
    { name: 'finalShrineSpur', x: 130.0, y: 2.22, z:  7.2, w: 16.0, h: 0.64, d: 5.4 },
  ],

  decorPlatforms: [
    { name: 'lanternLineA',    x:  12.0, y: 4.8, z:  7.8, w: 26.0, h: 0.28, d: 1.8 },
    { name: 'canopyBridgeB',   x:  78.0, y: 5.2, z: -8.2, w: 28.0, h: 0.30, d: 2.0 },
    { name: 'overlookCanopyC', x: 136.0, y: 5.8, z:  6.6, w: 18.0, h: 0.30, d: 2.0 },
    { name: 'treelineLintel',  x:  -6.0, y: 5.4, z:  8.6, w: 18.0, h: 0.28, d: 1.8, rotationZ: -0.08 },
    { name: 'shrineBeam',      x: 132.0, y: 6.0, z: -7.8, w: 18.0, h: 0.28, d: 1.8, rotationZ: 0.05 },
  ],

  decorBlocks: [
    { name: 'treeLineA',    x: -18.0, y: 4.4, z: -9.8, w: 22.0, h: 8.8, d: 4.6, rgb: [38, 30, 22], emissiveScale: 0.01, roughness: 0.94, cardboard: true, rotationZ: 0.04 },
    { name: 'tentMassB',    x:  54.0, y: 3.2, z: -9.4, w: 18.0, h: 5.4, d: 7.4, rgb: [88, 54, 30], emissiveScale: 0.02, roughness: 0.88, cardboard: true, rotationZ: -0.02 },
    { name: 'fireRingWall', x:  82.0, y: 3.8, z:  9.8, w: 28.0, h: 6.8, d: 4.0, rgb: [54, 40, 24], emissiveScale: 0.02, roughness: 0.92, cardboard: true },
    { name: 'shrineWall',   x: 132.0, y: 5.0, z: -9.2, w: 20.0, h: 8.2, d: 3.8, rgb: [50, 38, 24], emissiveScale: 0.01, roughness: 0.92, cardboard: true },
    { name: 'campEdge',     x:  10.0, y: 3.8, z: 10.2, w: 18.0, h: 7.0, d: 4.0, rgb: [42, 32, 24], emissiveScale: 0.01, roughness: 0.94, cardboard: true },
  ],

  decorColumns: [
    { name: 'moonTree', x: 100.0, y: 6.0, z:  9.4, diameter: 2.8, height: 12.0, rgb: [64, 48, 30], roughness: 0.90, cardboard: true },
    { name: 'pineA',    x:   8.0, y: 5.0, z:  9.6, diameter: 1.6, height: 10.0, rgb: [48, 36, 24], roughness: 0.92, cardboard: true },
    { name: 'pineB',    x:  40.0, y: 5.4, z: -9.4, diameter: 1.8, height: 10.8, rgb: [48, 36, 24], roughness: 0.92, cardboard: true },
    { name: 'pineC',    x: 124.0, y: 5.8, z:  9.6, diameter: 1.7, height: 11.2, rgb: [50, 38, 24], roughness: 0.92, cardboard: true },
    { name: 'pineD',    x: -10.0, y: 5.2, z: -9.6, diameter: 1.6, height: 10.4, rgb: [48, 36, 24], roughness: 0.92, cardboard: true },
  ],

  drops: [
    {
      name: 'campLantern',
      type: 'item',
      defId: 'camp_lantern',
      x: -17.0,
      y: 1.4,
      z: -1.8,
      radius: 1.0,
      autoEquip: true,
      title: 'Camp Lantern',
      subtitle: 'Press E to boost a personal safe light',
    },
    {
      name: 'paperFan',
      type: 'item',
      defId: 'paper_fan',
      x: 44.0,
      y: 1.98,
      z: -3.0,
      radius: 0.95,
      autoEquip: true,
      title: 'Paper Fan',
      subtitle: 'Ctrl / Enter / Click to scatter origami hazards',
    },
    {
      name: 'vest',
      type: 'item',
      defId: 'quilted_vest',
      x: 86.0,
      y: 2.34,
      z: -0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Quilted Vest',
      subtitle: 'Warm shielded layer for the finale',
    },
    {
      name: 'charm',
      type: 'item',
      defId: 'firefly_charm',
      x: 128.0,
      y: 2.7,
      z: -1.0,
      radius: 0.95,
      autoEquip: true,
      title: 'Firefly Charm',
      subtitle: 'A little extra spring and speed',
    },
  ],

  lightZones: [
    { name: 'lightA1', x:  -4.0, y: 1.0, z: -5.0, radius: 3.2 },
    { name: 'lightB1', x:  56.0, y: 1.3, z:  4.8, radius: 3.2 },
    { name: 'lightC1', x:  80.0, y: 1.7, z: -4.6, radius: 3.4 },
    { name: 'lightC2', x: 120.0, y: 2.1, z:  5.2, radius: 3.6 },
  ],

  puppetSweeps: [
    { name: 'puppetA', xMin:  -6.0, xMax:  16.0, y: 1.35, z: -5.5, width: 7.0, warn: 1.0, active: 0.9, cooldown: 1.2, phaseOffset: 0.0  },
    { name: 'puppetB', xMin:  58.0, xMax:  82.0, y: 1.72, z:  6.0, width: 7.2, warn: 1.0, active: 0.9, cooldown: 1.2, phaseOffset: 0.55 },
    { name: 'puppetC', xMin: 108.0, xMax: 130.0, y: 2.12, z: -6.0, width: 7.6, warn: 1.0, active: 0.9, cooldown: 1.1, phaseOffset: 0.9  },
  ],

  triplines: [
    { name: 'tripA1', x1:  28.0, y1: 0.96, x2:  34.0, y2: 0.96, z: -3.5, warn: 0.8, active: 0.7, cooldown: 1.0, phaseOffset: 0.0  },
    { name: 'tripC1', x1: 116.0, y1: 1.68, x2: 122.0, y2: 1.68, z: -1.5, warn: 0.8, active: 0.7, cooldown: 1.0, phaseOffset: 0.45 },
  ],

  embers: [
    { name: 'emberC1', x:  82.0, y: 1.62, z:  0.0, w: 4.4, h: 2.0, d: 4.2, warn: 0.7, active: 0.8, cooldown: 1.1, phaseOffset: 0.0 },
    { name: 'emberC2', x: 132.0, y: 2.28, z: -1.5, w: 4.2, h: 2.0, d: 4.0, warn: 0.7, active: 0.8, cooldown: 1.0, phaseOffset: 0.5 },
  ],

  enemies: [
    { name: 'craneA1', kind: 'crane', x:  10.0, y: 2.2, z: -2.5, radius: 0.72, bounds: { minX:  4.0, maxX: 16.0, minY: 1.5, maxY: 2.8, minZ: -4.5, maxZ:  0.5 }, speed: 1.2, turnSpeed: 2.7 },
    { name: 'foxB1',   kind: 'fox',   x:  38.0, y: 1.5, z: -3.5, radius: 0.78, bounds: { minX: 30.0, maxX: 46.0, minY: 1.0, maxY: 1.8, minZ: -5.5, maxZ: -1.5 }, speed: 1.55, turnSpeed: 2.9 },
    { name: 'frogB2',  kind: 'frog',  x:  62.0, y: 1.5, z:  2.5, radius: 0.76, bounds: { minX: 54.0, maxX: 70.0, minY: 1.0, maxY: 1.8, minZ:  0.5, maxZ:  4.5 }, speed: 1.1,  turnSpeed: 2.5 },
    { name: 'craneC1', kind: 'crane', x: 112.0, y: 2.6, z:  3.5, radius: 0.74, bounds: { minX: 106.0, maxX: 120.0, minY: 2.0, maxY: 3.2, minZ:  1.5, maxZ:  5.5 }, speed: 1.3, turnSpeed: 2.8 },
  ],

  coins: [
    // Act A — forest entry, lantern path, grove
    { x: -19.0, y: 0, z: -2.5 }, { x:  -8.0, y: 0, z: -1.5 },
    { x:  12.0, y: 0, z:  3.0 }, { x:  18.0, y: 0, z:  2.5 },
    { x:  30.0, y: 0, z: -4.0 }, { x:  38.0, y: 0, z: -3.0 },
    // Act B — bonfire approach, bonfire clearing
    { x:  52.0, y: 0, z:  2.5 }, { x:  60.0, y: 0, z:  1.5 },
    { x:  72.0, y: 0, z: -1.5 }, { x:  80.0, y: 0, z: -0.5 },
    { x:  88.0, y: 0, z:  1.0 }, { x:  94.0, y: 0, z: -2.0 },
    // Act C — overlook rise, final overlook, goal
    { x: 106.0, y: 0, z:  3.5 }, { x: 112.0, y: 0, z:  2.5 },
    { x: 122.0, y: 0, z: -2.0 }, { x: 128.0, y: 0, z: -1.0 },
    { x: 134.0, y: 0, z:  0.5 }, { x: 140.0, y: 0, z: -0.8 },
    { x: 145.0, y: 0, z:  0.5 }, { x: 148.0, y: 0, z: -0.2 },
  ],

  signage: [
    { x:  -3.0, y: 4.8, z:  8.2, text: 'FOREST ENTRY →',    width: 8.0, height: 1.8 },
    { x:  66.0, y: 5.3, z: -8.5, text: 'BONFIRE CLEARING',  width: 8.8, height: 1.8 },
    { x: 122.0, y: 5.9, z:  8.4, text: 'SUMMIT OVERLOOK',   width: 8.4, height: 1.8 },
  ],
};

export const LEVEL9 = {
  ...BASE_LEVEL9,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL9, { defaultZ: L }),
};
