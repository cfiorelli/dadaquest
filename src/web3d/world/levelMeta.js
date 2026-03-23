export const LEVEL_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const UNDER_CONSTRUCTION_LEVEL_IDS = new Set([]);
export const NON_PLAYABLE_LEVEL_IDS = new Set([]);

export const LEVEL_META = {
  1: {
    id: 1,
    runtimeFamily: '2.5d',
    themeKey: 'petting_zoo',
    title: 'Petting Zoo',
    subtitle: 'Level 1 — Petting Zoo',
    descriptor: 'barnyard intro, simple bounce path',
    theme: 'A sunny petting-yard warmup with fences, pens, and early binky routes.',
    mechanic: 'Basic 2.5D jumping and collectible cleanup.',
  },
  2: {
    id: 2,
    runtimeFamily: '2.5d',
    themeKey: 'condo_garden',
    title: 'Condo Garden',
    subtitle: 'Level 2 — Condo Garden',
    descriptor: 'hedges, planters, garden hops',
    theme: 'A tidy condo garden with ledges, planters, and a first taste of route timing.',
    mechanic: '2.5D lane movement with tighter jumps and floor-route gating.',
  },
  3: {
    id: 3,
    runtimeFamily: '2.5d',
    themeKey: 'grandmas_house',
    title: 'Grandma\'s House',
    subtitle: 'Level 3 — Grandma\'s House',
    descriptor: 'stairs, tables, cozy rooms',
    theme: 'A playful house crawl through furniture, stairs, and cozy indoor props.',
    mechanic: '2.5D room-to-room platforming with more vertical timing.',
  },
  4: {
    id: 4,
    runtimeFamily: '2.5d',
    themeKey: 'super_sourdough',
    title: 'Super Sourdough',
    subtitle: 'Level 4 — Super Sourdough',
    descriptor: 'bakery chaos, flour puffs, finale',
    theme: 'A bakery showdown full of doughy hazards and the first big capstone pacing beat.',
    mechanic: '2.5D challenge gauntlet with Flour Puff support.',
  },
  5: {
    id: 5,
    runtimeFamily: '2.5d',
    themeKey: 'aquarium',
    title: 'Aquarium Drift',
    subtitle: 'Level 5 — Aquarium Drift',
    descriptor: 'glass tanks, service catwalks, short jumps',
    theme: 'A wide aquarium exhibit stitched together with wet decks, viewing glass, and service bridges.',
    mechanic: '2.5D aquarium decks, viewing bridges, and short tank-side jump timing.',
    totalCollectibles: 0,
  },
  6: {
    id: 6,
    runtimeFamily: '2.5d',
    themeKey: 'factory',
    title: 'Pressure Works',
    subtitle: 'Level 6 — Pressure Works',
    descriptor: 'factory bays, pistons, industrial timing',
    theme: 'A pressure-loaded factory run through furnace bays, catwalks, and heavy machine timing.',
    mechanic: '2.5D factory catwalk timing, conveyors, and press reads.',
    totalCollectibles: 0,
  },
  7: {
    id: 7,
    runtimeFamily: '2.5d',
    themeKey: 'storm',
    title: 'Storm Cliffs',
    subtitle: 'Level 7 — Storm Cliffs',
    descriptor: 'exposed ledges, wind recovery, kite rig',
    theme: 'An exposed cliffside route with wind spans, recovery shelves, and high-altitude crossings.',
    mechanic: '2.5D cliff traversal with gust reads and recovery jumps.',
    totalCollectibles: 0,
  },
  8: {
    id: 8,
    runtimeFamily: '2.5d',
    themeKey: 'library',
    title: 'Haunted Library',
    subtitle: 'Level 8 — Haunted Library',
    descriptor: 'shelves, galleries, lantern reveals, flying books',
    theme: 'A grand nighttime library of reading rooms, galleries, and hidden lantern-lit routes.',
    mechanic: '2.5D gallery navigation with lantern reveals and folding routes.',
    totalCollectibles: 0,
  },
  9: {
    id: 9,
    runtimeFamily: '2.5d',
    themeKey: 'camp',
    title: 'Lantern Camp',
    subtitle: 'Level 9 — Lantern Camp',
    descriptor: 'forest paths, bonfire clearing, final rise',
    theme: 'A moonlit forest arrival with lantern boardwalks, a bonfire heart, and a final family overlook.',
    mechanic: '2.5D lantern routes, safe pockets, and finale climbs.',
    totalCollectibles: 0,
  },
};

export function isLevelUnderConstruction(levelId) {
  return UNDER_CONSTRUCTION_LEVEL_IDS.has(Number(levelId));
}

export function isLevelLaunchable(levelId) {
  const id = Number(levelId);
  return LEVEL_ORDER.includes(id) && !NON_PLAYABLE_LEVEL_IDS.has(id);
}

export function getLevelConstructionLabel(levelId) {
  const id = Number(levelId);
  if (!isLevelUnderConstruction(id)) return '';
  return id === 5 ? 'Rebuild Target' : 'Under Construction';
}

export function getLevelConstructionMessage(levelId) {
  const id = Number(levelId);
  if (!isLevelUnderConstruction(id)) return '';
  return `Level ${id} is under construction.`;
}

export function getLevelMeta(levelId) {
  return LEVEL_META[levelId] || LEVEL_META[1];
}

export function getLevelRuntimeFamily(levelId) {
  return getLevelMeta(levelId).runtimeFamily || '2.5d';
}

export function getLevelThemeKey(levelId) {
  return getLevelMeta(levelId).themeKey || 'petting_zoo';
}

export function getLevelSubtitle(levelId) {
  return getLevelMeta(levelId).subtitle;
}

export function getLevelTitle(levelId) {
  return getLevelMeta(levelId).title;
}

export function getLevelDescriptor(levelId) {
  return getLevelMeta(levelId).descriptor;
}

export function getLevelTheme(levelId) {
  return getLevelMeta(levelId).theme;
}

export function getLevelMechanic(levelId) {
  return getLevelMeta(levelId).mechanic;
}
