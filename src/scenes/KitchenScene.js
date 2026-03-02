import Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from '../gameConfig.js';
import { PlayerBaby } from '../entities/PlayerBaby.js';
import { HUD } from '../ui/HUD.js';
import { STATE } from '../utils/state.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina } from '../utils/state.js';
import { isTestMode } from '../utils/testMode.js';

const SCENE_WIDTH = 1200;

export class KitchenScene extends Phaser.Scene {
  constructor() {
    super('KitchenScene');
  }

  create() {
    this.physics.world.gravity.y = 500;
    this.physics.world.setBounds(0, 0, SCENE_WIDTH, GAME_H);

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
    this.add.rectangle(300, GAME_H - 100, 400, 20, 0xd4a96a);
    this.add.rectangle(300, GAME_H - 120, 400, 120, 0xbcaaa4);
    this.add.rectangle(900, GAME_H - 100, 400, 20, 0xd4a96a);
    this.add.rectangle(900, GAME_H - 120, 400, 120, 0xbcaaa4);

    // Fridge
    this.add.rectangle(1080, GAME_H - 130, 60, 200, 0xeeeeee);
    this.add.rectangle(1080, GAME_H - 200, 58, 80, 0xe0e0e0);
    this.add.circle(1070, GAME_H - 160, 4, 0xaaaaaa);

    // Stove
    this.add.rectangle(220, GAME_H - 105, 100, 20, 0x424242);
    for (let b = 0; b < 4; b++) {
      this.add.circle(180 + (b % 2) * 60, GAME_H - 120 + Math.floor(b / 2) * 12, 10, 0x555555);
    }

    this.setupPlatforms();
    this.setupHazards();
    this.setupPlayer();
    this.setupExit();
    this.setupCollisions();
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

    window.__DADA_DEBUG__.sceneKey = this.scene.key;
    if (isTestMode) setTimeout(() => this.scene.start('StairsScene'), 600);
  }

  setupPlatforms() {
    this.staticGroup = this.physics.add.staticGroup();

    // Floor
    this.staticGroup.create(SCENE_WIDTH / 2, GAME_H - 10, null)
      .setSize(SCENE_WIDTH, 20).setVisible(false);

    // Climbable walls
    this.climbWalls = this.physics.add.staticGroup();
  }

  setupHazards() {
    // Sourdough jar (visual obstacle, not blocking)
    const jar = this.add.image(600, GAME_H - 80, 'sourdough').setDisplaySize(36, 44);

    // Puddle (slippery zone)
    this.puddleX = 580;
    this.puddleY = GAME_H - 37;
    this.puddle = this.add.image(this.puddleX, this.puddleY, 'puddle').setDisplaySize(130, 28).setDepth(2);

    // Spill zone collider (wide but thin)
    this.spillZone = this.add.zone(this.puddleX, this.puddleY, 130, 20).setOrigin(0.5);
    this.physics.world.enable(this.spillZone);
    this.spillZone.body.setAllowGravity(false);

    // Second puddle
    this.puddle2 = this.add.image(820, GAME_H - 37, 'puddle').setDisplaySize(100, 24).setDepth(2);
    this.spillZone2 = this.add.zone(820, GAME_H - 37, 100, 20).setOrigin(0.5);
    this.physics.world.enable(this.spillZone2);
    this.spillZone2.body.setAllowGravity(false);

    // "Slippery" label
    this.add.text(this.puddleX, GAME_H - 55, '~slippery~', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#4fc3f7',
    }).setOrigin(0.5).setDepth(3);
    this.add.text(820, GAME_H - 55, '~slippery~', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#4fc3f7',
    }).setOrigin(0.5).setDepth(3);
  }

  setupPlayer() {
    this.player = new PlayerBaby(this, 60, GAME_H - 60);
    this.player.setClimbWalls(this.climbWalls);
    this.startX = 60;
    this.startY = GAME_H - 60;
  }

  setupExit() {
    this.exitZone = this.add.zone(SCENE_WIDTH - 20, GAME_H - 50, 40, 80).setOrigin(0.5);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);

    const arrow = this.add.text(SCENE_WIDTH - 30, GAME_H - 65, '→\nSTAIRS', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00ff00',
      align: 'center',
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: arrow, x: SCENE_WIDTH - 24, duration: 500, yoyo: true, repeat: -1 });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.staticGroup);

    // Puddle slips disabled in test mode for determinism
    if (!isTestMode) {
      this.physics.add.overlap(this.player, this.spillZone, () => this.slip(this.player), null, this);
      this.physics.add.overlap(this.player, this.spillZone2, () => this.slip(this.player), null, this);
    }

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
    player.body.setVelocityX(player.flipX ? 200 : -200);
    player.body.setVelocityY(-100);
    player.setState(STATE.AIR);

    this.time.delayedCall(1200, () => {
      // Reset to start of kitchen
      sfx.whoosh();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(350, () => {
        this.cameras.main.fadeIn(300);
        player.setPosition(this.startX, this.startY);
        player.body.setVelocity(0, 0);
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

    if (this.player.y > GAME_H + 50) {
      this.player.setPosition(this.startX, this.startY);
      this.player.body.setVelocity(0, 0);
      this.player.setState(STATE.CRAWL);
    }
  }
}
