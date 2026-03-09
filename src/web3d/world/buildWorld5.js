import * as BABYLON from '@babylonjs/core';
import { LEVEL5, LANE_Z5 } from './level5.js';
import { createTelegraphedHazard } from './telegraphHazard.js';
import { NoiseWanderMover } from './noiseMover.js';
import { createAquariumEnvironmentFx, markDecorNode } from './envFx.js';
import {
  createCheckpointMarker,
  createCoin,
  createOnesiePickup,
  setRenderingGroup,
} from './buildWorld.js';
import { createDad } from './characters.js';
import { makePlastic, makePaper } from '../materials.js';

const LANE_Z = LANE_Z5;
const EEL_WARN_SEC = 0.8;
const EEL_ACTIVE_SEC = 1.2;
const EEL_COOLDOWN_SEC = 1.0;
const SHARK_WARN_SEC = 1.2;
const SHARK_ACTIVE_SEC = 0.8;
const SHARK_COOLDOWN_SEC = 1.4;
const CURRENT_PUSH_DURATION_SEC = 1.2;
const JELLY_HIT_RADIUS = 0.78;
const JELLY_NEAR_MISS_RADIUS = 1.28;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLevel5SurfaceTopY(x, z = LANE_Z) {
  let best = LEVEL5.ground.y + (LEVEL5.ground.h * 0.5);
  for (const surface of LEVEL5.platforms || []) {
    const contains = x >= (surface.x - (surface.w * 0.5))
      && x <= (surface.x + (surface.w * 0.5))
      && z >= ((surface.z ?? LANE_Z) - (surface.d * 0.5))
      && z <= ((surface.z ?? LANE_Z) + (surface.d * 0.5));
    if (!contains) continue;
    best = Math.max(best, surface.y + (surface.h * 0.5));
  }
  return best;
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

function makeInvisibleCollider(scene, name, def) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  mesh.position.set(def.x, def.y, def.z ?? LANE_Z);
  mesh.visibility = 0;
  mesh.isPickable = false;
  return mesh;
}

function makeGlowMaterial(scene, name, rgb, {
  alpha = 1,
  emissive = 0.18,
  roughness = 0.44,
} = {}) {
  const material = makePlastic(scene, name, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness });
  material.alpha = alpha;
  material.emissiveColor = new BABYLON.Color3(
    (rgb[0] / 255) * emissive,
    (rgb[1] / 255) * emissive,
    (rgb[2] / 255) * emissive,
  );
  material.transparencyMode = alpha < 1 ? BABYLON.Material.MATERIAL_ALPHABLEND : material.transparencyMode;
  return material;
}

