import * as BABYLON from '@babylonjs/core';
import { clamp } from '../util/math.js';
import { makePlastic, createBlobShadow, LEVEL1_PALETTE as P } from '../materials.js';

// Tuning constants
const GROUND_ACCEL = 60;
const GROUND_DECEL = 80;
const AIR_ACCEL = 30;
const AIR_DECEL = 10;
const MAX_SPEED = 8;
const GRAVITY = 32;
const JUMP_VEL = 14;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 100;
const JUMP_CUT_MULT = 0.4;   // multiply vy when jump released early
const PLAYER_HALF_W = 0.25;
const PLAYER_HALF_H = 0.4;
const SKIN_WIDTH = 0.005;     // separation buffer to prevent re-collision
const VEL_DEADZONE = 0.01;    // clamp tiny velocities to zero
const LAND_SQUASH_MS = 95;
const INVULN_BLINK_HZ = 20;

export class PlayerController {
  constructor(scene, startPos = { x: -12, y: 3, z: 0 }) {
    this.scene = scene;

    // Root transform for physics/collider position.
    this.mesh = new BABYLON.TransformNode('player', scene);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);

    // Child transform for visual-only squash/stretch (does not affect collider root).
    this.visual = new BABYLON.TransformNode('playerVisual', scene);
    this.visual.parent = this.mesh;

    // Body (capsule-like: sphere + cylinder)
    const body = BABYLON.MeshBuilder.CreateCylinder('babyBody', {
      height: 0.4, diameterTop: 0.38, diameterBottom: 0.42, tessellation: 14,
    }, scene);
    body.position.y = -0.05;
    body.parent = this.visual;
    body.material = makePlastic(scene, 'babyBodyMat', ...P.babyBody);

    // Head (larger relative to body — toy proportions)
    const head = BABYLON.MeshBuilder.CreateSphere('babyHead', {
      diameter: 0.42, segments: 14,
    }, scene);
    head.position.y = 0.28;
    head.parent = this.visual;
    head.material = makePlastic(scene, 'babyHeadMat', ...P.babyBody);

    // Diaper band
    const diaper = BABYLON.MeshBuilder.CreateTorus('babyDiaper', {
      diameter: 0.42, thickness: 0.12, tessellation: 14,
    }, scene);
    diaper.position.y = -0.18;
    diaper.parent = this.visual;
    diaper.material = makePlastic(scene, 'babyDiaperMat', ...P.babyDiaper, { roughness: 0.5 });

