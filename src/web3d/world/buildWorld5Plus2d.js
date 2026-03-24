import * as BABYLON from '@babylonjs/core';
import {
  createCardboardPlatform,
  createCheckpointMarker,
  createDaDa,
  createWelcomeSign,
  setRenderingGroup,
} from './buildWorld.js';
import { buildWorld5AquariumDrift } from './buildWorld5AquariumDrift.js';
import { getLevelMeta, getLevelThemeKey } from './levelMeta.js';

const LANE_Z = 0;

const THEME_PROFILES = {
  aquarium: {
    clearColor: [0.08, 0.20, 0.27],
    ground: [168, 194, 202],
    edge: [93, 124, 136],
    accent: [74, 170, 204],
    backdrop: [34, 84, 104],
    sign: ['AQUARIUM', 'DRIFT'],
  },
  factory: {
    clearColor: [0.23, 0.17, 0.12],
    ground: [182, 150, 116],
    edge: [112, 82, 54],
    accent: [214, 144, 66],
    backdrop: [72, 50, 34],
    sign: ['PRESSURE', 'WORKS'],
  },
  storm: {
    clearColor: [0.20, 0.28, 0.40],
    ground: [146, 160, 174],
    edge: [92, 104, 120],
    accent: [184, 212, 232],
    backdrop: [60, 74, 92],
    sign: ['STORM', 'CLIFFS'],
  },
  library: {
    clearColor: [0.28, 0.21, 0.16],
    ground: [188, 154, 114],
    edge: [112, 78, 48],
    accent: [214, 184, 122],
    backdrop: [82, 54, 34],
    sign: ['HAUNTED', 'LIBRARY'],
  },
  camp: {
    clearColor: [0.13, 0.18, 0.28],
    ground: [154, 142, 120],
    edge: [86, 70, 52],
    accent: [230, 166, 82],
    backdrop: [48, 62, 46],
    sign: ['LANTERN', 'CAMP'],
  },
};

