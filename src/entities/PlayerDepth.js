import Phaser from 'phaser';
import { STATE, getStamina, setStamina } from '../utils/state.js';
import { PLAYER } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import {
  PLAYER_RADIUS_X,
  PLAYER_RADIUS_Z,
  MOVE_SPEED,
  AIR_CONTROL,
  JUMP_VEL,
  GRAVITY,
  MAX_FALL,
  COYOTE_MS,
  JUMP_BUFFER_MS,
  Z_MIN,
  Z_MAX,
  projectWorldToScreen,
  depthScale,
  overlapsFootprint,
  resolveFootprint,
} from '../utils/depth.js';

export class PlayerDepth {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;

    this.wx = config.start.wx;
    this.wz = config.start.wz;
    this.wy = config.start.wy ?? 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;

    this.state = STATE.CRAWL;
    this.prevState = STATE.CRAWL;
    this.isNapping = false;
    this.napTimer = 0;
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;
    this.onGround = true;
    this.jumpBufferMs = 0;
    this.coyoteMs = 0;
    this.lastTransitions = [];

    this.sprite = scene.add.image(0, 0, 'baby').setDepth(10).setScale(1.4);
    this.shadow = scene.add.ellipse(0, 0, 26, 12, 0x000000, 0.22).setDepth(8);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    scene.input.keyboard.once('keydown', () => sfx.init());

    this.syncVisual();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  setState(nextState) {
    if (this.state === nextState) return;
    this.prevState = this.state;
    this.state = nextState;
    this.lastTransitions.push(`${Math.round(this.scene.time.now)}ms: ${this.prevState}->${nextState}`);
    if (this.lastTransitions.length > 6) this.lastTransitions.shift();

    if (nextState === STATE.NAP) {
      this.vx = 0;
      this.vz = 0;
      this.vy = 0;
      this.isNapping = true;
      this.napTimer = 0;
      sfx.nap();
      this.scene.events.emit('nap-start');
    } else {
      this.isNapping = false;
      if (this.prevState === STATE.NAP) {
        this.scene.events.emit('nap-end');
      }
    }
  }

  setWorldPosition(wx, wz, wy = 0) {
    this.wx = wx;
    this.wz = wz;
    this.wy = wy;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.syncVisual();
  }

