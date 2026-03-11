const DEFAULT_WALKABLE_HEIGHT = 0.72;
export const MIN_WALKABLE_THICKNESS = 0.48;

function makeId(prefix, id) {
  return `${prefix}_${String(id || 'unnamed').replace(/[^a-z0-9_]+/gi, '_')}`;
}

function resolveValue(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function resolveCenteredAxis(parentValue, absoluteValue, offsetValue = 0) {
  return Number.isFinite(absoluteValue)
    ? absoluteValue
    : resolveValue(parentValue, 0) + resolveValue(offsetValue, 0);
}

function resolveBoxCenterY(def, parentFloorY, height) {
  if (Number.isFinite(def.y)) return def.y;
  const topY = resolveValue(def.topY, resolveValue(def.floorY, parentFloorY));
  return topY - (height * 0.5);
}

function cloneLandmarks(list) {
  return Array.isArray(list) ? list.map((item) => String(item)) : [];
}

function resolveBounds(node) {
  const x = resolveValue(node.x, resolveValue(node.bounds?.x, 0));
  const z = resolveValue(node.z, resolveValue(node.bounds?.z, 0));
  const w = resolveValue(node.w, resolveValue(node.bounds?.w, 12));
  const d = resolveValue(node.d, resolveValue(node.bounds?.d, 12));
  return { x, z, w, d };
}

function cloneSurface(def, owner, ownerType) {
  const h = Math.max(
    0.12,
    resolveValue(def.h, resolveValue(def.thickness, DEFAULT_WALKABLE_HEIGHT)),
  );
  const surfaceId = makeId(owner.id, def.id || def.name || def.surfaceType || 'surface');
  return {
    ...def,
    id: def.id || surfaceId,
    name: def.name || surfaceId,
    authoredSurfaceId: surfaceId,
    ownerType,
    ownerId: owner.id,
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    w: resolveValue(def.w, 6),
    d: resolveValue(def.d, 6),
    h,
    y: resolveBoxCenterY(def, owner.floorY, h),
    visible: def.visible !== false,
    walkable: def.walkable !== false,
    walkableClassification: def.walkableClassification || def.classification || 'floor',
    surfaceType: def.surfaceType || owner.floorSurfaceType || 'generic',
    sectorId: ownerType === 'sector' ? owner.id : def.sectorId || null,
    connectorId: ownerType === 'connector' ? owner.id : null,
    minThickness: resolveValue(def.minThickness, MIN_WALKABLE_THICKNESS),
  };
}

function cloneBlock(def, owner, defaultRgb) {
  return {
    ...def,
    name: def.name || makeId(owner.id, 'block'),
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + resolveValue(def.h, 6) * 0.5),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    w: resolveValue(def.w, 4),
    h: resolveValue(def.h, 4),
    d: resolveValue(def.d, 4),
    rgb: def.rgb || defaultRgb,
  };
}

function cloneColumn(def, owner, defaultRgb) {
  const height = resolveValue(def.height, 6);
  return {
    ...def,
    name: def.name || makeId(owner.id, 'column'),
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + (height * 0.5)),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    diameter: resolveValue(def.diameter, 1.2),
    diameterTop: def.diameterTop ?? null,
    diameterBottom: def.diameterBottom ?? null,
    height,
    rgb: def.rgb || defaultRgb,
  };
}

function clonePlatform(def, owner, defaultRgb) {
  return {
    ...def,
    name: def.name || makeId(owner.id, 'platform'),
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + resolveValue(def.h, 0.3) * 0.5),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    w: resolveValue(def.w, 4),
    h: resolveValue(def.h, 0.3),
    d: resolveValue(def.d, 4),
    rgb: def.rgb || defaultRgb,
  };
}

function cloneSign(def, owner) {
  return {
    ...def,
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + 4.8),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    width: resolveValue(def.width, 6.5),
    height: resolveValue(def.height, 1.7),
  };
}

function cloneCheckpoint(def, owner, index) {
  return {
    ...def,
    id: def.id || makeId(owner.id, `checkpoint_${index}`),
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + 0.48),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
    label: def.label || owner.label || `Checkpoint ${index + 1}`,
  };
}

