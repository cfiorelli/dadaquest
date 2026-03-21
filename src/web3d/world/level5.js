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

function floorCover(name, minX, maxX, topY, minZ, maxZ, extra = {}) {
  const thickness = extra.thickness ?? 0.14;
  return blockBounds(name, minX, maxX, topY - thickness, topY, minZ, maxZ, {
    rgb: extra.rgb || [64, 64, 64],
    roughness: extra.roughness ?? 0.98,
    emissiveScale: extra.emissiveScale ?? 0,
    solid: false,
    structuralShell: false,
    cameraIgnore: false,
    cameraBlocker: false,
    cameraFadeable: false,
    decorIntent: extra.decorIntent || 'floor',
    blockerReason: extra.blockerReason || null,
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

const TUNNEL_MOUTH_CENTER_X = 36.0;
const TUNNEL_MOUTH_CENTER_Y = -1.25;
const TUNNEL_MOUTH_WIDTH = 3.2;
const TUNNEL_MOUTH_HEIGHT = 1.9;
const TUNNEL_MOUTH_CENTER_Z = 33.95;
const TUNNEL_MOUTH_HALF_WIDTH = TUNNEL_MOUTH_WIDTH * 0.5;

const TUNNEL_UNDERDECK = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: -0.15,
  minZ: 34.0,
  maxZ: 36.5,
};
const TUNNEL_THROAT = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: 1.4,
  minZ: 36.5,
  maxZ: 40.5,
};
const TUNNEL_BEND = { minX: 31.5, maxX: 34.9, minY: -1.8, maxY: 1.4, minZ: 38.8, maxZ: 43.5 };
const TUNNEL_RUN = { minX: 31.5, maxX: 34.5, minY: -1.8, maxY: 1.4, minZ: 43.5, maxZ: 66.0 };
const STAIR_SHAFT = { minX: 31.5, maxX: 34.5, minY: -1.8, maxY: 4.5, minZ: 66.0, maxZ: 70.0 };
const HALLWAY = { minX: 31.0, maxX: 35.0, minY: 0.0, maxY: 4.5, minZ: 70.0, maxZ: 84.0 };

const LAB_RGB = [138, 138, 138];
const TUNNEL_RGB = [46, 46, 46];
const HALL_RGB = [104, 104, 104];

const TUNNEL_WATER_SURFACE_Y = 1.0;
const TUNNEL_STAIR_WATER_SURFACE_Y = -0.8;

const room1Blocks = makeShell('starter_pool_lab', ROOM1, {
  south: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
}, {
  rgb: LAB_RGB,
  wallBottomY: -2.0,
  wallTopY: 6.0,
  ceilingY: 6.0,
});

const tunnelBlocks = [
  ...makeShell('swim_tunnel_underdeck', TUNNEL_UNDERDECK, {
    north: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
    south: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: -0.15,
    ceiling: false,
  }),
  shellBlock('swim_tunnel_underdeck_ceiling', TUNNEL_UNDERDECK.minX, TUNNEL_UNDERDECK.maxX, -0.65, -0.15, TUNNEL_UNDERDECK.minZ, TUNNEL_UNDERDECK.maxZ, {
    rgb: TUNNEL_RGB,
    roughness: 0.96,
    emissiveScale: 0.0,
    decorIntent: 'ceiling',
  }),
  ...makeShell('swim_tunnel_throat', TUNNEL_THROAT, {
    north: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
    west: openingAlongZ(39.4, -1.25, 1.8, 2.2),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: 1.4,
    ceilingY: 1.4,
  }).filter((block) => block.name !== 'swim_tunnel_throat_north_wall_header'),
  ...makeShell('swim_tunnel_bend', TUNNEL_BEND, {
    east: openingAlongZ(39.4, -1.25, 1.8, 2.2),
    south: openingAlongX(33.0, -1.25, 3.0, 2.2),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: 1.4,
    ceilingY: 1.4,
  }),
  ...makeShell('swim_tunnel_run', TUNNEL_RUN, {
    north: openingAlongX(33.0, -1.25, 3.0, 2.2),
    south: openingAlongX(33.0, -0.3, 3.0, 2.8),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: 1.4,
    ceilingY: 1.4,
  }),
  ...makeShell('swim_tunnel_stair_shaft', STAIR_SHAFT, {
    north: openingAlongX(33.0, -0.3, 3.0, 2.8),
    south: openingAlongX(33.0, 1.6, 3.0, 3.2),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: 4.5,
    ceilingY: 4.5,
  }),
  floorCover('swim_tunnel_run_floor_cover', TUNNEL_RUN.minX, TUNNEL_RUN.maxX, -1.52, TUNNEL_RUN.minZ, TUNNEL_RUN.maxZ, {
    rgb: [34, 34, 34],
  }),
];

const tunnelSurfaces = [
  surfaceRect('swim_tunnel_underdeck_floor', TUNNEL_UNDERDECK.minX, TUNNEL_UNDERDECK.maxX, -1.6, TUNNEL_UNDERDECK.minZ, TUNNEL_UNDERDECK.maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
    rgb: [56, 56, 56],
    visible: false,
  }),
  surfaceRect('swim_tunnel_throat_floor', TUNNEL_THROAT.minX, TUNNEL_THROAT.maxX, -1.6, TUNNEL_THROAT.minZ, TUNNEL_THROAT.maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
    rgb: [56, 56, 56],
    visible: false,
  }),
  surfaceRect('swim_tunnel_bend_floor', TUNNEL_BEND.minX, TUNNEL_BEND.maxX, -1.6, TUNNEL_BEND.minZ, TUNNEL_BEND.maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
    rgb: [56, 56, 56],
    visible: false,
  }),
  surfaceRect('swim_tunnel_run_floor', TUNNEL_RUN.minX, TUNNEL_RUN.maxX, -1.6, TUNNEL_RUN.minZ, TUNNEL_RUN.maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-floor',
    rgb: [56, 56, 56],
    visible: false,
  }),
];

