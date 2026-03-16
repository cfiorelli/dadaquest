import * as BABYLON from '@babylonjs/core';
import { buildWorld, createCoin } from './world/buildWorld.js';
import { buildWorld2 } from './world/buildWorld2.js';
import { buildWorld3 } from './world/buildWorld3.js';
import { buildWorld4 } from './world/buildWorld4.js';
import { buildWorld5 } from './world/buildWorld5.js';
import { buildUnderConstructionWorld } from './world/buildUnderConstructionWorld.js';
import { AnimalWanderController } from './world/animalWander.js';
import { PlayerController } from './player/PlayerController.js';
import { InputManager } from './util/input.js';
import { createUI } from './ui/ui.js';
import { FruitMazeMinigame } from './ui/fruitMaze.js';
import { PongMinigame } from './ui/pongMinigame.js';
import { BalloonRoundup } from './ui/balloonRoundup.js';
import { damp, clamp } from './util/math.js';
import { createDebugHud } from './ui/debugHud.js';
import { installRestStabilityTest } from './util/restStabilityTest.js';
import { JuiceFx } from './util/juiceFx.js';
import {
  applyHdriEnvironment,
  getAvailableModels,
  loadOptionalModel,
  loadModelForRole,
} from './util/assets.js';
import { GameAudio } from './util/audio.js';
import { isDebugMode, isShotMode } from '../utils/modes.js';
import { LEVEL1 } from './world/level1.js';
import { LEVEL2 } from './world/level2.js';
import { LEVEL3 } from './world/level3.js';
import { LEVEL4 } from './world/level4.js';
import { LEVEL5 } from './world/level5.js';
import {
  getLevelConstructionMessage,
  isLevelLaunchable,
} from './world/levelMeta.js';
import {
  addItemToEra5State,
  deriveEra5Stats,
  getItemDef,
  getItemSlots,
} from '../game/items/items.js';
import {
  clearProgress,
  ensureProgressTotals,
  getLevelProgress,
  isLevelUnlocked,
  loadProgress,
  markLevelCompleted,
  markUnlockShown,
  recordCollectedBinky,
  saveProgress,
} from './util/progression.js';

const SHOT_FRAMES_TARGET = 10;
const DEFAULT_FLAGS = {
  juice: true,
  audio: true,
  occlusionFade: true,
};
const GOAL_CELEBRATION_SEC = 0.96;
const PLAYER_MODEL_SLOT_Y = -0.44;
const GOAL_MODEL_SLOT_Y = -0.56;
const CAMERA_FOLLOW_Z = -13.2;
const ERA5_DEFAULT_PLAYER_YAW = Math.PI * 0.5;
const ERA5_CAMERA_DISTANCE = 16.6;
const ERA5_CAMERA_HEIGHT = 5.6;
const ERA5_CAMERA_FOCUS_HEIGHT = 1.30;
const ERA5_CAMERA_LOOK_AHEAD = 6.4;
const ERA5_CAMERA_FOV = 0.98;
const ERA5_CAMERA_PRESETS = {
  standard: {
    id: 'standard',
    label: 'Standard',
    distance: ERA5_CAMERA_DISTANCE,
    height: ERA5_CAMERA_HEIGHT,
    focusHeight: ERA5_CAMERA_FOCUS_HEIGHT,
    lookAhead: ERA5_CAMERA_LOOK_AHEAD,
    fov: ERA5_CAMERA_FOV,
  },
  closer: {
    id: 'closer',
    label: 'Closer Over-Shoulder',
    distance: 13.9,
    height: 4.9,
    focusHeight: 1.18,
    lookAhead: 5.1,
    fov: 1.02,
  },
};
const ERA5_DEFAULT_CAMERA_PRESET = 'standard';
const ERA5_CAMERA_YAW_SPEED = 1.55;
const ERA5_CAMERA_YAW_SPRING = 8.8;
const ERA5_CAMERA_YAW_DAMP = 6.4;
const ERA5_CAMERA_YAW_MAX_SPEED = 2.75;
const ERA5_CAMERA_IDLE_RECENTER_SPEED = 1.2;
const ERA5_CAMERA_IDLE_RECENTER_DELAY_MS = 500;
const ERA5_TURN_MAX_SPEED = 2.55;
const ERA5_JUMP_MULTIPLIER = 1.12;
const ERA5_GRAVITY_SCALE = 0.92;
const ERA5_AIR_ACCEL_MULTIPLIER = 0.86;
const ERA5_COYOTE_MS = 120;
const ERA5_JUMP_BUFFER_MS = 120;
const LOADING_INTENT_KEY = 'dadaquest:loading-intent';
const CAPE_FLOAT_DURATION_MS = 4000;
const WIND_GLIDE_DURATION_MS = 3000;
const FLOOR_PENALTY_PICKUP_COOLDOWN_MS = 1200;
const BUBBLE_SHIELD_GRACE_MS = 900;
function easeOutCubic(t) {
  const v = Math.max(0, Math.min(1, t));
  return 1 - ((1 - v) ** 3);
}

function quadraticBezier(start, mid, end, t) {
  const omt = 1 - t;
  return start.scale(omt * omt)
    .add(mid.scale(2 * omt * t))
    .add(end.scale(t * t));
}

function wrapToPi(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

function getYawForwardXZ(yaw) {
  return new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
}

function getYawRightXZ(yaw) {
  return new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
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

function readEra5VisionQuery() {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      disableFog: false,
      disablePostFx: false,
      showBounds: false,
      hideLargePlanes: false,
      forceEnvironmentVisible: false,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('era5vision') === '1';
  return {
    enabled,
    disableFog: enabled && params.get('era5nofog') === '1',
    disablePostFx: enabled && params.get('era5nopostfx') === '1',
    showBounds: enabled && params.get('era5bounds') === '1',
    hideLargePlanes: enabled && params.get('era5hideplanes') === '1',
    forceEnvironmentVisible: enabled && params.get('era5forceenv') === '1',
  };
}

function roundNumber(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function vectorToArray(vec, digits = 3) {
  if (!(vec instanceof BABYLON.Vector3)) return null;
  return [roundNumber(vec.x, digits), roundNumber(vec.y, digits), roundNumber(vec.z, digits)];
}

function color3ToArray(color, digits = 3) {
  if (!(color instanceof BABYLON.Color3)) return null;
  return [roundNumber(color.r, digits), roundNumber(color.g, digits), roundNumber(color.b, digits)];
}

function color4ToArray(color, digits = 3) {
  if (!(color instanceof BABYLON.Color4)) return null;
  return [
    roundNumber(color.r, digits),
    roundNumber(color.g, digits),
    roundNumber(color.b, digits),
    roundNumber(color.a, digits),
  ];
}

function createEra5DevOverlay() {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById('era5DevOverlay');
  if (existing) return existing;
  const el = document.createElement('pre');
  el.id = 'era5DevOverlay';
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '9999',
    margin: '0',
    padding: '10px 12px',
    minWidth: '260px',
    maxWidth: '340px',
    borderRadius: '10px',
    background: 'rgba(5, 12, 18, 0.82)',
    color: '#d9f9ff',
    font: '12px/1.45 Menlo, Consolas, monospace',
    pointerEvents: 'none',
    whiteSpace: 'pre-wrap',
    boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
    border: '1px solid rgba(110, 240, 255, 0.22)',
  });
  document.body.appendChild(el);
  return el;
}

function shouldUseExternalPlayerModel() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('playerModel') === '1') return true;
  return window.__DADA_DEBUG__?.flags?.useExternalPlayerModel === true;
}

function readLoadingIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LOADING_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Number.isFinite(parsed.levelId) || !Number.isFinite(parsed.startedAt)) return null;
    if ((Date.now() - parsed.startedAt) > 15000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLoadingIntent(levelId) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LOADING_INTENT_KEY, JSON.stringify({
      levelId,
      startedAt: Date.now(),
    }));
  } catch {}
}

function clearLoadingIntent() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(LOADING_INTENT_KEY);
  } catch {}
}

function buildLevelUrl(targetLevelId, { autoStart = false } = {}) {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams();
  if (targetLevelId !== 1) params.set('level', String(targetLevelId));
  if (autoStart) params.set('start', '1');
  const query = params.toString();
  return query ? `${window.location.pathname}?${query}` : window.location.pathname;
}

function hasAutoStartQuery() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('start') === '1';
}

function stripAutoStartQuery() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('start')) return;
  params.delete('start');
  const query = params.toString();
  history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
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

function ensureVisibleMeshes(meshes) {
  for (const mesh of meshes || []) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.setEnabled(true);
    mesh.isVisible = true;
    mesh.visibility = 1;
    if (mesh.material && Object.prototype.hasOwnProperty.call(mesh.material, 'alpha')) {
      mesh.material.alpha = 1;
    }
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

function buildSurfaceBoundsFromVisual(name, node, fallback = null) {
  const meshes = collectRenderableMeshes(node);
  if (meshes.length) {
    const bounds = combineBounds(meshes);
    return {
      name,
      topY: bounds.max.y,
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
      baseY: bounds.max.y + 0.02,
    };
  }
  if (fallback) {
    return {
      name,
      topY: fallback.topY,
      minX: fallback.minX,
      maxX: fallback.maxX,
      minZ: fallback.minZ,
      maxZ: fallback.maxZ,
      baseY: fallback.topY + 0.02,
    };
  }
  return null;
}

function reportDevError(errorLike) {
  if (!import.meta.env.DEV) return;
  window.__DADA_DEV_ERROR__?.(errorLike);
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
        decor: markDecorative ? true : mesh.metadata?.decor,
        cameraIgnore: markDecorative ? true : mesh.metadata?.cameraIgnore,
        cameraBlocker: markDecorative ? false : mesh.metadata?.cameraBlocker,
        level2Decor: markDecorative ? true : mesh.metadata?.level2Decor,
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

function ensureDecorGrounding(rootOrRoots, groundY, label, debugMode) {
  const meshes = collectRenderableMeshes(rootOrRoots);
  if (!meshes.length || !Number.isFinite(groundY)) return;
  for (const mesh of meshes) mesh.computeWorldMatrix(true);
  const bounds = combineBounds(meshes);
  if (bounds.min.y >= groundY - 0.05) return;
  const lift = groundY - bounds.min.y;
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots : [rootOrRoots];
  for (const root of roots.filter(Boolean)) {
    root.position.y += lift;
  }
  if (debugMode) {
    console.warn(`[decor] lifted ${label} by ${lift.toFixed(3)} to clear surface clipping`);
  }
}

function clampDecorMaxExtent(rootOrRoots, maxAllowedExtent) {
  if (!Number.isFinite(maxAllowedExtent) || maxAllowedExtent <= 0) return null;
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots.filter(Boolean) : [rootOrRoots].filter(Boolean);
  const meshes = collectRenderableMeshes(roots);
  if (!meshes.length) return null;
  for (const mesh of meshes) mesh.computeWorldMatrix(true);
  let bounds = combineBounds(meshes);
  if (bounds.maxDim <= maxAllowedExtent) {
    return { maxDim: bounds.maxDim, scaled: false };
  }
  const scaleFactor = maxAllowedExtent / bounds.maxDim;
  for (const root of roots) {
    root.scaling.scaleInPlace(scaleFactor);
  }
  for (const mesh of meshes) mesh.computeWorldMatrix(true);
  bounds = combineBounds(meshes);
  return { maxDim: bounds.maxDim, scaled: true, scaleFactor };
}

function recenterLoadedModelXZ(rootOrRoots, targetX, targetZ) {
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots.filter(Boolean) : [rootOrRoots].filter(Boolean);
  const meshes = collectRenderableMeshes(roots);
  if (!meshes.length || !Number.isFinite(targetX) || !Number.isFinite(targetZ)) return null;
  for (const root of roots) {
    root.computeWorldMatrix?.(true);
  }
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
  }
  let bounds = combineBounds(meshes);
  const dx = targetX - bounds.center.x;
  const dz = targetZ - bounds.center.z;
  if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) {
    return { dx: 0, dz: 0, bounds };
  }
  for (const root of roots) {
    root.position.x += dx;
    root.position.z += dz;
  }
  for (const root of roots) {
    root.computeWorldMatrix?.(true);
  }
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
  }
  bounds = combineBounds(meshes);
  return { dx, dz, bounds };
}

function setNodesEnabled(rootOrRoots, enabled) {
  const roots = Array.isArray(rootOrRoots) ? rootOrRoots.filter(Boolean) : [rootOrRoots].filter(Boolean);
  for (const root of roots) {
    root.setEnabled?.(enabled);
  }
}

