// Shared movement-feel constants — referenced by PlayerBaby and PlayerDepth.
// Keep all gameplay timings in one place.

export const COYOTE_MS = 120;
export const JUMP_BUFFER_MS = 120;

// Jump cut applied when player releases jump button early.
// FACTOR is the velocity multiplier (lower = snappier variable height).
// MIN_SPEED is the minimum upward speed (abs) before the cut can fire —
// prevents a cut from triggering at the natural apex.
export const JUMP_CUT_FACTOR = 0.45;
export const JUMP_CUT_MIN_SPEED = 40;

// Velocity multiplier bonus applied when reversing horizontal direction.
export const TURN_ACCEL_BOOST = 1.28;
