import * as BABYLON from '@babylonjs/core';
import { LEVEL5, LANE_Z5 } from './level5.js';
import { createTelegraphedHazard } from './telegraphHazard.js';
import { NoiseWanderMover } from './noiseMover.js';
import { createAquariumEnvironmentFx, markDecorNode } from './envFx.js';
import {
  createCheckpointMarker,
  createCoin,
  createOnesiePickup,
  setRenderingGroup,
} from './buildWorld.js';
import { createDad } from './characters.js';
import { makePlastic, makePaper } from '../materials.js';

const LANE_Z = LANE_Z5;
const EEL_WARN_SEC = 0.8;
const EEL_ACTIVE_SEC = 1.2;
const EEL_COOLDOWN_SEC = 1.0;
const SHARK_WARN_SEC = 1.2;
const SHARK_ACTIVE_SEC = 0.8;
const SHARK_COOLDOWN_SEC = 1.4;
const CURRENT_PUSH_DURATION_SEC = 1.2;
const JELLY_HIT_RADIUS = 0.78;
const JELLY_NEAR_MISS_RADIUS = 1.28;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function markDecor(node) {
  markDecorNode(node, { cameraBlocker: false });
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

function makeGlowMaterial(scene, name, rgb, {
  alpha = 1,
  emissive = 0.18,
  roughness = 0.44,
} = {}) {
  const material = makePlastic(scene, name, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, { roughness });
  material.alpha = alpha;
  material.emissiveColor = new BABYLON.Color3(
    (rgb[0] / 255) * emissive,
    (rgb[1] / 255) * emissive,
    (rgb[2] / 255) * emissive,
  );
  material.transparencyMode = alpha < 1 ? BABYLON.Material.MATERIAL_ALPHABLEND : material.transparencyMode;
  return material;
}

function createAquariumPlatform(scene, name, def, shadowGen) {
  const root = new BABYLON.TransformNode(`L5_${name}`, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const slab = BABYLON.MeshBuilder.CreateBox(`${name}_slab`, {
    width: def.w,
    height: def.h * 0.82,
    depth: def.d,
  }, scene);
  slab.parent = root;
  slab.position.y = 0.02;
  slab.material = makeGlowMaterial(scene, `${name}_slabMat`, [31, 117, 144], {
    emissive: 0.16,
    roughness: 0.32,
  });
  slab.receiveShadows = true;
  shadowGen.addShadowCaster(slab);

  const rim = BABYLON.MeshBuilder.CreateBox(`${name}_rim`, {
    width: def.w + 0.10,
    height: def.h * 0.26,
    depth: def.d + 0.10,
  }, scene);
  rim.parent = root;
  rim.position.y = -(def.h * 0.32);
  rim.material = makeGlowMaterial(scene, `${name}_rimMat`, [12, 48, 66], {
    emissive: 0.05,
    roughness: 0.62,
  });

  const topGlass = BABYLON.MeshBuilder.CreatePlane(`${name}_glass`, {
    width: Math.max(0.5, def.w - 0.18),
    height: Math.max(0.5, def.d - 0.18),
  }, scene);
  topGlass.parent = root;
  topGlass.rotation.x = Math.PI / 2;
  topGlass.position.y = (def.h * 0.5) + 0.012;
  const glassMat = new BABYLON.StandardMaterial(`${name}_glassMat`, scene);
  glassMat.diffuseColor = new BABYLON.Color3(0.16, 0.58, 0.68);
  glassMat.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.22);
  glassMat.alpha = 0.32;
  glassMat.specularColor = new BABYLON.Color3(0.72, 0.94, 1.0);
  glassMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  glassMat.backFaceCulling = false;
  topGlass.material = glassMat;
  markDecor(topGlass);

  const underside = BABYLON.MeshBuilder.CreatePlane(`${name}_undershadow`, {
    width: Math.max(0.5, def.w * 0.86),
    height: Math.max(0.5, def.d * 0.72),
  }, scene);
  underside.parent = root;
  underside.rotation.x = Math.PI / 2;
  underside.position.y = -(def.h * 0.5) - 0.018;
  const underMat = new BABYLON.StandardMaterial(`${name}_undershadowMat`, scene);
  underMat.diffuseColor = new BABYLON.Color3(0.02, 0.08, 0.10);
  underMat.emissiveColor = new BABYLON.Color3(0.01, 0.04, 0.05);
  underMat.alpha = 0.22;
  underMat.disableLighting = true;
  underMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  underside.material = underMat;
  markDecor(underside);

  return root;
}

function createBackdrop(scene) {
  const root = new BABYLON.TransformNode('L5_backdrop', scene);
  const shell = BABYLON.MeshBuilder.CreatePlane('L5_shell', {
    width: 190,
    height: 42,
  }, scene);
  shell.parent = root;
  shell.position.set(54, 12, 18);
  const shellMat = new BABYLON.StandardMaterial('L5_shellMat', scene);
  shellMat.diffuseColor = new BABYLON.Color3(0.03, 0.12, 0.18);
  shellMat.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);
  shellMat.alpha = 0.92;
  shellMat.disableLighting = true;
  shell.material = shellMat;
  markDecor(shell);

  const arches = [];
  for (let i = 0; i < 7; i++) {
    const arch = BABYLON.MeshBuilder.CreateTorus(`L5_arch_${i}`, {
      diameter: 8.2 + ((i % 2) * 1.2),
      thickness: 0.14,
      tessellation: 48,
    }, scene);
    arch.rotation.y = Math.PI / 2;
    arch.position.set(-12 + (i * 23), 7.5 + ((i % 3) * 1.4), 10.5 + (i % 2));
    arch.material = makeGlowMaterial(scene, `L5_archMat_${i}`, [54, 188, 212], {
      emissive: 0.34,
      alpha: 0.42,
      roughness: 0.18,
    });
    arches.push(arch);
    markDecor(arch);
  }

  const kelpFronds = [];
  for (let i = 0; i < 14; i++) {
    const frond = BABYLON.MeshBuilder.CreatePlane(`L5_kelp_${i}`, {
      width: 1.6 + ((i % 3) * 0.4),
      height: 6.5 + ((i % 4) * 1.2),
    }, scene);
    frond.parent = root;
    frond.position.set(14 + (i * 5.3), 2.4 + ((i % 3) * 0.6), 7.2 + ((i % 2) * 0.8));
    const mat = new BABYLON.StandardMaterial(`L5_kelpMat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.06, 0.38 + ((i % 3) * 0.04), 0.22);
    mat.emissiveColor = new BABYLON.Color3(0.03, 0.14, 0.08);
    mat.alpha = 0.50;
    mat.backFaceCulling = false;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    frond.material = mat;
    kelpFronds.push(frond);
    markDecor(frond);
  }

  const glassCylinder = BABYLON.MeshBuilder.CreateCylinder('L5_glassCylinder', {
    diameter: 18,
    height: 14,
    tessellation: 48,
  }, scene);
  glassCylinder.position.set(74, 6.8, 9.8);
  const glassMat = new BABYLON.StandardMaterial('L5_glassCylinderMat', scene);
  glassMat.diffuseColor = new BABYLON.Color3(0.10, 0.34, 0.44);
  glassMat.emissiveColor = new BABYLON.Color3(0.04, 0.12, 0.18);
  glassMat.alpha = 0.18;
  glassMat.backFaceCulling = false;
  glassMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  glassCylinder.material = glassMat;
  markDecor(glassCylinder);

  return {
    root,
    kelpFronds,
    arches,
    update(dt, time) {
      for (let i = 0; i < kelpFronds.length; i++) {
        kelpFronds[i].rotation.z = Math.sin((time * 0.7) + i) * 0.12;
      }
      for (let i = 0; i < arches.length; i++) {
        arches[i].rotation.z += dt * (0.04 + (i * 0.002));
      }
    },
    reset() {
      for (const arch of arches) {
        arch.rotation.z = 0;
      }
    },
  };
}

function createCurrentJet(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);
  const arrows = [];
  const bubbles = [];

  const zone = BABYLON.MeshBuilder.CreatePlane(`${def.name}_zone`, {
    width: def.w,
    height: def.h,
  }, scene);
  zone.parent = root;
  zone.position.z = 0.9;
  const zoneMat = new BABYLON.StandardMaterial(`${def.name}_zoneMat`, scene);
  zoneMat.diffuseColor = new BABYLON.Color3(0.12, 0.62, 0.74);
  zoneMat.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.20);
  zoneMat.alpha = 0.12;
  zoneMat.backFaceCulling = false;
  zoneMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  zone.material = zoneMat;
  markDecor(zone);

  for (let i = 0; i < 4; i++) {
    const arrow = BABYLON.MeshBuilder.CreatePlane(`${def.name}_arrow_${i}`, {
      width: 0.8,
      height: 0.28,
    }, scene);
    arrow.parent = root;
    arrow.position.set((-def.w * 0.36) + (i * 1.15), (-def.h * 0.2) + ((i % 2) * 0.72), 1.0);
    const arrowMat = new BABYLON.StandardMaterial(`${def.name}_arrowMat_${i}`, scene);
    arrowMat.diffuseColor = new BABYLON.Color3(0.44, 0.96, 1.0);
    arrowMat.emissiveColor = new BABYLON.Color3(0.20, 0.56, 0.60);
    arrowMat.alpha = 0.72;
    arrowMat.backFaceCulling = false;
    arrow.material = arrowMat;
    if (def.pushX < 0) {
      arrow.rotation.z = Math.PI;
    }
    arrows.push(arrow);
    markDecor(arrow);
  }

  for (let i = 0; i < 8; i++) {
    const bubble = BABYLON.MeshBuilder.CreateSphere(`${def.name}_bubble_${i}`, {
      diameter: 0.14 + ((i % 3) * 0.04),
      segments: 8,
    }, scene);
    bubble.parent = root;
    bubble.position.set((-def.w * 0.42) + ((i % 4) * 1.25), (-def.h * 0.38) + ((i % 2) * 0.95), 1.12);
    const bubbleMat = new BABYLON.StandardMaterial(`${def.name}_bubbleMat_${i}`, scene);
    bubbleMat.diffuseColor = new BABYLON.Color3(0.70, 0.94, 1.0);
    bubbleMat.emissiveColor = new BABYLON.Color3(0.06, 0.18, 0.22);
    bubbleMat.alpha = 0.34;
    bubbleMat.specularColor = new BABYLON.Color3(0.72, 0.92, 1.0);
    bubbleMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    bubble.material = bubbleMat;
    bubbles.push(bubble);
    markDecor(bubble);
  }

  return {
    ...def,
    root,
    arrows,
    bubbles,
    playerInside: false,
    time: 0,
    update(dt) {
      this.time += dt;
      for (let i = 0; i < this.arrows.length; i++) {
        const arrow = this.arrows[i];
        arrow.position.x += (this.pushX > 0 ? 1 : -1) * dt * 0.9;
        const minX = -this.w * 0.45;
        const maxX = this.w * 0.45;
        if (arrow.position.x > maxX) arrow.position.x = minX;
        if (arrow.position.x < minX) arrow.position.x = maxX;
      }
      for (let i = 0; i < this.bubbles.length; i++) {
        const bubble = this.bubbles[i];
        bubble.position.y += dt * (0.32 + (i * 0.01));
        bubble.position.x += (this.pushX > 0 ? 1 : -1) * dt * (0.20 + ((i % 3) * 0.04));
        if (bubble.position.y > (this.h * 0.45)) {
          bubble.position.y = -this.h * 0.44;
        }
        if (bubble.position.x > (this.w * 0.5)) bubble.position.x = -this.w * 0.45;
        if (bubble.position.x < (-this.w * 0.5)) bubble.position.x = this.w * 0.45;
      }
    },
    contains(pos) {
      return pos.x >= (this.x - this.w * 0.5)
        && pos.x <= (this.x + this.w * 0.5)
        && pos.y >= (this.y - this.h * 0.5)
        && pos.y <= (this.y + this.h * 0.5);
    },
  };
}

function createEelRail(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  const dx = def.x2 - def.x1;
  const dy = def.y2 - def.y1;
  const length = Math.sqrt((dx ** 2) + (dy ** 2));
  const angle = Math.atan2(dy, dx);
  root.position.set((def.x1 + def.x2) * 0.5, (def.y1 + def.y2) * 0.5, def.z ?? LANE_Z);
  root.rotation.z = angle;

  const postL = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_postL`, {
    diameter: 0.24,
    height: 1.5,
    tessellation: 16,
  }, scene);
  postL.parent = root;
  postL.position.set(-length * 0.5, 0, 0);
  postL.material = makeGlowMaterial(scene, `${def.name}_postLMat`, [18, 56, 78], {
    emissive: 0.08,
    roughness: 0.6,
  });
  markDecor(postL);

  const postR = postL.clone(`${def.name}_postR`);
  postR.parent = root;
  postR.position.x = length * 0.5;
  markDecor(postR);

  const beam = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_beam`, {
    diameter: 0.14,
    height: length,
    tessellation: 20,
  }, scene);
  beam.parent = root;
  beam.rotation.z = Math.PI * 0.5;
  beam.material = makeGlowMaterial(scene, `${def.name}_beamMat`, [88, 255, 242], {
    emissive: 0.42,
    alpha: 0.42,
    roughness: 0.18,
  });
  markDecor(beam);

  const halo = BABYLON.MeshBuilder.CreatePlane(`${def.name}_halo`, {
    width: length + 0.35,
    height: 0.42,
  }, scene);
  halo.parent = root;
  const haloMat = new BABYLON.StandardMaterial(`${def.name}_haloMat`, scene);
  haloMat.diffuseColor = new BABYLON.Color3(0.24, 1.0, 0.92);
  haloMat.emissiveColor = new BABYLON.Color3(0.14, 0.44, 0.38);
  haloMat.alpha = 0.18;
  haloMat.backFaceCulling = false;
  haloMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  halo.material = haloMat;
  halo.position.z = 0.4;
  markDecor(halo);

  return {
    ...def,
    root,
    beam,
    halo,
    length,
    lineDistanceToPoint(pos) {
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const localX = ((pos.x - root.position.x) * cos) - ((pos.y - root.position.y) * sin);
      const localY = ((pos.x - root.position.x) * sin) + ((pos.y - root.position.y) * cos);
      const clampedX = clamp(localX, -length * 0.5, length * 0.5);
      return Math.hypot(localX - clampedX, localY);
    },
  };
}

function createVent(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? LANE_Z);

  const grate = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_grate`, {
    diameter: def.w,
    height: 0.18,
    tessellation: 18,
  }, scene);
  grate.parent = root;
  grate.material = makeGlowMaterial(scene, `${def.name}_grateMat`, [36, 84, 92], {
    emissive: 0.08,
    roughness: 0.58,
  });
  markDecor(grate);

  const plume = BABYLON.MeshBuilder.CreatePlane(`${def.name}_plume`, {
    width: def.w * 1.6,
    height: def.h,
  }, scene);
  plume.parent = root;
  plume.position.y = def.h * 0.5;
  const plumeMat = new BABYLON.StandardMaterial(`${def.name}_plumeMat`, scene);
  plumeMat.diffuseColor = new BABYLON.Color3(0.56, 0.98, 1.0);
  plumeMat.emissiveColor = new BABYLON.Color3(0.14, 0.30, 0.34);
  plumeMat.alpha = 0.12;
  plumeMat.backFaceCulling = false;
  plumeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plume.material = plumeMat;
  markDecor(plume);

  return { ...def, root, grate, plume };
}

