import * as BABYLON from '@babylonjs/core';
import { buildWorld } from './world/buildWorld.js';
import { PlayerController } from './player/PlayerController.js';
import { InputManager } from './util/input.js';
import { createUI } from './ui/ui.js';
import { damp, clamp } from './util/math.js';
import { createDebugHud } from './ui/debugHud.js';
import { installRestStabilityTest } from './util/restStabilityTest.js';
import { JuiceFx } from './util/juiceFx.js';
import {
  applyHdriEnvironment,
  getAvailableModels,
  loadModelForRole,
} from './util/assets.js';
import { GameAudio } from './util/audio.js';
import { isDebugMode, isShotMode } from '../utils/modes.js';

const SHOT_FRAMES_TARGET = 10;
const DEFAULT_FLAGS = {
  juice: true,
  audio: true,
  occlusionFade: true,
};
const GOAL_CELEBRATION_SEC = 0.48;
const PLAYER_MODEL_SLOT_Y = -0.44;
const GOAL_MODEL_SLOT_Y = -0.56;

function easeOutCubic(t) {
  const v = Math.max(0, Math.min(1, t));
  return 1 - ((1 - v) ** 3);
}

function getShotScene() {
  if (typeof window === 'undefined') return 'title';
  const value = new URLSearchParams(window.location.search).get('scene');
  if (value === 'crib' || value === 'end' || value === 'title') return value;
  return 'title';
}

