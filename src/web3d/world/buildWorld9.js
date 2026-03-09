import { LEVEL9 } from './level9.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';

export function buildWorld9(scene, options = {}) {
  return buildEraAdventureWorld(scene, LEVEL9, options);
}
