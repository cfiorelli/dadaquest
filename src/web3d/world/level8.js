import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

// NEW LAYOUT 2026-03-09: connected rooms and aisles — archive to gallery.
// Z sequence: -2.5, +2.5, -3, +3, -2, +2.5, 0
// Width varies: wide archive rooms vs narrow ink aisles.
// Identity: warm wood floors, lamp pools, book-lined walls, no outdoor grammar.
const BASE_LEVEL8 = {
  totalCollectibles: 19,
  extents: { minX: -24, maxX: 148 },
  spawn: { x: -18.5, y: 1.2, z: L },
  goal: { x: 138.0, y: 2.6, z: L },
  theme: 'library',

  acts: [
    { id: 'A', label: 'Archive Wing',  range: [-24,  44] },
    { id: 'B', label: 'Gallery Aisles', range: [ 44,  98] },
    { id: 'C', label: 'Stacks Finale', range: [ 98, 148] },
  ],

  checkpoints: [
    { x:  30.5, y: 1.35, z:  2.5, label: 'Lamp Bridge' },
    { x:  84.0, y: 1.70, z: -2.0, label: 'Upper Gallery' },
    { x: 118.0, y: 2.10, z:  2.5, label: 'Stacks Rail' },
  ],

  ground: { x: 61, y: -0.82, z: L, w: 178, h: 1.64, d: 28 },

  platforms: [
    // Act A — wide archive entrance (-Z) → reading hall (+Z) → narrow ink aisle (-Z)
    { name: 'archiveEntrance', x: -10.0, y: 0.34, z: -2.5, w: 26.0, h: 0.72, d: 14.0 },
    { name: 'readingHall',     x:  18.0, y: 0.60, z:  2.5, w: 20.0, h: 0.72, d: 12.0 },
    { name: 'inkAisle',        x:  42.0, y: 0.94, z: -3.0, w: 12.0, h: 0.68, d:  6.0 },
    // Act B — wide gallery (+Z) → upper gallery (-Z)
    { name: 'galleryMain',     x:  66.0, y: 1.28, z:  3.0, w: 24.0, h: 0.78, d: 14.0 },
    { name: 'upperGallery',    x:  92.0, y: 1.72, z: -2.0, w: 18.0, h: 0.80, d: 10.0 },
    // Act C — wide stacks room (+Z) → goal gallery (centered)
    { name: 'stacksRoom',      x: 116.0, y: 2.08, z:  2.5, w: 22.0, h: 0.84, d: 13.0 },
    { name: 'goalGallery',     x: 138.0, y: 2.40, z:  0.0, w: 12.0, h: 0.88, d: 11.0 },
  ],

  hiddenBridges: [
    { name: 'hiddenA', x: 26.0, y: 1.32, z: -5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenB', x: 72.0, y: 1.66, z:  5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenC', x: 114.0, y: 2.16, z: -5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
  ],

  paperBridges: [
    { name: 'paperA', x: 35.0, y: 1.14, z:  0.0, w: 8.4, h: 0.32, d: 2.6, warn: 0.7, active: 1.2, cooldown: 1.1, phaseOffset: 0.0 },
    { name: 'paperC', x: 120.0, y: 2.04, z: -0.5, w: 8.8, h: 0.32, d: 2.6, warn: 0.7, active: 1.2, cooldown: 1.0, phaseOffset: 0.5 },
  ],

  drops: [
    {
      name: 'lantern',
      type: 'item',
      defId: 'lantern',
      x: -13.5,
      y: 1.4,
      z:  0.0,
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
      z: -2.5,
      radius: 0.95,
      autoEquip: true,
      title: 'Bookmark Boomerang',
      subtitle: 'Ctrl / Enter / Click to hit birds and switches',
    },
    {
      name: 'cloak',
      type: 'item',
      defId: 'librarian_cloak',
      x: 94.0,
      y: 2.26,
      z: -1.5,
      radius: 0.95,
      autoEquip: true,
      title: 'Librarian Cloak',
      subtitle: '+25% ink resist',
    },
    {
      name: 'glasses',
      type: 'item',
      defId: 'reading_glasses',
      x: 118.0,
      y: 2.62,
      z:  2.0,
      radius: 0.95,
      autoEquip: true,
      title: 'Reading Glasses',
      subtitle: 'Telegraphs stand out more clearly',
    },
  ],

  lampPosts: [
    { name: 'lampA', x:   4.0, y: 1.0, z:  5.8, radius: 2.5 },
    { name: 'lampB', x:  66.0, y: 1.3, z: -5.8, radius: 2.6 },
    { name: 'lampC', x: 116.0, y: 1.9, z:  5.6, radius: 2.8 },
  ],

  inkPuddles: [
    { name: 'inkA1', x:  38.0, y: 0.96, z: -2.5, w: 5.6, h: 2.4, d: 5.0, warn: 0.9, active: 1.0, cooldown: 1.1, phaseOffset: 0.0  },
    { name: 'inkB1', x:  70.0, y: 1.30, z:  2.5, w: 6.0, h: 2.4, d: 5.8, warn: 0.9, active: 1.0, cooldown: 1.2, phaseOffset: 0.45 },
    { name: 'inkC1', x: 108.0, y: 1.84, z: -1.5, w: 6.2, h: 2.6, d: 5.8, warn: 0.9, active: 1.0, cooldown: 1.2, phaseOffset: 0.8  },
  ],

  enemies: [
    { name: 'birdA1', kind: 'bird', x:  14.0, y: 2.2, z:  3.0, radius: 0.72, bounds: { minX:  8.0, maxX: 24.0, minY: 1.4, maxY: 2.8, minZ:  1.5, maxZ:  5.0 }, speed: 1.2, turnSpeed: 2.6 },
    { name: 'birdB1', kind: 'bird', x:  68.0, y: 2.5, z:  3.5, radius: 0.74, bounds: { minX: 60.0, maxX: 78.0, minY: 1.5, maxY: 3.1, minZ:  1.5, maxZ:  6.0 }, speed: 1.3, turnSpeed: 2.7 },
    { name: 'birdC1', kind: 'bird', x: 120.0, y: 2.9, z:  2.8, radius: 0.76, bounds: { minX: 114.0, maxX: 128.0, minY: 2.0, maxY: 3.5, minZ:  1.0, maxZ:  5.0 }, speed: 1.35, turnSpeed: 2.8 },
  ],

  coins: [
    // Act A — archive entrance, reading hall, ink aisle
    { x: -15.0, y: 0, z: -3.0 }, { x:  -4.0, y: 0, z: -1.5 },
    { x:  10.0, y: 0, z:  3.0 }, { x:  22.0, y: 0, z:  2.0 },
    { x:  36.0, y: 0, z: -5.0 }, { x:  40.0, y: 0, z: -3.5 },
    // Act B — gallery, upper gallery
    { x:  54.0, y: 0, z:  2.0 }, { x:  64.0, y: 0, z:  4.0 },
    { x:  74.0, y: 0, z:  2.5 }, { x:  84.0, y: 0, z: -2.5 },
    { x:  96.0, y: 0, z: -1.5 },
    // Act C — stacks, goal gallery
    { x: 106.0, y: 0, z:  1.5 }, { x: 114.0, y: 0, z:  3.0 },
    { x: 120.0, y: 0, z:  2.0 }, { x: 126.0, y: 0, z: -4.5 },
    { x: 128.0, y: 0, z: -4.5 }, { x: 132.0, y: 0, z:  1.5 },
    { x: 136.0, y: 0, z: -0.5 }, { x: 139.0, y: 0, z:  0.3 },
  ],

  signage: [
    { x:  -2.0, y: 4.8, z:  8.2, text: 'ARCHIVE WING →',  width: 7.4, height: 1.8 },
    { x:  62.0, y: 5.3, z: -8.5, text: 'GALLERY AISLES',  width: 7.6, height: 1.8 },
    { x: 118.0, y: 5.8, z:  8.4, text: 'COZY STACKS',     width: 6.4, height: 1.7 },
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
