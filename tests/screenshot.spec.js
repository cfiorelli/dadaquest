// @ts-check
import { test, expect } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
import { getLevelMeta, getLevelRuntimeFamily, getLevelThemeKey } from '../src/web3d/world/levelMeta.js';

const SHOT_SCENES = [
  { scene: 'title', key: 'TitleScene', file: 'title' },
  { scene: 'crib', key: 'CribScene', file: 'crib' },
  { scene: 'end', key: 'EndScene', file: 'end' },
];
const ACTIVE_LEVEL5PLUS_RUNTIME = getLevelRuntimeFamily(5);
const ERA5_MAINLINE_ACTIVE = ACTIVE_LEVEL5PLUS_RUNTIME === 'era5';
const describeEra5Mainline = ERA5_MAINLINE_ACTIVE ? test.describe : test.describe.skip;
const LEVEL5PLUS_CASES = [5, 6, 7, 8, 9].map((id) => ({
  id,
  meta: getLevelMeta(id),
  themeKey: getLevelThemeKey(id),
}));
const LEVEL5PLUS_PLACEHOLDER_CASES = LEVEL5PLUS_CASES.filter(({ id }) => id >= 6);
const LEVEL5_DOORWAY_START_POSE = {
  x: 45.4,
  y: 0.42,
  z: 18.0,
  yaw: Math.PI * 0.5,
  cameraYaw: Math.PI * 0.5,
};
const LEVEL5_DOORWAY_DIRECT_BLOCK_POSE = {
  x: 45.4,
  y: 0.42,
  z: 18.0,
  yaw: -Math.PI * 0.5,
  cameraYaw: -Math.PI * 0.5,
};
const LEVEL5_DOORWAY_RIGHT_TURN_STEPS = [
  { key: 'slight-right', holdMs: 160, path: 'docs/screenshots/level5-room-reset-doorway-slight-right.png' },
  { key: 'right-90', holdMs: 1300, path: 'docs/screenshots/level5-room-reset-doorway-right-90.png' },
  { key: 'right-stress', holdMs: 2200, path: 'docs/screenshots/level5-room-reset-doorway-right-stress.png' },
];
const LEVEL5_POOL_RENDER_POSES = {
  aboveWater: {
    x: 35.2,
    y: 0.42,
    z: 26.2,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
  waterline: {
    x: 36.0,
    y: -0.22,
    z: 30.4,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
  underwater: {
    x: 36.0,
    y: -1.15,
    z: 30.8,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
};
async function gotoDebugLevel(page, levelId) {
  await page.goto(`http://127.0.0.1:4173/?level=${levelId}&debug=1`);
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
}

async function focusGameplay(page) {
  await page.mouse.click(640, 360);
  await page.waitForTimeout(60);
}

async function dispatchHeldKey(page, type, { code, key, altKey = false, ctrlKey = false, shiftKey = false }) {
  await page.evaluate(({ eventType, eventCode, eventKey, eventAltKey, eventCtrlKey, eventShiftKey }) => {
    const target = document;
    target.dispatchEvent(new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      code: eventCode,
      key: eventKey,
      altKey: eventAltKey,
      ctrlKey: eventCtrlKey,
      shiftKey: eventShiftKey,
    }));
  }, {
    eventType: type,
    eventCode: code,
    eventKey: key,
    eventAltKey: altKey,
    eventCtrlKey: ctrlKey,
    eventShiftKey: shiftKey,
  });
}

function wrapDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

async function unlockThroughLevel(page, completedLevel = 5) {
  await page.evaluate((maxLevel) => {
    const levelCompleted = {};
    for (let levelId = 4; levelId <= maxLevel; levelId += 1) {
      levelCompleted[levelId] = true;
    }
    window.__DADA_DEBUG__?.setProgress?.({
      sourdoughUnlocked: true,
      levelCompleted,
    });
  }, completedLevel);
}

async function seedEra5BubbleWand(page) {
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setProgress?.({
      sourdoughUnlocked: true,
      levelCompleted: { 4: true },
      era5: {
        inventory: [
          {
            instanceId: 'starter-scuba-tank',
            defId: 'scuba_tank',
          },
          {
            instanceId: 'starter-bubble-wand',
            defId: 'bubble_wand',
          },
        ],
        equipped: {
          tool: 'starter-scuba-tank',
          weaponPrimary: 'starter-bubble-wand',
        },
      },
    });
  });
}

async function hideGameplayUi(page, { keepStatus = false } = {}) {
  await page.addStyleTag({
    content: `
      [data-era5-hud], #titleScreen, #titleOverlay, #gameplayHud, #gameplayMenu, #titleMenu,
      #loadingOverlay, #endOverlay, button, [role="button"], [data-title-screen], [data-title-preview],
      [data-title-level-grid], [data-controls-hint], [data-era5-buffs], [data-era5-inventory-hint],
      #era5DevOverlay,
      .dada-toast-layer, .dada-status-banner, .dada-toast {
        display: none !important;
      }
      ${keepStatus ? `
        #gameplayHud, [data-era5-hud], [data-controls-hint], [data-era5-buffs],
        [data-era5-inventory-hint], .dada-era5-reticle, .dada-pop, .dada-fade {
          display: none !important;
        }
      ` : '#uiRoot { display: none !important; }'}
      body { margin: 0; background: #000; }
    `,
  });
}

