import * as BABYLON from '@babylonjs/core';
import {
  createCheckpointMarker,
  createCoin,
  setRenderingGroup,
} from './buildWorld.js';
import {
  createDad,
  createGrandma,
  createMom,
  createSimpleChair,
} from './characters.js';
import { createTelegraphedHazard } from './telegraphHazard.js';
import { NoiseWanderMover } from './noiseMover.js';
import { createThemeEnvironmentFx, markDecorNode } from './envFx.js';
import { createAuthoredSurfaceAudit } from './eraAuthoredLayout.js';
import { makeCardboard, makePlastic, makePaper } from '../materials.js';

const THEME_PALETTES = {
  aquarium: {
    slab: [48, 94, 108],
    rim: [10, 24, 34],
    glow: [154, 240, 255],
    line: [228, 248, 255],
    enemy: [118, 255, 246],
    accent: [255, 170, 236],
    goalOutfit: 'level3',
  },
  factory: {
    slab: [72, 78, 86],       // dark steel grey
    rim: [28, 32, 38],        // darker steel
    glow: [255, 186, 64],     // orange glow
    line: [255, 196, 60],     // hazard stripe amber
    enemy: [214, 146, 80],
    accent: [240, 148, 54],   // orange accent
    goalOutfit: 'level1',
  },
  storm: {
    slab: [110, 108, 98],
    rim: [56, 48, 40],
    glow: [176, 214, 255],
    line: [218, 222, 190],
    enemy: [128, 170, 248],
    accent: [248, 224, 122],
    goalOutfit: 'level1',
  },
  library: {
    slab: [148, 114, 86],
    rim: [66, 42, 26],
    glow: [244, 214, 134],
    line: [255, 232, 168],
    enemy: [214, 192, 146],
    accent: [246, 206, 118],
    goalOutfit: 'level1',
  },
  camp: {
    slab: [104, 90, 82],
    rim: [42, 30, 28],
    glow: [255, 206, 126],
    line: [255, 224, 164],
    enemy: [226, 184, 144],
    accent: [255, 188, 104],
    goalOutfit: 'level1',
  },
};

const THEME_SCENE_LOOKS = {
  aquarium: {
    clear: [6, 24, 34, 255],
    fog: [10, 58, 78],
    fogStart: 54,
    fogEnd: 182,
    keyDir: [-0.24, -1.0, 0.22],
    keyIntensity: 1.14,
    hemiIntensity: 0.72,
    hemiColor: [116, 184, 204],
    hemiGround: [0.01, 0.03, 0.05],
    rimOffset: [-10, 18, -12],
    rimIntensity: 0.54,
  },
  factory: {
    clear: [68, 48, 28, 255],    // warm industrial amber — was near-black [34,24,16]
    fog: [110, 78, 46],          // amber haze — was [82,58,34]
    fogStart: 52,                // was 48
    fogEnd: 195,
    keyDir: [-0.34, -1.0, 0.24],
    keyIntensity: 1.22,          // was 1.12
    hemiIntensity: 0.90,         // was 0.72
    hemiColor: [224, 184, 132],  // was [202,164,118]
    hemiGround: [0.05, 0.04, 0.02],
    rimOffset: [-6, 18, -9],
    rimIntensity: 0.54,          // was 0.48
  },
  storm: {
    clear: [42, 64, 108, 255],   // readable stormy blue — was near-black [14,20,38]
    fog: [60, 92, 148],          // blue-grey haze — was [30,42,66]
    fogStart: 46,                // was 34
    fogEnd: 178,                 // was 168
    keyDir: [-0.18, -1.0, 0.32],
    keyIntensity: 1.38,          // was 1.22
    hemiIntensity: 0.74,         // was 0.56
    hemiColor: [124, 168, 220],  // was [108,144,192]
    hemiGround: [0.02, 0.05, 0.08],
    rimOffset: [-18, 22, -6],
    rimIntensity: 0.80,          // was 0.66
  },
  library: {
    clear: [58, 38, 22, 255],    // warm sepia amber — was near-black [20,13,10]
    fog: [108, 74, 46],          // warm sepia haze — was [78,50,28]
    fogStart: 44,                // was 24 (too aggressive — fixed)
    fogEnd: 148,                 // was 132
    keyDir: [-0.26, -1.0, 0.20],
    keyIntensity: 1.14,          // was 0.98
    hemiIntensity: 0.86,         // was 0.64
    hemiColor: [222, 194, 148],  // was [214,186,138]
    hemiGround: [0.08, 0.05, 0.02],
    rimOffset: [-10, 16, -8],
    rimIntensity: 0.84,          // was 0.72
  },
  camp: {
    clear: [28, 40, 74, 255],    // deep starlit blue-purple — was near-black [8,11,20]
    fog: [58, 50, 38],           // warm dusk haze — was [28,22,18]
    fogStart: 52,                // was 44
    fogEnd: 182,                 // was 176
    keyDir: [-0.20, -1.0, 0.18],
    keyIntensity: 1.08,          // was 0.92
    hemiIntensity: 0.68,         // was 0.46
    hemiColor: [154, 144, 166],  // was [132,126,150]
    hemiGround: [0.05, 0.04, 0.05],
    rimOffset: [-12, 15, -10],
    rimIntensity: 0.96,          // was 0.82
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function wrapToPi(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

function toColor3(rgb, scale = 1) {
  return new BABYLON.Color3(
    (rgb[0] / 255) * scale,
    (rgb[1] / 255) * scale,
    (rgb[2] / 255) * scale,
  );
}

function toColor4(rgb, alpha = 1) {
  return new BABYLON.Color4(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha);
}

function distanceToSegment2D(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const abLenSq = (abx * abx) + (abz * abz);
  if (abLenSq <= 0.0001) return Math.hypot(px - ax, pz - az);
  const apx = px - ax;
  const apz = pz - az;
  const t = clamp(((apx * abx) + (apz * abz)) / abLenSq, 0, 1);
  const sx = ax + (abx * t);
  const sz = az + (abz * t);
  return Math.hypot(px - sx, pz - sz);
}

function makeInvisibleCollider(scene, name, def) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  mesh.position.set(def.x, def.y, def.z ?? 0);
  mesh.visibility = 0;
  mesh.isPickable = false;
  if (def?.authoredSurfaceId) {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      authoredSurfaceId: def.authoredSurfaceId,
      gameplaySurface: true,
      gameplay: true,
    };
  }
  return mesh;
}

function makeSolidBlockerCollider(scene, name, def, metadata = {}) {
  const mesh = makeInvisibleCollider(scene, name, def);
  mesh.metadata = {
    ...(mesh.metadata || {}),
    gameplayBlocker: true,
    gameplay: false,
    ...metadata,
  };
  return mesh;
}

function markDecor(node) {
  markDecorNode(node, { cameraBlocker: false });
}

function markGameplaySurface(node) {
  if (!node) return;
  node.metadata = {
    ...(node.metadata || {}),
    gameplaySurface: true,
    gameplay: true,
  };
}

function markDecorStructure(node) {
  if (!node) return;
  markDecor(node);
  node.metadata = {
    ...(node.metadata || {}),
    gameplaySurface: false,
    gameplay: false,
    decor: true,
    cameraIgnore: true,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      gameplaySurface: false,
      gameplay: false,
      decor: true,
      cameraIgnore: true,
    };
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  }
}

function createGlowMaterial(scene, name, rgb, {
  alpha = 1,
  roughness = 0.4,
  emissive = 0.22,
} = {}) {
  const mat = makePlastic(scene, name, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness });
  mat.alpha = alpha;
  mat.emissiveColor = new BABYLON.Color3(
    (rgb[0] / 255) * emissive,
    (rgb[1] / 255) * emissive,
    (rgb[2] / 255) * emissive,
  );
  mat.transparencyMode = alpha < 1 ? BABYLON.Material.MATERIAL_ALPHABLEND : mat.transparencyMode;
  return mat;
}

function createFlatDecorMaterial(scene, name, rgb, {
  emissiveScale = 0.14,
  alpha = 1,
} = {}) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = toColor3(rgb);
  mat.emissiveColor = toColor3(rgb, emissiveScale);
  mat.alpha = alpha;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  if (alpha < 1) {
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  return mat;
}

function createDecorPlane(scene, name, parent, {
  width,
  height,
  x = 0,
  y = 0,
  z = 0,
  rotationX = Math.PI / 2,
  rotationY = 0,
  rotationZ = 0,
  rgb,
  emissiveScale = 0.14,
  alpha = 0.18,
} = {}) {
  const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
  plane.parent = parent;
  plane.position.set(x, y, z);
  plane.rotation.set(rotationX, rotationY, rotationZ);
  plane.material = createFlatDecorMaterial(scene, `${name}_mat`, rgb, {
    emissiveScale,
    alpha,
  });
  markDecor(plane);
  return plane;
}

function createDecorBox(scene, name, parent, {
  width,
  height,
  depth,
  x = 0,
  y = 0,
  z = 0,
  rgb,
  emissiveScale = 0.08,
  roughness = 0.56,
  alpha = 1,
  shadowGen = null,
  cardboard = false,
} = {}) {
  const box = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  box.parent = parent;
  box.position.set(x, y, z);
  box.material = cardboard
    ? makeCardboard(scene, `${name}_mat`, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness })
    : createGlowMaterial(scene, `${name}_mat`, rgb, { emissive: emissiveScale, roughness, alpha });
  if (Number.isFinite(alpha) && alpha < 1) {
    box.material.alpha = alpha;
    box.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  if (shadowGen) shadowGen.addShadowCaster(box);
  markDecor(box);
  return box;
}

function createDecorColumn(scene, name, parent, {
  diameterTop = null,
  diameterBottom = null,
  diameter = 1,
  height = 4,
  x = 0,
  y = 0,
  z = 0,
  rgb,
  emissiveScale = 0.08,
  roughness = 0.56,
  alpha = 1,
  shadowGen = null,
  cardboard = false,
} = {}) {
  const column = BABYLON.MeshBuilder.CreateCylinder(name, {
    diameterTop: diameterTop ?? diameter,
    diameterBottom: diameterBottom ?? diameter,
    height,
    tessellation: 14,
  }, scene);
  column.parent = parent;
  column.position.set(x, y, z);
  column.material = cardboard
    ? makeCardboard(scene, `${name}_mat`, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness })
    : createGlowMaterial(scene, `${name}_mat`, rgb, { emissive: emissiveScale, roughness, alpha });
  if (Number.isFinite(alpha) && alpha < 1) {
    column.material.alpha = alpha;
    column.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
  if (shadowGen) shadowGen.addShadowCaster(column);
  markDecor(column);
  return column;
}

function getThemeStructureRgb(theme) {
  if (theme === 'aquarium') return [36, 106, 126];
  if (theme === 'storm') return [56, 74, 96];
  if (theme === 'library') return [88, 60, 38];
  if (theme === 'camp') return [58, 42, 28];
  return [70, 56, 40];
}

