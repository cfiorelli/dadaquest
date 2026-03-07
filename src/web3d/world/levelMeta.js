export const LEVEL_ORDER = [1, 2, 3, 4];

export const LEVEL_SUBTITLES = {
  1: 'Level 1 — Petting Zoo',
  2: 'Level 2 — Condo Garden',
  3: 'Level 3 — Grandma\'s House',
  4: 'Level 4 — Super Sourdough',
};

export function getLevelSubtitle(levelId) {
  return LEVEL_SUBTITLES[levelId] || LEVEL_SUBTITLES[1];
}
