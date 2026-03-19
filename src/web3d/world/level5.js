import { compileAuthoredEraLayout } from './eraAuthoredLayout.js';

function surfaceRect(id, minX, maxX, topY, minZ, maxZ, surfaceType, extra = {}) {
  return {
    id,
    x: (minX + maxX) * 0.5,
    z: (minZ + maxZ) * 0.5,
    w: maxX - minX,
    d: maxZ - minZ,
    floorY: topY,
    surfaceType,
    ...extra,
  };
}

function blockBounds(name, minX, maxX, minY, maxY, minZ, maxZ, extra = {}) {
  return {
    name,
    x: (minX + maxX) * 0.5,
    y: (minY + maxY) * 0.5,
    z: (minZ + maxZ) * 0.5,
    w: maxX - minX,
    h: maxY - minY,
    d: maxZ - minZ,
    ...extra,
  };
}

function shellBlock(name, minX, maxX, minY, maxY, minZ, maxZ, extra = {}) {
  return blockBounds(name, minX, maxX, minY, maxY, minZ, maxZ, {
    rgb: extra.rgb || [150, 150, 150],
    roughness: extra.roughness ?? 0.92,
    emissiveScale: extra.emissiveScale ?? 0.01,
    solid: true,
    structuralShell: true,
    cameraIgnore: false,
    cameraBlocker: true,
    cameraFadeable: false,
    decorIntent: extra.decorIntent || 'wall',
    blockerReason: extra.blockerReason || 'room-boundary',
    ...extra,
  });
}

function openingAlongX(centerX, centerY, width, height) {
  return {
    minA: centerX - (width * 0.5),
    maxA: centerX + (width * 0.5),
    minY: centerY - (height * 0.5),
    maxY: centerY + (height * 0.5),
  };
}

function openingAlongZ(centerZ, centerY, width, height) {
  return {
    minA: centerZ - (width * 0.5),
    maxA: centerZ + (width * 0.5),
    minY: centerY - (height * 0.5),
    maxY: centerY + (height * 0.5),
  };
}

function makeWallBlocks(roomId, bounds, side, opening = null, extra = {}) {
  const blocks = [];
  const wallTopY = extra.wallTopY ?? bounds.maxY;
  const wallBottomY = extra.wallBottomY ?? bounds.minY;
  const rgb = extra.rgb || [150, 150, 150];
  const roughness = extra.roughness ?? 0.92;
  const emissiveScale = extra.emissiveScale ?? 0.01;
  const thickness = extra.thickness ?? 0.5;

  function pushBlock(name, minX, maxX, minY, maxY, minZ, maxZ) {
    if ((maxX - minX) <= 0.01 || (maxY - minY) <= 0.01 || (maxZ - minZ) <= 0.01) return;
    blocks.push(blockBounds(name, minX, maxX, minY, maxY, minZ, maxZ, {
      rgb,
      roughness,
      emissiveScale,
      solid: true,
      structuralShell: true,
      cameraIgnore: false,
      cameraBlocker: true,
      cameraFadeable: false,
      decorIntent: side === 'ceiling' ? 'ceiling' : 'wall',
      blockerReason: 'room-boundary',
    }));
  }

  if (!opening) {
    if (side === 'north') {
      pushBlock(`${roomId}_${side}_wall`, bounds.minX, bounds.maxX, wallBottomY, wallTopY, bounds.minZ - thickness, bounds.minZ);
    } else if (side === 'south') {
      pushBlock(`${roomId}_${side}_wall`, bounds.minX, bounds.maxX, wallBottomY, wallTopY, bounds.maxZ, bounds.maxZ + thickness);
    } else if (side === 'west') {
      pushBlock(`${roomId}_${side}_wall`, bounds.minX - thickness, bounds.minX, wallBottomY, wallTopY, bounds.minZ, bounds.maxZ);
    } else if (side === 'east') {
      pushBlock(`${roomId}_${side}_wall`, bounds.maxX, bounds.maxX + thickness, wallBottomY, wallTopY, bounds.minZ, bounds.maxZ);
    }
    return blocks;
  }

  if (side === 'north' || side === 'south') {
    const wallMinZ = side === 'north' ? bounds.minZ - thickness : bounds.maxZ;
    const wallMaxZ = side === 'north' ? bounds.minZ : bounds.maxZ + thickness;
    pushBlock(`${roomId}_${side}_wall_west`, bounds.minX, opening.minA, wallBottomY, wallTopY, wallMinZ, wallMaxZ);
    pushBlock(`${roomId}_${side}_wall_east`, opening.maxA, bounds.maxX, wallBottomY, wallTopY, wallMinZ, wallMaxZ);
    pushBlock(`${roomId}_${side}_wall_header`, opening.minA, opening.maxA, opening.maxY, wallTopY, wallMinZ, wallMaxZ);
    pushBlock(`${roomId}_${side}_wall_lower`, opening.minA, opening.maxA, wallBottomY, opening.minY, wallMinZ, wallMaxZ);
  } else {
    const wallMinX = side === 'west' ? bounds.minX - thickness : bounds.maxX;
    const wallMaxX = side === 'west' ? bounds.minX : bounds.maxX + thickness;
    pushBlock(`${roomId}_${side}_wall_north`, wallMinX, wallMaxX, wallBottomY, wallTopY, bounds.minZ, opening.minA);
    pushBlock(`${roomId}_${side}_wall_south`, wallMinX, wallMaxX, wallBottomY, wallTopY, opening.maxA, bounds.maxZ);
    pushBlock(`${roomId}_${side}_wall_header`, wallMinX, wallMaxX, opening.maxY, wallTopY, opening.minA, opening.maxA);
    pushBlock(`${roomId}_${side}_wall_lower`, wallMinX, wallMaxX, wallBottomY, opening.minY, opening.minA, opening.maxA);
  }
  return blocks;
}