function cloneDrop(def, owner, index) {
  return {
    ...def,
    name: def.name || makeId(owner.id, `drop_${index}`),
    x: resolveCenteredAxis(owner.x, def.x, def.offsetX),
    y: resolveValue(def.y, owner.floorY + 1.02),
    z: resolveCenteredAxis(owner.z, def.z, def.offsetZ),
  };
}

function computeExtentsFromBoxes(boxes) {
  if (!boxes.length) {
    return { minX: -20, maxX: 40, minZ: -10, maxZ: 10 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x - (box.w * 0.5));
    maxX = Math.max(maxX, box.x + (box.w * 0.5));
    minZ = Math.min(minZ, box.z - (box.d * 0.5));
    maxZ = Math.max(maxZ, box.z + (box.d * 0.5));
  }
  return { minX, maxX, minZ, maxZ };
}

function buildShellDecor(owner, shell, defaultRgb) {
  if (shell === false) return { blocks: [], platforms: [] };
  const bounds = resolveBounds(owner);
  const wallHeight = resolveValue(shell?.wallHeight, resolveValue(owner.ceilingY, owner.floorY + 8) - owner.floorY);
  const wallThickness = resolveValue(shell?.wallThickness, 1.1);
  const wallRgb = shell?.rgb || defaultRgb;
  const openSides = new Set(shell?.openSides || []);
  const blocks = [];
  const platforms = [];

  const sides = [
    { side: 'north', x: bounds.x, z: bounds.z - (bounds.d * 0.5) - (wallThickness * 0.5), w: bounds.w + wallThickness, d: wallThickness },
    { side: 'south', x: bounds.x, z: bounds.z + (bounds.d * 0.5) + (wallThickness * 0.5), w: bounds.w + wallThickness, d: wallThickness },
    { side: 'west', x: bounds.x - (bounds.w * 0.5) - (wallThickness * 0.5), z: bounds.z, w: wallThickness, d: bounds.d + wallThickness },
    { side: 'east', x: bounds.x + (bounds.w * 0.5) + (wallThickness * 0.5), z: bounds.z, w: wallThickness, d: bounds.d + wallThickness },
  ];
  for (const side of sides) {
    if (openSides.has(side.side)) continue;
    blocks.push({
      name: `${owner.id}_${side.side}_wall`,
      x: side.x,
      y: owner.floorY + (wallHeight * 0.5),
      z: side.z,
      w: side.w,
      h: wallHeight,
      d: side.d,
      rgb: wallRgb,
      emissiveScale: shell?.emissiveScale ?? 0.03,
      roughness: shell?.roughness ?? 0.88,
    });
  }

  if (owner.openSky || shell?.ceiling === false) {
    return { blocks, platforms };
  }

  const ceilingY = resolveValue(owner.ceilingY, owner.floorY + wallHeight + 0.2);
  platforms.push({
    name: `${owner.id}_ceiling`,
    x: bounds.x,
    y: ceilingY,
    z: bounds.z,
    w: Math.max(2, bounds.w - 0.6),
    h: 0.24,
    d: Math.max(2, bounds.d - 0.6),
    rgb: shell?.ceilingRgb || wallRgb,
  });

  const beamCount = Math.max(0, resolveValue(shell?.beamCount, 0));
  if (beamCount > 0) {
    for (let i = 0; i < beamCount; i += 1) {
      const t = beamCount === 1 ? 0.5 : i / (beamCount - 1);
      const beamX = bounds.x - (bounds.w * 0.40) + (t * bounds.w * 0.80);
      platforms.push({
        name: `${owner.id}_beam_${i}`,
        x: beamX,
        y: ceilingY - 0.48,
        z: bounds.z,
        w: 0.34,
        h: 0.28,
        d: Math.max(2, bounds.d - 1.2),
        rgb: shell?.beamRgb || wallRgb,
      });
    }
  }

  return { blocks, platforms };
}

