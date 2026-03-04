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
  PALETTE,
  drawContactShadow,
  applyWarmLightVignette,
  applyDepthHaze,
  applyDepthTint,
  generateWoodTexture,
  generateFeltTexture,
  drawSign,
} from '../art/styleKit.js';

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

    // ═══ NURSERY BACKGROUND ═══
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, PALETTE.paperCream);
    
    // Floor (soft wood)
    const floorG = this.add.graphics();
    floorG.fillGradientStyle(0xd7b99e, 0xd7b99e, 0xc6a88d, 0xc6a88d, 1, 1, 1, 1);
    floorG.fillRect(0, GAME_H - 20, GAME_W, 20);
    
    // Baseboard (crisp highlight)
    this.add.rectangle(GAME_W / 2, GAME_H - 22, GAME_W, 12, 0xeecfb5).setDepth(1);
    this.add.rectangle(GAME_W / 2, GAME_H - 27, GAME_W, 2, PALETTE.highlight, 0.55).setDepth(1);
    
    // Wallpaper texture (subtle fabric dots, ordered grid)
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 5; row++) {
        this.add.circle(col * 84 + 42, row * 76 + 50, 6, PALETTE.feltPink, 0.28);
      }
    }
    
    // Wall decal cluster (moon + stars, tasteful placement above crib area)
    const decal = this.add.graphics().setDepth(1);
    // Crescent moon
    decal.fillStyle(0xffd97d, 0.45);
    decal.fillCircle(620, 96, 22);
    decal.fillStyle(PALETTE.paperCream, 1);
    decal.fillCircle(632, 88, 17);
    // Stars (using Star game objects instead of graphics)
    [[595, 70], [648, 112], [608, 120]].forEach(([sx, sy]) => {
      this.add.star(sx, sy, 5, 3, 5, 0xffd97d, 0.4).setDepth(1);
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
    // Crib wood plank
    generateWoodTexture(this, 'crib_wood_plank', 180, 34);

    // Onesie icon (hero blue with felt texture)
    if (!this.textures.exists('hero_onesie')) {
      const g = this.add.graphics();
      g.fillGradientStyle(0x8dd6ff, 0x66bff3, 0x3b98df, 0x2f7ec6, 1, 1, 1, 1);
      g.fillRoundedRect(2, 2, 42, 42, 10);
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(16, 14, 9);
      g.fillStyle(0xfff59d, 0.55);
      g.fillCircle(30, 28, 6);
      g.generateTexture('hero_onesie', 46, 46);
      g.destroy();
    }
  }

  setupPlatforms() {
    const HW = 134; // crib half-width
    const WALL_H = 178;
    const WALL_CY = GAME_H - 70 - WALL_H / 2;
    const TOP_Y = GAME_H - 70 - WALL_H;

    this.staticGroup = this.physics.add.staticGroup();

    // ═══ CRIB ═══
    // Floor rail
    this.cribFloor = this.staticGroup.create(GAME_W / 2, GAME_H - 70, null)
      .setSize(HW * 2, 20).setVisible(false);
    drawContactShadow(this, GAME_W / 2, GAME_H - 48, HW * 2 - 10, 18, 0.15, 2);
    this.add.image(GAME_W / 2, GAME_H - 70, 'crib_wood_plank').setDisplaySize(HW * 2, 20);
    // Top highlight (implies 3D thickness)
    this.add.rectangle(GAME_W / 2, GAME_H - 79, HW * 2 - 6, 3, 0xf5ddb0, 0.7).setDepth(3);

    // Mattress pad (felt, inside crib)
    generateFeltTexture(this, 'crib_mattress', PALETTE.feltCream, HW * 2 - 22, 16);
    this.add.image(GAME_W / 2, GAME_H - 83, 'crib_mattress').setDepth(2);
    // Stitched seams (subtle dots instead of dashed lines)
    const seamG = this.add.graphics().setDepth(2);
    for (let i = 0; i < 20; i++) {
      seamG.fillStyle(PALETTE.cardboardEdge, 0.3);
      seamG.fillCircle(GAME_W / 2 - HW + 18 + i * 12, GAME_H - 83, 1);
    }

    // Front bottom rail (thick face, near side)
    this.add.rectangle(GAME_W / 2, GAME_H - 61, HW * 2 + 12, 8, 0xc09042).setDepth(6);

    // Vertical spindles (left wall)
    this.cribLeftWall = this.staticGroup.create(GAME_W / 2 - HW, WALL_CY, null)
      .setSize(18, WALL_H).setVisible(false);
    const spindleG = this.add.graphics().setDepth(4);
    for (let i = 0; i < 10; i++) {
      const sy = WALL_CY - WALL_H / 2 + 10 + i * 16;
      spindleG.lineStyle(4, PALETTE.woodMid, 1);
      spindleG.beginPath();
      spindleG.moveTo(GAME_W / 2 - HW, sy);
      spindleG.lineTo(GAME_W / 2 - HW, sy + 12);
      spindleG.strokePath();
    }
    
    // Right wall spindles
    this.cribRightWall = this.staticGroup.create(GAME_W / 2 + HW, WALL_CY, null)
      .setSize(18, WALL_H).setVisible(false);
    for (let i = 0; i < 10; i++) {
      const sy = WALL_CY - WALL_H / 2 + 10 + i * 16;
      spindleG.lineStyle(4, PALETTE.woodMid, 1);
      spindleG.beginPath();
      spindleG.moveTo(GAME_W / 2 + HW, sy);
      spindleG.lineTo(GAME_W / 2 + HW, sy + 12);
      spindleG.strokePath();
    }

    // Top rail
    this.cribTopRail = this.staticGroup.create(GAME_W / 2, TOP_Y, null)
      .setSize(HW * 2, 14).setVisible(false);
    drawContactShadow(this, GAME_W / 2, TOP_Y + 17, HW * 2 - 16, 10, 0.12, 2);
    this.add.image(GAME_W / 2, TOP_Y, 'crib_wood_plank').setDisplaySize(HW * 2, 14);
    this.add.rectangle(GAME_W / 2, TOP_Y - 6, HW * 2 - 6, 3, 0xf5ddb0, 0.7).setDepth(3);

    // Corner posts (rounded, shaded)
    const postG = this.add.graphics().setDepth(7);
    [
      [GAME_W / 2 - HW - 4, TOP_Y - 8],
      [GAME_W / 2 + HW + 4, TOP_Y - 8],
      [GAME_W / 2 - HW - 4, GAME_H - 64],
      [GAME_W / 2 + HW + 4, GAME_H - 64],
    ].forEach(([px, py]) => {
      postG.fillGradientStyle(0xb07030, 0xb07030, 0x8a5520, 0x8a5520, 1, 1, 1, 1);
      postG.fillRoundedRect(px - 7, py - 9, 14, 18, 3);
      postG.fillStyle(PALETTE.highlight, 0.35);
      postG.fillRoundedRect(px - 5, py - 8, 5, 5, 1);
    });

    // ═══ DRESSER (left side, crafted look) ===
    this.dresser = this.staticGroup.create(120, GAME_H - 165, null)
      .setSize(120, 16).setVisible(false);
    drawContactShadow(this, 120, GAME_H - 92, 110, 18, 0.18, 2);
    
    const dresserG = this.add.graphics().setDepth(3);
    dresserG.fillGradientStyle(PALETTE.cardboardLight, PALETTE.cardboardLight, PALETTE.cardboardMid, PALETTE.cardboardDark, 1, 1, 1, 1);
    dresserG.fillRoundedRect(60, GAME_H - 175, 120, 80, 6);
    dresserG.lineStyle(2, PALETTE.cardboardEdge, 0.5);
    dresserG.strokeRoundedRect(60, GAME_H - 175, 120, 80, 6);
    // Drawer handles (stitched dots)
    [[90, GAME_H - 158], [150, GAME_H - 158], [90, GAME_H - 118], [150, GAME_H - 118]].forEach(([hx, hy]) => {
      dresserG.fillStyle(PALETTE.cardboardEdge, 0.7);
      dresserG.fillCircle(hx, hy, 3);
    });
    applyDepthTint(dresserG, 116);

    // ═══ Ground ===
    this.ground = this.staticGroup.create(GAME_W / 2, GAME_H - 10, null)
      .setSize(GAME_W, 20).setVisible(false);

    // ═══ Climbable walls ===
    this.climbWalls = this.physics.add.staticGroup();
    this.climbWalls.create(GAME_W / 2 - HW + 9, WALL_CY, null)
      .setSize(8, WALL_H).setVisible(false);
    this.climbWalls.create(GAME_W / 2 + HW - 9, WALL_CY, null)
      .setSize(8, WALL_H).setVisible(false);

    this._cribTopY = TOP_Y;
  }

  setupMobile() {
    // Mobile anchor at ceiling
    this.mobileAnchorX = GAME_W / 2 + 10;
    this.mobileAnchorY = GAME_H - 310;
    this.mobileLength = 90;

    // Rope graphics
    this.ropeGraphics = this.add.graphics().setDepth(5);

    // Mobile toy (plush star with shading) - using Star game object
    this.mobileToy = this.add.star(
      this.mobileAnchorX,
      this.mobileAnchorY + this.mobileLength,
      5, 14, 18,
      0xfff59d, 1
    ).setDepth(6);
    
    // Add stroke for dimension
    this.mobileToyStroke = this.add.star(
      this.mobileAnchorX,
      this.mobileAnchorY + this.mobileLength,
      5, 13, 17,
      0xe6c04e, 0.6
    ).setDepth(5);
    
    applyDepthTint(this.mobileToy, 170);
    applyDepthTint(this.mobileToyStroke, 170);
    
    this.tweens.add({
      targets: [this.mobileToy, this.mobileToyStroke],
      scaleX: 1.08,
      scaleY: 0.92,
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

    this.grabRadius = 56;
    this.playerOnSwing = false;
  }

  setupOnesie() {
    // Onesie on dresser
    drawContactShadow(this, 100, GAME_H - 166, 32, 10, 0.2, 4);
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
    this.playerShadow = drawContactShadow(this, this.player.x, this.player.y + 20, 34, 12, 0.18, 8);

    // Give pendulum reference for swing detection
    this.player.pendulum = this.mobilePendulum;
    this.player.grabZone = true;
  }

  setupExit() {
    const EXIT_X = 104;
    const EXIT_Y = GAME_H - 196;
    this.exitZone = this.add.zone(EXIT_X, EXIT_Y, 180, 120).setOrigin(0.5);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);

    // Rail exit zone
    this.railExitZone = this.add.zone(GAME_W / 2 - 92, this._cribTopY, 90, 24).setOrigin(0.5);
    this.physics.world.enable(this.railExitZone);
    this.railExitZone.body.setAllowGravity(false);

    // Crafted exit sign using styleKit
    drawSign(this, EXIT_X + 4, EXIT_Y - 18, 'Bedroom', 'right', 4);
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
    applyDepthHaze(this, 0.12, 35);
    applyWarmLightVignette(this, {
      warmColor: 0xffdfc2,
      warmAlpha: 0.15,
      vignetteAlpha: 0.12,
    });
  }

  setupHints() {
    // Hint text (crafted look, not debug overlay)
    this.hintText = this.add.text(GAME_W / 2, 24, 'Arrows: move  |  Space: jump  |  Up/Down on wall: climb', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#555555',
      backgroundColor: '#fff8ed90',
      padding: { x: 10, y: 5 },
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
      // Soft glow + sparkles (not harsh rings)
      const glow = this.add.circle(x, y, 18, 0xfff7c2, 0.6).setDepth(20);
      this.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 1.8,
        duration: 200,
        onComplete: () => glow.destroy(),
      });
      
      // Sparkle particles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const sparkle = this.add.circle(x, y, 2, 0xffffff, 0.9).setDepth(21);
        this.tweens.add({
          targets: sparkle,
          x: x + Math.cos(angle) * 22,
          y: y + Math.sin(angle) * 22,
          alpha: 0,
          duration: 300,
          onComplete: () => sparkle.destroy(),
        });
      }
      
      const txt = this.add.text(x, y - 20, 'GRAB!', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff8e1',
        stroke: '#5d4037',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(21);
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
    
    this.mobileToyStroke.setPosition(
      this.mobilePendulum.getBobX(),
      this.mobilePendulum.getBobY()
    );
    this.mobileToyStroke.setAngle(Phaser.Math.RadToDeg(this.mobilePendulum.angle) * 0.5);

    // Draw rope (thicker, crafted string)
    this.ropeGraphics.clear();
    this.ropeGraphics.lineStyle(3, 0x8b6a3e, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.mobileAnchorX, this.mobileAnchorY);
    this.ropeGraphics.lineTo(this.mobilePendulum.getBobX(), this.mobilePendulum.getBobY());
    this.ropeGraphics.strokePath();

    // Hanger arm (horizontal bar + hook)
    this.ropeGraphics.lineStyle(5, 0x7a5a30, 1);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.mobileAnchorX - 26, this.mobileAnchorY);
    this.ropeGraphics.lineTo(this.mobileAnchorX + 26, this.mobileAnchorY);
    this.ropeGraphics.strokePath();
    // Knob/hook
    this.ropeGraphics.fillStyle(0x5d3a1a, 1);
    this.ropeGraphics.fillCircle(this.mobileAnchorX, this.mobileAnchorY, 7);
    this.ropeGraphics.fillStyle(PALETTE.highlight, 0.4);
    this.ropeGraphics.fillCircle(this.mobileAnchorX - 2, this.mobileAnchorY - 2, 3);

    // Soft glow + sparkles (grab cue, only when airborne and close)
    if (this.player.state === STATE.AIR) {
      const bobX = this.mobilePendulum.getBobX();
      const bobY = this.mobilePendulum.getBobY();
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bobX, bobY);
      if (dist < this.grabRadius * 2.2) {
        const alpha = Phaser.Math.Clamp(1 - dist / (this.grabRadius * 2.2), 0, 0.7);
        const pulse = 1 + Math.sin(time * 0.009) * 0.08;
        this.ropeGraphics.lineStyle(2, 0xfff7c2, alpha * 0.6);
        this.ropeGraphics.strokeCircle(bobX, bobY, this.grabRadius * pulse);
        // Inner glow
        this.ropeGraphics.fillStyle(0xfff7c2, alpha * 0.2);
        this.ropeGraphics.fillCircle(bobX, bobY, this.grabRadius * 0.5 * pulse);
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
