import * as BABYLON from '@babylonjs/core';
import { LEVEL5 } from './level5.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';
import { createTelegraphedHazard } from './telegraphHazard.js';
import { NoiseWanderMover } from './noiseMover.js';
import { markDecorNode } from './envFx.js';
import { makePlastic } from '../materials.js';

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

function markHazard(node) {
  if (!node) return;
  markDecor(node);
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
    hazard: true,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
      hazard: true,
      decor: true,
    };
  }
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

function createCurrentJet(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
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
  markHazard(zone);

  for (let i = 0; i < 4; i += 1) {
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
    if (def.pushX < 0) arrow.rotation.z = Math.PI;
    arrows.push(arrow);
    markHazard(arrow);
  }

  for (let i = 0; i < 8; i += 1) {
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
    markHazard(bubble);
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
      for (let i = 0; i < this.arrows.length; i += 1) {
        const arrow = this.arrows[i];
        arrow.position.x += (this.pushX > 0 ? 1 : -1) * dt * 0.9;
        const minX = -this.w * 0.45;
        const maxX = this.w * 0.45;
        if (arrow.position.x > maxX) arrow.position.x = minX;
        if (arrow.position.x < minX) arrow.position.x = maxX;
      }
      for (let i = 0; i < this.bubbles.length; i += 1) {
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
        && pos.y <= (this.y + this.h * 0.5)
        && pos.z >= ((this.z ?? 0) - (this.d * 0.5))
        && pos.z <= ((this.z ?? 0) + (this.d * 0.5));
    },
  };
}