    // Face (DynamicTexture)
    const faceSize = 64;
    const faceTex = new BABYLON.DynamicTexture('babyFaceTex', faceSize, scene, true);
    const fCtx = faceTex.getContext();
    fCtx.clearRect(0, 0, faceSize, faceSize);
    // Eyes (big round baby eyes)
    fCtx.fillStyle = '#333';
    fCtx.beginPath();
    fCtx.arc(20, 24, 5, 0, Math.PI * 2);
    fCtx.arc(44, 24, 5, 0, Math.PI * 2);
    fCtx.fill();
    // Eye highlights
    fCtx.fillStyle = '#fff';
    fCtx.beginPath();
    fCtx.arc(22, 22, 2, 0, Math.PI * 2);
    fCtx.arc(46, 22, 2, 0, Math.PI * 2);
    fCtx.fill();
    // Small smile
    fCtx.strokeStyle = '#555';
    fCtx.lineWidth = 1.5;
    fCtx.beginPath();
    fCtx.arc(32, 34, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    fCtx.stroke();
    faceTex.update();
    faceTex.hasAlpha = true;

    const facePlane = BABYLON.MeshBuilder.CreatePlane('babyFace', { size: 0.28 }, scene);
    facePlane.position.set(0, 0.28, -0.22);
    facePlane.parent = this.visual;
    const faceMat = new BABYLON.StandardMaterial('babyFaceMat', scene);
    faceMat.diffuseTexture = faceTex;
    faceMat.opacityTexture = faceTex;
    faceMat.specularColor = BABYLON.Color3.Black();
    faceMat.useAlphaFromDiffuseTexture = true;
    faceMat.emissiveColor = new BABYLON.Color3(0.12, 0.10, 0.08);
    facePlane.material = faceMat;

    // Store child meshes for shadow caster registration
    this._meshes = [body, head, diaper];

    // Blob shadow under the player
    this.blobShadow = createBlobShadow(scene, 'babyShadow', { diameter: 0.7, opacity: 0.3 });
    this.blobShadow.position.set(startPos.x, 0.01, startPos.z);

    // Physics state
    this.vx = 0;
    this.vy = 0;
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

    // Feedback state
    this.landSquashTimerMs = 0;
    this.invulnTimerMs = 0;
    this.eventQueue = [];
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
      };
    });
  }

  setMovementModifiers({
    surfaceAccelMultiplier = 1,
    surfaceDecelMultiplier = 1,
    jumpVelocityMultiplier = 1,
  } = {}) {
    this.surfaceAccelMultiplier = surfaceAccelMultiplier;
    this.surfaceDecelMultiplier = surfaceDecelMultiplier;
    this.jumpVelocityMultiplier = jumpVelocityMultiplier;
  }

  setPosition(x, y, z = 0) {
    this.mesh.position.set(x, y, z);
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.jumping = false;
    this.jumpCutApplied = false;
    this.jumpBufferMs = 0;
    this.ignoreJumpUntilRelease = true;
    this.lastJumpPressIdUsed = 0;
    this.outOfBoundsEmitted = false;
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
    this.landSquashTimerMs = LAND_SQUASH_MS;
  }

  applyHit({ direction = 1, knockback = 4.5, upward = 4.0, invulnMs = 800 } = {}) {
    if (this.invulnTimerMs > 0) return false;
    const dir = direction >= 0 ? 1 : -1;
    this.vx = clamp(this.vx + dir * knockback, -MAX_SPEED * 1.25, MAX_SPEED * 1.25);
    this.vy = Math.max(this.vy, upward);
    this.invulnTimerMs = invulnMs;
    this.emitEvent('hit', { direction: dir });
    return true;
  }

  isInvulnerable() {
    return this.invulnTimerMs > 0;
  }

  getCollisionHalfExtents() {
    return { halfW: PLAYER_HALF_W, halfH: PLAYER_HALF_H };
  }

  wouldOverlapAt(x, y) {
    const minX = x - PLAYER_HALF_W;
    const maxX = x + PLAYER_HALF_W;
    const minY = y - PLAYER_HALF_H;
    const maxY = y + PLAYER_HALF_H;
    for (const c of this.colliders) {
      if (maxX <= c.minX || minX >= c.maxX) continue;
      if (maxY <= c.minY || minY >= c.maxY) continue;
      return true;
    }
    return false;
  }

  update(dt, moveX, jumpPressedEdge, jumpHeld, jumpPressId = 0) {
    dt = Math.min(dt, 1 / 30); // cap to avoid tunneling
    const pos = this.mesh.position;

    if (this.invulnTimerMs > 0) {
      this.invulnTimerMs = Math.max(0, this.invulnTimerMs - dt * 1000);
    }

    // Timers
    if (this.grounded) {
      this.timeSinceGround = 0;
    } else {
      this.timeSinceGround += dt * 1000;
    }

    if (!jumpHeld) {
      this.ignoreJumpUntilRelease = false;
    }

    const canAcceptEdge = !this.ignoreJumpUntilRelease;
    const isNewPressId = jumpPressId === 0 || jumpPressId !== this.lastJumpPressIdUsed;
    if (jumpPressedEdge && canAcceptEdge && isNewPressId) {
      this.jumpBufferMs = JUMP_BUFFER_MS;
    } else {
      this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dt * 1000);
    }

    // Jump (coyote + buffer)
    const canCoyote = this.timeSinceGround <= COYOTE_MS;
    const canBuffer = this.jumpBufferMs > 0;
    if (canCoyote && canBuffer && !this.jumping) {
      this.vy = JUMP_VEL * this.jumpVelocityMultiplier;
      this.jumping = true;
      this.jumpCutApplied = false;
      this.timeSinceGround = COYOTE_MS + 1; // consume coyote
      this.jumpBufferMs = 0; // consume buffer immediately
      this.lastJumpPressIdUsed = jumpPressId || this.lastJumpPressIdUsed;
      this.grounded = false;
      if (import.meta.env.DEV) {
        console.log('JUMP', {
          edge: jumpPressedEdge,
          held: jumpHeld,
          buffer: this.jumpBufferMs,
          coyote: this.timeSinceGround,
          ignoreJumpUntilRelease: this.ignoreJumpUntilRelease,
        });
      }
      this.emitEvent('jump');
    }

    // Variable jump: cut upward velocity if released early
    if (this.jumping && !jumpHeld && this.vy > 0 && !this.jumpCutApplied) {
      this.vy *= JUMP_CUT_MULT;
      this.jumpCutApplied = true;
    }

    // Horizontal movement
    const accelVal = this.grounded
      ? (moveX !== 0 ? GROUND_ACCEL * this.surfaceAccelMultiplier : GROUND_DECEL * this.surfaceDecelMultiplier)
      : (moveX !== 0 ? AIR_ACCEL * this.surfaceAccelMultiplier : AIR_DECEL * this.surfaceDecelMultiplier);
    const targetVx = moveX * MAX_SPEED;
    const diff = targetVx - this.vx;
    const maxStep = accelVal * dt;
    this.vx += clamp(diff, -maxStep, maxStep);

    // Gravity
    this.vy -= GRAVITY * dt;

    // Integrate position
    pos.x += this.vx * dt;
    pos.y += this.vy * dt;
    pos.z = 0; // lock to lane

    // Collision resolution (AABB vs platforms)
    this.grounded = false;
    this.lastCollisionHits = 0;
    for (const c of this.colliders) {
      const pMinX = pos.x - PLAYER_HALF_W;
      const pMaxX = pos.x + PLAYER_HALF_W;
      const pMinY = pos.y - PLAYER_HALF_H;
      const pMaxY = pos.y + PLAYER_HALF_H;

      // Check AABB overlap
      if (pMaxX <= c.minX || pMinX >= c.maxX) continue;
      if (pMaxY <= c.minY || pMinY >= c.maxY) continue;

      // Find smallest penetration axis
      const overlapLeft = pMaxX - c.minX;
      const overlapRight = c.maxX - pMinX;
      const overlapBottom = pMaxY - c.minY;
      const overlapTop = c.maxY - pMinY;
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop);
      this.lastCollisionHits++;

      if (minOverlap === overlapBottom && this.vy <= 0) {
        // Landing on top
        pos.y = c.maxY + PLAYER_HALF_H + SKIN_WIDTH;
        this.vy = 0;
        this.grounded = true;
        this.jumping = false;
      } else if (minOverlap === overlapTop && this.vy > 0) {
        // Hit ceiling
        pos.y = c.minY - PLAYER_HALF_H - SKIN_WIDTH;
        this.vy = 0;
      } else if (minOverlap === overlapLeft) {
        pos.x = c.minX - PLAYER_HALF_W - SKIN_WIDTH;
        this.vx = 0;
      } else if (minOverlap === overlapRight) {
        pos.x = c.maxX + PLAYER_HALF_W + SKIN_WIDTH;
        this.vx = 0;
      }
    }

    // Landing transition events + squash
    if (!this.wasGroundedLastFrame && this.grounded) {
      this.triggerLandSquash();
      this.emitEvent('land');
    }
    this.wasGroundedLastFrame = this.grounded;

    // Clamp tiny velocities to zero (prevents drift/jitter)
    if (Math.abs(this.vx) < VEL_DEADZONE) this.vx = 0;
    if (this.grounded && Math.abs(this.vy) < VEL_DEADZONE) this.vy = 0;

    // Out-of-bounds event emitted once until we're restored.
    if (pos.y < -10) {
      if (!this.outOfBoundsEmitted) {
        this.emitEvent('outOfBounds', { y: pos.y });
        this.outOfBoundsEmitted = true;
      }
    } else if (pos.y > -6) {
      this.outOfBoundsEmitted = false;
    }

    // Visual-only squash/stretch envelope.
    if (this.landSquashTimerMs > 0) {
      this.landSquashTimerMs = Math.max(0, this.landSquashTimerMs - dt * 1000);
      const t = 1 - (this.landSquashTimerMs / LAND_SQUASH_MS);
      const pulse = Math.sin(t * Math.PI);
      const sx = 1 + 0.13 * pulse;
      const sy = 1 - 0.16 * pulse;
      const sz = 1 + 0.13 * pulse;
      this.visual.scaling.set(sx, sy, sz);
    } else {
      this.visual.scaling.set(1, 1, 1);
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

  /** Returns debug snapshot for the debug HUD. */
  getDebugState() {
    const pos = this.mesh.position;
    return {
      x: pos.x.toFixed(2),
      y: pos.y.toFixed(2),
      vx: this.vx.toFixed(2),
      vy: this.vy.toFixed(2),
      grounded: this.grounded,
      invulnMs: this.invulnTimerMs.toFixed(0),
      coyoteMs: Math.max(0, COYOTE_MS - this.timeSinceGround).toFixed(0),
      bufferMs: this.jumpBufferMs.toFixed(0),
      jumping: this.jumping,
    };
  }
}