const PLACEHOLDER_LAYOUTS = {
  5: {
    extents: { minX: -24, maxX: 62 },
    spawn: { x: -18, y: 0.42, z: LANE_Z },
    goal: { x: 49, y: 3.1, z: LANE_Z },
    ground: { x: 18, y: -0.62, z: LANE_Z, w: 88, h: 1.24, d: 12 },
    platforms: [
      { name: 'wet_deck_start', x: -11.5, y: 0.34, z: LANE_Z, w: 15, h: 0.72, d: 8.6 },
      { name: 'glass_bridge_a', x: 5.0, y: 0.84, z: LANE_Z, w: 9.6, h: 0.66, d: 5.2 },
      { name: 'service_bridge_b', x: 20.0, y: 1.36, z: LANE_Z, w: 10.6, h: 0.7, d: 5.4 },
      { name: 'tank_observe_c', x: 35.5, y: 2.0, z: LANE_Z, w: 12.4, h: 0.74, d: 6.2 },
      { name: 'goal_plinth', x: 49.0, y: 2.56, z: LANE_Z, w: 9.0, h: 0.82, d: 6.6 },
    ],
    checkpoint: { x: 20.0, y: 2.0, z: LANE_Z, label: 'Service Bridge' },
  },
  6: {
    extents: { minX: -26, maxX: 66 },
    spawn: { x: -20, y: 0.42, z: LANE_Z },
    goal: { x: 54, y: 3.22, z: LANE_Z },
    ground: { x: 20, y: -0.62, z: LANE_Z, w: 92, h: 1.24, d: 12 },
    platforms: [
      { name: 'loading_bay_start', x: -13.0, y: 0.36, z: LANE_Z, w: 15.5, h: 0.72, d: 8.0 },
      { name: 'belt_bridge', x: 4.5, y: 0.92, z: LANE_Z, w: 8.8, h: 0.64, d: 4.8 },
      { name: 'press_bay', x: 20.5, y: 1.48, z: LANE_Z, w: 10.2, h: 0.7, d: 5.4 },
      { name: 'gear_walk', x: 37.5, y: 2.02, z: LANE_Z, w: 10.0, h: 0.72, d: 5.4 },
      { name: 'goal_deck', x: 54.0, y: 2.62, z: LANE_Z, w: 10.2, h: 0.84, d: 6.4 },
    ],
    checkpoint: { x: 20.5, y: 2.12, z: LANE_Z, label: 'Press Bay' },
  },
  7: {
    extents: { minX: -28, maxX: 68 },
    spawn: { x: -22, y: 0.42, z: LANE_Z },
    goal: { x: 56, y: 3.42, z: LANE_Z },
    ground: { x: 20, y: -0.62, z: LANE_Z, w: 96, h: 1.24, d: 12 },
    platforms: [
      { name: 'ridge_start', x: -14.0, y: 0.34, z: LANE_Z, w: 14.0, h: 0.72, d: 7.8 },
      { name: 'gust_span', x: 2.5, y: 1.02, z: LANE_Z, w: 8.0, h: 0.6, d: 4.6 },
      { name: 'cliff_shelf', x: 19.0, y: 1.82, z: LANE_Z, w: 10.4, h: 0.72, d: 5.0 },
      { name: 'storm_peak', x: 37.0, y: 2.54, z: LANE_Z, w: 10.8, h: 0.72, d: 5.4 },
      { name: 'goal_lookout', x: 56.0, y: 2.9, z: LANE_Z, w: 11.0, h: 0.84, d: 6.8 },
    ],
    checkpoint: { x: 19.0, y: 2.46, z: LANE_Z, label: 'Cliff Shelf' },
  },
  8: {
    extents: { minX: -24, maxX: 64 },
    spawn: { x: -18, y: 0.42, z: LANE_Z },
    goal: { x: 52, y: 3.18, z: LANE_Z },
    ground: { x: 20, y: -0.62, z: LANE_Z, w: 88, h: 1.24, d: 12 },
    platforms: [
      { name: 'archive_entry', x: -10.5, y: 0.34, z: LANE_Z, w: 16.0, h: 0.72, d: 8.6 },
      { name: 'reading_hall', x: 8.0, y: 0.86, z: LANE_Z, w: 12.0, h: 0.68, d: 6.0 },
      { name: 'gallery_lift', x: 24.0, y: 1.52, z: LANE_Z, w: 11.0, h: 0.7, d: 5.6 },
      { name: 'stacks_room', x: 39.5, y: 2.12, z: LANE_Z, w: 12.6, h: 0.74, d: 6.2 },
      { name: 'goal_gallery', x: 52.0, y: 2.62, z: LANE_Z, w: 9.6, h: 0.84, d: 6.2 },
    ],
    checkpoint: { x: 24.0, y: 2.16, z: LANE_Z, label: 'Upper Gallery' },
  },
  9: {
    extents: { minX: -26, maxX: 70 },
    spawn: { x: -20, y: 0.42, z: LANE_Z },
    goal: { x: 58, y: 3.26, z: LANE_Z },
    ground: { x: 22, y: -0.62, z: LANE_Z, w: 96, h: 1.24, d: 12 },
    platforms: [
      { name: 'forest_entry', x: -12.5, y: 0.34, z: LANE_Z, w: 15.0, h: 0.72, d: 8.0 },
      { name: 'boardwalk_a', x: 4.0, y: 0.88, z: LANE_Z, w: 8.8, h: 0.64, d: 4.6 },
      { name: 'bonfire_clearing', x: 22.0, y: 1.52, z: LANE_Z, w: 14.0, h: 0.74, d: 6.8 },
      { name: 'overlook_rise', x: 40.5, y: 2.12, z: LANE_Z, w: 10.6, h: 0.72, d: 5.4 },
      { name: 'goal_peak', x: 58.0, y: 2.68, z: LANE_Z, w: 10.6, h: 0.84, d: 6.4 },
    ],
    checkpoint: { x: 22.0, y: 2.16, z: LANE_Z, label: 'Bonfire Clearing' },
  },
};

function makeColor(rgb) {
  return new BABYLON.Color3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

function createShadowLight(scene) {
  const light = new BABYLON.DirectionalLight('level5plus2d_keyLight', new BABYLON.Vector3(-0.4, -1, 0.24), scene);
  light.position = new BABYLON.Vector3(18, 20, -18);
  light.intensity = 1.08;
  const shadowGen = new BABYLON.ShadowGenerator(1024, light);
  shadowGen.usePercentageCloserFiltering = true;
  return shadowGen;
}

function markDecor(node) {
  if (!node) return;
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
    decor: true,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
      decor: true,
    };
  }
}

function createOpaqueMaterial(scene, name, rgb) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = makeColor(rgb);
  mat.emissiveColor = makeColor(rgb).scale(0.12);
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

