import { compileAuthoredEraLayout } from './eraAuthoredLayout.js';

function surface(id, offsetX, offsetZ, w, d, surfaceType, extra = {}) {
  return {
    id,
    offsetX,
    offsetZ,
    w,
    d,
    h: extra.h ?? 0.52,
    surfaceType,
    ...extra,
  };
}

function block(name, x, y, z, w, h, d, extra = {}) {
  return {
    name,
    x,
    y,
    z,
    w,
    h,
    d,
    ...extra,
  };
}

const LEVEL5_CAMERA_PRESETS = {
  standard: {
    id: 'standard',
    label: 'Standard',
    distance: 6.4,
    height: 3.2,
    focusHeight: 1.08,
    lookAhead: 2.8,
    fov: 0.96,
  },
  closer: {
    id: 'closer',
    label: 'Closer Over-Shoulder',
    distance: 5.2,
    height: 2.8,
    focusHeight: 1.06,
    lookAhead: 2.2,
    fov: 1.0,
  },
};

const ROOM_WIDTH = 48.0;
const ROOM_DEPTH = 36.0;
const ROOM_HEIGHT = 6.0;
const WALL_THICKNESS = 0.5;
const FLOOR_THICKNESS = 0.75;
const CEILING_THICKNESS = 0.5;
const DOOR_WIDTH = 4.0;
const DOOR_HEIGHT = 3.2;

const ROOM_CENTER_X = ROOM_WIDTH * 0.5;
const ROOM_CENTER_Z = ROOM_DEPTH * 0.5;
const EAST_WALL_X = ROOM_WIDTH + (WALL_THICKNESS * 0.5);
const EAST_SIDE_DEPTH = (ROOM_DEPTH - DOOR_WIDTH) * 0.5;
const EAST_SIDE_OFFSET_Z = (DOOR_WIDTH * 0.5) + (EAST_SIDE_DEPTH * 0.5);
const PLAYER_SPAWN_Y = 0.42;

