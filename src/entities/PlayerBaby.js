import Phaser from 'phaser';
import { STATE } from '../utils/state.js';
import { Pendulum } from '../utils/pendulum.js';
import { PLAYER } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina, drainStamina } from '../utils/state.js';
import {
  COYOTE_MS,
  JUMP_BUFFER_MS,
  JUMP_CUT_FACTOR,
  JUMP_CUT_MIN_SPEED,
} from '../utils/movementTuning.js';

export class PlayerBaby extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'baby');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setDepth(10);
    this.setScale(1.4);

    // Physics body tuning
    this.body.setSize(24, 38);
    this.body.setOffset(8, 12);
    this.body.setMaxVelocityX(PLAYER.SPEED);
    this.body.setMaxVelocityY(500);
    this.body.setGravityY(PLAYER.GRAVITY - scene.physics.world.gravity.y);

    // State machine
    this.state = STATE.CRAWL;
    this.prevState = STATE.CRAWL;

    // Stamina drain accumulators
    this.climbDrainAcc = 0;
    this.swingPumpCount = 0;

    // NAP
    this.napTimer = 0;
    this.isNapping = false;

    // Wall climb
    this.onClimbableWall = false;
    this.wallSide = 0; // -1 left, 1 right
    this.climbWalls = null; // group set by scene

    // Swing
    this.pendulum = null;
    this.swingAnchor = null;
    this.swingActive = false;
    this.grabZone = null; // set by scene

    // Input tracking
    this.jumpPressed = false;
    this.wasOnGround = false;
    this.jumpBufferMs = 0;
    this.coyoteMs = 0;
    this.jumpBufferWindowMs = JUMP_BUFFER_MS;
    this.coyoteWindowMs = COYOTE_MS;
    this.jumpCutApplied = false;

    // Crawl sound timer
    this.crawlSoundTimer = 0;

    // Wobble/tilt
    this.wobbleTween = null;

    // Wall-touch recency buffer (ms) — allows pressing Up/Down a moment after contact
    this.wallTouchBuffer = 0;

    // Checkpoint timer
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;
    this.checkpointNapEnabled = true;
    this.baseScale = 1.4;
    this.lastPumpDir = 0;
    this.swingPumpCounter = 0;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.dKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Listen for first input to init audio
    scene.input.keyboard.once('keydown', () => sfx.init());
  }

  // Called by scene to set climbable walls group
  setClimbWalls(group) {
    this.climbWalls = group;
  }

  // Called by scene to set grab zone for mobile
  setSwingAnchor(anchor, length, initAngle) {
    this.pendulum = new Pendulum(anchor.x, anchor.y, length, initAngle);
    this.swingAnchor = anchor;
  }

  setCheckpointNapEnabled(enabled) {
    this.checkpointNapEnabled = enabled;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.prevState = this.state;
    this.state = newState;
    this.onStateEnter(newState);
  }

  onStateEnter(s) {
    if (s === STATE.NAP) {
      this.body.setVelocity(0, 0);
      this.body.setAllowGravity(true);
      this.isNapping = true;
      this.napTimer = 0;
      sfx.nap();
      this.scene.events.emit('nap-start');
    } else if (s === STATE.WALL_CLIMB) {
      this.body.setAllowGravity(false);
      this.body.setVelocity(0, 0);
    } else if (s === STATE.SWING) {
      this.body.setAllowGravity(false);
      this.body.setVelocity(0, 0);
    } else if (s === STATE.CRAWL || s === STATE.AIR) {
      this.body.setAllowGravity(true);
      this.isNapping = false;
    }
  }

  update(time, delta) {
    const dt = delta / 1000;
    const { cursors, spaceKey } = this;
    const onGround = this.body.blocked.down;

    // Checkpoint timer
    this.checkpointTimer += dt;
    if (this.checkpointNapEnabled && this.checkpointTimer > 30 && !this.checkpointNapFired && this.state !== STATE.NAP) {
      this.checkpointNapFired = true;
      this.setState(STATE.NAP);
      return;
    }

    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - delta);
    this.coyoteMs = Math.max(0, this.coyoteMs - delta);
    if (onGround) this.coyoteMs = this.coyoteWindowMs;
    if (Phaser.Input.Keyboard.JustDown(spaceKey) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
      this.jumpBufferMs = this.jumpBufferWindowMs;
      this.jumpCutApplied = false;
    }

    // Crawl sound
    this.crawlSoundTimer += dt;
    if (this.state === STATE.CRAWL && (cursors.left.isDown || cursors.right.isDown)) {
      if (this.crawlSoundTimer > 0.35) {
        this.crawlSoundTimer = 0;
        sfx.crawlTick();
      }
    }

    switch (this.state) {
      case STATE.CRAWL:
        this.updateCrawl(dt, cursors, spaceKey, onGround);
        break;
      case STATE.AIR:
        this.updateAir(dt, cursors, spaceKey, onGround);
        break;
      case STATE.WALL_CLIMB:
        this.updateWallClimb(dt, cursors, spaceKey);
        break;
      case STATE.SWING:
        this.updateSwing(dt, cursors, spaceKey);
        break;
      case STATE.NAP:
        this.updateNap(dt);
        break;
    }

    this.wasOnGround = onGround;

    // Check stamina = 0 -> NAP
    if (getStamina(this.scene) <= 0 && this.state !== STATE.NAP) {
      this.setState(STATE.NAP);
    }

    // Tilt and squash/stretch based on velocity
    if (this.state !== STATE.NAP && this.state !== STATE.SWING) {
      const tiltTarget = Phaser.Math.Clamp(this.body.velocity.x * 0.08, -15, 15);
      this.setAngle(Phaser.Math.Linear(this.angle, tiltTarget, 0.15));
      const runStretch = Phaser.Math.Clamp(Math.abs(this.body.velocity.x) / 260, 0, 0.12);
      const airStretch = Phaser.Math.Clamp(Math.abs(this.body.velocity.y) / 520, 0, 0.1);
      const targetScaleX = this.baseScale + runStretch - airStretch * 0.3;
      const targetScaleY = this.baseScale - runStretch * 0.55 + airStretch;
      this.setScale(
        Phaser.Math.Linear(this.scaleX, targetScaleX, 0.2),
        Phaser.Math.Linear(this.scaleY, targetScaleY, 0.2)
      );
    } else if (this.state !== STATE.SWING) {
      this.setScale(
        Phaser.Math.Linear(this.scaleX, this.baseScale, 0.2),
        Phaser.Math.Linear(this.scaleY, this.baseScale, 0.2)
      );
    }

    // Debug D key (handled in scene/HUD)
  }

  updateCrawl(dt, cursors, spaceKey, onGround) {
    if (!onGround) {
      this.setState(STATE.AIR);
      return;
    }

    // Horizontal movement with acceleration & drag
    const accel = PLAYER.ACCEL * 1.6;
    const drag = PLAYER.DRAG * 2.8;

    if (cursors.left.isDown) {
      this.body.setAccelerationX(-accel);
      this.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setAccelerationX(accel);
      this.setFlipX(false);
    } else {
      this.body.setAccelerationX(0);
      // Apply strong drag for a snappy crawl
      const vel = this.body.velocity.x;
      if (Math.abs(vel) < 5) {
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(vel * Math.max(0, 1 - drag * dt / 100));
      }
    }

    // Wall climb transition check
    this.checkWallClimb(cursors);

    // Jump (buffer + coyote)
    if (this.jumpBufferMs > 0 && (onGround || this.coyoteMs > 0)) {
      this.jumpBufferMs = 0;
      this.coyoteMs = 0;
      this.doJump();
    }
  }

  updateAir(dt, cursors, spaceKey, onGround) {
    if (onGround) {
      this.setState(STATE.CRAWL);
      sfx.bonk();
      return;
    }

    // Slight air control
    if (cursors.left.isDown) {
      this.body.setAccelerationX(-PLAYER.ACCEL * 0.75);
      this.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setAccelerationX(PLAYER.ACCEL * 0.75);
      this.setFlipX(false);
    } else {
      this.body.setAccelerationX(0);
      // Gentle air decel — prevents drifting at full speed with no input
      const vel = this.body.velocity.x;
      if (Math.abs(vel) > 8) {
        this.body.setVelocityX(vel * Math.max(0, 1 - 2.0 * dt));
      } else {
        this.body.setVelocityX(0);
      }
    }

    if (!(this.spaceKey.isDown || this.cursors.up.isDown) && this.body.velocity.y < -JUMP_CUT_MIN_SPEED && !this.jumpCutApplied) {
      this.body.setVelocityY(this.body.velocity.y * JUMP_CUT_FACTOR);
      this.jumpCutApplied = true;
    }

    if (this.jumpBufferMs > 0 && this.coyoteMs > 0) {
      this.jumpBufferMs = 0;
      this.coyoteMs = 0;
      this.doJump();
      return;
    }

    // Auto-grab swing check
    this.checkSwingGrab();

    // Wall climb check
    this.checkWallClimb(cursors);
  }

  updateWallClimb(dt, cursors, spaceKey) {
    // Re-check wall contact every frame
    const bl = this.body.blocked;
    if (!bl.left && !bl.right) {
      this.onClimbableWall = false;
      this.setState(STATE.AIR);
      return;
    }
    // Update which side
    if (bl.left) this.wallSide = -1;
    else if (bl.right) this.wallSide = 1;

    // Drain stamina
    const climbingMotion = cursors.up.isDown || cursors.down.isDown;
    if (climbingMotion) {
      this.climbDrainAcc += PLAYER.CLIMB_DRAIN_RATE * dt;
      if (this.climbDrainAcc >= 1) {
        this.climbDrainAcc -= 1;
        drainStamina(this.scene, 1);
      }
    }

    // Vertical movement
    if (cursors.up.isDown) {
      this.body.setVelocityY(-PLAYER.CLIMB_SPEED);
    } else if (cursors.down.isDown) {
      this.body.setVelocityY(PLAYER.CLIMB_SPEED);
    } else {
      this.body.setVelocityY(0);
    }

    // Push against wall
    if (this.wallSide === -1) {
      this.body.setVelocityX(-20);
    } else {
      this.body.setVelocityX(20);
    }

    // Jump away from wall
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
      this.body.setAllowGravity(true);
      this.body.setVelocity(this.wallSide * -160, PLAYER.JUMP_VEL * 0.8);
      this.onClimbableWall = false;
      this.setState(STATE.AIR);
    }

    // Release if moving away
    if (this.wallSide === -1 && cursors.right.isDown) {
      this.onClimbableWall = false;
      this.setState(STATE.AIR);
    } else if (this.wallSide === 1 && cursors.left.isDown) {
      this.onClimbableWall = false;
      this.setState(STATE.AIR);
    }
  }

  updateSwing(dt, cursors, spaceKey) {
    if (!this.pendulum) return;

    this.pendulum.update(dt);

    // Pump
    const pumpForce = 0.22;
    let pumpDir = 0;
    if (Phaser.Input.Keyboard.JustDown(cursors.left)) pumpDir = -1;
    else if (Phaser.Input.Keyboard.JustDown(cursors.right)) pumpDir = 1;

    if (pumpDir !== 0) {
      this.pendulum.applyTorque(pumpDir * pumpForce);
      if (pumpDir !== this.lastPumpDir) {
        this.swingPumpCounter += 1;
        this.lastPumpDir = pumpDir;
      }
    }

    // Drain stamina at most once per six direction-change pumps
    if (this.swingPumpCounter >= 6) {
      this.swingPumpCounter = 0;
      drainStamina(this.scene, 1);
    }

    // Move baby to bob position
    this.setPosition(this.pendulum.getBobX(), this.pendulum.getBobY());

    // Tilt to angle
    this.setAngle(Phaser.Math.RadToDeg(this.pendulum.angle) * 0.5);

    // Release
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
      this.releaseSwing();
    }
  }

  updateNap(dt) {
    this.napTimer += dt;
    this.setAngle(0);

    if (this.napTimer >= PLAYER.NAP_DURATION / 1000) {
      // Wake up
      setStamina(this.scene, 2);
      this.isNapping = false;
      sfx.wakeUp();
      this.scene.events.emit('nap-end');
      const onGround = this.body.blocked.down;
      this.setState(onGround ? STATE.CRAWL : STATE.AIR);
    }
  }

  doJump() {
    this.body.setVelocityY(PLAYER.JUMP_VEL);
    this.setState(STATE.AIR);
    this.jumpCutApplied = false;
    // Small wobble
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.85,
      duration: 80,
      yoyo: true,
    });
  }

  checkWallClimb(cursors) {
    if (!this.climbWalls) return;

    const bl = this.body.blocked;
    const to = this.body.touching;

    // Primary: physical contact flags (blocked OR touching covers both static + dynamic)
    let isOnWall = bl.left || bl.right || to.left || to.right;
    let side = 0;
    if (bl.left || to.left)       side = -1;
    else if (bl.right || to.right) side = 1;

    // Secondary: proximity scan — lets player enter climb 80 ms after last wall contact
    if (!isOnWall) {
      const MARGIN = 10; // px beyond body edge
      const bx  = this.body.x;
      const by  = this.body.y;
      const bw  = this.body.width;
      const bh  = this.body.height;
      this.climbWalls.getChildren().forEach(w => {
        if (isOnWall) return;
        const wb = w.body;
        const overlapV = by < wb.y + wb.height && by + bh > wb.y;
        if (!overlapV) return;
        if (bx + bw >= wb.x - MARGIN && bx <= wb.x + MARGIN) {
          isOnWall = true; side = -1; // left of wall → player on right side touching left
        }
        if (bx >= wb.x + wb.width - MARGIN && bx <= wb.x + wb.width + MARGIN) {
          isOnWall = true; side = 1;
        }
      });
    }

    // Update buffer
    if (isOnWall) {
      this.wallTouchBuffer = 80; // ms
      this.wallSide = side;
    } else if (this.wallTouchBuffer > 0) {
      this.wallTouchBuffer -= 16; // approx one frame
      isOnWall = true; // grace window still active
    }

    this.onClimbableWall = isOnWall;

    if (isOnWall && (cursors.up.isDown || cursors.down.isDown)) {
      if (this.state === STATE.CRAWL || this.state === STATE.AIR) {
        this.setState(STATE.WALL_CLIMB);
        sfx.wallGrab(); // distinct "grab wall" cue
      }
    }
  }

  checkSwingGrab() {
    if (!this.grabZone || !this.pendulum) return;
    if (this.swingActive) return;

    const bobX = this.pendulum.getBobX();
    const bobY = this.pendulum.getBobY();
    const dist = Phaser.Math.Distance.Between(this.x, this.y, bobX, bobY);

    if (dist < 56) {
      this.swingActive = true;
      this.setState(STATE.SWING);
      this.scene.cameras.main.shake(70, 0.002);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale * 1.12,
        scaleY: this.baseScale * 0.86,
        duration: 90,
        yoyo: true,
      });
      this.scene.events.emit('swing-grab', { x: bobX, y: bobY });
      sfx.swing();
    }
  }

  releaseSwing() {
    if (!this.pendulum) return;
    this.swingActive = false;
    const velX = this.pendulum.getBobVelX() * 48;
    const velY = this.pendulum.getBobVelY() * 48;
    this.body.setAllowGravity(true);
    this.body.setVelocity(velX, velY);
    this.lastPumpDir = 0;
    this.setState(STATE.AIR);
  }

  resetCheckpointTimer() {
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;
  }
}