async function getLevel5StarterRoomAudit(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const actorSummary = window.__DADA_DEBUG__?.actors ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const meshes = scene?.meshes ?? [];
    const isVisibleMesh = (mesh) => mesh?.isEnabled?.() !== false
      && mesh?.isVisible !== false
      && (mesh?.visibility ?? 1) > 0.02;
    const getBounds = (mesh) => {
      const box = mesh.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: box.minimumWorld.x,
        maxX: box.maximumWorld.x,
        minY: box.minimumWorld.y,
        maxY: box.maximumWorld.y,
        minZ: box.minimumWorld.z,
        maxZ: box.maximumWorld.z,
      };
    };
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const isGoalMesh = (mesh) => {
      if (mesh.name === 'goalTrigger') return false;
      if ((mesh.metadata?.role || '').toLowerCase() === 'goal') return true;
      let node = mesh;
      while (node) {
        const name = String(node.name || '').toLowerCase();
        if (name.includes('dad') || name.includes('goal')) return true;
        node = node.parent || null;
      }
      return false;
    };

    const shellMeshes = meshes
      .filter((mesh) => mesh?.metadata?.structuralShell === true && !mesh?.metadata?.truthRole)
      .map((mesh) => ({
        name: mesh.metadata?.sourceName || mesh.name,
        decorIntent: mesh.metadata?.decorIntent || null,
        enabled: mesh.isEnabled?.() ?? false,
        isVisible: mesh.isVisible !== false,
        visibility: Number((mesh.visibility ?? 1).toFixed(3)),
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
      }));
    const transparentShells = shellMeshes.filter((mesh) => (
      !mesh.enabled
      || !mesh.isVisible
      || (mesh.materialAlpha !== null && mesh.materialAlpha < 0.999)
      || mesh.transparencyMode !== null
    ));

    const visibleGoalMeshes = meshes
      .filter((mesh) => isVisibleMesh(mesh) && isGoalMesh(mesh))
      .map((mesh) => ({
        name: mesh.name,
        position: (() => {
          const pos = mesh.getAbsolutePosition?.();
          return pos ? {
            x: Number(pos.x.toFixed(3)),
            y: Number(pos.y.toFixed(3)),
            z: Number(pos.z.toFixed(3)),
          } : null;
        })(),
      }));

    const ceilingMeshes = meshes
      .map((mesh) => ({
        truthRole: mesh.metadata?.truthRole || null,
        bounds: getBounds(mesh),
        sourceName: String(mesh.metadata?.sourceName || mesh.name || ''),
        decorIntent: mesh.metadata?.decorIntent || null,
      }))
      .filter(({ bounds, truthRole, sourceName, decorIntent }) => (
        !!bounds && (
          !truthRole
        ) && (
          sourceName.toLowerCase().includes('ceiling')
          || sourceName.toLowerCase().includes('light_panel')
          || decorIntent === 'ceiling'
          || decorIntent === 'light-fixture'
        )
      ));
    const coplanarCeilingPairs = [];
    for (let index = 0; index < ceilingMeshes.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < ceilingMeshes.length; otherIndex += 1) {
        const left = ceilingMeshes[index];
        const right = ceilingMeshes[otherIndex];
        if (!left.bounds || !right.bounds) continue;
        if (!overlaps(left.bounds.minX, left.bounds.maxX, right.bounds.minX, right.bounds.maxX)) continue;
        if (!overlaps(left.bounds.minZ, left.bounds.maxZ, right.bounds.minZ, right.bounds.maxZ)) continue;
        const planesLeft = [left.bounds.minY, left.bounds.maxY];
        const planesRight = [right.bounds.minY, right.bounds.maxY];
        const sharedPlane = planesLeft.find((planeLeft) => planesRight.some((planeRight) => Math.abs(planeLeft - planeRight) < 0.001));
        if (!Number.isFinite(sharedPlane)) continue;
        coplanarCeilingPairs.push({
          left: left.sourceName,
          right: right.sourceName,
          sharedPlaneY: Number(sharedPlane.toFixed(3)),
        });
      }
    }

    return {
      roomBounds,
      actorSummary,
      transparentShells,
      visibleGoalMeshes,
      unexpectedVisibleActorsOutsideRoom: visibleGoalMeshes.filter((mesh) => roomBounds && mesh.position && (
        mesh.position.x < (roomBounds.minX - 0.01)
        || mesh.position.x > (roomBounds.maxX + 0.01)
        || mesh.position.z < (roomBounds.minZ - 0.01)
        || mesh.position.z > (roomBounds.maxZ + 0.01)
      )),
      coplanarCeilingPairs,
      structuralCeilingShellCount: shellMeshes.filter((mesh) => mesh.decorIntent === 'ceiling').length,
    };
  });
}

function isLevel5StarterRoomRenderMesh(name) {
  const value = String(name || '');
  return [
    'ceiling_shell',
    'ceiling_light_panel',
    'north_wall',
    'south_wall',
    'east_wall',
    'west_wall',
    'future_exit_blocker',
  ].some((token) => value.includes(token));
}

function getAuditSampleName(sample) {
  return String(sample?.sourceName || sample?.mesh || '');
}

function expectLevel5StarterRoomLaunchAudit(starterAudit, launchAudit) {
  expect(starterAudit.transparentShells).toEqual([]);
  expect(starterAudit.visibleGoalMeshes).toEqual([]);
  expect(starterAudit.unexpectedVisibleActorsOutsideRoom).toEqual([]);
  expect(starterAudit.actorSummary?.goal?.visibleMeshCount ?? 0).toBe(0);
  expect(starterAudit.actorSummary?.goal?.allowInvisible).toBe(true);
  expect(launchAudit.roomBounds).not.toBeNull();
  expect(launchAudit.cameraPos).not.toBeNull();
  expect(launchAudit.cameraDebugOverride).toBeNull();
  expect(launchAudit.fadedMeshes).toBe(0);
  expect(launchAudit.cameraInsideRoom).toBe(true);
  expect(launchAudit.occluderMesh).toBe('neutral_decorBlock_west_wall');
  expect(Math.abs(wrapDelta(launchAudit.cameraYaw ?? 0, launchAudit.cameraDesiredYaw ?? 0))).toBeLessThan(0.01);
  expect(Math.abs(wrapDelta(launchAudit.cameraYaw ?? 0, launchAudit.playerYaw ?? 0))).toBeLessThan(0.01);
  const unstableShells = launchAudit.shellMeshes.filter((mesh) => (
    !mesh.enabled
    || !mesh.isVisible
    || mesh.visibility < 0.999
    || (mesh.materialAlpha !== null && mesh.materialAlpha < 0.999)
    || mesh.transparencyMode !== null
  ));
  expect(unstableShells).toEqual([]);
  const sampleMap = Object.fromEntries((launchAudit.sampleHits || []).map((sample) => [sample.id, getAuditSampleName(sample)]));
  expect(sampleMap.topCenter).toMatch(/ceiling_shell|ceiling_light_panel/);
  expect(isLevel5StarterRoomRenderMesh(sampleMap.upperLeft)).toBe(true);
  expect(isLevel5StarterRoomRenderMesh(sampleMap.upperRight)).toBe(true);
}

async function getLevel5StarterRoomLaunchAudit(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const camera = scene?.activeCamera ?? null;
    const engine = scene?.getEngine?.() ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const toRoundedVector = (value) => value ? ({
      x: Number(value.x.toFixed(3)),
      y: Number(value.y.toFixed(3)),
      z: Number(value.z.toFixed(3)),
    }) : null;
    const sampleAt = (id, nx, ny) => {
      if (!scene || !camera || !engine) {
        return { id, mesh: null, sourceName: null };
      }
      const pick = scene.pick(
        engine.getRenderWidth(true) * nx,
        engine.getRenderHeight(true) * ny,
        (mesh) => mesh?.isEnabled?.() !== false
          && mesh?.isVisible !== false
          && (mesh?.visibility ?? 1) > 0.02,
        false,
        camera,
      );
      return {
        id,
        mesh: pick?.pickedMesh?.name ?? null,
        sourceName: pick?.pickedMesh?.metadata?.sourceName ?? null,
      };
    };
    const shellMeshes = (scene?.meshes ?? [])
      .filter((mesh) => mesh?.metadata?.structuralShell === true && !mesh?.metadata?.truthRole)
      .map((mesh) => ({
        name: mesh.metadata?.sourceName || mesh.name,
        enabled: mesh.isEnabled?.() ?? false,
        isVisible: mesh.isVisible !== false,
        visibility: Number((mesh.visibility ?? 1).toFixed(3)),
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
      }));
    const cameraPos = toRoundedVector(camera?.position ?? null);
    return {
      roomBounds,
      cameraPos,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
      cameraDesiredYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
      cameraDebugOverride: window.__DADA_DEBUG__?.cameraDebugOverride ?? null,
      occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
      fadedMeshes: window.__DADA_DEBUG__?.fadedMeshes ?? null,
      cameraInsideRoom: !!(roomBounds && cameraPos
        && cameraPos.x > (roomBounds.minX + 0.05)
        && cameraPos.x < (roomBounds.maxX - 0.05)
        && cameraPos.z > (roomBounds.minZ + 0.05)
        && cameraPos.z < (roomBounds.maxZ - 0.05)),
      sampleHits: [
        sampleAt('topCenter', 0.5, 0.12),
        sampleAt('upperLeft', 0.18, 0.22),
        sampleAt('upperRight', 0.82, 0.22),
      ],
      shellMeshes,
    };
  });
}

