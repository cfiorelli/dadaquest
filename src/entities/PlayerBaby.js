import Phaser from 'phaser';
import { STATE } from '../utils/state.js';
import { Pendulum } from '../utils/pendulum.js';
import { PLAYER } from '../gameConfig.js';
import { sfx } from '../audio/sfx.js';
import { getStamina, setStamina, drainStamina } from '../utils/state.js';

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

    // Crawl sound timer
    this.crawlSoundTimer = 0;

    // Wobble/tilt
    this.wobbleTween = null;

    // Checkpoint timer
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;

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
    if (this.checkpointTimer > 30 && !this.checkpointNapFired && this.state !== STATE.NAP) {
      this.checkpointNapFired = true;
      this.setState(STATE.NAP);
      return;
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
    if (getStamina(this) <= 0 && this.state !== STATE.NAP) {
      this.setState(STATE.NAP);
    }

    // Tilt based on velocity
    if (this.state !== STATE.NAP && this.state !== STATE.SWING) {
      const tiltTarget = Phaser.Math.Clamp(this.body.velocity.x * 0.08, -15, 15);
      this.setAngle(Phaser.Math.Linear(this.angle, tiltTarget, 0.15));
    }

    // Debug D key (handled in scene/HUD)
  }

  updateCrawl(dt, cursors, spaceKey, onGround) {
    if (!onGround) {
      this.setState(STATE.AIR);
      return;
    }

    // Horizontal movement with acceleration & drag
    const accel = PLAYER.ACCEL;
    const drag = PLAYER.DRAG;

    if (cursors.left.isDown) {
      this.body.setAccelerationX(-accel);
      this.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setAccelerationX(accel);
      this.setFlipX(false);
    } else {
      this.body.setAccelerationX(0);
      // Apply drag manually for slidey feel
      const vel = this.body.velocity.x;
      if (Math.abs(vel) < 5) {
        this.body.setVelocityX(0);
      } else {
        this.body.setVelocityX(vel * (1 - drag * dt / 100));
      }
    }

    // Wall climb transition check
    this.checkWallClimb(cursors);

    // Jump
    if (Phaser.Input.Keyboard.JustDown(spaceKey) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
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
      this.body.setAccelerationX(-PLAYER.ACCEL * 0.5);
      this.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setAccelerationX(PLAYER.ACCEL * 0.5);
      this.setFlipX(false);
    } else {
      this.body.setAccelerationX(0);
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
    this.climbDrainAcc += PLAYER.CLIMB_DRAIN_RATE * dt;
    if (this.climbDrainAcc >= 1) {
      this.climbDrainAcc -= 1;
      drainStamina(this.scene, 1);
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
    const pumpForce = 0.8;
    if (cursors.left.isDown) {
      this.pendulum.applyTorque(-pumpForce * dt);
      this.swingPumpCount += dt;
    } else if (cursors.right.isDown) {
      this.pendulum.applyTorque(pumpForce * dt);
      this.swingPumpCount += dt;
    }

    // Drain stamina per pump time
    if (this.swingPumpCount >= PLAYER.SWING_PUMP_DRAIN / 10) {
      this.swingPumpCount = 0;
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
      setStamina(this.scene, 1);
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
    // Check if touching a climbable wall
    const touching = this.body.touching;
    const blocked = this.body.blocked;

    let isOnWall = false;
    let side = 0;

    if (blocked.left) {
      side = -1;
      isOnWall = true;
    } else if (blocked.right) {
      side = 1;
      isOnWall = true;
    }

    this.onClimbableWall = isOnWall;
    this.wallSide = side;

    if (isOnWall && (cursors.up.isDown || cursors.down.isDown)) {
      if (this.state === STATE.CRAWL || this.state === STATE.AIR) {
        this.setState(STATE.WALL_CLIMB);
      }
    }
  }

  checkSwingGrab() {
    if (!this.grabZone || !this.pendulum) return;
    if (this.swingActive) return;

    const bobX = this.pendulum.getBobX();
    const bobY = this.pendulum.getBobY();
    const dist = Phaser.Math.Distance.Between(this.x, this.y, bobX, bobY);

    if (dist < 40) {
      this.swingActive = true;
      this.setState(STATE.SWING);
      sfx.swing();
    }
  }

  releaseSwing() {
    if (!this.pendulum) return;
    this.swingActive = false;
    const velX = this.pendulum.getBobVelX() * 60;
    const velY = this.pendulum.getBobVelY() * 60;
    this.body.setAllowGravity(true);
    this.body.setVelocity(velX, velY);
    this.setState(STATE.AIR);
  }

  resetCheckpointTimer() {
    this.checkpointTimer = 0;
    this.checkpointNapFired = false;
  }
}
