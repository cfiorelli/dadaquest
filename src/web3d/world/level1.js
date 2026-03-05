export const LEVEL1 = {
  extents: { minX: -20, maxX: 33 },
  spawn: { x: -15.2, y: 1.205, z: 0 },
  goal: { x: 30.2, y: 5.3, z: 0 },
  checkpoints: [
    { x: 12.8, y: 5.1, z: 0, label: 'Midway' },
  ],
  ground: { x: 6.5, y: -0.75, z: 0, w: 58, h: 1.5, d: 14 },
  platforms: [
    { name: 'platStart', w: 8.2, h: 0.8, d: 5.0, x: -14.2, y: 0.4 },
    { name: 'platHop', w: 4.4, h: 0.7, d: 4.0, x: -8.1, y: 1.15 },
    { name: 'platVert1', w: 4.0, h: 0.8, d: 4.0, x: -2.1, y: 2.25 },
    { name: 'platVert2', w: 3.6, h: 0.8, d: 4.0, x: 2.4, y: 3.55 },
    { name: 'platBuff', w: 4.4, h: 0.8, d: 4.0, x: 7.0, y: 4.35 },
    { name: 'platBridge', w: 4.2, h: 0.7, d: 4.0, x: 11.2, y: 3.0 },
    { name: 'platSlipRun', w: 7.8, h: 0.8, d: 4.2, x: 17.2, y: 2.3 },
    { name: 'platStepUp', w: 4.8, h: 0.8, d: 4.1, x: 23.1, y: 3.35 },
    { name: 'platRoof', w: 7.6, h: 0.8, d: 5.0, x: 28.4, y: 4.35 },
  ],
  pickups: [
    {
      type: 'onesie',
      x: 7.2,
      y: 5.05,
      z: 0,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
    },
  ],
  hazards: [
    {
      type: 'slip',
      x: 17.2,
      y: 2.75,
      z: 0,
      width: 5.2,
      depth: 3.2,
      accelMultiplier: 0.75,
      decelMultiplier: 0.22,
    },
  ],
  signs: [
    { x: -10.6, y: 2.05, z: 1.6, direction: 1 },
    { x: 0.6, y: 4.6, z: 1.7, direction: 1 },
    { x: 20.8, y: 4.4, z: 1.7, direction: 1 },
  ],
  // 12 coins along the critical path.
  // Beat 1 (tutorial): gentle arcs on first platforms.
  // Beat 2 (challenge): near slip zone + optional risky coin above puddle.
  // Beat 3 (victory): reward trail to DaDa.
  coins: [
    { x: -14.8, y: 1.65, z: 0 },
    { x: -13.2, y: 1.95, z: 0 },
    { x: -10.4, y: 2.55, z: 0 },
    { x: -8.8,  y: 2.65, z: 0 },
    { x: -2.6,  y: 3.65, z: 0 },
    { x:  2.0,  y: 4.85, z: 0 },
    { x:  7.6,  y: 5.55, z: 0 },
    { x: 10.8,  y: 4.45, z: 0 },
    { x: 16.8,  y: 3.65, z: 0 },
    { x: 18.4,  y: 3.65, z: 0 },
    { x: 24.2,  y: 4.80, z: 0 },
    { x: 27.8,  y: 5.55, z: 0 },
  ],
};
