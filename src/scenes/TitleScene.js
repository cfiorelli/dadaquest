import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';

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

    // Controls hint
    this.add.text(GAME_W / 2, GAME_H - 20, 'Arrows: move  |  Space: jump/interact  |  Up/Down: climb  |  R: restart scene', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Input
    const proceed = () => {
      sfx.init();
      sfx.pickup();
      this.scene.start('CribScene');
    };

    this.input.keyboard.once('keydown-SPACE', proceed);
    this.input.keyboard.once('keydown-ENTER', proceed);
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
