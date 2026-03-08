import * as BABYLON from '@babylonjs/core';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function normalizeRange(value, fallbackMin, fallbackMax) {
  if (Array.isArray(value)) {
    return {
      min: Number.isFinite(value[0]) ? value[0] : fallbackMin,
      max: Number.isFinite(value[1]) ? value[1] : fallbackMax,
    };
  }
  if (value && Number.isFinite(value.min) && Number.isFinite(value.max)) {
    return { min: value.min, max: value.max };
  }
  if (Number.isFinite(value)) {
    return { min: value, max: value };
  }
  return { min: fallbackMin, max: fallbackMax };
}

function createSeededRandom(seed = 0x5f3759df) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hashString(input = '') {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sampleRange(random, range) {
  if (!range) return 0;
  if (Math.abs(range.max - range.min) < 0.0001) return range.min;
  return range.min + ((range.max - range.min) * random());
}

export class NoiseWanderMover {
  constructor({
    root,
    bounds,
    speed = 1.2,
    turnSpeed = 2.2,
    retargetEvery = [1.4, 2.8],
    bobAmp = 0.18,
    bobFreq = 1.8,
    pauseChance = 0.18,
    pauseRange = [0.25, 0.7],
    seed,
  } = {}) {
    this.root = root;
    this.bounds = bounds || {
      minX: root?.position?.x ?? 0,
      maxX: root?.position?.x ?? 0,
      minY: root?.position?.y ?? 0,
      maxY: root?.position?.y ?? 0,
      minZ: root?.position?.z ?? 0,
      maxZ: root?.position?.z ?? 0,
    };
    this.baseSpeed = speed;
    this.turnSpeed = turnSpeed;
    this.retargetRange = normalizeRange(retargetEvery, 1.4, 2.8);
    this.pauseRange = normalizeRange(pauseRange, 0.2, 0.6);
    this.pauseChance = clamp01(pauseChance);
    this.bobAmp = bobAmp;
    this.bobFreq = bobFreq;
    this.seed = Number.isFinite(seed) ? seed : hashString(root?.name || 'noiseMover');
    this.random = createSeededRandom(this.seed);
    this.time = 0;
    this.pauseTimer = 0;
    this.retargetTimer = 0;
    this.velocity = new BABYLON.Vector3(0, 0, 0);
    this.target = new BABYLON.Vector3(
      root?.position?.x ?? 0,
      root?.position?.y ?? 0,
      root?.position?.z ?? 0,
    );
    this.basePosition = root?.position?.clone?.() || BABYLON.Vector3.Zero();
    this.noisePhase = this.random() * Math.PI * 2;
    this.reset();
  }

  _pickTarget() {
    return new BABYLON.Vector3(
      sampleRange(this.random, { min: this.bounds.minX, max: this.bounds.maxX }),
      sampleRange(this.random, { min: this.bounds.minY, max: this.bounds.maxY }),
      sampleRange(this.random, { min: this.bounds.minZ, max: this.bounds.maxZ }),
    );
  }

  _retarget(forcePauseRoll = false) {
    this.target = this._pickTarget();
    this.retargetTimer = sampleRange(this.random, this.retargetRange);
    const shouldPause = forcePauseRoll || this.random() < this.pauseChance;
    if (shouldPause) {
      this.pauseTimer = sampleRange(this.random, this.pauseRange);
    }
  }

  reset() {
    if (!this.root) return;
    this.root.position.copyFrom(this.basePosition);
    this.velocity.set(0, 0, 0);
    this.time = 0;
    this.pauseTimer = 0;
    this._retarget(false);
  }

  update(dt) {
    if (!this.root) return;
    this.time += dt;

    const current = this.root.position.clone();
    const bobOffset = Math.sin((this.time * this.bobFreq) + this.noisePhase) * this.bobAmp;
    const alivePulse = 0.68 + (Math.sin((this.time * 1.7) + this.noisePhase * 0.7) * 0.16);

    if (this.pauseTimer > 0) {
      this.pauseTimer = Math.max(0, this.pauseTimer - dt);
      this.velocity.scaleInPlace(Math.max(0, 1 - (dt * 6.5)));
    } else {
      this.retargetTimer -= dt;
      const toTarget = this.target.subtract(current);
      const planarDistance = Math.sqrt((toTarget.x ** 2) + (toTarget.z ** 2));
      if (this.retargetTimer <= 0 || planarDistance < 0.6) {
        this._retarget(true);
      }

      const drift = new BABYLON.Vector3(
        Math.sin((this.time * 0.8) + this.noisePhase) * 0.42,
        Math.sin((this.time * 1.2) + this.noisePhase * 1.7) * 0.18,
        Math.cos((this.time * 0.65) + this.noisePhase * 0.83) * 0.36,
      );
      const desiredDir = this.target.subtract(current).add(drift);
      if (desiredDir.lengthSquared() > 0.0001) {
        desiredDir.normalize();
      }
      const desiredVelocity = desiredDir.scale(this.baseSpeed * Math.max(0.35, alivePulse));
      const turnAlpha = clamp01(this.turnSpeed * dt);
      this.velocity = BABYLON.Vector3.Lerp(this.velocity, desiredVelocity, turnAlpha);
      current.addInPlace(this.velocity.scale(dt));
    }

    current.x = clamp(current.x, this.bounds.minX, this.bounds.maxX);
    current.y = clamp(current.y, this.bounds.minY, this.bounds.maxY);
    current.z = clamp(current.z, this.bounds.minZ, this.bounds.maxZ);

    const bobbedY = clamp(
      current.y + bobOffset,
      this.bounds.minY,
      this.bounds.maxY,
    );
    this.root.position.set(current.x, bobbedY, current.z);

    const facingVelocity = new BABYLON.Vector3(this.velocity.x, 0, this.velocity.z);
    if (facingVelocity.lengthSquared() > 0.01) {
      this.root.rotation.y = Math.atan2(facingVelocity.x, facingVelocity.z) + (Math.PI * 0.5);
    }
  }
}