function createAquariumPlatform(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(`L5_${name}`, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const slab = BABYLON.MeshBuilder.CreateBox(`${name}_slab`, {
    width: def.w,
    height: def.h * 0.82,
    depth: def.d,
  }, scene);
  slab.parent = root;
  slab.position.y = 0.02;
  slab.material = makeGlowMaterial(scene, `${name}_slabMat`, [64, 176, 204], {
    emissive: 0.34,
    roughness: 0.22,
  });
  markGameplaySurface(slab);
  slab.enableEdgesRendering();
  slab.edgesWidth = 1.8;
  slab.edgesColor = new BABYLON.Color4(0.84, 0.98, 1.0, 0.68);
  slab.receiveShadows = true;
  shadowGen.addShadowCaster(slab);

  const rim = BABYLON.MeshBuilder.CreateBox(`${name}_rim`, {
    width: def.w + 0.10,
    height: def.h * 0.26,
    depth: def.d + 0.10,
  }, scene);
  rim.parent = root;
  rim.position.y = -(def.h * 0.32);
  rim.material = makeGlowMaterial(scene, `${name}_rimMat`, [14, 56, 84], {
    emissive: 0.16,
    roughness: 0.48,
  });
  markGameplaySurface(rim);

  const topGlass = BABYLON.MeshBuilder.CreatePlane(`${name}_glass`, {
    width: Math.max(0.5, def.w - 0.18),
    height: Math.max(0.5, def.d - 0.18),
  }, scene);
  topGlass.parent = root;
  topGlass.rotation.x = Math.PI / 2;
  topGlass.position.y = (def.h * 0.5) + 0.012;
  const glassMat = new BABYLON.StandardMaterial(`${name}_glassMat`, scene);
  glassMat.diffuseColor = new BABYLON.Color3(0.34, 0.82, 0.90);
  glassMat.emissiveColor = new BABYLON.Color3(0.14, 0.34, 0.42);
  glassMat.alpha = 0.56;
  glassMat.specularColor = new BABYLON.Color3(0.72, 0.94, 1.0);
  glassMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  glassMat.backFaceCulling = false;
  glassMat.needDepthPrePass = true;
  topGlass.material = glassMat;
  markGameplaySurface(topGlass);
  markDecor(topGlass);

  const faceGlow = BABYLON.MeshBuilder.CreatePlane(`${name}_faceGlow`, {
    width: Math.max(0.54, def.w - 0.14),
    height: Math.max(0.18, def.h * 0.44),
  }, scene);
  faceGlow.parent = root;
  faceGlow.position.set(0, def.h * 0.08, (def.d * 0.5) + 0.06);
  const faceGlowMat = new BABYLON.StandardMaterial(`${name}_faceGlowMat`, scene);
  faceGlowMat.diffuseColor = new BABYLON.Color3(0.68, 0.98, 1.0);
  faceGlowMat.emissiveColor = new BABYLON.Color3(0.24, 0.52, 0.58);
  faceGlowMat.alpha = 0.36;
  faceGlowMat.specularColor = BABYLON.Color3.Black();
  faceGlowMat.disableLighting = true;
  faceGlowMat.backFaceCulling = false;
  faceGlowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  faceGlow.material = faceGlowMat;
  markGameplaySurface(faceGlow);
  markDecor(faceGlow);

  const topLip = BABYLON.MeshBuilder.CreatePlane(`${name}_topLip`, {
    width: Math.max(0.52, def.w - 0.18),
    height: 0.11,
  }, scene);
  topLip.parent = root;
  topLip.position.set(0, (def.h * 0.5) - 0.02, (def.d * 0.5) + 0.065);
  const topLipMat = new BABYLON.StandardMaterial(`${name}_topLipMat`, scene);
  topLipMat.diffuseColor = new BABYLON.Color3(0.84, 1.0, 1.0);
  topLipMat.emissiveColor = new BABYLON.Color3(0.32, 0.66, 0.72);
  topLipMat.alpha = 0.82;
  topLipMat.specularColor = BABYLON.Color3.Black();
  topLipMat.disableLighting = true;
  topLipMat.backFaceCulling = false;
  topLipMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  topLip.material = topLipMat;
  markGameplaySurface(topLip);
  markDecor(topLip);

  const underside = BABYLON.MeshBuilder.CreatePlane(`${name}_undershadow`, {
    width: Math.max(0.5, def.w * 0.86),
    height: Math.max(0.5, def.d * 0.72),
  }, scene);
  underside.parent = root;
  underside.rotation.x = Math.PI / 2;
  underside.position.y = -(def.h * 0.5) - 0.018;
  const underMat = new BABYLON.StandardMaterial(`${name}_undershadowMat`, scene);
  underMat.diffuseColor = new BABYLON.Color3(0.02, 0.08, 0.10);
  underMat.emissiveColor = new BABYLON.Color3(0.01, 0.04, 0.05);
  underMat.alpha = 0.22;
  underMat.disableLighting = true;
  underMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  underside.material = underMat;
  markGameplaySurface(underside);
  markDecor(underside);

  const beaconOffsets = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  for (let i = 0; i < beaconOffsets.length; i++) {
    const beacon = BABYLON.MeshBuilder.CreateSphere(`${name}_beacon_${i}`, {
      diameter: 0.10,
      segments: 6,
    }, scene);
    beacon.parent = root;
    beacon.position.set(
      beaconOffsets[i][0] * Math.max(0.2, (def.w * 0.5) - 0.16),
      (def.h * 0.5) - 0.015,
      beaconOffsets[i][1] * Math.max(0.14, (def.d * 0.5) - 0.12),
    );
    const beaconMat = new BABYLON.StandardMaterial(`${name}_beaconMat_${i}`, scene);
    beaconMat.diffuseColor = new BABYLON.Color3(0.84, 0.98, 1.0);
    beaconMat.emissiveColor = new BABYLON.Color3(0.26, 0.54, 0.62);
    beaconMat.alpha = 0.88;
    beacon.material = beaconMat;
    markGameplaySurface(beacon);
    markDecor(beacon);
  }

  return root;
}

function createRouteTexture(scene, name) {
  const texture = new BABYLON.DynamicTexture(name, { width: 768, height: 256 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 768, 256);

  const glow = ctx.createLinearGradient(0, 0, 768, 0);
  glow.addColorStop(0, 'rgba(32, 168, 198, 0.0)');
  glow.addColorStop(0.18, 'rgba(72, 238, 255, 0.65)');
  glow.addColorStop(0.82, 'rgba(72, 238, 255, 0.65)');
  glow.addColorStop(1, 'rgba(32, 168, 198, 0.0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 112, 768, 32);

  ctx.strokeStyle = 'rgba(188, 255, 250, 0.88)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const offsetX = 126 + (i * 176);
    ctx.beginPath();
    ctx.moveTo(offsetX, 62);
    ctx.lineTo(offsetX + 66, 128);
    ctx.lineTo(offsetX, 194);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(46, 104, 132, 0.64)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 3; i++) {
    const offsetX = 126 + (i * 176);
    ctx.beginPath();
    ctx.moveTo(offsetX - 16, 62);
    ctx.lineTo(offsetX + 52, 128);
    ctx.lineTo(offsetX - 16, 194);
    ctx.stroke();
  }

  texture.update();
  texture.hasAlpha = true;
  return texture;
}

function createSignTexture(scene, name, text) {
  const texture = new BABYLON.DynamicTexture(name, { width: 768, height: 256 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 768, 256);

  const bg = ctx.createLinearGradient(0, 0, 768, 256);
  bg.addColorStop(0, 'rgba(6, 20, 34, 0.92)');
  bg.addColorStop(1, 'rgba(10, 42, 60, 0.92)');
  ctx.fillStyle = bg;
  ctx.fillRect(18, 18, 732, 220);

  ctx.strokeStyle = 'rgba(118, 255, 246, 0.92)';
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, 724, 212);

  ctx.strokeStyle = 'rgba(18, 80, 98, 0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, 692, 180);

  ctx.fillStyle = 'rgba(206, 255, 248, 0.96)';
  ctx.font = '700 74px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 132);

  texture.update();
  texture.hasAlpha = true;
  return texture;
}

function createFloorRouteMarker(scene, name, def, groundTopY) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, groundTopY + 0.08, def.z ?? LANE_Z);

  const glow = BABYLON.MeshBuilder.CreatePlane(`${name}_glow`, {
    width: 8.4 * (def.scale ?? 1),
    height: 2.5 * (def.scale ?? 1),
  }, scene);
  glow.parent = root;
  glow.rotation.x = Math.PI / 2;
  const glowMat = new BABYLON.StandardMaterial(`${name}_glowMat`, scene);
  glowMat.diffuseColor = new BABYLON.Color3(0.12, 0.44, 0.52);
  glowMat.emissiveColor = new BABYLON.Color3(0.08, 0.24, 0.30);
  glowMat.alpha = 0.22;
  glowMat.specularColor = BABYLON.Color3.Black();
  glowMat.disableLighting = true;
  glowMat.backFaceCulling = false;
  glowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  glow.material = glowMat;
  markDecor(glow);

  const marker = BABYLON.MeshBuilder.CreatePlane(`${name}_marker`, {
    width: 6.8 * (def.scale ?? 1),
    height: 2.0 * (def.scale ?? 1),
  }, scene);
  marker.parent = root;
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.01;
  const markerMat = new BABYLON.StandardMaterial(`${name}_markerMat`, scene);
  const markerTex = createRouteTexture(scene, `${name}_tex`);
  markerMat.diffuseTexture = markerTex;
  markerMat.emissiveTexture = markerTex;
  markerMat.opacityTexture = markerTex;
  markerMat.specularColor = BABYLON.Color3.Black();
  markerMat.emissiveColor = new BABYLON.Color3(0.76, 1.0, 0.98);
  markerMat.disableLighting = true;
  markerMat.backFaceCulling = false;
  markerMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  marker.material = markerMat;
  markDecor(marker);

  return {
    root,
    glowMat,
    markerMat,
  };
}

function createGateArch(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const arch = BABYLON.MeshBuilder.CreateTorus(`${name}_arch`, {
    diameter: def.width,
    thickness: 0.24,
    tessellation: 56,
  }, scene);
  arch.parent = root;
  arch.rotation.y = Math.PI / 2;
  arch.scaling.y = def.height / def.width;
  arch.material = makeGlowMaterial(scene, `${name}_archMat`, [72, 232, 246], {
    emissive: 0.42,
    alpha: 0.34,
    roughness: 0.14,
  });
  markDecor(arch);

  const postHeight = Math.max(2.4, def.height * 0.68);
  for (const dir of [-1, 1]) {
    const post = BABYLON.MeshBuilder.CreateCylinder(`${name}_post_${dir}`, {
      diameter: 0.28,
      height: postHeight,
      tessellation: 16,
    }, scene);
    post.parent = root;
    post.position.set(dir * ((def.width * 0.5) - 0.18), -(def.height * 0.18), 0);
    post.material = makeGlowMaterial(scene, `${name}_postMat_${dir}`, [24, 72, 92], {
      emissive: 0.10,
      roughness: 0.56,
    });
    markDecor(post);
  }

  return arch;
}

function createAquariumSign(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const board = BABYLON.MeshBuilder.CreatePlane(`${name}_board`, {
    width: def.width,
    height: def.height,
  }, scene);
  board.parent = root;
  const boardMat = new BABYLON.StandardMaterial(`${name}_boardMat`, scene);
  const boardTex = createSignTexture(scene, `${name}_tex`, def.text);
  boardMat.diffuseTexture = boardTex;
  boardMat.emissiveTexture = boardTex;
  boardMat.opacityTexture = boardTex;
  boardMat.specularColor = BABYLON.Color3.Black();
  boardMat.emissiveColor = new BABYLON.Color3(0.68, 0.96, 0.98);
  boardMat.disableLighting = true;
  boardMat.backFaceCulling = false;
  boardMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  board.material = boardMat;
  markDecor(board);

  const frame = BABYLON.MeshBuilder.CreateBox(`${name}_frame`, {
    width: def.width + 0.28,
    height: def.height + 0.22,
    depth: 0.18,
  }, scene);
  frame.parent = root;
  frame.position.z = 0.05;
  frame.material = makeGlowMaterial(scene, `${name}_frameMat`, [16, 56, 78], {
    emissive: 0.10,
    roughness: 0.62,
  });
  markDecor(frame);

  return {
    root,
    boardMat,
  };
}

