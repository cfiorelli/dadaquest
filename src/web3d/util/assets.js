import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { makePlastic, makeCardboard } from '../materials.js';

const manifestCache = {
  promise: null,
  data: null,
};

const modelCache = new Map();

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

async function getManifest() {
  if (manifestCache.data) return manifestCache.data;
  if (!manifestCache.promise) {
    manifestCache.promise = fetch(withBase('assets/glb/manifest.json'), { cache: 'no-cache' })
      .then(async (res) => {
        if (!res.ok) return { models: [] };
        const data = await res.json();
        if (!Array.isArray(data.models)) return { models: [] };
        return data;
      })
      .catch(() => ({ models: [] }))
      .then((data) => {
        manifestCache.data = data;
        return data;
      });
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

export async function loadGlbIfAvailable(scene, fileName, options = {}) {
  const {
    parent = null,
    position = null,
    scaling = null,
    fallbackMaterial = 'plastic',
  } = options;

  const manifest = await getManifest();
  if (!manifest.models.includes(fileName)) {
    return { loaded: false, reason: 'not_in_manifest', meshes: [] };
  }

  let importResultPromise = modelCache.get(fileName);
  if (!importResultPromise) {
    const url = withBase(`assets/glb/${fileName}`);
    importResultPromise = BABYLON.SceneLoader.ImportMeshAsync('', '', url, scene)
      .then((result) => ({ ok: true, result }))
      .catch((error) => ({ ok: false, error }));
    modelCache.set(fileName, importResultPromise);
  }

  const loaded = await importResultPromise;
  if (!loaded.ok) {
    console.warn(`[assets] Failed to load ${fileName}; using fallback primitives.`);
    return { loaded: false, reason: 'load_failed', meshes: [] };
  }

  const { meshes } = loaded.result;
  for (const mesh of meshes) {
    if (mesh === scene.meshes[0]) continue;
    if (parent) {
      mesh.parent = parent;
    }
    if (position && mesh.parent === parent) {
      mesh.position.addInPlace(position);
    }
    if (scaling && mesh.parent === parent) {
      mesh.scaling = mesh.scaling.multiply(scaling);
    }
  }

  applyFallbackMaterials(scene, meshes, fallbackMaterial);
  return { loaded: true, reason: 'ok', meshes };
}

export async function getAvailableModels() {
  const manifest = await getManifest();
  return manifest.models.slice();
}