export const LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 0,
  extents: {
    minX: -WALL_THICKNESS,
    maxX: ROOM_WIDTH + WALL_THICKNESS,
    minZ: -WALL_THICKNESS,
    maxZ: ROOM_DEPTH + WALL_THICKNESS,
  },
  spawnYaw: Math.PI * 0.5,
  defaultCameraPreset: 'closer',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  spawn: { x: 4.0, y: PLAYER_SPAWN_Y, z: ROOM_CENTER_Z },
  goal: { x: 80.0, y: PLAYER_SPAWN_Y, z: 9.0 },
  goalPresentation: 'trigger-only',
  theme: 'neutral',
  showGroundVisual: false,
  showRouteRibbons: false,
  disableDecorOcclusionFade: true,
  respawnAnchors: [
    {
      id: 'level5_spawn_anchor',
      label: 'Start',
      x: 4.0,
      y: PLAYER_SPAWN_Y,
      z: ROOM_CENTER_Z,
      spaceId: 'starter_room',
      allowedReason: 'spawn',
    },
    {
      id: 'pool_edge',
      label: 'Pool Edge',
      x: 27.0,
      y: PLAYER_SPAWN_Y,
      z: 30.0,
      spaceId: 'starter_room',
      allowedReason: 'pool_hazard',
    },
  ],
  acts: [
    { id: 'A', label: 'Starter Room', range: [0, ROOM_WIDTH] },
  ],
  authoredMap: {
    id: 'level5-room-reset',
    startSector: 'starter_room',
    goalSector: 'starter_room',
    sectors: [
      {
        id: 'starter_room',
        label: 'Starter Room',
        x: ROOM_CENTER_X,
        z: ROOM_CENTER_Z,
        w: ROOM_WIDTH,
        d: ROOM_DEPTH,
        floorY: 0.0,
        ceilingY: ROOM_HEIGHT,
        floorSurfaceType: 'starter_room_floor',
        wallLanguage: 'starter_shell',
        landmarks: ['future exit'],
        shell: false,
        surfaces: [
          // ── Deck floor (4 sections carved around pool footprint x=[28,44] z=[26,34]) ──
          surface('floor_north', 0, -5, ROOM_WIDTH, 26, 'starter_room_floor', {
            floorY: 0.0, h: FLOOR_THICKNESS, walkableClassification: 'room-floor', roomSurface: true,
          }),
          surface('floor_south', 0, 17, ROOM_WIDTH, 2, 'starter_room_floor', {
            floorY: 0.0, h: FLOOR_THICKNESS, walkableClassification: 'room-floor', roomSurface: true,
          }),
          surface('floor_west', -10, 12, 28, 8, 'starter_room_floor', {
            floorY: 0.0, h: FLOOR_THICKNESS, walkableClassification: 'room-floor', roomSurface: true,
          }),
          surface('floor_east', 22, 12, 4, 8, 'starter_room_floor', {
            floorY: 0.0, h: FLOOR_THICKNESS, walkableClassification: 'room-floor', roomSurface: true,
          }),
          // ── Pool basin floors (shallow end -0.55, deep end -2.25) ──────────────────
          // visible: false — buildWorld5.js provides the pool-floor visual (shallowFloor/deepFloor meshes).
          // These surfaces are collision-only so the AABB system gets the correct floor heights.
          surface('pool_shallow_floor', 8, 12, 8, 8, 'pool_floor', {
            floorY: -0.55, h: FLOOR_THICKNESS, walkableClassification: 'pool-floor', visible: false,
          }),
          surface('pool_deep_floor', 16, 12, 8, 8, 'pool_floor', {
            floorY: -2.25, h: FLOOR_THICKNESS, walkableClassification: 'pool-floor', visible: false,
          }),
        ],
        decorBlocks: [
          block('north_wall', ROOM_CENTER_X, ROOM_HEIGHT * 0.5, -(WALL_THICKNESS * 0.5), ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('south_wall', ROOM_CENTER_X, ROOM_HEIGHT * 0.5, ROOM_DEPTH + (WALL_THICKNESS * 0.5), ROOM_WIDTH + WALL_THICKNESS, ROOM_HEIGHT, WALL_THICKNESS, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('west_wall', -(WALL_THICKNESS * 0.5), ROOM_HEIGHT * 0.5, ROOM_CENTER_Z, WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('east_wall_north', EAST_WALL_X, ROOM_HEIGHT * 0.5, ROOM_CENTER_Z - EAST_SIDE_OFFSET_Z, WALL_THICKNESS, ROOM_HEIGHT, EAST_SIDE_DEPTH, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('east_wall_south', EAST_WALL_X, ROOM_HEIGHT * 0.5, ROOM_CENTER_Z + EAST_SIDE_OFFSET_Z, WALL_THICKNESS, ROOM_HEIGHT, EAST_SIDE_DEPTH, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('east_wall_header', EAST_WALL_X, DOOR_HEIGHT + ((ROOM_HEIGHT - DOOR_HEIGHT) * 0.5), ROOM_CENTER_Z, WALL_THICKNESS, ROOM_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH, {
            rgb: [206, 208, 210],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'wall',
            blockerReason: 'room-boundary',
          }),
          block('ceiling_shell', ROOM_CENTER_X, ROOM_HEIGHT + (CEILING_THICKNESS * 0.5), ROOM_CENTER_Z, ROOM_WIDTH, CEILING_THICKNESS, ROOM_DEPTH, {
            rgb: [226, 228, 230],
            roughness: 0.96,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'ceiling',
            blockerReason: 'room-boundary',
          }),
          block('ceiling_light_panel', ROOM_CENTER_X, ROOM_HEIGHT - 0.10, ROOM_CENTER_Z, 8.0, 0.12, 3.0, {
            rgb: [244, 246, 240],
            roughness: 0.98,
            emissiveScale: 0.18,
            solid: false,
            cameraFadeable: false,
            decorIntent: 'light-fixture',
          }),
          block('future_exit_blocker', EAST_WALL_X, DOOR_HEIGHT * 0.5, ROOM_CENTER_Z, WALL_THICKNESS, DOOR_HEIGHT, DOOR_WIDTH, {
            rgb: [162, 166, 170],
            roughness: 0.94,
            emissiveScale: 0.0,
            solid: true,
            structuralShell: true,
            cameraIgnore: false,
            cameraBlocker: true,
            cameraFadeable: false,
            decorIntent: 'doorway-blocker',
            blockerReason: 'closed-access',
          }),
          // Enemy lane floor marker — covers patrol bounds footprint (X 18-42, Z 6-30)
          block('enemy_lane_marker', 30, 0.005, 18, 24, 0.01, 24, {
            rgb: [200, 140, 55],
            roughness: 0.9,
            emissiveScale: 0.26,
            alpha: 0.40,
            solid: false,
            cameraIgnore: true,
            cameraBlocker: false,
            cameraFadeable: false,
            decorIntent: 'floor-marker',
          }),
        ],
      },
    ],
    connectors: [],
  },
  coins: [],
  currents: [],
  deepWaterPockets: [
    {
      name: 'water_se_pool',
      x: 36,
      y: -1.125,
      z: 30,
      w: 16,
      h: 2.25,
      d: 8,
    },
  ],
  airBubblePickups: [
    { name: 'bubble_se_01', x: 32, y: -0.35, z: 29, radius: 0.9 },
    { name: 'bubble_se_02', x: 40, y: -1.0, z: 31, radius: 0.9 },
  ],
  eelRails: [],
  vents: [],
  jellyfish: [
    {
      name: 'jelly_01',
      x: 28,
      y: 2.0,
      z: 9,
      bounds: { minX: 18, maxX: 42, minZ: 6, maxZ: 30, minY: 0.8, maxY: 4.2 },
      speed: 1.8,
      turnSpeed: 0.9,
      hpMax: 3,
    },
    {
      name: 'jelly_02',
      x: 34,
      y: 2.2,
      z: 18,
      bounds: { minX: 18, maxX: 42, minZ: 6, maxZ: 30, minY: 0.8, maxY: 4.2 },
      speed: 1.8,
      turnSpeed: 0.9,
      hpMax: 3,
    },
    {
      name: 'jelly_03',
      x: 26,
      y: 1.9,
      z: 27,
      bounds: { minX: 18, maxX: 42, minZ: 6, maxZ: 30, minY: 0.8, maxY: 4.2 },
      speed: 1.8,
      turnSpeed: 0.9,
      hpMax: 3,
    },
  ],
  signage: [],
});
