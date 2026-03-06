import * as BABYLON from '@babylonjs/core';
import { buildWorld } from './world/buildWorld.js';
import { buildWorld2 } from './world/buildWorld2.js';
import { buildWorld3 } from './world/buildWorld3.js';
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
const CAMERA_FOLLOW_Z = -13.2;

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

function getShotToast() {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.search).get('toast');
  return value === 'onesie' || value === 'slippery' ? value : '';
}

function shouldUseExternalPlayerModel() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('playerModel') === '1') return true;
  return window.__DADA_DEBUG__?.flags?.useExternalPlayerModel === true;
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
  const feetY = player.mesh.position.y - 0.39;
  player.blobShadow.position.y = feetY + 0.01;
  const shadowScale = player.grounded
    ? 1.04
    : Math.max(0.78, 1.04 - (Math.abs(player.vy) * 0.018));
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

function setMeshesRenderingGroup(meshes, groupId) {
  if (!Array.isArray(meshes)) return;
  for (const mesh of meshes) {
    if (mesh instanceof BABYLON.Mesh) {
      mesh.renderingGroupId = groupId;
    }
  }
}

function configureMeshesAsAlphaCutout(meshes) {
  if (!Array.isArray(meshes)) return;
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh) || !mesh.material) continue;
    const mat = mesh.material;
    if (mat.opacityTexture || mat.albedoTexture || mat.diffuseTexture) {
      mat.needDepthPrePass = true;
      if (Object.prototype.hasOwnProperty.call(mat, 'transparencyMode')) {
        mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
      }
      if (Object.prototype.hasOwnProperty.call(mat, 'alphaCutOff')) {
        mat.alphaCutOff = 0.4;
      }
    }
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
      min: new BABYLON.Vector3(0, 0, 0),
      max: new BABYLON.Vector3(0, 0, 0),
      size: new BABYLON.Vector3(0, 0, 0),
      maxDim: 0,
    };
  }
  const size = max.subtract(min);
  return {
    center: min.add(max).scale(0.5),
    min,
    max,
    size,
    maxDim: Math.max(size.x, size.y, size.z),
  };
}

function collectRenderableMeshes(rootOrRoots) {
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots : [rootOrRoots];
  const meshes = [];
  for (const root of roots) {
    if (!root) continue;
    if (root instanceof BABYLON.Mesh && root.getTotalVertices() > 0) {
      meshes.push(root);
    }
    if (root instanceof BABYLON.TransformNode) {
      for (const mesh of root.getChildMeshes(false)) {
        if (mesh instanceof BABYLON.Mesh && mesh.getTotalVertices() > 0) {
          meshes.push(mesh);
        }
      }
    }
  }
  return meshes;
}

function fitLoadedModel(rootOrRoots, {
  targetMaxSize = 0,
  targetHeight = 0,
  groundY = null,
  markDecorative = false,
} = {}) {
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots.filter(Boolean) : [rootOrRoots].filter(Boolean);
  if (!roots.length) {
    return { bounds: combineBounds([]), scaleFactor: 1 };
  }

  const renderMeshes = collectRenderableMeshes(roots);
  if (!renderMeshes.length) {
    return { bounds: combineBounds([]), scaleFactor: 1 };
  }

  const refreshBounds = () => {
    for (const root of roots) {
      root.computeWorldMatrix?.(true);
    }
    for (const mesh of renderMeshes) {
      mesh.computeWorldMatrix(true);
      mesh.checkCollisions = false;
      mesh.isPickable = false;
      mesh.metadata = {
        ...(mesh.metadata || {}),
        cameraIgnore: markDecorative ? true : mesh.metadata?.cameraIgnore,
        cameraBlocker: markDecorative ? false : mesh.metadata?.cameraBlocker,
      };
    }
    return combineBounds(renderMeshes);
  };

  let bounds = refreshBounds();
  let scaleFactor = 1;
  const targetScaleByMax = targetMaxSize > 0 && bounds.maxDim > 0
    ? targetMaxSize / bounds.maxDim
    : 0;
  const targetScaleByHeight = targetHeight > 0 && bounds.size.y > 0
    ? targetHeight / bounds.size.y
    : 0;
  if (targetScaleByMax > 0 && targetScaleByHeight > 0) {
    scaleFactor = Math.min(targetScaleByMax, targetScaleByHeight);
  } else if (targetScaleByMax > 0) {
    scaleFactor = targetScaleByMax;
  } else if (targetScaleByHeight > 0) {
    scaleFactor = targetScaleByHeight;
  }

  if (Number.isFinite(scaleFactor) && scaleFactor > 0 && Math.abs(scaleFactor - 1) > 0.001) {
    for (const root of roots) {
      root.scaling.scaleInPlace(scaleFactor);
    }
    bounds = refreshBounds();
  } else {
    scaleFactor = 1;
  }

  if (groundY !== null && Number.isFinite(groundY)) {
    const lift = groundY - bounds.min.y;
    if (Math.abs(lift) > 0.0001) {
      for (const root of roots) {
        root.position.y += lift;
      }
      bounds = refreshBounds();
    }
  }

  return { bounds, scaleFactor };
}