function addFactoryPlatformDetails(scene, root, name, def, palette, shadowGen) {
  const topY = (def.h * 0.5) + 0.04;
  const isGround = name.endsWith('_ground');
  // Grate bars — thin parallel lines along Z axis
  const barCount = Math.max(3, Math.min(8, Math.round(def.w / 2.2)));
  for (let i = 0; i < barCount; i += 1) {
    const x = -def.w * 0.44 + ((i / Math.max(1, barCount - 1)) * def.w * 0.88);
    createDecorPlane(scene, `${name}_grateBar_${i}`, root, {
      width: 0.10,
      height: Math.max(0.6, def.d * 0.86),
      y: topY + 0.01,
      x,
      rotationX: Math.PI / 2,
      rotationY: Math.PI / 2,
      rgb: [108, 116, 124],
      emissiveScale: 0.08,
      alpha: isGround ? 0.14 : 0.22,
    });
  }
  // Cross bars — perpendicular grate
  const crossCount = Math.max(2, Math.min(5, Math.round(def.d / 2.8)));
  for (let i = 0; i < crossCount; i += 1) {
    const z = -def.d * 0.44 + ((i / Math.max(1, crossCount - 1)) * def.d * 0.88);
    createDecorPlane(scene, `${name}_crossBar_${i}`, root, {
      width: Math.max(0.6, def.w * 0.86),
      height: 0.10,
      y: topY + 0.01,
      z,
      rgb: [108, 116, 124],
      emissiveScale: 0.08,
      alpha: isGround ? 0.12 : 0.18,
    });
  }
  // Hazard stripes — orange diagonal band at front and back edges
  for (const z of [-def.d * 0.42, def.d * 0.42]) {
    createDecorPlane(scene, `${name}_hazardStripe_${z > 0 ? 'f' : 'b'}`, root, {
      width: Math.max(1.6, def.w - 0.6),
      height: 0.22,
      y: topY + 0.02,
      z,
      rgb: palette.glow,
      emissiveScale: 0.30,
      alpha: isGround ? 0.18 : 0.28,
    });
  }
  if (isGround || def.w < 10) return;
  // Pipe fixtures at corners
  for (const x of [-def.w * 0.38, def.w * 0.38]) {
    createDecorBox(scene, `${name}_pipe_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.20,
      height: 1.4,
      depth: 0.20,
      x,
      y: topY + 0.7,
      z: -def.d * 0.40,
      rgb: palette.rim,
      emissiveScale: 0.06,
      roughness: 0.52,
      shadowGen,
    });
    const valve = BABYLON.MeshBuilder.CreateCylinder(`${name}_valve_${x > 0 ? 'r' : 'l'}`, {
      diameter: 0.30,
      height: 0.12,
      tessellation: 8,
    }, scene);
    valve.parent = root;
    valve.position.set(x, topY + 1.34, -def.d * 0.40);
    valve.material = createGlowMaterial(scene, `${name}_valveMat_${x > 0 ? 'r' : 'l'}`, palette.accent, {
      emissive: 0.28,
      roughness: 0.36,
    });
    markDecor(valve);
  }
}

function addStormPlatformDetails(scene, root, name, def, palette, shadowGen) {
  const topY = (def.h * 0.5) + 0.04;
  const isGround = name.endsWith('_ground');
  const boardwalkLike = def.d <= 6.4 || def.w <= 12.5;
  createDecorPlane(scene, `${name}_stormDust`, root, {
    width: Math.max(2.4, def.w - 1.0),
    height: Math.max(0.7, Math.min(1.9, def.d * 0.34)),
    y: topY,
    rgb: boardwalkLike ? [126, 102, 76] : [128, 120, 104],
    emissiveScale: 0.06,
    alpha: isGround ? 0.10 : 0.16,
  });
  const seamCount = Math.max(3, Math.min(7, Math.round((boardwalkLike ? def.w : def.d) / 2.4)));
  for (let i = 0; i < seamCount; i += 1) {
    const z = -def.d * 0.34 + ((i / Math.max(1, seamCount - 1)) * def.d * 0.68);
    createDecorPlane(scene, `${name}_stormSeam_${i}`, root, {
      width: Math.max(1.8, def.w - 0.9),
      height: 0.10,
      y: topY + 0.01,
      z,
      rgb: boardwalkLike ? [76, 58, 42] : [86, 82, 76],
      emissiveScale: 0.04,
      alpha: 0.26,
    });
  }
  for (const z of [-def.d * 0.38, def.d * 0.38]) {
    createDecorPlane(scene, `${name}_stormEdge_${z > 0 ? 'r' : 'l'}`, root, {
      width: Math.max(1.8, def.w - 0.8),
      height: 0.16,
      y: topY + 0.02,
      z,
      rgb: boardwalkLike ? [70, 54, 38] : [108, 118, 128],
      emissiveScale: 0.05,
      alpha: 0.34,
    });
  }
  if (isGround) return;
  if (boardwalkLike) {
    for (const x of [-def.w * 0.40, def.w * 0.40]) {
      createDecorBox(scene, `${name}_ropePost_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.14,
        height: 1.5,
        depth: 0.14,
        x,
        y: topY + 0.74,
        z: -def.d * 0.34,
        rgb: [94, 76, 52],
        emissiveScale: 0.02,
        roughness: 0.88,
        shadowGen,
        cardboard: true,
      });
      createDecorBox(scene, `${name}_ropePostBack_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.14,
        height: 1.5,
        depth: 0.14,
        x,
        y: topY + 0.74,
        z: def.d * 0.34,
        rgb: [94, 76, 52],
        emissiveScale: 0.02,
        roughness: 0.88,
        shadowGen,
        cardboard: true,
      });
    }
    createDecorPlane(scene, `${name}_ropeFront`, root, {
      width: Math.max(1.8, def.w - 1.0),
      height: 0.05,
      y: topY + 1.32,
      z: -def.d * 0.34,
      rotationX: 0,
      rgb: [188, 174, 142],
      emissiveScale: 0.04,
      alpha: 0.72,
    });
    createDecorPlane(scene, `${name}_ropeBack`, root, {
      width: Math.max(1.8, def.w - 1.0),
      height: 0.05,
      y: topY + 1.32,
      z: def.d * 0.34,
      rotationX: 0,
      rgb: [188, 174, 142],
      emissiveScale: 0.04,
      alpha: 0.72,
    });
    return;
  }
  if (def.w < 13.5) return;
  for (const x of [-def.w * 0.34, def.w * 0.34]) {
    createDecorBox(scene, `${name}_rockOutcrop_${x > 0 ? 'r' : 'l'}`, root, {
      width: 1.6,
      height: 0.42,
      depth: Math.max(1.8, def.d * 0.24),
      x,
      y: topY + 0.18,
      z: 0,
      rgb: [88, 86, 80],
      emissiveScale: 0.02,
      roughness: 0.92,
      shadowGen,
    });
  }
}

function addLibraryPlatformDetails(scene, root, name, def, palette, shadowGen) {
  const topY = (def.h * 0.5) + 0.04;
  const isGround = name.endsWith('_ground');
  createDecorPlane(scene, `${name}_libraryRunner`, root, {
    width: Math.max(2.4, def.w - 1.2),
    height: Math.max(0.7, Math.min(1.7, def.d * 0.34)),
    y: topY,
    rgb: [214, 164, 94],
    emissiveScale: 0.12,
    alpha: isGround ? 0.10 : 0.16,
  });
  for (const z of [-def.d * 0.39, def.d * 0.39]) {
    createDecorBox(scene, `${name}_libraryRail_${z > 0 ? 'r' : 'l'}`, root, {
      width: Math.max(1.8, def.w * 0.92),
      height: 0.18,
      depth: 0.24,
      y: topY + 0.09,
      z,
      rgb: [88, 56, 34],
      emissiveScale: 0.04,
      roughness: 0.84,
      shadowGen,
      cardboard: true,
    });
  }
  if (isGround || def.w < 14) return;
  const postOffset = def.w * 0.36;
  for (const x of [-postOffset, postOffset]) {
    createDecorBox(scene, `${name}_libraryPost_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.22,
      height: 2.4,
      depth: 0.22,
      x,
      y: topY + 1.2,
      z: def.d * 0.34,
      rgb: [112, 72, 46],
      emissiveScale: 0.05,
      roughness: 0.82,
      shadowGen,
      cardboard: true,
    });
    const lamp = BABYLON.MeshBuilder.CreateSphere(`${name}_libraryLamp_${x > 0 ? 'r' : 'l'}`, {
      diameter: 0.28,
      segments: 8,
    }, scene);
    lamp.parent = root;
    lamp.position.set(x, topY + 2.34, def.d * 0.34);
    lamp.material = createGlowMaterial(scene, `${name}_libraryLampMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
      emissive: 0.30,
      roughness: 0.22,
    });
    markDecor(lamp);
  }
  createDecorPlane(scene, `${name}_libraryArch`, root, {
    width: Math.max(2.4, def.w * 0.76),
    height: 0.28,
    y: topY + 2.02,
    z: def.d * 0.34,
    rotationX: 0,
    rgb: [168, 122, 70],
    emissiveScale: 0.08,
    alpha: 0.92,
  });

  // Manchester Central Library multi-level effect — upper gallery tier visible above
  if (def.w >= 18) {
    createDecorPlane(scene, `${name}_galleryRail`, root, {
      width: Math.max(2.0, def.w - 0.6),
      height: 0.18,
      y: topY + 3.2,
      z: def.d * 0.44,
      rotationX: 0,
      rgb: [44, 40, 34],
      emissiveScale: 0.04,
      alpha: 0.68,
    });
    const balusterCount = Math.min(6, Math.round(def.w / 3.8));
    for (let i = 0; i < balusterCount; i += 1) {
      const bx = -def.w * 0.38 + ((i / Math.max(1, balusterCount - 1)) * def.w * 0.76);
      createDecorBox(scene, `${name}_baluster_${i}`, root, {
        width: 0.08,
        height: 0.94,
        depth: 0.08,
        x: bx,
        y: topY + 2.75,
        z: def.d * 0.44,
        rgb: [54, 48, 44],
        emissiveScale: 0.03,
        roughness: 0.74,
      });
    }
    createDecorPlane(scene, `${name}_upperShelfHint`, root, {
      width: Math.max(2.0, def.w * 0.84),
      height: 1.7,
      y: topY + 4.1,
      z: def.d * 0.46,
      rotationX: 0,
      rgb: [128, 90, 54],
      emissiveScale: 0.06,
      alpha: 0.36,
    });
  }
}

function addCampPlatformDetails(scene, root, name, def, palette, shadowGen) {
  const topY = (def.h * 0.5) + 0.04;
  const isGround = name.endsWith('_ground');
  createDecorPlane(scene, `${name}_campRunner`, root, {
    width: Math.max(2.2, def.w - 1.6),
    height: Math.max(0.7, Math.min(1.6, def.d * 0.30)),
    y: topY,
    rgb: [236, 170, 104],
    emissiveScale: 0.12,
    alpha: isGround ? 0.09 : 0.14,
  });
  const seamCount = Math.max(3, Math.min(5, Math.round(def.d / 2.2)));
  for (let i = 0; i < seamCount; i += 1) {
    const z = -def.d * 0.36 + ((i / Math.max(1, seamCount - 1)) * def.d * 0.72);
    createDecorPlane(scene, `${name}_campSeam_${i}`, root, {
      width: Math.max(1.6, def.w - 0.8),
      height: 0.12,
      y: topY + 0.01,
      z,
      rgb: [88, 56, 38],
      emissiveScale: 0.05,
      alpha: 0.28,
    });
  }
  if (isGround || def.w < 14) return;
  for (const x of [-def.w * 0.34, def.w * 0.34]) {
    createDecorBox(scene, `${name}_campPost_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.16,
      height: 1.7,
      depth: 0.16,
      x,
      y: topY + 0.85,
      z: def.d * 0.34,
      rgb: [104, 72, 48],
      emissiveScale: 0.04,
      roughness: 0.82,
      shadowGen,
      cardboard: true,
    });
    const lantern = BABYLON.MeshBuilder.CreateSphere(`${name}_campLantern_${x > 0 ? 'r' : 'l'}`, {
      diameter: 0.30,
      segments: 8,
    }, scene);
    lantern.parent = root;
    lantern.position.set(x, topY + 1.62, def.d * 0.34);
    lantern.material = createGlowMaterial(scene, `${name}_campLanternMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
      emissive: 0.34,
      roughness: 0.18,
    });
    markDecor(lantern);
  }
  createDecorPlane(scene, `${name}_campString`, root, {
    width: Math.max(2.2, def.w * 0.68),
    height: 0.06,
    y: topY + 1.36,
    z: def.d * 0.34,
    rotationX: 0,
    rgb: [216, 184, 128],
    emissiveScale: 0.08,
    alpha: 0.92,
  });
}

function getAquariumSurfaceProfile(def = {}) {
  const surfaceType = String(def.surfaceType || def.floorSurfaceType || '').toLowerCase();
  if (!surfaceType) return null;
  const ownerId = String(def.ownerId || def.connectorId || def.sectorId || def.name || '').toLowerCase();
  const isStep = surfaceType === 'step' || surfaceType === 'landing';
  const roomSurface = def.roomSurface === true || def.walkableClassification === 'room-floor';

  let family = 'service';
  if (surfaceType.includes('viewing') || surfaceType.includes('exhibit')) {
    family = 'exhibit';
  } else if (surfaceType.includes('glass')) {
    family = 'glass';
  } else if (
    surfaceType.includes('maintenance')
    || surfaceType.includes('drain')
    || surfaceType.includes('channel')
    || surfaceType.includes('shaft')
    || (isStep && /(maintenance|lower|shaft)/.test(ownerId))
  ) {
    family = 'maintenance';
  } else if (
    surfaceType.includes('catwalk')
    || surfaceType.includes('grate')
    || surfaceType.includes('cross_bridge')
    || surfaceType.includes('bridge_rise')
    || surfaceType.includes('overhead_bridge')
    || (isStep && /(upper|bridge|side|catwalk)/.test(ownerId))
  ) {
    family = 'catwalk';
  } else if (
    surfaceType.includes('wet_service')
    || surfaceType.includes('shell_service')
    || surfaceType.includes('threshold')
    || surfaceType.includes('service')
    || isStep
  ) {
    family = 'service';
  }

  const profileByFamily = {
    exhibit: {
      family: 'exhibit',
      slabRgb: [88, 126, 138],
      slabEmissive: 0.18,
      slabRoughness: 0.34,
      rimRgb: [22, 56, 68],
      rimEmissive: 0.08,
      rimRoughness: 0.40,
      topRgb: [26, 74, 88],
      topAlpha: 0.54,
      topEmissive: 0.09,
      glowRgb: [198, 248, 255],
      lineRgb: [236, 252, 255],
      sheenRgb: [196, 244, 255],
      sheenAlpha: 0.24,
      seamRgb: [102, 188, 202],
      seamAlpha: 0.28,
      railRgb: [226, 252, 255],
      railAlpha: 0.84,
      stripeRgb: [118, 194, 210],
      stripeAlpha: 0.18,
      grimeRgb: [62, 108, 118],
      shellRgb: [146, 194, 186],
      railStyle: 'glass',
      railHeight: 1.02,
      postHeight: 0.92,
      edgeAlpha: 0.34,
      glassBarrier: true,
    },
    glass: {
      family: 'glass',
      slabRgb: [68, 114, 130],
      slabEmissive: 0.18,
      slabRoughness: 0.34,
      rimRgb: [18, 52, 68],
      rimEmissive: 0.10,
      rimRoughness: 0.38,
      topRgb: [32, 94, 112],
      topAlpha: 0.56,
      topEmissive: 0.12,
      glowRgb: [194, 250, 255],
      lineRgb: [214, 250, 255],
      sheenRgb: [198, 248, 255],
      sheenAlpha: 0.20,
      seamRgb: [110, 198, 214],
      seamAlpha: 0.24,
      railRgb: [212, 250, 255],
      railAlpha: 0.80,
      stripeRgb: [122, 198, 212],
      stripeAlpha: 0.14,
      grimeRgb: [50, 102, 118],
      shellRgb: [142, 192, 186],
      railStyle: 'glass',
      railHeight: 0.90,
      postHeight: 0.86,
      edgeAlpha: 0.26,
      glassBarrier: true,
    },
    service: {
      family: 'service',
      slabRgb: [64, 86, 96],
      slabEmissive: 0.12,
      slabRoughness: 0.54,
      rimRgb: [20, 40, 50],
      rimEmissive: 0.06,
      rimRoughness: 0.56,
      topRgb: [16, 38, 46],
      topAlpha: 0.92,
      topEmissive: 0.08,
      glowRgb: [112, 198, 214],
      lineRgb: [168, 228, 238],
      sheenRgb: [104, 178, 194],
      sheenAlpha: 0.14,
      seamRgb: [66, 122, 136],
      seamAlpha: 0.24,
      railRgb: [180, 220, 230],
      railAlpha: 0.80,
      stripeRgb: [242, 190, 92],
      stripeAlpha: 0.72,
      grimeRgb: [42, 82, 94],
      shellRgb: [126, 168, 160],
      railStyle: 'pipe',
      railHeight: 0.86,
      postHeight: 0.84,
      edgeAlpha: 0.32,
      glassBarrier: false,
    },
    catwalk: {
      family: 'catwalk',
      slabRgb: [42, 48, 54],
      slabEmissive: 0.08,
      slabRoughness: 0.64,
      rimRgb: [10, 14, 18],
      rimEmissive: 0.04,
      rimRoughness: 0.66,
      topRgb: [10, 14, 18],
      topAlpha: 0.98,
      topEmissive: 0.04,
      glowRgb: [132, 214, 228],
      lineRgb: [248, 202, 96],
      sheenRgb: [78, 132, 146],
      sheenAlpha: 0.05,
      seamRgb: [78, 126, 138],
      seamAlpha: 0.12,
      railRgb: [198, 232, 240],
      railAlpha: 0.90,
      stripeRgb: [248, 194, 92],
      stripeAlpha: 0.90,
      grimeRgb: [38, 72, 82],
      shellRgb: [106, 138, 134],
      railStyle: 'pipe',
      railHeight: 1.16,
      postHeight: 1.08,
      edgeAlpha: 0.42,
      glassBarrier: false,
    },
    maintenance: {
      family: 'maintenance',
      slabRgb: [34, 42, 46],
      slabEmissive: 0.06,
      slabRoughness: 0.70,
      rimRgb: [12, 18, 24],
      rimEmissive: 0.03,
      rimRoughness: 0.68,
      topRgb: [12, 18, 22],
      topAlpha: 0.96,
      topEmissive: 0.03,
      glowRgb: [88, 136, 146],
      lineRgb: [96, 132, 138],
      sheenRgb: [62, 100, 106],
      sheenAlpha: 0.06,
      seamRgb: [52, 82, 92],
      seamAlpha: 0.14,
      railRgb: [102, 132, 136],
      railAlpha: 0.48,
      stripeRgb: [148, 114, 72],
      stripeAlpha: 0.16,
      grimeRgb: [58, 82, 72],
      shellRgb: [150, 160, 138],
      railStyle: 'curb',
      railHeight: 0.42,
      postHeight: 0.36,
      edgeAlpha: 0.20,
      glassBarrier: false,
    },
  };

  const profile = {
    ...profileByFamily[family],
    surfaceType,
    ownerId,
    roomSurface,
  };

  if (roomSurface && (family === 'exhibit' || family === 'glass')) {
    profile.slabEmissive = 0.14;
    profile.slabRoughness = 0.46;
    profile.topAlpha = family === 'glass' ? 0.88 : 0.92;
    profile.topEmissive = 0.06;
    profile.sheenAlpha = family === 'glass' ? 0.14 : 0.10;
    profile.seamAlpha = family === 'glass' ? 0.18 : 0.16;
    profile.edgeAlpha = family === 'glass' ? 0.08 : 0.06;
    profile.railAlpha = family === 'glass' ? 0.70 : 0.58;
  }

  return profile;
}

function addAquariumPipeBundle(scene, root, name, {
  axis = 'x',
  length = 6,
  x = 0,
  y = 0,
  z = 0,
  count = 3,
  spacing = 0.28,
  thickness = 0.18,
  rgb = [82, 150, 166],
} = {}) {
  for (let i = 0; i < count; i += 1) {
    const offset = (i - ((count - 1) * 0.5)) * spacing;
    createDecorBox(scene, `${name}_${i}`, root, {
      width: axis === 'x' ? length : thickness,
      height: thickness,
      depth: axis === 'z' ? length : thickness,
      x: axis === 'x' ? x : x + offset,
      y: y + (i * 0.02),
      z: axis === 'z' ? z : z + offset,
      rgb,
      emissiveScale: 0.06,
      roughness: 0.36,
    });
  }
}

function addAquariumDebrisCluster(scene, root, name, {
  x = 0,
  y = 0,
  z = 0,
  rgb = [132, 154, 144],
  shadowGen = null,
} = {}) {
  const pieces = [
    { dx: 0.00, dz: 0.00, w: 0.34, h: 0.14, d: 0.26 },
    { dx: 0.22, dz: 0.12, w: 0.22, h: 0.10, d: 0.18 },
    { dx: -0.18, dz: -0.14, w: 0.18, h: 0.08, d: 0.16 },
    { dx: 0.10, dz: -0.20, w: 0.16, h: 0.06, d: 0.14 },
  ];
  pieces.forEach((piece, index) => {
    createDecorBox(scene, `${name}_${index}`, root, {
      width: piece.w,
      height: piece.h,
      depth: piece.d,
      x: x + piece.dx,
      y: y + (piece.h * 0.5),
      z: z + piece.dz,
      rgb,
      emissiveScale: 0.03,
      roughness: 0.88,
      shadowGen,
    });
  });
}

function addAquariumPlatformDetails(scene, root, name, def, palette, shadowGen, profile = getAquariumSurfaceProfile(def)) {
  if (!profile) return;
  const topY = (def.h * 0.5) + 0.04;
  const isGround = name.endsWith('_ground');
  const roomSurface = def.roomSurface === true || def.walkableClassification === 'room-floor';

  createDecorPlane(scene, `${name}_wetSheen`, root, {
    width: Math.max(2.0, def.w - 0.8),
    height: Math.max(0.8, Math.min(1.8, def.d * 0.30)),
    y: topY,
    rgb: profile.sheenRgb,
    emissiveScale: profile.family === 'glass' || profile.family === 'exhibit' ? 0.14 : 0.08,
    alpha: isGround ? 0.08 : profile.sheenAlpha,
  });

  if (profile.family === 'catwalk' && !roomSurface) {
    const grateCount = Math.max(4, Math.min(8, Math.round(def.w / 2.0)));
    for (let i = 0; i < grateCount; i += 1) {
      const x = -def.w * 0.42 + ((i / Math.max(1, grateCount - 1)) * def.w * 0.84);
      createDecorPlane(scene, `${name}_grate_${i}`, root, {
        width: 0.08,
        height: Math.max(0.8, def.d * 0.82),
        y: topY + 0.01,
        x,
        rotationX: Math.PI / 2,
        rotationY: Math.PI / 2,
        rgb: profile.glowRgb,
        emissiveScale: 0.12,
        alpha: 0.30,
      });
    }
    const crossCount = Math.max(2, Math.min(5, Math.round(def.d / 1.4)));
    for (let i = 0; i < crossCount; i += 1) {
      const z = -def.d * 0.34 + ((i / Math.max(1, crossCount - 1)) * def.d * 0.68);
      createDecorPlane(scene, `${name}_cross_${i}`, root, {
        width: Math.max(1.4, def.w - 0.9),
        height: 0.08,
        y: topY + 0.015,
        z,
        rgb: profile.seamRgb,
        emissiveScale: 0.08,
        alpha: 0.18,
      });
    }
  } else {
    const seamCount = Math.max(2, Math.min(5, Math.round(def.d / 2.2)));
    for (let i = 0; i < seamCount; i += 1) {
      const z = -def.d * 0.34 + ((i / Math.max(1, seamCount - 1)) * def.d * 0.68);
      createDecorPlane(scene, `${name}_deckSeam_${i}`, root, {
        width: Math.max(1.8, def.w - 1.0),
        height: 0.10,
        y: topY + 0.01,
        z,
        rgb: profile.seamRgb,
        emissiveScale: 0.08,
        alpha: profile.seamAlpha,
      });
    }
  }

  if (profile.family === 'maintenance') {
    const drainCount = Math.max(3, Math.min(6, Math.round(def.w / 2.6)));
    for (let i = 0; i < drainCount; i += 1) {
      const x = -def.w * 0.34 + ((i / Math.max(1, drainCount - 1)) * def.w * 0.68);
      createDecorPlane(scene, `${name}_drain_${i}`, root, {
        width: 0.12,
        height: Math.max(0.8, def.d * 0.66),
        y: topY + 0.014,
        x,
        rotationX: Math.PI / 2,
        rotationY: Math.PI / 2,
        rgb: [22, 30, 34],
        emissiveScale: 0.02,
        alpha: 0.42,
      });
    }
    createDecorPlane(scene, `${name}_grimeBand`, root, {
      width: Math.max(1.8, def.w - 1.2),
      height: Math.max(0.8, def.d * 0.18),
      y: topY + 0.012,
      z: def.d * 0.16,
      rgb: profile.grimeRgb,
      emissiveScale: 0.04,
      alpha: 0.18,
    });
    addAquariumDebrisCluster(scene, root, `${name}_shells_a`, {
      x: -def.w * 0.30,
      y: topY,
      z: def.d * 0.24,
      rgb: profile.shellRgb,
      shadowGen,
    });
    addAquariumDebrisCluster(scene, root, `${name}_shells_b`, {
      x: def.w * 0.22,
      y: topY,
      z: -def.d * 0.18,
      rgb: profile.shellRgb,
      shadowGen,
    });
  }

  if (profile.family === 'service') {
    createDecorPlane(scene, `${name}_cautionBand`, root, {
      width: Math.max(1.2, def.w * 0.36),
      height: 0.18,
      x: roomSurface ? 0 : def.w * 0.18,
      y: topY + 0.02,
      z: roomSurface ? def.d * 0.18 : -def.d * 0.20,
      rgb: profile.stripeRgb,
      emissiveScale: 0.16,
      alpha: roomSurface ? Math.min(0.34, profile.stripeAlpha * 0.42) : profile.stripeAlpha,
    });
    addAquariumPipeBundle(scene, root, `${name}_serviceBundle`, {
      axis: 'x',
      length: Math.max(2.0, def.w - 1.6),
      x: 0,
      y: topY + (roomSurface ? 0.14 : 0.28),
      z: roomSurface ? def.d * 0.30 : def.d * 0.26,
      count: 3,
      spacing: 0.22,
      thickness: 0.14,
      rgb: [92, 170, 182],
    });
  }

  if (profile.family === 'glass' || profile.family === 'exhibit') {
    createDecorPlane(scene, `${name}_viewerStrip`, root, {
      width: Math.max(1.2, def.w * 0.56),
      height: 0.22,
      y: topY + 0.02,
      z: roomSurface ? def.d * 0.22 : -def.d * 0.24,
      rgb: profile.lineRgb,
      emissiveScale: 0.18,
      alpha: roomSurface ? 0.12 : 0.18,
    });
    createDecorPlane(scene, `${name}_insetFrame`, root, {
      width: Math.max(1.2, def.w - 0.78),
      height: Math.max(0.8, def.d - 0.78),
      y: topY + 0.02,
      rgb: profile.lineRgb,
      emissiveScale: 0.12,
      alpha: roomSurface ? 0.06 : 0.10,
    });
  }

  for (const z of [-def.d * 0.38, def.d * 0.38]) {
    createDecorPlane(scene, `${name}_edgeMark_${z > 0 ? 'r' : 'l'}`, root, {
      width: Math.max(1.8, def.w - 0.9),
      height: 0.16,
      y: topY + 0.02,
      z,
      rgb: profile.family === 'catwalk' ? profile.stripeRgb : profile.lineRgb,
      emissiveScale: 0.14,
      alpha: isGround ? 0.14 : profile.edgeAlpha,
    });
  }

  if (roomSurface || isGround || def.w < 9.5) return;
  for (const x of [-def.w * 0.40, def.w * 0.40]) {
    createDecorBox(scene, `${name}_railPost_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.12,
      height: profile.postHeight,
      depth: 0.12,
      x,
      y: topY + (profile.postHeight * 0.5),
      z: -def.d * 0.34,
      rgb: profile.railRgb,
      emissiveScale: 0.10,
      roughness: 0.36,
      shadowGen,
    });
    createDecorBox(scene, `${name}_railPostBack_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.12,
      height: profile.postHeight,
      depth: 0.12,
      x,
      y: topY + (profile.postHeight * 0.5),
      z: def.d * 0.34,
      rgb: profile.railRgb,
      emissiveScale: 0.10,
      roughness: 0.36,
      shadowGen,
    });
  }
  if (profile.railStyle === 'glass') {
    for (const z of [-def.d * 0.34, def.d * 0.34]) {
      createDecorPlane(scene, `${name}_glassRail_${z > 0 ? 'back' : 'front'}`, root, {
        width: Math.max(1.8, def.w - 1.0),
        height: profile.railHeight,
        y: topY + (profile.railHeight * 0.5),
        z,
        rotationX: 0,
        rgb: profile.railRgb,
        emissiveScale: 0.10,
        alpha: 0.14,
      });
      createDecorPlane(scene, `${name}_glassRailCap_${z > 0 ? 'back' : 'front'}`, root, {
        width: Math.max(1.8, def.w - 1.0),
        height: 0.05,
        y: topY + profile.railHeight,
        z,
        rotationX: 0,
        rgb: profile.railRgb,
        emissiveScale: 0.16,
        alpha: profile.railAlpha,
      });
    }
  } else if (profile.railStyle === 'pipe') {
    createDecorPlane(scene, `${name}_frontRail`, root, {
      width: Math.max(1.8, def.w - 1.0),
      height: 0.05,
      y: topY + profile.railHeight,
      z: -def.d * 0.34,
      rotationX: 0,
      rgb: profile.railRgb,
      emissiveScale: 0.14,
      alpha: profile.railAlpha,
    });
    createDecorPlane(scene, `${name}_backRail`, root, {
      width: Math.max(1.8, def.w - 1.0),
      height: 0.05,
      y: topY + profile.railHeight,
      z: def.d * 0.34,
      rotationX: 0,
      rgb: profile.railRgb,
      emissiveScale: 0.14,
      alpha: profile.railAlpha,
    });
  } else if (profile.railStyle === 'curb') {
    for (const z of [-def.d * 0.34, def.d * 0.34]) {
      createDecorBox(scene, `${name}_curb_${z > 0 ? 'back' : 'front'}`, root, {
        width: Math.max(1.8, def.w - 0.8),
        height: 0.16,
        depth: 0.18,
        y: topY + 0.08,
        z,
        rgb: profile.grimeRgb,
        emissiveScale: 0.04,
        roughness: 0.82,
        shadowGen,
      });
    }
  }

  if (profile.family === 'catwalk') {
    addAquariumPipeBundle(scene, root, `${name}_catwalkBundle`, {
      axis: 'x',
      length: Math.max(2.0, def.w - 1.8),
      x: 0,
      y: topY + 0.24,
      z: def.d * 0.26,
      count: 4,
      spacing: 0.18,
      thickness: 0.10,
      rgb: [104, 180, 192],
    });
    for (const x of [-def.w * 0.34, def.w * 0.34]) {
      createDecorPlane(scene, `${name}_warning_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.22,
        height: Math.max(0.9, def.d * 0.72),
        x,
        y: topY + 0.02,
        rotationX: Math.PI / 2,
        rotationY: Math.PI / 2,
        rgb: profile.stripeRgb,
        emissiveScale: 0.18,
        alpha: 0.20,
      });
    }
  }
}