function makeCeilingBlock(roomId, bounds, y, extra = {}) {
  return blockBounds(`${roomId}_ceiling`, bounds.minX, bounds.maxX, y, y + 0.5, bounds.minZ, bounds.maxZ, {
    rgb: extra.rgb || [176, 176, 176],
    roughness: extra.roughness ?? 0.94,
    emissiveScale: extra.emissiveScale ?? 0.01,
    solid: true,
    structuralShell: true,
    cameraIgnore: false,
    cameraBlocker: true,
    cameraFadeable: false,
    decorIntent: 'ceiling',
    blockerReason: 'room-boundary',
  });
}

function makeShell(roomId, bounds, openings = {}, extra = {}) {
  return [
    ...makeWallBlocks(roomId, bounds, 'north', openings.north || null, extra),
    ...makeWallBlocks(roomId, bounds, 'south', openings.south || null, extra),
    ...makeWallBlocks(roomId, bounds, 'west', openings.west || null, extra),
    ...makeWallBlocks(roomId, bounds, 'east', openings.east || null, extra),
    ...(extra.ceiling === false ? [] : [makeCeilingBlock(roomId, bounds, extra.ceilingY ?? bounds.maxY, extra)]),
  ];
}

function makeNorthWallWithMultipleOpenings(roomId, bounds, openings, extra = {}) {
  const rgb = extra.rgb || [150, 150, 150];
  const thickness = extra.thickness ?? 0.5;
  const wallBottomY = extra.wallBottomY ?? bounds.minY;
  const wallTopY = extra.wallTopY ?? bounds.maxY;
  const segments = [];
  let cursor = bounds.minX;

  function pushBlock(name, minX, maxX, minY, maxY, minZ, maxZ) {
    if ((maxX - minX) <= 0.01 || (maxY - minY) <= 0.01 || (maxZ - minZ) <= 0.01) return;
    segments.push(blockBounds(name, minX, maxX, minY, maxY, minZ, maxZ, {
      rgb,
      roughness: extra.roughness ?? 0.92,
      emissiveScale: extra.emissiveScale ?? 0.01,
      solid: true,
      structuralShell: true,
      cameraIgnore: false,
      cameraBlocker: true,
      cameraFadeable: false,
      decorIntent: 'wall',
      blockerReason: 'room-boundary',
    }));
  }

  for (const [index, opening] of openings.entries()) {
    if (opening.minA > cursor) {
      pushBlock(`${roomId}_north_wall_segment_${index}`, cursor, opening.minA, wallBottomY, wallTopY, bounds.minZ - thickness, bounds.minZ);
    }
    pushBlock(`${roomId}_north_wall_lower_${index}`, opening.minA, opening.maxA, wallBottomY, opening.minY, bounds.minZ - thickness, bounds.minZ);
    pushBlock(`${roomId}_north_wall_header_${index}`, opening.minA, opening.maxA, opening.maxY, wallTopY, bounds.minZ - thickness, bounds.minZ);
    cursor = opening.maxA;
  }

  if (cursor < bounds.maxX) {
    pushBlock(`${roomId}_north_wall_tail`, cursor, bounds.maxX, wallBottomY, wallTopY, bounds.minZ - thickness, bounds.minZ);
  }

  return segments;
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

const PLAYER_SPAWN_Y = 0.42;
const ROOM1 = { minX: 0.0, maxX: 48.0, minY: 0.0, maxY: 6.0, minZ: 0.0, maxZ: 36.0 };
const ROOM2 = { minX: 33.5, maxX: 38.5, minY: -1.8, maxY: 1.4, minZ: 34.0, maxZ: 59.0 };
const ROOM3 = { minX: 28.0, maxX: 52.0, minY: -0.6, maxY: 7.4, minZ: 58.0, maxZ: 78.0 };
const ROOM4 = { minX: 52.0, maxX: 80.0, minY: 0.0, maxY: 8.0, minZ: 61.0, maxZ: 75.0 };
const ROOM5 = { minX: 80.0, maxX: 172.0, minY: 0.0, maxY: 12.0, minZ: 32.0, maxZ: 104.0 };
const ROOM6 = { minX: 84.0, maxX: 108.0, minY: 6.0, maxY: 16.0, minZ: 7.0, maxZ: 25.0 };
const ROOM7 = { minX: 144.0, maxX: 168.0, minY: 6.0, maxY: 16.0, minZ: 7.0, maxZ: 25.0 };

const LAB_RGB = [138, 138, 138];
const SERVICE_RGB = [120, 120, 120];
const STADIUM_RGB = [146, 146, 146];
const UPPER_RGB = [156, 156, 156];
const TUNNEL_MOUTH_CENTER_X = 36.0;
const TUNNEL_MOUTH_CENTER_Y = -1.25;
const TUNNEL_MOUTH_WIDTH = 1.8;
const TUNNEL_MOUTH_HEIGHT = 1.7;
const TUNNEL_MOUTH_MIN_X = 35.1;
const TUNNEL_MOUTH_MAX_X = 36.9;
const TUNNEL_MOUTH_RUN_MAX_Z = 37.2;
const TUNNEL_FIRST_TURN_MAX_Z = 50.2;
const TUNNEL_SECOND_TURN_MAX_Z = 56.4;
const TUNNEL_STAIR_START_Z = TUNNEL_SECOND_TURN_MAX_Z;
const TUNNEL_STAIR_END_Z = 59.0;
const TUNNEL_STAIR_STEP_DEPTH = (TUNNEL_STAIR_END_Z - TUNNEL_STAIR_START_Z) / 6.0;

const room1Blocks = makeShell('starter_pool_lab', ROOM1, {}, {
  rgb: LAB_RGB,
  wallBottomY: -2.0,
  wallTopY: 6.0,
  ceilingY: 6.0,
});

const room2Blocks = [
  ...makeShell('submerged_service_tunnel', ROOM2, {
    north: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
    south: openingAlongX(36.0, -0.2, 3.0, 2.8),
  }, {
    rgb: SERVICE_RGB,
    wallBottomY: -1.8,
    wallTopY: 1.4,
    ceilingY: 1.4,
  }),
];

const room3Blocks = [
  ...makeShell('pump_junction', ROOM3, {
    north: openingAlongX(36.0, -0.2, 3.0, 2.8),
    east: openingAlongZ(68.0, 1.2, 6.0, 3.2),
  }, {
    rgb: SERVICE_RGB,
    wallBottomY: -0.6,
    wallTopY: 7.4,
    ceilingY: 7.4,
  }),
  blockBounds('pump_core', 34.0, 46.0, -0.6, 3.2, 64.0, 72.0, {
    rgb: [98, 98, 98],
    roughness: 0.9,
    emissiveScale: 0.01,
    solid: true,
    cameraIgnore: false,
    cameraBlocker: true,
    cameraFadeable: false,
    decorIntent: 'machinery',
    blockerReason: 'machinery',
  }),
];

const room4Blocks = makeShell('transfer_gallery', ROOM4, {
  west: openingAlongZ(68.0, 1.2, 6.0, 3.2),
  east: openingAlongZ(68.0, 2.2, 10.0, 4.4),
}, {
  rgb: SERVICE_RGB,
  wallBottomY: 0.0,
  wallTopY: 8.0,
  ceilingY: 8.0,
});

const room5NorthOpenings = [
  openingAlongX(96.0, 9.0, 4.0, 3.0),
  openingAlongX(156.0, 9.0, 4.0, 3.0),
];

const room5Blocks = [
  ...makeWallBlocks('grand_stadium_room', ROOM5, 'south', null, {
    rgb: STADIUM_RGB,
    wallBottomY: 0.0,
    wallTopY: 12.0,
  }),
  ...makeWallBlocks('grand_stadium_room', ROOM5, 'west', openingAlongZ(68.0, 2.2, 10.0, 4.4), {
    rgb: STADIUM_RGB,
    wallBottomY: 0.0,
    wallTopY: 12.0,
  }),
  ...makeWallBlocks('grand_stadium_room', ROOM5, 'east', null, {
    rgb: STADIUM_RGB,
    wallBottomY: 0.0,
    wallTopY: 12.0,
  }),
  ...makeNorthWallWithMultipleOpenings('grand_stadium_room', ROOM5, room5NorthOpenings, {
    rgb: STADIUM_RGB,
    wallBottomY: 0.0,
    wallTopY: 12.0,
  }),
  makeCeilingBlock('grand_stadium_room', ROOM5, 12.0, {
    rgb: STADIUM_RGB,
    roughness: 0.95,
    emissiveScale: 0.01,
  }),
];

const room6Blocks = makeShell('west_kelp_operations_wing', ROOM6, {
  south: openingAlongX(96.0, 9.0, 4.0, 3.0),
}, {
  rgb: UPPER_RGB,
  wallBottomY: 6.0,
  wallTopY: 16.0,
  ceilingY: 16.0,
});

const room7Blocks = makeShell('east_whale_observation_wing', ROOM7, {
  south: openingAlongX(156.0, 9.0, 4.0, 3.0),
}, {
  rgb: UPPER_RGB,
  wallBottomY: 6.0,
  wallTopY: 16.0,
  ceilingY: 16.0,
});

const westBridgeBounds = {
  minX: 93.0,
  maxX: 99.0,
  minY: 8.0,
  maxY: 10.5,
  minZ: 25.0,
  maxZ: 34.0,
};

const eastBridgeBounds = {
  minX: 153.0,
  maxX: 159.0,
  minY: 8.0,
  maxY: 10.5,
  minZ: 25.0,
  maxZ: 34.0,
};

const tunnelSteps = [
  surfaceRect('service_tunnel_floor_1', 33.55, 38.45, -1.6, 34.0, TUNNEL_MOUTH_RUN_MAX_Z, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
  }),
  surfaceRect('service_tunnel_floor_2', 33.55, 38.45, -1.6, TUNNEL_MOUTH_RUN_MAX_Z, 44.0, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
  }),
  surfaceRect('service_tunnel_floor_3', 33.55, 38.45, -1.6, 44.0, TUNNEL_FIRST_TURN_MAX_Z, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
  }),
  surfaceRect('service_tunnel_floor_4', 33.55, 38.45, -1.6, TUNNEL_FIRST_TURN_MAX_Z, TUNNEL_SECOND_TURN_MAX_Z, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
  }),
];

