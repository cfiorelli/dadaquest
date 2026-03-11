import * as BABYLON from '@babylonjs/core';
import { clamp } from '../util/math.js';
import { createBlobShadow } from '../materials.js';
import { createBabyVisual } from './babyVisual.js';
import { BabyAnimationController } from './babyAnim.js';
import { isDebugMode } from '../../utils/modes.js';

function recordJump(reason, input, grounded, pos) {
  const debugMode = isDebugMode();
  if (!debugMode) return;
  
  const record = {
    t: performance.now(),
    reason,
    input: { ...input },
    grounded,
    pos: { x: pos.x, y: pos.y, z: pos.z },
    stack: new Error().stack,
  };
  
  window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
  window.__DADA_DEBUG__.lastJump = record;
  console.log('[JUMP TRACE]', reason, record);
}

// Tuning constants — walk speed = MAX_SPEED, run = MAX_SPEED * sprint multiplier in boot.js
const GROUND_ACCEL = 48; // 60 × 0.80 — scaled with MAX_SPEED
const GROUND_DECEL = 64; // 80 × 0.80 — scaled with MAX_SPEED
const AIR_ACCEL = 30;
const AIR_DECEL = 10;
const MAX_SPEED = 6.4; // was 8; walk -20% per design
const GRAVITY = 32;
const JUMP_VEL = 14;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 100;
const JUMP_CUT_MULT = 0.4;   // multiply vy when jump released early
const PLAYER_HALF_W = 0.25;
const PLAYER_HALF_H = 0.4;
const PLAYER_HALF_D = 0.25;
const SKIN_WIDTH = 0.005;     // separation buffer to prevent re-collision
const VEL_DEADZONE = 0.01;    // clamp tiny velocities to zero
const INVULN_BLINK_HZ = 20;
const BACKFLIP_DURATION_SEC = 0.52;
const BACKFLIP_COOLDOWN_MS = 800;
const SIDE_JUMP_WINDOW_MS = 350;
const SIDE_JUMP_PUSH_X = 6.2;
const CAPE_FLOAT_DEFAULT_MS = 4000;
const CAPE_FLOAT_X_SPEED = 5.6;
const CAPE_FLOAT_Y_SPEED = 4.8;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function wrapAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

export class PlayerController {
  constructor(scene, startPos = { x: -12, y: 3, z: 0 }) {
    this.scene = scene;
    const {
      x = -12,
      y = 3,
      z = 0,
      animationsEnabled = true,
    } = startPos;

    // Root transform for physics/collider position.
    this.mesh = new BABYLON.TransformNode('player', scene);
    this.mesh.position.set(x, y, z);

    // Child transform for visual-only squash/stretch (does not affect collider root).
    this.visual = new BABYLON.TransformNode('playerVisual', scene);
    this.visual.parent = this.mesh;
    // Dedicated visual root used by animation/presentation systems.
    this.playerVisualRoot = this.visual;
    this.animationsEnabled = !!animationsEnabled;

    const babyVisual = createBabyVisual(scene);
    babyVisual.root.parent = this.visual;
    this.babyRig = babyVisual.rig;
    this.babyAnim = new BabyAnimationController({
      rig: this.babyRig,
      enabled: this.animationsEnabled,
    });

    // Store child meshes for shadow caster registration
    this._meshes = babyVisual.shadowMeshes;

    // Blob shadow under the player
    this.blobShadow = createBlobShadow(scene, 'babyShadow', { diameter: 0.92, opacity: 0.24 });
    this.blobShadow.position.set(x, 0.01, z);

    // Physics state
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = false;
    this.timeSinceGround = 999; // ms since last grounded
    this.jumpBufferMs = 0; // ms remaining in jump buffer window
    this.jumping = false;       // true while ascending from a jump
    this.jumpCutApplied = false;
    this.ignoreJumpUntilRelease = true;
    this.lastJumpPressIdUsed = 0;
    this.wasGroundedLastFrame = false;
    this.outOfBoundsEmitted = false;

    // Platform colliders (set externally via setColliders)
    this.colliders = [];  // array of {minX, maxX, minY, maxY}
    this.lastCollisionHits = 0; // debug: how many platforms we collided with last frame

    // Gameplay modifiers (set by world/hazards)
    this.surfaceAccelMultiplier = 1;
    this.surfaceDecelMultiplier = 1;
    this.jumpVelocityMultiplier = 1;
    this.maxAirJumps = 0;
    this.airJumpsUsed = 0;
    this.turnResponsiveness = 1;
    this.speedMultiplier = 1;
    this.accelBonusMultiplier = 1;
    this.airAccelMultiplier = 1;
    this.gravityScale = 1;
    this.coyoteTimeMs = COYOTE_MS;
    this.jumpBufferWindowMs = JUMP_BUFFER_MS;
    this.movementMode = 'lane';
    this.era5Yaw = 0;
    this.era5YawVel = 0;

    // Feedback state
    this.invulnTimerMs = 0;
    this.eventQueue = [];
    this.backflipTimerSec = 0;
    this.backflipCooldownMs = 0;
    this.backflipCount = 0;
    this.sideJumpWindowMs = 0;
    this.sideJumpUsed = false;
    this.sideJumpDir = 0;
    this.sideJumpDirZ = 0;
    this.sideJumpPlatform = null;
    this.capeFloatTimerMs = 0;
    this.capeFloatCount = 0;
  }