function setMeshesEnabled(meshes, enabled) {
  if (!Array.isArray(meshes)) return;
  for (const mesh of meshes) {
    mesh?.setEnabled?.(enabled);
    if (mesh) {
      mesh.isVisible = enabled;
      mesh.visibility = enabled ? 1 : 0;
    }
  }
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
    if (mesh.metadata?.level2Cull === true) {
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
    if (maxExtent > 30 || volume > 9000) {
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

function isPointInsideBoundingBox(bounds, point, epsilon = 0.0001) {
  if (!bounds || !point) return false;
  return point.x >= (bounds.minimumWorld.x - epsilon)
    && point.x <= (bounds.maximumWorld.x + epsilon)
    && point.y >= (bounds.minimumWorld.y - epsilon)
    && point.y <= (bounds.maximumWorld.y + epsilon)
    && point.z >= (bounds.minimumWorld.z - epsilon)
    && point.z <= (bounds.maximumWorld.z + epsilon);
}

function getRayBoundingBoxEntryDistance(bounds, origin, direction, maxDistance) {
  if (!bounds || !origin || !direction || !Number.isFinite(maxDistance) || maxDistance <= 0.0001) return null;
  let entry = 0;
  let exit = maxDistance;
  for (const axis of ['x', 'y', 'z']) {
    const dir = direction[axis];
    const min = bounds.minimumWorld[axis];
    const max = bounds.maximumWorld[axis];
    const start = origin[axis];
    if (Math.abs(dir) <= 0.000001) {
      if (start < min || start > max) return null;
      continue;
    }
    let t0 = (min - start) / dir;
    let t1 = (max - start) / dir;
    if (t0 > t1) [t0, t1] = [t1, t0];
    entry = Math.max(entry, t0);
    exit = Math.min(exit, t1);
    if (entry > exit) return null;
  }
  if (exit <= 0.0001) return null;
  return Math.max(0, entry);
}

function resolveCameraOcclusion(scene, focusPos, desiredPos, ignoredMeshes) {
  const toCamera = desiredPos.subtract(focusPos);
  const desiredDistance = toCamera.length();
  if (desiredDistance <= 0.001) {
    return {
      correctedPos: desiredPos,
      hit: null,
      info: {
        desiredDistance: 0,
        pickDistance: null,
        entryDistance: null,
        safeDistance: 0,
        correctedInsidePickedBounds: false,
        usedEntryClamp: false,
      },
    };
  }

  const rayDir = toCamera.scale(1 / desiredDistance);
  const ray = new BABYLON.Ray(focusPos, rayDir, desiredDistance);
  const pick = scene.pickWithRay(
    ray,
    (mesh) => isRenderableCameraObstacle(mesh, ignoredMeshes),
    true,
  );

  if (!pick?.hit || !pick.pickedPoint) {
    return {
      correctedPos: desiredPos,
      hit: null,
      info: {
        desiredDistance,
        pickDistance: null,
        entryDistance: null,
        safeDistance: desiredDistance,
        correctedInsidePickedBounds: false,
        usedEntryClamp: false,
      },
    };
  }

  const pickedMesh = pick.pickedMesh || pick.mesh || null;
  const pickedBounds = pickedMesh?.getBoundingInfo?.()?.boundingBox ?? null;
  let safeDistance = Math.max(0.85, Math.min(desiredDistance, pick.distance - 0.3));
  let correctedPos = focusPos.add(rayDir.scale(safeDistance));
  const correctedInsidePickedBounds = isPointInsideBoundingBox(pickedBounds, correctedPos);
  let entryDistance = null;
  let usedEntryClamp = false;
  if (correctedInsidePickedBounds) {
    entryDistance = getRayBoundingBoxEntryDistance(pickedBounds, focusPos, rayDir, desiredDistance);
    if (Number.isFinite(entryDistance)) {
      safeDistance = Math.min(safeDistance, Math.max(0.05, entryDistance - 0.3));
      correctedPos = focusPos.add(rayDir.scale(safeDistance));
      usedEntryClamp = true;
    }
  }
  return {
    correctedPos,
    hit: pick,
    info: {
      desiredDistance,
      pickDistance: Number.isFinite(pick.distance) ? pick.distance : null,
      entryDistance,
      safeDistance,
      correctedInsidePickedBounds,
      usedEntryClamp,
    },
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

function isLevel2GameplayMesh(mesh) {
  if (!(mesh instanceof BABYLON.Mesh)) return false;
  if (mesh.metadata?.level2Gameplay === true) return true;
  return (mesh.name || '').startsWith('L2_');
}

function collectLevel2OccludingMeshes(scene, headPos, cameraPos, ignoredMeshes) {
  const toCamera = cameraPos.subtract(headPos);
  const rayLen = toCamera.length();
  if (rayLen <= 0.001) return [];

  const rayDir = toCamera.scale(1 / rayLen);
  const ray = new BABYLON.Ray(headPos, rayDir, rayLen);
  const hits = [];

  for (const mesh of scene.meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    if (!mesh.isEnabled()) continue;
    if (mesh.isVisible === false) continue;
    if ((mesh.visibility ?? 1) <= 0.02) continue;
    if (ignoredMeshes.has(mesh)) continue;
    if (mesh.metadata?.role === 'player' || mesh.metadata?.role === 'goal') continue;
    if (mesh.name === 'goalTrigger') continue;
    if (mesh.getTotalVertices?.() <= 0) continue;

    mesh.computeWorldMatrix(true);
    const hit = ray.intersectsMesh(mesh, true);
    if (!hit?.hit || !Number.isFinite(hit.distance)) continue;
    if (hit.distance <= 0.0001 || hit.distance >= rayLen) continue;

    hits.push({
      mesh,
      distance: hit.distance,
      pickedPoint: hit.pickedPoint || null,
    });
  }

  hits.sort((a, b) => a.distance - b.distance);
  return hits.slice(0, 8);
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
  const fruitMaze = levelId === 1 ? new FruitMazeMinigame() : null;
  const pongMinigame = levelId === 2 ? new PongMinigame() : null;
  const balloonRoundup = levelId === 3 ? new BalloonRoundup() : null;
  const getLevelCollectibleTotal = (level) => {
    const configuredTotal = Number(level?.totalCollectibles);
    return Number.isFinite(configuredTotal) ? configuredTotal : (level?.coins?.length ?? 0);
  };
  const levelTotals = {
    1: getLevelCollectibleTotal(LEVEL1),
    2: getLevelCollectibleTotal(LEVEL2),
    3: getLevelCollectibleTotal(LEVEL3),
    4: getLevelCollectibleTotal(LEVEL4),
    5: getLevelCollectibleTotal(LEVEL5),
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };
  const isEra5Level = levelId >= 5;
  const isLaunchableLevel = isLevelLaunchable(levelId);
  const getLockedMessage = (targetLevelId, state = progression) => {
    if (targetLevelId === 4) {
      return 'Locked. Collect all binkies in Levels 1–3 to unlock Super Sourdough.';
    }
    if (targetLevelId === 5) {
      return 'Locked. Beat Super Sourdough (Level 4) to unlock.';
    }
    if (targetLevelId === 6) {
      return 'Locked. Beat Aquarium Drift (Level 5) to unlock.';
    }
    if (targetLevelId === 7) {
      return 'Locked. Beat Pressure Works (Level 6) to unlock.';
    }
    if (targetLevelId === 8) {
      return 'Locked. Beat Storm Cliffs (Level 7) to unlock.';
    }
    if (targetLevelId === 9) {
      return 'Locked. Beat Haunted Library (Level 8) to unlock.';
    }
    return `Level ${targetLevelId} is locked.`;
  };
  const getConstructionMessage = (targetLevelId) => getLevelConstructionMessage(targetLevelId);
  let progression = ensureProgressTotals(loadProgress(levelTotals), levelTotals);
  const syncProgressState = (nextProgress) => {
    progression = ensureProgressTotals(nextProgress, levelTotals);
    ui.setLockedLevels({
      4: !isLevelUnlocked(progression, 4),
      5: !isLevelUnlocked(progression, 5),
      6: false,
      7: false,
      8: false,
      9: false,
    }, {
      4: getLockedMessage(4, progression),
      5: getLockedMessage(5, progression),
    });
    ui.setUnderConstructionLevels({
      5: true,
      6: true,
      7: true,
      8: true,
      9: true,
    }, {
      5: getConstructionMessage(5),
      6: getConstructionMessage(6),
      7: getConstructionMessage(7),
      8: getConstructionMessage(8),
      9: getConstructionMessage(9),
    }, {
      5: false,
      6: true,
      7: true,
      8: true,
      9: true,
    });
    window.__DADA_DEBUG__.progressState = progression;
  };
  syncProgressState(progression);
  const formatSlotLabel = (slotId) => slotId
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());
  const cloneEra5State = (source = progression.era5) => ({
    unlocked: !!source?.unlocked,
    currency: Number.isFinite(source?.currency) ? source.currency : 0,
    inventory: Array.isArray(source?.inventory) ? source.inventory.map((item) => ({ ...item })) : [],
    equipped: { ...(source?.equipped || {}) },
    stats: { ...(source?.stats || {}) },
  });
  let era5State = cloneEra5State(progression.era5);
  const buildEra5InventoryUiState = () => {
    const slots = getItemSlots().map((slotId) => {
      const instanceId = era5State.equipped?.[slotId] || null;
      const instance = era5State.inventory.find((item) => item.instanceId === instanceId);
      const def = getItemDef(instance?.defId);
      return {
        slotId,
        label: formatSlotLabel(slotId),
        instanceId,
        itemName: def?.name || '',
      };
    });
    const items = era5State.inventory.map((instance) => {
      const def = getItemDef(instance.defId);
      const statsText = Object.entries(def?.stats || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ');
      return {
        instanceId: instance.instanceId,
        name: def?.name || instance.defId,
        slot: def?.slot || '',
        slotLabel: formatSlotLabel(def?.slot || 'item'),
        rarity: def?.rarity || 'common',
        type: def?.type || 'item',
        statsText,
        equipped: Object.values(era5State.equipped || {}).includes(instance.instanceId),
      };
    });
    const stats = era5State.stats || {};
    const statsLines = [
      `HP ${stats.hpMax ?? 3} · Shield ${stats.shieldMax ?? 1}`,
      `Tool meter ${(stats.toolMeterMax ?? 0).toFixed(1)} · Oxygen ${(stats.oxygenMax ?? 0).toFixed(1)}s`,
      `Move x${(stats.moveSpeed ?? 1).toFixed(2)} · Jump x${(stats.jumpMultiplier ?? 1).toFixed(2)} · Water x${(stats.waterMoveSpeed ?? 1).toFixed(2)}`,
      `Resists W ${(100 * (stats.waterResist ?? 0)).toFixed(0)}% · E ${(100 * (stats.electricResist ?? 0)).toFixed(0)}% · Wind ${(100 * (stats.windResist ?? 0)).toFixed(0)}% · Ink ${(100 * (stats.inkResist ?? 0)).toFixed(0)}% · Fire ${(100 * (stats.fireResist ?? 0)).toFixed(0)}%`,
      `Weapon cooldown ${(stats.weaponCooldown ?? 0.35).toFixed(2)}s · Stun ${(stats.weaponStunSec ?? 1.5).toFixed(1)}s`,
    ];
    return { slots, items, statsLines };
  };
  const syncEra5RuntimeState = () => {
    era5State = cloneEra5State(progression.era5);
    ui.setEra5InventoryData(buildEra5InventoryUiState());
    window.__DADA_DEBUG__.era5 = era5State;
  };
  syncEra5RuntimeState();
  const loadingIntent = !shotMode ? readLoadingIntent() : null;
  const autoStartFromQuery = !shotMode && hasAutoStartQuery();
  const autoStartAfterLoad = (!!loadingIntent && loadingIntent.levelId === levelId) || autoStartFromQuery;
  if (autoStartFromQuery) {
    stripAutoStartQuery();
  }
  let bootLoadingRaf = 0;
  let bootLoadingDone = false;
  let bootLoadingPercent = 0;

  const setBootLoadingPercent = (percent) => {
    if (!autoStartAfterLoad) return;
    bootLoadingPercent = Math.max(bootLoadingPercent, Math.min(100, Math.round(percent)));
    ui.showLoading(levelId, bootLoadingPercent);
  };

  const startBootLoading = () => {
    if (!autoStartAfterLoad) return;
    const startedAt = performance.now();
    setBootLoadingPercent(0);
    const tick = (now) => {
      if (bootLoadingDone) return;
      const elapsed = Math.max(0, now - startedAt);
      const t = Math.min(1, elapsed / 1200);
      setBootLoadingPercent(85 * easeOutCubic(t));
      bootLoadingRaf = window.requestAnimationFrame(tick);
    };
    bootLoadingRaf = window.requestAnimationFrame(tick);
  };

  const finishBootLoading = () => {
    if (!autoStartAfterLoad) return;
    bootLoadingDone = true;
    if (bootLoadingRaf) {
      window.cancelAnimationFrame(bootLoadingRaf);
      bootLoadingRaf = 0;
    }
    setBootLoadingPercent(100);
    clearLoadingIntent();
  };

  startBootLoading();

  // Track which level the player has selected (may differ from loaded levelId if they
  // switched buttons without reloading). Initialized from URL to stay in sync with
  // what the world builder actually loaded.
  let selectedLevelId = levelId;
  ui.setLevelSelectHandler((id) => { selectedLevelId = id; });

  // Build the diorama world (route by level)
  let world;
  try {
    world = !isLaunchableLevel
      ? buildUnderConstructionWorld(scene, levelId)
      : levelId === 5
      ? buildWorld5(scene, { animateGoal: !shotMode })
      : levelId === 4
      ? buildWorld4(scene, { animateGoal: !shotMode })
      : levelId === 3
      ? buildWorld3(scene, { animateGoal: !shotMode })
      : levelId === 2
        ? buildWorld2(scene, { animateGoal: !shotMode, debugMode })
        : shotMode
          ? withPatchedRandom(createSeededRandom(1337), () => buildWorld(scene, {
            random: createSeededRandom(7331),
            animateGoal: false,
          }))
          : buildWorld(scene);
  } catch (buildErr) {
    clearLoadingIntent();
    ui.showStartError(buildErr?.message || 'World build failed');
    reportDevError(buildErr);
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
  const availableModelSet = new Set(availableModels);
  window.__DADA_DEBUG__.assetModels = availableModels;
  const floorSurfaceFallback = world.level?.ground
    ? {
      topY: world.level.ground.y + (world.level.ground.h * 0.5),
      minX: world.level.ground.x - (world.level.ground.w * 0.5),
      maxX: world.level.ground.x + (world.level.ground.w * 0.5),
      minZ: (world.level.ground.z ?? 0) - (world.level.ground.d * 0.5),
      maxZ: (world.level.ground.z ?? 0) + (world.level.ground.d * 0.5),
    }
    : null;
  const currentFloorTopY = (() => {
    if (world.ground instanceof BABYLON.Mesh) {
      world.ground.computeWorldMatrix(true);
      const groundBounds = world.ground.getBoundingInfo?.()?.boundingBox;
      if (groundBounds) {
        return groundBounds.maximumWorld.y;
      }
    }
    return buildSurfaceBoundsFromVisual(
      'floor',
      world.groundVisual || world.ground,
      floorSurfaceFallback,
    )?.topY ?? null;
  })();
  if (levelId === 1 && import.meta.env.DEV) {
    if (!availableModelSet.has('local_baby_pig')) {
      console.warn('[assets] missing local_baby_pig; skipping Level 1 pig decor');
    }
    if (!availableModelSet.has('local_baby_elephant')) {
      console.warn('[assets] missing local_baby_elephant; skipping Level 1 elephant decor');
    }
  }

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
    const result = options.optional
      ? ((await loadOptionalModel(scene, roleName, options)) || {
        loaded: false,
        reason: 'optional_missing',
        meshes: [],
        roots: [],
      })
      : await loadModelForRole(scene, roleName, options);
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

  function attachOptionalRoleModel(roleName, fallbackNode, options = {}) {
    return attachRoleModel(roleName, fallbackNode, {
      ...options,
      optional: true,
    });
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
  player.setMovementMode(isEra5Level ? 'free' : 'lane');
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
  player.setCapeVisible(!!progression.capeUnlocked);

  const goalVisualRoot = new BABYLON.TransformNode('goalVisualRoot', scene);
  goalVisualRoot.parent = world.goalRoot;
  goalVisualRoot.position.set(0, GOAL_MODEL_SLOT_Y, 0);
  const level1AnimalDecor = [];
  const level2AnimalDecor = [];
  const level1SurfaceMap = new Map();
  if (levelId === 1 && world.level) {
    const floorFallback = world.level.ground
      ? {
        topY: world.level.ground.y + (world.level.ground.h * 0.5),
        minX: world.level.ground.x - (world.level.ground.w * 0.5),
        maxX: world.level.ground.x + (world.level.ground.w * 0.5),
        minZ: (world.level.ground.z ?? 0) - (world.level.ground.d * 0.5),
        maxZ: (world.level.ground.z ?? 0) + (world.level.ground.d * 0.5),
      }
      : null;
    const floorSurface = buildSurfaceBoundsFromVisual('floor', world.surfaceVisuals?.floor || world.groundVisual, floorFallback);
    if (floorSurface) {
      level1SurfaceMap.set('floor', floorSurface);
    }

    for (const surface of world.level.platforms || []) {
      const fallback = {
        topY: surface.y + (surface.h * 0.5),
        minX: surface.x - (surface.w * 0.5),
        maxX: surface.x + (surface.w * 0.5),
        minZ: (surface.z ?? 0) - (surface.d * 0.5),
        maxZ: (surface.z ?? 0) + (surface.d * 0.5),
      };
      const resolved = buildSurfaceBoundsFromVisual(
        surface.name,
        world.surfaceVisuals?.[surface.name],
        fallback,
      );
      if (resolved) {
        level1SurfaceMap.set(surface.name, resolved);
      }
    }
  }

  function getLevel1DecorSurface(anchor) {
    const meta = anchor?.metadata?.level1DecorSurface || {};
    const key = meta.name || (meta.type === 'floor' ? 'floor' : '');
    const base = (key && level1SurfaceMap.get(key)) || level1SurfaceMap.get('floor');
    const groundedOffsetY = Number.isFinite(anchor?.metadata?.level1GroundOffsetY)
      ? anchor.metadata.level1GroundOffsetY
      : 0;
    if (!base) {
      const pos = getAnchorWorldPosition(anchor) || BABYLON.Vector3.Zero();
      return {
        name: key || 'fallback',
        topY: pos.y - 0.02,
        minX: pos.x - 1,
        maxX: pos.x + 1,
        minZ: pos.z - 1,
        maxZ: pos.z + 1,
        baseY: pos.y + groundedOffsetY,
      };
    }
    return {
      name: key || base.name,
      topY: Number.isFinite(meta.topY) ? meta.topY : base.topY,
      minX: Number.isFinite(meta.minX) ? meta.minX : base.minX,
      maxX: Number.isFinite(meta.maxX) ? meta.maxX : base.maxX,
      minZ: Number.isFinite(meta.minZ) ? meta.minZ : base.minZ,
      maxZ: Number.isFinite(meta.maxZ) ? meta.maxZ : base.maxZ,
      baseY: (Number.isFinite(meta.baseY) ? meta.baseY : base.topY + 0.02) + groundedOffsetY,
    };
  }

  function computeAnchorGroundOffsetY(anchor) {
    const meshes = collectRenderableMeshes(anchor);
    if (!meshes.length) return 0;
    const bounds = combineBounds(meshes);
    const anchorPos = anchor.getAbsolutePosition?.() || anchor.position || BABYLON.Vector3.Zero();
    const localMinY = bounds.min.y - anchorPos.y;
    return localMinY < 0 ? -localMinY : 0;
  }

  function applyLevel1DecorGroundOffset(anchor, surface, meshes) {
    if (!anchor || !surface || !Array.isArray(meshes) || !meshes.length) return;
    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    const bounds = combineBounds(meshes);
    const groundedOffsetY = Math.max(0, surface.baseY - bounds.min.y);
    anchor.metadata = {
      ...(anchor.metadata || {}),
      level1GroundOffsetY: groundedOffsetY,
    };
    if (groundedOffsetY > 0.0001) {
      anchor.position.y += groundedOffsetY;
    }
  }

  function clampLevel1DecorPoint(surface, x, z) {
    return new BABYLON.Vector3(
      clamp(x, surface.minX, surface.maxX),
      surface.baseY,
      clamp(z, surface.minZ, surface.maxZ),
    );
  }

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

  const goalPos = world.goalRoot.getAbsolutePosition();
  actorState.goal = {
    loaded: false,
    usingFallback: world.goalPresentation !== 'trigger-only',
    reason: world.goalPresentation === 'trigger-only'
      ? 'hidden_goal_trigger'
      : `procedural_human_dad_level${levelId}`,
    worldPos: [goalPos.x, goalPos.y, goalPos.z],
    bboxSize: [0, 0, 0],
    allowInvisible: world.goalPresentation === 'trigger-only',
  };

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

  if (world.level2) {
    const { anchors: l2anchors, fallbackVisuals: l2fallback } = world.level2;
    const registerLevel2AnimalDecor = (anchor, {
      speed,
      radius,
      phase = 0,
      turnSpeed = 6.8,
      bobAmp = 0.02,
      stepFreq = 6.2,
      pitchAmp = 0.018,
      rollAmp = 0.028,
    }) => {
      const surface = anchor.metadata?.level2DecorSurface;
      if (!surface) return;
      const home = new BABYLON.Vector3(
        clamp(anchor.position.x, surface.minX, surface.maxX),
        surface.baseY,
        clamp(anchor.position.z, surface.minZ, surface.maxZ),
      );
      anchor.position.copyFrom(home);
      const controller = new AnimalWanderController({
        root: anchor,
        home,
        surface,
        speed,
        turnSpeed,
        radius,
        phase,
        bobAmp,
        stepFreq,
        pitchAmp,
        rollAmp,
        accel: 6.2,
        minWalkSpeed: 0.025,
        retargetMinSec: 1.8,
        retargetMaxSec: 3.6,
        pauseMinSec: 0.45,
        pauseMaxSec: 1.1,
        arrivalThreshold: 0.2,
        seed: `level2:${anchor.name}`,
      });
      level2AnimalDecor.push({ root: anchor, controller, surface });
    };

    const l2propDefs = [
      {
        role: 'futurePianoModel',
        anchor: l2anchors.piano,
        fallback: l2fallback?.piano,
        fit: { targetMaxSize: 3.6, groundOffset: 0.2, hardMaxExtent: 4.8 },
      },
      {
        role: 'futureBiancaModel',
        anchor: l2anchors.bianca,
        fallback: null,
        fit: { targetHeight: 1.36, targetMaxSize: 2.02, groundOffset: 0.0, hardMaxExtent: 3.0 },
      },
      {
        role: 'futureHighchairModel',
        anchor: l2anchors.highchair,
        fallback: l2fallback?.highchair,
        fit: { targetHeight: 1.65, targetMaxSize: 2.2, groundOffset: 0.0 },
      },
      {
        role: 'futureBikeModel',
        anchor: l2anchors.bike,
        fallback: l2fallback?.bike,
        fit: { targetMaxSize: 2.2, groundOffset: 0.0 },
      },
      {
        role: 'futureGoatPropModel',
        anchor: l2anchors.goat,
        fallback: null,
        fit: { targetHeight: 1.45, targetMaxSize: 2.0, groundOffset: 0.0 },
      },
      {
        role: 'futureTulipFlowerPropModel',
        anchors: l2anchors.tulips || [],
        fallback: null,
        fit: { targetHeight: 0.72, targetMaxSize: 0.9, groundOffset: 0.0 },
      },
      {
        role: 'futureYellowFlowerPropModel',
        anchors: l2anchors.yellowFlowers || [],
        fallback: null,
        fit: { targetHeight: 0.72, targetMaxSize: 0.9, groundOffset: 0.0 },
      },
    ];
    for (const { role, anchor, anchors: roleAnchors, fallback, fit } of l2propDefs) {
      const targets = roleAnchors || (anchor ? [anchor] : []);
      for (const targetAnchor of targets) {
        if (!targetAnchor) continue;
        const result = await attachOptionalRoleModel(role, targetAnchor, {
          parent: targetAnchor,
          fallbackMeshes: fallback ? collectNodeMeshes(fallback) : collectNodeMeshes(targetAnchor),
          fallbackMaterial: 'plastic',
          renderingGroupId: 2,
        });
        if (result?.loaded) {
          for (const mesh of result.meshes || []) {
            if (mesh.name && !mesh.name.startsWith('L2_') && !mesh.name.startsWith('L2_DECOR_')) {
              mesh.name = `L2_DECOR_${mesh.name}`;
            }
            if (mesh.id && !mesh.id.startsWith('L2_') && !mesh.id.startsWith('L2_DECOR_')) {
              mesh.id = `L2_DECOR_${mesh.id}`;
            }
            mesh.metadata = {
              ...(mesh.metadata || {}),
              decor: true,
              level2Decor: true,
              cameraIgnore: true,
              cameraBlocker: false,
            };
            mesh.isPickable = false;
            mesh.checkCollisions = false;
          }
          const anchorPos = targetAnchor.getAbsolutePosition();
          const anchorSurface = targetAnchor.metadata?.level2DecorSurface;
          fitLoadedModel(targetAnchor, {
            targetMaxSize: fit?.targetMaxSize ?? 0,
            targetHeight: fit?.targetHeight ?? 0,
            groundY: (anchorSurface?.baseY ?? anchorPos.y) + (fit?.groundOffset ?? 0),
            markDecorative: true,
          });
          if (fit?.recenter) {
            recenterLoadedModelXZ(result.roots, anchorPos.x, anchorPos.z);
          }
          if (fit?.hardMaxExtent) {
            clampDecorMaxExtent(result.roots, fit.hardMaxExtent);
          }
          if (anchorSurface?.baseY !== undefined) {
            ensureDecorGrounding(result.roots, anchorSurface.baseY, targetAnchor.name, debugMode);
          }
          const normalizedBounds = combineBounds(collectRenderableMeshes(result.roots));
          const stillOversized = normalizedBounds.maxDim > Math.max(6, fit?.hardMaxExtent ?? 0);
          const badlyOffset = Math.abs(normalizedBounds.center.z - anchorPos.z) > 3.5;
          if (role === 'futureGoatPropModel') {
            for (const root of result.roots || []) {
              root.rotation.y += Math.PI;
            }
            registerLevel2AnimalDecor(targetAnchor, {
              speed: 0.52,
              radius: 0.96,
              phase: anchorPos.x * 0.07,
              turnSpeed: 6.1,
              bobAmp: 0.022,
              stepFreq: 6.0,
              pitchAmp: 0.016,
              rollAmp: 0.026,
            });
          }
          if (role === 'futureBiancaModel') {
            registerLevel2AnimalDecor(targetAnchor, {
              speed: 0.36,
              radius: 0.46,
              phase: 0.32 + (anchorPos.x * 0.03),
              turnSpeed: 5.2,
              bobAmp: 0.016,
              stepFreq: 4.8,
              pitchAmp: 0.012,
              rollAmp: 0.018,
            });
          }
          if (role === 'futurePackPropModel' && (stillOversized || badlyOffset)) {
            setNodesEnabled(result.roots, false);
            setMeshesEnabled(result.meshes, false);
            if (fallback) fallback.setEnabled(true);
            continue;
          }
          const cullResult = disableLevel2DecorMeshes(scene, { debugMode });
          window.__DADA_DEBUG__.level2CullResult = cullResult;
          if (fallback) {
            const hasVisibleLoadedMesh = (result.meshes || []).some((mesh) => mesh?.isEnabled?.() && (mesh.visibility ?? 1) > 0.02);
            fallback.setEnabled(!hasVisibleLoadedMesh);
          }
        }
      }
    }
  }

  // Level 1 Petting Zoo — load animal GLBs onto pre-placed anchors
  if (levelId === 1) {
    const registerAnimalDecor = (anchor, {
      kind,
      zone,
      phase,
      speed,
      radius,
      bobAmp,
      turnSpeed = 7.5,
      stepFreq = 7.0,
      pitchAmp = 0.02,
      rollAmp = 0.03,
      accel = 7.5,
      minWalkSpeed = 0.02,
      retargetMinSec = 1.5,
      retargetMaxSec = 3.5,
      pauseMinSec = 0.4,
      pauseMaxSec = 1.1,
      arrivalThreshold = 0.22,
    }) => {
      const surface = getLevel1DecorSurface(anchor);
      const anchorPos = getAnchorWorldPosition(anchor) || anchor.position.clone();
      const home = clampLevel1DecorPoint(surface, anchorPos.x, anchorPos.z);
      anchor.position.copyFrom(home);
      const controller = new AnimalWanderController({
        root: anchor,
        home,
        surface,
        speed,
        turnSpeed,
        radius,
        phase,
        bobAmp,
        stepFreq,
        pitchAmp,
        rollAmp,
        accel,
        minWalkSpeed,
        retargetMinSec,
        retargetMaxSec,
        pauseMinSec,
        pauseMaxSec,
        arrivalThreshold,
        seed: `${anchor.name}:${kind}:${zone || 'zone'}`,
      });
      level1AnimalDecor.push({ kind, zone, root: anchor, controller, surface });
    };

    for (const anchor of anchors.pettingZooGoat || []) {
      const result = await attachRoleModel('futureGoatPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        const surface = getLevel1DecorSurface(anchor);
        fitLoadedModel(result.roots, {
          targetHeight: 1.7,
          groundY: surface.baseY,
          markDecorative: true,
        });
        ensureDecorGrounding(result.roots, surface.baseY, anchor.name, debugMode);
        for (const root of result.roots || []) {
          root.rotation.y += Math.PI;
        }
        anchor.metadata = {
          ...(anchor.metadata || {}),
          level1GroundOffsetY: 0.53,
        };
        anchor.position.y = surface.baseY + 0.53;
        ensureVisibleMeshes(result.meshes);
        registerAnimalDecor(anchor, {
          kind: 'goat',
          zone: anchor.name.replace('pz_goatAnchor', ''),
          phase: anchor.position.x * 0.11,
          speed: 0.62,
          radius: 1.28,
          bobAmp: 0.03,
          stepFreq: 6.8,
          pitchAmp: 0.018,
          rollAmp: 0.032,
          accel: 6.8,
        });
      }
    }
    for (const anchor of anchors.pettingZooChickens || []) {
      const result = await attachRoleModel('futureChickenPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        const surface = getLevel1DecorSurface(anchor);
        fitLoadedModel(result.roots, {
          targetHeight: anchor.name === 'pz_chicken3' || anchor.name === 'pz_chicken4' || anchor.name === 'pz_chicken5'
            ? 0.77
            : 0.7,
          groundY: surface.baseY,
          markDecorative: true,
        });
        ensureDecorGrounding(result.roots, surface.baseY, anchor.name, debugMode);
        for (const root of result.roots || []) {
          root.rotation.y += Math.PI;
        }
        applyLevel1DecorGroundOffset(anchor, surface, result.meshes);
        ensureVisibleMeshes(result.meshes);
        registerAnimalDecor(anchor, {
          kind: 'chicken',
          zone: anchor.name.replace('pz_chicken', ''),
          phase: anchor.position.x * 0.17,
          speed: 0.88,
          radius: 0.82,
          bobAmp: 0.03,
          stepFreq: 11.6,
          pitchAmp: 0.04,
          rollAmp: 0.018,
          accel: 8.5,
          minWalkSpeed: 0.025,
        });
      }
    }
    for (const anchor of anchors.pettingZooDino || []) {
      const result = await attachRoleModel('futureDinoPropModel', anchor, {
        parent: anchor,
        fallbackMaterial: 'cardboard',
        renderingGroupId: 2,
      });
      if (result.loaded) {
        const surface = getLevel1DecorSurface(anchor);
        fitLoadedModel(result.roots, {
          targetHeight: anchor.name === 'pz_dinoAnchor1' ? 2.26 : 2.16,
          groundY: surface.baseY,
          markDecorative: true,
        });
        ensureDecorGrounding(result.roots, surface.baseY, anchor.name, debugMode);
        for (const root of result.roots || []) {
          root.rotation.y += Math.PI;
        }
        applyLevel1DecorGroundOffset(anchor, surface, result.meshes);
        ensureVisibleMeshes(result.meshes);
        registerAnimalDecor(anchor, {
          kind: 'dino',
          zone: anchor.name.replace('pz_dinoAnchor', ''),
          phase: 1.85 + (anchor.position.x * 0.03),
          speed: 0.48,
          radius: 1.16,
          bobAmp: 0.028,
          stepFreq: 5.2,
          pitchAmp: 0.02,
          rollAmp: 0.028,
          accel: 6.0,
        });
      }
    }
    if (availableModelSet.has('local_baby_pig')) {
      for (const anchor of anchors.pettingZooPig || []) {
        const result = await attachRoleModel('futurePigPropModel', anchor, {
          parent: anchor,
          fallbackMaterial: 'cardboard',
          renderingGroupId: 2,
        });
        if (result.loaded) {
          const surface = getLevel1DecorSurface(anchor);
          fitLoadedModel(result.roots, {
            targetHeight: 1.2,
            groundY: surface.baseY,
            markDecorative: true,
          });
          ensureDecorGrounding(result.roots, surface.baseY, anchor.name, debugMode);
          for (const root of result.roots || []) {
            root.rotation.y += Math.PI;
          }
          applyLevel1DecorGroundOffset(anchor, surface, result.meshes);
          ensureVisibleMeshes(result.meshes);
          registerAnimalDecor(anchor, {
            kind: 'pig',
            zone: anchor.name.replace('pz_pigAnchor', ''),
            phase: 0.42 + (anchor.position.x * 0.05),
            speed: 0.56,
            radius: 0.98,
            bobAmp: 0.024,
            turnSpeed: 6.4,
            stepFreq: 6.1,
            pitchAmp: 0.018,
            rollAmp: 0.026,
            accel: 6.5,
          });
        }
      }
    }
    if (availableModelSet.has('local_baby_elephant')) {
      for (const anchor of anchors.pettingZooElephant || []) {
        const result = await attachRoleModel('futureElephantPropModel', anchor, {
          parent: anchor,
          fallbackMaterial: 'cardboard',
          renderingGroupId: 2,
        });
        if (result.loaded) {
          const surface = getLevel1DecorSurface(anchor);
          const elephantGroundY = surface.baseY ?? (currentFloorTopY !== null ? currentFloorTopY + 0.02 : 0);
          fitLoadedModel(result.roots, {
            targetHeight: 1.9,
            groundY: elephantGroundY,
            markDecorative: true,
          });
          ensureDecorGrounding(result.roots, elephantGroundY, anchor.name, debugMode);
          for (const root of result.roots || []) {
            root.rotation.y += Math.PI;
          }
          applyLevel1DecorGroundOffset(anchor, surface, result.meshes);
          ensureVisibleMeshes(result.meshes);
          registerAnimalDecor(anchor, {
            kind: 'elephant',
            zone: anchor.name.replace('pz_elephantAnchor', ''),
            phase: 1.18,
            speed: 0.34,
            radius: 1.34,
            bobAmp: 0.016,
            turnSpeed: 5.0,
            stepFreq: 4.2,
            pitchAmp: 0.012,
            rollAmp: 0.038,
            accel: 3.8,
            minWalkSpeed: 0.03,
            retargetMinSec: 3.0,
            retargetMaxSec: 5.0,
            pauseMinSec: 0.8,
            pauseMaxSec: 1.6,
            arrivalThreshold: 0.34,
          });
        }
      }
    }
  }

  if (levelId === 3) {
    const level3OptionalDefs = [
      { role: 'futureTulipFlowerPropModel', anchors: anchors.futureTulipFlowerPropModel || [], fit: { targetHeight: 0.8 } },
      { role: 'futureYellowFlowerPropModel', anchors: anchors.futureYellowFlowerPropModel || [], fit: { targetHeight: 0.8 } },
      { role: 'futureCornPropModel', anchors: anchors.futureCornPropModel || [], fit: { targetHeight: 1.55 } },
      { role: 'futureHuskyDogPropModel', anchors: anchors.futureHuskyDogPropModel || [], fit: { targetHeight: 1.2, targetMaxSize: 1.8 } },
      { role: 'futurePlayfulDogPropModel', anchors: anchors.futurePlayfulDogPropModel || [], fit: { targetHeight: 1.15, targetMaxSize: 1.7 } },
      { role: 'futureTaterDogPropModel', anchors: anchors.futureTaterDogPropModel || [], fit: { targetHeight: 1.15, targetMaxSize: 1.7 } },
      { role: 'futureChickensPropModel', anchors: anchors.futureChickensPropModel || [], fit: { targetHeight: 0.78, targetMaxSize: 1.0 } },
      { role: 'futureGoatPropModel', anchors: anchors.futureGoatPropModel || [], fit: { targetHeight: 1.42, targetMaxSize: 1.9 } },
      { role: 'futureTurkeyPropModel', anchors: anchors.futureTurkeyPropModel || [], fit: { targetHeight: 1.18, targetMaxSize: 1.6 } },
      { role: 'futurePigPropModel', anchors: anchors.futurePigPropModel || [], fit: { targetHeight: 1.05, targetMaxSize: 1.5 } },
      { role: 'futureRakePropModel', anchors: anchors.futureRakePropModel || [], fit: { targetHeight: 1.32, targetMaxSize: 1.9, hardMaxExtent: 2.6 } },
      { role: 'futureTractorPropModel', anchors: anchors.futureTractorPropModel || [], fit: { targetHeight: 1.7, targetMaxSize: 2.8, hardMaxExtent: 3.6 } },
      { role: 'futureBunnyPropModel', anchors: anchors.futureBunnyPropModel || [], fit: { targetHeight: 0.92, targetMaxSize: 1.25, hardMaxExtent: 1.6 } },
    ];
    for (const { role, anchors: roleAnchors, fit } of level3OptionalDefs) {
      for (const anchor of roleAnchors) {
        const result = await attachOptionalRoleModel(role, anchor, {
          parent: anchor,
          fallbackMeshes: collectNodeMeshes(anchor),
          fallbackMaterial: 'plastic',
          renderingGroupId: 3,
        });
        if (!result?.loaded) continue;
        const anchorPos = anchor.getAbsolutePosition();
        fitLoadedModel(result.roots, {
          targetMaxSize: fit?.targetMaxSize ?? 0,
          targetHeight: fit?.targetHeight ?? 0,
          groundY: anchorPos.y,
          markDecorative: true,
        });
        ensureDecorGrounding(result.roots, anchorPos.y, anchor.name, debugMode);
        if (fit?.hardMaxExtent) {
          clampDecorMaxExtent(result.roots, fit.hardMaxExtent);
        }
      }
    }
  }

  const cloudCutouts = levelId === 1 ? (anchors.cloudCutouts || []) : [];

  function updateLevel1Clouds(dt) {
    if (levelId !== 1 || shotMode || !cloudCutouts.length) return;
    const floorClampY = Number.isFinite(currentFloorTopY) ? currentFloorTopY : 0;
    for (const cloud of cloudCutouts) {
      if (!cloud?.position) continue;
      const speed = cloud.metadata?.driftSpeed ?? 0.08;
      const minX = cloud.metadata?.driftMinX ?? -28;
      const maxX = cloud.metadata?.driftMaxX ?? 58;
      const minY = Math.max(
        floorClampY + 8,
        Number.isFinite(cloud.metadata?.driftMinY) ? cloud.metadata.driftMinY : floorClampY + 8,
      );
      const maxY = Math.max(minY + 0.5, cloud.metadata?.driftMaxY ?? (minY + 4));
      const minZ = cloud.metadata?.driftMinZ ?? -30;
      const maxZ = cloud.metadata?.driftMaxZ ?? -22;
      cloud.position.x += dt * speed;
      if (cloud.position.x > maxX) {
        cloud.position.x = minX;
      }
      if (cloud.position.y < floorClampY + 8 || cloud.position.y < minY || cloud.position.y > maxY) {
        cloud.position.y = clamp(cloud.metadata?.driftBaseY ?? minY, minY, maxY);
      }
      cloud.position.z = clamp(cloud.metadata?.driftBaseZ ?? cloud.position.z, minZ, maxZ);
    }
  }

  function updateLevel1AnimalDecor(dt) {
    if (levelId !== 1 || shotMode || !level1AnimalDecor.length) return;
    for (const animal of level1AnimalDecor) {
      if (!animal.root?.isEnabled?.()) continue;
      animal.controller.update(dt);
      const meshes = collectRenderableMeshes(animal.root);
      if (!meshes.length) continue;
      animal.root.computeWorldMatrix?.(true);
      for (const mesh of meshes) mesh.computeWorldMatrix(true);
      const bounds = combineBounds(meshes);
      const desiredGroundY = animal.surface.topY + 0.02;
      if (!animal.groundCalibrated) {
        const calibrationLift = desiredGroundY - bounds.min.y;
        if (Math.abs(calibrationLift) > 0.05) {
          animal.surface.baseY += calibrationLift;
          animal.controller.surface.baseY += calibrationLift;
          animal.controller.home.y += calibrationLift;
          animal.controller.pos.y += calibrationLift;
          animal.root.position.y += calibrationLift;
        }
        animal.groundCalibrated = true;
      }
      if (bounds.min.y < desiredGroundY) {
        animal.root.position.y += desiredGroundY - bounds.min.y;
        animal.root.computeWorldMatrix?.(true);
        for (const mesh of meshes) mesh.computeWorldMatrix(true);
      }
    }
  }

  function updateLevel2AnimalDecor(dt) {
    if (levelId !== 2 || shotMode || !level2AnimalDecor.length) return;
    for (const animal of level2AnimalDecor) {
      if (!animal.root?.isEnabled?.()) continue;
      animal.controller.update(dt);
      const meshes = collectRenderableMeshes(animal.root);
      if (!meshes.length) continue;
      animal.root.computeWorldMatrix?.(true);
      for (const mesh of meshes) mesh.computeWorldMatrix(true);
      const bounds = combineBounds(meshes);
      const desiredGroundY = animal.surface.topY + 0.02;
      if (bounds.min.y < desiredGroundY) {
        const lift = desiredGroundY - bounds.min.y;
        animal.surface.baseY += lift;
        animal.controller.surface.baseY += lift;
        animal.controller.home.y += lift;
        animal.controller.pos.y += lift;
        animal.root.position.y += lift;
        animal.root.computeWorldMatrix?.(true);
        for (const mesh of meshes) mesh.computeWorldMatrix(true);
      }
    }
  }

  function updateCoinLossDisplay(dt) {
    if (!level1CoinLossAnim) return;
    level1CoinLossAnim.elapsedMs = Math.min(level1CoinLossAnim.durationMs, level1CoinLossAnim.elapsedMs + (dt * 1000));
    const t = Math.min(1, level1CoinLossAnim.elapsedMs / level1CoinLossAnim.durationMs);
    const visibleCount = Math.max(0, Math.round(level1CoinLossAnim.startCount * (1 - t)));
    ui.setCoins(visibleCount);
    if (t >= 1) {
      level1CoinLossAnim = null;
      ui.setCoins(0);
    }
  }

  function spawnCoinFlyback(coin, playerPos, index, count) {
    const angle = (index / Math.max(1, count)) * Math.PI * 2;
    const start = new BABYLON.Vector3(
      playerPos.x + Math.cos(angle) * 0.24,
      playerPos.y + 0.22 + ((index % 3) * 0.06),
      playerPos.z + Math.sin(angle) * 0.12,
    );
    const end = new BABYLON.Vector3(coin.position.x, coin.position.y + 0.2, coin.position.z);
    const mid = BABYLON.Vector3.Lerp(start, end, 0.5).add(new BABYLON.Vector3(0, 1.2, 0));
    const flyer = createCoin(scene, `coinFlyback_${coin.node?.name || index}`, {
      x: start.x,
      y: start.y,
      z: start.z,
    });
    flyer.isPickable = false;
    flyer.metadata = { ...(flyer.metadata || {}), cameraIgnore: true };
    for (const mesh of flyer.getChildMeshes(false)) {
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.metadata = { ...(mesh.metadata || {}), cameraIgnore: true };
      mesh.renderingGroupId = 3;
    }
    level1CoinFlyers.push({
      coin,
      node: flyer,
      start,
      mid,
      end,
      elapsedMs: 0,
      durationMs: 700 + (index * 25),
    });
  }

  function updateCoinFlybacks(dt) {
    if (!level1CoinFlyers.length) return;
    for (let i = level1CoinFlyers.length - 1; i >= 0; i--) {
      const flyer = level1CoinFlyers[i];
      flyer.elapsedMs = Math.min(flyer.durationMs, flyer.elapsedMs + (dt * 1000));
      const t = Math.min(1, flyer.elapsedMs / flyer.durationMs);
      const eased = easeOutCubic(t);
      flyer.node.position.copyFrom(quadraticBezier(flyer.start, flyer.mid, flyer.end, eased));
      flyer.node.rotation.y += dt * 8;
      if (t >= 1) {
        flyer.node.dispose();
        flyer.coin.collected = false;
        flyer.coin.node?.setEnabled(true);
        flyer.coin.node?.position?.copyFrom?.(flyer.coin.position);
        level1CoinFlyers.splice(i, 1);
      }
    }
  }

  function triggerFloorPenalty() {
    if (level1FloorPenaltyCooldownMs > 0) return;
    const collectedCoins = coins.filter((coin) => coin.collected);
    if (collectedCoins.length === 0) return;
    level1FloorPenaltyCooldownMs = 1500;
    collectiblePickupCooldownMs = FLOOR_PENALTY_PICKUP_COOLDOWN_MS;
    const playerPos = player.mesh.position.clone();
    if (debugMode) {
      console.log('[coin-loss] floor_penalty', {
        levelId,
        coinsBefore: coinsCollected,
        bottomY: Number((player.mesh.position.y - player.getCollisionHalfExtents().halfH).toFixed(3)),
        floorTopY: currentFloorTopY,
        stack: new Error().stack,
      });
    }
    for (const coin of coins) {
      const wasCollected = coin.collected;
      coin.collected = false;
      if (!wasCollected) {
        coin.node?.setEnabled(true);
      }
    }
    const startCount = coinsCollected;
    coinsCollected = 0;
    window.__DADA_DEBUG__.coinsCollected = coinsCollected;
    window.__DADA_DEBUG__.lastFloorPenaltyLevel = levelId;
    window.__DADA_DEBUG__.floorPenaltyCount = (window.__DADA_DEBUG__.floorPenaltyCount || 0) + 1;
    level1CoinLossAnim = {
      startCount,
      elapsedMs: 0,
      durationMs: 700,
    };
    ui.showStatus('Dropped all pacifiers!', 1100);
    updateBuffHud();
    for (let i = 0; i < collectedCoins.length; i++) {
      spawnCoinFlyback(collectedCoins[i], playerPos, i, collectedCoins.length);
    }
  }

  function isSupportedByRaisedSurface(playerPos, playerBottomY) {
    if (!Array.isArray(player.colliders) || player.colliders.length <= 1) {
      return false;
    }
    for (let i = 1; i < player.colliders.length; i++) {
      const surface = player.colliders[i];
      if (!surface) continue;
      const withinX = playerPos.x >= (surface.minX - 0.08) && playerPos.x <= (surface.maxX + 0.08);
      const nearTop = Math.abs(playerBottomY - surface.maxY) <= 0.18;
      if (withinX && nearTop) {
        return true;
      }
    }
    return false;
  }

  function updateLevel1Ambient(dt) {
    if (levelId !== 1 || shotMode || state !== 'gameplay' || respawnState) return;
    level1AmbientTimerMs -= dt * 1000;
    if (level1AmbientBirdDelayMs > 0) {
      level1AmbientBirdDelayMs -= dt * 1000;
      if (level1AmbientBirdDelayMs <= 0) {
        audio.playAmbientBirds();
        level1AmbientBirdDelayMs = -1;
      }
    }
    if (level1AmbientTimerMs <= 0) {
      audio.playAmbientMoo();
      level1AmbientBirdDelayMs = 760 + (Math.random() * 280);
      level1AmbientTimerMs = 6000 + ((Math.random() * 800) - 400);
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
  for (const pickup of pickups) {
    if (pickup.type !== 'item') continue;
    const alreadyOwned = progression.era5?.inventory?.some((item) => item.defId === pickup.defId);
    pickup.collected = !!alreadyOwned;
    pickup.node?.setEnabled(!alreadyOwned);
  }
  const coins = world.coins || [];
  coins.forEach((coin, index) => {
    if (!coin.id) {
      coin.id = `level${levelId}_coin_${index}`;
    }
  });
  const hazards = world.hazards || [];
  const crumbles = world.crumbles || [];
  const persistentCoinIds = new Set(getLevelProgress(progression, levelId).collectedIds || []);
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
      playerTriggered: false,
      portalTriggered: false,
    };
  });
  const juiceFx = new JuiceFx(scene, { enabled: !!debugFlags.juice && !shotMode });
  const audio = new GameAudio({ enabled: !!debugFlags.audio && !shotMode });
  audio.armOnFirstGesture();
  const worldExtents = world.extents || { minX: -18, maxX: 24 };
  const camTargetMinX = worldExtents.minX + 3.2;
  const camTargetMaxX = worldExtents.maxX - 2.6;
  const era5InitialPlayerYaw = isEra5Level ? (world.spawnYaw ?? ERA5_DEFAULT_PLAYER_YAW) : 0;
  const era5InitialForward = getYawForwardXZ(era5InitialPlayerYaw);
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
  const level2OcclusionState = new Map();
  if (levelId === 2) {
    for (const mesh of scene.meshes) {
      if (!(mesh instanceof BABYLON.Mesh)) continue;
      if (!mesh.metadata?.decor) continue;
      level2OcclusionState.set(mesh.uniqueId, {
        mesh,
        baseVisibility: typeof mesh.visibility === 'number' ? mesh.visibility : 1,
        current: typeof mesh.visibility === 'number' ? mesh.visibility : 1,
        target: typeof mesh.visibility === 'number' ? mesh.visibility : 1,
      });
    }
  }
  const era5DecorOcclusionState = new Map();
  if (isEra5Level) {
    for (const mesh of scene.meshes) {
      if (!(mesh instanceof BABYLON.Mesh)) continue;
      if (!mesh.metadata?.decor || mesh.metadata?.gameplaySurface || mesh.metadata?.gameplay || mesh.metadata?.hazard) continue;
      if (mesh.metadata?.cameraFadeable === false) continue;
      const material = mesh.material;
      if (!material) continue;
      prepareFadeMaterial(material);
      era5DecorOcclusionState.set(mesh.uniqueId, {
        mesh,
        baseAlpha: material._dadaBaseAlpha ?? material.alpha ?? 1,
        current: 1,
        target: 1,
      });
    }
  }
  function getEra5GameplayMeshes() {
    return scene.meshes.filter((mesh) => (
      mesh instanceof BABYLON.Mesh
      && mesh.isEnabled()
      && mesh.isVisible !== false
      && (mesh.visibility ?? 1) > 0.02
      && (
        mesh.metadata?.gameplay === true
        || mesh.metadata?.gameplaySurface === true
        || (mesh.name || '').startsWith('L5_GEO_')
      )
    ));
  }

  function getEra5SceneStats() {
    const gameplayMeshes = getEra5GameplayMeshes();
    const decorMeshes = scene.meshes.filter((mesh) => (
      mesh instanceof BABYLON.Mesh
      && mesh.isEnabled()
      && mesh.isVisible !== false
      && (mesh.visibility ?? 1) > 0.02
      && mesh.metadata?.decor === true
    ));
    let fadedMeshes = 0;
    for (const stateInfo of era5DecorOcclusionState.values()) {
      if (stateInfo.current < 0.98) fadedMeshes += 1;
    }
    return {
      gameplayMeshes,
      decorMeshes,
      fadedMeshes,
    };
  }

  let era5VisibilityFailureReason = '';

  const getEra5PresetTable = () => {
    if (!isEra5Level || !world.cameraPresets) return ERA5_CAMERA_PRESETS;
    return world.cameraPresets;
  };
  const getEra5DefaultPresetId = () => {
    const presetTable = getEra5PresetTable();
    if (isEra5Level && world.defaultCameraPreset && presetTable[world.defaultCameraPreset]) {
      return world.defaultCameraPreset;
    }
    return ERA5_DEFAULT_CAMERA_PRESET;
  };

  // Camera — fixed angle, smooth follow
  const initialEra5CameraPreset = getEra5PresetTable()[getEra5DefaultPresetId()] || ERA5_CAMERA_PRESETS[ERA5_DEFAULT_CAMERA_PRESET];
  const cameraStartPos = isEra5Level
    ? new BABYLON.Vector3(
      (spawnPoint.x || -12) - (era5InitialForward.x * initialEra5CameraPreset.distance),
      (spawnPoint.y || 2) + initialEra5CameraPreset.height,
      (spawnPoint.z || 0) - (era5InitialForward.z * initialEra5CameraPreset.distance),
    )
    : levelId === 2
    ? new BABYLON.Vector3((spawnPoint.x || -12) - 10.0, (spawnPoint.y || 2) + 10.0, -18.0)
    : new BABYLON.Vector3(-17.5, 7.05, CAMERA_FOLLOW_Z);
  const cameraStartTarget = isEra5Level
    ? new BABYLON.Vector3(
      (spawnPoint.x || -12) + (era5InitialForward.x * initialEra5CameraPreset.lookAhead),
      (spawnPoint.y || 2) + initialEra5CameraPreset.focusHeight,
      (spawnPoint.z || 0) + (era5InitialForward.z * initialEra5CameraPreset.lookAhead),
    )
    : levelId === 2
    ? new BABYLON.Vector3((spawnPoint.x || -12), (spawnPoint.y || 2) + 1.0, 0)
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
  const useEra5DecorOcclusion = isEra5Level && world.disableDecorOcclusionFade !== true;
  let era5CameraPresetId = getEra5DefaultPresetId();
  let era5PlayerYaw = era5InitialPlayerYaw;
  let era5PlayerYawVel = 0;
  let era5CameraYaw = isEra5Level ? era5InitialPlayerYaw : 0;
  let era5CameraDesiredYaw = era5CameraYaw;
  let era5CameraYawVel = 0;
  let era5CameraManualLookMs = 0;
  let era5CameraDebugOverride = null;
  let level2ProbeTimer = 0;
  let level2LoggedOccluderId = null;
  let era5CurrentOccluderName = null;
  let era5CurrentOcclusionInfo = null;
  const era5DevOverlay = debugMode && isEra5Level ? createEra5DevOverlay() : null;
  const era5VisionQuery = debugMode && isEra5Level ? readEra5VisionQuery() : { enabled: false };
  const era5VisionState = {
    disableFog: false,
    disablePostFx: false,
    showBounds: false,
    hideLargePlanes: false,
    forceEnvironmentVisible: false,
  };
  let era5LastDamageEvent = null;
  const getEra5CameraPreset = () => {
    const presetTable = getEra5PresetTable();
    return presetTable[era5CameraPresetId]
      || presetTable[getEra5DefaultPresetId()]
      || ERA5_CAMERA_PRESETS[ERA5_DEFAULT_CAMERA_PRESET];
  };
  if (isEra5Level) {
    camera.fov = getEra5CameraPreset().fov;
  }
  const era5VisionMeshState = new Map();
  const era5VisionOriginalScene = {
    fogMode: scene.fogMode,
    fogStart: scene.fogStart,
    fogEnd: scene.fogEnd,
    fogDensity: scene.fogDensity,
    postProcessesEnabled: scene.postProcessesEnabled,
    imageProcessingEnabled: scene.imageProcessingConfiguration?.isEnabled ?? null,
    imageProcessingByPostProcess: scene.imageProcessingConfiguration?.applyByPostProcess ?? null,
  };
  if (isEra5Level) {
    applyEra5FacingState();
  }

  // Dev-only debug HUD + rest stability test
  const debugHud = import.meta.env.DEV ? createDebugHud() : null;
  if (import.meta.env.DEV) installRestStabilityTest(player);
  if (debugMode) {
    window.__DADA_DEBUG__.sceneRef = scene;
    window.__DADA_DEBUG__.playerRef = player.mesh;
    window.__DADA_DEBUG__.playerController = player;
    window.__DADA_DEBUG__.cameraRef = camera;
  }

  // Game state machine
  const goalX = world.goalRoot.position.x;
  const goalGuardMinX = Number.isFinite(world.goalGuardMinX) ? world.goalGuardMinX : null;
  const goalMinBottomY = Number.isFinite(world.goalMinBottomY) ? world.goalMinBottomY : null;
  let warnedEarlyGoal = false;
  let warnedLowGoal = false;

  let state = 'title'; // title | gameplay | loading | menu | goal | end
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
  let onesieStoredJumpBoost = 1.24;
  let onesieCollectedThisRun = false;
  let onesieRechargeMs = 0;
  const ONESIE_RECHARGE_DURATION_MS = 8000;
  let puddleInvulnMs = 0;
  let coinsCollected = 0;
  let collectiblePickupCooldownMs = 0;
  let capeUsedThisRun = false;
  let capeSuppressedThisRun = false;
  let bubbleShieldUsedThisRun = false;
  let bubbleShieldGraceMs = 0;
  let flourPuffCooldownMs = 0;
  let era5Hp = Math.max(1, Math.round(era5State.stats.hpMax ?? 3));
  let era5Shield = Math.max(0, Math.round(era5State.stats.shieldMax ?? 1));
  let era5Oxygen = Math.max(0, era5State.stats.toolMeterMax || era5State.stats.oxygenMax || 0);
  let era5OxygenDamageTimer = 0;
  let era5WeaponCooldownMs = 0;
  let era5ToolActive = false;
  let era5InventoryOpen = false;
  let era5Projectiles = [];
  let windGlideUsedThisRun = false;
  let windGlideActiveMs = 0;
  let goalCarryStartPos = null;
  let goalCarryEndPos = null;
  let goalCarryStartScale = null;
  let goalCarryEndScale = null;
  let fruitMazeSnapshot = null;
  let pongSnapshot = null;
  let balloonSnapshot = null;
  let activeMinigame = null;
  let prevGrounded = player.grounded;
  let prevPlayerBottomY = player.mesh.position.y - player.getCollisionHalfExtents().halfH;
  let level1FloorPenaltyCooldownMs = 0;
  let level1AirborneFromAboveFloor = false;
  let level1MaxAirborneBottomY = prevPlayerBottomY;
  let level1CoinLossAnim = null;
  let level1CoinFlyers = [];
  let level2HorseHintShown = false;
  let level1AmbientTimerMs = 6200;
  let level1AmbientBirdDelayMs = -1;
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
  window.__DADA_DEBUG__.lastRespawnAnchor = null;
  window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
  window.__DADA_DEBUG__.onesieBuffMs = 0;
  window.__DADA_DEBUG__.coinsCollected = coinsCollected;
  window.__DADA_DEBUG__.bubbleShield = {
    unlocked: !!progression.bubbleShieldUnlocked,
    usedThisRun: false,
    graceMs: 0,
  };
  window.__DADA_DEBUG__.windGlide = {
    unlocked: !!progression.windGlideUnlocked,
    usedThisRun: false,
    activeMs: 0,
  };
  window.__DADA_DEBUG__.floorTopY = currentFloorTopY;
  window.__DADA_DEBUG__.goalGate = {
    minX: goalGuardMinX,
    minBottomY: goalMinBottomY,
  };
  window.__DADA_DEBUG__.menuVisible = false;
  window.__DADA_DEBUG__.playerPos = {
    x: Number(player.mesh.position.x.toFixed(3)),
    y: Number(player.mesh.position.y.toFixed(3)),
    z: Number(player.mesh.position.z.toFixed(3)),
  };
  window.__DADA_DEBUG__.playerVelocity = { x: 0, z: 0 };
  window.__DADA_DEBUG__.playerFacingYaw = player.visual.rotation.y;
  window.__DADA_DEBUG__.playerYaw = era5PlayerYaw;
  window.__DADA_DEBUG__.yawVel = era5PlayerYawVel;
  window.__DADA_DEBUG__.cameraYaw = era5CameraYaw;
  window.__DADA_DEBUG__.cameraForward = { x: 1, z: 0 };
  window.__DADA_DEBUG__.cameraRight = { x: 0, z: 1 };
  window.__DADA_DEBUG__.playerForward = { x: 1, z: 0 };
  window.__DADA_DEBUG__.l5ProjectileCount = 0;
  window.__DADA_DEBUG__.era5ProjectileCount = 0;
  window.__DADA_DEBUG__.era5LevelState = null;
  window.__DADA_DEBUG__.musicRunning = false;
  window.__DADA_DEBUG__.actors = actorState;
  window.__DADA_DEBUG__.gameplayMeshes = isEra5Level ? getEra5GameplayMeshes().length : 0;
  window.__DADA_DEBUG__.decorMeshes = isEra5Level ? getEra5SceneStats().decorMeshes.length : 0;
  window.__DADA_DEBUG__.fadedMeshes = 0;
  window.__DADA_DEBUG__.occluderMesh = null;
  window.__DADA_DEBUG__.cameraOcclusion = null;
  window.__DADA_DEBUG__.era5VisibilityFailureReason = era5VisibilityFailureReason || null;
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
      const allowInvisible = actorState[roleName].allowInvisible === true;

      if (visibleCount === 0 && debugMode && !allowInvisible && !actorInvisibleLogged[roleName]) {
        const cause = actorState[roleName].loaded ? 'loaded_but_invisible' : 'load_failed_using_fallback';
        console.error(`[actors] ${roleName} invisible (${cause})`);
        actorInvisibleLogged[roleName] = true;
      }
      if (visibleCount > 0 || allowInvisible) {
        actorInvisibleLogged[roleName] = false;
      }

      return {
        loaded: actorState[roleName].loaded,
        usingFallback,
        reason: actorState[roleName].reason,
        worldPos: [pos.x, pos.y, pos.z],
        bboxSize: [bounds.size.x, bounds.size.y, bounds.size.z],
        visibleMeshCount: visibleCount,
        allowInvisible,
      };
    };

    window.__DADA_DEBUG__.actors = {
      player: describe('player', player.visual),
      goal: describe('goal', world.goalRoot),
    };
    window.__DADA_DEBUG__.backflip = player.getBackflipState();
  }

  function updatePlayerReadabilityLight() {
    playerRimLight.position.set(
      player.mesh.position.x - 1.45,
      player.mesh.position.y + 1.12,
      -7.1,
    );
  }

  function updateLevel2OccluderFade(dt, headPos, playerBottomY) {
    if (levelId !== 2 || !debugFlags.occlusionFade) return [];
    const hits = collectLevel2OccludingMeshes(scene, headPos, camera.position, cameraIgnoredMeshes);
    const activeIds = new Set();
    const nearGround = Number.isFinite(currentFloorTopY) && Number.isFinite(playerBottomY)
      ? playerBottomY <= (currentFloorTopY + 0.36)
      : false;

    for (const hit of hits) {
      const mesh = hit.mesh;
      activeIds.add(mesh.uniqueId);
      const stateInfo = level2OcclusionState.get(mesh.uniqueId);
      if (!stateInfo) continue;
      stateInfo.target = isLevel2GameplayMesh(mesh) ? stateInfo.baseVisibility : Math.min(stateInfo.baseVisibility, 0.12);
    }

    for (const stateInfo of level2OcclusionState.values()) {
      if (!activeIds.has(stateInfo.mesh.uniqueId)) {
        stateInfo.target = stateInfo.baseVisibility;
      }
      if (nearGround && /condowall|roompanel|window|art/i.test(stateInfo.mesh.name || '')) {
        stateInfo.target = Math.min(stateInfo.target, 0.08);
      }
      stateInfo.current = damp(stateInfo.current, stateInfo.target, 12, dt);
      stateInfo.mesh.visibility = stateInfo.current;
    }

    return hits;
  }

  function updateLevel2CameraProbe(dt, occlusionHits) {
    if (!import.meta.env.DEV || levelId !== 2) return;
    level2ProbeTimer += dt;
    if (level2ProbeTimer < 1) return;
    level2ProbeTimer = 0;

    if (!occlusionHits?.length) {
      return;
    }
    const mesh = occlusionHits[0].mesh;
    if (mesh.uniqueId === level2LoggedOccluderId) return;
    level2LoggedOccluderId = mesh.uniqueId;
    console.log('[L2 camera probe] occluders', occlusionHits.slice(0, 3).map(({ mesh: hitMesh, distance }) => {
      const bounds = hitMesh.getBoundingInfo()?.boundingBox;
      const pos = hitMesh.getAbsolutePosition();
      return {
        name: hitMesh.name,
        id: hitMesh.id,
        distance: Number(distance.toFixed(3)),
        position: [pos.x, pos.y, pos.z],
        extendSizeWorld: bounds ? [bounds.extendSizeWorld.x, bounds.extendSizeWorld.y, bounds.extendSizeWorld.z] : null,
        parentChain: describeNodeChain(hitMesh),
      };
    }));
  }

  function updateEra5DecorOcclusion(dt, focusPos, cameraPos) {
    if (!useEra5DecorOcclusion || !debugFlags.occlusionFade) return;
    const toCamera = cameraPos.subtract(focusPos);
    const rayLen = toCamera.length();
    if (rayLen <= 0.001) return;

    const rayDir = toCamera.scale(1 / rayLen);
    const ray = new BABYLON.Ray(focusPos, rayDir, rayLen);
    const activeIds = new Set();

    for (const stateInfo of era5DecorOcclusionState.values()) {
      const hit = ray.intersectsMesh(stateInfo.mesh, true);
      if (hit?.hit && hit.distance > 0.0001 && hit.distance < rayLen - 0.2) {
        activeIds.add(stateInfo.mesh.uniqueId);
      }
    }

    for (const stateInfo of era5DecorOcclusionState.values()) {
      const material = stateInfo.mesh.material;
      if (!material) continue;
      stateInfo.target = activeIds.has(stateInfo.mesh.uniqueId) ? 0.14 : 1;
      stateInfo.current = damp(stateInfo.current, stateInfo.target, 11, dt);
      material.alpha = stateInfo.baseAlpha * stateInfo.current;
    }
  }

  function getEra5EnvironmentMeshes() {
    if (!isEra5Level) return [];
    return scene.meshes.filter((mesh) => (
      mesh instanceof BABYLON.Mesh
      && mesh.metadata?.era5Env === true
    ));
  }

  function getEra5MeshSize(mesh) {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo?.()?.boundingBox;
    if (!bounds) return null;
    return {
      x: bounds.extendSizeWorld.x * 2,
      y: bounds.extendSizeWorld.y * 2,
      z: bounds.extendSizeWorld.z * 2,
    };
  }

  function getEra5MeshSurfaceArea(size) {
    if (!size) return 0;
    return Math.max(
      size.x * size.y,
      size.x * size.z,
      size.y * size.z,
    );
  }

  function isEra5LargePlaneMesh(mesh) {
    if (!(mesh instanceof BABYLON.Mesh)) return false;
    if (mesh.metadata?.era5EnvKind !== 'plane') return false;
    const size = getEra5MeshSize(mesh);
    if (!size) return false;
    const minSize = Math.min(size.x, size.y, size.z);
    return getEra5MeshSurfaceArea(size) >= 60 && minSize <= 1.4;
  }

  function rememberEra5VisionMeshState(mesh) {
    const existing = era5VisionMeshState.get(mesh.uniqueId);
    if (existing) return existing;
    const material = mesh.material;
    const original = {
      enabled: mesh.isEnabled(),
      isVisible: mesh.isVisible !== false,
      visibility: typeof mesh.visibility === 'number' ? mesh.visibility : 1,
      showBoundingBox: !!mesh.showBoundingBox,
      alpha: material && typeof material.alpha === 'number' ? material.alpha : null,
    };
    era5VisionMeshState.set(mesh.uniqueId, original);
    return original;
  }

  function getMeshViewFacing(mesh) {
    if (!(mesh instanceof BABYLON.Mesh)) return null;
    const absolutePos = mesh.getAbsolutePosition();
    const toCamera = camera.position.subtract(absolutePos);
    if (toCamera.lengthSquared() <= 0.0001) return 1;
    const normal = mesh.getDirection(BABYLON.Axis.Z);
    if (normal.lengthSquared() <= 0.0001) return null;
    return Math.abs(BABYLON.Vector3.Dot(normal.normalize(), toCamera.normalize()));
  }

  function summarizeEra5Mesh(mesh) {
    const size = getEra5MeshSize(mesh);
    const material = mesh.material;
    return {
      name: mesh.name || mesh.id || 'mesh',
      parentChain: describeNodeChain(mesh),
      position: vectorToArray(mesh.getAbsolutePosition()),
      rotation: vectorToArray(mesh.rotation),
      size: size ? {
        x: roundNumber(size.x),
        y: roundNumber(size.y),
        z: roundNumber(size.z),
      } : null,
      viewFacing: roundNumber(getMeshViewFacing(mesh)),
      isEnabled: mesh.isEnabled(),
      isVisible: mesh.isVisible !== false,
      visibility: roundNumber(mesh.visibility ?? 1),
      isPickable: !!mesh.isPickable,
      renderingGroupId: mesh.renderingGroupId ?? 0,
      cameraIgnore: mesh.metadata?.cameraIgnore === true,
      materialAlpha: material && typeof material.alpha === 'number' ? roundNumber(material.alpha) : null,
      materialType: material?.getClassName?.() || material?.constructor?.name || null,
      transparencyMode: material?.transparencyMode ?? null,
      era5EnvKind: mesh.metadata?.era5EnvKind || null,
      gameplay: mesh.metadata?.gameplay === true,
      hazard: mesh.metadata?.hazard === true,
    };
  }

  function applyEra5VisionState() {
    if (!isEra5Level) return;
    scene.fogMode = era5VisionState.disableFog ? BABYLON.Scene.FOGMODE_NONE : era5VisionOriginalScene.fogMode;
    scene.fogStart = era5VisionOriginalScene.fogStart;
    scene.fogEnd = era5VisionOriginalScene.fogEnd;
    scene.fogDensity = era5VisionOriginalScene.fogDensity;
    scene.postProcessesEnabled = era5VisionState.disablePostFx
      ? false
      : era5VisionOriginalScene.postProcessesEnabled;
    if (scene.imageProcessingConfiguration && era5VisionOriginalScene.imageProcessingEnabled !== null) {
      scene.imageProcessingConfiguration.isEnabled = era5VisionState.disablePostFx
        ? false
        : era5VisionOriginalScene.imageProcessingEnabled;
    }
    if (scene.imageProcessingConfiguration && era5VisionOriginalScene.imageProcessingByPostProcess !== null) {
      scene.imageProcessingConfiguration.applyByPostProcess = era5VisionState.disablePostFx
        ? false
        : era5VisionOriginalScene.imageProcessingByPostProcess;
    }

    for (const mesh of getEra5EnvironmentMeshes()) {
      const original = rememberEra5VisionMeshState(mesh);
      mesh.setEnabled(original.enabled);
      mesh.isVisible = original.isVisible;
      mesh.visibility = original.visibility;
      mesh.showBoundingBox = era5VisionState.showBounds ? true : original.showBoundingBox;
      if (mesh.material && typeof original.alpha === 'number') {
        mesh.material.alpha = original.alpha;
      }
      if (era5VisionState.forceEnvironmentVisible) {
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.visibility = 1;
        if (mesh.material && Object.prototype.hasOwnProperty.call(mesh.material, 'alpha')) {
          mesh.material.alpha = 1;
        }
      }
      if (era5VisionState.hideLargePlanes && isEra5LargePlaneMesh(mesh)) {
        mesh.setEnabled(false);
      }
    }
  }

  function era5VisionReport({ limit = 12 } = {}) {
    if (!isEra5Level) return null;
    const envMeshes = getEra5EnvironmentMeshes();
    const largestEnvironmentMeshes = envMeshes
      .map((mesh) => ({
        mesh,
        surfaceArea: getEra5MeshSurfaceArea(getEra5MeshSize(mesh)),
      }))
      .sort((a, b) => b.surfaceArea - a.surfaceArea)
      .slice(0, Math.max(1, limit))
      .map(({ mesh }) => summarizeEra5Mesh(mesh));
    const largePlanes = envMeshes
      .filter((mesh) => isEra5LargePlaneMesh(mesh))
      .slice(0, 10)
      .map((mesh) => summarizeEra5Mesh(mesh));
    const report = {
      levelId,
      sceneKey: window.__DADA_DEBUG__?.sceneKey || null,
      camera: {
        position: vectorToArray(camera.position),
        target: vectorToArray(camera.getTarget()),
        minZ: roundNumber(camera.minZ),
        maxZ: roundNumber(camera.maxZ),
        fov: roundNumber(camera.fov),
      },
      fog: {
        mode: scene.fogMode,
        start: roundNumber(scene.fogStart),
        end: roundNumber(scene.fogEnd),
        density: roundNumber(scene.fogDensity),
        clearColor: color4ToArray(scene.clearColor),
        fogColor: color3ToArray(scene.fogColor),
      },
      counts: {
        enabledMeshes: scene.meshes.filter((mesh) => mesh instanceof BABYLON.Mesh && mesh.isEnabled()).length,
        gameplayMeshes: getEra5SceneStats().gameplayMeshes.length,
        envMeshes: envMeshes.length,
        fadedMeshes: getEra5SceneStats().fadedMeshes,
      },
      occluderMesh: era5CurrentOccluderName,
      occlusion: era5CurrentOcclusionInfo ? {
        desiredDistance: roundNumber(era5CurrentOcclusionInfo.desiredDistance),
        pickDistance: roundNumber(era5CurrentOcclusionInfo.pickDistance),
        entryDistance: roundNumber(era5CurrentOcclusionInfo.entryDistance),
        safeDistance: roundNumber(era5CurrentOcclusionInfo.safeDistance),
        correctedInsidePickedBounds: !!era5CurrentOcclusionInfo.correctedInsidePickedBounds,
        usedEntryClamp: !!era5CurrentOcclusionInfo.usedEntryClamp,
      } : null,
      debugView: { ...era5VisionState },
      largestEnvironmentMeshes,
      largePlanes,
    };
    console.log('[Era5VisionReport]', report);
    return report;
  }

  if (debugMode && isEra5Level) {
    window.__DADA_DEBUG__.era5VisionReport = era5VisionReport;
    window.__DADA_DEBUG__.era5GetDebugView = () => ({ ...era5VisionState });
    window.__DADA_DEBUG__.era5SetDebugView = (patch = {}) => {
      Object.assign(era5VisionState, {
        disableFog: !!patch.disableFog,
        disablePostFx: !!patch.disablePostFx,
        showBounds: !!patch.showBounds,
        hideLargePlanes: !!patch.hideLargePlanes,
        forceEnvironmentVisible: !!patch.forceEnvironmentVisible,
      });
      applyEra5VisionState();
      return era5VisionReport();
    };
    window.__DADA_DEBUG__.era5ResetDebugView = () => {
      Object.assign(era5VisionState, {
        disableFog: false,
        disablePostFx: false,
        showBounds: false,
        hideLargePlanes: false,
        forceEnvironmentVisible: false,
      });
      applyEra5VisionState();
      return era5VisionReport();
    };
    if (era5VisionQuery.enabled) {
      Object.assign(era5VisionState, {
        disableFog: !!era5VisionQuery.disableFog,
        disablePostFx: !!era5VisionQuery.disablePostFx,
        showBounds: !!era5VisionQuery.showBounds,
        hideLargePlanes: !!era5VisionQuery.hideLargePlanes,
        forceEnvironmentVisible: !!era5VisionQuery.forceEnvironmentVisible,
      });
      applyEra5VisionState();
      era5VisionReport();
    }
  }

  function applyCapeVisualState() {
    player.setCapeVisible(!!progression.capeUnlocked && !capeSuppressedThisRun);
  }

  function getEquippedEra5ToolDef() {
    const toolInstance = era5State.inventory.find((item) => item.instanceId === era5State.equipped?.tool);
    return getItemDef(toolInstance?.defId);
  }

  function getEquippedEra5WeaponDef() {
    const weaponInstance = era5State.inventory.find((item) => item.instanceId === era5State.equipped?.weaponPrimary);
    return getItemDef(weaponInstance?.defId);
  }

  function getEra5MeterMax(toolDef = getEquippedEra5ToolDef()) {
    if (!toolDef) return 0;
    if (toolDef.defId === 'scuba_tank') return Math.max(0, era5State.stats.oxygenMax ?? 0);
    return Math.max(0, era5State.stats.toolMeterMax ?? 0);
  }

  function getEra5ToolHelpText(toolDef = getEquippedEra5ToolDef()) {
    const toolId = toolDef?.defId || '';
    if (toolId === 'camp_lantern') return 'Camp Lantern boost: E';
    if (toolId === 'lantern') return 'Lantern reveal / boost: E';
    if (toolId === 'kite_rig') return 'Hold Jump in air to glide';
    if (toolId === 'conveyor_boots') return 'Conveyor Boots traction: passive';
    return 'Scuba Tank: Space ascend, C descend in deep pockets';
  }

  function getEra5WeaponHelpText(weaponDef = getEquippedEra5WeaponDef()) {
    const weaponId = weaponDef?.defId || '';
    if (weaponId === 'paper_fan') return 'Fire Paper Fan: F / Ctrl / Enter / Click';
    if (weaponId === 'bookmark_boomerang') return 'Throw Bookmark Boomerang: F / Ctrl / Enter / Click';
    if (weaponId === 'kite_string_whip') return 'Crack Kite String Whip: F / Ctrl / Enter / Click';
    if (weaponId === 'foam_blaster') return 'Fire Foam Blaster: F / Ctrl / Enter / Click';
    return 'Fire Bubble Wand: F / Ctrl / Enter / Click';
  }

  function updateBuffHud() {
    let onesiePhase = 'IDLE';
    let onesieDisplayMs = 0;
    let onesieDisplayTotal = onesieMaxDurationMs;
    if (onesieCollectedThisRun) {
      if (onesieBuffTimerMs > 0) {
        onesiePhase = 'ACTIVE';
        onesieDisplayMs = onesieBuffTimerMs;
        onesieDisplayTotal = onesieMaxDurationMs;
      } else {
        onesiePhase = 'RECHARGING';
        onesieDisplayMs = onesieRechargeMs;
        onesieDisplayTotal = ONESIE_RECHARGE_DURATION_MS;
      }
    }
    ui.updateBuff(onesieDisplayMs, onesieDisplayTotal, onesiePhase);
    ui.updateDoubleJumpCue(player.hasAirJumpAvailable() && onesieBuffTimerMs > 0);
    ui.updateCapeBuff({
      unlocked: !!progression.capeUnlocked && !capeSuppressedThisRun,
      active: player.isCapeFloating(),
      remainingMs: player.getCapeFloatRemainingMs(),
      totalMs: CAPE_FLOAT_DURATION_MS,
      used: capeUsedThisRun || capeSuppressedThisRun,
    });
    ui.updateBubbleShieldBuff({
      unlocked: !!progression.bubbleShieldUnlocked,
      used: bubbleShieldUsedThisRun,
    });
    ui.updateWindGlideBuff({
      unlocked: !!progression.windGlideUnlocked,
      used: windGlideUsedThisRun,
      active: windGlideActiveMs > 0,
      remainingMs: windGlideActiveMs,
      totalMs: WIND_GLIDE_DURATION_MS,
    });
    ui.updateFlourPuff({
      visible: levelId === 4,
      remainingMs: flourPuffCooldownMs,
      totalMs: world.flourPuff?.cooldownMs ?? 6000,
    });
    window.__DADA_DEBUG__.bubbleShield = {
      unlocked: !!progression.bubbleShieldUnlocked,
      usedThisRun: bubbleShieldUsedThisRun,
      graceMs: Math.round(bubbleShieldGraceMs),
    };
    window.__DADA_DEBUG__.windGlide = {
      unlocked: !!progression.windGlideUnlocked,
      usedThisRun: windGlideUsedThisRun,
      activeMs: Math.round(windGlideActiveMs),
    };
  }

  function restoreEra5Vitals() {
    era5Hp = Math.max(1, Math.round(era5State.stats.hpMax ?? 3));
    era5Shield = Math.max(0, Math.round(era5State.stats.shieldMax ?? 1));
    era5Oxygen = Math.max(0, getEra5MeterMax());
    era5OxygenDamageTimer = 0;
    era5WeaponCooldownMs = 0;
    era5ToolActive = false;
  }

  function syncEra5Ui() {
    if (!isEra5Level) return;
    const toolDef = getEquippedEra5ToolDef();
    const weaponDef = getEquippedEra5WeaponDef();
    const meterMax = getEra5MeterMax(toolDef);
    const inventoryHint = [
      era5InventoryOpen ? 'I Close' : 'I Inventory',
      progression.windGlideUnlocked ? 'G Wind Glide' : '',
    ].filter(Boolean).join(' • ');
    ui.updateEra5Hud({
      hp: era5Hp,
      hpMax: Math.round(era5State.stats.hpMax ?? 3),
      shield: era5Shield,
      shieldMax: Math.round(era5State.stats.shieldMax ?? 1),
      oxygen: era5Oxygen,
      oxygenMax: meterMax,
      toolLabel: toolDef?.name || 'No Tool',
      weaponLabel: weaponDef?.name || 'No Weapon',
      weaponCooldownMs: era5WeaponCooldownMs,
      weaponCooldownMaxMs: Math.max(1, (era5State.stats.weaponCooldown ?? 0.35) * 1000),
      inventoryHint,
      weaponHelp: getEra5WeaponHelpText(weaponDef),
      toolHelp: getEra5ToolHelpText(toolDef),
    });
    window.__DADA_DEBUG__.era5Vitals = {
      hp: era5Hp,
      shield: era5Shield,
      oxygen: Number(era5Oxygen.toFixed(2)),
      oxygenMax: meterMax,
      weaponCooldownMs: Math.round(era5WeaponCooldownMs),
      inventoryOpen: era5InventoryOpen,
      toolActive: era5ToolActive,
    };
  }

  function persistEra5State(nextEra5State) {
    const updated = {
      ...progression,
      era5: {
        ...nextEra5State,
        stats: deriveEra5Stats(nextEra5State),
      },
    };
    persistProgressState(updated);
  }

  function equipEra5Item(instanceId) {
    const instance = era5State.inventory.find((item) => item.instanceId === instanceId);
    const def = getItemDef(instance?.defId);
    if (!instance || !def?.slot) return false;
    const nextEra5 = cloneEra5State();
    nextEra5.equipped[def.slot] = instanceId;
    nextEra5.stats = deriveEra5Stats(nextEra5);
    persistEra5State(nextEra5);
    restoreEra5Vitals();
    syncEra5Ui();
    return true;
  }

  function unequipEra5Slot(slotId) {
    if (!slotId || !era5State.equipped?.[slotId]) return false;
    const nextEra5 = cloneEra5State();
    nextEra5.equipped[slotId] = null;
    nextEra5.stats = deriveEra5Stats(nextEra5);
    persistEra5State(nextEra5);
    restoreEra5Vitals();
    syncEra5Ui();
    return true;
  }

  function openEra5Inventory() {
    if (!isEra5Level || state !== 'gameplay') return false;
    era5InventoryOpen = true;
    state = 'inventory';
    input.consumeAll();
    ui.showEra5Inventory();
    syncEra5Ui();
    return true;
  }

  function closeEra5Inventory() {
    if (!isEra5Level || state !== 'inventory') return false;
    era5InventoryOpen = false;
    state = 'gameplay';
    input.consumeAll();
    ui.hideEra5Inventory();
    syncEra5Ui();
    return true;
  }

  function toggleEra5Inventory() {
    if (!isEra5Level) return false;
    if (state === 'inventory') return closeEra5Inventory();
    return openEra5Inventory();
  }

  function refillEra5Oxygen(amountSec) {
    if (!isEra5Level) return;
    era5Oxygen = Math.min(getEra5MeterMax(), era5Oxygen + amountSec);
    syncEra5Ui();
  }

  function toggleEra5Tool() {
    if (!isEra5Level || state !== 'gameplay') return false;
    const toolDef = getEquippedEra5ToolDef();
    if (!toolDef) return false;
    if (toolDef.defId === 'lantern' || toolDef.defId === 'camp_lantern') {
      era5ToolActive = !era5ToolActive;
      ui.showStatus(era5ToolActive ? `${toolDef.name} on` : `${toolDef.name} off`, 650);
      syncEra5Ui();
      return true;
    }
    return false;
  }

  function useWindGlide() {
    if (!isEra5Level || state !== 'gameplay' || !progression.windGlideUnlocked || windGlideUsedThisRun) return false;
    if (player.grounded || !player.canTriggerAirFlip()) return false;
    windGlideUsedThisRun = true;
    windGlideActiveMs = WIND_GLIDE_DURATION_MS;
    player.capeFloatTimerMs = Math.max(player.capeFloatTimerMs, 140);
    player.vy = Math.max(player.vy, -1.4);
    ui.showStatus('Wind Glide!', 850);
    updateBuffHud();
    syncEra5Ui();
    return true;
  }

  function prepareEra5ToolMotion(dt, { jumpHeld = false } = {}) {
    if (!isEra5Level) return;
    const toolDef = getEquippedEra5ToolDef();
    const meterMax = getEra5MeterMax(toolDef);
    const toolId = toolDef?.defId || '';
    if (windGlideActiveMs > 0) {
      windGlideActiveMs = Math.max(0, windGlideActiveMs - (dt * 1000));
      player.capeFloatTimerMs = Math.max(player.capeFloatTimerMs, 140);
      player.vy = Math.max(player.vy, -1.2);
    }
    if (meterMax <= 0) {
      era5Oxygen = 0;
      era5ToolActive = false;
      return;
    }
    if (toolId === 'kite_rig') {
      if (player.grounded) {
        era5Oxygen = Math.min(meterMax, era5Oxygen + ((era5State.stats.toolMeterRefillRate ?? 0) * dt));
      } else if (jumpHeld && era5Oxygen > 0.001) {
        player.capeFloatTimerMs = Math.max(player.capeFloatTimerMs, 110);
        player.vy = Math.max(player.vy, -2.0 * Math.max(0.3, era5State.stats.glideFallSpeed ?? 0.34));
        era5Oxygen = Math.max(0, era5Oxygen - ((era5State.stats.toolMeterDrainRate ?? 1) * dt));
      }
      return;
    }
    if (toolId === 'lantern' || toolId === 'camp_lantern') {
      if (era5ToolActive && era5Oxygen > 0.001) {
        era5Oxygen = Math.max(0, era5Oxygen - ((era5State.stats.toolMeterDrainRate ?? 1) * dt));
        if (era5Oxygen <= 0.001) {
          era5ToolActive = false;
        }
      } else {
        era5Oxygen = Math.min(meterMax, era5Oxygen + ((era5State.stats.toolMeterRefillRate ?? 0) * dt));
      }
      return;
    }
    if (toolId !== 'scuba_tank') {
      era5Oxygen = meterMax;
    }
  }

  function getEra5CameraForward() {
    return getYawForwardXZ(era5CameraYaw).normalize();
  }

  function getEra5CameraRight() {
    return getYawRightXZ(era5CameraYaw).normalize();
  }

  function getEra5PlayerForward() {
    return getYawForwardXZ(era5PlayerYaw).normalize();
  }

  function getEra5PlayerRight() {
    return getYawRightXZ(era5PlayerYaw).normalize();
  }

  function getLevel5StarterRoomCameraClampBounds() {
    if (!isEra5Level || levelId !== 5) return null;
    const topology = world?.era5Level?.getTopologyReport?.() ?? null;
    if (topology?.mapId !== 'level5-room-reset') return null;
    const starterRoom = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    if (!starterRoom || !Number.isFinite(starterRoom.x) || !Number.isFinite(starterRoom.z) || !Number.isFinite(starterRoom.w) || !Number.isFinite(starterRoom.d)) {
      return null;
    }
    return {
      minX: (starterRoom.x - (starterRoom.w * 0.5)) + 0.08,
      maxX: (starterRoom.x + (starterRoom.w * 0.5)) - 0.08,
      minZ: (starterRoom.z - (starterRoom.d * 0.5)) + 0.08,
      maxZ: (starterRoom.z + (starterRoom.d * 0.5)) - 0.08,
    };
  }

  function constrainEra5CameraToStarterRoom(position) {
    const bounds = getLevel5StarterRoomCameraClampBounds();
    if (!bounds || !(position instanceof BABYLON.Vector3)) return position;
    return new BABYLON.Vector3(
      clamp(position.x, bounds.minX, bounds.maxX),
      position.y,
      clamp(position.z, bounds.minZ, bounds.maxZ),
    );
  }

  function applyEra5FacingState() {
    if (!isEra5Level) return;
    player.visual.rotation.y = era5PlayerYaw + Math.PI;
    player.setEra5YawState(era5PlayerYaw, era5PlayerYawVel);
  }

  function getEra5ProjectileLaunchState() {
    const forward = getEra5PlayerForward();
    const preset = getEra5CameraPreset();
    const cameraTarget = camera?.getTarget?.() ?? null;
    const { halfH, halfD } = player.getCollisionHalfExtents();
    const floorTopY = player.mesh.position.y - halfH;
    const muzzleForward = Math.max(1.18, halfD + 0.94);
    const muzzleHeight = Math.max(
      floorTopY + 1.62,
      player.mesh.position.y + 1.32,
      (cameraTarget?.y ?? (player.mesh.position.y + 1.16)) + 0.52,
    );
    const origin = new BABYLON.Vector3(
      player.mesh.position.x + (forward.x * muzzleForward),
      muzzleHeight,
      player.mesh.position.z + (forward.z * muzzleForward),
    );
    const aimLead = Math.max(2.05, (preset?.lookAhead ?? 2.2) + 0.28);
    const aimTarget = cameraTarget
      ? new BABYLON.Vector3(
        cameraTarget.x + (forward.x * aimLead),
        Math.max(muzzleHeight + 0.74, cameraTarget.y + 1.12),
        cameraTarget.z + (forward.z * aimLead),
      )
      : new BABYLON.Vector3(
        origin.x + (forward.x * aimLead),
        muzzleHeight + 0.82,
        origin.z + (forward.z * aimLead),
      );
    const direction = aimTarget.subtract(origin);
    if (direction.lengthSquared() <= 0.0001) {
      direction.copyFromFloats(forward.x, 0.08, forward.z);
    }
    direction.normalize();
    return {
      origin,
      direction,
      forward,
      aimTarget,
      floorTopY,
    };
  }

  function spawnEra5Projectile(position, direction) {
    const projectile = BABYLON.MeshBuilder.CreateSphere(`era5Bubble_${performance.now().toFixed(0)}`, {
      diameter: 0.24,
      segments: 6,
    }, scene);
    projectile.position.copyFrom(position);
    const mat = new BABYLON.StandardMaterial(`${projectile.name}_mat`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.76, 0.98, 1.0);
    mat.emissiveColor = new BABYLON.Color3(0.12, 0.24, 0.30);
    mat.alpha = 0.76;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.needDepthPrePass = true;
    mat.forceDepthWrite = true;
    mat.backFaceCulling = false;
    projectile.material = mat;
    projectile.renderingGroupId = 3;
    projectile.alphaIndex = 1000;
    projectile.alwaysSelectAsActiveMesh = true;
    projectile.checkCollisions = false;
    projectile.isPickable = false;
    projectile.metadata = { cameraIgnore: true, decor: true };
    const projectileState = {
      mesh: projectile,
      position: projectile.position,
      velocity: direction.scale(era5State.stats.weaponProjectileSpeed ?? 11.5),
      radius: 0.26,
      lifeMs: Math.max(400, (era5State.stats.weaponProjectileLife ?? 1.6) * 1000),
      stunMs: Math.max(200, (era5State.stats.weaponStunSec ?? 1.5) * 1000),
      mode: 'projectile',
      weaponId: getEquippedEra5WeaponDef()?.defId || 'bubble_wand',
      returning: false,
      returnSpeed: Math.max(0, era5State.stats.weaponReturnSpeed ?? 0),
      origin: position.clone(),
    };
    era5Projectiles.push(projectileState);
    return projectileState;
  }

  function fireEra5Weapon() {
    if (!isEra5Level || state !== 'gameplay' || era5WeaponCooldownMs > 0) return false;
    const weaponDef = getEquippedEra5WeaponDef();
    if (!weaponDef) return false;
    const launchState = getEra5ProjectileLaunchState();
    const { forward } = launchState;
    if (weaponDef.defId === 'kite_string_whip') {
      const hitResult = world.era5Level?.tryHitByWeapon?.({
        mode: 'arc',
        position: player.mesh.position.add(new BABYLON.Vector3(forward.x * 1.1, 0.7, forward.z * 1.1)),
        direction: forward,
        radius: Math.max(1.8, era5State.stats.weaponArcRange ?? 2.2),
        stunMs: Math.max(400, (era5State.stats.weaponStunSec ?? 1.0) * 1000),
      }) ?? { hit: false };
      if (hitResult.hit) {
        audio.playCue(levelId, 'nearMiss');
        ui.showStatus('Spark stunned!', 550);
      }
    } else {
      const projectile = spawnEra5Projectile(launchState.origin, launchState.direction);
      if (projectile) {
        projectile.weaponId = weaponDef.defId;
        if (weaponDef.defId === 'foam_blaster') {
          projectile.mesh.scaling.setAll(0.82);
          projectile.radius = 0.32;
        } else if (weaponDef.defId === 'bookmark_boomerang') {
          projectile.mesh.scaling.setAll(1.08);
          projectile.returning = true;
          projectile.returnSpeed = Math.max(8, era5State.stats.weaponReturnSpeed ?? 10.5);
        } else if (weaponDef.defId === 'paper_fan') {
          projectile.mesh.scaling.setAll(0.94);
          projectile.radius = 0.44;
        }
      }
    }
    era5WeaponCooldownMs = Math.max(100, (era5State.stats.weaponCooldown ?? 0.35) * 1000);
    ui.showStatus(weaponDef.name, 450);
    syncEra5Ui();
    return true;
  }

  function describeEra5DamageSource(source) {
    const key = String(source || 'hazard').toLowerCase();
    const enemySources = new Set([
      'jellyfish',
      'spark_sprite',
      'windup_toy',
      'paper_bird',
      'origami_crane',
      'origami_fox',
      'origami_frog',
    ]);
    const waterSources = new Set(['oxygen', 'water']);
    const labels = {
      jellyfish: 'Jellyfish',
      eel_rail: 'Eel rail',
      shark_shadow: 'Shark sweep',
      oxygen: 'Oxygen',
      spark_sprite: 'Spark sprite',
      windup_toy: 'Wind-up toy',
      paper_bird: 'Paper bird',
      origami_crane: 'Origami crane',
      origami_fox: 'Origami fox',
      origami_frog: 'Origami frog',
      lightning: 'Lightning',
      ink: 'Ink',
      press: 'Stamp press',
      tripline: 'Lantern line',
      ember: 'Ember pocket',
      puppet_sweep: 'Shadow sweep',
      line: 'Sweep line',
      hazard: 'Hazard',
    };
    const label = labels[key] || key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (enemySources.has(key)) {
      return { category: 'enemy', tone: 'enemy', label };
    }
    if (waterSources.has(key)) {
      return { category: 'water', tone: 'water', label };
    }
    return { category: 'hazard', tone: 'hazard', label };
  }

  function applyEra5Damage(source, hitDirection = { x: 1, z: 0 }, options = {}) {
    if (!isEra5Level || state !== 'gameplay' || respawnState) return false;
    if (player.isInvulnerable()) return false;
    const descriptor = describeEra5DamageSource(source);
    const invulnMs = Number.isFinite(options?.invulnMs) ? options.invulnMs : 1000;
    const resist = clamp(options?.resist ?? 0, 0, 0.4);
    const knockbackScale = 1 - (resist * 0.7);
    const directionX = Number.isFinite(hitDirection?.x) ? hitDirection.x : 1;
    const directionZ = Number.isFinite(hitDirection?.z) ? hitDirection.z : 0;
    const impactDirection = { x: directionX, z: directionZ };
    let shieldAbsorbed = false;
    if (era5Shield > 0) {
      shieldAbsorbed = true;
      era5Shield = Math.max(0, era5Shield - 1);
      player.applyHit({
        direction: directionX,
        directionZ,
        knockback: 3.4 * knockbackScale,
        upward: 2.9 * knockbackScale,
        invulnMs: 600,
      });
      ui.showStatus(`${descriptor.label} hit shield!`, 1200, { tone: descriptor.tone });
      juiceFx.spawnImpactBurst(player.mesh.position, {
        kind: descriptor.category,
        direction: impactDirection,
      });
    } else {
      era5Hp = Math.max(0, era5Hp - 1);
      player.applyHit({
        direction: directionX,
        directionZ,
        knockback: 4.0 * knockbackScale,
        upward: 3.4 * knockbackScale,
        invulnMs,
      });
      ui.showStatus(`${descriptor.label} hit!`, 1200, { tone: descriptor.tone });
      juiceFx.spawnImpactBurst(player.mesh.position, {
        kind: descriptor.category,
        direction: impactDirection,
      });
      if (era5Hp <= 0) {
        era5LastDamageEvent = {
          source,
          category: descriptor.category,
          label: descriptor.label,
          shielded: false,
          hp: era5Hp,
          shield: era5Shield,
          timeMs: performance.now(),
        };
        restoreEra5Vitals();
        triggerReset(`${source}_defeat`, directionX >= 0 ? 1 : -1);
        return true;
      }
    }
    era5LastDamageEvent = {
      source,
      category: descriptor.category,
      label: descriptor.label,
      shielded: shieldAbsorbed,
      hp: era5Hp,
      shield: era5Shield,
      timeMs: performance.now(),
    };
    audio.playCue(levelId, 'collision');
    syncEra5Ui();
    return true;
  }

  function resolveEra5ProjectileHit(projectile, samplePosition = projectile.mesh.position) {
    const sharedHitResult = world.era5Level?.tryHitByWeapon?.({
      mode: projectile.mode,
      position: samplePosition,
      direction: projectile.velocity.clone(),
      radius: projectile.radius,
      stunMs: projectile.stunMs,
      weaponId: projectile.weaponId,
    }) ?? null;
    const level5HitResult = world.level5?.tryHitByBubble?.({
      position: samplePosition,
      radius: projectile.radius,
      stunMs: projectile.stunMs,
    }) ?? null;
    return sharedHitResult?.hit
      ? sharedHitResult
      : level5HitResult?.hit
        ? level5HitResult
        : sharedHitResult
          ?? level5HitResult
          ?? { hit: false };
  }

  function updateEra5Projectiles(dt) {
    if (!isEra5Level || !era5Projectiles.length) return;
    for (let i = era5Projectiles.length - 1; i >= 0; i--) {
      const projectile = era5Projectiles[i];
      projectile.lifeMs = Math.max(0, projectile.lifeMs - (dt * 1000));
      if (projectile.returning && projectile.lifeMs < Math.max(350, (era5State.stats.weaponProjectileLife ?? 1.6) * 500)) {
        const toPlayer = player.mesh.position.add(new BABYLON.Vector3(0, 0.6, 0)).subtract(projectile.mesh.position);
        if (toPlayer.lengthSquared() > 0.001) {
          toPlayer.normalize();
          projectile.velocity = BABYLON.Vector3.Lerp(projectile.velocity, toPlayer.scale(projectile.returnSpeed), Math.min(1, dt * 3.2));
        }
      }
      const previousPos = projectile.mesh.position.clone();
      projectile.mesh.position.addInPlace(projectile.velocity.scale(dt));
      projectile.mesh.position.y += dt * 0.24;
      const scale = 0.94 + ((projectile.lifeMs / Math.max(1, (era5State.stats.weaponProjectileLife ?? 1.6) * 1000)) * 0.16);
      projectile.mesh.scaling.set(scale, scale, scale);
      const travelDistance = BABYLON.Vector3.Distance(previousPos, projectile.mesh.position);
      const hitStepCount = Math.max(1, Math.min(10, Math.ceil(travelDistance / 0.42)));
      let hitResult = { hit: false };
      for (let step = 1; step <= hitStepCount; step += 1) {
        const t = step / hitStepCount;
        const samplePosition = BABYLON.Vector3.Lerp(previousPos, projectile.mesh.position, t);
        hitResult = resolveEra5ProjectileHit(projectile, samplePosition);
        if (hitResult.hit) break;
      }
      if (hitResult.hit) {
        audio.playCue(levelId, 'nearMiss');
        ui.showStatus('Target stunned!', 600);
        projectile.mesh.dispose();
        era5Projectiles.splice(i, 1);
        continue;
      }
      if (projectile.lifeMs <= 0) {
        projectile.mesh.dispose();
        era5Projectiles.splice(i, 1);
      }
    }
  }

  function updateEra5Oxygen(dt) {
    if (!isEra5Level) return;
    const toolDef = getEquippedEra5ToolDef();
    const toolId = toolDef?.defId || '';
    const oxygenMax = Math.max(0, getEra5MeterMax(toolDef));
    if (oxygenMax <= 0) {
      era5Oxygen = 0;
      era5OxygenDamageTimer = 0;
      return;
    }
    if (toolId !== 'scuba_tank') {
      era5OxygenDamageTimer = 0;
      return;
    }
    const inDeepWater = !!world.level5?.isInDeepWater?.(player.mesh.position) || !!world.era5Level?.isInDeepWater?.(player.mesh.position);
    if (inDeepWater) {
      const drainScale = Math.max(0.35, 1 - (era5State.stats.waterResist ?? 0));
      const drainPerSec = Math.max(0.1, era5State.stats.oxygenDrainRate ?? 1) * drainScale;
      era5Oxygen = Math.max(0, era5Oxygen - (drainPerSec * dt));
      if (era5Oxygen <= 0.001) {
        era5OxygenDamageTimer += dt;
        const interval = Math.max(0.5, era5State.stats.oxygenDamageInterval ?? 2);
        if (era5OxygenDamageTimer >= interval) {
          era5OxygenDamageTimer = Math.max(0, era5OxygenDamageTimer - interval);
          applyEra5Damage('oxygen', { x: 0, z: 0 }, { invulnMs: 850, element: 'water', resist: era5State.stats.waterResist ?? 0 });
        }
      } else {
        era5OxygenDamageTimer = 0;
      }
      return;
    }
    const refillPerSec = Math.max(0, era5State.stats.oxygenRefillRate ?? 0);
    era5Oxygen = Math.min(oxygenMax, era5Oxygen + (refillPerSec * dt));
    era5OxygenDamageTimer = 0;
  }
  ui.setEra5InventoryHandlers({
    onEquip: (instanceId) => equipEra5Item(instanceId),
    onUnequip: (slotId) => unequipEra5Slot(slotId),
    onClose: () => closeEra5Inventory(),
  });

  function persistProgressState(nextState) {
    syncProgressState(nextState);
    syncEra5RuntimeState();
    saveProgress(progression, levelTotals);
  }

  function maybeShowUnlockBanner(title, subtitle, key, durationMs) {
    ui.showBanner(title, subtitle, durationMs);
    if (!progression.unlocksShown?.[key]) {
      persistProgressState(markUnlockShown(progression, key, levelTotals));
    }
  }

  function grantEra5Item(defId, {
    autoEquip = true,
    title = '',
    subtitle = '',
  } = {}) {
    if (!isEra5Level || !defId) return false;
    const nextSeed = 1000 + (era5State.inventory?.length || 0) + levelId;
    const result = addItemToEra5State(era5State, defId, {
      seed: nextSeed,
      autoEquip,
    });
    if (!result.instance) return false;
    if (result.added) {
      persistEra5State(result.state);
      ui.showToast({
        id: `era5-item-${defId}`,
        title: title || getItemDef(defId)?.name || defId,
        bgColor: '#245c82',
        durationMs: 2500,
      });
      if (subtitle) {
        ui.showStatus(subtitle, 1400);
      }
    } else if (autoEquip) {
      persistEra5State(result.state);
    }
    restoreEra5Vitals();
    syncEra5Ui();
    return true;
  }

  function recordPersistentBinky(coinId) {
    if (persistentCoinIds.has(coinId)) return;
    persistentCoinIds.add(coinId);
    const result = recordCollectedBinky(progression, levelId, coinId, levelTotals);
    persistProgressState(result.state);
    if (result.capeUnlockedNow && !progression.unlocksShown?.cape) {
      maybeShowUnlockBanner('BABY CAPE INSTALLED', 'Cape float unlocked for every level.', 'cape', 2600);
    }
    if (result.sourdoughUnlockedNow && !progression.unlocksShown?.sourdough) {
      maybeShowUnlockBanner('SUPER SOURDOUGH LEVEL UNLOCKED!', 'Collect all binkies to conquer the bakery dreamscape.', 'sourdough', 3000);
    }
    applyCapeVisualState();
  }

  function clearRunBuffs({ suppressCape = false, keepCapeUsage = false } = {}) {
    onesieBuffTimerMs = 0;
    onesieMaxDurationMs = 10000;
    onesieJumpBoost = 1;
    onesieStoredJumpBoost = 1.24;
    onesieCollectedThisRun = false;
    onesieRechargeMs = 0;
    player.stopCapeFloat();
    if (!keepCapeUsage) {
      capeUsedThisRun = false;
    }
    if (suppressCape) {
      capeSuppressedThisRun = true;
      capeUsedThisRun = true;
    } else if (!keepCapeUsage) {
      capeSuppressedThisRun = false;
    }
    bubbleShieldUsedThisRun = false;
    bubbleShieldGraceMs = 0;
    windGlideUsedThisRun = false;
    windGlideActiveMs = 0;
    flourPuffCooldownMs = 0;
    era5ToolActive = false;
    era5InventoryOpen = false;
    era5Projectiles.forEach((projectile) => projectile.mesh?.dispose?.());
    era5Projectiles = [];
    restoreEra5Vitals();
    applyCapeVisualState();
    updateBuffHud();
    syncEra5Ui();
  }

  function restoreOnesieOnCheckpointReset() {
    if (!onesieCollectedThisRun) return;
    onesieBuffTimerMs = onesieMaxDurationMs;
    onesieJumpBoost = onesieStoredJumpBoost;
    onesieRechargeMs = 0;
  }

  function resetBabyToNew() {
    clearRunBuffs({ suppressCape: true, keepCapeUsage: false });
    // Wipe all saved progression so unlocks and sequential level gates reset immediately.
    const cleared = clearProgress(levelTotals);
    syncProgressState(cleared);
    syncEra5RuntimeState();
    restoreEra5Vitals();
    applyCapeVisualState();
    // Also reset to spawn point for a fully clean slate
    activeCheckpointIndex = 0;
    respawnPoint = { ...spawnPoint };
    const resolved = resolveRespawnPosition(respawnPoint);
    player.spawnAt(resolved.x, resolved.y, resolved.z || 0);
    applyEra5FacingState();
    player.vx = 0;
    player.vy = 0;
    updatePlayerShadow(player);
    updatePlayerReadabilityLight();
    ui.showStatus('Baby reset to new', 900);
  }

  function captureFruitMazeSnapshot() {
    return {
      checkpointIndex: activeCheckpointIndex,
      respawnPoint: { ...respawnPoint },
      playerPos: player.mesh.position.clone(),
      coinsCollected,
      coinState: coins.map((coin) => ({ id: coin.id, collected: coin.collected })),
      pickupState: pickups.map((pickup) => ({ collected: pickup.collected })),
      onesieBuffTimerMs,
      onesieMaxDurationMs,
      onesieJumpBoost,
      onesieStoredJumpBoost,
      onesieCollectedThisRun,
      onesieRechargeMs,
      capeUsedThisRun,
      capeSuppressedThisRun,
      bubbleShieldUsedThisRun,
      bubbleShieldGraceMs,
      windGlideUsedThisRun,
      windGlideActiveMs,
      era5ToolActive,
      flourPuffCooldownMs,
    };
  }

  function restoreFruitMazeSnapshot(snapshot) {
    if (!snapshot) return;
    activeCheckpointIndex = snapshot.checkpointIndex;
    respawnPoint = { ...snapshot.respawnPoint };
    coinsCollected = snapshot.coinsCollected;
    ui.setCoins(coinsCollected);
    window.__DADA_DEBUG__.coinsCollected = coinsCollected;
    coins.forEach((coin) => {
      const saved = snapshot.coinState.find((entry) => entry.id === coin.id);
      coin.collected = !!saved?.collected;
      coin.node?.setEnabled(!coin.collected);
    });
    pickups.forEach((pickup, index) => {
      const saved = snapshot.pickupState[index];
      pickup.collected = !!saved?.collected;
      pickup.node?.setEnabled(!pickup.collected);
    });
    onesieBuffTimerMs = snapshot.onesieBuffTimerMs;
    onesieMaxDurationMs = snapshot.onesieMaxDurationMs;
    onesieJumpBoost = snapshot.onesieJumpBoost;
    onesieStoredJumpBoost = snapshot.onesieStoredJumpBoost ?? snapshot.onesieJumpBoost ?? 1.24;
    onesieCollectedThisRun = snapshot.onesieCollectedThisRun;
    onesieRechargeMs = snapshot.onesieRechargeMs ?? 0;
    capeUsedThisRun = snapshot.capeUsedThisRun;
    capeSuppressedThisRun = snapshot.capeSuppressedThisRun;
    bubbleShieldUsedThisRun = snapshot.bubbleShieldUsedThisRun ?? false;
    bubbleShieldGraceMs = snapshot.bubbleShieldGraceMs ?? 0;
    windGlideUsedThisRun = snapshot.windGlideUsedThisRun ?? false;
    windGlideActiveMs = snapshot.windGlideActiveMs ?? 0;
    era5ToolActive = snapshot.era5ToolActive ?? false;
    flourPuffCooldownMs = snapshot.flourPuffCooldownMs;
    applyCapeVisualState();
    player.spawnAt(snapshot.playerPos.x, snapshot.playerPos.y, snapshot.playerPos.z);
    applyEra5FacingState();
    player.vx = 0;
    player.vy = 0;
    updatePlayerShadow(player);
    updatePlayerReadabilityLight();
    updateBuffHud();
  }

  function capturePongSnapshot() {
    return captureFruitMazeSnapshot();
  }

  function restorePongSnapshot(snapshot) {
    restoreFruitMazeSnapshot(snapshot);
  }

  function startFruitMazeEscape() {
    if (!fruitMaze || levelId !== 1 || fruitMaze.isActive()) return;
    fruitMazeSnapshot = captureFruitMazeSnapshot();
    activeMinigame = fruitMaze;
    state = 'minigame';
    window.__DADA_DEBUG__.sceneKey = 'MinigameScene';
    player.vx = 0;
    player.vy = 0;
    audio.stopLevelMusic(0.15);
    ui.showBanner('FRUIT MAZE!', 'Collect the fruit and get back to the zoo.', 1200);
    ui.setFade(0.2);
    fruitMaze.start({
      onWin: () => {
        ui.setFade(0);
        restoreFruitMazeSnapshot(fruitMazeSnapshot);
        fruitMazeSnapshot = null;
        activeMinigame = null;
        state = 'gameplay';
        window.__DADA_DEBUG__.sceneKey = 'CribScene';
        audio.startLevelMusic(levelId, 0.2);
      },
      onAbort: () => {
        fruitMazeSnapshot = null;
        activeMinigame = null;
        restartRun('fruit_maze_abort');
        startLoadedLevelWithProgress(levelId, { unlockAudio: false });
      },
    });
  }

  function startPongEscape() {
    if (!pongMinigame || levelId !== 2 || pongMinigame.isActive()) return;
    try {
      pongSnapshot = capturePongSnapshot();
      activeMinigame = pongMinigame;
      state = 'minigame';
      window.__DADA_DEBUG__.sceneKey = 'MinigameScene';
      player.vx = 0;
      player.vy = 0;
      audio.stopLevelMusic(0.15);
      ui.showBanner('PONG PANIC!', 'Win 5 points to bounce back into the condo.', 1200);
      ui.setFade(0.16);
      pongMinigame.start({
        onWin: () => {
          ui.setFade(0);
          restorePongSnapshot(pongSnapshot);
          pongSnapshot = null;
          activeMinigame = null;
          state = 'gameplay';
          window.__DADA_DEBUG__.sceneKey = 'CribScene';
          audio.startLevelMusic(levelId, 0.2);
        },
        onAbort: () => {
          pongSnapshot = null;
          activeMinigame = null;
          restartRun('pong_abort');
          startLoadedLevelWithProgress(levelId, { unlockAudio: false });
        },
      });
    } catch (err) {
      pongSnapshot = null;
      activeMinigame = null;
      ui.setFade(0);
      reportDevError(err);
      console.error('[pong] failed to start:', err);
      restartRun('pong_init_error');
      startLoadedLevelWithProgress(levelId, { unlockAudio: false });
    }
  }

  function startBalloonRoundup() {
    if (!balloonRoundup || levelId !== 3 || balloonRoundup.isActive()) return;
    try {
      balloonSnapshot = captureFruitMazeSnapshot();
      activeMinigame = balloonRoundup;
      state = 'minigame';
      window.__DADA_DEBUG__.sceneKey = 'MinigameScene';
      player.vx = 0;
      player.vy = 0;
      audio.stopLevelMusic(0.15);
      ui.showBanner('BALLOON ROUNDUP!', 'Float up and collect all 12 balloons!', 1200);
      ui.setFade(0.18);
      balloonRoundup.start({
        onWin: () => {
          ui.setFade(0);
          restoreFruitMazeSnapshot(balloonSnapshot);
          balloonSnapshot = null;
          activeMinigame = null;
          state = 'gameplay';
          window.__DADA_DEBUG__.sceneKey = 'CribScene';
          audio.startLevelMusic(levelId, 0.2);
        },
        onAbort: () => {
          balloonSnapshot = null;
          activeMinigame = null;
          restartRun('balloon_abort');
          startLoadedLevelWithProgress(levelId, { unlockAudio: false });
        },
      });
    } catch (err) {
      balloonSnapshot = null;
      activeMinigame = null;
      ui.setFade(0);
      reportDevError(err);
      console.error('[balloon] failed to start:', err);
      const reason = 'fell_off_level';
      triggerReset(reason, player.mesh.position.x < respawnPoint.x ? 1 : -1);
    }
  }

  function finishRun() {
    const completionResult = markLevelCompleted(progression, levelId, levelTotals);
    persistProgressState(completionResult.state);
    if (completionResult.era5UnlockedNow && !progression.unlocksShown?.era5) {
      persistProgressState(markUnlockShown(progression, 'era5', levelTotals));
      ui.showEra5Teaser(3600);
    }
    if (completionResult.windGlideUnlockedNow && !progression.unlocksShown?.windGlide) {
      maybeShowUnlockBanner('WIND GLIDE INSTALLED!', 'Press G in air for one emergency glide per run.', 'windGlide', 3000);
    }
    state = 'end';
    player.setWinAnimationActive(false);
    player.stopCapeFloat();
    audio.stopLevelMusic(0.5);
    window.__DADA_DEBUG__.sceneKey = 'EndScene';
    window.__DADA_DEBUG__.menuVisible = false;
    ui.hideGameplayMenu();
    ui.showEnd();
  }

  function restartRun(reason = 'ui') {
    if (debugMode) {
      console.log(`[game] restart requested via ${reason}`);
    }

    ui.setFade(0);
    ui.hideGameplayMenu();
    ui.hideEra5Inventory();
    ui.hideEnd();
    ui.showTitle();
    ui.clearLoading();
    ui.resetGameplayHud();
    ui.showStatus('Ready!', 500);
    input.consumeAll();
    juiceFx.clear();
    audio.stopLevelMusic(0.2);

    state = 'title';
    window.__DADA_DEBUG__.menuVisible = false;
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: 'title', lastKey: _lastKey });
    goalReached = false;
    goalTimer = 0;
    goalCarryStartPos = null;
    goalCarryEndPos = null;
    goalCarryStartScale = null;
    goalCarryEndScale = null;
    respawnState = null;
    activeCheckpointIndex = 0;
    respawnPoint = { ...spawnPoint };
    clearRunBuffs({ suppressCape: false, keepCapeUsage: false });
    puddleInvulnMs = 0;
    coinsCollected = 0;
    window.__DADA_DEBUG__.coinsCollected = coinsCollected;
    collectiblePickupCooldownMs = 0;
    level1FloorPenaltyCooldownMs = 0;
    level1AirborneFromAboveFloor = false;
    level1MaxAirborneBottomY = player.mesh.position.y - player.getCollisionHalfExtents().halfH;
    level1CoinLossAnim = null;
    level2HorseHintShown = false;
    for (const flyer of level1CoinFlyers) flyer.node?.dispose?.();
    level1CoinFlyers = [];
    level1AmbientTimerMs = 6200;
    level1AmbientBirdDelayMs = -1;
    if (fruitMaze?.isActive()) fruitMaze.stop();
    if (pongMinigame?.isActive()) pongMinigame.stop();
    if (balloonRoundup?.isActive()) balloonRoundup.stop();
    fruitMazeSnapshot = null;
    pongSnapshot = null;
    balloonSnapshot = null;
    activeMinigame = null;
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

    for (const stateInfo of level2OcclusionState.values()) {
      stateInfo.target = stateInfo.baseVisibility;
      stateInfo.current = stateInfo.baseVisibility;
      stateInfo.mesh.visibility = stateInfo.baseVisibility;
    }
    for (const stateInfo of era5DecorOcclusionState.values()) {
      stateInfo.target = 1;
      stateInfo.current = 1;
      if (stateInfo.mesh.material) {
        stateInfo.mesh.material.alpha = stateInfo.baseAlpha;
      }
    }

    for (const coin of coins) {
      coin.collected = false;
      if (coin.node) coin.node.setEnabled(true);
    }
    coinsCollected = 0;
    ui.setCoins(0);
    window.__DADA_DEBUG__.coinsCollected = coinsCollected;
    resetCrumbles();
    if (world.level2) world.level2.reset();
    if (world.level3) world.level3.reset();
    if (world.level4) world.level4.reset();
    if (world.level5 && world.level5 !== world.era5Level) world.level5.reset();
    if (world.era5Level) world.era5Level.reset();

    for (const pickup of pickups) {
      const alreadyOwned = pickup.type === 'item'
        && progression.era5?.inventory?.some((item) => item.defId === pickup.defId);
      pickup.collected = !!alreadyOwned ? true : false;
      if (pickup.node) pickup.node.setEnabled(!alreadyOwned);
    }

    player.spawnAt(spawnPoint.x, spawnPoint.y, spawnPoint.z || 0);
    applyEra5FacingState();
    player.vx = 0;
    player.vy = 0;
    player.invulnTimerMs = 0;
    player.setWinAnimationActive(false);
    player.setMovementModifiers();
    player.visual.scaling.set(1, 1, 1);
    era5PlayerYaw = era5InitialPlayerYaw;
    era5PlayerYawVel = 0;
    player.visual.rotation.set(0, isEra5Level ? era5InitialPlayerYaw + Math.PI : 0, 0);
    player.setEra5YawState(era5PlayerYaw, era5PlayerYawVel);
    applyCapeVisualState();
    prevGrounded = player.grounded;
    prevPlayerBottomY = player.mesh.position.y - player.getCollisionHalfExtents().halfH;
    level1MaxAirborneBottomY = prevPlayerBottomY;
    updatePlayerShadow(player);
    updatePlayerReadabilityLight();
    updateBuffHud();

    camera.position.copyFrom(cameraStartPos);
    camera.setTarget(cameraStartTarget.clone());
    if (isEra5Level) {
      const preset = getEra5CameraPreset();
      const resetForward = getYawForwardXZ(era5InitialPlayerYaw).normalize();
      camera.position.set(
        (spawnPoint.x || -12) - (resetForward.x * preset.distance),
        (spawnPoint.y || 2) + preset.height,
        (spawnPoint.z || 0) - (resetForward.z * preset.distance),
      );
      camera.setTarget(new BABYLON.Vector3(
        (spawnPoint.x || -12) + (resetForward.x * preset.lookAhead),
        (spawnPoint.y || 2) + preset.focusHeight,
        (spawnPoint.z || 0) + (resetForward.z * preset.lookAhead),
      ));
      era5CameraYaw = era5InitialPlayerYaw;
      era5CameraDesiredYaw = era5CameraYaw;
      era5CameraYawVel = 0;
      era5CameraManualLookMs = 0;
      era5CurrentOccluderName = null;
      camera.fov = preset.fov;
    }
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
  function beginGameplay({ unlockAudio = true } = {}) {
    if (unlockAudio) {
      audio.unlock();
    }
    state = 'gameplay';
    window.__DADA_DEBUG__.menuVisible = false;
    input.consumeAll();
    player.setWinAnimationActive(false);
    audio.startLevelMusic(levelId, 0.5);
    window.__DADA_DEBUG__.sceneKey = 'CribScene';
    ui.hideGameplayMenu();
    ui.hideTitle();
    ui.showGameplayHud(levelTotals[levelId] ?? coins.length, { era5: isEra5Level, levelId });
    if (isEra5Level) {
      console.log('Era5ControllerV2 active');
      ui.showEra5Hud();
      syncEra5Ui();
    }
    applyCapeVisualState();
    updateBuffHud();
    ui.updateTitleDebug({ selectedLevel: levelId, currentLevel: levelId, titleState: 'playing', lastKey: _lastKey });
    if (debugMode) {
      debugIdleTimerMs = 1000;
      player.beginSpawnProbe('initial');
    }
  }

  function startLoadedLevelWithProgress(targetLevelId, { unlockAudio = true } = {}) {
    state = 'loading';
    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / 360);
      const percent = Math.round(100 * easeOutCubic(t));
      ui.showLoading(targetLevelId, percent);
      ui.updateTitleDebug({ selectedLevel: targetLevelId, currentLevel: levelId, titleState: 'loading', lastKey: _lastKey });
      if (t >= 1) {
        beginGameplay({ unlockAudio });
        return;
      }
      window.requestAnimationFrame(tick);
    };
    ui.showLoading(targetLevelId, 0);
    window.requestAnimationFrame(tick);
  }

  function getLockedLevelMessage(targetLevelId) {
    return getLockedMessage(targetLevelId, progression);
  }

  function getBlockedLevelMessage(targetLevelId) {
    return getConstructionMessage(targetLevelId) || 'This level is under construction.';
  }

  function requestStart(targetLevelId) {
    if (state !== 'title') return; // already loading or playing
    if (!isLevelLaunchable(targetLevelId)) {
      ui.showStartError(getBlockedLevelMessage(targetLevelId));
      return;
    }
    if (!isLevelUnlocked(progression, targetLevelId)) {
      ui.showStartError(getLockedLevelMessage(targetLevelId));
      return;
    }
    if (targetLevelId !== levelId) {
      // User selected a different level than the one currently loaded; navigate.
      state = 'loading'; // prevent re-entry while setTimeout is pending
      ui.showLoading(targetLevelId, 0);
      ui.updateTitleDebug({ selectedLevel: targetLevelId, currentLevel: levelId, titleState: 'loading', lastKey: _lastKey });
      writeLoadingIntent(targetLevelId);
      window.location.assign(buildLevelUrl(targetLevelId, { autoStart: true }));
      return;
    }
    startLoadedLevelWithProgress(targetLevelId, { unlockAudio: true });
  }

  function openGameplayMenu() {
    if (state !== 'gameplay') return;
    state = 'menu';
    input.consumeAll();
    window.__DADA_DEBUG__.menuVisible = true;
    ui.showGameplayMenu(selectedLevelId);
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: 'menu', lastKey: _lastKey });
  }

  function closeGameplayMenu() {
    if (state !== 'menu') return;
    state = 'gameplay';
    input.consumeAll();
    window.__DADA_DEBUG__.menuVisible = false;
    ui.hideGameplayMenu();
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: 'playing', lastKey: _lastKey });
  }

  function moveMenuSelection(delta) {
    selectedLevelId = ui.moveSelectedLevel(delta);
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: state, lastKey: _lastKey });
    return selectedLevelId;
  }

  function triggerGameplayHotkey(code) {
    if (state !== 'gameplay') return false;
    if (code === 'KeyR') {
      restoreOnesieOnCheckpointReset();
      triggerReset('manual_reset', player.mesh.position.x < respawnPoint.x ? 1 : -1);
      updateBuffHud();
      return true;
    }
    if (code === 'KeyF') {
      if (isEra5Level) {
        return fireEra5Weapon();
      }
      if (!player.canTriggerAirFlip()) return false;
      let started = false;
      if (progression.capeUnlocked && !capeUsedThisRun && !capeSuppressedThisRun) {
        capeUsedThisRun = true;
        player.startCapeFloat(CAPE_FLOAT_DURATION_MS);
        started = player.triggerBackflip() || true;
        ui.showStatus('Cape float!', 900);
      } else {
        started = player.triggerBackflip();
      }
      window.__DADA_DEBUG__.backflip = player.getBackflipState();
      updateBuffHud();
      return started;
    }
    if (code === 'KeyG') {
      if (isEra5Level) {
        if (useWindGlide()) {
          window.__DADA_DEBUG__.backflip = player.getBackflipState();
          updateBuffHud();
          return true;
        }
        return false;
      }
      return false;
    }
    if (code === 'KeyE') {
      if (isEra5Level) {
        return toggleEra5Tool();
      }
      if (levelId !== 4 || flourPuffCooldownMs > 0 || respawnState) return false;
      flourPuffCooldownMs = world.flourPuff?.cooldownMs ?? 6000;
      player.vy = Math.max(player.vy, world.flourPuff?.impulseY ?? 8.6);
      ui.showStatus('Flour puff!', 650);
      updateBuffHud();
      return true;
    }
    if (code === 'KeyI') {
      return toggleEra5Inventory();
    }
    if (
      code === 'Enter'
      || code === 'NumpadEnter'
      || code === 'ControlLeft'
      || code === 'ControlRight'
      || code === 'PointerMain'
    ) {
      return fireEra5Weapon();
    }
    return false;
  }

  function switchLevelFromGameplayMenu(targetLevelId) {
    if (!isLevelLaunchable(targetLevelId)) {
      ui.showStatus(getBlockedLevelMessage(targetLevelId), 1800);
      return false;
    }
    if (!isLevelUnlocked(progression, targetLevelId)) {
      ui.showStatus(getLockedLevelMessage(targetLevelId), 1600);
      return false;
    }
    selectedLevelId = targetLevelId;
    if (targetLevelId === levelId) {
      window.__DADA_DEBUG__.menuVisible = false;
      ui.hideGameplayMenu();
      input.consumeAll();
      restartRun('menu');
      selectedLevelId = targetLevelId;
      requestStart(targetLevelId);
      return true;
    }

    window.__DADA_DEBUG__.menuVisible = false;
    ui.hideGameplayMenu();
    ui.resetGameplayHud();
    ui.showTitle();
    ui.showLoading(targetLevelId, 0);
    audio.stopLevelMusic(0.18);
    state = 'loading';
    ui.updateTitleDebug({ selectedLevel: targetLevelId, currentLevel: levelId, titleState: 'loading', lastKey: _lastKey });
    writeLoadingIntent(targetLevelId);
    window.location.assign(buildLevelUrl(targetLevelId, { autoStart: true }));
    return true;
  }

  ui.setGameplayResumeHandler(() => {
    closeGameplayMenu();
  });
  ui.setGameplayRestartHandler(() => {
    closeGameplayMenu();
    restartRun('menu_restart');
    startLoadedLevelWithProgress(levelId, { unlockAudio: false });
  });
  ui.setResetBabyHandler(() => {
    closeGameplayMenu();
    resetBabyToNew();
  });
  ui.setGameplayMenuHandler((targetLevelId) => {
    switchLevelFromGameplayMenu(targetLevelId);
  });

  if (debugMode) {
    window.__DADA_DEBUG__.startLevel = (targetLevelId = levelId) => {
      if (targetLevelId === levelId) {
        selectedLevelId = levelId;
      }
      requestStart(targetLevelId);
      return window.__DADA_DEBUG__.sceneKey;
    };
    window.__DADA_DEBUG__.restartRun = () => {
      restartRun('debug');
      return window.__DADA_DEBUG__.sceneKey;
    };
    window.__DADA_DEBUG__.teleportToGoal = () => {
      if (state === 'title') {
        selectedLevelId = levelId;
        requestStart(levelId);
      }
      const goalBounds = world.goal.getBoundingInfo()?.boundingBox;
      if (!goalBounds) return false;
      const center = goalBounds.centerWorld;
      const { halfH } = player.getCollisionHalfExtents();
      const minGoalY = goalBounds.minimumWorld.y + halfH + 0.08;
      const maxGoalY = goalBounds.maximumWorld.y - halfH - 0.08;
      const requestedGoalY = goalMinBottomY !== null
        ? Math.max(center.y, goalMinBottomY + halfH + 0.12)
        : center.y;
      const safeGoalY = clamp(requestedGoalY, minGoalY, Math.max(minGoalY, maxGoalY));
      player.spawnAt(center.x, safeGoalY, center.z);
      applyEra5FacingState();
      player.vx = 0;
      player.vy = 0;
      updatePlayerShadow(player);
      return true;
    };
    window.__DADA_DEBUG__.teleportPlayer = (x, y, z = 0) => {
      player.spawnAt(x, y, z);
      applyEra5FacingState();
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      updatePlayerShadow(player);
      return { x, y, z };
    };
    window.__DADA_DEBUG__.setEra5Pose = ({ x, y, z, yaw, cameraYaw } = {}) => {
      if (!isEra5Level) return null;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        player.spawnAt(x, y, Number.isFinite(z) ? z : player.mesh.position.z);
      }
      if (Number.isFinite(yaw)) {
        era5PlayerYaw = wrapToPi(yaw);
        era5PlayerYawVel = 0;
      }
      const nextCameraYaw = Number.isFinite(cameraYaw)
        ? wrapToPi(cameraYaw)
        : Number.isFinite(yaw)
          ? wrapToPi(yaw)
          : era5CameraYaw;
      era5CameraYaw = nextCameraYaw;
      era5CameraDesiredYaw = nextCameraYaw;
      era5CameraYawVel = 0;
      applyEra5FacingState();
      player.vx = 0;
      player.vy = 0;
      player.vz = 0;
      updatePlayerShadow(player);
      return {
        x: player.mesh.position.x,
        y: player.mesh.position.y,
        z: player.mesh.position.z,
        yaw: era5PlayerYaw,
        cameraYaw: era5CameraYaw,
      };
    };
    window.__DADA_DEBUG__.setEra5CameraPreset = (presetId = ERA5_DEFAULT_CAMERA_PRESET) => {
      if (!isEra5Level) return null;
      const presetTable = getEra5PresetTable();
      const nextPreset = presetTable[presetId]
        || presetTable[getEra5DefaultPresetId()]
        || ERA5_CAMERA_PRESETS[ERA5_DEFAULT_CAMERA_PRESET];
      era5CameraPresetId = nextPreset.id;
      camera.fov = nextPreset.fov;
      const forward = getYawForwardXZ(era5PlayerYaw).normalize();
      const focus = new BABYLON.Vector3(
        player.mesh.position.x + (forward.x * nextPreset.lookAhead),
        player.mesh.position.y + nextPreset.focusHeight,
        player.mesh.position.z + (forward.z * nextPreset.lookAhead),
      );
      camera.position.set(
        player.mesh.position.x - (forward.x * nextPreset.distance),
        player.mesh.position.y + nextPreset.height,
        player.mesh.position.z - (forward.z * nextPreset.distance),
      );
      camera.setTarget(focus);
      return {
        id: nextPreset.id,
        label: nextPreset.label,
        distance: nextPreset.distance,
        height: nextPreset.height,
        focusHeight: nextPreset.focusHeight,
        lookAhead: nextPreset.lookAhead,
        fov: nextPreset.fov,
      };
    };
    window.__DADA_DEBUG__.getEra5LastDamage = () => era5LastDamageEvent;
    window.__DADA_DEBUG__.setEra5CameraDebugView = ({
      position = null,
      target = null,
      fov = null,
      label = 'debug',
    } = {}) => {
      if (!isEra5Level) return null;
      if (!position || !target) {
        era5CameraDebugOverride = null;
        return null;
      }
      era5CameraDebugOverride = {
        label,
        position: {
          x: Number(position.x ?? camera.position.x),
          y: Number(position.y ?? camera.position.y),
          z: Number(position.z ?? camera.position.z),
        },
        target: {
          x: Number(target.x ?? player.mesh.position.x),
          y: Number(target.y ?? (player.mesh.position.y + 1.2)),
          z: Number(target.z ?? player.mesh.position.z),
        },
        fov: Number.isFinite(fov) ? Number(fov) : null,
      };
      return {
        label: era5CameraDebugOverride.label,
        position: { ...era5CameraDebugOverride.position },
        target: { ...era5CameraDebugOverride.target },
        fov: era5CameraDebugOverride.fov,
      };
    };
    window.__DADA_DEBUG__.clearEra5CameraDebugView = () => {
      era5CameraDebugOverride = null;
      return null;
    };
    window.__DADA_DEBUG__.toggleGameplayMenu = () => {
      if (state === 'menu') {
        closeGameplayMenu();
      } else if (state === 'gameplay') {
        openGameplayMenu();
      }
      return window.__DADA_DEBUG__.menuVisible;
    };
    window.__DADA_DEBUG__.switchMenuLevel = (targetLevelId) => {
      return switchLevelFromGameplayMenu(targetLevelId);
    };
    window.__DADA_DEBUG__.gameplayHotkey = (code) => triggerGameplayHotkey(code);
    window.__DADA_DEBUG__.triggerBackflip = () => {
      return triggerGameplayHotkey('KeyF');
    };
    window.__DADA_DEBUG__.triggerFloorPenalty = () => {
      triggerFloorPenalty();
      return {
        lastRespawnReason: window.__DADA_DEBUG__.lastRespawnReason,
        coinsCollected: window.__DADA_DEBUG__.coinsCollected,
        floorPenaltyCount: window.__DADA_DEBUG__.floorPenaltyCount || 0,
        floorPenaltyLevel: window.__DADA_DEBUG__.lastFloorPenaltyLevel ?? null,
      };
    };
    window.__DADA_DEBUG__.triggerLevel2Pong = () => {
      if (levelId !== 2) return false;
      startPongEscape();
      return pongMinigame?.isActive?.() ?? false;
    };
    window.__DADA_DEBUG__.triggerLevel3Balloon = () => {
      if (levelId !== 3) return false;
      startBalloonRoundup();
      return balloonRoundup?.isActive?.() ?? false;
    };
    window.__DADA_DEBUG__._pongMinigame = pongMinigame;
    window.__DADA_DEBUG__.resetBabyToNew = () => {
      resetBabyToNew();
    };
    window.__DADA_DEBUG__.collectibles = () => coins.map((coin, index) => ({
      index,
      collected: coin.collected,
      x: coin.position.x,
      y: coin.position.y,
      z: coin.position.z,
    }));
    const mergeProgressPatch = (patch = {}) => ({
      ...progression,
      ...patch,
      levels: {
        ...(progression.levels || {}),
        ...(patch.levels || {}),
      },
      levelCompleted: {
        ...(progression.levelCompleted || {}),
        ...(patch.levelCompleted || {}),
      },
      unlocksShown: {
        ...(progression.unlocksShown || {}),
        ...(patch.unlocksShown || {}),
      },
      era5: {
        ...(progression.era5 || {}),
        ...(patch.era5 || {}),
        equipped: {
          ...(progression.era5?.equipped || {}),
          ...(patch.era5?.equipped || {}),
        },
      },
    });
    window.__DADA_DEBUG__.setProgressState = (nextState) => {
      persistProgressState(nextState);
      applyCapeVisualState();
      updateBuffHud();
      return progression;
    };
    window.__DADA_DEBUG__.setProgress = (patch = {}) => {
      persistProgressState(mergeProgressPatch(patch));
      applyCapeVisualState();
      updateBuffHud();
      return progression;
    };
    window.__DADA_DEBUG__.clearProgressState = () => {
      persistProgressState(clearProgress(levelTotals));
      applyCapeVisualState();
      updateBuffHud();
      return progression;
    };
    window.__DADA_DEBUG__.level2Secret = () => world.level2?.getSecretState?.() ?? null;
    window.__DADA_DEBUG__.level2LastCrumble = () => {
      const base = world.level2?.getLastCrumbleState?.() ?? null;
      if (!base) return null;
      const runtime = crumbleStates.find((cs) => cs.cr?.name === base.name);
      return {
        ...base,
        state: runtime?.state ?? null,
        timer: runtime ? Number(runtime.timer.toFixed(3)) : null,
        playerTriggered: runtime?.playerTriggered ?? false,
      };
    };
    window.__DADA_DEBUG__.triggerLevel5Hazard = (name = 'eel_viewing_north') => {
      if (levelId !== 5) return false;
      return world.level5?.debugForceHazard?.(name, {
        pos: player.mesh.position,
        player,
        triggerDamage: applyEra5Damage,
      }) ?? false;
    };
    window.__DADA_DEBUG__.forceEra5Damage = (source = 'eel_rail', direction = { x: 1, z: 0 }, options = {}) => {
      if (!isEra5Level) return false;
      return applyEra5Damage(source, direction, options);
    };
    window.__DADA_DEBUG__.era5TopologyReport = () => world.era5Level?.getTopologyReport?.() ?? null;
    window.__DADA_DEBUG__.level5TruthReport = () => (levelId === 5 ? world.level5?.getTruthReport?.() ?? null : null);
    window.__DADA_DEBUG__.level5CollisionReport = () => (levelId === 5 ? world.level5?.getCollisionReport?.() ?? null : null);
    window.__DADA_DEBUG__.level5WalkableReport = () => (levelId === 5 ? world.level5?.getWalkableReport?.() ?? null : null);
    window.__DADA_DEBUG__.level5RespawnReport = () => (levelId === 5 ? world.level5?.getRespawnReport?.() ?? null : null);
    window.__DADA_DEBUG__.setLevel5TruthOverlay = (nextState = {}) => (levelId === 5 ? world.level5?.setTruthOverlay?.(nextState) ?? null : null);
    window.__DADA_DEBUG__.era5EnemyReport = () => world.era5Level?.getEnemyReport?.() ?? null;
    window.__DADA_DEBUG__.era5ShowEnemyBounds = (enabled = true) => {
      return world.era5Level?.setEnemyDebugView?.({ showBounds: !!enabled }) ?? null;
    };
    window.__DADA_DEBUG__.era5ForceEnemyDebugLook = (enabled = true) => {
      return world.era5Level?.setEnemyDebugView?.({ highContrast: !!enabled }) ?? null;
    };
    window.__DADA_DEBUG__.placeLevel5DebugJellyfish = (forward = { x: 1, z: 0 }) => {
      if (levelId !== 5) return false;
      return world.level5?.placeDebugJellyfish?.(player.mesh.position.clone(), forward) ?? false;
    };
    window.__DADA_DEBUG__.testLevel5BubbleStun = () => {
      if (levelId !== 5) return null;
      const forward = getEra5PlayerForward();
      world.level5?.placeDebugJellyfish?.(player.mesh.position.clone(), forward);
      const samplePosition = player.mesh.position.add(new BABYLON.Vector3(forward.x * 1.1, 0.72, forward.z * 1.1));
      const hit = world.level5?.tryHitByBubble?.({
        position: samplePosition,
        radius: Math.max(0.26, era5State.stats.weaponProjectileRadius ?? 0.32),
        stunMs: Math.max(200, (era5State.stats.weaponStunSec ?? 1.5) * 1000),
      }) ?? { hit: false };
      return {
        hit,
        enemies: world.era5Level?.getEnemyReport?.()?.enemies ?? [],
      };
    };
    window.__DADA_DEBUG__.fireEra5Weapon = () => fireEra5Weapon();
    window.__DADA_DEBUG__.getEra5ProjectileLaunchState = () => {
      const launchState = getEra5ProjectileLaunchState();
      return {
        origin: {
          x: Number(launchState.origin.x.toFixed(3)),
          y: Number(launchState.origin.y.toFixed(3)),
          z: Number(launchState.origin.z.toFixed(3)),
        },
        direction: {
          x: Number(launchState.direction.x.toFixed(3)),
          y: Number(launchState.direction.y.toFixed(3)),
          z: Number(launchState.direction.z.toFixed(3)),
        },
        aimTarget: {
          x: Number(launchState.aimTarget.x.toFixed(3)),
          y: Number(launchState.aimTarget.y.toFixed(3)),
          z: Number(launchState.aimTarget.z.toFixed(3)),
        },
        floorTopY: Number(launchState.floorTopY.toFixed(3)),
      };
    };
    window.__DADA_DEBUG__.toggleEra5Tool = () => toggleEra5Tool();
    window.__DADA_DEBUG__.useWindGlide = () => useWindGlide();
    window.__DADA_DEBUG__.setEra5Vitals = ({ hp, shield, oxygen, clearInvuln = false, clearLastDamage = false } = {}) => {
      if (!isEra5Level) return null;
      if (Number.isFinite(hp)) era5Hp = Math.max(0, Math.min(Math.round(era5State.stats.hpMax ?? 3), Math.round(hp)));
      if (Number.isFinite(shield)) era5Shield = Math.max(0, Math.min(Math.round(era5State.stats.shieldMax ?? 1), Math.round(shield)));
      if (Number.isFinite(oxygen)) era5Oxygen = Math.max(0, Math.min(getEra5MeterMax(), oxygen));
      if (clearInvuln) {
        player.invulnTimerMs = 0;
        player.visual?.setEnabled?.(true);
      }
      if (clearLastDamage) {
        era5LastDamageEvent = null;
      }
      syncEra5Ui();
      return window.__DADA_DEBUG__.era5Vitals;
    };
    window.__DADA_DEBUG__.getMenuLockState = () => ({
      6: document.getElementById('levelBtn6')?.hasAttribute('aria-disabled') ?? false,
      7: document.getElementById('levelBtn7')?.hasAttribute('aria-disabled') ?? false,
      8: document.getElementById('levelBtn8')?.hasAttribute('aria-disabled') ?? false,
      9: document.getElementById('levelBtn9')?.hasAttribute('aria-disabled') ?? false,
      underConstruction: {
        5: document.getElementById('levelBtn5')?.classList.contains('under-construction') ?? false,
        6: document.getElementById('levelBtn6')?.classList.contains('under-construction') ?? false,
        7: document.getElementById('levelBtn7')?.classList.contains('under-construction') ?? false,
        8: document.getElementById('levelBtn8')?.classList.contains('under-construction') ?? false,
        9: document.getElementById('levelBtn9')?.classList.contains('under-construction') ?? false,
      },
      titleLock: document.getElementById('titleLevelLock')?.textContent ?? '',
      titleHint: document.getElementById('titleHint')?.textContent ?? '',
    });
    window.__DADA_DEBUG__.underConstructionLevelId = world.underConstructionLevelId ?? null;
  }

  // Single unconditional keydown handler on window — fires regardless of which
  // DOM element has focus.  Updates the debug line on every key, calls
  // requestStart for Space/Enter.
  window.addEventListener('keydown', (ev) => {
    _lastKey = `${ev.key}/${ev.code}`;
    ui.updateTitleDebug({ selectedLevel: selectedLevelId, currentLevel: levelId, titleState: state, lastKey: _lastKey });
    if (activeMinigame?.isActive?.()) {
      if (ev.code === 'Escape') {
        ev.preventDefault();
        activeMinigame.handleEscape();
      }
      return;
    }
    if (ev.code === 'Escape') {
      if (state === 'gameplay') {
        ev.preventDefault();
        openGameplayMenu();
        return;
      }
      if (state === 'menu') {
        ev.preventDefault();
        closeGameplayMenu();
        return;
      }
      if (state === 'inventory') {
        ev.preventDefault();
        closeEra5Inventory();
        return;
      }
    }
    if (state === 'gameplay') {
      if (
        isEra5Level
        && (ev.code === 'ArrowUp'
          || ev.code === 'ArrowDown'
          || ev.code === 'ArrowLeft'
          || ev.code === 'ArrowRight'
          || ev.code === 'AltLeft'
          || ev.code === 'AltRight'
          || ev.code === 'Comma'
          || ev.code === 'Period'
          || ev.code === 'KeyW'
          || ev.code === 'KeyA'
          || ev.code === 'KeyS'
          || ev.code === 'KeyD'
          || ev.code === 'KeyC'
          || ev.code === 'KeyF'
          || ev.code === 'KeyG'
          || ev.code === 'Space'
          || ev.code === 'ShiftLeft'
          || ev.code === 'ShiftRight'
          || ev.code === 'Tab'
          || ev.code === 'Enter'
          || ev.code === 'NumpadEnter'
          || ev.code === 'ControlLeft'
          || ev.code === 'ControlRight'
          || ev.code === 'BracketLeft'
          || ev.code === 'BracketRight'
          || ev.code === 'Backslash')
      ) {
        ev.preventDefault();
        return;
      }
      if ((ev.code === 'KeyR' || ev.key === 'r' || ev.key === 'R') && !ev.repeat && !ev.metaKey && !ev.ctrlKey) {
        ev.preventDefault();
        triggerGameplayHotkey('KeyR');
        return;
      }
      if ((ev.code === 'KeyF' || ev.key === 'f' || ev.key === 'F') && !ev.repeat) {
        if (isEra5Level) {
          ev.preventDefault();
          return;
        }
        ev.preventDefault();
        triggerGameplayHotkey('KeyF');
        return;
      }
      if ((ev.code === 'KeyG' || ev.key === 'g' || ev.key === 'G') && !ev.repeat) {
        if (isEra5Level) {
          ev.preventDefault();
          triggerGameplayHotkey('KeyG');
          return;
        }
      }
      if ((ev.code === 'KeyC' || ev.key === 'c' || ev.key === 'C') && isEra5Level) {
        ev.preventDefault();
        return;
      }
      if ((ev.code === 'KeyE' || ev.key === 'e' || ev.key === 'E') && !ev.repeat) {
        ev.preventDefault();
        triggerGameplayHotkey('KeyE');
        return;
      }
      if ((ev.code === 'KeyI' || ev.key === 'i' || ev.key === 'I') && !ev.repeat) {
        ev.preventDefault();
        triggerGameplayHotkey('KeyI');
        return;
      }
    }
    if (state === 'inventory') {
      if ((ev.code === 'KeyI' || ev.key === 'i' || ev.key === 'I') && !ev.repeat) {
        ev.preventDefault();
        closeEra5Inventory();
        return;
      }
    }
    if (state === 'title' || state === 'menu') {
      if (!ev.repeat && (ev.code === 'ArrowLeft' || ev.code === 'ArrowUp')) {
        ev.preventDefault();
        moveMenuSelection(-1);
        return;
      }
      if (!ev.repeat && (ev.code === 'ArrowRight' || ev.code === 'ArrowDown')) {
        ev.preventDefault();
        moveMenuSelection(1);
        return;
      }
      if (state === 'menu' && !ev.repeat && (
        ev.code === 'Space'
        || ev.code === 'Enter'
        || ev.code === 'NumpadEnter'
      )) {
        ev.preventDefault();
        switchLevelFromGameplayMenu(selectedLevelId);
        return;
      }
    }
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
  if (autoStartAfterLoad) {
    finishBootLoading();
    setTimeout(() => {
      if (!isLevelLaunchable(levelId)) {
        ui.showStartError(getBlockedLevelMessage(levelId));
      } else if (state === 'title' && isLevelUnlocked(progression, levelId)) {
        startLoadedLevelWithProgress(levelId, { unlockAudio: false });
      } else if (!isLevelUnlocked(progression, levelId)) {
        ui.showStartError(getLockedLevelMessage(levelId));
      }
    }, 70);
  } else {
    clearLoadingIntent();
    ui.clearLoading();
  }

  function startGoalCelebration(goalPos) {
    ui.hideObjective();
    if (!debugFlags.juice) {
      finishRun();
      return;
    }
    audio.playWin();
    audio.playCue(levelId, 'levelComplete');
    player.setWinAnimationActive(true);
    state = 'goal';
    goalTimer = GOAL_CELEBRATION_SEC;
    goalCarryStartPos = player.mesh.position.clone();
    goalCarryEndPos = new BABYLON.Vector3(goalPos.x - 0.28, goalPos.y + 0.78, goalPos.z);
    goalCarryStartScale = player.visual.scaling.clone();
    goalCarryEndScale = new BABYLON.Vector3(0.92, 0.92, 0.92);
    goalCamStartPos = camera.position.clone();
    goalCamStartTarget = camera.getTarget().clone();
    goalCamEndPos = new BABYLON.Vector3(goalPos.x - 3.0, goalPos.y + 2.0, -10.5);
    goalCamEndTarget = new BABYLON.Vector3(goalPos.x, goalPos.y + 0.8, 0);
    juiceFx.spawnGoalSparkles(goalPos);
    juiceFx.spawnGoalSparkles({ x: goalPos.x - 0.9, y: goalPos.y + 0.4, z: goalPos.z });
    juiceFx.spawnGoalSparkles({ x: goalPos.x + 0.9, y: goalPos.y + 0.4, z: goalPos.z });
    ui.showPopText('Da Da!', 780);
  }

  function isBubbleShieldEligibleReason(reason) {
    return ![
      'manual_reset',
      'fell_off_level',
      'crumble_portal',
      'menu',
      'menu_restart',
      'playAgain',
      'debug',
      'keyboard',
    ].includes(reason);
  }

  function triggerReset(reason, direction = -1, overrideSpawn = null) {
    if (respawnState) return;
    if (!isEra5Level && bubbleShieldGraceMs > 0 && isBubbleShieldEligibleReason(reason)) {
      return false;
    }
    if (!isEra5Level && progression.bubbleShieldUnlocked && !bubbleShieldUsedThisRun && isBubbleShieldEligibleReason(reason)) {
      bubbleShieldUsedThisRun = true;
      bubbleShieldGraceMs = BUBBLE_SHIELD_GRACE_MS;
      player.invulnTimerMs = Math.max(player.invulnTimerMs, BUBBLE_SHIELD_GRACE_MS);
      player.vx *= 0.4;
      player.vy = Math.max(player.vy, 0);
      juiceFx.spawnBubbleBurst(player.mesh.position);
      audio.playBubblePop();
      ui.showStatus('Bubble shield popped!', 900);
      updateBuffHud();
      window.__DADA_DEBUG__.lastRespawnReason = `${reason}_shielded`;
      return false;
    }
    const applied = player.applyHit({
      direction,
      knockback: 4.2,
      upward: 3.8,
      invulnMs: 800,
    });
    if (!applied) return false;
    audio.playReset();
    audio.playCue(levelId, 'collision');
    respawnState = { phase: 'fadeOut', timer: 0.16, reason, overrideSpawn };
    window.__DADA_DEBUG__.lastRespawnReason = reason;
    if (reason === 'crumble_portal') {
      resetCrumbles();
    }
    ui.showStatus('Try again!', 650);
    return true;
  }

  function resolveRespawnPosition(baseSpawn) {
    const levelSpecific = world.level5?.resolveRespawnPosition?.({
      baseSpawn,
      player,
      reason: respawnState?.reason || null,
      activeCheckpointIndex,
      worldExtents,
    });
    if (levelSpecific?.position) {
      window.__DADA_DEBUG__.lastRespawnAnchor = levelSpecific.anchor || null;
      return levelSpecific.position;
    }
    if (levelSpecific && Number.isFinite(levelSpecific.x) && Number.isFinite(levelSpecific.y)) {
      window.__DADA_DEBUG__.lastRespawnAnchor = levelSpecific.anchor || null;
      return levelSpecific;
    }
    const { halfW, halfH, halfD } = player.getCollisionHalfExtents();
    const baseZ = Number.isFinite(baseSpawn.z) ? baseSpawn.z : 0;

    const placeOnSurface = (x, z, fallbackY) => {
      let highest = null;
      for (const c of player.colliders) {
        if ((x + halfW) <= c.minX || (x - halfW) >= c.maxX) continue;
        if (isEra5Level && ((z + halfD) <= c.minZ || (z - halfD) >= c.maxZ)) continue;
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
      const yBase = placeOnSurface(x, baseZ, baseSpawn.y + Math.floor(i / 6) * 0.24);
      const y = yBase + Math.floor(i / 8) * 0.2;
      if (!player.wouldOverlapAt(x, y, baseZ)) {
        return { x, y, z: baseZ };
      }
    }

    // Fallback: push above the world and let gravity settle safely.
    return {
      x: clamp(baseSpawn.x, minX, maxX),
      y: baseSpawn.y + 2.4,
      z: baseZ,
    };
  }

  function activateCheckpoint(checkpoint) {
    if (!checkpoint || checkpoint.index <= activeCheckpointIndex) return;
    activeCheckpointIndex = checkpoint.index;
    respawnPoint = { ...checkpoint.spawn };
    window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
    ui.showStatus(`${checkpoint.label} checkpoint`, 1200);
    audio.playCue(levelId, 'checkpoint');

    if (checkpoint.marker) {
      for (const mesh of checkpoint.marker.getChildMeshes()) {
        if (mesh.material && mesh.material.emissiveColor) {
          mesh.material.emissiveColor = new BABYLON.Color3(0.35, 0.18, 0.05);
        }
      }
    }
  }

  function triggerNearMissCue() {
    audio.playCue(levelId, 'nearMiss');
  }
  window.__DADA_DEBUG__.playNearMissCue = triggerNearMissCue;

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
    const checkpointPulse = 0.16 + (Math.sin(performance.now() * 0.004) * 0.08);

    if (collectiblePickupCooldownMs > 0) {
      collectiblePickupCooldownMs = Math.max(0, collectiblePickupCooldownMs - (dt * 1000));
    }
    if (bubbleShieldGraceMs > 0) {
      bubbleShieldGraceMs = Math.max(0, bubbleShieldGraceMs - (dt * 1000));
    }

    if (onesieBuffTimerMs > 0) {
      onesieBuffTimerMs = Math.max(0, onesieBuffTimerMs - dt * 1000);
      if (onesieBuffTimerMs === 0) {
        onesieJumpBoost = 1;
        onesieRechargeMs = 0;
        ui.showStatus('Onesie recharging...', 1200);
      }
    } else if (onesieCollectedThisRun && onesieRechargeMs < ONESIE_RECHARGE_DURATION_MS) {
      onesieRechargeMs = Math.min(ONESIE_RECHARGE_DURATION_MS, onesieRechargeMs + dt * 1000);
      if (onesieRechargeMs >= ONESIE_RECHARGE_DURATION_MS) {
        onesieBuffTimerMs = onesieMaxDurationMs;
        onesieJumpBoost = onesieStoredJumpBoost;
        ui.showStatus('Onesie ready!', 1200);
      }
    }

    // Checkpoint overlaps
    for (const checkpoint of checkpoints) {
      if (checkpoint.marker) {
        for (const mesh of checkpoint.marker.getChildMeshes()) {
          if (!mesh.material || !mesh.material.emissiveColor) continue;
          const base = checkpointEmissiveBase.get(mesh.uniqueId);
          if (!base) continue;
          if (checkpoint.index <= activeCheckpointIndex) {
            mesh.material.emissiveColor = base.clone();
          } else {
            mesh.material.emissiveColor = base.add(new BABYLON.Color3(checkpointPulse, checkpointPulse * 0.7, checkpointPulse * 0.18));
          }
        }
      }
      if (checkpoint.index <= activeCheckpointIndex) continue;
      const dx = pos.x - checkpoint.spawn.x;
      const dy = pos.y - checkpoint.spawn.y;
      const dz = isEra5Level ? (pos.z - (checkpoint.spawn.z ?? 0)) : 0;
      const r = checkpoint.radius ?? 1.2;
      if ((dx * dx + dy * dy + dz * dz) <= (r * r)) {
        activateCheckpoint(checkpoint);
      }
    }

    // Coin overlaps
    if (collectiblePickupCooldownMs <= 0) {
      for (const coin of coins) {
        if (coin.collected) continue;
        const dx = pos.x - coin.position.x;
        const dy = pos.y - coin.position.y;
        const dz = isEra5Level ? (pos.z - coin.position.z) : 0;
        const r = coin.radius ?? 0.45;
        const distanceSq = (dx * dx) + (dy * dy) + (dz * dz);
        const distanceXZ = Math.hypot(dx, dz);
        const magnetCollect = isEra5Level
          ? distanceXZ < 0.95 && Math.abs(dy) < 1.2
          : false;
        if (distanceSq <= (r * r) || magnetCollect) {
          coin.collected = true;
          if (coin.node) coin.node.setEnabled(false);
          coinsCollected++;
          window.__DADA_DEBUG__.coinsCollected = coinsCollected;
          recordPersistentBinky(coin.id);
          audio.playCoin();
          juiceFx.spawnCoinSparkle(coin.position);
          ui.updateCoins(coinsCollected);
          if (coinsCollected === (levelTotals[levelId] ?? coins.length)) {
            ui.showPopText('All pacifiers! 🍼', 900);
          }
        }
      }
    }

    // Pickup overlaps
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      const dx = pos.x - pickup.position.x;
      const dy = pos.y - pickup.position.y;
      const dz = isEra5Level ? (pos.z - pickup.position.z) : 0;
      const r = pickup.radius ?? 0.85;
      if ((dx * dx + dy * dy + dz * dz) <= (r * r)) {
        pickup.collected = true;
        if (pickup.node) pickup.node.setEnabled(false);
        audio.playPickup();
        juiceFx.spawnPickupSparkle(pickup.position);
        if (pickup.type === 'onesie') {
          onesieMaxDurationMs = pickup.durationMs ?? 10000;
          onesieStoredJumpBoost = pickup.jumpBoost ?? 1.2;
          onesieBuffTimerMs = onesieMaxDurationMs;
          onesieJumpBoost = onesieStoredJumpBoost;
          onesieCollectedThisRun = true;
          ui.showOnesieBoostCard();
          ui.showStatus('Onesie boost!', 1400);
        } else if (pickup.type === 'item') {
          grantEra5Item(pickup.defId, {
            autoEquip: pickup.autoEquip !== false,
            title: pickup.title,
            subtitle: pickup.subtitle,
          });
        }
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

    let speedMultiplier = isEra5Level ? Math.max(0.8, era5State.stats.moveSpeed ?? 1) : 1;
    let accelBonusMultiplier = isEra5Level ? 1.08 : 1;
    const sprinting = input.isSprintHeld();
    if (isEra5Level && (world.level5?.isInDeepWater?.(pos) || world.era5Level?.isInDeepWater?.(pos))) {
      speedMultiplier *= Math.max(0.72, era5State.stats.waterMoveSpeed ?? 1);
      accelBonusMultiplier *= 0.94;
    }
    if (sprinting) {
      if (isEra5Level) {
        speedMultiplier *= 1.22;
        accelBonusMultiplier *= 1.12;
      } else {
        speedMultiplier = 1.75;      // run = walk * 1.75 — clearly noticeable
        accelBonusMultiplier = 1.40; // faster ramp-up while sprinting
      }
    }
    const runIndicator = getRunIndicator();
    if (runIndicator) {
      runIndicator.style.opacity = sprinting ? '1' : '0';
    }

    player.setMovementModifiers({
      jumpVelocityMultiplier: onesieJumpBoost * (isEra5Level ? (ERA5_JUMP_MULTIPLIER * Math.max(0.9, era5State.stats.jumpMultiplier ?? 1)) : 1),
      maxAirJumps: onesieBuffTimerMs > 0 ? 1 : 0,
      speedMultiplier,
      accelBonusMultiplier,
      airAccelMultiplier: isEra5Level ? ERA5_AIR_ACCEL_MULTIPLIER : 1,
      gravityScale: isEra5Level ? (ERA5_GRAVITY_SCALE * Math.max(0.8, era5State.stats.gravityScale ?? 1)) : 1,
      coyoteTimeMs: isEra5Level ? ERA5_COYOTE_MS : 100,
      jumpBufferWindowMs: isEra5Level ? ERA5_JUMP_BUFFER_MS : 100,
    });

    window.__DADA_DEBUG__.onesieBuffMs = Math.round(onesieBuffTimerMs);
  }

  function resetCrumbles() {
    for (const cs of crumbleStates) {
      cs.state = 'idle';
      cs.timer = 0;
      cs.playerTriggered = false;
      cs.portalTriggered = false;
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
          cs.playerTriggered = true;
          cs.portalTriggered = false;
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
        if (
          levelId === 2
          && cs.cr.portalReset
          && cs.playerTriggered
          && !cs.portalTriggered
          && !respawnState
          && pos.y < cs.cr.portalResetY
        ) {
          cs.portalTriggered = true;
          triggerReset('crumble_portal', pos.x < respawnPoint.x ? 1 : -1);
        }
        if (cs.timer <= 0) {
          cs.state = 'idle';
          cs.playerTriggered = false;
          cs.portalTriggered = false;
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
    try {
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
      if (level1FloorPenaltyCooldownMs > 0) {
        level1FloorPenaltyCooldownMs = Math.max(0, level1FloorPenaltyCooldownMs - (dt * 1000));
      }
      if (flourPuffCooldownMs > 0) {
        flourPuffCooldownMs = Math.max(0, flourPuffCooldownMs - (dt * 1000));
      }
      if (era5CameraManualLookMs > 0) {
        era5CameraManualLookMs = Math.max(0, era5CameraManualLookMs - (dt * 1000));
      }
      if (respawnState) {
        if (respawnState.phase === 'fadeOut') {
          respawnState.timer = Math.max(0, respawnState.timer - dt);
          const t = 1 - (respawnState.timer / 0.16);
          ui.setFade(0.42 * t);

          if (respawnState.timer <= 0) {
            const spawnBase = respawnState.overrideSpawn || respawnPoint;
            const resolved = resolveRespawnPosition(spawnBase);
            player.spawnAt(resolved.x, resolved.y, resolved.z || 0);
            applyEra5FacingState();
            player.setMovementModifiers();
            respawnState = { phase: 'fadeIn', timer: 0.22, reason: respawnState.reason, overrideSpawn: null };
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
          world.level2.update(dt, {
            pos: player.mesh.position,
            triggerReset,
            player,
            spawnPoint,
            floorTopY: currentFloorTopY,
          });
        }
        if (world.level3) {
          world.level3.update(dt, { pos: player.mesh.position, triggerReset, player });
        }
        if (world.level4) {
          world.level4.update(dt, { pos: player.mesh.position, triggerReset, player });
          if (debugMode) window.__DADA_DEBUG__.l4RainActiveCount = world.level4.rainCount;
        }
        // Debug idle: suppress input for probe duration
        const idleSuppressed = debugIdleTimerMs > 0;
        if (idleSuppressed) debugIdleTimerMs = Math.max(0, debugIdleTimerMs - dt * 1000);
        // Player update
        const rawMoveX = idleSuppressed
          ? 0
          : isEra5Level
            ? input.getEra5StrafeAxis()
            : input.getMoveX();
        const rawMoveY = idleSuppressed
          ? 0
          : isEra5Level
            ? input.getEra5ForwardAxis()
            : input.getMoveY();
        const rawTurnAxis = idleSuppressed || !isEra5Level ? 0 : input.getEra5TurnAxis();
        const jumpPress = idleSuppressed ? { edge: false, pressId: 0 } : input.consumeJumpPress();
        const jumpHeld = idleSuppressed ? false : input.isJumpHeld();
        const descendHeld = !idleSuppressed && isEra5Level ? input.isDescendHeld() : false;
        const attackPressed = !idleSuppressed && isEra5Level ? input.consumeAttackPress() : false;
        const cameraYawInput = !idleSuppressed && isEra5Level ? input.getCameraYawInput() : 0;
        const cameraRecenter = !idleSuppressed && isEra5Level ? input.consumeCameraRecenter() : false;
        const era5ControlDt = Math.min(dt, 1 / 30);
        let moveX = rawMoveX;
        let moveZ = 0;
        const era5ToolDef = isEra5Level ? getEquippedEra5ToolDef() : null;
        const scubaFloatActive = !!(
          isEra5Level
          && era5ToolDef?.defId === 'scuba_tank'
          && (world.level5?.isInDeepWater?.(player.mesh.position) || world.era5Level?.isInDeepWater?.(player.mesh.position))
        );
        const jumpJustPressed = scubaFloatActive ? false : jumpPress.edge;
        const playerJumpHeld = scubaFloatActive ? false : jumpHeld;
        const era5FloatMoveY = scubaFloatActive
          ? clamp((jumpHeld ? 1 : 0) + (descendHeld ? -1 : 0), -1, 1)
          : 0;
        if (isEra5Level) {
          era5PlayerYawVel = rawTurnAxis * ERA5_TURN_MAX_SPEED;
          era5PlayerYaw = wrapToPi(era5PlayerYaw + (era5PlayerYawVel * era5ControlDt));
          player.setEra5YawState(era5PlayerYaw, era5PlayerYawVel);

          const playerForward = getEra5PlayerForward();
          const playerRight = getEra5PlayerRight();
          moveX = (playerForward.x * rawMoveY) + (playerRight.x * rawMoveX);
          moveZ = (playerForward.z * rawMoveY) + (playerRight.z * rawMoveX);
          const moveLen = Math.hypot(moveX, moveZ);
          if (moveLen > 1) {
            moveX /= moveLen;
            moveZ /= moveLen;
          }
          if (cameraYawInput !== 0) {
            era5CameraManualLookMs = ERA5_CAMERA_IDLE_RECENTER_DELAY_MS;
            era5CameraDesiredYaw = wrapToPi(era5CameraDesiredYaw + (cameraYawInput * ERA5_CAMERA_YAW_SPEED * era5ControlDt));
          } else if (era5CameraManualLookMs <= 0) {
            era5CameraDesiredYaw = wrapToPi(era5PlayerYaw);
          }
          if (cameraRecenter) {
            era5CameraManualLookMs = 0;
            era5CameraDesiredYaw = wrapToPi(era5PlayerYaw);
            era5CameraYawVel = 0;
          }
        }
        if (isEra5Level) {
          prepareEra5ToolMotion(dt, { jumpHeld });
        }
        const { halfH } = player.getCollisionHalfExtents();
        player.update(dt, moveX, jumpJustPressed, playerJumpHeld, jumpPress.pressId, {
          floatMoveY: isEra5Level ? era5FloatMoveY : rawMoveY,
          floatMode: scubaFloatActive ? 'swim' : player.isCapeFloating() ? 'cape' : null,
          moveZ,
          movementMode: isEra5Level ? 'free' : 'lane',
          facingYaw: isEra5Level ? era5PlayerYaw : null,
        });
        if (attackPressed) {
          fireEra5Weapon();
        }
        if (world.era5Level) {
          world.era5Level.update(dt, {
            pos: player.mesh.position,
            player,
            triggerDamage: applyEra5Damage,
            triggerNearMissCue,
            refillOxygen: refillEra5Oxygen,
            refillToolMeter: refillEra5Oxygen,
            toolActive: era5ToolActive,
            toolDef: getEquippedEra5ToolDef(),
            weaponDef: getEquippedEra5WeaponDef(),
            stats: era5State.stats,
            playCue: (cueName) => audio.playCue(levelId, cueName),
          });
          updateEra5Projectiles(dt);
          updateEra5Oxygen(dt);
          if (debugMode) {
            window.__DADA_DEBUG__.era5LevelState = world.era5Level.getDebugState?.() ?? null;
            if (levelId === 5) {
              window.__DADA_DEBUG__.level5State = window.__DADA_DEBUG__.era5LevelState;
            }
          }
        }
        if (isEra5Level && era5WeaponCooldownMs > 0) {
          era5WeaponCooldownMs = Math.max(0, era5WeaponCooldownMs - (dt * 1000));
        }
        if (player.grounded && player.isCapeFloating()) {
          player.stopCapeFloat();
        }
        if (levelId === 2) {
          const laneDelta = player.mesh.position.z;
          if (player.grounded) {
            player.mesh.position.z = 0;
          } else if (Math.abs(laneDelta) > 0.6) {
            player.mesh.position.z = 0;
          } else if (Math.abs(laneDelta) > 0.001) {
            player.mesh.position.z = damp(player.mesh.position.z, 0, 12, dt);
          }
          if (!level2HorseHintShown && world.level2?.isHorseSnapped?.() !== true && player.mesh.position.x >= -8.8) {
            level2HorseHintShown = true;
            ui.showToast({
              id: 'level2-horse-hint',
              title: 'Push the horse under the ledge!',
              bgColor: '#7c8b54',
              durationMs: 2200,
              enterMs: 110,
              exitMs: 180,
            });
          }
        }
        updateLevel2AnimalDecor(dt);

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
            if (levelId === 1 && fruitMaze && currentFloorTopY !== null && player.mesh.position.y < (currentFloorTopY - 6)) {
              startFruitMazeEscape();
            } else if (levelId === 2 && pongMinigame && currentFloorTopY !== null && player.mesh.position.y < (currentFloorTopY - 6)) {
              startPongEscape();
            } else if (levelId === 3 && balloonRoundup && currentFloorTopY !== null && player.mesh.position.y < (currentFloorTopY - 6)) {
              startBalloonRoundup();
            } else {
              const reason = 'fell_off_level';
              triggerReset(reason, player.mesh.position.x < respawnPoint.x ? 1 : -1);
            }
          }
        }

        if (!isEra5Level && currentFloorTopY !== null) {
          const afterBottomY = player.mesh.position.y - halfH;
          if (prevGrounded && !player.grounded) {
            level1MaxAirborneBottomY = Math.max(prevPlayerBottomY, afterBottomY);
          }
          if (!player.grounded) {
            if ((prevPlayerBottomY - currentFloorTopY) > 1.0 || (afterBottomY - currentFloorTopY) > 1.0) {
              level1AirborneFromAboveFloor = true;
            }
            level1MaxAirborneBottomY = Math.max(level1MaxAirborneBottomY, prevPlayerBottomY, afterBottomY);
          }
          const landedThisFrame = !prevGrounded && player.grounded;
          const nearFloorThreshold = levelId === 2 ? 0.12 : 0.25;
          const fallHeightThreshold = levelId === 2 ? 1.2 : 1.0;
          const nearFloor = Math.abs(afterBottomY - currentFloorTopY) < nearFloorThreshold;
          const fellFromAbove = (level1MaxAirborneBottomY - currentFloorTopY) > fallHeightThreshold;
          const supportedByRaisedSurface = isSupportedByRaisedSurface(player.mesh.position, afterBottomY);
          if (debugMode && landedThisFrame && nearFloor && level1AirborneFromAboveFloor) {
            console.log('[floor-penalty-check]', {
              levelId,
              bottomY: Number(afterBottomY.toFixed(3)),
              floorTopY: Number(currentFloorTopY.toFixed(3)),
              maxAirborneBottomY: Number(level1MaxAirborneBottomY.toFixed(3)),
              landedThisFrame,
              nearFloor,
              fellFromAbove,
              supportedByRaisedSurface,
            });
          }
          if (landedThisFrame && nearFloor && fellFromAbove && level1AirborneFromAboveFloor && !supportedByRaisedSurface) {
            triggerFloorPenalty();
          }
          if (landedThisFrame) {
            level1AirborneFromAboveFloor = false;
            level1MaxAirborneBottomY = afterBottomY;
          }
          prevGrounded = player.grounded;
          prevPlayerBottomY = afterBottomY;
        }

        // HUD updates each frame
        ui.updateObjectiveDir(player.mesh.position.x, goalX);
        updateBuffHud();
        syncEra5Ui();
      }

      // Update blob shadow position (follows player X, stays near ground)
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();

      // Check goal
      const pPos = player.getPosition();
      const playerBottomY = pPos.y - player.getCollisionHalfExtents().halfH;
      const goalBounds = world.goal.getBoundingInfo().boundingBox;
      const goalInside = pPos.x >= goalBounds.minimumWorld.x
        && pPos.x <= goalBounds.maximumWorld.x
        && pPos.y >= goalBounds.minimumWorld.y
        && pPos.y <= goalBounds.maximumWorld.y
        && pPos.z >= goalBounds.minimumWorld.z
        && pPos.z <= goalBounds.maximumWorld.z;
      if (goalInside && !goalReached) {
        if (goalGuardMinX !== null && pPos.x < goalGuardMinX) {
          if (import.meta.env.DEV && !warnedEarlyGoal) {
            warnedEarlyGoal = true;
            console.error(`[goal] blocked early win on level ${levelId} at x=${pPos.x.toFixed(2)} (< ${goalGuardMinX.toFixed(2)})`);
          }
        } else if (goalMinBottomY !== null && playerBottomY < goalMinBottomY) {
          if (import.meta.env.DEV && !warnedLowGoal) {
            warnedLowGoal = true;
            console.error(`[goal] blocked low-approach win on level ${levelId} at bottomY=${playerBottomY.toFixed(2)} (< ${goalMinBottomY.toFixed(2)})`);
          }
        } else {
          goalReached = true;
          startGoalCelebration(world.goalRoot.getAbsolutePosition());
        }
      }

      // Camera follow.
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      if (isEra5Level) {
        const preset = getEra5CameraPreset();
        if (era5CameraDebugOverride) {
          const debugTarget = new BABYLON.Vector3(
            era5CameraDebugOverride.target.x,
            era5CameraDebugOverride.target.y,
            era5CameraDebugOverride.target.z,
          );
          era5CurrentOccluderName = null;
          era5CurrentOcclusionInfo = null;
          camera.position.set(
            era5CameraDebugOverride.position.x,
            era5CameraDebugOverride.position.y,
            era5CameraDebugOverride.position.z,
          );
          camera.setTarget(debugTarget);
          camera.fov = Number.isFinite(era5CameraDebugOverride.fov)
            ? era5CameraDebugOverride.fov
            : preset.fov;
          updateEra5DecorOcclusion(dt, debugTarget, camera.position);
        } else {
          // Direct camera yaw tracking — zero spring lag, no overshoot, no rebound.
          // The desired yaw tracks player yaw when not in manual-look mode,
          // so this gives nearly 1:1 camera-to-player rotation.
          era5CameraYaw = era5CameraDesiredYaw;
          era5CameraYawVel = 0;
          const cameraForward = getEra5CameraForward();
          const lookForward = getEra5PlayerForward();
          const focusPos = new BABYLON.Vector3(px, py + preset.focusHeight, player.mesh.position.z);
          const desiredTarget = new BABYLON.Vector3(
            px + (lookForward.x * preset.lookAhead),
            py + preset.focusHeight,
            player.mesh.position.z + (lookForward.z * preset.lookAhead),
          );
          const desiredCameraPos = new BABYLON.Vector3(
            px - (cameraForward.x * preset.distance),
            py + preset.height,
            player.mesh.position.z - (cameraForward.z * preset.distance),
          );
          const occlusion = resolveCameraOcclusion(scene, focusPos, desiredCameraPos, cameraIgnoredMeshes);
          era5CurrentOccluderName = occlusion.hit?.pickedMesh?.name || occlusion.hit?.mesh?.name || null;
          era5CurrentOcclusionInfo = occlusion.info || null;
          camera.position.copyFrom(constrainEra5CameraToStarterRoom(occlusion.correctedPos));
          camera.setTarget(desiredTarget);
          camera.fov = preset.fov;
          updateEra5DecorOcclusion(dt, focusPos, camera.position);
        }
      } else if (levelId === 2) {
        const desiredCameraPos = new BABYLON.Vector3(px - 10.0, py + 10.0, -18.0);
        camera.position.x = damp(camera.position.x, desiredCameraPos.x, 4.5, dt);
        camera.position.y = damp(camera.position.y, desiredCameraPos.y, 4.5, dt);
        camera.position.z = damp(camera.position.z, desiredCameraPos.z, 4.5, dt);
        camera.setTarget(new BABYLON.Vector3(
          damp(camera.getTarget().x, px, 4.5, dt),
          damp(camera.getTarget().y, py + 1.0, 4.5, dt),
          0,
        ));
        const level2HeadPos = new BABYLON.Vector3(px, py + 1.2, 0);
        const occlusionHits = updateLevel2OccluderFade(dt, level2HeadPos, playerBottomY);
        updateLevel2CameraProbe(dt, occlusionHits);
      } else {
        const targetX = clamp(px + 2, camTargetMinX, camTargetMaxX);
        const desiredCameraPos = new BABYLON.Vector3(targetX - 8, py + 4, CAMERA_FOLLOW_Z);
        const headPos = new BABYLON.Vector3(px, py + 1.2, 0);
        const occlusion = useLevel2CameraOcclusionGuard
          ? resolveLevel2CameraOcclusion(scene, headPos, desiredCameraPos, cameraIgnoredMeshes)
          : useGenericCameraOcclusionGuard
            ? resolveCameraOcclusion(scene, headPos, desiredCameraPos, cameraIgnoredMeshes)
            : { correctedPos: desiredCameraPos, hit: null };
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
    } else if (state === 'menu') {
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();
    } else if (state === 'inventory') {
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();
    } else if (state === 'minigame') {
      activeMinigame?.update(dt, input);
      updatePlayerShadow(player);
      updatePlayerReadabilityLight();
    } else if (state === 'goal') {
      goalTimer = Math.max(0, goalTimer - dt);
      const t = 1 - (goalTimer / GOAL_CELEBRATION_SEC);
      const ease = easeOutCubic(t);
      camera.position = BABYLON.Vector3.Lerp(goalCamStartPos, goalCamEndPos, ease);
      camera.setTarget(BABYLON.Vector3.Lerp(goalCamStartTarget, goalCamEndTarget, ease));
      if (goalCarryStartPos && goalCarryEndPos) {
        player.mesh.position.copyFrom(BABYLON.Vector3.Lerp(goalCarryStartPos, goalCarryEndPos, ease));
      }
      if (goalCarryStartScale && goalCarryEndScale) {
        player.visual.scaling.copyFrom(BABYLON.Vector3.Lerp(goalCarryStartScale, goalCarryEndScale, ease));
      }
      player.updateVisualOnly(dt);
      if (goalTimer <= 0) {
        finishRun();
      }
    } else if (state === 'end') {
      if (input.consumeJump() || input.consumeEnter()) {
        restartRun('keyboard');
      }
    }

    if (state !== 'menu' && state !== 'minigame') {
      updateLevel1AnimalDecor(dt);
      updateLevel1Clouds(dt);
      updateLevel1Ambient(dt);
      updateCoinLossDisplay(dt);
      updateCoinFlybacks(dt);
    }

    // Ambient micro-animations — disabled in shot mode
    if (!shotMode && state !== 'menu' && state !== 'minigame') {
      goalWaveTimer += dt;
      goalVisualRoot.position.y = GOAL_MODEL_SLOT_Y + Math.sin(goalWaveTimer * 1.4) * 0.06;

      if (state === 'gameplay' && !respawnState) {
        for (const coin of coins) {
          if (coin.node && !coin.collected) {
            coin.node.position.copyFrom(coin.position);
            if (isEra5Level) {
              const dx = player.mesh.position.x - coin.position.x;
              const dy = player.mesh.position.y - coin.position.y;
              const dz = player.mesh.position.z - coin.position.z;
              const distanceXZ = Math.hypot(dx, dz);
              if (distanceXZ < 1.6 && Math.abs(dy) < 1.6) {
                const pullStrength = (1.6 - distanceXZ) / 1.6;
                coin.node.position.x += dx * 0.16 * pullStrength;
                coin.node.position.y += dy * 0.10 * pullStrength;
                coin.node.position.z += dz * 0.16 * pullStrength;
              }
            }
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
    window.__DADA_DEBUG__.playerZ = player.mesh.position.z;
    window.__DADA_DEBUG__.playerPos = {
      x: Number(player.mesh.position.x.toFixed(3)),
      y: Number(player.mesh.position.y.toFixed(3)),
      z: Number(player.mesh.position.z.toFixed(3)),
    };
    window.__DADA_DEBUG__.playerVelocity = {
      x: Number(player.vx.toFixed(3)),
      z: Number(player.vz.toFixed(3)),
    };
    // Subtract PI: visual.rotation.y = explicitFacingYaw + PI, so this exposes the logical
    // facing direction (where the face points in the world), which equals playerYaw when moving forward.
    window.__DADA_DEBUG__.playerFacingYaw = Number((player.visual.rotation.y - Math.PI).toFixed(4));
    window.__DADA_DEBUG__.playerYaw = Number(era5PlayerYaw.toFixed(4));
    window.__DADA_DEBUG__.yawVel = Number(era5PlayerYawVel.toFixed(4));
    window.__DADA_DEBUG__.cameraYaw = era5CameraYaw;
    window.__DADA_DEBUG__.cameraDesiredYaw = Number(era5CameraDesiredYaw.toFixed(4));
    window.__DADA_DEBUG__.cameraYawVel = Number(era5CameraYawVel.toFixed(4));
    window.__DADA_DEBUG__.cameraPreset = isEra5Level ? getEra5CameraPreset() : null;
    window.__DADA_DEBUG__.cameraDebugOverride = isEra5Level && era5CameraDebugOverride
      ? {
        label: era5CameraDebugOverride.label,
        position: { ...era5CameraDebugOverride.position },
        target: { ...era5CameraDebugOverride.target },
        fov: era5CameraDebugOverride.fov,
      }
      : null;
    {
      const debugForward = getEra5CameraForward();
      const debugRight = getEra5CameraRight();
      const playerForward = getEra5PlayerForward();
      window.__DADA_DEBUG__.cameraForward = {
        x: Number(debugForward.x.toFixed(4)),
        z: Number(debugForward.z.toFixed(4)),
      };
      window.__DADA_DEBUG__.cameraRight = {
        x: Number(debugRight.x.toFixed(4)),
        z: Number(debugRight.z.toFixed(4)),
      };
      window.__DADA_DEBUG__.playerForward = {
        x: Number(playerForward.x.toFixed(4)),
        z: Number(playerForward.z.toFixed(4)),
      };
    }
    window.__DADA_DEBUG__.l5ProjectileCount = era5Projectiles.length;
    window.__DADA_DEBUG__.era5ProjectileCount = era5Projectiles.length;
    window.__DADA_DEBUG__.musicRunning = !!audio._musicRunning;
    if (isEra5Level) {
      const era5SceneStats = getEra5SceneStats();
      window.__DADA_DEBUG__.gameplayMeshes = era5SceneStats.gameplayMeshes.length;
      window.__DADA_DEBUG__.decorMeshes = era5SceneStats.decorMeshes.length;
      window.__DADA_DEBUG__.fadedMeshes = era5SceneStats.fadedMeshes;
      window.__DADA_DEBUG__.occluderMesh = era5CurrentOccluderName;
      window.__DADA_DEBUG__.cameraOcclusion = era5CurrentOcclusionInfo
        ? {
          desiredDistance: roundNumber(era5CurrentOcclusionInfo.desiredDistance),
          pickDistance: roundNumber(era5CurrentOcclusionInfo.pickDistance),
          entryDistance: roundNumber(era5CurrentOcclusionInfo.entryDistance),
          safeDistance: roundNumber(era5CurrentOcclusionInfo.safeDistance),
          correctedInsidePickedBounds: !!era5CurrentOcclusionInfo.correctedInsidePickedBounds,
          usedEntryClamp: !!era5CurrentOcclusionInfo.usedEntryClamp,
        }
        : null;
      window.__DADA_DEBUG__.levelId = levelId;
      if (era5DevOverlay) {
        era5DevOverlay.textContent = [
          `L${levelId} ${window.__DADA_DEBUG__.sceneKey || 'UnknownScene'}`,
          `gameplay ${era5SceneStats.gameplayMeshes.length}  decor ${era5SceneStats.decorMeshes.length}  faded ${era5SceneStats.fadedMeshes}`,
          `camYaw ${era5CameraYaw.toFixed(3)}  playerYaw ${era5PlayerYaw.toFixed(3)}  yawVel ${era5PlayerYawVel.toFixed(3)}`,
          `occluder ${era5CurrentOccluderName || 'none'}`,
          era5VisibilityFailureReason ? `ASSERT ${era5VisibilityFailureReason}` : '',
        ].filter(Boolean).join('\n');
      }
    }

    // Debug HUD (dev only)
    if (debugHud) {
      const fps = engine.getFps();
      const pDebug = state !== 'title' ? player.getDebugState() : null;
      debugHud.update(fps, pDebug, state, pDebug ? player.lastCollisionHits : 0);
    }

      scene.render();
    } catch (runtimeErr) {
      reportDevError(runtimeErr);
      ui.showStartError(runtimeErr?.message || 'Runtime update failed');
      console.error('[boot] Runtime update failed:', runtimeErr);
      engine.stopRenderLoop();
    }
  });

  window.addEventListener('resize', () => engine.resize());

  return { engine, scene };
}