const TUNNEL_STAIR_STEP_COUNT = 8;
const TUNNEL_STAIR_STEP_DEPTH = (STAIR_SHAFT.maxZ - STAIR_SHAFT.minZ) / TUNNEL_STAIR_STEP_COUNT;
const TUNNEL_STAIR_STEP_RISE = 1.6 / TUNNEL_STAIR_STEP_COUNT;

for (let index = 0; index < TUNNEL_STAIR_STEP_COUNT; index += 1) {
  const minZ = STAIR_SHAFT.minZ + (index * TUNNEL_STAIR_STEP_DEPTH);
  const maxZ = STAIR_SHAFT.minZ + ((index + 1) * TUNNEL_STAIR_STEP_DEPTH);
  tunnelSurfaces.push(surfaceRect(`swim_tunnel_stair_${index + 1}`, 31.6, 34.4, -1.6 + ((index + 1) * TUNNEL_STAIR_STEP_RISE), minZ, maxZ, 'service_tunnel_floor', {
    h: 0.28,
    minThickness: 0.28,
    walkableClassification: 'service-tunnel-stair',
    rgb: [62, 62, 62],
    visible: false,
  }));
  tunnelBlocks.push(floorCover(`swim_tunnel_stair_cover_${index + 1}`, 31.6, 34.4, -1.52 + ((index + 1) * TUNNEL_STAIR_STEP_RISE), minZ, maxZ, {
    rgb: [54, 54, 54],
    thickness: 0.14,
  }));
}

const hallwayBlocks = [
  ...makeShell('surfacing_hallway', HALLWAY, {
    north: openingAlongX(33.0, 1.6, 3.0, 3.2),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 4.5,
    ceilingY: 4.5,
  }),
  floorCover('surfacing_hallway_floor_cover', HALLWAY.minX, HALLWAY.maxX, 0.08, HALLWAY.minZ, HALLWAY.maxZ, {
    rgb: [88, 88, 88],
    thickness: 0.12,
  }),
];

