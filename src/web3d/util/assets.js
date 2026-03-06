import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { makePlastic, makeCardboard } from '../materials.js';

const manifestCache = {
  promise: null,
  data: null,
};

const containerCache = new Map();
const optionalWarnedKeys = new Set();

function baseUrl() {
  return import.meta.env.BASE_URL || '/';
}

function withBase(path) {
  const base = baseUrl();
  if (base.endsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}

function modelIdFromPath(path = '') {
  const file = path.split('/').pop() || '';
  return file.replace(/\.[^.]+$/, '');
}

function normalizeScale(scale) {
  if (typeof scale === 'number') return new BABYLON.Vector3(scale, scale, scale);
  if (Array.isArray(scale) && scale.length === 3) {
    return new BABYLON.Vector3(
      Number(scale[0]) || 1,
      Number(scale[1]) || 1,
      Number(scale[2]) || 1,
    );
  }
  return new BABYLON.Vector3(1, 1, 1);
}

function normalizeManifest(data) {
  const modelDefs = [];
  const rawModels = Array.isArray(data?.models) ? data.models : [];
  for (const m of rawModels) {
    if (typeof m === 'string') {
      modelDefs.push({
        id: modelIdFromPath(m),
        path: `assets/glb/${m}`,
        scale: 1,
        yOffset: 0,
      });
      continue;
    }
    if (!m || typeof m !== 'object') continue;
    const path = typeof m.path === 'string' ? m.path : '';
    if (!path) continue;
    const id = typeof m.id === 'string' && m.id ? m.id : modelIdFromPath(path);
    modelDefs.push({
      id,
      path,
      scale: m.scale ?? 1,
      yOffset: Number(m.yOffset) || 0,
    });
  }

  const byId = new Map();
  for (const model of modelDefs) {
    byId.set(model.id, model);
  }

  const hdriPath = (typeof data?.hdri?.path === 'string' && data.hdri.path)
    ? data.hdri.path
    : null;

  const normalizedRoles = {};
  if (data?.roles && typeof data.roles === 'object') {
    for (const [roleName, value] of Object.entries(data.roles)) {
      if (Array.isArray(value)) {
        const ids = value.filter((v) => typeof v === 'string' && v.trim().length > 0);
        if (ids.length) normalizedRoles[roleName] = ids;
      } else if (typeof value === 'string' && value.trim().length > 0) {
        normalizedRoles[roleName] = [value];
      }
    }
  }

  return {
    primaryPack: typeof data?.primaryPack === 'string' ? data.primaryPack : null,
    models: modelDefs,
    byId,
    roles: normalizedRoles,
    hdri: hdriPath ? { path: hdriPath } : null,
  };
}

async function fetchManifest(path) {
  const res = await fetch(withBase(path), { cache: 'no-cache' });
  if (!res.ok) return null;
  return res.json();
}

async function getManifest() {
  if (manifestCache.data) return manifestCache.data;
  if (!manifestCache.promise) {
    manifestCache.promise = (async () => {
      const candidates = ['assets/manifest.json', 'assets/glb/manifest.json'];
      for (const path of candidates) {
        try {
          const json = await fetchManifest(path);
          if (json) {
            manifestCache.data = normalizeManifest(json);
            return manifestCache.data;
          }
        } catch {
          // Try next manifest candidate.
        }
      }
      manifestCache.data = normalizeManifest({ models: [] });
      return manifestCache.data;
    })();
  }
  return manifestCache.promise;
}

function applyFallbackMaterials(scene, meshes, style = 'plastic') {
  let material = null;
  const make = () => {
    if (material) return material;
    material = style === 'cardboard'
      ? makeCardboard(scene, `assetFallback_${style}`, 180, 162, 132)
      : makePlastic(scene, `assetFallback_${style}`, 0.86, 0.82, 0.76, { roughness: 0.45 });
    return material;
  };

  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    if (!mesh.material) {
      mesh.material = make();
    }
  }
}

function collectMeshes(rootNodes) {
  const meshes = [];
  for (const root of rootNodes) {
    if (root instanceof BABYLON.Mesh) meshes.push(root);
    meshes.push(...root.getChildMeshes(false));
  }
  return meshes;
}

function findModelByFileName(manifest, fileName) {
  const normalized = fileName.toLowerCase();
  for (const model of manifest.models) {
    const file = model.path.split('/').pop()?.toLowerCase();
    if (file === normalized) return model;
  }
  return null;
}

function applyTransform(rootNodes, {
  modelScale,
  modelYOffset = 0,
  parent = null,
  position = null,
  scaling = null,
  rotation = null,
} = {}) {
  const modelScaleVec = normalizeScale(modelScale);
  const scaleVec = scaling ? normalizeScale(scaling) : new BABYLON.Vector3(1, 1, 1);
  for (const root of rootNodes) {
    if (parent) root.parent = parent;
    root.scaling = new BABYLON.Vector3(
      root.scaling.x * modelScaleVec.x * scaleVec.x,
      root.scaling.y * modelScaleVec.y * scaleVec.y,
      root.scaling.z * modelScaleVec.z * scaleVec.z,
    );
    root.position.y += modelYOffset;
    if (position) {
      root.position.addInPlace(position);
    }
    if (rotation) {
      root.rotation = root.rotation.add(rotation);
    }
  }
}