// ── Library set-piece factories ──────────────────────────────────────────────

const BOOK_SPINE_COLORS = [
  [168, 54, 44],   // burgundy
  [46, 102, 148],  // ink blue
  [54, 122, 58],   // forest green
  [198, 164, 54],  // gold
  [122, 56, 148],  // deep purple
  [42, 108, 94],   // teal
];

function createLibraryBookshelf(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  markDecor(root);
  const w = def.w ?? 3.6;
  const h = def.h ?? 3.2;
  // Back panel
  const back = BABYLON.MeshBuilder.CreateBox(`${name}_back`, { width: w, height: h, depth: 0.22 }, scene);
  back.parent = root;
  back.position.set(0, h * 0.5, 0);
  back.material = makeCardboard(scene, `${name}_backMat`, 112 / 255, 72 / 255, 46 / 255, { roughness: 0.86, noiseAmt: 18 });
  shadowGen.addShadowCaster(back);
  // Shelf slabs
  const shelfCount = Math.max(3, Math.min(6, Math.round(h / 0.74)));
  for (let s = 0; s < shelfCount; s += 1) {
    const sy = 0.52 + (s * (h / shelfCount));
    const slab = BABYLON.MeshBuilder.CreateBox(`${name}_shelf_${s}`, { width: w + 0.06, height: 0.08, depth: 0.26 }, scene);
    slab.parent = root;
    slab.position.set(0, sy, 0.01);
    slab.material = makeCardboard(scene, `${name}_shelfMat_${s}`, 136 / 255, 90 / 255, 58 / 255, { roughness: 0.82 });
    markDecor(slab);
    // Book spines on this shelf
    const spineCount = Math.max(3, Math.floor(w / 0.24));
    for (let b = 0; b < spineCount; b += 1) {
      const bx = -(w * 0.44) + (b / Math.max(1, spineCount - 1)) * (w * 0.88);
      const bw = 0.08 + (((b + s) % 3) * 0.06);
      const bh = 0.42 + ((b % 2) * 0.14);
      const spineRgb = BOOK_SPINE_COLORS[(b + s * 2) % BOOK_SPINE_COLORS.length];
      createDecorPlane(scene, `${name}_spine_${s}_${b}`, root, {
        width: bw,
        height: bh,
        x: bx,
        y: sy + 0.04 + (bh * 0.5),
        z: 0.12,
        rotationX: 0,
        rgb: spineRgb,
        emissiveScale: 0.12,
        alpha: 0.90,
      });
    }
  }
  // Top ornament
  const orb = BABYLON.MeshBuilder.CreateSphere(`${name}_orb`, { diameter: 0.20, segments: 8 }, scene);
  orb.parent = root;
  orb.position.set(w * 0.42, h + 0.12, 0.10);
  orb.material = createGlowMaterial(scene, `${name}_orbMat`, [244, 214, 134], { emissive: 0.28, roughness: 0.22 });
  markDecor(orb);
  // Gallery railing on tall shelves
  if (h > 3.5) {
    createDecorPlane(scene, `${name}_shelfRail`, root, {
      width: w + 0.12,
      height: 0.14,
      y: h + 0.08,
      z: 0.12,
      rotationX: 0,
      rgb: [44, 38, 34],
      emissiveScale: 0.04,
      alpha: 0.72,
    });
  }
  return root;
}

function createLibraryFireplace(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  markDecor(root);
  const sc = def.scale ?? 1;
  const stoneMat = makeCardboard(scene, `${name}_stoneMat`, 186 / 255, 172 / 255, 158 / 255, { roughness: 0.88, noiseAmt: 22 });
  // Left and right pillar
  for (const sx of [-1, 1]) {
    const pillar = BABYLON.MeshBuilder.CreateBox(`${name}_pillar_${sx}`, { width: 0.24 * sc, height: 1.76 * sc, depth: 0.40 * sc }, scene);
    pillar.parent = root;
    pillar.position.set(sx * 1.12 * sc, 0.88 * sc, 0);
    pillar.material = stoneMat;
    shadowGen.addShadowCaster(pillar);
    markDecor(pillar);
  }
  // Main surround body
  const surround = BABYLON.MeshBuilder.CreateBox(`${name}_surround`, { width: 2.56 * sc, height: 0.28 * sc, depth: 0.40 * sc }, scene);
  surround.parent = root;
  surround.position.set(0, 1.9 * sc, 0);
  surround.material = stoneMat;
  shadowGen.addShadowCaster(surround);
  markDecor(surround);
  // Mantle shelf
  const mantle = BABYLON.MeshBuilder.CreateBox(`${name}_mantle`, { width: 2.72 * sc, height: 0.12 * sc, depth: 0.52 * sc }, scene);
  mantle.parent = root;
  mantle.position.set(0, 2.12 * sc, -0.06 * sc);
  mantle.material = stoneMat;
  shadowGen.addShadowCaster(mantle);
  markDecor(mantle);
  // Firebox dark opening
  createDecorPlane(scene, `${name}_firebox`, root, {
    width: 1.44 * sc,
    height: 1.06 * sc,
    y: 0.53 * sc,
    z: -0.19 * sc,
    rotationX: 0,
    rgb: [22, 16, 12],
    emissiveScale: 0.02,
    alpha: 0.94,
  });
  // Fire core cylinder
  const fire = BABYLON.MeshBuilder.CreateCylinder(`${name}_fire`, {
    height: 0.70 * sc,
    diameterTop: 0.30 * sc,
    diameterBottom: 0.62 * sc,
    tessellation: 8,
  }, scene);
  fire.parent = root;
  fire.position.set(0, 0.35 * sc, -0.08 * sc);
  fire.material = createGlowMaterial(scene, `${name}_fireMat`, [255, 120, 40], { emissive: 0.52, roughness: 0.18 });
  shadowGen.addShadowCaster(fire);
  markDecor(fire);
  // Crossed glow planes for fire volume
  for (const ry of [0, Math.PI * 0.5]) {
    createDecorPlane(scene, `${name}_glow_${ry.toFixed(1)}`, root, {
      width: 1.1 * sc,
      height: 0.9 * sc,
      y: 0.45 * sc,
      z: -0.10 * sc,
      rotationX: 0,
      rotationY: ry,
      rgb: [255, 196, 80],
      emissiveScale: 0.34,
      alpha: 0.44,
    });
  }
  return { root, fire, phase: (def.x ?? 0) * 0.74, type: 'fireplace' };
}

function createLibraryArmchair(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  root.rotation.y = def.rotY ?? 0;
  markDecor(root);
  const velvetMat = makeCardboard(scene, `${name}_velvetMat`, 96 / 255, 42 / 255, 84 / 255, { roughness: 0.90, noiseAmt: 8, grainScale: 2 });
  const woodMat = makeCardboard(scene, `${name}_woodMat`, 76 / 255, 48 / 255, 30 / 255, { roughness: 0.86 });
  // Seat
  const seat = BABYLON.MeshBuilder.CreateBox(`${name}_seat`, { width: 0.64, height: 0.18, depth: 0.60 }, scene);
  seat.parent = root;
  seat.position.set(0, 0.38, 0);
  seat.material = velvetMat;
  shadowGen.addShadowCaster(seat);
  markDecor(seat);
  // Back
  const back = BABYLON.MeshBuilder.CreateBox(`${name}_back`, { width: 0.64, height: 0.84, depth: 0.16 }, scene);
  back.parent = root;
  back.position.set(0, 0.77, -0.24);
  back.material = velvetMat;
  shadowGen.addShadowCaster(back);
  markDecor(back);
  // Armrests
  for (const sx of [-0.37, 0.37]) {
    const arm = BABYLON.MeshBuilder.CreateBox(`${name}_arm_${sx > 0 ? 'r' : 'l'}`, { width: 0.10, height: 0.16, depth: 0.56 }, scene);
    arm.parent = root;
    arm.position.set(sx, 0.53, -0.03);
    arm.material = woodMat;
    markDecor(arm);
  }
  // Legs
  for (const lx of [-0.26, 0.26]) {
    for (const lz of [-0.24, 0.24]) {
      const leg = BABYLON.MeshBuilder.CreateCylinder(`${name}_leg_${lx}_${lz}`, { diameter: 0.08, height: 0.36, tessellation: 6 }, scene);
      leg.parent = root;
      leg.position.set(lx, 0.18, lz);
      leg.material = woodMat;
      markDecor(leg);
    }
  }
  return root;
}

