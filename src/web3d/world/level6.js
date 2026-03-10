import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

// NEW LAYOUT 2026-03-09: offset catwalk network through industrial bays.
// Z sequence: -2, +1.5, -3, +2, -3.5, +1.5, -2, 0 — strong zigzag between bays.
// Width varies: narrow belt-bridges and crane decks vs wide press bays.
const BASE_LEVEL6 = {
  totalCollectibles: 18,
  extents: { minX: -26, maxX: 140 },
  spawn: { x: -20, y: 1.2, z: L },
  goal: { x: 134.5, y: 2.55, z: L },
  theme: 'factory',

  acts: [
    { id: 'A', label: 'Loading Bay', range: [-26, 32], checkpointsTo: 1 },
    { id: 'B', label: 'Press Hall', range: [32, 88], checkpointsTo: 2 },
    { id: 'C', label: 'Assembly Finale', range: [88, 140], checkpointsTo: 3 },
  ],

  checkpoints: [
    { x: 28.5, y: 1.35, z: -0.5, label: 'Intake Gate' },
    { x: 82.5, y: 1.70, z: -1.0, label: 'Press Catwalk' },
    { x: 118.5, y: 2.20, z: -0.5, label: 'Assembly Ramp' },
  ],

  ground: { x: 57, y: -0.8, z: L, w: 176, h: 1.6, d: 26 },

  platforms: [
    // Act A — loading bay (wide) → belt bridge (narrow) (Z: -2 → +1.5)
    { name: 'loadingBay',     x: -12.0, y: 0.35, z: -2.0, w: 20.0, h: 0.72, d: 13.0 },
    { name: 'beltBridgeA',    x:   4.0, y: 0.54, z:  1.5, w: 12.0, h: 0.68, d:  5.0 },
    // Act B — press bay (wide) → furnace approach (wide) → crane platform (narrow) → gear deck (narrow)
    // Z: -3 → +2 → -3.5 → +1.5
    { name: 'pressHallB1',   x:  24.0, y: 0.92, z: -3.0, w: 20.0, h: 0.76, d: 11.0 },
    { name: 'furnaceB2',     x:  46.0, y: 1.30, z:  2.0, w: 20.0, h: 0.80, d: 12.0 },
    { name: 'cranePlatform', x:  66.0, y: 1.70, z: -3.5, w: 12.0, h: 0.80, d:  8.0 },
    { name: 'gearDeckB4',    x:  83.0, y: 2.06, z:  1.5, w: 10.0, h: 0.78, d:  7.0 },
    // Act C — assembly hall (wide) → goal deck
    { name: 'assemblyC1',   x: 102.0, y: 2.30, z: -2.0, w: 22.0, h: 0.84, d: 12.0 },
    { name: 'goalDeck',     x: 131.0, y: 2.52, z:  0.0, w: 12.0, h: 0.86, d: 10.0 },
  ],

  drops: [
    {
      name: 'boots',
      type: 'item',
      defId: 'conveyor_boots',
      x: -16.2,
      y: 1.35,
      z: -1.5,
      radius: 1.0,
      autoEquip: true,
      title: 'Conveyor Boots',
      subtitle: 'Passive traction on belts and oil slicks',
    },
    {
      name: 'foam',
      type: 'item',
      defId: 'foam_blaster',
      x: 42.5,
      y: 1.88,
      z:  1.5,
      radius: 1.0,
      autoEquip: true,
      title: 'Foam Blaster',
      subtitle: 'Ctrl / Enter / Click to push toys away',
    },
    {
      name: 'hat',
      type: 'item',
      defId: 'hard_hat',
      x: 80.5,
      y: 2.24,
      z: -1.0,
      radius: 0.95,
      autoEquip: true,
      title: 'Hard Hat',
      subtitle: '+20% electric resist',
    },
    {
      name: 'belt',
      type: 'item',
      defId: 'tool_belt',
      x: 110.0,
      y: 2.98,
      z: -0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Tool Belt',
      subtitle: 'Extra carrying room and a little speed',
    },
  ],

  coins: [
    // Act A — loading bay and belt bridge
    { x: -18.5, y: 0, z: -2.8 }, { x: -8.0, y: 0, z: -1.5 },
    { x:   2.5, y: 0, z:  1.0 }, { x:  12.0, y: 0, z:  2.0 },
    // Act B — press hall, furnace, crane, gear deck
    { x:  20.0, y: 0, z: -3.5 }, { x:  28.5, y: 0, z: -2.0 },
    { x:  42.0, y: 0, z:  2.5 }, { x:  50.0, y: 0, z:  1.0 },
    { x:  62.0, y: 0, z: -2.5 }, { x:  68.0, y: 0, z: -3.0 },
    { x:  80.0, y: 0, z:  1.8 }, { x:  86.0, y: 0, z:  0.5 },
    // Act C — assembly hall and goal
    { x:  98.0, y: 0, z: -2.0 }, { x: 107.0, y: 0, z: -1.0 },
    { x: 115.0, y: 0, z: -1.5 }, { x: 122.0, y: 0, z:  0.5 },
    { x: 129.0, y: 0, z:  1.0 }, { x: 134.2, y: 0, z:  0.2 },
  ],

  conveyors: [
    // Near loading bay exit — pushes toward furnace
    { name: 'beltA1', x:  -6.0, y: 1.10, z: -1.0, w: 12.0, h: 2.2, d: 5.0, pushX:  3.6, pushZ: -0.5 },
    { name: 'beltA2', x:  12.0, y: 1.30, z:  1.5, w: 10.0, h: 2.2, d: 4.5, pushX: -3.2, pushZ:  0.3 },
    // Assembly section
    { name: 'beltC1', x: 105.0, y: 2.50, z: -0.8, w: 12.0, h: 2.6, d: 5.5, pushX:  4.0, pushZ: -0.5 },
  ],

  oilSlicks: [
    { name: 'oilA', x:  20.0, y: 1.04, z: -1.5, w: 5.6, h: 0.3, d: 3.5, slipX:  1.4, slipZ: -0.3 },
    { name: 'oilC', x: 112.0, y: 2.02, z: -1.0, w: 5.2, h: 0.3, d: 3.2, slipX: -1.2, slipZ:  0.4 },
  ],

  presses: [
    // On press hall (z=-3) and furnace (z=+2)
    { name: 'pressB1', x:  26.0, y: 3.25, z: -1.5, w: 4.0, h: 5.2, d: 4.5, warn: 0.8, active: 0.6, cooldown: 1.0, phaseOffset: 0.00 },
    { name: 'pressB2', x:  40.0, y: 3.45, z:  1.0, w: 4.0, h: 5.2, d: 4.5, warn: 0.8, active: 0.6, cooldown: 1.1, phaseOffset: 0.35 },
    { name: 'pressC1', x: 106.0, y: 3.90, z: -1.0, w: 4.2, h: 5.4, d: 4.5, warn: 0.8, active: 0.6, cooldown: 1.0, phaseOffset: 0.70 },
  ],

  gearLifts: [
    // Between cranePlatform (z=-3.5) and gearDeck (z=+1.5)
    { name: 'gearLiftB1', x:  74.0, y: 1.20, z: -5.5, w: 6.0, h: 0.8, d: 6.0, travel: 1.1, speed: 0.8 },
    { name: 'gearLiftC1', x: 120.0, y: 1.70, z:  5.0, w: 6.4, h: 0.8, d: 6.4, travel: 1.3, speed: 0.9 },
  ],

  enemies: [
    {
      name: 'toyA1',
      kind: 'toy',
      x:   8.0,
      y:  1.15,
      z:   1.5,
      radius: 0.8,
      bounds: { minX:  2.0, maxX: 14.0, minY: 0.8, maxY: 1.6, minZ:  0.0, maxZ:  3.5 },
      speed: 1.5,
      turnSpeed: 2.6,
    },
    {
      name: 'toyB1',
      kind: 'toy',
      x:  54.0,
      y:  1.65,
      z:  -2.5,
      radius: 0.82,
      bounds: { minX: 48.0, maxX: 62.0, minY: 1.0, maxY: 1.9, minZ: -5.0, maxZ: -1.0 },
      speed: 1.6,
      turnSpeed: 2.8,
    },
    {
      name: 'toyC1',
      kind: 'toy',
      x: 113.0,
      y:  2.48,
      z:  -1.5,
      radius: 0.84,
      bounds: { minX: 106.0, maxX: 120.0, minY: 1.8, maxY: 2.8, minZ: -4.0, maxZ:  0.5 },
      speed: 1.75,
      turnSpeed: 2.9,
    },
  ],

  signage: [
    { x:  -2.0, y: 4.8, z:  7.5, text: 'LOADING BAY →',     width: 8.0, height: 1.9 },
    { x:  50.0, y: 5.2, z: -8.0, text: 'PRESS HALL',         width: 6.2, height: 1.7 },
    { x: 108.0, y: 5.8, z:  7.8, text: 'ASSEMBLY CONTROL',   width: 8.2, height: 1.9 },
  ],
};

export const LEVEL6 = {
  ...BASE_LEVEL6,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL6, { defaultZ: L }),
};