function createDeepWaterPocket(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const volume = BABYLON.MeshBuilder.CreateBox(`${def.name}_volume`, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  volume.parent = root;
  const volumeMat = new BABYLON.StandardMaterial(`${def.name}_volumeMat`, scene);
  volumeMat.diffuseColor = new BABYLON.Color3(0.08, 0.34, 0.52);
  volumeMat.emissiveColor = new BABYLON.Color3(0.04, 0.18, 0.28);
  volumeMat.alpha = 0.14;
  volumeMat.backFaceCulling = false;
  volumeMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  volume.material = volumeMat;
  markHazard(volume);

  const rim = BABYLON.MeshBuilder.CreateBox(`${def.name}_rim`, {
    width: def.w + 0.08,
    height: 0.08,
    depth: def.d + 0.08,
  }, scene);
  rim.parent = root;
  rim.position.y = (def.h * 0.5) - 0.03;
  const rimMat = new BABYLON.StandardMaterial(`${def.name}_rimMat`, scene);
  rimMat.diffuseColor = new BABYLON.Color3(0.62, 0.96, 1.0);
  rimMat.emissiveColor = new BABYLON.Color3(0.18, 0.34, 0.42);
  rimMat.alpha = 0.52;
  rimMat.backFaceCulling = false;
  rimMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  rim.material = rimMat;
  markHazard(rim);

  return {
    ...def,
    root,
    volume,
    contains(pos) {
      return pos.x >= (this.x - this.w * 0.5)
        && pos.x <= (this.x + this.w * 0.5)
        && pos.y >= (this.y - this.h * 0.5)
        && pos.y <= (this.y + this.h * 0.5)
        && pos.z >= ((this.z ?? 0) - (this.d * 0.5))
        && pos.z <= ((this.z ?? 0) + (this.d * 0.5));
    },
    update(time) {
      rimMat.alpha = 0.40 + (Math.sin((time * 1.6) + this.x * 0.04) * 0.12);
      volumeMat.alpha = 0.10 + (Math.sin((time * 0.9) + this.y) * 0.04);
      volume.position.y = Math.sin((time * 0.7) + this.x * 0.03) * 0.06;
    },
  };
}

function createAirBubblePickup(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);
  const globes = [];
  for (let i = 0; i < 3; i += 1) {
    const globe = BABYLON.MeshBuilder.CreateSphere(`${def.name}_globe_${i}`, {
      diameter: 0.34 - (i * 0.06),
      segments: 8,
    }, scene);
    globe.parent = root;
    globe.position.set((i - 1) * 0.18, i * 0.16, ((i % 2) - 0.5) * 0.16);
    const mat = new BABYLON.StandardMaterial(`${def.name}_mat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.72, 0.96, 1.0);
    mat.emissiveColor = new BABYLON.Color3(0.12, 0.26, 0.32);
    mat.alpha = 0.48;
    mat.specularColor = new BABYLON.Color3(0.84, 1.0, 1.0);
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    globe.material = mat;
    globes.push(globe);
    markDecor(globe);
  }

  return {
    ...def,
    root,
    globes,
    collected: false,
    update(dt, time) {
      if (this.collected) return;
      root.position.y = this.y + (Math.sin((time * 1.8) + this.x * 0.08) * 0.16);
      root.rotation.y += dt * 0.8;
    },
    contains(pos) {
      const dx = pos.x - this.x;
      const dy = pos.y - root.position.y;
      const dz = pos.z - (this.z ?? 0);
      return ((dx ** 2) + (dy ** 2) + (dz ** 2)) <= ((this.radius ?? 0.8) ** 2);
    },
    collect() {
      this.collected = true;
      root.setEnabled(false);
    },
    reset() {
      this.collected = false;
      root.position.set(this.x, this.y, this.z ?? 0);
      root.rotation.set(0, 0, 0);
      root.setEnabled(true);
    },
  };
}

function createEelRail(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  const dx = def.x2 - def.x1;
  const dy = def.y2 - def.y1;
  const length = Math.sqrt((dx ** 2) + (dy ** 2));
  const angle = Math.atan2(dy, dx);
  root.position.set((def.x1 + def.x2) * 0.5, (def.y1 + def.y2) * 0.5, def.z ?? 0);
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
  markHazard(postL);

  const postR = postL.clone(`${def.name}_postR`);
  postR.parent = root;
  postR.position.x = length * 0.5;
  markHazard(postR);

  const beam = BABYLON.MeshBuilder.CreateCylinder(`${def.name}_beam`, {
    diameter: 0.18,
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
  markHazard(beam);

  const halo = BABYLON.MeshBuilder.CreatePlane(`${def.name}_halo`, {
    width: length + 0.35,
    height: 0.52,
  }, scene);
  halo.parent = root;
  const haloMat = new BABYLON.StandardMaterial(`${def.name}_haloMat`, scene);
  haloMat.diffuseColor = new BABYLON.Color3(0.24, 1.0, 0.92);
  haloMat.emissiveColor = new BABYLON.Color3(0.14, 0.44, 0.38);
  haloMat.alpha = 0.24;
  haloMat.backFaceCulling = false;
  haloMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  halo.material = haloMat;
  halo.position.z = 0.4;
  markHazard(halo);

  return {
    ...def,
    root,
    beam,
    halo,
    length,
    phaseOffset: def.phaseOffset ?? 0,
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
  root.position.set(def.x, def.y, def.z ?? 0);

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
  markHazard(grate);

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
  markHazard(plume);

  return { ...def, root, grate, plume };
}

function createJellyfish(scene, def, shadowGen) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.x, def.y, def.z ?? 0);

  const bell = BABYLON.MeshBuilder.CreateSphere(`${def.name}_bell`, {
    diameter: 1.14,
    segments: 14,
  }, scene);
  bell.parent = root;
  bell.scaling.y = 0.75;
  bell.material = makeGlowMaterial(scene, `${def.name}_bellMat`, [118, 255, 248], {
    emissive: 0.30,
    alpha: 0.48,
    roughness: 0.16,
  });
  shadowGen.addShadowCaster(bell);
  markHazard(bell);

  const silhouette = BABYLON.MeshBuilder.CreateDisc(`${def.name}_silhouette`, {
    radius: 0.72,
    tessellation: 28,
  }, scene);
  silhouette.parent = root;
  silhouette.position.set(0, 0.02, 0);
  silhouette.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const silhouetteMat = new BABYLON.StandardMaterial(`${def.name}_silhouetteMat`, scene);
  silhouetteMat.diffuseColor = new BABYLON.Color3(0.04, 0.09, 0.14);
  silhouetteMat.emissiveColor = new BABYLON.Color3(0.04, 0.10, 0.12);
  silhouetteMat.alpha = 0.38;
  silhouetteMat.specularColor = BABYLON.Color3.Black();
  silhouetteMat.backFaceCulling = false;
  silhouetteMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  silhouette.material = silhouetteMat;
  markHazard(silhouette);

  const core = BABYLON.MeshBuilder.CreateSphere(`${def.name}_core`, {
    diameter: 0.44,
    segments: 8,
  }, scene);
  core.parent = root;
  core.position.y = 0.05;
  core.material = makeGlowMaterial(scene, `${def.name}_coreMat`, [255, 156, 242], {
    emissive: 0.46,
    roughness: 0.12,
  });
  markHazard(core);

  const tentacles = [];
  for (let i = 0; i < 5; i += 1) {
    const path = [
      new BABYLON.Vector3(-0.18 + (i * 0.09), -0.2, 0),
      new BABYLON.Vector3(-0.16 + (i * 0.08), -0.62, -0.02 + ((i % 2) * 0.02)),
      new BABYLON.Vector3(-0.14 + (i * 0.07), -1.05, 0.04 - ((i % 3) * 0.03)),
    ];
    const tentacle = BABYLON.MeshBuilder.CreateTube(`${def.name}_tentacle_${i}`, {
      path,
      radius: 0.022,
      tessellation: 8,
    }, scene);
    tentacle.parent = root;
    tentacle.material = makeGlowMaterial(scene, `${def.name}_tentacleMat_${i}`, [142, 255, 246], {
      emissive: 0.18,
      alpha: 0.42,
      roughness: 0.24,
    });
    tentacles.push(tentacle);
    markHazard(tentacle);
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

  const state = {
    highContrast: false,
    showBounds: false,
  };

  function applyMaterialLook() {
    if (state.highContrast) {
      bell.material.alpha = 0.82;
      bell.material.emissiveColor = new BABYLON.Color3(0.42, 0.62, 0.72);
      core.material.emissiveColor = new BABYLON.Color3(0.72, 0.32, 0.66);
      silhouette.material.alpha = 0.52;
    } else if (api.stunnedMs > 0) {
      bell.material.alpha = 0.16;
      core.material.emissiveColor = new BABYLON.Color3(0.16, 0.18, 0.24);
      silhouette.material.alpha = 0.12;
    } else {
      bell.material.alpha = 0.48;
      bell.material.emissiveColor = new BABYLON.Color3(0.14, 0.30, 0.30);
      core.material.emissiveColor = new BABYLON.Color3(0.42, 0.26, 0.40);
      silhouette.material.alpha = 0.28;
    }
  }

  function applyDebugView() {
    for (const mesh of [bell, silhouette, core, ...tentacles]) {
      mesh.showBoundingBox = state.showBounds;
    }
    applyMaterialLook();
  }

  const api = {
    ...def,
    kind: 'jellyfish',
    root,
    bell,
    core,
    tentacles,
    mover,
    nearMissCooldownMs: 0,
    stunnedMs: 0,
    stun(durationMs = 1500) {
      this.stunnedMs = Math.max(this.stunnedMs, durationMs);
      applyMaterialLook();
      return true;
    },
    isStunned() {
      return this.stunnedMs > 0;
    },
    setDebugView({ showBounds = state.showBounds, highContrast = state.highContrast } = {}) {
      state.showBounds = !!showBounds;
      state.highContrast = !!highContrast;
      applyDebugView();
      return {
        showBounds: state.showBounds,
        highContrast: state.highContrast,
      };
    },
    update(dt) {
      if (this.stunnedMs > 0) {
        this.stunnedMs = Math.max(0, this.stunnedMs - (dt * 1000));
        bell.rotation.z = Math.sin((performance.now() * 0.004) + mover.time) * 0.05;
        if (!state.highContrast) {
          bell.material.alpha = 0.16 + (Math.sin((performance.now() * 0.01) + mover.time) * 0.04);
        }
      } else {
        mover.update(dt);
      }
      for (let i = 0; i < tentacles.length; i += 1) {
        tentacles[i].rotation.z = Math.sin((performance.now() * 0.0024) + i + mover.time) * 0.10;
      }
      if (this.nearMissCooldownMs > 0) {
        this.nearMissCooldownMs = Math.max(0, this.nearMissCooldownMs - (dt * 1000));
      }
      applyMaterialLook();
    },
    reset() {
      mover.reset();
      this.nearMissCooldownMs = 0;
      this.stunnedMs = 0;
      root.position.set(def.x, def.y, def.z ?? 0);
      applyMaterialLook();
    },
  };
  applyDebugView();
  return api;
}

function createSharkSweep(scene, def) {
  const root = new BABYLON.TransformNode(def.name, scene);
  root.position.set(def.xMin, def.y, def.z ?? 0);

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
  markHazard(shadow);

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
  markHazard(laneIndicator);

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

function mergeDebugState(baseState = {}, extraState = {}) {
  return {
    ...baseState,
    ...extraState,
  };
}

function getMeshDimensions(mesh) {
  const bounds = mesh?.getBoundingInfo?.()?.boundingBox;
  if (!bounds) return null;
  return {
    w: Number((bounds.extendSizeWorld.x * 2).toFixed(3)),
    h: Number((bounds.extendSizeWorld.y * 2).toFixed(3)),
    d: Number((bounds.extendSizeWorld.z * 2).toFixed(3)),
    topY: Number(bounds.maximumWorld.y.toFixed(3)),
    minY: Number(bounds.minimumWorld.y.toFixed(3)),
  };
}

function buildLevel5RespawnAnchor(anchor, fallbackIndex = 0) {
  return {
    id: anchor.id || anchor.anchorId || anchor.checkpointId || `level5_anchor_${fallbackIndex}`,
    label: anchor.label || anchor.ownerLabel || anchor.spaceLabel || `Level 5 Anchor ${fallbackIndex + 1}`,
    x: Number((anchor.x ?? anchor.spawn?.x ?? 0).toFixed(3)),
    y: Number((anchor.y ?? anchor.spawn?.y ?? 0).toFixed(3)),
    z: Number((anchor.z ?? anchor.spawn?.z ?? 0).toFixed(3)),
    checkpointId: anchor.checkpointId || anchor.id || null,
    spaceId: anchor.spaceId || null,
    allowedReason: anchor.allowedReason || 'checkpoint',
  };
}

function createOverlayMaterial(scene, name, rgb, alpha) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = new BABYLON.Color3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  material.emissiveColor = new BABYLON.Color3((rgb[0] / 255) * 0.22, (rgb[1] / 255) * 0.22, (rgb[2] / 255) * 0.22);
  material.specularColor = BABYLON.Color3.Black();
  material.alpha = alpha;
  material.backFaceCulling = false;
  material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  return material;
}

export function buildWorld5(scene, options = {}) {
  const world = buildEraAdventureWorld(scene, LEVEL5, options);
  const shadowGen = world.shadowGen;
  const baseLevel = world.era5Level;
  const truthGeometry = world.truthGeometry || {};
  const truthColliderMeshes = truthGeometry.colliderMeshes || [];
  const truthVisualMeshes = [
    ...(truthGeometry.platformVisuals || []),
    ...(truthGeometry.decorPlatforms || []),
    ...(truthGeometry.decorBlocks || []),
    ...(truthGeometry.decorColumns || []),
    ...(truthGeometry.decorPlanes || []),
    ...(truthGeometry.checkpointFrames || []),
  ];

  const currentJets = (LEVEL5.currents || []).map((def) => createCurrentJet(scene, def));
  const deepWaterPockets = (LEVEL5.deepWaterPockets || []).map((def) => createDeepWaterPocket(scene, def));
  const airBubblePickups = (LEVEL5.airBubblePickups || []).map((def) => createAirBubblePickup(scene, def));
  const eelRails = (LEVEL5.eelRails || []).map((def) => createEelRail(scene, def));
  const vents = (LEVEL5.vents || []).map((def) => createVent(scene, def));
  const jellyfish = (LEVEL5.jellyfish || []).map((def) => createJellyfish(scene, def, shadowGen));
  const sharkSweep = LEVEL5.sharkSweep ? createSharkSweep(scene, LEVEL5.sharkSweep) : null;

  let currentPushTimer = 0;
  let currentPushForce = 0;
  let currentPushZ = 0;
  let runtimeTime = 0;
  let enemyDebugState = {
    showBounds: false,
    highContrast: false,
  };
  let lastResolvedRespawn = null;

  const authoredRespawnAnchors = (world.respawnAnchors?.length
    ? world.respawnAnchors
    : [
      {
        id: 'level5_spawn_anchor',
        label: 'Arrival Airlock Vestibule',
        x: world.spawn.x,
        y: world.spawn.y,
        z: world.spawn.z ?? 0,
        allowedReason: 'spawn',
        spaceId: 'arrival_airlock_vestibule',
      },
      ...(world.checkpoints || []).map((checkpoint) => ({
        id: checkpoint.spawn?.anchorId || checkpoint.id,
        label: checkpoint.label,
        x: checkpoint.spawn?.x ?? checkpoint.x,
        y: checkpoint.spawn?.y ?? checkpoint.y,
        z: checkpoint.spawn?.z ?? checkpoint.z ?? 0,
        checkpointId: checkpoint.id,
        allowedReason: 'checkpoint',
        spaceId: checkpoint.spawn?.spaceId || null,
      })),
    ])
    .map((anchor, index) => buildLevel5RespawnAnchor(anchor, index));
  const respawnAnchorMap = new Map(authoredRespawnAnchors.map((anchor) => [anchor.id, anchor]));

  const sourceVisuals = new Map();
  for (const mesh of truthVisualMeshes) {
    const sourceName = mesh?.metadata?.sourceName;
    if (!sourceName) continue;
    if (!sourceVisuals.has(sourceName)) sourceVisuals.set(sourceName, []);
    sourceVisuals.get(sourceName).push(mesh);
  }

  const truthOverlayRoot = new BABYLON.TransformNode('level5_truth_overlay_root', scene);
  truthOverlayRoot.setEnabled(false);
  markDecor(truthOverlayRoot);
  const overlayState = {
    walkables: false,
    colliders: false,
    respawnAnchors: false,
    hazards: false,
  };
  const walkableOverlayMat = createOverlayMaterial(scene, 'level5_truth_walkable_mat', [112, 255, 168], 0.22);
  const colliderOverlayMat = createOverlayMaterial(scene, 'level5_truth_collider_mat', [255, 122, 112], 0.18);
  const hazardOverlayMat = createOverlayMaterial(scene, 'level5_truth_hazard_mat', [255, 214, 92], 0.16);
  const respawnOverlayMat = createOverlayMaterial(scene, 'level5_truth_respawn_mat', [126, 198, 255], 0.38);
  const walkableOverlayNodes = [];
  const colliderOverlayNodes = [];
  const hazardOverlayNodes = [];
  const respawnOverlayNodes = [];

  function markTruthOverlayMesh(mesh) {
    markDecor(mesh);
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.renderingGroupId = 2;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
      gameplay: false,
      decor: true,
      truthOverlay: true,
    };
  }

  function buildOverlayBox(name, dims, position, material) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, {
      width: Math.max(dims.w, 0.08),
      height: Math.max(dims.h, 0.08),
      depth: Math.max(dims.d, 0.08),
    }, scene);
    mesh.parent = truthOverlayRoot;
    mesh.position.copyFrom(position);
    mesh.material = material;
    markTruthOverlayMesh(mesh);
    return mesh;
  }

  for (const mesh of truthColliderMeshes) {
    const dims = getMeshDimensions(mesh);
    if (!dims) continue;
    const md = mesh.metadata || {};
    const overlay = buildOverlayBox(
      `${mesh.name}_truth_overlay`,
      dims,
      mesh.position.clone(),
      md.truthRole === 'walkable' ? walkableOverlayMat : colliderOverlayMat,
    );
    if (md.truthRole === 'walkable') {
      walkableOverlayNodes.push(overlay);
    } else if (md.truthRole === 'blocker') {
      colliderOverlayNodes.push(overlay);
    }
  }

  for (const hazard of world.hazards || []) {
    if (!Number.isFinite(hazard.minX) || !Number.isFinite(hazard.maxX) || !Number.isFinite(hazard.minY) || !Number.isFinite(hazard.maxY)) continue;
    const width = Math.max(0.2, hazard.maxX - hazard.minX);
    const height = Math.max(0.2, hazard.maxY - hazard.minY);
    const depth = Math.max(0.8, (hazard.maxZ ?? 0) - (hazard.minZ ?? 0) || 2.0);
    const overlay = buildOverlayBox(
      `${hazard.name}_truth_hazard`,
      { w: width, h: height, d: depth },
      new BABYLON.Vector3(
        (hazard.minX + hazard.maxX) * 0.5,
        (hazard.minY + hazard.maxY) * 0.5,
        Number.isFinite(hazard.minZ) && Number.isFinite(hazard.maxZ) ? (hazard.minZ + hazard.maxZ) * 0.5 : 0,
      ),
      hazardOverlayMat,
    );
    hazardOverlayNodes.push(overlay);
  }

  for (const anchor of authoredRespawnAnchors) {
    const marker = BABYLON.MeshBuilder.CreateSphere(`${anchor.id}_truth_respawn`, {
      diameter: 0.72,
      segments: 10,
    }, scene);
    marker.parent = truthOverlayRoot;
    marker.position.set(anchor.x, anchor.y + 0.36, anchor.z);
    marker.material = respawnOverlayMat;
    markTruthOverlayMesh(marker);
    respawnOverlayNodes.push(marker);
  }

  function applyTruthOverlayState() {
    truthOverlayRoot.setEnabled(
      overlayState.walkables || overlayState.colliders || overlayState.respawnAnchors || overlayState.hazards,
    );
    for (const node of walkableOverlayNodes) node.setEnabled(overlayState.walkables);
    for (const node of colliderOverlayNodes) node.setEnabled(overlayState.colliders);
    for (const node of hazardOverlayNodes) node.setEnabled(overlayState.hazards);
    for (const node of respawnOverlayNodes) node.setEnabled(overlayState.respawnAnchors);
  }

  function getCollisionReport() {
    const blockerColliders = truthColliderMeshes.filter((mesh) => mesh?.metadata?.truthRole === 'blocker');
    const blockers = blockerColliders.map((mesh) => {
      const md = mesh.metadata || {};
      const dims = getMeshDimensions(mesh);
      const visibleOwner = md.sourceName ? sourceVisuals.get(md.sourceName) || [] : [];
      return {
        name: mesh.name,
        sourceName: md.sourceName || null,
        spaceId: md.spaceId || md.ownerId || null,
        spaceLabel: md.spaceLabel || md.ownerLabel || null,
        blockerReason: md.blockerReason || null,
        structuralShell: md.structuralShell === true,
        visibleOwnerCount: visibleOwner.length,
        position: {
          x: Number(mesh.position.x.toFixed(3)),
          y: Number(mesh.position.y.toFixed(3)),
          z: Number(mesh.position.z.toFixed(3)),
        },
        dimensions: dims,
      };
    });
    const unownedBlockers = blockers.filter((entry) => !entry.spaceId && !entry.blockerReason);
    const invisibleBlockers = blockers.filter((entry) => entry.visibleOwnerCount === 0 && entry.blockerReason !== 'room-boundary');
    const roomVolumeShells = blockers.filter((entry) => {
      const dims = entry.dimensions;
      const sourceName = entry.sourceName || '';
      return entry.structuralShell
        && dims
        && Math.min(dims.w, dims.d) >= 5.0
        && dims.h >= 4.8
        && (!entry.spaceId || /shell|housing|outer|annex/i.test(sourceName));
    });
    return {
      blockerCount: blockers.length,
      blockers,
      unownedBlockers,
      invisibleBlockers,
      roomVolumeShells,
    };
  }

  function getWalkableReport() {
    const topology = baseLevel.getTopologyReport?.() ?? null;
    const baseWalkable = topology?.walkableReport ?? null;
    const walkableColliders = truthColliderMeshes.filter((mesh) => mesh?.metadata?.truthRole === 'walkable');
    const visibleWalkables = (truthGeometry.platformVisuals || []).map((mesh) => ({
      name: mesh.name,
      authoredSurfaceId: mesh.metadata?.authoredSurfaceId || null,
      spaceId: mesh.metadata?.spaceId || mesh.metadata?.ownerId || null,
      walkableClassification: mesh.metadata?.walkableClassification || null,
      surfaceType: mesh.metadata?.surfaceType || null,
      dimensions: getMeshDimensions(mesh),
      visible: mesh.isEnabled?.() !== false && mesh.visibility !== 0,
    }));
    const missingVisuals = walkableColliders
      .filter((mesh) => {
        const authoredSurfaceId = mesh.metadata?.authoredSurfaceId;
        return authoredSurfaceId && !visibleWalkables.some((entry) => entry.authoredSurfaceId === authoredSurfaceId);
      })
      .map((mesh) => mesh.metadata?.authoredSurfaceId || mesh.name);
    const suspiciousFloorLikeDecor = (truthGeometry.decorBlocks || [])
      .map((mesh) => ({
        mesh,
        dims: getMeshDimensions(mesh),
      }))
      .filter(({ mesh, dims }) => {
        if (!dims) return false;
        const md = mesh.metadata || {};
        const name = md.sourceName || mesh.name || '';
        if (md.gameplaySurface) return false;
        if (md.decorIntent === 'wall' || md.decorIntent === 'ceiling' || md.decorIntent === 'beam') return false;
        if (/lower_hull|underhull|backwall|backing_wall|sidewall|partition|jamb|baffle|frame|header|canopy/i.test(name)) return false;
        return dims.h <= 1.6 && dims.w >= 3.0 && dims.d >= 3.0 && dims.topY >= 0.2 && dims.topY <= 3.8;
      })
      .map(({ mesh, dims }) => ({
        sourceName: mesh.metadata?.sourceName || mesh.name,
        spaceId: mesh.metadata?.spaceId || null,
        dimensions: dims,
      }));

    return {
      ...(baseWalkable || {}),
      walkableColliderCount: walkableColliders.length,
      walkableVisualCount: visibleWalkables.length,
      walkableVisuals: visibleWalkables,
      missingVisibleWalkables: missingVisuals,
      suspiciousFloorLikeDecor,
    };
  }

  function getTruthReport() {
    const collision = getCollisionReport();
    const walkable = getWalkableReport();
    const structuralShellVisuals = truthVisualMeshes
      .filter((mesh) => mesh?.metadata?.structuralShell === true)
      .map((mesh) => ({
        sourceName: mesh.metadata?.sourceName || mesh.name,
        spaceId: mesh.metadata?.spaceId || null,
        decorIntent: mesh.metadata?.decorIntent || null,
        cameraFadeable: mesh.metadata?.cameraFadeable === true,
        dims: getMeshDimensions(mesh),
      }));
    const fadeableShells = structuralShellVisuals.filter((entry) => entry.cameraFadeable);
    const cullRiskShells = structuralShellVisuals.filter((entry) => {
      const dims = entry.dims;
      const sourceName = entry.sourceName || '';
      return dims
        && entry.decorIntent !== 'wall'
        && entry.decorIntent !== 'beam'
        && entry.decorIntent !== 'ceiling'
        && Math.min(dims.w, dims.d) >= 5.0
        && dims.h >= 4.8
        && (!entry.spaceId || /shell|housing|outer|annex/i.test(sourceName));
    });
    return {
      truthVersion: 1,
      disableDecorOcclusionFade: world.disableDecorOcclusionFade === true,
      walkableReport: walkable,
      collisionReport: collision,
      respawnReport: getRespawnReport(),
      structuralShellVisualCount: structuralShellVisuals.length,
      fadeableShells,
      cullRiskShells,
    };
  }

  function getRespawnReport() {
    return {
      anchorCount: authoredRespawnAnchors.length,
      anchors: authoredRespawnAnchors.map((anchor) => ({
        ...anchor,
      })),
      selectedAnchor: lastResolvedRespawn ? { ...lastResolvedRespawn } : null,
    };
  }

  function setTruthOverlay(nextState = {}) {
    overlayState.walkables = nextState.walkables ?? nextState.showWalkables ?? overlayState.walkables;
    overlayState.colliders = nextState.colliders ?? nextState.showColliders ?? overlayState.colliders;
    overlayState.respawnAnchors = nextState.respawnAnchors ?? nextState.showRespawnAnchors ?? overlayState.respawnAnchors;
    overlayState.hazards = nextState.hazards ?? nextState.showHazards ?? overlayState.hazards;
    applyTruthOverlayState();
    return { ...overlayState };
  }

  function resolveRespawnPosition(baseSpawn = {}) {
    const requestedSpawn = baseSpawn?.baseSpawn || baseSpawn || {};
    let anchor = null;
    let selectedBy = 'fallback';
    if (requestedSpawn.anchorId && respawnAnchorMap.has(requestedSpawn.anchorId)) {
      anchor = respawnAnchorMap.get(requestedSpawn.anchorId);
      selectedBy = 'anchorId';
    }
    if (!anchor && requestedSpawn.checkpointId) {
      anchor = authoredRespawnAnchors.find((entry) => entry.checkpointId === requestedSpawn.checkpointId) || null;
      if (anchor) selectedBy = 'checkpointId';
    }
    if (!anchor && Number.isFinite(requestedSpawn.x) && Number.isFinite(requestedSpawn.y)) {
      let bestDistance = Infinity;
      for (const candidate of authoredRespawnAnchors) {
        const dx = candidate.x - requestedSpawn.x;
        const dy = candidate.y - requestedSpawn.y;
        const dz = candidate.z - (requestedSpawn.z ?? 0);
        const distance = Math.hypot(dx, dy * 0.6, dz);
        if (distance < bestDistance) {
          bestDistance = distance;
          anchor = candidate;
        }
      }
      if (anchor) selectedBy = 'nearest-explicit-anchor';
    }
    if (!anchor) {
      anchor = authoredRespawnAnchors[0] || buildLevel5RespawnAnchor({
        id: 'level5_spawn_anchor',
        label: 'Arrival Airlock Vestibule',
        x: world.spawn.x,
        y: world.spawn.y,
        z: world.spawn.z ?? 0,
        allowedReason: 'spawn',
        spaceId: 'arrival_airlock_vestibule',
      });
    }
    lastResolvedRespawn = {
      id: anchor.id,
      label: anchor.label,
      checkpointId: anchor.checkpointId || null,
      spaceId: anchor.spaceId || null,
      selectedBy,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
    };
    return {
      position: {
        x: anchor.x,
        y: anchor.y,
        z: anchor.z,
        anchorId: anchor.id,
        checkpointId: anchor.checkpointId || anchor.id,
        spaceId: anchor.spaceId || null,
      },
      anchor: {
        ...lastResolvedRespawn,
      },
    };
  }

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
    onHit: ({ pos, triggerDamage }) => {
      triggerDamage?.('eel_rail', { x: pos.x < eelRail.root.position.x ? -1 : 1, z: 0 });
    },
  }));

  const ventHazards = vents.map((vent) => createTelegraphedHazard({
    name: vent.name,
    warnDuration: 0.65,
    activeDuration: 1.05,
    cooldownDuration: 1.15,
    phaseOffset: vent.phaseOffset ?? 0,
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
      && pos.y <= (vent.y + (vent.h * 0.7))
      && pos.z >= ((vent.z ?? 0) - (vent.w * 0.9))
      && pos.z <= ((vent.z ?? 0) + (vent.w * 0.9)),
    onHit: ({ player }) => {
      if (player) player.vy = Math.max(player.vy, vent.liftVy);
    },
  }));

  const sharkHazard = sharkSweep
    ? createTelegraphedHazard({
      name: sharkSweep.name,
      warnDuration: SHARK_WARN_SEC,
      activeDuration: SHARK_ACTIVE_SEC,
      cooldownDuration: SHARK_COOLDOWN_SEC,
      phaseOffset: sharkSweep.phaseOffset ?? 0,
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
          && pos.y <= collider.maxY
          && pos.z >= ((sharkSweep.z ?? 0) - 2.8)
          && pos.z <= ((sharkSweep.z ?? 0) + 2.8);
      },
      onHit: ({ pos, triggerDamage }) => {
        triggerDamage?.('shark_shadow', { x: pos.x < sharkSweep.currentX ? -1 : 1, z: 0 });
      },
    })
    : null;

  function updateCurrentJets(dt, player) {
    if (currentPushTimer > 0) {
      currentPushTimer = Math.max(0, currentPushTimer - dt);
      player.vx += currentPushForce * dt;
      player.vz += currentPushZ * dt;
    }
    for (const jet of currentJets) {
      jet.update(dt);
      const inside = jet.contains(player.mesh.position);
      if (inside && !jet.playerInside) {
        currentPushForce = jet.pushX;
        currentPushZ = jet.pushZ ?? 0;
        currentPushTimer = CURRENT_PUSH_DURATION_SEC;
        player.vz += currentPushZ * dt * 10;
      }
      jet.playerInside = inside;
    }
  }

  function updateJellyfish(dt, pos, triggerDamage, triggerNearMissCue) {
    const playerRadius = 0.36;
    for (const jelly of jellyfish) {
      jelly.update(dt);
      if (jelly.isStunned()) continue;
      const jellyPos = jelly.root.position;
      const dx = pos.x - jellyPos.x;
      const dy = pos.y - jellyPos.y;
      const dz = pos.z - jellyPos.z;
      const distance = Math.sqrt((dx ** 2) + (dy ** 2) + (dz ** 2));
      if (distance <= (JELLY_HIT_RADIUS + playerRadius)) {
        const planarLen = Math.hypot(dx, dz) || 1;
        triggerDamage?.('jellyfish', { x: dx / planarLen, z: dz / planarLen });
        continue;
      }
      if (distance <= (JELLY_NEAR_MISS_RADIUS + playerRadius) && jelly.nearMissCooldownMs <= 0) {
        jelly.nearMissCooldownMs = 900;
        triggerNearMissCue?.();
      }
    }
  }

  function hitJellyfish(attack = {}) {
    const attackPos = attack.position || BABYLON.Vector3.Zero();
    const radius = Number.isFinite(attack.radius) ? attack.radius : 0.82;
    const stunMs = Number.isFinite(attack.stunMs) ? attack.stunMs : 1500;
    for (const jelly of jellyfish) {
      if (jelly.isStunned()) continue;
      const dx = attackPos.x - jelly.root.position.x;
      const dy = attackPos.y - jelly.root.position.y;
      const dz = attackPos.z - jelly.root.position.z;
      if (((dx ** 2) + (dy ** 2) + (dz ** 2)) <= ((radius + 0.64) ** 2)) {
        jelly.stun(stunMs);
        return { hit: true, target: jelly.name };
      }
    }
    return { hit: false };
  }

  function getEnemyReport() {
    return {
      count: jellyfish.length,
      enemies: jellyfish.map((jelly) => ({
        name: jelly.name,
        kind: 'jellyfish',
        x: Number(jelly.root.position.x.toFixed(3)),
        y: Number(jelly.root.position.y.toFixed(3)),
        z: Number(jelly.root.position.z.toFixed(3)),
        stunnedMs: Math.round(jelly.stunnedMs),
        visible: jelly.root.isEnabled(),
      })),
    };
  }

  function setEnemyDebugView({ showBounds = enemyDebugState.showBounds, highContrast = enemyDebugState.highContrast } = {}) {
    enemyDebugState = {
      showBounds: !!showBounds,
      highContrast: !!highContrast,
    };
    for (const jelly of jellyfish) {
      jelly.setDebugView(enemyDebugState);
    }
    return { ...enemyDebugState };
  }

  function placeDebugJellyfish(pos, forward = { x: 1, z: 0 }) {
    const jelly = jellyfish[0];
    if (!jelly) return false;
    const dirLen = Math.hypot(forward.x || 0, forward.z || 0) || 1;
    const forwardDistance = 1.1;
    const targetPos = new BABYLON.Vector3(
      pos.x + ((forward.x || 1) / dirLen) * forwardDistance,
      pos.y + 0.72,
      pos.z + ((forward.z || 0) / dirLen) * forwardDistance,
    );
    jelly.mover.basePosition = targetPos.clone();
    jelly.mover.bounds = {
      minX: targetPos.x - 0.08,
      maxX: targetPos.x + 0.08,
      minY: targetPos.y - 0.05,
      maxY: targetPos.y + 0.05,
      minZ: targetPos.z - 0.08,
      maxZ: targetPos.z + 0.08,
    };
    jelly.reset();
    jelly.root.position.copyFrom(targetPos);
    jelly.root.rotation.y = Math.atan2((forward.x || 1) / dirLen, (forward.z || 0) / dirLen) + (Math.PI * 0.5);
    jelly.mover.target = targetPos.clone();
    jelly.mover.velocity.set(0, 0, 0);
    jelly.mover.pauseTimer = 2.4;
    jelly.mover.retargetTimer = 2.4;
    jelly.setDebugView(enemyDebugState);
    return true;
  }

  const level5 = {
    ...baseLevel,
    update(dt, ctx = {}) {
      runtimeTime += dt;
      baseLevel.update(dt, ctx);
      const pos = ctx.pos;
      const player = ctx.player;
      if (!pos || !player) return;

      updateCurrentJets(dt, player);
      for (const pocket of deepWaterPockets) {
        pocket.update(runtimeTime);
      }
      for (const bubble of airBubblePickups) {
        bubble.update(dt, runtimeTime);
        if (!bubble.collected && bubble.contains(pos)) {
          bubble.collect();
          ctx.refillOxygen?.(bubble.refill ?? 8);
        }
      }
      for (const eelHazard of eelHazards) {
        eelHazard.update(dt, { pos, player, triggerDamage: ctx.triggerDamage });
      }
      for (const ventHazard of ventHazards) {
        ventHazard.update(dt, { pos, player });
      }
      updateJellyfish(dt, pos, ctx.triggerDamage, ctx.triggerNearMissCue);
      sharkHazard?.update(dt, { pos, player, triggerDamage: ctx.triggerDamage });
    },
    reset() {
      runtimeTime = 0;
      currentPushTimer = 0;
      currentPushForce = 0;
      currentPushZ = 0;
      lastResolvedRespawn = null;
      baseLevel.reset();
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
        jelly.setDebugView(enemyDebugState);
      }
      for (const bubble of airBubblePickups) {
        bubble.reset();
      }
      sharkHazard?.reset();
      resolveRespawnPosition(world.spawn);
      applyTruthOverlayState();
    },
    debugForceHazard(name, { pos, player, triggerDamage } = {}) {
      if (name === 'shark' || name === LEVEL5.sharkSweep?.name) {
        triggerDamage?.('shark_shadow', { x: 1, z: 0 });
        return true;
      }
      if (name === 'jellyfish') {
        triggerDamage?.('jellyfish', { x: 1, z: 0 });
        return true;
      }
      const eelHazard = eelHazards.find((entry) => entry.name === name) || eelHazards[0];
      if (eelHazard) {
        triggerDamage?.('eel_rail', { x: 1, z: 0 });
        return true;
      }
      const vent = vents.find((entry) => entry.name === name);
      if (vent && player) {
        player.vy = Math.max(player.vy, vent.liftVy);
        return true;
      }
      return baseLevel.debugForceHazard?.(name, { pos, player, triggerDamage }) ?? false;
    },
    isInDeepWater(pos) {
      return deepWaterPockets.some((pocket) => pocket.contains(pos));
    },
    tryHitByWeapon(attack = {}) {
      const hitResult = hitJellyfish(attack);
      if (hitResult.hit) return hitResult;
      return baseLevel.tryHitByWeapon?.(attack) ?? { hit: false };
    },
    tryHitByBubble(projectile) {
      return hitJellyfish({
        position: projectile.position,
        radius: projectile.radius,
        stunMs: projectile.stunMs,
      });
    },
    placeDebugEnemy(pos, forward = { x: 1, z: 0 }) {
      return placeDebugJellyfish(pos, forward);
    },
    placeDebugJellyfish(pos, forward = { x: 1, z: 0 }) {
      return placeDebugJellyfish(pos, forward);
    },
    getEnemyReport() {
      return getEnemyReport();
    },
    setEnemyDebugView(nextState = {}) {
      return setEnemyDebugView(nextState);
    },
    resolveRespawnPosition(baseSpawn = {}) {
      return resolveRespawnPosition(baseSpawn);
    },
    getTruthReport() {
      return getTruthReport();
    },
    getCollisionReport() {
      return getCollisionReport();
    },
    getWalkableReport() {
      return getWalkableReport();
    },
    getRespawnReport() {
      return getRespawnReport();
    },
    setTruthOverlay(nextState = {}) {
      return setTruthOverlay(nextState);
    },
    getDebugState() {
      return mergeDebugState(baseLevel.getDebugState?.() ?? {}, {
        currentPushTimer: Number(currentPushTimer.toFixed(3)),
        currentPushForce: Number(currentPushForce.toFixed(3)),
        currentPushZ: Number(currentPushZ.toFixed(3)),
        deepWaterPockets: deepWaterPockets.map((pocket) => ({
          name: pocket.name,
          x: pocket.x,
          y: pocket.y,
          z: pocket.z ?? 0,
        })),
        airBubbles: airBubblePickups.map((bubble) => ({
          name: bubble.name,
          collected: bubble.collected,
          x: bubble.x,
          y: Number(bubble.root.position.y.toFixed(3)),
          z: bubble.z ?? 0,
        })),
        eelRails: eelHazards.map((hazard) => ({
          name: hazard.name,
          state: hazard.getState().state,
        })),
        vents: ventHazards.map((hazard) => ({
          name: hazard.name,
          state: hazard.getState().state,
        })),
        sharkSweep: sharkHazard ? sharkHazard.getState() : null,
        respawnAnchor: lastResolvedRespawn ? { ...lastResolvedRespawn } : null,
        jellyfish: getEnemyReport().enemies,
        enemyDebug: { ...enemyDebugState },
        truthOverlay: { ...overlayState },
      });
    },
  };
  level5.reset();

  world.era5Level = level5;
  world.level5 = level5;
  world.hazards = [
    ...(world.hazards || []),
    ...currentJets.map((current) => ({
      name: current.name,
      type: 'current',
      minX: current.x - (current.w * 0.5),
      maxX: current.x + (current.w * 0.5),
      minY: current.y - (current.h * 0.5),
      maxY: current.y + (current.h * 0.5),
      handledByLevelRuntime: true,
    })),
    ...vents.map((vent) => ({
      name: vent.name,
      type: 'vent',
      minX: vent.x - vent.w,
      maxX: vent.x + vent.w,
      minY: vent.y - 0.2,
      maxY: vent.y + vent.h,
      handledByLevelRuntime: true,
    })),
    ...jellyfish.map((jelly) => ({
      name: jelly.name,
      type: 'jellyfish',
      minX: jelly.bounds.minX,
      maxX: jelly.bounds.maxX,
      minY: jelly.bounds.minY,
      maxY: jelly.bounds.maxY,
      handledByLevelRuntime: true,
    })),
    ...(sharkSweep ? [{
      name: sharkSweep.name,
      type: 'shark',
      minX: sharkSweep.xMin,
      maxX: sharkSweep.xMax,
      minY: sharkSweep.y - (sharkSweep.height * 0.5),
      maxY: sharkSweep.y + (sharkSweep.height * 0.5),
      handledByLevelRuntime: true,
    }] : []),
  ];

  return world;
}
