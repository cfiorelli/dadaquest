import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../gameConfig.js';
import { PlayerBaby } from '../entities/PlayerBaby.js';
import { HUD } from '../ui/HUD.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';

const SCENE_WIDTH = 1100;

export class BedroomScene extends Phaser.Scene {
  constructor() {
    super('BedroomScene');
  }

  create() {
    this.physics.world.gravity.y = 500;
    this.physics.world.setBounds(0, 0, SCENE_WIDTH, GAME_H);

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
    this.setupPlatforms();
    this.setupMom();
    this.setupPlayer();
    this.setupExit();
    this.setupCollisions();
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

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) setTimeout(() => this.scene.start('KitchenScene'), 600);
  }

  setupFurniture() {
    // Bed (right side, where baby entered from)
    this.add.rectangle(160, GAME_H - 80, 200, 60, 0x90caf9);
    this.add.rectangle(160, GAME_H - 105, 200, 10, 0x5c8baa);  // headboard top
    // Pillow
    this.add.ellipse(110, GAME_H - 88, 70, 30, 0xffffff);
    this.add.ellipse(210, GAME_H - 88, 70, 30, 0xffffff);

    // Wardrobe left
    this.add.rectangle(30, GAME_H - 120, 50, 180, 0x8d6e63);
    this.add.line(30, GAME_H - 30, 30, GAME_H - 210, 30, GAME_H - 30, 0xffffff, 0.3);

    // Piano setup (mom sits here)
    this.pianoX = 700;
    this.add.image(this.pianoX, GAME_H - 90, 'piano').setDisplaySize(140, 80);

    // Window
    this.add.image(950, GAME_H - 200, 'window').setDisplaySize(80, 120);

    // Rug
    this.add.ellipse(SCENE_WIDTH / 2, GAME_H - 22, 500, 30, 0xce93d8, 0.7);
  }

  setupPlatforms() {
    this.staticGroup = this.physics.add.staticGroup();

    // Main floor
    this.staticGroup.create(SCENE_WIDTH / 2, GAME_H - 10, null)
      .setSize(SCENE_WIDTH, 20).setVisible(false);

    // Bed top (slightly raised)
    this.staticGroup.create(160, GAME_H - 78, null)
      .setSize(200, 12).setVisible(false);

    // Chair for mom
    this.chair = this.staticGroup.create(this.pianoX - 60, GAME_H - 42, null)
      .setSize(50, 16).setVisible(false);

    this.climbWalls = this.physics.add.staticGroup();
  }

  setupMom() {
    // Mom seated at piano
    this.mom = this.physics.add.staticSprite(this.pianoX - 45, GAME_H - 95, 'mom')
      .setDisplaySize(50, 70);

    // Mom hitbox (slightly smaller than visual)
    this.mom.body.setSize(40, 60);
    this.mom.body.setOffset(5, 5);

    // Warning zone (wider than mom for "close" detection)
    this.momWarningZone = this.add.zone(this.pianoX - 45, GAME_H - 95, 80, 80).setOrigin(0.5);
    this.physics.world.enable(this.momWarningZone);
    this.momWarningZone.body.setAllowGravity(false);
  }

  setupPlayer() {
    this.player = new PlayerBaby(this, 100, GAME_H - 120);
    this.player.setClimbWalls(this.climbWalls);
  }

  setupExit() {
    // Exit on right side
    this.exitZone = this.add.zone(SCENE_WIDTH - 20, GAME_H - 50, 40, 80).setOrigin(0.5);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);

    const arrow = this.add.text(SCENE_WIDTH - 30, GAME_H - 60, '→\nKITCHEN', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00ff00',
      align: 'center',
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({ targets: arrow, x: SCENE_WIDTH - 24, duration: 500, yoyo: true, repeat: -1 });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.staticGroup);

    // Mom collision -> reset to Scene 1 (disabled in test mode for determinism)
    if (!isTestMode) {
      this.physics.add.overlap(this.player, this.mom, this.momCaught, null, this);
    }

    // Exit
    this.physics.add.overlap(this.player, this.exitZone, this.exitScene, null, this);
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

  momCaught(player, mom) {
    if (this.caught) return;
    this.caught = true;
    sfx.bonk();

    // Pickup animation
    this.hud.showBubble(mom.x, mom.y - 80, 'Back to bed, little one!', 0);
    this.cameras.main.shake(200, 0.01);

    this.tweens.add({
      targets: player,
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

    // Out of bounds
    if (this.player.y > GAME_H + 50) {
      this.player.setPosition(100, GAME_H - 120);
      this.player.body.setVelocity(0, 0);
      this.player.setState(STATE.CRAWL);
    }
  }
}
