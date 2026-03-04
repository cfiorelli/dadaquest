import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { resetStamina } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  create() {
    resetStamina(this);
    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    const { baby, family } = this.readGiftParams();
    this.babyName = baby;
    this.familyName = family;

    sfx.victory();

    // Sky
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x87ceeb);
    // Ground
    this.add.rectangle(GAME_W / 2, GAME_H - 30, GAME_W, 60, 0x66bb6a);

    // Da Da and baby together
    const dada = this.add.image(GAME_W / 2 + 40, GAME_H - 84, 'dada');
    dada.setScale(2.5);
    const babySprite = this.add.image(GAME_W / 2 - 50, GAME_H - 65, 'baby');
    babySprite.setScale(2.5);

    // Big word bubble
    this.makeBigBubble(GAME_W / 2 + 60, GAME_H - 210, 'DA DA!!!');

    // Confetti particles
    const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff922b, 0xcc5de8];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(50, GAME_W - 50);
      const y = Phaser.Math.Between(0, GAME_H - 80);
      const rect = this.add.rectangle(x, y, 10, 6, Phaser.Math.RND.pick(colors));
      rect.setAngle(Phaser.Math.Between(0, 360));

      this.tweens.add({
        targets: rect,
        y: y + Phaser.Math.Between(60, 200),
        angle: rect.angle + Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(1500, 3500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 1000),
        ease: 'Quad.easeIn',
        onRepeat: (tween, target) => {
          target.y = Phaser.Math.Between(0, 20);
          target.x = Phaser.Math.Between(50, GAME_W - 50);
          target.alpha = 1;
        }
      });
    }

    // Title
    this.add.text(GAME_W / 2, 58, 'Da Da!', {
      fontFamily: 'Georgia, serif',
      fontSize: '52px',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 120, `Welcome, baby ${this.babyName}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#333333',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 160, `Made for ${this.familyName}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#f5f5f5',
      stroke: '#333333',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const restart = this.add.text(GAME_W / 2, 205, 'Press SPACE / ENTER to play again', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#aaffaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restart,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const proceed = () => {
      resetStamina(this);
      this.scene.start('TitleScene');
    };
    this.input.keyboard.once('keydown-SPACE', proceed);
    this.input.keyboard.once('keydown-ENTER', proceed);

    this.makeActionButton(GAME_W / 2 - 110, GAME_H - 78, 180, 40, 'Play again', proceed);
    this.makeActionButton(GAME_W / 2 + 110, GAME_H - 78, 180, 40, 'Copy link', () => this.copyGiftLink());
    this.copyNotice = this.add.text(GAME_W / 2, GAME_H - 32, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#fffde7',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
  }

  readGiftParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      baby: this.sanitizeParam(p.get('baby'), 24, 'baby'),
      family: this.sanitizeParam(p.get('family'), 28, 'family'),
    };
  }

  sanitizeParam(raw, maxLen, fallback) {
    const cleaned = String(raw ?? '')
      .replace(/[^A-Za-z0-9 _-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
    return cleaned || fallback;
  }

  buildGiftLink() {
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = new URL(base);
    url.searchParams.set('baby', this.babyName);
    url.searchParams.set('family', this.familyName);
    return url.toString();
  }

  async copyGiftLink() {
    const link = this.buildGiftLink();
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch (e) {}

    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
    }

    if (!copied) {
      window.prompt('Copy this link:', link);
      this.showCopyNotice('Link ready to copy');
      return;
    }
    this.showCopyNotice('Link copied!');
  }

  showCopyNotice(text) {
    if (!this.copyNotice) return;
    this.copyNotice.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.copyNotice);
    this.tweens.add({
      targets: this.copyNotice,
      alpha: 0,
      duration: 1300,
      delay: 900,
    });
  }

  makeActionButton(x, y, w, h, label, onClick) {
    const bg = this.add.rectangle(x, y, w, h, 0x21456f).setDepth(8).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#f3f8ff',
      stroke: '#10253b',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9);
    bg.on('pointerover', () => bg.setFillStyle(0x2f5d93));
    bg.on('pointerout', () => bg.setFillStyle(0x21456f));
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x163250);
      this.time.delayedCall(90, onClick);
    });
    return { bg, txt };
  }

  makeBigBubble(x, y, text) {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#222222',
    }).setOrigin(0.5).setDepth(2);

    const pad = 16;
    const bg = this.add.graphics().setDepth(1);
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(
      txt.x - txt.width / 2 - pad,
      txt.y - txt.height / 2 - pad,
      txt.width + pad * 2,
      txt.height + pad * 2,
      12
    );
    bg.lineStyle(3, 0xcccccc, 1);
    bg.strokeRoundedRect(
      txt.x - txt.width / 2 - pad,
      txt.y - txt.height / 2 - pad,
      txt.width + pad * 2,
      txt.height + pad * 2,
      12
    );
    // Tail pointing down-left
    bg.fillStyle(0xffffff, 0.95);
    bg.fillTriangle(
      txt.x - 30, txt.y + txt.height / 2 + pad,
      txt.x - 60, txt.y + txt.height / 2 + pad + 24,
      txt.x - 10, txt.y + txt.height / 2 + pad
    );

    this.tweens.add({
      targets: [txt, bg],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
