// buildWorld2.js — Level 2 "Condo Garden" world builder
import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePlastic,
} from '../materials.js';
import { LEVEL2, LANE_Z2 } from './level2.js';
import {
  createCardboardPlatform,
  createCoin,
  createCheckpointMarker,
  createDaDa,
  createOnesiePickup,
  createCrumblePlatform,
  setRenderingGroup,
} from './buildWorld.js';

const LANE_Z = LANE_Z2;

// Condo palette — cooler, indoor, pastel
const P2 = {
  ground:       [195, 182, 165],
  platformCard: [210, 195, 170],
  edgeDark:     [148, 130, 105],
};

// ── Slip / hazard zone ────────────────────────────────────────────

function createHazardZone(scene, name, { x, y, z = 0, width, depth }) {
  const mat = new BABYLON.PBRMaterial(name + '_mat', scene);
  mat.albedoColor = new BABYLON.Color3(0.88, 0.28, 0.20);
  mat.roughness = 0.85;
  mat.metallic = 0.0;
  mat.alpha = 0.55;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width,
    height: 0.04,
    depth,
  }, scene);
  mesh.position.set(x, y, z);
  mesh.material = mat;
  return mesh;
}

// ── Amanda patrol character ────────────────────────────────────────

function createAmandaMesh(scene, name, { x, y, z = 0, w, h, d, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: w, height: h, depth: d,
  }, scene);
  body.position.y = 0;
  body.parent = root;
  const bodyMat = makePlastic(scene, name + '_bodyMat', 0.76, 0.48, 0.62, { roughness: 0.55 });
  body.material = bodyMat;
  body.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(body);

  // Head blob
  const head = BABYLON.MeshBuilder.CreateSphere(name + '_head', {
    diameter: w * 0.85, segments: 8,
  }, scene);
  head.position.y = h * 0.5 + w * 0.36;
  head.parent = root;
  const headMat = makePlastic(scene, name + '_headMat', 1.0, 0.84, 0.72, { roughness: 0.62 });
  head.material = headMat;
  if (shadowGen) shadowGen.addShadowCaster(head);

  return root;
}

// ── Rocking horse visual ──────────────────────────────────────────

function createRockingHorseVisual(scene, name, { x, y, z = 0, shadowGen }) {
  // Simple stylized horse shape — cardboard aesthetic
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: 1.6, height: 0.8, depth: 0.6,
  }, scene);
  body.position.y = 0.6;
  body.parent = root;
  body.material = makeCardboard(scene, name + '_bodyMat', 195, 165, 120, { roughness: 0.78 });
  body.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(body);

  const neck = BABYLON.MeshBuilder.CreateBox(name + '_neck', {
    width: 0.32, height: 0.65, depth: 0.45,
  }, scene);
  neck.position.set(0.7, 1.1, 0);
  neck.rotation.z = -0.3;
  neck.parent = root;
  neck.material = makeCardboard(scene, name + '_neckMat', 185, 155, 110, { roughness: 0.82 });
  neck.receiveShadows = true;

  const head = BABYLON.MeshBuilder.CreateBox(name + '_head', {
    width: 0.48, height: 0.42, depth: 0.38,
  }, scene);
  head.position.set(0.92, 1.5, 0);
  head.parent = root;
  head.material = makeCardboard(scene, name + '_headMat', 200, 170, 125, { roughness: 0.75 });
  head.receiveShadows = true;

  // Rockers
  for (const side of [-0.25, 0.25]) {
    const rocker = BABYLON.MeshBuilder.CreateCylinder(name + '_rocker' + side, {
      height: 1.4, diameter: 0.12, tessellation: 10,
    }, scene);
    rocker.rotation.z = Math.PI / 2;
    rocker.position.set(0, 0.12, side);
    rocker.parent = root;
    rocker.material = makeCardboard(scene, name + `_rockerMat${side}`, 150, 120, 90, { roughness: 0.9 });
  }

  return root;
}

// ── Baby crib / bed visual ────────────────────────────────────────

