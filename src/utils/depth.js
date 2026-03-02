import Phaser from 'phaser';

export const SHEAR_X = -0.22;
export const DEPTH_Y = -0.30;
export const BASE_Y = 470;
export const Z_MIN = 0;
export const Z_MAX = 220;
export const SCALE_NEAR = 1.22;
export const SCALE_FAR = 0.82;

export const PLAYER_RADIUS_X = 14;
export const PLAYER_RADIUS_Z = 8;

export const MOVE_SPEED = 120;
export const AIR_CONTROL = 0.82;
export const JUMP_VEL = 315;
export const GRAVITY = 840;
export const MAX_FALL = 640;
export const COYOTE_MS = 120;
export const JUMP_BUFFER_MS = 120;

export function projectWorldToScreen(wx, wz, wy = 0) {
  return {
    x: wx + wz * SHEAR_X,
    y: BASE_Y + wz * DEPTH_Y - wy,
  };
}

export function depthScale(wz) {
  const t = Phaser.Math.Clamp((wz - Z_MIN) / (Z_MAX - Z_MIN), 0, 1);
  return Phaser.Math.Linear(SCALE_NEAR, SCALE_FAR, t);
}

export function overlapsFootprint(wx, wz, rx, rz, rect) {
  const dx = Math.abs(wx - rect.x);
  const dz = Math.abs(wz - rect.z);
  const px = rx + rect.w / 2 - dx;
  const pz = rz + rect.d / 2 - dz;
  return px > 0 && pz > 0;
}

export function resolveFootprint(wx, wz, rx, rz, rect) {
  const dx = wx - rect.x;
  const dz = wz - rect.z;
  const ox = rx + rect.w / 2 - Math.abs(dx);
  const oz = rz + rect.d / 2 - Math.abs(dz);
  if (ox <= 0 || oz <= 0) return { wx, wz, hit: false };

  if (ox < oz) {
    return {
      wx: rect.x + (dx < 0 ? -1 : 1) * (rx + rect.w / 2),
      wz,
      hit: true,
    };
  }
  return {
    wx,
    wz: rect.z + (dz < 0 ? -1 : 1) * (rz + rect.d / 2),
    hit: true,
  };
}
