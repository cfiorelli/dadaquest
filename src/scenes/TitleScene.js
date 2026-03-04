import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { isTestMode } from '../utils/testMode.js';

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Background gradient via rect
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x1a1a3e);

    // Stars
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H * 0.6);
      const r = Phaser.Math.FloatBetween(1, 3);
      this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.4, 1.0));
    }

    // Floor
    this.add.rectangle(GAME_W / 2, GAME_H - 30, GAME_W, 60, 0x5d4037);

    // Baby sprite on title
    const baby = this.add.image(GAME_W / 2 - 80, GAME_H - 75, 'baby');
    baby.setScale(2);

    // Da Da on the other side
    const dada = this.add.image(GAME_W / 2 + 120, GAME_H - 84, 'dada');
    dada.setScale(2);

    // Title text
    const title = this.add.text(GAME_W / 2, 120, 'DA DA QUEST', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#aa6600', blur: 0, fill: true },
    }).setOrigin(0.5);

    const sub = this.add.text(GAME_W / 2, 185, 'A baby\'s epic journey', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_W - 12, 12, `build ${BUILD_SHA}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#d6e9ff',
      stroke: '#0d1b2a',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(40);

    // Word bubble from baby
    this.makeBubble(GAME_W / 2 - 30, GAME_H - 130, 'da da?');

    // Press start
    const pressStart = this.add.text(GAME_W / 2, GAME_H - 150, 'Press SPACE or ENTER to start', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaffaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: title,
      y: 115,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createControlsCard(GAME_W / 2, GAME_H - 74, {
      title: 'Controls',
      depth: 30,
      scale: 0.98,
      alpha: 0.9,
    });

    if (!isTestMode && this.shouldShowFirstRunControls()) {
      this.showFirstRunControlsOverlay();
    }

    // Input
    const proceed = () => {
      sfx.init();
      sfx.pickup();
      this.scene.start('CribScene');
    };

    this.input.keyboard.once('keydown-SPACE', proceed);
    this.input.keyboard.once('keydown-ENTER', proceed);

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) setTimeout(() => this.scene.start('CribScene'), 400);
  }

  shouldShowFirstRunControls() {
    try {
      return localStorage.getItem('dada_seen_controls') !== '1';
    } catch (e) {
      return true;
    }
  }

  markControlsSeen() {
    try {
      localStorage.setItem('dada_seen_controls', '1');
    } catch (e) {}
  }

  createControlsCard(x, y, opts = {}) {
    const {
      title = 'How To Play',
      depth = 20,
      scale = 1,
      alpha = 1,
    } = opts;
    const lines = [
      'Arrows: move (Scenes 2-5 include depth)',
      'Space: jump / grab / release',
      'R: restart scene',
      'M: mute',
      'Esc: pause',
    ];

    const cardW = Math.floor(430 * scale);
    const cardH = Math.floor(132 * scale);
    const lineH = Math.floor(18 * scale);
    const card = this.add.container(x, y).setDepth(depth).setAlpha(alpha);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2f56, 0.92);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    bg.lineStyle(2, 0x5d86c6, 0.78);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
    bg.lineStyle(1, 0xa5c7f5, 0.34);
    bg.beginPath();
    bg.moveTo(-cardW / 2 + 16, -cardH / 2 + 1.5);
    bg.lineTo(cardW / 2 - 16, -cardH / 2 + 1.5);
    bg.strokePath();
    card.add(bg);

    const titleText = this.add.text(0, -cardH / 2 + Math.floor(15 * scale), title, {
      fontFamily: 'Georgia, serif',
      fontSize: `${Math.floor(17 * scale)}px`,
      color: '#ffe39c',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    card.add(titleText);

    lines.forEach((line, idx) => {
      const t = this.add.text(-cardW / 2 + Math.floor(16 * scale), -cardH / 2 + Math.floor(42 * scale) + idx * lineH, line, {
        fontFamily: 'monospace',
        fontSize: `${Math.floor(11 * scale)}px`,
        color: '#d8e8ff',
      }).setOrigin(0, 0);
      card.add(t);
    });

    return card;
  }

  showFirstRunControlsOverlay() {
    this.markControlsSeen();
    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.45).setDepth(69);
    const card = this.createControlsCard(GAME_W / 2, GAME_H / 2, {
      title: 'How To Play',
      depth: 70,
      scale: 1.05,
      alpha: 1,
    });
    const helper = this.add.text(GAME_W / 2, GAME_H / 2 + 102, 'This guide fades in 5 seconds', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#d5e6ff',
    }).setOrigin(0.5).setDepth(71);

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: [dim, card, helper],
        alpha: 0,
        duration: 420,
        onComplete: () => {
          dim.destroy();
          card.destroy();
          helper.destroy();
        },
      });
    });
  }

  makeBubble(x, y, text) {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#222222',
    }).setOrigin(0.5);

    const bg = this.add.graphics();
    const pad = 10;
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(
      txt.x - txt.width / 2 - pad,
      txt.y - txt.height / 2 - pad,
      txt.width + pad * 2,
      txt.height + pad * 2,
      8
    );
    bg.fillStyle(0xffffff, 0.95);
    // Tail
    bg.fillTriangle(
      txt.x - 10, txt.y + txt.height / 2 + pad,
      txt.x - 20, txt.y + txt.height / 2 + pad + 14,
      txt.x + 4, txt.y + txt.height / 2 + pad
    );
    bg.lineStyle(2, 0xcccccc, 1);
    bg.strokeRoundedRect(
      txt.x - txt.width / 2 - pad,
      txt.y - txt.height / 2 - pad,
      txt.width + pad * 2,
      txt.height + pad * 2,
      8
    );

    // Move text above bg
    bg.setDepth(txt.depth - 1);
  }
}
