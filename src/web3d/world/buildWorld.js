import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePaper,
  makeFelt,
  makePlastic,
} from '../materials.js';
import { LEVEL1, LANE_Z } from './level1.js';
import { makeCutoutPolygonMesh, makeCloudCutout, seededRandom } from './cutouts.js';
import { createDad } from './characters.js';

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
  hiMat.alpha = 0.44;
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

function applyDecorFlags(node) {
  if (!node) return;
  node.metadata = { ...(node.metadata || {}), cameraIgnore: true };
  if (node instanceof BABYLON.Mesh) {
    node.isPickable = false;
    node.checkCollisions = false;
    return;
  }
  for (const mesh of node.getChildMeshes?.(false) || []) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { ...(mesh.metadata || {}), cameraIgnore: true };
  }
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

function createHumanDad(scene, x, baseY, shadowGen, { animate = true } = {}) {
  const root = new BABYLON.TransformNode('humanDad', scene);
  root.position.set(x, baseY, 0);
  const visualRoot = new BABYLON.TransformNode('humanDadVisual', scene);
  visualRoot.parent = root;

  const shirtMat = new BABYLON.StandardMaterial('humanDadShirtMat', scene);
  shirtMat.diffuseColor = new BABYLON.Color3(0.25, 0.42, 0.74);
  shirtMat.specularColor = BABYLON.Color3.Black();
  const skinMat = new BABYLON.StandardMaterial('humanDadSkinMat', scene);
  skinMat.diffuseColor = new BABYLON.Color3(0.92, 0.79, 0.68);
  skinMat.specularColor = BABYLON.Color3.Black();
  const jeansMat = new BABYLON.StandardMaterial('humanDadJeansMat', scene);
  jeansMat.diffuseColor = new BABYLON.Color3(0.18, 0.24, 0.44);
  jeansMat.specularColor = BABYLON.Color3.Black();
  const darkMat = new BABYLON.StandardMaterial('humanDadDarkMat', scene);
  darkMat.diffuseColor = new BABYLON.Color3(0.18, 0.14, 0.12);
  darkMat.specularColor = BABYLON.Color3.Black();

  const torso = BABYLON.MeshBuilder.CreateCapsule('humanDadTorso', {
    height: 1.55,
    radius: 0.32,
    tessellation: 12,
  }, scene);
  torso.position.y = 1.5;
  torso.parent = visualRoot;
  torso.material = shirtMat;
  shadowGen.addShadowCaster(torso);

  const neck = BABYLON.MeshBuilder.CreateCylinder('humanDadNeck', {
    height: 0.16,
    diameter: 0.18,
  }, scene);
  neck.position.y = 2.33;
  neck.parent = visualRoot;
  neck.material = skinMat;
  shadowGen.addShadowCaster(neck);

  const head = BABYLON.MeshBuilder.CreateSphere('humanDadHead', {
    diameter: 0.66,
    segments: 16,
  }, scene);
  head.position.y = 2.72;
  head.parent = visualRoot;
  head.material = skinMat;
  shadowGen.addShadowCaster(head);

  const hair = BABYLON.MeshBuilder.CreateBox('humanDadHair', {
    width: 0.62,
    height: 0.22,
    depth: 0.56,
  }, scene);
  hair.position.set(0, 2.98, -0.02);
  hair.parent = visualRoot;
  hair.material = darkMat;
  shadowGen.addShadowCaster(hair);

  const beard = BABYLON.MeshBuilder.CreateBox('humanDadBeard', {
    width: 0.34,
    height: 0.18,
    depth: 0.08,
  }, scene);
  beard.position.set(0, 2.55, -0.31);
  beard.parent = visualRoot;
  beard.material = darkMat;
  shadowGen.addShadowCaster(beard);

  for (const side of [-1, 1]) {
    const arm = BABYLON.MeshBuilder.CreateCylinder(`humanDadArm${side}`, {
      height: 1.08,
      diameter: 0.16,
      tessellation: 10,
    }, scene);
    arm.position.set(side * 0.52, 1.63, 0);
    arm.rotation.z = side * 0.14;
    arm.parent = visualRoot;
    arm.material = shirtMat;
    shadowGen.addShadowCaster(arm);

    const hand = BABYLON.MeshBuilder.CreateSphere(`humanDadHand${side}`, {
      diameter: 0.18,
      segments: 10,
    }, scene);
    hand.position.set(side * 0.59, 1.08, 0);
    hand.parent = visualRoot;
    hand.material = skinMat;
    shadowGen.addShadowCaster(hand);

    const leg = BABYLON.MeshBuilder.CreateCylinder(`humanDadLeg${side}`, {
      height: 1.24,
      diameter: 0.2,
      tessellation: 10,
    }, scene);
    leg.position.set(side * 0.18, 0.62, 0);
    leg.parent = visualRoot;
    leg.material = jeansMat;
    shadowGen.addShadowCaster(leg);

    const shoe = BABYLON.MeshBuilder.CreateBox(`humanDadShoe${side}`, {
      width: 0.26,
      height: 0.1,
      depth: 0.46,
    }, scene);
    shoe.position.set(side * 0.18, 0.03, -0.04);
    shoe.parent = visualRoot;
    shoe.material = darkMat;
    shadowGen.addShadowCaster(shoe);
  }

  const faceTex = new BABYLON.DynamicTexture('humanDadFaceTex', { width: 128, height: 128 }, scene, true);
  const ctx = faceTex.getContext();
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#1d1a18';
  ctx.beginPath();
  ctx.arc(42, 48, 7, 0, Math.PI * 2);
  ctx.arc(86, 48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 70, 20, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  faceTex.update();
  faceTex.hasAlpha = true;

  const face = BABYLON.MeshBuilder.CreatePlane('humanDadFace', {
    width: 0.34,
    height: 0.34,
  }, scene);
  face.position.set(0, 2.73, -0.34);
  face.parent = visualRoot;
  const faceMat = new BABYLON.StandardMaterial('humanDadFaceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  faceMat.emissiveColor = new BABYLON.Color3(0.14, 0.12, 0.1);
  face.material = faceMat;

  root.scaling.setAll(1.18);
  applyDecorFlags(root);

  const goal = BABYLON.MeshBuilder.CreateBox('goalTrigger', {
    width: 3.0, height: 7.0, depth: 3.0,
  }, scene);
  goal.position.y = -1.8;
  goal.parent = root;
  goal.visibility = 0;
  goal.isPickable = false;
  goal.checkCollisions = false;
  goal.metadata = { ...(goal.metadata || {}), cameraIgnore: true };

  if (animate) {
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.001;
      visualRoot.rotation.z = Math.sin(t * 1.2) * 0.03;
      visualRoot.rotation.y = Math.sin(t * 0.75) * 0.035;
    });
  }

  return { root, goal, height: 3.22 };
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
  root.metadata = { ...(root.metadata || {}), cameraIgnore: true };

  const post = BABYLON.MeshBuilder.CreateBox(name + '_post', {
    width: 0.16, height: 1.36, depth: 0.16,
  }, scene);
  post.position.y = 0.68;
  post.parent = root;
  post.material = makeCardboard(scene, name + '_postMat', ...P.edgeDark);
  tagDecorMesh(post);

  const flag = BABYLON.MeshBuilder.CreateBox(name + '_flag', {
    width: 0.64, height: 0.34, depth: 0.06,
  }, scene);
  flag.position.set(0.40, 1.02, 0.02);
  flag.parent = root;
  flag.material = makePlastic(scene, name + '_flagMat', ...P.accentYellow, { roughness: 0.38 });
  tagDecorMesh(flag);

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
  torso.material = makeFelt(scene, name + '_torsoMat', 0.22, 0.45, 0.90, { roughness: 0.9 });

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
  hood.material = makeFelt(scene, name + '_hoodMat', 0.18, 0.40, 0.85, { roughness: 0.96 });

  const zipper = BABYLON.MeshBuilder.CreateBox(name + '_zip', {
    width: 0.06,
    height: 0.34,
    depth: 0.025,
  }, scene);
  zipper.position.set(0, 0.03, -0.12);
  zipper.parent = root;
  zipper.material = makePlastic(scene, name + '_zipMat', ...P.accentYellow, { roughness: 0.22 });

  // Floating burger badge above the onesie — makes it unmissable.
  const badge = BABYLON.MeshBuilder.CreatePlane(name + '_badge', { width: 0.38, height: 0.38 }, scene);
  badge.position.set(0, 0.54, 0);
  badge.parent = root;
  badge.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const badgeMat = new BABYLON.StandardMaterial(name + '_badgeMat', scene);
  badgeMat.diffuseTexture = new BABYLON.Texture('assets/ui/cheeseburger.svg', scene);
  badgeMat.diffuseTexture.hasAlpha = true;
  badgeMat.backFaceCulling = false;
  badge.material = badgeMat;

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

function createCrumblePlatform(scene, name, { x, y, z = 0, w, h, d, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  // Slightly lighter/more cracked look: lighter edge color, cracked-line overlay.
  const edgeH = Math.min(0.10, h * 0.16);
  const slabH = h - edgeH;

  // Use a lighter version of the platform color to visually signal "different"
  const slab = BABYLON.MeshBuilder.CreateBox(name + '_slab', {
    width: w, height: slabH, depth: d,
  }, scene);
  slab.position.y = edgeH / 2;
  slab.parent = root;
  slab.material = makeCardboard(scene, name + '_slabMat', 208, 196, 168, {
    grainScale: 1.6,
    noiseAmt: 28,  // extra noise → visibly "weathered"
    roughness: 0.88,
  });
  slab.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(slab);

  const edge = BABYLON.MeshBuilder.CreateBox(name + '_edge', {
    width: w + 0.06, height: edgeH, depth: d + 0.06,
  }, scene);
  edge.position.y = -(slabH / 2);
  edge.parent = root;
  edge.material = makeCardboard(scene, name + '_edgeMat', 160, 148, 118, { roughness: 0.92 });
  edge.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(edge);

  // Crack lines on top (3 diagonal planes to suggest fractures)
  const crackMat = new BABYLON.StandardMaterial(name + '_crackMat', scene);
  crackMat.diffuseColor = new BABYLON.Color3(0.28, 0.22, 0.16);
  crackMat.specularColor = BABYLON.Color3.Black();
  crackMat.disableLighting = true;
  crackMat.emissiveColor = new BABYLON.Color3(0.14, 0.10, 0.07);
  crackMat.alpha = 0.45;
  crackMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  for (let ci = 0; ci < 3; ci++) {
    const crack = BABYLON.MeshBuilder.CreateBox(name + `_crack${ci}`, {
      width: w * (0.28 + ci * 0.12),
      height: 0.008,
      depth: 0.06,
    }, scene);
    crack.rotation.y = (ci * 0.62);
    crack.position.y = (h * 0.5) + 0.005;
    crack.parent = root;
    crack.material = crackMat;
  }

  // Invisible collider mesh (separate from visual root — positions must match)
  const colliderMesh = BABYLON.MeshBuilder.CreateBox(name + '_col', {
    width: w, height: h, depth: d,
  }, scene);
  colliderMesh.position.set(x, y, z);
  colliderMesh.visibility = 0;
  colliderMesh.isPickable = false;

  return { root, colliderMesh };
}

function createCoin(scene, name, { x, y, z }) {
  // Baby pacifier collectible: shield + nipple + ring handle.
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  // Shield disc (mouth guard) — soft pink, faces -Z so it's visible from front.
  const shield = BABYLON.MeshBuilder.CreateCylinder(name + '_shield', {
    height: 0.04, diameter: 0.30, tessellation: 28,
  }, scene);
  shield.rotation.x = Math.PI / 2;
  shield.parent = root;
  const shieldMat = new BABYLON.PBRMaterial(name + '_shieldMat', scene);
  shieldMat.albedoColor = new BABYLON.Color3(0.98, 0.68, 0.72); // baby pink
  shieldMat.roughness = 0.55;
  shieldMat.metallic = 0.0;
  shieldMat.environmentIntensity = 0.3;
  shield.material = shieldMat;

  // Rim around the shield — slightly darker pink ring.
  const rim = BABYLON.MeshBuilder.CreateTorus(name + '_rim', {
    diameter: 0.30, thickness: 0.04, tessellation: 28,
  }, scene);
  rim.rotation.x = Math.PI / 2;
  rim.parent = root;
  const rimMat = new BABYLON.PBRMaterial(name + '_rimMat', scene);
  rimMat.albedoColor = new BABYLON.Color3(0.92, 0.52, 0.60);
  rimMat.roughness = 0.45;
  rimMat.metallic = 0.0;
  rimMat.environmentIntensity = 0.3;
  rim.material = rimMat;

  // Nipple — small cream-coloured elongated sphere protruding forward (-Z).
  const nipple = BABYLON.MeshBuilder.CreateSphere(name + '_nipple', {
    diameter: 0.11, segments: 8,
  }, scene);
  nipple.scaling.z = 1.7;
  nipple.position.z = -0.11;
  nipple.parent = root;
  const nippleMat = new BABYLON.PBRMaterial(name + '_nippleMat', scene);
  nippleMat.albedoColor = new BABYLON.Color3(0.98, 0.94, 0.84); // cream
  nippleMat.roughness = 0.60;
  nippleMat.metallic = 0.0;
  nippleMat.environmentIntensity = 0.3;
  nipple.material = nippleMat;

  // Ring handle — small torus behind the shield.
  const handle = BABYLON.MeshBuilder.CreateTorus(name + '_handle', {
    diameter: 0.16, thickness: 0.04, tessellation: 20,
  }, scene);
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.06;
  handle.parent = root;
  const handleMat = new BABYLON.PBRMaterial(name + '_handleMat', scene);
  handleMat.albedoColor = new BABYLON.Color3(0.55, 0.82, 0.94); // baby blue
  handleMat.roughness = 0.45;
  handleMat.metallic = 0.0;
  handleMat.environmentIntensity = 0.3;
  handle.material = handleMat;

  return root;
}

function setRenderingGroup(node, groupId) {
  if (!node || typeof node.getChildMeshes !== 'function') return;
  for (const mesh of node.getChildMeshes(false)) {
    mesh.renderingGroupId = groupId;
  }
}

function configureFoliageCutout(node) {
  if (!node || typeof node.getChildMeshes !== 'function') return;
  for (const mesh of node.getChildMeshes(false)) {
    const mat = mesh.material;
    if (!mat) continue;
    if (mat.albedoTexture || mat.diffuseTexture || mat.opacityTexture) {
      if (Object.prototype.hasOwnProperty.call(mat, 'transparencyMode')) {
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
      }
      if (Object.prototype.hasOwnProperty.call(mat, 'alphaCutOff')) {
        mat.alphaCutOff = 0.4;
      }
      mat.needDepthPrePass = true;
    }
  }
}

// ── Petting Zoo set-dressing helpers ─────────────────────────────

function tagDecorMesh(mesh) {
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.metadata = { ...(mesh.metadata || {}), cameraIgnore: true };
  return mesh;
}

function tagDecorNode(node) {
  node.metadata = { ...(node.metadata || {}), cameraIgnore: true };
  if (node instanceof BABYLON.Mesh) tagDecorMesh(node);
  for (const child of node.getChildMeshes ? node.getChildMeshes(false) : []) {
    tagDecorMesh(child);
  }
}

function getNearestLevel1SurfaceTopY(x) {
  const surfaces = [...LEVEL1.platforms, LEVEL1.ground];
  let nearest = surfaces[0];
  let bestDx = Number.POSITIVE_INFINITY;
  for (const surface of surfaces) {
    const halfW = surface.w * 0.5;
    const minX = surface.x - halfW;
    const maxX = surface.x + halfW;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const dx = Math.abs(x - clampedX);
    if (dx < bestDx) {
      bestDx = dx;
      nearest = surface;
    }
  }
  return nearest.y + (nearest.h * 0.5);
}

function getLevel1SurfaceByName(name) {
  if (!name || name === 'floor' || name === 'ground') return LEVEL1.ground;
  return LEVEL1.platforms.find((surface) => surface.name === name) || LEVEL1.ground;
}

function getLevel1SurfaceBounds(surfaceRef, {
  paddingX = 0,
  paddingZ = 0,
} = {}) {
  const surface = typeof surfaceRef === 'string'
    ? getLevel1SurfaceByName(surfaceRef)
    : (surfaceRef || LEVEL1.ground);
  const centerZ = surface.z ?? LANE_Z;
  return {
    surface,
    topY: surface.y + (surface.h * 0.5),
    minX: (surface.x - (surface.w * 0.5)) + paddingX,
    maxX: (surface.x + (surface.w * 0.5)) - paddingX,
    minZ: (centerZ - (surface.d * 0.5)) + paddingZ,
    maxZ: (centerZ + (surface.d * 0.5)) - paddingZ,
  };
}

function getNearestLevel1SurfaceBounds(x, options = {}) {
  const surfaces = [...LEVEL1.platforms, LEVEL1.ground];
  let nearest = surfaces[0];
  let bestDx = Number.POSITIVE_INFINITY;
  for (const surface of surfaces) {
    const halfW = surface.w * 0.5;
    const minX = surface.x - halfW;
    const maxX = surface.x + halfW;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const dx = Math.abs(x - clampedX);
    if (dx < bestDx) {
      bestDx = dx;
      nearest = surface;
    }
  }
  return getLevel1SurfaceBounds(nearest, options);
}

function clampToLevel1SurfaceBounds(x, z, bounds) {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, z)),
  };
}