function createJellyfish(scene, def, shadowGen) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const bell = BABYLON.MeshBuilder.CreateSphere(`${def.name}_bell`, {
    diameter: 0.82,
    segments: 14,
  }, scene);
  bell.parent = root;
  bell.scaling.y = 0.75;
  bell.material = makeGlowMaterial(scene, `${def.name}_bellMat`, [118, 255, 248], {
    emissive: 0.30,
    alpha: 0.42,
    roughness: 0.16,
  });
  shadowGen.addShadowCaster(bell);
  markDecor(bell);

  const core = BABYLON.MeshBuilder.CreateSphere(`${def.name}_core`, {
    diameter: 0.28,
    segments: 8,
  }, scene);
  core.parent = root;
  core.position.y = 0.05;
  core.material = makeGlowMaterial(scene, `${def.name}_coreMat`, [255, 156, 242], {
    emissive: 0.42,
    roughness: 0.12,
  });
  markDecor(core);

  const tentacles = [];
  for (let i = 0; i < 5; i++) {
    const path = [
      new BABYLON.Vector3(-0.18 + (i * 0.09), -0.2, 0),
      new BABYLON.Vector3(-0.16 + (i * 0.08), -0.62, -0.02 + ((i % 2) * 0.02)),
      new BABYLON.Vector3(-0.14 + (i * 0.07), -1.05, 0.04 - ((i % 3) * 0.03)),
    ];
    const tentacle = BABYLON.MeshBuilder.CreateTube(`${def.name}_tentacle_${i}`, {
      path,
      radius: 0.018,
      tessellation: 8,
    }, scene);
    tentacle.parent = root;
    tentacle.material = makeGlowMaterial(scene, `${def.name}_tentacleMat_${i}`, [142, 255, 246], {
      emissive: 0.18,
      alpha: 0.36,
      roughness: 0.24,
    });
    tentacles.push(tentacle);
    markDecor(tentacle);
  }

  const mover = new NoiseWanderMover({
    root,
    bounds: def.bounds,
    speed: def.speed,
    turnSpeed: def.turnSpeed,
    retargetEvery: [1.3, 2.7],
    bobAmp: 0.18,
    bobFreq: 1.6,
    pauseChance: 0.22,
    pauseRange: [0.24, 0.74],
  });

  return {
    ...def,
    root,
    bell,
    tentacles,
    mover,
    nearMissCooldownMs: 0,
    baseY: def.y,
    update(dt) {
      mover.update(dt);
      for (let i = 0; i < tentacles.length; i++) {
        tentacles[i].rotation.z = Math.sin((performance.now() * 0.0024) + i + mover.time) * 0.10;
      }
      if (this.nearMissCooldownMs > 0) {
        this.nearMissCooldownMs = Math.max(0, this.nearMissCooldownMs - (dt * 1000));
      }
    },
    reset() {
      mover.reset();
      this.nearMissCooldownMs = 0;
    },
  };
}