async function tapEra5LeftTurnTwice(page) {
  for (let i = 0; i < 2; i += 1) {
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowLeft', key: 'ArrowLeft' });
    await page.waitForTimeout(90);
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(180);
}

function expectLevel5JumpStateInsideStarterRoom(state) {
  expect(state).not.toBeNull();
  expect(state.roomBounds).not.toBeNull();
  expect(state.cameraPos).not.toBeNull();
  expect(state.cameraTarget).not.toBeNull();
  expect(state.playerPos).not.toBeNull();
  expect(state.cameraAboveCeiling).toBe(false);
  expect(state.cameraInsideRoomXZ).toBe(true);
}

async function getLevel5JumpCameraState(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const camera = scene?.activeCamera ?? null;
    const cameraTarget = camera?.getTarget?.() ?? null;
    const cameraPos = camera?.position ?? null;
    const playerPos = window.__DADA_DEBUG__?.playerPos ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const ceilingY = Number.isFinite(room?.ceilingY) ? room.ceilingY : 6.0;
    return {
      roomBounds,
      ceilingY,
      playerPos: playerPos ? {
        x: Number(playerPos.x.toFixed(3)),
        y: Number(playerPos.y.toFixed(3)),
        z: Number(playerPos.z.toFixed(3)),
      } : null,
      playerVy: Number((window.__DADA_DEBUG__?.playerController?.vy ?? 0).toFixed(3)),
      grounded: !!window.__DADA_DEBUG__?.playerController?.grounded,
      cameraPos: cameraPos ? {
        x: Number(cameraPos.x.toFixed(3)),
        y: Number(cameraPos.y.toFixed(3)),
        z: Number(cameraPos.z.toFixed(3)),
      } : null,
      cameraTarget: cameraTarget ? {
        x: Number(cameraTarget.x.toFixed(3)),
        y: Number(cameraTarget.y.toFixed(3)),
        z: Number(cameraTarget.z.toFixed(3)),
      } : null,
      cameraYaw: Number((window.__DADA_DEBUG__?.cameraYaw ?? 0).toFixed(3)),
      cameraDesiredYaw: Number((window.__DADA_DEBUG__?.cameraDesiredYaw ?? 0).toFixed(3)),
      occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
      occlusion: window.__DADA_DEBUG__?.cameraOcclusion ?? null,
      cameraAboveCeiling: !!(cameraPos && cameraPos.y > (ceilingY + 0.001)),
      cameraInsideRoomXZ: !!(roomBounds && cameraPos
        && cameraPos.x > (roomBounds.minX + 0.05)
        && cameraPos.x < (roomBounds.maxX - 0.05)
        && cameraPos.z > (roomBounds.minZ + 0.05)
        && cameraPos.z < (roomBounds.maxZ - 0.05)),
    };
  });
}

async function getLevel5DoorwayAssemblyReport(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const getMesh = (sourceName) => scene?.meshes?.find((mesh) => mesh?.metadata?.sourceName === sourceName) ?? null;
    const getBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox ?? null;
      return box ? {
        minX: Number(box.minimumWorld.x.toFixed(3)),
        maxX: Number(box.maximumWorld.x.toFixed(3)),
        minY: Number(box.minimumWorld.y.toFixed(3)),
        maxY: Number(box.maximumWorld.y.toFixed(3)),
        minZ: Number(box.minimumWorld.z.toFixed(3)),
        maxZ: Number(box.maximumWorld.z.toFixed(3)),
      } : null;
    };
    const meshInfo = (sourceName) => {
      const mesh = getMesh(sourceName);
      return mesh ? {
        sourceName,
        cameraIgnore: mesh.metadata?.cameraIgnore ?? null,
        cameraBlocker: mesh.metadata?.cameraBlocker ?? null,
        bounds: getBounds(mesh),
      } : null;
    };
    const north = meshInfo('east_wall_north');
    const south = meshInfo('east_wall_south');
    const header = meshInfo('east_wall_header');
    const blocker = meshInfo('future_exit_blocker');
    const delta = (left, right) => Number(((left ?? 0) - (right ?? 0)).toFixed(3));
    return {
      mapId: topology?.mapId ?? null,
      roomBounds: room ? {
        minX: Number((room.x - (room.w * 0.5)).toFixed(3)),
        maxX: Number((room.x + (room.w * 0.5)).toFixed(3)),
        minZ: Number((room.z - (room.d * 0.5)).toFixed(3)),
        maxZ: Number((room.z + (room.d * 0.5)).toFixed(3)),
      } : null,
      futureExitBlocker: blocker,
      alignment: {
        blockerMinXDelta: delta(blocker?.bounds?.minX, header?.bounds?.minX),
        blockerMaxXDelta: delta(blocker?.bounds?.maxX, header?.bounds?.maxX),
        northSeamDelta: delta(blocker?.bounds?.minZ, north?.bounds?.maxZ),
        southSeamDelta: delta(south?.bounds?.minZ, blocker?.bounds?.maxZ),
        floorDelta: delta(blocker?.bounds?.minY, 0.0),
      },
    };
  });
}

function expectLevel5DoorwayAssemblyReport(report) {
  expect(report?.mapId).toBe('level5-room-reset');
  expect(report?.roomBounds).not.toBeNull();
  expect(report?.futureExitBlocker?.bounds).not.toBeNull();
  expect(report.futureExitBlocker.cameraIgnore).toBe(false);
  expect(report.futureExitBlocker.cameraBlocker).toBe(true);
  expect(report.alignment).toEqual({
    blockerMinXDelta: 0,
    blockerMaxXDelta: 0,
    northSeamDelta: 0,
    southSeamDelta: 0,
    floorDelta: 0,
  });
}

