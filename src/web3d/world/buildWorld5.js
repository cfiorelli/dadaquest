import * as BABYLON from '@babylonjs/core';
import { LEVEL5 } from './level5.js';
import { buildEraAdventureWorld } from './buildEraAdventureWorld.js';
import { createTelegraphedHazard } from './telegraphHazard.js';
import { NoiseWanderMover } from './noiseMover.js';
import { markDecorNode } from './envFx.js';
import { makePlastic } from '../materials.js';
import {
  applyEnemyAlphaRenderPolicy,
  applyRenderPolicyToMaterials,
  applyRenderPolicyToMeshes,
  applyVfxRenderPolicy,
  applyWaterSurfaceRenderPolicy,
  applyWorldAlphaRenderPolicy,
  applyWorldOpaqueRenderPolicy,
} from '../render/renderPolicy.js';

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

function lerp(a, b, t) {
  return a + ((b - a) * t);
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
  zone.material = zoneMat;
  applyVfxRenderPolicy(zone);
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
    arrow.material = arrowMat;
    if (def.pushX < 0) arrow.rotation.z = Math.PI;
    applyVfxRenderPolicy(arrow);
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
    bubble.material = bubbleMat;
    applyVfxRenderPolicy(bubble);
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
  root.position.set(def.x, 0, def.z ?? 0);
  const hasNorthExitStairs = def.northExitStairs !== false;

  // ── Geometry constants ────────────────────────────────────────────────────
  const DECK_Y    = 0;
  const SHALLOW_Y = -0.70;              // shallow floor top Y
  const DEEP_Y    = -1.70;              // deep floor top Y
  const WALL_T    = 0.50;               // wall box thickness
  const HALF_W    = (def.w ?? 16) * 0.5;  // 8.0  (local X: -8..+8)
  const HALF_D    = (def.d ?? 8)  * 0.5;  // 4.0  (local Z: -4..+4)
  const IN_HW     = HALF_W - WALL_T;      // 7.5  inner half-width
  const IN_HD     = HALF_D - WALL_T;      // 3.5  inner half-depth
  const IN_W      = IN_HW * 2;            // 15.0
  const IN_D      = IN_HD * 2;            // 7.0
  const STAIR_HW  = 1.0;               // stair bay half-width (local x: -1..+1)
  const STEP_DZ   = 0.35;              // step z-depth
  const STEP_DY   = 0.175;             // step y-height (0.70 / 4)
  // Transition zone: local Z -0.5 → +0.5  (4 steps of 0.25m each)
  const TRANS_ZMIN = -0.5;
  const TRANS_ZMAX = +0.5;
  // Wall boxes: height 2.50, top Y +0.50, bottom Y -2.00, center Y -0.75.
  // Top exceeds player-in-basin top (~+0.10), so AABB always resolves horizontally.
  const WALL_H  = 2.50;
  const WALL_CY = -0.75;
  const WATER_SURFACE_Y = DECK_Y - 0.05;
  const DEEP_FLOAT_DEPTH_THRESHOLD = 1.05;
  // Derived depth constants for water state logic
  const SHALLOW_DEPTH = -SHALLOW_Y;   // 0.70
  const DEEP_DEPTH = -DEEP_Y;         // 1.70
  const SHALLOW_MAX_LZ = TRANS_ZMIN;  // -0.5 (where shallow zone ends)
  const SLOPE_MAX_LZ = TRANS_ZMAX;    // +0.5 (where deep zone begins)

  const visualMeshes = [];
  const collisionMeshes = [];

  function tagPoolVisual(mesh, applyPolicy = applyWorldOpaqueRenderPolicy) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    applyPolicy(mesh);
    markDecor(mesh);
    visualMeshes.push(mesh);
    return mesh;
  }

  function createPoolCollider(name, dims, position, role = 'blocker') {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, {
      width: Math.max(0.04, dims.width),
      height: Math.max(0.04, dims.height),
      depth: Math.max(0.04, dims.depth),
    }, scene);
    // No parent — bake root world offset into position so setColliders reads world coords via p.position
    mesh.position.set(def.x + position.x, position.y, (def.z ?? 0) + position.z);
    mesh.visibility = 0;
    mesh.isPickable = role === 'blocker';
    mesh.checkCollisions = true;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      gameplaySurface: role === 'walkable',
      gameplayBlocker: role === 'blocker',
      truthRole: role === 'walkable' ? 'walkable' : 'blocker',
      colliderKind: role,
      poolCollider: true,
      poolName: def.name,
    };
    collisionMeshes.push(mesh);
    return mesh;
  }

  // Depth: stair-exit bay (localZ < -2.0) is shallow so player can walk out.
  // Everywhere else is deep — matches the flat visual floor at DEEP_Y.
  function getDepthAtWorldZ(worldZ) {
    if (!hasNorthExitStairs) return DEEP_DEPTH;
    const localZ = worldZ - (def.z ?? 0);
    return localZ < -2.0 ? SHALLOW_DEPTH : DEEP_DEPTH;
  }

  // Water logic volume: X half-extent 7.80, Z half-extent 3.80 (spec C).
  function inBasinXZ(pos) {
    return Math.abs(pos.x - def.x) <= 7.80 && Math.abs(pos.z - (def.z ?? 0)) <= 3.80;
  }

  function getWaterStateAtPosition(pos, headY = pos.y) {
    if (!inBasinXZ(pos)) {
      return {
        inDeepWater: false,
        headSubmerged: false,
        waterSurfaceY: WATER_SURFACE_Y,
        depthAtZ: null,
      };
    }
    const depthAtZ = getDepthAtWorldZ(pos.z);
    const basinBottomAtZ = DECK_Y - depthAtZ;
    const insideWaterColumn = pos.y >= basinBottomAtZ && pos.y <= WATER_SURFACE_Y;
    const inDeepWater = insideWaterColumn && depthAtZ >= DEEP_FLOAT_DEPTH_THRESHOLD;
    return {
      inDeepWater,
      headSubmerged: headY <= (WATER_SURFACE_Y - 0.03),
      waterSurfaceY: WATER_SURFACE_Y,
      depthAtZ,
    };
  }

  // ── Stencil portal gate ───────────────────────────────────────────────────
  // Pool interior is only visible through the deck-level aperture (stencil=1).
  // From the sides or underneath the aperture doesn't project → interior hidden.
  scene.stencilEnabled = true;
  // Preserve stencil from group 2 (aperture) into group 3 (interior); depth still cleared.
  scene.setRenderingAutoClearDepthStencil(3, true, true, false);

  function addStencilTest(mat) {
    mat.stencil.enabled = true;
    mat.stencil.func           = BABYLON.Constants.EQUAL;
    mat.stencil.funcRef        = 1;
    mat.stencil.opStencilFail  = BABYLON.Constants.KEEP;
    mat.stencil.opDepthFail    = BABYLON.Constants.KEEP;
    mat.stencil.opDepthPass    = BABYLON.Constants.KEEP;
  }

  // 1) Basin/deck visuals
  const basinWallMat = new BABYLON.StandardMaterial(`${def.name}_basinWallMat`, scene);
  basinWallMat.diffuseColor = new BABYLON.Color3(0.78, 0.85, 0.89);
  basinWallMat.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.09);
  basinWallMat.specularColor = new BABYLON.Color3(0.08, 0.10, 0.10);
  addStencilTest(basinWallMat);

  const floorMat = new BABYLON.StandardMaterial(`${def.name}_basinFloorMat`, scene);
  floorMat.diffuseColor = new BABYLON.Color3(0.27, 0.36, 0.43);
  floorMat.emissiveColor = new BABYLON.Color3(0.03, 0.06, 0.08);
  floorMat.specularColor = new BABYLON.Color3(0.05, 0.06, 0.08);
  addStencilTest(floorMat);

  const copeMat = new BABYLON.StandardMaterial(`${def.name}_copeMat`, scene);
  copeMat.diffuseColor = new BABYLON.Color3(0.88, 0.90, 0.92);
  copeMat.emissiveColor = new BABYLON.Color3(0.03, 0.03, 0.03);
  copeMat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);

  // ── A1. Coping / rim (4 pieces, flush with deck, local coords relative to root) ──
  // Spec world positions → local = world - (def.x, 0, def.z).
  const copingDefs = [
    { name: 'north', lx:   0,      lz: -3.925, width: 16.00, depth: 0.15 },
    { name: 'south', lx:   0,      lz:  3.925, width: 16.00, depth: 0.15 },
    { name: 'west',  lx: -7.925,   lz:  0,     width:  0.15, depth: 8.00 },
    { name: 'east',  lx:  7.925,   lz:  0,     width:  0.15, depth: 8.00 },
  ];
  for (const cd of copingDefs) {
    const cope = BABYLON.MeshBuilder.CreateBox(`${def.name}_cope_${cd.name}_vis`, {
      width: cd.width, height: 0.03, depth: cd.depth,
    }, scene);
    cope.parent = root;
    cope.position.set(cd.lx, DECK_Y + 0.015, cd.lz);
    cope.material = copeMat;
    tagPoolVisual(cope);
  }

  // ── A2. Interior basin walls (inward-facing planes, all height 1.70 top-to-floor) ──
  // All walls: height=1.70, center y=-0.85 → top y=0 (deck), bottom y=-1.70 (flat floor).
  const northWall = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_north_vis`, {
    width: 15.90, height: 1.70,
  }, scene);
  northWall.parent = root;
  northWall.position.set(0, -0.85, -3.95);
  // Default Babylon plane normal is +Z — visible from inside (player is south of north wall).
  northWall.material = basinWallMat;
  tagPoolVisual(northWall);

  const southTunnel = def.southTunnelMouth || null;
  if (southTunnel?.width > 0) {
    const tunnelHalfWidth = southTunnel.width * 0.5;
    const leftWidth = 7.95 - tunnelHalfWidth;
    const rightWidth = leftWidth;
    const openingTopY = Math.min(DECK_Y, southTunnel.centerY + (southTunnel.height * 0.5));
    const openingHeaderHeight = DECK_Y - openingTopY;

    const southWallWest = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_south_west_vis`, {
      width: leftWidth,
      height: 1.70,
    }, scene);
    southWallWest.parent = root;
    southWallWest.position.set(-tunnelHalfWidth - (leftWidth * 0.5), -0.85, 3.95);
    southWallWest.rotation.y = Math.PI;
    southWallWest.material = basinWallMat;
    tagPoolVisual(southWallWest);

    const southWallEast = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_south_east_vis`, {
      width: rightWidth,
      height: 1.70,
    }, scene);
    southWallEast.parent = root;
    southWallEast.position.set(tunnelHalfWidth + (rightWidth * 0.5), -0.85, 3.95);
    southWallEast.rotation.y = Math.PI;
    southWallEast.material = basinWallMat;
    tagPoolVisual(southWallEast);

    if (openingHeaderHeight > 0.02) {
      const southWallHeader = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_south_header_vis`, {
        width: southTunnel.width,
        height: openingHeaderHeight,
      }, scene);
      southWallHeader.parent = root;
      southWallHeader.position.set(0, openingTopY + (openingHeaderHeight * 0.5), 3.95);
      southWallHeader.rotation.y = Math.PI;
      southWallHeader.material = basinWallMat;
      tagPoolVisual(southWallHeader);
    }
  } else {
    const southWall = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_south_vis`, {
      width: 15.90, height: 1.70,
    }, scene);
    southWall.parent = root;
    southWall.position.set(0, -0.85, 3.95);
    southWall.rotation.y = Math.PI;
    southWall.material = basinWallMat;
    tagPoolVisual(southWall);
  }

  // West wall: world X 28.05, Y -0.85, Z 30 → local (-7.95, -0.85, 0), span Z 7.90, H 1.70, face +X
  const westWall = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_west_vis`, {
    width: 7.90, height: 1.70,
  }, scene);
  westWall.parent = root;
  westWall.position.set(-7.95, -0.85, 0);
  westWall.rotation.y = Math.PI * 0.5;  // face +X (inward)
  westWall.material = basinWallMat;
  tagPoolVisual(westWall);

  // East wall: world X 43.95, Y -0.85, Z 30 → local (7.95, -0.85, 0), span Z 7.90, H 1.70, face -X
  const eastWall = BABYLON.MeshBuilder.CreatePlane(`${def.name}_basin_wall_east_vis`, {
    width: 7.90, height: 1.70,
  }, scene);
  eastWall.parent = root;
  eastWall.position.set(7.95, -0.85, 0);
  eastWall.rotation.y = -Math.PI * 0.5;  // face -X (inward)
  eastWall.material = basinWallMat;
  tagPoolVisual(eastWall);

  // ── A3. Floor (one flat surface at deep level) ────────────────────────────
  const poolFloor = BABYLON.MeshBuilder.CreateGround(`${def.name}_floor_vis`, {
    width: IN_W, height: IN_D, subdivisions: 1,
  }, scene);
  poolFloor.parent = root;
  poolFloor.position.set(0, DEEP_Y, 0);
  poolFloor.material = floorMat;
  tagPoolVisual(poolFloor);

  // ── A4. Water surface (non-solid) ─────────────────────────────────────────
  // world X 36, Y -0.05, Z 30 → local (0, -0.05, 0), size X 15.70, Z 7.70
  const water = BABYLON.MeshBuilder.CreateGround(`${def.name}_water_surface_vis`, {
    width: 15.70, height: 7.70, subdivisions: 1,
  }, scene);
  water.parent = root;
  water.position.set(0, WATER_SURFACE_Y, 0);
  const waterMat = new BABYLON.StandardMaterial(`${def.name}_waterMat`, scene);
  waterMat.diffuseColor = new BABYLON.Color3(0.14, 0.52, 0.66);
  waterMat.emissiveColor = new BABYLON.Color3(0.03, 0.12, 0.16);
  waterMat.alpha = 0.64;
  waterMat.specularColor = new BABYLON.Color3(0.16, 0.22, 0.28);
  addStencilTest(waterMat);
  water.material = waterMat;
  tagPoolVisual(water, applyWaterSurfaceRenderPolicy);

  // ── A5. Lane stripe ────────────────────────────────────────────────────────
  // world X 36, Y -1.695, Z 31.00 → local (0, -1.695, 1.00), size X 0.35, Y 0.01, Z 4.80
  const laneMat = new BABYLON.StandardMaterial(`${def.name}_laneMat`, scene);
  laneMat.diffuseColor = new BABYLON.Color3(0.08, 0.14, 0.40);
  laneMat.emissiveColor = new BABYLON.Color3(0.02, 0.04, 0.10);
  addStencilTest(laneMat);
  const laneStripe = BABYLON.MeshBuilder.CreateBox(`${def.name}_lane_stripe_vis`, {
    width: 0.35, height: 0.01, depth: 4.80,
  }, scene);
  laneStripe.parent = root;
  laneStripe.position.set(0, -1.695, 1.00);
  laneStripe.material = laneMat;
  tagPoolVisual(laneStripe);

  // ── A7. Exit stairs (visible, north bay, X width 2.40 centered at X 36) ───
  // 4 stairs descending south (+Z) from deck level into shallow floor.
  // Local positions: world Z - def.z. E.g. Z 26.525 → local z = -3.475.
  const stepMat = new BABYLON.StandardMaterial(`${def.name}_stepMat`, scene);
  stepMat.diffuseColor = new BABYLON.Color3(0.72, 0.80, 0.86);
  stepMat.emissiveColor = new BABYLON.Color3(0.03, 0.05, 0.07);
  stepMat.specularColor = new BABYLON.Color3(0.05, 0.06, 0.08);
  addStencilTest(stepMat);
  if (hasNorthExitStairs) {
    const visStairDefs = [
      { ly: -0.0875, lz: -3.475 },
      { ly: -0.2625, lz: -3.125 },
      { ly: -0.4375, lz: -2.775 },
      { ly: -0.6125, lz: -2.425 },
    ];
    for (let i = 0; i < visStairDefs.length; i++) {
      const s = visStairDefs[i];
      const stairMesh = BABYLON.MeshBuilder.CreateBox(`${def.name}_vis_stair_${i + 1}`, {
        width: 2.40, height: 0.175, depth: 0.35,
      }, scene);
      stairMesh.parent = root;
      stairMesh.position.set(0, s.ly, s.lz);
      stairMesh.material = stepMat;
      tagPoolVisual(stairMesh);
    }
  }

  // ── A8. Stencil aperture (invisible, group 2, writes stencil=1 at deck opening) ──
  // Renders before group 3 interior; covers pool opening footprint at Y=0.
  const aperture = BABYLON.MeshBuilder.CreateGround(`${def.name}_aperture`, {
    width: 15.60, height: 7.60, subdivisions: 1,
  }, scene);
  aperture.parent = root;
  aperture.position.set(0, -0.005, 0); // slightly below deck: avoids z-fight grey-line artifact
  const apertureMat = new BABYLON.StandardMaterial(`${def.name}_apertureMat`, scene);
  apertureMat.disableColorWrite = true; // stencil-only: no color writes → no grey edge lines
  apertureMat.stencil.enabled       = true;
  apertureMat.stencil.func          = BABYLON.Constants.ALWAYS;
  apertureMat.stencil.funcRef       = 1;
  apertureMat.stencil.opStencilFail = BABYLON.Constants.KEEP;
  apertureMat.stencil.opDepthFail   = BABYLON.Constants.KEEP;
  apertureMat.stencil.opDepthPass   = BABYLON.Constants.REPLACE;
  aperture.material = apertureMat;
  applyRenderPolicyToMeshes(aperture, 'worldAlpha');
  aperture.isPickable = false;
  aperture.checkCollisions = false;
  aperture.alwaysSelectAsActiveMesh = true;

  // ── B2. Perimeter top-edge blockers (invisible BLOCKER, prevent drop-in) ──
  // Top Y 0.10, bottom Y -0.15, center Y -0.025, height 0.25, thickness 0.20.
  // North side has stair bay gap; gap is between X 35.30 and 36.70 (spec blocker extents).
  // All positions are local offsets (createPoolCollider adds def.x / def.z).
  if (hasNorthExitStairs) {
    createPoolCollider(`${def.name}_edge_nw`, { width: 7.20, height: 0.25, depth: 0.20 },
      { x: -4.30, y: -0.025, z: -3.90 }, 'blocker');
    createPoolCollider(`${def.name}_edge_ne`, { width: 7.20, height: 0.25, depth: 0.20 },
      { x:  4.30, y: -0.025, z: -3.90 }, 'blocker');
  } else {
    createPoolCollider(`${def.name}_edge_n`, { width: 16.00, height: 0.25, depth: 0.20 },
      { x: 0, y: -0.025, z: -3.90 }, 'blocker');
  }
  if (southTunnel?.width > 0) {
    const edgeWidth = ((def.w ?? 16.0) - southTunnel.width) * 0.5;
    const edgeOffset = (southTunnel.width * 0.5) + (edgeWidth * 0.5);
    createPoolCollider(`${def.name}_edge_sw`, { width: edgeWidth, height: 0.25, depth: 0.20 },
      { x: -edgeOffset, y: -0.025, z: 3.90 }, 'blocker');
    createPoolCollider(`${def.name}_edge_se`, { width: edgeWidth, height: 0.25, depth: 0.20 },
      { x: edgeOffset, y: -0.025, z: 3.90 }, 'blocker');
  } else {
    createPoolCollider(`${def.name}_edge_s`, { width: 16.00, height: 0.25, depth: 0.20 },
      { x: 0, y: -0.025, z: 3.90 }, 'blocker');
  }
  createPoolCollider(`${def.name}_edge_w`,  { width:  0.20, height: 0.25, depth: 8.00 },
    { x: -7.90, y: -0.025, z:  0    }, 'blocker');
  createPoolCollider(`${def.name}_edge_e`,  { width:  0.20, height: 0.25, depth: 8.00 },
    { x:  7.90, y: -0.025, z:  0    }, 'blocker');

  // ── B3. Interior basin wall blockers (below deck, keep player in basin) ───
  // WALL_H=2.50, WALL_CY=-0.75 → top Y=+0.50.
  // Player-in-shallow top ≈ +0.10 < +0.50, so AABB always resolves horizontally (not upward).
  if (hasNorthExitStairs) {
    createPoolCollider(`${def.name}_wall_nw`, { width: 7.20,  height: WALL_H, depth: WALL_T },
      { x: -4.30, y: WALL_CY, z: -3.85 }, 'blocker');
    createPoolCollider(`${def.name}_wall_ne`, { width: 7.20,  height: WALL_H, depth: WALL_T },
      { x:  4.30, y: WALL_CY, z: -3.85 }, 'blocker');
  } else {
    createPoolCollider(`${def.name}_wall_n`, { width: 15.90, height: WALL_H, depth: WALL_T },
      { x: 0, y: WALL_CY, z: -3.85 }, 'blocker');
  }
  if (southTunnel?.width > 0) {
    const wallWidth = (15.90 - southTunnel.width) * 0.5;
    const wallOffset = (southTunnel.width * 0.5) + (wallWidth * 0.5);
    const wallTopY = WALL_CY + (WALL_H * 0.5);
    const openingTopY = Math.min(DECK_Y, southTunnel.centerY + (southTunnel.height * 0.5));
    const headerHeight = wallTopY - openingTopY;
    createPoolCollider(`${def.name}_wall_sw`, { width: wallWidth, height: WALL_H, depth: WALL_T },
      { x: -wallOffset, y: WALL_CY, z: 3.85 }, 'blocker');
    createPoolCollider(`${def.name}_wall_se`, { width: wallWidth, height: WALL_H, depth: WALL_T },
      { x: wallOffset, y: WALL_CY, z: 3.85 }, 'blocker');
    if (headerHeight > 0.02) {
      createPoolCollider(`${def.name}_wall_s_header`, { width: southTunnel.width, height: headerHeight, depth: WALL_T },
        { x: 0, y: openingTopY + (headerHeight * 0.5), z: 3.85 }, 'blocker');
    }
  } else {
    createPoolCollider(`${def.name}_wall_s`, { width: 15.90, height: WALL_H, depth: WALL_T },
      { x: 0, y: WALL_CY, z: 3.85 }, 'blocker');
  }
  createPoolCollider(`${def.name}_wall_w`,  { width: WALL_T, height: WALL_H, depth: 7.70 },
    { x: -7.85, y: WALL_CY, z:  0    }, 'blocker');
  createPoolCollider(`${def.name}_wall_e`,  { width: WALL_T, height: WALL_H, depth: 7.70 },
    { x:  7.85, y: WALL_CY, z:  0    }, 'blocker');

  // ── B4. Shallow floor at y=-0.72 (5 cm below SHALLOW_Y=-0.70 visual) ────────
  // Covers north pool z=[-3.70, -0.50]. Width 15.80 matches inner basin.
  // North extent z=-3.70 covers corners alongside stair bay.
  // center_z = (-3.70 + -0.50)/2 = -2.10, depth = 3.20
  if (hasNorthExitStairs) {
    createPoolCollider(`${def.name}_shallow_floor_col`, { width: 15.80, height: 0.10, depth: 3.20 },
      { x: 0, y: -0.72, z: -2.10 }, 'walkable');
  }

  // ── B5. Deep floor at y=-1.75 (5 cm below DEEP_Y=-1.70 visual) ───────────
  // Covers south pool z=[-0.50, +3.95]. Player transitions from shallow via a
  // step drop — acceptable in water (player swims). No transition step colliders
  // (previously removed because they caused an invisible horizontal swimming barrier).
  // center_z = (-0.50 + 3.95)/2 = 1.725, depth = 4.45
  if (hasNorthExitStairs) {
    createPoolCollider(`${def.name}_deep_floor_col`, { width: 15.80, height: 0.10, depth: 4.45 },
      { x: 0, y: -1.75, z: 1.725 }, 'walkable');
  } else {
    createPoolCollider(`${def.name}_deep_floor_col`, { width: 15.80, height: 0.10, depth: 7.65 },
      { x: 0, y: -1.75, z: 0.125 }, 'walkable');
  }

  // ── B7. Exit stair colliders (4 steps + top landing) ──────────────────────
  // Width X 2.40 centered at X 36 (local x=0). World Z → local z = worldZ - def.z.
  // h=0.30 (robust AABB detection — thin h=0.10 was missed at normal movement speed).
  // ly = intended walkable top − 0.15 (half of new height), preserving same tread surfaces.
  if (hasNorthExitStairs) {
    const exitStairDefs = [
      { lz: -3.475, ly: -0.275 },  // tread top y=-0.125
      { lz: -3.125, ly: -0.450 },  // tread top y=-0.300
      { lz: -2.775, ly: -0.625 },  // tread top y=-0.475
      { lz: -2.425, ly: -0.800 },  // tread top y=-0.650
    ];
    for (let i = 0; i < exitStairDefs.length; i++) {
      createPoolCollider(`${def.name}_exit_stair_${i + 1}_col`, { width: 2.40, height: 0.30, depth: 0.35 },
        { x: 0, y: exitStairDefs[i].ly, z: exitStairDefs[i].lz }, 'walkable');
    }
    // Top landing: fills gap between deck floor (world Z ≤ 26) and stair 1 (world Z 26.30–26.65).
    // h=0.30 prevents fall-through. Walkable top at y=0 (deck level), center y=-0.15.
    createPoolCollider(`${def.name}_exit_landing_col`, { width: 2.40, height: 0.30, depth: 0.35 },
      { x: 0, y: -0.15, z: -3.825 }, 'walkable');
  }

  return {
    ...def,
    root,
    visualMeshes,
    collisionMeshes,
    contains(pos) {
      return getWaterStateAtPosition(pos, pos.y).inDeepWater;
    },
    getWaterState(pos, headY = pos.y) {
      return getWaterStateAtPosition(pos, headY);
    },
    getExitSpawn() {
      // North exit: just outside north pool edge at deck level.
      return {
        x: def.x,
        y: DECK_Y + 0.42,
        z: (def.z ?? 0) - HALF_D - 0.6,
      };
    },
    update(time) {
      waterMat.alpha = 0.62 + (Math.sin((time * 0.80) + def.x * 0.04) * 0.05);
      water.position.y = WATER_SURFACE_Y + (Math.sin((time * 0.55) + def.x * 0.02) * 0.008);
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
    globe.material = mat;
    applyVfxRenderPolicy(globe);
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

function createSubmergedPassage(def) {
  return {
    ...def,
    contains(pos) {
      return pos.x >= def.minX
        && pos.x <= def.maxX
        && pos.y >= def.minY
        && pos.y <= def.maxY
        && pos.z >= def.minZ
        && pos.z <= def.maxZ;
    },
    getFloorY(worldZ) {
      const t = clamp((worldZ - def.minZ) / Math.max(0.001, def.maxZ - def.minZ), 0, 1);
      return lerp(def.floorStartY ?? def.minY, def.floorEndY ?? def.minY, t);
    },
    getWaterState(pos, headY = pos.y) {
      if (!this.contains(pos)) {
        return {
          inDeepWater: false,
          headSubmerged: false,
          waterSurfaceY: def.waterSurfaceY ?? def.maxY,
          depthAtZ: null,
        };
      }
      const floorY = this.getFloorY(pos.z);
      const waterSurfaceY = def.waterSurfaceY ?? def.maxY;
      return {
        inDeepWater: pos.y <= waterSurfaceY && (waterSurfaceY - floorY) >= 1.0,
        headSubmerged: headY <= (waterSurfaceY - 0.04),
        waterSurfaceY,
        depthAtZ: waterSurfaceY - floorY,
      };
    },
  };
}

function createGrayboxLadder(scene, def) {
  const root = new BABYLON.TransformNode(def.id, scene);
  root.position.set(def.centerX, (def.bottomY + def.topY) * 0.5, def.centerZ);
  markDecor(root);
  const halfHeight = (def.topY - def.bottomY) * 0.5;

  const railMat = makePlastic(scene, `${def.id}_railMat`, 0.64, 0.64, 0.64, { roughness: 0.92 });
  const rungMat = makePlastic(scene, `${def.id}_rungMat`, 0.72, 0.72, 0.72, { roughness: 0.9 });

  for (const z of [-(def.width * 0.38), def.width * 0.38]) {
    const rail = BABYLON.MeshBuilder.CreateBox(`${def.id}_rail_${z > 0 ? 'r' : 'l'}`, {
      width: 0.14,
      height: def.topY - def.bottomY,
      depth: 0.14,
    }, scene);
    rail.parent = root;
    rail.position.set(0, 0, z);
    rail.material = railMat;
    markDecor(rail);
  }

  const rungCount = 13;
  for (let index = 0; index < rungCount; index += 1) {
    const rung = BABYLON.MeshBuilder.CreateBox(`${def.id}_rung_${index}`, {
      width: 0.12,
      height: 0.08,
      depth: def.width * 0.78,
    }, scene);
    rung.parent = root;
    rung.position.set(0, -halfHeight + 0.35 + (index * ((def.topY - def.bottomY - 0.7) / Math.max(1, rungCount - 1))), 0);
    rung.material = rungMat;
    markDecor(rung);
  }

  return {
    ...def,
    root,
    contains(pos) {
      return Math.abs(pos.x - def.centerX) <= 1.1
        && Math.abs(pos.z - def.centerZ) <= 0.9
        && pos.y >= (def.bottomY - 0.3)
        && pos.y <= (def.topY + 0.9);
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
  applyVfxRenderPolicy(beam);
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
  halo.material = haloMat;
  halo.position.z = 0.4;
  applyVfxRenderPolicy(halo);
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
  plume.material = plumeMat;
  applyVfxRenderPolicy(plume);
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
  applyEnemyAlphaRenderPolicy(bell);
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
  silhouette.material = silhouetteMat;
  applyEnemyAlphaRenderPolicy(silhouette);
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
  applyEnemyAlphaRenderPolicy(core);
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
    applyEnemyAlphaRenderPolicy(tentacle);
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
    hp: (def.hpMax ?? 3),
    hpMax: (def.hpMax ?? 3),
    alive: true,
    stun(durationMs = 3000) {
      if (!this.alive) return false;
      this.stunnedMs = Math.max(this.stunnedMs, durationMs);
      applyMaterialLook();
      return true;
    },
    isStunned() {
      return this.stunnedMs > 0;
    },
    takeDamage(amount = 1) {
      if (!this.alive) return false;
      this.hp = Math.max(0, this.hp - amount);
      if (this.hp <= 0) {
        this.kill();
        return 'killed';
      }
      return 'damaged';
    },
    kill() {
      if (!this.alive) return;
      this.alive = false;
      this.stunnedMs = 0;
      root.setEnabled(false);
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
      this.hp = this.hpMax;
      this.alive = true;
      root.position.set(def.x, def.y, def.z ?? 0);
      root.setEnabled(true);
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
  shadow.material = shadowMat;
  applyVfxRenderPolicy(shadow);
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
  laneIndicator.material = indicatorMat;
  applyVfxRenderPolicy(laneIndicator);
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
  applyRenderPolicyToMaterials(material, 'worldAlpha');
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
  const submergedPassages = (LEVEL5.submergedPassages || []).map((def) => createSubmergedPassage(def));
  const poolCollisionMeshes = deepWaterPockets.flatMap((pocket) => pocket.collisionMeshes || []);
  if (poolCollisionMeshes.length > 0) {
    if (Array.isArray(world.platforms)) {
      world.platforms.push(...poolCollisionMeshes);
    }
    if (Array.isArray(truthColliderMeshes)) {
      truthColliderMeshes.push(...poolCollisionMeshes);
    }
  }
  const airBubblePickups = (LEVEL5.airBubblePickups || []).map((def) => createAirBubblePickup(scene, def));
  const eelRails = (LEVEL5.eelRails || []).map((def) => createEelRail(scene, def));
  const vents = (LEVEL5.vents || []).map((def) => createVent(scene, def));
  const jellyfish = (LEVEL5.jellyfish || []).map((def) => createJellyfish(scene, def, shadowGen));
  const sharkSweep = LEVEL5.sharkSweep ? createSharkSweep(scene, LEVEL5.sharkSweep) : null;
  const ladders = (LEVEL5.ladders || []).map((def) => createGrayboxLadder(scene, def));

  // ── Spawn area decorations ─────────────────────────────────────────────────
  // Colorful curtains along the west wall near spawn (x=4, z=18).
  // Cryptic floor logo: concentric symbol centered at spawn position.
  (function createSpawnDecorations() {
    if (LEVEL5.graybox) return;
    const spawnX = world.spawn.x;       // 4.0
    const spawnZ = world.spawn.z ?? 0;  // 18.0
    const WALL_X = 0.28;                // inner face of west wall
    const FLOOR_Y = 0.003;             // just above floor

    // Curtains: 4 vertical planes hung from the west wall, spaced along Z.
    const curtainColors = [
      new BABYLON.Color3(0.72, 0.18, 0.52),  // deep magenta
      new BABYLON.Color3(0.22, 0.48, 0.80),  // cobalt
      new BABYLON.Color3(0.78, 0.52, 0.12),  // amber
      new BABYLON.Color3(0.24, 0.68, 0.38),  // emerald
    ];
    const curtainOffsets = [-3.0, -1.0, 1.0, 3.0];
    curtainOffsets.forEach((zOff, i) => {
      const mat = new BABYLON.StandardMaterial(`spawn_curtain_mat_${i}`, scene);
      mat.diffuseColor = curtainColors[i];
      mat.emissiveColor = curtainColors[i].scale(0.14);
      mat.alpha = 0.82;
      const mesh = BABYLON.MeshBuilder.CreatePlane(`spawn_curtain_${i}`, {
        width: 2.20, height: 5.60,
      }, scene);
      mesh.position.set(WALL_X, 2.80, spawnZ + zOff);
      mesh.rotation.y = Math.PI * 0.5; // face +X (away from west wall)
      mesh.material = mat;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      applyWorldAlphaRenderPolicy(mesh);
      markDecor(mesh);
    });

    // ── Sigil rug: DynamicTexture drawn with Canvas 2D API ──────────────────
    // An ancient glowing floor glyph on a flat ground mesh.
    // renderingGroupId=1 ensures it renders after the floor (group 0),
    // eliminating z-fighting regardless of alpha depth-sort order.
    const RUG_M = 5.50;
    const TEX = 1024;
    const sigilTex = new BABYLON.DynamicTexture('spawn_sigil_tex', { width: TEX, height: TEX }, scene, false);
    {
      const c = sigilTex.getContext();
      const S = TEX; const cx = S * 0.5; const cy = S * 0.5;
      const T  = (a) => `rgba(18,212,200,${a})`;
      const Am = (a) => `rgba(240,175,28,${a})`;
      const Mg = (a) => `rgba(218,38,132,${a})`;
      const R0 = S * 0.47;
      const R1 = S * 0.390;
      const R2 = S * 0.280;
      const R3 = S * 0.168;
      const R4 = S * 0.072;

      c.clearRect(0, 0, S, S);
      const base = c.createRadialGradient(cx, cy, 0, cx, cy, R0);
      base.addColorStop(0,    'rgba(10,24,28,0.90)');
      base.addColorStop(0.72, 'rgba(6,14,18,0.80)');
      base.addColorStop(1,    'rgba(2,6,10,0)');
      c.fillStyle = base;
      c.beginPath(); c.arc(cx, cy, R0, 0, Math.PI * 2); c.fill();

      c.lineWidth = 18; c.strokeStyle = T(0.92);
      c.beginPath(); c.arc(cx, cy, R0, 0, Math.PI * 2); c.stroke();

      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2; const maj = i % 4 === 0;
        c.lineWidth = maj ? 7 : 3; c.strokeStyle = maj ? Am(0.90) : T(0.55);
        const r0t = R0 + 4; const r1t = r0t + (maj ? 30 : 15);
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r0t, cy + Math.sin(a) * r0t);
        c.lineTo(cx + Math.cos(a) * r1t, cy + Math.sin(a) * r1t);
        c.stroke();
      }

      for (let i = 0; i < 16; i++) {
        const a0 = ((i + 0.05) / 16) * Math.PI * 2;
        const a1 = ((i + 0.95) / 16) * Math.PI * 2;
        c.beginPath(); c.arc(cx, cy, R0 - 2, a0, a1); c.arc(cx, cy, R1 + 2, a1, a0, true); c.closePath();
        c.fillStyle = i % 2 === 0 ? 'rgba(18,212,200,0.09)' : 'rgba(240,175,28,0.07)'; c.fill();
        const am = ((i + 0.5) / 16) * Math.PI * 2; const rm = (R0 + R1) * 0.5;
        const px = cx + Math.cos(am) * rm; const py = cy + Math.sin(am) * rm;
        const perp = am + Math.PI * 0.5; const rs = 13;
        c.lineWidth = 3.5; c.strokeStyle = i % 2 === 0 ? T(0.88) : Am(0.78);
        c.beginPath();
        c.moveTo(px + Math.cos(am) * (-rs * 0.5), py + Math.sin(am) * (-rs * 0.5));
        c.lineTo(px + Math.cos(am) * (rs * 0.5),  py + Math.sin(am) * (rs * 0.5));
        c.stroke();
        c.beginPath();
        c.moveTo(px + Math.cos(perp) * (rs * 0.40), py + Math.sin(perp) * (rs * 0.40));
        c.lineTo(px - Math.cos(perp) * (rs * 0.15), py - Math.sin(perp) * (rs * 0.15));
        c.stroke();
      }

      c.lineWidth = 5; c.strokeStyle = T(0.62);
      c.beginPath(); c.arc(cx, cy, R1, 0, Math.PI * 2); c.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2; const maj = i % 3 === 0;
        c.lineWidth = maj ? 5.5 : 2.5; c.strokeStyle = maj ? Am(0.80) : T(0.48);
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * R3, cy + Math.sin(a) * R3);
        c.lineTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1);
        c.stroke();
      }

      const tri = (off, r, col, lw) => {
        c.lineWidth = lw; c.strokeStyle = col; c.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = off + (i / 3) * Math.PI * 2;
          if (i === 0) c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          else         c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        c.closePath(); c.stroke();
      };
      tri(-Math.PI * 0.5, R2, T(0.88),  8);
      tri( Math.PI * 0.5, R2, Mg(0.82), 8);

      c.lineWidth = 4; c.strokeStyle = Am(0.68);
      c.beginPath(); c.arc(cx, cy, R2, 0, Math.PI * 2); c.stroke();

      c.lineWidth = 5.5; c.strokeStyle = Mg(0.82);
      c.beginPath(); c.arc(cx, cy, R3, 0, Math.PI * 2); c.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const px = cx + Math.cos(a) * R3; const py = cy + Math.sin(a) * R3;
        const ds = i % 3 === 0 ? 13 : 7;
        c.fillStyle = i % 3 === 0 ? Am(0.95) : T(0.92);
        c.beginPath();
        c.moveTo(px, py - ds); c.lineTo(px + ds, py); c.lineTo(px, py + ds); c.lineTo(px - ds, py);
        c.closePath(); c.fill();
      }

      c.lineWidth = 10; c.strokeStyle = Mg(0.94);
      c.beginPath(); c.arc(cx, cy, R4, 0, Math.PI * 2); c.stroke();

      const iris = c.createRadialGradient(cx, cy, 0, cx, cy, R4);
      iris.addColorStop(0,    'rgba(255,255,255,0.42)');
      iris.addColorStop(0.35, 'rgba(218,38,132,0.52)');
      iris.addColorStop(0.85, 'rgba(18,212,200,0.18)');
      iris.addColorStop(1,    'rgba(18,212,200,0)');
      c.fillStyle = iris;
      c.beginPath(); c.arc(cx, cy, R4, 0, Math.PI * 2); c.fill();

      sigilTex.update();
    }
    sigilTex.hasAlpha = true;

    const rugMat = new BABYLON.StandardMaterial('spawn_sigil_mat', scene);
    rugMat.diffuseTexture  = sigilTex;
    rugMat.emissiveTexture = sigilTex;
    rugMat.emissiveColor   = new BABYLON.Color3(0.82, 0.82, 0.82);
    rugMat.diffuseColor    = new BABYLON.Color3(0.30, 0.30, 0.30);
    applyRenderPolicyToMaterials(rugMat, 'worldAlpha');

    const rug = BABYLON.MeshBuilder.CreateGround('spawn_sigil_rug', { width: RUG_M, height: RUG_M }, scene);
    rug.position.set(spawnX, FLOOR_Y, spawnZ);
    rug.material = rugMat;
    rug.isPickable = false;
    rug.checkCollisions = false;
    applyWorldAlphaRenderPolicy(rug);
    markDecor(rug);
  }());

  let currentPushTimer = 0;
  let currentPushForce = 0;
  let currentPushZ = 0;
  let runtimeTime = 0;
  let enemyDebugState = {
    showBounds: false,
    highContrast: false,
  };
  let lastResolvedRespawn = null;
  let activeLadderId = null;

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
    applyRenderPolicyToMeshes(mesh, 'worldAlpha');
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
    mesh.isVisible = false;
    mesh.visibility = 0;
    mesh.setEnabled(false);
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
    marker.isVisible = false;
    marker.visibility = 0;
    marker.setEnabled(false);
    respawnOverlayNodes.push(marker);
  }

  function setOverlayNodeState(node, enabled) {
    node.setEnabled(enabled);
    node.isVisible = enabled;
    node.visibility = enabled ? 1 : 0;
  }

  function applyTruthOverlayState() {
    truthOverlayRoot.setEnabled(
      overlayState.walkables || overlayState.colliders || overlayState.respawnAnchors || overlayState.hazards,
    );
    for (const node of walkableOverlayNodes) setOverlayNodeState(node, overlayState.walkables);
    for (const node of colliderOverlayNodes) setOverlayNodeState(node, overlayState.colliders);
    for (const node of hazardOverlayNodes) setOverlayNodeState(node, overlayState.hazards);
    for (const node of respawnOverlayNodes) setOverlayNodeState(node, overlayState.respawnAnchors);
  }

  applyTruthOverlayState();

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
    const reason = baseSpawn?.reason || null;
    let anchor = null;
    let selectedBy = 'fallback';
    // Pool drowning: route to original spawn (not pool_edge).
    if (reason === 'scuba_empty' && respawnAnchorMap.has('level5_spawn_anchor')) {
      anchor = respawnAnchorMap.get('level5_spawn_anchor');
      selectedBy = 'scuba_empty';
    }
    // Combat defeat: always route to spawn, not nearest-anchor (avoids pool_edge when dying near pool).
    // reason is always `<source>_defeat` e.g. 'jellyfish_defeat', never bare 'defeat'.
    if (!anchor && reason?.endsWith('_defeat') && respawnAnchorMap.has('level5_spawn_anchor')) {
      anchor = respawnAnchorMap.get('level5_spawn_anchor');
      selectedBy = 'defeat';
    }
    if (!anchor && requestedSpawn.anchorId && respawnAnchorMap.has(requestedSpawn.anchorId)) {
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

  function updateLadders(dt, ctx = {}) {
    if (!ladders.length) return;
    const player = ctx.player;
    const pos = ctx.pos;
    if (!player || !pos) return;

    const forwardAxis = ctx.inputState?.forwardAxis ?? 0;
    const jumpHeld = !!ctx.inputState?.jumpHeld;
    const descendHeld = !!ctx.inputState?.descendHeld;
    const wantsUp = jumpHeld || forwardAxis > 0.4;
    const wantsDown = descendHeld || forwardAxis < -0.4;

    let ladder = ladders.find((entry) => entry.id === activeLadderId) || null;
    if (!ladder) {
      ladder = ladders.find((entry) => entry.contains(pos)) || null;
      if (ladder && (wantsUp || wantsDown)) {
        activeLadderId = ladder.id;
      } else {
        ladder = null;
      }
    }
    if (!ladder) return;

    const climbDir = wantsUp ? 1 : wantsDown ? -1 : 0;
    const activeY = clamp(player.mesh.position.y, ladder.bottomY + 0.42, ladder.topY + 0.42);
    player.mesh.position.x = ladder.centerX;
    player.mesh.position.z = ladder.centerZ;
    player.vx = 0;
    player.vz = 0;
    player.vy = 0;
    player.grounded = false;

    if (climbDir === 0) {
      player.mesh.position.y = activeY;
      return;
    }

    const nextY = clamp(activeY + (climbDir * dt * 3.4), ladder.bottomY + 0.42, ladder.topY + 0.42);
    player.mesh.position.y = nextY;

    if (climbDir > 0 && nextY >= (ladder.topY + 0.38)) {
      player.mesh.position.set(ladder.topExit.x, ladder.topExit.y, ladder.topExit.z);
      player.grounded = true;
      activeLadderId = null;
      return;
    }

    if (climbDir < 0 && nextY <= (ladder.bottomY + 0.44)) {
      player.mesh.position.set(ladder.bottomExit.x, ladder.bottomExit.y, ladder.bottomExit.z);
      activeLadderId = null;
    }
  }

  function hitJellyfish(attack = {}) {
    const attackPos = attack.position || BABYLON.Vector3.Zero();
    const radius = Number.isFinite(attack.radius) ? attack.radius : 0.82;
    const stunMs = Number.isFinite(attack.stunMs) ? attack.stunMs : 3000;
    const damage = Number.isFinite(attack.damage) ? attack.damage : 1;
    for (const jelly of jellyfish) {
      if (!jelly.alive) continue;
      const dx = attackPos.x - jelly.root.position.x;
      const dy = attackPos.y - jelly.root.position.y;
      const dz = attackPos.z - jelly.root.position.z;
      if (((dx ** 2) + (dy ** 2) + (dz ** 2)) <= ((radius + 0.64) ** 2)) {
        const damageResult = jelly.takeDamage(damage);
        if (damageResult !== 'killed') jelly.stun(stunMs);
        return { hit: true, target: jelly.name, killed: damageResult === 'killed' };
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
        hp: jelly.hp,
        hpMax: jelly.hpMax,
        alive: jelly.alive,
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
      updateLadders(dt, ctx);
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
      activeLadderId = null;
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
      return deepWaterPockets.some((pocket) => pocket.contains(pos))
        || submergedPassages.some((passage) => passage.getWaterState(pos, pos.y).inDeepWater);
    },
    getPoolExitSpawn(pos) {
      for (const pocket of deepWaterPockets) {
        if (typeof pocket.getExitSpawn !== 'function') continue;
        const state = pocket.getWaterState(pos, pos.y);
        if (state.inDeepWater || state.depthAtZ !== null) {
          return pocket.getExitSpawn();
        }
      }
      return null;
    },
    getWaterState(pos, headY = pos.y) {
      for (const pocket of deepWaterPockets) {
        if (typeof pocket.getWaterState !== 'function') continue;
        const state = pocket.getWaterState(pos, headY);
        if (state?.inDeepWater || state?.depthAtZ !== null) {
          return state;
        }
      }
      for (const passage of submergedPassages) {
        const state = passage.getWaterState(pos, headY);
        if (state?.inDeepWater || state?.depthAtZ !== null) {
          return state;
        }
      }
      return {
        inDeepWater: false,
        headSubmerged: false,
        waterSurfaceY: null,
        depthAtZ: null,
      };
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
        damage: projectile.damage ?? 1,
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
        submergedPassages: submergedPassages.map((passage) => ({
          name: passage.name,
          minX: passage.minX,
          maxX: passage.maxX,
          minY: passage.minY,
          maxY: passage.maxY,
          minZ: passage.minZ,
          maxZ: passage.maxZ,
          waterSurfaceY: passage.waterSurfaceY ?? null,
          floorStartY: passage.floorStartY ?? passage.minY,
          floorEndY: passage.floorEndY ?? passage.minY,
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
        graybox: {
          ladders: ladders.map((ladder) => ({
            id: ladder.id,
            centerX: ladder.centerX,
            centerZ: ladder.centerZ,
            bottomY: ladder.bottomY,
            topY: ladder.topY,
          })),
          activeLadderId,
        },
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
