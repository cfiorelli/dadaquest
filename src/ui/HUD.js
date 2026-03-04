import Phaser from 'phaser';
import { COLORS, GAME_W } from '../gameConfig.js';
import { getStamina, getStaminaMax } from '../utils/state.js';
import { SCENE_NAMES } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';

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

    // Stamina panel — drawn as tan cardboard tag in updateStamina()
    this.staminaBg = scene.add.graphics().setScrollFactor(0).setDepth(99);

    // Stamina label — warm serif, matches cardboard tag palette
    this.staminaLabel = scene.add.text(13, 10, 'stamina', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#7a4a20',
    }).setScrollFactor(0).setDepth(100);

    // Scene name top-center — warm cream on brown stroke
    const sceneName = SCENE_NAMES[scene.scene.key] || '';
    scene.add.text(GAME_W / 2, 8, sceneName, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#fde7c4',
      stroke: '#4a2a08',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    // Build stamp top-right — very subtle
    scene.add.text(GAME_W - 8, 8, `build ${BUILD_SHA}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#b0bcc4',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(102);

    // Mute indicator — shown when audio is silenced
    this.muteTag = scene.add.text(GAME_W - 8, 22, 'MUTED', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffcc88',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(102).setVisible(false);

    // Debug text
    this.debugText = scene.add.text(8, 48, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff00',
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    }).setScrollFactor(0).setDepth(101).setVisible(false);

    // M key — toggle mute
    scene.input.keyboard.on('keydown-M', () => {
      const muted = sfx.toggleMute();
      this.muteTag.setVisible(muted);
    });

    // Sync mute tag to current state (e.g. restored from localStorage)
    scene.time.delayedCall(80, () => {
      this.muteTag.setVisible(sfx.isMuted());
    });

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

    const panelW = 24 + maxStamina * 28;
    this.staminaBg.clear();
    // Cardboard tan fill
    this.staminaBg.fillStyle(0xd4a96a, 0.92);
    this.staminaBg.fillRoundedRect(6, 6, panelW, 36, 5);
    // Warm brown border
    this.staminaBg.lineStyle(1.5, 0x7a5030, 0.75);
    this.staminaBg.strokeRoundedRect(6, 6, panelW, 36, 5);
    // Subtle top highlight
    this.staminaBg.lineStyle(1, 0xf5d8a0, 0.5);
    this.staminaBg.beginPath();
    this.staminaBg.moveTo(11, 7);
    this.staminaBg.lineTo(panelW - 1, 7);
    this.staminaBg.strokePath();

    for (let i = 0; i < maxStamina; i++) {
      const icon = this.staminaIcons[i];
      icon.clear();
      const filled = i < stamina;
      const cx = 18 + i * 28;
      const cy = 24;
      icon.fillStyle(filled ? 0xffd93d : 0x8b6940, filled ? 1 : 0.35);
      icon.lineStyle(1.5, filled ? 0xb08020 : 0x5a3a18, filled ? 0.9 : 0.25);
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
