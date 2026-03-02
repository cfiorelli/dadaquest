import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../gameConfig.js';
import { PlayerBaby } from '../entities/PlayerBaby.js';
import { HUD } from '../ui/HUD.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { setStamina } from '../utils/state.js';

export class RooftopScene extends Phaser.Scene {
  constructor() {
    super('RooftopScene');
  }

  create() {
    this.physics.world.gravity.y = 500;

    // Sky gradient (blue)
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x87ceeb);

    // Clouds
    this.makeClouds();

    // Rooftop floor
    this.add.rectangle(GAME_W / 2, GAME_H - 10, GAME_W, 20, 0x78909c);
    this.add.rectangle(GAME_W / 2, GAME_H - 20, GAME_W, 4, 0xb0bec5);

    // Interior floor section (inside room)
    this.add.rectangle(120, GAME_H - 30, 240, 60, 0xd7b99e);

    // Plants on rooftop
    [-20, 30, 80].forEach(offset => {
      this.add.image(600 + offset, GAME_H - 80, 'plant').setDisplaySize(32, 50);
    });
    [0, 50].forEach(offset => {
      this.add.image(700 + offset, GAME_H - 78, 'plant').setDisplaySize(28, 44);
    });

    // Sun
    this.add.circle(720, 80, 50, 0xffd93d);
    this.add.circle(720, 80, 40, 0xffeb3b);

    this.setupPlatforms();
    this.setupWindow();
    this.setupRockingHorse();
    this.setupDada();
    this.setupPlayer();
    this.setupExit();
    this.setupCollisions();
    this.setupHUD();
    this.setupEvents();

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      setStamina(this, 2);
      this.scene.restart();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', () => {
      this.hud.toggleDebug(this.player);
    });

    this.time.delayedCall(500, () => {
      this.hud.showBubble(this.player.x, this.player.y - 60, 'da da?!', 3000);
    });

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
    this.staticGroup = this.physics.add.staticGroup();

    // Main floor (rooftop + interior)
    this.staticGroup.create(GAME_W / 2, GAME_H - 10, null)
      .setSize(GAME_W, 20).setVisible(false);

    // Interior elevated floor
    this.interiorFloor = this.staticGroup.create(120, GAME_H - 58, null)
      .setSize(240, 16).setVisible(false);

    // Window sill (ledge to stand on outside)
    this.windowSill = this.staticGroup.create(400, GAME_H - 175, null)
      .setSize(70, 14).setVisible(false);
    this.add.rectangle(400, GAME_H - 175, 70, 14, 0xd4a96a);

    // Rooftop wall (left room wall)
    this.add.rectangle(240, GAME_H - 130, 20, 220, 0xbcaaa4);
    this.staticGroup.create(240, GAME_H - 130, null).setSize(20, 220).setVisible(false);

    // Climbable walls
    this.climbWalls = this.physics.add.staticGroup();
    // Window frame sides (climbable to get from horse to sill)
    this.climbWalls.create(368, GAME_H - 150, null).setSize(10, 80).setVisible(false);
    this.climbWalls.create(434, GAME_H - 150, null).setSize(10, 80).setVisible(false);
  }

  setupWindow() {
    // Window in the wall at x=370
    this.windowX = 380;
    this.windowY = GAME_H - 200;
    this.add.image(this.windowX, this.windowY, 'window').setDisplaySize(70, 100);
  }

  setupRockingHorse() {
    this.horseX = 200;
    this.horseY = GAME_H - 90;

    // Horse sprite (physics, so baby can stand on it)
    this.horse = this.physics.add.staticSprite(this.horseX, this.horseY, 'rocking_horse')
      .setDisplaySize(80, 70);
    this.horse.body.setSize(80, 14);
    this.horse.body.setOffset(0, 20);

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
    this.rideBarBg = this.add.rectangle(this.horseX, barY, BAR_W, BAR_H, 0x333333, 0.8)
      .setDepth(8).setVisible(false);
    this.rideBarFill = this.add.rectangle(this.horseX - BAR_W / 2, barY, 0, BAR_H, 0x00ff88)
      .setOrigin(0, 0.5).setDepth(9).setVisible(false);
    this.rideBarLabel = this.add.text(this.horseX, barY - 12, 'Hold RIGHT!', {
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
    this.dadaSprite = this.add.image(520, GAME_H - 90, 'dada')
      .setDisplaySize(50, 68).setDepth(5);

    // Da Da waves
    this.tweens.add({
      targets: this.dadaSprite,
      angle: 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Da Da trigger zone
    this.dadaTrigger = this.add.zone(520, GAME_H - 90, 80, 80).setOrigin(0.5);
    this.physics.world.enable(this.dadaTrigger);
    this.dadaTrigger.body.setAllowGravity(false);
  }

  setupPlayer() {
    this.player = new PlayerBaby(this, 60, GAME_H - 100);
    this.player.setClimbWalls(this.climbWalls);
  }

  setupExit() {
    // Exit = Da Da trigger
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.staticGroup);
    this.physics.add.collider(this.player, this.horse, () => {
      this.playerOnHorse = this.player.body.blocked.down && this.player.y < this.horse.y;
    });
    this.physics.add.overlap(this.player, this.dadaTrigger, this.reachDada, null, this);
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

  reachDada(player, trigger) {
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

    if (this.player.y > GAME_H + 50) {
      this.player.setPosition(60, GAME_H - 100);
      this.player.body.setVelocity(0, 0);
      this.player.setState(STATE.CRAWL);
    }
  }

  updateHorseRide(delta) {
    const cursors = this.player.cursors;
    const onHorse = this.playerOnHorse && this.player.body.blocked.down;
    const RIDE_DURATION = 2000;

    if (onHorse && cursors.right.isDown && !this.horseAtWindow) {
      this.ridingTimer += delta;

      // Show + update progress bar
      const pct = Math.min(this.ridingTimer / RIDE_DURATION, 1);
      this.rideBarBg.setVisible(true).setX(this.horse.x);
      this.rideBarFill.setVisible(true).setX(this.horse.x - this._rideBarW / 2);
      this.rideBarFill.setDisplaySize(pct * this._rideBarW, this.rideBarFill.height);
      this.rideBarLabel.setVisible(true).setX(this.horse.x);

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
          targets: this.horse,
          x: targetX,
          duration: 1200,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (this.playerOnHorse) {
              this.player.setX(this.horse.x);
              this.player.body.reset(this.horse.x, this.player.y);
            }
            this.horse.body.reset(this.horse.x, this.horse.y);
          },
          onComplete: () => {
            // Flash window to draw eye
            this.flashWindow();
            this.hud.showFloatingText(this.player.x, this.player.y - 60, 'Climb up!', '#ffff88');
          },
        });
      } else {
        // Rock more vigorously while building up
        this.horseTween.timeScale = 1 + pct * 2;
        if (Math.random() < 0.04) sfx.crawlTick();
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
}