function createLibraryCocktailTable(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  markDecor(root);
  const darkWood = makeCardboard(scene, `${name}_woodMat`, 56 / 255, 36 / 255, 22 / 255, { roughness: 0.62, noiseAmt: 12 });
  // Tabletop disc
  const top = BABYLON.MeshBuilder.CreateCylinder(`${name}_top`, { diameter: 0.74, height: 0.06, tessellation: 16 }, scene);
  top.parent = root;
  top.position.set(0, 0.72, 0);
  top.material = darkWood;
  shadowGen.addShadowCaster(top);
  markDecor(top);
  // Pedestal
  const stem = BABYLON.MeshBuilder.CreateCylinder(`${name}_stem`, { diameter: 0.10, height: 0.64, tessellation: 8 }, scene);
  stem.parent = root;
  stem.position.set(0, 0.40, 0);
  stem.material = darkWood;
  markDecor(stem);
  // Base
  const base = BABYLON.MeshBuilder.CreateCylinder(`${name}_base`, { diameter: 0.44, height: 0.06, tessellation: 12 }, scene);
  base.parent = root;
  base.position.set(0, 0.06, 0);
  base.material = darkWood;
  markDecor(base);
  // Cocktail glass
  const glass = BABYLON.MeshBuilder.CreateCylinder(`${name}_glass`, { diameterTop: 0.14, diameterBottom: 0.04, height: 0.22, tessellation: 8 }, scene);
  glass.parent = root;
  glass.position.set(0.12, 0.83, 0.08);
  const glassMat = createGlowMaterial(scene, `${name}_glassMat`, [255, 186, 80], { emissive: 0.22, roughness: 0.14, alpha: 0.52 });
  glass.material = glassMat;
  markDecor(glass);
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────

function createThemeCheckpointFrame(scene, name, checkpoint, theme, shadowGen) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(checkpoint.x, checkpoint.y - 0.06, checkpoint.z ?? 0);
  markDecor(root);

  if (theme === 'aquarium') {
    for (const x of [-1.55, 1.55]) {
      createDecorBox(scene, `${name}_post_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.16,
        height: 3.2,
        depth: 0.16,
        x,
        y: 1.6,
        z: 0,
        rgb: palette.rim,
        emissiveScale: 0.08,
        roughness: 0.42,
        shadowGen,
      });
      const globe = BABYLON.MeshBuilder.CreateSphere(`${name}_globe_${x > 0 ? 'r' : 'l'}`, {
        diameter: 0.28,
        segments: 8,
      }, scene);
      globe.parent = root;
      globe.position.set(x, 2.72, 0);
      globe.material = createGlowMaterial(scene, `${name}_globeMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
        emissive: 0.34,
        roughness: 0.18,
      });
      markDecor(globe);
    }
    createDecorPlane(scene, `${name}_beam`, root, {
      width: 3.5,
      height: 0.12,
      y: 2.44,
      rotationX: 0,
      rgb: palette.line,
      emissiveScale: 0.14,
      alpha: 0.92,
    });
    return root;
  }

  if (theme === 'storm') {
    for (const x of [-1.6, 1.6]) {
      createDecorBox(scene, `${name}_post_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.18,
        height: 3.4,
        depth: 0.18,
        x,
        y: 1.7,
        z: 0,
        rgb: palette.rim,
        emissiveScale: 0.08,
        roughness: 0.48,
        shadowGen,
      });
      createDecorPlane(scene, `${name}_streamer_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.28,
        height: 1.2,
        x: x * 0.92,
        y: 2.7,
        z: 0,
        rotationX: 0.12,
        rotationZ: x > 0 ? -0.18 : 0.18,
        rgb: palette.glow,
        emissiveScale: 0.18,
        alpha: 0.28,
      });
    }
    createDecorPlane(scene, `${name}_beam`, root, {
      width: 3.6,
      height: 0.16,
      y: 2.96,
      rotationX: 0,
      rgb: palette.line,
      emissiveScale: 0.20,
      alpha: 0.86,
    });
    return root;
  }

  if (theme === 'library') {
    for (const x of [-1.5, 1.5]) {
      createDecorBox(scene, `${name}_bookend_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.28,
        height: 3.1,
        depth: 0.30,
        x,
        y: 1.55,
        z: 0,
        rgb: [104, 68, 42],
        emissiveScale: 0.04,
        roughness: 0.82,
        shadowGen,
        cardboard: true,
      });
      const lamp = BABYLON.MeshBuilder.CreateSphere(`${name}_globe_${x > 0 ? 'r' : 'l'}`, {
        diameter: 0.24,
        segments: 8,
      }, scene);
      lamp.parent = root;
      lamp.position.set(x, 2.86, 0);
      lamp.material = createGlowMaterial(scene, `${name}_globeMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
        emissive: 0.30,
        roughness: 0.20,
      });
      markDecor(lamp);
    }
    createDecorPlane(scene, `${name}_arch`, root, {
      width: 3.5,
      height: 0.24,
      y: 2.52,
      rotationX: 0,
      rgb: [170, 124, 72],
      emissiveScale: 0.08,
      alpha: 0.92,
    });
    return root;
  }

  if (theme === 'camp') {
    for (const x of [-1.5, 1.5]) {
      createDecorBox(scene, `${name}_post_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.18,
        height: 2.9,
        depth: 0.18,
        x,
        y: 1.45,
        z: 0,
        rgb: [104, 72, 48],
        emissiveScale: 0.04,
        roughness: 0.84,
        shadowGen,
        cardboard: true,
      });
      const lantern = BABYLON.MeshBuilder.CreateSphere(`${name}_lantern_${x > 0 ? 'r' : 'l'}`, {
        diameter: 0.28,
        segments: 8,
      }, scene);
      lantern.parent = root;
      lantern.position.set(x, 2.74, 0);
      lantern.material = createGlowMaterial(scene, `${name}_lanternMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
        emissive: 0.34,
        roughness: 0.18,
      });
      markDecor(lantern);
    }
    createDecorPlane(scene, `${name}_string`, root, {
      width: 3.4,
      height: 0.06,
      y: 2.46,
      rotationX: 0,
      rgb: [216, 184, 128],
      emissiveScale: 0.08,
      alpha: 0.92,
    });
  }

  return root;
}

