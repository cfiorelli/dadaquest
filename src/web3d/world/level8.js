import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';

const L = 0;

// NEW LAYOUT 2026-03-09: connected rooms and aisles — archive to gallery.
// Z sequence: -2.5, +2.5, -3, +3, -2, +2.5, 0
// Width varies: wide archive rooms vs narrow ink aisles.
// Identity: warm wood floors, lamp pools, book-lined walls, no outdoor grammar.
// Set-dressing: bookshelves, roaring fireplaces, velvet armchairs, cocktail tables,
// flying books as enemies — inspired by Manchester Central Library circular galleries.
const BASE_LEVEL8 = {
  totalCollectibles: 19,
  extents: { minX: -24, maxX: 148 },
  spawn: { x: -18.5, y: 1.2, z: L },
  goal: { x: 138.0, y: 2.6, z: L },
  theme: 'library',

  acts: [
    { id: 'A', label: 'Archive Wing',   range: [-24,  44] },
    { id: 'B', label: 'Gallery Aisles', range: [ 44,  98] },
    { id: 'C', label: 'Stacks Finale',  range: [ 98, 148] },
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
    { name: 'hiddenA', x:  26.0, y: 1.32, z: -5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenB', x:  72.0, y: 1.66, z:  5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
    { name: 'hiddenC', x: 114.0, y: 2.16, z: -5.0, w: 10.0, h: 0.4, d: 2.8, revealRadius: 9.0, revealed: false },
  ],

  paperBridges: [
    { name: 'paperA', x:  35.0, y: 1.14, z:  0.0, w: 8.4, h: 0.32, d: 2.6, warn: 0.7, active: 1.2, cooldown: 1.1, phaseOffset: 0.0 },
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
      subtitle: 'Ctrl / Enter / Click to hit flying books and switches',
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

  // Flying books replace birds — same aerial AI, book visual instead of bird body
  enemies: [
    { name: 'bookA1', kind: 'flyingBook', x:  14.0, y: 2.2, z:  3.0, radius: 0.72, bounds: { minX:  8.0, maxX: 24.0, minY: 1.4, maxY: 2.8, minZ:  1.5, maxZ:  5.0 }, speed: 1.2, turnSpeed: 2.6 },
    { name: 'bookB1', kind: 'flyingBook', x:  68.0, y: 2.5, z:  3.5, radius: 0.74, bounds: { minX: 60.0, maxX: 78.0, minY: 1.5, maxY: 3.1, minZ:  1.5, maxZ:  6.0 }, speed: 1.3, turnSpeed: 2.7 },
    { name: 'bookB2', kind: 'flyingBook', x:  88.0, y: 2.4, z: -2.5, radius: 0.74, bounds: { minX: 82.0, maxX: 98.0, minY: 1.6, maxY: 3.0, minZ: -4.5, maxZ: -0.5 }, speed: 1.25, turnSpeed: 2.65 },
    { name: 'bookC1', kind: 'flyingBook', x: 120.0, y: 2.9, z:  2.8, radius: 0.76, bounds: { minX: 114.0, maxX: 128.0, minY: 2.0, maxY: 3.5, minZ:  1.0, maxZ:  5.0 }, speed: 1.35, turnSpeed: 2.8 },
  ],

  // Bookshelves — positioned at outer Z edges of each platform, flush to wall
  bookshelves: [
    // Archive entrance — two tall shelves at far -Z wall
    { x: -17.0, y: 0.70, z: -9.2, w: 9.0,  h: 4.5 },
    { x:  -4.0, y: 0.70, z: -9.2, w: 9.0,  h: 4.5 },
    // Reading hall — shelves at +Z wall
    { x:  10.0, y: 0.96, z:  8.2, w: 8.0,  h: 3.8 },
    { x:  24.0, y: 0.96, z:  8.2, w: 8.0,  h: 3.8 },
    // Gallery main — three tall shelves at +Z, grandest in the level
    { x:  54.0, y: 1.64, z:  9.8, w: 7.5,  h: 5.0 },
    { x:  65.0, y: 1.64, z:  9.8, w: 7.5,  h: 5.0 },
    { x:  76.0, y: 1.64, z:  9.8, w: 7.5,  h: 5.0 },
    // Upper gallery — shelves at -Z wall
    { x:  86.0, y: 2.08, z: -6.8, w: 8.0,  h: 3.6 },
    { x:  97.0, y: 2.08, z: -6.8, w: 8.0,  h: 3.6 },
    // Stacks — dense 4-shelf wall at +Z (the stacks feel)
    { x: 106.0, y: 2.44, z:  8.6, w: 6.0,  h: 3.8 },
    { x: 114.0, y: 2.44, z:  8.6, w: 6.0,  h: 4.2 },
    { x: 122.0, y: 2.44, z:  8.6, w: 6.0,  h: 3.8 },
    { x: 108.0, y: 2.44, z: -7.4, w: 7.0,  h: 3.4 },
    // Goal gallery — single centerpiece shelf behind Dad
    { x: 138.0, y: 2.76, z: -5.2, w: 8.0,  h: 3.2 },
  ],

  // Fireplaces — in the grand rooms
  fireplaces: [
    // Archive entrance fireplace — cozy entry
    { x:  -6.0, y: 0.70, z: -9.4 },
    // Gallery main — two grand fireplaces flanking the room
    { x:  60.0, y: 1.64, z: -9.6, scale: 1.1 },
    { x:  72.0, y: 1.64, z: -9.6, scale: 1.1 },
    // Stacks — one fireplace, warm reading nook
    { x: 116.0, y: 2.44, z: -7.6 },
  ],

  // Antique velvet armchairs — near fireplaces and in reading areas
  readingChairs: [
    // Near archive fireplace, facing inward
    { x:  -4.0, y: 0.70, z: -7.6, rotY:  0.3 },
    { x:  -8.0, y: 0.70, z: -7.6, rotY: -0.3 },
    // Reading hall cluster
    { x:  12.0, y: 0.96, z:  5.8, rotY: Math.PI },
    { x:  18.0, y: 0.96, z:  5.8, rotY: Math.PI },
    { x:  24.0, y: 0.96, z:  5.8, rotY: Math.PI },
    // Gallery main — two pairs flanking fireplaces
    { x:  58.0, y: 1.64, z: -7.4, rotY:  0.2 },
    { x:  62.0, y: 1.64, z: -7.4, rotY: -0.2 },
    { x:  70.0, y: 1.64, z: -7.4, rotY:  0.2 },
    { x:  74.0, y: 1.64, z: -7.4, rotY: -0.2 },
    // Upper gallery
    { x:  88.0, y: 2.08, z: -4.2, rotY:  Math.PI * 0.1 },
    { x:  96.0, y: 2.08, z: -4.2, rotY: -Math.PI * 0.1 },
    // Goal gallery — two grand chairs near Dad
    { x: 135.0, y: 2.76, z: -2.8, rotY:  0.4 },
    { x: 141.0, y: 2.76, z: -2.8, rotY: -0.4 },
  ],

  // Cocktail tables — one per reading cluster
  cocktailTables: [
    { x:  16.0, y: 0.96, z:  6.6 },   // reading hall
    { x:  60.0, y: 1.64, z: -6.2 },   // gallery main left
    { x:  72.0, y: 1.64, z: -6.2 },   // gallery main right
    { x:  92.0, y: 2.08, z: -5.0 },   // upper gallery
    { x: 138.0, y: 2.76, z: -4.2 },   // goal gallery
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