function createDecorBox(scene, name, { x, y, z, w, h, d, rgb, shadowGen }) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width: w,
    height: h,
    depth: d,
  }, scene);
  mesh.position.set(x, y, z);
  mesh.material = createOpaqueMaterial(scene, `${name}_mat`, rgb);
  mesh.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(mesh);
  markDecor(mesh);
  return mesh;
}

function createPlatformCollider(scene, name, def) {
  const col = BABYLON.MeshBuilder.CreateBox(`${name}_col`, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  col.position.set(def.x, def.y, def.z ?? LANE_Z);
  col.visibility = 0;
  col.isPickable = false;
  return col;
}

function buildBackdrop(scene, themeKey, layout, profile, shadowGen) {
  const extentWidth = layout.extents.maxX - layout.extents.minX;
  const centerX = (layout.extents.minX + layout.extents.maxX) * 0.5;
  const backZ = 7.6;
  createDecorBox(scene, `${themeKey}_backdrop_wall`, {
    x: centerX,
    y: 4.2,
    z: backZ,
    w: extentWidth + 8,
    h: 8.4,
    d: 1.2,
    rgb: profile.backdrop,
    shadowGen,
  });

  if (themeKey === 'aquarium') {
    createDecorBox(scene, 'aquarium_frame_left', { x: centerX - 16, y: 4.2, z: backZ - 0.8, w: 3.2, h: 6.4, d: 0.8, rgb: profile.accent, shadowGen });
    createDecorBox(scene, 'aquarium_frame_center', { x: centerX + 4, y: 4.2, z: backZ - 0.8, w: 3.2, h: 6.4, d: 0.8, rgb: profile.accent, shadowGen });
    createDecorBox(scene, 'aquarium_frame_right', { x: centerX + 24, y: 4.2, z: backZ - 0.8, w: 3.2, h: 6.4, d: 0.8, rgb: profile.accent, shadowGen });
  } else if (themeKey === 'factory') {
    for (const x of [centerX - 18, centerX, centerX + 18]) {
      createDecorBox(scene, `factory_window_${x}`, { x, y: 4.4, z: backZ - 0.7, w: 8.0, h: 3.2, d: 0.6, rgb: profile.accent, shadowGen });
    }
    createDecorBox(scene, 'factory_truss', { x: centerX, y: 7.1, z: backZ - 1.1, w: extentWidth + 4, h: 0.5, d: 0.6, rgb: [92, 72, 52], shadowGen });
  } else if (themeKey === 'storm') {
    createDecorBox(scene, 'storm_cliff_left', { x: centerX - 22, y: 5.0, z: backZ - 0.8, w: 16, h: 8.0, d: 1.0, rgb: [84, 96, 110], shadowGen });
    createDecorBox(scene, 'storm_cliff_mid', { x: centerX + 2, y: 4.6, z: backZ - 0.7, w: 20, h: 7.2, d: 1.0, rgb: [98, 112, 128], shadowGen });
    createDecorBox(scene, 'storm_cliff_right', { x: centerX + 26, y: 5.2, z: backZ - 0.9, w: 14, h: 8.4, d: 1.0, rgb: [86, 98, 116], shadowGen });
  } else if (themeKey === 'library') {
    for (const y of [1.8, 3.0, 4.2, 5.4, 6.6]) {
      createDecorBox(scene, `library_shelf_${y}`, { x: centerX, y, z: backZ - 0.75, w: extentWidth + 4, h: 0.22, d: 0.45, rgb: profile.accent, shadowGen });
    }
  } else if (themeKey === 'camp') {
    for (const x of [centerX - 20, centerX - 8, centerX + 4, centerX + 18, centerX + 30]) {
      createDecorBox(scene, `camp_tree_${x}`, { x, y: 4.8, z: backZ - 0.7, w: 2.0, h: 7.4, d: 0.8, rgb: [68, 88, 62], shadowGen });
      createDecorBox(scene, `camp_tree_cap_${x}`, { x, y: 7.5, z: backZ - 0.8, w: 5.2, h: 2.6, d: 0.9, rgb: [82, 108, 74], shadowGen });
    }
  }
}

function createGroundVisual(scene, layout, profile, shadowGen) {
  const groundVisual = createCardboardPlatform(scene, 'level5plus2d_ground_visual', {
    x: layout.ground.x,
    y: layout.ground.y,
    z: layout.ground.z,
    w: layout.ground.w,
    h: layout.ground.h,
    d: layout.ground.d,
    slabColor: profile.ground,
    edgeColor: profile.edge,
    shadowGen,
  });
  setRenderingGroup(groundVisual, 1);
  return groundVisual;
}

export function buildWorld5Plus2d(scene, levelId, { animateGoal = true } = {}) {
  if (Number(levelId) === 5) {
    return buildWorld5AquariumDrift(scene, { animateGoal });
  }

  const meta = getLevelMeta(levelId);
  const themeKey = getLevelThemeKey(levelId);
  const profile = THEME_PROFILES[themeKey];
  const layout = PLACEHOLDER_LAYOUTS[levelId];

  if (!profile || !layout) {
    throw new Error(`Missing 2.5D placeholder profile for level ${levelId}.`);
  }

  scene.clearColor = new BABYLON.Color4(...profile.clearColor, 1);

  const hemi = new BABYLON.HemisphericLight(`level${levelId}_fillLight`, new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.9;
  hemi.groundColor = new BABYLON.Color3(0.18, 0.15, 0.12);
  const shadowGen = createShadowLight(scene);

  const groundVisual = createGroundVisual(scene, layout, profile, shadowGen);
  const groundCollider = createPlatformCollider(scene, 'level5plus2d_ground', layout.ground);
  const platforms = [groundCollider];
  const surfaceVisuals = { ground: groundVisual };

  for (const def of layout.platforms) {
    const visual = createCardboardPlatform(scene, `level${levelId}_${def.name}`, {
      x: def.x,
      y: def.y,
      z: def.z ?? LANE_Z,
      w: def.w,
      h: def.h,
      d: def.d,
      slabColor: profile.ground,
      edgeColor: profile.edge,
      shadowGen,
    });
    setRenderingGroup(visual, 2);
    surfaceVisuals[def.name] = visual;
    platforms.push(createPlatformCollider(scene, `level${levelId}_${def.name}`, def));
  }

  buildBackdrop(scene, themeKey, layout, profile, shadowGen);

  const sign = createWelcomeSign(scene, {
    name: `level${levelId}_theme_sign`,
    x: layout.spawn.x + 3.8,
    y: 0.02,
    z: 3.5,
    shadowGen,
    textLines: profile.sign,
    width: 2.72,
    height: 1.24,
    boardColor: profile.accent,
    postColor: profile.edge,
    boardName: `level${levelId}_theme_sign`,
  });
  setRenderingGroup(sign, 2);

  const dad = createDaDa(scene, layout.goal.x, layout.goal.y, shadowGen, { animate: animateGoal });
  setRenderingGroup(dad.root, 3);

  const checkpoint = {
    index: 1,
    label: layout.checkpoint.label,
    radius: 1.35,
    spawn: { x: layout.checkpoint.x, y: layout.checkpoint.y, z: layout.checkpoint.z },
    marker: createCheckpointMarker(scene, `level${levelId}_checkpoint_1`, {
      x: layout.checkpoint.x,
      y: layout.checkpoint.y,
      z: layout.checkpoint.z,
      shadowGen,
    }),
  };
  setRenderingGroup(checkpoint.marker, 3);

  const level = {
    id: levelId,
    runtimeFamily: '2.5d',
    theme: meta.theme,
    themeKey,
    title: meta.title,
    subtitle: meta.subtitle,
    descriptor: meta.descriptor,
    totalCollectibles: meta.totalCollectibles ?? 0,
    extents: layout.extents,
    spawn: layout.spawn,
    goal: layout.goal,
    ground: layout.ground,
    platforms: layout.platforms,
    goalPresentation: 'visible_dad',
  };

  return {
    ground: groundCollider,
    groundVisual,
    platforms,
    goal: dad.goal,
    goalRoot: dad.root,
    goalPresentation: 'visible_dad',
    goalGuardMinX: layout.goal.x - 4.5,
    shadowGen,
    foregroundMeshes: [],
    extents: layout.extents,
    spawn: layout.spawn,
    checkpoints: [checkpoint],
    pickups: [],
    coins: [],
    hazards: [],
    crumbles: [],
    level,
    goalMinBottomY: (layout.platforms[layout.platforms.length - 1].y + (layout.platforms[layout.platforms.length - 1].h * 0.5)) - 0.2,
    signs: [sign],
    respawnAnchors: [],
    surfaceVisuals,
    assetAnchors: {
      cribRail: null,
      toyBlocks: [],
      goalBanner: null,
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
    },
    runtimeFamily: '2.5d',
    themeKey,
  };
}