function createSeededRandom(seed = 1337) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function withPatchedRandom(randomFn, fn) {
  const originalRandom = Math.random;
  Math.random = randomFn;
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function updatePlayerShadow(player) {
  player.blobShadow.position.x = player.mesh.position.x;
  player.blobShadow.position.z = player.mesh.position.z;
  const heightAboveGround = Math.max(0, player.mesh.position.y - 0.5);
  const shadowScale = Math.max(0.4, 1.0 - heightAboveGround * 0.06);
  player.blobShadow.scaling.set(shadowScale, 1, shadowScale);
}

function prepareFadeMaterial(material) {
  if (!material || material._dadaOcclusionPrepared) return;
  material._dadaOcclusionPrepared = true;
  material._dadaBaseAlpha = typeof material.alpha === 'number' ? material.alpha : 1;
  material.alpha = material._dadaBaseAlpha;
  if (material.transparencyMode === undefined || material.transparencyMode === null) {
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
}

function disableAnimationsForShotMode() {
  if (document.getElementById('dada-shot-static-style')) return;
  const style = document.createElement('style');
  style.id = 'dada-shot-static-style';
  style.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  `;
  document.head.appendChild(style);
}

function hideProceduralVisuals(node) {
  if (!node) return;
  if (node instanceof BABYLON.TransformNode) {
    if (node instanceof BABYLON.Mesh) {
      if (node.name === 'goalTrigger') return;
      node.isVisible = false;
      node.setEnabled(false);
      return;
    }
    for (const mesh of node.getChildMeshes(false)) {
      if (mesh.name === 'goalTrigger') continue;
      mesh.setEnabled(false);
    }
  }
}

function registerShadowCasters(shadowGen, meshes) {
  if (!shadowGen || !Array.isArray(meshes)) return;
  for (const mesh of meshes) {
    if (mesh instanceof BABYLON.Mesh) {
      shadowGen.addShadowCaster(mesh);
    }
  }
}

function resolveAttachParent(anchor) {
  if (!anchor) return null;
  if (anchor instanceof BABYLON.Mesh) {
    return anchor.parent || anchor;
  }
  return anchor;
}

function collectNodeMeshes(node) {
  if (!node) return [];
  const meshes = [];
  if (node instanceof BABYLON.Mesh) meshes.push(node);
  if (node instanceof BABYLON.TransformNode) {
    meshes.push(...node.getChildMeshes(false));
  }
  return meshes;
}

function hideMeshList(meshes) {
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    if (mesh.name === 'goalTrigger') continue;
    mesh.isVisible = false;
    mesh.visibility = 0;
    mesh.setEnabled(false);
  }
}

function getAnchorWorldPosition(anchor) {
  if (!anchor) return null;
  if (typeof anchor.getAbsolutePosition === 'function') {
    return anchor.getAbsolutePosition().clone();
  }
  if (anchor.position instanceof BABYLON.Vector3) {
    return anchor.position.clone();
  }
  return null;
}

function applyRoleMetadata(meshes, roleName) {
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      role: roleName,
    };
  }
}

function combineBounds(meshes) {
  let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  let count = 0;
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    const bi = mesh.getBoundingInfo();
    if (!bi) continue;
    const bmin = bi.boundingBox.minimumWorld;
    const bmax = bi.boundingBox.maximumWorld;
    min = BABYLON.Vector3.Minimize(min, bmin);
    max = BABYLON.Vector3.Maximize(max, bmax);
    count += 1;
  }
  if (count === 0) {
    return {
      center: new BABYLON.Vector3(0, 0, 0),
      size: new BABYLON.Vector3(0, 0, 0),
      maxDim: 0,
    };
  }
  const size = max.subtract(min);
  return {
    center: min.add(max).scale(0.5),
    size,
    maxDim: Math.max(size.x, size.y, size.z),
  };
}

function sanitizeLoadedRoleModel({
  role,
  result,
  attachParent,
  debugMode,
}) {
  if (!result?.loaded) {
    return {
      loaded: false,
      usingFallback: true,
      reason: result?.reason || 'load_failed',
      worldPos: attachParent?.getAbsolutePosition?.()?.asArray?.() || [0, 0, 0],
      bboxSize: [0, 0, 0],
    };
  }

  for (const root of result.roots || []) {
    if (attachParent && root.parent !== attachParent) {
      root.parent = attachParent;
    }
    root.setEnabled(true);
    if (attachParent) {
      root.position.set(0, 0, 0);
      root.rotationQuaternion = null;
      root.rotation.set(0, 0, 0);
    }
  }

  const meshes = result.meshes || [];
  applyRoleMetadata(meshes, role);
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.setEnabled(true);
    mesh.isVisible = true;
    mesh.visibility = 1;
    if (mesh.material && Object.prototype.hasOwnProperty.call(mesh.material, 'alpha')) {
      mesh.material.alpha = 1;
    }
  }

  let bounds = combineBounds(meshes);
  if (bounds.maxDim > 0 && (bounds.maxDim < 0.05 || bounds.maxDim > 50)) {
    const targetSize = role === 'player' ? 0.95 : 1.15;
    const correction = targetSize / bounds.maxDim;
    for (const root of result.roots || []) {
      root.scaling.scaleInPlace(correction);
    }
    bounds = combineBounds(meshes);
  }

  const visibleMeshCount = meshes.filter(
    (mesh) => mesh.isEnabled() && mesh.isVisible !== false && (mesh.visibility ?? 1) > 0.02,
  ).length;

  if (visibleMeshCount === 0 && debugMode) {
    console.error(`[actors] ${role} loaded but invisible after sanitize`);
  }

  const worldPos = attachParent?.getAbsolutePosition?.() || bounds.center;
  return {
    loaded: true,
    usingFallback: visibleMeshCount === 0,
    reason: visibleMeshCount === 0 ? 'loaded_invisible' : 'ok',
    worldPos: [worldPos.x, worldPos.y, worldPos.z],
    bboxSize: [bounds.size.x, bounds.size.y, bounds.size.z],
  };
}

export async function boot(options = {}) {
  const { isTestMode = false } = options;
  const shotMode = isShotMode();
  const debugMode = isDebugMode();
  const shotScene = shotMode ? getShotScene() : 'title';

  // Debug hook (Playwright polls this)
  window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
  window.__DADA_DEBUG__.sceneKey = 'TitleScene';
  const mergedFlags = {
    ...DEFAULT_FLAGS,
    ...(window.__DADA_DEBUG__.flags || {}),
  };
  if (shotMode) {
    // Freeze non-essential effects for deterministic screenshot captures.
    mergedFlags.juice = false;
    mergedFlags.audio = false;
    mergedFlags.occlusionFade = false;
  }
  window.__DADA_DEBUG__.flags = mergedFlags;
  const debugFlags = window.__DADA_DEBUG__.flags;
  window.__DADA_DEBUG__.isShotMode = shotMode;
  window.__DADA_DEBUG__.shotReady = false;
  window.__DADA_DEBUG__.shotFrames = 0;

  // Test mode fast-path: headless Chromium has no WebGL, so skip all rendering
  // and just advance the scene keys on timers for the smoke test.
  if (isTestMode) {
    window.__DADA_DEBUG__.sceneKey = 'TitleScene';
    setTimeout(() => { window.__DADA_DEBUG__.sceneKey = 'CribScene'; }, 300);
    setTimeout(() => { window.__DADA_DEBUG__.sceneKey = 'EndScene'; }, 1500);
    return;
  }

  const canvas = document.getElementById('renderCanvas');
  const uiRoot = document.getElementById('uiRoot');
  if (shotMode) {
    disableAnimationsForShotMode();
  }
  const fallbackWidth = Math.max(1, window.innerWidth || 800);
  const fallbackHeight = Math.max(1, window.innerHeight || 500);
  if (canvas.width <= 0 || canvas.height <= 0) {
    canvas.width = fallbackWidth;
    canvas.height = fallbackHeight;
  }

  // Babylon engine
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
  });
  if (engine.getRenderWidth() <= 0 || engine.getRenderHeight() <= 0) {
    engine.setSize(fallbackWidth, fallbackHeight);
    canvas.width = Math.max(1, engine.getRenderWidth() || fallbackWidth);
    canvas.height = Math.max(1, engine.getRenderHeight() || fallbackHeight);
  }
  const scene = new BABYLON.Scene(engine);

  // Input
  const input = new InputManager();

  // UI
  const ui = createUI(uiRoot);

  // Build the diorama world
  const world = shotMode
    ? withPatchedRandom(createSeededRandom(1337), () => buildWorld(scene, {
      random: createSeededRandom(7331),
      animateGoal: false,
    }))
    : buildWorld(scene);

  await applyHdriEnvironment(scene, {
    intensity: shotMode ? 0.35 : 0.44,
  });
  const availableModels = await getAvailableModels();
  window.__DADA_DEBUG__.assetModels = availableModels;

  const actorState = {
    player: { loaded: false, usingFallback: true, reason: 'not_loaded', bboxSize: [0, 0, 0], worldPos: [0, 0, 0] },
    goal: { loaded: false, usingFallback: true, reason: 'not_loaded', bboxSize: [0, 0, 0], worldPos: [0, 0, 0] },
  };
  window.__DADA_DEBUG__.actors = actorState;

  async function attachRoleModel(roleName, fallbackNode, options = {}) {
    const fallbackMeshes = Array.isArray(options.fallbackMeshes)
      ? options.fallbackMeshes
      : collectNodeMeshes(fallbackNode);
    const result = await loadModelForRole(scene, roleName, options);
    if (result.loaded) {
      registerShadowCasters(world.shadowGen, result.meshes);
      hideMeshList(fallbackMeshes);
      if (options.actorRole) {
        actorState[options.actorRole] = sanitizeLoadedRoleModel({
          role: options.actorRole,
          result,
          attachParent: options.parent || null,
          debugMode,
        });
      }
      return result;
    }
    if (options.actorRole) {
      const p = options.parent?.getAbsolutePosition?.();
      actorState[options.actorRole] = {
        loaded: false,
        usingFallback: true,
        reason: result.reason || 'load_failed',
        worldPos: p ? [p.x, p.y, p.z] : [0, 0, 0],
        bboxSize: [0, 0, 0],
      };
      if (debugMode) {
        console.error(`[actors] ${options.actorRole} load failed: ${result.reason || 'load_failed'}`);
      }
    }
    return result;
  }

  function pushForegroundMeshes(meshes) {
    if (!Array.isArray(meshes)) return;
    world.foregroundMeshes = world.foregroundMeshes || [];
    for (const mesh of meshes) {
      if (!(mesh instanceof BABYLON.Mesh)) continue;
      mesh.metadata = {
        ...(mesh.metadata || {}),
        layer: 'foreground',
      };
      world.foregroundMeshes.push(mesh);
    }
  }

  // Player
  const player = new PlayerController(scene, { x: -12, y: 3, z: 0 });
  player.setColliders(world.platforms);
  // Register player child meshes as shadow casters (mesh is now a TransformNode)
  for (const m of player._meshes) {
    world.shadowGen.addShadowCaster(m);
  }
  const playerFallbackMeshes = collectNodeMeshes(player.visual).filter((mesh) => mesh.name !== 'goalTrigger');
  const goalFallbackMeshes = collectNodeMeshes(world.goalRoot).filter((mesh) => mesh.name !== 'goalTrigger');
  applyRoleMetadata(playerFallbackMeshes, 'player');
  applyRoleMetadata(goalFallbackMeshes, 'goal');

  const playerVisualRoot = new BABYLON.TransformNode('playerVisualRoot', scene);
  playerVisualRoot.parent = player.visual;
  playerVisualRoot.position.set(0, PLAYER_MODEL_SLOT_Y, 0);

  const goalVisualRoot = new BABYLON.TransformNode('goalVisualRoot', scene);
  goalVisualRoot.parent = world.goalRoot;
  goalVisualRoot.position.set(0, GOAL_MODEL_SLOT_Y, 0);

  // Replace procedural player toy with authored model (visuals only).
  await attachRoleModel('playerModel', player.visual, {
    parent: playerVisualRoot,
    fallbackMeshes: playerFallbackMeshes,
    fallbackMaterial: 'plastic',
    rotation: new BABYLON.Vector3(0, Math.PI, 0),
    actorRole: 'player',
  });

  // Replace DaDa mesh and key props with authored assets.
  await attachRoleModel('goalModel', world.goalRoot, {
    parent: goalVisualRoot,
    fallbackMeshes: goalFallbackMeshes,
    fallbackMaterial: 'plastic',
    rotation: new BABYLON.Vector3(0, Math.PI, 0),
    actorRole: 'goal',
  });

  for (const signRoot of world.signs || []) {
    await attachRoleModel('signModel', signRoot, {
      parent: resolveAttachParent(signRoot),
      fallbackMaterial: 'cardboard',
      scaling: 0.9,
    });
  }

  for (const checkpoint of world.checkpoints || []) {
    await attachRoleModel('checkpointModel', checkpoint.marker, {
      parent: resolveAttachParent(checkpoint.marker),
      fallbackMaterial: 'cardboard',
      scaling: 0.72,
    });
  }

  for (const pickup of world.pickups || []) {
    await attachRoleModel('pickupModel', pickup.node, {
      parent: resolveAttachParent(pickup.node),
      fallbackMaterial: 'plastic',
      scaling: 0.9,
    });
  }

  const anchors = world.assetAnchors || {};
  for (const toy of anchors.toyBlocks || []) {
    await attachRoleModel('toyBlockModel', toy, {
      parent: resolveAttachParent(toy),
      fallbackMaterial: 'cardboard',
      scaling: 0.7,
    });
  }

  if (anchors.hangingRing) {
    await attachRoleModel('hangingModel', anchors.hangingRing, {
      parent: resolveAttachParent(anchors.hangingRing),
      fallbackMaterial: 'plastic',
      scaling: 0.95,
    });
  }

  if (anchors.goalBanner) {
    await attachRoleModel('bannerModel', anchors.goalBanner, {
      parent: resolveAttachParent(anchors.goalBanner),
      fallbackMaterial: 'plastic',
      scaling: 1.2,
    });
  }

  if (anchors.cribRail) {
    await attachRoleModel('cribRailModel', resolveAttachParent(anchors.cribRail), {
      parent: resolveAttachParent(anchors.cribRail),
      fallbackMaterial: 'cardboard',
      scaling: [1.05, 0.9, 0.9],
    });
  }

  for (const plant of anchors.foregroundCutouts || []) {
    const pos = getAnchorWorldPosition(plant);
    if (!pos) continue;
    const result = await attachRoleModel('bushModel', plant, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [2.1, 1.9, 1.5],
    });
    if (result.loaded) {
      pushForegroundMeshes(result.meshes);
    }
  }

  for (const hill of anchors.backHills || []) {
    const pos = getAnchorWorldPosition(hill);
    if (!pos) continue;
    await attachRoleModel('treeModel', hill, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [2.5, 2.6, 1.8],
    });
  }

  for (const hedge of anchors.midHedges || []) {
    const pos = getAnchorWorldPosition(hedge);
    if (!pos) continue;
    await attachRoleModel('bushModel', hedge, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [2.1, 2.0, 1.5],
    });
  }

  for (const cloud of anchors.cloudCutouts || []) {
    const pos = getAnchorWorldPosition(cloud);
    if (!pos) continue;
    await attachRoleModel('cloudModel', cloud, {
      position: pos,
      fallbackMaterial: 'paper',
      scaling: [1.9, 1.4, 1.4],
    });
  }

  for (const tree of anchors.treeDecor || []) {
    const pos = getAnchorWorldPosition(tree);
    if (!pos) continue;
    await attachRoleModel('treeModel', tree, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [1.2, 1.2, 1.0],
    });
  }

  const spawnPoint = world.spawn || { x: -12, y: 3, z: 0 };
  // Deterministic settle: snap player onto platform surface before first frame
  player.spawnAt(spawnPoint.x, spawnPoint.y, spawnPoint.z || 0);
  const checkpoints = [
    { index: 0, label: 'Start', spawn: { ...spawnPoint }, radius: 1.3, marker: null },
    ...(world.checkpoints || []),
  ];
  const pickups = world.pickups || [];
  const coins = world.coins || [];
  const hazards = world.hazards || [];
  const crumbles = world.crumbles || [];
  // Crumble state machine — each entry links to a player.colliders[] slot.
  const crumbleStates = crumbles.map((cr) => {
    const platformIndex = world.platforms.indexOf(cr.colliderMesh);
    const collider = platformIndex >= 0 ? player.colliders[platformIndex] : null;
    return {
      cr,
      collider,
      savedMinY: collider ? collider.minY : 0,
      savedMaxY: collider ? collider.maxY : 0,
      state: 'idle',  // idle | shaking | falling
      timer: 0,
    };
  });
  const juiceFx = new JuiceFx(scene, { enabled: !!debugFlags.juice && !shotMode });
  const audio = new GameAudio({ enabled: !!debugFlags.audio && !shotMode });
  audio.armOnFirstGesture();
  const worldExtents = world.extents || { minX: -18, maxX: 24 };
  const camTargetMinX = worldExtents.minX + 3.2;
  const camTargetMaxX = worldExtents.maxX - 2.6;
  const foregroundMeshes = (world.foregroundMeshes || [])
    .filter((m) => m?.metadata?.layer === 'foreground' && m?.isEnabled?.() !== false);
  const foregroundState = new Map();
  for (const mesh of foregroundMeshes) {
    const material = mesh.material;
    prepareFadeMaterial(material);
    foregroundState.set(mesh.uniqueId, {
      target: 1,
      current: 1,
      seenMs: 0,
      clearMs: 0,
    });
  }

  // Camera — fixed angle, smooth follow
  const cameraStartPos = new BABYLON.Vector3(-18, 7, -14);
  const cameraStartTarget = new BABYLON.Vector3(-12, 2, 0);
  const camera = new BABYLON.FreeCamera('cam', cameraStartPos.clone(), scene);
  camera.setTarget(cameraStartTarget.clone());
  camera.minZ = 0.5;
  camera.maxZ = 100;
  // Do NOT attach controls — camera is game-controlled, not user-controlled

  // Dev-only debug HUD + rest stability test
  const debugHud = import.meta.env.DEV ? createDebugHud() : null;
  if (import.meta.env.DEV) installRestStabilityTest(player);

  // Game state machine
  const goalX = world.goalRoot.position.x;

  let state = 'title'; // title | gameplay | end
  let goalReached = false;
  let shotFrames = 0;
  let goalTimer = 0;
  let respawnState = null;
  let goalCamStartPos = camera.position.clone();
  let goalCamStartTarget = camera.getTarget().clone();
  let goalCamEndPos = camera.position.clone();
  let goalCamEndTarget = camera.getTarget().clone();
  let activeCheckpointIndex = 0;
  let respawnPoint = { ...spawnPoint };
  let onesieBuffTimerMs = 0;
  let onesieMaxDurationMs = 10000;
  let onesieJumpBoost = 1;
  let slipRecentTimerMs = 0;
  let coinsCollected = 0;
  let debugIdleTimerMs = 0; // suppress input for N ms in debug mode after spawn
  let goalWaveTimer = 0;   // ambient DaDa idle wave
  let breathTimer = 0;     // player idle breath
  const checkpointEmissiveBase = new Map();
  for (const checkpoint of checkpoints) {
    if (!checkpoint.marker) continue;
    for (const mesh of checkpoint.marker.getChildMeshes()) {
      if (mesh.material && mesh.material.emissiveColor) {
        checkpointEmissiveBase.set(mesh.uniqueId, mesh.material.emissiveColor.clone());
      }
    }
  }
  const actorInvisibleLogged = {
    player: false,
    goal: false,
  };
  window.__DADA_DEBUG__.lastRespawnReason = '';
  window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
  window.__DADA_DEBUG__.onesieBuffMs = 0;
  window.__DADA_DEBUG__.actors = actorState;

  function updateActorDebug() {
    const describe = (roleName, node) => {
      const meshes = collectNodeMeshes(node).filter((mesh) => mesh.name !== 'goalTrigger');
      const enabledMeshes = meshes.filter((mesh) => mesh.isEnabled());
      const bounds = combineBounds(enabledMeshes.length ? enabledMeshes : meshes);
      const visibleCount = meshes.filter(
        (mesh) => mesh.isEnabled() && mesh.isVisible !== false && (mesh.visibility ?? 1) > 0.02,
      ).length;
      const pos = node?.getAbsolutePosition?.() || bounds.center;
      const usingFallback = actorState[roleName].usingFallback;

      if (visibleCount === 0 && debugMode && !actorInvisibleLogged[roleName]) {
        const cause = actorState[roleName].loaded ? 'loaded_but_invisible' : 'load_failed_using_fallback';
        console.error(`[actors] ${roleName} invisible (${cause})`);
        actorInvisibleLogged[roleName] = true;
      }
      if (visibleCount > 0) {
        actorInvisibleLogged[roleName] = false;
      }

      return {
        loaded: actorState[roleName].loaded,
        usingFallback,
        reason: actorState[roleName].reason,
        worldPos: [pos.x, pos.y, pos.z],
        bboxSize: [bounds.size.x, bounds.size.y, bounds.size.z],
        visibleMeshCount: visibleCount,
      };
    };

    window.__DADA_DEBUG__.actors = {
      player: describe('player', player.visual),
      goal: describe('goal', world.goalRoot),
    };
  }

  function finishRun() {
    state = 'end';
    window.__DADA_DEBUG__.sceneKey = 'EndScene';
    ui.showEnd();
  }

  function restartRun(reason = 'ui') {
    if (debugMode) {
      console.log(`[game] restart requested via ${reason}`);
    }

    ui.setFade(0);
    ui.hideEnd();
    ui.showTitle();
    ui.resetGameplayHud();
    ui.showStatus('Ready!', 500);
    input.consumeAll();
    juiceFx.clear();

    state = 'title';
    goalReached = false;
    goalTimer = 0;
    respawnState = null;
    activeCheckpointIndex = 0;
    respawnPoint = { ...spawnPoint };
    onesieBuffTimerMs = 0;
    onesieMaxDurationMs = 10000;
    onesieJumpBoost = 1;
    slipRecentTimerMs = 0;
    coinsCollected = 0;
    debugIdleTimerMs = 0;
    window.__DADA_DEBUG__.sceneKey = 'TitleScene';
    window.__DADA_DEBUG__.checkpointIndex = 0;
    window.__DADA_DEBUG__.lastRespawnReason = '';
    window.__DADA_DEBUG__.onesieBuffMs = 0;

    for (const checkpoint of checkpoints) {
      if (!checkpoint.marker) continue;
      for (const mesh of checkpoint.marker.getChildMeshes()) {
        if (!mesh.material || !mesh.material.emissiveColor) continue;
        const base = checkpointEmissiveBase.get(mesh.uniqueId);
        if (base) {
          mesh.material.emissiveColor = base.clone();
        }
      }
    }

    for (const coin of coins) {
      coin.collected = false;
      if (coin.node) coin.node.setEnabled(true);
    }
    coinsCollected = 0;
    resetCrumbles();

    for (const pickup of pickups) {
      pickup.collected = false;
      if (pickup.node) pickup.node.setEnabled(true);
    }

    player.spawnAt(spawnPoint.x, spawnPoint.y, spawnPoint.z || 0);
    player.vx = 0;
    player.vy = 0;
    player.invulnTimerMs = 0;
    player.setMovementModifiers();
    player.visual.scaling.set(1, 1, 1);
    player.visual.rotation.set(0, 0, 0);
    updatePlayerShadow(player);

    camera.position.copyFrom(cameraStartPos);
    camera.setTarget(cameraStartTarget.clone());
    updateActorDebug();
  }

  ui.setPlayAgainHandler(() => {
    if (debugMode) {
      console.log('UI: playAgain clicked');
    }
    restartRun('playAgain');
  });

  function startGoalCelebration(goalPos) {
    ui.hideObjective();
    if (!debugFlags.juice) {
      finishRun();
      return;
    }
    audio.playWin();
    state = 'goal';
    goalTimer = GOAL_CELEBRATION_SEC;
    goalCamStartPos = camera.position.clone();
    goalCamStartTarget = camera.getTarget().clone();
    goalCamEndPos = new BABYLON.Vector3(goalPos.x - 3.0, goalPos.y + 2.0, -10.5);
    goalCamEndTarget = new BABYLON.Vector3(goalPos.x, goalPos.y + 0.8, 0);
    juiceFx.spawnGoalSparkles(goalPos);
    juiceFx.spawnGoalSparkles({ x: goalPos.x - 0.9, y: goalPos.y + 0.4, z: goalPos.z });
    juiceFx.spawnGoalSparkles({ x: goalPos.x + 0.9, y: goalPos.y + 0.4, z: goalPos.z });
    ui.showPopText('Da Da!', 780);
  }

  function triggerReset(reason, direction = -1) {
    if (respawnState) return;
    const applied = player.applyHit({
      direction,
      knockback: 4.2,
      upward: 3.8,
      invulnMs: 800,
    });
    if (!applied) return;
    audio.playReset();
    respawnState = { phase: 'fadeOut', timer: 0.16, reason };
    window.__DADA_DEBUG__.lastRespawnReason = reason;
    ui.showStatus('Try again!', 650);
  }

  function resolveRespawnPosition(baseSpawn) {
    const { halfW, halfH } = player.getCollisionHalfExtents();

    const placeOnSurface = (x, fallbackY) => {
      let highest = null;
      for (const c of player.colliders) {
        if ((x + halfW) <= c.minX || (x - halfW) >= c.maxX) continue;
        if (highest === null || c.maxY > highest) highest = c.maxY;
      }
      return highest === null ? fallbackY : (highest + halfH + 0.02);
    };

    const minX = worldExtents.minX + 0.8;
    const maxX = worldExtents.maxX - 0.8;
    for (let i = 0; i < 24; i++) {
      const lateralIndex = Math.floor((i + 1) / 2);
      const lateralSign = i % 2 === 0 ? 1 : -1;
      const offsetX = i === 0 ? 0 : lateralSign * lateralIndex * 0.28;
      const x = clamp(baseSpawn.x + offsetX, minX, maxX);
      const yBase = placeOnSurface(x, baseSpawn.y + Math.floor(i / 6) * 0.24);
      const y = yBase + Math.floor(i / 8) * 0.2;
      if (!player.wouldOverlapAt(x, y)) {
        return { x, y, z: baseSpawn.z || 0 };
      }
    }

    // Fallback: push above the world and let gravity settle safely.
    return {
      x: clamp(baseSpawn.x, minX, maxX),
      y: baseSpawn.y + 2.4,
      z: baseSpawn.z || 0,
    };
  }

  function activateCheckpoint(checkpoint) {
    if (!checkpoint || checkpoint.index <= activeCheckpointIndex) return;
    activeCheckpointIndex = checkpoint.index;
    respawnPoint = { ...checkpoint.spawn };
    window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
    ui.showStatus(`${checkpoint.label} checkpoint`, 1200);

    if (checkpoint.marker) {
      for (const mesh of checkpoint.marker.getChildMeshes()) {
        if (mesh.material && mesh.material.emissiveColor) {
          mesh.material.emissiveColor = new BABYLON.Color3(0.35, 0.18, 0.05);
        }
      }
    }
  }

  function updateLevelInteractions(dt) {
    const pos = player.mesh.position;

    if (onesieBuffTimerMs > 0) {
      onesieBuffTimerMs = Math.max(0, onesieBuffTimerMs - dt * 1000);
      if (onesieBuffTimerMs === 0) {
        onesieJumpBoost = 1;
        ui.showStatus('Onesie boost faded', 900);
      }
    }

    // Checkpoint overlaps
    for (const checkpoint of checkpoints) {
      if (checkpoint.index <= activeCheckpointIndex) continue;
      const dx = pos.x - checkpoint.spawn.x;
      const dy = pos.y - checkpoint.spawn.y;
      const r = checkpoint.radius ?? 1.2;
      if ((dx * dx + dy * dy) <= (r * r)) {
        activateCheckpoint(checkpoint);
      }
    }

    // Coin overlaps
    for (const coin of coins) {
      if (coin.collected) continue;
      const dx = pos.x - coin.position.x;
      const dy = pos.y - coin.position.y;
      const r = coin.radius ?? 0.45;
      if ((dx * dx + dy * dy) <= (r * r)) {
        coin.collected = true;
        if (coin.node) coin.node.setEnabled(false);
        coinsCollected++;
        audio.playCoin();
        juiceFx.spawnCoinSparkle(coin.position);
        ui.updateCoins(coinsCollected);
        if (coinsCollected === coins.length) {
          ui.showPopText('All stars!', 900);
        }
      }
    }

    // Pickup overlaps
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      const dx = pos.x - pickup.position.x;
      const dy = pos.y - pickup.position.y;
      const r = pickup.radius ?? 0.85;
      if ((dx * dx + dy * dy) <= (r * r)) {
        pickup.collected = true;
        if (pickup.node) pickup.node.setEnabled(false);
        onesieMaxDurationMs = pickup.durationMs ?? 10000;
        onesieBuffTimerMs = onesieMaxDurationMs;
        onesieJumpBoost = pickup.jumpBoost ?? 1.2;
        audio.playPickup();
        juiceFx.spawnPickupSparkle(pickup.position);
        ui.showStatus('Onesie boost!', 1400);
      }
    }

    // Hazard overlaps affect movement.
    let accelMultiplier = 1;
    let decelMultiplier = 1;
    for (const hazard of hazards) {
      const inside = pos.x >= hazard.minX
        && pos.x <= hazard.maxX
        && pos.y >= hazard.minY
        && pos.y <= hazard.maxY;

      if (inside && hazard.type === 'slip') {
        accelMultiplier *= hazard.accelMultiplier ?? 0.78;
        decelMultiplier *= hazard.decelMultiplier ?? 0.22;
        slipRecentTimerMs = 900;
      }
    }

    if (slipRecentTimerMs > 0) {
      slipRecentTimerMs = Math.max(0, slipRecentTimerMs - dt * 1000);
    }

    player.setMovementModifiers({
      surfaceAccelMultiplier: accelMultiplier,
      surfaceDecelMultiplier: decelMultiplier,
      jumpVelocityMultiplier: onesieJumpBoost,
    });

    window.__DADA_DEBUG__.onesieBuffMs = Math.round(onesieBuffTimerMs);
  }

  function resetCrumbles() {
    for (const cs of crumbleStates) {
      cs.state = 'idle';
      cs.timer = 0;
      cs.cr.root.position.x = cs.cr.x;
      cs.cr.root.position.y = cs.cr.y;
      cs.cr.root.setEnabled(true);
      if (cs.collider) {
        cs.collider.minY = cs.savedMinY;
        cs.collider.maxY = cs.savedMaxY;
      }
    }
  }

  function updateCrumbles(dt) {
    const pos = player.mesh.position;
    const { halfW, halfH } = player.getCollisionHalfExtents();
    const SHAKE_DUR = 0.58;
    const FALL_DUR = 2.5;

    for (const cs of crumbleStates) {
      if (cs.state === 'idle') {
        if (!player.grounded || !cs.collider) continue;
        const playerBottom = pos.y - halfH;
        const onTop = Math.abs(playerBottom - cs.collider.maxY) < 0.05
          && (pos.x + halfW) > cs.collider.minX
          && (pos.x - halfW) < cs.collider.maxX;
        if (onTop) {
          cs.state = 'shaking';
          cs.timer = SHAKE_DUR;
          audio.playCrumbleWarn();
        }
      } else if (cs.state === 'shaking') {
        cs.timer = Math.max(0, cs.timer - dt);
        // Visual shake — oscillate root X
        cs.cr.root.position.x = cs.cr.x + Math.sin(cs.timer * 72) * 0.038;
        if (cs.timer <= 0) {
          cs.state = 'falling';
          cs.timer = FALL_DUR;
          audio.playCrumbleFall();
          cs.cr.root.position.x = cs.cr.x;
          cs.cr.root.setEnabled(false);
          if (cs.collider) {
            cs.collider.minY = -1000;
            cs.collider.maxY = -999;
          }
        }
      } else if (cs.state === 'falling') {
        cs.timer = Math.max(0, cs.timer - dt);
        if (cs.timer <= 0) {
          cs.state = 'idle';
          cs.cr.root.setEnabled(true);
          if (cs.collider) {
            cs.collider.minY = cs.savedMinY;
            cs.collider.maxY = cs.savedMaxY;
          }
        }
      }
    }
  }

  function updateForegroundOcclusion(dt) {
    if (!foregroundMeshes.length) return;

    const playerPos = player.mesh.position;
    const cameraPos = camera.position;
    const toPlayer = playerPos.subtract(cameraPos);
    const rayLength = toPlayer.length();
    if (rayLength <= 0.001) return;

    const rayDir = toPlayer.scale(1 / rayLength);
    const ray = new BABYLON.Ray(cameraPos, rayDir, rayLength);

    for (const mesh of foregroundMeshes) {
      if (mesh?.metadata?.role === 'player' || mesh?.metadata?.role === 'goal') continue;
      const stateInfo = foregroundState.get(mesh.uniqueId);
      if (!stateInfo) continue;

      const material = mesh.material;
      if (!material) continue;
      prepareFadeMaterial(material);

      let occluding = false;
      if (debugFlags.occlusionFade) {
        const hit = ray.intersectsMesh(mesh, false);
        occluding = !!(hit?.hit && hit.distance < rayLength - 0.35);
      }

      if (occluding) {
        stateInfo.seenMs += dt * 1000;
        stateInfo.clearMs = 0;
        if (stateInfo.seenMs > 48) {
          stateInfo.target = 0.25;
        }
      } else {
        stateInfo.clearMs += dt * 1000;
        stateInfo.seenMs = 0;
        if (stateInfo.clearMs > 140) {
          stateInfo.target = 1;
        }
      }

      stateInfo.current = damp(stateInfo.current, stateInfo.target, 10, dt);
      material.alpha = material._dadaBaseAlpha * stateInfo.current;
    }
  }

  if (shotMode) {
    if (shotScene === 'crib') {
      state = 'gameplay';
      ui.hideTitle();
      window.__DADA_DEBUG__.sceneKey = 'CribScene';
      player.mesh.position.set(-5.25, 2.25, 0);
      camera.position.set(-11.5, 6.6, -14);
      camera.setTarget(new BABYLON.Vector3(-4.0, 2.1, 0));
    } else if (shotScene === 'end') {
      state = 'end';
      ui.hideTitle();
      ui.showEnd();
      window.__DADA_DEBUG__.sceneKey = 'EndScene';
      player.mesh.position.set(18.0, 3.35, 0);
      camera.position.set(13.5, 7.2, -14);
      camera.setTarget(new BABYLON.Vector3(20.0, 3.2, 0));
    } else {
      state = 'title';
      window.__DADA_DEBUG__.sceneKey = 'TitleScene';
      player.mesh.position.set(-12, 3, 0);
      camera.position.set(-18, 7, -14);
      camera.setTarget(new BABYLON.Vector3(-12, 2, 0));
    }
    player.vx = 0;
    player.vy = 0;
    updatePlayerShadow(player);
    updateActorDebug();
  }

  // Main loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (shotMode) {
      updatePlayerShadow(player);
      updateActorDebug();
      window.__DADA_DEBUG__.playerX = player.mesh.position.x;
      window.__DADA_DEBUG__.playerY = player.mesh.position.y;

      if (debugHud) {
        const fps = engine.getFps();
        const pDebug = player.getDebugState();
        debugHud.update(fps, pDebug, state, player.lastCollisionHits);
      }

      scene.render();
      if (shotFrames < SHOT_FRAMES_TARGET) {
        shotFrames += 1;
        window.__DADA_DEBUG__.shotFrames = shotFrames;
      }
      if (shotFrames >= SHOT_FRAMES_TARGET) {
        window.__DADA_DEBUG__.shotReady = true;
      }
      return;
    }

    if (input.consumeMuteToggle()) {
      const muted = audio.toggleMute();
      debugFlags.audio = !muted;
      window.__DADA_DEBUG__.flags.audio = !muted;
      ui.showStatus(muted ? 'Muted' : 'Sound on', 820);
    }

    if (state === 'title') {
      // Wait for player input
      if (input.consumeJump() || input.consumeEnter()) {
        audio.unlock();
        state = 'gameplay';
        input.consumeAll();
        window.__DADA_DEBUG__.sceneKey = 'CribScene';
        ui.hideTitle();
        ui.showGameplayHud(coins.length);
        if (debugMode) {
          debugIdleTimerMs = 1000; // suppress input for 1s so probe runs clean
          player.beginSpawnProbe('initial');
        }
      }
    } else if (state === 'gameplay') {
      if (respawnState) {
        if (respawnState.phase === 'fadeOut') {
          respawnState.timer = Math.max(0, respawnState.timer - dt);
          const t = 1 - (respawnState.timer / 0.16);
          ui.setFade(0.42 * t);

          if (respawnState.timer <= 0) {
            const resolved = resolveRespawnPosition(respawnPoint);
            player.spawnAt(resolved.x, resolved.y, resolved.z || 0);
            player.setMovementModifiers();
            respawnState = { phase: 'fadeIn', timer: 0.22, reason: respawnState.reason };
          }
        } else {
          respawnState.timer = Math.max(0, respawnState.timer - dt);
          const t = respawnState.timer / 0.22;
          ui.setFade(0.42 * t);
          if (respawnState.timer <= 0) {
            ui.setFade(0);
            respawnState = null;
            if (debugMode) {
              debugIdleTimerMs = 1000;
              player.beginSpawnProbe('respawn');
            }
          }
        }
      } else {
        updateLevelInteractions(dt);
        updateCrumbles(dt);
        // Debug idle: suppress input for probe duration
        const idleSuppressed = debugIdleTimerMs > 0;
        if (idleSuppressed) debugIdleTimerMs = Math.max(0, debugIdleTimerMs - dt * 1000);
        // Player update
        const moveX = idleSuppressed ? 0 : input.getMoveX();
        const jumpPress = idleSuppressed ? { edge: false, pressId: 0 } : input.consumeJumpPress();
        const jumpJustPressed = jumpPress.edge;
        const jumpHeld = idleSuppressed ? false : input.isJumpHeld();
        player.update(dt, moveX, jumpJustPressed, jumpHeld, jumpPress.pressId);

        const playerEvents = player.consumeEvents();
        for (const ev of playerEvents) {
          if (ev.type === 'jump') {
            audio.playJump();
            juiceFx.spawnJumpDust(player.mesh.position);
            ui.fadeControlHints();
          } else if (ev.type === 'land') {
            audio.playLand();
            juiceFx.spawnLandDust(player.mesh.position);
            if (!shotMode) camera.position.y -= 0.18; // camera punch
          } else if (ev.type === 'outOfBounds') {
            const reason = slipRecentTimerMs > 0 ? 'slip_fall' : 'fell_off_level';
            triggerReset(reason, player.mesh.position.x < respawnPoint.x ? 1 : -1);
          }
        }

        // HUD updates each frame
        ui.updateObjectiveDir(player.mesh.position.x, goalX);
        ui.updateBuff(onesieBuffTimerMs, onesieMaxDurationMs);
      }

      // Update blob shadow position (follows player X, stays near ground)
      updatePlayerShadow(player);

      // Check goal
      const pPos = player.getPosition();
      const goalBounds = world.goal.getBoundingInfo().boundingBox;
      const goalInside = pPos.x >= goalBounds.minimumWorld.x
        && pPos.x <= goalBounds.maximumWorld.x
        && pPos.y >= goalBounds.minimumWorld.y
        && pPos.y <= goalBounds.maximumWorld.y;
      if (goalInside && !goalReached) {
        goalReached = true;
        startGoalCelebration(world.goalRoot.getAbsolutePosition());
      }

      // Smooth camera follow
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      const targetX = clamp(px + 2, camTargetMinX, camTargetMaxX);
      camera.position.x = damp(camera.position.x, targetX - 8, 4, dt);
      camera.position.y = damp(camera.position.y, py + 4, 4, dt);
      camera.position.z = damp(camera.position.z, -14, 4, dt);
      camera.setTarget(new BABYLON.Vector3(
        damp(camera.getTarget().x, targetX, 4, dt),
        damp(camera.getTarget().y, py + 1.2, 4, dt),
        0,
      ));
    } else if (state === 'goal') {
      goalTimer = Math.max(0, goalTimer - dt);
      const t = 1 - (goalTimer / GOAL_CELEBRATION_SEC);
      const ease = easeOutCubic(t);
      camera.position = BABYLON.Vector3.Lerp(goalCamStartPos, goalCamEndPos, ease);
      camera.setTarget(BABYLON.Vector3.Lerp(goalCamStartTarget, goalCamEndTarget, ease));
      if (goalTimer <= 0) {
        finishRun();
      }
    } else if (state === 'end') {
      if (input.consumeJump() || input.consumeEnter()) {
        restartRun('keyboard');
      }
    }

    // Ambient micro-animations — disabled in shot mode
    if (!shotMode) {
      goalWaveTimer += dt;
      goalVisualRoot.position.y = GOAL_MODEL_SLOT_Y + Math.sin(goalWaveTimer * 1.4) * 0.06;

      if (state === 'gameplay' && !respawnState) {
        for (const coin of coins) {
          if (coin.node && !coin.collected) {
            coin.node.rotation.y += dt * 2.5;
          }
        }
        if (player.grounded && Math.abs(player.vx) < 0.5) {
          breathTimer += dt;
          playerVisualRoot.position.y = PLAYER_MODEL_SLOT_Y + Math.sin(breathTimer * 2.2) * 0.018;
        } else {
          breathTimer = 0;
          playerVisualRoot.position.y = PLAYER_MODEL_SLOT_Y;
        }
      }
    }

    juiceFx.update(dt);
    updateForegroundOcclusion(dt);
    updateActorDebug();
    window.__DADA_DEBUG__.playerX = player.mesh.position.x;
    window.__DADA_DEBUG__.playerY = player.mesh.position.y;

    // Debug HUD (dev only)
    if (debugHud) {
      const fps = engine.getFps();
      const pDebug = state !== 'title' ? player.getDebugState() : null;
      debugHud.update(fps, pDebug, state, pDebug ? player.lastCollisionHits : 0);
    }

    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());

  return { engine, scene };
}
