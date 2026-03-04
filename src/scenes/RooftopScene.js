import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { PlayerDepth } from '../entities/PlayerDepth.js';
import { HUD } from '../ui/HUD.js';
import { sfx } from '../audio/sfx.js';
import { setStamina } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';
import { registerPauseHotkey } from '../utils/pause.js';
import {
  addContactShadow,
  addCraftedOverlay,
  addDepthHazeOverlay,
  addWarmLightAndVignette,
  applyDepthHaze,
  ensureCraftedTexture,
} from '../utils/sceneFx.js';

export class RooftopScene extends Phaser.Scene {
  constructor() {
    super('RooftopScene');
  }

  create() {
    // Sky gradient (blue)
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x87ceeb);

    // Clouds
    this.makeClouds();

    // Rooftop floor
    this.add.rectangle(GAME_W / 2, GAME_H - 10, GAME_W, 20, 0x78909c);
    this.add.rectangle(GAME_W / 2, GAME_H - 20, GAME_W, 4, 0xb0bec5);

    // Interior floor section (inside room)
    this.add.rectangle(120, GAME_H - 30, 240, 60, 0xd7b99e);
    addContactShadow(this, 120, GAME_H - 2, 220, 18, 0.13, 2);

    // Plants on rooftop
    [-20, 30, 80].forEach(offset => {
      addContactShadow(this, 600 + offset, GAME_H - 58, 26, 10, 0.16, 2);
      applyDepthHaze(this.add.image(600 + offset, GAME_H - 80, 'plant').setDisplaySize(32, 50), 126);
    });
    [0, 50].forEach(offset => {
      addContactShadow(this, 700 + offset, GAME_H - 56, 22, 9, 0.16, 2);
      applyDepthHaze(this.add.image(700 + offset, GAME_H - 78, 'plant').setDisplaySize(28, 44), 132);
    });

    // Sun
    this.add.circle(720, 80, 50, 0xffd93d);
    this.add.circle(720, 80, 40, 0xffeb3b);

    this.setupPlatforms();
    this.setupWindow();
    this.setupRockingHorse();
    this.setupDada();
    this.setupExit();
    this.setupPlayer();
    this.setupAtmosphere();
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
    registerPauseHotkey(this);

