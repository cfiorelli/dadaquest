import * as BABYLON from '@babylonjs/core';
import { LEVEL4, LANE_Z4 } from './level4.js';
import {
  createCardboardPlatform,
  createCheckpointMarker,
  createCoin,
  createOnesiePickup,
  createWelcomeSign,
  setRenderingGroup,
} from './buildWorld.js';
import { createDad } from './characters.js';
import { makePlastic, makePaper, makeCardboard } from '../materials.js';

const LANE_Z = LANE_Z4;

const P4 = {
  dough: [224, 159, 83],
  doughEdge: [132, 74, 40],
  glaze: [233, 219, 194],
  teal: [67, 196, 182],
  tealDark: [23, 92, 86],
  ember: [240, 120, 66],
  void: [27, 18, 28],
};

function markDecor(node) {
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
      decor: true,
    };
  }
}

function makeSourdoughMaterial(scene, name, rgb, emissive = 0.0) {
  const mat = makePlastic(scene, name, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness: 0.45 });
  mat.emissiveColor = new BABYLON.Color3(
    (rgb[0] / 255) * emissive,
    (rgb[1] / 255) * emissive,
    (rgb[2] / 255) * emissive,
  );
  return mat;
}

function createSourdoughPlatform(scene, name, def, shadowGen) {
  const root = createCardboardPlatform(scene, `L4_${name}`, {
    x: def.x,
    y: def.y,
    z: def.z ?? LANE_Z,
    w: def.w,
    h: def.h,
    d: def.d,
    slabColor: P4.dough,
    edgeColor: P4.doughEdge,
    shadowGen,
  });
  const slab = root.getChildMeshes(false)[0];
  if (slab?.material) {
    slab.material = makeSourdoughMaterial(scene, `${name}_slabMat`, P4.dough, 0.05);
  }
  const edge = root.getChildMeshes(false)[1];
  if (edge?.material) {
    edge.material = makeSourdoughMaterial(scene, `${name}_edgeMat`, P4.doughEdge, 0.0);
  }

  const glowStrip = BABYLON.MeshBuilder.CreatePlane(`${name}_glow`, {
    width: Math.max(0.8, def.w - 0.3),
    height: 0.28,
  }, scene);
  glowStrip.rotation.x = Math.PI / 2;
  glowStrip.position.set(0, def.h * 0.5 + 0.012, -def.d * 0.24);
  glowStrip.parent = root;
  const glowMat = new BABYLON.StandardMaterial(`${name}_glowMat`, scene);
  glowMat.diffuseColor = new BABYLON.Color3(P4.teal[0] / 255, P4.teal[1] / 255, P4.teal[2] / 255);
  glowMat.emissiveColor = new BABYLON.Color3(0.24, 0.62, 0.56);
  glowMat.alpha = 0.55;
  glowMat.backFaceCulling = false;
  glowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  glowStrip.material = glowMat;
  markDecor(glowStrip);

  return root;
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

// ─────────────────────────────────────────────────────────────────────────────
// BREAD / TOASTER RAIN — Level 4 background decoration
// ─────────────────────────────────────────────────────────────────────────────
/*
 * 16-bit palette (7 flat unlit colours, shared across all rain objects):
 *   Bread:   CRUST #C8733A  DOME #E8A454  DARK #7A3E18
 *   Toaster: BODY  #5A8090  TRIM #2E4A58  KNOB #D4B86A  SLOT #111826
 *
 * Three depth layers (all Z behind gameplay lane Z ≈ 0):
 *   FAR  Z -26…-30  scale 0.58×  speed ×0.72  brightness 0.50  48 objects
 *   MID  Z -21…-25  scale 0.90×  speed ×1.00  brightness 0.75  48 objects
 *   NEAR Z -17…-20  scale 1.22×  speed ×1.28  brightness 1.00  24 objects
 *
 * Pool: 120 objects (60 loaves + 60 toasters), allocated once at startup,
 * recycled by resetting Y when an object drops below RAIN_BOT_Y.
 * Tune via RAIN_LAYERS, RAIN_TOP_Y, RAIN_BOT_Y below.
 */

const RAIN_RC = {
  breadCrust: [0.784, 0.451, 0.227],  // #C8733A
  breadDome:  [0.910, 0.643, 0.329],  // #E8A454
  breadDark:  [0.478, 0.243, 0.094],  // #7A3E18
  toastBody:  [0.353, 0.502, 0.565],  // #5A8090
  toastTrim:  [0.180, 0.290, 0.345],  // #2E4A58
  toastKnob:  [0.831, 0.722, 0.416],  // #D4B86A
  toastSlot:  [0.067, 0.094, 0.149],  // #111826
};

const RAIN_LAYERS = [
  { zNear: -26, zFar: -30, scaleBase: 0.58, speedMul: 0.72, bri: 0.50, count: 48 },
  { zNear: -21, zFar: -25, scaleBase: 0.90, speedMul: 1.00, bri: 0.75, count: 48 },
  { zNear: -17, zFar: -20, scaleBase: 1.22, speedMul: 1.28, bri: 1.00, count: 24 },
];
const RAIN_TOP_Y  =  32;
const RAIN_BOT_Y  = -10;
const RAIN_X_MIN  = -32;
const RAIN_X_MAX  = 100;
const RAIN_SPD_LO =   6;  // base fall speed range (u/s) before layer multiplier
const RAIN_SPD_HI =  10;

function _rainMat(scene, name, r, g, b, bri) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.disableLighting = true;
  mat.emissiveColor = new BABYLON.Color3(r * bri, g * bri, b * bri);
  return mat;
}

