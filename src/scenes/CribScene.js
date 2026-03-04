import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { PlayerBaby } from '../entities/PlayerBaby.js';
import { HUD } from '../ui/HUD.js';
import { Pendulum } from '../utils/pendulum.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina, addStamina, setStaminaMax } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';
import { registerPauseHotkey } from '../utils/pause.js';
import {
  addContactShadow,
  addDepthHazeOverlay,
  addWarmLightAndVignette,
  applyDepthHaze,
} from '../utils/sceneFx.js';

export class CribScene extends Phaser.Scene {
  constructor() {
    super('CribScene');
  }

  create() {
    this.physics.world.gravity.y = 500;
    this.createCraftedTextures();
    setStaminaMax(this, 5);
    setStamina(this, 3);
    this.events.once('shutdown', () => setStaminaMax(this, 4));
    this.failsafeGiven = false;
    this.elapsedSceneMs = 0;

    // Background - nursery
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xfce4ec);
    // Floor
    this.add.rectangle(GAME_W / 2, GAME_H - 10, GAME_W, 20, 0xd7b99e);
    // Baseboard
    this.add.rectangle(GAME_W / 2, GAME_H - 22, GAME_W, 12, 0xeecfb5).setDepth(1);
    this.add.rectangle(GAME_W / 2, GAME_H - 27, GAME_W, 2, 0xfff0e0, 0.55).setDepth(1);
    // Wallpaper dots (ordered grid, not random)
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 5; row++) {
        this.add.circle(col * 84 + 42, row * 76 + 50, 6, 0xf8bbd0, 0.32);
      }
    }
    // Wall sticker — crescent moon + stars above crib (right side)
    const decal = this.add.graphics().setDepth(1);
    decal.fillStyle(0xffd97d, 0.42);
    decal.fillCircle(620, 96, 22);
    decal.fillStyle(0xfce4ec, 1); // cut crescent
    decal.fillCircle(632, 88, 17);
    [[595, 70], [648, 112], [608, 120]].forEach(([sx, sy]) => {
      decal.fillStyle(0xffd97d, 0.38);
      decal.fillCircle(sx, sy, 5);
    });

    this.setupPlatforms();
    this.setupMobile();
    this.setupOnesie();
    this.setupPlayer();
    this.setupExit();
    this.setupCollisions();
    this.setupAtmosphere();
    this.setupHUD();
    this.setupHints();
    this.setupEvents();

    // Wake-up bubble
    this.time.delayedCall(400, () => {
      if (this.hud) this.hud.showBubble(this.player.x, this.player.y - 50, 'da da?', 3000);
    });

    // Onesie collected flag
    this.onesieCollected = false;

    // R key
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      setStaminaMax(this, 5);
      setStamina(this, 3);
      this.scene.restart();
    });

    // D key
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', () => {
      this.hud.toggleDebug(this.player);
    });
    registerPauseHotkey(this);

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) this.time.delayedCall(600, () => this.scene.start('BedroomScene'));
  }

  createCraftedTextures() {
    if (!this.textures.exists('crib_wood_plank')) {
      const g = this.add.graphics();
      g.fillGradientStyle(0xe7c79a, 0xe0bf91, 0xcfa574, 0xc79f71, 1, 1, 1, 1);
      g.fillRoundedRect(0, 0, 180, 34, 6);
      g.lineStyle(2, 0xb38556, 0.35);
      g.strokeRoundedRect(1, 1, 178, 32, 6);
      for (let i = 0; i < 22; i++) {
        g.fillStyle(0xffffff, 0.04);
        g.fillRect(Phaser.Math.Between(2, 176), Phaser.Math.Between(2, 30), 2, 1);
      }
      g.generateTexture('crib_wood_plank', 180, 34);
      g.destroy();
    }

    if (!this.textures.exists('hero_onesie')) {
      const g = this.add.graphics();
      g.fillGradientStyle(0x8dd6ff, 0x66bff3, 0x3b98df, 0x2f7ec6, 1, 1, 1, 1);
      g.fillRoundedRect(2, 2, 42, 42, 10);
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(16, 14, 9);
      g.fillStyle(0xfff59d, 0.5);
      g.fillCircle(30, 28, 6);
      g.generateTexture('hero_onesie', 46, 46);
      g.destroy();
    }
  }

  setupPlatforms() {
    const HW = 134; // crib half-width (+12% vs original 120)
    const WALL_H = 178;
    const WALL_CY = GAME_H - 70 - WALL_H / 2; // center y of walls
    const TOP_Y = GAME_H - 70 - WALL_H;       // top rail center y

    this.staticGroup = this.physics.add.staticGroup();

    // === CRIB ===
    // Crib floor
    this.cribFloor = this.staticGroup.create(GAME_W / 2, GAME_H - 70, null)
      .setSize(HW * 2, 20).setVisible(false);
    addContactShadow(this, GAME_W / 2, GAME_H - 48, HW * 2 - 10, 18, 0.15, 2);
    this.add.image(GAME_W / 2, GAME_H - 70, 'crib_wood_plank').setDisplaySize(HW * 2, 20);
    // Top highlight — implies the top face of the floor rail
    this.add.rectangle(GAME_W / 2, GAME_H - 79, HW * 2 - 6, 3, 0xf5ddb0, 0.7).setDepth(3);

    // Mattress pad (cream pad inside crib, depth=2 so it sits above floor)
    this.add.rectangle(GAME_W / 2, GAME_H - 83, HW * 2 - 22, 16, 0xf0e8d5).setDepth(2);

    // Front bottom rail — thick face on the near side of the crib base
    this.add.rectangle(GAME_W / 2, GAME_H - 61, HW * 2 + 12, 8, 0xc09042).setDepth(6);

    // Crib left wall
    this.cribLeftWall = this.staticGroup.create(GAME_W / 2 - HW, WALL_CY, null)
      .setSize(18, WALL_H).setVisible(false);
    const cribL = applyDepthHaze(
      this.add.image(GAME_W / 2 - HW, WALL_CY, 'crib_wall').setDisplaySize(18, WALL_H), 140
    );
    cribL.setTint(0xe3bb8a);

    // Crib right wall
    this.cribRightWall = this.staticGroup.create(GAME_W / 2 + HW, WALL_CY, null)
      .setSize(18, WALL_H).setVisible(false);
    const cribR = applyDepthHaze(
      this.add.image(GAME_W / 2 + HW, WALL_CY, 'crib_wall').setDisplaySize(18, WALL_H), 140
    );
    cribR.setTint(0xe3bb8a);

    // Crib top rail
    this.cribTopRail = this.staticGroup.create(GAME_W / 2, TOP_Y, null)
      .setSize(HW * 2, 14).setVisible(false);
    addContactShadow(this, GAME_W / 2, TOP_Y + 17, HW * 2 - 16, 10, 0.12, 2);
    this.add.image(GAME_W / 2, TOP_Y, 'crib_wood_plank').setDisplaySize(HW * 2, 14);
    // Top highlight on top rail
    this.add.rectangle(GAME_W / 2, TOP_Y - 6, HW * 2 - 6, 3, 0xf5ddb0, 0.7).setDepth(3);

    // Corner posts (rounded) at all 4 crib corners
    const postG = this.add.graphics().setDepth(7);
    [
      [GAME_W / 2 - HW - 4, TOP_Y - 8],
      [GAME_W / 2 + HW + 4, TOP_Y - 8],
      [GAME_W / 2 - HW - 4, GAME_H - 64],
      [GAME_W / 2 + HW + 4, GAME_H - 64],
    ].forEach(([px, py]) => {
      postG.fillStyle(0xb07030);
      postG.fillRoundedRect(px - 7, py - 9, 14, 18, 3);
      postG.fillStyle(0xd4a060, 0.45);
      postG.fillRoundedRect(px - 5, py - 8, 5, 5, 1); // highlight face
    });

    // === DRESSER (left side) ===
    this.dresser = this.staticGroup.create(120, GAME_H - 165, null)
      .setSize(120, 16).setVisible(false);
    addContactShadow(this, 120, GAME_H - 92, 110, 18, 0.18, 2);
    applyDepthHaze(this.add.image(120, GAME_H - 135, 'dresser').setDisplaySize(120, 80), 116);

    // === Ground ===
    this.ground = this.staticGroup.create(GAME_W / 2, GAME_H - 10, null)
      .setSize(GAME_W, 20).setVisible(false);

    // === Climbable walls ===
    this.climbWalls = this.physics.add.staticGroup();
    this.climbWalls.create(GAME_W / 2 - HW + 9, WALL_CY, null)
      .setSize(8, WALL_H).setVisible(false);
    this.climbWalls.create(GAME_W / 2 + HW - 9, WALL_CY, null)
      .setSize(8, WALL_H).setVisible(false);

    // Store TOP_Y for use in setupExit
    this._cribTopY = TOP_Y;
  }

  setupMobile() {
    // Mobile anchor at ceiling center-ish
    this.mobileAnchorX = GAME_W / 2 + 10;
    this.mobileAnchorY = GAME_H - 310;
    this.mobileLength = 90;

    // Visual anchor line (drawn each frame)
    this.ropeGraphics = this.add.graphics().setDepth(5);

    // Mobile toy sprite (moves with pendulum)
    this.mobileToy = applyDepthHaze(
      this.add.image(this.mobileAnchorX, this.mobileAnchorY + this.mobileLength, 'mobile_toy')
        .setDepth(6)
        .setScale(0.94),
      170
    );
    this.tweens.add({
      targets: this.mobileToy,
      scaleX: 1.0,
      scaleY: 0.88,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pendulum state
    this.mobilePendulum = new Pendulum(
      this.mobileAnchorX, this.mobileAnchorY,
      this.mobileLength, 0.3
    );

    // Grab zone radius (must match PlayerBaby.checkSwingGrab threshold)
    this.grabRadius = 56;
    this.playerOnSwing = false;
  }

  setupOnesie() {
    // Onesie on dresser
    addContactShadow(this, 100, GAME_H - 166, 32, 10, 0.2, 4);
    this.onesieSprite = this.physics.add.staticSprite(100, GAME_H - 185, 'hero_onesie')
      .setDisplaySize(36, 36);
    this.tweens.add({
      targets: this.onesieSprite,
      y: GAME_H - 188,
      angle: 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setupPlayer() {
    // Start baby in crib center
    this.player = new PlayerBaby(this, GAME_W / 2, GAME_H - 100);
    this.player.setClimbWalls(this.climbWalls);
    this.player.setCheckpointNapEnabled(false);
    this.playerShadow = addContactShadow(this, this.player.x, this.player.y + 20, 34, 12, 0.18, 8);

    // Give pendulum reference for swing detection
    this.player.pendulum = this.mobilePendulum;
    this.player.grabZone = true; // flag that we have a grab zone
  }

  setupExit() {
    const EXIT_X = 104;
    const EXIT_Y = GAME_H - 196;
    this.exitZone = this.add.zone(EXIT_X, EXIT_Y, 180, 120).setOrigin(0.5);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);

    // Rail exit zone — position matches new crib top rail
    this.railExitZone = this.add.zone(GAME_W / 2 - 92, this._cribTopY, 90, 24).setOrigin(0.5);
    this.physics.world.enable(this.railExitZone);
    this.railExitZone.body.setAllowGravity(false);

    // Diegetic cardboard sign
    const sx = EXIT_X + 4;
    const sy = EXIT_Y - 20;
    const sign = this.add.graphics().setDepth(4);
    sign.fillStyle(0xd4aa6a, 1);
    sign.fillRoundedRect(sx - 62, sy - 15, 124, 30, 5);
    sign.lineStyle(2, 0x8b5e28, 0.85);
    sign.strokeRoundedRect(sx - 62, sy - 15, 124, 30, 5);
    this.add.text(sx, sy, 'Bedroom →', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#5c3510',
    }).setOrigin(0.5, 0.5).setDepth(5);

    // Subtle pulse (warm, not neon)
    this.tweens.add({
      targets: sign,
      alpha: 0.68,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.staticGroup);
    this.physics.add.collider(this.player, this.climbWalls);

    // Onesie overlap
    this.physics.add.overlap(this.player, this.onesieSprite, this.collectOnesie, null, this);

    // Exit overlap
    this.physics.add.overlap(this.player, this.exitZone, this.exitScene, null, this);
    this.physics.add.overlap(this.player, this.railExitZone, this.exitScene, null, this);
  }

  setupHUD() {
    this.hud = new HUD(this);
  }

  setupAtmosphere() {
    addDepthHazeOverlay(this, 0.1, 35);
    addWarmLightAndVignette(this, {
      warmColor: 0xffdfc2,
      warmAlpha: 0.14,
      vignetteAlpha: 0.11,
    });
  }

  setupHints() {
    // Hint text (scene 1 only)
    this.hintText = this.add.text(GAME_W / 2, 20, 'Arrows: move  |  Space: jump  |  Up/Down on wall: climb', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666666',
      backgroundColor: '#ffffff80',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);

    this.time.delayedCall(6000, () => {
      if (this.hintText && this.hintText.active) {
        this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1000 });
      }
    });
  }

  setupEvents() {
    this.events.on('nap-start', () => {
      if (this.hud) {
        this.hud.showBubble(this.player.x, this.player.y - 60, 'zzz...', 0);
        this.hud.showZzz(this.player.x, this.player.y - 40);
      }
    });

    this.events.on('nap-end', () => {
      if (this.hud) {
        this.hud.clearBubble();
        this.hud.clearZzz();
      }
    });

    this.events.on('swing-grab', ({ x, y }) => {
      const pulse = this.add.circle(x, y, 12, 0xffffff, 0.5).setDepth(20);
      const txt = this.add.text(x, y - 20, 'GRAB!', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff8e1',
        stroke: '#5d4037',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(21);
      this.tweens.add({
        targets: pulse,
        alpha: 0,
        scale: 2.2,
        duration: 180,
        onComplete: () => pulse.destroy(),
      });
      this.tweens.add({
        targets: txt,
        y: txt.y - 18,
        alpha: 0,
        duration: 260,
        onComplete: () => txt.destroy(),
      });
    });
  }

  collectOnesie(player, onesie) {
    if (this.onesieCollected) return;
    this.onesieCollected = true;
    onesie.destroy();
    addStamina(this, 1);
    sfx.pickup();
    this.hud.showFloatingText(player.x, player.y - 50, '+1 STAMINA!', '#42a5f5');
    this.hud.updateStamina();
  }

  exitScene() {
    if (this.exiting) return;
    this.exiting = true;
    sfx.whoosh();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => {
      setStaminaMax(this, 4);
      setStamina(this, Math.max(1, getStamina(this)));
      this.scene.start('BedroomScene');
    });
  }

  update(time, delta) {
    if (!this.player) return;

    // Mobile pendulum update (always swings independently)
    this.mobilePendulum.update(delta / 1000);

    // If player is on swing, they control it
    if (this.player.state === STATE.SWING) {
      this.player.pendulum = this.mobilePendulum;
    }

    // Update mobile toy position
    this.mobileToy.setPosition(
      this.mobilePendulum.getBobX(),
      this.mobilePendulum.getBobY()
    );
    this.mobileToy.setAngle(Phaser.Math.RadToDeg(this.mobilePendulum.angle) * 0.5);

    // Draw rope (thicker, warmer)
    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(3, 0x8b6a3e, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.mobileAnchorX, this.mobileAnchorY);
    this.ropeGraphics.lineTo(this.mobilePendulum.getBobX(), this.mobilePendulum.getBobY());
    this.ropeGraphics.strokePath();

    // Hanger arm + anchor knob
    this.ropeGraphics.lineStyle(4, 0x7a5a30, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.mobileAnchorX - 22, this.mobileAnchorY);
    this.ropeGraphics.lineTo(this.mobileAnchorX + 22, this.mobileAnchorY);
    this.ropeGraphics.strokePath();
    this.ropeGraphics.fillStyle(0x5d3a1a, 1);
    this.ropeGraphics.fillCircle(this.mobileAnchorX, this.mobileAnchorY, 6);

    // Soft glow ring — only when airborne and within grab range
    if (this.player.state === STATE.AIR) {
      const bobX = this.mobilePendulum.getBobX();
      const bobY = this.mobilePendulum.getBobY();
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bobX, bobY);
      if (dist < this.grabRadius * 2.2) {
        const alpha = Phaser.Math.Clamp(1 - dist / (this.grabRadius * 2.2), 0, 0.82);
        const pulse = 1 + Math.sin(time * 0.009) * 0.07;
        this.ropeGraphics.lineStyle(2, 0xfff7c2, alpha);
        this.ropeGraphics.strokeCircle(bobX, bobY, this.grabRadius * pulse);
      }
    }

    // Update player
    this.player.update(time, delta);
    this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    const heightAboveFloor = Math.max(0, (GAME_H - 78) - this.player.y);
    const ht = Phaser.Math.Clamp(heightAboveFloor / 190, 0, 1);
    this.playerShadow.setScale(1 - ht * 0.5, 1);
    this.playerShadow.setAlpha(0.18 - ht * 0.12);

    // HUD update
    this.hud.update(this.player);

    // Failsafe to avoid softlock pacing for first-time players.
    this.elapsedSceneMs += delta;
    if (!this.exiting && !this.failsafeGiven && this.elapsedSceneMs > 45000) {
      this.failsafeGiven = true;
      addStamina(this, 1);
      this.hud.showFloatingText(this.player.x, this.player.y - 56, '+1 BOOST', '#fff59d');
    }

    // Check out of bounds
    if (this.player.y > GAME_H + 50) {
      this.player.setPosition(GAME_W / 2, GAME_H - 100);
      this.player.body.setVelocity(0, 0);
      this.player.setState(STATE.CRAWL);
    }
  }
}
