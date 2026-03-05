import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePaper,
  makeFelt,
  makePlastic,
} from '../materials.js';
import { LEVEL1 } from './level1.js';
import { makeCutoutPolygonMesh, makeCloudCutout, seededRandom } from './cutouts.js';

// ── Platform prefab ──────────────────────────────────────────────

/**
 * Creates a thick cardboard platform with stylized paper/card treatment.
 * Returns a TransformNode (parent) — the first child is the slab (used for collision).
 */
function createCardboardPlatform(scene, name, {
  x, y, z = 0, w, h, d,
  slabColor = P.platformCard,
  edgeColor = P.edgeDark,
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
  slab.material = makeCardboard(scene, name + '_slabMat', ...slabColor, {
    grainScale: 1.8,
    noiseAmt: 24,
    roughness: 0.84,
  });
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

  // Faux bevel strip to remove flat boxy edges.
  const bevelH = Math.min(0.07, h * 0.12);
  const bevelStrip = BABYLON.MeshBuilder.CreateBox(name + '_bevel', {
    width: w + 0.03,
    height: bevelH,
    depth: d + 0.03,
  }, scene);
  bevelStrip.position.y = (h * 0.5) - (bevelH * 0.5) - 0.035;
  bevelStrip.parent = root;
  bevelStrip.material = makeCardboard(scene, name + '_bevelMat', ...edgeColor, {
    grainScale: 2.2,
    noiseAmt: 12,
    roughness: 0.92,
  });
  bevelStrip.receiveShadows = true;

  // Thin top highlight strip for handcrafted card edge read.
  const hiPlane = BABYLON.MeshBuilder.CreatePlane(name + '_topHi', {
    width: Math.max(0.2, w - 0.1),
    height: Math.max(0.2, d - 0.1),
  }, scene);
  hiPlane.rotation.x = Math.PI / 2;
  hiPlane.position.y = (h * 0.5) + 0.006;
  hiPlane.parent = root;
  const hiColor = [
    Math.min(255, slabColor[0] + 22),
    Math.min(255, slabColor[1] + 20),
    Math.min(255, slabColor[2] + 18),
  ];
  const hiMat = makePaper(scene, name + '_topHiMat', ...hiColor, {
    grainScale: 2.0,
    noiseAmt: 7,
    roughness: 0.98,
  });
  hiMat.alpha = 0.32;
  hiMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  hiPlane.material = hiMat;

  // Very faint underside contact dirt shadow.
  const underPlane = BABYLON.MeshBuilder.CreatePlane(name + '_dirtShadow', {
    width: Math.max(0.25, w * 0.92),
    height: Math.max(0.25, d * 0.74),
  }, scene);
  underPlane.rotation.x = Math.PI / 2;
  underPlane.position.y = -(h * 0.5) - 0.024;
  underPlane.parent = root;
  const underMat = new BABYLON.StandardMaterial(name + '_dirtShadowMat', scene);
  underMat.diffuseColor = new BABYLON.Color3(0.12, 0.10, 0.08);
  underMat.specularColor = BABYLON.Color3.Black();
  underMat.emissiveColor = new BABYLON.Color3(0.06, 0.05, 0.04);
  underMat.alpha = 0.16;
  underMat.disableLighting = true;
  underMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  underPlane.material = underMat;

  // Expose the slab for collision (caller reads position + bounding)
  root._collisionMesh = slab;

  return root;
}

function createPropContactShadow(scene, name, {
  x,
  y,
  z = 0,
  w = 0.8,
  d = 0.5,
  alpha = 0.18,
}) {
  const mesh = BABYLON.MeshBuilder.CreatePlane(name, {
    width: w,
    height: d,
  }, scene);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  const mat = new BABYLON.StandardMaterial(name + '_mat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.10, 0.09, 0.08);
  mat.emissiveColor = new BABYLON.Color3(0.06, 0.05, 0.04);
  mat.specularColor = BABYLON.Color3.Black();
  mat.alpha = alpha;
  mat.disableLighting = true;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mesh.material = mat;
  mesh.isPickable = false;
  return mesh;
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
  pole.material = makeCardboard(scene, name + '_poleMat', ...P.edgeDark);

  const board = BABYLON.MeshBuilder.CreateBox(name + '_board', {
    width: 0.9, height: 0.4, depth: 0.08,
  }, scene);
  board.parent = root;
  board.material = makePlastic(scene, name + '_boardMat', ...P.accentYellow, { roughness: 0.42 });

  const arrow = BABYLON.MeshBuilder.CreateCylinder(name + '_arrow', {
    diameterTop: 0,
    diameterBottom: 0.22,
    height: 0.26,
    tessellation: 3,
  }, scene);
  arrow.rotation.z = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
  arrow.position.set(direction * 0.23, 0, -0.08);
  arrow.parent = root;
  arrow.material = makePlastic(scene, name + '_arrowMat', ...P.accentRed, { roughness: 0.45 });

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
  post.material = makeCardboard(scene, name + '_postMat', ...P.edgeDark);

  const flag = BABYLON.MeshBuilder.CreateBox(name + '_flag', {
    width: 0.58, height: 0.32, depth: 0.06,
  }, scene);
  flag.position.set(0.35, 0.2, 0);
  flag.parent = root;
  flag.material = makePlastic(scene, name + '_flagMat', ...P.accentYellow, { roughness: 0.38 });

  shadowGen.addShadowCaster(post);
  shadowGen.addShadowCaster(flag);
  return root;
}

function createOnesiePickup(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const torso = BABYLON.MeshBuilder.CreateBox(name + '_torso', {
    width: 0.5, height: 0.48, depth: 0.22,
  }, scene);
  torso.parent = root;
  torso.material = makeFelt(scene, name + '_torsoMat', 0.95, 0.94, 1.0, { roughness: 0.9 });

  const shoulderL = BABYLON.MeshBuilder.CreateSphere(name + '_shL', { diameter: 0.18 }, scene);
  shoulderL.position.set(-0.18, 0.18, 0);
  shoulderL.parent = root;
  shoulderL.material = torso.material;

  const shoulderR = BABYLON.MeshBuilder.CreateSphere(name + '_shR', { diameter: 0.18 }, scene);
  shoulderR.position.set(0.18, 0.18, 0);
  shoulderR.parent = root;
  shoulderR.material = torso.material;

  const hood = BABYLON.MeshBuilder.CreateTorus(name + '_hood', {
    diameter: 0.44,
    thickness: 0.08,
    tessellation: 22,
  }, scene);
  hood.rotation.x = Math.PI / 2;
  hood.position.set(0, 0.19, -0.02);
  hood.parent = root;
  hood.material = makeFelt(scene, name + '_hoodMat', 0.88, 0.90, 0.98, { roughness: 0.96 });

  const zipper = BABYLON.MeshBuilder.CreateBox(name + '_zip', {
    width: 0.06,
    height: 0.34,
    depth: 0.025,
  }, scene);
  zipper.position.set(0, 0.03, -0.12);
  zipper.parent = root;
  zipper.material = makePlastic(scene, name + '_zipMat', ...P.accentYellow, { roughness: 0.22 });

  shadowGen.addShadowCaster(torso);
  shadowGen.addShadowCaster(shoulderL);
  shadowGen.addShadowCaster(shoulderR);
  shadowGen.addShadowCaster(hood);
  createPropContactShadow(scene, name + '_shadow', {
    x,
    y: y - 0.48,
    z,
    w: 0.54,
    d: 0.34,
    alpha: 0.16,
  });
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

function createCribRailSegment(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const railTop = BABYLON.MeshBuilder.CreateBox(name + '_top', {
    width: 8.8, height: 0.2, depth: 0.34,
  }, scene);
  railTop.position.y = 0.78;
  railTop.parent = root;
  railTop.metadata = { layer: 'foreground' };
  railTop.material = makeCardboard(scene, name + '_topMat', ...P.edgeDark, {
    grainScale: 2.1,
    noiseAmt: 18,
    roughness: 0.82,
  });

  for (let i = 0; i < 7; i++) {
    const post = BABYLON.MeshBuilder.CreateBox(name + `_post_${i}`, {
      width: 0.16, height: 1.5, depth: 0.2,
    }, scene);
    post.position.set(-4.1 + (i * 1.35), 0, 0);
    post.parent = root;
    post.metadata = { layer: 'foreground' };
    post.material = makeCardboard(scene, name + `_postMat_${i}`, ...P.ground, {
      grainScale: 2.3,
      noiseAmt: 14,
      roughness: 0.86,
    });
    if (shadowGen) shadowGen.addShadowCaster(post);
  }

  if (shadowGen) shadowGen.addShadowCaster(railTop);
  createPropContactShadow(scene, name + '_shadow', {
    x,
    y: y - 0.8,
    z,
    w: 8.2,
    d: 1.3,
    alpha: 0.12,
  });
  return railTop;
}

function createHangingPaperRing(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const thread = BABYLON.MeshBuilder.CreateBox(name + '_thread', {
    width: 0.05, height: 1.0, depth: 0.05,
  }, scene);
  thread.position.y = 0.45;
  thread.parent = root;
  thread.material = makePaper(scene, name + '_threadMat', 220, 210, 195, {
    grainScale: 3.1,
    noiseAmt: 6,
    roughness: 0.96,
  });

  const ring = BABYLON.MeshBuilder.CreateTorus(name + '_ring', {
    diameter: 0.9,
    thickness: 0.12,
    tessellation: 28,
  }, scene);
  ring.position.y = -0.1;
  ring.parent = root;
  ring.material = makePlastic(scene, name + '_ringMat', ...P.accentYellow, { roughness: 0.34 });

  const inner = BABYLON.MeshBuilder.CreateDisc(name + '_ringInner', {
    radius: 0.22, tessellation: 22,
  }, scene);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = -0.1;
  inner.parent = root;
  inner.material = makePaper(scene, name + '_ringInnerMat', 250, 246, 233, {
    grainScale: 2.4,
    noiseAmt: 8,
  });

  if (shadowGen) {
    shadowGen.addShadowCaster(thread);
    shadowGen.addShadowCaster(ring);
  }
  createPropContactShadow(scene, name + '_shadow', {
    x,
    y: y - 1.02,
    z,
    w: 1.2,
    d: 0.7,
    alpha: 0.13,
  });
  return root;
}

function createToyBlock(scene, name, { x, y, z, color, letter = 'D', shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const block = BABYLON.MeshBuilder.CreateBox(name + '_cube', {
    width: 0.62, height: 0.62, depth: 0.62,
  }, scene);
  block.parent = root;
  block.material = makePlastic(scene, name + '_cubeMat', ...color, { roughness: 0.42 });

  const face = BABYLON.MeshBuilder.CreatePlane(name + '_face', {
    width: 0.42, height: 0.42,
  }, scene);
  face.position.set(0, 0.02, -0.315);
  face.parent = root;
  const faceTex = new BABYLON.DynamicTexture(name + '_faceTex', 64, scene, true);
  const ctx = faceTex.getContext();
  ctx.fillStyle = 'rgba(252,246,226,0.92)';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#6b4e34';
  ctx.font = 'bold 40px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 32, 36);
  faceTex.update();
  const faceMat = new BABYLON.StandardMaterial(name + '_faceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  face.material = faceMat;

  if (shadowGen) shadowGen.addShadowCaster(block);
  createPropContactShadow(scene, name + '_shadow', {
    x,
    y: y - 0.34,
    z,
    w: 0.66,
    d: 0.48,
    alpha: 0.14,
  });
  return root;
}

function createGoalBanner(scene, name, { x, y, z, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const leftPost = BABYLON.MeshBuilder.CreateBox(name + '_postL', {
    width: 0.12, height: 1.4, depth: 0.12,
  }, scene);
  leftPost.position.set(-1.1, 0.4, 0);
  leftPost.parent = root;
  leftPost.material = makeCardboard(scene, name + '_postLMat', ...P.edgeDark);

  const rightPost = BABYLON.MeshBuilder.CreateBox(name + '_postR', {
    width: 0.12, height: 1.4, depth: 0.12,
  }, scene);
  rightPost.position.set(1.1, 0.4, 0);
  rightPost.parent = root;
  rightPost.material = makeCardboard(scene, name + '_postRMat', ...P.edgeDark);

  const banner = BABYLON.MeshBuilder.CreatePlane(name + '_banner', {
    width: 2.2,
    height: 0.62,
  }, scene);
  banner.position.y = 1.1;
  banner.parent = root;
  const bannerTex = new BABYLON.DynamicTexture(name + '_bannerTex', 256, scene, true);
  const bctx = bannerTex.getContext();
  bctx.fillStyle = 'rgba(254,233,149,0.94)';
  bctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#cc4c3c';
  bctx.font = 'bold 100px Georgia';
  bctx.textAlign = 'center';
  bctx.textBaseline = 'middle';
  bctx.fillText('Da Da', 128, 138);
  bannerTex.update();
  const bannerMat = new BABYLON.StandardMaterial(name + '_bannerMat', scene);
  bannerMat.diffuseTexture = bannerTex;
  bannerMat.opacityTexture = bannerTex;
  bannerMat.useAlphaFromDiffuseTexture = true;
  bannerMat.specularColor = BABYLON.Color3.Black();
  banner.material = bannerMat;

  if (shadowGen) {
    shadowGen.addShadowCaster(leftPost);
    shadowGen.addShadowCaster(rightPost);
  }
  return root;
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

  // === LIGHTING (crafted 3-light rig) ===
  const keyLight = new BABYLON.DirectionalLight('keyLight', new BABYLON.Vector3(-0.56, -0.88, 0.22), scene);
  keyLight.position = new BABYLON.Vector3(22, 26, -12);
  keyLight.intensity = 1.02;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.92, 0.80);
  keyLight.specular = new BABYLON.Color3(0.55, 0.46, 0.34);

  const fillLight = new BABYLON.HemisphericLight('fillLight', new BABYLON.Vector3(0.1, 1, -0.18), scene);
  fillLight.intensity = 0.36;
  fillLight.diffuse = new BABYLON.Color3(0.70, 0.80, 0.94);
  fillLight.groundColor = new BABYLON.Color3(0.34, 0.32, 0.34);

  const rimLight = new BABYLON.PointLight('rimLight', new BABYLON.Vector3(-8.5, 8.8, -13.8), scene);
  rimLight.intensity = 0.30;
  rimLight.diffuse = new BABYLON.Color3(0.80, 0.92, 1.0);
  rimLight.range = 40;

  // Goal hero light — warm accent near DaDa to make the destination pop.
  const goalLight = new BABYLON.PointLight('goalLight', new BABYLON.Vector3(30.2, 9.0, -6.0), scene);
  goalLight.intensity = 0.55;
  goalLight.diffuse = new BABYLON.Color3(1.0, 0.82, 0.50);
  goalLight.range = 18;

  const shadowGen = new BABYLON.ShadowGenerator(1024, keyLight);
  // Keep shadow filtering stable in swiftshader and local browsers.
  shadowGen.usePoissonSampling = true;
  shadowGen.bias = 0.0006;
  shadowGen.normalBias = 0.02;
  shadowGen.setDarkness(0.36);

  // === DIORAMA BASE ===
  const groundDef = LEVEL1.ground;
  createCardboardPlatform(scene, 'ground', {
    x: groundDef.x, y: groundDef.y, z: groundDef.z,
    w: groundDef.w, h: groundDef.h, d: groundDef.d,
    slabColor: P.ground,
    edgeColor: P.edgeDark,
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
  const backdropCard = [
    Math.max(0, P.backdropCard[0] - 30),
    Math.max(0, P.backdropCard[1] - 30),
    Math.max(0, P.backdropCard[2] - 28),
  ];
  backdrop.material = makePaper(scene, 'backdropMat', ...backdropCard, {
    grainScale: 2.6,
    noiseAmt: 14,
    roughness: 0.98,
  });

  // Sky gradient: warm horizon at bottom, cool blue at top — DynamicTexture for clean gradient.
  const skyTex = new BABYLON.DynamicTexture('skyGradTex', { width: 4, height: 256 }, scene, true);
  const sCtx = skyTex.getContext();
  const skyGrad = sCtx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0.0, 'rgba(148,190,230,0.92)');  // cool upper blue
  skyGrad.addColorStop(0.48, 'rgba(178,212,240,0.78)'); // mid sky
  skyGrad.addColorStop(0.82, 'rgba(224,230,220,0.58)'); // hazy horizon
  skyGrad.addColorStop(1.0, 'rgba(240,232,210,0.32)');  // warm ground haze
  sCtx.fillStyle = skyGrad;
  sCtx.fillRect(0, 0, 4, 256);
  skyTex.update();
  skyTex.hasAlpha = true;
  const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
  skyMat.diffuseTexture = skyTex;
  skyMat.opacityTexture = skyTex;
  skyMat.useAlphaFromDiffuseTexture = true;
  skyMat.specularColor = BABYLON.Color3.Black();
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new BABYLON.Color3(0.82, 0.88, 0.95);
  const skyPlane = BABYLON.MeshBuilder.CreatePlane('skyPlane', { width: 64, height: 20 }, scene);
  skyPlane.position.set(6, 9.5, 7.98);
  skyPlane.material = skyMat;

  // Backdrop seam lines (simulate paper join strips — deterministic, no random)
  const seamMat = makePaper(scene, 'seamMat', 190, 182, 168, { grainScale: 3.0, noiseAmt: 8, roughness: 0.99 });
  seamMat.alpha = 0.28;
  seamMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  for (let i = 0; i < 3; i++) {
    const seamY = 2.4 + i * 6.2;
    const seam = BABYLON.MeshBuilder.CreateBox(`seam_${i}`, { width: 67, height: 0.09, depth: 0.18 }, scene);
    seam.position.set(6, seamY, 8.05);
    seam.material = seamMat;
    seam.isPickable = false;
  }

  // === PARALLAX CUTOUT LAYERS (deterministic) ===
  const decorativeRand = seededRandom(5021);

  const backHills = [];
  for (let i = 0; i < 6; i++) {
    const mesh = makeCutoutPolygonMesh(scene, {
      name: `hillCutout_${i}`,
      seed: 1100 + i,
      pointsCount: 11,
      width: 8.5 + decorativeRand() * 3.4,
      height: 3.8 + decorativeRand() * 1.6,
      thickness: 0.09,
      x: -18 + i * 10.4 + decorativeRand() * 1.2,
      y: 1.3 + decorativeRand() * 1.0,
      z: 6.36 + i * 0.03,
      materialKind: 'paper',
      color: P.bgHills,
      noise: 0.17,
      materialOptions: { grainScale: 2.6, noiseAmt: 12, roughness: 0.97 },
    });
    backHills.push(mesh);
  }

  const midHedges = [];
  for (let i = 0; i < 7; i++) {
    const mesh = makeCutoutPolygonMesh(scene, {
      name: `hedgeCutout_${i}`,
      seed: 2200 + i,
      pointsCount: 12,
      width: 6.8 + decorativeRand() * 2.8,
      height: 2.8 + decorativeRand() * 1.2,
      thickness: 0.085,
      x: -20 + i * 8.6 + decorativeRand() * 1.4,
      y: 1.35 + decorativeRand() * 0.9,
      z: 4.46 + i * 0.03,
      materialKind: 'felt',
      color: P.feltGreen,
      noise: 0.2,
    });
    midHedges.push(mesh);
  }

  const foregroundMeshes = [];
  const foregroundCutouts = [];
  const foregroundDefs = [
    { x: -24.0, y: 1.4, z: -8.50, w: 7.2, h: 3.1, seed: 3301 },
    { x: -9.2, y: 1.0, z: -8.64, w: 6.0, h: 2.9, seed: 3302 },
    { x: 24.8, y: 1.2, z: -8.76, w: 7.4, h: 3.2, seed: 3303 },
    { x: 34.2, y: 1.0, z: -8.88, w: 7.8, h: 2.8, seed: 3304 },
  ];
  for (let i = 0; i < foregroundDefs.length; i++) {
    const def = foregroundDefs[i];
    const mesh = makeCutoutPolygonMesh(scene, {
      name: `foregroundPlant_${i}`,
      seed: def.seed,
      pointsCount: 10,
      width: def.w,
      height: def.h,
      thickness: 0.10,
      x: def.x,
      y: def.y,
      z: def.z,
      materialKind: 'felt',
      color: P.edgeDark,
      noise: 0.23,
    });
    mesh.metadata = { layer: 'foreground' };
    shadowGen.addShadowCaster(mesh);
    foregroundMeshes.push(mesh);
    foregroundCutouts.push(mesh);
  }

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
      slabColor: P.platformCard,
      edgeColor: P.edgeDark,
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

  // Foreground crib rail creates a toy-diorama frame for the start area.
  const cribRail = createCribRailSegment(scene, 'cribRailFg', {
    x: -15.2,
    y: 1.35,
    z: -8.95,
    shadowGen,
  });
  foregroundMeshes.push(cribRail);

  // A hanging ring near the early tutorial hop.
  const hangingRing = createHangingPaperRing(scene, 'hangingRing', {
    x: -8.6,
    y: 4.0,
    z: -1.7,
    shadowGen,
  });

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

  // Toy blocks near spawn to make the first area feel inhabited.
  const toyBlocks = [];
  toyBlocks.push(createToyBlock(scene, 'toyBlockA', {
    x: -17.2,
    y: 0.34,
    z: 1.25,
    color: [0.91, 0.42, 0.32],
    letter: 'D',
    shadowGen,
  }));
  toyBlocks.push(createToyBlock(scene, 'toyBlockB', {
    x: -16.35,
    y: 0.34,
    z: 1.05,
    color: [0.93, 0.74, 0.30],
    letter: 'A',
    shadowGen,
  }));
  toyBlocks.push(createToyBlock(scene, 'toyBlockC', {
    x: -15.48,
    y: 0.34,
    z: 1.3,
    color: [0.36, 0.66, 0.82],
    letter: 'D',
    shadowGen,
  }));

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
  const treeDecor = [];
  for (let i = 0; i < 6; i++) {
    const tx = -13 + i * 8;
    const treeRoot = new BABYLON.TransformNode(`treeDecor_${i}`, scene);
    treeRoot.position.set(tx, 2.5, 4.5);

    const trunk = BABYLON.MeshBuilder.CreateBox('trunk' + i, {
      width: 0.3, height: 1.5, depth: 0.25,
    }, scene);
    trunk.position.set(0, 0, 0);
    trunk.parent = treeRoot;
    trunk.material = makeFelt(scene, 'trunkMat' + i, ...P.trunk);

    const foliage = BABYLON.MeshBuilder.CreateSphere('foliage' + i, {
      diameter: 1.8, segments: 10,
    }, scene);
    foliage.position.set(0, 1.3, 0);
    foliage.parent = treeRoot;
    foliage.scaling.y = 0.8;
    const fR = P.foliageBase[0] + random() * 0.12;
    const fG = P.foliageBase[1] + random() * 0.12;
    const fB = P.foliageBase[2] + random() * 0.08;
    foliage.material = makeFelt(scene, 'foliageMat' + i, fR, fG, fB);
    shadowGen.addShadowCaster(foliage);
    treeDecor.push(treeRoot);
  }

  const goalBanner = createGoalBanner(scene, 'goalBanner', {
    x: goalDef.x - 0.7,
    y: goalDef.y + 0.1,
    z: -1.6,
    shadowGen,
  });

  const cloudCutouts = [];
  for (let i = 0; i < 5; i++) {
    cloudCutouts.push(makeCloudCutout(scene, {
      name: `cloudCutout_${i}`,
      seed: 4400 + i,
      width: 4.0 + random() * 1.2,
      height: 1.8 + random() * 0.5,
      thickness: 0.065,
      x: -17 + i * 11.6 + random() * 0.6,
      y: 9.8 + random() * 1.9,
      z: 6.88 + i * 0.03,
      color: [245, 245, 240],
      alpha: 0.86,
    }));
  }

  return {
    ground: groundCollider,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes,
    extents: LEVEL1.extents,
    spawn: LEVEL1.spawn,
    checkpoints,
    pickups,
    hazards,
    level: LEVEL1,
    signs: signRoots,
    assetAnchors: {
      cribRail,
      hangingRing,
      toyBlocks,
      goalBanner,
      backHills,
      midHedges,
      foregroundCutouts,
      treeDecor,
      cloudCutouts,
    },
  };
}
