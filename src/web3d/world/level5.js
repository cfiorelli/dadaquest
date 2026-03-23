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
const FUTURE_CHAMBER_GOAL = { x: 36.0, y: PLAYER_SPAWN_Y, z: 118.0 };

const TUNNEL_MOUTH_CENTER_X = 36.0;
const TUNNEL_MOUTH_CENTER_Y = -1.25;
const TUNNEL_MOUTH_WIDTH = 4.0;
const TUNNEL_MOUTH_HEIGHT = 2.1;
const TUNNEL_MOUTH_CENTER_Z = 33.95;
const TUNNEL_MOUTH_HALF_WIDTH = TUNNEL_MOUTH_WIDTH * 0.5;

const TUNNEL_UNDERDECK = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: -0.15,
  minZ: 33.75,
  maxZ: 36.5,
};
const TUNNEL_THROAT = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: -0.15,
  minZ: 36.5,
  maxZ: 40.5,
};
const TUNNEL_RUN = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: -0.15,
  minZ: 40.5,
  maxZ: 60.0,
};
const TUNNEL_BEND = {
  minX: 31.6,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: 1.4,
  minZ: 60.0,
  maxZ: 66.0,
};
const TUNNEL_BEND_STAIR_OPENING_CENTER_X = 34.8;
const TUNNEL_BEND_STAIR_OPENING_WIDTH = 2.0;
const TUNNEL_BEND_BAFFLE = {
  minX: 34.2,
  maxX: 38.0,
  minY: -1.8,
  maxY: 1.4,
  minZ: 60.9,
  maxZ: 65.0,
};
const STAIR_SHAFT = {
  minX: TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH,
  maxX: TUNNEL_MOUTH_CENTER_X + TUNNEL_MOUTH_HALF_WIDTH,
  minY: -1.8,
  maxY: 4.5,
  minZ: 66.0,
  maxZ: 70.0,
};
const DRY_VESTIBULE = { minX: 33.6, maxX: 36.0, minY: 0.0, maxY: 2.8, minZ: 70.0, maxZ: 73.6 };
const DRY_TURN = { minX: 36.0, maxX: 39.2, minY: 0.0, maxY: 2.8, minZ: 71.2, maxZ: 73.6 };
const DRY_POST_TURN = { minX: 39.2, maxX: 42.4, minY: 0.0, maxY: 2.8, minZ: 71.2, maxZ: 73.6 };
const DRY_STAIR_SHAFT = { minX: 40.0, maxX: 42.4, minY: 0.0, maxY: 4.5, minZ: 73.6, maxZ: 80.0 };
const DRY_UPPER_HALL = { minX: 34.4, maxX: 42.4, minY: 0.0, maxY: 6.0, minZ: 80.0, maxZ: 84.0 };
const HALLWAY = { minX: 33.6, maxX: 42.4, minY: 0.0, maxY: 6.0, minZ: 70.0, maxZ: 84.0 };
const DRY_TURN_OPENING_CENTER_Z = 72.4;
const DRY_TURN_OPENING_WIDTH = 2.4;
const DRY_STAIR_OPENING_CENTER_X = 41.2;
const DRY_STAIR_OPENING_WIDTH = 2.4;
const CHAMBER_ENTRY = { x: 36.0, y: 0.0, z: HALLWAY.maxZ };
const PUZZLE_CHAMBER = {
  minX: CHAMBER_ENTRY.x - 7.0,
  maxX: CHAMBER_ENTRY.x + 7.0,
  minY: 0.0,
  maxY: 8.0,
  minZ: CHAMBER_ENTRY.z,
  maxZ: CHAMBER_ENTRY.z + 22.0,
};
const HALLWAY_CHAMBER_OPENING_WIDTH = 3.2;
const HALLWAY_CHAMBER_OPENING_HEIGHT = 2.8;
const HALLWAY_CHAMBER_OPENING_CENTER_Y = 1.4;
const CHAMBER_PEDESTAL = {
  minX: CHAMBER_ENTRY.x + 2.1,
  maxX: CHAMBER_ENTRY.x + 3.5,
  minY: 0.0,
  maxY: 1.1,
  minZ: CHAMBER_ENTRY.z + 7.3,
  maxZ: CHAMBER_ENTRY.z + 8.7,
};
const CHAMBER_DOOR = {
  minX: CHAMBER_ENTRY.x - 1.5,
  maxX: CHAMBER_ENTRY.x + 1.5,
  minY: 0.0,
  maxY: 4.0,
  minZ: PUZZLE_CHAMBER.maxZ - 0.06,
  maxZ: PUZZLE_CHAMBER.maxZ + 0.06,
};
const CHAMBER_VISIBLE_FLOOR_PLATE = {
  minX: CHAMBER_ENTRY.x - 2.7,
  maxX: CHAMBER_ENTRY.x - 0.1,
  minZ: CHAMBER_ENTRY.z + 7.7,
  maxZ: CHAMBER_ENTRY.z + 9.9,
};
const CHAMBER_EAST_SEAM = {
  minX: PUZZLE_CHAMBER.maxX - 0.07,
  maxX: PUZZLE_CHAMBER.maxX - 0.01,
  minY: 0.6,
  maxY: 3.6,
  minZ: CHAMBER_ENTRY.z + 10.8,
  maxZ: CHAMBER_ENTRY.z + 13.2,
};
const CHAMBER_WEST_SEAM = {
  minX: PUZZLE_CHAMBER.minX + 0.01,
  maxX: PUZZLE_CHAMBER.minX + 0.07,
  minY: 0.6,
  maxY: 3.6,
  minZ: CHAMBER_ENTRY.z + 10.8,
  maxZ: CHAMBER_ENTRY.z + 13.2,
};
const CHAMBER_REWARD_PAD = {
  minX: CHAMBER_ENTRY.x - 1.4,
  maxX: CHAMBER_ENTRY.x + 1.4,
  minZ: CHAMBER_ENTRY.z + 17.1,
  maxZ: CHAMBER_ENTRY.z + 19.9,
};
const HAZARD_LANE_MIN_Z = CHAMBER_ENTRY.z + 13.75;
const HAZARD_LANE_MAX_Z = CHAMBER_ENTRY.z + 16.25;
const TUNNEL_CAMERA_ZONE = {
  id: 'starter_slice_tunnel',
  minX: HALLWAY.minX,
  maxX: HALLWAY.maxX,
  minY: -1.8,
  maxY: 4.5,
  minZ: TUNNEL_UNDERDECK.minZ,
  maxZ: HALLWAY.maxZ,
  preset: {
    distance: 2.2,
    height: 1.55,
    focusHeight: 0.82,
    lookAhead: 1.35,
    fov: 1.08,
  },
  allowUnderwaterOcclusion: true,
  cameraClampBounds: {
    minX: HALLWAY.minX + 0.2,
    maxX: HALLWAY.maxX - 0.2,
    minY: -0.4,
    maxY: 3.75,
    minZ: TUNNEL_UNDERDECK.minZ + 0.15,
    maxZ: HALLWAY.maxZ - 0.2,
  },
};

