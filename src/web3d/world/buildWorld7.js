import { LEVEL7 } from './level7.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';

export function buildWorld7(scene, options = {}) {
  return buildEraAdventureWorld(scene, LEVEL7, options);
}
