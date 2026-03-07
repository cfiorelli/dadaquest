import * as BABYLON from '@babylonjs/core';
import {
  makeCardboard,
  makePlastic,
  makePaper,
} from '../materials.js';
import { LEVEL3, LANE_Z3 } from './level3.js';
import { AnimalWanderController } from './animalWander.js';
import {
  createCardboardPlatform,
  createCoin,
  createCheckpointMarker,
  createOnesiePickup,
  createWelcomeSign,
  setRenderingGroup,
} from './buildWorld.js';
import { createDad, createGrandma } from './characters.js';

const LANE_Z = LANE_Z3;

const P3 = {
  ground: [186, 170, 148],
  platformCard: [213, 190, 159],
  edgeDark: [142, 118, 92],
  porch: [191, 111, 74],
};

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

function markDecorative(node) {
  if (!node) return;
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
    decor: true,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
      cameraBlocker: false,
      decor: true,
    };
  }
}

function makeGrassMaterial(scene, name) {
  const tex = new BABYLON.DynamicTexture(name, { width: 1024, height: 256 }, scene, true);
  const ctx = tex.getContext();
  ctx.fillStyle = '#6a9052';
  ctx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 2200; i++) {
    const x = (i * 37) % 1024;
    const y = (i * 91) % 256;
    const alpha = 0.08 + ((i % 7) * 0.012);
    ctx.fillStyle = `rgba(${72 + (i % 24)}, ${108 + (i % 42)}, ${54 + (i % 18)}, ${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 3 + (i % 3), 12 + (i % 15));
  }
  for (let i = 0; i < 180; i++) {
    const x = (i * 53) % 1024;
    const y = (i * 29) % 256;
    const w = 30 + ((i * 7) % 46);
    const h = 10 + ((i * 11) % 24);
    ctx.fillStyle = `rgba(56, 84, 44, ${(0.06 + ((i % 5) * 0.018)).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, ((i % 9) * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  tex.update();
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

function createSteamHazardVisual(scene, name, {
  x,
  y,
  z = 0,
  width,
  height,
  color = [0.36, 0.67, 0.92],
  warm = false,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const base = BABYLON.MeshBuilder.CreateCylinder(name + '_base', {
    diameter: 0.32,
    height: 0.18,
    tessellation: 18,
  }, scene);
  base.parent = root;
  base.position.y = -height * 0.5 + 0.08;
  base.material = makeCardboard(scene, name + '_baseMat', ...P3.edgeDark, { roughness: 0.9 });

  const column = BABYLON.MeshBuilder.CreateBox(name + '_column', {
    width,
    height,
    depth: 0.34,
  }, scene);
  column.parent = root;
  const mat = new BABYLON.StandardMaterial(name + '_colMat', scene);
  mat.diffuseColor = new BABYLON.Color3(...color);
  mat.emissiveColor = warm
    ? new BABYLON.Color3(0.42, 0.32, 0.22)
    : new BABYLON.Color3(0.18, 0.28, 0.34);
  mat.specularColor = BABYLON.Color3.Black();
  mat.alpha = 0.44;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  column.material = mat;

  const cap = BABYLON.MeshBuilder.CreatePlane(name + '_cap', {
    width: width + 0.34,
    height: 0.24,
  }, scene);
  cap.rotation.x = Math.PI / 2;
  cap.position.y = height * 0.5 + 0.03;
  cap.parent = root;
  const capMat = makePaper(
    scene,
    name + '_capMat',
    warm ? 255 : 214,
    warm ? 232 : 244,
    warm ? 198 : 255,
    { roughness: 0.98, noiseAmt: 8 },
  );
  capMat.alpha = 0.72;
  capMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  cap.material = capMat;

  markDecorative(root);
  return { root, column };
}

function createSprinklerVisual(scene, name, {
  x,
  y,
  z = 0,
  nozzleLocal = new BABYLON.Vector3(-0.44, 0.52, 1.54),
  targetLocal = new BABYLON.Vector3(0.76, -0.18, 1.82),
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const hosePath = [
    new BABYLON.Vector3(-1.18, -0.56, 1.28),
    new BABYLON.Vector3(-0.96, -0.34, 1.34),
    new BABYLON.Vector3(-0.70, -0.08, 1.42),
    new BABYLON.Vector3(-0.54, 0.26, 1.48),
    nozzleLocal.clone(),
  ];
  const hose = BABYLON.MeshBuilder.CreateTube(`${name}_hose`, {
    path: hosePath,
    radius: 0.055,
    tessellation: 12,
    cap: BABYLON.Mesh.CAP_ALL,
  }, scene);
  hose.parent = root;
  hose.material = makePlastic(scene, `${name}_hoseMat`, 0.27, 0.58, 0.18, { roughness: 0.56 });

  const nozzle = BABYLON.MeshBuilder.CreateCylinder(`${name}_nozzle`, {
    height: 0.26,
    diameter: 0.14,
    tessellation: 12,
  }, scene);
  nozzle.parent = root;
  nozzle.position.copyFrom(nozzleLocal);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.material = makePlastic(scene, `${name}_headMat`, 0.62, 0.68, 0.72, { roughness: 0.46 });

  const streamMat = new BABYLON.StandardMaterial(`${name}_streamMat`, scene);
  streamMat.diffuseColor = new BABYLON.Color3(0.56, 0.80, 0.98);
  streamMat.emissiveColor = new BABYLON.Color3(0.24, 0.44, 0.56);
  streamMat.specularColor = BABYLON.Color3.Black();
  streamMat.alpha = 0.32;
  streamMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const streams = [];
  for (const [index, offset] of [0, -0.18, 0.18].entries()) {
    const target = targetLocal.add(new BABYLON.Vector3(offset * 0.4, 0.04 - (index * 0.02), offset));
    const mid = BABYLON.Vector3.Lerp(nozzleLocal, target, 0.5).add(new BABYLON.Vector3(0.12, -0.08, 0));
    const stream = BABYLON.MeshBuilder.CreateTube(`${name}_stream${index}`, {
      path: [nozzleLocal.clone(), mid, target],
      radius: index === 0 ? 0.05 : 0.032,
      tessellation: 10,
      cap: BABYLON.Mesh.CAP_ALL,
    }, scene);
    stream.parent = root;
    stream.material = streamMat;
    streams.push(stream);
  }

  markDecorative(root);
  return {
    root,
    streams,
    nozzleTip: root.position.add(nozzleLocal),
    targetPoint: root.position.add(targetLocal),
  };
}

function createDogVisual(scene, name, { x, y, z = 0, color = [0.66, 0.50, 0.30] }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: 1.45,
    height: 0.75,
    depth: 0.55,
  }, scene);
  body.parent = root;
  body.position.y = 0.18;
  body.material = makePlastic(scene, name + '_bodyMat', ...color, { roughness: 0.56 });

  const head = BABYLON.MeshBuilder.CreateSphere(name + '_head', {
    diameter: 0.62,
    segments: 10,
  }, scene);
  head.parent = root;
  head.position.set(0.58, 0.45, 0);
  head.material = makePlastic(scene, name + '_headMat', 0.92, 0.84, 0.74, { roughness: 0.62 });

  const snout = BABYLON.MeshBuilder.CreateBox(name + '_snout', {
    width: 0.26,
    height: 0.20,
    depth: 0.22,
  }, scene);
  snout.parent = root;
  snout.position.set(0.86, 0.36, 0);
  snout.material = makePlastic(scene, name + '_snoutMat', 0.90, 0.78, 0.66, { roughness: 0.66 });

  for (const side of [-0.08, 0.08]) {
    const eye = BABYLON.MeshBuilder.CreateSphere(name + `_eye${side}`, {
      diameter: 0.06,
      segments: 8,
    }, scene);
    eye.parent = root;
    eye.position.set(0.74, 0.52, side);
    eye.material = makePlastic(scene, name + `_eyeMat${side}`, 0.10, 0.08, 0.08, { roughness: 0.32 });
  }

  for (const side of [-0.16, 0.16]) {
    const ear = BABYLON.MeshBuilder.CreateBox(name + `_ear${side}`, {
      width: 0.14,
      height: 0.28,
      depth: 0.10,
    }, scene);
    ear.parent = root;
    ear.position.set(0.68, 0.78, side);
    ear.rotation.z = side < 0 ? 0.18 : -0.18;
    ear.material = body.material;
  }

  for (const side of [-0.22, 0.22]) {
    const legFront = BABYLON.MeshBuilder.CreateBox(name + `_legF${side}`, {
      width: 0.12,
      height: 0.46,
      depth: 0.12,
    }, scene);
    legFront.parent = root;
    legFront.position.set(0.34, -0.20, side);
    legFront.material = body.material;

    const legBack = BABYLON.MeshBuilder.CreateBox(name + `_legB${side}`, {
      width: 0.12,
      height: 0.46,
      depth: 0.12,
    }, scene);
    legBack.parent = root;
    legBack.position.set(-0.36, -0.20, side);
    legBack.material = body.material;
  }

  const tail = BABYLON.MeshBuilder.CreateBox(name + '_tail', {
    width: 0.10,
    height: 0.42,
    depth: 0.10,
  }, scene);
  tail.parent = root;
  tail.position.set(-0.78, 0.42, 0);
  tail.rotation.z = 0.62;
  tail.material = body.material;

  markDecorative(root);
  setRenderingGroup(root, 3);
  return root;
}

function createRakePlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const handle = BABYLON.MeshBuilder.CreateCylinder(`${name}_handle`, {
    height: 1.9,
    diameter: 0.08,
    tessellation: 10,
  }, scene);
  handle.parent = root;
  handle.position.set(0.28, 0.94, 0);
  handle.rotation.z = -0.42;
  handle.material = makeCardboard(scene, `${name}_handleMat`, 166, 126, 84, { roughness: 0.88 });

  const head = BABYLON.MeshBuilder.CreateBox(`${name}_head`, {
    width: 0.68,
    height: 0.10,
    depth: 0.12,
  }, scene);
  head.parent = root;
  head.position.set(-0.16, 0.22, 0);
  head.material = makeCardboard(scene, `${name}_headMat`, 114, 116, 122, { roughness: 0.84 });

  for (let i = 0; i < 5; i++) {
    const tine = BABYLON.MeshBuilder.CreateBox(`${name}_tine${i}`, {
      width: 0.04,
      height: 0.22,
      depth: 0.04,
    }, scene);
    tine.parent = root;
    tine.position.set(-0.42 + (i * 0.13), 0.08, 0);
    tine.material = head.material;
  }

  markDecorative(root);
  setRenderingGroup(root, 3);
  return root;
}

function createTractorPlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {
    width: 1.5,
    height: 0.82,
    depth: 0.82,
  }, scene);
  body.parent = root;
  body.position.y = 0.62;
  body.material = makePlastic(scene, `${name}_bodyMat`, 0.76, 0.18, 0.12, { roughness: 0.48 });

  const cab = BABYLON.MeshBuilder.CreateBox(`${name}_cab`, {
    width: 0.7,
    height: 0.72,
    depth: 0.64,
  }, scene);
  cab.parent = root;
  cab.position.set(0.28, 1.14, 0);
  cab.material = makeCardboard(scene, `${name}_cabMat`, 184, 198, 196, { roughness: 0.92 });

  const hood = BABYLON.MeshBuilder.CreateBox(`${name}_hood`, {
    width: 0.84,
    height: 0.46,
    depth: 0.66,
  }, scene);
  hood.parent = root;
  hood.position.set(-0.34, 0.74, 0);
  hood.material = body.material;

  for (const [index, def] of [
    { x: -0.52, y: 0.24, d: 0.62 },
    { x: 0.42, y: 0.28, d: 0.78 },
  ].entries()) {
    for (const zOff of [-0.34, 0.34]) {
      const wheel = BABYLON.MeshBuilder.CreateCylinder(`${name}_wheel_${index}_${zOff}`, {
        height: 0.16,
        diameter: def.d,
        tessellation: 20,
      }, scene);
      wheel.parent = root;
      wheel.position.set(def.x, def.y, zOff);
      wheel.rotation.x = Math.PI / 2;
      wheel.material = makePlastic(scene, `${name}_wheelMat_${index}_${zOff}`, 0.16, 0.18, 0.2, { roughness: 0.62 });
    }
  }

  markDecorative(root);
  setRenderingGroup(root, 3);
  return root;
}

function createHayBale(scene, name, { x, y, z = 0, scale = 1 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.scaling.setAll(scale);

  const bale = BABYLON.MeshBuilder.CreateBox(`${name}_bale`, {
    width: 1.2,
    height: 0.72,
    depth: 0.82,
  }, scene);
  bale.parent = root;
  bale.position.y = 0.36;
  bale.material = makeCardboard(scene, `${name}_mat`, 214, 186, 102, { roughness: 0.9 });

  const bandMat = makeCardboard(scene, `${name}_bandMat`, 156, 118, 62, { roughness: 0.92 });
  for (const px of [-0.24, 0.24]) {
    const band = BABYLON.MeshBuilder.CreateBox(`${name}_band${px}`, {
      width: 0.08,
      height: 0.76,
      depth: 0.86,
    }, scene);
    band.parent = root;
    band.position.set(px, 0.36, 0);
    band.material = bandMat;
  }

  markDecorative(root);
  return root;
}

function createPlantPlaceholder(scene, name, { x, y, z = 0, kind = 'flower' }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const stem = BABYLON.MeshBuilder.CreateCylinder(`${name}_stem`, {
    height: kind === 'corn' ? 1.4 : 0.8,
    diameter: kind === 'corn' ? 0.10 : 0.06,
    tessellation: 8,
  }, scene);
  stem.parent = root;
  stem.position.y = (kind === 'corn' ? 0.7 : 0.4);
  stem.material = makePlastic(scene, `${name}_stemMat`, 0.35, 0.58, 0.20, { roughness: 0.7 });

  if (kind === 'corn') {
    const husk = BABYLON.MeshBuilder.CreateBox(`${name}_husk`, {
      width: 0.22,
      height: 0.8,
      depth: 0.18,
    }, scene);
    husk.parent = root;
    husk.position.y = 0.88;
    husk.material = makeCardboard(scene, `${name}_huskMat`, 194, 176, 84, { roughness: 0.84 });
  } else {
    for (let i = 0; i < 4; i++) {
      const petal = BABYLON.MeshBuilder.CreateSphere(`${name}_petal${i}`, {
        diameter: 0.18,
        segments: 8,
      }, scene);
      petal.parent = root;
      const ang = (i / 4) * Math.PI * 2;
      petal.position.set(Math.cos(ang) * 0.12, 0.78, Math.sin(ang) * 0.08);
      petal.material = makePaper(
        scene,
        `${name}_petalMat${i}`,
        kind === 'yellow' ? 246 : 232,
        kind === 'yellow' ? 214 : 120,
        kind === 'yellow' ? 84 : 166,
        { roughness: 0.96, noiseAmt: 8 },
      );
    }
  }

  markDecorative(root);
  return root;
}

function createCritterPlaceholder(scene, name, { x, y, z = 0, kind = 'chicken' }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  let bodyColor = [0.76, 0.56, 0.34];
  let accentColor = [0.96, 0.88, 0.76];
  let scale = 1;
  if (kind === 'chicken') {
    bodyColor = [0.94, 0.88, 0.74];
    accentColor = [0.86, 0.28, 0.18];
    scale = 0.72;
  } else if (kind === 'goat') {
    bodyColor = [0.82, 0.78, 0.72];
    accentColor = [0.40, 0.28, 0.22];
    scale = 1.0;
  } else if (kind === 'pig') {
    bodyColor = [0.94, 0.72, 0.74];
    accentColor = [0.78, 0.46, 0.54];
    scale = 0.96;
  } else if (kind === 'turkey') {
    bodyColor = [0.46, 0.30, 0.20];
    accentColor = [0.86, 0.24, 0.16];
    scale = 1.1;
  }
  root.scaling.setAll(scale);

  const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {
    width: kind === 'chicken' ? 0.7 : 1.0,
    height: kind === 'chicken' ? 0.56 : 0.72,
    depth: kind === 'chicken' ? 0.52 : 0.62,
  }, scene);
  body.parent = root;
  body.position.y = kind === 'chicken' ? 0.32 : 0.42;
  body.material = makePlastic(scene, `${name}_bodyMat`, ...bodyColor, { roughness: 0.62 });

  const head = BABYLON.MeshBuilder.CreateSphere(`${name}_head`, {
    diameter: kind === 'chicken' ? 0.28 : 0.34,
    segments: 10,
  }, scene);
  head.parent = root;
  head.position.set(kind === 'chicken' ? 0.28 : 0.44, kind === 'chicken' ? 0.58 : 0.74, 0);
  head.material = body.material;

  if (kind === 'pig') {
    const snout = BABYLON.MeshBuilder.CreateBox(`${name}_snout`, {
      width: 0.14,
      height: 0.10,
      depth: 0.12,
    }, scene);
    snout.parent = root;
    snout.position.set(0.62, 0.70, 0);
    snout.material = makePlastic(scene, `${name}_snoutMat`, 0.92, 0.62, 0.68, { roughness: 0.54 });
  }

  const crest = BABYLON.MeshBuilder.CreateBox(`${name}_crest`, {
    width: 0.12,
    height: 0.12,
    depth: 0.08,
  }, scene);
  crest.parent = root;
  crest.position.set(head.position.x + 0.04, head.position.y + 0.14, 0);
  crest.material = makePlastic(scene, `${name}_crestMat`, ...accentColor, { roughness: 0.5 });

  markDecorative(root);
  return root;
}

function createBunnyPlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const furMat = makePlastic(scene, `${name}_furMat`, 0.92, 0.90, 0.86, { roughness: 0.72 });
  const earMat = makePlastic(scene, `${name}_earMat`, 0.96, 0.78, 0.82, { roughness: 0.74 });
  const eyeMat = makePlastic(scene, `${name}_eyeMat`, 0.10, 0.08, 0.08, { roughness: 0.28 });

  const body = BABYLON.MeshBuilder.CreateSphere(`${name}_body`, {
    diameter: 0.78,
    segments: 12,
  }, scene);
  body.parent = root;
  body.position.set(0, 0.38, 0);
  body.scaling.z = 1.18;
  body.material = furMat;

  const head = BABYLON.MeshBuilder.CreateSphere(`${name}_head`, {
    diameter: 0.46,
    segments: 10,
  }, scene);
  head.parent = root;
  head.position.set(0.34, 0.62, 0);
  head.material = furMat;

  for (const side of [-0.08, 0.08]) {
    const ear = BABYLON.MeshBuilder.CreateBox(`${name}_ear${side}`, {
      width: 0.10,
      height: 0.48,
      depth: 0.10,
    }, scene);
    ear.parent = root;
    ear.position.set(0.34, 1.02, side);
    ear.rotation.z = side < 0 ? -0.14 : 0.14;
    ear.material = earMat;

    const eye = BABYLON.MeshBuilder.CreateSphere(`${name}_eye${side}`, {
      diameter: 0.05,
      segments: 8,
    }, scene);
    eye.parent = root;
    eye.position.set(0.52, 0.66, side);
    eye.material = eyeMat;
  }

  markDecorative(root);
  return root;
}

