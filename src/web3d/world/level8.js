import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

const BASE_LEVEL8 = {
  totalCollectibles: 19,
  extents: { minX: -24, maxX: 142 },
  spawn: { x: -18.5, y: 1.2, z: L },
  goal: { x: 136.0, y: 2.6, z: L },
  theme: 'library',

  acts: [
    { id: 'A', label: 'Reading Room', range: [-24, 34] },
    { id: 'B', label: 'Ink Aisles', range: [34, 92] },
    { id: 'C', label: 'Stacks Finale', range: [92, 142] },
  ],

  checkpoints: [
    { x: 30.5, y: 1.35, z: L, label: 'Lamp Bridge' },
    { x: 84.0, y: 1.7, z: L, label: 'Ink Stair' },
    { x: 118.0, y: 2.05, z: L, label: 'Stacks Rail' },
  ],

  ground: { x: 58, y: -0.82, z: L, w: 174, h: 1.64, d: 26 },

  platforms: [
    { name: 'readingDeckA1', x: -9.0, y: 0.34, z: -0.6, w: 26.0, h: 0.72, d: 10.8 },
    { name: 'readingDeckA2', x: 17.0, y: 0.58, z: 0.8, w: 22.0, h: 0.72, d: 10.0 },
    { name: 'inkDeckB1', x: 48.0, y: 0.96, z: -0.8, w: 24.0, h: 0.78, d: 10.4 },
    { name: 'inkDeckB2', x: 74.0, y: 1.28, z: 1.0, w: 22.0, h: 0.78, d: 10.4 },
    { name: 'stacksDeckC1', x: 104.0, y: 1.82, z: -0.4, w: 24.0, h: 0.84, d: 10.0 },
    { name: 'goalDeck', x: 134.0, y: 2.36, z: L, w: 14.0, h: 0.88, d: 10.8 },
  ],

  hiddenBridges: [
    { name: 'hiddenA', x: 25.0, y: 1.32, z: -5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenB', x: 68.0, y: 1.66, z: 4.8, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenC', x: 112.0, y: 2.18, z: -4.6, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
  ],

  paperBridges: [
    { name: 'paperA', x: 36.0, y: 1.14, z: 4.6, w: 8.4, h: 0.32, d: 2.6, warn: 0.7, active: 1.2, cooldown: 1.1, phaseOffset: 0.0 },
    { name: 'paperC', x: 118.0, y: 2.0, z: 4.8, w: 8.8, h: 0.32, d: 2.6, warn: 0.7, active: 1.2, cooldown: 1.0, phaseOffset: 0.5 },
  ],

  drops: [
    {
      name: 'lantern',
      type: 'item',
      defId: 'lantern',
      x: -13.5,
      y: 1.4,
      z: 0.0,
      radius: 1.0,
      autoEquip: true,
      title: 'Lantern',
      subtitle: 'Press E to reveal hidden bridges',
    },
    {
      name: 'boomerang',
      type: 'item',
      defId: 'bookmark_boomerang',
      x: 44.0,
      y: 1.96,
      z: 0.8,
      radius: 0.95,
      autoEquip: true,
      title: 'Bookmark Boomerang',
      subtitle: 'Ctrl / Enter / Click to hit birds and switches',
    },
    {
      name: 'cloak',
      type: 'item',
      defId: 'librarian_cloak',
      x: 82.5,
      y: 2.26,
      z: -0.7,
      radius: 0.95,
      autoEquip: true,
      title: 'Librarian Cloak',
      subtitle: '+25% ink resist',
    },
    {
      name: 'glasses',
      type: 'item',
      defId: 'reading_glasses',
      x: 114.0,
      y: 2.62,
      z: 0.6,
      radius: 0.95,
      autoEquip: true,
      title: 'Reading Glasses',
      subtitle: 'Telegraphs stand out more clearly',
    },
  ],

  lampPosts: [
    { name: 'lampA', x: 4.0, y: 1.0, z: 5.6, radius: 2.5 },
    { name: 'lampB', x: 62.0, y: 1.3, z: -5.6, radius: 2.6 },
    { name: 'lampC', x: 112.0, y: 1.8, z: 5.8, radius: 2.8 },
  ],

  inkPuddles: [
    { name: 'inkB1', x: 52.0, y: 1.02, z: -2.8, w: 6.0, h: 2.4, d: 5.8, warn: 0.9, active: 1.0, cooldown: 1.1, phaseOffset: 0.0 },
    { name: 'inkB2', x: 70.0, y: 1.22, z: 2.8, w: 6.2, h: 2.4, d: 5.8, warn: 0.9, active: 1.0, cooldown: 1.2, phaseOffset: 0.45 },
    { name: 'inkC1', x: 108.0, y: 1.84, z: -2.2, w: 6.2, h: 2.6, d: 5.8, warn: 0.9, active: 1.0, cooldown: 1.2, phaseOffset: 0.8 },
  ],

  enemies: [
    { name: 'birdA1', kind: 'bird', x: 22.0, y: 2.2, z: 3.8, radius: 0.72, bounds: { minX: 18.0, maxX: 30.0, minY: 1.4, maxY: 2.8, minZ: 2.0, maxZ: 5.4 }, speed: 1.2, turnSpeed: 2.6 },
    { name: 'birdB1', kind: 'bird', x: 64.0, y: 2.5, z: -3.4, radius: 0.74, bounds: { minX: 58.0, maxX: 72.0, minY: 1.5, maxY: 3.1, minZ: -5.0, maxZ: -1.8 }, speed: 1.3, turnSpeed: 2.7 },
    { name: 'birdC1', kind: 'bird', x: 118.0, y: 2.9, z: 3.2, radius: 0.76, bounds: { minX: 112.0, maxX: 126.0, minY: 2.0, maxY: 3.5, minZ: 1.6, maxZ: 5.0 }, speed: 1.35, turnSpeed: 2.8 },
  ],

  coins: [
    { x: -15.5, y: 0, z: -2.4 }, { x: -4.8, y: 0, z: 2.3 }, { x: 7.0, y: 0, z: -1.8 },
    { x: 18.5, y: 0, z: 2.2 }, { x: 25.0, y: 0, z: -5.0 }, { x: 28.0, y: 0, z: -5.0 },
    { x: 42.5, y: 0, z: 2.4 }, { x: 52.5, y: 0, z: -1.8 }, { x: 61.0, y: 0, z: 2.4 },
    { x: 68.0, y: 0, z: 4.8 }, { x: 71.0, y: 0, z: 4.8 }, { x: 79.0, y: 0, z: -1.6 },
    { x: 92.5, y: 0, z: 2.2 }, { x: 101.0, y: 0, z: -2.0 }, { x: 109.0, y: 0, z: 4.6 },
    { x: 112.0, y: 0, z: -4.6 }, { x: 118.0, y: 0, z: 1.8 }, { x: 127.0, y: 0, z: -1.4 },
    { x: 135.0, y: 0, z: 0.2 },
  ],

  signage: [
    { x: -2.0, y: 4.8, z: 8.0, text: 'READING ROOM →', width: 7.0, height: 1.8 },
    { x: 58.0, y: 5.3, z: 8.2, text: 'INK AISLES', width: 6.2, height: 1.7 },
    { x: 114.0, y: 5.8, z: 8.2, text: 'COZY STACKS', width: 6.4, height: 1.7 },
  ],
};

const surfacesForCoins = {
  ...BASE_LEVEL8,
  platforms: [...BASE_LEVEL8.platforms, ...BASE_LEVEL8.hiddenBridges, ...BASE_LEVEL8.paperBridges],
};

export const LEVEL8 = {
  ...BASE_LEVEL8,
  coins: normalizeCoinsOnSurfaces(surfacesForCoins, { defaultZ: L }),
};
