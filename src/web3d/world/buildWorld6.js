import { LEVEL6 } from './level6.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';

export function buildWorld6(scene, options = {}) {
  return buildEraAdventureWorld(scene, LEVEL6, options);
}