  setColliders(platforms) {
    this.colliders = platforms.map(p => {
      const pos = p.position;
      const ext = p.getBoundingInfo().boundingBox.extendSize;
      return {
        minX: pos.x - ext.x,
        maxX: pos.x + ext.x,
        minY: pos.y - ext.y,
        maxY: pos.y + ext.y,
        minZ: pos.z - ext.z,
        maxZ: pos.z + ext.z,
      };
    });
  }

  setMovementMode(mode = 'lane') {
    this.movementMode = mode === 'free' ? 'free' : 'lane';
    if (this.movementMode === 'lane') {
      this.mesh.position.z = 0;
      this.vz = 0;
      this.visual.rotation.y = 0;
      this.era5Yaw = 0;
      this.era5YawVel = 0;
    }
  }

  setMovementModifiers({
    surfaceAccelMultiplier = 1,
    surfaceDecelMultiplier = 1,
    jumpVelocityMultiplier = 1,
    maxAirJumps = 0,
    turnResponsiveness = 1,
    speedMultiplier = 1,
    accelBonusMultiplier = 1,
    airAccelMultiplier = 1,
    gravityScale = 1,
    coyoteTimeMs = COYOTE_MS,
    jumpBufferWindowMs = JUMP_BUFFER_MS,
  } = {}) {
    this.surfaceAccelMultiplier = surfaceAccelMultiplier;
    this.surfaceDecelMultiplier = surfaceDecelMultiplier;
    this.jumpVelocityMultiplier = jumpVelocityMultiplier;
    this.maxAirJumps = Math.max(0, maxAirJumps | 0);
    this.turnResponsiveness = clamp(turnResponsiveness, 0.2, 1);
    this.speedMultiplier = clamp(speedMultiplier, 0.6, 3.0); // 3.0 allows 1.75× sprint headroom
    this.accelBonusMultiplier = clamp(accelBonusMultiplier, 0.6, 3.0);
    this.airAccelMultiplier = clamp(airAccelMultiplier, 0.2, 1.4);
    this.gravityScale = clamp(gravityScale, 0.6, 1.4);
    this.coyoteTimeMs = clamp(coyoteTimeMs, 0, 250);
    this.jumpBufferWindowMs = clamp(jumpBufferWindowMs, 0, 250);
  }

