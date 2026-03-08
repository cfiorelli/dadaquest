export const LANE_Z5 = 0;

const L = LANE_Z5;

export const LEVEL5 = {
  totalCollectibles: 18,
  extents: { minX: -28, maxX: 132 },
  spawn: { x: -22.0, y: 1.2, z: L },
  goal: { x: 126.2, y: 11.1, z: L },

  acts: [
    { id: 'A', label: 'Entry Tunnel', range: [-28, 18], jellyfishCount: 1 },
    { id: 'B', label: 'Kelp Forest', range: [18, 58], jellyfishCount: 3 },
    { id: 'C', label: 'Glass Cylinder Climb', range: [58, 92], jellyfishCount: 2 },
    { id: 'D', label: 'Open Tank Finale', range: [92, 132], jellyfishCount: 3 },
  ],

  checkpoints: [
    { x: 14.5, y: 2.9, z: L, label: 'Current Gate' },
    { x: 52.5, y: 4.85, z: L, label: 'Kelp Heart' },
    { x: 87.8, y: 8.95, z: L, label: 'Pressure Ring' },
  ],

  ground: { x: 52, y: -0.75, z: L, w: 172, h: 1.5, d: 14 },

  platforms: [
    { name: 'entryStart', x: -21.0, y: 0.45, z: L, w: 8.0, h: 0.8, d: 5.2 },
    { name: 'entryJet1', x: -13.4, y: 1.45, z: L, w: 4.8, h: 0.72, d: 4.4 },
    { name: 'entryJet2', x: -6.4, y: 2.05, z: L, w: 4.6, h: 0.72, d: 4.2 },
    { name: 'entryJet3', x: 1.4, y: 2.55, z: L, w: 5.0, h: 0.74, d: 4.4 },
    { name: 'entryExit', x: 10.8, y: 2.95, z: L, w: 6.4, h: 0.8, d: 4.8 },

    { name: 'kelpStep1', x: 21.8, y: 3.55, z: L, w: 5.4, h: 0.78, d: 4.6 },
    { name: 'kelpStep2', x: 30.8, y: 4.15, z: L, w: 5.0, h: 0.78, d: 4.4 },
    { name: 'kelpStep3', x: 39.6, y: 4.55, z: L, w: 5.0, h: 0.78, d: 4.4 },
    { name: 'kelpStep4', x: 48.8, y: 4.95, z: L, w: 5.8, h: 0.8, d: 4.8 },

    { name: 'cylinderBase', x: 60.8, y: 5.65, z: L, w: 5.6, h: 0.8, d: 4.6 },
    { name: 'cylinderLift1', x: 69.6, y: 6.75, z: L, w: 4.8, h: 0.76, d: 4.2 },
    { name: 'cylinderLift2', x: 77.4, y: 7.95, z: L, w: 4.8, h: 0.76, d: 4.2 },
    { name: 'cylinderLift3', x: 85.0, y: 8.95, z: L, w: 5.0, h: 0.78, d: 4.4 },

    { name: 'finalRun1', x: 96.5, y: 9.45, z: L, w: 5.8, h: 0.8, d: 4.8 },
    { name: 'finalRun2', x: 105.8, y: 9.85, z: L, w: 5.2, h: 0.78, d: 4.6 },
    { name: 'finalRun3', x: 114.8, y: 10.35, z: L, w: 5.2, h: 0.78, d: 4.6 },
    { name: 'goalDeck', x: 124.2, y: 10.75, z: L, w: 8.4, h: 0.86, d: 5.4 },
  ],

  coins: [
    { x: -21.6, y: 1.95, z: L }, { x: -13.4, y: 2.85, z: L }, { x: -6.2, y: 3.45, z: L }, { x: 3.0, y: 3.95, z: L },
    { x: 20.8, y: 4.65, z: L }, { x: 29.6, y: 5.25, z: L }, { x: 37.8, y: 5.55, z: L }, { x: 46.2, y: 5.85, z: L }, { x: 54.0, y: 6.15, z: L },
    { x: 60.5, y: 6.85, z: L }, { x: 64.4, y: 7.35, z: L }, { x: 69.4, y: 8.05, z: L }, { x: 74.0, y: 8.75, z: L },
    { x: 95.8, y: 10.25, z: L }, { x: 103.6, y: 10.55, z: L }, { x: 111.4, y: 10.95, z: L }, { x: 118.8, y: 11.15, z: L }, { x: 124.6, y: 11.55, z: L },
  ],

  currents: [
    { name: 'currentA1', x: -12.0, y: 1.9, z: L, w: 5.0, h: 2.6, d: 4.2, pushX: 6.0 },
    { name: 'currentA2', x: -1.4, y: 2.4, z: L, w: 5.6, h: 2.8, d: 4.2, pushX: -5.2 },
    { name: 'currentD1', x: 98.8, y: 9.9, z: L, w: 5.4, h: 3.1, d: 4.4, pushX: 6.8 },
    { name: 'currentD2', x: 108.2, y: 10.2, z: L, w: 5.4, h: 3.1, d: 4.4, pushX: -5.8 },
  ],

  eelRails: [
    { name: 'eelRailB', x1: 34.2, y1: 3.9, x2: 37.8, y2: 6.1, z: L, phaseOffset: 0.0 },
    { name: 'eelRailC1', x1: 66.0, y1: 5.7, x2: 69.0, y2: 8.1, z: L, phaseOffset: 0.35 },
    { name: 'eelRailC2', x1: 80.2, y1: 6.9, x2: 83.8, y2: 9.6, z: L, phaseOffset: 0.7 },
  ],

  vents: [
    { name: 'ventC1', x: 64.6, y: 6.15, z: L, w: 1.8, h: 3.4, liftVy: 16.5, phaseOffset: 0.0 },
    { name: 'ventC2', x: 76.6, y: 7.45, z: L, w: 1.8, h: 3.8, liftVy: 17.2, phaseOffset: 0.45 },
    { name: 'ventD1', x: 101.8, y: 10.0, z: L, w: 2.0, h: 3.8, liftVy: 16.4, phaseOffset: 0.2 },
  ],

  jellyfish: [
    { name: 'jellyA1', x: 8.4, y: 2.8, z: 0.2, bounds: { minX: 5.8, maxX: 11.0, minY: 2.0, maxY: 4.1, minZ: -0.3, maxZ: 0.5 }, speed: 0.8, turnSpeed: 2.2, act: 'A' },
    { name: 'jellyB1', x: 24.6, y: 4.2, z: 0.3, bounds: { minX: 21.2, maxX: 27.8, minY: 3.2, maxY: 5.6, minZ: -0.5, maxZ: 0.6 }, speed: 1.05, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyB2', x: 34.8, y: 4.8, z: -0.2, bounds: { minX: 31.6, maxX: 38.4, minY: 3.6, maxY: 6.1, minZ: -0.6, maxZ: 0.5 }, speed: 1.0, turnSpeed: 2.2, act: 'B' },
    { name: 'jellyB3', x: 45.6, y: 5.2, z: 0.4, bounds: { minX: 42.8, maxX: 49.8, minY: 4.0, maxY: 6.6, minZ: -0.4, maxZ: 0.7 }, speed: 1.1, turnSpeed: 2.4, act: 'B' },
    { name: 'jellyC1', x: 71.0, y: 7.1, z: 0.2, bounds: { minX: 67.4, maxX: 74.4, minY: 6.0, maxY: 8.9, minZ: -0.5, maxZ: 0.6 }, speed: 1.15, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyC2', x: 84.4, y: 8.4, z: -0.2, bounds: { minX: 80.6, maxX: 87.8, minY: 7.0, maxY: 9.7, minZ: -0.6, maxZ: 0.4 }, speed: 1.15, turnSpeed: 2.6, act: 'C' },
    { name: 'jellyD1', x: 98.8, y: 10.2, z: 0.4, bounds: { minX: 95.8, maxX: 102.0, minY: 9.0, maxY: 11.8, minZ: -0.4, maxZ: 0.8 }, speed: 1.15, turnSpeed: 2.6, act: 'D' },
    { name: 'jellyD2', x: 110.4, y: 10.5, z: -0.2, bounds: { minX: 106.8, maxX: 113.8, minY: 9.2, maxY: 12.0, minZ: -0.7, maxZ: 0.4 }, speed: 1.2, turnSpeed: 2.7, act: 'D' },
    { name: 'jellyD3', x: 119.0, y: 10.9, z: 0.3, bounds: { minX: 116.0, maxX: 122.4, minY: 9.8, maxY: 12.4, minZ: -0.3, maxZ: 0.7 }, speed: 1.12, turnSpeed: 2.5, act: 'D' },
  ],

  sharkSweep: {
    name: 'sharkSweepFinale',
    xMin: 103.0,
    xMax: 121.6,
    y: 10.6,
    z: L,
    width: 3.2,
    height: 2.4,
    phaseOffset: 0.25,
  },
};