function createBedVisual(scene, name, { x, y, z = 0, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const mattress = BABYLON.MeshBuilder.CreateBox(name + '_mat', {
    width: 2.8, height: 0.3, depth: 1.8,
  }, scene);
  mattress.position.y = 0.5;
  mattress.parent = root;
  mattress.material = makeCardboard(scene, name + '_matMat', 220, 200, 175, { roughness: 0.72 });
  mattress.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(mattress);

  // Four corner posts
  const postDef = [[-1.25, 0.7], [1.25, 0.7], [-1.25, -0.7], [1.25, -0.7]];
  for (let i = 0; i < postDef.length; i++) {
    const [px, pz] = postDef[i];
    const post = BABYLON.MeshBuilder.CreateBox(name + `_post${i}`, {
      width: 0.14, height: 1.6, depth: 0.14,
    }, scene);
    post.position.set(px, 0.9, pz);
    post.parent = root;
    post.material = makeCardboard(scene, name + `_postMat${i}`, 200, 175, 140, { roughness: 0.85 });
    if (shadowGen) shadowGen.addShadowCaster(post);
  }

  // Side rails
  const railMat = makeCardboard(scene, name + '_railMat', 210, 185, 150, { roughness: 0.82 });
  for (const pz of [-0.78, 0.78]) {
    const rail = BABYLON.MeshBuilder.CreateBox(name + `_rail${pz}`, {
      width: 2.4, height: 0.12, depth: 0.10,
    }, scene);
    rail.position.set(0, 1.6, pz);
    rail.parent = root;
    rail.material = railMat;
  }

  return root;
}

// ── Piano visual ──────────────────────────────────────────────────

function createPianoVisual(scene, name, { x, y, z = 0, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: 2.8, height: 1.4, depth: 1.2,
  }, scene);
  body.position.y = 0;
  body.parent = root;
  body.material = makeCardboard(scene, name + '_bodyMat', 60, 50, 42, { roughness: 0.65 });
  body.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(body);

  // White key strip
  const keys = BABYLON.MeshBuilder.CreateBox(name + '_keys', {
    width: 2.2, height: 0.1, depth: 0.55,
  }, scene);
  keys.position.set(0, 0.72, 0.35);
  keys.parent = root;
  const keyMat = new BABYLON.PBRMaterial(name + '_keyMat', scene);
  keyMat.albedoColor = new BABYLON.Color3(0.96, 0.94, 0.90);
  keyMat.roughness = 0.40;
  keyMat.metallic = 0.0;
  keys.material = keyMat;

  // Lid
  const lid = BABYLON.MeshBuilder.CreateBox(name + '_lid', {
    width: 2.8, height: 0.08, depth: 1.2,
  }, scene);
  lid.position.y = 0.74;
  lid.parent = root;
  lid.material = makeCardboard(scene, name + '_lidMat', 48, 40, 34, { roughness: 0.55 });
  if (shadowGen) shadowGen.addShadowCaster(lid);

  return root;
}

// ── Main Level 2 world builder ────────────────────────────────────