async function getLevel5DoorwayCameraState(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const camera = scene?.activeCamera ?? null;
    const target = camera?.getTarget?.() ?? null;
    const cameraPos = camera?.position ?? null;
    const roomBounds = room ? {
      minX: Number((room.x - (room.w * 0.5)).toFixed(3)),
      maxX: Number((room.x + (room.w * 0.5)).toFixed(3)),
      minZ: Number((room.z - (room.d * 0.5)).toFixed(3)),
      maxZ: Number((room.z + (room.d * 0.5)).toFixed(3)),
    } : null;
    return {
      roomBounds,
      cameraPos: cameraPos ? {
        x: Number(cameraPos.x.toFixed(3)),
        y: Number(cameraPos.y.toFixed(3)),
        z: Number(cameraPos.z.toFixed(3)),
      } : null,
      cameraTarget: target ? {
        x: Number(target.x.toFixed(3)),
        y: Number(target.y.toFixed(3)),
        z: Number(target.z.toFixed(3)),
      } : null,
      playerYaw: Number((window.__DADA_DEBUG__?.playerYaw ?? 0).toFixed(3)),
      cameraYaw: Number((window.__DADA_DEBUG__?.cameraYaw ?? 0).toFixed(3)),
      cameraDesiredYaw: Number((window.__DADA_DEBUG__?.cameraDesiredYaw ?? 0).toFixed(3)),
      occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
      occlusion: window.__DADA_DEBUG__?.cameraOcclusion ?? null,
      cameraInsideRoom: !!(roomBounds && cameraPos
        && cameraPos.x > (roomBounds.minX + 0.05)
        && cameraPos.x < (roomBounds.maxX - 0.05)
        && cameraPos.z > (roomBounds.minZ + 0.05)
        && cameraPos.z < (roomBounds.maxZ - 0.05)),
    };
  });
}

async function installLevel5ProjectileBurstAudit(page) {
  await page.evaluate(() => {
    const debug = window.__DADA_DEBUG__ ?? {};
    const scene = debug?.sceneRef ?? null;
    const camera = debug?.cameraRef ?? scene?.activeCamera ?? null;
    const Vector3 = window.BABYLON?.Vector3 ?? camera?.position?.constructor ?? null;
    const Matrix = window.BABYLON?.Matrix ?? scene?.getTransformMatrix?.()?.constructor ?? null;
    const topology = debug?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const floorEdgePoint = (room && Vector3)
      ? new Vector3(room.x + (room.w * 0.5), room.floorY ?? 0, room.z)
      : null;
    const projectToViewport = (position) => {
      if (!scene || !camera || !position || !Vector3 || !Matrix) return null;
      const engine = scene.getEngine();
      const width = engine.getRenderWidth();
      const height = engine.getRenderHeight();
      const projected = Vector3.Project(
        position,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );
      return {
        x: Number(projected.x.toFixed(3)),
        y: Number(projected.y.toFixed(3)),
        z: Number(projected.z.toFixed(6)),
      };
    };
    const floorEdgeScreen = floorEdgePoint ? projectToViewport(floorEdgePoint) : null;
    const state = {
      active: false,
      rafId: null,
      frameCounter: 0,
      pendingPlans: [],
      seenProjectileNames: new Set(),
      shotEntries: [],
      roomBounds,
      preexistingProjectileCount: 0,
    };
    const getProjectileMeshes = () => (scene?.meshes ?? [])
      .filter((mesh) => String(mesh.name || '').startsWith('era5Bubble_'));
    const snapshotMesh = (mesh) => {
      const pos = mesh.position.clone();
      const screen = projectToViewport(pos);
      const radiusProbe = projectToViewport(pos.add(new Vector3(0, 0.12, 0)));
      const screenRadiusPx = (screen && radiusProbe)
        ? Number(Math.abs(radiusProbe.y - screen.y).toFixed(3))
        : null;
      const centerClearancePx = (screen && floorEdgeScreen)
        ? Number((floorEdgeScreen.y - screen.y).toFixed(3))
        : null;
      const bottomClearancePx = (centerClearancePx !== null && screenRadiusPx !== null)
        ? Number((centerClearancePx - screenRadiusPx).toFixed(3))
        : null;
      const engine = scene?.getEngine?.();
      const viewportWidth = engine?.getRenderWidth?.() ?? null;
      const viewportHeight = engine?.getRenderHeight?.() ?? null;
      const onScreen = !!(
        screen
        && Number.isFinite(viewportWidth)
        && Number.isFinite(viewportHeight)
        && screen.x >= 0
        && screen.x <= viewportWidth
        && screen.y >= 0
        && screen.y <= viewportHeight
      );
      return {
        world: {
          x: Number(pos.x.toFixed(3)),
          y: Number(pos.y.toFixed(3)),
          z: Number(pos.z.toFixed(3)),
        },
        screen,
        onScreen,
        floorEdgeScreen,
        screenRadiusPx,
        centerClearancePx,
        bottomClearancePx,
        renderingGroupId: mesh.renderingGroupId ?? null,
        renderPolicyCategory: mesh.metadata?.renderPolicyCategory ?? null,
        needDepthPrePass: typeof mesh.material?.needDepthPrePass === 'boolean' ? mesh.material.needDepthPrePass : null,
        forceDepthWrite: typeof mesh.material?.forceDepthWrite === 'boolean' ? mesh.material.forceDepthWrite : null,
        backFaceCulling: typeof mesh.material?.backFaceCulling === 'boolean' ? mesh.material.backFaceCulling : null,
        readableByCenter: (centerClearancePx ?? -Infinity) > 0,
        readableByBottom: (bottomClearancePx ?? -Infinity) > 0,
        readableOnScreen: onScreen && ((screenRadiusPx ?? -Infinity) > 4),
      };
    };
    const tick = () => {
      state.frameCounter += 1;
      const now = Number(performance.now().toFixed(3));
      const meshes = getProjectileMeshes();
      for (const mesh of meshes) {
        if (!state.seenProjectileNames.has(mesh.name)) {
          state.seenProjectileNames.add(mesh.name);
          const plan = state.pendingPlans.shift() ?? null;
          state.shotEntries.push({
            shotIndex: plan?.shotIndex ?? null,
            meshName: mesh.name,
            plannedAtMs: plan?.plannedAtMs ?? null,
            spawnSeenAtMs: now,
            firstSeenFrame: state.frameCounter,
            playerPos: plan?.playerPos ?? null,
            playerForward: plan?.playerForward ?? null,
            cameraPos: plan?.cameraPos ?? null,
            cameraTarget: plan?.cameraTarget ?? null,
            launchState: plan?.launchState ?? null,
            frames: [],
          });
        }
      }
      for (const entry of state.shotEntries) {
        const mesh = meshes.find((candidate) => candidate.name === entry.meshName);
        if (!mesh || entry.frames.length >= 6) continue;
        entry.frames.push({
          frameOffset: entry.frames.length,
          frameNumber: state.frameCounter,
          sampledAtMs: now,
          ...snapshotMesh(mesh),
        });
      }
      if (state.active) {
        state.rafId = requestAnimationFrame(tick);
      }
    };
    window.__LEVEL5_PROJECTILE_BURST_AUDIT__ = {
      start() {
        state.active = true;
        state.preexistingProjectileCount = getProjectileMeshes().length;
        for (const mesh of getProjectileMeshes()) state.seenProjectileNames.add(mesh.name);
        if (state.rafId === null) state.rafId = requestAnimationFrame(tick);
      },
      planShot(shotIndex) {
        const plan = {
          shotIndex,
          plannedAtMs: Number(performance.now().toFixed(3)),
          playerPos: debug?.playerPos ? {
            x: Number(debug.playerPos.x.toFixed(3)),
            y: Number(debug.playerPos.y.toFixed(3)),
            z: Number(debug.playerPos.z.toFixed(3)),
          } : null,
          playerForward: debug?.playerForward ? {
            x: Number(debug.playerForward.x.toFixed(3)),
            z: Number(debug.playerForward.z.toFixed(3)),
          } : null,
          cameraPos: camera?.position ? {
            x: Number(camera.position.x.toFixed(3)),
            y: Number(camera.position.y.toFixed(3)),
            z: Number(camera.position.z.toFixed(3)),
          } : null,
          cameraTarget: camera?.getTarget?.() ? {
            x: Number(camera.getTarget().x.toFixed(3)),
            y: Number(camera.getTarget().y.toFixed(3)),
            z: Number(camera.getTarget().z.toFixed(3)),
          } : null,
          launchState: debug?.getEra5ProjectileLaunchState?.() ?? null,
        };
        state.pendingPlans.push(plan);
        return plan;
      },
      waitForShotFrame(shotIndex, frameOffset = 0, timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
          const deadline = performance.now() + timeoutMs;
          const poll = () => {
            const shot = state.shotEntries.find((entry) => entry.shotIndex === shotIndex) ?? null;
            if (shot && shot.frames.length > frameOffset) {
              resolve(shot.frames[frameOffset]);
              return;
            }
            if (performance.now() > deadline) {
              reject(new Error(`Timed out waiting for shot ${shotIndex} frame ${frameOffset}`));
              return;
            }
            requestAnimationFrame(poll);
          };
          poll();
        });
      },
      stop() {
        state.active = false;
        if (state.rafId !== null) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        const activeProjectiles = getProjectileMeshes().map((mesh) => ({
          name: mesh.name,
          ...snapshotMesh(mesh),
        }));
        return {
          roomBounds: state.roomBounds,
          preexistingProjectileCount: state.preexistingProjectileCount,
          shots: state.shotEntries,
          activeProjectiles,
        };
      },
    };
    window.__LEVEL5_PROJECTILE_BURST_AUDIT__.start();
  });
}

