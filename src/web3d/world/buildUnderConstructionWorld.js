import * as BABYLON from '@babylonjs/core';

function createShadowLight(scene) {
  const light = new BABYLON.DirectionalLight('uc_keyLight', new BABYLON.Vector3(-0.36, -1, 0.24), scene);
  light.position = new BABYLON.Vector3(8, 14, -10);
  light.intensity = 1.1;
  const shadowGen = new BABYLON.ShadowGenerator(1024, light);
  shadowGen.useBlurExponentialShadowMap = false;
  shadowGen.usePercentageCloserFiltering = true;
  return shadowGen;
}

export function buildUnderConstructionWorld(scene, levelId) {
  scene.clearColor = new BABYLON.Color4(0.06, 0.07, 0.08, 1);

  const hemi = new BABYLON.HemisphericLight('uc_fillLight', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.58;
  hemi.groundColor = new BABYLON.Color3(0.16, 0.15, 0.14);
  const shadowGen = createShadowLight(scene);

  const floorMat = new BABYLON.StandardMaterial('uc_floorMat', scene);
  floorMat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.24);
  floorMat.specularColor = BABYLON.Color3.Black();

  const floor = BABYLON.MeshBuilder.CreateBox('uc_floor', {
    width: 12,
    height: 1,
    depth: 12,
  }, scene);
  floor.position.set(0, -0.5, 0);
  floor.checkCollisions = true;
  floor.isPickable = true;
  floor.material = floorMat;
  shadowGen.addShadowCaster(floor);

  const goalRoot = new BABYLON.TransformNode(`uc_goalRoot_level${levelId}`, scene);
  goalRoot.position.set(4, 0.6, 0);
  const goalTrigger = BABYLON.MeshBuilder.CreateBox('goalTrigger', {
    width: 1.4,
    height: 1.4,
    depth: 1.4,
  }, scene);
  goalTrigger.parent = goalRoot;
  goalTrigger.isVisible = false;
  goalTrigger.visibility = 0;
  goalTrigger.isPickable = false;
  goalTrigger.checkCollisions = false;

  const level = {
    id: levelId,
    title: `Level ${levelId} Under Construction`,
    theme: 'under_construction',
    totalCollectibles: 0,
    extents: { minX: -8, maxX: 8 },
    spawn: { x: -4, y: 0.42, z: 0 },
    goal: { x: 4, y: 0.6, z: 0 },
    ground: { x: 0, y: -0.5, z: 0, w: 12, h: 1, d: 12 },
    platforms: [
      { name: 'uc_floor', x: 0, y: -0.5, z: 0, w: 12, h: 1, d: 12 },
    ],
    goalPresentation: 'trigger-only',
  };

  const era5Level = {
    update() {},
    reset() {},
    tryHitByWeapon() {
      return { hit: false };
    },
    getEnemyReport() {
      return { enemies: [] };
    },
    setEnemyDebugView(nextState = {}) {
      return { ...nextState, enemies: [] };
    },
    getTopologyReport() {
      return null;
    },
    getDebugState() {
      return {
        underConstruction: true,
        levelId,
        activeHazards: 0,
        activePickups: 0,
        activeEnemies: 0,
      };
    },
  };

  return {
    ground: floor,
    groundVisual: floor,
    platforms: [floor],
    goal: goalTrigger,
    goalRoot,
    goalPresentation: 'trigger-only',
    shadowGen,
    foregroundMeshes: [],
    extents: level.extents,
    spawn: level.spawn,
    checkpoints: [],
    pickups: [],
    coins: [],
    hazards: [],
    crumbles: [],
    level,
    era5Level,
    signs: [],
    respawnAnchors: [],
    disableDecorOcclusionFade: true,
    goalGuardMinX: null,
    goalMinBottomY: null,
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
    underConstructionLevelId: levelId,
  };
}