export function buildWorld2(scene) {
  // Scene
  scene.clearColor = new BABYLON.Color4(0.88, 0.90, 0.94, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.38, 0.36, 0.40);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.007;
  scene.fogColor = new BABYLON.Color3(0.88, 0.90, 0.94);

  // Lighting
  const keyLight = new BABYLON.DirectionalLight('keyLight2', new BABYLON.Vector3(-0.5, -0.9, 0.25), scene);
  keyLight.position = new BABYLON.Vector3(20, 28, -12);
  keyLight.intensity = 1.05;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.94, 0.86);
  keyLight.specular = new BABYLON.Color3(0.50, 0.44, 0.36);

  const fillLight = new BABYLON.HemisphericLight('fillLight2', new BABYLON.Vector3(0.1, 1, -0.15), scene);
  fillLight.intensity = 0.42;
  fillLight.diffuse = new BABYLON.Color3(0.68, 0.78, 0.96);
  fillLight.groundColor = new BABYLON.Color3(0.36, 0.34, 0.38);

  const rimLight = new BABYLON.PointLight('rimLight2', new BABYLON.Vector3(-8, 9, -14), scene);
  rimLight.intensity = 0.38;
  rimLight.diffuse = new BABYLON.Color3(0.82, 0.94, 1.0);
  rimLight.range = 44;

  // Goal hero light
  const goalX = LEVEL2.goal.x;
  const goalLight = new BABYLON.PointLight('goalLight2', new BABYLON.Vector3(goalX, 12, -6), scene);
  goalLight.intensity = 0.50;
  goalLight.diffuse = new BABYLON.Color3(1.0, 0.85, 0.52);
  goalLight.range = 22;

  const shadowGen = new BABYLON.ShadowGenerator(1024, keyLight);
  shadowGen.usePoissonSampling = true;
  shadowGen.bias = 0.0006;
  shadowGen.normalBias = 0.02;
  shadowGen.setDarkness(0.36);

  // === GROUND ===
  const groundDef = LEVEL2.ground;
  createCardboardPlatform(scene, 'ground2', {
    x: groundDef.x, y: groundDef.y, z: groundDef.z,
    w: groundDef.w, h: groundDef.h, d: groundDef.d,
    slabColor: P2.ground,
    edgeColor: P2.edgeDark,
    shadowGen,
  });

  const groundCollider = BABYLON.MeshBuilder.CreateBox('groundCol2', {
    width: groundDef.w, height: groundDef.h, depth: groundDef.d,
  }, scene);
  groundCollider.position.set(groundDef.x, groundDef.y, groundDef.z);
  groundCollider.visibility = 0;
  groundCollider.isPickable = false;

  // === PLATFORMS ===
  const allPlatforms = [groundCollider];
  const platformColliders = {};  // name → collider mesh

  for (const def of LEVEL2.platforms) {
    createCardboardPlatform(scene, def.name, {
      x: def.x, y: def.y, z: LANE_Z,
      w: def.w, h: def.h, d: def.d,
      slabColor: P2.platformCard,
      edgeColor: P2.edgeDark,
      shadowGen,
    });

    const col = BABYLON.MeshBuilder.CreateBox(def.name + '_col', {
      width: def.w, height: def.h, depth: def.d,
    }, scene);
    col.position.set(def.x, def.y, LANE_Z);
    col.visibility = 0;
    col.isPickable = false;
    allPlatforms.push(col);
    platformColliders[def.name] = col;
  }

  // === GOAL (DaDa) ===
  const goalDef = LEVEL2.goal;
  const dada = createDaDa(scene, goalDef.x, goalDef.y, shadowGen, { animate: true });
  setRenderingGroup(dada.root, 3);

  // === CHECKPOINTS ===
  const checkpoints = [];
  for (let i = 0; i < LEVEL2.checkpoints.length; i++) {
    const cp = LEVEL2.checkpoints[i];
    const marker = createCheckpointMarker(scene, `cp2_${i}`, {
      x: cp.x, y: cp.y, z: 0.7, shadowGen,
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
  for (let i = 0; i < LEVEL2.pickups.length; i++) {
    const pick = LEVEL2.pickups[i];
    const node = createOnesiePickup(scene, `pickup2_${i}`, {
      x: pick.x, y: pick.y, z: LANE_Z, shadowGen,
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

  // === COINS ===
  const coins = [];
  for (let i = 0; i < LEVEL2.coins.length; i++) {
    const c = LEVEL2.coins[i];
    const node = createCoin(scene, `coin2_${i}`, { x: c.x, y: c.y, z: LANE_Z });
    node.position.z = LANE_Z;
    setRenderingGroup(node, 3);
    coins.push({
      position: new BABYLON.Vector3(c.x, c.y, LANE_Z),
      radius: 0.45,
      node,
      collected: false,
    });
  }

  // === HAZARDS ===
  const hazards = [];
  for (let i = 0; i < LEVEL2.hazards.length; i++) {
    const hz = LEVEL2.hazards[i];
    if (hz.type === 'slip') {
      createHazardZone(scene, `hazard2_${i}`, {
        x: hz.x, y: hz.y, z: hz.z,
        width: hz.width, depth: hz.depth,
      });
      hazards.push({
        type: hz.type,
        minX: hz.x - hz.width / 2,
        maxX: hz.x + hz.width / 2,
        minY: hz.y - 0.35,
        maxY: hz.y + 0.35,
        accelMultiplier: hz.accelMultiplier,
        decelMultiplier: hz.decelMultiplier,
      });
    }
  }

  // === CRUMBLES ===
  const crumbles = [];
  for (let i = 0; i < (LEVEL2.crumbles || []).length; i++) {
    const cr = LEVEL2.crumbles[i];
    const { root: crRoot, colliderMesh: crCol } = createCrumblePlatform(scene, cr.name, {
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h, d: cr.d,
      shadowGen,
    });
    crRoot.position.z = LANE_Z;
    allPlatforms.push(crCol);
    setRenderingGroup(crRoot, 2);
    crumbles.push({
      root: crRoot,
      colliderMesh: crCol,
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h,
    });
  }

  // === DECORATIVE BACKDROP ===
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop2', {
    width: 70, height: 22, depth: 0.5,
  }, scene);
  backdrop.position.set(9, 9, 9.2);
  const backdropMat = makeCardboard(scene, 'backdrop2Mat', 225, 220, 210, { roughness: 0.96 });
  backdrop.material = backdropMat;
  backdrop.receiveShadows = true;

  // === AMANDA PATROL ===
  const amandaDef = LEVEL2.amanda;
  let amandaX = amandaDef.minX;
  let amandaDir = 1;
  const amandaRoot = createAmandaMesh(scene, 'amanda', {
    x: amandaX, y: amandaDef.y, z: LANE_Z,
    w: amandaDef.w, h: amandaDef.h, d: amandaDef.d,
    shadowGen,
  });
  setRenderingGroup(amandaRoot, 3);

  // === ROCKING HORSE (MOVEABLE PLATFORM) ===
  const horseDef = LEVEL2.horse;
  let horseX = horseDef.startX;
  let horseSnapped = false;
  const horseVisualRoot = createRockingHorseVisual(scene, 'horseVisual', {
    x: horseX, y: LEVEL2.platforms.find((p) => p.name === 'platHorse').y, z: LANE_Z,
    shadowGen,
  });
  setRenderingGroup(horseVisualRoot, 2);

  // horseCollider is the invisible platform box for platHorse
  const horseColliderMesh = platformColliders[horseDef.platformName];

  // === DECORATIVE PROP VISUALS (fallbacks; GLBs loaded by boot.js) ===
  const babyBedAnchor = new BABYLON.TransformNode('babyBedAnchor', scene);
  babyBedAnchor.position.set(
    LEVEL2.assetAnchors.babyBed.x,
    LEVEL2.assetAnchors.babyBed.y,
    LEVEL2.assetAnchors.babyBed.z,
  );
  const babyBedVisual = createBedVisual(scene, 'babyBed', {
    x: LEVEL2.assetAnchors.babyBed.x,
    y: LEVEL2.assetAnchors.babyBed.y + 0.1,
    z: LANE_Z,
    shadowGen,
  });
  setRenderingGroup(babyBedVisual, 2);

  const pianoAnchor = new BABYLON.TransformNode('pianoAnchor', scene);
  pianoAnchor.position.set(
    LEVEL2.assetAnchors.piano.x,
    LEVEL2.assetAnchors.piano.y,
    LEVEL2.assetAnchors.piano.z,
  );
  const pianoVisual = createPianoVisual(scene, 'piano', {
    x: LEVEL2.assetAnchors.piano.x,
    y: LEVEL2.assetAnchors.piano.y,
    z: LANE_Z,
    shadowGen,
  });
  setRenderingGroup(pianoVisual, 2);

  const biancaAnchor = new BABYLON.TransformNode('biancaAnchor', scene);
  biancaAnchor.position.set(
    LEVEL2.assetAnchors.bianca.x,
    LEVEL2.assetAnchors.bianca.y,
    LEVEL2.assetAnchors.bianca.z,
  );

  const rockingHorseAnchor = new BABYLON.TransformNode('rockingHorseAnchor', scene);
  rockingHorseAnchor.position.set(horseX, LEVEL2.platforms.find((p) => p.name === 'platHorse').y, LANE_Z);

  // === LEVEL 2 RUNTIME LOGIC ===
  const PLAYER_HALF_W = 0.25;
  const PLAYER_HALF_H = 0.4;

  function updateAmanda(dt, { pos, triggerReset }) {
    amandaX += amandaDir * amandaDef.speed * dt;
    if (amandaX >= amandaDef.maxX) { amandaX = amandaDef.maxX; amandaDir = -1; }
    if (amandaX <= amandaDef.minX) { amandaX = amandaDef.minX; amandaDir = 1; }
    amandaRoot.position.x = amandaX;

    // Collision with player — simple AABB
    const halfW = amandaDef.w / 2 + PLAYER_HALF_W;
    const halfH = amandaDef.h / 2 + PLAYER_HALF_H;
    const dx = Math.abs(pos.x - amandaX);
    const dy = Math.abs(pos.y - amandaDef.y);
    if (dx < halfW && dy < halfH) {
      triggerReset('amanda', pos.x < amandaX ? -1 : 1);
    }
  }

  function updateHorse(dt, { pos, player }) {
    if (horseSnapped) return;
    const inPushZone = pos.x >= horseDef.pushZoneMinX && pos.x <= horseDef.pushZoneMaxX
      && Math.abs(pos.y - (LEVEL2.platforms.find((p) => p.name === 'platHorse').y + 0.4)) < 1.2;
    if (!inPushZone) return;

    horseX = Math.min(horseDef.snapX, horseX + horseDef.speed * dt);
    if (horseX >= horseDef.snapX) {
      horseX = horseDef.snapX;
      horseSnapped = true;
    }

    // Move visual
    horseVisualRoot.position.x = horseX;
    rockingHorseAnchor.position.x = horseX;

    // Update collision box position
    if (horseColliderMesh) {
      horseColliderMesh.position.x = horseX;
    }

    // Update player collider AABB for this platform
    if (player && player.colliders) {
      const idx = allPlatforms.indexOf(horseColliderMesh);
      const collider = idx >= 0 ? player.colliders[idx] : null;
      if (collider) {
        const platDef = LEVEL2.platforms.find((p) => p.name === 'platHorse');
        const halfW2 = platDef.w / 2;
        collider.minX = horseX - halfW2;
        collider.maxX = horseX + halfW2;
      }
    }
  }

  const level2 = {
    update(dt, { pos, triggerReset, player }) {
      updateAmanda(dt, { pos, triggerReset });
      updateHorse(dt, { pos, player });
    },
    reset() {
      amandaX = amandaDef.minX;
      amandaDir = 1;
      amandaRoot.position.x = amandaX;

      horseX = horseDef.startX;
      horseSnapped = false;
      horseVisualRoot.position.x = horseX;
      rockingHorseAnchor.position.x = horseX;
      if (horseColliderMesh) {
        horseColliderMesh.position.x = horseX;
      }
    },
    // Expose anchor nodes for GLB loading in boot.js
    anchors: {
      babyBed: babyBedAnchor,
      piano: pianoAnchor,
      bianca: biancaAnchor,
      rockingHorse: rockingHorseAnchor,
    },
    // Expose fallback visuals so boot.js can hide them when GLBs load
    fallbackVisuals: {
      babyBed: babyBedVisual,
      piano: pianoVisual,
    },
  };

  return {
    ground: groundCollider,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL2.extents,
    spawn: LEVEL2.spawn,
    checkpoints,
    pickups,
    coins,
    hazards,
    crumbles,
    level: LEVEL2,
    signs: [],
    level2,
    assetAnchors: {
      cribRail: [],
      toyBlocks: [],
      goalBanner: [],
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
      // Level 2 specific
      futureCribModel: [babyBedAnchor],
      futurePianoModel: [pianoAnchor],
      futureBiancaModel: [biancaAnchor],
      futureRockingHorseModel: [rockingHorseAnchor],
    },
  };
}