function normalizeSpaceNode(def, ownerType) {
  const bounds = resolveBounds(def);
  const floorY = resolveValue(def.floorY, 0.72);
  const node = {
    ...def,
    id: def.id || makeId(ownerType, def.label || ownerType),
    x: bounds.x,
    z: bounds.z,
    w: bounds.w,
    d: bounds.d,
    floorY,
    ceilingY: def.openSky ? null : resolveValue(def.ceilingY, floorY + 8.4),
    openSky: !!def.openSky,
    floorSurfaceType: def.floorSurfaceType || 'generic',
    wallLanguage: def.wallLanguage || 'generic',
    landmarks: cloneLandmarks(def.landmarks),
  };
  const defaultRgb = def.rgb || [78, 62, 46];
  const surfaces = (def.surfaces || []).map((surface) => cloneSurface(surface, node, ownerType));
  const shellDecor = buildShellDecor(node, def.shell, defaultRgb);
  return {
    ...node,
    surfaces,
    decorBlocks: [
      ...shellDecor.blocks,
      ...(def.decorBlocks || []).map((block) => cloneBlock(block, node, defaultRgb)),
    ],
    decorColumns: (def.decorColumns || []).map((column) => cloneColumn(column, node, defaultRgb)),
    decorPlatforms: [
      ...shellDecor.platforms,
      ...(def.decorPlatforms || []).map((platform) => clonePlatform(platform, node, defaultRgb)),
    ],
    signage: (def.signage || []).map((sign) => cloneSign(sign, node)),
    checkpoints: (def.checkpoints || []).map((checkpoint, index) => cloneCheckpoint(checkpoint, node, index)),
    drops: (def.drops || []).map((drop, index) => cloneDrop(drop, node, index)),
  };
}

function analyzeTopology(sectors, connectors, startSectorId, goalSectorId) {
  const adjacency = new Map();
  const ensure = (id) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return adjacency.get(id);
  };
  for (const sector of sectors) ensure(sector.id);
  for (const connector of connectors) {
    ensure(connector.sourceSector).add(connector.destinationSector);
    ensure(connector.destinationSector).add(connector.sourceSector);
  }

  const routeChoices = [];
  for (const [sectorId, links] of adjacency.entries()) {
    if (links.size >= 2) {
      routeChoices.push({
        sectorId,
        degree: links.size,
      });
    }
  }

  const visited = new Set();
  let hasCycle = false;
  function walk(nodeId, parentId = null) {
    visited.add(nodeId);
    for (const nextId of adjacency.get(nodeId) || []) {
      if (nextId === parentId) continue;
      if (visited.has(nextId)) {
        hasCycle = true;
        continue;
      }
      walk(nextId, nodeId);
    }
  }
  if (startSectorId && adjacency.has(startSectorId)) {
    walk(startSectorId, null);
  }

  return {
    sectorCount: sectors.length,
    connectorCount: connectors.length,
    startSectorId,
    goalSectorId,
    hasCycle,
    routeChoices,
    adjacency: Object.fromEntries(
      [...adjacency.entries()].map(([id, links]) => [id, [...links.values()]])
    ),
  };
}

