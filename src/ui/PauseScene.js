import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { setStamina, setStaminaMax } from '../utils/state.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.callerKey = data.callerKey;
  }

  create() {
    const W = GAME_W;
    const H = GAME_H;

    // Dim the gameplay scene behind us
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setDepth(0);

    // Card panel
    const pw = 290;
    const ph = 242;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;

    const card = this.add.graphics().setDepth(1);
    card.fillStyle(0x14213d, 0.97);
    card.fillRoundedRect(px, py, pw, ph, 14);
    card.lineStyle(1.5, 0x6a9fd8, 0.8);
    card.strokeRoundedRect(px, py, pw, ph, 14);
    // Subtle top highlight
    card.lineStyle(1, 0x9ac8f8, 0.4);
    card.beginPath();
    card.moveTo(px + 14, py + 1.5);
    card.lineTo(px + pw - 14, py + 1.5);
    card.strokePath();

    this.add.text(W / 2, py + 18, 'PAUSED', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffd93d',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(2);

    const sep = this.add.graphics().setDepth(2);
    sep.lineStyle(1, 0x4a6fa5, 0.5);
    sep.beginPath();
    sep.moveTo(px + 24, py + 46);
    sep.lineTo(px + pw - 24, py + 46);
    sep.strokePath();

    const btnW = pw - 48;
    const btnH = 36;
    const startY = py + 64;
    const gap = 42;

    this.makeButton(W / 2, startY + 0 * gap, btnW, btnH, 'Resume', () => this.doResume());
    this.makeButton(W / 2, startY + 1 * gap, btnW, btnH, 'Restart Scene', () => this.doRestartScene());
    this.makeButton(W / 2, startY + 2 * gap, btnW, btnH, 'Restart Game', () => this.doRestartGame());

    const muteLabel = sfx.isMuted() ? 'Unmute' : 'Mute';
    this.muteBtn = this.makeButton(W / 2, startY + 3 * gap, btnW, btnH, muteLabel, () => this.doToggleMute());

    this.add.text(W / 2, py + ph - 14, 'Esc · Resume', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#556688',
    }).setOrigin(0.5).setDepth(2);

    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  makeButton(cx, cy, w, h, label, callback) {
    const bg = this.add.rectangle(cx, cy, w, h, 0x243454)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);
    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#c8e0ff',
    }).setOrigin(0.5).setDepth(3);

    bg.on('pointerover', () => { bg.setFillStyle(0x3a5f9f); txt.setColor('#ffffff'); });
    bg.on('pointerout', () => { bg.setFillStyle(0x243454); txt.setColor('#c8e0ff'); });
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x162040);
      this.time.delayedCall(100, callback);
    });

    return { bg, txt };
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.doResume();
    }
  }

  doResume() {
    const caller = this.callerKey;
    this.scene.stop('PauseScene');
    if (caller && this.scene.isPaused(caller)) {
      this.scene.resume(caller);
    }
  }

  doRestartScene() {
    const caller = this.callerKey;
    this.scene.stop('PauseScene');
    if (caller) {
      this.scene.stop(caller);
      this.scene.start(caller);
    }
  }

  doRestartGame() {
    setStaminaMax(this, 4);
    setStamina(this, 2);
    this.scene.stop('PauseScene');
    if (this.callerKey) this.scene.stop(this.callerKey);
    this.scene.start('TitleScene');
  }

  doToggleMute() {
    const muted = sfx.toggleMute();
    this.muteBtn.txt.setText(muted ? 'Unmute' : 'Mute');
    // Sync the HUD mute tag in the paused scene
    const caller = this.scene.get(this.callerKey);
    if (caller?.hud?.muteTag) {
      caller.hud.muteTag.setVisible(muted);
    }
  }
}