const stairRisePerStep = 1.6 / 6.0;
for (let index = 0; index < 6; index += 1) {
  const minZ = TUNNEL_STAIR_START_Z + (index * TUNNEL_STAIR_STEP_DEPTH);
  const maxZ = TUNNEL_STAIR_START_Z + ((index + 1) * TUNNEL_STAIR_STEP_DEPTH);
  tunnelSteps.push(surfaceRect(`service_tunnel_stair_${index + 1}`, 33.7, 38.3, -1.6 + ((index + 1) * stairRisePerStep), minZ, maxZ, 'service_tunnel_floor', {
    h: 0.28,
    minThickness: 0.28,
    walkableClassification: 'service-tunnel-stair',
  }));
}

// ── Narrow exit hallway: 4 m wide × 4.5 m tall × 16 m long ──────────────────
// Starts at z=59 (TUNNEL_STAIR_END_Z) where the stair stringer reaches y=0.
// Runs south to z=75 (dead end). Interior x=[34..38], y=[0..4.5].
// No openings to any larger space — south wall is sealed.
const HALL_MIN_X = 34.0;
const HALL_MAX_X = 38.0;
const HALL_MIN_Z = TUNNEL_STAIR_END_Z; // 59.0
const HALL_MAX_Z = 75.0;
const HALL_CEIL_Y = 4.5;
const HALL_RGB = [112, 112, 112];