function describeNodeChain(node) {
  const chain = [];
  let current = node;
  while (current) {
    chain.push(current.name || current.id || current.constructor?.name || 'Node');
    current = current.parent || null;
  }
  return chain;
}

function disableLevel2DecorMeshes(scene, { debugMode = false } = {}) {
  const disabledDecor = [];
  const disabledGiant = [];

  for (const mesh of scene.meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    if (mesh.metadata?.level2Decor === true) {
      mesh.setEnabled(false);
      disabledDecor.push(mesh.name || mesh.id || 'mesh');
    }
  }

  for (const mesh of scene.meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    if (!mesh.isEnabled()) continue;
    if ((mesh.name || '').startsWith('L2_')) continue;
    if (mesh.metadata?.role === 'player' || mesh.metadata?.role === 'goal') continue;
    mesh.computeWorldMatrix(true);
    const bi = mesh.getBoundingInfo?.();
    const ext = bi?.boundingBox?.extendSizeWorld;
    if (!ext) continue;
    const maxExtent = Math.max(ext.x, ext.y, ext.z);
    const volume = (ext.x * 2) * (ext.y * 2) * (ext.z * 2);
    if (maxExtent > 40 || volume > 18000) {
      mesh.setEnabled(false);
      const info = {
        name: mesh.name,
        id: mesh.id,
        maxExtent: Number(maxExtent.toFixed(3)),
        volume: Number(volume.toFixed(3)),
      };
      disabledGiant.push(info);
      if (debugMode && disabledGiant.length === 1) {
        console.log('[L2 giant mesh disabled]', info);
      }
    }
  }

  return { disabledDecor, disabledGiant };
}

function isRenderableCameraObstacle(mesh, ignoredMeshes) {
  if (!(mesh instanceof BABYLON.Mesh)) return false;
  if (!mesh.isEnabled()) return false;
  if (mesh.isVisible === false) return false;
  if ((mesh.visibility ?? 1) <= 0.02) return false;
  if (mesh.name === 'goalTrigger') return false;
  if (ignoredMeshes.has(mesh)) return false;
  if (mesh.metadata?.role === 'player' || mesh.metadata?.role === 'goal') return false;
  if (mesh.metadata?.cameraIgnore === true) return false;
  if (mesh.metadata?.cameraBlocker === false) return false;
  const bounds = mesh.getBoundingInfo()?.boundingBox;
  if (bounds) {
    const maxExtent = Math.max(bounds.extendSizeWorld.x, bounds.extendSizeWorld.y, bounds.extendSizeWorld.z);
    if (maxExtent < 0.35) return false;
  }
  return true;
}

function resolveCameraOcclusion(scene, focusPos, desiredPos, ignoredMeshes) {
  const toCamera = desiredPos.subtract(focusPos);
  const desiredDistance = toCamera.length();
  if (desiredDistance <= 0.001) {
    return { correctedPos: desiredPos, hit: null };
  }

  const rayDir = toCamera.scale(1 / desiredDistance);
  const ray = new BABYLON.Ray(focusPos, rayDir, desiredDistance);
  const pick = scene.pickWithRay(
    ray,
    (mesh) => isRenderableCameraObstacle(mesh, ignoredMeshes),
    true,
  );

  if (!pick?.hit || !pick.pickedPoint) {
    return { correctedPos: desiredPos, hit: null };
  }

  const safeDistance = Math.max(0.85, Math.min(desiredDistance, pick.distance - 0.3));
  return {
    correctedPos: focusPos.add(rayDir.scale(safeDistance)),
    hit: pick,
  };
}

function findNearestMeshRayHit(scene, ray, ignoredMeshes) {
  let nearest = null;
  for (const mesh of scene.meshes) {
    if (!isRenderableCameraObstacle(mesh, ignoredMeshes)) continue;
    if (mesh.getTotalVertices?.() <= 0) continue;
    mesh.computeWorldMatrix(true);
    const hit = ray.intersectsMesh(mesh, true);
    if (!hit?.hit || !Number.isFinite(hit.distance)) continue;
    if (hit.distance <= 0.0001) continue;
    if (!nearest || hit.distance < nearest.distance) {
      nearest = {
        mesh,
        distance: hit.distance,
        pickedPoint: hit.pickedPoint || null,
      };
    }
  }
  return nearest;
}