function createSharkSweep(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.xMin, def.y, def.z ?? LANE_Z);

  const shadow = BABYLON.MeshBuilder.CreatePlane(`${def.name}_shadow`, {
    width: def.width * 1.6,
    height: def.height,
  }, scene);
  shadow.parent = root;
  shadow.position.z = 1.2;
  const shadowMat = new BABYLON.StandardMaterial(`${def.name}_shadowMat`, scene);
  shadowMat.diffuseColor = new BABYLON.Color3(0.02, 0.03, 0.05);
  shadowMat.emissiveColor = new BABYLON.Color3(0.01, 0.02, 0.03);
  shadowMat.alpha = 0.12;
  shadowMat.backFaceCulling = false;
  shadowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  shadow.material = shadowMat;
  markDecor(shadow);

  const laneIndicator = BABYLON.MeshBuilder.CreatePlane(`${def.name}_indicator`, {
    width: def.width * 1.25,
    height: def.height * 0.24,
  }, scene);
  laneIndicator.parent = root;
  laneIndicator.position.y = -(def.height * 0.48);
  laneIndicator.position.z = 0.8;
  const indicatorMat = new BABYLON.StandardMaterial(`${def.name}_indicatorMat`, scene);
  indicatorMat.diffuseColor = new BABYLON.Color3(0.90, 0.98, 1.0);
  indicatorMat.emissiveColor = new BABYLON.Color3(0.28, 0.36, 0.42);
  indicatorMat.alpha = 0.22;
  indicatorMat.backFaceCulling = false;
  indicatorMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  laneIndicator.material = indicatorMat;
  markDecor(laneIndicator);

  return {
    ...def,
    root,
    shadow,
    laneIndicator,
    currentX: def.xMin,
    getCollider(progress) {
      return {
        minX: this.xMin + ((this.xMax - this.xMin) * progress) - (this.width * 0.5),
        maxX: this.xMin + ((this.xMax - this.xMin) * progress) + (this.width * 0.5),
        minY: this.y - (this.height * 0.5),
        maxY: this.y + (this.height * 0.5),
      };
    },
    updateVisual(progress, intensity) {
      const centerX = this.xMin + ((this.xMax - this.xMin) * progress);
      this.currentX = centerX;
      this.root.position.x = centerX;
      shadowMat.alpha = 0.10 + (intensity * 0.22);
      indicatorMat.alpha = 0.12 + (intensity * 0.26);
    },
  };
}

