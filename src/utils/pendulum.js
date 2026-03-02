// Simple pendulum simulation
// anchor: {x, y}, length: number, angle: radians from vertical, angleVel: rad/s
export class Pendulum {
  constructor(anchorX, anchorY, length, angle = 0) {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.length = length;
    this.angle = angle;       // radians from vertical (0 = hanging straight down)
    this.angleVel = 0;
    this.gravity = 9.8;
    this.damping = 0.995;
  }

  update(dt) {
    // dt in seconds
    const accel = -(this.gravity / this.length) * Math.sin(this.angle);
    this.angleVel += accel * dt;
    this.angleVel *= this.damping;
    this.angle += this.angleVel * dt;
  }

  applyTorque(torque) {
    this.angleVel += torque;
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
