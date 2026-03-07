export const LANE_Z4 = 0;

const L = LANE_Z4;

export const LEVEL4 = {
  extents: { minX: -24, maxX: 88 },
  spawn: { x: -18.0, y: 1.2, z: L },
  goal: { x: 79.5, y: 13.2, z: L },

  checkpoints: [
    { x: 10.8, y: 6.1, z: L, label: 'Starter Jar' },
    { x: 39.8, y: 9.15, z: L, label: 'Conveyor' },
    { x: 61.8, y: 12.1, z: L, label: 'Oven Mouth' },
  ],

  ground: { x: 32, y: -0.75, z: L, w: 118, h: 1.5, d: 14 },

  platforms: [
    { name: 'starterBase', x: -17.2, y: 0.45, w: 8.4, h: 0.9, d: 5.4 },
    { name: 'jarStep1', x: -10.4, y: 2.25, w: 4.0, h: 0.75, d: 4.4 },
    { name: 'jarStep2', x: -3.4, y: 3.95, w: 4.0, h: 0.75, d: 4.2 },
    { name: 'jarStep3', x: 3.2, y: 5.25, w: 4.3, h: 0.8, d: 4.4 },
    { name: 'jarStep4', x: 10.8, y: 5.45, w: 5.4, h: 0.82, d: 4.8 },

    { name: 'conveyorStart', x: 18.4, y: 6.35, w: 5.0, h: 0.82, d: 4.6 },
    { name: 'conveyorMid', x: 28.6, y: 7.35, w: 4.0, h: 0.78, d: 4.2 },
    { name: 'conveyorBridge', x: 39.8, y: 8.55, w: 5.2, h: 0.82, d: 4.6 },

    { name: 'ovenEntry', x: 49.0, y: 9.45, w: 4.8, h: 0.82, d: 4.4 },
    { name: 'ovenRise1', x: 56.4, y: 10.75, w: 4.0, h: 0.78, d: 4.0 },
    { name: 'ovenRise2', x: 63.8, y: 11.75, w: 4.0, h: 0.78, d: 4.0 },
    { name: 'ovenRise3', x: 70.4, y: 12.45, w: 4.2, h: 0.8, d: 4.2 },
    { name: 'goalLoaf', x: 79.4, y: 12.85, w: 8.4, h: 0.88, d: 5.4 },
  ],

  pickups: [
    {
      type: 'onesie',
      x: 28.6,
      y: 8.45,
      z: L,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.22,
    },
  ],

  coins: [
    { x: -18.0, y: 1.95, z: L },
    { x: -11.0, y: 3.65, z: L },
    { x: -4.0, y: 5.25, z: L },
    { x: 3.2, y: 6.35, z: L },
    { x: 10.8, y: 6.65, z: L },
    { x: 18.4, y: 7.45, z: L },
    { x: 25.6, y: 8.35, z: L },
    { x: 32.4, y: 8.95, z: L },
    { x: 39.8, y: 9.65, z: L },
    { x: 49.0, y: 10.65, z: L },
    { x: 60.2, y: 12.05, z: L },
    { x: 69.0, y: 12.85, z: L },
  ],

  heatGates: [
    { name: 'heatA', x: 52.2, y: 10.25, z: L, width: 1.2, height: 2.2, onMs: 1000, offMs: 1100, phaseMs: 0 },
    { name: 'heatB', x: 66.8, y: 12.0, z: L, width: 1.2, height: 2.4, onMs: 1000, offMs: 1100, phaseMs: 420 },
  ],

  flourPuff: {
    cooldownMs: 6000,
    impulseY: 8.6,
  },

  conveyors: [
    {
      name: 'beltA',
      x: 24.2,
      y: 6.95,
      z: L,
      w: 4.1,
      h: 0.55,
      d: 4.2,
      minX: 22.1,
      maxX: 27.0,
      speed: 1.55,
    },
    {
      name: 'beltB',
      x: 33.4,
      y: 7.95,
      z: L,
      w: 4.1,
      h: 0.55,
      d: 4.0,
      minX: 31.2,
      maxX: 36.1,
      speed: -1.75,
    },
  ],
};
