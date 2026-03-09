export const LEVEL_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const LEVEL_SUBTITLES = {
  1: 'Level 1 — Petting Zoo',
  2: 'Level 2 — Condo Garden',
  3: 'Level 3 — Grandma\'s House',
  4: 'Level 4 — Super Sourdough',
  5: 'Level 5 — Neon Night Aquarium',
  6: 'Level 6 — Clockwork Toy Factory',
  7: 'Level 7 — Stormy Kite Park',
  8: 'Level 8 — Haunted Library',
  9: 'Level 9 — Lantern Camp',
};

export function getLevelSubtitle(levelId) {
  return LEVEL_SUBTITLES[levelId] || LEVEL_SUBTITLES[1];
}