function createCoralPillar(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const trunk = BABYLON.MeshBuilder.CreateCylinder(`${name}_trunk`, {
    diameterTop: def.radius * 1.2,
    diameterBottom: def.radius * 1.55,
    height: def.height,
    tessellation: 14,
  }, scene);
  trunk.parent = root;
  trunk.position.y = def.height * 0.5;
  trunk.material = makeGlowMaterial(scene, `${name}_trunkMat`, [24, 84, 94], {
    emissive: 0.10,
    roughness: 0.58,
  });
  markDecor(trunk);

  for (let i = 0; i < 3; i++) {
    const bulb = BABYLON.MeshBuilder.CreateSphere(`${name}_bulb_${i}`, {
      diameter: def.radius * (1.0 + (i * 0.18)),
      segments: 10,
    }, scene);
    bulb.parent = root;
    bulb.position.set(
      ((i % 2) === 0 ? -1 : 1) * def.radius * 0.65,
      (def.height * 0.35) + (i * 0.72),
      ((i - 1) * 0.34),
    );
    bulb.material = makeGlowMaterial(scene, `${name}_bulbMat_${i}`, [82, 230, 204], {
      emissive: 0.22,
      alpha: 0.78,
      roughness: 0.28,
    });
    markDecor(bulb);
  }

  return root;
}

function createGlassTube(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const tube = BABYLON.MeshBuilder.CreateCylinder(`${name}_tube`, {
    diameter: def.diameter,
    height: def.length,
    tessellation: 36,
  }, scene);
  tube.parent = root;
  tube.rotation.z = Math.PI / 2;
  const tubeMat = new BABYLON.StandardMaterial(`${name}_tubeMat`, scene);
  tubeMat.diffuseColor = new BABYLON.Color3(0.10, 0.36, 0.46);
  tubeMat.emissiveColor = new BABYLON.Color3(0.04, 0.14, 0.18);
  tubeMat.alpha = 0.18;
  tubeMat.specularColor = new BABYLON.Color3(0.48, 0.78, 0.86);
  tubeMat.backFaceCulling = false;
  tubeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  tube.material = tubeMat;
  markDecor(tube);

  for (let i = -2; i <= 2; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`${name}_ring_${i}`, {
      diameter: def.diameter + 0.16,
      thickness: 0.12,
      tessellation: 24,
    }, scene);
    ring.parent = root;
    ring.rotation.y = Math.PI / 2;
    ring.position.x = i * (def.length * 0.18);
    ring.material = makeGlowMaterial(scene, `${name}_ringMat_${i}`, [68, 210, 228], {
      emissive: 0.24,
      alpha: 0.32,
      roughness: 0.26,
    });
    markDecor(ring);
  }

  return tube;
}

