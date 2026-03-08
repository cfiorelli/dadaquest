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

function createBreadLoaf(scene, name, { x, y, z }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const crustMat = makeSourdoughMaterial(scene, `${name}_crust`, [214, 138, 56], 0.12);
  const domeMat  = makeSourdoughMaterial(scene, `${name}_dome`,  [238, 175, 84], 0.16);
  const baseMat  = makeSourdoughMaterial(scene, `${name}_base`,  [172, 108, 40], 0.08);

  // Loaf body
  const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {
    width: 2.0, height: 0.82, depth: 0.72,
  }, scene);
  body.parent = root;
  body.material = crustMat;

  // Rounded dome top
  const dome = BABYLON.MeshBuilder.CreateSphere(`${name}_dome`, {
    diameter: 2.0, segments: 10,
  }, scene);
  dome.parent = root;
  dome.position.y = 0.32;
  dome.scaling.set(1.0, 0.46, 0.36);
  dome.material = domeMat;

  // Score slash across the crown
  const score = BABYLON.MeshBuilder.CreateBox(`${name}_score`, {
    width: 1.12, height: 0.08, depth: 0.06,
  }, scene);
  score.parent = root;
  score.position.set(0, 0.68, -0.34);
  score.rotation.z = 0.18;
  score.material = baseMat;

  markDecor(root);
  return root;
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

  // Raining bread loaves — 22 loaves scattered across the background.
  const breadRain = [];
  const LOAF_COUNT = 22;
  const LOAF_TOP_Y  =  30;
  const LOAF_BOT_Y  = -10;
  for (let i = 0; i < LOAF_COUNT; i++) {
    // Spread x deterministically across the level span (-24 → 90).
    const x = -22 + (i * 5.3) + ((i % 4) * 2.6);
    // Stagger start Y so the first frame has loaves at all heights.
    const y = LOAF_BOT_Y + ((i * 11) % (LOAF_TOP_Y - LOAF_BOT_Y + 4));
    // Vary depth: z -22 to -29 (behind flour storms, in front of sky).
    const z = -22 - (i % 4) * 1.8;
    const loaf = createBreadLoaf(scene, `L4_breadRain${i}`, { x, y, z });
    loaf.parent = root;
    // Bake per-loaf motion params into metadata so update() reads them cheaply.
    loaf.metadata = {
      ...(loaf.metadata || {}),
      cameraIgnore: true, decor: true,
      fallSpeed:    3.2 + (i % 6) * 0.72,   // 3.2 – 5.8 u/s
      driftX:       ((i % 7) - 3) * 0.18,   // -0.54 – 0.54 u/s sideways
      tumble:       0.5 + (i % 5) * 0.30,   // 0.5 – 1.7 rad/s
      tumbleAxis:   i % 3,                   // 0=z 1=x 2=both
    };
    breadRain.push(loaf);
  }

  return { root, flourStorms, breadRain };
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
      for (const loaf of backdrop.breadRain) {
        const m = loaf.metadata;
        loaf.position.y -= m.fallSpeed * dt;
        loaf.position.x += m.driftX * dt;
        if (m.tumbleAxis === 0) {
          loaf.rotation.z += m.tumble * dt;
        } else if (m.tumbleAxis === 1) {
          loaf.rotation.x += m.tumble * dt;
        } else {
          loaf.rotation.z += m.tumble * dt * 0.65;
          loaf.rotation.x += m.tumble * dt * 0.45;
        }
        if (loaf.position.y < -10) {
          loaf.position.y = 30;
          loaf.position.x = -22 + Math.random() * 114;
          loaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        }
      }
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