function createStyledPlatform(scene, name, def, shadowGen, theme = 'factory') {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const aquariumTheme = theme === 'aquarium';
  const aquariumSurfaceProfile = aquariumTheme ? getAquariumSurfaceProfile(def) : null;
  const flatAquariumRoomFloor = aquariumTheme && aquariumSurfaceProfile?.roomSurface === true;
  const root = new BABYLON.TransformNode(`${name}_root`, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  if (def?.authoredSurfaceId) {
    root.metadata = {
      ...(root.metadata || {}),
      authoredSurfaceId: def.authoredSurfaceId,
      gameplaySurface: true,
      gameplay: true,
    };
  }

  const slabHeight = flatAquariumRoomFloor
    ? Math.max(0.10, def.h * 0.18)
    : def.h * 0.82;
  const slab = BABYLON.MeshBuilder.CreateBox(`${name}_slab`, {
    width: def.w,
    height: slabHeight,
    depth: def.d,
  }, scene);
  slab.parent = root;
  slab.position.y = flatAquariumRoomFloor
    ? ((def.h * 0.5) - (slabHeight * 0.5) - 0.06)
    : 0.02;
  slab.material = theme === 'library' || theme === 'camp' || theme === 'storm'
    ? makeCardboard(scene, `${name}_slabMat`, palette.slab[0] / 255, palette.slab[1] / 255, palette.slab[2] / 255, {
      roughness: theme === 'library' ? 0.88 : theme === 'storm' ? 0.92 : 0.80,
      noiseAmt: theme === 'library' ? 14 : theme === 'storm' ? 20 : 18,
      grainScale: theme === 'library' ? 4 : theme === 'storm' ? 5 : 3,
    })
    : createGlowMaterial(scene, `${name}_slabMat`, aquariumSurfaceProfile?.slabRgb || palette.slab, {
      emissive: aquariumSurfaceProfile?.slabEmissive ?? (aquariumTheme ? 0.24 : theme === 'storm' ? 0.18 : 0.28),
      roughness: aquariumSurfaceProfile?.slabRoughness ?? (aquariumTheme ? 0.30 : theme === 'storm' ? 0.42 : 0.26),
    });
  if (slab.material.emissiveColor) {
    slab.material.emissiveColor = toColor3(
      aquariumSurfaceProfile?.glowRgb || palette.glow,
      aquariumSurfaceProfile ? 0.08 : aquariumTheme ? 0.10 : theme === 'storm' ? 0.08 : theme === 'library' ? 0.05 : theme === 'camp' ? 0.04 : 0.12,
    );
  }
  slab.enableEdgesRendering();
  slab.edgesWidth = flatAquariumRoomFloor
    ? 0.18
    : aquariumSurfaceProfile?.roomSurface
      ? 0.84
    : aquariumTheme
      ? 1.8
      : theme === 'storm'
        ? 1.9
        : 1.6;
  slab.edgesColor = toColor4(
    aquariumSurfaceProfile?.glowRgb || palette.glow,
    flatAquariumRoomFloor
      ? 0.03
      : aquariumSurfaceProfile?.edgeAlpha ?? (aquariumTheme ? 0.66 : theme === 'storm' ? 0.70 : theme === 'library' ? 0.44 : theme === 'camp' ? 0.40 : 0.58),
  );
  slab.receiveShadows = true;
  shadowGen.addShadowCaster(slab);
  markGameplaySurface(slab);

  if (!flatAquariumRoomFloor) {
    const rim = BABYLON.MeshBuilder.CreateBox(`${name}_rim`, {
      width: def.w + 0.08,
      height: def.h * 0.26,
      depth: def.d + 0.08,
    }, scene);
    rim.parent = root;
    rim.position.y = -(def.h * 0.32);
    rim.material = theme === 'library' || theme === 'camp' || theme === 'storm'
      ? makeCardboard(scene, `${name}_rimMat`, palette.rim[0] / 255, palette.rim[1] / 255, palette.rim[2] / 255, {
        roughness: theme === 'storm' ? 0.90 : 0.88,
        noiseAmt: theme === 'storm' ? 22 : 20,
        grainScale: theme === 'storm' ? 5 : 4,
      })
      : createGlowMaterial(scene, `${name}_rimMat`, aquariumSurfaceProfile?.rimRgb || palette.rim, {
        emissive: aquariumSurfaceProfile?.rimEmissive ?? (aquariumTheme ? 0.14 : theme === 'storm' ? 0.14 : 0.18),
        roughness: aquariumSurfaceProfile?.rimRoughness ?? (aquariumTheme ? 0.42 : 0.54),
      });
    if (rim.material.emissiveColor) {
      rim.material.emissiveColor = toColor3(
        aquariumSurfaceProfile?.rimRgb || palette.rim,
        aquariumSurfaceProfile ? 0.04 : aquariumTheme ? 0.06 : theme === 'storm' ? 0.08 : 0.04,
      );
    }
    markGameplaySurface(rim);
  }

  const top = BABYLON.MeshBuilder.CreatePlane(`${name}_top`, {
    width: Math.max(0.5, def.w - 0.16),
    height: Math.max(0.5, def.d - 0.16),
  }, scene);
  top.parent = root;
  top.rotation.x = Math.PI / 2;
  top.position.y = (def.h * 0.5) + 0.01;
  const topMat = new BABYLON.StandardMaterial(`${name}_topMat`, scene);
  topMat.diffuseColor = aquariumSurfaceProfile
    ? toColor3(aquariumSurfaceProfile.topRgb)
    : aquariumTheme
    ? new BABYLON.Color3(0.10, 0.24, 0.30)
    : theme === 'storm'
    ? new BABYLON.Color3(0.40, 0.38, 0.32)
    : theme === 'library'
      ? new BABYLON.Color3(0.60, 0.44, 0.28)
      : theme === 'camp'
        ? new BABYLON.Color3(0.46, 0.34, 0.24)
        : new BABYLON.Color3(0.14, 0.16, 0.18);  // factory: dark steel grey
  topMat.emissiveColor = toColor3(
    aquariumSurfaceProfile?.glowRgb || palette.glow,
    aquariumSurfaceProfile?.topEmissive ?? (aquariumTheme ? 0.14 : theme === 'storm' ? 0.08 : theme === 'library' ? 0.06 : theme === 'camp' ? 0.05 : 0.10),
  );
  topMat.alpha = aquariumSurfaceProfile?.topAlpha ?? (aquariumTheme ? 0.62 : theme === 'storm' ? 0.82 : theme === 'library' ? 0.74 : theme === 'camp' ? 0.68 : 0.48);
  topMat.specularColor = BABYLON.Color3.Black();
  topMat.backFaceCulling = false;
  topMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  top.material = topMat;
  markGameplaySurface(top);
  markDecor(top);

  if (theme === 'factory') {
    addFactoryPlatformDetails(scene, root, name, def, palette, shadowGen);
  } else if (theme === 'aquarium') {
    addAquariumPlatformDetails(scene, root, name, def, palette, shadowGen, aquariumSurfaceProfile);
  } else if (theme === 'storm') {
    addStormPlatformDetails(scene, root, name, def, palette, shadowGen);
  } else if (theme === 'library') {
    addLibraryPlatformDetails(scene, root, name, def, palette, shadowGen);
  } else if (theme === 'camp') {
    addCampPlatformDetails(scene, root, name, def, palette, shadowGen);
  }

  return root;
}

function createTextTexture(scene, name, text, {
  width = 1024,
  height = 256,
  bg = 'rgba(18,20,24,0.0)',
  fg = '#f8f6ea',
  accent = '#ffdb7a',
} = {}) {
  const texture = new BABYLON.DynamicTexture(name, { width, height }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = accent;
  ctx.font = `900 ${Math.floor(height * 0.22)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width * 0.5, height * 0.5);
  ctx.fillStyle = fg;
  ctx.font = `700 ${Math.floor(height * 0.13)}px Arial`;
  ctx.fillText(text, width * 0.5, height * 0.5);
  texture.update();
  texture.hasAlpha = true;
  return texture;
}

function createSign(scene, name, def, theme) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  for (const x of [-((def.width * 0.5) - 0.22), (def.width * 0.5) - 0.22]) {
    createDecorBox(scene, `${name}_post_${x > 0 ? 'r' : 'l'}`, root, {
      width: 0.14,
      height: def.height + 0.86,
      depth: 0.14,
      x,
      y: -0.18,
      z: -0.06,
      rgb: theme === 'library' || theme === 'camp' ? palette.rim : palette.line,
      emissiveScale: theme === 'storm' ? 0.12 : 0.04,
      roughness: 0.74,
      cardboard: theme === 'library' || theme === 'camp',
    });
  }
  const plane = BABYLON.MeshBuilder.CreatePlane(`${name}_plane`, {
    width: def.width,
    height: def.height,
  }, scene);
  plane.parent = root;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = createTextTexture(scene, `${name}_tex`, def.text, {
    bg: theme === 'storm'
      ? 'rgba(10,18,38,0.72)'
      : theme === 'library'
        ? 'rgba(58,34,16,0.74)'
        : theme === 'camp'
          ? 'rgba(36,24,18,0.70)'
          : 'rgba(18,20,24,0.0)',
    fg: theme === 'storm' ? '#eef9ff' : theme === 'library' ? '#fff2d6' : '#fff6de',
    accent: `rgb(${palette.glow.join(',')})`,
  });
  mat.opacityTexture = mat.diffuseTexture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.specularColor = BABYLON.Color3.Black();
  mat.emissiveColor = theme === 'storm'
    ? new BABYLON.Color3(0.10, 0.14, 0.22)
    : theme === 'library'
      ? new BABYLON.Color3(0.16, 0.10, 0.04)
      : theme === 'camp'
        ? new BABYLON.Color3(0.14, 0.10, 0.05)
        : new BABYLON.Color3(0.18, 0.12, 0.04);
  plane.material = mat;
  markDecor(root);
  return root;
}

function createRouteRibbon(scene, name, def, theme) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(`${name}_root`, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.width,
    height: def.depth,
  }, scene);
  plane.parent = root;
  plane.rotation.x = Math.PI / 2;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = toColor3(theme === 'library' ? [214, 164, 94] : palette.line);
  mat.emissiveColor = toColor3(palette.glow, theme === 'storm' ? 0.18 : 0.14);
  mat.alpha = theme === 'storm' ? 0.10 : theme === 'library' ? 0.09 : theme === 'camp' ? 0.08 : 0.08;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecor(root);

  if (theme === 'storm') {
    for (const z of [-def.depth * 0.34, def.depth * 0.34]) {
      createDecorPlane(scene, `${name}_gustLine_${z > 0 ? 'r' : 'l'}`, root, {
        width: Math.max(2.4, def.width - 2.4),
        height: 0.18,
        y: 0.01,
        z,
        rgb: palette.glow,
        emissiveScale: 0.18,
        alpha: 0.24,
      });
    }
  } else if (theme === 'library') {
    for (const z of [-def.depth * 0.30, def.depth * 0.30]) {
      createDecorPlane(scene, `${name}_pageEdge_${z > 0 ? 'r' : 'l'}`, root, {
        width: Math.max(2.0, def.width - 1.6),
        height: 0.12,
        y: 0.01,
        z,
        rgb: [255, 240, 198],
        emissiveScale: 0.10,
        alpha: 0.26,
      });
    }
  } else if (theme === 'camp') {
    for (const z of [-def.depth * 0.24, def.depth * 0.24]) {
      createDecorPlane(scene, `${name}_emberTrack_${z > 0 ? 'r' : 'l'}`, root, {
        width: Math.max(2.0, def.width - 2.0),
        height: 0.16,
        y: 0.01,
        z,
        rgb: [255, 194, 116],
        emissiveScale: 0.12,
        alpha: 0.18,
      });
    }
  }

  return { mesh: plane, mat, root };
}

function createPickupNode(scene, drop, theme, shadowGen) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(`pickup_${drop.name}`, scene);
  root.position.set(drop.x, drop.y, drop.z ?? 0);
  let core;
  let ring;

  if (theme === 'storm') {
    const topHalf = BABYLON.MeshBuilder.CreateCylinder(`pickup_${drop.name}_kiteTop`, {
      height: 0.34,
      diameterTop: 0.02,
      diameterBottom: 0.48,
      tessellation: 4,
    }, scene);
    topHalf.parent = root;
    topHalf.position.y = 0.18;
    topHalf.rotation.y = Math.PI * 0.25;
    topHalf.material = createGlowMaterial(scene, `pickup_${drop.name}_kiteTopMat`, palette.accent, {
      roughness: 0.22,
      emissive: 0.26,
    });
    const bottomHalf = BABYLON.MeshBuilder.CreateCylinder(`pickup_${drop.name}_kiteBottom`, {
      height: 0.34,
      diameterTop: 0.48,
      diameterBottom: 0.02,
      tessellation: 4,
    }, scene);
    bottomHalf.parent = root;
    bottomHalf.position.y = -0.14;
    bottomHalf.rotation.y = Math.PI * 0.25;
    bottomHalf.material = topHalf.material;
    core = topHalf;
    shadowGen.addShadowCaster(topHalf);
    shadowGen.addShadowCaster(bottomHalf);
    ring = BABYLON.MeshBuilder.CreateTorus(`pickup_${drop.name}_ring`, {
      diameter: 0.94,
      thickness: 0.05,
      tessellation: 14,
    }, scene);
    ring.parent = root;
    ring.rotation.z = Math.PI * 0.5;
    ring.position.y = 0.08;
    ring.material = createGlowMaterial(scene, `pickup_${drop.name}_ringMat`, palette.glow, {
      alpha: 0.72,
      emissive: 0.34,
    });
    createDecorPlane(scene, `pickup_${drop.name}_tail`, root, {
      width: 0.14,
      height: 0.9,
      y: -0.48,
      rotationX: 0.16,
      rgb: palette.line,
      emissiveScale: 0.18,
      alpha: 0.32,
    });
  } else if (theme === 'library') {
    core = BABYLON.MeshBuilder.CreateBox(`pickup_${drop.name}_book`, {
      width: 0.58,
      height: 0.42,
      depth: 0.44,
    }, scene);
    core.parent = root;
    core.position.y = 0.06;
    core.material = makeCardboard(scene, `pickup_${drop.name}_bookMat`, 0.58, 0.40, 0.22, {
      roughness: 0.88,
      noiseAmt: 12,
      grainScale: 3,
    });
    core.material.emissiveColor = toColor3(palette.glow, 0.06);
    shadowGen.addShadowCaster(core);
    ring = BABYLON.MeshBuilder.CreateTorus(`pickup_${drop.name}_ring`, {
      diameter: 0.92,
      thickness: 0.05,
      tessellation: 18,
    }, scene);
    ring.parent = root;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.10;
    ring.material = createGlowMaterial(scene, `pickup_${drop.name}_ringMat`, [255, 236, 188], {
      alpha: 0.62,
      emissive: 0.24,
    });
    for (const z of [-0.12, 0.12]) {
      createDecorPlane(scene, `pickup_${drop.name}_page_${z > 0 ? 'b' : 'f'}`, root, {
        width: 0.56,
        height: 0.22,
        y: 0.22,
        z,
        rotationX: Math.PI / 2,
        rotationZ: z > 0 ? -0.08 : 0.08,
        rgb: [255, 245, 220],
        emissiveScale: 0.08,
        alpha: 0.86,
      });
    }
  } else if (theme === 'camp') {
    core = BABYLON.MeshBuilder.CreateSphere(`pickup_${drop.name}_lantern`, {
      diameter: 0.46,
      segments: 10,
    }, scene);
    core.parent = root;
    core.position.y = 0.04;
    core.material = createGlowMaterial(scene, `pickup_${drop.name}_lanternMat`, palette.accent, {
      roughness: 0.22,
      emissive: 0.30,
    });
    shadowGen.addShadowCaster(core);
    ring = BABYLON.MeshBuilder.CreateTorus(`pickup_${drop.name}_ring`, {
      diameter: 0.84,
      thickness: 0.04,
      tessellation: 20,
    }, scene);
    ring.parent = root;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ring.material = createGlowMaterial(scene, `pickup_${drop.name}_ringMat`, [255, 218, 162], {
      alpha: 0.58,
      emissive: 0.26,
    });
    createDecorPlane(scene, `pickup_${drop.name}_handle`, root, {
      width: 0.22,
      height: 0.44,
      y: 0.42,
      rotationX: 0,
      rgb: [210, 182, 124],
      emissiveScale: 0.10,
      alpha: 0.82,
    });
  } else {
    core = BABYLON.MeshBuilder.CreateCylinder(`pickup_${drop.name}_core`, {
      height: 0.54,
      diameterTop: 0.48,
      diameterBottom: 0.62,
      tessellation: 10,
    }, scene);
    core.parent = root;
    core.material = createGlowMaterial(scene, `pickup_${drop.name}_coreMat`, palette.accent, {
      roughness: 0.3,
      emissive: 0.26,
    });
    shadowGen.addShadowCaster(core);

    ring = BABYLON.MeshBuilder.CreateTorus(`pickup_${drop.name}_ring`, {
      diameter: 0.86,
      thickness: 0.06,
      tessellation: 18,
    }, scene);
    ring.parent = root;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14;
    ring.material = createGlowMaterial(scene, `pickup_${drop.name}_ringMat`, palette.glow, {
      alpha: 0.74,
      emissive: 0.34,
    });
  }

  const badge = BABYLON.MeshBuilder.CreatePlane(`pickup_${drop.name}_badge`, {
    width: 1.0,
    height: 0.44,
  }, scene);
  badge.parent = root;
  badge.position.set(0, 0.72, 0);
  badge.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const badgeMat = new BABYLON.StandardMaterial(`pickup_${drop.name}_badgeMat`, scene);
  badgeMat.diffuseTexture = createTextTexture(scene, `pickup_${drop.name}_badgeTex`, drop.title || drop.defId, {
    width: 640,
    height: 220,
    bg: theme === 'storm'
      ? 'rgba(10,20,36,0.78)'
      : theme === 'library'
        ? 'rgba(64,40,22,0.78)'
        : theme === 'camp'
          ? 'rgba(40,28,18,0.76)'
          : 'rgba(18,20,24,0.0)',
    fg: theme === 'storm' ? '#eef9ff' : theme === 'library' ? '#fff4dc' : '#fff6de',
    accent: `rgb(${palette.glow.join(',')})`,
  });
  badgeMat.opacityTexture = badgeMat.diffuseTexture;
  badgeMat.useAlphaFromDiffuseTexture = true;
  badgeMat.backFaceCulling = false;
  badgeMat.specularColor = BABYLON.Color3.Black();
  badgeMat.disableLighting = true;
  badge.material = badgeMat;

  markDecor(root);
  return { root, core, ring };
}

function createConveyorVisual(scene, name, def, theme, arrowText = '>>>') {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.w,
    height: def.d,
  }, scene);
  plane.position.set(def.x, def.y - (def.h * 0.5) + 0.06, def.z ?? 0);
  plane.rotation.x = Math.PI / 2;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = createTextTexture(scene, `${name}_tex`, arrowText, {
    width: 1024,
    height: 512,
    bg: 'rgba(32,36,42,0.0)',
    fg: '#fff6d2',
    accent: `rgb(${palette.line.join(',')})`,
  });
  mat.opacityTexture = mat.diffuseTexture;
  mat.emissiveTexture = mat.diffuseTexture;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.alpha = 0.32;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecor(plane);
  return { mesh: plane, mat };
}

function createAreaPulse(scene, name, def, theme, kind = 'area') {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(`${name}_root`, scene);
  root.position.set(def.x, def.y - (def.h * 0.5) + 0.06, def.z ?? 0);
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.w,
    height: def.d,
  }, scene);
  plane.parent = root;
  plane.rotation.x = Math.PI / 2;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = new BABYLON.Color3(
    palette.glow[0] / 255,
    palette.glow[1] / 255,
    palette.glow[2] / 255,
  );
  mat.emissiveColor = new BABYLON.Color3(
    palette.glow[0] / 255 * 0.2,
    palette.glow[1] / 255 * 0.2,
    palette.glow[2] / 255 * 0.2,
  );
  mat.alpha = 0.08;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecor(root);

  if (theme === 'storm' && kind === 'lightning') {
    createDecorPlane(scene, `${name}_boltX`, root, {
      width: Math.max(1.2, def.w * 0.74),
      height: 0.16,
      rotationX: Math.PI / 2,
      rotationZ: 0.38,
      rgb: palette.line,
      emissiveScale: 0.22,
      alpha: 0.22,
    });
    createDecorPlane(scene, `${name}_boltY`, root, {
      width: Math.max(1.2, def.w * 0.74),
      height: 0.16,
      rotationX: Math.PI / 2,
      rotationZ: -0.38,
      rgb: palette.line,
      emissiveScale: 0.22,
      alpha: 0.22,
    });
  } else if (theme === 'library' && kind === 'ink') {
    createDecorPlane(scene, `${name}_inkCore`, root, {
      width: Math.max(1.2, def.w - 1.0),
      height: Math.max(1.2, def.d - 1.0),
      rgb: [48, 22, 18],
      emissiveScale: 0.04,
      alpha: 0.20,
    });
  } else if (theme === 'camp' && kind === 'ember') {
    createDecorPlane(scene, `${name}_emberCore`, root, {
      width: Math.max(1.0, def.w - 1.1),
      height: Math.max(1.0, def.d - 1.1),
      rgb: [255, 150, 84],
      emissiveScale: 0.18,
      alpha: 0.16,
    });
  }

  return { mesh: plane, mat, root };
}

function createOilSlick(scene, name, def) {
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.w,
    height: def.d,
  }, scene);
  plane.position.set(def.x, def.y + 0.05, def.z ?? 0);
  plane.rotation.x = Math.PI / 2;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.16);
  mat.emissiveColor = new BABYLON.Color3(0.04, 0.04, 0.06);
  mat.alpha = 0.34;
  mat.specularColor = new BABYLON.Color3(0.16, 0.16, 0.18);
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecor(plane);
  return { mesh: plane, mat };
}

function createLampPost(scene, name, def, theme, shadowGen) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.library;
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const pole = BABYLON.MeshBuilder.CreateCylinder(`${name}_pole`, {
    height: 3.2,
    diameter: 0.18,
    tessellation: 10,
  }, scene);
  pole.parent = root;
  pole.position.y = 1.6;
  pole.material = createGlowMaterial(scene, `${name}_poleMat`, palette.rim, {
    emissive: 0.12,
    roughness: 0.6,
  });
  shadowGen.addShadowCaster(pole);

  const lamp = BABYLON.MeshBuilder.CreateSphere(`${name}_lamp`, {
    diameter: 0.56,
    segments: 10,
  }, scene);
  lamp.parent = root;
  lamp.position.y = 3.0;
  lamp.material = createGlowMaterial(scene, `${name}_lampMat`, palette.glow, {
    emissive: 0.36,
    roughness: 0.24,
  });

  const halo = BABYLON.MeshBuilder.CreatePlane(`${name}_halo`, {
    width: 3.4,
    height: 3.4,
  }, scene);
  halo.parent = root;
  halo.position.y = 2.4;
  halo.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const haloMat = new BABYLON.StandardMaterial(`${name}_haloMat`, scene);
  haloMat.diffuseColor = new BABYLON.Color3(
    palette.glow[0] / 255,
    palette.glow[1] / 255,
    palette.glow[2] / 255,
  );
  haloMat.emissiveColor = haloMat.diffuseColor.scale(0.18);
  haloMat.alpha = 0.12;
  haloMat.disableLighting = true;
  haloMat.specularColor = BABYLON.Color3.Black();
  haloMat.backFaceCulling = false;
  haloMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  halo.material = haloMat;

  markDecor(root);
  return root;
}

function createLightZoneVisual(scene, name, def, theme) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.camp;
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y + 0.08, def.z ?? 0);

  const ring = BABYLON.MeshBuilder.CreateTorus(`${name}_ring`, {
    diameter: def.radius * 2,
    thickness: 0.08,
    tessellation: 36,
  }, scene);
  ring.parent = root;
  ring.rotation.x = Math.PI / 2;
  ring.material = createGlowMaterial(scene, `${name}_ringMat`, palette.glow, {
    alpha: 0.48,
    emissive: 0.22,
    roughness: 0.28,
  });

  const fill = BABYLON.MeshBuilder.CreateDisc(`${name}_fill`, {
    radius: Math.max(0.2, def.radius - 0.08),
    tessellation: 40,
  }, scene);
  fill.parent = root;
  fill.rotation.x = Math.PI / 2;
  const fillMat = new BABYLON.StandardMaterial(`${name}_fillMat`, scene);
  fillMat.diffuseColor = new BABYLON.Color3(
    palette.glow[0] / 255,
    palette.glow[1] / 255,
    palette.glow[2] / 255,
  );
  fillMat.emissiveColor = fillMat.diffuseColor.scale(0.12);
  fillMat.alpha = 0.07;
  fillMat.disableLighting = true;
  fillMat.specularColor = BABYLON.Color3.Black();
  fillMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  fill.material = fillMat;

  if (theme === 'camp') {
    for (const x of [-def.radius * 0.58, def.radius * 0.58]) {
      createDecorBox(scene, `${name}_post_${x > 0 ? 'r' : 'l'}`, root, {
        width: 0.14,
        height: 1.4,
        depth: 0.14,
        x,
        y: 0.7,
        z: 0,
        rgb: [108, 74, 48],
        emissiveScale: 0.04,
        roughness: 0.82,
        cardboard: true,
      });
      const lantern = BABYLON.MeshBuilder.CreateSphere(`${name}_lantern_${x > 0 ? 'r' : 'l'}`, {
        diameter: 0.24,
        segments: 8,
      }, scene);
      lantern.parent = root;
      lantern.position.set(x, 1.28, 0);
      lantern.material = createGlowMaterial(scene, `${name}_lanternMat_${x > 0 ? 'r' : 'l'}`, palette.glow, {
        emissive: 0.34,
        roughness: 0.18,
      });
      markDecor(lantern);
    }
  }

  markDecor(root);
  return { root, ring, fill, fillMat };
}

function createSegmentLine(scene, name, start, end, color) {
  const line = BABYLON.MeshBuilder.CreateLines(name, {
    points: [
      new BABYLON.Vector3(start.x, start.y, start.z),
      new BABYLON.Vector3(end.x, end.y, end.z),
    ],
    updatable: true,
  }, scene);
  line.color = color;
  line.alpha = 0.42;
  markDecor(line);
  return line;
}

function createEnemyVisual(scene, def, theme, shadowGen) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  const color = new BABYLON.Color3(
    palette.enemy[0] / 255,
    palette.enemy[1] / 255,
    palette.enemy[2] / 255,
  );

  const body = BABYLON.MeshBuilder.CreateSphere(`${def.name}_body`, {
    diameter: def.kind === 'fox' ? 0.74 : def.kind === 'frog' ? 0.62 : 0.68,
    segments: 10,
  }, scene);
  body.parent = root;
  body.material = theme === 'library' || theme === 'camp'
    ? makePaper(scene, `${def.name}_bodyMat`, color.r, color.g, color.b, {
      roughness: theme === 'library' ? 0.92 : 0.88,
      grainScale: theme === 'library' ? 4 : 3,
    })
    : makePlastic(scene, `${def.name}_bodyMat`, color.r, color.g, color.b, { roughness: 0.4 });
  if (body.material.emissiveColor) {
    body.material.emissiveColor = theme === 'storm'
      ? new BABYLON.Color3(0.10, 0.14, 0.22)
      : theme === 'camp'
        ? new BABYLON.Color3(0.08, 0.06, 0.04)
        : new BABYLON.Color3(0.04, 0.03, 0.02);
  }
  shadowGen.addShadowCaster(body);

  const eye = BABYLON.MeshBuilder.CreatePlane(`${def.name}_eye`, {
    width: 0.22,
    height: 0.1,
  }, scene);
  eye.parent = root;
  eye.position.set(0, 0.04, -0.34);
  const eyeMat = new BABYLON.StandardMaterial(`${def.name}_eyeMat`, scene);
  eyeMat.diffuseColor = new BABYLON.Color3(1, 0.96, 0.88);
  eyeMat.emissiveColor = new BABYLON.Color3(0.18, 0.16, 0.12);
  eyeMat.specularColor = BABYLON.Color3.Black();
  eyeMat.backFaceCulling = false;
  eye.material = eyeMat;

  if (def.kind === 'bird' || def.kind === 'crane') {
    const wingL = BABYLON.MeshBuilder.CreatePlane(`${def.name}_wingL`, { width: 0.46, height: 0.18 }, scene);
    wingL.parent = root;
    wingL.position.set(-0.32, 0.0, 0);
    wingL.rotation.z = -0.34;
    wingL.material = body.material;
    const wingR = wingL.clone(`${def.name}_wingR`);
    wingR.parent = root;
    wingR.position.x = 0.32;
    wingR.rotation.z = 0.34;
    if (theme === 'library' || theme === 'camp') {
      wingL.scaling.set(1.2, 1.5, 1);
      wingR.scaling.set(1.2, 1.5, 1);
      wingL.rotation.x = 0.12;
      wingR.rotation.x = 0.12;
    }
  }

  if (def.kind === 'frog') {
    const legL = BABYLON.MeshBuilder.CreateBox(`${def.name}_legL`, { width: 0.14, height: 0.12, depth: 0.26 }, scene);
    legL.parent = root;
    legL.position.set(-0.16, -0.22, 0.08);
    legL.material = body.material;
    const legR = legL.clone(`${def.name}_legR`);
    legR.parent = root;
    legR.position.x = 0.16;
  }

  if (def.kind === 'spark') {
    for (let i = 0; i < 3; i += 1) {
      createDecorPlane(scene, `${def.name}_sparkRay_${i}`, root, {
        width: 0.92,
        height: 0.12,
        rotationX: 0,
        rotationZ: i * (Math.PI / 3),
        rgb: palette.glow,
        emissiveScale: 0.20,
        alpha: 0.34,
      });
    }
  }

  if (theme === 'camp' && def.kind === 'fox') {
    for (const x of [-0.16, 0.16]) {
      const ear = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_ear_${x > 0 ? 'r' : 'l'}`, {
        height: 0.24,
        diameterTop: 0.02,
        diameterBottom: 0.20,
        tessellation: 3,
      }, scene);
      ear.parent = root;
      ear.position.set(x, 0.34, -0.08);
      ear.rotation.z = x > 0 ? 0.24 : -0.24;
      ear.material = body.material;
      markDecor(ear);
    }
    const tail = BABYLON.MeshBuilder.CreatePlane(`${def.name}_tail`, {
      width: 0.34,
      height: 0.20,
    }, scene);
    tail.parent = root;
    tail.position.set(0, 0.04, 0.32);
    tail.rotation.x = 0.22;
    tail.material = body.material;
    markDecor(tail);
  }

  if (theme === 'library' && def.kind === 'bird') {
    createDecorPlane(scene, `${def.name}_bookmarkTail`, root, {
      width: 0.18,
      height: 0.34,
      y: -0.06,
      z: 0.32,
      rotationX: 0.24,
      rgb: [255, 236, 188],
      emissiveScale: 0.08,
      alpha: 0.82,
    });
  }

  if (def.kind === 'flyingBook') {
    // Hide the default sphere body and eye — book shape replaces them
    body.visibility = 0;
    eye.visibility = 0;
    // Book cover — flat box like an open hardback floating in flight
    const cover = BABYLON.MeshBuilder.CreateBox(`${def.name}_cover`, {
      width: 0.54,
      height: 0.06,
      depth: 0.72,
    }, scene);
    cover.parent = root;
    cover.material = makeCardboard(scene, `${def.name}_coverMat`, 82 / 255, 52 / 255, 36 / 255, { roughness: 0.86, noiseAmt: 14 });
    shadowGen.addShadowCaster(cover);
    markDecor(cover);
    // Spine stripe along cover left edge
    createDecorPlane(scene, `${def.name}_spine`, root, {
      width: 0.07,
      height: 0.70,
      x: -0.28,
      y: 0.04,
      rotationX: Math.PI / 2,
      rotationY: Math.PI / 2,
      rgb: palette.glow,
      emissiveScale: 0.18,
      alpha: 0.88,
    });
    // Page wings — two planes that flap open like pages
    const pageMat = createFlatDecorMaterial(scene, `${def.name}_pageMat`, [255, 244, 220], { emissiveScale: 0.12, alpha: 0.86 });
    const pageL = BABYLON.MeshBuilder.CreatePlane(`${def.name}_pageL`, { width: 0.50, height: 0.66 }, scene);
    pageL.parent = root;
    pageL.position.set(-0.36, 0.02, 0);
    pageL.rotation.y = -0.52;
    pageL.material = pageMat;
    pageL.backFaceCulling = false;
    markDecor(pageL);
    const pageR = BABYLON.MeshBuilder.CreatePlane(`${def.name}_pageR`, { width: 0.50, height: 0.66 }, scene);
    pageR.parent = root;
    pageR.position.set(0.36, 0.02, 0);
    pageR.rotation.y = 0.52;
    pageR.material = pageMat;
    pageR.backFaceCulling = false;
    markDecor(pageR);
    // Store wing refs for animation in the update loop
    root.metadata = { ...(root.metadata || {}), pageWings: { left: pageL, right: pageR } };
  }

  root.metadata = {
    ...(root.metadata || {}),
    role: 'enemy',
  };
  return { root, body };
}

