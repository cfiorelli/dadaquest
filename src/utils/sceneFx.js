import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';

export function addContactShadow(scene, x, y, w = 80, h = 18, alpha = 0.16, depth = 3) {
  return scene.add.ellipse(x, y, w, h, 0x000000, alpha).setDepth(depth);
}

export function addDepthHazeOverlay(scene, strength = 0.1, depth = 30) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  g.fillGradientStyle(
    0xffffff, 0xffffff, 0xeef2f7, 0xeef2f7,
    strength, strength, 0, 0
  );
  g.fillRect(0, 0, GAME_W, Math.floor(GAME_H * 0.62));
  return g;
}

export function addWarmLightAndVignette(scene, options = {}) {
  const warmColor = options.warmColor ?? 0xffd8a7;
  const warmAlpha = options.warmAlpha ?? 0.13;
  const vignetteAlpha = options.vignetteAlpha ?? 0.12;

  const warm = scene.add.ellipse(220, 130, 540, 320, warmColor, warmAlpha)
    .setBlendMode(Phaser.BlendModes.SCREEN)
    .setScrollFactor(0)
    .setDepth(40);

  const top = scene.add.rectangle(GAME_W / 2, 0, GAME_W, 64, 0x000000, vignetteAlpha)
    .setOrigin(0.5, 0).setScrollFactor(0).setDepth(41);
  const bottom = scene.add.rectangle(GAME_W / 2, GAME_H, GAME_W, 76, 0x000000, vignetteAlpha + 0.02)
    .setOrigin(0.5, 1).setScrollFactor(0).setDepth(41);
  const left = scene.add.rectangle(0, GAME_H / 2, 72, GAME_H, 0x000000, vignetteAlpha)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(41);
  const right = scene.add.rectangle(GAME_W, GAME_H / 2, 72, GAME_H, 0x000000, vignetteAlpha)
    .setOrigin(1, 0.5).setScrollFactor(0).setDepth(41);

  return [warm, top, bottom, left, right];
}

export function applyDepthHaze(displayObject, fauxZ, zMax = 220) {
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

export function ensureCraftedTexture(scene, key, options = {}) {
  if (scene.textures.exists(key)) return key;

  const w = options.w ?? 128;
  const h = options.h ?? 96;
  const c1 = options.c1 ?? 0xf2e0c0;
  const c2 = options.c2 ?? 0xd2b487;
  const c3 = options.c3 ?? 0xb99765;
  const outline = options.outline ?? 0x4a3420;
  const radius = options.radius ?? 10;
  const noiseDots = options.noiseDots ?? Math.floor((w * h) / 90);

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillGradientStyle(c1, c1, c2, c3, 1, 1, 1, 1);
  g.fillRoundedRect(0, 0, w, h, radius);
  g.lineStyle(2, outline, 0.5);
  g.strokeRoundedRect(1, 1, w - 2, h - 2, Math.max(2, radius - 1));

  for (let i = 0; i < noiseDots; i += 1) {
    const px = Phaser.Math.Between(2, w - 3);
    const py = Phaser.Math.Between(2, h - 3);
    const alpha = Phaser.Math.FloatBetween(0.04, 0.12);
    const shade = Phaser.Math.Between(0x1a, 0x55);
    const color = Phaser.Display.Color.GetColor(160 + shade, 140 + shade, 120 + shade);
    g.fillStyle(color, alpha);
    g.fillRect(px, py, Phaser.Math.Between(1, 2), 1);
  }

  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

export function addCraftedOverlay(scene, key, x, y, w, h, depth = 8, alpha = 0.22) {
  return scene.add.image(x, y, key)
    .setDisplaySize(w, h)
    .setDepth(depth)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setAlpha(alpha);
}