async function captureLevel5ProjectileBurstProof(page, captureProof, {
  shotCount = 3,
  interShotDelayMs = 460,
  captureDelayMs = 160,
  pathPrefix = 'docs/screenshots/level5-room-reset-projectile-burst',
} = {}) {
  await page.evaluate(() => {
    window.focus();
  });
  for (let shotIndex = 1; shotIndex <= shotCount; shotIndex += 1) {
    const fired = await page.evaluate(() => window.__DADA_DEBUG__?.fireEra5Weapon?.() ?? false);
    if (!fired) {
      throw new Error(`Failed to fire Level 5 burst shot ${shotIndex}`);
    }
    await page.waitForTimeout(captureDelayMs);
    if (shotIndex <= 3) {
      await captureProof(`${pathPrefix}-shot${shotIndex}.png`);
    }
    if (shotIndex < shotCount) {
      await page.waitForTimeout(interShotDelayMs);
    }
  }

  await page.waitForTimeout(220);
  await captureProof(`${pathPrefix}-continuous.png`);
  return { shotCount };
}

function expectLevel5ProjectileBurstFrame(frame) {
  expect(frame?.world).not.toBeNull();
  expect(frame?.screen).not.toBeNull();
  expect(frame?.onScreen).toBe(true);
  expect(frame?.screenRadiusPx).toBeGreaterThan(4);
  expect(frame?.readableOnScreen).toBe(true);
  expect(frame?.renderPolicyCategory).toBe('projectile');
  expect(frame?.renderingGroupId).toBe(4);
  expect(frame?.needDepthPrePass).toBe(true);
  expect(frame?.forceDepthWrite).toBe(true);
  expect(frame?.backFaceCulling).toBe(false);
}

async function getLevel5RenderPolicyAudit(page) {
  return page.evaluate(() => {
    const debug = window.__DADA_DEBUG__ ?? {};
    const scene = debug?.sceneRef ?? null;
    const camera = debug?.cameraRef ?? scene?.activeCamera ?? null;
    const Vector3 = window.BABYLON?.Vector3 ?? camera?.position?.constructor ?? null;
    const Matrix = window.BABYLON?.Matrix ?? scene?.getTransformMatrix?.()?.constructor ?? null;
    const meshes = scene?.meshes ?? [];
    const projectPoint = (point) => {
      if (!point || !scene || !camera || !Vector3 || !Matrix) return null;
      const engine = scene.getEngine();
      const projected = Vector3.Project(
        point,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
      );
      return {
        x: Number(projected.x.toFixed(2)),
        y: Number(projected.y.toFixed(2)),
      };
    };
    const getScreenBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box || !scene || !camera || !Vector3 || !Matrix) return null;
      const { minimumWorld: min, maximumWorld: max } = box;
      const corners = [
        new Vector3(min.x, min.y, min.z),
        new Vector3(min.x, min.y, max.z),
        new Vector3(min.x, max.y, min.z),
        new Vector3(min.x, max.y, max.z),
        new Vector3(max.x, min.y, min.z),
        new Vector3(max.x, min.y, max.z),
        new Vector3(max.x, max.y, min.z),
        new Vector3(max.x, max.y, max.z),
      ]
        .map(projectPoint)
        .filter(Boolean);
      if (corners.length === 0) return null;
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      return {
        minX: Number(Math.min(...xs).toFixed(2)),
        maxX: Number(Math.max(...xs).toFixed(2)),
        minY: Number(Math.min(...ys).toFixed(2)),
        maxY: Number(Math.max(...ys).toFixed(2)),
      };
    };
    const isOnScreen = (screenBounds) => !!(
      screenBounds
      && scene
      && camera
      && screenBounds.maxX >= 0
      && screenBounds.minX <= scene.getEngine().getRenderWidth()
      && screenBounds.maxY >= 0
      && screenBounds.minY <= scene.getEngine().getRenderHeight()
    );
    const getBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: box.minimumWorld.x,
        maxX: box.maximumWorld.x,
        minY: box.minimumWorld.y,
        maxY: box.maximumWorld.y,
        minZ: box.minimumWorld.z,
        maxZ: box.maximumWorld.z,
      };
    };
    const summarizeMesh = (mesh) => {
      if (!mesh) return null;
      const center = mesh.getBoundingInfo?.()?.boundingBox?.centerWorld?.clone?.() ?? null;
      const screenBounds = getScreenBounds(mesh);
      const screen = screenBounds
        ? {
          x: Number((((screenBounds.minX + screenBounds.maxX) * 0.5)).toFixed(2)),
          y: Number((((screenBounds.minY + screenBounds.maxY) * 0.5)).toFixed(2)),
        }
        : projectPoint(center);
      return {
        name: mesh.name,
        screen,
        screenBounds,
        onScreen: isOnScreen(screenBounds),
        renderingGroupId: mesh.renderingGroupId ?? null,
        renderPolicyCategory: mesh.metadata?.renderPolicyCategory ?? null,
        needDepthPrePass: typeof mesh.material?.needDepthPrePass === 'boolean' ? mesh.material.needDepthPrePass : null,
        backFaceCulling: typeof mesh.material?.backFaceCulling === 'boolean' ? mesh.material.backFaceCulling : null,
        forceDepthWrite: typeof mesh.material?.forceDepthWrite === 'boolean' ? mesh.material.forceDepthWrite : null,
        bounds: getBounds(mesh),
      };
    };
    const compareWeaponSummary = (a, b) => {
      const aOnScreen = a?.onScreen ? 1 : 0;
      const bOnScreen = b?.onScreen ? 1 : 0;
      if (aOnScreen !== bOnScreen) return bOnScreen - aOnScreen;
      const aBounds = a?.bounds;
      const bBounds = b?.bounds;
      const av = aBounds
        ? (aBounds.maxX - aBounds.minX) * (aBounds.maxY - aBounds.minY) * (aBounds.maxZ - aBounds.minZ)
        : -Infinity;
      const bv = bBounds
        ? (bBounds.maxX - bBounds.minX) * (bBounds.maxY - bBounds.minY) * (bBounds.maxZ - bBounds.minZ)
        : -Infinity;
      return bv - av;
    };
    const weaponMeshes = meshes.filter((mesh) => {
      let node = mesh;
      while (node) {
        if (String(node.name || '').startsWith('weapon_')) return true;
        node = node.parent || null;
      }
      return false;
    });
    const weaponMesh = weaponMeshes
      .map((mesh) => summarizeMesh(mesh))
      .filter(Boolean)
      .sort(compareWeaponSummary)[0] ?? null;
    const waterMesh = meshes.find((mesh) => mesh?.name === 'starter_pool_water_surface_vis') ?? null;
    return {
      weapon: weaponMesh,
      water: summarizeMesh(waterMesh),
    };
  });
}