function createKelpCurtain(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const frond = BABYLON.MeshBuilder.CreatePlane(`${name}_frond_${i}`, {
      width: (def.width / 7) + 0.38,
      height: def.height,
    }, scene);
    frond.parent = root;
    frond.position.set((-def.width * 0.46) + (i * (def.width / 6)), 0, ((i % 2) - 0.5) * 0.28);
    const mat = new BABYLON.StandardMaterial(`${name}_frondMat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.05, 0.34 + ((i % 3) * 0.04), 0.18);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.12, 0.06);
    mat.alpha = 0.44;
    mat.backFaceCulling = false;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    frond.material = mat;
    markDecor(frond);
    fronds.push(frond);
  }

  return { root, fronds };
}

function createBackdrop(scene) {
  const root = new BABYLON.TransformNode('L5_backdrop', scene);
  const groundTopY = LEVEL5.ground.y + (LEVEL5.ground.h * 0.5);

  const shell = BABYLON.MeshBuilder.CreatePlane('L5_shell', {
    width: 190,
    height: 42,
  }, scene);
  shell.parent = root;
  shell.position.set(54, 12, 18);
  const shellMat = new BABYLON.StandardMaterial('L5_shellMat', scene);
  shellMat.diffuseColor = new BABYLON.Color3(0.03, 0.12, 0.18);
  shellMat.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);
  shellMat.alpha = 0.92;
  shellMat.disableLighting = true;
  shell.material = shellMat;
  markDecor(shell);

  const laneStrips = [];
  const span = LEVEL5.extents.maxX - LEVEL5.extents.minX;
  const stripSegments = Math.ceil(span / 20);
  for (let i = 0; i < stripSegments; i++) {
    const x = LEVEL5.extents.minX + 10 + (i * 20);
    for (const z of [-3.4, 0, 3.4]) {
      const strip = BABYLON.MeshBuilder.CreatePlane(`L5_laneStrip_${i}_${z}`, {
        width: 16.8,
        height: z === 0 ? 0.28 : 0.16,
      }, scene);
      strip.parent = root;
      strip.rotation.x = Math.PI / 2;
      strip.position.set(x, groundTopY + 0.03, z);
      const stripMat = new BABYLON.StandardMaterial(`L5_laneStripMat_${i}_${z}`, scene);
      stripMat.diffuseColor = new BABYLON.Color3(0.22, 0.72, 0.82);
      stripMat.emissiveColor = new BABYLON.Color3(0.10, 0.32, 0.38);
      stripMat.alpha = z === 0 ? 0.52 : 0.36;
      stripMat.disableLighting = true;
      stripMat.specularColor = BABYLON.Color3.Black();
      stripMat.backFaceCulling = false;
      stripMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
      strip.material = stripMat;
      laneStrips.push(stripMat);
      markDecor(strip);
    }
  }

  const routeMarkers = LEVEL5.routeMarkers.map((def, index) => createFloorRouteMarker(
    scene,
    `L5_routeMarker_${index}`,
    def,
    getLevel5SurfaceTopY(def.x, def.z ?? LANE_Z),
  ));
  routeMarkers.forEach((entry) => entry.root.parent = root);

  const arches = LEVEL5.gateArches.map((def, index) => createGateArch(scene, `L5_gateArch_${index}`, def));
  arches.forEach((arch) => arch.parent = root);

  const signBoards = LEVEL5.signage.map((def, index) => createAquariumSign(scene, `L5_sign_${index}`, def));
  signBoards.forEach((sign) => sign.root.parent = root);

  const coralPillars = LEVEL5.coralPillars.map((def, index) => createCoralPillar(scene, `L5_coral_${index}`, def));
  coralPillars.forEach((pillar) => pillar.parent = root);

  const glassTubes = LEVEL5.glassTubes.map((def, index) => createGlassTube(scene, `L5_glassTube_${index}`, def));
  glassTubes.forEach((tube) => tube.parent = root);

  const kelpCurtains = LEVEL5.kelpCurtains.map((def, index) => createKelpCurtain(scene, `L5_kelpCurtain_${index}`, def));
  kelpCurtains.forEach((curtain) => curtain.root.parent = root);

  return {
    root,
    arches,
    routeMarkers,
    signBoards,
    kelpCurtains,
    update(dt, time) {
      for (let i = 0; i < laneStrips.length; i++) {
        laneStrips[i].alpha = 0.34 + (Math.sin((time * 0.85) + i) * 0.06) + (i % 3 === 1 ? 0.08 : 0);
      }
      for (let i = 0; i < arches.length; i++) {
        arches[i].rotation.z += dt * (0.04 + (i * 0.002));
      }
      for (let i = 0; i < routeMarkers.length; i++) {
        routeMarkers[i].markerMat.alpha = 0.82 + (Math.sin((time * 1.4) + i) * 0.10);
        routeMarkers[i].glowMat.alpha = 0.18 + (Math.sin((time * 0.9) + i) * 0.05);
      }
      for (let i = 0; i < signBoards.length; i++) {
        signBoards[i].boardMat.alpha = 0.96;
      }
      for (let i = 0; i < kelpCurtains.length; i++) {
        const curtain = kelpCurtains[i];
        for (let j = 0; j < curtain.fronds.length; j++) {
          curtain.fronds[j].rotation.z = Math.sin((time * 0.7) + i + (j * 0.45)) * 0.14;
        }
      }
    },
    reset() {
      for (const arch of arches) {
        arch.rotation.z = 0;
      }
      for (let i = 0; i < routeMarkers.length; i++) {
        routeMarkers[i].markerMat.alpha = 0.82;
        routeMarkers[i].glowMat.alpha = 0.18;
      }
      for (const curtain of kelpCurtains) {
        for (const frond of curtain.fronds) {
          frond.rotation.z = 0;
        }
      }
    },
  };
}

function createCurrentJet(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);
  const arrows = [];
  const bubbles = [];

  const zone = BABYLON.MeshBuilder.CreatePlane(`${def.name}_zone`, {
    width: def.w,
    height: def.h,
  }, scene);
  zone.parent = root;
  zone.position.z = 0.9;
  const zoneMat = new BABYLON.StandardMaterial(`${def.name}_zoneMat`, scene);
  zoneMat.diffuseColor = new BABYLON.Color3(0.12, 0.62, 0.74);
  zoneMat.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.20);
  zoneMat.alpha = 0.12;
  zoneMat.backFaceCulling = false;
  zoneMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  zone.material = zoneMat;
  markDecor(zone);

  for (let i = 0; i < 4; i++) {
    const arrow = BABYLON.MeshBuilder.CreatePlane(`${def.name}_arrow_${i}`, {
      width: 0.8,
      height: 0.28,
    }, scene);
    arrow.parent = root;
    arrow.position.set((-def.w * 0.36) + (i * 1.15), (-def.h * 0.2) + ((i % 2) * 0.72), 1.0);
    const arrowMat = new BABYLON.StandardMaterial(`${def.name}_arrowMat_${i}`, scene);
    arrowMat.diffuseColor = new BABYLON.Color3(0.44, 0.96, 1.0);
    arrowMat.emissiveColor = new BABYLON.Color3(0.20, 0.56, 0.60);
    arrowMat.alpha = 0.72;
    arrowMat.backFaceCulling = false;
    arrow.material = arrowMat;
    if (def.pushX < 0) {
      arrow.rotation.z = Math.PI;
    }
    arrows.push(arrow);
    markDecor(arrow);
  }

  for (let i = 0; i < 8; i++) {
    const bubble = BABYLON.MeshBuilder.CreateSphere(`${def.name}_bubble_${i}`, {
      diameter: 0.14 + ((i % 3) * 0.04),
      segments: 8,
    }, scene);
    bubble.parent = root;
    bubble.position.set((-def.w * 0.42) + ((i % 4) * 1.25), (-def.h * 0.38) + ((i % 2) * 0.95), 1.12);
    const bubbleMat = new BABYLON.StandardMaterial(`${def.name}_bubbleMat_${i}`, scene);
    bubbleMat.diffuseColor = new BABYLON.Color3(0.70, 0.94, 1.0);
    bubbleMat.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.22);
    bubbleMat.alpha = 0.34;
    bubbleMat.specularColor = new BABYLON.Color3(0.72, 0.92, 1.0);
    bubbleMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    bubble.material = bubbleMat;
    bubbles.push(bubble);
    markDecor(bubble);
  }

  return {
    ...def,
    root,
    arrows,
    bubbles,
    playerInside: false,
    time: 0,
    update(dt) {
      this.time += dt;
      for (let i = 0; i < this.arrows.length; i++) {
        const arrow = this.arrows[i];
        arrow.position.x += (this.pushX > 0 ? 1 : -1) * dt * 0.9;
        const minX = -this.w * 0.45;
        const maxX = this.w * 0.45;
        if (arrow.position.x > maxX) arrow.position.x = minX;
        if (arrow.position.x < minX) arrow.position.x = maxX;
      }
      for (let i = 0; i < this.bubbles.length; i++) {
        const bubble = this.bubbles[i];
        bubble.position.y += dt * (0.32 + (i * 0.01));
        bubble.position.x += (this.pushX > 0 ? 1 : -1) * dt * (0.20 + ((i % 3) * 0.04));
        if (bubble.position.y > (this.h * 0.45)) {
          bubble.position.y = -this.h * 0.44;
        }
        if (bubble.position.x > (this.w * 0.5)) bubble.position.x = -this.w * 0.45;
        if (bubble.position.x < (-this.w * 0.5)) bubble.position.x = this.w * 0.45;
      }
    },
    contains(pos) {
      return pos.x >= (this.x - this.w * 0.5)
        && pos.x <= (this.x + this.w * 0.5)
        && pos.y >= (this.y - this.h * 0.5)
        && pos.y <= (this.y + this.h * 0.5)
        && pos.z >= ((this.z ?? LANE_Z) - (this.d * 0.5))
        && pos.z <= ((this.z ?? LANE_Z) + (this.d * 0.5));
    },
  };
}

function createDeepWaterPocket(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const volume = BABYLON.MeshBuilder.CreateBox(`${def.name}_volume`, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  volume.parent = root;
  const volumeMat = new BABYLON.StandardMaterial(`${def.name}_volumeMat`, scene);
  volumeMat.diffuseColor = new BABYLON.Color3(0.08, 0.34, 0.52);
  volumeMat.emissiveColor = new BABYLON.Color3(0.04, 0.18, 0.28);
  volumeMat.alpha = 0.14;
  volumeMat.backFaceCulling = false;
  volumeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  volume.material = volumeMat;
  markDecor(volume);

  const rim = BABYLON.MeshBuilder.CreateBox(`${def.name}_rim`, {
    width: def.w + 0.08,
    height: 0.08,
    depth: def.d + 0.08,
  }, scene);
  rim.parent = root;
  rim.position.y = (def.h * 0.5) - 0.03;
  const rimMat = new BABYLON.StandardMaterial(`${def.name}_rimMat`, scene);
  rimMat.diffuseColor = new BABYLON.Color3(0.62, 0.96, 1.0);
  rimMat.emissiveColor = new BABYLON.Color3(0.18, 0.34, 0.42);
  rimMat.alpha = 0.52;
  rimMat.backFaceCulling = false;
  rimMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  rim.material = rimMat;
  markDecor(rim);

  return {
    ...def,
    root,
    volume,
    contains(pos) {
      return pos.x >= (this.x - this.w * 0.5)
        && pos.x <= (this.x + this.w * 0.5)
        && pos.y >= (this.y - this.h * 0.5)
        && pos.y <= (this.y + this.h * 0.5)
        && pos.z >= ((this.z ?? LANE_Z) - (this.d * 0.5))
        && pos.z <= ((this.z ?? LANE_Z) + (this.d * 0.5));
    },
    update(dt, time) {
      rimMat.alpha = 0.40 + (Math.sin((time * 1.6) + this.x * 0.04) * 0.12);
      volumeMat.alpha = 0.10 + (Math.sin((time * 0.9) + this.y) * 0.04);
      volume.position.y = Math.sin((time * 0.7) + this.x * 0.03) * 0.06;
    },
  };
}

function createAirBubblePickup(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);
  const globes = [];
  for (let i = 0; i < 3; i++) {
    const globe = BABYLON.MeshBuilder.CreateSphere(`${def.name}_globe_${i}`, {
      diameter: 0.34 - (i * 0.06),
      segments: 8,
    }, scene);
    globe.parent = root;
    globe.position.set((i - 1) * 0.18, i * 0.16, ((i % 2) - 0.5) * 0.16);
    const mat = new BABYLON.StandardMaterial(`${def.name}_mat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.72, 0.96, 1.0);
    mat.emissiveColor = new BABYLON.Color3(0.12, 0.26, 0.32);
    mat.alpha = 0.48;
    mat.specularColor = new BABYLON.Color3(0.84, 1.0, 1.0);
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    globe.material = mat;
    globes.push(globe);
    markDecor(globe);
  }

  return {
    ...def,
    root,
    globes,
    collected: false,
    update(dt, time) {
      if (this.collected) return;
      root.position.y = this.y + (Math.sin((time * 1.8) + this.x * 0.08) * 0.16);
      root.rotation.y += dt * 0.8;
    },
    contains(pos) {
      const dx = pos.x - this.x;
      const dy = pos.y - root.position.y;
      const dz = pos.z - (this.z ?? LANE_Z);
      return ((dx ** 2) + (dy ** 2) + (dz ** 2)) <= ((this.radius ?? 0.8) ** 2);
    },
    collect() {
      this.collected = true;
      root.setEnabled(false);
    },
    reset() {
      this.collected = false;
      root.position.set(this.x, this.y, this.z ?? LANE_Z);
      root.rotation.set(0, 0, 0);
      root.setEnabled(true);
    },
  };
}