const LAB_RGB = [138, 138, 138];
const TUNNEL_RGB = [46, 46, 46];
const HALL_RGB = [104, 104, 104];
const CHAMBER_RGB = [120, 120, 120];

const TUNNEL_WATER_SURFACE_Y = 1.38;
const TUNNEL_STAIR_WATER_SURFACE_Y = 0.8;

const room1Blocks = makeShell('starter_pool_lab', ROOM1, {
  south: openingAlongX(TUNNEL_MOUTH_CENTER_X, TUNNEL_MOUTH_CENTER_Y, TUNNEL_MOUTH_WIDTH, TUNNEL_MOUTH_HEIGHT),
}, {
  rgb: LAB_RGB,
  wallBottomY: -2.0,
  wallTopY: 6.0,
  ceilingY: 6.0,
});
room1Blocks.push(
  shellBlock('starter_pool_lab_south_wall_west_liner', ROOM1.minX, TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH, -2.0, 6.0, ROOM1.maxZ - 0.4, ROOM1.maxZ, {
    rgb: LAB_RGB,
    roughness: 0.92,
    emissiveScale: 0.01,
    decorIntent: 'wall',
    blockerReason: 'room-boundary-liner',
  }),
  shellBlock('starter_pool_lab_south_wall_west_backer', ROOM1.minX, TUNNEL_MOUTH_CENTER_X - TUNNEL_MOUTH_HALF_WIDTH, -2.0, 3.2, ROOM1.maxZ, TUNNEL_BEND.maxZ, {
    rgb: LAB_RGB,
    roughness: 0.92,
    emissiveScale: 0.01,
    decorIntent: 'wall',
    blockerReason: 'room-boundary-backer',
  }),
);

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
    south: openingAlongX(TUNNEL_MOUTH_CENTER_X, -1.25, TUNNEL_MOUTH_WIDTH, 2.2),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: -0.15,
    ceilingY: -0.15,
  }).filter((block) => block.name !== 'swim_tunnel_throat_north_wall_header'),
  ...makeShell('swim_tunnel_run', TUNNEL_RUN, {
    north: openingAlongX(TUNNEL_MOUTH_CENTER_X, -1.25, TUNNEL_MOUTH_WIDTH, 2.2),
    south: openingAlongX(TUNNEL_MOUTH_CENTER_X, -1.25, TUNNEL_MOUTH_WIDTH, 2.2),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: -0.15,
    ceilingY: -0.15,
  }),
  ...makeShell('swim_tunnel_bend', TUNNEL_BEND, {
    north: openingAlongX(TUNNEL_MOUTH_CENTER_X, -1.25, TUNNEL_MOUTH_WIDTH, 2.2),
    south: openingAlongX(TUNNEL_BEND_STAIR_OPENING_CENTER_X, -0.3, TUNNEL_BEND_STAIR_OPENING_WIDTH, 2.8),
  }, {
    rgb: TUNNEL_RGB,
    wallBottomY: -1.8,
    wallTopY: 1.4,
    ceilingY: 1.4,
  }),
  shellBlock('swim_tunnel_bend_baffle', TUNNEL_BEND_BAFFLE.minX, TUNNEL_BEND_BAFFLE.maxX, TUNNEL_BEND_BAFFLE.minY, TUNNEL_BEND_BAFFLE.maxY, TUNNEL_BEND_BAFFLE.minZ, TUNNEL_BEND_BAFFLE.maxZ, {
    rgb: TUNNEL_RGB,
    roughness: 0.96,
    emissiveScale: 0.0,
    decorIntent: 'wall',
  }),
  ...makeShell('swim_tunnel_stair_shaft', STAIR_SHAFT, {
    north: openingAlongX(TUNNEL_BEND_STAIR_OPENING_CENTER_X, -0.3, TUNNEL_BEND_STAIR_OPENING_WIDTH, 2.8),
    south: openingAlongX(TUNNEL_MOUTH_CENTER_X, 1.6, TUNNEL_MOUTH_WIDTH, 3.2),
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
  surfaceRect('swim_tunnel_run_floor', TUNNEL_RUN.minX, TUNNEL_RUN.maxX, -1.6, TUNNEL_RUN.minZ, TUNNEL_RUN.maxZ, 'service_tunnel_floor', {
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
];

const TUNNEL_STAIR_COLLIDER_STEP_COUNT = 24;
const TUNNEL_STAIR_COLLIDER_STEP_DEPTH = (STAIR_SHAFT.maxZ - STAIR_SHAFT.minZ) / TUNNEL_STAIR_COLLIDER_STEP_COUNT;
const TUNNEL_STAIR_COLLIDER_STEP_RISE = 1.6 / TUNNEL_STAIR_COLLIDER_STEP_COUNT;
const TUNNEL_STAIR_COLLIDER_FORWARD_OVERLAP = 0.72;
const TUNNEL_STAIR_HELPER_COUNT = 12;
const TUNNEL_STAIR_HELPER_DEPTH = (STAIR_SHAFT.maxZ - STAIR_SHAFT.minZ) / TUNNEL_STAIR_HELPER_COUNT;
const TUNNEL_STAIR_HELPER_RISE = 1.6 / TUNNEL_STAIR_HELPER_COUNT;
const TUNNEL_STAIR_HELPER_FORWARD_OVERLAP = 1.2;

for (let index = 0; index < TUNNEL_STAIR_COLLIDER_STEP_COUNT; index += 1) {
  const minZ = STAIR_SHAFT.minZ + (index * TUNNEL_STAIR_COLLIDER_STEP_DEPTH);
  const maxZ = Math.min(
    STAIR_SHAFT.maxZ,
    STAIR_SHAFT.minZ + ((index + 1) * TUNNEL_STAIR_COLLIDER_STEP_DEPTH) + TUNNEL_STAIR_COLLIDER_FORWARD_OVERLAP,
  );
  tunnelSurfaces.push(surfaceRect(`swim_tunnel_stair_collider_${index + 1}`, STAIR_SHAFT.minX + 0.08, STAIR_SHAFT.maxX - 0.08, -1.6 + ((index + 1) * TUNNEL_STAIR_COLLIDER_STEP_RISE), minZ, maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-stair',
    rgb: [62, 62, 62],
    visible: false,
  }));
}

for (let index = 0; index < TUNNEL_STAIR_HELPER_COUNT; index += 1) {
  const minZ = STAIR_SHAFT.minZ + (index * TUNNEL_STAIR_HELPER_DEPTH);
  const maxZ = Math.min(
    HALLWAY.minZ + 0.9,
    STAIR_SHAFT.minZ + ((index + 1) * TUNNEL_STAIR_HELPER_DEPTH) + TUNNEL_STAIR_HELPER_FORWARD_OVERLAP,
  );
  tunnelSurfaces.push(surfaceRect(`swim_tunnel_stair_helper_${index + 1}`, STAIR_SHAFT.minX + 0.04, STAIR_SHAFT.maxX - 0.04, -1.6 + ((index + 1) * TUNNEL_STAIR_HELPER_RISE), minZ, maxZ, 'service_tunnel_floor', {
    h: 0.24,
    minThickness: 0.24,
    walkableClassification: 'service-tunnel-stair',
    rgb: [62, 62, 62],
    visible: false,
  }));
}

tunnelSurfaces.push(surfaceRect('swim_tunnel_hallway_threshold_helper', DRY_VESTIBULE.minX, DRY_VESTIBULE.maxX, 0.0, STAIR_SHAFT.maxZ - 0.35, DRY_VESTIBULE.minZ + 0.9, 'hallway_floor', {
  h: 0.24,
  minThickness: 0.24,
  walkableClassification: 'room-floor',
  rgb: [70, 70, 70],
  visible: false,
}));
const DRY_STAIR_VISUAL_STEP_COUNT = 6;
const DRY_STAIR_VISUAL_STEP_DEPTH = (DRY_STAIR_SHAFT.maxZ - DRY_STAIR_SHAFT.minZ) / DRY_STAIR_VISUAL_STEP_COUNT;
const DRY_STAIR_VISUAL_STEP_RISE = 0.12 / DRY_STAIR_VISUAL_STEP_COUNT;

const hallwayBlocks = [
  ...makeShell('surfacing_hallway_vestibule', DRY_VESTIBULE, {
    north: openingAlongX(TUNNEL_BEND_STAIR_OPENING_CENTER_X, HALLWAY_CHAMBER_OPENING_CENTER_Y, TUNNEL_BEND_STAIR_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
    east: openingAlongZ(DRY_TURN_OPENING_CENTER_Z, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_TURN_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 2.8,
    ceilingY: 2.8,
  }),
  floorCover('surfacing_hallway_vestibule_floor_cover', DRY_VESTIBULE.minX, DRY_VESTIBULE.maxX, 0.08, DRY_VESTIBULE.minZ, DRY_VESTIBULE.maxZ, {
    rgb: [88, 88, 88],
    thickness: 0.12,
  }),
  ...makeShell('surfacing_hallway_turn', DRY_TURN, {
    west: openingAlongZ(DRY_TURN_OPENING_CENTER_Z, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_TURN_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
    east: openingAlongZ(DRY_TURN_OPENING_CENTER_Z, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_TURN_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 2.8,
    ceilingY: 2.8,
  }),
  floorCover('surfacing_hallway_turn_floor_cover', DRY_TURN.minX, DRY_TURN.maxX, 0.08, DRY_TURN.minZ, DRY_TURN.maxZ, {
    rgb: [86, 86, 86],
    thickness: 0.12,
  }),
  ...makeShell('surfacing_hallway_post_turn', DRY_POST_TURN, {
    west: openingAlongZ(DRY_TURN_OPENING_CENTER_Z, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_TURN_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
    south: openingAlongX(DRY_STAIR_OPENING_CENTER_X, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_STAIR_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 2.8,
    ceilingY: 2.8,
  }),
  floorCover('surfacing_hallway_post_turn_floor_cover', DRY_POST_TURN.minX, DRY_POST_TURN.maxX, 0.08, DRY_POST_TURN.minZ, DRY_POST_TURN.maxZ, {
    rgb: [86, 86, 86],
    thickness: 0.12,
  }),
  ...makeShell('surfacing_hallway_stair_shaft', DRY_STAIR_SHAFT, {
    north: openingAlongX(DRY_STAIR_OPENING_CENTER_X, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_STAIR_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
    south: openingAlongX(DRY_STAIR_OPENING_CENTER_X, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_STAIR_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 4.5,
    ceilingY: 4.5,
  }),
  ...makeShell('surfacing_hallway_upper', DRY_UPPER_HALL, {
    north: openingAlongX(DRY_STAIR_OPENING_CENTER_X, HALLWAY_CHAMBER_OPENING_CENTER_Y, DRY_STAIR_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
    south: openingAlongX(CHAMBER_ENTRY.x, HALLWAY_CHAMBER_OPENING_CENTER_Y, HALLWAY_CHAMBER_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: HALL_RGB,
    wallBottomY: 0.0,
    wallTopY: 3.2,
    ceilingY: 3.2,
  }),
  floorCover('surfacing_hallway_upper_floor_cover', DRY_UPPER_HALL.minX, DRY_UPPER_HALL.maxX, 0.08, DRY_UPPER_HALL.minZ, DRY_UPPER_HALL.maxZ, {
    rgb: [88, 88, 88],
    thickness: 0.12,
  }),
];

for (let index = 0; index < DRY_STAIR_VISUAL_STEP_COUNT; index += 1) {
  const minZ = DRY_STAIR_SHAFT.minZ + (index * DRY_STAIR_VISUAL_STEP_DEPTH);
  const maxZ = DRY_STAIR_SHAFT.minZ + ((index + 1) * DRY_STAIR_VISUAL_STEP_DEPTH);
  hallwayBlocks.push(floorCover(`surfacing_hallway_stair_cover_${index + 1}`, DRY_STAIR_SHAFT.minX + 0.08, DRY_STAIR_SHAFT.maxX - 0.08, 0.08 + ((index + 1) * DRY_STAIR_VISUAL_STEP_RISE), minZ, maxZ, {
    rgb: [92, 92, 92],
    thickness: 0.12,
    decorIntent: 'dry-stair',
  }));
}

const chamberBlocks = [
  ...makeShell('puzzle_chamber', PUZZLE_CHAMBER, {
    north: openingAlongX(CHAMBER_ENTRY.x, HALLWAY_CHAMBER_OPENING_CENTER_Y, HALLWAY_CHAMBER_OPENING_WIDTH, HALLWAY_CHAMBER_OPENING_HEIGHT),
  }, {
    rgb: CHAMBER_RGB,
    wallBottomY: 0.0,
    wallTopY: 8.0,
    ceilingY: 8.0,
  }),
  floorCover('puzzle_chamber_floor_cover', PUZZLE_CHAMBER.minX, PUZZLE_CHAMBER.maxX, 0.0, PUZZLE_CHAMBER.minZ, PUZZLE_CHAMBER.maxZ, {
    rgb: [96, 96, 96],
    thickness: 0.02,
  }),
  floorCover('puzzle_chamber_visible_floor_plate', CHAMBER_VISIBLE_FLOOR_PLATE.minX, CHAMBER_VISIBLE_FLOOR_PLATE.maxX, 0.08, CHAMBER_VISIBLE_FLOOR_PLATE.minZ, CHAMBER_VISIBLE_FLOOR_PLATE.maxZ, {
    rgb: [122, 122, 122],
    thickness: 0.08,
    roughness: 0.94,
    decorIntent: 'floor-plate',
  }),
  blockBounds('puzzle_chamber_pedestal_body', CHAMBER_PEDESTAL.minX, CHAMBER_PEDESTAL.maxX, CHAMBER_PEDESTAL.minY, CHAMBER_PEDESTAL.maxY, CHAMBER_PEDESTAL.minZ, CHAMBER_PEDESTAL.maxZ, {
    rgb: [108, 108, 108],
    roughness: 0.95,
    emissiveScale: 0.0,
    solid: true,
    structuralShell: false,
    cameraIgnore: false,
    cameraBlocker: false,
    cameraFadeable: false,
    decorIntent: 'pedestal',
  }),
  floorCover('puzzle_chamber_pedestal_cap', CHAMBER_PEDESTAL.minX - 0.04, CHAMBER_PEDESTAL.maxX + 0.04, CHAMBER_PEDESTAL.maxY, CHAMBER_PEDESTAL.minZ - 0.04, CHAMBER_PEDESTAL.maxZ + 0.04, {
    rgb: [124, 124, 124],
    thickness: 0.08,
    decorIntent: 'pedestal-top',
  }),
  blockBounds('puzzle_chamber_far_sealed_door_panel', CHAMBER_DOOR.minX, CHAMBER_DOOR.maxX, CHAMBER_DOOR.minY, CHAMBER_DOOR.maxY, CHAMBER_DOOR.minZ, CHAMBER_DOOR.maxZ, {
    rgb: [132, 132, 132],
    roughness: 0.9,
    emissiveScale: 0.0,
    solid: false,
    structuralShell: false,
    cameraIgnore: false,
    cameraBlocker: false,
    cameraFadeable: false,
    decorIntent: 'sealed-door',
  }),
  blockBounds('puzzle_chamber_side_seam_panel', CHAMBER_EAST_SEAM.minX, CHAMBER_EAST_SEAM.maxX, CHAMBER_EAST_SEAM.minY, CHAMBER_EAST_SEAM.maxY, CHAMBER_EAST_SEAM.minZ, CHAMBER_EAST_SEAM.maxZ, {
    rgb: [118, 118, 118],
    roughness: 0.97,
    emissiveScale: 0.0,
    solid: false,
    structuralShell: false,
    cameraIgnore: false,
    cameraBlocker: false,
    cameraFadeable: false,
    decorIntent: 'wall-seam',
  }),
  blockBounds('puzzle_chamber_west_seam_panel', CHAMBER_WEST_SEAM.minX, CHAMBER_WEST_SEAM.maxX, CHAMBER_WEST_SEAM.minY, CHAMBER_WEST_SEAM.maxY, CHAMBER_WEST_SEAM.minZ, CHAMBER_WEST_SEAM.maxZ, {
    rgb: [118, 118, 118],
    roughness: 0.96,
    emissiveScale: 0.0,
    solid: false,
    structuralShell: false,
    cameraIgnore: false,
    cameraBlocker: false,
    cameraFadeable: false,
    decorIntent: 'wall-seam',
  }),
  floorCover('puzzle_chamber_reward_pad', CHAMBER_REWARD_PAD.minX, CHAMBER_REWARD_PAD.maxX, -0.3, CHAMBER_REWARD_PAD.minZ, CHAMBER_REWARD_PAD.maxZ, {
    rgb: [118, 118, 118],
    thickness: 0.2,
    decorIntent: 'progression-pad',
  }),
];

export const LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 0,
  graybox: true,
  extents: {
    minX: -0.5,
    maxX: 48.5,
    minZ: -0.5,
    maxZ: 128.5,
  },
  spawnYaw: Math.PI * 0.5,
  defaultCameraPreset: 'closer',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  localCameraZones: [TUNNEL_CAMERA_ZONE],
  spawn: { x: 4.0, y: PLAYER_SPAWN_Y, z: 18.0 },
  goal: FUTURE_CHAMBER_GOAL,
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
    goalSector: 'puzzle_chamber',
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
        x: 34.8,
        z: 51.875,
        w: 6.4,
        d: 36.25,
        floorY: -1.6,
        ceilingY: 4.5,
        floorSurfaceType: 'service_tunnel_floor',
        wallLanguage: 'graybox_tunnel_shell',
        landmarks: ['dark tunnel mouth', 'submerged swim tunnel', 'blind turn before stairs'],
        shell: false,
        surfaces: tunnelSurfaces,
        decorBlocks: tunnelBlocks,
      },
      {
        id: 'surfacing_hallway',
        label: 'Surfacing Hallway',
        x: (HALLWAY.minX + HALLWAY.maxX) * 0.5,
        z: 77.0,
        w: HALLWAY.maxX - HALLWAY.minX,
        d: 14.0,
        floorY: 0.0,
        ceilingY: 4.5,
        floorSurfaceType: 'hallway_floor',
        wallLanguage: 'graybox_hallway_shell',
        landmarks: ['dry vestibule', 'blind turn', 'enclosed stairs', 'narrow hallway'],
        shell: false,
        surfaces: [
          surfaceRect('hallway_floor_vestibule', DRY_VESTIBULE.minX, DRY_VESTIBULE.maxX, 0.0, DRY_VESTIBULE.minZ, DRY_VESTIBULE.maxZ, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [94, 94, 94],
            visible: false,
          }),
          surfaceRect('hallway_floor_turn', DRY_TURN.minX, DRY_TURN.maxX, 0.0, DRY_TURN.minZ, DRY_TURN.maxZ, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [94, 94, 94],
            visible: false,
          }),
          surfaceRect('hallway_floor_post_turn', DRY_POST_TURN.minX, DRY_POST_TURN.maxX, 0.0, DRY_POST_TURN.minZ, DRY_POST_TURN.maxZ, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [94, 94, 94],
            visible: false,
          }),
          surfaceRect('hallway_floor_stair_shaft', DRY_STAIR_SHAFT.minX, DRY_STAIR_SHAFT.maxX, 0.0, DRY_STAIR_SHAFT.minZ, DRY_STAIR_SHAFT.maxZ, 'hallway_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [94, 94, 94],
            visible: false,
          }),
          surfaceRect('hallway_floor_upper', DRY_UPPER_HALL.minX, DRY_UPPER_HALL.maxX, 0.0, DRY_UPPER_HALL.minZ, DRY_UPPER_HALL.maxZ, 'hallway_floor', {
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
      {
        id: 'puzzle_chamber',
        label: 'Simple Puzzle Chamber',
        x: CHAMBER_ENTRY.x,
        z: CHAMBER_ENTRY.z + 11.0,
        w: 14.0,
        d: 22.0,
        floorY: 0.0,
        ceilingY: 8.0,
        floorSurfaceType: 'chamber_floor',
        wallLanguage: 'graybox_chamber_shell',
        landmarks: ['pedestal', 'sealed far door', 'wall seam'],
        shell: false,
        surfaces: [
          surfaceRect('puzzle_chamber_floor_south', PUZZLE_CHAMBER.minX, PUZZLE_CHAMBER.maxX, 0.0, PUZZLE_CHAMBER.minZ, HAZARD_LANE_MIN_Z, 'chamber_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [98, 98, 98],
            visible: false,
          }),
          surfaceRect('puzzle_chamber_floor_lane', PUZZLE_CHAMBER.minX, PUZZLE_CHAMBER.maxX, 0.0, HAZARD_LANE_MIN_Z, HAZARD_LANE_MAX_Z, 'chamber_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [96, 96, 96],
            visible: false,
          }),
          surfaceRect('puzzle_chamber_floor_north', PUZZLE_CHAMBER.minX, PUZZLE_CHAMBER.maxX, 0.0, HAZARD_LANE_MAX_Z, PUZZLE_CHAMBER.maxZ, 'chamber_floor', {
            h: 0.4,
            minThickness: 0.4,
            walkableClassification: 'room-floor',
            roomSurface: true,
            rgb: [98, 98, 98],
            visible: false,
          }),
        ],
        decorBlocks: chamberBlocks,
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
        x: TUNNEL_BEND_STAIR_OPENING_CENTER_X,
        z: 69.8,
        w: TUNNEL_BEND_STAIR_OPENING_WIDTH,
        d: 0.8,
        floorY: 0.0,
        ceilingY: 2.2,
        floorSurfaceType: 'threshold_floor',
        shell: false,
        surfaces: [],
      },
      {
        id: 'hallway_to_puzzle_chamber',
        label: 'Hallway To Puzzle Chamber',
        sourceSector: 'surfacing_hallway',
        destinationSector: 'puzzle_chamber',
        x: CHAMBER_ENTRY.x,
        z: CHAMBER_ENTRY.z + 0.2,
        w: HALLWAY_CHAMBER_OPENING_WIDTH,
        d: 0.4,
        floorY: 0.0,
        ceilingY: HALLWAY_CHAMBER_OPENING_CENTER_Y + (HALLWAY_CHAMBER_OPENING_HEIGHT * 0.5),
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