async function getLevel5PoolMouthCollisionAudit(page) {
  return page.evaluate(() => {
    const mouthMinX = 34.0;
    const mouthMaxX = 38.0;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const summarizeBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: box.minimumWorld.x,
        maxX: box.maximumWorld.x,
        minY: box.minimumWorld.y,
        maxY: box.maximumWorld.y,
        minZ: box.minimumWorld.z,
        maxZ: box.maximumWorld.z,
      };
    };
    const opening = {
      minX: mouthMinX,
      maxX: mouthMaxX,
      minY: -2.0,
      maxY: -0.31,
      minZ: 33.75,
      maxZ: 34.15,
      planeMinZ: 33.75,
      planeMaxZ: 34.05,
    };
    const colliders = (scene?.meshes || [])
      .filter((mesh) => mesh?.checkCollisions === true && mesh?.metadata?.gameplayBlocker === true)
      .map((mesh) => ({
        name: String(mesh?.metadata?.sourceName || mesh?.name || ''),
        bounds: summarizeBounds(mesh),
      }))
      .filter((entry) => entry.bounds && entry.name.startsWith('starter_pool_'));
    return {
      edgeBlockersAcrossMouth: colliders.filter((entry) => entry.name.includes('edge_s') && overlaps(entry.bounds.minX, entry.bounds.maxX, opening.minX, opening.maxX) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, opening.planeMinZ, opening.planeMaxZ)).map((entry) => entry.name),
      lowerBlockersAcrossOpening: colliders.filter((entry) => overlaps(entry.bounds.minX, entry.bounds.maxX, opening.minX, opening.maxX) && overlaps(entry.bounds.minY, entry.bounds.maxY, opening.minY, opening.maxY) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, opening.minZ, opening.maxZ)).map((entry) => entry.name),
    };
  });
}

async function getLevel5PoolWallPatchAudit(page) {
  return page.evaluate(() => {
    const mouthMinX = 34.0;
    const mouthMaxX = 38.0;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const summarizeBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: box.minimumWorld.x,
        maxX: box.maximumWorld.x,
        minY: box.minimumWorld.y,
        maxY: box.maximumWorld.y,
        minZ: box.minimumWorld.z,
        maxZ: box.maximumWorld.z,
      };
    };
    const region = {
      minX: mouthMinX,
      maxX: mouthMaxX,
      minY: 1.0,
      maxY: 5.9,
      minZ: 36.0,
      maxZ: 37.9,
    };
    return (scene?.meshes || [])
      .filter((mesh) => mesh?.isEnabled?.() !== false && mesh?.isVisible !== false && (mesh?.visibility ?? 1) > 0.02)
      .map((mesh) => ({
        name: String(mesh?.metadata?.sourceName || mesh?.name || ''),
        bounds: summarizeBounds(mesh),
      }))
      .filter((entry) => entry.bounds && overlaps(entry.bounds.minX, entry.bounds.maxX, region.minX, region.maxX) && overlaps(entry.bounds.minY, entry.bounds.maxY, region.minY, region.maxY) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, region.minZ, region.maxZ))
      .map((entry) => entry.name)
      .sort();
  });
}

async function getLevel5SecretTunnelAudit(page) {
  return page.evaluate(() => {
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const sourceNameFor = (mesh) => String(mesh?.metadata?.sourceName || mesh?.name || '');
    const camera = scene?.activeCamera ?? null;
    const engine = scene?.getEngine?.() ?? null;
    const width = engine?.getRenderWidth?.() ?? 1280;
    const height = engine?.getRenderHeight?.() ?? 720;
    const region = {
      minX: width * 0.28,
      maxX: width * 0.74,
      minY: height * 0.34,
      maxY: height * 0.82,
      cols: 15,
      rows: 11,
    };
    const samples = [];
    for (let row = 0; row < region.rows; row += 1) {
      const y = region.minY + ((region.maxY - region.minY) * (row / Math.max(1, region.rows - 1)));
      for (let col = 0; col < region.cols; col += 1) {
        const x = region.minX + ((region.maxX - region.minX) * (col / Math.max(1, region.cols - 1)));
        const hit = scene?.pick?.(
          x,
          y,
          (mesh) => mesh?.isVisible !== false && (mesh?.visibility ?? 1) > 0.02,
          false,
          camera,
        ) ?? null;
        samples.push({
          id: `r${row}_c${col}`,
          sourceName: sourceNameFor(hit?.pickedMesh),
        });
      }
    }
    return {
      visibleSources: [...new Set(samples.map((sample) => sample.sourceName).filter(Boolean))].sort(),
    };
  });
}

test('capture scene screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 800, height: 500 });

  for (const { scene, key, file } of SHOT_SCENES) {
    await page.goto(`http://127.0.0.1:4173/?shot=1&scene=${scene}`);
    await page.waitForFunction(
      (k) => window.__DADA_DEBUG__?.sceneKey === k,
      key,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () => window.__DADA_DEBUG__?.shotReady === true,
      { timeout: 15_000 }
    );
    await page.waitForFunction(
      () => (window.__DADA_DEBUG__?.shotFrames ?? 0) >= 10,
      { timeout: 5_000 }
    );
    await page.screenshot({
      path: `docs/screenshots/${file}.png`,
      clip: { x: 0, y: 0, width: 800, height: 500 },
    });
  }
});

