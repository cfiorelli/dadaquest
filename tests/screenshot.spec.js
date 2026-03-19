// @ts-check
import { test, expect } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';

const SHOT_SCENES = [
  { scene: 'title', key: 'TitleScene', file: 'title' },
  { scene: 'crib', key: 'CribScene', file: 'crib' },
  { scene: 'end', key: 'EndScene', file: 'end' },
];
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
      return {
        world: {
          x: Number(pos.x.toFixed(3)),
          y: Number(pos.y.toFixed(3)),
          z: Number(pos.z.toFixed(3)),
        },
        screen,
        floorEdgeScreen,
        screenRadiusPx,
        centerClearancePx,
        bottomClearancePx,
        readableByCenter: (centerClearancePx ?? -Infinity) > 0,
        readableByBottom: (bottomClearancePx ?? -Infinity) > 0,
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

async function captureLevel5ProjectileBurstProof(page, captureProof, { shotCount = 5, interShotDelayMs = 390 } = {}) {
  await page.evaluate(() => {
    window.focus();
  });
  await installLevel5ProjectileBurstAudit(page);

  const firstFrames = [];
  for (let shotIndex = 1; shotIndex <= shotCount; shotIndex += 1) {
    await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.planShot(index), shotIndex);
    await page.keyboard.press('f');
    const frame = await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.waitForShotFrame(index, 0), shotIndex);
    firstFrames.push(frame);
    if (shotIndex <= 3) {
      await captureProof(`docs/screenshots/level5-room-reset-projectile-burst-shot${shotIndex}.png`);
    }
    if (shotIndex < shotCount) {
      await page.waitForTimeout(interShotDelayMs);
    }
  }

  const report = await page.evaluate(async (shotCountValue) => {
    for (let shotIndex = 1; shotIndex <= shotCountValue; shotIndex += 1) {
      await window.__LEVEL5_PROJECTILE_BURST_AUDIT__.waitForShotFrame(shotIndex, 2);
    }
    return window.__LEVEL5_PROJECTILE_BURST_AUDIT__.stop();
  }, shotCount);
  await captureProof('docs/screenshots/level5-room-reset-projectile-burst-continuous.png');
  return {
    firstFrames,
    report,
  };
}

function expectLevel5ProjectileBurstFrame(frame) {
  expect(frame?.world).not.toBeNull();
  expect(frame?.screen).not.toBeNull();
  expect(frame?.floorEdgeScreen).not.toBeNull();
  expect(frame?.screenRadiusPx).toBeGreaterThan(4);
  expect(frame?.centerClearancePx).toBeGreaterThan(4);
  expect(frame?.bottomClearancePx).toBeGreaterThan(4);
  expect(frame?.readableByBottom).toBe(true);
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

test('capture Level 5 graybox proof screenshots', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5-graybox', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5-graybox/${path.split('/').pop()}`);
  }

  async function frameRoom({ path, pose, view }) {
    await page.evaluate(({ nextPose, nextView }) => {
      window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
      window.__DADA_DEBUG__?.setEra5CameraDebugView?.(nextView);
    }, { nextPose: pose, nextView: view });
    await page.waitForTimeout(700);
    await captureProof(path);
  }

  await gotoDebugLevel(page, 5);
  await unlockThroughLevel(page, 4);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1800);
  await hideGameplayUi(page);

  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null);
  expect(topology?.mapId).toBe('level5-squarium-graybox');
  expect(topology?.sectorCount).toBe(7);
  const runtimeState = await page.evaluate(() => ({
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
  }));
  expect(runtimeState.lastRuntimeError).toBeNull();

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
    path: 'docs/screenshots/level5-graybox-room1-pool-lab.png',
    pose: { x: 8.0, y: 0.42, z: 18.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 },
    view: {
      label: 'l5-graybox-room1',
      position: { x: 6.0, y: 3.4, z: 10.0 },
      target: { x: 36.0, y: -0.85, z: 31.2 },
      fov: 0.6,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room1-hidden-exit.png',
    pose: { x: 36.0, y: -1.05, z: 31.4, yaw: 0.0, cameraYaw: 0.0 },
    view: {
      label: 'l5-graybox-room1-hidden-exit',
      position: { x: 36.0, y: -0.25, z: 26.8 },
      target: { x: 36.0, y: -1.15, z: 41.5 },
      fov: 0.54,
    },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.({ x: 36.0, y: -1.05, z: 31.4, yaw: 0.0, cameraYaw: 0.0 });
  });
  await page.waitForTimeout(800);
  await captureProof('docs/screenshots/level5-graybox-room1-gameplay-view.png');

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room2-service-tunnel.png',
    pose: { x: 34.7, y: -1.1, z: 50.0, yaw: 0.0, cameraYaw: 0.0 },
    view: {
      label: 'l5-graybox-room2',
      position: { x: 32.4, y: -0.1, z: 47.0 },
      target: { x: 34.7, y: -1.0, z: 53.0 },
      fov: 0.62,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room2-secret-stairs.png',
    pose: { x: 36.0, y: -0.45, z: 57.7, yaw: 0.0, cameraYaw: 0.0 },
    view: {
      label: 'l5-graybox-room2-secret-stairs',
      position: { x: 40.2, y: 0.55, z: 59.2 },
      target: { x: 36.0, y: -0.65, z: 57.6 },
      fov: 0.6,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room3-pump-junction.png',
    pose: { x: 31.0, y: 0.42, z: 68.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 },
    view: {
      label: 'l5-graybox-room3',
      position: { x: 27.5, y: 5.3, z: 80.5 },
      target: { x: 40.0, y: 1.8, z: 68.0 },
      fov: 0.62,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room4-transfer-gallery.png',
    pose: { x: 58.0, y: 0.42, z: 68.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 },
    view: {
      label: 'l5-graybox-room4',
      position: { x: 55.0, y: 4.8, z: 80.0 },
      target: { x: 73.0, y: 1.6, z: 68.0 },
      fov: 0.58,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room5-stadium-room.png',
    pose: { x: 92.0, y: 0.42, z: 68.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 },
    view: {
      label: 'l5-graybox-room5',
      position: { x: 86.0, y: 10.5, z: 98.0 },
      target: { x: 126.0, y: 3.0, z: 68.0 },
      fov: 0.72,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room6-west-wing.png',
    pose: { x: 96.0, y: 8.42, z: 18.0, yaw: Math.PI, cameraYaw: Math.PI },
    view: {
      label: 'l5-graybox-room6',
      position: { x: 91.0, y: 12.8, z: 27.0 },
      target: { x: 96.0, y: 9.2, z: 15.0 },
      fov: 0.56,
    },
  });

  await frameRoom({
    path: 'docs/screenshots/level5-graybox-room7-east-wing.png',
    pose: { x: 156.0, y: 8.42, z: 18.0, yaw: Math.PI, cameraYaw: Math.PI },
    view: {
      label: 'l5-graybox-room7',
      position: { x: 151.0, y: 12.8, z: 27.0 },
      target: { x: 156.0, y: 9.2, z: 15.0 },
      fov: 0.56,
    },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });
});