function createGearLiftVisual(scene, def, theme, shadowGen) {
  const root = createStyledPlatform(scene, def.name, def, shadowGen, theme);
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  for (const offset of [-2.0, 2.0]) {
    const gear = BABYLON.MeshBuilder.CreateTorus(`${def.name}_gear_${offset}`, {
      diameter: 1.8,
      thickness: 0.26,
      tessellation: 18,
    }, scene);
    gear.parent = root;
    gear.rotation.x = Math.PI / 2;
    gear.position.set(offset, -0.8, 0);
    gear.material = createGlowMaterial(scene, `${def.name}_gearMat_${offset}`, palette.rim, {
      emissive: 0.16,
      roughness: 0.48,
    });
  }
  return root;
}

function createCampFamily(scene, x, y, z, shadowGen) {
  const root = new BABYLON.TransformNode('campFamily', scene);
  root.position.set(x, y, z);
  markDecor(root);

  const fire = BABYLON.MeshBuilder.CreateCylinder('campFireCore', {
    height: 0.8,
    diameterTop: 0.4,
    diameterBottom: 0.8,
    tessellation: 8,
  }, scene);
  fire.parent = root;
  fire.position.set(0, 0.4, 0);
  fire.material = createGlowMaterial(scene, 'campFireCoreMat', [255, 160, 82], {
    emissive: 0.42,
    roughness: 0.22,
  });

  const family = [];
  const arc = [-1.9, -1.3, -0.6, 0.0, 0.6, 1.3, 1.9];
  for (let i = 0; i < arc.length; i++) {
    const chair = createSimpleChair(scene, {
      x: arc[i] * 2.1,
      y: 0,
      z: 2.8 + Math.abs(arc[i]) * 0.5,
      shadowGen,
      seatColor: '#9f7b55',
      legColor: '#66492f',
    });
    chair.parent = root;
    chair.rotation.y = Math.PI;

    if (i === 0 || i === 1) {
      const grandma = createGrandma(scene, {
        x: arc[i] * 2.1,
        y: 0.8,
        z: 2.65 + Math.abs(arc[i]) * 0.5,
        shadowGen,
      });
      grandma.root.parent = root;
      grandma.root.rotation.y = Math.PI;
      family.push(grandma.root);
    } else if (i === 2 || i === 4) {
      const mom = createMom(scene, {
        x: arc[i] * 2.1,
        y: 0.78,
        z: 2.65 + Math.abs(arc[i]) * 0.5,
        pose: 'sitting',
        shadowGen,
      });
      mom.root.parent = root;
      mom.root.rotation.y = Math.PI;
      family.push(mom.root);
    } else {
      const child = BABYLON.MeshBuilder.CreateSphere(`campChild_${i}`, {
        diameter: 0.72,
        segments: 10,
      }, scene);
      child.parent = root;
      child.position.set(arc[i] * 2.1, 1.16, 2.65 + Math.abs(arc[i]) * 0.5);
      const mat = createGlowMaterial(scene, `campChildMat_${i}`, i === 3 ? [255, 214, 146] : [214, 196, 176], {
        emissive: 0.14,
        roughness: 0.46,
      });
      child.material = mat;
      shadowGen.addShadowCaster(child);
      family.push(child);
    }
  }

  return { root, family, fire };
}

function getResistance(stats = {}, element = '') {
  if (element === 'electric') return clamp(stats.electricResist ?? 0, 0, 0.4);
  if (element === 'wind') return clamp(stats.windResist ?? 0, 0, 0.4);
  if (element === 'ink') return clamp(stats.inkResist ?? 0, 0, 0.4);
  if (element === 'fire') return clamp(stats.fireResist ?? 0, 0, 0.4);
  return clamp(stats.waterResist ?? 0, 0, 0.4);
}

function isInsideBox(pos, def) {
  return pos.x >= def.x - (def.w * 0.5)
    && pos.x <= def.x + (def.w * 0.5)
    && pos.y >= def.y - (def.h * 0.5)
    && pos.y <= def.y + (def.h * 0.5)
    && pos.z >= (def.z ?? 0) - (def.d * 0.5)
    && pos.z <= (def.z ?? 0) + (def.d * 0.5);
}