    this.time.delayedCall(500, () => {
      this.hud.showBubble(this.player.x, this.player.y - 60, 'da da?!', 3000);
    });

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) this.time.delayedCall(600, () => this.scene.start('EndScene'));

    // Rocking horse ride tracking
    this.ridingTimer = 0;
    this.horseAtWindow = false;
    this.horseStartX = 200;
    this.horseTargetX = 380;
    this.horseRiding = false;
  }

  makeClouds() {
    [[150, 80], [420, 50], [650, 100], [750, 60]].forEach(([x, y]) => {
      const w = Phaser.Math.Between(80, 130);
      this.add.ellipse(x, y, w, 45, 0xffffff, 0.9);
      this.add.ellipse(x - 25, y + 8, w * 0.6, 35, 0xffffff, 0.9);
      this.add.ellipse(x + 25, y + 8, w * 0.6, 35, 0xffffff, 0.9);
    });
  }

  setupPlatforms() {
    this.add.rectangle(400, GAME_H - 175, 70, 14, 0xd4a96a);

    // Rooftop wall (left room wall)
    this.add.rectangle(240, GAME_H - 130, 20, 220, 0xbcaaa4);
  }

  setupWindow() {
    // Window in the wall at x=370
    this.windowX = 380;
    this.windowY = GAME_H - 200;
    addContactShadow(this, this.windowX, this.windowY + 52, 66, 14, 0.1, 2);
    applyDepthHaze(this.add.image(this.windowX, this.windowY, 'window').setDisplaySize(70, 100), 146);
  }

  setupRockingHorse() {
    this.horseWX = 200;
    this.horseWZ = 136;
    this.horseTop = 52;
    this.horseY = GAME_H - 90;

    // Horse sprite (physics, so baby can stand on it)
    this.horseShadow = addContactShadow(this, this.horseWX, this.horseY + 28, 74, 20, 0.2, 8);
    this.horse = applyDepthHaze(this.add.image(this.horseWX, this.horseY, 'rocking_horse')
      .setDisplaySize(80, 70)
      .setDepth(9), 136);
    const horseTex = ensureCraftedTexture(this, 'hero_horse_wood', {
      w: 90,
      h: 74,
      c1: 0xf0c996,
      c2: 0xd5a56f,
      c3: 0xb57f4b,
      outline: 0x5f3f24,
      radius: 14,
      noiseDots: 130,
    });
    this.horseOverlay = addCraftedOverlay(this, horseTex, this.horseWX, this.horseY, 80, 70, 10, 0.22);

    // Rocking tween
    this.horseTween = this.tweens.add({
      targets: this.horse,
      angle: 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.playerOnHorse = false;

    // Ride progress bar (shown while holding Right on horse)
    const BAR_W = 70;
    const BAR_H = 8;
    const barY = this.horseY - 52;
    this.rideBarBg = this.add.rectangle(this.horseWX, barY, BAR_W, BAR_H, 0x333333, 0.8)
      .setDepth(8).setVisible(false);
    this.rideBarFill = this.add.rectangle(this.horseWX - BAR_W / 2, barY, 0, BAR_H, 0x00ff88)
      .setOrigin(0, 0.5).setDepth(9).setVisible(false);
    this.rideBarLabel = this.add.text(this.horseWX, barY - 12, 'Hold RIGHT!', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(9).setVisible(false);
    this._rideBarW = BAR_W;
  }

  setupDada() {
    // Da Da is outside the window on rooftop
    addContactShadow(this, 520, GAME_H - 54, 48, 12, 0.18, 4);
    this.dadaSprite = applyDepthHaze(
      this.add.image(520, GAME_H - 90, 'dada').setDisplaySize(50, 68).setDepth(5),
      104
    );

    // Da Da waves
    this.tweens.add({
      targets: this.dadaSprite,
      angle: 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Da Da trigger zone
    this.dadaX = 520;
    this.dadaZ = 104;
  }

  setupPlayer() {
    this.horseCollider = {
      kind: 'solid',
      x: this.horseWX,
      z: this.horseWZ,
      w: 90,
      d: 42,
      minWy: -999,
      maxWy: 999,
    };

    this.player = new PlayerDepth(this, {
      start: { wx: 60, wz: 122, wy: 0 },
      walkBounds: { minX: 30, maxX: GAME_W - 30, minZ: 48, maxZ: 176 },
      groundHeight: (wx, wz) => {
        const inHorse = Math.abs(wx - this.horseCollider.x) <= this.horseCollider.w / 2
          && Math.abs(wz - this.horseCollider.z) <= this.horseCollider.d / 2;
        return inHorse ? this.horseTop : 0;
      },
      colliders: [
        this.horseCollider,
        {
          kind: 'exit',
          x: this.dadaX,
          z: this.dadaZ,
          w: 82,
          d: 58,
          minWy: -999,
          maxWy: 999,
          onTouch: p => this.reachDada(p),
        },
      ],
    });
  }

  setupExit() {
    // Exit = Da Da trigger
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, GAME_W, GAME_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  setupHUD() {
    this.hud = new HUD(this);
  }

  setupAtmosphere() {
    addDepthHazeOverlay(this, 0.12, 35);
    addWarmLightAndVignette(this, {
      warmColor: 0xffe3b8,
      warmAlpha: 0.16,
      vignetteAlpha: 0.1,
    });
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

  reachDada(player) {
    if (this.ending) return;
    this.ending = true;

    sfx.victory();
    this.hud.showBubble(player.x, player.y - 80, 'DA DA!!!', 0);

    // Big happy bubble from dada
    this.time.delayedCall(300, () => {
      this.hud.showBubble(this.dadaSprite.x - 20, this.dadaSprite.y - 80, '!! BABY !!', 0);
    });

    this.cameras.main.shake(300, 0.008);

    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(500, 255, 255, 255);
      this.time.delayedCall(600, () => {
        this.scene.start('EndScene');
      });
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this.player.update(time, delta);
    this.hud.update(this.player);

    // Rocking horse ride mechanic
    this.updateHorseRide(delta);

  }

  updateHorseRide(delta) {
    const cursors = this.player.cursors;
    const onHorse = this.isPlayerOnHorse();
    const RIDE_DURATION = 2000;

    if (onHorse && cursors.right.isDown && !this.horseAtWindow) {
      this.ridingTimer += delta;

      // Show + update progress bar
      const pct = Math.min(this.ridingTimer / RIDE_DURATION, 1);
      this.rideBarBg.setVisible(true).setX(this.horseWX);
      this.rideBarFill.setVisible(true).setX(this.horseWX - this._rideBarW / 2);
      this.rideBarFill.setDisplaySize(pct * this._rideBarW, this.rideBarFill.height);
      this.rideBarLabel.setVisible(true).setX(this.horseWX);

      // Color bar green→yellow→orange as it fills
      const fillColor = pct < 0.5 ? 0x00ff88 : pct < 0.8 ? 0xffd93d : 0xff922b;
      this.rideBarFill.setFillStyle(fillColor);

      if (this.ridingTimer >= RIDE_DURATION) {
        // Trigger horse slide
        this.horseAtWindow = true;
        this.rideBarBg.setVisible(false);
        this.rideBarFill.setVisible(false);
        this.rideBarLabel.setVisible(false);

        sfx.pickup();
        this.cameras.main.shake(120, 0.006);

        const targetX = this.horseTargetX;
        this.tweens.add({
          targets: this,
          horseWX: targetX,
          duration: 1200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            this.horse.setX(this.horseWX);
            this.horseShadow.setX(this.horseWX);
            this.horseOverlay.setX(this.horseWX);
            this.horseCollider.x = this.horseWX;
            if (this.playerOnHorse) {
              this.player.setWorldPosition(this.horseWX, this.horseWZ, this.horseTop);
            }
          },
          onComplete: () => {
            // Flash window to draw eye
            this.flashWindow();
            this.hud.showFloatingText(this.player.x, this.player.y - 60, 'Climb up!', '#ffff88');
            // Soft sparkle glow around DaDa — draws the player's eye to the goal
            this.pulseGlowOnDada();
          },
        });
      } else {
        // Rock more vigorously while building up
        this.horseTween.timeScale = 1 + pct * 2;
        if (!isTestMode() && Math.random() < 0.04) sfx.crawlTick();
      }
    } else {
      if (!onHorse) {
        this.playerOnHorse = false;
        this.ridingTimer = Math.max(0, this.ridingTimer - delta * 2); // drain fast when off
        if (this.horseTween) this.horseTween.timeScale = 1;
      }
      // Hide bar when not actively riding toward goal
      if (!this.horseAtWindow) {
        this.rideBarBg.setVisible(false);
        this.rideBarFill.setVisible(false);
        this.rideBarLabel.setVisible(false);
      }
    }
  }

  pulseGlowOnDada() {
    // Warm glow ring that pulses 3× over ~2.4s, then fades — draws eye to Da Da
    const glow = this.add.circle(this.dadaSprite.x, this.dadaSprite.y, 38, 0xffd93d, 0)
      .setDepth(4);
    this.tweens.add({
      targets: glow,
      alpha: 0.38,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 380,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => glow.destroy(),
    });
  }

  flashWindow() {
    // Brief bright flash on the window to signal "go here"
    const flash = this.add.rectangle(this.windowX, this.windowY, 74, 100, 0xffffff, 0.9)
      .setDepth(15);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  isPlayerOnHorse() {
    const dx = Math.abs(this.player.wx - this.horseCollider.x);
    const dz = Math.abs(this.player.wz - this.horseCollider.z);
    const inFootprint = dx <= this.horseCollider.w / 2 && dz <= this.horseCollider.d / 2;
    this.playerOnHorse = inFootprint && this.player.onGround && this.player.wy >= this.horseTop - 2;
    return this.playerOnHorse;
  }
}
