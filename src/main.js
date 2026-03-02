import Phaser from 'phaser';
import { GAME_W, GAME_H } from './gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CribScene } from './scenes/CribScene.js';
import { BedroomScene } from './scenes/BedroomScene.js';
import { KitchenScene } from './scenes/KitchenScene.js';
import { StairsScene } from './scenes/StairsScene.js';
import { RooftopScene } from './scenes/RooftopScene.js';
import { EndScene } from './scenes/EndScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    TitleScene,
    CribScene,
    BedroomScene,
    KitchenScene,
    StairsScene,
    RooftopScene,
    EndScene,
  ],
};

const game = new Phaser.Game(config);