const hallwayBlocks = [
  shellBlock('hall_west_wall', HALL_MIN_X - 0.5, HALL_MIN_X, 0.0, HALL_CEIL_Y, HALL_MIN_Z, HALL_MAX_Z, {
    rgb: HALL_RGB,
  }),
  shellBlock('hall_east_wall', HALL_MAX_X, HALL_MAX_X + 0.5, 0.0, HALL_CEIL_Y, HALL_MIN_Z, HALL_MAX_Z, {
    rgb: HALL_RGB,
  }),
  shellBlock('hall_ceiling', HALL_MIN_X - 0.5, HALL_MAX_X + 0.5, HALL_CEIL_Y, HALL_CEIL_Y + 0.5, HALL_MIN_Z, HALL_MAX_Z, {
    rgb: HALL_RGB,
  }),
  shellBlock('hall_south_wall', HALL_MIN_X - 0.5, HALL_MAX_X + 0.5, 0.0, HALL_CEIL_Y + 0.5, HALL_MAX_Z, HALL_MAX_Z + 0.5, {
    rgb: HALL_RGB,
  }),
];

export const LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 0,
  graybox: true,
  extents: {
    minX: -0.5,
    maxX: 50.0,
    minZ: -0.5,
    maxZ: 78.0,
  },
  spawnYaw: Math.PI * 0.5,
  defaultCameraPreset: 'closer',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  spawn: { x: 4.0, y: PLAYER_SPAWN_Y, z: 18.0 },
  goal: { x: 36.0, y: PLAYER_SPAWN_Y, z: 73.0 },
  goalPresentation: 'trigger-only',
  theme: 'neutral',
  showGroundVisual: false,
  showRouteRibbons: false,
  disableDecorOcclusionFade: true,
  respawnAnchors: [
    {
      id: 'level5_spawn_anchor',
      label: 'Starter Pool Lab',
      x: 4.0,
      y: PLAYER_SPAWN_Y,
      z: 18.0,
      spaceId: 'starter_pool_lab',
      allowedReason: 'spawn',
    },
  ],
  acts: [
    { id: 'A', label: 'Pool Lab', range: [0, 52] },
  ],
  authoredMap: {
    id: 'level5-squarium-graybox',
    startSector: 'starter_pool_lab',
    goalSector: 'tunnel_exit_hallway',
    sectors: [
      {
        id: 'starter_pool_lab',
        label: 'Starter / Pool Lab',
        x: 24.0,
        z: 18.0,
        w: 48.0,
        d: 36.0,
        floorY: 0.0,
        ceilingY: 6.0,
        floorSurfaceType: 'starter_room_floor',
        wallLanguage: 'graybox_lab_shell',
        landmarks: ['pool', 'hidden south pool tunnel mouth'],
        shell: false,
        surfaces: [
          surfaceRect('starter_floor_north', 0.0, 48.0, 0.0, 0.0, 26.0, 'starter_room_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('starter_floor_south', 0.0, 48.0, 0.0, 34.0, 36.0, 'starter_room_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('starter_floor_west', 0.0, 28.0, 0.0, 26.0, 34.0, 'starter_room_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('starter_floor_east', 44.0, 48.0, 0.0, 26.0, 34.0, 'starter_room_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: room1Blocks,
      },
      {
        id: 'submerged_service_tunnel',
        label: 'Submerged Service Tunnel',
        x: 36.0,
        z: 46.5,
        w: 5.0,
        d: 25.0,
        floorY: -1.6,
        ceilingY: 1.4,
        floorSurfaceType: 'service_tunnel_floor',
        wallLanguage: 'graybox_tunnel_shell',
        landmarks: ['submerged tunnel'],
        shell: false,
        surfaces: tunnelSteps,
        decorBlocks: room2Blocks,
      },
      {
        id: 'tunnel_exit_hallway',
        label: 'Tunnel Exit Hallway',
        x: 36.0,
        z: 67.0,
        w: 4.0,
        d: 16.0,
        floorY: 0.0,
        ceilingY: HALL_CEIL_Y,
        floorSurfaceType: 'hallway_floor',
        wallLanguage: 'graybox_hallway_shell',
        landmarks: ['narrow exit corridor'],
        shell: false,
        surfaces: [
          surfaceRect('hallway_floor', HALL_MIN_X, HALL_MAX_X, 0.0, HALL_MIN_Z, HALL_MAX_Z, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: hallwayBlocks,
      },
    ],
    connectors: [
      {
        id: 'pool_tunnel_mouth',
        label: 'Pool Tunnel Mouth',
        sourceSector: 'starter_pool_lab',
        destinationSector: 'submerged_service_tunnel',
        x: 36.0,
        z: 34.15,
        w: 2.8,
        d: 0.4,
        floorY: -1.6,
        ceilingY: -0.25,
        floorSurfaceType: 'submerged_threshold',
        shell: false,
        surfaces: [],
      },
      {
        id: 'tunnel_to_hallway',
        label: 'Tunnel To Hallway',
        sourceSector: 'submerged_service_tunnel',
        destinationSector: 'tunnel_exit_hallway',
        x: 36.0,
        z: 58.8,
        w: 3.0,
        d: 1.6,
        floorY: -0.2,
        ceilingY: 1.2,
        floorSurfaceType: 'threshold_floor',
        shell: false,
        surfaces: [],
      },
    ],
  },
  coins: [],
  currents: [],
  deepWaterPockets: [
    {
      name: 'starter_pool',
      x: 36.0,
      y: -1.125,
      z: 30.0,
      w: 16.0,
      h: 2.25,
      d: 8.0,
      northExitStairs: false,
      southTunnelMouth: {
        centerX: TUNNEL_MOUTH_CENTER_X,
        centerY: TUNNEL_MOUTH_CENTER_Y,
        centerZ: 33.95,
        width: TUNNEL_MOUTH_WIDTH,
        height: TUNNEL_MOUTH_HEIGHT,
      },
    },
  ],
  submergedPassages: [
    {
      name: 'service_tunnel_water_main',
      minX: 33.5,
      maxX: 38.5,
      minY: -1.8,
      maxY: 1.4,
      minZ: 34.0,
      maxZ: TUNNEL_STAIR_START_Z,
      waterSurfaceY: 1.0,
      floorStartY: -1.6,
      floorEndY: -1.6,
    },
    {
      name: 'service_tunnel_water_stairs',
      minX: 33.5,
      maxX: 38.5,
      minY: -1.8,
      maxY: 1.4,
      minZ: TUNNEL_STAIR_START_Z,
      maxZ: TUNNEL_STAIR_END_Z,
      waterSurfaceY: -0.8,
      floorStartY: -1.6,
      floorEndY: 0.0,
    },
  ],
  ladders: [],
  airBubblePickups: [],
  eelRails: [],
  vents: [],
  jellyfish: [],
  signage: [],
});
