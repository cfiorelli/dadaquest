import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { isTestMode } from '../utils/testMode.js';
import {
  PALETTE,
  drawCardPanel,
  TEXT_STYLES,
  createStitchedLabel,
  generateCardboardTexture,
} from '../art/styleKit.js';

const BUILD_SHA = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // ═══ DIORAMA BACKGROUND ═══
    // Sky gradient (warm nursery sky)
    const g = this.add.graphics();
    g.fillGradientStyle(0x7eb3d9, 0x7eb3d9, 0xb8d9ec, 0xe8f4f8, 1, 1, 1, 1);
    g.fillRect(0, 0, GAME_W, GAME_H * 0.7);
    
    // Soft cloud stickers
    [[180, 80], [420, 110], [640, 75]].forEach(([cx, cy]) => {
      this.add.ellipse(cx, cy, 60, 30, 0xffffff, 0.35);
      this.add.ellipse(cx - 15, cy - 5, 40, 22, 0xffffff, 0.3);
      this.add.ellipse(cx + 15, cy - 5, 40, 22, 0xffffff, 0.3);
    });
    
    // Star stickers (soft felt)
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(40, GAME_W - 40);
      const y = Phaser.Math.Between(30, GAME_H * 0.5);
      const r = Phaser.Math.FloatBetween(2, 5);
      this.add.star(x, y, 5, r * 0.6, r, 0xffd97d, Phaser.Math.FloatBetween(0.25, 0.5));
    }
    
    // Table edge (foreground framing)
    const tableY = GAME_H - 30;
    const tableG = this.add.graphics();
    tableG.fillGradientStyle(PALETTE.woodMid, PALETTE.woodMid, PALETTE.woodDark, PALETTE.woodDark, 1, 1, 1, 1);
    tableG.fillRect(0, tableY, GAME_W, 60);
    // Wood grain texture
    tableG.lineStyle(1, PALETTE.woodDark, 0.15);
    for (let i = 0; i < 8; i++) {
      const gy = tableY + Phaser.Math.Between(5, 55);
      tableG.beginPath();
      tableG.moveTo(0, gy);
      tableG.lineTo(GAME_W, gy);
      tableG.strokePath();
    }
    // Edge highlight
    tableG.fillStyle(PALETTE.highlight, 0.25);
    tableG.fillRect(0, tableY, GAME_W, 4);

    // Baby sprite on table
    const baby = this.add.image(GAME_W / 2 - 80, tableY + 15, 'baby');
    baby.setScale(2);
    this.add.ellipse(baby.x, baby.y + 28, 40, 12, 0x000000, 0.2); // shadow

    // Da Da on the other side
    const dada = this.add.image(GAME_W / 2 + 120, tableY + 6, 'dada');
    dada.setScale(2);
    this.add.ellipse(dada.x, dada.y + 32, 42, 13, 0x000000, 0.2); // shadow

    // ═══ TITLE ═══
    const title = this.add.text(GAME_W / 2, 120, 'DA DA QUEST', TEXT_STYLES.title).setOrigin(0.5);
    
    const sub = this.add.text(GAME_W / 2, 185, 'A baby\'s epic journey', TEXT_STYLES.subtitle).setOrigin(0.5);

    // Floating animation
    this.tweens.add({
      targets: title,
      y: 115,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ═══ BUILD STAMP (stitched label, subtle) ═══
    createStitchedLabel(this, GAME_W - 80, 10, `build ${BUILD_SHA}`, 45);

    // ═══ WORD BUBBLE FROM BABY ═══
    this.makeBubble(GAME_W / 2 - 30, tableY - 40, 'da da?');

    // ═══ HOW TO PLAY CARD (single clean panel) ═══
    const cardY = GAME_H / 2 + 35;
    const card = drawCardPanel(this, GAME_W / 2, cardY, 440, 140, { depth: 10 });
    
    const cardTitle = this.add.text(GAME_W / 2, cardY - 55, 'How To Play', TEXT_STYLES.heading).setOrigin(0.5).setDepth(11);
    
    const instructions = [
      'Arrows: move (depth in Scenes 2-5)',
      'Space: jump / grab / release',
      'R: restart · M: mute · Esc: pause',
    ];
    
    instructions.forEach((line, idx) => {
      this.add.text(GAME_W / 2, cardY - 28 + idx * 20, line, TEXT_STYLES.keyLabel)
        .setOrigin(0.5)
        .setDepth(11);
    });

    // ═══ PRESS START PROMPT ═══
    const pressStart = this.add.text(GAME_W / 2, cardY + 85, 'Press SPACE or ENTER to start', TEXT_STYLES.hint).setOrigin(0.5).setDepth(11);

    this.tweens.add({
      targets: pressStart,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ═══ FIRST-RUN OVERLAY (if needed, single fade) ═══
    if (!isTestMode && this.shouldShowFirstRunControls()) {
      this.showFirstRunControlsOverlay();
    }

    // ═══ INPUT ═══
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

  showFirstRunControlsOverlay() {
    this.markControlsSeen();
    
    // Single card fade-in/out (no stacking)
    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.5).setDepth(69);
    
    const overlayCard = drawCardPanel(this, GAME_W / 2, GAME_H / 2 - 20, 460, 170, { depth: 70 });
    
    const overlayTitle = this.add.text(GAME_W / 2, GAME_H / 2 - 75, 'Controls Guide', TEXT_STYLES.heading)
      .setOrigin(0.5)
      .setDepth(71);
    
    const lines = [
      'Arrows: move (depth in Scenes 2-5)',
      'Space: jump / grab / release',
      'R: restart scene',
      'M: mute',
      'Esc: pause',
    ];
    
    lines.forEach((line, idx) => {
      this.add.text(GAME_W / 2, GAME_H / 2 - 45 + idx * 22, line, TEXT_STYLES.keyLabel)
        .setOrigin(0.5)
        .setDepth(71);
    });
    
    const helper = this.add.text(GAME_W / 2, GAME_H / 2 + 72, 'This guide fades in 5 seconds', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#d5e6ff',
    }).setOrigin(0.5).setDepth(71);

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: [dim, overlayCard, overlayTitle, helper],
        alpha: 0,
        duration: 420,
        onComplete: () => {
          dim.destroy();
          overlayCard.destroy();
          overlayTitle.destroy();
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