export const LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 0,
  graybox: true,
  extents: {
    minX: -0.5,
    maxX: 48.5,
    minZ: -0.5,
    maxZ: 84.5,
  },
  spawnYaw: Math.PI * 0.5,
  defaultCameraPreset: 'closer',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  spawn: { x: 4.0, y: PLAYER_SPAWN_Y, z: 18.0 },
  goal: { x: 33.0, y: PLAYER_SPAWN_Y, z: 80.0 },
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
    { id: 'A', label: 'Starter Slice', range: [0, 60] },
  ],
  authoredMap: {
    id: 'level5-starter-vertical-slice',
    startSector: 'starter_pool_lab',
    goalSector: 'surfacing_hallway',
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
        landmarks: ['pool', 'hidden pool tunnel mouth'],
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
        id: 'submerged_swim_tunnel',
        label: 'Hidden Swim Tunnel',
        x: 34.25,
        z: 52.0,
        w: 5.5,
        d: 36.0,
        floorY: -1.6,
        ceilingY: 4.5,
        floorSurfaceType: 'service_tunnel_floor',
        wallLanguage: 'graybox_tunnel_shell',
        landmarks: ['dark tunnel mouth', 'submerged swim tunnel', 'surfacing stairs'],
        shell: false,
        surfaces: tunnelSurfaces,
        decorBlocks: tunnelBlocks,
      },
      {
        id: 'surfacing_hallway',
        label: 'Surfacing Hallway',
        x: 33.0,
        z: 77.0,
        w: 4.0,
        d: 14.0,
        floorY: 0.0,
        ceilingY: 4.5,
        floorSurfaceType: 'hallway_floor',
        wallLanguage: 'graybox_hallway_shell',
        landmarks: ['narrow hallway'],
        shell: false,
        surfaces: [
          surfaceRect('hallway_floor', HALLWAY.minX, HALLWAY.maxX, 0.0, HALLWAY.minZ, HALLWAY.maxZ, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [94, 94, 94],
            visible: false,
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
        destinationSector: 'submerged_swim_tunnel',
        x: 36.0,
        z: 34.15,
        w: TUNNEL_MOUTH_WIDTH,
        d: 0.4,
        floorY: -1.6,
        ceilingY: -0.3,
        floorSurfaceType: 'submerged_threshold',
        shell: false,
        surfaces: [],
      },
      {
        id: 'tunnel_to_hallway',
        label: 'Tunnel To Hallway',
        sourceSector: 'submerged_swim_tunnel',
        destinationSector: 'surfacing_hallway',
        x: 33.0,
        z: 69.8,
        w: 3.0,
        d: 0.8,
        floorY: 0.0,
        ceilingY: 2.2,
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
        centerZ: TUNNEL_MOUTH_CENTER_Z,
        width: TUNNEL_MOUTH_WIDTH,
        height: TUNNEL_MOUTH_HEIGHT,
      },
    },
  ],
  submergedPassages: [
    {
      name: 'service_tunnel_water_underdeck',
      minX: TUNNEL_UNDERDECK.minX,
      maxX: TUNNEL_UNDERDECK.maxX,
      minY: TUNNEL_UNDERDECK.minY,
      maxY: TUNNEL_UNDERDECK.maxY,
      minZ: TUNNEL_UNDERDECK.minZ,
      maxZ: TUNNEL_UNDERDECK.maxZ,
      waterSurfaceY: TUNNEL_WATER_SURFACE_Y,
      floorStartY: -1.6,
      floorEndY: -1.6,
    },
    {
      name: 'service_tunnel_water_throat',
      minX: TUNNEL_THROAT.minX,
      maxX: TUNNEL_THROAT.maxX,
      minY: TUNNEL_THROAT.minY,
      maxY: TUNNEL_THROAT.maxY,
      minZ: TUNNEL_THROAT.minZ,
      maxZ: TUNNEL_THROAT.maxZ,
      waterSurfaceY: TUNNEL_WATER_SURFACE_Y,
      floorStartY: -1.6,
      floorEndY: -1.6,
    },
    {
      name: 'service_tunnel_water_bend',
      minX: TUNNEL_BEND.minX,
      maxX: TUNNEL_BEND.maxX,
      minY: TUNNEL_BEND.minY,
      maxY: TUNNEL_BEND.maxY,
      minZ: TUNNEL_BEND.minZ,
      maxZ: TUNNEL_BEND.maxZ,
      waterSurfaceY: TUNNEL_WATER_SURFACE_Y,
      floorStartY: -1.6,
      floorEndY: -1.6,
    },
    {
      name: 'service_tunnel_water_run',
      minX: TUNNEL_RUN.minX,
      maxX: TUNNEL_RUN.maxX,
      minY: TUNNEL_RUN.minY,
      maxY: TUNNEL_RUN.maxY,
      minZ: TUNNEL_RUN.minZ,
      maxZ: TUNNEL_RUN.maxZ,
      waterSurfaceY: TUNNEL_WATER_SURFACE_Y,
      floorStartY: -1.6,
      floorEndY: -1.6,
    },
    {
      name: 'service_tunnel_water_stairs',
      minX: STAIR_SHAFT.minX,
      maxX: STAIR_SHAFT.maxX,
      minY: STAIR_SHAFT.minY,
      maxY: STAIR_SHAFT.maxY,
      minZ: STAIR_SHAFT.minZ,
      maxZ: STAIR_SHAFT.maxZ,
      waterSurfaceY: TUNNEL_STAIR_WATER_SURFACE_Y,
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
