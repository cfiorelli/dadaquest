import * as BABYLON from '@babylonjs/core';
import { clamp, damp } from '../util/math.js';

function wrapToPi(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

function hashStringSeed(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class AnimalWanderController {
  constructor({
    root,
    home,
    surface,
    speed,
    turnSpeed,
    radius,
    phase = 0,
    bobAmp = 0.02,
    stepFreq = 7.2,
    pitchAmp = 0.02,
    rollAmp = 0.03,
    accel = 7.5,
    minWalkSpeed = 0.02,
    seed = '',
  }) {
    this.root = root;
    this.home = home.clone();
    this.surface = surface;
    this.speed = speed;
    this.turnSpeed = turnSpeed;
    this.radius = radius;
    this.phase = phase;
    this.bobAmp = bobAmp;
    this.stepFreq = stepFreq;
    this.pitchAmp = pitchAmp;
    this.rollAmp = rollAmp;
    this.accel = accel;
    this.minWalkSpeed = minWalkSpeed;

    this.pos = home.clone();
    this.target = home.clone();
    this.vel = BABYLON.Vector3.Zero();
    this.time = 0;
    this.yaw = root.rotation.y || 0;
    this.nextRetargetTime = 0;
    this.randState = hashStringSeed(seed || root.name || 'animal');

    this.root.rotationQuaternion = null;
    this.root.position.copyFrom(this.pos);
    this.root.rotation.y = this.yaw;
    this.pickTarget(true);
  }

  _random() {
    this.randState = (Math.imul(this.randState, 1664525) + 1013904223) >>> 0;
    return this.randState / 0x100000000;
  }

  _clampTarget(target) {
    return new BABYLON.Vector3(
      clamp(target.x, this.surface.minX, this.surface.maxX),
      this.surface.baseY,
      clamp(target.z, this.surface.minZ, this.surface.maxZ),
    );
  }

  pickTarget(immediate = false) {
    const angle = this._random() * Math.PI * 2;
    const radius = this.radius * (0.28 + (this._random() * 0.72));
    const rawTarget = new BABYLON.Vector3(
      this.home.x + (Math.cos(angle) * radius),
      this.surface.baseY,
      this.home.z + (Math.sin(angle) * radius),
    );
    this.target.copyFrom(this._clampTarget(rawTarget));
    this.nextRetargetTime = this.time + (immediate ? 0.8 : 1.5 + (this._random() * 2.0));
  }

  update(dt) {
    this.time += dt;

    let toTarget = this.target.subtract(this.pos);
    let dist = Math.sqrt((toTarget.x * toTarget.x) + (toTarget.z * toTarget.z));
    if (this.time >= this.nextRetargetTime || dist < 0.25) {
      this.pickTarget();
      toTarget = this.target.subtract(this.pos);
      dist = Math.sqrt((toTarget.x * toTarget.x) + (toTarget.z * toTarget.z));
    }

    let desiredVelX = 0;
    let desiredVelZ = 0;
    if (dist > 0.0001) {
      desiredVelX = (toTarget.x / dist) * this.speed;
      desiredVelZ = (toTarget.z / dist) * this.speed;
    }

    this.vel.x = damp(this.vel.x, desiredVelX, this.accel, dt);
    this.vel.z = damp(this.vel.z, desiredVelZ, this.accel, dt);

    const nextPos = this._clampTarget(new BABYLON.Vector3(
      this.pos.x + (this.vel.x * dt),
      this.surface.baseY,
      this.pos.z + (this.vel.z * dt),
    ));
    if (nextPos.x !== this.pos.x + (this.vel.x * dt)) this.vel.x *= 0.35;
    if (nextPos.z !== this.pos.z + (this.vel.z * dt)) this.vel.z *= 0.35;
    this.pos.copyFrom(nextPos);

    const planarSpeed = Math.sqrt((this.vel.x * this.vel.x) + (this.vel.z * this.vel.z));
    const moving = planarSpeed > this.minWalkSpeed;
    if (moving) {
      const desiredYaw = Math.atan2(this.vel.x, this.vel.z);
      const delta = wrapToPi(desiredYaw - this.yaw);
      this.yaw += delta * clamp(dt * this.turnSpeed, 0, 1);
    }

    const walkWave = Math.sin((this.time * this.stepFreq) + this.phase);
    const bob = moving
      ? walkWave * this.bobAmp
      : Math.sin((this.time * 2.1) + this.phase) * this.bobAmp * 0.2;
    const pitchTarget = moving ? walkWave * this.pitchAmp : 0;
    const rollTarget = moving ? Math.cos((this.time * this.stepFreq) + this.phase) * this.rollAmp : 0;

    this.root.rotationQuaternion = null;
    this.root.position.set(this.pos.x, this.surface.baseY + bob, this.pos.z);
    this.root.rotation.y = this.yaw;
    this.root.rotation.x = damp(this.root.rotation.x, pitchTarget, 10, dt);
    this.root.rotation.z = damp(this.root.rotation.z, rollTarget, 10, dt);

    return { moving, planarSpeed };
  }
}
