import * as BABYLON from '@babylonjs/core';
import {
  makeCardboard,
  makePlastic,
  makePaper,
} from '../materials.js';
import { LEVEL3, LANE_Z3 } from './level3.js';
import {
  createCardboardPlatform,
  createCoin,
  createCheckpointMarker,
  createDaDa,
  createOnesiePickup,
  setRenderingGroup,
} from './buildWorld.js';

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
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraBlocker: false,
    };
  }
}

function createTimedHazardVisual(scene, name, {
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

  const house = BABYLON.MeshBuilder.CreateBox('grandmaHouseSilhouette', {
    width: 12,
    height: 8,
    depth: 0.8,
  }, scene);
  house.position.set(75, 5.0, 6.8);
  house.material = makeCardboard(scene, 'grandmaHouseMat', 188, 144, 110, { roughness: 0.9 });
  house.receiveShadows = true;
  shadowGen.addShadowCaster(house);

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
  const dada = createDaDa(scene, goalDef.x, goalDef.y, shadowGen, { animate: animateGoal });
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
    const visual = createTimedHazardVisual(scene, sprinkler.name, {
      x: sprinkler.x,
      y: sprinkler.y,
      z: LANE_Z,
      width: sprinkler.width,
      height: sprinkler.height,
      color: [0.34, 0.63, 0.92],
    });
    setRenderingGroup(visual.root, 3);
    timedHazards.push({
      ...sprinkler,
      reason: 'sprinkler',
      statusText: 'Sprinkled!',
      root: visual.root,
      mesh: visual.column,
      active: false,
      handledByLevelRuntime: true,
      minX: sprinkler.x - sprinkler.width * 0.5,
      maxX: sprinkler.x + sprinkler.width * 0.5,
      minY: sprinkler.y - sprinkler.height * 0.5,
      maxY: sprinkler.y + sprinkler.height * 0.5,
    });
  }
  for (const vent of LEVEL3.steamVents) {
    const visual = createTimedHazardVisual(scene, vent.name, {
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

  let runtimeMs = 0;

  function updateTimedHazardState(hazard) {
    const cycleMs = hazard.onMs + hazard.offMs;
    const cycleTime = (runtimeMs + hazard.phaseMs) % cycleMs;
    hazard.active = cycleTime < hazard.onMs;
    hazard.root.setEnabled(true);
    hazard.mesh.visibility = hazard.active ? 0.88 : 0.16;
    hazard.mesh.isVisible = true;
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