function _rainDecor(node) {
  node.isPickable = false;
  node.checkCollisions = false;
  node.metadata = { cameraIgnore: true, decor: true };
}

function createBreadRainSystem(scene) {
  // Pre-build 21 shared materials (7 types × 3 layers).
  const M = {};
  for (let li = 0; li < RAIN_LAYERS.length; li++) {
    const bri = RAIN_LAYERS[li].bri;
    M[`lB${li}`]  = _rainMat(scene, `L4r_lB${li}`,  ...RAIN_RC.breadCrust, bri);
    M[`lD${li}`]  = _rainMat(scene, `L4r_lD${li}`,  ...RAIN_RC.breadDome,  bri);
    M[`lS${li}`]  = _rainMat(scene, `L4r_lS${li}`,  ...RAIN_RC.breadDark,  bri);
    M[`tC${li}`]  = _rainMat(scene, `L4r_tC${li}`,  ...RAIN_RC.toastBody,  bri);
    M[`tTr${li}`] = _rainMat(scene, `L4r_tTr${li}`, ...RAIN_RC.toastTrim,  bri);
    M[`tK${li}`]  = _rainMat(scene, `L4r_tK${li}`,  ...RAIN_RC.toastKnob,  bri);
    M[`tSl${li}`] = _rainMat(scene, `L4r_tSl${li}`, ...RAIN_RC.toastSlot,  bri);
  }

  // Build a chunky 16-bit loaf node: body box + dome cap + score slash.
  function buildLoaf(name, li) {
    const root = new BABYLON.TransformNode(name, scene);
    root.metadata = { cameraIgnore: true, decor: true };

    const body = BABYLON.MeshBuilder.CreateBox(`${name}_b`, { width: 1.0, height: 0.52, depth: 0.42 }, scene);
    body.parent = root;
    body.material = M[`lB${li}`];
    _rainDecor(body);

    // Stepped dome cap — two boxes give chunky 16-bit silhouette.
    const dome = BABYLON.MeshBuilder.CreateBox(`${name}_d`, { width: 0.74, height: 0.28, depth: 0.34 }, scene);
    dome.parent = root;
    dome.position.y = 0.38;
    dome.material = M[`lD${li}`];
    _rainDecor(dome);

    const score = BABYLON.MeshBuilder.CreateBox(`${name}_s`, { width: 0.50, height: 0.07, depth: 0.04 }, scene);
    score.parent = root;
    score.position.set(0, 0.54, -0.16);
    score.rotation.z = 0.22;
    score.material = M[`lS${li}`];
    _rainDecor(score);

    return root;
  }

  // Build a chunky 16-bit toaster: chassis + base trim + top slot + hex knob.
  function buildToaster(name, li) {
    const root = new BABYLON.TransformNode(name, scene);
    root.metadata = { cameraIgnore: true, decor: true };

    const chassis = BABYLON.MeshBuilder.CreateBox(`${name}_c`, { width: 1.0, height: 0.86, depth: 0.44 }, scene);
    chassis.parent = root;
    chassis.material = M[`tC${li}`];
    _rainDecor(chassis);

    // Base trim strip (darker colour).
    const trim = BABYLON.MeshBuilder.CreateBox(`${name}_t`, { width: 1.04, height: 0.10, depth: 0.48 }, scene);
    trim.parent = root;
    trim.position.y = -0.38;
    trim.material = M[`tTr${li}`];
    _rainDecor(trim);

    // Slot recess on top.
    const slot = BABYLON.MeshBuilder.CreateBox(`${name}_sl`, { width: 0.54, height: 0.10, depth: 0.30 }, scene);
    slot.parent = root;
    slot.position.y = 0.43;
    slot.material = M[`tSl${li}`];
    _rainDecor(slot);

    // Hex knob on the side (tessellation=6 for chunky 16-bit look).
    const knob = BABYLON.MeshBuilder.CreateCylinder(`${name}_k`, {
      diameter: 0.18, height: 0.10, tessellation: 6,
    }, scene);
    knob.parent = root;
    knob.position.set(0.54, 0.08, 0);
    knob.rotation.z = Math.PI / 2;
    knob.material = M[`tK${li}`];
    _rainDecor(knob);

    return root;
  }

  // Allocate pool: even mix of loaves and toasters across all layers.
  const pool = [];
  const poolData = []; // parallel per-object motion data

  let globalIdx = 0;
  for (let li = 0; li < RAIN_LAYERS.length; li++) {
    const layer = RAIN_LAYERS[li];
    const xSpan = RAIN_X_MAX - RAIN_X_MIN;
    const ySpan = RAIN_TOP_Y  - RAIN_BOT_Y;
    const zSpan = Math.abs(layer.zFar - layer.zNear);

    for (let oi = 0; oi < layer.count; oi++) {
      const isToaster = (oi % 2 === 1);
      const node = isToaster
        ? buildToaster(`L4r_${li}_${oi}`, li)
        : buildLoaf(`L4r_${li}_${oi}`, li);

      // Stagger initial Y so rain is spread on first frame (not a burst from top).
      const initY = RAIN_BOT_Y + (oi / layer.count) * ySpan;
      // Deterministic but irregular X distribution.
      const initX = RAIN_X_MIN + ((oi * 9.1 + li * 17.3) % xSpan);
      // Z varies continuously within the layer band.
      const initZ = layer.zNear - ((oi * 0.73 + 0.1) % zSpan);

      node.position.set(initX, initY, initZ);
      node.rotation.set(
        (oi * 1.31) % (Math.PI * 2),
        (oi * 2.71) % (Math.PI * 2),
        (oi * 0.87) % (Math.PI * 2),
      );

      // Scale: base × ±20% variance.
      const scaleVar = 0.8 + ((oi * 3 + li * 7) % 5) / 5 * 0.4;
      node.scaling.setAll(layer.scaleBase * scaleVar);

      // Motion params.
      const baseSpd = RAIN_SPD_LO + ((oi * 1.7 + li * 3.1) % (RAIN_SPD_HI - RAIN_SPD_LO));
      poolData.push({
        fallSpeed: baseSpd * layer.speedMul,
        driftX:   (((oi * 5 + li * 11) % 9) - 4) / 4 * 0.4,   // ±0.4 u/s
        tumbleY:  (((oi * 3 + 1) % 8) / 7) * 1.2,              // 0–1.2 rad/s
        tumbleZ:  (((oi * 7 + 2) % 6) / 5 - 0.5) * 0.7,        // ±0.35 rad/s
        zVal:     initZ,
      });
      pool.push(node);
      globalIdx++;
    }
  }

  return {
    update(dt) {
      for (let i = 0; i < pool.length; i++) {
        const node = pool[i];
        const d = poolData[i];
        node.position.y -= d.fallSpeed * dt;
        node.position.x += d.driftX   * dt;
        node.rotation.y += d.tumbleY  * dt;
        node.rotation.z += d.tumbleZ  * dt;
        if (node.position.y < RAIN_BOT_Y) {
          node.position.y = RAIN_TOP_Y + Math.random() * 6;
          node.position.x = RAIN_X_MIN + Math.random() * (RAIN_X_MAX - RAIN_X_MIN);
          node.rotation.x = Math.random() * Math.PI * 2;
          node.rotation.y = Math.random() * Math.PI * 2;
        }
      }
    },
    reset() {
      let gi = 0;
      for (let li = 0; li < RAIN_LAYERS.length; li++) {
        const layer = RAIN_LAYERS[li];
        const xSpan = RAIN_X_MAX - RAIN_X_MIN;
        const ySpan = RAIN_TOP_Y  - RAIN_BOT_Y;
        const zSpan = Math.abs(layer.zFar - layer.zNear);
        for (let oi = 0; oi < layer.count; oi++) {
          const node = pool[gi];
          node.position.y = RAIN_BOT_Y + (oi / layer.count) * ySpan;
          node.position.x = RAIN_X_MIN + ((oi * 9.1 + li * 17.3) % xSpan);
          node.position.z = layer.zNear - ((oi * 0.73 + 0.1) % zSpan);
          node.rotation.set(
            (oi * 1.31) % (Math.PI * 2),
            (oi * 2.71) % (Math.PI * 2),
            (oi * 0.87) % (Math.PI * 2),
          );
          gi++;
        }
      }
    },
    dispose() {
      for (const node of pool) {
        for (const m of node.getChildMeshes(false)) m.dispose();
        node.dispose();
      }
      pool.length = 0;
      for (const mat of Object.values(M)) mat.dispose();
    },
  };
}

