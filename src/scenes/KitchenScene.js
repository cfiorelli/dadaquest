import Phaser from 'phaser';
import { GAME_H } from '../gameConfig.js';
import { PlayerDepth } from '../entities/PlayerDepth.js';
import { HUD } from '../ui/HUD.js';
import { STATE } from '../utils/state.js';
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

const SCENE_WIDTH = 1200;

export class KitchenScene extends Phaser.Scene {
  constructor() {
    super('KitchenScene');
  }

  create() {
    // Background
    this.add.rectangle(SCENE_WIDTH / 2, GAME_H / 2, SCENE_WIDTH, GAME_H, 0xf5f5dc);

    // Tile floor
    for (let x = 0; x < SCENE_WIDTH; x += 40) {
      for (let y = GAME_H - 60; y < GAME_H; y += 40) {
        this.add.rectangle(x + 20, y + 20, 38, 38, x / 40 % 2 === y / 40 % 2 ? 0xf0f0f0 : 0xe0e0e0)
          .setStrokeStyle(1, 0xcccccc);
      }
    }

    // Countertops
    addContactShadow(this, 300, GAME_H - 50, 340, 20, 0.14, 2);
    this.add.rectangle(300, GAME_H - 100, 400, 20, 0xd4a96a);
    this.add.rectangle(300, GAME_H - 120, 400, 120, 0xbcaaa4);
    addContactShadow(this, 900, GAME_H - 50, 340, 20, 0.14, 2);
    this.add.rectangle(900, GAME_H - 100, 400, 20, 0xd4a96a);
    this.add.rectangle(900, GAME_H - 120, 400, 120, 0xbcaaa4);

    // Fridge
    addContactShadow(this, 1080, GAME_H - 30, 62, 16, 0.14, 2);
    this.add.rectangle(1080, GAME_H - 130, 60, 200, 0xeeeeee);
    this.add.rectangle(1080, GAME_H - 200, 58, 80, 0xe0e0e0);
    this.add.circle(1070, GAME_H - 160, 4, 0xaaaaaa);

    // Stove
    addContactShadow(this, 220, GAME_H - 42, 94, 18, 0.16, 2);
    this.add.rectangle(220, GAME_H - 105, 100, 20, 0x424242);
    for (let b = 0; b < 4; b++) {
      this.add.circle(180 + (b % 2) * 60, GAME_H - 120 + Math.floor(b / 2) * 12, 10, 0x555555);
    }

    this.setupHazards();
    this.setupExit();
    this.setupPlayer();
    this.setupAtmosphere();
    this.setupHUD();
    this.setupCamera();
    this.setupEvents();

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      setStamina(this, 2);
      this.scene.restart();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', () => {
      this.hud.toggleDebug(this.player);
    });
    registerPauseHotkey(this);

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) this.time.delayedCall(600, () => this.scene.start('StairsScene'));
  }

  setupHazards() {
    // Sourdough jar (visual obstacle, not blocking)
    addContactShadow(this, 600, GAME_H - 50, 32, 10, 0.18, 2);
    const jar = applyDepthHaze(this.add.image(600, GAME_H - 80, 'sourdough').setDisplaySize(36, 44), 118);
    const glazeTex = ensureCraftedTexture(this, 'hero_jar_glaze', {
      w: 42,
      h: 50,
      c1: 0xf7e5c7,
      c2: 0xd7bb8f,
      c3: 0xaa8f69,
      outline: 0x4f3d2e,
      radius: 9,
      noiseDots: 70,
    });
    addCraftedOverlay(this, glazeTex, 600, GAME_H - 80, 34, 44, 4, 0.24);

    // Puddle (slippery zone)
    this.puddleX = 580;
    this.puddleY = GAME_H - 37;
    this.puddle = applyDepthHaze(
      this.add.image(this.puddleX, this.puddleY, 'puddle').setDisplaySize(130, 28).setDepth(2),
      118
    );

      // Puddle highlight (juice sheen)
      const puddleHighlight = this.add.ellipse(this.puddleX - 20, this.puddleY - 6, 40, 12, 0xffd97d, 0.35);
      puddleHighlight.setDepth(3);
    
      // Second puddle
      this.puddle2 = applyDepthHaze(
        this.add.image(820, GAME_H - 37, 'puddle').setDisplaySize(100, 24).setDepth(2),
        124
      );
      // Puddle 2 highlight
      this.add.ellipse(800, GAME_H - 42, 35, 10, 0xffd97d, 0.3).setDepth(3);

      // Wood cabinet detail (cabinet face with handles)
      addContactShadow(this, 240, GAME_H - 90, 60, 16, 0.12, 2);
      const cabinetTex = ensureCraftedTexture(this, 'kitchen_cabinet', {
        w: 56,
        h: 90,
        c1: 0xc19a6b,
        c2: 0x9d7e4f,
        c3: 0x6b5a3d,
        outline: 0x4a3f2e,
        radius: 6,
        noiseDots: 45,
      });
      const cabinetG = this.add.graphics();
      cabinetG.fillStyle(0xc19a6b, 1);
      cabinetG.fillRect(212, GAME_H - 160, 56, 90);
      addCraftedOverlay(this, cabinetTex, 240, GAME_H - 115, 56, 90, 3, 0.18);
      // Cabinet handles
      this.add.circle(232, GAME_H - 120, 2, 0x8b6f47).setDepth(4);
      this.add.circle(248, GAME_H - 120, 2, 0x8b6f47).setDepth(4);
    // "Slippery" label — italic serif, softer than monospace
    this.add.text(this.puddleX, GAME_H - 55, '~ slippery ~', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
      fontSize: '10px',
      color: '#64b5f6',
    }).setOrigin(0.5).setDepth(3);
    this.add.text(820, GAME_H - 55, '~ slippery ~', {
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
      fontSize: '10px',
      color: '#64b5f6',
    }).setOrigin(0.5).setDepth(3);
  }

  setupExit() {
    this.exitX = SCENE_WIDTH - 20;
    addDiegieticSign(this, SCENE_WIDTH - 52, GAME_H - 80, 'Stairs →');
  }

  setupPlayer() {
    const colliders = [
      {
        kind: 'exit',
        x: this.exitX,
        z: 112,
        w: 44,
        d: 72,
        minWy: -999,
        maxWy: 90,
        onTouch: () => this.exitScene(),
      },
    ];
    if (!isTestMode) {
      colliders.push(
        {
          kind: 'hazard',
          x: this.puddleX,
          z: 118,
          w: 132,
          d: 34,
          minWy: -999,
          maxWy: 70,
          onTouch: p => this.slip(p),
        },
        {
          kind: 'hazard',
          x: 820,
          z: 124,
          w: 102,
          d: 30,
          minWy: -999,
          maxWy: 70,
          onTouch: p => this.slip(p),
        }
      );
    }

    this.player = new PlayerDepth(this, {
      start: { wx: 60, wz: 112, wy: 0 },
      walkBounds: { minX: 28, maxX: SCENE_WIDTH - 28, minZ: 52, maxZ: 170 },
      groundHeight: () => 0,
      colliders,
    });
    this.startWX = 60;
    this.startWZ = 112;
  }

  setupHUD() {
    this.hud = new HUD(this);
  }

  setupAtmosphere() {
    addDepthHazeOverlay(this, 0.09, 35);
    addWarmLightAndVignette(this, {
      warmColor: 0xffd6ad,
      warmAlpha: 0.12,
      vignetteAlpha: 0.1,
    });
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, SCENE_WIDTH, GAME_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
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

  slip(player) {
    if (this.slipping || player.state === STATE.NAP) return;
    this.slipping = true;

    sfx.bonk();
    this.cameras.main.shake(200, 0.015);
    this.hud.showFloatingText(player.x, player.y - 50, 'SLIP!', '#4fc3f7');

    // Send baby sliding
    player.vx = player.sprite.flipX ? 200 : -200;
    player.vy = 130;
    player.setState(STATE.AIR);

    this.time.delayedCall(1200, () => {
      // Reset to start of kitchen
      sfx.whoosh();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(350, () => {
        this.cameras.main.fadeIn(300);
        player.setWorldPosition(this.startWX, this.startWZ, 0);
        player.setState(STATE.CRAWL);
        player.resetCheckpointTimer();
        this.slipping = false;
      });
    });
  }

  exitScene() {
    if (this.exiting) return;
    this.exiting = true;
    sfx.whoosh();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.scene.start('StairsScene');
    });
  }

  update(time, delta) {
    if (!this.player) return;
    this.player.update(time, delta);
    this.hud.update(this.player);
  }
}