  setPosition(x, y, z = 0) {
    this.mesh.position.set(x, y, z);
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = false;
    this.jumping = false;
    this.jumpCutApplied = false;
    this.jumpBufferMs = 0;
    this.ignoreJumpUntilRelease = true;
    this.lastJumpPressIdUsed = 0;
    this.outOfBoundsEmitted = false;
    this.airJumpsUsed = 0;
    this.backflipTimerSec = 0;
    this.backflipCooldownMs = 0;
    this.sideJumpWindowMs = 0;
    this.sideJumpUsed = false;
    this.sideJumpDir = 0;
    this.sideJumpDirZ = 0;
    this.sideJumpPlatform = null;
    this.capeFloatTimerMs = 0;
    this.visual.rotation.set(0, 0, 0);
    this.era5Yaw = 0;
    this.era5YawVel = 0;
    if (this.babyAnim) {
      this.babyAnim.setWinActive(false);
      this.babyAnim.resetPose();
    }
  }

  setEra5YawState(yaw = 0, yawVel = 0) {
    this.era5Yaw = wrapAngle(yaw);
    this.era5YawVel = Number.isFinite(yawVel) ? yawVel : 0;
  }

  getEra5YawState() {
    return {
      yaw: this.era5Yaw,
      yawVel: this.era5YawVel,
    };
  }

  /**
   * Deterministic spawn settle: place the player at (x, y, z), then snap
   * downward onto the nearest platform surface so the very first rendered
   * frame is already in stable resting contact.  No physics frames needed.
   */
  spawnAt(x, y, z = 0) {
    this.setPosition(x, y, z);
    const pos = this.mesh.position;

    // Find the highest platform top that is directly beneath (or barely
    // overlapping) the player's AABB at the given X.
    const pMinX = x - PLAYER_HALF_W;
    const pMaxX = x + PLAYER_HALF_W;
    const pMinZ = z - PLAYER_HALF_D;
    const pMaxZ = z + PLAYER_HALF_D;
    const playerBottom = y - PLAYER_HALF_H;
    const SNAP_RANGE = 0.15; // how far below player bottom we search

    let bestTop = null;
    for (const c of this.colliders) {
      // Must overlap horizontally
      if (pMaxX <= c.minX || pMinX >= c.maxX) continue;
      if (this.movementMode === 'free' && (pMaxZ <= c.minZ || pMinZ >= c.maxZ)) continue;
      // Platform top must be within snap range below (or at) player bottom
      if (c.maxY > playerBottom + SKIN_WIDTH) continue; // platform top is above player bottom (would overlap)
      if (c.maxY < playerBottom - SNAP_RANGE) continue; // too far below
      if (bestTop === null || c.maxY > bestTop) bestTop = c.maxY;
    }

    if (bestTop !== null) {
      // Snap player so bottom sits exactly on platform top + skin
      pos.y = bestTop + PLAYER_HALF_H + SKIN_WIDTH;
      this.grounded = true;
      this.timeSinceGround = 0;
      this.vy = 0;
      this.wasGroundedLastFrame = true;
    }
    // If no platform found, leave position as-is (will fall naturally)
  }

  consumeEvents() {
    const events = this.eventQueue;
    this.eventQueue = [];
    return events;
  }

  emitEvent(type, payload = {}) {
    this.eventQueue.push({ type, ...payload });
  }

  triggerLandSquash() {
    if (this.babyAnim) {
      this.babyAnim.onLand();
    }
  }

