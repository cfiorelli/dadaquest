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
  setRenderingGroup,
} from './buildWorld.js';
import { createDad } from './characters.js';

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
    };
  }
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
  width,
  height,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const hose = BABYLON.MeshBuilder.CreateCylinder(`${name}_hose`, {
    height: 1.3,
    diameter: 0.08,
    tessellation: 10,
  }, scene);
  hose.parent = root;
  hose.position.set(-0.34, -0.24, 0);
  hose.rotation.z = -0.76;
  hose.material = makePlastic(scene, `${name}_hoseMat`, 0.27, 0.58, 0.18, { roughness: 0.56 });

  const stand = BABYLON.MeshBuilder.CreateCylinder(`${name}_stand`, {
    height: 0.48,
    diameter: 0.16,
    tessellation: 12,
  }, scene);
  stand.parent = root;
  stand.position.y = -(height * 0.5) + 0.24;
  stand.material = makeCardboard(scene, `${name}_standMat`, 116, 108, 96, { roughness: 0.92 });

  const head = BABYLON.MeshBuilder.CreateCylinder(`${name}_head`, {
    height: 0.28,
    diameter: 0.2,
    tessellation: 12,
  }, scene);
  head.parent = root;
  head.position.set(0, height * 0.5 - 0.14, 0);
  head.rotation.z = Math.PI / 2;
  head.material = makePlastic(scene, `${name}_headMat`, 0.62, 0.68, 0.72, { roughness: 0.46 });

  const streamMat = new BABYLON.StandardMaterial(`${name}_streamMat`, scene);
  streamMat.diffuseColor = new BABYLON.Color3(0.56, 0.80, 0.98);
  streamMat.emissiveColor = new BABYLON.Color3(0.16, 0.34, 0.46);
  streamMat.specularColor = BABYLON.Color3.Black();
  streamMat.alpha = 0.28;
  streamMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const streams = [];
  for (const offset of [-0.3, 0, 0.3]) {
    const stream = BABYLON.MeshBuilder.CreatePlane(`${name}_stream${offset}`, {
      width: Math.max(0.22, width * 0.45),
      height,
    }, scene);
    stream.parent = root;
    stream.position.set(offset, 0, 0);
    stream.rotation.z = offset * 0.18;
    stream.material = streamMat;
    streams.push(stream);
  }

  markDecorative(root);
  return { root, streams };
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