function resolveLevel2CameraOcclusion(scene, headPos, desiredPos, ignoredMeshes) {
  const toCamera = desiredPos.subtract(headPos);
  const rayLen = toCamera.length();
  if (rayLen <= 0.001) {
    return { correctedPos: desiredPos, hit: null };
  }

  const rayDir = toCamera.scale(1 / rayLen);
  const ray = new BABYLON.Ray(headPos, rayDir, rayLen);
  const nearest = findNearestMeshRayHit(scene, ray, ignoredMeshes);
  if (!nearest || nearest.distance >= rayLen) {
    return { correctedPos: desiredPos, hit: null };
  }

  const safeDistance = Math.max(0.8, nearest.distance - 0.35);
  return {
    correctedPos: headPos.add(rayDir.scale(safeDistance)),
    hit: nearest,
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
  const { isTestMode = false, levelId = 1 } = options;
  const shotMode = isShotMode();
  const debugMode = isDebugMode();
  const animationsEnabled = !shotMode && !isTestMode;
  const shotScene = shotMode ? getShotScene() : 'title';
  const shotToast = shotMode ? getShotToast() : '';

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
  const useExternalPlayerModel = shouldUseExternalPlayerModel();
  window.__DADA_DEBUG__.isShotMode = shotMode;
  window.__DADA_DEBUG__.shotReady = false;
  window.__DADA_DEBUG__.shotFrames = 0;
  window.__DADA_DEBUG__.playerAnimationsEnabled = animationsEnabled;
  window.__DADA_DEBUG__.useExternalPlayerModel = useExternalPlayerModel;

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
  const ui = createUI(uiRoot, { disableToasts: shotMode && !shotToast });

  // Track which level the player has selected (may differ from loaded levelId if they
  // switched buttons without reloading). Initialized from URL to stay in sync with
  // what the world builder actually loaded.
  let selectedLevelId = levelId;
  ui.setLevelSelectHandler((id) => { selectedLevelId = id; });

  // Build the diorama world (route by level)
  let world;
  try {
    world = levelId === 3
      ? buildWorld3(scene, { animateGoal: !shotMode })
      : levelId === 2
        ? buildWorld2(scene, { animateGoal: !shotMode })
        : shotMode
          ? withPatchedRandom(createSeededRandom(1337), () => buildWorld(scene, {
            random: createSeededRandom(7331),
            animateGoal: false,
          }))
          : buildWorld(scene);
  } catch (buildErr) {
    ui.showStartError(buildErr?.message || 'World build failed');
    console.error('[boot] World build failed:', buildErr);
    throw buildErr;
  }

  if (levelId === 2) {
    window.__DADA_DEBUG__.level2CullResult = disableLevel2DecorMeshes(scene, { debugMode });
  }

  await applyHdriEnvironment(scene, {
    intensity: shotMode ? 0.35 : 0.44,
  });
  const availableModels = await getAvailableModels();
  window.__DADA_DEBUG__.assetModels = availableModels;
  const shouldLoadLevel2Decor = false;

  const actorState = {
    player: { loaded: false, usingFallback: true, reason: 'not_loaded', bboxSize: [0, 0, 0], worldPos: [0, 0, 0] },
    goal: { loaded: false, usingFallback: true, reason: 'not_loaded', bboxSize: [0, 0, 0], worldPos: [0, 0, 0] },
  };
  window.__DADA_DEBUG__.actors = actorState;

  async function attachRoleModel(roleName, fallbackNode, options = {}) {
    // Guard: catch non-Babylon-Node parents before they reach Babylon internals.
    const parentCandidate = options.parent;
    if (parentCandidate != null && typeof parentCandidate.isEnabled !== 'function') {
      throw new Error(
        `[boot] attachRoleModel('${roleName}', level=${levelId}): invalid parent — not a Babylon Node. ` +
        `type=${typeof parentCandidate}, isArray=${Array.isArray(parentCandidate)}`,
      );
    }

    const fallbackMeshes = Array.isArray(options.fallbackMeshes)
      ? options.fallbackMeshes
      : collectNodeMeshes(fallbackNode);
    const result = await loadModelForRole(scene, roleName, options);
    if (result.loaded) {
      registerShadowCasters(world.shadowGen, result.meshes);
      if (typeof options.renderingGroupId === 'number') {
        setMeshesRenderingGroup(result.meshes, options.renderingGroupId);
      }
      if (options.alphaCutout) {
        configureMeshesAsAlphaCutout(result.meshes);
      }
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
  const player = new PlayerController(scene, {
    x: -12,
    y: 3,
    z: 0,
    animationsEnabled,
  });
  player.setColliders(world.platforms);
  // Register player child meshes as shadow casters (mesh is now a TransformNode)
  for (const m of player._meshes) {
    world.shadowGen.addShadowCaster(m);
  }
  const playerFallbackMeshes = collectNodeMeshes(player.visual).filter((mesh) => mesh.name !== 'goalTrigger');
  const goalFallbackMeshes = collectNodeMeshes(world.goalRoot).filter((mesh) => mesh.name !== 'goalTrigger');
  applyRoleMetadata(playerFallbackMeshes, 'player');
  applyRoleMetadata(goalFallbackMeshes, 'goal');
  setMeshesRenderingGroup(playerFallbackMeshes, 3);
  setMeshesRenderingGroup(goalFallbackMeshes, 3);

  const playerVisualRoot = new BABYLON.TransformNode('playerVisualRoot', scene);
  playerVisualRoot.parent = player.visual;
  playerVisualRoot.position.set(0, PLAYER_MODEL_SLOT_Y, 0);

  const goalVisualRoot = new BABYLON.TransformNode('goalVisualRoot', scene);
  goalVisualRoot.parent = world.goalRoot;
  goalVisualRoot.position.set(0, GOAL_MODEL_SLOT_Y, 0);

  // Procedural baby is the default player visual. External model is opt-in.
  if (useExternalPlayerModel) {
    await attachRoleModel('playerModel', player.visual, {
      parent: playerVisualRoot,
      fallbackMeshes: playerFallbackMeshes,
      fallbackMaterial: 'plastic',
      rotation: new BABYLON.Vector3(0, Math.PI, 0),
      actorRole: 'player',
      renderingGroupId: 3,
    });
  } else {
    const p = player.visual.getAbsolutePosition();
    actorState.player = {
      loaded: false,
      usingFallback: true,
      reason: 'procedural_baby_default',
      worldPos: [p.x, p.y, p.z],
      bboxSize: [0, 0, 0],
    };
  }

  await attachRoleModel('goalModel', world.goalRoot, {
    parent: goalVisualRoot,
    fallbackMeshes: goalFallbackMeshes,
    fallbackMaterial: 'plastic',
    rotation: new BABYLON.Vector3(0, Math.PI, 0),
    actorRole: 'goal',
    renderingGroupId: 3,
  });

  for (const signRoot of world.signs || []) {
    await attachRoleModel('signModel', signRoot, {
      parent: resolveAttachParent(signRoot),
      fallbackMaterial: 'cardboard',
      scaling: 0.9,
      renderingGroupId: 2,
    });
  }

  for (const checkpoint of world.checkpoints || []) {
    await attachRoleModel('checkpointModel', checkpoint.marker, {
      parent: resolveAttachParent(checkpoint.marker),
      fallbackMaterial: 'cardboard',
      scaling: 0.72,
      renderingGroupId: 3,
    });
  }

  for (const pickup of world.pickups || []) {
    await attachRoleModel('pickupModel', pickup.node, {
      parent: resolveAttachParent(pickup.node),
      fallbackMaterial: 'plastic',
      scaling: 0.9,
      renderingGroupId: 3,
    });
  }

  const anchors = world.assetAnchors || {};
  for (const toy of anchors.toyBlocks || []) {
    await attachRoleModel('toyBlockModel', toy, {
      parent: resolveAttachParent(toy),
      fallbackMaterial: 'cardboard',
      scaling: 0.7,
      renderingGroupId: 2,
    });
  }

  if (anchors.hangingRing) {
    await attachRoleModel('hangingModel', anchors.hangingRing, {
      parent: resolveAttachParent(anchors.hangingRing),
      fallbackMaterial: 'plastic',
      scaling: 0.95,
      renderingGroupId: 3,
    });
  }

  if (anchors.goalBanner) {
    await attachRoleModel('bannerModel', anchors.goalBanner, {
      parent: resolveAttachParent(anchors.goalBanner),
      fallbackMaterial: 'plastic',
      scaling: 1.2,
      renderingGroupId: 3,
    });
  }

  if (anchors.cribRail) {
    await attachRoleModel('cribRailModel', resolveAttachParent(anchors.cribRail), {
      parent: resolveAttachParent(anchors.cribRail),
      fallbackMaterial: 'cardboard',
      scaling: [1.05, 0.9, 0.9],
      renderingGroupId: 4,
      alphaCutout: true,
    });
  }

  for (const plant of anchors.foregroundCutouts || []) {
    const pos = getAnchorWorldPosition(plant);
    if (!pos) continue;
    const result = await attachRoleModel('bushModel', plant, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [2.1, 1.9, 1.5],
      renderingGroupId: 4,
      alphaCutout: true,
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
      renderingGroupId: 0,
      alphaCutout: true,
    });
  }

  for (const hedge of anchors.midHedges || []) {
    const pos = getAnchorWorldPosition(hedge);
    if (!pos) continue;
    await attachRoleModel('bushModel', hedge, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [2.1, 2.0, 1.5],
      renderingGroupId: 1,
      alphaCutout: true,
    });
  }

  for (const cloud of anchors.cloudCutouts || []) {
    const pos = getAnchorWorldPosition(cloud);
    if (!pos) continue;
    await attachRoleModel('cloudModel', cloud, {
      position: pos,
      fallbackMaterial: 'paper',
      scaling: [1.9, 1.4, 1.4],
      renderingGroupId: 0,
      alphaCutout: true,
    });
  }

  for (const tree of anchors.treeDecor || []) {
    const pos = getAnchorWorldPosition(tree);
    if (!pos) continue;
    await attachRoleModel('treeModel', tree, {
      position: pos,
      fallbackMaterial: 'felt',
      scaling: [1.2, 1.2, 1.0],
      renderingGroupId: 1,
      alphaCutout: true,
    });
  }

  // Level 2 ships platforms-only for readability — skip decorative GLB props entirely.
  if (world.level2 && shouldLoadLevel2Decor) {
    const { anchors: l2anchors, fallbackVisuals: l2fallback } = world.level2;
    const l2propDefs = [
      {
        role: 'futureCribModel',
        anchor: l2anchors.babyBed,
        fallback: l2fallback?.babyBed,
        fit: { targetMaxSize: 6.2, groundOffset: 0.4 },
      },
      {
        role: 'futurePianoModel',
        anchor: l2anchors.piano,
        fallback: l2fallback?.piano,
        fit: { targetMaxSize: 7.4, groundOffset: 0.35 },
      },
      {
        role: 'futureBiancaModel',
        anchor: l2anchors.bianca,
        fallback: null,
        fit: { targetHeight: 2.2, targetMaxSize: 3.2, groundOffset: 0.0 },
      },
      {
        role: 'futureRockingHorseModel',
        anchor: l2anchors.rockingHorse,
        fallback: null,
        fit: { targetMaxSize: 4.4, groundOffset: 0.4 },
      },
    ];
    for (const { role, anchor, fallback, fit } of l2propDefs) {
      if (!anchor) continue;
      const result = await attachRoleModel(role, anchor, {
        parent: anchor,
        fallbackMaterial: 'plastic',
        renderingGroupId: 2,
      });
      if (result.loaded && fallback) {
        fallback.setEnabled(false);
      }
      if (result.loaded) {
        const anchorPos = anchor.getAbsolutePosition();
        fitLoadedModel(result.roots, {
          targetMaxSize: fit?.targetMaxSize ?? 0,
          targetHeight: fit?.targetHeight ?? 0,
          groundY: anchorPos.y + (fit?.groundOffset ?? 0),
          markDecorative: true,
        });
      }
    }
  }

  // Level 1 Petting Zoo — load animal GLBs onto pre-placed anchors
  if (levelId === 1) {
    for (const anchor of anchors.pettingZooGoat || []) {
      const result = await attachRoleModel('futureGoatPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        fitLoadedModel(result.roots, { targetHeight: 1.5, groundY: 0, markDecorative: true });
      }
    }
    for (const anchor of anchors.pettingZooChickens || []) {
      const result = await attachRoleModel('futureChickenPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        fitLoadedModel(result.roots, { targetHeight: 0.55, groundY: 0, markDecorative: true });
      }
    }
    for (const anchor of anchors.pettingZooDino || []) {
      const result = await attachRoleModel('futureDinoPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        fitLoadedModel(result.roots, { targetHeight: 1.8, groundY: 0, markDecorative: true });
      }
    }
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
  const cameraStartPos = levelId === 2
    ? new BABYLON.Vector3((spawnPoint.x || -12) - 10, (spawnPoint.y || 2) + 10, -18)
    : new BABYLON.Vector3(-17.5, 7.05, CAMERA_FOLLOW_Z);
  const cameraStartTarget = levelId === 2
    ? new BABYLON.Vector3(spawnPoint.x || -12, (spawnPoint.y || 2) + 1.0, 0)
    : new BABYLON.Vector3(-12, 2, 0);
  const camera = new BABYLON.FreeCamera('cam', cameraStartPos.clone(), scene);
  camera.setTarget(cameraStartTarget.clone());
  camera.minZ = 0.5;
  camera.maxZ = 100;
  // Do NOT attach controls — camera is game-controlled, not user-controlled

  const playerRimLight = new BABYLON.PointLight('playerRimLight', new BABYLON.Vector3(-14, 4.5, -7), scene);
  playerRimLight.intensity = shotMode ? 0.16 : 0.22;
  playerRimLight.diffuse = new BABYLON.Color3(0.92, 0.94, 1.0);
  playerRimLight.specular = new BABYLON.Color3(0.24, 0.26, 0.32);
  playerRimLight.range = 11;
  const cameraIgnoredMeshes = new Set([player.blobShadow]);
  const useLevel2CameraOcclusionGuard = levelId === 2;
  const useGenericCameraOcclusionGuard = levelId === 3;
  let level2ProbeTimer = 0;
  let level2LoggedOccluderId = null;

  // Dev-only debug HUD + rest stability test
  const debugHud = import.meta.env.DEV ? createDebugHud() : null;
  if (import.meta.env.DEV) installRestStabilityTest(player);
  if (debugMode) {
    window.__DADA_DEBUG__.sceneRef = scene;
    window.__DADA_DEBUG__.playerRef = player.mesh;
    window.__DADA_DEBUG__.cameraRef = camera;
  }

  // Game state machine
  const goalX = world.goalRoot.position.x;

  let state = 'title'; // title | gameplay | loading | end
  let _lastKey = '—';

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
  let puddleInvulnMs = 0;
  let coinsCollected = 0;
  let debugIdleTimerMs = 0; // suppress input for N ms in debug mode after spawn
  let goalWaveTimer = 0;   // ambient DaDa idle wave
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
  if (debugMode) {
    const LANE_Z = 0;
    const collectibleIdSet = new Set(coins.map((_, i) => `coin_${i}`));
    const collectibleNamePattern = /(coin|gold|token|collectible|pacifier)/i;

    window.__DADA_DEBUG__.collectibleAudit = () => {
      const suspectMeshes = scene.meshes.filter((mesh) => {
        if (!(mesh instanceof BABYLON.Mesh)) return false;
        if (!mesh.isEnabled()) return false;
        if (mesh.isVisible === false) return false;
        if ((mesh.visibility ?? 1) <= 0.02) return false;
        return collectibleNamePattern.test(mesh.name || '');
      });
      const missingTrigger = suspectMeshes
        .filter((mesh) => {
          const collectibleId = mesh.metadata?.collectibleId;
          return !collectibleId || !collectibleIdSet.has(collectibleId);
        })
        .map((mesh) => {
          const p = mesh.getAbsolutePosition();
          return {
            name: mesh.name,
            collectibleId: mesh.metadata?.collectibleId || null,
            position: [p.x, p.y, p.z],
          };
        });

      return {
        expectedCollectibles: collectibleIdSet.size,
        visibleCollectibleLikeMeshes: suspectMeshes.length,
        missingTrigger,
      };
    };
    window.__DADA_DEBUG__.dumpCollectibleAudit = () => {
      const audit = window.__DADA_DEBUG__.collectibleAudit();
      console.log(
        `[collectible-audit] visible=${audit.visibleCollectibleLikeMeshes} missingTrigger=${audit.missingTrigger.length}`,
      );
      if (audit.missingTrigger.length) {
        audit.missingTrigger.forEach((item) => {
          console.warn(
            `[collectible-audit] MISSING_TRIGGER ${item.name} id=${item.collectibleId} pos=(${item.position.map(v => v.toFixed(2)).join(',')})`,
          );
        });
      } else {
        console.log('[collectible-audit] all visible collectible-like meshes have trigger ids ✓');
      }
      return audit;
    };

    window.__DADA_DEBUG__.laneAudit = () => {
      const playerZ = player.mesh.position.z;
      const items = [
        ...coins.map((c, i) => ({ type: 'coin', id: `coin_${i}`, x: c.position.x, y: c.position.y, z: c.position.z })),
        ...pickups.map((p, i) => ({ type: 'pickup', id: `pickup_${i}`, x: p.position.x, y: p.position.y, z: p.position.z })),
        ...hazards.map((h, i) => ({ type: 'hazard', id: `hazard_${i}`, x: (h.minX + h.maxX) / 2, y: (h.minY + h.maxY) / 2, z: h.mesh?.position.z ?? 0 })),
        ...crumbles.map((cr, i) => ({ type: 'crumble', id: `crumble_${i}`, x: cr.x, y: cr.y, z: cr.z ?? 0 })),
        ...checkpoints.filter(cp => cp.index > 0).map((cp, i) => ({ type: 'checkpoint', id: `checkpoint_${i}`, x: cp.spawn.x, y: cp.spawn.y, z: cp.spawn.z ?? 0 })),
      ];
      const outOfLane = items.filter(item => Math.abs((item.z ?? 0) - LANE_Z) > 0.01);
      return { laneZ: LANE_Z, playerZ, interactables: items, outOfLane };
    };
    window.__DADA_DEBUG__.dumpLaneAudit = () => {
      const a = window.__DADA_DEBUG__.laneAudit();
      console.log(`[lane-audit] playerZ=${a.playerZ.toFixed(3)} | outOfLane=${a.outOfLane.length}`);
      if (a.outOfLane.length) {
        a.outOfLane.forEach(item => console.warn(`[lane-audit] OUT-OF-LANE: ${item.type}(${item.id}) z=${item.z}`));
      } else {
        console.log('[lane-audit] All interactables on LANE_Z=0 ✓');
      }
      a.interactables.forEach(item => console.log(`[lane-audit]   ${item.type}[${item.id}] (${item.x.toFixed(2)},${item.y.toFixed(2)},${item.z?.toFixed(3) ?? 0})`));
    };
  }

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

  function updatePlayerReadabilityLight() {
    playerRimLight.position.set(
      player.mesh.position.x - 1.45,
      player.mesh.position.y + 1.12,
      -7.1,
    );
  }

  function updateLevel2CameraProbe(dt, occlusionHit) {
    if (!import.meta.env.DEV || levelId !== 2) return;
    level2ProbeTimer += dt;
    if (level2ProbeTimer < 1) return;
    level2ProbeTimer = 0;

    if (!occlusionHit?.mesh) {
      return;
    }
    const mesh = occlusionHit.mesh;
    if (mesh.uniqueId === level2LoggedOccluderId) return;
    level2LoggedOccluderId = mesh.uniqueId;
    const bounds = mesh.getBoundingInfo()?.boundingBox;
    const pos = mesh.getAbsolutePosition();
    console.log('[L2 camera probe] occluder', {
      name: mesh.name,
      id: mesh.id,
      position: [pos.x, pos.y, pos.z],
      min: bounds ? [bounds.minimumWorld.x, bounds.minimumWorld.y, bounds.minimumWorld.z] : null,
      max: bounds ? [bounds.maximumWorld.x, bounds.maximumWorld.y, bounds.maximumWorld.z] : null,
      extendSizeWorld: bounds ? [bounds.extendSizeWorld.x, bounds.extendSizeWorld.y, bounds.extendSizeWorld.z] : null,
      parentChain: describeNodeChain(mesh),
    });
  }

  function finishRun() {
    state = 'end';
    player.setWinAnimationActive(false);
    audio.stopMusic(0.5);
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
    audio.stopMusic(0.2);

    state = 'title';
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: 'title', lastKey: _lastKey });
    goalReached = false;
    goalTimer = 0;
    respawnState = null;
    activeCheckpointIndex = 0;
    respawnPoint = { ...spawnPoint };
    onesieBuffTimerMs = 0;
    onesieMaxDurationMs = 10000;
    onesieJumpBoost = 1;
    puddleInvulnMs = 0;
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
    if (world.level2) world.level2.reset();
    if (world.level3) world.level3.reset();

    for (const pickup of pickups) {
      pickup.collected = false;
      if (pickup.node) pickup.node.setEnabled(true);
    }

    player.spawnAt(spawnPoint.x, spawnPoint.y, spawnPoint.z || 0);
    player.vx = 0;
    player.vy = 0;
    player.invulnTimerMs = 0;
    player.setWinAnimationActive(false);
    player.setMovementModifiers();
    player.visual.scaling.set(1, 1, 1);
    player.visual.rotation.set(0, 0, 0);
    updatePlayerShadow(player);
    updatePlayerReadabilityLight();

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

  // ── Title-start logic ──────────────────────────────────────────────────────
  //
  // requestStart is called DIRECTLY from the keydown handler — no render-loop
  // consumption, no titleStartPending flag.  The state transition is immediate.
  //
  function requestStart(targetLevelId) {
    if (state !== 'title') return; // already loading or playing
    if (targetLevelId !== levelId) {
      // User selected a different level than the one currently loaded; navigate.
      state = 'loading'; // prevent re-entry while setTimeout is pending
      ui.showLoading(targetLevelId);
      ui.updateTitleDebug({ selectedLevel: targetLevelId, currentLevel: levelId, titleState: 'loading', lastKey: _lastKey });
      const url = targetLevelId === 1
        ? window.location.pathname
        : `${window.location.pathname}?level=${targetLevelId}`;
      setTimeout(() => { window.location.href = url; }, 80);
      return;
    }
    // Same level — transition immediately (world is already built).
    audio.unlock();
    state = 'gameplay';
    input.consumeAll();
    player.setWinAnimationActive(false);
    audio.startMusic(0.5, levelId === 1 ? 'banjo' : 'piano');
    window.__DADA_DEBUG__.sceneKey = 'CribScene';
    ui.hideTitle();
    ui.showGameplayHud(coins.length);
    ui.updateTitleDebug({ selectedLevel: targetLevelId, currentLevel: levelId, titleState: 'playing', lastKey: _lastKey });
    if (debugMode) {
      debugIdleTimerMs = 1000;
      player.beginSpawnProbe('initial');
    }
  }

  // Single unconditional keydown handler on window — fires regardless of which
  // DOM element has focus.  Updates the debug line on every key, calls
  // requestStart for Space/Enter.
  window.addEventListener('keydown', (ev) => {
    _lastKey = `${ev.key}/${ev.code}`;
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: state, lastKey: _lastKey });
    if (
      ev.code === 'Space' ||
      ev.key === 'Enter' ||
      ev.code === 'Enter' ||
      ev.code === 'NumpadEnter'
    ) {
      ev.preventDefault();
      requestStart(selectedLevelId);
    }
  }, { passive: false });

  // Seed the debug line with initial state so it's visible before any keypress.
  ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: state, lastKey: _lastKey });

  function startGoalCelebration(goalPos) {
    ui.hideObjective();
    if (!debugFlags.juice) {
      finishRun();
      return;
    }
    audio.playWin();
    player.setWinAnimationActive(true);
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

  // Minimal run indicator — confirms Shift input is live every frame.
  let _runIndicatorEl = null;
  function getRunIndicator() {
    if (!import.meta.env.DEV) return null;
    if (!_runIndicatorEl) {
      _runIndicatorEl = document.createElement('div');
      _runIndicatorEl.style.cssText = [
        'position:fixed', 'top:14px', 'right:16px',
        'background:#d95c2a', 'color:#fff',
        'font:bold 15px monospace', 'padding:4px 11px',
        'border-radius:6px', 'opacity:0',
        'transition:opacity 0.07s', 'z-index:1001',
        'pointer-events:none', 'letter-spacing:0.06em',
      ].join(';');
      _runIndicatorEl.textContent = '\u25b6\u25b6 RUN';
      document.body.appendChild(_runIndicatorEl);
    }
    return _runIndicatorEl;
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
          ui.showPopText('All pacifiers! 🍼', 900);
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
        ui.showOnesieBoostCard();
        ui.showStatus('Onesie boost!', 1400);
      }
    }

    // Puddle hazard: touching it resets player to spawn start.
    if (puddleInvulnMs > 0) {
      puddleInvulnMs = Math.max(0, puddleInvulnMs - dt * 1000);
    }
    for (const hazard of hazards) {
      const inside = pos.x >= hazard.minX
        && pos.x <= hazard.maxX
        && pos.y >= hazard.minY
        && pos.y <= hazard.maxY;

      if (hazard.handledByLevelRuntime) continue;

      if (inside && hazard.type === 'slip' && puddleInvulnMs <= 0 && !respawnState) {
        activeCheckpointIndex = 0;
        respawnPoint = { ...spawnPoint };
        respawnState = { phase: 'fadeOut', timer: 0.16, reason: 'puddle' };
        window.__DADA_DEBUG__.lastRespawnReason = 'puddle';
        audio.playSplash();
        juiceFx.spawnSlipRipple(pos);
        ui.showStatus('SPLASH!', 650);
        puddleInvulnMs = 4000;
      }
    }

    let speedMultiplier = 1;
    let accelBonusMultiplier = 1;
    const sprinting = input.isSprintHeld();
    if (sprinting) {
      speedMultiplier = 1.75;      // run = walk * 1.75 — clearly noticeable
      accelBonusMultiplier = 1.40; // faster ramp-up while sprinting
    }
    const runIndicator = getRunIndicator();
    if (runIndicator) {
      runIndicator.style.opacity = sprinting ? '1' : '0';
    }

    player.setMovementModifiers({
      jumpVelocityMultiplier: onesieJumpBoost,
      maxAirJumps: onesieBuffTimerMs > 0 ? 1 : 0,
      speedMultiplier,
      accelBonusMultiplier,
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
    if (shotToast === 'onesie') {
      ui.showOnesieBoostToast();
    } else if (shotToast === 'splash') {
      ui.showStatus('SPLASH!', 2000);
    }
    player.vx = 0;
    player.vy = 0;
    updatePlayerShadow(player);
    updatePlayerReadabilityLight();
    updateActorDebug();
  }

  // Main loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (shotMode) {
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();
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

    if (state === 'title' || state === 'loading') {
      // requestStart() handles transitions directly from keydown.
      // Nothing to do here; render the scene so the title card remains visible.
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
        if (world.level2) {
          world.level2.update(dt, { pos: player.mesh.position, triggerReset, player });
        }
        if (world.level3) {
          world.level3.update(dt, { pos: player.mesh.position, triggerReset, player });
        }
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
          } else if (ev.type === 'doubleJump') {
            audio.playJump();
            juiceFx.spawnJumpDust(player.mesh.position);
          } else if (ev.type === 'land') {
            audio.playLand();
            juiceFx.spawnLandDust(player.mesh.position);
            if (!shotMode) camera.position.y -= 0.18; // camera punch
          } else if (ev.type === 'outOfBounds') {
            const reason = 'fell_off_level';
            triggerReset(reason, player.mesh.position.x < respawnPoint.x ? 1 : -1);
          }
        }

        // HUD updates each frame
        ui.updateObjectiveDir(player.mesh.position.x, goalX);
        ui.updateBuff(onesieBuffTimerMs, onesieMaxDurationMs);
        ui.updateDoubleJumpCue(player.hasAirJumpAvailable() && onesieBuffTimerMs > 0);
      }

      // Update blob shadow position (follows player X, stays near ground)
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();

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

      // Camera follow.
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      if (levelId === 2) {
        const desiredCameraPos = new BABYLON.Vector3(px - 10, py + 10, -18);
        camera.position.x = damp(camera.position.x, desiredCameraPos.x, 4.5, dt);
        camera.position.y = damp(camera.position.y, desiredCameraPos.y, 4.5, dt);
        camera.position.z = damp(camera.position.z, desiredCameraPos.z, 4.5, dt);
        camera.setTarget(new BABYLON.Vector3(
          damp(camera.getTarget().x, px, 4.5, dt),
          damp(camera.getTarget().y, py + 1.0, 4.5, dt),
          0,
        ));
      } else {
        const targetX = clamp(px + 2, camTargetMinX, camTargetMaxX);
        const desiredCameraPos = new BABYLON.Vector3(targetX - 8, py + 4, CAMERA_FOLLOW_Z);
        const headPos = new BABYLON.Vector3(px, py + 1.2, 0);
        const occlusion = useLevel2CameraOcclusionGuard
          ? resolveLevel2CameraOcclusion(scene, headPos, desiredCameraPos, cameraIgnoredMeshes)
          : useGenericCameraOcclusionGuard
            ? resolveCameraOcclusion(scene, headPos, desiredCameraPos, cameraIgnoredMeshes)
            : { correctedPos: desiredCameraPos, hit: null };
        updateLevel2CameraProbe(dt, occlusion.hit);
        const cameraDamp = occlusion.hit ? 11 : 4;
        camera.position.x = damp(camera.position.x, occlusion.correctedPos.x, cameraDamp, dt);
        camera.position.y = damp(camera.position.y, occlusion.correctedPos.y, cameraDamp, dt);
        camera.position.z = damp(camera.position.z, occlusion.correctedPos.z, cameraDamp, dt);
        camera.setTarget(new BABYLON.Vector3(
          damp(camera.getTarget().x, targetX, 4, dt),
          damp(camera.getTarget().y, py + 1.2, 4, dt),
          0,
        ));
      }
    } else if (state === 'goal') {
      goalTimer = Math.max(0, goalTimer - dt);
      const t = 1 - (goalTimer / GOAL_CELEBRATION_SEC);
      const ease = easeOutCubic(t);
      camera.position = BABYLON.Vector3.Lerp(goalCamStartPos, goalCamEndPos, ease);
      camera.setTarget(BABYLON.Vector3.Lerp(goalCamStartTarget, goalCamEndTarget, ease));
      player.updateVisualOnly(dt);
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
