import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

const BASE_LEVEL6 = {
  totalCollectibles: 18,
  extents: { minX: -26, maxX: 140 },
  spawn: { x: -20, y: 1.2, z: L },
  goal: { x: 134.5, y: 2.55, z: L },
  theme: 'factory',

  acts: [
    { id: 'A', label: 'Conveyor Intake', range: [-26, 32], checkpointsTo: 1 },
    { id: 'B', label: 'Press Hall', range: [32, 88], checkpointsTo: 2 },
    { id: 'C', label: 'Assembly Finale', range: [88, 140], checkpointsTo: 3 },
  ],

  checkpoints: [
    { x: 28.5, y: 1.35, z: L, label: 'Intake Gate' },
    { x: 82.5, y: 1.7, z: L, label: 'Press Catwalk' },
    { x: 118.5, y: 2.2, z: L, label: 'Assembly Ramp' },
  ],

  ground: { x: 57, y: -0.8, z: L, w: 176, h: 1.6, d: 26 },

  platforms: [
    { name: 'intakeDeckA', x: -12.0, y: 0.35, z: -0.4, w: 26.0, h: 0.72, d: 10.5 },
    { name: 'beltBridgeA', x: 14.0, y: 0.55, z: 0.7, w: 24.0, h: 0.72, d: 9.8 },
    { name: 'pressHallDeckB1', x: 46.0, y: 0.92, z: -0.7, w: 24.0, h: 0.76, d: 10.4 },
    { name: 'pressHallDeckB2', x: 70.5, y: 1.28, z: 0.9, w: 22.0, h: 0.76, d: 10.4 },
    { name: 'gearLiftDeckB3', x: 92.5, y: 1.75, z: -0.5, w: 18.0, h: 0.84, d: 9.8 },
    { name: 'assemblyDeckC1', x: 113.0, y: 2.08, z: 0.6, w: 20.0, h: 0.84, d: 10.0 },
    { name: 'goalDeck', x: 133.0, y: 2.42, z: L, w: 12.0, h: 0.86, d: 10.8 },
  ],

  drops: [
    {
      name: 'boots',
      type: 'item',
      defId: 'conveyor_boots',
      x: -16.2,
      y: 1.35,
      z: 0.0,
      radius: 1.0,
      autoEquip: true,
      title: 'Conveyor Boots',
      subtitle: 'Passive traction on belts and oil slicks',
    },
    {
      name: 'foam',
      type: 'item',
      defId: 'foam_blaster',
      x: 40.5,
      y: 1.88,
      z: 0.8,
      radius: 1.0,
      autoEquip: true,
      title: 'Foam Blaster',
      subtitle: 'Enter / A / Click to push toys away',
    },
    {
      name: 'hat',
      type: 'item',
      defId: 'hard_hat',
      x: 79.5,
      y: 2.18,
      z: -0.7,
      radius: 0.95,
      autoEquip: true,
      title: 'Hard Hat',
      subtitle: '+20% electric resist',
    },
    {
      name: 'belt',
      type: 'item',
      defId: 'tool_belt',
      x: 108.0,
      y: 2.92,
      z: 0.7,
      radius: 0.95,
      autoEquip: true,
      title: 'Tool Belt',
      subtitle: 'Extra carrying room and a little speed',
    },
  ],

  coins: [
    { x: -18.5, y: 0, z: -2.2 }, { x: -8.8, y: 0, z: 2.5 }, { x: 2.0, y: 0, z: -1.7 },
    { x: 13.5, y: 0, z: 2.0 }, { x: 22.5, y: 0, z: -1.0 }, { x: 29.0, y: 0, z: 1.2 },
    { x: 40.0, y: 0, z: 2.6 }, { x: 52.0, y: 0, z: -2.1 }, { x: 61.0, y: 0, z: 1.4 },
    { x: 71.5, y: 0, z: -2.3 }, { x: 80.0, y: 0, z: 1.8 }, { x: 88.2, y: 0, z: -0.8 },
    { x: 97.0, y: 0, z: 2.1 }, { x: 106.0, y: 0, z: -1.8 }, { x: 114.5, y: 0, z: 1.4 },
    { x: 122.2, y: 0, z: -1.4 }, { x: 129.0, y: 0, z: 2.0 }, { x: 134.2, y: 0, z: 0.2 },
  ],

  conveyors: [
    { name: 'beltA1', x: -8.0, y: 1.25, z: -0.4, w: 12.0, h: 2.2, d: 4.8, pushX: 3.6, pushZ: 0.4 },
    { name: 'beltA2', x: 12.5, y: 1.42, z: 1.0, w: 12.0, h: 2.2, d: 4.8, pushX: -3.8, pushZ: -0.2 },
    { name: 'beltC1', x: 103.0, y: 2.25, z: -0.2, w: 12.0, h: 2.6, d: 5.2, pushX: 4.2, pushZ: 0.5 },
  ],

  oilSlicks: [
    { name: 'oilA', x: 20.0, y: 1.02, z: -3.6, w: 5.6, h: 0.3, d: 3.2, slipX: 1.4, slipZ: 0.4 },
    { name: 'oilC', x: 110.8, y: 1.76, z: 3.2, w: 5.2, h: 0.3, d: 3.0, slipX: -1.2, slipZ: -0.5 },
  ],

  presses: [
    { name: 'pressB1', x: 44.0, y: 3.45, z: -1.9, w: 4.0, h: 5.2, d: 4.2, warn: 0.8, active: 0.6, cooldown: 1.0, phaseOffset: 0.0 },
    { name: 'pressB2', x: 58.5, y: 3.45, z: 1.8, w: 4.0, h: 5.2, d: 4.2, warn: 0.8, active: 0.6, cooldown: 1.1, phaseOffset: 0.35 },
    { name: 'pressC1', x: 103.5, y: 3.9, z: -1.4, w: 4.2, h: 5.4, d: 4.2, warn: 0.8, active: 0.6, cooldown: 1.0, phaseOffset: 0.7 },
  ],

  gearLifts: [
    { name: 'gearLiftB1', x: 74.0, y: 1.2, z: -4.8, w: 6.0, h: 0.8, d: 6.0, travel: 1.1, speed: 0.8 },
    { name: 'gearLiftC1', x: 118.0, y: 1.7, z: 4.8, w: 6.4, h: 0.8, d: 6.4, travel: 1.3, speed: 0.9 },
  ],

  enemies: [
    {
      name: 'toyA1',
      kind: 'toy',
      x: 6.0,
      y: 1.15,
      z: -2.8,
      radius: 0.8,
      bounds: { minX: 1.0, maxX: 12.0, minY: 0.8, maxY: 1.6, minZ: -4.5, maxZ: -1.0 },
      speed: 1.5,
      turnSpeed: 2.6,
    },
    {
      name: 'toyB1',
      kind: 'toy',
      x: 54.0,
      y: 1.6,
      z: 2.8,
      radius: 0.82,
      bounds: { minX: 48.0, maxX: 60.0, minY: 1.0, maxY: 1.8, minZ: 1.0, maxZ: 4.2 },
      speed: 1.6,
      turnSpeed: 2.8,
    },
    {
      name: 'toyC1',
      kind: 'toy',
      x: 111.0,
      y: 2.45,
      z: -2.2,
      radius: 0.84,
      bounds: { minX: 106.0, maxX: 118.0, minY: 1.7, maxY: 2.6, minZ: -4.2, maxZ: -0.8 },
      speed: 1.75,
      turnSpeed: 2.9,
    },
  ],

  signage: [
    { x: -4.0, y: 4.8, z: 7.6, text: 'CONVEYOR INTAKE →', width: 8.6, height: 1.9 },
    { x: 48.0, y: 5.2, z: 7.8, text: 'PRESS HALL', width: 6.2, height: 1.7 },
    { x: 108.0, y: 5.8, z: 8.0, text: 'ASSEMBLY CONTROL', width: 8.2, height: 1.9 },
  ],
};

export const LEVEL6 = {
  ...BASE_LEVEL6,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL6, { defaultZ: L }),
};