  applyHit({ direction = 1, directionZ = 0, knockback = 4.5, upward = 4.0, invulnMs = 800 } = {}) {
    if (this.invulnTimerMs > 0) return false;
    let dirX = direction >= 0 ? 1 : -1;
    let dirZ = Number.isFinite(directionZ) ? directionZ : 0;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.001) {
      dirX /= len;
      dirZ /= len;
    }
    this.vx = clamp(this.vx + dirX * knockback, -MAX_SPEED * 1.25, MAX_SPEED * 1.25);
    if (this.movementMode === 'free') {
      this.vz = clamp(this.vz + dirZ * knockback, -MAX_SPEED * 1.25, MAX_SPEED * 1.25);
    }
    this.vy = Math.max(this.vy, upward);
    this.invulnTimerMs = invulnMs;
    this.emitEvent('hit', { direction: dirX, directionZ: dirZ });
    return true;
  }

  isInvulnerable() {
    return this.invulnTimerMs > 0;
  }

  triggerBackflip() {
    if (this.backflipCooldownMs > 0 || this.backflipTimerSec > 0) {
      return false;
    }
    this.backflipTimerSec = BACKFLIP_DURATION_SEC;
    this.backflipCooldownMs = BACKFLIP_COOLDOWN_MS;
    this.backflipCount += 1;
    return true;
  }

  isBackflipping() {
    return this.backflipTimerSec > 0;
  }

  canTriggerAirFlip() {
    return !this.grounded && (this.jumping || Math.abs(this.vy) > 0.5);
  }

  startCapeFloat(durationMs = CAPE_FLOAT_DEFAULT_MS) {
    this.capeFloatTimerMs = durationMs;
    this.capeFloatCount += 1;
  }

  stopCapeFloat() {
    this.capeFloatTimerMs = 0;
  }

  isCapeFloating() {
    return this.capeFloatTimerMs > 0;
  }

  getBackflipState() {
    return {
      active: this.backflipTimerSec > 0,
      timerSec: this.backflipTimerSec,
      cooldownMs: this.backflipCooldownMs,
      count: this.backflipCount,
      angle: this.visual.rotation.z,
      capeFloatMs: this.capeFloatTimerMs,
      capeFloatCount: this.capeFloatCount,
    };
  }

  getCollisionHalfExtents() {
    return { halfW: PLAYER_HALF_W, halfH: PLAYER_HALF_H, halfD: PLAYER_HALF_D };
  }

  wouldOverlapAt(x, y, z = 0) {
    const minX = x - PLAYER_HALF_W;
    const maxX = x + PLAYER_HALF_W;
    const minY = y - PLAYER_HALF_H;
    const maxY = y + PLAYER_HALF_H;
    const minZ = z - PLAYER_HALF_D;
    const maxZ = z + PLAYER_HALF_D;
    for (const c of this.colliders) {
      if (maxX <= c.minX || minX >= c.maxX) continue;
      if (maxY <= c.minY || minY >= c.maxY) continue;
      if (this.movementMode === 'free' && (maxZ <= c.minZ || minZ >= c.maxZ)) continue;
      return true;
    }
    return false;
  }

  update(dt, moveX, jumpPressedEdge, jumpHeld, jumpPressId = 0, options = {}) {
    dt = Math.min(dt, 1 / 30); // cap to avoid tunneling
    const pos = this.mesh.position;
    const freeMove = options.movementMode === 'free' || this.movementMode === 'free';
    const floatMoveY = clamp(options.floatMoveY ?? 0, -1, 1);
    let moveZ = clamp(options.moveZ ?? 0, -1, 1);
    const floatMode = options.floatMode || (options.floatActive ? 'cape' : null);
    const swimFloatActive = floatMode === 'swim';
    const floatActive = swimFloatActive || (floatMode === 'cape' && this.capeFloatTimerMs > 0);
    if (!freeMove) moveZ = 0;
    const explicitFacingYaw = Number.isFinite(options.facingYaw) ? wrapAngle(options.facingYaw) : null;

    if (this.invulnTimerMs > 0) {
      this.invulnTimerMs = Math.max(0, this.invulnTimerMs - dt * 1000);
    }
    if (this.backflipCooldownMs > 0) {
      this.backflipCooldownMs = Math.max(0, this.backflipCooldownMs - dt * 1000);
    }
    if (this.sideJumpWindowMs > 0) {
      this.sideJumpWindowMs = Math.max(0, this.sideJumpWindowMs - dt * 1000);
    }
    if (this.capeFloatTimerMs > 0) {
      this.capeFloatTimerMs = Math.max(0, this.capeFloatTimerMs - dt * 1000);
    }

    // Timers
    if (this.grounded) {
      this.timeSinceGround = 0;
      this.sideJumpUsed = false;
      this.sideJumpWindowMs = 0;
      this.sideJumpDir = 0;
      this.sideJumpDirZ = 0;
      this.sideJumpPlatform = null;
    } else {
      this.timeSinceGround += dt * 1000;
    }

    if (!jumpHeld) {
      this.ignoreJumpUntilRelease = false;
    }

    const canAcceptPress = !this.ignoreJumpUntilRelease;
    if (jumpPressedEdge && canAcceptPress) {
      this.jumpBufferMs = this.jumpBufferWindowMs;
    } else {
      this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dt * 1000);
    }

    // Jump (coyote + buffer)
    const canCoyote = this.timeSinceGround <= this.coyoteTimeMs;
    const canBuffer = this.jumpBufferMs > 0;
    const canGroundJump = canBuffer && canCoyote && !this.jumping;
    const canAirJump = canBuffer
      && !this.grounded
      && this.timeSinceGround > this.coyoteTimeMs
      && this.maxAirJumps > 0
      && this.airJumpsUsed < this.maxAirJumps;
    const canSideJump = canBuffer
      && !this.grounded
      && this.sideJumpWindowMs > 0
      && !this.sideJumpUsed;
    if (!swimFloatActive && (canGroundJump || canAirJump || canSideJump)) {
      const sideJumpDir = canSideJump ? this.sideJumpDir : 0;
      const sideJumpDirZ = canSideJump ? this.sideJumpDirZ : 0;
      const jumpReason = canAirJump ? 'air-jump' : 'buffer-consumed';
      recordJump(jumpReason, {
        jumpHeld,
        jumpEdge: jumpPressedEdge,
        jumpPressId,
        lastUsed: this.lastJumpPressIdUsed,
        bufferMs: this.jumpBufferMs,
        coyoteMs: this.timeSinceGround,
      }, this.grounded, pos);
      
      this.vy = (canSideJump ? (JUMP_VEL * 0.92) : JUMP_VEL) * this.jumpVelocityMultiplier;
      if (canSideJump && sideJumpDir !== 0) {
        this.vx = sideJumpDir * SIDE_JUMP_PUSH_X;
      }
      if (canSideJump && freeMove && sideJumpDirZ !== 0) {
        this.vz = sideJumpDirZ * SIDE_JUMP_PUSH_X;
      }
      this.jumping = true;
      this.jumpCutApplied = false;
      this.timeSinceGround = this.coyoteTimeMs + 1; // consume coyote
      this.jumpBufferMs = 0; // consume buffer immediately
      this.grounded = false;
      if (this.babyAnim) {
        this.babyAnim.onJump();
      }
      if (canSideJump) {
        this.sideJumpUsed = true;
        this.sideJumpWindowMs = 0;
        this.emitEvent('jump');
      } else if (canAirJump) {
        this.airJumpsUsed += 1;
        this.emitEvent('doubleJump');
      } else {
        this.emitEvent('jump');
      }
    }

    // Variable jump: cut upward velocity if released early
    if (!swimFloatActive && this.jumping && !jumpHeld && this.vy > 0 && !this.jumpCutApplied) {
      this.vy *= JUMP_CUT_MULT;
      this.jumpCutApplied = true;
    }

    // Horizontal movement
    const moveLen = freeMove ? Math.hypot(moveX, moveZ) : Math.abs(moveX);
    if (freeMove && moveLen > 1) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }
    let accelVal = this.grounded
      ? (moveLen > 0 ? GROUND_ACCEL * this.surfaceAccelMultiplier : GROUND_DECEL * this.surfaceDecelMultiplier)
      : (moveLen > 0 ? AIR_ACCEL * this.surfaceAccelMultiplier : AIR_DECEL * this.surfaceDecelMultiplier);
    accelVal *= this.accelBonusMultiplier;
    if (!this.grounded) {
      accelVal *= this.airAccelMultiplier;
    }
    const targetVx = moveX * MAX_SPEED * this.speedMultiplier;
    const targetVz = freeMove ? moveZ * MAX_SPEED * this.speedMultiplier : 0;
    let diff = targetVx - this.vx;
    if (
      !freeMove
      && this.grounded
      && moveX !== 0
      && Math.abs(this.vx) > 0.2
      && Math.sign(targetVx) !== Math.sign(this.vx)
      && this.turnResponsiveness < 0.999
    ) {
      diff *= this.turnResponsiveness;
    }
    const maxStep = accelVal * dt;
    this.vx += clamp(diff, -maxStep, maxStep);
    if (freeMove) {
      const diffZ = targetVz - this.vz;
      this.vz += clamp(diffZ, -maxStep, maxStep);
    } else {
      this.vz = 0;
    }

    if (floatActive) {
      this.vx = clamp(moveX * CAPE_FLOAT_X_SPEED, -CAPE_FLOAT_X_SPEED, CAPE_FLOAT_X_SPEED);
      if (freeMove) {
        this.vz = clamp(moveZ * CAPE_FLOAT_X_SPEED, -CAPE_FLOAT_X_SPEED, CAPE_FLOAT_X_SPEED);
      }
      this.vy = clamp(floatMoveY * CAPE_FLOAT_Y_SPEED, -CAPE_FLOAT_Y_SPEED, CAPE_FLOAT_Y_SPEED * 0.85);
      this.jumping = false;
      this.jumpCutApplied = false;
    } else {
      // Gravity
      this.vy -= (GRAVITY * this.gravityScale) * dt;
    }

    // Integrate position
    pos.x += this.vx * dt;
    pos.y += this.vy * dt;
    if (freeMove) {
      pos.z += this.vz * dt;
    } else {
      pos.z = 0; // lock to lane
    }

    // Collision resolution (AABB vs platforms)
    this.grounded = false;
    this.lastCollisionHits = 0;
    for (const c of this.colliders) {
      const pMinX = pos.x - PLAYER_HALF_W;
      const pMaxX = pos.x + PLAYER_HALF_W;
      const pMinY = pos.y - PLAYER_HALF_H;
      const pMaxY = pos.y + PLAYER_HALF_H;
      const pMinZ = pos.z - PLAYER_HALF_D;
      const pMaxZ = pos.z + PLAYER_HALF_D;

      // Check AABB overlap
      if (pMaxX <= c.minX || pMinX >= c.maxX) continue;
      if (pMaxY <= c.minY || pMinY >= c.maxY) continue;
      if (freeMove && (pMaxZ <= c.minZ || pMinZ >= c.maxZ)) continue;

      // Find smallest penetration axis
      const overlapLeft = pMaxX - c.minX;
      const overlapRight = c.maxX - pMinX;
      const overlapBottom = pMaxY - c.minY;
      const overlapTop = c.maxY - pMinY;
      const overlapBack = pMaxZ - c.minZ;
      const overlapFront = c.maxZ - pMinZ;
      const minOverlap = freeMove
        ? Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop, overlapBack, overlapFront)
        : Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop);
      this.lastCollisionHits++;

      if (minOverlap === overlapTop && this.vy <= 0) {
        // Landing on top — overlapTop is small when player barely penetrates from above
        pos.y = c.maxY + PLAYER_HALF_H + SKIN_WIDTH;
        this.vy = 0;
        this.grounded = true;
        this.jumping = false;
      } else if (minOverlap === overlapBottom && this.vy > 0) {
        // Hit ceiling — overlapBottom is small when player barely penetrates from below
        pos.y = c.minY - PLAYER_HALF_H - SKIN_WIDTH;
        this.vy = 0;
      } else if (minOverlap === overlapLeft) {
        pos.x = c.minX - PLAYER_HALF_W - SKIN_WIDTH;
        this.vx = 0;
        if (!this.grounded && this.vy < 0 && !this.sideJumpUsed) {
          this.sideJumpWindowMs = SIDE_JUMP_WINDOW_MS;
          this.sideJumpDir = -1;
          this.sideJumpDirZ = 0;
          this.sideJumpPlatform = c;
        }
      } else if (minOverlap === overlapRight) {
        pos.x = c.maxX + PLAYER_HALF_W + SKIN_WIDTH;
        this.vx = 0;
        if (!this.grounded && this.vy < 0 && !this.sideJumpUsed) {
          this.sideJumpWindowMs = SIDE_JUMP_WINDOW_MS;
          this.sideJumpDir = 1;
          this.sideJumpDirZ = 0;
          this.sideJumpPlatform = c;
        }
      } else if (freeMove && minOverlap === overlapBack) {
        pos.z = c.minZ - PLAYER_HALF_D - SKIN_WIDTH;
        this.vz = 0;
        if (!this.grounded && this.vy < 0 && !this.sideJumpUsed) {
          this.sideJumpWindowMs = SIDE_JUMP_WINDOW_MS;
          this.sideJumpDir = 0;
          this.sideJumpDirZ = -1;
          this.sideJumpPlatform = c;
        }
      } else if (freeMove && minOverlap === overlapFront) {
        pos.z = c.maxZ + PLAYER_HALF_D + SKIN_WIDTH;
        this.vz = 0;
        if (!this.grounded && this.vy < 0 && !this.sideJumpUsed) {
          this.sideJumpWindowMs = SIDE_JUMP_WINDOW_MS;
          this.sideJumpDir = 0;
          this.sideJumpDirZ = 1;
          this.sideJumpPlatform = c;
        }
      }
    }

    // Landing transition events + squash
    if (!this.wasGroundedLastFrame && this.grounded) {
      this.airJumpsUsed = 0;
      this.triggerLandSquash();
      this.emitEvent('land');
    }
    this.wasGroundedLastFrame = this.grounded;

    // Clamp tiny velocities to zero (prevents drift/jitter)
    if (Math.abs(this.vx) < VEL_DEADZONE) this.vx = 0;
    if (this.grounded && Math.abs(this.vy) < VEL_DEADZONE) this.vy = 0;
    if (freeMove && Math.abs(this.vz) < VEL_DEADZONE) this.vz = 0;

    // Out-of-bounds event emitted once until we're restored.
    if (pos.y < -10) {
      if (!this.outOfBoundsEmitted) {
        this.emitEvent('outOfBounds', { y: pos.y });
        this.outOfBoundsEmitted = true;
      }
    } else if (pos.y > -6) {
      this.outOfBoundsEmitted = false;
    }

    if (this.babyAnim) {
      this.babyAnim.update(dt, {
        vx: this.vx,
        grounded: this.grounded,
        capeFloatActive: floatActive,
      });
    }

    if (freeMove && explicitFacingYaw !== null) {
      // +PI flips the visual 180° so the face points forward (away from camera).
      // The baby mesh is built face-at-local-Z, which without the offset would
      // face toward the camera instead of away from it.
      this.visual.rotation.y = explicitFacingYaw + Math.PI;
    } else if (freeMove) {
      const planarSpeed = Math.hypot(this.vx, this.vz);
      if (planarSpeed > 0.14) {
        const desiredYaw = Math.atan2(this.vx, this.vz);
        const delta = wrapAngle(desiredYaw - this.visual.rotation.y);
        this.visual.rotation.y += delta * Math.min(1, dt * 13.5);
      }
    } else if (Math.abs(this.visual.rotation.y) > 0.0001) {
      this.visual.rotation.y *= Math.max(0, 1 - (dt * 12));
    }

    if (this.backflipTimerSec > 0) {
      this.backflipTimerSec = Math.max(0, this.backflipTimerSec - dt);
      const t = 1 - (this.backflipTimerSec / BACKFLIP_DURATION_SEC);
      const eased = easeOutCubic(clamp(t, 0, 1));
      this.visual.rotation.z = -Math.PI * 2 * eased;
      if (this.backflipTimerSec <= 0) {
        this.visual.rotation.z = 0;
      }
    } else if (Math.abs(this.visual.rotation.z) > 0.0001) {
      this.visual.rotation.z = 0;
    }

    // Blink while invulnerable for clear feedback.
    if (this.invulnTimerMs > 0) {
      const phase = this.invulnTimerMs / 1000;
      const blinkOn = Math.sin(phase * Math.PI * INVULN_BLINK_HZ) > 0;
      this.visual.setEnabled(blinkOn);
    } else {
      this.visual.setEnabled(true);
    }
  }

  getPosition() {
    return this.mesh.position.clone();
  }

  hasAirJumpAvailable() {
    return this.maxAirJumps > 0 && this.airJumpsUsed < this.maxAirJumps;
  }

  setCapeVisible(visible) {
    if (this.babyRig?.cape) {
      this.babyRig.cape.setEnabled(!!visible);
    }
  }

  getCapeFloatRemainingMs() {
    return this.capeFloatTimerMs;
  }

  setWinAnimationActive(active) {
    if (this.babyAnim) {
      this.babyAnim.setWinActive(active);
    }
  }

  updateVisualOnly(dt) {
    if (this.babyAnim) {
      this.babyAnim.update(dt, {
        vx: this.vx,
        grounded: this.grounded,
      });
    }
  }

  /**
   * Spawn stability probe — records Y, vy, grounded for 60 frames (or 1000ms).
   * Results stored on window.__DADA_DEBUG__.spawnProbe[label].
   */
  beginSpawnProbe(label) {
    if (!isDebugMode()) return;
    const t0 = performance.now();
    const samples = [];
    let frameCount = 0;
    let groundedFlips = 0;
    let lastGrounded = this.grounded;
    const pos = this.mesh.position;

    const checkProbe = () => {
      const elapsed = performance.now() - t0;
      if (frameCount >= 60 || elapsed >= 1000) {
        // Compute stats
        let minY = Infinity, maxY = -Infinity, maxAbsVy = 0;
        for (const s of samples) {
          if (s.y < minY) minY = s.y;
          if (s.y > maxY) maxY = s.y;
          if (Math.abs(s.vy) > maxAbsVy) maxAbsVy = Math.abs(s.vy);
        }
        const maxDeltaY = maxY - minY;
        const stats = { maxDeltaY, groundedFlips, minY, maxY, maxAbsVy, frames: frameCount };
        window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
        window.__DADA_DEBUG__.spawnProbe = window.__DADA_DEBUG__.spawnProbe || {};
        window.__DADA_DEBUG__.spawnProbe[label] = { stats, samples };
        console.log(
          `SPAWN PROBE ${label}: maxDeltaY=${maxDeltaY.toFixed(6)}, groundedFlips=${groundedFlips}, ` +
          `maxAbsVy=${maxAbsVy.toFixed(6)}, minY=${minY.toFixed(6)}, maxY=${maxY.toFixed(6)}`
        );
        return; // stop
      }

      if (this.grounded !== lastGrounded) {
        groundedFlips++;
        lastGrounded = this.grounded;
      }

      samples.push({
        t: elapsed,
        y: pos.y,
        vy: this.vy,
        grounded: this.grounded,
        timeSinceGround: this.timeSinceGround,
        collisionHits: this.lastCollisionHits,
        bottom: pos.y - PLAYER_HALF_H,
        top: pos.y + PLAYER_HALF_H,
      });
      frameCount++;
      requestAnimationFrame(checkProbe);
    };
    requestAnimationFrame(checkProbe);
  }

  /** Returns debug snapshot for the debug HUD. */
  getDebugState() {
    const pos = this.mesh.position;
    return {
      x: pos.x.toFixed(2),
      y: pos.y.toFixed(2),
      z: pos.z.toFixed(2),
      vx: this.vx.toFixed(2),
      vy: this.vy.toFixed(2),
      vz: this.vz.toFixed(2),
      yaw: this.era5Yaw.toFixed(3),
      yawVel: this.era5YawVel.toFixed(3),
      grounded: this.grounded,
      movementMode: this.movementMode,
      invulnMs: this.invulnTimerMs.toFixed(0),
      coyoteMs: Math.max(0, this.coyoteTimeMs - this.timeSinceGround).toFixed(0),
      bufferMs: this.jumpBufferMs.toFixed(0),
      jumping: this.jumping,
      airJumpsUsed: this.airJumpsUsed,
      airJumpsMax: this.maxAirJumps,
      backflipActive: this.isBackflipping(),
      backflipCooldownMs: this.backflipCooldownMs.toFixed(0),
    };
  }
}