function createBackdrop(scene, shadowGen) {
  const root = new BABYLON.TransformNode('L4_backdropRoot', scene);

  const sky = BABYLON.MeshBuilder.CreatePlane('L4_sky', {
    width: 160,
    height: 52,
  }, scene);
  sky.position.set(30, 13, -31);
  const skyTex = new BABYLON.DynamicTexture('L4_skyTex', { width: 2048, height: 768 }, scene, true);
  const ctx = skyTex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, '#2b1731');
  grad.addColorStop(0.38, '#53395e');
  grad.addColorStop(0.72, '#7b5b4c');
  grad.addColorStop(1, '#d38e4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 768);
  for (let i = 0; i < 48; i++) {
    const x = (i * 73) % 2048;
    const y = 84 + ((i * 37) % 240);
    ctx.fillStyle = `rgba(255, 234, 190, ${0.08 + ((i % 5) * 0.03)})`;
    ctx.beginPath();
    ctx.arc(x, y, 10 + ((i * 3) % 18), 0, Math.PI * 2);
    ctx.fill();
  }
  skyTex.update();
  const skyMat = new BABYLON.StandardMaterial('L4_skyMat', scene);
  skyMat.diffuseTexture = skyTex;
  skyMat.emissiveTexture = skyTex;
  skyMat.disableLighting = true;
  sky.material = skyMat;
  sky.parent = root;
  markDecor(sky);

  for (let i = 0; i < 8; i++) {
    const jar = BABYLON.MeshBuilder.CreateSphere(`L4_starterJar${i}`, {
      diameter: 4.2 + (i % 3),
      segments: 20,
    }, scene);
    jar.position.set(-8 + (i * 13.5), 10.5 + ((i % 4) * 2.1), -22 - ((i % 3) * 4.0));
    jar.scaling.y = 1.28;
    jar.material = makeSourdoughMaterial(scene, `L4_starterJarMat${i}`, i % 2 === 0 ? P4.teal : P4.glaze, 0.16);
    jar.parent = root;
    markDecor(jar);

    const bubble = BABYLON.MeshBuilder.CreateSphere(`L4_bubble${i}`, {
      diameter: 1.2 + ((i % 4) * 0.35),
      segments: 16,
    }, scene);
    bubble.position.set(jar.position.x + 1.4, jar.position.y + 1.1, jar.position.z + 0.8);
    bubble.material = makeSourdoughMaterial(scene, `L4_bubbleMat${i}`, P4.glaze, 0.32);
    bubble.parent = root;
    markDecor(bubble);
  }

  const flourStorms = [];
  for (let i = 0; i < 12; i++) {
    const storm = BABYLON.MeshBuilder.CreatePlane(`L4_flourStorm${i}`, {
      width: 4.0 + ((i % 3) * 1.4),
      height: 2.0 + ((i % 4) * 0.7),
    }, scene);
    storm.position.set(-18 + (i * 9.2), 10 + ((i % 3) * 2.3), -15 - ((i % 2) * 6));
    storm.rotation.y = Math.PI;
    const stormMat = new BABYLON.StandardMaterial(`L4_flourStormMat${i}`, scene);
    stormMat.diffuseColor = new BABYLON.Color3(1.0, 0.94, 0.78);
    stormMat.emissiveColor = new BABYLON.Color3(0.42, 0.36, 0.20);
    stormMat.alpha = 0.12 + ((i % 4) * 0.03);
    stormMat.backFaceCulling = false;
    stormMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    storm.material = stormMat;
    storm.parent = root;
    storm.metadata = { cameraIgnore: true, decor: true, driftPhase: i * 0.4 };
    markDecor(storm);
    flourStorms.push(storm);
  }

  const titleSign = createWelcomeSign(scene, {
    name: 'l4_welcomeSign',
    x: -18.6,
    y: LEVEL4.platforms.find((p) => p.name === 'starterBase').y + 0.45,
    z: 2.26,
    shadowGen,
    textLines: ['WELCOME TO', 'SUPER SOURDOUGH'],
    width: 3.9,
    height: 1.56,
    postHeight: 2.9,
    boardName: 'l4_welcomeBoard',
    boardColor: [228, 170, 90],
    postColor: [112, 74, 40],
    fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
  });
  titleSign.parent = root;
  markDecor(titleSign);

  return { root, flourStorms };
}