function createGrandmaBackdrop(scene, shadowGen) {
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop3', {
    width: 110,
    height: 24,
    depth: 0.5,
  }, scene);
  backdrop.position.set(28, 9.5, 9.2);
  backdrop.material = makePaper(scene, 'backdrop3Mat', 234, 221, 204, {
    roughness: 0.98,
    grainScale: 2.6,
    noiseAmt: 12,
  });
  backdrop.receiveShadows = true;

  const barn = BABYLON.MeshBuilder.CreateBox('grandmaBarnSilhouette', {
    width: 13,
    height: 7.8,
    depth: 0.8,
  }, scene);
  barn.position.set(75, 5.0, 6.8);
  barn.material = makeCardboard(scene, 'grandmaBarnMat', 176, 116, 88, { roughness: 0.9 });
  barn.receiveShadows = true;
  shadowGen.addShadowCaster(barn);

  const roof = BABYLON.MeshBuilder.CreateCylinder('grandmaRoof', {
    diameterTop: 0,
    diameterBottom: 10.4,
    height: 4.2,
    tessellation: 3,
  }, scene);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(75.4, 9.0, 6.9);
  roof.material = makeCardboard(scene, 'grandmaRoofMat', 162, 86, 64, { roughness: 0.88 });
  roof.receiveShadows = true;
  shadowGen.addShadowCaster(roof);

  const silo = BABYLON.MeshBuilder.CreateCylinder('grandmaSilo', {
    diameter: 2.4,
    height: 8.2,
    tessellation: 18,
  }, scene);
  silo.position.set(67.8, 4.2, 7.0);
  silo.material = makeCardboard(scene, 'grandmaSiloMat', 196, 188, 176, { roughness: 0.94 });
  markDecorative(silo);

  const gardenFence = BABYLON.MeshBuilder.CreateBox('gardenFence3', {
    width: 22,
    height: 2.6,
    depth: 0.4,
  }, scene);
  gardenFence.position.set(-8.0, 1.0, 6.6);
  gardenFence.material = makeCardboard(scene, 'gardenFence3Mat', 208, 191, 172, { roughness: 0.92 });
  gardenFence.receiveShadows = true;
  markDecorative(gardenFence);

  const goalBanner = BABYLON.MeshBuilder.CreatePlane('grandmaGoalBanner', {
    width: 4.4,
    height: 1.0,
  }, scene);
  goalBanner.position.set(74.8, 9.2, 5.9);
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
  bannerPoleLeft.position.set(72.7, 8.75, 6.0);
  bannerPoleLeft.material = makeCardboard(scene, 'grandmaGoalPoleLMat', 156, 112, 88, { roughness: 0.88 });
  markDecorative(bannerPoleLeft);

  const bannerPoleRight = BABYLON.MeshBuilder.CreateBox('grandmaGoalPoleR', {
    width: 0.12,
    height: 1.5,
    depth: 0.12,
  }, scene);
  bannerPoleRight.position.set(76.9, 8.75, 6.0);
  bannerPoleRight.material = makeCardboard(scene, 'grandmaGoalPoleRMat', 156, 112, 88, { roughness: 0.88 });
  markDecorative(bannerPoleRight);

  for (let i = 0; i < 6; i++) {
    const tree = BABYLON.MeshBuilder.CreateCylinder(`farmTree_${i}`, {
      diameterTop: 0.2,
      diameterBottom: 0.34,
      height: 3.2,
      tessellation: 8,
    }, scene);
    tree.position.set(-8 + (i * 24), 2.1, 7.6 + (i * 0.08));
    tree.material = makeCardboard(scene, `farmTreeTrunkMat_${i}`, 110, 82, 58, { roughness: 0.92 });
    markDecorative(tree);

    const canopy = BABYLON.MeshBuilder.CreateSphere(`farmTreeCanopy_${i}`, {
      diameter: 2.4,
      segments: 10,
    }, scene);
    canopy.position.set(tree.position.x, 4.2, tree.position.z - 0.06);
    canopy.material = makePaper(scene, `farmTreeCanopyMat_${i}`, 142, 174, 112, {
      roughness: 0.98,
      grainScale: 2.4,
      noiseAmt: 10,
    });
    markDecorative(canopy);
  }

  for (const [index, x] of [-12, 14, 42, 70].entries()) {
    const fence = BABYLON.MeshBuilder.CreateBox(`grandmaBackdropFence_${index}`, {
      width: 18,
      height: 1.8,
      depth: 0.18,
    }, scene);
    fence.position.set(x, 1.2, 6.2 + (index * 0.12));
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
  createCardboardPlatform(scene, 'ground3', {
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

  const groundCollider = makeInvisibleCollider(scene, 'groundCol3', groundDef);
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
  for (const sprinkler of LEVEL3.sprinklers) {
    const visual = createSprinklerVisual(scene, sprinkler.name, {
      x: sprinkler.x,
      y: sprinkler.y,
      z: LANE_Z,
      width: sprinkler.width,
      height: sprinkler.height,
    });
    setRenderingGroup(visual.root, 3);
    timedHazards.push({
      ...sprinkler,
      reason: 'sprinkler',
      statusText: 'Sprinkled!',
      root: visual.root,
      mesh: visual.streams[1],
      streamMeshes: visual.streams,
      active: false,
      handledByLevelRuntime: true,
      minX: sprinkler.x - sprinkler.width * 0.5,
      maxX: sprinkler.x + sprinkler.width * 0.5,
      minY: sprinkler.y - sprinkler.height * 0.5,
      maxY: sprinkler.y + sprinkler.height * 0.5,
    });
  }
  for (const vent of LEVEL3.steamVents) {
    const visual = createSteamHazardVisual(scene, vent.name, {
      x: vent.x,
      y: vent.y,
      z: LANE_Z,
      width: vent.width,
      height: vent.height,
      color: [0.92, 0.90, 0.84],
      warm: true,
    });
    setRenderingGroup(visual.root, 3);
    timedHazards.push({
      ...vent,
      reason: 'steam',
      statusText: 'Too hot!',
      root: visual.root,
      mesh: visual.column,
      active: false,
      handledByLevelRuntime: true,
      minX: vent.x - vent.width * 0.5,
      maxX: vent.x + vent.width * 0.5,
      minY: vent.y - vent.height * 0.5,
      maxY: vent.y + vent.height * 0.5,
    });
  }

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
        active: true,
        handledByLevelRuntime: true,
        minX: dogDef.startX - 0.7,
        maxX: dogDef.startX + 0.7,
        minY: lane.y - 0.5,
        maxY: lane.y + 0.5,
      });
    });
  }

  const hazards = [...timedHazards, ...dogHazards];
  const floorTopY = groundDef.y + (groundDef.h * 0.5) + 0.02;
  const porchTopY = LEVEL3.platforms.find((p) => p.name === 'grandmaPorch').y + 0.42;
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

  const tulipAnchors = [
    new BABYLON.TransformNode('l3_tulipAnchor0', scene),
    new BABYLON.TransformNode('l3_tulipAnchor1', scene),
  ];
  const yellowFlowerAnchors = [
    new BABYLON.TransformNode('l3_yellowFlowerAnchor0', scene),
    new BABYLON.TransformNode('l3_yellowFlowerAnchor1', scene),
  ];
  const cornAnchors = [
    new BABYLON.TransformNode('l3_cornAnchor0', scene),
    new BABYLON.TransformNode('l3_cornAnchor1', scene),
    new BABYLON.TransformNode('l3_cornAnchor2', scene),
    new BABYLON.TransformNode('l3_cornAnchor3', scene),
  ];
  tulipAnchors[0].position.set(-13.8, floorTopY, 1.5);
  tulipAnchors[1].position.set(47.8, floorTopY, 1.5);
  yellowFlowerAnchors[0].position.set(-7.4, floorTopY, 1.4);
  yellowFlowerAnchors[1].position.set(58.6, floorTopY, 1.4);
  cornAnchors[0].position.set(-12.1, floorTopY, 1.9);
  cornAnchors[1].position.set(-6.3, floorTopY, 1.95);
  cornAnchors[2].position.set(16.6, floorTopY, 1.88);
  cornAnchors[3].position.set(66.2, floorTopY, 1.96);

  for (const anchor of [...tulipAnchors, ...yellowFlowerAnchors, ...cornAnchors]) {
    anchor.metadata = { ...(anchor.metadata || {}), cameraIgnore: true };
  }

  tulipAnchors.forEach((anchor, index) => {
    const fallback = createPlantPlaceholder(scene, `l3_tulipFallback${index}`, {
      x: anchor.position.x,
      y: anchor.position.y,
      z: anchor.position.z,
      kind: 'flower',
    });
    fallback.parent = anchor;
    fallback.position.set(0, 0, 0);
  });
  yellowFlowerAnchors.forEach((anchor, index) => {
    const fallback = createPlantPlaceholder(scene, `l3_yellowFallback${index}`, {
      x: anchor.position.x,
      y: anchor.position.y,
      z: anchor.position.z,
      kind: 'yellow',
    });
    fallback.parent = anchor;
    fallback.position.set(0, 0, 0);
  });
  cornAnchors.forEach((anchor, index) => {
    const fallback = createPlantPlaceholder(scene, `l3_cornFallback${index}`, {
      x: anchor.position.x,
      y: anchor.position.y,
      z: anchor.position.z,
      kind: 'corn',
    });
    fallback.parent = anchor;
    fallback.position.set(0, 0, 0);
  });

  const decorDogAnchors = [
    makeDecorAnimalAnchor('l3_huskyAnchor', {
      x: -10.6, y: floorTopY, z: -1.26, kind: 'dog', controller: {
        minX: -14.4, maxX: -6.2, minZ: -1.9, maxZ: -0.7, speed: 0.54, turnSpeed: 6.0, radius: 1.2, phase: 0.2, bobAmp: 0.02, stepFreq: 6.2, pitchAmp: 0.02, rollAmp: 0.024, accel: 6.5, minWalkSpeed: 0.02,
      },
    }),
    makeDecorAnimalAnchor('l3_playfulAnchor', {
      x: 24.8, y: floorTopY, z: -1.18, kind: 'dog', controller: {
        minX: 20.0, maxX: 29.2, minZ: -1.8, maxZ: -0.7, speed: 0.58, turnSpeed: 6.3, radius: 1.26, phase: 0.7, bobAmp: 0.02, stepFreq: 6.8, pitchAmp: 0.022, rollAmp: 0.026, accel: 6.8, minWalkSpeed: 0.02,
      },
    }),
    makeDecorAnimalAnchor('l3_taterAnchor', {
      x: 63.8, y: floorTopY, z: -1.22, kind: 'dog', controller: {
        minX: 60.4, maxX: 69.8, minZ: -1.8, maxZ: -0.7, speed: 0.52, turnSpeed: 5.8, radius: 1.18, phase: 1.4, bobAmp: 0.02, stepFreq: 6.0, pitchAmp: 0.018, rollAmp: 0.022, accel: 6.0, minWalkSpeed: 0.02,
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
    createHayBale(scene, 'l3_hay1', { x: 17.4, y: LEVEL3.platforms.find((p) => p.name === 'tableEntry').y + 0.42, z: 2.1, scale: 0.78 }),
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
  }

  const level3 = {
    update(dt, { pos, triggerReset, player }) {
      runtimeMs += dt * 1000;
      const { halfW, halfH } = player.getCollisionHalfExtents();
      const playerMinX = pos.x - halfW;
      const playerMaxX = pos.x + halfW;
      const playerMinY = pos.y - halfH;
      const playerMaxY = pos.y + halfH;

      for (const hazard of timedHazards) {
        updateTimedHazardState(hazard);
        if (!hazard.active) continue;
        const overlaps = playerMaxX > hazard.minX
          && playerMinX < hazard.maxX
          && playerMaxY > hazard.minY
          && playerMinY < hazard.maxY;
        if (overlaps) {
          triggerReset(hazard.reason, pos.x < hazard.x ? -1 : 1);
        }
      }

      for (const dog of dogHazards) {
        updateDogHazard(dog, dt);
        const overlaps = playerMaxX > dog.minX
          && playerMinX < dog.maxX
          && playerMaxY > dog.minY
          && playerMinY < dog.maxY;
        if (overlaps) {
          triggerReset('dog', pos.x < dog.root.position.x ? -1 : 1);
        }
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
        dog.minX = dog.startX - dog.width * 0.5;
        dog.maxX = dog.startX + dog.width * 0.5;
        dog.minY = dog.lane.y - dog.height * 0.5;
        dog.maxY = dog.lane.y + dog.height * 0.5;
      }
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
    },
  };
}