  resetCheckpointTimer() {
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.checkpointTimer += dt;
    if (this.checkpointTimer > 30 && !this.checkpointNapFired && this.state !== STATE.NAP) {
      this.checkpointNapFired = true;
      this.setState(STATE.NAP);
      this.syncVisual();
      return;
    }

    if (getStamina(this.scene) <= 0 && this.state !== STATE.NAP) {
      this.setState(STATE.NAP);
    }

    if (this.state === STATE.NAP) {
      this.updateNap(dt);
      this.syncVisual();
      return;
    }

    const xDir = (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0);
    const zDir = (this.cursors.up.isDown ? 1 : 0) - (this.cursors.down.isDown ? 1 : 0);
    const move = new Phaser.Math.Vector2(xDir, zDir).normalize();
    const control = this.onGround ? 1 : AIR_CONTROL;
    this.vx = move.x * MOVE_SPEED * control;
    this.vz = move.y * MOVE_SPEED * control;
    if (move.x !== 0) this.sprite.setFlipX(move.x < 0);

    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);
    this.coyoteMs = Math.max(0, this.coyoteMs - delta);
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.jumpBufferMs = JUMP_BUFFER_MS;
    }

    if (this.jumpBufferMs > 0 && (this.onGround || this.coyoteMs > 0)) {
      this.jumpBufferMs = 0;
      this.coyoteMs = 0;
      this.vy = JUMP_VEL;
      this.onGround = false;
      this.setState(STATE.AIR);
    }

    this.wx += this.vx * dt;
    this.wz += this.vz * dt;
    this.applyWalkBounds();
    this.resolveSolids();

    this.vy -= GRAVITY * dt;
    this.vy = Math.max(this.vy, -MAX_FALL);
    this.wy += this.vy * dt;

    const ground = this.getGroundHeight(this.wx, this.wz);
    if (this.wy <= ground) {
      const justLanded = !this.onGround && this.vy < -120;
      this.wy = ground;
      this.vy = 0;
      this.onGround = true;
      this.coyoteMs = COYOTE_MS;
      this.setState(STATE.CRAWL);
      if (justLanded) sfx.bonk();
    } else {
      if (this.onGround) this.coyoteMs = COYOTE_MS;
      this.onGround = false;
      this.setState(STATE.AIR);
    }

    this.checkTriggers();
    this.syncVisual();
  }

  updateNap(dt) {
    this.napTimer += dt;
    if (this.napTimer >= PLAYER.NAP_DURATION / 1000) {
      setStamina(this.scene, 1);
      sfx.wakeUp();
      this.setState(this.onGround ? STATE.CRAWL : STATE.AIR);
    }
  }

  applyWalkBounds() {
    const walk = this.config.walkBounds;
    this.wx = Phaser.Math.Clamp(this.wx, walk.minX, walk.maxX);
    this.wz = Phaser.Math.Clamp(this.wz, walk.minZ, walk.maxZ);
    this.wz = Phaser.Math.Clamp(this.wz, Z_MIN, Z_MAX);
  }

  getGroundHeight(wx, wz) {
    if (!this.config.groundHeight) return 0;
    return this.config.groundHeight(wx, wz) ?? 0;
  }

  isColliderActiveByHeight(c) {
    const minWy = c.minWy ?? -Infinity;
    const maxWy = c.maxWy ?? Infinity;
    return this.wy >= minWy && this.wy <= maxWy;
  }

  resolveSolids() {
    const colliders = this.config.colliders ?? [];
    for (let i = 0; i < 3; i += 1) {
      let moved = false;
      for (const c of colliders) {
        if (c.kind !== 'solid') continue;
        if (!this.isColliderActiveByHeight(c)) continue;
        const out = resolveFootprint(this.wx, this.wz, PLAYER_RADIUS_X, PLAYER_RADIUS_Z, c);
        if (out.hit) {
          this.wx = out.wx;
          this.wz = out.wz;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  checkTriggers() {
    const colliders = this.config.colliders ?? [];
    for (const c of colliders) {
      if (c.kind === 'solid') continue;
      if (!this.isColliderActiveByHeight(c)) continue;
      const hit = overlapsFootprint(this.wx, this.wz, PLAYER_RADIUS_X, PLAYER_RADIUS_Z, c);
      if (!hit) continue;
      if (c.onTouch) c.onTouch(this, c);
    }
  }

  syncVisual() {
    const projected = projectWorldToScreen(this.wx, this.wz, this.wy);
    const groundProjected = projectWorldToScreen(this.wx, this.wz, 0);
    const scale = depthScale(this.wz);

    this.sprite.setPosition(projected.x, projected.y);
    this.sprite.setScale(1.4 * scale);
    this.sprite.setDepth(groundProjected.y + 20);
    this.sprite.setAngle(this.isNapping ? 0 : Phaser.Math.Clamp(this.vx * 0.1, -12, 12));

    const hover = Phaser.Math.Clamp(this.wy / 80, 0, 1);
    this.shadow.setPosition(groundProjected.x, groundProjected.y + 8);
    this.shadow.setScale(1 - hover * 0.3);
    this.shadow.setAlpha(0.24 - hover * 0.12);
    this.shadow.setDepth(groundProjected.y + 1);
  }

  getDebugInfo() {
    return {
      state: this.state,
      stamina: getStamina(this.scene),
      wx: Math.round(this.wx),
      wz: Math.round(this.wz),
      wy: Math.round(this.wy),
      vx: Math.round(this.vx),
      vz: Math.round(this.vz),
      vy: Math.round(this.vy),
      onGround: this.onGround,
      transitions: [...this.lastTransitions],
    };
  }

  destroy() {
    this.shadow.destroy();
    this.sprite.destroy();
  }
}
