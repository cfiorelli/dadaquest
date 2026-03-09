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
import { makePlastic, makePaper } from '../materials.js';

const THEME_PALETTES = {
  factory: {
    slab: [170, 126, 74],
    rim: [82, 50, 24],
    glow: [255, 214, 96],
    line: [255, 212, 92],
    enemy: [214, 146, 80],
    accent: [240, 148, 54],
    goalOutfit: 'level1',
  },
  storm: {
    slab: [78, 110, 148],
    rim: [30, 44, 72],
    glow: [164, 210, 255],
    line: [196, 242, 255],
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
  };
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

function createStyledPlatform(scene, name, def, shadowGen, theme = 'factory') {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(`${name}_root`, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const slab = BABYLON.MeshBuilder.CreateBox(`${name}_slab`, {
    width: def.w,
    height: def.h * 0.82,
    depth: def.d,
  }, scene);
  slab.parent = root;
  slab.position.y = 0.02;
  slab.material = createGlowMaterial(scene, `${name}_slabMat`, palette.slab, {
    emissive: 0.28,
    roughness: 0.26,
  });
  slab.enableEdgesRendering();
  slab.edgesWidth = 1.6;
  slab.edgesColor = new BABYLON.Color4(
    palette.glow[0] / 255,
    palette.glow[1] / 255,
    palette.glow[2] / 255,
    0.58,
  );
  slab.receiveShadows = true;
  shadowGen.addShadowCaster(slab);
  markGameplaySurface(slab);

  const rim = BABYLON.MeshBuilder.CreateBox(`${name}_rim`, {
    width: def.w + 0.08,
    height: def.h * 0.26,
    depth: def.d + 0.08,
  }, scene);
  rim.parent = root;
  rim.position.y = -(def.h * 0.32);
  rim.material = createGlowMaterial(scene, `${name}_rimMat`, palette.rim, {
    emissive: 0.18,
    roughness: 0.54,
  });
  markGameplaySurface(rim);

  const top = BABYLON.MeshBuilder.CreatePlane(`${name}_top`, {
    width: Math.max(0.5, def.w - 0.16),
    height: Math.max(0.5, def.d - 0.16),
  }, scene);
  top.parent = root;
  top.rotation.x = Math.PI / 2;
  top.position.y = (def.h * 0.5) + 0.01;
  const topMat = new BABYLON.StandardMaterial(`${name}_topMat`, scene);
  topMat.diffuseColor = new BABYLON.Color3(
    Math.min(1, (palette.slab[0] + 40) / 255),
    Math.min(1, (palette.slab[1] + 34) / 255),
    Math.min(1, (palette.slab[2] + 28) / 255),
  );
  topMat.emissiveColor = new BABYLON.Color3(
    palette.glow[0] / 255 * 0.10,
    palette.glow[1] / 255 * 0.10,
    palette.glow[2] / 255 * 0.10,
  );
  topMat.alpha = 0.52;
  topMat.specularColor = BABYLON.Color3.Black();
  topMat.backFaceCulling = false;
  topMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  top.material = topMat;
  markGameplaySurface(top);
  markDecor(top);

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
  const plane = BABYLON.MeshBuilder.CreatePlane(`${name}_plane`, {
    width: def.width,
    height: def.height,
  }, scene);
  plane.parent = root;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = createTextTexture(scene, `${name}_tex`, def.text, {
    fg: '#fffbed',
    accent: `rgb(${palette.glow.join(',')})`,
  });
  mat.opacityTexture = mat.diffuseTexture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.specularColor = BABYLON.Color3.Black();
  mat.emissiveColor = new BABYLON.Color3(0.18, 0.12, 0.04);
  plane.material = mat;
  markDecor(root);
  return root;
}

function createRouteRibbon(scene, name, def, theme) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.width,
    height: def.depth,
  }, scene);
  plane.position.set(def.x, def.y, def.z ?? 0);
  plane.rotation.x = Math.PI / 2;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = new BABYLON.Color3(
    palette.line[0] / 255,
    palette.line[1] / 255,
    palette.line[2] / 255,
  );
  mat.emissiveColor = new BABYLON.Color3(
    palette.glow[0] / 255 * 0.16,
    palette.glow[1] / 255 * 0.16,
    palette.glow[2] / 255 * 0.16,
  );
  mat.alpha = 0.08;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecor(plane);
  return { mesh: plane, mat };
}

