import * as BABYLON from '@babylonjs/core';
import { clamp } from '../util/math.js';

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

export class PlayerController {
  constructor(scene, startPos = { x: -12, y: 3, z: 0 }) {
    this.scene = scene;

    // Visual mesh: small sphere (placeholder for baby)
    this.mesh = BABYLON.MeshBuilder.CreateSphere('player', { diameter: 0.6, segments: 12 }, scene);
    this.mesh.position.set(startPos.x, startPos.y, startPos.z);
    const mat = new BABYLON.StandardMaterial('playerMat', scene);
    mat.diffuseColor = new BABYLON.Color3(1.0, 0.82, 0.65);
    mat.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    this.mesh.material = mat;

    // Physics state
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.timeSinceGround = 999; // ms since last grounded
    this.jumpBufferTimer = -999; // ms since last jump press
    this.jumping = false;       // true while ascending from a jump
    this.jumpCutApplied = false;

    // Platform colliders (set externally via setColliders)
    this.colliders = [];  // array of {minX, maxX, minY, maxY}
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

  update(dt, moveX, jumpJustPressed, jumpHeld) {
    dt = Math.min(dt, 1 / 30); // cap to avoid tunneling
    const pos = this.mesh.position;

    // Timers
    if (this.grounded) {
      this.timeSinceGround = 0;
    } else {
      this.timeSinceGround += dt * 1000;
    }

    if (jumpJustPressed) {
      this.jumpBufferTimer = 0;
    } else {
      this.jumpBufferTimer += dt * 1000;
    }

    // Jump (coyote + buffer)
    const canCoyote = this.timeSinceGround <= COYOTE_MS;
    const canBuffer = this.jumpBufferTimer <= JUMP_BUFFER_MS;
    if (canCoyote && canBuffer && !this.jumping) {
      this.vy = JUMP_VEL;
      this.jumping = true;
      this.jumpCutApplied = false;
      this.timeSinceGround = COYOTE_MS + 1; // consume coyote
      this.jumpBufferTimer = JUMP_BUFFER_MS + 1; // consume buffer
      this.grounded = false;
    }

    // Variable jump: cut upward velocity if released early
    if (this.jumping && !jumpHeld && this.vy > 0 && !this.jumpCutApplied) {
      this.vy *= JUMP_CUT_MULT;
      this.jumpCutApplied = true;
    }

    // Horizontal movement
    const accelVal = this.grounded
      ? (moveX !== 0 ? GROUND_ACCEL : GROUND_DECEL)
      : (moveX !== 0 ? AIR_ACCEL : AIR_DECEL);
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

      if (minOverlap === overlapBottom && this.vy <= 0) {
        // Landing on top
        pos.y = c.maxY + PLAYER_HALF_H;
        this.vy = 0;
        this.grounded = true;
        this.jumping = false;
      } else if (minOverlap === overlapTop && this.vy > 0) {
        // Hit ceiling
        pos.y = c.minY - PLAYER_HALF_H;
        this.vy = 0;
      } else if (minOverlap === overlapLeft) {
        pos.x = c.minX - PLAYER_HALF_W;
        this.vx = 0;
      } else if (minOverlap === overlapRight) {
        pos.x = c.maxX + PLAYER_HALF_W;
        this.vx = 0;
      }
    }

    // Fell off world — respawn
    if (pos.y < -10) {
      pos.x = -12;
      pos.y = 5;
      this.vx = 0;
      this.vy = 0;
    }
  }

  getPosition() {
    return this.mesh.position.clone();
  }
}
