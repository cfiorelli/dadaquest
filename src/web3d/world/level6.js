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
  showGroundVisual: false,
  showRouteRibbons: false,

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
    { name: 'loadingBay',     x: -12.0, y: 0.35, z: -2.0, w: 24.0, h: 0.72, d: 14.0 },
    { name: 'beltBridgeA',    x:   4.0, y: 0.54, z:  1.5, w: 12.0, h: 0.68, d:  5.0 },
    // Act B — press bay (wide) → furnace approach (wide) → crane platform (narrow) → gear deck (narrow)
    // Z: -3 → +2 → -3.5 → +1.5
    { name: 'pressHallB1',   x:  24.0, y: 0.92, z: -3.0, w: 24.0, h: 0.76, d: 12.0 },
    { name: 'furnaceB2',     x:  46.0, y: 1.30, z:  2.0, w: 22.0, h: 0.80, d: 13.0 },
    { name: 'cranePlatform', x:  66.0, y: 1.70, z: -3.5, w: 12.0, h: 0.80, d:  8.0 },
    { name: 'gearDeckB4',    x:  83.0, y: 2.06, z:  1.5, w: 12.0, h: 0.78, d:  7.6 },
    // Act C — assembly hall (wide) → goal deck
    { name: 'assemblyC1',   x: 102.0, y: 2.30, z: -2.0, w: 24.0, h: 0.84, d: 13.0 },
    { name: 'goalDeck',     x: 131.0, y: 2.52, z:  0.0, w: 12.0, h: 0.86, d: 10.0 },
    { name: 'intakeSideDock',  x: -18.0, y: 0.34, z:  6.6, w: 14.0, h: 0.58, d:  5.6 },
    { name: 'loadingWestApron', x: -16.0, y: 0.34, z: -8.6, w: 12.0, h: 0.56, d:  5.0 },
    { name: 'pressSideBay',    x:  30.0, y: 0.94, z:  7.0, w: 16.0, h: 0.68, d:  6.8 },
    { name: 'furnaceNorth',    x:  54.0, y: 1.30, z: -8.2, w: 18.0, h: 0.66, d:  4.8 },
    { name: 'furnaceSouthWalk', x:  50.0, y: 1.30, z:  9.2, w: 14.0, h: 0.60, d:  4.2 },
    { name: 'assemblySpur',    x: 110.0, y: 2.28, z:  7.2, w: 18.0, h: 0.68, d:  5.8 },
    { name: 'assemblyBackline', x: 106.0, y: 2.28, z: -8.6, w: 18.0, h: 0.62, d:  4.8 },
  ],

  decorPlatforms: [
    { name: 'trussWalkA',    x:  12.0, y: 4.6, z: -7.0, w: 30.0, h: 0.34, d: 2.0 },
    { name: 'furnaceCanopy', x:  50.0, y: 5.1, z:  6.2, w: 20.0, h: 0.34, d: 2.4 },
    { name: 'craneRail',     x:  86.0, y: 5.8, z:  7.2, w: 34.0, h: 0.34, d: 2.2 },
    { name: 'stackBridge',   x: 124.0, y: 5.2, z: -7.6, w: 20.0, h: 0.34, d: 2.0 },
    { name: 'overheadCraneA', x: -10.0, y: 6.2, z:  0.6, w: 26.0, h: 0.32, d: 2.0 },
    { name: 'ductRunB',       x:  62.0, y: 6.0, z: -9.6, w: 26.0, h: 0.30, d: 1.8, rotationZ: 0.06 },
  ],

  decorBlocks: [
    { name: 'bayWallA',     x: -18.0, y: 4.0, z: -10.2, w: 22.0, h: 8.2, d: 4.4, rgb: [54, 40, 26], emissiveScale: 0.02, roughness: 0.92 },
    { name: 'bayWallB',     x:  18.0, y: 4.4, z:  10.0, w: 24.0, h: 8.8, d: 4.2, rgb: [64, 46, 28], emissiveScale: 0.02, roughness: 0.90 },
    { name: 'pressMass',    x:  42.0, y: 4.2, z: -8.6, w: 20.0, h: 7.6, d: 4.8, rgb: [78, 54, 30], emissiveScale: 0.03, roughness: 0.88, rotationZ: -0.03 },
    { name: 'furnaceMass',  x:  50.0, y: 4.6, z:  8.8, w: 20.0, h: 8.6, d: 5.4, rgb: [110, 66, 24], emissiveScale: 0.06, roughness: 0.84, rotationZ: 0.04 },
    { name: 'craneTower',   x:  96.0, y: 5.3, z: -9.6, w: 20.0, h: 9.8, d: 4.2, rgb: [62, 44, 28], emissiveScale: 0.02, roughness: 0.90 },
    { name: 'controlBlock', x: 126.0, y: 4.9, z:  9.6, w: 18.0, h: 8.8, d: 4.0, rgb: [66, 48, 30], emissiveScale: 0.02, roughness: 0.90 },
  ],

  decorColumns: [
    { name: 'stackA', x: 110.0, y: 6.0, z:  10.4, diameter: 3.0, height: 12.0, rgb: [70, 54, 36], roughness: 0.88 },
    { name: 'stackB', x: 126.0, y: 6.8, z:  11.2, diameter: 3.4, height: 13.6, rgb: [74, 58, 40], roughness: 0.88 },
    { name: 'pylonA', x:   2.0, y: 3.4, z: -8.8, diameter: 1.4, height: 6.8, rgb: [92, 74, 56], roughness: 0.84 },
    { name: 'pylonB', x:  72.0, y: 4.6, z:  8.8, diameter: 1.6, height: 8.4, rgb: [92, 74, 56], roughness: 0.84 },
    { name: 'gantryPost', x: -6.0, y: 4.0, z: 8.2, diameter: 1.2, height: 8.0, rgb: [96, 74, 50], roughness: 0.84 },
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