function createEelRail(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  const dx = def.x2 - def.x1;
  const dy = def.y2 - def.y1;
  const length = Math.sqrt((dx ** 2) + (dy ** 2));
  const angle = Math.atan2(dy, dx);
  root.position.set((def.x1 + def.x2) * 0.5, (def.y1 + def.y2) * 0.5, def.z ?? LANE_Z);
  root.rotation.z = angle;

  const postL = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_postL`, {
    diameter: 0.24,
    height: 1.5,
    tessellation: 16,
  }, scene);
  postL.parent = root;
  postL.position.set(-length * 0.5, 0, 0);
  postL.material = makeGlowMaterial(scene, `${def.name}_postLMat`, [18, 56, 78], {
    emissive: 0.08,
    roughness: 0.6,
  });
  markDecor(postL);

  const postR = postL.clone(`${def.name}_postR`);
  postR.parent = root;
  postR.position.x = length * 0.5;
  markDecor(postR);

  const beam = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_beam`, {
    diameter: 0.14,
    height: length,
    tessellation: 20,
  }, scene);
  beam.parent = root;
  beam.rotation.z = Math.PI * 0.5;
  beam.material = makeGlowMaterial(scene, `${def.name}_beamMat`, [88, 255, 242], {
    emissive: 0.42,
    alpha: 0.42,
    roughness: 0.18,
  });
  markDecor(beam);

  const halo = BABYLON.MeshBuilder.CreatePlane(`${def.name}_halo`, {
    width: length + 0.35,
    height: 0.42,
  }, scene);
  halo.parent = root;
  const haloMat = new BABYLON.StandardMaterial(`${def.name}_haloMat`, scene);
  haloMat.diffuseColor = new BABYLON.Color3(0.24, 1.0, 0.92);
  haloMat.emissiveColor = new BABYLON.Color3(0.14, 0.44, 0.38);
  haloMat.alpha = 0.18;
  haloMat.backFaceCulling = false;
  haloMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  halo.material = haloMat;
  halo.position.z = 0.4;
  markDecor(halo);

  return {
    ...def,
    root,
    beam,
    halo,
    length,
    lineDistanceToPoint(pos) {
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const localX = ((pos.x - root.position.x) * cos) - ((pos.y - root.position.y) * sin);
      const localY = ((pos.x - root.position.x) * sin) + ((pos.y - root.position.y) * cos);
      const clampedX = clamp(localX, -length * 0.5, length * 0.5);
      return Math.hypot(localX - clampedX, localY);
    },
  };
}

