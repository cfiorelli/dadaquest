import { clamp } from '../util/math.js';

const WALK_SPEED_REF = 6.4;
const JUMP_TAKEOFF_SEC = 0.12;
const LAND_RECOVER_SEC = 0.30;

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

export class BabyAnimationController {
  constructor({ rig, enabled = true }) {
    this.rig = rig;
    this.enabled = !!enabled;

    this.time = 0;
    this.walkPhase = 0;
    this.takeoffTimer = 0;
    this.landTimer = 0;
    this.winActive = false;
    this.winTimer = 0;

    this.base = {
      rootPosY: rig.root.position.y,
      rootScale: rig.root.scaling.clone(),
      bodyPosY: rig.bodyPivot.position.y,
      bodyRotZ: rig.bodyPivot.rotation.z,
      headPosY: rig.headPivot.position.y,
      headRotZ: rig.headPivot.rotation.z,
      armLRotZ: rig.armLPivot.rotation.z,
      armRRotZ: rig.armRPivot.rotation.z,
      legLRotX: rig.legLPivot.rotation.x,
      legRRotX: rig.legRPivot.rotation.x,
    };
  }

  resetPose() {
    const b = this.base;
    this.rig.root.position.y = b.rootPosY;
    this.rig.root.scaling.copyFrom(b.rootScale);
    this.rig.bodyPivot.position.y = b.bodyPosY;
    this.rig.bodyPivot.rotation.z = b.bodyRotZ;
    this.rig.headPivot.position.y = b.headPosY;
    this.rig.headPivot.rotation.z = b.headRotZ;
    this.rig.armLPivot.rotation.z = b.armLRotZ;
    this.rig.armRPivot.rotation.z = b.armRRotZ;
    this.rig.legLPivot.rotation.x = b.legLRotX;
    this.rig.legRPivot.rotation.x = b.legRRotX;
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled) {
      this.resetPose();
    }
  }

  onJump() {
    this.takeoffTimer = JUMP_TAKEOFF_SEC;
  }

  onLand() {
    this.landTimer = LAND_RECOVER_SEC;
  }

  setWinActive(active) {
    const next = !!active;
    if (next !== this.winActive) {
      this.winTimer = 0;
    }
    this.winActive = next;
    if (!next) {
      this.resetPose();
    }
  }

  update(dt, { vx = 0, grounded = true } = {}) {
    if (!this.enabled) {
      this.resetPose();
      return;
    }

    this.time += dt;
    this.takeoffTimer = Math.max(0, this.takeoffTimer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);

    const speedNorm = clamp(Math.abs(vx) / WALK_SPEED_REF, 0, 1.15);
    const moveSign = Math.sign(vx || 0);
    const bodyLean = clamp(vx / WALK_SPEED_REF, -1, 1) * 0.07;

    if (speedNorm > 0.04) {
      this.walkPhase += dt * lerp(4.5, 10.2, clamp(speedNorm, 0, 1));
    } else {
      this.walkPhase += dt * 2.2;
    }

    let rootY = this.base.rootPosY;
    let bodyY = this.base.bodyPosY;
    let headY = this.base.headPosY;
    let sx = 1;
    let sy = 1;
    let sz = 1;
    let armSwing = 0;
    let legSwing = 0;
    let headTilt = 0;

    if (this.winActive) {
      this.winTimer += dt;
      const bounce = Math.max(0, Math.sin(this.winTimer * 8.0)) * 0.05;
      rootY += bounce;
      sy *= 1 + (bounce * 0.16);
      sx *= 1 - (bounce * 0.08);
      sz *= 1 - (bounce * 0.08);
      const wave = Math.sin(this.winTimer * 11.0) * 0.26;
      this.rig.armRPivot.rotation.z = this.base.armRRotZ + 0.64 + wave;
      this.rig.armLPivot.rotation.z = this.base.armLRotZ - 0.08;
      this.rig.legLPivot.rotation.x = this.base.legLRotX + Math.sin(this.winTimer * 7.0) * 0.08;
      this.rig.legRPivot.rotation.x = this.base.legRRotX - Math.sin(this.winTimer * 7.0) * 0.08;
    } else if (grounded) {
      const idleBreath = speedNorm < 0.08 ? Math.sin(this.time * 2.3) * 0.012 : 0;
      const walkBob = speedNorm > 0.05
        ? Math.abs(Math.sin(this.walkPhase)) * (0.026 * clamp(speedNorm, 0, 1))
        : 0;
      rootY += idleBreath + walkBob;
      headY += idleBreath * 0.4;
      bodyY += idleBreath * 0.2;
      armSwing = speedNorm > 0.05 ? Math.sin(this.walkPhase) * 0.34 * speedNorm : 0;
      legSwing = speedNorm > 0.05 ? Math.sin(this.walkPhase) * 0.36 * speedNorm : 0;
      headTilt = moveSign * 0.02 * speedNorm;
      this.rig.armLPivot.rotation.z = this.base.armLRotZ + armSwing;
      this.rig.armRPivot.rotation.z = this.base.armRRotZ - armSwing;
      this.rig.legLPivot.rotation.x = this.base.legLRotX - legSwing;
      this.rig.legRPivot.rotation.x = this.base.legRRotX + legSwing;
    } else {
      rootY -= 0.01;
      sy *= 1.02;
      sx *= 0.98;
      sz *= 0.98;
      this.rig.armLPivot.rotation.z = this.base.armLRotZ - 0.18;
      this.rig.armRPivot.rotation.z = this.base.armRRotZ + 0.18;
      this.rig.legLPivot.rotation.x = this.base.legLRotX + 0.14;
      this.rig.legRPivot.rotation.x = this.base.legRRotX + 0.14;
    }

    if (this.takeoffTimer > 0) {
      const p = 1 - (this.takeoffTimer / JUMP_TAKEOFF_SEC);
      if (p < 0.46) {
        const t = p / 0.46;
        sx *= lerp(1.00, 1.10, t);
        sz *= lerp(1.00, 1.08, t);
        sy *= lerp(1.00, 0.90, t);
      } else {
        const t = (p - 0.46) / 0.54;
        sx *= lerp(1.10, 0.97, t);
        sz *= lerp(1.08, 0.97, t);
        sy *= lerp(0.90, 1.09, t);
      }
    }

    if (this.landTimer > 0) {
      const p = 1 - (this.landTimer / LAND_RECOVER_SEC);
      if (p < 0.38) {
        const t = p / 0.38;
        sx *= lerp(1.0, 1.11, t);
        sz *= lerp(1.0, 1.11, t);
        sy *= lerp(1.0, 0.88, t);
      } else {
        const t = (p - 0.38) / 0.62;
        sx *= lerp(1.11, 1.0, t);
        sz *= lerp(1.11, 1.0, t);
        sy *= lerp(0.88, 1.0, t);
      }
    }

    this.rig.root.position.y = rootY;
    this.rig.root.scaling.set(
      this.base.rootScale.x * sx,
      this.base.rootScale.y * sy,
      this.base.rootScale.z * sz,
    );
    this.rig.bodyPivot.position.y = bodyY;
    this.rig.bodyPivot.rotation.z = this.base.bodyRotZ + bodyLean;
    this.rig.headPivot.position.y = headY;
    this.rig.headPivot.rotation.z = this.base.headRotZ + (bodyLean * 0.56) + headTilt;
  }
}
