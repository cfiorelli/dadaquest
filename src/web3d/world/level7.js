import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

const BASE_LEVEL7 = {
  totalCollectibles: 20,
  extents: { minX: -30, maxX: 146 },
  spawn: { x: -24, y: 1.2, z: L },
  goal: { x: 139.8, y: 2.65, z: L },
  theme: 'storm',

  acts: [
    { id: 'A', label: 'Wind Tutorial Ridge', range: [-30, 34] },
    { id: 'B', label: 'Lightning Field', range: [34, 94] },
    { id: 'C', label: 'Skybridge Finale', range: [94, 146] },
  ],

  checkpoints: [
    { x: 30.0, y: 1.35, z: L, label: 'Ridge Gate' },
    { x: 88.0, y: 1.7, z: L, label: 'Storm Lantern' },
    { x: 121.5, y: 2.1, z: L, label: 'Skybridge Rail' },
  ],

  ground: { x: 58, y: -0.82, z: L, w: 184, h: 1.64, d: 28 },

  platforms: [
    { name: 'ridgeDeckA1', x: -10.0, y: 0.32, z: -0.6, w: 28.0, h: 0.72, d: 11.0 },
    { name: 'gustDeckA2', x: 16.0, y: 0.58, z: 0.6, w: 24.0, h: 0.72, d: 10.0 },
    { name: 'lightningDeckB1', x: 48.0, y: 0.98, z: -0.8, w: 24.0, h: 0.76, d: 10.4 },
    { name: 'stormDeckB2', x: 76.0, y: 1.34, z: 1.2, w: 22.0, h: 0.76, d: 10.6 },
    { name: 'skybridgeC1', x: 106.0, y: 1.86, z: -0.2, w: 24.0, h: 0.82, d: 9.6 },
    { name: 'lookoutDeck', x: 136.5, y: 2.35, z: L, w: 14.0, h: 0.88, d: 11.0 },
  ],

  drops: [
    {
      name: 'kiteRig',
      type: 'item',
      defId: 'kite_rig',
      x: -18.0,
      y: 1.4,
      z: 0.2,
      radius: 1.0,
      autoEquip: true,
      title: 'Kite Rig',
      subtitle: 'Hold Jump in air to glide',
    },
    {
      name: 'whip',
      type: 'item',
      defId: 'kite_string_whip',
      x: 42.0,
      y: 1.92,
      z: -0.6,
      radius: 0.95,
      autoEquip: true,
      title: 'Kite String Whip',
      subtitle: 'Ctrl / Enter / Click for a stun sweep',
    },
    {
      name: 'raincoat',
      type: 'item',
      defId: 'raincoat',
      x: 87.0,
      y: 2.22,
      z: 0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Raincoat',
      subtitle: '+20% wind resist',
    },
    {
      name: 'rubberBoots',
      type: 'item',
      defId: 'rubber_boots',
      x: 118.5,
      y: 2.62,
      z: -0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Rubber Boots',
      subtitle: '+20% electric resist',
    },
  ],

  coins: [
    { x: -21.0, y: 0, z: -2.4 }, { x: -10.2, y: 0, z: 2.0 }, { x: 1.8, y: 0, z: -2.0 },
    { x: 14.5, y: 0, z: 2.3 }, { x: 24.5, y: 0, z: -0.9 }, { x: 31.0, y: 0, z: 1.4 },
    { x: 42.5, y: 0, z: -2.4 }, { x: 54.0, y: 0, z: 2.5 }, { x: 64.0, y: 0, z: -1.4 },
    { x: 73.0, y: 0, z: 2.1 }, { x: 79.5, y: 0, z: -1.8 }, { x: 84.0, y: 0, z: 1.2 },
    { x: 88.5, y: 0, z: -0.2 }, { x: 92.0, y: 0, z: 1.8 }, { x: 98.5, y: 0, z: -2.2 },
    { x: 108.0, y: 0, z: 2.0 }, { x: 116.5, y: 0, z: -1.5 }, { x: 124.5, y: 0, z: 2.4 },
    { x: 132.0, y: 0, z: -1.2 }, { x: 139.0, y: 0, z: 0.2 },
  ],

  gusts: [
    { name: 'gustA1', x: -8.0, y: 1.25, z: 0.0, w: 10.0, h: 2.8, d: 7.0, pushX: 3.4, pushZ: 0.6, cycle: 3.4, phaseOffset: 0.0 },
    { name: 'gustA2', x: 18.0, y: 1.48, z: 0.0, w: 10.0, h: 2.8, d: 7.0, pushX: -3.8, pushZ: -0.4, cycle: 3.2, phaseOffset: 0.55 },
    { name: 'gustC1', x: 108.0, y: 2.05, z: 0.0, w: 12.0, h: 3.0, d: 7.6, pushX: 4.2, pushZ: 0.0, cycle: 3.0, phaseOffset: 0.25 },
  ],

  lightning: [
    { name: 'lightningB1', x: 48.0, y: 1.02, z: -2.4, w: 5.6, h: 2.6, d: 5.4, warn: 1.0, active: 0.5, cooldown: 1.2, phaseOffset: 0.0 },
    { name: 'lightningB2', x: 65.5, y: 1.22, z: 2.5, w: 5.8, h: 2.8, d: 5.4, warn: 1.0, active: 0.5, cooldown: 1.3, phaseOffset: 0.5 },
    { name: 'lightningC1', x: 116.5, y: 1.9, z: -1.6, w: 6.2, h: 3.0, d: 6.0, warn: 1.0, active: 0.5, cooldown: 1.2, phaseOffset: 0.9 },
  ],

  sweepers: [
    { name: 'sweeperB', xMin: 70.0, xMax: 90.0, y: 1.75, z: -4.8, width: 7.5, warn: 0.9, active: 0.9, cooldown: 1.1, phaseOffset: 0.25 },
    { name: 'sweeperC', xMin: 110.0, xMax: 128.5, y: 2.3, z: 4.4, width: 7.8, warn: 0.9, active: 0.9, cooldown: 1.0, phaseOffset: 0.75 },
  ],

  enemies: [
    { name: 'sparkA1', kind: 'spark', x: 8.0, y: 2.2, z: 2.8, radius: 0.7, bounds: { minX: 2.0, maxX: 14.0, minY: 1.5, maxY: 2.8, minZ: 1.0, maxZ: 4.2 }, speed: 1.2, turnSpeed: 2.8 },
    { name: 'sparkB1', kind: 'spark', x: 58.0, y: 2.6, z: -2.4, radius: 0.72, bounds: { minX: 52.0, maxX: 66.0, minY: 1.7, maxY: 3.0, minZ: -4.0, maxZ: -1.0 }, speed: 1.3, turnSpeed: 2.9 },
    { name: 'sparkC1', kind: 'spark', x: 123.0, y: 2.9, z: 2.2, radius: 0.74, bounds: { minX: 118.0, maxX: 130.0, minY: 2.1, maxY: 3.3, minZ: 0.8, maxZ: 4.0 }, speed: 1.4, turnSpeed: 3.0 },
  ],

  signage: [
    { x: -2.0, y: 4.8, z: 8.0, text: 'WIND RIDGE →', width: 7.4, height: 1.8 },
    { x: 60.0, y: 5.2, z: 8.2, text: 'LIGHTNING FIELD', width: 8.0, height: 1.8 },
    { x: 118.0, y: 5.8, z: 8.4, text: 'OBSERVATORY LOOKOUT', width: 9.0, height: 1.8 },
  ],
};

export const LEVEL7 = {
  ...BASE_LEVEL7,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL7, { defaultZ: L }),
};