export function buildWorld5(scene, options = {}) {
  const { animateGoal = true } = options;

  const shadowGen = new BABYLON.ShadowGenerator(1024, new BABYLON.DirectionalLight(
    'L5_keyLight',
    new BABYLON.Vector3(-0.35, -1.0, 0.22),
    scene,
  ));
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.bias = 0.00035;

  const hemi = new BABYLON.HemisphericLight('L5_fill', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.72;
  hemi.diffuse = new BABYLON.Color3(0.34, 0.74, 0.82);
  hemi.groundColor = new BABYLON.Color3(0.02, 0.05, 0.08);

  const rim = new BABYLON.PointLight('L5_rim', new BABYLON.Vector3(118, 18, -9), scene);
  rim.intensity = 0.52;
  rim.diffuse = new BABYLON.Color3(0.28, 0.94, 0.98);

  const groundVisual = createAquariumPlatform(scene, 'ground', LEVEL5.ground, shadowGen);
  const groundCollider = makeInvisibleCollider(scene, 'L5_groundCollider', LEVEL5.ground);
  const allPlatforms = [groundCollider];
  const platformVisuals = [];

  for (const def of LEVEL5.platforms) {
    const visual = createAquariumPlatform(scene, def.name, def, shadowGen);
    setRenderingGroup(visual, 2);
    platformVisuals.push(visual);
    const collider = makeInvisibleCollider(scene, `L5_${def.name}_col`, def);
    allPlatforms.push(collider);
  }

  const checkpoints = LEVEL5.checkpoints.map((cp, index) => ({
    index: index + 1,
    label: cp.label,
    spawn: { x: cp.x, y: cp.y, z: cp.z ?? LANE_Z },
    radius: 1.2,
    marker: createCheckpointMarker(scene, `L5_checkpoint_${index}`, {
      x: cp.x,
      y: cp.y - 0.06,
      z: 1.18,
      shadowGen,
    }),
  }));
  checkpoints.forEach((checkpoint) => markDecor(checkpoint.marker));

  const pickups = [
    {
      type: 'onesie',
      x: 48.8,
      y: 5.95,
      z: LANE_Z,
      radius: 0.95,
      durationMs: 10000,
      jumpBoost: 1.24,
      collected: false,
      position: new BABYLON.Vector3(48.8, 5.95, LANE_Z),
      node: createOnesiePickup(scene, 'L5_pickup_onesie', {
        x: 48.8,
        y: 5.95,
        z: 1.0,
        shadowGen,
      }).root,
    },
  ];
  pickups.forEach((pickup) => markDecor(pickup.node));

  const coins = LEVEL5.coins.map((coin, index) => {
    const node = createCoin(scene, `L5_coin_${index}`, coin);
    setRenderingGroup(node, 3);
    return {
      id: `l5_coin_${index}`,
      position: new BABYLON.Vector3(coin.x, coin.y, coin.z ?? LANE_Z),
      radius: 0.48,
      collected: false,
      node,
    };
  });

  const dad = createDad(scene, {
    x: LEVEL5.goal.x,
    y: LEVEL5.goal.y,
    z: LANE_Z,
    outfit: 'level3',
    shadowGen,
    animate: animateGoal,
  });
  dad.root.position.z = 0;

  const aquariumFx = createAquariumEnvironmentFx(scene, {
    extents: LEVEL5.extents,
    floorY: LEVEL5.ground.y + 0.8,
    farZ: 16,
  });
  const backdrop = createBackdrop(scene);

  const currentJets = LEVEL5.currents.map((def) => createCurrentJet(scene, def));
  const eelRails = LEVEL5.eelRails.map((def) => createEelRail(scene, def));
  const vents = LEVEL5.vents.map((def) => createVent(scene, def));
  const jellyfish = LEVEL5.jellyfish.map((def) => createJellyfish(scene, def, shadowGen));
  const sharkSweep = createSharkSweep(scene, LEVEL5.sharkSweep);

  const hazards = [];
  let currentPushTimer = 0;
  let currentPushForce = 0;
  let runtimeTime = 0;

  const eelHazards = eelRails.map((eelRail) => createTelegraphedHazard({
    name: eelRail.name,
    warnDuration: EEL_WARN_SEC,
    activeDuration: EEL_ACTIVE_SEC,
    cooldownDuration: EEL_COOLDOWN_SEC,
    phaseOffset: eelRail.phaseOffset,
    onWarnVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.22 + (progress * 0.16);
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.14 + (progress * 0.10), 0.36 + (progress * 0.20), 0.32 + (progress * 0.18));
      eelRail.halo.material.alpha = 0.10 + (progress * 0.12);
    },
    onActiveVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.92;
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.56, 1.0, 0.92);
      eelRail.halo.material.alpha = 0.24 + (Math.sin(progress * Math.PI * 4) * 0.06);
    },
    onCooldownVisual: ({ progress }) => {
      eelRail.beam.material.alpha = 0.10 + ((1 - progress) * 0.10);
      eelRail.beam.material.emissiveColor = new BABYLON.Color3(0.05, 0.14, 0.14);
      eelRail.halo.material.alpha = 0.05;
    },
    isPlayerHit: ({ pos }) => eelRail.lineDistanceToPoint(pos) <= 0.34,
    onHit: ({ pos, triggerReset }) => {
      triggerReset('eel_rail', pos.x < eelRail.root.position.x ? -1 : 1);
    },
  }));

  const ventHazards = vents.map((vent) => createTelegraphedHazard({
    name: vent.name,
    warnDuration: 0.65,
    activeDuration: 1.05,
    cooldownDuration: 1.15,
    phaseOffset: vent.phaseOffset,
    onWarnVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.10 + (progress * 0.18);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.08, 0.18 + (progress * 0.10), 0.20 + (progress * 0.10));
    },
    onActiveVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.32 + (Math.sin(progress * Math.PI * 8) * 0.04);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.20, 0.52, 0.56);
    },
    onCooldownVisual: ({ progress }) => {
      vent.plume.material.alpha = 0.06 + ((1 - progress) * 0.06);
      vent.plume.material.emissiveColor = new BABYLON.Color3(0.04, 0.08, 0.10);
    },
    isPlayerHit: ({ pos }) => pos.x >= (vent.x - (vent.w * 0.6))
      && pos.x <= (vent.x + (vent.w * 0.6))
      && pos.y >= (vent.y - 0.2)
      && pos.y <= (vent.y + (vent.h * 0.7)),
    onHit: ({ player }) => {
      player.vy = Math.max(player.vy, vent.liftVy);
    },
  }));

  const sharkHazard = createTelegraphedHazard({
    name: sharkSweep.name,
    warnDuration: SHARK_WARN_SEC,
    activeDuration: SHARK_ACTIVE_SEC,
    cooldownDuration: SHARK_COOLDOWN_SEC,
    phaseOffset: sharkSweep.phaseOffset,
    onWarnVisual: ({ progress }) => {
      sharkSweep.updateVisual(0.08 + (progress * 0.84), 0.5 + (progress * 0.4));
    },
    onActiveVisual: ({ progress }) => {
      sharkSweep.updateVisual(progress, 1);
    },
    onCooldownVisual: ({ progress }) => {
      sharkSweep.updateVisual(1, 0.20 * (1 - progress));
    },
    isPlayerHit: ({ pos }) => {
      const state = sharkHazard.getState();
      const duration = Math.max(0.001, state.duration);
      const collider = sharkSweep.getCollider(state.elapsed / duration);
      return pos.x >= collider.minX
        && pos.x <= collider.maxX
        && pos.y >= collider.minY
        && pos.y <= collider.maxY;
    },
    onHit: ({ pos, triggerReset }) => {
      triggerReset('shark_shadow', pos.x < sharkSweep.currentX ? -1 : 1);
    },
  });

  function updateCurrentJets(dt, player) {
    if (currentPushTimer > 0) {
      currentPushTimer = Math.max(0, currentPushTimer - dt);
      player.vx += currentPushForce * dt;
    }
    for (const jet of currentJets) {
      jet.update(dt);
      const inside = jet.contains(player.mesh.position);
      if (inside && !jet.playerInside) {
        currentPushForce = jet.pushX;
        currentPushTimer = CURRENT_PUSH_DURATION_SEC;
      }
      jet.playerInside = inside;
    }
  }

  function updateJellyfish(dt, pos, triggerReset, triggerNearMissCue) {
    const playerRadius = 0.36;
    for (const jelly of jellyfish) {
      jelly.update(dt);
      const jellyPos = jelly.root.position;
      const dx = pos.x - jellyPos.x;
      const dy = pos.y - jellyPos.y;
      const dz = pos.z - jellyPos.z;
      const distance = Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2));
      if (distance <= (JELLY_HIT_RADIUS + playerRadius)) {
        triggerReset('jellyfish', dx < 0 ? -1 : 1);
        continue;
      }
      if (distance <= (JELLY_NEAR_MISS_RADIUS + playerRadius) && jelly.nearMissCooldownMs <= 0) {
        jelly.nearMissCooldownMs = 900;
        triggerNearMissCue();
      }
    }
  }

  const level5 = {
    update(dt, { pos, player, triggerReset, triggerNearMissCue }) {
      runtimeTime += dt;
      aquariumFx.update(dt);
      backdrop.update(dt, runtimeTime);
      updateCurrentJets(dt, player);
      for (const eelHazard of eelHazards) {
        eelHazard.update(dt, { pos, player, triggerReset });
      }
      for (const ventHazard of ventHazards) {
        ventHazard.update(dt, { pos, player });
      }
      updateJellyfish(dt, pos, triggerReset, triggerNearMissCue);
      sharkHazard.update(dt, { pos, player, triggerReset });
    },
    reset() {
      runtimeTime = 0;
      currentPushTimer = 0;
      currentPushForce = 0;
      aquariumFx.reset();
      backdrop.reset();
      for (const jet of currentJets) {
        jet.playerInside = false;
      }
      for (const eelHazard of eelHazards) {
        eelHazard.reset();
      }
      for (const ventHazard of ventHazards) {
        ventHazard.reset();
      }
      for (const jelly of jellyfish) {
        jelly.reset();
      }
      sharkHazard.reset();
    },
    debugForceHazard(name, { pos, player, triggerReset } = {}) {
      if (name === 'shark') {
        triggerReset('shark_shadow', 1);
        return true;
      }
      if (name === 'jellyfish') {
        triggerReset('jellyfish', 1);
        return true;
      }
      const eelHazard = eelHazards.find((entry) => entry.name === name) || eelHazards[0];
      if (eelHazard) {
        triggerReset('eel_rail', pos?.x < player?.mesh?.position?.x ? -1 : 1);
        return true;
      }
      return false;
    },
    getDebugState() {
      return {
        currentPushTimer,
        currentPushForce,
        jellyfish: jellyfish.map((jelly) => ({
          name: jelly.name,
          x: jelly.root.position.x,
          y: jelly.root.position.y,
          z: jelly.root.position.z,
        })),
      };
    },
  };
  level5.reset();

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allPlatforms,
    goal: dad.goal,
    goalRoot: dad.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL5.extents,
    spawn: LEVEL5.spawn,
    checkpoints,
    pickups,
    coins,
    hazards: [
      ...LEVEL5.currents.map((current) => ({
        name: current.name,
        type: 'current',
        minX: current.x - (current.w * 0.5),
        maxX: current.x + (current.w * 0.5),
        minY: current.y - (current.h * 0.5),
        maxY: current.y + (current.h * 0.5),
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.eelRails.map((eelRail) => ({
        name: eelRail.name,
        type: 'eel_rail',
        minX: Math.min(eelRail.x1, eelRail.x2) - 0.4,
        maxX: Math.max(eelRail.x1, eelRail.x2) + 0.4,
        minY: Math.min(eelRail.y1, eelRail.y2) - 0.4,
        maxY: Math.max(eelRail.y1, eelRail.y2) + 0.4,
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.vents.map((vent) => ({
        name: vent.name,
        type: 'vent',
        minX: vent.x - vent.w,
        maxX: vent.x + vent.w,
        minY: vent.y - 0.2,
        maxY: vent.y + vent.h,
        handledByLevelRuntime: true,
      })),
      ...LEVEL5.jellyfish.map((jelly) => ({
        name: jelly.name,
        type: 'jellyfish',
        minX: jelly.bounds.minX,
        maxX: jelly.bounds.maxX,
        minY: jelly.bounds.minY,
        maxY: jelly.bounds.maxY,
        handledByLevelRuntime: true,
      })),
      {
        name: LEVEL5.sharkSweep.name,
        type: 'shark',
        minX: LEVEL5.sharkSweep.xMin,
        maxX: LEVEL5.sharkSweep.xMax,
        minY: LEVEL5.sharkSweep.y - (LEVEL5.sharkSweep.height * 0.5),
        maxY: LEVEL5.sharkSweep.y + (LEVEL5.sharkSweep.height * 0.5),
        handledByLevelRuntime: true,
      },
    ],
    crumbles: [],
    level: LEVEL5,
    level5,
    signs: [backdrop.root, aquariumFx.root, ...platformVisuals],
    goalGuardMinX: LEVEL5.goal.x - 4.8,
    goalMinBottomY: (LEVEL5.platforms.find((platform) => platform.name === 'goalDeck').y + (LEVEL5.platforms.find((platform) => platform.name === 'goalDeck').h * 0.5)) - 0.2,
    assetAnchors: {
      cribRail: null,
      toyBlocks: [],
      goalBanner: null,
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
      futureLevel6BuilderHook: [],
      futureLevel7BuilderHook: [],
      futureLevel8BuilderHook: [],
    },
  };
}
