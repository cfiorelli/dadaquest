import Phaser from 'phaser';
import { COLORS } from '../gameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.generateTextures();
    this.scene.start('TitleScene');
  }

  generateTextures() {
    this.makeBaby();
    this.makeMom();
    this.makeDog();
    this.makeDada();
    this.makeCribWall();
    this.makeDresser();
    this.makeMobile();
    this.makeOnesie();
    this.makePiano();
    this.makeSourdough();
    this.makePuddle();
    this.makeRockingHorse();
    this.makeWindow();
    this.makePlant();
    this.makeGround();
    this.makeStairStep();
    this.makePlatform();
    this.makeWall();
    this.makeParticle();
    this.makeStar();
  }

  drawOutline(g, x, y, w, h, fill, stroke = 0x000000, thickness = 2) {
    g.fillStyle(fill);
    g.fillRect(x, y, w, h);
    g.lineStyle(thickness, stroke, 1);
    g.strokeRect(x, y, w, h);
  }

  starPoints(cx, cy, points, outer, inner) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    return pts;
  }

  fillStar(g, cx, cy, points, outer, inner) {
    g.fillPoints(this.starPoints(cx, cy, points, outer, inner), true);
  }

  strokeStar(g, cx, cy, points, outer, inner) {
    g.strokePoints(this.starPoints(cx, cy, points, outer, inner), true);
  }

  fillTrapezoid(g, cx, y, topW, botW, h) {
    const pts = [
      new Phaser.Math.Vector2(cx - topW / 2, y - h),
      new Phaser.Math.Vector2(cx + topW / 2, y - h),
      new Phaser.Math.Vector2(cx + botW / 2, y),
      new Phaser.Math.Vector2(cx - botW / 2, y),
    ];
    g.fillPoints(pts, true);
  }

  makeBaby() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Body (chubby blob)
    g.fillStyle(COLORS.BABY_BODY);
    g.fillEllipse(20, 28, 30, 24);
    // Head
    g.fillStyle(COLORS.BABY_BODY);
    g.fillCircle(20, 14, 13);
    // Outfit
    g.fillStyle(COLORS.BABY_OUTFIT);
    g.fillRoundedRect(9, 24, 22, 14, 4);
    // Eyes
    g.fillStyle(0x333333);
    g.fillCircle(15, 13, 2.5);
    g.fillCircle(25, 13, 2.5);
    // Eye shine
    g.fillStyle(0xffffff);
    g.fillCircle(16, 12, 1);
    g.fillCircle(26, 12, 1);
    // Smile
    g.lineStyle(2, 0x884422);
    g.beginPath();
    g.arc(20, 16, 5, 0.2, Math.PI - 0.2);
    g.strokePath();
    // Ears
    g.fillStyle(COLORS.BABY_BODY);
    g.fillCircle(7, 14, 4);
    g.fillCircle(33, 14, 4);
    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(20, 14, 13);
    g.strokeEllipse(20, 28, 30, 24);

    g.generateTexture('baby', 40, 50);
    g.destroy();
  }

  makeMom() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Chair seat
    g.fillStyle(0x795548);
    g.fillRect(0, 55, 50, 10);
    g.fillRect(45, 30, 8, 35);
    // Body (seated)
    g.fillStyle(COLORS.MOM_BODY);
    g.fillRect(8, 25, 30, 35);
    // Head
    g.fillCircle(23, 18, 14);
    // Hair
    g.fillStyle(COLORS.MOM_HAIR);
    g.fillRect(9, 8, 28, 12);
    g.fillCircle(23, 10, 10);
    // Dress
    g.fillStyle(0xe91e63);
    g.fillRect(6, 38, 34, 22);
    // Headphones band
    g.lineStyle(5, 0x333333, 1);
    g.beginPath();
    g.arc(23, 14, 12, Math.PI, 2 * Math.PI);
    g.strokePath();
    // Headphone cups
    g.fillStyle(0x222222);
    g.fillCircle(11, 14, 5);
    g.fillCircle(35, 14, 5);
    // Eyes (closed, focused)
    g.fillStyle(0x333333);
    g.fillRect(15, 17, 6, 2);
    g.fillRect(24, 17, 6, 2);
    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(23, 18, 14);
    g.strokeRect(6, 38, 34, 22);

    g.generateTexture('mom', 54, 70);
    g.destroy();
  }

  makeDog() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Body (curled up, sleeping)
    g.fillStyle(COLORS.DOG_BODY);
    g.fillEllipse(28, 26, 46, 28);
    // Head
    g.fillCircle(12, 20, 12);
    // Snout
    g.fillStyle(0xd4a96a);
    g.fillEllipse(6, 23, 12, 8);
    // Nose
    g.fillStyle(0x333333);
    g.fillCircle(5, 21, 3);
    // Eye (closed)
    g.lineStyle(2, 0x333333, 1);
    g.beginPath();
    g.moveTo(7, 18);
    g.lineTo(14, 17);
    g.strokePath();
    // Ear
    g.fillStyle(0xb8860b);
    g.fillEllipse(20, 10, 10, 14);
    // Tail curled
    g.lineStyle(6, COLORS.DOG_BODY);
    g.beginPath();
    g.arc(44, 20, 10, 0, Math.PI * 1.5);
    g.strokePath();
    // Outline
    g.lineStyle(2, 0x000000, 0.8);
    g.strokeEllipse(28, 26, 46, 28);
    g.strokeCircle(12, 20, 12);

    g.generateTexture('dog', 58, 40);
    g.destroy();
  }

  makeDada() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Body
    g.fillStyle(COLORS.DADDA);
    g.fillRect(10, 24, 30, 38);
    // Head
    g.fillStyle(0xffe0b2);
    g.fillCircle(25, 16, 14);
    // Hair
    g.fillStyle(0x5d4037);
    g.fillRect(11, 6, 28, 9);
    g.fillCircle(25, 8, 10);
    // Eyes
    g.fillStyle(0x333333);
    g.fillCircle(19, 15, 2.5);
    g.fillCircle(31, 15, 2.5);
    // Smile (big happy)
    g.lineStyle(2.5, 0x884422);
    g.beginPath();
    g.arc(25, 18, 7, 0.1, Math.PI - 0.1);
    g.strokePath();
    // Pants
    g.fillStyle(0x37474f);
    g.fillRect(10, 48, 14, 16);
    g.fillRect(26, 48, 14, 16);
    // Outline
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(25, 16, 14);
    g.strokeRect(10, 24, 30, 38);

    g.generateTexture('dada', 50, 68);
    g.destroy();
  }

  makeCribWall() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Vertical slats
    g.fillStyle(COLORS.CRIB_WOOD);
    for (let i = 0; i < 4; i++) {
      g.fillRect(i * 18, 0, 12, 120);
    }
    g.fillRect(0, 0, 72, 16);
    g.fillRect(0, 112, 72, 8);
    g.lineStyle(2, 0xaa7733, 1);
    for (let i = 0; i < 4; i++) {
      g.strokeRect(i * 18, 0, 12, 120);
    }
    g.strokeRect(0, 0, 72, 16);

    g.generateTexture('crib_wall', 72, 120);
    g.destroy();
  }

  makeDresser() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(COLORS.DRESSER);
    g.fillRect(0, 0, 100, 80);
    // Drawers
    g.fillStyle(0xa1887f);
    g.fillRoundedRect(6, 8, 88, 20, 3);
    g.fillRoundedRect(6, 34, 88, 20, 3);
    g.fillRoundedRect(6, 60, 88, 14, 3);
    // Knobs
    g.fillStyle(0xffd54f);
    g.fillCircle(50, 18, 4);
    g.fillCircle(50, 44, 4);
    g.fillCircle(50, 67, 4);
    // Outline
    g.lineStyle(2, 0x5d4037, 1);
    g.strokeRect(0, 0, 100, 80);
    g.strokeRoundedRect(6, 8, 88, 20, 3);
    g.strokeRoundedRect(6, 34, 88, 20, 3);
    g.strokeRoundedRect(6, 60, 88, 14, 3);

    g.generateTexture('dresser', 100, 80);
    g.destroy();
  }

  makeMobile() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Toy: star-ish shape
    g.fillStyle(0xff6b6b);
    this.fillStar(g, 20, 20, 5, 18, 10);
    g.fillStyle(0xffd93d);
    g.fillCircle(20, 20, 7);
    g.lineStyle(2, 0xaa3333, 1);
    this.strokeStar(g, 20, 20, 5, 18, 10);

    g.generateTexture('mobile_toy', 40, 40);
    g.destroy();
  }

  makeOnesie() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Onesie body shape
    g.fillStyle(COLORS.ONESIE);
    g.fillRoundedRect(4, 10, 42, 36, 6);
    // Shoulders
    g.fillRoundedRect(0, 4, 16, 16, 4);
    g.fillRoundedRect(34, 4, 16, 16, 4);
    // Neck
    g.fillStyle(0xffffff);
    g.fillRoundedRect(14, 0, 22, 14, 4);
    // Burger graphic
    g.fillStyle(0x8b4513);
    g.fillEllipse(25, 26, 22, 8);
    g.fillStyle(0x90ee90);
    g.fillEllipse(25, 23, 20, 5);
    g.fillStyle(0xff6347);
    g.fillEllipse(25, 28, 18, 5);
    g.fillStyle(0xffd700);
    g.fillEllipse(25, 20, 22, 10);
    // Outline
    g.lineStyle(2, 0x1565c0, 1);
    g.strokeRoundedRect(4, 10, 42, 36, 6);

    g.generateTexture('onesie', 50, 50);
    g.destroy();
  }

  makePiano() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Piano body
    g.fillStyle(0x212121);
    g.fillRect(0, 10, 120, 70);
    // Keys
    g.fillStyle(0xffffff);
    for (let i = 0; i < 7; i++) {
      g.fillRect(4 + i * 16, 40, 14, 36);
      g.lineStyle(1, 0x888888, 1);
      g.strokeRect(4 + i * 16, 40, 14, 36);
    }
    // Black keys
    g.fillStyle(0x111111);
    const bkPositions = [1, 2, 4, 5, 6];
    for (const b of bkPositions) {
      if (b < 7) g.fillRect(4 + b * 16 - 4, 40, 10, 22);
    }
    // Lid
    g.fillStyle(0x333333);
    g.fillRect(0, 0, 120, 12);
    // Music stand
    g.fillStyle(0x222222);
    g.fillRect(30, 12, 60, 6);
    // Outline
    g.lineStyle(2, 0x555555, 1);
    g.strokeRect(0, 0, 120, 80);

    g.generateTexture('piano', 120, 80);
    g.destroy();
  }

  makeSourdough() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Jar
    g.fillStyle(COLORS.SOURDOUGH);
    g.fillRoundedRect(8, 14, 28, 32, 4);
    // Jar lid
    g.fillStyle(0x888888);
    g.fillRoundedRect(5, 8, 34, 10, 4);
    // Bubbles
    g.fillStyle(0xf5deb3);
    g.fillCircle(22, 22, 8);
    // Content bubbles
    g.fillStyle(0xdeb887);
    g.fillCircle(16, 28, 4);
    g.fillCircle(26, 32, 3);
    // Label
    g.fillStyle(0xffffff);
    g.fillRect(11, 26, 22, 12);
    g.fillStyle(0x333333);
    // Outline
    g.lineStyle(2, 0x8b7355, 1);
    g.strokeRoundedRect(8, 14, 28, 32, 4);
    g.strokeRoundedRect(5, 8, 34, 10, 4);

    g.generateTexture('sourdough', 44, 50);
    g.destroy();
  }

  makePuddle() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(COLORS.PUDDLE, 0.7);
    g.fillEllipse(60, 14, 120, 28);
    g.fillStyle(0xadd8e6, 0.5);
    g.fillEllipse(55, 12, 80, 14);
    g.lineStyle(1, 0x4fc3f7, 0.8);
    g.strokeEllipse(60, 14, 120, 28);

    g.generateTexture('puddle', 120, 28);
    g.destroy();
  }

  makeRockingHorse() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Rockers
    g.lineStyle(8, 0xd32f2f, 1);
    g.beginPath();
    g.arc(40, 70, 35, Math.PI * 0.6, Math.PI * 1.4);
    g.strokePath();
    // Body
    g.fillStyle(COLORS.ROCKING_HORSE);
    g.fillEllipse(40, 36, 60, 36);
    // Head
    g.fillStyle(COLORS.ROCKING_HORSE);
    g.fillEllipse(68, 22, 28, 22);
    // Mane
    g.fillStyle(0xc62828);
    for (let i = 0; i < 4; i++) {
      g.fillCircle(58 + i * 4, 12 + i * 2, 4);
    }
    // Eye
    g.fillStyle(0x333333);
    g.fillCircle(74, 20, 3);
    g.fillStyle(0xffffff);
    g.fillCircle(75, 19, 1);
    // Stick legs
    g.lineStyle(6, 0xd32f2f, 1);
    g.beginPath(); g.moveTo(22, 50); g.lineTo(18, 68); g.strokePath();
    g.beginPath(); g.moveTo(58, 50); g.lineTo(62, 68); g.strokePath();
    // Saddle
    g.fillStyle(0xc62828);
    g.fillEllipse(36, 28, 32, 12);
    // Outline
    g.lineStyle(2, 0xb71c1c, 1);
    g.strokeEllipse(40, 36, 60, 36);
    g.strokeEllipse(68, 22, 28, 22);

    g.generateTexture('rocking_horse', 90, 80);
    g.destroy();
  }

  makeWindow() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Frame
    g.fillStyle(0xd4a96a);
    g.fillRect(0, 0, 70, 90);
    // Glass
    g.fillStyle(COLORS.WINDOW, 0.8);
    g.fillRect(6, 8, 58, 76);
    // Panes
    g.lineStyle(4, 0xd4a96a, 1);
    g.beginPath(); g.moveTo(35, 8); g.lineTo(35, 84); g.strokePath();
    g.beginPath(); g.moveTo(6, 46); g.lineTo(64, 46); g.strokePath();
    // Sill
    g.fillStyle(0xd4a96a);
    g.fillRect(-4, 86, 78, 10);
    // Outline
    g.lineStyle(2, 0x8b6914, 1);
    g.strokeRect(0, 0, 70, 90);

    g.generateTexture('window', 74, 96);
    g.destroy();
  }

  makePlant() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Pot
    g.fillStyle(0xef6c00);
    this.fillTrapezoid(g, 20, 50, 36, 28, 16);
    // Soil
    g.fillStyle(0x5d4037);
    g.fillEllipse(20, 36, 40, 8);
    // Leaves
    g.fillStyle(COLORS.ROOFTOP_PLANT);
    g.fillEllipse(8, 20, 20, 30);
    g.fillEllipse(20, 12, 16, 26);
    g.fillEllipse(32, 20, 20, 30);
    g.fillStyle(0x388e3c);
    g.fillEllipse(20, 18, 14, 22);
    // Flower
    g.fillStyle(0xffeb3b);
    g.fillCircle(20, 8, 5);
    g.fillStyle(0xff5722);
    g.fillCircle(20, 8, 3);

    g.generateTexture('plant', 40, 56);
    g.destroy();
  }

  makeGround() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(COLORS.GROUND);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x6b4f10);
    g.fillRect(0, 0, 32, 6);
    g.lineStyle(1, 0x5a3e0a, 0.5);
    g.strokeRect(0, 0, 32, 32);

    g.generateTexture('ground', 32, 32);
    g.destroy();
  }

  makeStairStep() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xbcaaa4);
    g.fillRect(0, 0, 80, 24);
    g.fillStyle(0xd7ccc8);
    g.fillRect(0, 0, 80, 6);
    g.lineStyle(2, 0x8d6e63, 1);
    g.strokeRect(0, 0, 80, 24);

    g.generateTexture('stair_step', 80, 24);
    g.destroy();
  }

  makePlatform() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6d4c41);
    g.fillRect(0, 0, 120, 20);
    g.fillStyle(0x795548);
    g.fillRect(0, 0, 120, 6);
    g.lineStyle(2, 0x4e342e, 1);
    g.strokeRect(0, 0, 120, 20);

    g.generateTexture('platform', 120, 20);
    g.destroy();
  }

  makeWall() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xf5f5f5);
    g.fillRect(0, 0, 32, 32);
    // Brick pattern
    g.fillStyle(0xe0e0e0);
    g.fillRect(0, 8, 32, 2);
    g.fillRect(0, 18, 32, 2);
    g.fillRect(0, 28, 32, 2);
    g.fillRect(8, 0, 2, 8);
    g.fillRect(22, 8, 2, 10);
    g.fillRect(8, 18, 2, 10);
    g.fillRect(22, 28, 2, 4);

    g.generateTexture('wall_tile', 32, 32);
    g.destroy();
  }

  makeParticle() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  makeStar() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffeb3b);
    this.fillStar(g, 8, 8, 5, 8, 4);
    g.generateTexture('star_particle', 16, 16);
    g.destroy();
  }
}
