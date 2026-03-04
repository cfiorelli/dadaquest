import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';

/**
 * DADAQUEST ART DIRECTION KIT
 * Single source of truth for crafted diorama aesthetic
 */

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC RNG — Seeded randomness for visual stability
// ═══════════════════════════════════════════════════════════════════════════

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

/**
 * FNV-1a 32-bit hash
 */
function hash32(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG (deterministic)
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Create seeded RNG with int/float helpers
 */
function makeRng(seedStr) {
  const seed = hash32(seedStr);
  const rng = mulberry32(seed);
  
  return {
    float: (min = 0, max = 1) => min + rng() * (max - min),
    int: (min, max) => Math.floor(min + rng() * (max - min + 1)),
  };
}

/**
 * Create deterministic RNG for visual elements
 * In test mode and production, uses buildSha + sceneKey + tag for stability
 */
export function makeStyleRng(sceneKey, tag = '') {
  const seedStr = `${BUILD_SHA}:${sceneKey}:${tag}`;
  return makeRng(seedStr);
}

// ═══════════════════════════════════════════════════════════════════════════
// PALETTE — Warm neutrals + accent colors
// ═══════════════════════════════════════════════════════════════════════════
export const PALETTE = {
  // Cardboard / wood tones
  cardboardLight: 0xf2e0c0,
  cardboardMid: 0xd2b487,
  cardboardDark: 0xb99765,
  cardboardEdge: 0x8b5e28,
  
  woodLight: 0xe7c79a,
  woodMid: 0xcfa574,
  woodDark: 0xb38556,
  
  // Felt / fabric
  feltCream: 0xf0e8d5,
  feltBlue: 0xa5d8ff,
  feltPink: 0xf8bbd0,
  
  // Paper / canvas
  paperWhite: 0xfff8ed,
  paperCream: 0xfce4ec,
  
  // Accents
  warmGlow: 0xffd8a7,
  highlight: 0xfff0e0,
  shadow: 0x4a3420,
  
  // UI
  titleGold: 0xffd93d,
  hintGreen: 0xaaffaa,
  textDark: 0x222222,
};

// ═══════════════════════════════════════════════════════════════════════════
// TEXTURE GENERATORS — Canvas-based, no external assets
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate cardboard texture with fiber noise + edge darkening
 */
export function generateCardboardTexture(scene, key, w = 128, h = 96) {
  if (scene.textures.exists(key)) return key;
  
  const rng = makeStyleRng('styleKit', `tex:${key}`);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  
  // Base gradient
  g.fillGradientStyle(
    PALETTE.cardboardLight, PALETTE.cardboardLight,
    PALETTE.cardboardMid, PALETTE.cardboardDark,
    1, 1, 1, 1
  );
  g.fillRoundedRect(0, 0, w, h, 8);
  
  // Border outline
  g.lineStyle(2, PALETTE.cardboardEdge, 0.6);
  g.strokeRoundedRect(1, 1, w - 2, h - 2, 7);
  
  // Fiber texture (deterministic dots)
  const fiberCount = Math.floor((w * h) / 90);
  for (let i = 0; i < fiberCount; i++) {
    const px = rng.int(2, w - 3);
    const py = rng.int(2, h - 3);
    const alpha = rng.float(0.04, 0.12);
    const shade = rng.int(0x1a, 0x55);
    g.fillStyle(Phaser.Display.Color.GetColor(160 + shade, 140 + shade, 120 + shade), alpha);
    g.fillRect(px, py, rng.int(1, 2), 1);
  }
  
  // Edge darkening (vignette)
  const edgeThick = Math.min(w, h) * 0.08;
  g.fillStyle(PALETTE.shadow, 0.1);
  g.fillRect(0, 0, w, edgeThick);
  g.fillRect(0, h - edgeThick, w, edgeThick);
  g.fillRect(0, 0, edgeThick, h);
  g.fillRect(w - edgeThick, 0, edgeThick, h);
  
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/**
 * Generate felt texture with soft noise + subtle directional fuzz
 */
export function generateFeltTexture(scene, key, baseColor, w = 128, h = 96) {
  if (scene.textures.exists(key)) return key;
  
  const rng = makeStyleRng('styleKit', `tex:${key}`);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  
  // Base color
  g.fillStyle(baseColor, 1);
  g.fillRect(0, 0, w, h);
  
  // Soft noise (deterministic)
  const noiseCount = Math.floor((w * h) / 50);
  for (let i = 0; i < noiseCount; i++) {
    const px = rng.int(0, w - 1);
    const py = rng.int(0, h - 1);
    const alpha = rng.float(0.02, 0.08);
    const bright = rng.int(-15, 25);
    const c = Phaser.Display.Color.IntegerToColor(baseColor);
    g.fillStyle(
      Phaser.Display.Color.GetColor(
        Math.max(0, Math.min(255, c.red + bright)),
        Math.max(0, Math.min(255, c.green + bright)),
        Math.max(0, Math.min(255, c.blue + bright))
      ),
      alpha
    );
    g.fillRect(px, py, 1, 1);
  }
  
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

/**
 * Generate wood texture with grain lines + warm highlight
 */
export function generateWoodTexture(scene, key, w = 180, h = 34) {
  if (scene.textures.exists(key)) return key;
  
  const rng = makeStyleRng('styleKit', `tex:${key}`);
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  
  // Base gradient
  g.fillGradientStyle(
    PALETTE.woodLight, PALETTE.woodLight,
    PALETTE.woodMid, PALETTE.woodDark,
    1, 1, 1, 1
  );
  g.fillRoundedRect(0, 0, w, h, 6);
  
  // Border
  g.lineStyle(2, PALETTE.woodDark, 0.4);
  g.strokeRoundedRect(1, 1, w - 2, h - 2, 6);
  
  // Wood grain (horizontal lines, deterministic)
  g.lineStyle(1, PALETTE.woodDark, 0.08);
  for (let i = 0; i < 8; i++) {
    const y = rng.int(2, h - 3);
    const xStart = rng.int(0, Math.floor(w * 0.1));
    const xEnd = w - rng.int(0, Math.floor(w * 0.1));
    g.beginPath();
    g.moveTo(xStart, y);
    g.lineTo(xEnd, y);
    g.strokePath();
  }
  
  // Fiber noise (deterministic)
  for (let i = 0; i < 22; i++) {
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(rng.int(2, w - 3), rng.int(2, h - 3), 2, 1);
  }
  
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAWING HELPERS — Consistent UI components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draw a crafted cardboard panel with stitched border + top highlight + drop shadow
 */
export function drawCardPanel(scene, x, y, w, h, opts = {}) {
  const depth = opts.depth ?? 10;
  const alpha = opts.alpha ?? 1;
  const seedTag = opts.seedTag ?? `${x}_${y}_${w}_${h}`;
  const rng = makeStyleRng(scene.scene.key, `panel:${seedTag}`);
  const container = scene.add.container(x, y).setDepth(depth).setAlpha(alpha);
  
  // Drop shadow
  const shadow = scene.add.ellipse(0, h * 0.48, w * 0.92, h * 0.18, 0x000000, 0.22);
  container.add(shadow);
  
  // Main panel
  const g = scene.add.graphics();
  g.fillGradientStyle(
    PALETTE.cardboardLight, PALETTE.cardboardLight,
    PALETTE.cardboardMid, PALETTE.cardboardDark,
    1, 1, 1, 1
  );
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  
  // Stitched border (dashed stroke)
  g.lineStyle(2, PALETTE.cardboardEdge, 0.7);
  g.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9);
  
  // Inner stitch marks
  for (let i = 0; i < w - 30; i += 16) {
    const px = -w / 2 + 15 + i;
    g.fillStyle(PALETTE.cardboardEdge, 0.3);
    g.fillCircle(px, -h / 2 + 8, 1.5);
    g.fillCircle(px, h / 2 - 8, 1.5);
  }
  
  // Top highlight
  g.fillStyle(PALETTE.highlight, 0.35);
  g.fillRoundedRect(-w / 2 + 8, -h / 2 + 2, w - 16, 4, 2);
  
  // Fiber texture (deterministic)
  for (let i = 0; i < Math.floor((w * h) / 120); i++) {
    const px = rng.int(-w / 2 + 4, w / 2 - 4);
    const py = rng.int(-h / 2 + 4, h / 2 - 4);
    g.fillStyle(PALETTE.shadow, rng.float(0.02, 0.06));
    g.fillRect(px, py, 1, 1);
  }
  
  container.add(g);
  return container;
}

/**
 * Draw a diegetic cardboard sign with optional arrow
 */
export function drawSign(scene, x, y, text, arrowDir = 'right', depth = 5) {
  const signW = Math.max(80, text.length * 8 + 32);
  const signH = 32;
  
  const container = scene.add.container(x, y).setDepth(depth);
  
  // Shadow
  const shadow = scene.add.ellipse(0, signH * 0.42, signW * 0.88, signH * 0.38, 0x000000, 0.18);
  container.add(shadow);
  
  // Sign background
  const g = scene.add.graphics();
  g.fillGradientStyle(
    PALETTE.cardboardLight, PALETTE.cardboardLight,
    PALETTE.cardboardMid, PALETTE.cardboardDark,
    1, 1, 1, 1
  );
  g.fillRoundedRect(-signW / 2, -signH / 2, signW, signH, 6);
  
  // Border
  g.lineStyle(2, PALETTE.cardboardEdge, 0.8);
  g.strokeRoundedRect(-signW / 2, -signH / 2, signW, signH, 6);
  
  // Stitched corners
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([cx, cy]) => {
    const px = -signW / 2 + cx * (signW - 12) + 6;
    const py = -signH / 2 + cy * (signH - 12) + 6;
    g.fillStyle(PALETTE.cardboardEdge, 0.5);
    g.fillCircle(px, py, 2);
  });
  
  container.add(g);
  
  // Text
  const txt = scene.add.text(0, -1, text, {
    fontFamily: 'Georgia, serif',
    fontSize: '13px',
    color: '#5c3510',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(txt);
  
  // Arrow
  if (arrowDir === 'right') {
    const arrow = scene.add.text(signW / 2 - 12, -1, '→', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#8b5e28',
    }).setOrigin(0.5);
    container.add(arrow);
  } else if (arrowDir === 'left') {
    const arrow = scene.add.text(-signW / 2 + 12, -1, '←', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#8b5e28',
    }).setOrigin(0.5);
    container.add(arrow);
  }
  
  // Gentle pulse
  scene.tweens.add({
    targets: container,
    alpha: 0.85,
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  
  return container;
}

/**
 * Draw contact shadow beneath an object
 */
export function drawContactShadow(scene, x, y, w = 80, h = 18, alpha = 0.16, depth = 3) {
  return scene.add.ellipse(x, y, w, h, 0x000000, alpha).setDepth(depth);
}

/**
 * Apply warm light vignette to scene (consistent lighting)
 */
export function applyWarmLightVignette(scene, opts = {}) {
  const warmColor = opts.warmColor ?? PALETTE.warmGlow;
  const warmAlpha = opts.warmAlpha ?? 0.14;
  const vignetteAlpha = opts.vignetteAlpha ?? 0.13;
  const depth = opts.depth ?? 40;
  
  // Warm key light (upper-left)
  const warm = scene.add.ellipse(220, 130, 540, 320, warmColor, warmAlpha)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setScrollFactor(0)
    .setDepth(depth);
  
  // Edge vignette (soft ambient fill)
  const top = scene.add.rectangle(GAME_W / 2, 0, GAME_W, 64, 0x000000, vignetteAlpha)
    .setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1);
  const bottom = scene.add.rectangle(GAME_W / 2, GAME_H, GAME_W, 76, 0x000000, vignetteAlpha + 0.03)
    .setOrigin(0.5, 1).setScrollFactor(0).setDepth(depth + 1);
  const left = scene.add.rectangle(0, GAME_H / 2, 72, GAME_H, 0x000000, vignetteAlpha)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);
  const right = scene.add.rectangle(GAME_W, GAME_H / 2, 72, GAME_H, 0x000000, vignetteAlpha)
    .setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth + 1);
  
  return { warm, top, bottom, left, right };
}

/**
 * Apply depth haze overlay (atmospheric perspective)
 */
export function applyDepthHaze(scene, strength = 0.12, depth = 30) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  g.fillGradientStyle(
    0xffffff, 0xffffff, 0xeef2f7, 0xeef2f7,
    strength, strength, 0, 0
  );
  g.fillRect(0, 0, GAME_W, Math.floor(GAME_H * 0.62));
  return g;
}

