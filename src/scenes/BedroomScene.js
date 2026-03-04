import Phaser from 'phaser';
import { GAME_H } from '../gameConfig.js';
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
  addDiegieticSign,
  addWarmLightAndVignette,
  applyDepthHaze,
  ensureCraftedTexture,
} from '../utils/sceneFx.js';

const SCENE_WIDTH = 1100;

export class BedroomScene extends Phaser.Scene {
  constructor() {
    super('BedroomScene');
  }

  create() {
    // Background
    this.add.rectangle(SCENE_WIDTH / 2, GAME_H / 2, SCENE_WIDTH, GAME_H, 0xe8eaf6)
      .setScrollFactor(1);

    // Floor
    this.add.rectangle(SCENE_WIDTH / 2, GAME_H - 10, SCENE_WIDTH, 20, 0xd7b99e);

    // Wallpaper stripes
    for (let i = 0; i < 14; i++) {
      this.add.rectangle(i * 80 + 40, GAME_H / 2 - 40, 40, GAME_H - 60, 0xe3e8f5, 0.3);
    }

    // Room furniture
    this.setupFurniture();
    this.setupMom();
    this.setupExit();
    this.setupPlayer();
    this.setupAtmosphere();
    this.setupHUD();
    this.setupCamera();
    this.setupEvents();

    // Hint bubble
    this.time.delayedCall(500, () => {
      this.hud.showBubble(this.player.x, this.player.y - 60, 'Sneak past mom!', 3000);
    });

    // Input
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      setStamina(this, 2);
      this.scene.restart();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', () => {
      this.hud.toggleDebug(this.player);
    });
    registerPauseHotkey(this);

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) this.time.delayedCall(600, () => this.scene.start('KitchenScene'));
  }

  setupFurniture() {
    addContactShadow(this, 160, GAME_H - 48, 180, 24, 0.12, 2);
    // Bed (right side, where baby entered from)
    this.add.rectangle(160, GAME_H - 80, 200, 60, 0x90caf9);
    this.add.rectangle(160, GAME_H - 105, 200, 10, 0x5c8baa);  // headboard top
    // Pillow
    this.add.ellipse(110, GAME_H - 88, 70, 30, 0xffffff);
    this.add.ellipse(210, GAME_H - 88, 70, 30, 0xffffff);

    // Wardrobe left
    addContactShadow(this, 30, GAME_H - 30, 56, 20, 0.16, 2);
    this.add.rectangle(30, GAME_H - 120, 50, 180, 0x8d6e63);
    this.add.line(30, GAME_H - 30, 30, GAME_H - 210, 30, GAME_H - 30, 0xffffff, 0.3);

    // Piano setup (mom sits here)
    this.pianoX = 700;
    addContactShadow(this, this.pianoX, GAME_H - 50, 130, 24, 0.16, 2);
    applyDepthHaze(this.add.image(this.pianoX, GAME_H - 90, 'piano').setDisplaySize(140, 80), 120);
    const pianoTex = ensureCraftedTexture(this, 'hero_piano_polish', {
      w: 140,
      h: 80,
      c1: 0x5d5045,
      c2: 0x3d322b,
      c3: 0x201914,
      outline: 0xd9c9b5,
      radius: 8,
      noiseDots: 210,
    });
    addCraftedOverlay(this, pianoTex, this.pianoX, GAME_H - 90, 140, 80, 7, 0.26);

    // Window
    addContactShadow(this, 950, GAME_H - 142, 66, 16, 0.1, 2);
    applyDepthHaze(this.add.image(950, GAME_H - 200, 'window').setDisplaySize(80, 120), 175);

    // Rug
    this.add.ellipse(SCENE_WIDTH / 2, GAME_H - 22, 500, 30, 0xce93d8, 0.7);
  }

  setupMom() {
    // Mom seated at piano
    this.momX = this.pianoX - 45;
    this.momY = GAME_H - 95;
    addContactShadow(this, this.momX, GAME_H - 53, 42, 14, 0.18, 4);
    this.mom = applyDepthHaze(
      this.add.image(this.momX, this.momY, 'mom').setDisplaySize(50, 70).setDepth(6),
      110
    );
  }

  setupAtmosphere() {
    addDepthHazeOverlay(this, 0.1, 35);
    addWarmLightAndVignette(this, {
      warmColor: 0xffdfbf,
      warmAlpha: 0.14,
      vignetteAlpha: 0.11,
    });
  }

  setupExit() {
    this.exitX = SCENE_WIDTH - 20;
    this.exitY = GAME_H - 50;
    addDiegieticSign(this, SCENE_WIDTH - 52, GAME_H - 80, 'Kitchen →');
  }

  setupPlayer() {
    const colliders = [
      {
        kind: 'exit',
        x: this.exitX,
        z: 108,
        w: 44,
        d: 70,
        minWy: -999,
        maxWy: 90,
        onTouch: () => this.exitScene(),
      },
    ];
    if (!isTestMode) {
      colliders.push({
        kind: 'hazard',
        x: this.momX,
        z: 100,
        w: 78,
        d: 46,
        minWy: -999,
        maxWy: 70,
        onTouch: () => this.momCaught(),
      });
    }

    this.player = new PlayerDepth(this, {
      start: { wx: 100, wz: 112, wy: 0 },
      walkBounds: { minX: 28, maxX: SCENE_WIDTH - 28, minZ: 52, maxZ: 168 },
      groundHeight: () => 0,
      colliders,
    });
  }

  setupHUD() {
    this.hud = new HUD(this);
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, GAME_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
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
  }

  momCaught() {
    if (this.caught) return;
    this.caught = true;
    sfx.bonk();

    // Pickup animation
    this.hud.showBubble(this.momX, this.momY - 80, 'Back to bed, little one!', 0);
    this.cameras.main.shake(200, 0.01);

    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        sfx.whoosh();
        setStamina(this, 2);
        this.time.delayedCall(200, () => {
          this.scene.start('CribScene');
        });
      }
    });
  }

  exitScene() {
    if (this.exiting) return;
    this.exiting = true;
    sfx.whoosh();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.scene.start('KitchenScene');
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this.player.update(time, delta);
    this.hud.update(this.player);
  }
}
