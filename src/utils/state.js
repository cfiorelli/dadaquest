// Player state machine constants
export const STATE = {
  CRAWL: 'CRAWL',
  AIR: 'AIR',
  WALL_CLIMB: 'WALL_CLIMB',
  SWING: 'SWING',
  NAP: 'NAP',
};

// Global game state (persists across scene restarts via registry)
export function initRegistry(game) {
  if (!game.registry.has('stamina')) {
    game.registry.set('stamina', 2);
  }
  if (!game.registry.has('staminaMax')) {
    game.registry.set('staminaMax', 4);
  }
  if (!game.registry.has('currentScene')) {
    game.registry.set('currentScene', 'CribScene');
  }
}

export function getStamina(scene) {
  return scene.game.registry.get('stamina') ?? 2;
}

export function getStaminaMax(scene) {
  return scene.game.registry.get('staminaMax') ?? 4;
}

export function setStaminaMax(scene, val) {
  const clamped = Math.max(1, Math.min(8, val));
  scene.game.registry.set('staminaMax', clamped);
  const cur = getStamina(scene);
  if (cur > clamped) setStamina(scene, clamped);
  return clamped;
}

export function setStamina(scene, val) {
  const max = getStaminaMax(scene);
  const clamped = Math.max(0, Math.min(max, val));
  scene.game.registry.set('stamina', clamped);
  return clamped;
}

export function drainStamina(scene, amt) {
  const cur = getStamina(scene);
  return setStamina(scene, cur - amt);
}

export function addStamina(scene, amt) {
  const cur = getStamina(scene);
  return setStamina(scene, cur + amt);
}

export function resetStamina(scene) {
  setStamina(scene, 2);
}
