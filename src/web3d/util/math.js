/**
 * Linear interpolation.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Frame-rate-independent exponential damping.
 * smoothing = higher → faster convergence (e.g. 5–15).
 */
export function damp(current, target, smoothing, dt) {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}
