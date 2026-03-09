import { LEVEL8 } from './level8.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';

export function buildWorld8(scene, options = {}) {
  return buildEraAdventureWorld(scene, LEVEL8, options);
}