function createPickupNode(scene, drop, theme, shadowGen) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const root = new BABYLON.TransformNode(`pickup_${drop.name}`, scene);
  root.position.set(drop.x, drop.y, drop.z ?? 0);

  const core = BABYLON.MeshBuilder.CreateCylinder(`pickup_${drop.name}_core`, {
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

  const ring = BABYLON.MeshBuilder.CreateTorus(`pickup_${drop.name}_ring`, {
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
    fg: '#fffef2',
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

function createAreaPulse(scene, name, def, theme) {
  const palette = THEME_PALETTES[theme] || THEME_PALETTES.factory;
  const plane = BABYLON.MeshBuilder.CreatePlane(name, {
    width: def.w,
    height: def.d,
  }, scene);
  plane.position.set(def.x, def.y - (def.h * 0.5) + 0.06, def.z ?? 0);
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
  markDecor(plane);
  return { mesh: plane, mat };
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
  body.material = makePlastic(scene, `${def.name}_bodyMat`, color.r, color.g, color.b, { roughness: 0.4 });
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

  const shadowGen = new BABYLON.ShadowGenerator(1024, new BABYLON.DirectionalLight(
    `${theme}_keyLight`,
    new BABYLON.Vector3(-0.34, -1.0, 0.24),
    scene,
  ));
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.bias = 0.00035;

  const hemi = new BABYLON.HemisphericLight(`${theme}_fill`, new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new BABYLON.Color3(
    Math.min(1, (palette.slab[0] + 32) / 255),
    Math.min(1, (palette.slab[1] + 32) / 255),
    Math.min(1, (palette.slab[2] + 32) / 255),
  );
  hemi.groundColor = new BABYLON.Color3(0.02, 0.03, 0.05);

  const rim = new BABYLON.PointLight(`${theme}_rim`, new BABYLON.Vector3(layout.goal.x - 6, 18, -9), scene);
  rim.intensity = 0.48;
  rim.diffuse = new BABYLON.Color3(
    palette.glow[0] / 255,
    palette.glow[1] / 255,
    palette.glow[2] / 255,
  );

  const groundVisual = createStyledPlatform(scene, `${theme}_ground`, layout.ground, shadowGen, theme);
  setRenderingGroup(groundVisual, 2);
  const groundCollider = makeInvisibleCollider(scene, `${theme}_groundCollider`, layout.ground);
  const allPlatforms = [groundCollider];
  const platformVisuals = [groundVisual];

  for (const def of layout.platforms || []) {
    const visual = createStyledPlatform(scene, `${theme}_${def.name}`, def, shadowGen, theme);
    setRenderingGroup(visual, 2);
    platformVisuals.push(visual);
    allPlatforms.push(makeInvisibleCollider(scene, `${theme}_${def.name}_col`, def));
  }

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

  const routeRibbons = (layout.acts || []).map((act, index) => {
    const xCenter = (act.range[0] + act.range[1]) * 0.5;
    const width = Math.max(12, act.range[1] - act.range[0] - 6);
    const ribbon = createRouteRibbon(scene, `${theme}_route_${index}`, {
      x: xCenter,
      y: layout.ground.y + (layout.ground.h * 0.5) + 0.02,
      z: 0,
      width,
      depth: 5.2 + (index % 2),
    }, theme);
    return ribbon;
  });

  const signs = [];
  for (const def of layout.signage || []) {
    const sign = createSign(scene, `${theme}_${def.text.replace(/[^a-z0-9]+/gi, '_')}`, def, theme);
    setRenderingGroup(sign, 1);
    signs.push(sign);
  }

  const checkpoints = (layout.checkpoints || []).map((cp, index) => {
    const marker = createCheckpointMarker(scene, `${theme}_checkpoint_${index}`, {
      x: cp.x,
      y: cp.y - 0.06,
      z: 1.18,
      shadowGen,
    });
    markDecor(marker);
    setRenderingGroup(marker, 3);
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

  let goalVisual;
  let goalRoot;
  let familySetpiece = null;
  if (theme === 'camp') {
    const dad = createDad(scene, {
      x: layout.goal.x,
      y: layout.goal.y,
      z: 0,
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
      z: 0,
      outfit: palette.goalOutfit,
      shadowGen,
      animate: animateGoal,
    });
    goalVisual = dad.goal;
    goalRoot = dad.root;
  }
  goalRoot.position.z = 0;

  const conveyorZones = (layout.conveyors || layout.gusts || []).map((def, index) => ({
    def,
    visual: createConveyorVisual(scene, `${theme}_flow_${index}`, def, theme, layout.gusts ? 'WIND' : 'BELT'),
    time: 0,
    currentStrength: 0,
  }));

  const areaHazards = [];
  const makeAreaHazard = (defs, kind, element) => {
    for (const def of defs || []) {
      const pulse = createAreaPulse(scene, `${theme}_${def.name}_pulse`, def, theme);
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
      bobAmp: def.kind === 'bird' || def.kind === 'crane' || def.kind === 'spark' ? 0.16 : 0.05,
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
      envFx.root,
      ...platformVisuals,
      ...optionalSurfaces.map((surface) => surface.visual),
      ...oilSlicks.map((slick) => slick.visual.mesh),
      ...lampPosts.map((lamp) => lamp.visual),
      ...lightZoneVisuals.map((zone) => zone.visual.root),
      ...signs,
      ...(familySetpiece ? [familySetpiece.root] : []),
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