export function compileAuthoredEraLayout(layout) {
  if (!layout?.authoredMap) return layout;
  const authoredMap = layout.authoredMap;
  const sectors = (authoredMap.sectors || []).map((sector) => normalizeSpaceNode(sector, 'sector'));
  const connectors = (authoredMap.connectors || []).map((connector) => ({
    ...normalizeSpaceNode(connector, 'connector'),
    sourceSector: connector.sourceSector,
    destinationSector: connector.destinationSector,
    type: connector.type || 'hall',
    blocked: !!connector.blocked,
  }));

  const surfaces = [
    ...sectors.flatMap((sector) => sector.surfaces),
    ...connectors.flatMap((connector) => connector.surfaces),
  ];
  const platforms = surfaces.map((surface) => ({
    ...surface,
    name: surface.name,
    x: surface.x,
    y: surface.y,
    z: surface.z,
    w: surface.w,
    h: surface.h,
    d: surface.d,
    visible: surface.visible,
  }));

  const allBoxes = [
    ...sectors,
    ...connectors,
    ...platforms,
  ];
  const extents = layout.extents || computeExtentsFromBoxes(allBoxes);
  const depthSpan = Math.max(18, (extents.maxZ ?? 10) - (extents.minZ ?? -10));
  const sinkGround = layout.ground || {
    x: (extents.minX + extents.maxX) * 0.5,
    y: -20,
    z: (extents.minZ + extents.maxZ) * 0.5,
    w: Math.max(24, (extents.maxX - extents.minX) + 18),
    h: 2,
    d: depthSpan + 12,
  };

  const startSectorId = authoredMap.startSector
    || sectors.find((sector) => (
      layout.spawn.x >= sector.x - (sector.w * 0.5)
      && layout.spawn.x <= sector.x + (sector.w * 0.5)
      && (layout.spawn.z ?? 0) >= sector.z - (sector.d * 0.5)
      && (layout.spawn.z ?? 0) <= sector.z + (sector.d * 0.5)
    ))?.id
    || sectors[0]?.id
    || null;
  const goalSectorId = authoredMap.goalSector
    || sectors.find((sector) => (
      layout.goal.x >= sector.x - (sector.w * 0.5)
      && layout.goal.x <= sector.x + (sector.w * 0.5)
      && (layout.goal.z ?? 0) >= sector.z - (sector.d * 0.5)
      && (layout.goal.z ?? 0) <= sector.z + (sector.d * 0.5)
    ))?.id
    || sectors[sectors.length - 1]?.id
    || null;

  const topology = analyzeTopology(sectors, connectors, startSectorId, goalSectorId);

  return {
    ...layout,
    extents: {
      minX: extents.minX,
      maxX: extents.maxX,
      minZ: extents.minZ,
      maxZ: extents.maxZ,
    },
    ground: sinkGround,
    platforms,
    decorPlatforms: [
      ...(layout.decorPlatforms || []),
      ...sectors.flatMap((sector) => sector.decorPlatforms),
      ...connectors.flatMap((connector) => connector.decorPlatforms),
    ],
    decorBlocks: [
      ...(layout.decorBlocks || []),
      ...sectors.flatMap((sector) => sector.decorBlocks),
      ...connectors.flatMap((connector) => connector.decorBlocks),
    ],
    decorColumns: [
      ...(layout.decorColumns || []),
      ...sectors.flatMap((sector) => sector.decorColumns),
      ...connectors.flatMap((connector) => connector.decorColumns),
    ],
    checkpoints: [
      ...(layout.checkpoints || []),
      ...sectors.flatMap((sector) => sector.checkpoints),
      ...connectors.flatMap((connector) => connector.checkpoints),
    ],
    drops: [
      ...(layout.drops || []),
      ...sectors.flatMap((sector) => sector.drops),
      ...connectors.flatMap((connector) => connector.drops),
    ],
    signage: [
      ...(layout.signage || []),
      ...sectors.flatMap((sector) => sector.signage),
      ...connectors.flatMap((connector) => connector.signage),
    ],
    authoredMap: {
      ...authoredMap,
      sectors,
      connectors,
      walkableSurfaces: surfaces.filter((surface) => surface.walkable !== false),
      topology,
    },
  };
}

export function createAuthoredSurfaceAudit(authoredMap, colliderMeshes = [], visualRoots = []) {
  if (!authoredMap) return null;
  const colliderById = new Map();
  for (const mesh of colliderMeshes) {
    const surfaceId = mesh?.metadata?.authoredSurfaceId;
    if (surfaceId) colliderById.set(surfaceId, mesh);
  }
  const visualById = new Map();
  for (const root of visualRoots) {
    const surfaceId = root?.metadata?.authoredSurfaceId;
    if (surfaceId) visualById.set(surfaceId, root);
  }

  const missingCollision = [];
  const underThickness = [];
  const hiddenWalkables = [];
  const unclassifiedWalkables = [];
  for (const surface of authoredMap.walkableSurfaces || []) {
    if (!colliderById.has(surface.authoredSurfaceId)) {
      missingCollision.push(surface.authoredSurfaceId);
    }
    if ((surface.h ?? surface.thickness ?? 0) < (surface.minThickness ?? MIN_WALKABLE_THICKNESS)) {
      underThickness.push({
        id: surface.authoredSurfaceId,
        thickness: surface.h ?? surface.thickness ?? 0,
        minThickness: surface.minThickness ?? MIN_WALKABLE_THICKNESS,
      });
    }
    if (surface.visible !== false) {
      const visual = visualById.get(surface.authoredSurfaceId);
      if (!visual || visual.isEnabled?.() === false) {
        hiddenWalkables.push(surface.authoredSurfaceId);
      }
    }
    if (!surface.walkableClassification) {
      unclassifiedWalkables.push(surface.authoredSurfaceId);
    }
  }

  return {
    walkableSurfaceCount: (authoredMap.walkableSurfaces || []).length,
    missingCollision,
    underThickness,
    hiddenWalkables,
    unclassifiedWalkables,
    topology: authoredMap.topology,
  };
}