function createHeatGateVisual(scene, name, def) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const plume = BABYLON.MeshBuilder.CreatePlane(`${name}_plume`, {
    width: def.width,
    height: def.height,
  }, scene);
  plume.parent = root;
  const plumeMat = new BABYLON.StandardMaterial(`${name}_plumeMat`, scene);
  plumeMat.diffuseColor = new BABYLON.Color3(0.95, 0.44, 0.18);
  plumeMat.emissiveColor = new BABYLON.Color3(0.62, 0.22, 0.08);
  plumeMat.alpha = 0.44;
  plumeMat.backFaceCulling = false;
  plumeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plume.material = plumeMat;

  const rim = BABYLON.MeshBuilder.CreateTorus(`${name}_rim`, {
    diameter: def.width + 0.3,
    thickness: 0.12,
    tessellation: 24,
  }, scene);
  rim.parent = root;
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -def.height * 0.46;
  rim.material = makeSourdoughMaterial(scene, `${name}_rimMat`, P4.ember, 0.16);

  markDecor(root);
  return { root, plume };
}

export function buildWorld4(scene, options = {}) {
  const { animateGoal = true } = options;

  const shadowGen = new BABYLON.ShadowGenerator(1024, new BABYLON.DirectionalLight(
    'L4_keyLight',
    new BABYLON.Vector3(-0.4, -1.0, 0.3),
    scene,
  ));
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.bias = 0.0004;

  const hemi = new BABYLON.HemisphericLight('L4_fill', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.68;
  hemi.groundColor = new BABYLON.Color3(0.18, 0.12, 0.10);
  hemi.diffuse = new BABYLON.Color3(0.96, 0.88, 0.72);

  const rim = new BABYLON.PointLight('L4_rim', new BABYLON.Vector3(78, 18, -10), scene);
  rim.intensity = 0.58;
  rim.diffuse = new BABYLON.Color3(0.28, 0.94, 0.86);

  const groundVisual = createSourdoughPlatform(scene, 'ground', LEVEL4.ground, shadowGen);
  const groundCollider = makeInvisibleCollider(scene, 'groundCollider', LEVEL4.ground);
  const allPlatforms = [groundCollider];
  const platformColliders = {};

  for (const def of LEVEL4.platforms) {
    const visual = createSourdoughPlatform(scene, def.name, def, shadowGen);
    setRenderingGroup(visual, 2);
    const collider = makeInvisibleCollider(scene, `L4_${def.name}_col`, def);
    allPlatforms.push(collider);
    platformColliders[def.name] = collider;
  }

  const checkpoints = LEVEL4.checkpoints.map((cp, index) => ({
    index: index + 1,
    label: cp.label,
    spawn: { x: cp.x, y: cp.y, z: cp.z ?? LANE_Z },
    radius: 1.2,
    marker: createCheckpointMarker(scene, `L4_checkpoint_${index}`, {
      x: cp.x,
      y: cp.y - 0.05,
      z: 1.28,
      shadowGen,
    }),
  }));
  checkpoints.forEach((cp) => markDecor(cp.marker));

  const pickups = LEVEL4.pickups.map((pickup, index) => ({
    ...pickup,
    position: new BABYLON.Vector3(pickup.x, pickup.y, pickup.z ?? LANE_Z),
    collected: false,
    node: createOnesiePickup(scene, `L4_pickup_${index}`, {
      x: pickup.x,
      y: pickup.y,
      z: 1.1,
      shadowGen,
    }).root,
  }));
  pickups.forEach((pickup) => markDecor(pickup.node));

  const coins = LEVEL4.coins.map((coin, index) => {
    const node = createCoin(scene, `L4_coin_${index}`, coin);
    setRenderingGroup(node, 3);
    return {
      id: `l4_coin_${index}`,
      position: new BABYLON.Vector3(coin.x, coin.y, coin.z ?? LANE_Z),
      radius: 0.48,
      collected: false,
      node,
    };
  });

  const dad = createDad(scene, {
    x: LEVEL4.goal.x,
    y: LEVEL4.goal.y,
    z: LANE_Z,
    outfit: 'level3',
    shadowGen,
    animate: animateGoal,
  });
  dad.root.position.z = 0;

  const backdrop = createBackdrop(scene, shadowGen);
  const breadRain = createBreadRainSystem(scene);

  const conveyorDefs = LEVEL4.conveyors.map((def, index) => {
    const visual = BABYLON.MeshBuilder.CreateBox(`L4_conveyorVisual_${index}`, {
      width: def.w,
      height: def.h,
      depth: def.d,
    }, scene);
    visual.position.set(def.x, def.y, def.z);
    visual.material = makeSourdoughMaterial(scene, `L4_conveyorMat_${index}`, index === 0 ? P4.teal : P4.glaze, 0.18);
    visual.isPickable = false;
    visual.checkCollisions = false;
    visual.metadata = { cameraIgnore: true };
    setRenderingGroup(visual, 2);

    const arrows = [];
    for (let i = 0; i < 3; i++) {
      const arrow = BABYLON.MeshBuilder.CreatePlane(`L4_conveyorArrow_${index}_${i}`, {
        width: 0.8,
        height: 0.26,
      }, scene);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(def.x - 1 + (i * 1.0), def.y + def.h * 0.5 + 0.02, -0.2);
      const arrowMat = new BABYLON.StandardMaterial(`L4_conveyorArrowMat_${index}_${i}`, scene);
      arrowMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.16);
      arrowMat.emissiveColor = new BABYLON.Color3(0.32, 0.86, 0.78);
      arrowMat.alpha = 0.78;
      arrowMat.backFaceCulling = false;
      arrow.material = arrowMat;
      markDecor(arrow);
      arrows.push(arrow);
    }

    const collider = makeInvisibleCollider(scene, `L4_${def.name}_col`, def);
    allPlatforms.push(collider);

    return {
      ...def,
      visual,
      collider,
      arrows,
      dir: Math.sign(def.speed) || 1,
      currentX: def.x,
    };
  });

  const heatGates = LEVEL4.heatGates.map((def, index) => ({
    ...def,
    elapsedMs: def.phaseMs || 0,
    active: true,
    visual: createHeatGateVisual(scene, `L4_heat_${index}`, def),
  }));

  const hazards = heatGates.map((gate) => ({
    name: gate.name,
    type: 'heat',
    minX: gate.x - (gate.width * 0.5),
    maxX: gate.x + (gate.width * 0.5),
    minY: gate.y - (gate.height * 0.5),
    maxY: gate.y + (gate.height * 0.5),
  }));

  function updateConveyors(dt) {
    for (const conveyor of conveyorDefs) {
      conveyor.currentX += conveyor.speed * dt;
      if (conveyor.currentX >= conveyor.maxX) {
        conveyor.currentX = conveyor.maxX;
        conveyor.speed *= -1;
      } else if (conveyor.currentX <= conveyor.minX) {
        conveyor.currentX = conveyor.minX;
        conveyor.speed *= -1;
      }
      conveyor.visual.position.x = conveyor.currentX;
      conveyor.collider.position.x = conveyor.currentX;
      for (let i = 0; i < conveyor.arrows.length; i++) {
        conveyor.arrows[i].position.x = conveyor.currentX - 1 + (i * 1.0);
        conveyor.arrows[i].material.emissiveColor = new BABYLON.Color3(
          0.22 + (i * 0.04),
          0.84,
          0.76,
        );
      }
    }
  }

  function updateHeatGates(dt, { pos, triggerReset }) {
    for (const gate of heatGates) {
      gate.elapsedMs += dt * 1000;
      const cycle = gate.onMs + gate.offMs;
      const phase = gate.elapsedMs % cycle;
      gate.active = phase < gate.onMs;
      gate.visual.root.setEnabled(gate.active);
      if (!gate.active) continue;
      if (
        pos.x >= (gate.x - gate.width * 0.5)
        && pos.x <= (gate.x + gate.width * 0.5)
        && pos.y >= (gate.y - gate.height * 0.5)
        && pos.y <= (gate.y + gate.height * 0.5)
      ) {
        triggerReset('oven_heat', pos.x < gate.x ? -1 : 1);
      }
    }
  }

  const level4 = {
    update(dt, { pos, triggerReset }) {
      updateConveyors(dt);
      updateHeatGates(dt, { pos, triggerReset });
      for (const storm of backdrop.flourStorms) {
        storm.position.x += dt * 0.4;
        if (storm.position.x > 90) storm.position.x = -20;
      }
      breadRain.update(dt);
    },
    reset() {
      for (const conveyor of conveyorDefs) {
        conveyor.currentX = conveyor.x;
        conveyor.visual.position.x = conveyor.x;
        conveyor.collider.position.x = conveyor.x;
        conveyor.speed = Math.abs(conveyor.speed) * (Math.sign(LEVEL4.conveyors.find((entry) => entry.name === conveyor.name)?.speed || 1) || 1);
      }
      for (const gate of heatGates) {
        gate.elapsedMs = gate.phaseMs || 0;
        gate.active = true;
        gate.visual.root.setEnabled(true);
      }
      breadRain.reset();
    },
  };

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allPlatforms,
    goal: dad.goal,
    goalRoot: dad.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL4.extents,
    spawn: LEVEL4.spawn,
    checkpoints,
    pickups,
    coins,
    hazards,
    crumbles: [],
    level: LEVEL4,
    level4,
    signs: [backdrop.root],
    goalGuardMinX: LEVEL4.goal.x - 4.5,
    goalMinBottomY: (LEVEL4.platforms.find((p) => p.name === 'goalLoaf').y + (LEVEL4.platforms.find((p) => p.name === 'goalLoaf').h * 0.5)) - 0.2,
    flourPuff: { ...LEVEL4.flourPuff },
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
