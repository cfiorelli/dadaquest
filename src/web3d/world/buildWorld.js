import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePaper,
  makeFelt,
  makePlastic,
} from '../materials.js';
import { LEVEL1 } from './level1.js';

// ── Platform prefab ──────────────────────────────────────────────

/**
 * Creates a thick cardboard platform with a darker edge strip.
 * Returns a TransformNode (parent) — the first child is the slab (used for collision).
 */
function createCardboardPlatform(scene, name, {
  x, y, z = 0, w, h, d,
  slabColor = P.platform,
  edgeColor = P.platformEdge,
  shadowGen,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  // Main slab
  const edgeH = Math.min(0.12, h * 0.18);
  const slabH = h - edgeH;

  const slab = BABYLON.MeshBuilder.CreateBox(name + '_slab', {
    width: w, height: slabH, depth: d,
  }, scene);
  slab.position.y = edgeH / 2;
  slab.parent = root;
  slab.material = makeCardboard(scene, name + '_slabMat', ...slabColor);
  slab.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(slab);

  // Edge strip (slightly wider, darker, at bottom)
  const edge = BABYLON.MeshBuilder.CreateBox(name + '_edge', {
    width: w + 0.06, height: edgeH, depth: d + 0.06,
  }, scene);
  edge.position.y = -(slabH / 2);
  edge.parent = root;
  edge.material = makeCardboard(scene, name + '_edgeMat', ...edgeColor, { roughness: 0.9 });
  edge.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(edge);

  // Expose the slab for collision (caller reads position + bounding)
  root._collisionMesh = slab;

  return root;
}

// ── Toy character builders ───────────────────────────────────────

function createDaDa(scene, x, baseY, shadowGen, { animate = true } = {}) {
  const root = new BABYLON.TransformNode('dada', scene);
  root.position.set(x, baseY, 0);

  // Body (tapered cylinder)
  const body = BABYLON.MeshBuilder.CreateCylinder('dadBody', {
    height: 1.2, diameterTop: 0.5, diameterBottom: 0.7, tessellation: 16,
  }, scene);
  body.position.y = 0.6;
  body.parent = root;
  body.material = makePlastic(scene, 'dadBodyMat', ...P.dadBody);
  shadowGen.addShadowCaster(body);

  // Shirt band (torus around midsection)
  const shirt = BABYLON.MeshBuilder.CreateTorus('dadShirt', {
    diameter: 0.62, thickness: 0.18, tessellation: 16,
  }, scene);
  shirt.position.y = 0.7;
  shirt.parent = root;
  shirt.material = makePlastic(scene, 'dadShirtMat', ...P.dadShirt);

  // Head
  const head = BABYLON.MeshBuilder.CreateSphere('dadHead', {
    diameter: 0.72, segments: 16,
  }, scene);
  head.position.y = 1.52;
  head.parent = root;
  head.material = makePlastic(scene, 'dadHeadMat', ...P.dadHead);
  shadowGen.addShadowCaster(head);

  // Simple face (DynamicTexture on a small plane)
  const faceSize = 64;
  const faceTex = new BABYLON.DynamicTexture('dadFaceTex', faceSize, scene, true);
  const fCtx = faceTex.getContext();
  fCtx.clearRect(0, 0, faceSize, faceSize);
  // Eyes
  fCtx.fillStyle = '#222';
  fCtx.beginPath();
  fCtx.arc(20, 26, 4, 0, Math.PI * 2);
  fCtx.arc(44, 26, 4, 0, Math.PI * 2);
  fCtx.fill();
  // Smile
  fCtx.strokeStyle = '#222';
  fCtx.lineWidth = 2;
  fCtx.beginPath();
  fCtx.arc(32, 36, 10, 0.1 * Math.PI, 0.9 * Math.PI);
  fCtx.stroke();
  faceTex.update();
  faceTex.hasAlpha = true;

  const facePlane = BABYLON.MeshBuilder.CreatePlane('dadFace', { size: 0.4 }, scene);
  facePlane.position.set(0, 1.52, -0.37);
  facePlane.parent = root;
  const faceMat = new BABYLON.StandardMaterial('dadFaceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.specularColor = BABYLON.Color3.Black();
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.emissiveColor = new BABYLON.Color3(0.15, 0.12, 0.10);
  facePlane.material = faceMat;

  // Goal trigger (invisible)
  const goal = BABYLON.MeshBuilder.CreateBox('goalTrigger', {
    width: 3.0, height: 7.0, depth: 3.0,
  }, scene);
  // Extended trigger volume keeps finish reliable while DaDa remains visibly on the rooftop.
  goal.position.y = -1.8;
  goal.parent = root;
  goal.visibility = 0;

  // Bob animation
  if (animate) {
    scene.registerBeforeRender(() => {
      const t = performance.now() / 1000;
      const bob = Math.sin(t * 2) * 0.15;
      root.position.y = baseY + bob;
    });
  }

  return { root, goal };
}

function createArrowSign(scene, name, { x, y, z, direction = 1, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const pole = BABYLON.MeshBuilder.CreateBox(name + '_pole', {
    width: 0.15, height: 1.0, depth: 0.15,
  }, scene);
  pole.position.y = -0.35;
  pole.parent = root;
  pole.material = makeCardboard(scene, name + '_poleMat', 138, 118, 92);

  const board = BABYLON.MeshBuilder.CreateBox(name + '_board', {
    width: 0.9, height: 0.4, depth: 0.08,
  }, scene);
  board.parent = root;
  board.material = makePlastic(scene, name + '_boardMat', 0.95, 0.75, 0.28, { roughness: 0.42 });

  const arrow = BABYLON.MeshBuilder.CreateCylinder(name + '_arrow', {
    diameterTop: 0,
    diameterBottom: 0.22,
    height: 0.26,
    tessellation: 3,
  }, scene);
  arrow.rotation.z = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
  arrow.position.set(direction * 0.23, 0, -0.08);
  arrow.parent = root;
  arrow.material = makePlastic(scene, name + '_arrowMat', 0.93, 0.28, 0.2, { roughness: 0.45 });

  shadowGen.addShadowCaster(pole);
  shadowGen.addShadowCaster(board);
  shadowGen.addShadowCaster(arrow);
  return root;
}

function createCheckpointMarker(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const post = BABYLON.MeshBuilder.CreateBox(name + '_post', {
    width: 0.16, height: 1.5, depth: 0.16,
  }, scene);
  post.position.y = -0.35;
  post.parent = root;
  post.material = makeCardboard(scene, name + '_postMat', 146, 122, 94);

  const flag = BABYLON.MeshBuilder.CreateBox(name + '_flag', {
    width: 0.58, height: 0.32, depth: 0.06,
  }, scene);
  flag.position.set(0.35, 0.2, 0);
  flag.parent = root;
  flag.material = makePlastic(scene, name + '_flagMat', 0.94, 0.56, 0.18, { roughness: 0.38 });

  shadowGen.addShadowCaster(post);
  shadowGen.addShadowCaster(flag);
  return root;
}

function createOnesiePickup(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const torso = BABYLON.MeshBuilder.CreateBox(name + '_torso', {
    width: 0.45, height: 0.48, depth: 0.22,
  }, scene);
  torso.parent = root;
  torso.material = makePlastic(scene, name + '_torsoMat', 0.95, 0.94, 1.0, { roughness: 0.33 });

  const shoulderL = BABYLON.MeshBuilder.CreateSphere(name + '_shL', { diameter: 0.18 }, scene);
  shoulderL.position.set(-0.18, 0.18, 0);
  shoulderL.parent = root;
  shoulderL.material = torso.material;

  const shoulderR = BABYLON.MeshBuilder.CreateSphere(name + '_shR', { diameter: 0.18 }, scene);
  shoulderR.position.set(0.18, 0.18, 0);
  shoulderR.parent = root;
  shoulderR.material = torso.material;

  shadowGen.addShadowCaster(torso);
  shadowGen.addShadowCaster(shoulderL);
  shadowGen.addShadowCaster(shoulderR);
  return root;
}

function createSlipZone(scene, name, { x, y, z, width, depth }) {
  const zone = BABYLON.MeshBuilder.CreateBox(name + '_zone', {
    width,
    height: 0.2,
    depth,
  }, scene);
  zone.position.set(x, y, z);
  zone.visibility = 0;
  zone.isPickable = false;

  const puddle = BABYLON.MeshBuilder.CreateDisc(name + '_puddle', {
    radius: width * 0.33,
    tessellation: 28,
  }, scene);
  puddle.rotation.x = Math.PI / 2;
  puddle.position.set(x, y + 0.12, z);
  const puddleMat = makePlastic(scene, name + '_puddleMat', 0.48, 0.67, 0.92, { roughness: 0.15 });
  puddleMat.alpha = 0.68;
  puddleMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  puddle.material = puddleMat;

  return { zone, puddle };
}

// ── Main world builder ───────────────────────────────────────────

export function buildWorld(scene, options = {}) {
  const {
    random = Math.random,
    animateGoal = true,
  } = options;

  // Scene setup
  scene.clearColor = new BABYLON.Color4(...P.clearColor);
  scene.ambientColor = new BABYLON.Color3(...P.ambientColor);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.010;
  scene.fogColor = new BABYLON.Color3(...P.fogColor);

  // === LIGHTING ===
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, -0.3), scene);
  hemi.intensity = 0.6;
  hemi.groundColor = new BABYLON.Color3(0.55, 0.52, 0.48);

  const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.6, -1, 0.4), scene);
  dirLight.intensity = 0.8;
  dirLight.position = new BABYLON.Vector3(10, 20, -10);

  const shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 24;
  shadowGen.blurScale = 2;
  shadowGen.setDarkness(0.35);

  // Warm rim light
  const rimLight = new BABYLON.PointLight('rim', new BABYLON.Vector3(5, 8, -14), scene);
  rimLight.intensity = 0.2;
  rimLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);
  rimLight.range = 52;

  // === DIORAMA BASE ===
  const groundDef = LEVEL1.ground;
  createCardboardPlatform(scene, 'ground', {
    x: groundDef.x, y: groundDef.y, z: groundDef.z,
    w: groundDef.w, h: groundDef.h, d: groundDef.d,
    slabColor: P.groundTop,
    edgeColor: P.groundEdge,
    shadowGen,
  });

  const groundCollider = BABYLON.MeshBuilder.CreateBox('groundCol', {
    width: groundDef.w,
    height: groundDef.h,
    depth: groundDef.d,
  }, scene);
  groundCollider.position.set(groundDef.x, groundDef.y, groundDef.z);
  groundCollider.visibility = 0;
  groundCollider.isPickable = false;

  // === BACKDROP ===
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop', {
    width: 66, height: 21, depth: 0.5,
  }, scene);
  backdrop.position.set(6, 9, 8.3);
  backdrop.material = makePaper(scene, 'backdropMat', ...P.backdrop, { grainScale: 2, noiseAmt: 8 });

  const skyMat = makeFelt(scene, 'skyMat', ...P.sky, { roughness: 1.0 });
  skyMat.alpha = 0.25;
  skyMat.sheen.isEnabled = false;
  const skyPlane = BABYLON.MeshBuilder.CreatePlane('skyPlane', { width: 64, height: 20 }, scene);
  skyPlane.position.set(6, 9.5, 7.98);
  skyPlane.material = skyMat;

  // === PARALLAX LAYERS ===
  const bgHills = BABYLON.MeshBuilder.CreateBox('bgHills', { width: 62, height: 6.6, depth: 0.3 }, scene);
  bgHills.position.set(6, 3.1, 6.2);
  bgHills.material = makeCardboard(scene, 'bgHillsMat', ...P.bgHills);

  const bgMid = BABYLON.MeshBuilder.CreateBox('bgMid', { width: 58, height: 4.2, depth: 0.25 }, scene);
  bgMid.position.set(4.5, 2.45, 4.2);
  bgMid.material = makeCardboard(scene, 'bgMidMat', ...P.bgMid);

  const fgCutout1 = BABYLON.MeshBuilder.CreateBox('fgCutout1', { width: 8, height: 3, depth: 0.2 }, scene);
  fgCutout1.position.set(-24, 1.5, -8.2);
  fgCutout1.material = makeCardboard(scene, 'fgMat1', ...P.fgCutout);
  fgCutout1.metadata = { layer: 'foreground' };
  shadowGen.addShadowCaster(fgCutout1);

  const fgCutout2 = BABYLON.MeshBuilder.CreateBox('fgCutout2', { width: 10, height: 2.5, depth: 0.2 }, scene);
  fgCutout2.position.set(34, 1.2, -8.8);
  fgCutout2.material = makeCardboard(scene, 'fgMat2', ...P.fgCutout);
  fgCutout2.metadata = { layer: 'foreground' };
  shadowGen.addShadowCaster(fgCutout2);

  // === PLATFORMS ===
  const allPlatforms = [groundCollider];

  for (const def of LEVEL1.platforms) {
    createCardboardPlatform(scene, def.name, {
      x: def.x,
      y: def.y,
      z: 0,
      w: def.w,
      h: def.h,
      d: def.d,
      shadowGen,
    });

    const col = BABYLON.MeshBuilder.CreateBox(def.name + '_col', {
      width: def.w,
      height: def.h,
      depth: def.d,
    }, scene);
    col.position.set(def.x, def.y, 0);
    col.visibility = 0;
    col.isPickable = false;
    allPlatforms.push(col);
  }

  // === GOAL (DaDa) ===
  const goalDef = LEVEL1.goal;
  const dada = createDaDa(scene, goalDef.x, goalDef.y, shadowGen, { animate: animateGoal });

  // === LEVEL GUIDANCE SIGNS ===
  const signRoots = [];
  for (let i = 0; i < LEVEL1.signs.length; i++) {
    const s = LEVEL1.signs[i];
    signRoots.push(createArrowSign(scene, `sign_${i}`, {
      x: s.x,
      y: s.y,
      z: s.z,
      direction: s.direction,
      shadowGen,
    }));
  }

  // === CHECKPOINTS ===
  const checkpoints = [];
  for (let i = 0; i < LEVEL1.checkpoints.length; i++) {
    const cp = LEVEL1.checkpoints[i];
    const marker = createCheckpointMarker(scene, `checkpoint_${i}`, {
      x: cp.x,
      y: cp.y,
      z: 0.7,
      shadowGen,
    });

    checkpoints.push({
      index: i + 1,
      label: cp.label || `Checkpoint ${i + 1}`,
      spawn: { x: cp.x, y: cp.y, z: cp.z },
      radius: 1.25,
      marker,
    });
  }

  // === PICKUPS ===
  const pickups = [];
  for (let i = 0; i < LEVEL1.pickups.length; i++) {
    const pick = LEVEL1.pickups[i];
    const node = createOnesiePickup(scene, `pickup_${i}`, {
      x: pick.x,
      y: pick.y,
      z: pick.z,
      shadowGen,
    });

    pickups.push({
      type: pick.type,
      radius: pick.radius,
      durationMs: pick.durationMs,
      jumpBoost: pick.jumpBoost,
      position: new BABYLON.Vector3(pick.x, pick.y, pick.z),
      node,
      collected: false,
    });
  }

  // === HAZARDS ===
  const hazards = [];
  for (let i = 0; i < LEVEL1.hazards.length; i++) {
    const hz = LEVEL1.hazards[i];
    if (hz.type === 'slip') {
      const created = createSlipZone(scene, `hazard_slip_${i}`, {
        x: hz.x,
        y: hz.y,
        z: hz.z,
        width: hz.width,
        depth: hz.depth,
      });
      hazards.push({
        type: hz.type,
        minX: hz.x - hz.width / 2,
        maxX: hz.x + hz.width / 2,
        minY: hz.y - 0.35,
        maxY: hz.y + 0.35,
        accelMultiplier: hz.accelMultiplier,
        decelMultiplier: hz.decelMultiplier,
        mesh: created.puddle,
      });
    }
  }

  // === DECORATIONS ===
  for (let i = 0; i < 6; i++) {
    const tx = -13 + i * 8;
    const trunk = BABYLON.MeshBuilder.CreateBox('trunk' + i, {
      width: 0.3, height: 1.5, depth: 0.25,
    }, scene);
    trunk.position.set(tx, 2.5, 4.5);
    trunk.material = makeFelt(scene, 'trunkMat' + i, ...P.trunk);

    const foliage = BABYLON.MeshBuilder.CreateSphere('foliage' + i, {
      diameter: 1.8, segments: 10,
    }, scene);
    foliage.position.set(tx, 3.8, 4.5);
    foliage.scaling.y = 0.8;
    const fR = P.foliageBase[0] + random() * 0.12;
    const fG = P.foliageBase[1] + random() * 0.12;
    const fB = P.foliageBase[2] + random() * 0.08;
    foliage.material = makeFelt(scene, 'foliageMat' + i, fR, fG, fB);
    shadowGen.addShadowCaster(foliage);
  }

  for (let i = 0; i < 4; i++) {
    const cx = -14 + i * 12;
    const cloud = BABYLON.MeshBuilder.CreateSphere('cloud' + i, {
      diameter: 2 + random(), segments: 10,
    }, scene);
    cloud.position.set(cx, 10 + random() * 2, 6.6);
    cloud.scaling.set(1.5, 0.6, 0.3);
    const cloudMat = makeFelt(scene, 'cloudMat' + i, ...P.cloud, { roughness: 1.0 });
    cloudMat.alpha = 0.7;
    cloudMat.sheen.isEnabled = false;
    cloud.material = cloudMat;
  }

  return {
    ground: groundCollider,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes: [fgCutout1, fgCutout2],
    extents: LEVEL1.extents,
    spawn: LEVEL1.spawn,
    checkpoints,
    pickups,
    hazards,
    level: LEVEL1,
    signs: signRoots,
  };
}