export function buildEraAdventureWorld(scene, layout, options = {}) {
  const { animateGoal = true } = options;
  const theme = layout.theme || 'factory';
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const sceneLook = THEME_SCENE_LOOKS[theme] || THEME_SCENE_LOOKS.factory;

  scene.clearColor = new BABYLON.Color4(
    sceneLook.clear[0] / 255,
    sceneLook.clear[1] / 255,
    sceneLook.clear[2] / 255,
    sceneLook.clear[3] / 255,
  );
  scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
  scene.fogColor = new BABYLON.Color3(
    sceneLook.fog[0] / 255,
    sceneLook.fog[1] / 255,
    sceneLook.fog[2] / 255,
  );
  scene.fogStart = sceneLook.fogStart;
  scene.fogEnd = sceneLook.fogEnd;

  const keyLight = new BABYLON.DirectionalLight(
    `${theme}_keyLight`,
    new BABYLON.Vector3(...sceneLook.keyDir),
    scene,
  );
  keyLight.intensity = sceneLook.keyIntensity;
  keyLight.diffuse = toColor3(palette.glow, theme === 'storm' ? 0.70 : theme === 'library' ? 0.50 : theme === 'camp' ? 0.42 : 0.56);
  keyLight.specular = toColor3(palette.line, 0.12);
  const shadowGen = new BABYLON.ShadowGenerator(1024, keyLight);
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.bias = 0.00035;

  const hemi = new BABYLON.HemisphericLight(`${theme}_fill`, new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = sceneLook.hemiIntensity;
  hemi.diffuse = toColor3(sceneLook.hemiColor);
  hemi.groundColor = new BABYLON.Color3(...sceneLook.hemiGround);

  const rim = new BABYLON.PointLight(
    `${theme}_rim`,
    new BABYLON.Vector3(
      layout.goal.x + sceneLook.rimOffset[0],
      sceneLook.rimOffset[1],
      sceneLook.rimOffset[2],
    ),
    scene,
  );
  rim.intensity = sceneLook.rimIntensity;
  rim.diffuse = toColor3(palette.glow);

  const groundVisual = layout.showGroundVisual === false
    ? null
    : createStyledPlatform(scene, `${theme}_ground`, layout.ground, shadowGen, theme);
  if (groundVisual) setRenderingGroup(groundVisual, 2);
  const groundCollider = makeInvisibleCollider(scene, `${theme}_groundCollider`, layout.ground);
  const allPlatforms = [groundCollider];
  const platformVisuals = groundVisual ? [groundVisual] : [];

  for (const def of layout.platforms || []) {
    const visual = createStyledPlatform(scene, `${theme}_${def.name}`, def, shadowGen, theme);
    setRenderingGroup(visual, 2);
    platformVisuals.push(visual);
    allPlatforms.push(makeInvisibleCollider(scene, `${theme}_${def.name}_col`, def));
  }

  const decorPlatforms = [];
  for (const def of layout.decorPlatforms || []) {
    const visual = createStyledPlatform(scene, `${theme}_${def.name}`, def, shadowGen, theme);
    if (Number.isFinite(def.rotationX)) visual.rotation.x = def.rotationX;
    if (Number.isFinite(def.rotationY)) visual.rotation.y = def.rotationY;
    if (Number.isFinite(def.rotationZ)) visual.rotation.z = def.rotationZ;
    markDecorStructure(visual);
    setRenderingGroup(visual, 2);
    decorPlatforms.push(visual);
  }

  const decorPlanes = [];
  for (const [index, def] of (layout.decorPlanes || []).entries()) {
    const plane = createDecorPlane(scene, `${theme}_decorPlane_${def.name || index}`, null, {
      width: def.width,
      height: def.height,
      x: def.x,
      y: def.y,
      z: def.z ?? 0,
      rotationX: def.rotationX ?? 0,
      rotationY: def.rotationY ?? 0,
      rotationZ: def.rotationZ ?? 0,
      rgb: def.rgb || getThemeStructureRgb(theme),
      emissiveScale: def.emissiveScale ?? 0.06,
      alpha: def.alpha ?? 0.22,
    });
    setRenderingGroup(plane, 1);
    decorPlanes.push(plane);
  }

  const decorBlocks = [];
  const decorBlockColliders = [];
  for (const [index, def] of (layout.decorBlocks || []).entries()) {
    const block = createDecorBox(scene, `${theme}_decorBlock_${def.name || index}`, null, {
      width: def.w,
      height: def.h,
      depth: def.d,
      x: def.x,
      y: def.y,
      z: def.z ?? 0,
      rgb: def.rgb || getThemeStructureRgb(theme),
      emissiveScale: def.emissiveScale ?? (theme === 'storm' ? 0.06 : 0.04),
      roughness: def.roughness ?? 0.74,
      alpha: def.alpha ?? 1,
      shadowGen,
      cardboard: def.cardboard ?? (theme === 'library' || theme === 'camp'),
    });
    if (Number.isFinite(def.rotationY)) block.rotation.y = def.rotationY;
    if (Number.isFinite(def.rotationZ)) block.rotation.z = def.rotationZ;
    setRenderingGroup(block, 1);
    decorBlocks.push(block);
    if (def.solid) {
      decorBlockColliders.push(makeSolidBlockerCollider(scene, `${theme}_${def.name || index}_solidCol`, {
        x: def.x,
        y: def.y,
        z: def.z ?? 0,
        w: def.w,
        h: def.h,
        d: def.d,
      }, {
        role: 'solidBlocker',
      }));
    }
  }
  allPlatforms.push(...decorBlockColliders);

  const decorColumns = [];
  const decorColumnColliders = [];
  for (const [index, def] of (layout.decorColumns || []).entries()) {
    const column = createDecorColumn(scene, `${theme}_decorColumn_${def.name || index}`, null, {
      diameter: def.diameter ?? 1,
      diameterTop: def.diameterTop ?? null,
      diameterBottom: def.diameterBottom ?? null,
      height: def.height ?? 4,
      x: def.x,
      y: def.y,
      z: def.z ?? 0,
      rgb: def.rgb || getThemeStructureRgb(theme),
      emissiveScale: def.emissiveScale ?? (theme === 'storm' ? 0.08 : 0.04),
      roughness: def.roughness ?? 0.72,
      alpha: def.alpha ?? 1,
      shadowGen,
      cardboard: def.cardboard ?? (theme === 'library' || theme === 'camp'),
    });
    if (Number.isFinite(def.rotationY)) column.rotation.y = def.rotationY;
    setRenderingGroup(column, 1);
    decorColumns.push(column);
    if (def.solid) {
      const diameter = Math.max(def.diameter ?? 0, def.diameterTop ?? 0, def.diameterBottom ?? 0, 0.2);
      decorColumnColliders.push(makeSolidBlockerCollider(scene, `${theme}_${def.name || index}_solidCol`, {
        x: def.x,
        y: def.y,
        z: def.z ?? 0,
        w: diameter,
        h: def.height ?? 4,
        d: diameter,
      }, {
        role: 'solidColumn',
      }));
    }
  }
  allPlatforms.push(...decorColumnColliders);

  const optionalSurfaces = [];
  for (const def of layout.hiddenBridges || []) {
    const visual = createStyledPlatform(scene, `${theme}_${def.name}`, def, shadowGen, theme);
    setRenderingGroup(visual, 2);
    visual.setEnabled(false);
    optionalSurfaces.push({ def, visual, visible: false, collider: makeInvisibleCollider(scene, `${theme}_${def.name}_col`, def) });
    allPlatforms.push(optionalSurfaces[optionalSurfaces.length - 1].collider);
  }
  for (const def of layout.paperBridges || []) {
    const visual = createStyledPlatform(scene, `${theme}_${def.name}`, def, shadowGen, theme);
    setRenderingGroup(visual, 2);
    optionalSurfaces.push({ def, visual, visible: true, collider: makeInvisibleCollider(scene, `${theme}_${def.name}_col`, def), folding: true });
    allPlatforms.push(optionalSurfaces[optionalSurfaces.length - 1].collider);
  }
  for (const def of layout.gearLifts || []) {
    const visual = createGearLiftVisual(scene, def, theme, shadowGen);
    setRenderingGroup(visual, 2);
    optionalSurfaces.push({ def, visual, visible: true, gearLift: true, baseY: visual.position.y, collider: makeInvisibleCollider(scene, `${theme}_${def.name}_col`, def) });
    allPlatforms.push(optionalSurfaces[optionalSurfaces.length - 1].collider);
  }

  const routeRibbons = layout.showRouteRibbons === false
    ? []
    : (layout.acts || []).map((act, index) => {
      const xCenter = (act.range[0] + act.range[1]) * 0.5;
      const width = Math.max(12, act.range[1] - act.range[0] - 6);
      const ribbon = createRouteRibbon(scene, `${theme}_route_${index}`, {
        x: xCenter,
        y: layout.ground.y + (layout.ground.h * 0.5) + 0.02,
        z: 0,
        width,
        depth: 5.2 + (index % 2),
      }, theme);
      setRenderingGroup(ribbon.root || ribbon.mesh, 2);
      return ribbon;
    });

  const signs = [];
  for (const def of layout.signage || []) {
    const sign = createSign(scene, `${theme}_${def.text.replace(/[^a-z0-9]+/gi, '_')}`, def, theme);
    setRenderingGroup(sign, 1);
    signs.push(sign);
  }

  const checkpointFrames = [];
  const checkpoints = (layout.checkpoints || []).map((cp, index) => {
    const marker = createCheckpointMarker(scene, `${theme}_checkpoint_${index}`, {
      x: cp.x,
      y: cp.y - 0.06,
      z: 1.18,
      shadowGen,
    });
    markDecor(marker);
    setRenderingGroup(marker, 3);
    if (theme === 'aquarium' || theme === 'storm' || theme === 'library' || theme === 'camp') {
      const frame = createThemeCheckpointFrame(scene, `${theme}_checkpointFrame_${index}`, cp, theme, shadowGen);
      setRenderingGroup(frame, 2);
      checkpointFrames.push(frame);
    }
    return {
      index: index + 1,
      label: cp.label,
      spawn: { x: cp.x, y: cp.y, z: cp.z ?? 0 },
      radius: 1.24,
      marker,
    };
  });

  const pickups = (layout.drops || []).map((drop) => {
    const visual = createPickupNode(scene, drop, theme, shadowGen);
    setRenderingGroup(visual.root, 3);
    return {
      ...drop,
      collected: false,
      position: new BABYLON.Vector3(drop.x, drop.y, drop.z ?? 0),
      node: visual.root,
      _visual: visual,
    };
  });

  const coins = (layout.coins || []).map((coin, index) => {
    const node = createCoin(scene, `${theme}_coin_${index}`, coin);
    setRenderingGroup(node, 3);
    return {
      id: `l${layout.goal.x.toFixed(0)}_coin_${index}`,
      position: new BABYLON.Vector3(coin.x, coin.y, coin.z ?? 0),
      radius: 0.48,
      collected: false,
      node,
    };
  });

  const envFx = createThemeEnvironmentFx(scene, theme, {
    extents: layout.extents,
    floorY: layout.ground.y + 0.8,
    farZ: 16,
  });

  const oilSlicks = (layout.oilSlicks || []).map((def, index) => ({
    def,
    visual: createOilSlick(scene, `${theme}_oil_${index}`, def),
  }));
  const lampPosts = (layout.lampPosts || []).map((def, index) => ({
    def,
    visual: createLampPost(scene, `${theme}_lamp_${index}`, def, theme, shadowGen),
  }));
  const lightZoneVisuals = (layout.lightZones || []).map((def, index) => ({
    def,
    visual: createLightZoneVisual(scene, `${theme}_lightZone_${index}`, def, theme),
  }));

  // Library set-pieces — bookshelves, fireplaces, chairs, cocktail tables
  const libraryFireplaces = [];
  if (theme === 'library') {
    (layout.bookshelves || []).forEach((def, i) => createLibraryBookshelf(scene, `lib_shelf_${i}`, def, shadowGen));
    (layout.fireplaces || []).forEach((def, i) => {
      const fp = createLibraryFireplace(scene, `lib_fire_${i}`, def, shadowGen);
      libraryFireplaces.push(fp);
    });
    (layout.readingChairs || []).forEach((def, i) => createLibraryArmchair(scene, `lib_chair_${i}`, def, shadowGen));
    (layout.cocktailTables || []).forEach((def, i) => createLibraryCocktailTable(scene, `lib_table_${i}`, def, shadowGen));
  }

  let goalVisual;
  let goalRoot;
  let familySetpiece = null;
  if (theme === 'camp') {
    const dad = createDad(scene, {
      x: layout.goal.x,
      y: layout.goal.y,
      z: layout.goal.z ?? 0,
      outfit: 'level3',
      shadowGen,
      animate: animateGoal,
    });
    goalVisual = dad.goal;
    goalRoot = dad.root;
    familySetpiece = createCampFamily(scene, layout.goal.x - 4.8, layout.goal.y - 0.9, 0, shadowGen);
    familySetpiece.root.position.z = 1.8;
  } else {
    const dad = createDad(scene, {
      x: layout.goal.x,
      y: layout.goal.y,
      z: layout.goal.z ?? 0,
      outfit: palette.goalOutfit,
      shadowGen,
      animate: animateGoal,
    });
    goalVisual = dad.goal;
    goalRoot = dad.root;
  }
  goalRoot.position.z = layout.goal.z ?? 0;

  const conveyorZones = (layout.conveyors || layout.gusts || []).map((def, index) => ({
    def,
    visual: createConveyorVisual(scene, `${theme}_flow_${index}`, def, theme, layout.gusts ? 'WIND' : 'BELT'),
    time: 0,
    currentStrength: 0,
  }));

  const areaHazards = [];
  const makeAreaHazard = (defs, kind, element) => {
    for (const def of defs || []) {
      const pulse = createAreaPulse(scene, `${theme}_${def.name}_pulse`, def, theme, kind);
      let currentState = 'cooldown';
      const hazard = createTelegraphedHazard({
        name: def.name,
        warnDuration: def.warn,
        activeDuration: def.active,
        cooldownDuration: def.cooldown,
        phaseOffset: def.phaseOffset ?? 0,
        onWarnVisual: ({ progress }) => {
          currentState = 'warn';
          pulse.mat.alpha = 0.14 + (progress * 0.16);
        },
        onActiveVisual: ({ progress }) => {
          currentState = 'active';
          pulse.mat.alpha = 0.34 + (Math.sin(progress * Math.PI) * 0.18);
        },
        onCooldownVisual: ({ progress }) => {
          currentState = 'cooldown';
          pulse.mat.alpha = 0.06 + ((1 - progress) * 0.04);
        },
        isPlayerHit: ({ pos }) => isInsideBox(pos, def),
        onHit: ({ pos, triggerDamage, stats }) => {
          const resist = getResistance(stats, element);
          triggerDamage(kind, {
            x: pos.x >= def.x ? 1 : -1,
            z: pos.z >= (def.z ?? 0) ? 1 : -1,
          }, {
            invulnMs: 900,
            element,
            resist,
          });
        },
      });
      areaHazards.push({ def, kind, element, pulse, hazard, get state() { return currentState; } });
    }
  };
  makeAreaHazard(layout.presses, 'press', 'electric');
  makeAreaHazard(layout.lightning, 'lightning', 'electric');
  makeAreaHazard(layout.inkPuddles, 'ink', 'ink');
  makeAreaHazard(layout.embers, 'ember', 'fire');

  const lineHazards = [];
  for (const def of layout.triplines || []) {
    const line = createSegmentLine(
      scene,
      `${theme}_${def.name}_line`,
      { x: def.x1, y: def.y1, z: def.z ?? 0 },
      { x: def.x2, y: def.y2, z: def.z ?? 0 },
      new BABYLON.Color3(
        palette.glow[0] / 255,
        palette.glow[1] / 255,
        palette.glow[2] / 255,
      ),
    );
    let lineAlpha = 0.08;
    const hazard = createTelegraphedHazard({
      name: def.name,
      warnDuration: def.warn,
      activeDuration: def.active,
      cooldownDuration: def.cooldown,
      phaseOffset: def.phaseOffset ?? 0,
      onWarnVisual: ({ progress }) => {
        lineAlpha = 0.22 + (progress * 0.24);
        line.alpha = lineAlpha;
      },
      onActiveVisual: () => {
        lineAlpha = 0.88;
        line.alpha = lineAlpha;
      },
      onCooldownVisual: ({ progress }) => {
        lineAlpha = 0.10 + ((1 - progress) * 0.08);
        line.alpha = lineAlpha;
      },
      isPlayerHit: ({ pos }) => {
        const distance = distanceToSegment2D(pos.x, pos.z, def.x1, def.z ?? 0, def.x2, def.z ?? 0);
        return distance <= 0.6 && Math.abs(pos.y - def.y1) < 1.0;
      },
      onHit: ({ pos, triggerDamage, stats }) => {
        triggerDamage('tripline', {
          x: pos.x >= ((def.x1 + def.x2) * 0.5) ? 1 : -1,
          z: pos.z >= (def.z ?? 0) ? 1 : -1,
        }, {
          invulnMs: 900,
          element: 'electric',
          resist: getResistance(stats, 'electric'),
        });
      },
    });
    lineHazards.push({ def, line, hazard });
  }

  const sweepHazards = [];
  const allSweeps = [
    ...(layout.sweepers || []).map((def) => ({ ...def, kind: 'sweeper', element: 'wind' })),
    ...(layout.puppetSweeps || []).map((def) => ({ ...def, kind: 'puppet', element: 'wind' })),
  ];
  for (const def of allSweeps) {
    const band = BABYLON.MeshBuilder.CreatePlane(`${theme}_${def.name}_band`, {
      width: def.width,
      height: 4.2,
    }, scene);
    band.position.set(def.xMin, def.y, def.z ?? 0);
    band.rotation.x = Math.PI / 2;
    const bandMat = new BABYLON.StandardMaterial(`${theme}_${def.name}_bandMat`, scene);
    bandMat.diffuseColor = new BABYLON.Color3(
      palette.glow[0] / 255,
      palette.glow[1] / 255,
      palette.glow[2] / 255,
    );
    bandMat.emissiveColor = new BABYLON.Color3(
      palette.glow[0] / 255 * 0.18,
      palette.glow[1] / 255 * 0.18,
      palette.glow[2] / 255 * 0.18,
    );
    bandMat.alpha = 0.08;
    bandMat.specularColor = BABYLON.Color3.Black();
    bandMat.disableLighting = true;
    bandMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    band.material = bandMat;
    markDecor(band);

    const shadowPlane = BABYLON.MeshBuilder.CreatePlane(`${theme}_${def.name}_shadow`, {
      width: Math.max(12, def.xMax - def.xMin),
      height: 12,
    }, scene);
    shadowPlane.position.set((def.xMin + def.xMax) * 0.5, def.y + 6.8, (def.z ?? 0) + 0.2);
    const shadowMat = new BABYLON.StandardMaterial(`${theme}_${def.name}_shadowMat`, scene);
    shadowMat.diffuseColor = new BABYLON.Color3(0.12, 0.10, 0.08);
    shadowMat.emissiveColor = new BABYLON.Color3(0.04, 0.03, 0.02);
    shadowMat.alpha = def.kind === 'puppet' ? 0.12 : 0.06;
    shadowMat.specularColor = BABYLON.Color3.Black();
    shadowMat.disableLighting = true;
    shadowMat.backFaceCulling = false;
    shadowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    shadowPlane.material = shadowMat;
    markDecor(shadowPlane);

    const runtime = {
      bandX: def.xMin,
      active: false,
      state: 'cooldown',
    };
    const hazard = createTelegraphedHazard({
      name: def.name,
      warnDuration: def.warn,
      activeDuration: def.active,
      cooldownDuration: def.cooldown,
      phaseOffset: def.phaseOffset ?? 0,
      onWarnVisual: ({ progress }) => {
        runtime.state = 'warn';
        bandMat.alpha = 0.10 + (progress * 0.10);
        band.position.x = def.xMin;
        shadowMat.alpha = def.kind === 'puppet' ? 0.16 + (progress * 0.10) : 0.06 + (progress * 0.08);
      },
      onActiveVisual: ({ progress }) => {
        runtime.state = 'active';
        runtime.active = true;
        runtime.bandX = lerp(def.xMin, def.xMax, progress);
        band.position.x = runtime.bandX;
        bandMat.alpha = 0.46;
      },
      onCooldownVisual: ({ progress }) => {
        runtime.state = 'cooldown';
        runtime.active = false;
        bandMat.alpha = 0.08 + ((1 - progress) * 0.04);
        shadowMat.alpha = def.kind === 'puppet' ? 0.10 : 0.04;
      },
      isPlayerHit: ({ pos, safeFromSweep = false }) => {
        if (safeFromSweep) return false;
        const dx = Math.abs(pos.x - runtime.bandX);
        const dz = Math.abs(pos.z - (def.z ?? 0));
        return dx <= (def.width * 0.5) && dz <= 3.0 && Math.abs(pos.y - def.y) < 1.5;
      },
      onHit: ({ pos, triggerDamage, stats }) => {
        triggerDamage(def.kind === 'puppet' ? 'shadow' : 'sweep', {
          x: pos.x >= runtime.bandX ? 1 : -1,
          z: pos.z >= (def.z ?? 0) ? 1 : -1,
        }, {
          invulnMs: 900,
          element: def.element,
          resist: getResistance(stats, def.element),
        });
      },
    });
    sweepHazards.push({ def, band, bandMat, shadowPlane, shadowMat, runtime, hazard });
  }

  const enemyStates = (layout.enemies || []).map((def) => {
    const visual = createEnemyVisual(scene, def, theme, shadowGen);
    const mover = new NoiseWanderMover({
      root: visual.root,
      bounds: def.bounds,
      speed: def.speed ?? 1.2,
      turnSpeed: def.turnSpeed ?? 2.4,
      retargetEvery: [1.4, 2.8],
      bobAmp: def.kind === 'bird' || def.kind === 'crane' || def.kind === 'spark' || def.kind === 'flyingBook' ? 0.16 : 0.05,
      bobFreq: def.kind === 'frog' ? 2.4 : 1.8,
      pauseChance: 0.18,
      pauseRange: [0.24, 0.7],
    });
    return {
      def,
      root: visual.root,
      body: visual.body,
      mover,
      stunnedMs: 0,
      chaseMs: 0,
      cooldownMs: 0,
      warnMs: 0,
      velocity: new BABYLON.Vector3(0, 0, 0),
      home: visual.root.position.clone(),
      nextHopMs: 700,
      reset() {
        this.stunnedMs = 0;
        this.chaseMs = 0;
        this.cooldownMs = 0;
        this.warnMs = 0;
        this.nextHopMs = 700;
        this.root.position.copyFrom(this.home);
        this.mover.reset();
      },
    };
  });

  function isPlayerInSafeLight(pos, toolAura = null) {
    const lightDefs = layout.lightZones || [];
    for (const zone of lightDefs) {
      const dx = pos.x - zone.x;
      const dz = pos.z - (zone.z ?? 0);
      if ((dx * dx) + (dz * dz) <= (zone.radius * zone.radius)) {
        return true;
      }
    }
    if (toolAura) {
      const dx = pos.x - toolAura.x;
      const dz = pos.z - toolAura.z;
      if ((dx * dx) + (dz * dz) <= (toolAura.radius * toolAura.radius)) {
        return true;
      }
    }
    return false;
  }

  let time = 0;
  let lastConveyorPush = 0;
  let toolAura = null;
  let lastWarnedHazard = '';
  let lastWarnCueTime = -10;

  const era5Level = {
    reset() {
      time = 0;
      lastConveyorPush = 0;
      toolAura = null;
      lastWarnedHazard = '';
      lastWarnCueTime = -10;
      envFx.reset?.();
      for (const zone of conveyorZones) {
        zone.time = 0;
        zone.currentStrength = 0;
      }
      for (const hazard of areaHazards) {
        hazard.hazard.reset();
      }
      for (const hazard of lineHazards) {
        hazard.hazard.reset();
      }
      for (const hazard of sweepHazards) {
        hazard.hazard.reset();
        hazard.runtime.bandX = hazard.def.xMin;
        hazard.band.position.x = hazard.def.xMin;
      }
      for (const bridge of optionalSurfaces) {
        bridge.visual.position.y = bridge.def.y;
        if (bridge.folding) {
          bridge.visual.scaling.y = 1;
        }
        if (!bridge.folding && !bridge.gearLift) {
          bridge.visible = false;
          bridge.visual.setEnabled(false);
        }
      }
      for (const enemy of enemyStates) {
        enemy.reset();
      }
      for (const pickup of pickups) {
        if (pickup._visual?.root) {
          pickup._visual.root.rotation.set(0, 0, 0);
        }
      }
    },
    update(dt, ctx = {}) {
      time += dt;
      envFx.update?.(dt);
      const pos = ctx.pos;
      const player = ctx.player;
      const stats = ctx.stats || {};
      const toolDefId = ctx.toolDef?.defId || '';
      const toolEnabled = !!ctx.toolActive;

      lastConveyorPush = 0;
      for (const zone of conveyorZones) {
        zone.time += dt;
        const cycle = zone.def.cycle ?? 2.8;
        const phase = ((zone.time + (zone.def.phaseOffset ?? 0)) % cycle) / cycle;
        const pulse = layout.gusts ? (0.28 + (Math.sin(phase * Math.PI * 2) * 0.72)) : 1;
        zone.currentStrength = Math.max(0, pulse);
        zone.visual.mat.alpha = 0.12 + (zone.currentStrength * 0.20);
        if (!pos || !player || !isInsideBox(pos, zone.def)) continue;
        const pushResist = clamp(stats.beltPushResist ?? 0, 0, 0.9);
        const strength = zone.currentStrength * (1 - pushResist);
        player.vx += (zone.def.pushX ?? 0) * dt * strength;
        player.vz += (zone.def.pushZ ?? 0) * dt * strength;
        lastConveyorPush = Math.hypot(zone.def.pushX ?? 0, zone.def.pushZ ?? 0) * strength;
      }

      for (const slick of oilSlicks) {
        const alphaPulse = 0.22 + (Math.sin((time * 2.2) + slick.def.x) * 0.06);
        slick.visual.mat.alpha = alphaPulse;
        if (!pos || !player || !isInsideBox(pos, slick.def)) continue;
        const traction = clamp(stats.oilTraction ?? 0, 0, 0.9);
        const slipScale = 1 - traction;
        if (slipScale <= 0.001) continue;
        player.vx += (slick.def.slipX ?? 1.1) * dt * slipScale;
        player.vz += (slick.def.slipZ ?? 0.3) * dt * slipScale;
      }

      for (const bridge of optionalSurfaces) {
        if (bridge.gearLift) {
          const offset = Math.sin((time * (bridge.def.speed ?? 0.8)) + bridge.def.travel) * 0.18;
          bridge.visual.position.y = bridge.baseY + offset;
          bridge.collider.position.y = bridge.def.y + offset;
          continue;
        }
        if (bridge.folding) {
          const cycle = bridge.def.warn + bridge.def.active + bridge.def.cooldown;
          const phase = ((time + (bridge.def.phaseOffset ?? 0)) % cycle);
          const visible = phase < (bridge.def.warn + bridge.def.active);
          bridge.visual.scaling.y = visible ? 1 : 0.2;
          bridge.visual.rotation.z = visible ? 0 : -0.3;
          continue;
        }
        const withinRange = toolEnabled && toolDefId === 'lantern'
          && Math.hypot(pos.x - bridge.def.x, pos.z - (bridge.def.z ?? 0)) <= (bridge.def.revealRadius ?? 8);
        bridge.visible = withinRange;
        bridge.visual.setEnabled(withinRange);
      }

      const nearLamp = (layout.lampPosts || []).find((lamp) => {
        if (!pos) return false;
        const dx = pos.x - lamp.x;
        const dz = pos.z - (lamp.z ?? 0);
        return (dx * dx) + (dz * dz) <= (lamp.radius * lamp.radius);
      });
      if (nearLamp && typeof ctx.refillToolMeter === 'function' && toolDefId === 'lantern') {
        ctx.refillToolMeter(5.5);
      }

      if (toolEnabled && toolDefId === 'camp_lantern') {
        toolAura = {
          x: pos.x,
          z: pos.z,
          radius: 2.4,
        };
      } else {
        toolAura = null;
      }

      for (const zone of lightZoneVisuals) {
        const active = !!(pos && (() => {
          const dx = pos.x - zone.def.x;
          const dz = pos.z - (zone.def.z ?? 0);
          return ((dx * dx) + (dz * dz)) <= (zone.def.radius * zone.def.radius);
        })());
        zone.visual.fillMat.alpha = active
          ? 0.11 + (Math.sin(time * 5.2) * 0.02)
          : 0.05 + (Math.sin((time * 1.8) + zone.def.x) * 0.02);
      }

      for (const hazard of areaHazards) {
        const prevState = hazard.state;
        hazard.hazard.update(dt, ctx);
        if (hazard.state === 'warn' && prevState !== 'warn' && (time - lastWarnCueTime) > 0.42) {
          lastWarnedHazard = hazard.def.name;
          lastWarnCueTime = time;
          ctx.playCue?.('setpiece');
        }
      }
      for (const hazard of lineHazards) {
        const prevState = hazard.hazard.getState().state;
        hazard.hazard.update(dt, ctx);
        const nextState = hazard.hazard.getState().state;
        if (nextState === 'warn' && prevState !== 'warn' && (time - lastWarnCueTime) > 0.42) {
          lastWarnedHazard = hazard.def.name;
          lastWarnCueTime = time;
          ctx.playCue?.('setpiece');
        }
      }
      const safeFromSweep = pos ? isPlayerInSafeLight(pos, toolAura) : false;
      for (const hazard of sweepHazards) {
        const prevState = hazard.runtime.state;
        hazard.hazard.update(dt, { ...ctx, safeFromSweep });
        if (hazard.runtime.state === 'warn' && prevState !== 'warn' && (time - lastWarnCueTime) > 0.42) {
          lastWarnedHazard = hazard.def.name;
          lastWarnCueTime = time;
          ctx.playCue?.('setpiece');
        }
      }

      for (const enemy of enemyStates) {
        const bodyMat = enemy.body.material;
        if (enemy.stunnedMs > 0) {
          enemy.stunnedMs = Math.max(0, enemy.stunnedMs - (dt * 1000));
          enemy.root.position.y = enemy.home.y + (Math.sin(time * 6) * 0.04);
          if (bodyMat?.emissiveColor) {
            bodyMat.emissiveColor.set(0.18, 0.18, 0.28);
          }
        } else if (enemy.def.kind === 'spark') {
          const dx = pos.x - enemy.root.position.x;
          const dz = pos.z - enemy.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (enemy.cooldownMs > 0) {
            enemy.cooldownMs = Math.max(0, enemy.cooldownMs - (dt * 1000));
            enemy.mover.update(dt * 0.5);
          } else if (enemy.chaseMs > 0) {
            enemy.chaseMs = Math.max(0, enemy.chaseMs - (dt * 1000));
            const dir = new BABYLON.Vector3(dx, 0, dz);
            if (dir.lengthSquared() > 0.001) dir.normalize();
            enemy.root.position.addInPlace(dir.scale((enemy.def.speed ?? 1.2) * 1.9 * dt));
            enemy.root.rotation.y = wrapToPi(Math.atan2(dir.x, dir.z) + (Math.PI * 0.5));
            if (enemy.chaseMs <= 0) enemy.cooldownMs = 2000;
          } else {
            enemy.mover.update(dt);
            if (dist < 6.4) {
              enemy.chaseMs = 1200;
            }
          }
          if (bodyMat?.emissiveColor) {
            const pulse = enemy.chaseMs > 0 ? 0.26 : 0.12;
            bodyMat.emissiveColor.set(pulse, pulse * 0.9, 0.30);
          }
        } else if (enemy.def.kind === 'fox') {
          const dx = pos.x - enemy.root.position.x;
          const dz = pos.z - enemy.root.position.z;
          const dist = Math.hypot(dx, dz);
          if (enemy.cooldownMs > 0) {
            enemy.cooldownMs = Math.max(0, enemy.cooldownMs - (dt * 1000));
            enemy.mover.update(dt * 0.55);
          } else if (enemy.warnMs > 0) {
            enemy.warnMs = Math.max(0, enemy.warnMs - (dt * 1000));
            if (enemy.warnMs <= 0) {
              enemy.chaseMs = 380;
            }
          } else if (enemy.chaseMs > 0) {
            enemy.chaseMs = Math.max(0, enemy.chaseMs - (dt * 1000));
            const dir = new BABYLON.Vector3(dx, 0, dz);
            if (dir.lengthSquared() > 0.001) dir.normalize();
            enemy.root.position.addInPlace(dir.scale((enemy.def.speed ?? 1.4) * 3.0 * dt));
            enemy.root.rotation.y = wrapToPi(Math.atan2(dir.x, dir.z) + (Math.PI * 0.5));
            if (enemy.chaseMs <= 0) enemy.cooldownMs = 1300;
          } else {
            enemy.mover.update(dt);
            if (dist < 5.2) enemy.warnMs = 480;
          }
        } else if (enemy.def.kind === 'frog') {
          enemy.nextHopMs -= dt * 1000;
          if (enemy.nextHopMs <= 0) {
            enemy.nextHopMs = 850;
            const dir = new BABYLON.Vector3(
              Math.sin((time * 1.3) + enemy.def.x),
              0,
              Math.cos((time * 1.1) + enemy.def.z),
            ).normalize().scale(0.9);
            enemy.root.position.x = clamp(enemy.root.position.x + dir.x, enemy.def.bounds.minX, enemy.def.bounds.maxX);
            enemy.root.position.z = clamp(enemy.root.position.z + dir.z, enemy.def.bounds.minZ, enemy.def.bounds.maxZ);
            enemy.root.position.y = enemy.home.y + 0.26;
          } else {
            enemy.root.position.y = lerp(enemy.root.position.y, enemy.home.y, Math.min(1, dt * 5));
          }
        } else {
          enemy.mover.update(dt);
          // Flying book page-flap animation
          if (enemy.def.kind === 'flyingBook' && enemy.root.metadata?.pageWings) {
            const t = time * 4.2 + enemy.home.x * 0.31;
            enemy.root.metadata.pageWings.left.rotation.y = -0.52 + (Math.sin(t) * 0.28);
            enemy.root.metadata.pageWings.right.rotation.y = 0.52 - (Math.sin(t) * 0.28);
            enemy.root.rotation.y = wrapToPi(Math.atan2(
              enemy.mover.velocity?.x ?? 0,
              enemy.mover.velocity?.z ?? 0.01,
            ) + (Math.PI * 0.5));
          }
        }

        if (enemy.stunnedMs <= 0 && pos) {
          const dx = pos.x - enemy.root.position.x;
          const dy = pos.y - enemy.root.position.y;
          const dz = pos.z - enemy.root.position.z;
          if ((dx * dx) + (dy * dy) + (dz * dz) <= ((enemy.def.radius ?? 0.8) ** 2)) {
            ctx.triggerDamage?.(enemy.def.kind, {
              x: dx >= 0 ? 1 : -1,
              z: dz >= 0 ? 1 : -1,
            }, {
              invulnMs: 850,
              element: theme === 'storm' ? 'electric' : theme === 'camp' ? 'wind' : 'water',
              resist: getResistance(stats, theme === 'storm' ? 'electric' : theme === 'camp' ? 'wind' : 'water'),
            });
          }
        }
      }

      // Fireplace flicker
      for (const fp of libraryFireplaces) {
        if (fp.fire?.material?.emissiveColor) {
          const flicker = 0.44 + (Math.sin((time * 6.8) + fp.phase) * 0.10);
          fp.fire.material.emissiveColor.r = flicker;
          fp.fire.material.emissiveColor.g = flicker * 0.44;
          fp.fire.material.emissiveColor.b = flicker * 0.07;
        }
      }

      for (const pickup of pickups) {
        if (pickup.collected || !pickup._visual?.root) continue;
        pickup._visual.root.rotation.y += dt;
        pickup._visual.root.position.y = pickup.position.y + (Math.sin((time * 2.8) + pickup.position.x) * 0.08);
      }
    },
    tryHitByWeapon(attack = {}) {
      const attackPos = attack.position || BABYLON.Vector3.Zero();
      const attackRadius = Number.isFinite(attack.radius) ? attack.radius : 1.2;
      const stunMs = Number.isFinite(attack.stunMs) ? attack.stunMs : 900;
      const direction = attack.direction || new BABYLON.Vector3(1, 0, 0);
      const attackMode = attack.mode || 'projectile';

      for (const enemy of enemyStates) {
        if (enemy.stunnedMs > 0) continue;
        const dx = enemy.root.position.x - attackPos.x;
        const dy = enemy.root.position.y - attackPos.y;
        const dz = enemy.root.position.z - attackPos.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > attackRadius + (enemy.def.radius ?? 0.7)) continue;
        if (attackMode === 'arc') {
          const toEnemy = new BABYLON.Vector3(dx, 0, dz);
          if (toEnemy.lengthSquared() > 0.001) toEnemy.normalize();
          const dot = BABYLON.Vector3.Dot(new BABYLON.Vector3(direction.x, 0, direction.z).normalize(), toEnemy);
          if (dot < 0.1) continue;
        }
        enemy.stunnedMs = stunMs;
        enemy.cooldownMs = Math.max(enemy.cooldownMs, 1000);
        enemy.chaseMs = 0;
        enemy.warnMs = 0;
        return { hit: true, target: enemy.def.name };
      }
      return { hit: false };
    },
    getTopologyReport() {
      if (!layout.authoredMap) return null;
      return {
        mapId: layout.authoredMap.id,
        sectorCount: layout.authoredMap.sectors?.length ?? 0,
        connectorCount: layout.authoredMap.connectors?.length ?? 0,
        sectors: (layout.authoredMap.sectors || []).map((sector) => ({
          id: sector.id,
          label: sector.label,
          x: sector.x,
          z: sector.z,
          w: sector.w,
          d: sector.d,
          floorSurfaceType: sector.floorSurfaceType,
          wallLanguage: sector.wallLanguage,
        })),
        connectors: (layout.authoredMap.connectors || []).map((connector) => ({
          id: connector.id,
          sourceSector: connector.sourceSector,
          destinationSector: connector.destinationSector,
          type: connector.type,
          x: connector.x,
          z: connector.z,
          w: connector.w,
          d: connector.d,
          floorSurfaceType: connector.floorSurfaceType,
        })),
        topology: layout.authoredMap.topology,
        walkableReport: createAuthoredSurfaceAudit(
          layout.authoredMap,
          allPlatforms,
          [
            ...platformVisuals,
            ...optionalSurfaces.map((surface) => surface.visual),
          ],
        ),
      };
    },
    getDebugState() {
      return {
        theme,
        lastConveyorPush: Number(lastConveyorPush.toFixed(3)),
        lastWarnedHazard,
        conveyors: conveyorZones.map((zone) => ({
          name: zone.def.name,
          strength: Number(zone.currentStrength.toFixed(3)),
        })),
        pickups: pickups.map((pickup) => ({
          name: pickup.name,
          collected: pickup.collected,
        })),
        oilSlicks: oilSlicks.map((slick) => ({
          name: slick.def.name,
          slipX: slick.def.slipX ?? 1.1,
          slipZ: slick.def.slipZ ?? 0.3,
        })),
        hiddenBridges: optionalSurfaces
          .filter((surface) => !surface.folding && !surface.gearLift)
          .map((surface) => ({
            name: surface.def.name,
            visible: !!surface.visible,
          })),
        paperBridges: optionalSurfaces
          .filter((surface) => surface.folding)
          .map((surface) => ({
            name: surface.def.name,
            scaleY: Number(surface.visual.scaling.y.toFixed(3)),
          })),
        presses: areaHazards
          .filter((hazard) => hazard.kind === 'press')
          .map((hazard) => ({
            name: hazard.def.name,
            state: hazard.state,
          })),
        lightning: areaHazards
          .filter((hazard) => hazard.kind === 'lightning')
          .map((hazard) => ({
            name: hazard.def.name,
            state: hazard.state,
          })),
        inkPuddles: areaHazards
          .filter((hazard) => hazard.kind === 'ink')
          .map((hazard) => ({
            name: hazard.def.name,
            state: hazard.state,
          })),
        sweepers: sweepHazards.map((hazard) => ({
          name: hazard.def.name,
          state: hazard.runtime.state,
          bandX: Number(hazard.runtime.bandX.toFixed(3)),
        })),
        safeLight: {
          active: !!toolAura,
          radius: toolAura?.radius ?? 0,
        },
      };
    },
  };
  era5Level.reset();

  const goalDeck = [...(layout.platforms || [])].reverse().find((surface) => surface.name === 'goalDeck' || surface.name === 'lookoutDeck' || surface.name === 'familyDeck') || layout.platforms?.[layout.platforms.length - 1];

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allPlatforms,
    goal: goalVisual,
    goalRoot,
    shadowGen,
    foregroundMeshes: [],
    extents: layout.extents,
    spawn: layout.spawn,
    spawnYaw: layout.spawnYaw,
    cameraPresets: layout.cameraPresets || null,
    defaultCameraPreset: layout.defaultCameraPreset || null,
    checkpoints,
    pickups,
    coins,
    hazards: [
      ...conveyorZones.map((zone) => ({
        name: zone.def.name,
        type: layout.gusts ? 'gust' : 'conveyor',
        minX: zone.def.x - (zone.def.w * 0.5),
        maxX: zone.def.x + (zone.def.w * 0.5),
        minY: zone.def.y - (zone.def.h * 0.5),
        maxY: zone.def.y + (zone.def.h * 0.5),
        handledByLevelRuntime: true,
      })),
      ...areaHazards.map((hazard) => ({
        name: hazard.def.name,
        type: hazard.kind,
        minX: hazard.def.x - (hazard.def.w * 0.5),
        maxX: hazard.def.x + (hazard.def.w * 0.5),
        minY: hazard.def.y - (hazard.def.h * 0.5),
        maxY: hazard.def.y + (hazard.def.h * 0.5),
        handledByLevelRuntime: true,
      })),
      ...lineHazards.map((hazard) => ({
        name: hazard.def.name,
        type: 'line',
        minX: Math.min(hazard.def.x1, hazard.def.x2),
        maxX: Math.max(hazard.def.x1, hazard.def.x2),
        minY: hazard.def.y1 - 0.6,
        maxY: hazard.def.y1 + 0.6,
        handledByLevelRuntime: true,
      })),
      ...sweepHazards.map((hazard) => ({
        name: hazard.def.name,
        type: hazard.def.kind,
        minX: hazard.def.xMin,
        maxX: hazard.def.xMax,
        minY: hazard.def.y - 1.5,
        maxY: hazard.def.y + 1.5,
        handledByLevelRuntime: true,
      })),
      ...enemyStates.map((enemy) => ({
        name: enemy.def.name,
        type: 'enemy',
        minX: enemy.def.bounds.minX,
        maxX: enemy.def.bounds.maxX,
        minY: enemy.def.bounds.minY,
        maxY: enemy.def.bounds.maxY,
        handledByLevelRuntime: true,
      })),
    ],
    crumbles: [],
    level: layout,
    era5Level,
    signs: [
      ...signs,
    ],
    goalGuardMinX: layout.goal.x - 4.6,
    goalMinBottomY: goalDeck ? (goalDeck.y + (goalDeck.h * 0.5)) - 0.2 : null,
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
  };
}
