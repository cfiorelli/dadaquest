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
    { name: 'forestEntry',    x:  -8.0, y: 0.34, z: -2.0, w: 20.0, h: 0.72, d: 11.0 },
    { name: 'lanternPath',    x:  14.0, y: 0.56, z:  3.0, w: 12.0, h: 0.68, d:  6.0 },
    { name: 'grove',          x:  34.0, y: 0.88, z: -3.5, w: 18.0, h: 0.74, d: 12.0 },
    // Act B — bonfire approach (+Z) → WIDE bonfire clearing (-Z, LANDMARK)
    { name: 'bonfireApproach', x:  58.0, y: 1.20, z:  2.5, w: 14.0, h: 0.76, d:  9.0 },
    { name: 'bonfireClearing', x:  82.0, y: 1.56, z: -1.0, w: 28.0, h: 0.82, d: 16.0 },
    // Act C — overlook rise (+Z) → final overlook (-Z) → goal (centered)
    { name: 'overlookRise',   x: 108.0, y: 1.92, z:  3.5, w: 13.0, h: 0.78, d:  8.0 },
    { name: 'finalOverlook',  x: 128.0, y: 2.22, z: -1.5, w: 16.0, h: 0.84, d: 11.0 },
    { name: 'goalPeak',       x: 147.0, y: 2.50, z:  0.0, w: 12.0, h: 0.88, d: 10.0 },
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