test('capture Level 5 Aquarium Drift structural graybox proof screenshots', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5-aquarium-graybox', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5-aquarium-graybox/${path.split('/').pop()}`);
  }

  await gotoDebugLevel(page, 5);
  await unlockThroughLevel(page, 4);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1200);
  await hideGameplayUi(page);

  const report = await page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
    runtimeFamily: window.__DADA_DEBUG__?.levelRuntimeFamily ?? null,
    themeKey: window.__DADA_DEBUG__?.levelThemeKey ?? null,
    layout: window.__DADA_DEBUG__?.levelLayoutReport?.() ?? null,
  }));
  expect(report.sceneKey).toBe('CribScene');
  expect(report.lastRuntimeError).toBeNull();
  expect(report.runtimeFamily).toBe('2.5d');
  expect(report.themeKey).toBe('aquarium');
  expect(report.layout?.encounterCount).toBe(14);
  expect(report.layout?.optionalBranchCount).toBe(2);
  expect(report.layout?.checkpointCount).toBe(4);

  await captureProof('docs/screenshots/level5-aquarium-graybox-start.png');

  for (const [key, path] of [
    ['act2', 'docs/screenshots/level5-aquarium-graybox-act2.png'],
    ['act3', 'docs/screenshots/level5-aquarium-graybox-act3.png'],
    ['act4', 'docs/screenshots/level5-aquarium-graybox-act4.png'],
    ['act5', 'docs/screenshots/level5-aquarium-graybox-act5.png'],
  ]) {
    const pose = report.layout?.proofPoses?.[key];
    expect(pose).toBeTruthy();
    await page.evaluate((nextPose) => {
      window.__DADA_DEBUG__?.teleportPlayer?.(nextPose.x, nextPose.y, nextPose.z ?? 0);
    }, pose);
    await page.waitForTimeout(350);
    await captureProof(path);
  }
});

test('capture Level 6 through 9 2.5D placeholder proof screenshots', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5plus-2d-placeholders', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5plus-2d-placeholders/${path.split('/').pop()}`);
  }

  await gotoDebugLevel(page, 1);
  for (const { id, meta } of LEVEL5PLUS_CASES) {
    await expect(page.locator(`#levelBtn${id}`)).toContainText(meta.title);
    await expect(page.locator(`#levelBtn${id}`)).not.toHaveClass(/under-construction/);
  }
  await page.click('#levelBtn5');
  await expect(page.locator('#titlePreviewTitle')).toHaveText('Aquarium Drift');
  await captureProof('docs/screenshots/level5plus-2d-title-menu.png');

  for (const { id, meta, themeKey } of LEVEL5PLUS_PLACEHOLDER_CASES) {
    await gotoDebugLevel(page, id);
    await unlockThroughLevel(page, Math.max(4, id - 1));
    await page.evaluate((targetLevelId) => {
      window.__DADA_DEBUG__?.startLevel?.(targetLevelId);
    }, id);
    await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
    await page.waitForTimeout(1200);
    await hideGameplayUi(page);

    const report = await page.evaluate(() => ({
      sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
      lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
      runtimeFamily: window.__DADA_DEBUG__?.levelRuntimeFamily ?? null,
      themeKey: window.__DADA_DEBUG__?.levelThemeKey ?? null,
      topology: window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null,
    }));
    expect(report).toEqual({
      sceneKey: 'CribScene',
      lastRuntimeError: null,
      runtimeFamily: '2.5d',
      themeKey,
      topology: null,
    });

    await captureProof(`docs/screenshots/level${id}-2d-placeholder.png`);

    // Restore UI root for the next level capture.
    await page.reload({ waitUntil: 'networkidle' });
  }
});