function placeLevel1DecorAnchor(anchor, {
  x,
  z,
  surfaceName = 'floor',
  paddingX = 0.6,
  paddingZ = 0.6,
  minZ = null,
  maxZ = null,
}) {
  const bounds = getLevel1SurfaceBounds(surfaceName, { paddingX, paddingZ });
  if (Number.isFinite(minZ)) bounds.minZ = Math.max(bounds.minZ, minZ);
  if (Number.isFinite(maxZ)) bounds.maxZ = Math.min(bounds.maxZ, maxZ);
  const clamped = clampToLevel1SurfaceBounds(x, z, bounds);
  anchor.position.set(clamped.x, bounds.topY + 0.02, clamped.z);
  anchor.metadata = {
    ...(anchor.metadata || {}),
    cameraIgnore: true,
    level1DecorSurface: {
      type: surfaceName === 'floor' || surfaceName === 'ground' ? 'floor' : 'platform',
      name: surfaceName === 'ground' ? 'floor' : surfaceName,
      topY: bounds.topY,
      minX: bounds.minX,
      maxX: bounds.maxX,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ,
      baseY: bounds.topY + 0.02,
      paddingX,
      paddingZ,
    },
  };
  return bounds;
}

function createBillboardCloud(scene, name, {
  x,
  y,
  z,
  scale = 1,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.scaling.setAll(scale);
  root.metadata = { ...(root.metadata || {}), cameraIgnore: true };
  const shadowMat = makePaper(scene, `${name}_shadowMat`, 192, 206, 224, {
    roughness: 0.98,
    grainScale: 2.8,
    noiseAmt: 6,
  });
  shadowMat.emissiveColor = new BABYLON.Color3(0.68, 0.76, 0.86);
  const cloudMat = makePaper(scene, `${name}_mat`, 250, 250, 248, {
    roughness: 0.98,
    grainScale: 2.6,
    noiseAmt: 5,
  });
  cloudMat.emissiveColor = new BABYLON.Color3(0.94, 0.96, 1.0);

  const puffDefs = [
    { x: -2.1, y: 0.08, z: -0.08, d: 2.1 },
    { x: -0.8, y: 0.56, z: 0.02, d: 2.7 },
    { x: 0.9, y: 0.34, z: 0.06, d: 2.9 },
    { x: 2.35, y: 0.02, z: -0.02, d: 2.25 },
    { x: 0.1, y: -0.18, z: 0.10, d: 2.45 },
  ];
  for (const [index, puff] of puffDefs.entries()) {
    const shadow = BABYLON.MeshBuilder.CreateSphere(`${name}_shadow_${index}`, {
      diameter: puff.d * 1.02,
      segments: 12,
    }, scene);
    shadow.parent = root;
    shadow.position.set(puff.x + 0.12, puff.y - 0.16, puff.z + 0.18);
    shadow.scaling.y = 0.56;
    shadow.material = shadowMat;
    tagDecorMesh(shadow);

    const mesh = BABYLON.MeshBuilder.CreateSphere(`${name}_puff_${index}`, {
      diameter: puff.d,
      segments: 12,
    }, scene);
    mesh.parent = root;
    mesh.position.set(puff.x, puff.y, puff.z);
    mesh.scaling.y = 0.60;
    mesh.material = cloudMat;
    tagDecorMesh(mesh);
  }

  return root;
}

function fitSignLine(ctx, text, maxWidth, maxSize, minSize = 28, fontFamily = 'Georgia, serif') {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `bold ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

/** Cardboard welcome/directional sign on two posts. */
function createWelcomeSign(scene, {
  name = 'pz_welcomeSign',
  x,
  y,
  z,
  shadowGen,
  textLines = ['WELCOME TO THE', 'PETTING ZOO'],
  width = 2.42,
  height = 1.12,
  postHeight = 2.55,
  boardDepth = 0.09,
  textInsetPx = 72,
  fontFamily = 'Georgia, serif',
  postSpread = null,
  boardColor = [201, 152, 84],
  postColor = P.edgeDark,
  textEmissive = new BABYLON.Color3(0.36, 0.26, 0.12),
  boardName = 'welcome',
} = {}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  tagDecorNode(root);

  const postMat = makeCardboard(scene, `${boardName}_signPostMat`, ...postColor, { roughness: 0.88 });
  const boardWidth = width;
  const boardHeight = height;
  const postX = postSpread ?? ((boardWidth * 0.5) + 0.18);
  for (const px of [-postX, postX]) {
    const post = BABYLON.MeshBuilder.CreateBox(`${name}_post${px}`, {
      width: 0.13, height: postHeight, depth: 0.13,
    }, scene);
    post.position.set(px, postHeight * 0.5, 0.02);
    post.parent = root;
    post.material = postMat;
    if (shadowGen) shadowGen.addShadowCaster(post);
    tagDecorMesh(post);
  }

  // DynamicTexture sign board
  const texW = 512; const texH = 256;
  const signTex = new BABYLON.DynamicTexture(`${name}_tex`, { width: texW, height: texH }, scene, true);
  const ctx = signTex.getContext();
  ctx.fillStyle = '#c8974a';
  ctx.fillRect(0, 0, texW, texH);
  ctx.strokeStyle = '#6b3e18';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, texW - 20, texH - 20);
  // grain lines
  ctx.strokeStyle = 'rgba(90,54,18,0.14)';
  ctx.lineWidth = 2;
  for (let gy = 28; gy < texH; gy += 18) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(texW, gy + 4); ctx.stroke();
  }
  const maxTextWidth = texW - (textInsetPx * 2);
  ctx.fillStyle = '#2a1308';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const verticalPositions = textLines.length <= 1
    ? [texH * 0.5]
    : textLines.map((_, index) => {
      const start = texH * 0.34;
      const step = textLines.length === 2 ? texH * 0.36 : (texH * 0.44) / Math.max(1, textLines.length - 1);
      return start + (index * step);
    });
  const startSize = textLines.length <= 1 ? 116 : 96;
  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    const fontSize = fitSignLine(ctx, line, maxTextWidth, startSize - (i * 10), 34, fontFamily);
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillText(line, texW / 2, verticalPositions[i]);
  }
  signTex.update();

  const boardMat = makeCardboard(scene, `${boardName}_boardMat`, ...boardColor, { roughness: 0.82 });
  const signMat = new BABYLON.StandardMaterial(`${name}_signMat`, scene);
  signMat.diffuseTexture = signTex;
  signMat.opacityTexture = signTex;
  signMat.useAlphaFromDiffuseTexture = false;
  signMat.emissiveTexture = signTex;
  signMat.emissiveColor = textEmissive;
  signMat.specularColor = BABYLON.Color3.Black();
  signMat.backFaceCulling = false;

  const board = BABYLON.MeshBuilder.CreateBox(`${name}_board`, {
    width: boardWidth, height: boardHeight, depth: boardDepth,
  }, scene);
  board.position.set(0, (postHeight * 0.78), 0);
  board.parent = root;
  board.material = boardMat;
  if (shadowGen) shadowGen.addShadowCaster(board);
  tagDecorMesh(board);

  const textPlane = BABYLON.MeshBuilder.CreatePlane(`${name}_text`, {
    width: boardWidth * 0.92,
    height: boardHeight * 0.86,
  }, scene);
  textPlane.position.set(0, board.position.y, -(boardDepth * 0.5 + 0.03));
  textPlane.parent = root;
  textPlane.material = signMat;
  tagDecorMesh(textPlane);

  // Feet cross-pieces
  const footMat = makeCardboard(scene, `${boardName}_signFootMat`, ...postColor, { roughness: 0.92 });
  for (const px of [-0.54, 0.54]) {
    const foot = BABYLON.MeshBuilder.CreateBox(`${name}_foot${px}`, {
      width: 0.4, height: 0.08, depth: 0.28,
    }, scene);
    foot.position.set(px, 0.04, 0.03);
    foot.parent = root;
    foot.material = footMat;
    tagDecorMesh(foot);
  }

  return root;
}

/** Cardboard cutout panda on a post stand. */
function createPandaCutout(scene, { x, y, z }) {
  const root = new BABYLON.TransformNode('pz_panda', scene);
  root.position.set(x, y, z);
  tagDecorNode(root);

  // Draw panda on DynamicTexture
  const sz = 256;
  const pandaTex = new BABYLON.DynamicTexture('pz_pandaTex', sz, scene, true);
  const c = pandaTex.getContext();
  c.clearRect(0, 0, sz, sz);

  // White body blob
  c.fillStyle = '#f0ede8';
  c.beginPath(); c.ellipse(sz * 0.5, sz * 0.65, sz * 0.30, sz * 0.32, 0, 0, Math.PI * 2); c.fill();

  // White face circle
  c.fillStyle = '#f5f2ee';
  c.beginPath(); c.arc(sz * 0.5, sz * 0.26, sz * 0.21, 0, Math.PI * 2); c.fill();

  // Black ears
  c.fillStyle = '#111';
  for (const ex of [-0.20, 0.20]) {
    c.beginPath(); c.arc(sz * (0.5 + ex), sz * 0.08, sz * 0.09, 0, Math.PI * 2); c.fill();
  }
  // White inner ears
  c.fillStyle = '#ccc';
  for (const ex of [-0.20, 0.20]) {
    c.beginPath(); c.arc(sz * (0.5 + ex), sz * 0.08, sz * 0.052, 0, Math.PI * 2); c.fill();
  }

  // Eye patches
  c.fillStyle = '#111';
  for (const ex of [-0.088, 0.088]) {
    c.beginPath(); c.ellipse(sz * (0.5 + ex), sz * 0.265, sz * 0.075, sz * 0.058, ex < 0 ? 0.35 : -0.35, 0, Math.PI * 2); c.fill();
  }
  // White eyes
  c.fillStyle = '#f5f2ee';
  for (const ex of [-0.088, 0.088]) {
    c.beginPath(); c.arc(sz * (0.5 + ex), sz * 0.258, sz * 0.032, 0, Math.PI * 2); c.fill();
  }
  // Pupils
  c.fillStyle = '#111';
  for (const ex of [-0.088, 0.088]) {
    c.beginPath(); c.arc(sz * (0.5 + ex), sz * 0.260, sz * 0.018, 0, Math.PI * 2); c.fill();
  }

  // Nose
  c.fillStyle = '#333';
  c.beginPath(); c.ellipse(sz * 0.5, sz * 0.305, sz * 0.030, sz * 0.020, 0, 0, Math.PI * 2); c.fill();

  // Smile
  c.strokeStyle = '#333'; c.lineWidth = 3.5;
  c.beginPath(); c.arc(sz * 0.5, sz * 0.33, sz * 0.052, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();

  // Black arm patches
  c.fillStyle = '#111';
  c.beginPath(); c.ellipse(sz * 0.21, sz * 0.60, sz * 0.09, sz * 0.13, -0.28, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(sz * 0.79, sz * 0.60, sz * 0.09, sz * 0.13, 0.28, 0, Math.PI * 2); c.fill();

  // Legs
  for (const lx of [0.37, 0.63]) {
    c.beginPath(); c.ellipse(sz * lx, sz * 0.91, sz * 0.09, sz * 0.10, 0, 0, Math.PI * 2); c.fill();
  }

  pandaTex.update();
  pandaTex.hasAlpha = true;

  const pandaMat = new BABYLON.StandardMaterial('pz_pandaMat', scene);
  pandaMat.diffuseTexture = pandaTex;
  pandaMat.opacityTexture = pandaTex;
  pandaMat.useAlphaFromDiffuseTexture = true;
  pandaMat.emissiveColor = new BABYLON.Color3(0.22, 0.22, 0.22);
  pandaMat.specularColor = BABYLON.Color3.Black();
  pandaMat.backFaceCulling = false;

  // Cardboard backing
  const backing = BABYLON.MeshBuilder.CreateBox('pz_pandaBacking', {
    width: 1.10, height: 1.35, depth: 0.05,
  }, scene);
  backing.position.set(0, 0.78, 0.03);
  backing.parent = root;
  backing.material = makeCardboard(scene, 'pz_pandaBackMat', 195, 168, 128, { roughness: 0.88 });
  tagDecorMesh(backing);

  // Panda face plane in front of backing
  const pandaPlane = BABYLON.MeshBuilder.CreatePlane('pz_pandaPlane', { width: 1.05, height: 1.30 }, scene);
  pandaPlane.position.set(0, 0.78, -0.01);
  pandaPlane.parent = root;
  pandaPlane.material = pandaMat;
  tagDecorMesh(pandaPlane);

  // Base feet
  const bfMat = makeCardboard(scene, 'pz_pandaFeetMat', 175, 148, 108, { roughness: 0.92 });
  for (const fx of [-0.28, 0.28]) {
    const foot = BABYLON.MeshBuilder.CreateBox(`pz_pandaFoot${fx}`, {
      width: 0.24, height: 0.06, depth: 0.26,
    }, scene);
    foot.position.set(fx, 0.03, 0.02);
    foot.parent = root;
    foot.material = bfMat;
    tagDecorMesh(foot);
  }

  return root;
}

/** Simple wooden fence section: 2 posts + 2 horizontal rails. */
function createFenceSection(scene, name, { x, y, z, rotY = 0, length = 2.0, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  tagDecorNode(root);

  const postMat = makeCardboard(scene, name + '_pMat', 168, 140, 100, { roughness: 0.85 });
  const railMat = makeCardboard(scene, name + '_rMat', 185, 158, 118, { roughness: 0.82 });

  for (const side of [-0.5, 0.5]) {
    const post = BABYLON.MeshBuilder.CreateBox(name + `_p${side}`, {
      width: 0.12, height: 1.0, depth: 0.12,
    }, scene);
    post.position.set(side * length, 0.5, 0);
    post.parent = root;
    post.material = postMat;
    if (shadowGen) shadowGen.addShadowCaster(post);
    tagDecorMesh(post);
  }

  for (const ry of [0.28, 0.7]) {
    const rail = BABYLON.MeshBuilder.CreateBox(name + `_r${ry}`, {
      width: length * 2, height: 0.12, depth: 0.1,
    }, scene);
    rail.position.set(0, ry, 0);
    rail.parent = root;
    rail.material = railMat;
    tagDecorMesh(rail);
  }

  return root;
}

function createHayBale(scene, name, { x, y, z, scale = 1, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.scaling.setAll(scale);
  tagDecorNode(root);

  const bale = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {
    width: 0.9,
    height: 0.52,
    depth: 0.58,
  }, scene);
  bale.position.set(0, 0.26, 0);
  bale.parent = root;
  bale.material = makePaper(scene, `${name}_mat`, 219, 193, 88, {
    grainScale: 4.2,
    noiseAmt: 18,
    roughness: 0.94,
  });
  if (shadowGen) shadowGen.addShadowCaster(bale);
  tagDecorMesh(bale);

  const bandMat = makeCardboard(scene, `${name}_bandMat`, 138, 98, 46, { roughness: 0.88 });
  for (const offset of [-0.2, 0.2]) {
    const band = BABYLON.MeshBuilder.CreateBox(`${name}_band${offset}`, {
      width: 0.08,
      height: 0.56,
      depth: 0.6,
    }, scene);
    band.position.set(offset, 0.28, 0);
    band.parent = root;
    band.material = bandMat;
    tagDecorMesh(band);
  }
  return root;
}

function createMiniSign(scene, name, { x, y, z, label, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  tagDecorNode(root);

  const post = BABYLON.MeshBuilder.CreateBox(`${name}_post`, {
    width: 0.08,
    height: 0.78,
    depth: 0.08,
  }, scene);
  post.position.set(0, 0.39, 0.02);
  post.parent = root;
  post.material = makeCardboard(scene, `${name}_postMat`, 125, 92, 58, { roughness: 0.9 });
  if (shadowGen) shadowGen.addShadowCaster(post);
  tagDecorMesh(post);

  const boardTex = new BABYLON.DynamicTexture(`${name}_tex`, { width: 256, height: 128 }, scene, true);
  const ctx = boardTex.getContext();
  ctx.fillStyle = '#efd39a';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#7c5328';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = '#43210e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(label, 128, 66);
  boardTex.update();

  const boardMat = new BABYLON.StandardMaterial(`${name}_boardMat`, scene);
  boardMat.diffuseTexture = boardTex;
  boardMat.emissiveTexture = boardTex;
  boardMat.emissiveColor = new BABYLON.Color3(0.28, 0.2, 0.08);
  boardMat.specularColor = BABYLON.Color3.Black();

  const board = BABYLON.MeshBuilder.CreateBox(`${name}_board`, {
    width: 0.8,
    height: 0.34,
    depth: 0.06,
  }, scene);
  board.position.set(0, 0.76, 0);
  board.parent = root;
  board.material = boardMat;
  if (shadowGen) shadowGen.addShadowCaster(board);
  tagDecorMesh(board);

  return root;
}

// ── Shared helper exports (used by buildWorld2) ───────────────────
export {
  createCardboardPlatform,
  createCoin,
  createCheckpointMarker,
  createDaDa,
  createWelcomeSign,
  createOnesiePickup,
  createCrumblePlatform,
  setRenderingGroup,
};

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
  scene.fogDensity = 0.006;
  scene.fogColor = new BABYLON.Color3(...P.fogColor);

  // === LIGHTING (crafted 3-light rig) ===
  const keyLight = new BABYLON.DirectionalLight('keyLight', new BABYLON.Vector3(-0.56, -0.88, 0.22), scene);
  keyLight.position = new BABYLON.Vector3(22, 26, -12);
  keyLight.intensity = 1.12;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.92, 0.80);
  keyLight.specular = new BABYLON.Color3(0.55, 0.46, 0.34);

  const fillLight = new BABYLON.HemisphericLight('fillLight', new BABYLON.Vector3(0.1, 1, -0.18), scene);
  fillLight.intensity = 0.36;
  fillLight.diffuse = new BABYLON.Color3(0.70, 0.80, 0.94);
  fillLight.groundColor = new BABYLON.Color3(0.34, 0.32, 0.34);

  const rimLight = new BABYLON.PointLight('rimLight', new BABYLON.Vector3(-8.5, 8.8, -13.8), scene);
  rimLight.intensity = 0.44;
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
  const groundVisual = createCardboardPlatform(scene, 'ground', {
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
  skyGrad.addColorStop(0.0, 'rgba(110,168,220,0.96)');  // richer upper blue
  skyGrad.addColorStop(0.45, 'rgba(158,202,238,0.82)'); // mid sky
  skyGrad.addColorStop(0.78, 'rgba(216,228,218,0.62)'); // hazy horizon
  skyGrad.addColorStop(1.0, 'rgba(246,234,208,0.38)');  // warm amber ground haze
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
  backdrop.renderingGroupId = 0;
  skyPlane.renderingGroupId = 0;

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
    seam.renderingGroupId = 0;
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
    mesh.renderingGroupId = 0;
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
    mesh.renderingGroupId = 1;
    configureFoliageCutout(mesh);
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
    mesh.renderingGroupId = 4;
    configureFoliageCutout(mesh);
    shadowGen.addShadowCaster(mesh);
    foregroundMeshes.push(mesh);
    foregroundCutouts.push(mesh);
  }

  // === PLATFORMS ===
  const allPlatforms = [groundCollider];
  const surfaceVisuals = { floor: groundVisual };

  for (const def of LEVEL1.platforms) {
    const platformNode = createCardboardPlatform(scene, def.name, {
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
    setRenderingGroup(platformNode, 2);
    surfaceVisuals[def.name] = platformNode;

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
  const dada = createDad(scene, {
    x: goalDef.x,
    y: goalDef.y,
    z: 0,
    outfit: 'level1',
    shadowGen,
    animate: animateGoal,
    goalVolume: { width: 3.0, height: 7.0, depth: 3.0, yOffset: -1.8 },
  });
  setRenderingGroup(dada.root, 3);

  // Foreground crib rail creates a toy-diorama frame for the start area.
  const cribRail = createCribRailSegment(scene, 'cribRailFg', {
    x: -15.2,
    y: 1.35,
    z: -8.95,
    shadowGen,
  });
  cribRail.renderingGroupId = 4;
  foregroundMeshes.push(cribRail);

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
    setRenderingGroup(signRoots[signRoots.length - 1], 2);
  }

  // === CHECKPOINTS ===
  const checkpoints = [];
  for (let i = 0; i < LEVEL1.checkpoints.length; i++) {
    const cp = LEVEL1.checkpoints[i];
    const checkpointBounds = getNearestLevel1SurfaceBounds(cp.x, {
      paddingX: 0.72,
      paddingZ: 0.72,
    });
    const checkpointVisual = clampToLevel1SurfaceBounds(cp.x, 0.85, checkpointBounds);
    const marker = createCheckpointMarker(scene, `checkpoint_${i}`, {
      x: checkpointVisual.x,
      y: checkpointBounds.topY + 0.04,
      z: checkpointVisual.z,
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

  // === PICKUPS ===
  const pickups = [];
  for (let i = 0; i < LEVEL1.pickups.length; i++) {
    const pick = LEVEL1.pickups[i];
    const node = createOnesiePickup(scene, `pickup_${i}`, {
      x: pick.x,
      y: pick.y,
      z: LANE_Z, // enforce lane
      shadowGen,
    });
    node.position.z = LANE_Z; // extra safety after any child transformations
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

  // === COINS ===
  const coins = [];
  for (let i = 0; i < LEVEL1.coins.length; i++) {
    const c = LEVEL1.coins[i];
    const node = createCoin(scene, `coin_${i}`, { x: c.x, y: c.y, z: LANE_Z });
    node.position.z = LANE_Z; // enforce lane
    const collectibleId = `coin_${i}`;
    node.metadata = {
      ...(node.metadata || {}),
      collectibleId,
      collectibleType: 'coin',
    };
    for (const mesh of node.getChildMeshes(false)) {
      mesh.metadata = {
        ...(mesh.metadata || {}),
        collectibleId,
        collectibleType: 'coin',
      };
    }
    setRenderingGroup(node, 3);
    coins.push({
      position: new BABYLON.Vector3(c.x, c.y, LANE_Z),
      radius: 0.45,
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
  for (const toy of toyBlocks) setRenderingGroup(toy, 2);

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
      created.puddle.renderingGroupId = 2;
    }
  }

  // === CRUMBLE PLATFORMS ===
  const crumbles = [];
  for (let i = 0; i < (LEVEL1.crumbles || []).length; i++) {
    const cr = LEVEL1.crumbles[i];
    const { root: crRoot, colliderMesh: crCol } = createCrumblePlatform(scene, cr.name, {
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h, d: cr.d,
      shadowGen,
    });
    crRoot.position.z = LANE_Z; // enforce lane
    allPlatforms.push(crCol);
    setRenderingGroup(crRoot, 2);
    crumbles.push({
      root: crRoot,
      colliderMesh: crCol,
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h,
    });
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
    setRenderingGroup(treeRoot, 1);
    configureFoliageCutout(treeRoot);
  }

  const goalBanner = createGoalBanner(scene, 'goalBanner', {
    x: goalDef.x - 0.7,
    y: goalDef.y + 0.1,
    z: -1.6,
    shadowGen,
  });
  setRenderingGroup(goalBanner, 3);

  // === PETTING ZOO SET DRESSING (Level 1 theme) ===
  // All props sit behind the gameplay lane and are purely decorative.
  const pzRoot = new BABYLON.TransformNode('pz_root', scene);
  tagDecorNode(pzRoot);

  const startPenTopY = getNearestLevel1SurfaceTopY(-16.0) + 0.02;
  const bridgeSideTopY = getNearestLevel1SurfaceTopY(11.4) + 0.02;
  const farRightTopY = getNearestLevel1SurfaceTopY(27.0) + 0.02;
  const floorTopY = (LEVEL1.ground.y + (LEVEL1.ground.h * 0.5)) + 0.02;

  // Welcome sign near spawn
  const pzWelcomeSign = createWelcomeSign(scene, { x: -17.2, y: startPenTopY, z: 2.35, shadowGen });
  pzWelcomeSign.parent = pzRoot;
  setRenderingGroup(pzWelcomeSign, 2);

  // Panda cutout exhibit (far-left pen)
  const pzPanda = createPandaCutout(scene, { x: -21.0, y: startPenTopY, z: 2.75 });
  pzPanda.parent = pzRoot;
  setRenderingGroup(pzPanda, 2);

  // Fence sections — entrance corral + animal pens
  const pzFences = [
    createFenceSection(scene, 'pz_f0', { x: -19.2, y: startPenTopY, z: 2.42, rotY: 0,          length: 1.2, shadowGen }),
    createFenceSection(scene, 'pz_f1', { x: -16.6, y: startPenTopY, z: 3.08, rotY: 0,          length: 1.0, shadowGen }),
    createFenceSection(scene, 'pz_f2', { x: -12.4, y: startPenTopY, z: 3.18, rotY: 0,          length: 1.1, shadowGen }),
  ];
  for (const f of pzFences) {
    f.parent = pzRoot;
    setRenderingGroup(f, 2);
  }

  // Animal anchors — boot.js loads GLBs, fits + grounds them via fitLoadedModel
  const pzGoatAnchors = [
    new BABYLON.TransformNode('pz_goatAnchor0', scene),
    new BABYLON.TransformNode('pz_goatAnchor1', scene),
    new BABYLON.TransformNode('pz_goatAnchor2', scene),
    new BABYLON.TransformNode('pz_goatAnchor3', scene),
    new BABYLON.TransformNode('pz_goatAnchor4', scene),
    new BABYLON.TransformNode('pz_goatAnchor5', scene),
    new BABYLON.TransformNode('pz_goatAnchor6', scene),
  ];
  placeLevel1DecorAnchor(pzGoatAnchors[0], {
    x: -13.8,
    z: -1.22,
    surfaceName: 'platStart',
    paddingX: 0.85,
    paddingZ: 0.78,
    minZ: -1.72,
    maxZ: -0.62,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[1], {
    x: -6.8,
    z: -1.36,
    surfaceName: 'floor',
    paddingX: 1.1,
    paddingZ: 0.88,
    minZ: -1.86,
    maxZ: -0.78,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[2], {
    x: -1.8,
    z: -1.12,
    surfaceName: 'platVert1',
    paddingX: 0.82,
    paddingZ: 0.82,
    minZ: -1.56,
    maxZ: -0.72,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[3], {
    x: 8.9,
    z: -1.28,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.86,
    minZ: -1.84,
    maxZ: -0.78,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[4], {
    x: 14.2,
    z: -1.34,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.86,
    minZ: -1.86,
    maxZ: -0.82,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[5], {
    x: 18.8,
    z: -1.56,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.9,
    minZ: -1.96,
    maxZ: -0.88,
  });
  placeLevel1DecorAnchor(pzGoatAnchors[6], {
    x: 29.4,
    z: -1.42,
    surfaceName: 'floor',
    paddingX: 1.1,
    paddingZ: 0.9,
    minZ: -1.92,
    maxZ: -0.86,
  });

  const pzChickenAnchors = [
    new BABYLON.TransformNode('pz_chicken0', scene),
    new BABYLON.TransformNode('pz_chicken1', scene),
    new BABYLON.TransformNode('pz_chicken2', scene),
    new BABYLON.TransformNode('pz_chicken3', scene),
    new BABYLON.TransformNode('pz_chicken4', scene),
    new BABYLON.TransformNode('pz_chicken5', scene),
  ];
  placeLevel1DecorAnchor(pzChickenAnchors[0], {
    x: -11.9,
    z: -1.10,
    surfaceName: 'platStart',
    paddingX: 0.95,
    paddingZ: 0.82,
    minZ: -1.72,
    maxZ: -0.70,
  });
  placeLevel1DecorAnchor(pzChickenAnchors[1], {
    x: -10.7,
    z: -1.34,
    surfaceName: 'platStart',
    paddingX: 0.95,
    paddingZ: 0.82,
    minZ: -1.72,
    maxZ: -0.70,
  });
  placeLevel1DecorAnchor(pzChickenAnchors[2], {
    x: -9.8,
    z: -1.52,
    surfaceName: 'platStart',
    paddingX: 0.95,
    paddingZ: 0.82,
    minZ: -1.72,
    maxZ: -0.70,
  });
  placeLevel1DecorAnchor(pzChickenAnchors[3], {
    x: 12.0,
    z: -1.28,
    surfaceName: 'platBridge',
    paddingX: 0.82,
    paddingZ: 0.82,
    minZ: -1.64,
    maxZ: -0.74,
  });
  placeLevel1DecorAnchor(pzChickenAnchors[4], {
    x: 26.7,
    z: -1.18,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.82,
    minZ: -1.86,
    maxZ: -0.72,
  });
  placeLevel1DecorAnchor(pzChickenAnchors[5], {
    x: 28.1,
    z: -1.34,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.82,
    minZ: -1.92,
    maxZ: -0.82,
  });

  const pzDinoAnchors = [
    new BABYLON.TransformNode('pz_dinoAnchor0', scene),
    new BABYLON.TransformNode('pz_dinoAnchor1', scene),
  ];
  placeLevel1DecorAnchor(pzDinoAnchors[0], {
    x: 24.9,
    z: -1.22,
    surfaceName: 'floor',
    paddingX: 1.1,
    paddingZ: 0.9,
    minZ: -1.96,
    maxZ: -0.74,
  });
  placeLevel1DecorAnchor(pzDinoAnchors[1], {
    x: 28.8,
    z: -1.05,
    surfaceName: 'floor',
    paddingX: 1.1,
    paddingZ: 0.9,
    minZ: -1.86,
    maxZ: -0.72,
  });

  const pzPigAnchors = [
    new BABYLON.TransformNode('pz_pigAnchor0', scene),
    new BABYLON.TransformNode('pz_pigAnchor1', scene),
  ];
  placeLevel1DecorAnchor(pzPigAnchors[0], {
    x: 12.6,
    z: -1.08,
    surfaceName: 'platBridge',
    paddingX: 0.82,
    paddingZ: 0.78,
    minZ: -1.56,
    maxZ: -0.68,
  });
  placeLevel1DecorAnchor(pzPigAnchors[1], {
    x: 26.0,
    z: -1.26,
    surfaceName: 'floor',
    paddingX: 1.0,
    paddingZ: 0.86,
    minZ: -1.88,
    maxZ: -0.74,
  });

  const pzElephantAnchors = [
    new BABYLON.TransformNode('pz_elephantAnchor0', scene),
  ];
  placeLevel1DecorAnchor(pzElephantAnchors[0], {
    x: 22.8,
    z: -1.34,
    surfaceName: 'floor',
    paddingX: 1.2,
    paddingZ: 0.95,
    minZ: -2.02,
    maxZ: -0.82,
  });

  for (const anchor of [
    ...pzGoatAnchors,
    ...pzChickenAnchors,
    ...pzDinoAnchors,
    ...pzPigAnchors,
    ...pzElephantAnchors,
  ]) {
    anchor.parent = pzRoot;
    anchor.metadata = { ...(anchor.metadata || {}), cameraIgnore: true };
  }

  const pzHayBales = [
    createHayBale(scene, 'pz_hay0', { x: -15.0, y: startPenTopY, z: 3.35, scale: 1.0, shadowGen }),
    createHayBale(scene, 'pz_hay1', { x: -12.2, y: startPenTopY, z: 3.38, scale: 0.92, shadowGen }),
    createHayBale(scene, 'pz_hay2', { x: 7.9, y: getNearestLevel1SurfaceTopY(7.9) + 0.02, z: 2.72, scale: 0.95, shadowGen }),
  ];
  for (const bale of pzHayBales) {
    bale.parent = pzRoot;
    setRenderingGroup(bale, 2);
  }

  const pzMiniSigns = [
    createMiniSign(scene, 'pz_sign_goats', { x: -16.9, y: startPenTopY, z: 1.92, label: 'GOATS', shadowGen }),
    createMiniSign(scene, 'pz_sign_chickens', { x: -12.05, y: startPenTopY, z: 1.9, label: 'CHICKENS', shadowGen }),
    createMiniSign(scene, 'pz_sign_dino', { x: 24.6, y: floorTopY, z: -0.86, label: 'DINO', shadowGen }),
    createMiniSign(scene, 'pz_sign_rules', { x: 23.8, y: getNearestLevel1SurfaceTopY(23.8) + 0.02, z: 2.35, label: 'NO CLIMBING', shadowGen }),
  ];
  for (const sign of pzMiniSigns) {
    sign.parent = pzRoot;
    setRenderingGroup(sign, 2);
  }

  const laterPenTopY = getNearestLevel1SurfaceTopY(23.1) + 0.02;
  const pzLaterFences = [
    createFenceSection(scene, 'pz_f7', { x: 22.6, y: laterPenTopY, z: 2.66, rotY: 0, length: 1.2, shadowGen }),
    createFenceSection(scene, 'pz_f8', { x: 26.2, y: laterPenTopY, z: 2.96, rotY: 0, length: 1.0, shadowGen }),
  ];
  for (const f of pzLaterFences) {
    f.parent = pzRoot;
    setRenderingGroup(f, 2);
  }

  const pzPanda2 = createPandaCutout(scene, {
    x: 24.8,
    y: getNearestLevel1SurfaceTopY(24.8) + 0.02,
    z: 2.95,
  });
  pzPanda2.scaling.setAll(0.82);
  pzPanda2.parent = pzRoot;
  setRenderingGroup(pzPanda2, 2);

  const cloudCutouts = [];
  const cloudSkyMinY = 7.4;
  const cloudSkyMaxY = 9.6;
  const cloudSkyMinZ = -4.8;
  const cloudSkyMaxZ = -3.1;
  const cloudSpanX = 60;
  for (let i = 0; i < 12; i++) {
    const xT = i / 11;
    const y = cloudSkyMinY + (random() * (cloudSkyMaxY - cloudSkyMinY));
    const z = cloudSkyMinZ + (random() * (cloudSkyMaxZ - cloudSkyMinZ));
    const cloud = createBillboardCloud(scene, `cloudCutout_${i}`, {
      x: -25 + (cloudSpanX * xT) + ((random() - 0.5) * 2.2),
      y,
      z,
      scale: 0.84 + random() * 0.34,
    });
    cloud.metadata = {
      ...(cloud.metadata || {}),
      cameraIgnore: true,
      driftSpeed: 0.15 + ((i % 3) * 0.015),
      driftMinX: -29,
      driftMaxX: 39,
      driftStartX: cloud.position.x,
      driftBaseY: y,
      driftMinY: cloudSkyMinY,
      driftMaxY: cloudSkyMaxY,
      driftBaseZ: z,
      driftMinZ: cloudSkyMinZ,
      driftMaxZ: cloudSkyMaxZ,
      driftPhase: i * 0.58,
    };
    setRenderingGroup(cloud, 0);
    cloudCutouts.push(cloud);
  }

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes,
    extents: LEVEL1.extents,
    spawn: LEVEL1.spawn,
    checkpoints,
    pickups,
    coins,
    hazards,
    crumbles,
    level: LEVEL1,
    goalMinBottomY: (LEVEL1.platforms.find((p) => p.name === 'platRoof').y + (LEVEL1.platforms.find((p) => p.name === 'platRoof').h * 0.5)) - 0.2,
    surfaceVisuals,
    signs: signRoots,
    assetAnchors: {
      cribRail,
      toyBlocks,
      goalBanner,
      backHills,
      midHedges,
      foregroundCutouts,
      treeDecor,
      cloudCutouts,
      pettingZooGoat: pzGoatAnchors,
      pettingZooChickens: pzChickenAnchors,
      pettingZooDino: pzDinoAnchors,
      pettingZooPig: pzPigAnchors,
      pettingZooElephant: pzElephantAnchors,
    },
    level1Decor: {
      animalHomes: {
        goat: [
          { x: -13.8, y: startPenTopY, z: -1.22 },
          { x: -6.8, y: floorTopY, z: -1.36 },
          { x: -1.8, y: getNearestLevel1SurfaceTopY(-1.8) + 0.02, z: -1.12 },
          { x: 8.9, y: floorTopY, z: -1.28 },
          { x: 14.2, y: floorTopY, z: -1.34 },
          { x: 18.8, y: floorTopY, z: -1.56 },
          { x: 29.4, y: floorTopY, z: -1.42 },
        ],
        chickens: [
          { x: -11.9, y: startPenTopY, z: -1.12 },
          { x: -10.7, y: startPenTopY, z: -1.42 },
          { x: -9.6, y: startPenTopY, z: -1.68 },
          { x: 12.2, y: bridgeSideTopY, z: -1.45 },
          { x: 26.7, y: floorTopY, z: -1.18 },
          { x: 28.1, y: floorTopY, z: -1.42 },
        ],
        dino: [
          { x: 24.9, y: floorTopY, z: -1.22 },
          { x: 28.8, y: floorTopY, z: -1.05 },
        ],
        pig: [
          { x: 12.6, y: bridgeSideTopY, z: -1.1 },
          { x: 26.0, y: floorTopY, z: -1.26 },
        ],
        elephant: [{ x: 22.8, y: floorTopY, z: -1.34 }],
      },
    },
  };
}