/**
 * Apply depth haze tint to a display object (for parallax backgrounds)
 */
export function applyDepthTint(displayObject, fauxZ, zMax = 220) {
  const t = Phaser.Math.Clamp(fauxZ / zMax, 0, 1);
  const c = Phaser.Display.Color.GetColor(
    Math.round(Phaser.Math.Linear(255, 242, t)),
    Math.round(Phaser.Math.Linear(255, 244, t)),
    Math.round(Phaser.Math.Linear(255, 250, t))
  );
  if (displayObject.setTint) displayObject.setTint(c);
  if (displayObject.setAlpha) displayObject.setAlpha(1 - t * 0.08);
  return displayObject;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT STYLE HELPERS — Typography consistency
// ═══════════════════════════════════════════════════════════════════════════

export const TEXT_STYLES = {
  // Display: Georgia (title/headings)
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: '56px',
    color: '#ffd93d',
    stroke: '#000000',
    strokeThickness: 6,
    shadow: { offsetX: 3, offsetY: 3, color: '#aa6600', blur: 0, fill: true },
  },
  
  subtitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '22px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3,
  },
  
  heading: {
    fontFamily: 'Georgia, serif',
    fontSize: '17px',
    color: '#ffe39c',
    stroke: '#000000',
    strokeThickness: 2,
  },
  
  body: {
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    color: '#f5f5f5',
  },
  
  // Utility: monospace (key labels only)
  keyLabel: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#d8e8ff',
  },
  
  hint: {
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#aaffaa',
  },
  
  buildStamp: {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#c8d5e0',
    stroke: '#0d1b2a',
    strokeThickness: 2,
  },
};

/**
 * Create a stitched fabric label (for build stamp, etc.)
 */
export function createStitchedLabel(scene, x, y, text, depth = 45) {
  const w = text.length * 6 + 12;
  const h = 16;
  
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  
  // Label background (felt)
  g.fillStyle(PALETTE.feltCream, 0.85);
  g.fillRoundedRect(x, y, w, h, 3);
  
  // Stitch marks
  g.lineStyle(1, PALETTE.shadow, 0.3);
  g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 2);
  
  for (let i = 0; i < w - 8; i += 8) {
    g.fillStyle(PALETTE.cardboardEdge, 0.4);
    g.fillCircle(x + 4 + i, y + 3, 0.8);
    g.fillCircle(x + 4 + i, y + h - 3, 0.8);
  }
  
  const txt = scene.add.text(x + w / 2, y + h / 2, text, TEXT_STYLES.buildStamp)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(depth + 1);
  
  return { bg: g, text: txt };
}