describeEra5Mainline('Archived Era 5 mainline proof screenshots', () => {
test('capture Level 6 under-construction proof screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level6-under-construction', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level6-under-construction/${path.split('/').pop()}`);
  }

  await gotoDebugLevel(page, 1);
  await page.click('#levelBtn6');
  await expect(page.locator('#titleHint')).toContainText('under construction');
  await captureProof('docs/screenshots/level6-under-construction-title.png');

  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey ?? null),
    { timeout: 5_000 },
  ).toBe('TitleScene');
  await expect(page.locator('#titleHint')).toContainText('under construction');
  await captureProof('docs/screenshots/level6-under-construction-blocked.png');
});

test('capture Level 5 starter-slice proof screenshots', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5-starter-slice', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5-starter-slice/${path.split('/').pop()}`);
  }

  async function frameRoom({ path, pose, view }) {
    await page.evaluate(({ nextPose, nextView }) => {
      window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
      window.__DADA_DEBUG__?.setEra5CameraDebugView?.(nextView);
    }, { nextPose: pose, nextView: view });
    await page.waitForTimeout(700);
    await captureProof(path);
  }

  async function captureGameplayPose(path, pose, waitMs = 800) {
    await page.evaluate((nextPose) => {
      window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
      window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
    }, pose);
    await page.waitForTimeout(waitMs);
    await captureProof(path);
  }

  await gotoDebugLevel(page, 5);
  await seedEra5BubbleWand(page);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1800);
  await hideGameplayUi(page);

  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null);
  expect(topology?.mapId).toBe('level5-starter-vertical-slice');
  expect(topology?.sectorCount).toBe(4);
  const runtimeState = await page.evaluate(() => ({
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
  }));
  expect(runtimeState.lastRuntimeError).toBeNull();

  const mouthCollisionAudit = await getLevel5PoolMouthCollisionAudit(page);
  expect(mouthCollisionAudit.edgeBlockersAcrossMouth).toEqual([]);
  expect(mouthCollisionAudit.lowerBlockersAcrossOpening).toEqual([]);
  const wallPatchAudit = await getLevel5PoolWallPatchAudit(page);
  expect(wallPatchAudit).toContain('starter_pool_lab_south_wall_header');
  expect(wallPatchAudit).not.toContain('swim_tunnel_throat_north_wall_header');
  expect(wallPatchAudit).not.toContain('swim_tunnel_throat_ceiling');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('closer');
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
  });

  await frameRoom({
    path: 'docs/screenshots/level5-starter-slice-room1.png',
    pose: { x: 8.0, y: 0.42, z: 18.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 },
    view: {
      label: 'l5-starter-slice-room1',
      position: { x: 6.0, y: 3.4, z: 10.0 },
      target: { x: 36.0, y: -0.85, z: 31.2 },
      fov: 0.6,
    },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.({ x: 22.0, y: 0.42, z: 18.0, yaw: -0.3, cameraYaw: -0.3 });
  });
  await page.waitForTimeout(800);
  const roomSightlineAudit = await getLevel5SecretTunnelAudit(page);
  expect(roomSightlineAudit.visibleSources.some((name) => name.includes('surfacing_hallway'))).toBe(false);
  expect(roomSightlineAudit.visibleSources.some((name) => name.includes('puzzle_chamber'))).toBe(false);
  expect(roomSightlineAudit.visibleSources.some((name) => name.includes('swim_tunnel_stair_'))).toBe(false);
  await captureProof('docs/screenshots/level5-starter-slice-gameplay-room-view.png');

  await frameRoom({
    path: 'docs/screenshots/level5-starter-slice-pool-mouth.png',
    pose: { x: 36.0, y: -1.05, z: 31.4, yaw: 0.0, cameraYaw: 0.0 },
    view: {
      label: 'l5-starter-slice-pool-mouth',
      position: { x: 36.0, y: -0.25, z: 26.8 },
      target: { x: 35.9, y: -1.15, z: 37.8 },
      fov: 0.54,
    },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.({ x: 36.0, y: 0.42, z: 25.4, yaw: 0.0, cameraYaw: 0.0 });
  });
  await page.waitForTimeout(800);
  const poolSightlineAudit = await getLevel5SecretTunnelAudit(page);
  expect(poolSightlineAudit.visibleSources.some((name) => name.includes('swim_tunnel_stair_shaft'))).toBe(false);
  expect(poolSightlineAudit.visibleSources.some((name) => name.includes('surfacing_hallway'))).toBe(false);
  expect(poolSightlineAudit.visibleSources.some((name) => name.includes('puzzle_chamber'))).toBe(false);
  expect(poolSightlineAudit.visibleSources.some((name) => name.includes('swim_tunnel_stair_'))).toBe(false);
  await captureProof('docs/screenshots/level5-starter-slice-gameplay-pool-view.png');

  await captureGameplayPose('docs/screenshots/level5-starter-slice-tunnel-run.png', {
    x: 36.0,
    y: -1.1,
    z: 54.0,
    yaw: 0.0,
    cameraYaw: 0.0,
  });

  await captureGameplayPose('docs/screenshots/level5-starter-slice-stair-surface.png', {
    x: 41.2,
    y: 0.42,
    z: 76.0,
    yaw: 0.0,
    cameraYaw: 0.0,
  });

  await captureGameplayPose('docs/screenshots/level5-starter-slice-hallway.png', {
    x: 35.2,
    y: 0.42,
    z: 82.0,
    yaw: Math.PI,
    cameraYaw: Math.PI,
  });

  await captureGameplayPose('docs/screenshots/level5-starter-slice-chamber-entry.png', {
    x: 36.0,
    y: 0.42,
    z: 84.6,
    yaw: 0.0,
    cameraYaw: 0.0,
  });

  await frameRoom({
    path: 'docs/screenshots/level5-starter-slice-chamber-overview.png',
    pose: { x: 36.0, y: 0.42, z: 86.0, yaw: 0.0, cameraYaw: 0.0 },
    view: {
      label: 'l5-starter-slice-chamber-overview',
      position: { x: 29.2, y: 5.8, z: 86.4 },
      target: { x: 36.0, y: 1.9, z: 96.0 },
      fov: 0.72,
    },
  });

  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, {
    x: 38.8,
    y: 0.42,
    z: 90.8,
    yaw: 0.0,
    cameraYaw: 0.0,
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__DADA_DEBUG__?.gameplayHotkey?.('KeyE') ?? false)).toBe(true);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null),
    { timeout: 6_000 },
  ).toMatchObject({
    state: 'platform_raised',
    platformState: 'raised',
  });
  await captureGameplayPose('docs/screenshots/level5-starter-slice-chamber-platform-raised.png', {
    x: 36.0,
    y: 0.42,
    z: 90.2,
    yaw: 0.0,
    cameraYaw: 0.0,
  }, 500);

  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, {
    x: 41.2,
    y: 0.42,
    z: 96.0,
    yaw: -Math.PI * 0.5,
    cameraYaw: -Math.PI * 0.5,
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__DADA_DEBUG__?.gameplayHotkey?.('KeyE') ?? false)).toBe(true);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null),
    { timeout: 4_000 },
  ).toMatchObject({
    state: 'east_console_revealed',
  });
  await expect.poll(
    () => page.evaluate(() => {
      const state = window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null;
      return (state?.consoleProgress ?? 0) > 0.95 && (state?.seamProgress ?? 0) > 0.95;
    }),
    { timeout: 4_000 },
  ).toBe(true);
  await captureGameplayPose('docs/screenshots/level5-starter-slice-chamber-console-revealed.png', {
    x: 38.7,
    y: 0.42,
    z: 95.2,
    yaw: -Math.PI * 0.5,
    cameraYaw: -Math.PI * 0.5,
  }, 500);

  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, {
    x: 40.8,
    y: 0.42,
    z: 96.0,
    yaw: -Math.PI * 0.5,
    cameraYaw: -Math.PI * 0.5,
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__DADA_DEBUG__?.gameplayHotkey?.('KeyE') ?? false)).toBe(true);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null),
    { timeout: 4_000 },
  ).toMatchObject({
    state: 'bridge_window_open',
    bridgePhase: 'open',
    hazardPhase: 'active',
  });
  await captureGameplayPose('docs/screenshots/level5-starter-slice-chamber-crossing-window.png', {
    x: 36.0,
    y: 0.42,
    z: 97.1,
    yaw: 0.0,
    cameraYaw: 0.0,
  }, 500);
  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, {
    x: 36.0,
    y: 0.42,
    z: 97.1,
    yaw: 0.0,
    cameraYaw: 0.0,
  });
  await page.waitForTimeout(150);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null),
    { timeout: 4_000 },
  ).toMatchObject({
    state: 'bridge_window_open',
    bridgePhase: 'open',
    hazardPhase: 'reset',
  });

  await focusGameplay(page);
  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, {
    x: 36.0,
    y: 0.42,
    z: 102.0,
    yaw: 0.0,
    cameraYaw: 0.0,
  });
  await page.waitForTimeout(150);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState?.puzzleChamber ?? null),
    { timeout: 8_000 },
  ).toMatchObject({
    state: 'chamber_step_complete',
    rewardReached: true,
  });
  await page.waitForTimeout(250);
  await captureGameplayPose('docs/screenshots/level5-starter-slice-chamber-complete.png', {
    x: 36.0,
    y: 0.42,
    z: 101.8,
    yaw: 0.0,
    cameraYaw: 0.0,
  }, 500);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });
});

test('capture Level 5 render-policy proof screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/render-policy-level5', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/render-policy-level5/${path.split('/').pop()}`);
  }

  await gotoDebugLevel(page, 5);
  await seedEra5BubbleWand(page);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1800);
  await hideGameplayUi(page);
  await focusGameplay(page);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('closer');
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });

  for (const [key, pose] of Object.entries(LEVEL5_POOL_RENDER_POSES)) {
    await page.evaluate((nextPose) => {
      window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
    }, pose);
    await page.waitForTimeout(260);
    const audit = await getLevel5RenderPolicyAudit(page);
    expect(audit?.water?.renderPolicyCategory).toBe('waterSurface');
    expect(audit?.water?.renderingGroupId).toBe(3);
    expect(audit?.weapon?.name).toBeTruthy();
    expect(audit?.weapon?.onScreen).toBe(true);
    expect(audit?.weapon?.renderPolicyCategory).toBe('heldItem');
    expect(audit?.weapon?.renderingGroupId).toBe(4);
    await captureProof(`docs/screenshots/render-policy-level5-held-${key}.png`);
  }

  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, LEVEL5_POOL_RENDER_POSES.waterline);
  await page.waitForTimeout(260);
  await captureLevel5ProjectileBurstProof(page, captureProof, {
    pathPrefix: 'docs/screenshots/render-policy-level5-projectile-burst',
  });
});
});