function createGrandmaBackdrop(scene, shadowGen) {
  const skyTex = new BABYLON.DynamicTexture('grandmaForestSkyTex', { width: 2048, height: 512 }, scene, true);
  const skyCtx = skyTex.getContext();
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#8fc7f5');
  skyGrad.addColorStop(0.58, '#dbeeff');
  skyGrad.addColorStop(1, '#f0d7a2');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 2048, 512);
  skyCtx.fillStyle = '#5b7b4f';
  skyCtx.beginPath();
  skyCtx.moveTo(0, 352);
  for (let x = 0; x <= 2048; x += 56) {
    const ridgeY = 336 + (Math.sin(x * 0.016) * 12) + (Math.cos(x * 0.007) * 8);
    skyCtx.lineTo(x, ridgeY);
  }
  skyCtx.lineTo(2048, 512);
  skyCtx.lineTo(0, 512);
  skyCtx.closePath();
  skyCtx.fill();
  skyCtx.fillStyle = '#5d7c53';
  for (let i = 0; i < 34; i++) {
    const cx = 28 + (i * 60);
    const h = 18 + ((i % 7) * 7);
    skyCtx.beginPath();
    skyCtx.moveTo(cx - 18, 346);
    skyCtx.lineTo(cx, 346 - h);
    skyCtx.lineTo(cx + 18, 346);
    skyCtx.closePath();
    skyCtx.fill();
  }
  skyTex.update();

  const skyMat = new BABYLON.StandardMaterial('grandmaForestSkyMat', scene);
  skyMat.diffuseTexture = skyTex;
  skyMat.emissiveTexture = skyTex;
  skyMat.specularColor = BABYLON.Color3.Black();

  const skyPlane = BABYLON.MeshBuilder.CreatePlane('grandmaForestSky', {
    width: 152,
    height: 28,
  }, scene);
  skyPlane.position.set(28, 11.6, 13.6);
  skyPlane.material = skyMat;
  markDecorative(skyPlane);

  const sunTex = new BABYLON.DynamicTexture('grandmaSunTex', { width: 256, height: 256 }, scene, true);
  const sunCtx = sunTex.getContext();
  const sunGrad = sunCtx.createRadialGradient(128, 128, 18, 128, 128, 108);
  sunGrad.addColorStop(0, 'rgba(255,244,184,0.98)');
  sunGrad.addColorStop(0.55, 'rgba(255,216,112,0.92)');
  sunGrad.addColorStop(1, 'rgba(255,216,112,0)');
  sunCtx.fillStyle = sunGrad;
  sunCtx.fillRect(0, 0, 256, 256);
  sunTex.update();

  const sunMat = new BABYLON.StandardMaterial('grandmaSunMat', scene);
  sunMat.diffuseTexture = sunTex;
  sunMat.opacityTexture = sunTex;
  sunMat.emissiveTexture = sunTex;
  sunMat.useAlphaFromDiffuseTexture = true;
  sunMat.specularColor = BABYLON.Color3.Black();
  sunMat.backFaceCulling = false;

  const sun = BABYLON.MeshBuilder.CreatePlane('grandmaSun', {
    width: 5.8,
    height: 5.8,
  }, scene);
  sun.position.set(56.8, 16.2, 13.2);
  sun.material = sunMat;
  markDecorative(sun);

  const barn = BABYLON.MeshBuilder.CreateBox('grandmaBarnSilhouette', {
    width: 13,
    height: 7.8,
    depth: 0.8,
  }, scene);
  barn.position.set(75, 5.0, 12.3);
  barn.material = makeCardboard(scene, 'grandmaBarnMat', 176, 116, 88, { roughness: 0.9 });
  barn.receiveShadows = true;
  shadowGen.addShadowCaster(barn);
  markDecorative(barn);

  const roof = BABYLON.MeshBuilder.CreateCylinder('grandmaRoof', {
    diameterTop: 0,
    diameterBottom: 10.4,
    height: 4.2,
    tessellation: 3,
  }, scene);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(75.4, 9.0, 12.45);
  roof.material = makeCardboard(scene, 'grandmaRoofMat', 162, 86, 64, { roughness: 0.88 });
  roof.receiveShadows = true;
  shadowGen.addShadowCaster(roof);
  markDecorative(roof);

  const silo = BABYLON.MeshBuilder.CreateCylinder('grandmaSilo', {
    diameter: 2.4,
    height: 8.2,
    tessellation: 18,
  }, scene);
  silo.position.set(67.8, 4.2, 12.2);
  silo.material = makeCardboard(scene, 'grandmaSiloMat', 196, 188, 176, { roughness: 0.94 });
  markDecorative(silo);

  const goalBanner = BABYLON.MeshBuilder.CreatePlane('grandmaGoalBanner', {
    width: 4.4,
    height: 1.0,
  }, scene);
  goalBanner.position.set(74.8, 9.2, 11.3);
  const bannerMat = makePaper(scene, 'grandmaGoalBannerMat', 255, 239, 198, {
    roughness: 0.98,
    grainScale: 2.2,
    noiseAmt: 10,
  });
  bannerMat.emissiveColor = new BABYLON.Color3(0.22, 0.12, 0.08);
  goalBanner.material = bannerMat;
  goalBanner.receiveShadows = true;
  markDecorative(goalBanner);

  const bannerPoleLeft = BABYLON.MeshBuilder.CreateBox('grandmaGoalPoleL', {
    width: 0.12,
    height: 1.5,
    depth: 0.12,
  }, scene);
  bannerPoleLeft.position.set(72.7, 8.75, 11.38);
  bannerPoleLeft.material = makeCardboard(scene, 'grandmaGoalPoleLMat', 156, 112, 88, { roughness: 0.88 });
  markDecorative(bannerPoleLeft);

  const bannerPoleRight = BABYLON.MeshBuilder.CreateBox('grandmaGoalPoleR', {
    width: 0.12,
    height: 1.5,
    depth: 0.12,
  }, scene);
  bannerPoleRight.position.set(76.9, 8.75, 11.38);
  bannerPoleRight.material = makeCardboard(scene, 'grandmaGoalPoleRMat', 156, 112, 88, { roughness: 0.88 });
  markDecorative(bannerPoleRight);

  for (let i = 0; i < 24; i++) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder(`farmPineTrunk_${i}`, {
      diameterTop: 0.10,
      diameterBottom: 0.20,
      height: 1.6 + ((i % 4) * 0.18),
      tessellation: 8,
    }, scene);
    trunk.position.set(-18 + (i * 4.6), 1.2, 12.6 + ((i % 3) * 0.08));
    trunk.material = makeCardboard(scene, `farmPineTrunkMat_${i}`, 96, 74, 58, { roughness: 0.92 });
    markDecorative(trunk);

    for (const [layer, size] of [2.2, 1.8, 1.4].entries()) {
      const canopy = BABYLON.MeshBuilder.CreateCylinder(`farmPineCanopy_${i}_${layer}`, {
        diameterTop: 0,
        diameterBottom: size,
        height: 1.5,
        tessellation: 3,
      }, scene);
      canopy.position.set(trunk.position.x, 2.1 + (layer * 0.82), trunk.position.z - 0.04);
      canopy.material = makePaper(scene, `farmPineMat_${i}_${layer}`, 82, 114, 72, {
        roughness: 0.98,
        grainScale: 2.1,
        noiseAmt: 10,
      });
      canopy.receiveShadows = false;
      markDecorative(canopy);
    }
  }

  for (const [index, x] of [-14, 8, 30, 54, 76].entries()) {
    const fence = BABYLON.MeshBuilder.CreateBox(`grandmaBackdropFence_${index}`, {
      width: 15,
      height: 1.5,
      depth: 0.18,
    }, scene);
    fence.position.set(x, 1.0, 11.8 + (index * 0.08));
    fence.material = makeCardboard(scene, `grandmaBackdropFenceMat_${index}`, 198, 184, 160, { roughness: 0.94 });
    markDecorative(fence);
  }
}

