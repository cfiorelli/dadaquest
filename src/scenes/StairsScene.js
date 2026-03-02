import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { PlayerDepth } from '../entities/PlayerDepth.js';
import { HUD } from '../ui/HUD.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { setStamina } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';

export class StairsScene extends Phaser.Scene {
  constructor() {
    super('StairsScene');
  }

  create() {
    // Background - hallway
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xf3e5f5);

    // Wall texture
    for (let y = 0; y < GAME_H - 60; y += 30) {
      this.add.rectangle(GAME_W / 2, y + 15, GAME_W, 1, 0xe0c0f0, 0.3);
    }

    // Baseboard
    this.add.rectangle(GAME_W / 2, GAME_H - 55, GAME_W, 12, 0xce93d8);

    this.setupStairs();
    this.setupDog();
    this.setupExit();
    this.setupPlayer();
    this.setupHUD();
    this.setupEvents();
    this.setupCamera();

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      setStamina(this, 2);
      this.scene.restart();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', () => {
      this.hud.toggleDebug(this.player);
    });

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) this.time.delayedCall(600, () => this.scene.start('RooftopScene'));
  }

  setupStairs() {
    // Stair steps - ascending from left to right
    const steps = [
      { x: 80, y: GAME_H - 60, w: 140 },
      { x: 230, y: GAME_H - 108, w: 140 },
      { x: 380, y: GAME_H - 156, w: 140 },
      { x: 530, y: GAME_H - 204, w: 140 },
      { x: 680, y: GAME_H - 252, w: 140 },
      { x: 720, y: GAME_H - 300, w: 160 },  // landing
    ];

    this.steps = steps;

    steps.forEach(s => {
      // Visual
      this.add.rectangle(s.x, s.y, s.w, 20, 0xbcaaa4);
      this.add.rectangle(s.x, s.y - 10, s.w, 6, 0xd7ccc8);
      this.add.rectangle(s.x, s.y + 5, s.w, 2, 0x8d6e63);
    });

    // Riser visuals (vertical parts)
    for (let i = 0; i < steps.length - 1; i++) {
      const s = steps[i];
      const next = steps[i + 1];
      this.add.rectangle(s.x + s.w / 2, s.y - 24, 6, 48, 0xa0897a);
    }

    // Wall at bottom and top
    this.add.rectangle(10, GAME_H / 2, 20, GAME_H, 0xce93d8);
    this.add.rectangle(GAME_W - 10, GAME_H / 2 - 100, 20, GAME_H - 200, 0xce93d8);
  }

  setupDog() {
    // Dog napping on step 2 landing (index 2)
    const step = this.steps[2];
    this.dogX = step.x - 20;
    this.dogY = step.y - 30;

    this.dog = this.add.image(this.dogX, this.dogY, 'dog').setDisplaySize(52, 36).setDepth(8);

    // Zzz animation above dog
    this.dogZzz = this.add.text(this.dogX + 30, this.dogY - 20, 'zzz', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#aaaaff',
    }).setDepth(5);

    this.tweens.add({
      targets: this.dogZzz,
      y: this.dogY - 30,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this.dogBlocked = false;
    this.dogAwake = false;
  }

  setupExit() {
    // Exit at top-right
    const topStep = this.steps[this.steps.length - 1];
    this.exitWX = GAME_W - 40;

    const arrow = this.add.text(GAME_W - 55, topStep.y - 70, '→\nROOFTOP', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00ff00',
      align: 'center',
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: arrow, x: GAME_W - 48, duration: 500, yoyo: true, repeat: -1 });
  }

  setupPlayer() {
    const colliders = [
      {
        kind: 'exit',
        x: this.exitWX,
        z: 44,
        w: 52,
        d: 52,
        minWy: -999,
        maxWy: 999,
        onTouch: () => this.exitScene(),
      },
    ];
    if (!isTestMode) {
      colliders.push({
        kind: 'hazard',
        x: 360,
        z: 110,
        w: 64,
        d: 44,
        minWy: -999,
        maxWy: 999,
        onTouch: p => this.dogWake(p, this.dog),
      });
    }

    const xStart = 70;
    const xEnd = 710;
    const zStart = 182;
    const zEnd = 58;
    const maxRise = 238;

    this.player = new PlayerDepth(this, {
      start: { wx: 40, wz: 170, wy: 0 },
      walkBounds: { minX: 24, maxX: GAME_W - 24, minZ: 24, maxZ: 198 },
      groundHeight: (wx, wz) => {
        const t = Phaser.Math.Clamp((wx - xStart) / (xEnd - xStart), 0, 1);
        const laneCenter = Phaser.Math.Linear(zStart, zEnd, t);
        const laneHalf = 26 + (1 - t) * 8;
        if (wx > 690 && wz < 72) return maxRise;
        if (Math.abs(wz - laneCenter) <= laneHalf) return t * maxRise;
        return 0;
      },
      colliders,
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, GAME_W, GAME_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  setupHUD() {
    this.hud = new HUD(this);
  }

  setupEvents() {
    this.events.on('nap-start', () => {
      this.hud.showBubble(this.player.x, this.player.y - 60, 'zzz...', 0);
      this.hud.showZzz(this.player.x, this.player.y - 40);
    });
    this.events.on('nap-end', () => {
      this.hud.clearBubble();
      this.hud.clearZzz();
    });
  }

  dogWake(player, dog) {
    if (this.dogAwake || this.dogCooldown) return;
    this.dogCooldown = true;
    this.dogAwake = true;

    sfx.bonk();
    this.cameras.main.shake(150, 0.01);

    // Show dog awake
    this.dogZzz.setVisible(false);
    this.hud.showFloatingText(dog.x, dog.y - 50, 'WOOF!', '#ff9800');

    // Pushback baby
    const pushDir = player.x > dog.x ? 1 : -1;
    player.vx = pushDir * 220;
    player.vy = 180;
    player.setState(STATE.AIR);

    // Dog blocks for 2 seconds
    this.time.delayedCall(2000, () => {
      this.dogAwake = false;
      this.dogZzz.setVisible(true);
      // Give longer cooldown before dog can wake again
      this.time.delayedCall(1000, () => {
        this.dogCooldown = false;
      });
    });
  }

  exitScene() {
    if (this.exiting) return;
    this.exiting = true;
    sfx.whoosh();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.scene.start('RooftopScene');
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this.player.update(time, delta);
    this.hud.update(this.player);
  }
}
