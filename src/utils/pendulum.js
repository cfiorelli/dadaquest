// Simple pendulum simulation
// anchor: {x, y}, length: number, angle: radians from vertical, angleVel: rad/s
export class Pendulum {
  constructor(anchorX, anchorY, length, angle = 0) {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.length = length;
    this.angle = angle;       // radians from vertical (0 = hanging straight down)
    this.angleVel = 0;
    this.gravity = 12.2;
    this.angularDrag = 0.14;
    this.maxAngularVel = 4.8;
  }

  update(dt) {
    // dt in seconds
    const restoring = -(this.gravity / this.length) * Math.sin(this.angle);
    const damping = -this.angularDrag * this.angleVel;
    const accel = restoring + damping;
    this.angleVel += accel * dt;
    this.angleVel = Math.max(-this.maxAngularVel, Math.min(this.maxAngularVel, this.angleVel));
    this.angle += this.angleVel * dt;

    // Avoid "sticking" at non-zero angle due to tiny velocities.
    if (Math.abs(this.angleVel) < 0.002 && Math.abs(this.angle) > 0.004) {
      this.angleVel += -Math.sign(this.angle) * 0.01 * dt;
    }
  }

  applyTorque(torque) {
    this.angleVel += torque;
    this.angleVel = Math.max(-this.maxAngularVel, Math.min(this.maxAngularVel, this.angleVel));
  }

  getBobX() {
    return this.anchorX + Math.sin(this.angle) * this.length;
  }

  getBobY() {
    return this.anchorY + Math.cos(this.angle) * this.length;
  }

  // Velocity of bob in world space
  getBobVelX() {
    return this.angleVel * this.length * Math.cos(this.angle);
  }

  getBobVelY() {
    return this.angleVel * this.length * -Math.sin(this.angle);
  }
}
