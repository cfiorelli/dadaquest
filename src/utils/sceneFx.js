import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import {
  drawContactShadow as _drawContactShadow,
  applyWarmLightVignette as _applyWarmLightVignette,
  applyDepthHaze as _applyDepthHazeOverlay,
  applyDepthTint as _applyDepthTint,
  drawSign,
  generateCardboardTexture,
  generateFeltTexture,
  generateWoodTexture,
  PALETTE,
  drawCardPanel,
  TEXT_STYLES,
  createStitchedLabel,
} from '../art/styleKit.js';

/**
 * COMPATIBILITY LAYER
 * Re-exports styleKit functions with legacy names for existing code
 */

// Contact shadow functions
export const addContactShadow = _drawContactShadow;
export const drawContactShadow = _drawContactShadow;

// Depth haze overlay (atmospheric overlay)
export function addDepthHazeOverlay(scene, strength = 0.1, depth = 30) {
  return _applyDepthHazeOverlay(scene, strength, depth);
}

// Warm light and vignette
export function addWarmLightAndVignette(scene, options = {}) {
  return _applyWarmLightVignette(scene, options);
}

// Depth haze tint for objects (parallax tinting)
export const applyDepthHaze = _applyDepthTint;
export const applyDepthTint = _applyDepthTint;

// Crafted texture generation
export function ensureCraftedTexture(scene, key, options = {}) {
  const w = options.w ?? 128;
  const h = options.h ?? 96;
  return generateCardboardTexture(scene, key, w, h);
}

// Crafted overlay (texture with multiply blend)
export function addCraftedOverlay(scene, key, x, y, w, h, depth = 8, alpha = 0.22) {
  ensureCraftedTexture(scene, key, { w, h });
  return scene.add.image(x, y, key)
    .setDisplaySize(w, h)
    .setDepth(depth)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(alpha);
}

// Diegetic sign (legacy name)
export function addDiegieticSign(scene, x, y, text, depth = 5) {
  return drawSign(scene, x, y, text, 'right', depth);
}

// Re-export all styleKit exports
export {
  PALETTE,
  generateCardboardTexture,
  generateFeltTexture,
  generateWoodTexture,
  drawCardPanel,
  drawSign,
  TEXT_STYLES,
  createStitchedLabel,
};
