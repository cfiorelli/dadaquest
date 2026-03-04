import Phaser from 'phaser';
import { COLORS, GAME_W } from '../gameConfig.js';
import { getStamina, getStaminaMax } from '../utils/state.js';
import { SCENE_NAMES } from '../gameConfig.js';

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

function drawStarShape(g, cx, cy, points, outer, inner) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
  }
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
}

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.staminaIcons = [];
    this.staminaLabel = null;
    this.currentBubble = null;
    this.debugText = null;
    this.debugVisible = false;
    this.zzzTexts = null;

    this.create();
  }

  create() {
    const scene = this.scene;

    // Stamina background panel (fixed to camera)
    this.staminaBg = scene.add.graphics().setScrollFactor(0).setDepth(99);
    this.staminaBg.fillStyle(0x000000, 0.55);
    this.staminaBg.fillRoundedRect(6, 6, 122, 36, 6);

    // Stamina label
    this.staminaLabel = scene.add.text(12, 10, 'STAMINA', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#aaaaaa',
    }).setScrollFactor(0).setDepth(100);

    // Scene name top-center
    const sceneName = SCENE_NAMES[scene.scene.key] || '';
    scene.add.text(GAME_W / 2, 10, sceneName, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Build stamp top-right
    scene.add.text(GAME_W - 8, 8, `build ${BUILD_SHA}`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#cfd8dc',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);

    // Debug text
    this.debugText = scene.add.text(8, 48, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff00',
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    }).setScrollFactor(0).setDepth(101).setVisible(false);

    this.updateStamina();
  }

  updateStamina() {
    const stamina = getStamina(this.scene);
    const maxStamina = getStaminaMax(this.scene);

    while (this.staminaIcons.length < maxStamina) {
      this.staminaIcons.push(this.scene.add.graphics().setScrollFactor(0).setDepth(100));
    }
    while (this.staminaIcons.length > maxStamina) {
      const icon = this.staminaIcons.pop();
      icon.destroy();
    }

    const panelW = 22 + maxStamina * 28;
    this.staminaBg.clear();
    this.staminaBg.fillStyle(0x000000, 0.55);
    this.staminaBg.fillRoundedRect(6, 6, panelW, 36, 6);

    for (let i = 0; i < maxStamina; i++) {
      const icon = this.staminaIcons[i];
      icon.clear();
      const filled = i < stamina;
      const cx = 16 + i * 28;
      const cy = 24;
      icon.fillStyle(filled ? COLORS.STAMINA_FULL : COLORS.STAMINA_EMPTY, filled ? 1 : 0.4);
      icon.lineStyle(1.5, 0x000000, filled ? 0.8 : 0.3);
      drawStarShape(icon, cx, cy, 5, 10, 5);
    }
  }

  // Show a speech bubble in world space (follows camera)
  showBubble(x, y, text, duration = 2500) {
    this.clearBubble();

    const pad = 10;
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#222222',
    }).setOrigin(0.5).setDepth(90);

    const bw = txt.width + pad * 2;
    const bh = txt.height + pad * 2;
    const bx = txt.x - bw / 2;
    const by = txt.y - bh / 2;

    const bg = this.scene.add.graphics().setDepth(89);
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(bx, by, bw, bh, 7);
    bg.lineStyle(2, 0xbbbbbb, 1);
    bg.strokeRoundedRect(bx, by, bw, bh, 7);
    // Tail
    bg.fillTriangle(
      txt.x - 8, by + bh,
      txt.x - 20, by + bh + 14,
      txt.x + 4, by + bh
    );

    this.currentBubble = { txt, bg };

    if (duration > 0) {
      this.scene.time.delayedCall(duration, () => this.clearBubble());
    }
  }

  clearBubble() {
    if (this.currentBubble) {
      this.currentBubble.txt.destroy();
      this.currentBubble.bg.destroy();
      this.currentBubble = null;
    }
  }

  showFloatingText(x, y, text, color = '#ffff00') {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(95);

    this.scene.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  showZzz(x, y) {
    this.clearZzz();
    const texts = [];
    const configs = [
      { dx: 14, dy: -18, size: '12px', delay: 0 },
      { dx: 24, dy: -34, size: '16px', delay: 250 },
      { dx: 36, dy: -54, size: '21px', delay: 500 },
    ];
    for (const c of configs) {
      const t = this.scene.add.text(x + c.dx, y + c.dy, 'z', {
        fontFamily: 'monospace',
        fontSize: c.size,
        color: '#aaaaff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setDepth(92).setAlpha(0);

      this.scene.time.delayedCall(c.delay, () => {
        if (!t.active) return;
        this.scene.tweens.add({
          targets: t,
          alpha: 1,
          y: t.y - 8,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      });
      texts.push(t);
    }
    this.zzzTexts = texts;
  }

  clearZzz() {
    if (this.zzzTexts) {
      this.zzzTexts.forEach(t => { if (t.active) t.destroy(); });
      this.zzzTexts = null;
    }
  }

  toggleDebug() {
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);
  }

  updateDebug(player) {
    if (!this.debugVisible || !player) return;
    if (typeof player.getDebugInfo === 'function') {
      const d = player.getDebugInfo();
      this.debugText.setText(
        `state: ${d.state}\n` +
        `stamina: ${d.stamina}\n` +
        `w: (${d.wx}, ${d.wz}, ${d.wy})\n` +
        `v: (${d.vx}, ${d.vz}, ${d.vy})\n` +
        `ground: ${d.onGround}\n` +
        `last: ${(d.transitions?.slice(-2) || []).join(' | ')}`
      );
      return;
    }

    const vb = player.body;
    if (!vb) return;
    this.debugText.setText(
      `state: ${player.state}\n` +
      `stamina: ${getStamina(this.scene)}\n` +
      `vel: (${Math.round(vb.velocity.x)}, ${Math.round(vb.velocity.y)})\n` +
      `pos: (${Math.round(player.x)}, ${Math.round(player.y)})\n` +
      `ground: ${vb.blocked.down} wall-L:${vb.blocked.left} wall-R:${vb.blocked.right}`
    );
  }

  update(player) {
    this.updateStamina();
    this.updateDebug(player);
  }
}
