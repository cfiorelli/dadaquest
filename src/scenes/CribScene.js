import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../gameConfig.js';
import { PlayerBaby } from '../entities/PlayerBaby.js';
import { HUD } from '../ui/HUD.js';
import { Pendulum } from '../utils/pendulum.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina, addStamina, setStaminaMax } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';
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
    // Wallpaper dots
    for (let i = 0; i < 20; i++) {
      this.add.circle(
        Phaser.Math.Between(10, GAME_W - 10),
        Phaser.Math.Between(10, GAME_H - 80),
        Phaser.Math.Between(4, 10),
        0xf8bbd0, 0.4
      );
    }

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
    this.staticGroup = this.physics.add.staticGroup();

    // === CRIB ===
    // Crib floor (baby starts here)
    this.cribFloor = this.staticGroup.create(GAME_W / 2, GAME_H - 70, null)
      .setSize(240, 20).setVisible(false);
    addContactShadow(this, GAME_W / 2, GAME_H - 48, 230, 18, 0.15, 2);
    this.add.image(GAME_W / 2, GAME_H - 70, 'crib_wood_plank').setDisplaySize(240, 20);

    // Crib left wall
    this.cribLeftWall = this.staticGroup.create(GAME_W / 2 - 120, GAME_H - 150, null)
      .setSize(16, 160).setVisible(false);
    const cribL = applyDepthHaze(this.add.image(GAME_W / 2 - 120, GAME_H - 150, 'crib_wall')
      .setDisplaySize(16, 160), 140);
    cribL.setTint(0xe3bb8a);

    // Crib right wall
    this.cribRightWall = this.staticGroup.create(GAME_W / 2 + 120, GAME_H - 150, null)
      .setSize(16, 160).setVisible(false);
    const cribR = applyDepthHaze(this.add.image(GAME_W / 2 + 120, GAME_H - 150, 'crib_wall')
      .setDisplaySize(16, 160), 140);
    cribR.setTint(0xe3bb8a);

    // Crib top rail (baby can crawl across top)
    this.cribTopRail = this.staticGroup.create(GAME_W / 2, GAME_H - 225, null)
      .setSize(240, 12).setVisible(false);
    addContactShadow(this, GAME_W / 2, GAME_H - 208, 210, 10, 0.12, 2);
    this.add.image(GAME_W / 2, GAME_H - 225, 'crib_wood_plank').setDisplaySize(240, 12);

    // === DRESSER (left side) ===
    // Dresser surface - platform for baby to land on
    this.dresser = this.staticGroup.create(120, GAME_H - 165, null)
      .setSize(120, 16).setVisible(false);
    addContactShadow(this, 120, GAME_H - 92, 110, 18, 0.18, 2);
    applyDepthHaze(this.add.image(120, GAME_H - 135, 'dresser').setDisplaySize(120, 80), 116);

    // === Ground (below everything) ===
    this.ground = this.staticGroup.create(GAME_W / 2, GAME_H - 10, null)
      .setSize(GAME_W, 20).setVisible(false);

    // === Climbable walls for WALL_CLIMB ===
    this.climbWalls = this.physics.add.staticGroup();

    // Crib inner left wall (climbable)
    this.climbWalls.create(GAME_W / 2 - 112, GAME_H - 150, null)
      .setSize(8, 160).setVisible(false);
    // Crib inner right wall (climbable)
    this.climbWalls.create(GAME_W / 2 + 112, GAME_H - 150, null)
      .setSize(8, 160).setVisible(false);
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
    // Exit zone — wide doorway covering the entire left half of the dresser top
    // Dresser platform collider is at y=GAME_H-165, surface top ~GAME_H-173
    // Baby standing there has center y ≈ GAME_H-192; zone covers plenty of range
    const EXIT_X = 104;
    const EXIT_Y = GAME_H - 196;
    this.exitZone = this.add.zone(EXIT_X, EXIT_Y, 180, 120).setOrigin(0.5);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);

    // Safety rail exit so first-time players can clear Scene 1 quickly.
    this.railExitZone = this.add.zone(GAME_W / 2 - 92, GAME_H - 225, 90, 24).setOrigin(0.5);
    this.physics.world.enable(this.railExitZone);
    this.railExitZone.body.setAllowGravity(false);

    // Doorway arch visual behind the dresser area
    const gfx = this.add.graphics().setDepth(3);
    gfx.lineStyle(3, 0x00ff88, 1);
    gfx.strokeRect(EXIT_X - 88, EXIT_Y - 52, 176, 104);
    gfx.fillStyle(0x00ff88, 0.08);
    gfx.fillRect(EXIT_X - 88, EXIT_Y - 52, 176, 104);

    // Pulsing arrow + EXIT label
    const exitLabel = this.add.text(EXIT_X, EXIT_Y - 36, '>> EXIT >>', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00ff88',
      stroke: '#003300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this.tweens.add({
      targets: exitLabel,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtle glow pulse on the box
    this.tweens.add({
      targets: gfx,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const railHint = this.add.text(GAME_W / 2 - 92, GAME_H - 248, 'ESCAPE RAIL', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#dcedc8',
      stroke: '#2e7d32',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);
    this.tweens.add({
      targets: railHint,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
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

    // Draw rope
    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(2, 0x888888, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.mobileAnchorX, this.mobileAnchorY);
    this.ropeGraphics.lineTo(this.mobilePendulum.getBobX(), this.mobilePendulum.getBobY());
    this.ropeGraphics.strokePath();

    // Draw anchor dot
    this.ropeGraphics.fillStyle(0x555555, 1);
    this.ropeGraphics.fillCircle(this.mobileAnchorX, this.mobileAnchorY, 5);

    // Draw grab-zone hint ring around bob when player is airborne and not already swinging
    if (this.player.state === STATE.AIR) {
      const bobX = this.mobilePendulum.getBobX();
      const bobY = this.mobilePendulum.getBobY();
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bobX, bobY);
      const alpha = Phaser.Math.Clamp(1 - dist / 140, 0.15, 0.78);
      const pulse = 1 + Math.sin(time * 0.008) * 0.08;
      this.ropeGraphics.lineStyle(1.8, 0xfff7c2, alpha);
      this.ropeGraphics.strokeCircle(bobX, bobY, this.grabRadius);
      this.ropeGraphics.lineStyle(1.2, 0xffffff, alpha * 0.5);
      this.ropeGraphics.strokeCircle(bobX, bobY, this.grabRadius * pulse);
    }

    // Update player
    this.player.update(time, delta);
    this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    const vy = Math.abs(this.player.body.velocity.y);
    this.playerShadow.setScale(1 + Phaser.Math.Clamp(vy / 420, 0, 0.22), 1);
    this.playerShadow.setAlpha(0.18 - Phaser.Math.Clamp(vy / 900, 0, 0.08));

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
