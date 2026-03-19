import * as BABYLON from '@babylonjs/core';

const PRESERVE = 'preserve';
const ALPHABLEND = BABYLON.Material.MATERIAL_ALPHABLEND;

function freezePolicy(id, definition) {
  return Object.freeze({
    id,
    ...definition,
  });
}

export const RENDER_POLICY_CATEGORIES = Object.freeze({
  worldOpaque: freezePolicy('worldOpaque', {
    renderingGroupId: 1,
    alphaIndex: 0,
    transparencyMode: PRESERVE,
    needDepthPrePass: false,
    depthWrite: true,
    backFaceCulling: true,
    alwaysSelectAsActiveMesh: false,
  }),
  worldAlpha: freezePolicy('worldAlpha', {
    renderingGroupId: 2,
    alphaIndex: 200,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: true,
    depthWrite: false,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  waterSurface: freezePolicy('waterSurface', {
    renderingGroupId: 3,
    alphaIndex: 100,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: true,
    depthWrite: false,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  underwaterOverlay: freezePolicy('underwaterOverlay', {
    renderingGroupId: 3,
    alphaIndex: 800,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: false,
    depthWrite: false,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  heldItem: freezePolicy('heldItem', {
    renderingGroupId: 4,
    alphaIndex: 1000,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: true,
    depthWrite: true,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  projectile: freezePolicy('projectile', {
    renderingGroupId: 4,
    alphaIndex: 900,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: true,
    depthWrite: true,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  enemyAlpha: freezePolicy('enemyAlpha', {
    renderingGroupId: 3,
    alphaIndex: 250,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: true,
    depthWrite: false,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
  vfx: freezePolicy('vfx', {
    renderingGroupId: 3,
    alphaIndex: 500,
    transparencyMode: ALPHABLEND,
    needDepthPrePass: false,
    depthWrite: false,
    backFaceCulling: false,
    alwaysSelectAsActiveMesh: true,
  }),
});

function isMaterial(target) {
  return target instanceof BABYLON.Material || target instanceof BABYLON.MultiMaterial;
}

function appendUnique(list, seen, value) {
  if (!value || seen.has(value)) return;
  seen.add(value);
  list.push(value);
}

function collectMeshesFromTarget(target, meshes, seen) {
  if (!target) return;
  if (Array.isArray(target)) {
    for (const entry of target) collectMeshesFromTarget(entry, meshes, seen);
    return;
  }
  if (target instanceof BABYLON.AbstractMesh) {
    appendUnique(meshes, seen, target);
    return;
  }
  if (target instanceof BABYLON.TransformNode) {
    for (const mesh of target.getChildMeshes(false)) appendUnique(meshes, seen, mesh);
  }
}

function collectMaterialsFromTarget(target, materials, seen) {
  if (!target) return;
  if (Array.isArray(target)) {
    for (const entry of target) collectMaterialsFromTarget(entry, materials, seen);
    return;
  }
  if (target instanceof BABYLON.MultiMaterial) {
    for (const material of target.subMaterials || []) appendUnique(materials, seen, material);
    return;
  }
  if (target instanceof BABYLON.Material) {
    appendUnique(materials, seen, target);
    return;
  }
  if (target instanceof BABYLON.AbstractMesh) {
    collectMaterialsFromTarget(target.material, materials, seen);
    return;
  }
  if (target instanceof BABYLON.TransformNode) {
    for (const mesh of target.getChildMeshes(false)) collectMaterialsFromTarget(mesh, materials, seen);
  }
}

function resolvePolicy(categoryOrPolicy) {
  if (!categoryOrPolicy) {
    throw new Error('Render policy category is required.');
  }
  if (typeof categoryOrPolicy === 'string') {
    const resolved = RENDER_POLICY_CATEGORIES[categoryOrPolicy];
    if (!resolved) {
      throw new Error(`Unknown render policy category "${categoryOrPolicy}".`);
    }
    return resolved;
  }
  return categoryOrPolicy;
}

function supportsProperty(target, key) {
  return !!target && key in target;
}

function applyDepthWrite(material, depthWrite) {
  if (depthWrite === PRESERVE) return;
  if (supportsProperty(material, 'forceDepthWrite')) {
    material.forceDepthWrite = depthWrite === true;
  }
  if (supportsProperty(material, 'disableDepthWrite')) {
    material.disableDepthWrite = depthWrite === false;
  }
}

function applyPolicyToMaterial(material, policy) {
  if (!material) return;
  if (policy.transparencyMode !== PRESERVE && supportsProperty(material, 'transparencyMode')) {
    material.transparencyMode = policy.transparencyMode;
  }
  if (policy.needDepthPrePass !== PRESERVE && supportsProperty(material, 'needDepthPrePass')) {
    material.needDepthPrePass = policy.needDepthPrePass;
  }
  if (policy.backFaceCulling !== PRESERVE && supportsProperty(material, 'backFaceCulling')) {
    material.backFaceCulling = policy.backFaceCulling;
  }
  applyDepthWrite(material, policy.depthWrite);
  material._dadaRenderPolicyCategory = policy.id;
}

function applyPolicyToMesh(mesh, policy) {
  if (!(mesh instanceof BABYLON.AbstractMesh)) return;
  mesh.renderingGroupId = policy.renderingGroupId;
  mesh.alphaIndex = policy.alphaIndex;
  if (policy.alwaysSelectAsActiveMesh !== PRESERVE) {
    mesh.alwaysSelectAsActiveMesh = policy.alwaysSelectAsActiveMesh;
  }
  mesh.metadata = {
    ...(mesh.metadata || {}),
    renderPolicyCategory: policy.id,
  };
}

export function applyRenderPolicy(target, categoryOrPolicy, { meshes = true, materials = true } = {}) {
  const policy = resolvePolicy(categoryOrPolicy);
  const meshList = [];
  const meshSeen = new Set();
  const materialList = [];
  const materialSeen = new Set();

  if (meshes) collectMeshesFromTarget(target, meshList, meshSeen);
  if (materials) collectMaterialsFromTarget(target, materialList, materialSeen);

  for (const mesh of meshList) applyPolicyToMesh(mesh, policy);
  for (const material of materialList) applyPolicyToMaterial(material, policy);

  return {
    policy,
    meshes: meshList,
    materials: materialList,
  };
}

export function applyRenderPolicyToMaterials(target, categoryOrPolicy) {
  return applyRenderPolicy(target, categoryOrPolicy, { meshes: false, materials: true });
}

export function applyRenderPolicyToMeshes(target, categoryOrPolicy) {
  return applyRenderPolicy(target, categoryOrPolicy, { meshes: true, materials: false });
}

export function applyWorldOpaqueRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'worldOpaque', options);
}

export function applyWorldAlphaRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'worldAlpha', options);
}

export function applyWaterSurfaceRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'waterSurface', options);
}

export function applyUnderwaterOverlayRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'underwaterOverlay', options);
}

export function applyHeldItemRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'heldItem', options);
}

export function applyProjectileRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'projectile', options);
}

export function applyEnemyAlphaRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'enemyAlpha', options);
}

export function applyVfxRenderPolicy(target, options) {
  return applyRenderPolicy(target, 'vfx', options);
}
