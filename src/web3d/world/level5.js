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
  // Keep the pool read to a dark opening only. The first long straight run is narrow and enclosed,
  // then two offset turns hide the stair breakout from the pool room.
  shellBlock('service_tunnel_mouth_shroud_west', 33.5, TUNNEL_MOUTH_MIN_X, -1.8, 1.4, 34.0, TUNNEL_MOUTH_RUN_MAX_Z, {
    rgb: [72, 72, 72],
    decorIntent: 'secret-tunnel-shroud',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_mouth_shroud_east', TUNNEL_MOUTH_MAX_X, 38.5, -1.8, 1.4, 34.0, TUNNEL_MOUTH_RUN_MAX_Z, {
    rgb: [72, 72, 72],
    decorIntent: 'secret-tunnel-shroud',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_mouth_shroud_header', TUNNEL_MOUTH_MIN_X, TUNNEL_MOUTH_MAX_X, -0.25, 1.4, 34.0, TUNNEL_MOUTH_RUN_MAX_Z, {
    rgb: [68, 68, 68],
    decorIntent: 'secret-tunnel-shroud',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_overburden', 33.5, 38.5, -0.55, 1.4, 34.0, 54.0, {
    rgb: [64, 64, 64],
    decorIntent: 'secret-tunnel-overburden',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_inner_bulkhead_west', 33.5, TUNNEL_MOUTH_MIN_X, -1.8, 1.4, 34.6, 35.2, {
    rgb: [60, 60, 60],
    decorIntent: 'secret-tunnel-bulkhead',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_inner_bulkhead_east', TUNNEL_MOUTH_MAX_X, 38.5, -1.8, 1.4, 34.6, 35.2, {
    rgb: [60, 60, 60],
    decorIntent: 'secret-tunnel-bulkhead',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_inner_bulkhead_header', TUNNEL_MOUTH_MIN_X, TUNNEL_MOUTH_MAX_X, -0.55, 1.4, 34.6, 35.2, {
    rgb: [56, 56, 56],
    decorIntent: 'secret-tunnel-bulkhead',
    blockerReason: 'secret-tunnel-occluder',
  }),
  shellBlock('service_tunnel_first_turn_crosswall', 34.9, 38.5, -1.8, 1.4, TUNNEL_MOUTH_RUN_MAX_Z, 39.8, {
    rgb: [82, 82, 82],
    decorIntent: 'secret-tunnel-turn',
    blockerReason: 'secret-tunnel-turn',
  }),
  shellBlock('service_tunnel_first_turn_sidewall', 35.3, 38.5, -1.8, 1.4, 39.8, TUNNEL_FIRST_TURN_MAX_Z, {
    rgb: [82, 82, 82],
    decorIntent: 'secret-tunnel-turn',
    blockerReason: 'secret-tunnel-turn',
  }),
  shellBlock('service_tunnel_second_turn_crosswall', 33.5, 37.1, -1.8, 1.4, TUNNEL_FIRST_TURN_MAX_Z, 52.6, {
    rgb: [82, 82, 82],
    decorIntent: 'secret-tunnel-turn',
    blockerReason: 'secret-tunnel-turn',
  }),
  shellBlock('service_tunnel_second_turn_sidewall', 33.5, 36.7, -1.8, 1.4, 52.6, TUNNEL_SECOND_TURN_MAX_Z, {
    rgb: [82, 82, 82],
    decorIntent: 'secret-tunnel-turn',
    blockerReason: 'secret-tunnel-turn',
  }),
  // ── Exit corridor: narrow 4 m hall immediately after tunnel stair exit ────
  // Tunnel stair section ends at z=59 (TUNNEL_STAIR_END_Z), y=0 deck level.
  // These two walls narrow the pump-junction entry vestibule to 4 m wide
  // (x=34..38) for the first 4.5 m, giving the player a confined hallway feel
  // when they surface. Walls stop at z=63.5 so the pump_west_walk / pump_east_walk
  // surfaces remain accessible from z=62+ without blocking future traversal.
  shellBlock('exit_hall_west_wall', 28.0, 34.0, -0.6, 4.5, TUNNEL_STAIR_END_Z, 63.5, {
    rgb: [108, 108, 108],
    roughness: 0.92,
    emissiveScale: 0.01,
    decorIntent: 'exit-hallway',
    blockerReason: 'exit-hallway-wall',
  }),
  shellBlock('exit_hall_east_wall', 38.0, 52.0, -0.6, 4.5, TUNNEL_STAIR_END_Z, 63.5, {
    rgb: [108, 108, 108],
    roughness: 0.92,
    emissiveScale: 0.01,
    decorIntent: 'exit-hallway',
    blockerReason: 'exit-hallway-wall',
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

const pumpNorthThresholds = [
  surfaceRect('pump_entry_landing', 33.7, 38.3, 0.0, 59.0, 60.8, 'pump_junction_floor', {
    h: 0.3,
    minThickness: 0.3,
    walkableClassification: 'threshold-floor',
  }),
  surfaceRect('pump_entry_spread', 31.0, 41.0, 0.0, 60.8, 62.0, 'pump_junction_floor', {
    h: 0.3,
    minThickness: 0.3,
    walkableClassification: 'threshold-floor',
  }),
];

export const LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 0,
  graybox: true,
  extents: {
    minX: -0.5,
    maxX: 176.5,
    minZ: -0.5,
    maxZ: 108.5,
  },
  spawnYaw: Math.PI * 0.5,
  defaultCameraPreset: 'closer',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  spawn: { x: 4.0, y: PLAYER_SPAWN_Y, z: 18.0 },
  goal: { x: 156.0, y: 8.42, z: 16.0 },
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
    {
      id: 'pump_junction_anchor',
      label: 'Pump Junction',
      x: 40.0,
      y: PLAYER_SPAWN_Y,
      z: 61.6,
      spaceId: 'pump_junction',
      allowedReason: 'respawn',
    },
    {
      id: 'grand_stadium_anchor',
      label: 'Grand Stadium Room',
      x: 92.0,
      y: PLAYER_SPAWN_Y,
      z: 68.0,
      spaceId: 'grand_stadium_room',
      allowedReason: 'respawn',
    },
    {
      id: 'west_wing_anchor',
      label: 'West Wing',
      x: 96.0,
      y: 8.42,
      z: 18.0,
      spaceId: 'west_kelp_operations_wing',
      allowedReason: 'respawn',
    },
    {
      id: 'east_wing_anchor',
      label: 'East Wing',
      x: 156.0,
      y: 8.42,
      z: 18.0,
      spaceId: 'east_whale_observation_wing',
      allowedReason: 'respawn',
    },
  ],
  acts: [
    { id: 'A', label: 'Pool Lab', range: [0, 52] },
    { id: 'B', label: 'Graybox Expansion', range: [52, 176] },
  ],
  authoredMap: {
    id: 'level5-squarium-graybox',
    startSector: 'starter_pool_lab',
    goalSector: 'east_whale_observation_wing',
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
        id: 'pump_junction',
        label: 'Pump Junction',
        x: 40.0,
        z: 68.0,
        w: 24.0,
        d: 20.0,
        floorY: 0.0,
        ceilingY: 7.4,
        floorSurfaceType: 'pump_junction_floor',
        wallLanguage: 'graybox_service_shell',
        landmarks: ['central machinery block'],
        shell: false,
        surfaces: [
          ...pumpNorthThresholds,
          surfaceRect('pump_west_walk', 28.0, 34.0, 0.0, 62.0, 78.0, 'pump_junction_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('pump_east_walk', 46.0, 52.0, 0.0, 62.0, 78.0, 'pump_junction_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('pump_north_walk', 34.0, 46.0, 0.0, 62.0, 64.0, 'pump_junction_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('pump_south_walk', 34.0, 46.0, 0.0, 72.0, 78.0, 'pump_junction_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: room3Blocks,
      },
      {
        id: 'transfer_gallery',
        label: 'Transfer Gallery',
        x: 66.0,
        z: 68.0,
        w: 28.0,
        d: 14.0,
        floorY: 0.0,
        ceilingY: 8.0,
        floorSurfaceType: 'transfer_gallery_floor',
        wallLanguage: 'graybox_gallery_shell',
        landmarks: ['public transition'],
        shell: false,
        surfaces: [
          surfaceRect('transfer_gallery_floor', 52.0, 80.0, 0.0, 61.0, 75.0, 'transfer_gallery_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: room4Blocks,
      },
      {
        id: 'grand_stadium_room',
        label: 'Grand Stadium Room',
        x: 126.0,
        z: 68.0,
        w: 92.0,
        d: 72.0,
        floorY: 0.0,
        ceilingY: 12.0,
        floorSurfaceType: 'grand_stadium_floor',
        wallLanguage: 'graybox_stadium_shell',
        landmarks: ['stadium floor', 'balcony ring'],
        shell: false,
        surfaces: [
          surfaceRect('grand_stadium_west_entry_apron', 80.0, 84.0, 0.0, 63.0, 73.0, 'grand_stadium_floor', {
            h: 0.75,
            walkableClassification: 'threshold-floor',
            roomSurface: true,
          }),
          surfaceRect('grand_stadium_main_floor', 84.0, 168.0, 0.0, 36.0, 100.0, 'grand_stadium_floor', {
            h: 0.75,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
          surfaceRect('grand_stadium_north_balcony', 88.0, 164.0, 8.0, 34.0, 38.0, 'grand_stadium_balcony', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'balcony',
            roomSurface: true,
          }),
          surfaceRect('grand_stadium_west_balcony', 84.0, 88.0, 8.0, 40.0, 92.0, 'grand_stadium_balcony', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'balcony',
            roomSurface: true,
          }),
          surfaceRect('grand_stadium_east_balcony', 164.0, 168.0, 8.0, 40.0, 92.0, 'grand_stadium_balcony', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'balcony',
            roomSurface: true,
          }),
        ],
        decorBlocks: room5Blocks,
      },
      {
        id: 'west_kelp_operations_wing',
        label: 'West Kelp Operations Wing',
        x: 96.0,
        z: 16.0,
        w: 24.0,
        d: 18.0,
        floorY: 8.0,
        ceilingY: 16.0,
        floorSurfaceType: 'upper_wing_floor',
        wallLanguage: 'graybox_upper_wing_shell',
        landmarks: ['west upper wing'],
        shell: false,
        surfaces: [
          surfaceRect('west_wing_floor', 84.0, 108.0, 8.0, 7.0, 25.0, 'upper_wing_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: room6Blocks,
      },
      {
        id: 'east_whale_observation_wing',
        label: 'East Whale Observation Wing',
        x: 156.0,
        z: 16.0,
        w: 24.0,
        d: 18.0,
        floorY: 8.0,
        ceilingY: 16.0,
        floorSurfaceType: 'upper_wing_floor',
        wallLanguage: 'graybox_upper_wing_shell',
        landmarks: ['east upper wing'],
        shell: false,
        surfaces: [
          surfaceRect('east_wing_floor', 144.0, 168.0, 8.0, 7.0, 25.0, 'upper_wing_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: room7Blocks,
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
        id: 'pump_junction_entry',
        label: 'Pump Junction Entry',
        sourceSector: 'submerged_service_tunnel',
        destinationSector: 'pump_junction',
        x: 36.0,
        z: 58.8,
        w: 3.0,
        d: 1.6,
        floorY: -0.6,
        ceilingY: 1.2,
        floorSurfaceType: 'threshold_floor',
        shell: false,
        surfaces: [],
      },
      {
        id: 'pump_to_transfer_gallery',
        label: 'Pump To Transfer Gallery',
        sourceSector: 'pump_junction',
        destinationSector: 'transfer_gallery',
        x: 52.1,
        z: 68.0,
        w: 0.4,
        d: 6.0,
        floorY: 0.0,
        ceilingY: 3.2,
        floorSurfaceType: 'threshold_floor',
        shell: false,
        surfaces: [],
      },
      {
        id: 'gallery_to_grand_stadium',
        label: 'Gallery To Grand Stadium',
        sourceSector: 'transfer_gallery',
        destinationSector: 'grand_stadium_room',
        x: 80.1,
        z: 68.0,
        w: 0.4,
        d: 10.0,
        floorY: 0.0,
        ceilingY: 4.4,
        floorSurfaceType: 'threshold_floor',
        shell: false,
        surfaces: [],
      },
      {
        id: 'west_balcony_bridge',
        label: 'West Balcony Bridge',
        sourceSector: 'grand_stadium_room',
        destinationSector: 'west_kelp_operations_wing',
        x: 96.0,
        z: 29.5,
        w: 6.0,
        d: 9.0,
        floorY: 8.0,
        ceilingY: 10.5,
        floorSurfaceType: 'upper_bridge_floor',
        wallLanguage: 'graybox_bridge_shell',
        shell: false,
        surfaces: [
          surfaceRect('west_balcony_bridge_floor', 93.0, 99.0, 8.0, 25.0, 34.0, 'upper_bridge_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'bridge-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: makeShell('west_balcony_bridge', westBridgeBounds, {
          south: openingAlongX(96.0, 9.0, 4.0, 3.0),
          north: openingAlongX(96.0, 9.0, 4.0, 3.0),
        }, {
          rgb: UPPER_RGB,
          wallBottomY: 8.0,
          wallTopY: 10.5,
          ceilingY: 10.5,
        }),
      },
      {
        id: 'east_balcony_bridge',
        label: 'East Balcony Bridge',
        sourceSector: 'grand_stadium_room',
        destinationSector: 'east_whale_observation_wing',
        x: 156.0,
        z: 29.5,
        w: 6.0,
        d: 9.0,
        floorY: 8.0,
        ceilingY: 10.5,
        floorSurfaceType: 'upper_bridge_floor',
        wallLanguage: 'graybox_bridge_shell',
        shell: false,
        surfaces: [
          surfaceRect('east_balcony_bridge_floor', 153.0, 159.0, 8.0, 25.0, 34.0, 'upper_bridge_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'bridge-floor',
            roomSurface: true,
          }),
        ],
        decorBlocks: makeShell('east_balcony_bridge', eastBridgeBounds, {
          south: openingAlongX(156.0, 9.0, 4.0, 3.0),
          north: openingAlongX(156.0, 9.0, 4.0, 3.0),
        }, {
          rgb: UPPER_RGB,
          wallBottomY: 8.0,
          wallTopY: 10.5,
          ceilingY: 10.5,
        }),
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
  ladders: [
    {
      id: 'west_ladder',
      label: 'West Ladder',
      centerX: 90.0,
      centerZ: 44.0,
      width: 1.2,
      bottomY: 0.0,
      topY: 8.0,
      topExit: { x: 87.6, y: 8.42, z: 44.0 },
      bottomExit: { x: 90.8, y: 0.42, z: 44.0 },
    },
    {
      id: 'east_ladder',
      label: 'East Ladder',
      centerX: 162.0,
      centerZ: 44.0,
      width: 1.2,
      bottomY: 0.0,
      topY: 8.0,
      topExit: { x: 164.4, y: 8.42, z: 44.0 },
      bottomExit: { x: 161.2, y: 0.42, z: 44.0 },
    },
  ],
  airBubblePickups: [],
  eelRails: [],
  vents: [],
  jellyfish: [],
  signage: [],
});