function createVent(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const grate = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_grate`, {
    diameter: def.w,
    height: 0.18,
    tessellation: 18,
  }, scene);
  grate.parent = root;
  grate.material = makeGlowMaterial(scene, `${def.name}_grateMat`, [36, 84, 92], {
    emissive: 0.08,
    roughness: 0.58,
  });
  markDecor(grate);

  const plume = BABYLON.MeshBuilder.CreatePlane(`${def.name}_plume`, {
    width: def.w * 1.6,
    height: def.h,
  }, scene);
  plume.parent = root;
  plume.position.y = def.h * 0.5;
  const plumeMat = new BABYLON.StandardMaterial(`${def.name}_plumeMat`, scene);
  plumeMat.diffuseColor = new BABYLON.Color3(0.56, 0.98, 1.0);
  plumeMat.emissiveColor = new BABYLON.Color3(0.14, 0.30, 0.34);
  plumeMat.alpha = 0.12;
  plumeMat.backFaceCulling = false;
  plumeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plume.material = plumeMat;
  markDecor(plume);

  return { ...def, root, grate, plume };
}

function createJellyfish(scene, def, shadowGen) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const bell = BABYLON.MeshBuilder.CreateSphere(`${def.name}_bell`, {
    diameter: 0.82,
    segments: 14,
  }, scene);
  bell.parent = root;
  bell.scaling.y = 0.75;
  bell.material = makeGlowMaterial(scene, `${def.name}_bellMat`, [118, 255, 248], {
    emissive: 0.30,
    alpha: 0.42,
    roughness: 0.16,
  });
  shadowGen.addShadowCaster(bell);
  markDecor(bell);

  const core = BABYLON.MeshBuilder.CreateSphere(`${def.name}_core`, {
    diameter: 0.28,
    segments: 8,
  }, scene);
  core.parent = root;
  core.position.y = 0.05;
  core.material = makeGlowMaterial(scene, `${def.name}_coreMat`, [255, 156, 242], {
    emissive: 0.42,
    roughness: 0.12,
  });
  markDecor(core);

  const tentacles = [];
  for (let i = 0; i < 5; i++) {
    const path = [
      new BABYLON.Vector3(-0.18 + (i * 0.09), -0.2, 0),
      new BABYLON.Vector3(-0.16 + (i * 0.08), -0.62, -0.02 + ((i % 2) * 0.02)),
      new BABYLON.Vector3(-0.14 + (i * 0.07), -1.05, 0.04 - ((i % 3) * 0.03)),
    ];
    const tentacle = BABYLON.MeshBuilder.CreateTube(`${def.name}_tentacle_${i}`, {
      path,
      radius: 0.018,
      tessellation: 8,
    }, scene);
    tentacle.parent = root;
    tentacle.material = makeGlowMaterial(scene, `${def.name}_tentacleMat_${i}`, [142, 255, 246], {
      emissive: 0.18,
      alpha: 0.36,
      roughness: 0.24,
    });
    tentacles.push(tentacle);
    markDecor(tentacle);
  }

  const mover = new NoiseWanderMover({
    root,
    bounds: def.bounds,
    speed: def.speed,
    turnSpeed: def.turnSpeed,
    retargetEvery: [1.3, 2.7],
    bobAmp: 0.18,
    bobFreq: 1.6,
    pauseChance: 0.22,
    pauseRange: [0.24, 0.74],
  });

  return {
    ...def,
    root,
    bell,
    tentacles,
    mover,
    nearMissCooldownMs: 0,
    stunnedMs: 0,
    baseY: def.y,
    stun(durationMs = 1500) {
      this.stunnedMs = Math.max(this.stunnedMs, durationMs);
      bell.material.alpha = 0.16;
      core.material.emissiveColor = new BABYLON.Color3(0.16, 0.18, 0.24);
      return true;
    },
    isStunned() {
      return this.stunnedMs > 0;
    },
    update(dt) {
      if (this.stunnedMs > 0) {
        this.stunnedMs = Math.max(0, this.stunnedMs - (dt * 1000));
        bell.rotation.z = Math.sin((performance.now() * 0.004) + mover.time) * 0.05;
        bell.material.alpha = 0.16 + (Math.sin((performance.now() * 0.01) + mover.time) * 0.04);
        core.material.emissiveColor = new BABYLON.Color3(0.16, 0.18, 0.24);
      } else {
        mover.update(dt);
        bell.material.alpha = 0.42;
        core.material.emissiveColor = new BABYLON.Color3(0.42, 0.26, 0.40);
      }
      for (let i = 0; i < tentacles.length; i++) {
        tentacles[i].rotation.z = Math.sin((performance.now() * 0.0024) + i + mover.time) * 0.10;
      }
      if (this.nearMissCooldownMs > 0) {
        this.nearMissCooldownMs = Math.max(0, this.nearMissCooldownMs - (dt * 1000));
      }
    },
    reset() {
      mover.reset();
      this.nearMissCooldownMs = 0;
      this.stunnedMs = 0;
      bell.material.alpha = 0.42;
      core.material.emissiveColor = new BABYLON.Color3(0.42, 0.26, 0.40);
    },
  };
}

function createSharkSweep(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.xMin, def.y, def.z ?? LANE_Z);

  const shadow = BABYLON.MeshBuilder.CreatePlane(`${def.name}_shadow`, {
    width: def.width * 1.6,
    height: def.height,
  }, scene);
  shadow.parent = root;
  shadow.position.z = 1.2;
  const shadowMat = new BABYLON.StandardMaterial(`${def.name}_shadowMat`, scene);
  shadowMat.diffuseColor = new BABYLON.Color3(0.02, 0.03, 0.05);
  shadowMat.emissiveColor = new BABYLON.Color3(0.01, 0.02, 0.03);
  shadowMat.alpha = 0.12;
  shadowMat.backFaceCulling = false;
  shadowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  shadow.material = shadowMat;
  markDecor(shadow);

  const laneIndicator = BABYLON.MeshBuilder.CreatePlane(`${def.name}_indicator`, {
    width: def.width * 1.25,
    height: def.height * 0.24,
  }, scene);
  laneIndicator.parent = root;
  laneIndicator.position.y = -(def.height * 0.48);
  laneIndicator.position.z = 0.8;
  const indicatorMat = new BABYLON.StandardMaterial(`${def.name}_indicatorMat`, scene);
  indicatorMat.diffuseColor = new BABYLON.Color3(0.90, 0.98, 1.0);
  indicatorMat.emissiveColor = new BABYLON.Color3(0.28, 0.36, 0.42);
  indicatorMat.alpha = 0.22;
  indicatorMat.backFaceCulling = false;
  indicatorMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  laneIndicator.material = indicatorMat;
  markDecor(laneIndicator);

  return {
    ...def,
    root,
    shadow,
    laneIndicator,
    currentX: def.xMin,
    getCollider(progress) {
      return {
        minX: this.xMin + ((this.xMax - this.xMin) * progress) - (this.width * 0.5),
        maxX: this.xMin + ((this.xMax - this.xMin) * progress) + (this.width * 0.5),
        minY: this.y - (this.height * 0.5),
        maxY: this.y + (this.height * 0.5),
      };
    },
    updateVisual(progress, intensity) {
      const centerX = this.xMin + ((this.xMax - this.xMin) * progress);
      this.currentX = centerX;
      this.root.position.x = centerX;
      shadowMat.alpha = 0.10 + (intensity * 0.22);
      indicatorMat.alpha = 0.12 + (intensity * 0.26);
    },
  };
}

export function buildWorld5(scene, options = {}) {
  const { animateGoal = true } = options;

  const shadowGen = new BABYLON.ShadowGenerator(1024, new BABYLON.DirectionalLight(
    'L5_keyLight',
    new BABYLON.Vector3(-0.35, -1.0, 0.22),
    scene,
  ));
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.bias = 0.00035;

  const hemi = new BABYLON.HemisphericLight('L5_fill', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new BABYLON.Color3(0.34, 0.74, 0.82);
  hemi.groundColor = new BABYLON.Color3(0.02, 0.05, 0.08);

  const rim = new BABYLON.PointLight('L5_rim', new BABYLON.Vector3(118, 18, -9), scene);
  rim.intensity = 0.52;
  rim.diffuse = new BABYLON.Color3(0.28, 0.94, 0.98);

  const groundVisual = createAquariumPlatform(scene, 'ground', LEVEL5.ground, shadowGen);
  setRenderingGroup(groundVisual, 2);
  const groundCollider = makeInvisibleCollider(scene, 'L5_groundCollider', LEVEL5.ground);
  const allPlatforms = [groundCollider];
  const platformVisuals = [];

  for (const def of LEVEL5.platforms) {
    const visual = createAquariumPlatform(scene, def.name, def, shadowGen);
    setRenderingGroup(visual, 2);
    platformVisuals.push(visual);
    const collider = makeInvisibleCollider(scene, `L5_${def.name}_col`, def);
    allPlatforms.push(collider);
  }

  const checkpoints = LEVEL5.checkpoints.map((cp, index) => ({
    index: index + 1,
    label: cp.label,
    spawn: { x: cp.x, y: cp.y, z: cp.z ?? LANE_Z },
    radius: 1.2,
    marker: createCheckpointMarker(scene, `L5_checkpoint_${index}`, {
      x: cp.x,
      y: cp.y - 0.06,
      z: 1.18,
      shadowGen,
    }),
  }));
  checkpoints.forEach((checkpoint) => markDecor(checkpoint.marker));

  const pickups = [
    {
      type: 'onesie',
      x: 48.8,
      y: 2.38,
      z: LANE_Z,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
      collected: false,
      position: new BABYLON.Vector3(48.8, 2.38, LANE_Z),
      node: createOnesiePickup(scene, 'L5_pickup_onesie', {
        x: 48.8,
        y: 2.38,
        z: 1.0,
        shadowGen,
      }).root,
    },
  ];
  pickups.forEach((pickup) => markDecor(pickup.node));

  const coins = LEVEL5.coins.map((coin, index) => {
    const node = createCoin(scene, `L5_coin_${index}`, coin);
    setRenderingGroup(node, 3);
    return {
      id: `l5_coin_${index}`,
      position: new BABYLON.Vector3(coin.x, coin.y, coin.z ?? LANE_Z),
      radius: 0.48,
      collected: false,
      node,
    };
  });

  const dad = createDad(scene, {
    x: LEVEL5.goal.x,
    y: LEVEL5.goal.y,
    z: LANE_Z,
    outfit: 'level3',
    shadowGen,
    animate: animateGoal,
  });
  dad.root.position.z = 0;

  const aquariumFx = createAquariumEnvironmentFx(scene, {
    extents: LEVEL5.extents,
    floorY: LEVEL5.ground.y + 0.8,
    farZ: 16,
  });
  const backdrop = createBackdrop(scene);

  const currentJets = LEVEL5.currents.map((def) => createCurrentJet(scene, def));
  const deepWaterPockets = (LEVEL5.deepWaterPockets || []).map((def) => createDeepWaterPocket(scene, def));
  const airBubblePickups = (LEVEL5.airBubblePickups || []).map((def) => createAirBubblePickup(scene, def));
  const eelRails = LEVEL5.eelRails.map((def) => createEelRail(scene, def));
  const vents = LEVEL5.vents.map((def) => createVent(scene, def));
  const jellyfish = LEVEL5.jellyfish.map((def) => createJellyfish(scene, def, shadowGen));
  const sharkSweep = createSharkSweep(scene, LEVEL5.sharkSweep);

  const hazards = [];
  let currentPushTimer = 0;
  let currentPushForce = 0;
  let currentPushZ = 0;
  let runtimeTime = 0;

  const eelHazards = eelRails.map((eelRail) => createTelegraphedHazard({
    name: eelRail.name,
    warnDuration: EEL_WARN_SEC,
    activeDuration: EEL_ACTIVE_SEC,
    cooldownDuration: EEL_COOLDOWN_SEC,
    phaseOffset: eelRail.phaseOffset,
    onWarnVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.22 + (progress * 0.16);
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.14 + (progress * 0.10), 0.36 + (progress * 0.20), 0.32 + (progress * 0.18));
      eelRail.halo.material.alpha = 0.10 + (progress * 0.12);
    },
    onActiveVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.92;
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.56, 1.0, 0.92);
      eelRail.halo.material.alpha = 0.24 + (Math.sin(progress * Math.PI * 4) * 0.06);
    },
    onCooldownVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.10 + ((1 - progress) * 0.10);
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.05, 0.14, 0.14);
      eelRail.halo.material.alpha = 0.05;
    },
    isPlayerHit: ({ pos }) => eelRail.lineDistanceToPoint(pos) <= 0.34,
    onHit: ({ pos, triggerDamage }) => {
      triggerDamage?.('eel_rail', { x: pos.x < eelRail.root.position.x ? -1 : 1, z: 0 });
    },
  }));

  const ventHazards = vents.map((vent) => createTelegraphedHazard({
    name: vent.name,
    warnDuration: 0.65,
    activeDuration: 1.05,
    cooldownDuration: 1.15,
    phaseOffset: vent.phaseOffset,
    onWarnVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.10 + (progress * 0.18);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.08, 0.18 + (progress * 0.10), 0.20 + (progress * 0.10));
    },
    onActiveVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.32 + (Math.sin(progress * Math.PI * 8) * 0.04);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.20, 0.52, 0.56);
    },
    onCooldownVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.06 + ((1 - progress) * 0.06);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.04, 0.08, 0.10);
    },
    isPlayerHit: ({ pos }) => pos.x >= (vent.x - (vent.w * 0.6))
      && pos.x <= (vent.x + (vent.w * 0.6))
      && pos.y >= (vent.y - 0.2)
      && pos.y <= (vent.y + (vent.h * 0.7)),
    onHit: ({ player }) => {
      player.vy = Math.max(player.vy, vent.liftVy);
    },
  }));

  const sharkHazard = createTelegraphedHazard({
    name: sharkSweep.name,
    warnDuration: SHARK_WARN_SEC,
    activeDuration: SHARK_ACTIVE_SEC,
    cooldownDuration: SHARK_COOLDOWN_SEC,
    phaseOffset: sharkSweep.phaseOffset,
    onWarnVisual: ({ progress }) => {
      sharkSweep.updateVisual(0.08 + (progress * 0.84), 0.5 + (progress * 0.4));
    },
    onActiveVisual: ({ progress }) => {
      sharkSweep.updateVisual(progress, 1);
    },
    onCooldownVisual: ({ progress }) => {
      sharkSweep.updateVisual(1, 0.20 * (1 - progress));
    },
    isPlayerHit: ({ pos }) => {
      const state = sharkHazard.getState();
      const duration = Math.max(0.001, state.duration);
      const collider = sharkSweep.getCollider(state.elapsed / duration);
      return pos.x >= collider.minX
        && pos.x <= collider.maxX
        && pos.y >= collider.minY
        && pos.y <= collider.maxY;
    },
    onHit: ({ pos, triggerDamage }) => {
      triggerDamage?.('shark_shadow', { x: pos.x < sharkSweep.currentX ? -1 : 1, z: 0 });
    },
  });

  function updateCurrentJets(dt, player) {
    if (currentPushTimer > 0) {
      currentPushTimer = Math.max(0, currentPushTimer - dt);
      player.vx += currentPushForce * dt;
      player.vz += currentPushZ * dt;
    }
    for (const jet of currentJets) {
      jet.update(dt);
      const inside = jet.contains(player.mesh.position);
      if (inside && !jet.playerInside) {
        currentPushForce = jet.pushX;
        currentPushZ = jet.pushZ ?? 0;
        currentPushTimer = CURRENT_PUSH_DURATION_SEC;
        player.vz += currentPushZ * dt * 10;
      }
      jet.playerInside = inside;
    }
  }

  function updateJellyfish(dt, pos, triggerDamage, triggerNearMissCue) {
    const playerRadius = 0.36;
    for (const jelly of jellyfish) {
      jelly.update(dt);
      if (jelly.isStunned()) continue;
      const jellyPos = jelly.root.position;
      const dx = pos.x - jellyPos.x;
      const dy = pos.y - jellyPos.y;
      const dz = pos.z - jellyPos.z;
      const distance = Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2));
      if (distance <= (JELLY_HIT_RADIUS + playerRadius)) {
        const planarLen = Math.hypot(dx, dz) || 1;
        triggerDamage?.('jellyfish', { x: dx / planarLen, z: dz / planarLen });
        continue;
      }
      if (distance <= (JELLY_NEAR_MISS_RADIUS + playerRadius) && jelly.nearMissCooldownMs <= 0) {
        jelly.nearMissCooldownMs = 900;
        triggerNearMissCue();
      }
    }
  }

  const level5 = {
    update(dt, {
      pos,
      player,
      triggerDamage,
      triggerNearMissCue,
      refillOxygen,
    }) {
      runtimeTime += dt;
      aquariumFx.update(dt);
      backdrop.update(dt, runtimeTime);
      updateCurrentJets(dt, player);
      for (const pocket of deepWaterPockets) {
        pocket.update(dt, runtimeTime);
      }
      for (const bubble of airBubblePickups) {
        bubble.update(dt, runtimeTime);
        if (!bubble.collected && bubble.contains(pos)) {
          bubble.collect();
          refillOxygen?.(bubble.refill ?? 8);
        }
      }
      for (const eelHazard of eelHazards) {
        eelHazard.update(dt, { pos, player, triggerDamage });
      }
      for (const ventHazard of ventHazards) {
        ventHazard.update(dt, { pos, player });
      }
      updateJellyfish(dt, pos, triggerDamage, triggerNearMissCue);
      sharkHazard.update(dt, { pos, player, triggerDamage });
    },
    reset() {
      runtimeTime = 0;
      currentPushTimer = 0;
      currentPushForce = 0;
      currentPushZ = 0;
      aquariumFx.reset();
      backdrop.reset();
      for (const jet of currentJets) {
        jet.playerInside = false;
      }
      for (const eelHazard of eelHazards) {
        eelHazard.reset();
      }
      for (const ventHazard of ventHazards) {
        ventHazard.reset();
      }
      for (const jelly of jellyfish) {
        jelly.reset();
      }
      for (const bubble of airBubblePickups) {
        bubble.reset();
      }
      sharkHazard.reset();
    },
    debugForceHazard(name, { pos, triggerDamage } = {}) {
      if (name === 'shark') {
        triggerDamage?.('shark_shadow', { x: 1, z: 0 });
        return true;
      }
      if (name === 'jellyfish') {
        triggerDamage?.('jellyfish', { x: 1, z: 0 });
        return true;
      }
      const eelHazard = eelHazards.find((entry) => entry.name === name) || eelHazards[0];
      if (eelHazard) {
        triggerDamage?.('eel_rail', { x: pos?.x < eelHazard.root.position.x ? -1 : 1, z: 0 });
        return true;
      }
      return false;
    },
    isInDeepWater(pos) {
      return deepWaterPockets.some((pocket) => pocket.contains(pos));
    },
    tryHitByBubble(projectile) {
      for (const jelly of jellyfish) {
        if (jelly.isStunned()) continue;
        const dx = projectile.position.x - jelly.root.position.x;
        const dy = projectile.position.y - jelly.root.position.y;
        const dz = projectile.position.z - jelly.root.position.z;
        if (((dx ** 2) + (dy ** 2) + (dz ** 2)) <= ((projectile.radius ?? 0.28) + 0.64) ** 2) {
          jelly.stun(projectile.stunMs ?? 1500);
          return { hit: true, jellyName: jelly.name };
        }
      }
      return { hit: false, jellyName: null };
    },
    placeDebugJellyfish(pos, forward = { x: 1, z: 0 }) {
      const jelly = jellyfish[0];
      if (!jelly) return false;
      const dirLen = Math.hypot(forward.x || 0, forward.z || 0) || 1;
      const targetPos = new BABYLON.Vector3(
        pos.x + ((forward.x || 1) / dirLen) * 2.6,
        pos.y + 0.5,
        pos.z + ((forward.z || 0) / dirLen) * 2.0,
      );
      jelly.mover.basePosition = targetPos.clone();
      jelly.mover.bounds = {
        minX: targetPos.x - 1.2,
        maxX: targetPos.x + 1.2,
        minY: targetPos.y - 0.5,
        maxY: targetPos.y + 0.8,
        minZ: targetPos.z - 1.1,
        maxZ: targetPos.z + 1.1,
      };
      jelly.root.position.copyFrom(targetPos);
      jelly.reset();
      return true;
    },
    getDebugState() {
      return {
        currentPushTimer,
        currentPushForce,
        currentPushZ,
        jellyfish: jellyfish.map((jelly) => ({
          name: jelly.name,
          x: jelly.root.position.x,
          y: jelly.root.position.y,
          z: jelly.root.position.z,
          stunnedMs: jelly.stunnedMs,
        })),
      };
    },
  };
  level5.reset();

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allPlatforms,
    goal: dad.goal,
    goalRoot: dad.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL5.extents,
    spawn: LEVEL5.spawn,
    checkpoints,
    pickups,
    coins,
    hazards: [
      ...LEVEL5.currents.map((current) => ({
        name: current.name,
        type: 'current',
        minX: current.x - (current.w * 0.5),
        maxX: current.x + (current.w * 0.5),
        minY: current.y - (current.h * 0.5),
        maxY: current.y + (current.h * 0.5),
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.eelRails.map((eelRail) => ({
        name: eelRail.name,
        type: 'eel_rail',
        minX: Math.min(eelRail.x1, eelRail.x2) - 0.4,
        maxX: Math.max(eelRail.x1, eelRail.x2) + 0.4,
        minY: Math.min(eelRail.y1, eelRail.y2) - 0.4,
        maxY: Math.max(eelRail.y1, eelRail.y2) + 0.4,
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.vents.map((vent) => ({
        name: vent.name,
        type: 'vent',
        minX: vent.x - vent.w,
        maxX: vent.x + vent.w,
        minY: vent.y - 0.2,
        maxY: vent.y + vent.h,
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.jellyfish.map((jelly) => ({
        name: jelly.name,
        type: 'jellyfish',
        minX: jelly.bounds.minX,
        maxX: jelly.bounds.maxX,
        minY: jelly.bounds.minY,
        maxY: jelly.bounds.maxY,
        handledByLevelRuntime: true,
      })),
      {
        name: LEVEL5.sharkSweep.name,
        type: 'shark',
        minX: LEVEL5.sharkSweep.xMin,
        maxX: LEVEL5.sharkSweep.xMax,
        minY: LEVEL5.sharkSweep.y - (LEVEL5.sharkSweep.height * 0.5),
        maxY: LEVEL5.sharkSweep.y + (LEVEL5.sharkSweep.height * 0.5),
        handledByLevelRuntime: true,
      },
    ],
    crumbles: [],
    level: LEVEL5,
    era5Level: level5,
    level5,
    signs: [backdrop.root, aquariumFx.root, ...platformVisuals],
    goalGuardMinX: LEVEL5.goal.x - 4.8,
    goalMinBottomY: (LEVEL5.platforms.find((platform) => platform.name === 'goalDeck').y + (LEVEL5.platforms.find((platform) => platform.name === 'goalDeck').h * 0.5)) - 0.2,
    assetAnchors: {
      cribRail: null,
      toyBlocks: [],
      goalBanner: null,
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
      futureLevel6BuilderHook: [],
      futureLevel7BuilderHook: [],
      futureLevel8BuilderHook: [],
    },
  };
}