export function buildWorld3(scene, options = {}) {
  const { animateGoal = true } = options;
  scene.clearColor = new BABYLON.Color4(0.94, 0.91, 0.86, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.40, 0.34, 0.30);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0065;
  scene.fogColor = new BABYLON.Color3(0.93, 0.90, 0.86);

  const keyLight = new BABYLON.DirectionalLight('keyLight3', new BABYLON.Vector3(-0.54, -0.90, 0.24), scene);
  keyLight.position = new BABYLON.Vector3(26, 28, -12);
  keyLight.intensity = 1.08;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.93, 0.82);
  keyLight.specular = new BABYLON.Color3(0.52, 0.44, 0.34);

  const fillLight = new BABYLON.HemisphericLight('fillLight3', new BABYLON.Vector3(0.1, 1, -0.15), scene);
  fillLight.intensity = 0.38;
  fillLight.diffuse = new BABYLON.Color3(0.76, 0.84, 0.94);
  fillLight.groundColor = new BABYLON.Color3(0.36, 0.32, 0.28);

  const rimLight = new BABYLON.PointLight('rimLight3', new BABYLON.Vector3(-8, 9, -14), scene);
  rimLight.intensity = 0.40;
  rimLight.diffuse = new BABYLON.Color3(0.94, 0.92, 0.84);
  rimLight.range = 48;

  const goalLight = new BABYLON.PointLight('goalLight3', new BABYLON.Vector3(77, 10, -6), scene);
  goalLight.intensity = 0.58;
  goalLight.diffuse = new BABYLON.Color3(1.0, 0.86, 0.52);
  goalLight.range = 18;

  const shadowGen = new BABYLON.ShadowGenerator(1024, keyLight);
  shadowGen.usePoissonSampling = true;
  shadowGen.bias = 0.0006;
  shadowGen.normalBias = 0.02;
  shadowGen.setDarkness(0.36);

  const groundDef = LEVEL3.ground;
  const platformByName = new Map(LEVEL3.platforms.map((platform) => [platform.name, platform]));
  const getPlatformTopY = (name) => {
    const platform = platformByName.get(name);
    return platform ? platform.y + (platform.h * 0.5) + 0.02 : floorTopY;
  };
  const getNearestPlatform = (x, names = null) => {
    let nearest = null;
    let bestDx = Number.POSITIVE_INFINITY;
    const candidates = names?.length
      ? names.map((name) => platformByName.get(name)).filter(Boolean)
      : Array.from(platformByName.values());
    for (const platform of candidates) {
      const halfW = platform.w * 0.5;
      const clampedX = Math.max(platform.x - halfW, Math.min(platform.x + halfW, x));
      const dx = Math.abs(x - clampedX);
      if (dx < bestDx) {
        bestDx = dx;
        nearest = platform;
      }
    }
    return nearest;
  };
  const groundVisual = createCardboardPlatform(scene, 'ground3', {
    x: groundDef.x,
    y: groundDef.y,
    z: groundDef.z,
    w: groundDef.w,
    h: groundDef.h,
    d: groundDef.d,
    slabColor: P3.ground,
    edgeColor: P3.edgeDark,
    shadowGen,
  });
  setRenderingGroup(groundVisual, 2);

  const groundCollider = makeInvisibleCollider(scene, 'groundCol3', groundDef);
  groundCollider.computeWorldMatrix(true);
  const floorTopY = groundCollider.getBoundingInfo().boundingBox.maximumWorld.y + 0.02;
  const grassMat = makeGrassMaterial(scene, 'level3_groundGrass');
  const grassEdgeMat = makeCardboard(scene, 'level3_groundGrassEdge', 92, 112, 68, { roughness: 0.94 });
  for (const mesh of groundVisual.getChildMeshes(false)) {
    if (mesh.name.includes('_slab')) {
      mesh.material = grassMat;
    } else if (mesh.name.includes('_edge') || mesh.name.includes('_bevel')) {
      mesh.material = grassEdgeMat;
    }
  }
  const allPlatforms = [groundCollider];

  for (const def of LEVEL3.platforms) {
    const slabColor = def.name.includes('Porch') || def.name.includes('table')
      ? P3.porch
      : P3.platformCard;
    const node = createCardboardPlatform(scene, def.name, {
      x: def.x,
      y: def.y,
      z: LANE_Z,
      w: def.w,
      h: def.h,
      d: def.d,
      slabColor,
      edgeColor: P3.edgeDark,
      shadowGen,
    });
    setRenderingGroup(node, 2);
    allPlatforms.push(makeInvisibleCollider(scene, def.name + '_col', { ...def, z: LANE_Z }));
  }

  createGrandmaBackdrop(scene, shadowGen);
  const gardenTopY = getPlatformTopY('gardenStart') - 0.02;
  const welcomeSign = createWelcomeSign(scene, {
    name: 'l3_welcomeSign',
    x: -21.2,
    y: gardenTopY,
    z: 2.28,
    shadowGen,
    textLines: ['WELCOME TO', "GRANDMA'S HOUSE"],
    width: 3.62,
    height: 1.48,
    postHeight: 2.92,
    boardName: 'l3_welcome',
    boardColor: [210, 172, 110],
    postColor: [126, 96, 68],
    fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
    textEmissive: new BABYLON.Color3(0.42, 0.26, 0.12),
  });
  markDecorative(welcomeSign);
  setRenderingGroup(welcomeSign, 3);

  const goalDef = LEVEL3.goal;
  const dada = createDad(scene, {
    x: goalDef.x,
    y: goalDef.y,
    z: LANE_Z,
    outfit: 'level3',
    shadowGen,
    animate: animateGoal,
    goalVolume: { width: 2.8, height: 4.8, depth: 2.8, yOffset: 1.55 },
  });
  setRenderingGroup(dada.root, 3);

  const checkpoints = [];
  for (let i = 0; i < LEVEL3.checkpoints.length; i++) {
    const cp = LEVEL3.checkpoints[i];
    const marker = createCheckpointMarker(scene, `cp3_${i}`, {
      x: cp.x,
      y: cp.y,
      z: 0.7,
      shadowGen,
    });
    setRenderingGroup(marker, 3);
    checkpoints.push({
      index: i + 1,
      label: cp.label || `Checkpoint ${i + 1}`,
      spawn: { x: cp.x, y: cp.y, z: cp.z },
      radius: 1.25,
      marker,
    });
  }

  const pickups = [];
  for (let i = 0; i < LEVEL3.pickups.length; i++) {
    const pick = LEVEL3.pickups[i];
    const node = createOnesiePickup(scene, `pickup3_${i}`, {
      x: pick.x,
      y: pick.y,
      z: LANE_Z,
      shadowGen,
    });
    node.position.z = LANE_Z;
    setRenderingGroup(node, 3);
    pickups.push({
      type: pick.type,
      radius: pick.radius,
      durationMs: pick.durationMs,
      jumpBoost: pick.jumpBoost,
      position: new BABYLON.Vector3(pick.x, pick.y, LANE_Z),
      node,
      collected: false,
    });
  }

  const coins = [];
  for (let i = 0; i < LEVEL3.coins.length; i++) {
    const coinDef = LEVEL3.coins[i];
    const node = createCoin(scene, `coin3_${i}`, { x: coinDef.x, y: coinDef.y, z: LANE_Z });
    node.position.z = LANE_Z;
    setRenderingGroup(node, 3);
    coins.push({
      position: new BABYLON.Vector3(coinDef.x, coinDef.y, LANE_Z),
      radius: 0.45,
      node,
      collected: false,
    });
  }

  const timedHazards = [];
  const toolHazards = [];
  const sprinklerCornAnchors = [];
  for (const sprinkler of LEVEL3.sprinklers) {
    const patchPlatform = getNearestPlatform(sprinkler.x, ['gardenStart', 'gardenRow1', 'gardenRow2', 'gardenRow3']) || LEVEL3.platforms[0];
    const patchTopY = getPlatformTopY(patchPlatform.name);
    const patchCenter = new BABYLON.Vector3(
      sprinkler.x + 0.82,
      patchTopY + 0.82,
      0.34,
    );
    const nozzleLocal = new BABYLON.Vector3(-0.42, 0.56, 1.52);
    const targetLocal = new BABYLON.Vector3(
      patchCenter.x - sprinkler.x,
      patchCenter.y - sprinkler.y,
      patchCenter.z,
    );
    const visual = createSprinklerVisual(scene, sprinkler.name, {
      x: sprinkler.x,
      y: sprinkler.y,
      z: 0,
      nozzleLocal,
      targetLocal,
    });
    setRenderingGroup(visual.root, 3);
    const patchRows = [-0.34, 0.34];
    const patchCols = [-0.76, 0, 0.76];
    let patchIndex = 0;
    for (const row of patchRows) {
      for (const col of patchCols) {
        const anchor = new BABYLON.TransformNode(`${sprinkler.name}_cornAnchor${patchIndex}`, scene);
        anchor.position.set(
          patchCenter.x + col,
          patchTopY,
          0.34 + row,
        );
        anchor.metadata = { ...(anchor.metadata || {}), cameraIgnore: true, decor: true };
        const fallback = createPlantPlaceholder(scene, `${sprinkler.name}_cornFallback${patchIndex}`, {
          x: anchor.position.x,
          y: anchor.position.y,
          z: anchor.position.z,
          kind: 'corn',
        });
        fallback.parent = anchor;
        fallback.position.set(0, 0, 0);
        sprinklerCornAnchors.push(anchor);
        patchIndex += 1;
      }
    }
    timedHazards.push({
      ...sprinkler,
      reason: 'sprinkler',
      statusText: 'Sprinkled!',
      root: visual.root,
      mesh: visual.streams[1],
      streamMeshes: visual.streams,
      active: false,
      handledByLevelRuntime: true,
      minX: patchCenter.x - 1.05,
      maxX: patchCenter.x + 1.05,
      minY: patchTopY + 0.10,
      maxY: patchCenter.y + 0.28,
      minZ: patchCenter.z - 1.05,
      maxZ: patchCenter.z + 1.05,
    });
  }

  // Rake moved to z=0 (player lane) so it is visible and collidable.
  // Leaned slightly toward the camera for readability.
  const rakeTopY = getPlatformTopY('tableStone1');
  const rakeAnchor = new BABYLON.TransformNode('l3_rakeAnchor', scene);
  rakeAnchor.position.set(22.6, rakeTopY, 0);
  rakeAnchor.rotation.y = 0.18;
  rakeAnchor.rotation.x = -0.28;   // lean handle toward camera
  rakeAnchor.metadata = { ...(rakeAnchor.metadata || {}), cameraIgnore: true, decor: true };
  const rakeFallback = createRakePlaceholder(scene, 'l3_rakeFallback', {
    x: rakeAnchor.position.x,
    y: rakeAnchor.position.y,
    z: rakeAnchor.position.z,
  });
  rakeFallback.parent = rakeAnchor;
  rakeFallback.position.set(0, 0, 0);
  setRenderingGroup(rakeAnchor, 3);
  toolHazards.push({
    name: 'rakeHazard',
    reason: 'rake',
    statusText: 'Watch the rake!',
    root: rakeAnchor,
    mesh: rakeFallback.getChildMeshes(false)[0] || null,
    active: true,
    handledByLevelRuntime: true,
    minX: rakeAnchor.position.x - 0.90,
    maxX: rakeAnchor.position.x + 0.90,
    minY: rakeTopY,
    maxY: rakeTopY + 1.30,
    minZ: -0.5,
    maxZ: 0.5,
  });

  const tractorAnchor = new BABYLON.TransformNode('l3_tractorAnchor', scene);
  tractorAnchor.position.set(31.2, getPlatformTopY('tableStone3'), 1.34);
  tractorAnchor.rotation.y = Math.PI;
  tractorAnchor.metadata = { ...(tractorAnchor.metadata || {}), cameraIgnore: true, decor: true };
  const tractorFallback = createTractorPlaceholder(scene, 'l3_tractorFallback', {
    x: tractorAnchor.position.x,
    y: tractorAnchor.position.y,
    z: tractorAnchor.position.z,
  });
  tractorFallback.parent = tractorAnchor;
  tractorFallback.position.set(0, 0, 0);
  setRenderingGroup(tractorAnchor, 3);
  toolHazards.push({
    name: 'tractorHazard',
    reason: 'tractor',
    statusText: 'Watch the tractor!',
    root: tractorAnchor,
    mesh: tractorFallback.getChildMeshes(false)[0] || null,
    active: true,
    handledByLevelRuntime: true,
    minX: tractorAnchor.position.x - 1.2,
    maxX: tractorAnchor.position.x + 1.2,
    minY: tractorAnchor.position.y,
    maxY: tractorAnchor.position.y + 1.44,
    minZ: tractorAnchor.position.z - 0.56,
    maxZ: tractorAnchor.position.z + 0.56,
  });

  const pigAnchor = new BABYLON.TransformNode('l3_pigAnchor', scene);
  pigAnchor.position.set(26.2, getPlatformTopY('tableStone2'), 0);
  pigAnchor.metadata = { ...(pigAnchor.metadata || {}), cameraIgnore: true, decor: true };
  const pigFallback = createCritterPlaceholder(scene, 'l3_pigFallback', {
    x: pigAnchor.position.x,
    y: pigAnchor.position.y,
    z: pigAnchor.position.z,
    kind: 'pig',
  });
  pigFallback.parent = pigAnchor;
  pigFallback.position.set(0, 0, 0);
  setRenderingGroup(pigAnchor, 3);
  toolHazards.push({
    name: 'pigHazard',
    reason: 'pig',
    statusText: 'Mind the pig!',
    root: pigAnchor,
    mesh: pigFallback.getChildMeshes(false)[0] || null,
    active: true,
    handledByLevelRuntime: true,
    minX: pigAnchor.position.x - 0.64,
    maxX: pigAnchor.position.x + 0.64,
    minY: pigAnchor.position.y,
    maxY: pigAnchor.position.y + 1.02,
    minZ: pigAnchor.position.z - 0.44,
    maxZ: pigAnchor.position.z + 0.44,
  });

  const bunnyAnchor = new BABYLON.TransformNode('l3_bunnyAnchor', scene);
  bunnyAnchor.position.set(59.2, getPlatformTopY('safeIsland'), 0);
  bunnyAnchor.metadata = { ...(bunnyAnchor.metadata || {}), cameraIgnore: true, decor: true };
  const bunnyFallback = createBunnyPlaceholder(scene, 'l3_bunnyFallback', {
    x: bunnyAnchor.position.x,
    y: bunnyAnchor.position.y,
    z: bunnyAnchor.position.z,
  });
  bunnyFallback.parent = bunnyAnchor;
  bunnyFallback.position.set(0, 0, 0);
  setRenderingGroup(bunnyAnchor, 3);
  toolHazards.push({
    name: 'bunnyHazard',
    reason: 'bunny',
    statusText: 'Hop past the bunny!',
    root: bunnyAnchor,
    mesh: bunnyFallback.getChildMeshes(false)[0] || null,
    active: true,
    handledByLevelRuntime: true,
    minX: bunnyAnchor.position.x - 0.58,
    maxX: bunnyAnchor.position.x + 0.58,
    minY: bunnyAnchor.position.y,
    maxY: bunnyAnchor.position.y + 0.88,
    minZ: bunnyAnchor.position.z - 0.40,
    maxZ: bunnyAnchor.position.z + 0.40,
  });

  const dogHazards = [];
  for (const lane of LEVEL3.dogLanes) {
    lane.dogs.forEach((dogDef, index) => {
      const root = createDogVisual(scene, `${lane.name}_${index}`, {
        x: dogDef.startX,
        y: lane.y,
        z: LANE_Z,
        color: index % 2 === 0 ? [0.69, 0.51, 0.33] : [0.32, 0.28, 0.26],
      });
      dogHazards.push({
        name: `${lane.name}_${index}`,
        lane,
        dir: dogDef.dir,
        startX: dogDef.startX,
        speed: Math.abs(lane.speed),
        root,
        mesh: root.getChildMeshes(false)[0] || null,
        width: 1.4,
        height: 1.0,
        yaw: dogDef.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
        active: true,
        handledByLevelRuntime: true,
        minX: dogDef.startX - 0.7,
        maxX: dogDef.startX + 0.7,
        minY: lane.y - 0.5,
        maxY: lane.y + 0.5,
      });
    });
  }

  // Grandma moved to crossingStart (orange platform) — away from dad's final porch.
  const porchTopY = getPlatformTopY('grandmaPorch');
  const crossingStartTopY = getPlatformTopY('crossingStart');
  const grandmaHazard = createGrandma(scene, {
    x: 43.0,
    y: crossingStartTopY,
    z: LANE_Z,
    shadowGen,
    animate: true,
  });
  markDecorative(grandmaHazard.root);
  setRenderingGroup(grandmaHazard.root, 3);
  const grandmaPatrol = {
    root: grandmaHazard.root,
    x: 43.0,
    minZ: -1.18,
    maxZ: 1.22,
    speed: 0.65,   // ~21% slower than before for passability
    dir: 1,
    width: 1.1,
    height: 3.0,
    depth: 0.9,
  };

  const hazards = [...timedHazards, ...toolHazards, ...dogHazards, {
    name: 'grandmaHazard',
    reason: 'grandma',
    root: grandmaPatrol.root,
    active: true,
    handledByLevelRuntime: true,
    minX: grandmaPatrol.x - grandmaPatrol.width * 0.5,
    maxX: grandmaPatrol.x + grandmaPatrol.width * 0.5,
    minY: crossingStartTopY,
    maxY: crossingStartTopY + grandmaPatrol.height,
    minZ: grandmaPatrol.minZ,
    maxZ: grandmaPatrol.maxZ,
  }];
  const decorControllers = [];

  function makeDecorAnimalAnchor(name, { x, y, z, kind, controller }) {
    const anchor = new BABYLON.TransformNode(name, scene);
    anchor.position.set(x, y, z);
    anchor.rotationQuaternion = null;
    const placeholder = kind === 'dog'
      ? createDogVisual(scene, `${name}_placeholder`, { x: 0, y: 0, z: 0 })
      : createCritterPlaceholder(scene, `${name}_placeholder`, { x: 0, y: 0, z: 0, kind });
    placeholder.parent = anchor;
    placeholder.position.set(0, 0, 0);
    markDecorative(anchor);
    setRenderingGroup(anchor, 3);
    if (controller) {
      decorControllers.push(new AnimalWanderController({
        root: anchor,
        home: new BABYLON.Vector3(x, y, z),
        surface: {
          type: 'floor',
          topY: y - 0.02,
          minX: controller.minX,
          maxX: controller.maxX,
          minZ: controller.minZ,
          maxZ: controller.maxZ,
          baseY: y,
        },
        speed: controller.speed,
        turnSpeed: controller.turnSpeed,
        radius: controller.radius,
        phase: controller.phase,
        yawOffset: controller.yawOffset ?? 0,
        bobAmp: controller.bobAmp,
        stepFreq: controller.stepFreq,
        pitchAmp: controller.pitchAmp,
        rollAmp: controller.rollAmp,
        accel: controller.accel,
        minWalkSpeed: controller.minWalkSpeed,
        seed: name,
      }));
    }
    return anchor;
  }

  function makePlantAnchor(name, { x, y, z, kind }) {
    const anchor = new BABYLON.TransformNode(name, scene);
    anchor.position.set(x, y, z);
    anchor.metadata = { ...(anchor.metadata || {}), cameraIgnore: true, decor: true };
    const fallback = createPlantPlaceholder(scene, `${name}_fallback`, {
      x,
      y,
      z,
      kind,
    });
    fallback.parent = anchor;
    fallback.position.set(0, 0, 0);
    return anchor;
  }

  const tulipAnchors = [
    makePlantAnchor('l3_tulipAnchor0', { x: -15.0, y: floorTopY, z: 1.44, kind: 'flower' }),
    makePlantAnchor('l3_tulipAnchor1', { x: 46.8, y: floorTopY, z: 1.50, kind: 'flower' }),
    makePlantAnchor('l3_tulipAnchor2', { x: 54.0, y: floorTopY, z: 1.48, kind: 'flower' }),
    makePlantAnchor('l3_tulipAnchor3', { x: 68.6, y: floorTopY, z: 1.52, kind: 'flower' }),
  ];
  const yellowFlowerAnchors = [
    makePlantAnchor('l3_yellowFlowerAnchor0', { x: -8.2, y: floorTopY, z: 1.38, kind: 'yellow' }),
    makePlantAnchor('l3_yellowFlowerAnchor1', { x: 49.8, y: floorTopY, z: 1.42, kind: 'yellow' }),
    makePlantAnchor('l3_yellowFlowerAnchor2', { x: 58.6, y: floorTopY, z: 1.44, kind: 'yellow' }),
    makePlantAnchor('l3_yellowFlowerAnchor3', { x: 70.8, y: floorTopY, z: 1.36, kind: 'yellow' }),
  ];
  const extraCornAnchors = [
    makePlantAnchor('l3_cornAnchor0', { x: 16.6, y: floorTopY, z: 1.86, kind: 'corn' }),
    makePlantAnchor('l3_cornAnchor1', { x: 47.8, y: floorTopY, z: 1.84, kind: 'corn' }),
    makePlantAnchor('l3_cornAnchor2', { x: 66.2, y: floorTopY, z: 1.94, kind: 'corn' }),
    makePlantAnchor('l3_cornAnchor3', { x: 69.4, y: floorTopY, z: 1.90, kind: 'corn' }),
  ];
  const cornAnchors = [...sprinklerCornAnchors, ...extraCornAnchors];

  const decorDogAnchors = [
    makeDecorAnimalAnchor('l3_huskyAnchor', {
      x: -10.6, y: floorTopY, z: -1.26, kind: 'dog', controller: {
        minX: -14.4, maxX: -6.2, minZ: -1.9, maxZ: -0.7, speed: 0.54, turnSpeed: 6.0, radius: 1.2, phase: 0.2, yawOffset: -Math.PI * 0.5, bobAmp: 0.02, stepFreq: 6.2, pitchAmp: 0.02, rollAmp: 0.024, accel: 6.5, minWalkSpeed: 0.02,
      },
    }),
    makeDecorAnimalAnchor('l3_playfulAnchor', {
      x: 24.8, y: floorTopY, z: -1.18, kind: 'dog', controller: {
        minX: 20.0, maxX: 29.2, minZ: -1.8, maxZ: -0.7, speed: 0.58, turnSpeed: 6.3, radius: 1.26, phase: 0.7, yawOffset: -Math.PI * 0.5, bobAmp: 0.02, stepFreq: 6.8, pitchAmp: 0.022, rollAmp: 0.026, accel: 6.8, minWalkSpeed: 0.02,
      },
    }),
    makeDecorAnimalAnchor('l3_taterAnchor', {
      x: 63.8, y: floorTopY, z: -1.22, kind: 'dog', controller: {
        minX: 60.4, maxX: 69.8, minZ: -1.8, maxZ: -0.7, speed: 0.52, turnSpeed: 5.8, radius: 1.18, phase: 1.4, yawOffset: -Math.PI * 0.5, bobAmp: 0.02, stepFreq: 6.0, pitchAmp: 0.018, rollAmp: 0.022, accel: 6.0, minWalkSpeed: 0.02,
      },
    }),
  ];

  const endAnimalAnchors = [
    makeDecorAnimalAnchor('l3_endChickensAnchor', {
      x: 72.4, y: porchTopY, z: -1.14, kind: 'chicken', controller: {
        minX: 70.1, maxX: 75.8, minZ: -1.8, maxZ: -0.5, speed: 0.72, turnSpeed: 7.2, radius: 0.72, phase: 0.3, bobAmp: 0.028, stepFreq: 11.0, pitchAmp: 0.03, rollAmp: 0.018, accel: 8.2, minWalkSpeed: 0.025,
      },
    }),
    makeDecorAnimalAnchor('l3_endGoatAnchor', {
      x: 74.5, y: porchTopY, z: -1.32, kind: 'goat', controller: {
        minX: 72.0, maxX: 78.8, minZ: -1.9, maxZ: -0.6, speed: 0.5, turnSpeed: 6.0, radius: 0.92, phase: 1.2, bobAmp: 0.024, stepFreq: 6.4, pitchAmp: 0.018, rollAmp: 0.024, accel: 6.4, minWalkSpeed: 0.02,
      },
    }),
    makeDecorAnimalAnchor('l3_endTurkeyAnchor', {
      x: 76.8, y: porchTopY, z: -1.18, kind: 'turkey', controller: {
        minX: 74.4, maxX: 79.6, minZ: -1.8, maxZ: -0.6, speed: 0.46, turnSpeed: 5.4, radius: 0.82, phase: 2.0, bobAmp: 0.02, stepFreq: 5.2, pitchAmp: 0.016, rollAmp: 0.024, accel: 5.8, minWalkSpeed: 0.02,
      },
    }),
  ];

  const hayDecor = [
    createHayBale(scene, 'l3_hay0', { x: -15.2, y: floorTopY, z: 2.2, scale: 0.9 }),
    createHayBale(scene, 'l3_hay1', { x: 17.4, y: getPlatformTopY('tableEntry'), z: 2.1, scale: 0.78 }),
    createHayBale(scene, 'l3_hay2', { x: 69.2, y: floorTopY, z: 2.3, scale: 1.0 }),
    createHayBale(scene, 'l3_hay3', { x: 47.4, y: floorTopY, z: 2.18, scale: 0.86 }),
    createHayBale(scene, 'l3_hay4', { x: 61.8, y: floorTopY, z: 2.32, scale: 0.94 }),
  ];
  hayDecor.forEach((item) => setRenderingGroup(item, 2));

  const fenceDecor = [];
  for (let i = 0; i < 7; i++) {
    const fence = BABYLON.MeshBuilder.CreateBox(`l3_fence_${i}`, {
      width: 4.4,
      height: 1.2,
      depth: 0.12,
    }, scene);
    fence.position.set(-14 + (i * 15.2), floorTopY + 0.62, 2.9 + (i * 0.05));
    fence.material = makeCardboard(scene, `l3_fenceMat_${i}`, 206, 190, 164, { roughness: 0.94 });
    markDecorative(fence);
    fenceDecor.push(fence);
  }

  let runtimeMs = 0;

  function updateTimedHazardState(hazard) {
    const cycleMs = hazard.onMs + hazard.offMs;
    const cycleTime = (runtimeMs + hazard.phaseMs) % cycleMs;
    hazard.active = cycleTime < hazard.onMs;
    hazard.root.setEnabled(true);
    if (hazard.streamMeshes?.length) {
      for (const stream of hazard.streamMeshes) {
        stream.visibility = hazard.active ? 0.74 : 0.10;
        stream.isVisible = true;
      }
    } else {
      hazard.mesh.visibility = hazard.active ? 0.88 : 0.16;
      hazard.mesh.isVisible = true;
    }
  }

  function updateDogHazard(dog, dt) {
    const halfW = dog.width * 0.5;
    dog.root.position.x += dog.speed * dog.dir * dt;
    if (dog.dir > 0 && dog.root.position.x > dog.lane.maxX + halfW) {
      dog.root.position.x = dog.lane.minX - halfW;
    } else if (dog.dir < 0 && dog.root.position.x < dog.lane.minX - halfW) {
      dog.root.position.x = dog.lane.maxX + halfW;
    }
    dog.minX = dog.root.position.x - halfW;
    dog.maxX = dog.root.position.x + halfW;
    dog.minY = dog.root.position.y - dog.height * 0.5;
    dog.maxY = dog.root.position.y + dog.height * 0.5;
    const desiredYaw = Math.atan2(dog.speed * dog.dir, 0.0001) - (Math.PI * 0.5);
    let delta = desiredYaw - dog.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    dog.yaw += delta * Math.min(1, dt * 6.0);
    dog.root.rotationQuaternion = null;
    dog.root.rotation.y = dog.yaw;
  }

  function updateGrandmaHazard(dt) {
    const halfW = grandmaPatrol.width * 0.5;
    const halfD = grandmaPatrol.depth * 0.5;
    grandmaPatrol.root.position.x = grandmaPatrol.x;
    grandmaPatrol.root.position.z += grandmaPatrol.speed * grandmaPatrol.dir * dt;
    if (grandmaPatrol.dir > 0 && grandmaPatrol.root.position.z > grandmaPatrol.maxZ - halfD) {
      grandmaPatrol.root.position.z = grandmaPatrol.maxZ - halfD;
      grandmaPatrol.dir = -1;
    } else if (grandmaPatrol.dir < 0 && grandmaPatrol.root.position.z < grandmaPatrol.minZ + halfD) {
      grandmaPatrol.root.position.z = grandmaPatrol.minZ + halfD;
      grandmaPatrol.dir = 1;
    }
    grandmaPatrol.root.rotationQuaternion = null;
    grandmaPatrol.root.rotation.y = grandmaPatrol.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    grandmaPatrol.minHitX = grandmaPatrol.root.position.x - halfW;
    grandmaPatrol.maxHitX = grandmaPatrol.root.position.x + halfW;
    grandmaPatrol.minHitY = grandmaPatrol.root.position.y;
    grandmaPatrol.maxHitY = grandmaPatrol.root.position.y + grandmaPatrol.height;
    grandmaPatrol.minHitZ = grandmaPatrol.root.position.z - halfD;
    grandmaPatrol.maxHitZ = grandmaPatrol.root.position.z + halfD;
  }

  const level3 = {
    update(dt, { pos, triggerReset, player }) {
      runtimeMs += dt * 1000;
      const { halfW, halfH } = player.getCollisionHalfExtents();
      const playerMinX = pos.x - halfW;
      const playerMaxX = pos.x + halfW;
      const playerMinY = pos.y - halfH;
      const playerMaxY = pos.y + halfH;
      const playerMinZ = pos.z - halfW;
      const playerMaxZ = pos.z + halfW;

      for (const hazard of timedHazards) {
        updateTimedHazardState(hazard);
        if (!hazard.active) continue;
        const overlaps = playerMaxX > hazard.minX
          && playerMinX < hazard.maxX
          && playerMaxY > hazard.minY
          && playerMinY < hazard.maxY
          && (hazard.minZ === undefined || (playerMaxZ > hazard.minZ && playerMinZ < hazard.maxZ));
        if (overlaps) {
          const sourceX = Number.isFinite(hazard.x) ? hazard.x : hazard.root.position.x;
          triggerReset(hazard.reason, pos.x < sourceX ? -1 : 1);
        }
      }

      for (const hazard of toolHazards) {
        if (!hazard.active) continue;
        const overlaps = playerMaxX > hazard.minX
          && playerMinX < hazard.maxX
          && playerMaxY > hazard.minY
          && playerMinY < hazard.maxY
          && (hazard.minZ === undefined || (playerMaxZ > hazard.minZ && playerMinZ < hazard.maxZ));
        if (overlaps) {
          const sourceX = Number.isFinite(hazard.x) ? hazard.x : (hazard.root?.position?.x ?? pos.x);
          triggerReset(hazard.reason, pos.x < sourceX ? -1 : 1);
        }
      }

      for (const dog of dogHazards) {
        updateDogHazard(dog, dt);
        const overlaps = playerMaxX > dog.minX
          && playerMinX < dog.maxX
          && playerMaxY > dog.minY
          && playerMinY < dog.maxY
          && (dog.minZ === undefined || (playerMaxZ > dog.minZ && playerMinZ < dog.maxZ));
        if (overlaps) {
          triggerReset('dog', pos.x < dog.root.position.x ? -1 : 1);
        }
      }

      updateGrandmaHazard(dt);
      const grandmaOverlaps = playerMaxX > grandmaPatrol.minHitX
        && playerMinX < grandmaPatrol.maxHitX
        && playerMaxY > grandmaPatrol.minHitY
        && playerMinY < grandmaPatrol.maxHitY
        && playerMaxZ > grandmaPatrol.minHitZ
        && playerMinZ < grandmaPatrol.maxHitZ;
      if (grandmaOverlaps) {
        triggerReset('grandma', pos.x < grandmaPatrol.root.position.x ? -1 : 1);
      }

      for (const controller of decorControllers) {
        controller.update(dt);
      }
    },
    reset() {
      runtimeMs = 0;
      for (const hazard of timedHazards) {
        hazard.active = false;
        hazard.mesh.visibility = 0.16;
        hazard.root.setEnabled(true);
      }
      for (const dog of dogHazards) {
        dog.root.position.x = dog.startX;
        dog.root.position.y = dog.lane.y;
        dog.yaw = dog.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        dog.minX = dog.startX - dog.width * 0.5;
        dog.maxX = dog.startX + dog.width * 0.5;
        dog.minY = dog.lane.y - dog.height * 0.5;
        dog.maxY = dog.lane.y + dog.height * 0.5;
      }
      grandmaPatrol.root.position.x = 43.0;
      grandmaPatrol.root.position.y = getPlatformTopY('crossingStart');
      grandmaPatrol.root.position.z = 0.86;
      grandmaPatrol.dir = 1;
      updateGrandmaHazard(0);
      for (const controller of decorControllers) {
        controller.reset();
      }
    },
  };

  level3.reset();

  return {
    ground: groundCollider,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL3.extents,
    spawn: LEVEL3.spawn,
    checkpoints,
    pickups,
    coins,
    hazards,
    crumbles: [],
    level: LEVEL3,
    signs: [],
    level3,
    goalGuardMinX: goalDef.x - 4.5,
    goalMinBottomY: (LEVEL3.platforms.find((p) => p.name === 'grandmaPorch').y + (LEVEL3.platforms.find((p) => p.name === 'grandmaPorch').h * 0.5)) - 0.2,
    assetAnchors: {
      cribRail: null,
      toyBlocks: [],
      goalBanner: null,
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
      futureTulipFlowerPropModel: tulipAnchors,
      futureYellowFlowerPropModel: yellowFlowerAnchors,
      futureCornPropModel: cornAnchors,
      futureHuskyDogPropModel: [decorDogAnchors[0]],
      futurePlayfulDogPropModel: [decorDogAnchors[1]],
      futureTaterDogPropModel: [decorDogAnchors[2]],
      futureChickensPropModel: [endAnimalAnchors[0]],
      futureGoatPropModel: [endAnimalAnchors[1]],
      futureTurkeyPropModel: [endAnimalAnchors[2]],
      futurePigPropModel: [pigAnchor],
      futureRakePropModel: [rakeAnchor],
      futureTractorPropModel: [tractorAnchor],
      futureBunnyPropModel: [bunnyAnchor],
    },
  };
}
