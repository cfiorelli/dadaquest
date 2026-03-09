import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

const BASE_LEVEL9 = {
  totalCollectibles: 20,
  extents: { minX: -28, maxX: 152 },
  spawn: { x: -22.5, y: 1.2, z: L },
  goal: { x: 144.0, y: 2.7, z: L },
  theme: 'camp',

  acts: [
    { id: 'A', label: 'Lantern Trail', range: [-28, 32] },
    { id: 'B', label: 'Origami Grove', range: [32, 96] },
    { id: 'C', label: 'Campfire Clearing', range: [96, 152] },
  ],

  checkpoints: [
    { x: 26.0, y: 1.34, z: L, label: 'Lantern Fork' },
    { x: 70.0, y: 1.7, z: L, label: 'Origami Grove' },
    { x: 106.0, y: 2.0, z: L, label: 'Fire Ring' },
    { x: 128.0, y: 2.25, z: L, label: 'Lantern Bench' },
  ],

  ground: { x: 60, y: -0.84, z: L, w: 188, h: 1.68, d: 28 },

  platforms: [
    { name: 'trailDeckA1', x: -8.0, y: 0.34, z: -0.7, w: 28.0, h: 0.72, d: 10.8 },
    { name: 'trailDeckA2', x: 18.0, y: 0.62, z: 0.8, w: 22.0, h: 0.72, d: 10.2 },
    { name: 'groveDeckB1', x: 50.0, y: 0.98, z: -0.8, w: 24.0, h: 0.78, d: 10.6 },
    { name: 'groveDeckB2', x: 80.0, y: 1.36, z: 0.9, w: 24.0, h: 0.78, d: 10.8 },
    { name: 'clearingDeckC1', x: 112.0, y: 1.9, z: -0.3, w: 26.0, h: 0.86, d: 10.8 },
    { name: 'familyDeck', x: 140.0, y: 2.42, z: L, w: 16.0, h: 0.9, d: 12.0 },
  ],

  drops: [
    {
      name: 'campLantern',
      type: 'item',
      defId: 'camp_lantern',
      x: -17.0,
      y: 1.4,
      z: 0.1,
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
      z: -0.7,
      radius: 0.95,
      autoEquip: true,
      title: 'Paper Fan',
      subtitle: 'Enter / A / Click to scatter origami hazards',
    },
    {
      name: 'vest',
      type: 'item',
      defId: 'quilted_vest',
      x: 94.0,
      y: 2.34,
      z: 0.9,
      radius: 0.95,
      autoEquip: true,
      title: 'Quilted Vest',
      subtitle: 'Warm shielded layer for the finale',
    },
    {
      name: 'charm',
      type: 'item',
      defId: 'firefly_charm',
      x: 126.0,
      y: 2.7,
      z: -0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Firefly Charm',
      subtitle: 'A little extra spring and speed',
    },
  ],

  lightZones: [
    { name: 'lightA1', x: -4.0, y: 1.0, z: -4.8, radius: 3.2 },
    { name: 'lightB1', x: 56.0, y: 1.3, z: 4.8, radius: 3.2 },
    { name: 'lightC1', x: 108.0, y: 1.8, z: -4.8, radius: 3.4 },
    { name: 'lightC2', x: 130.0, y: 2.15, z: 4.8, radius: 3.6 },
  ],

  puppetSweeps: [
    { name: 'puppetA', xMin: -6.0, xMax: 18.0, y: 1.35, z: -6.4, width: 7.0, warn: 1.0, active: 0.9, cooldown: 1.2, phaseOffset: 0.0 },
    { name: 'puppetB', xMin: 56.0, xMax: 88.0, y: 1.72, z: 6.2, width: 7.2, warn: 1.0, active: 0.9, cooldown: 1.2, phaseOffset: 0.55 },
    { name: 'puppetC', xMin: 108.0, xMax: 134.0, y: 2.1, z: -6.2, width: 7.6, warn: 1.0, active: 0.9, cooldown: 1.1, phaseOffset: 0.9 },
  ],

  triplines: [
    { name: 'tripB1', x1: 64.0, y1: 1.18, x2: 70.0, y2: 1.18, z: -1.6, warn: 0.8, active: 0.7, cooldown: 1.0, phaseOffset: 0.0 },
    { name: 'tripC1', x1: 116.0, y1: 1.66, x2: 122.0, y2: 1.66, z: 1.8, warn: 0.8, active: 0.7, cooldown: 1.0, phaseOffset: 0.45 },
  ],

  embers: [
    { name: 'emberC1', x: 110.0, y: 1.85, z: 0.0, w: 4.4, h: 2.0, d: 4.2, warn: 0.7, active: 0.8, cooldown: 1.1, phaseOffset: 0.0 },
    { name: 'emberC2', x: 134.0, y: 2.2, z: -2.2, w: 4.2, h: 2.0, d: 4.0, warn: 0.7, active: 0.8, cooldown: 1.0, phaseOffset: 0.5 },
  ],

  enemies: [
    { name: 'craneA1', kind: 'crane', x: 10.0, y: 2.2, z: 3.8, radius: 0.72, bounds: { minX: 4.0, maxX: 16.0, minY: 1.5, maxY: 2.8, minZ: 2.0, maxZ: 5.2 }, speed: 1.2, turnSpeed: 2.7 },
    { name: 'foxB1', kind: 'fox', x: 66.0, y: 1.5, z: -3.2, radius: 0.78, bounds: { minX: 58.0, maxX: 76.0, minY: 1.0, maxY: 1.8, minZ: -4.8, maxZ: -1.4 }, speed: 1.55, turnSpeed: 2.9 },
    { name: 'frogB2', kind: 'frog', x: 86.0, y: 1.52, z: 3.2, radius: 0.76, bounds: { minX: 80.0, maxX: 92.0, minY: 1.0, maxY: 1.8, minZ: 1.4, maxZ: 4.8 }, speed: 1.1, turnSpeed: 2.5 },
    { name: 'craneC1', kind: 'crane', x: 120.0, y: 2.6, z: 3.8, radius: 0.74, bounds: { minX: 114.0, maxX: 128.0, minY: 2.0, maxY: 3.2, minZ: 2.0, maxZ: 5.4 }, speed: 1.3, turnSpeed: 2.8 },
  ],

  coins: [
    { x: -19.0, y: 0, z: -2.2 }, { x: -8.2, y: 0, z: 2.3 }, { x: 3.0, y: 0, z: -1.8 },
    { x: 15.5, y: 0, z: 2.1 }, { x: 24.0, y: 0, z: -4.6 }, { x: 28.0, y: 0, z: 1.2 },
    { x: 42.0, y: 0, z: -2.4 }, { x: 52.0, y: 0, z: 2.3 }, { x: 61.5, y: 0, z: -1.4 },
    { x: 72.0, y: 0, z: 4.2 }, { x: 78.5, y: 0, z: -2.0 }, { x: 84.0, y: 0, z: 3.6 },
    { x: 88.5, y: 0, z: -0.4 }, { x: 94.0, y: 0, z: 1.8 }, { x: 101.0, y: 0, z: -2.2 },
    { x: 112.0, y: 0, z: 2.0 }, { x: 120.0, y: 0, z: -1.5 }, { x: 128.0, y: 0, z: 2.2 },
    { x: 136.0, y: 0, z: -1.0 }, { x: 143.0, y: 0, z: 0.0 },
  ],

  signage: [
    { x: -3.0, y: 4.8, z: 8.0, text: 'LANTERN TRAIL →', width: 7.8, height: 1.8 },
    { x: 64.0, y: 5.2, z: 8.2, text: 'ORIGAMI GROVE', width: 7.8, height: 1.8 },
    { x: 120.0, y: 5.9, z: 8.4, text: 'CAMPFIRE CLEARING', width: 9.2, height: 1.8 },
  ],
};

export const LEVEL9 = {
  ...BASE_LEVEL9,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL9, { defaultZ: L }),
};