async function loadContainer(scene, modelPath) {
  let promise = containerCache.get(modelPath);
  if (!promise) {
    const url = withBase(modelPath);
    const slashIndex = url.lastIndexOf('/');
    const rootUrl = slashIndex >= 0 ? url.slice(0, slashIndex + 1) : '';
    const sceneFileName = slashIndex >= 0 ? url.slice(slashIndex + 1) : url;
    promise = BABYLON.SceneLoader.LoadAssetContainerAsync(rootUrl, sceneFileName, scene, undefined, '.glb')
      .catch((error) => ({ __failed: true, error }));
    containerCache.set(modelPath, promise);
  }
  return promise;
}

function warnOptionalModel(roleName, reason) {
  if (!import.meta.env.DEV) return;
  const key = `${roleName}:${reason}`;
  if (optionalWarnedKeys.has(key)) return;
  optionalWarnedKeys.add(key);
  console.warn(`[assets] optional model '${roleName}' unavailable: ${reason}`);
}

export async function getAssetManifest() {
  return getManifest();
}

export async function getRoleModelIds(roleName) {
  const manifest = await getManifest();
  return manifest.roles[roleName] || [];
}

export async function resolveModelIdForRole(roleName) {
  const manifest = await getManifest();
  const ids = manifest.roles[roleName] || [];
  for (const id of ids) {
    if (manifest.byId.has(id)) return id;
  }
  return null;
}

export async function loadModelById(scene, modelId, options = {}) {
  const {
    parent = null,
    position = null,
    scaling = null,
    rotation = null,
    fallbackMaterial = 'plastic',
    silent = false,
  } = options;

  const manifest = await getManifest();
  const model = manifest.byId.get(modelId);
  if (!model) {
    return { loaded: false, reason: 'not_in_manifest', meshes: [], roots: [] };
  }

  const loadedContainer = await loadContainer(scene, model.path);
  if (!loadedContainer || loadedContainer.__failed) {
    const errText = loadedContainer?.error
      ? ` (${loadedContainer.error.message || String(loadedContainer.error)})`
      : '';
    if (!silent) {
      console.warn(
        `[assets] Failed to load ${model.id} from ${model.path}; using fallback visuals.${errText}`,
      );
    }
    return { loaded: false, reason: 'load_failed', meshes: [], roots: [] };
  }

  const instantiated = loadedContainer.instantiateModelsToScene(
    undefined,
    false,
    { doNotInstantiate: false },
  );
  const roots = instantiated.rootNodes || [];
  applyTransform(roots, {
    modelScale: model.scale,
    modelYOffset: model.yOffset,
    parent,
    position,
    scaling,
    rotation,
  });

  const meshes = collectMeshes(roots);
  applyFallbackMaterials(scene, meshes, fallbackMaterial);
  return { loaded: true, reason: 'ok', meshes, roots, model };
}

export async function loadGlbIfAvailable(scene, fileName, options = {}) {
  const manifest = await getManifest();
  const model = findModelByFileName(manifest, fileName);
  if (!model) {
    return { loaded: false, reason: 'not_in_manifest', meshes: [], roots: [] };
  }
  return loadModelById(scene, model.id, options);
}

export async function loadModelForRole(scene, roleName, options = {}) {
  const manifest = await getManifest();
  const ids = manifest.roles[roleName] || [];
  if (!ids.length) {
    return { loaded: false, reason: 'role_not_mapped', role: roleName, meshes: [], roots: [] };
  }

  let lastResult = null;
  for (const modelId of ids) {
    if (!manifest.byId.has(modelId)) continue;
    const result = await loadModelById(scene, modelId, options);
    if (result.loaded) {
      return { ...result, role: roleName, usedModelId: modelId };
    }
    lastResult = result;
  }

  return lastResult || {
    loaded: false,
    reason: 'role_models_missing',
    role: roleName,
    meshes: [],
    roots: [],
  };
}

export async function loadOptionalModel(scene, roleName, options = {}) {
  const manifest = await getManifest();
  const ids = manifest.roles[roleName] || [];
  if (!ids.length) {
    warnOptionalModel(roleName, 'role_not_mapped');
    return null;
  }

  const result = await loadModelForRole(scene, roleName, {
    ...options,
    silent: true,
  });
  if (!result?.loaded) {
    warnOptionalModel(roleName, result?.reason || 'load_failed');
    return null;
  }
  return result;
}

export async function getAvailableModels() {
  const manifest = await getManifest();
  return manifest.models.map((m) => m.id);
}

export async function applyHdriEnvironment(scene, options = {}) {
  const { intensity = 0.42 } = options;
  const manifest = await getManifest();
  if (!manifest.hdri?.path) {
    return { loaded: false, reason: 'no_hdri' };
  }

  const hdriPath = withBase(manifest.hdri.path);
  try {
    if (typeof BABYLON.HDRCubeTexture !== 'function') {
      return { loaded: false, reason: 'unsupported' };
    }
    const texture = new BABYLON.HDRCubeTexture(hdriPath, scene, 256, false, true, false, true);
    scene.environmentTexture = texture;
    scene.environmentIntensity = intensity;
    return { loaded: true, reason: 'ok', path: manifest.hdri.path };
  } catch (error) {
    console.warn(`[assets] Failed to load HDRI ${manifest.hdri.path}`, error);
    return { loaded: false, reason: 'load_failed', path: manifest.hdri.path };
  }
}
