import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePaper,
  makeFelt,
  makePlastic,
} from '../materials.js';

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

function createDaDa(scene, x, baseY, shadowGen) {
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
  const goal = BABYLON.MeshBuilder.CreateSphere('goalTrigger', {
    diameter: 2.5, segments: 8,
  }, scene);
  goal.position.y = 0.6;
  goal.parent = root;
  goal.visibility = 0;

  // Bob animation
  scene.registerBeforeRender(() => {
    const t = performance.now() / 1000;
    const bob = Math.sin(t * 2) * 0.15;
    root.position.y = baseY + bob;
  });

  return { root, goal };
}

// ── Main world builder ───────────────────────────────────────────

export function buildWorld(scene) {
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
  rimLight.range = 50;

  // === DIORAMA BASE (ground slab via prefab) ===
  const groundNode = createCardboardPlatform(scene, 'ground', {
    x: 5, y: -0.75, z: 0, w: 50, h: 1.5, d: 14,
    slabColor: P.groundTop, edgeColor: P.groundEdge, shadowGen,
  });
  // For collision, we need the absolute-positioned mesh. Since the slab is a child of
  // the TransformNode, we need to get the world-space bounding. We'll handle this
  // by creating a simple invisible collision proxy at the same position.
  const groundCollider = BABYLON.MeshBuilder.CreateBox('groundCol', {
    width: 50, height: 1.5, depth: 14,
  }, scene);
  groundCollider.position.set(5, -0.75, 0);
  groundCollider.visibility = 0;
  groundCollider.isPickable = false;

  // === BACKDROP ===
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop', {
    width: 60, height: 18, depth: 0.5,
  }, scene);
  backdrop.position.set(5, 8, 8);
  backdrop.material = makePaper(scene, 'backdropMat', ...P.backdrop, { grainScale: 2, noiseAmt: 8 });

  // Sky tint directly on backdrop (no separate plane — avoids z-fighting banding)
  const skyMat = makeFelt(scene, 'skyMat', ...P.sky, { roughness: 1.0 });
  skyMat.alpha = 0.25;
  skyMat.sheen.isEnabled = false; // no sheen on transparent overlay
  const skyPlane = BABYLON.MeshBuilder.CreatePlane('skyPlane', { width: 59, height: 17 }, scene);
  skyPlane.position.set(5, 8.5, 7.74);
  skyPlane.material = skyMat;

  // === PARALLAX LAYERS ===
  const bgHills = BABYLON.MeshBuilder.CreateBox('bgHills', { width: 55, height: 6, depth: 0.3 }, scene);
  bgHills.position.set(5, 3, 6);
  bgHills.material = makeCardboard(scene, 'bgHillsMat', ...P.bgHills);

  const bgMid = BABYLON.MeshBuilder.CreateBox('bgMid', { width: 50, height: 4, depth: 0.25 }, scene);
  bgMid.position.set(3, 2.5, 4);
  bgMid.material = makeCardboard(scene, 'bgMidMat', ...P.bgMid);

  // Foreground cutouts (offset to avoid blocking spawn/play area)
  const fgCutout1 = BABYLON.MeshBuilder.CreateBox('fgCutout1', { width: 8, height: 3, depth: 0.2 }, scene);
  fgCutout1.position.set(-22, 1.5, -6);
  fgCutout1.material = makeCardboard(scene, 'fgMat1', ...P.fgCutout);
  shadowGen.addShadowCaster(fgCutout1);

  const fgCutout2 = BABYLON.MeshBuilder.CreateBox('fgCutout2', { width: 10, height: 2.5, depth: 0.2 }, scene);
  fgCutout2.position.set(30, 1.2, -7);
  fgCutout2.material = makeCardboard(scene, 'fgMat2', ...P.fgCutout);
  shadowGen.addShadowCaster(fgCutout2);

  // === PLATFORMS ===
  const allPlatforms = [groundCollider];

  const platDefs = [
    { name: 'platStart', w: 8, h: 0.8, d: 5, x: -12, y: 0.4 },
    { name: 'plat2',     w: 5, h: 0.7, d: 4, x: -5,  y: 1.5 },
    { name: 'plat3',     w: 4, h: 0.6, d: 4, x: 0,   y: 3.0 },
    { name: 'plat4',     w: 5, h: 0.7, d: 4, x: 6,   y: 2.0 },
    { name: 'plat5',     w: 4, h: 0.8, d: 4, x: 11,  y: 4.0 },
    { name: 'platFinal', w: 8, h: 0.8, d: 5, x: 18,  y: 2.5 },
  ];

  for (const def of platDefs) {
    createCardboardPlatform(scene, def.name, {
      x: def.x, y: def.y, z: 0,
      w: def.w, h: def.h, d: def.d, shadowGen,
    });
    // Invisible collision proxy (PlayerController reads position + bounding box)
    const col = BABYLON.MeshBuilder.CreateBox(def.name + '_col', {
      width: def.w, height: def.h, depth: def.d,
    }, scene);
    col.position.set(def.x, def.y, 0);
    col.visibility = 0;
    col.isPickable = false;
    allPlatforms.push(col);
  }

  // === GOAL (DaDa) ===
  const dada = createDaDa(scene, 20, 3.2, shadowGen);

  // === DECORATIONS ===
  // Felt trees
  for (let i = 0; i < 5; i++) {
    const tx = -10 + i * 8;
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
    const fR = P.foliageBase[0] + Math.random() * 0.12;
    const fG = P.foliageBase[1] + Math.random() * 0.12;
    const fB = P.foliageBase[2] + Math.random() * 0.08;
    foliage.material = makeFelt(scene, 'foliageMat' + i, fR, fG, fB);
    shadowGen.addShadowCaster(foliage);
  }

  // Cloud cutouts
  for (let i = 0; i < 4; i++) {
    const cx = -12 + i * 10;
    const cloud = BABYLON.MeshBuilder.CreateSphere('cloud' + i, {
      diameter: 2 + Math.random(), segments: 10,
    }, scene);
    cloud.position.set(cx, 10 + Math.random() * 2, 6.5);
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
    shadowGen,
  };
}
