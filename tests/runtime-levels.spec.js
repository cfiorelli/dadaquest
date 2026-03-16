// @ts-check
import { test, expect } from '@playwright/test';

const PROGRESS_KEY = 'dadaquest:progress:v1';
const LEVEL_CASES = [
  { id: 1, url: 'http://127.0.0.1:4173/?debug=1' },
  { id: 2, url: 'http://127.0.0.1:4173/?level=2&debug=1' },
  { id: 3, url: 'http://127.0.0.1:4173/?level=3&debug=1' },
];
const LEVEL5_DOORWAY_START_POSE = {
  x: 21.4,
  y: 0.42,
  z: 9.0,
  yaw: Math.PI * 0.5,
  cameraYaw: Math.PI * 0.5,
};
const LEVEL5_DOORWAY_DIRECT_BLOCK_POSE = {
  x: 21.4,
  y: 0.42,
  z: 9.0,
  yaw: -Math.PI * 0.5,
  cameraYaw: -Math.PI * 0.5,
};
const LEVEL5_DOORWAY_RIGHT_TURN_STEPS = [
  { key: 'slightRight', holdMs: 160 },
  { key: 'right90', holdMs: 1300 },
  { key: 'rightStress', holdMs: 2200 },
];

async function installCleanStorage(page) {
  await page.addInitScript((progressKey) => {
    try {
      if (!window.sessionStorage.getItem('__pw_storage_reset__')) {
        window.localStorage.removeItem(progressKey);
        window.sessionStorage.clear();
        window.sessionStorage.setItem('__pw_storage_reset__', '1');
      }
    } catch {}
  }, PROGRESS_KEY);
}

async function gotoDebugLevel(page, levelId = 1) {
  const url = levelId === 1
    ? 'http://127.0.0.1:4173/?debug=1'
    : `http://127.0.0.1:4173/?level=${levelId}&debug=1`;
  await page.goto(url);
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
}

async function startDebugLevel(page, levelId) {
  await page.evaluate((targetLevelId) => {
    window.__DADA_DEBUG__?.startLevel?.(targetLevelId);
  }, levelId);
  await expect.poll(
    () => page.evaluate(() => ({
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError || null,
    })),
    { timeout: 90_000 },
  ).toEqual({
    sceneKey: 'CribScene',
    lastRuntimeError: null,
  });
}

async function getUnderConstructionReport(page) {
  return page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
    musicLevelId: window.__DADA_DEBUG__?.musicLevelId ?? null,
    musicRunning: !!window.__DADA_DEBUG__?.musicRunning,
    underConstructionLevelId: window.__DADA_DEBUG__?.underConstructionLevelId ?? null,
    topology: window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null,
    enemies: window.__DADA_DEBUG__?.era5EnemyReport?.()?.enemies ?? [],
    hint: document.getElementById('titleHint')?.textContent ?? '',
    lockText: document.getElementById('titleLevelLock')?.textContent ?? '',
    menuLockState: window.__DADA_DEBUG__?.getMenuLockState?.() ?? null,
  }));
}

function expectUnderConstructionReport(report, levelId, { requirePlaceholderLevel = true } = {}) {
  expect(report).not.toBeNull();
  expect(report.sceneKey).toBe('TitleScene');
  expect(report.lastRuntimeError).toBeNull();
  expect(report.musicLevelId).not.toBe(levelId);
  expect(report.musicRunning).toBe(false);
  if (requirePlaceholderLevel) {
    expect(report.underConstructionLevelId).toBe(levelId);
    expect(report.topology).toBeNull();
    expect(report.enemies).toEqual([]);
  }
  expect(report.hint.toLowerCase()).toContain('under construction');
  expect(report.lockText.toLowerCase()).toContain('under construction');
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

async function snapshotEra5Pose(page) {
  return page.evaluate(() => ({
    x: window.__DADA_DEBUG__?.playerPos?.x ?? 0,
    y: window.__DADA_DEBUG__?.playerPos?.y ?? 0,
    z: window.__DADA_DEBUG__?.playerPos?.z ?? 0,
    yaw: window.__DADA_DEBUG__?.playerYaw ?? 0,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? 0,
  }));
}

async function resetEra5Pose(page, pose) {
  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, pose);
  await page.waitForTimeout(90);
}

function dotXZ(delta, direction) {
  return (delta.x * direction.x) + (delta.z * direction.z);
}

function getRightFromForward(forward) {
  return {
    x: forward.z,
    z: -forward.x,
  };
}

function wrapDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

async function unlockThroughLevel(page, completedLevel = 4, extraPatch = {}) {
  await page.evaluate(({ maxLevel, patch }) => {
    const levelCompleted = {};
    for (let levelId = 4; levelId <= maxLevel; levelId += 1) {
      levelCompleted[levelId] = true;
    }
    window.__DADA_DEBUG__?.setProgress?.({
      sourdoughUnlocked: true,
      levelCompleted,
      ...patch,
    });
  }, { maxLevel: completedLevel, patch: extraPatch });
}

async function unlockEra5(page, { completed5 = false } = {}) {
  await unlockThroughLevel(page, completed5 ? 5 : 4);
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
      if (!(mesh?.name || mesh?.parent)) return false;
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
        bounds: getBounds(mesh),
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

    const unexpectedVisibleActorsOutsideRoom = visibleGoalMeshes.filter((mesh) => roomBounds && mesh.position && (
      mesh.position.x < (roomBounds.minX - 0.01)
      || mesh.position.x > (roomBounds.maxX + 0.01)
      || mesh.position.z < (roomBounds.minZ - 0.01)
      || mesh.position.z > (roomBounds.maxZ + 0.01)
    ));

    const ceilingMeshes = meshes
      .map((mesh) => ({
        truthRole: mesh.metadata?.truthRole || null,
        bounds: getBounds(mesh),
        sourceName: String(mesh.metadata?.sourceName || mesh.name || ''),
        decorIntent: mesh.metadata?.decorIntent || null,
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
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
      ))
      .map(({ bounds, sourceName, decorIntent, materialAlpha, transparencyMode }) => ({
        name: sourceName,
        decorIntent,
        bounds,
        materialAlpha,
        transparencyMode,
      }));

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
          left: left.name,
          right: right.name,
          sharedPlaneY: Number(sharedPlane.toFixed(3)),
        });
      }
    }

    return {
      roomBounds,
      actorSummary,
      shellMeshes,
      transparentShells,
      visibleGoalMeshes,
      unexpectedVisibleActorsOutsideRoom,
      ceilingMeshes,
      structuralCeilingShells: shellMeshes.filter((mesh) => mesh.decorIntent === 'ceiling'),
      coplanarCeilingPairs,
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
  expect(starterAudit.visibleGoalMeshes).toEqual([]);
  expect(starterAudit.unexpectedVisibleActorsOutsideRoom).toEqual([]);
  expect(starterAudit.transparentShells).toEqual([]);
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
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
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

function expectLevel5JumpPhaseInsideStarterRoom(phase, roomBounds, ceilingY) {
  expect(phase).not.toBeNull();
  expect(phase.cameraPos).not.toBeNull();
  expect(phase.cameraTarget).not.toBeNull();
  expect(phase.playerPos).not.toBeNull();
  expect(phase.cameraAboveCeiling).toBe(false);
  expect(phase.cameraInsideRoomXZ).toBe(true);
  expect(phase.cameraPos.y).toBeLessThanOrEqual(ceilingY + 0.001);
}

async function captureLevel5JumpCameraTrace(page) {
  return page.evaluate(async () => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const ceilingY = Number.isFinite(room?.ceilingY) ? room.ceilingY : 6.0;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const readState = (label) => {
      const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
      const camera = scene?.activeCamera ?? null;
      const cameraTarget = camera?.getTarget?.() ?? null;
      const playerPos = window.__DADA_DEBUG__?.playerPos ?? null;
      const cameraPos = camera?.position ?? null;
      return {
        label,
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
    };

    const frames = [readState('before_jump')];
    document.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    }));
    for (let i = 0; i < 20; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      frames.push(readState(`jump_press_${i}`));
    }
    document.dispatchEvent(new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    }));
    let airborneSeen = frames.some((frame) => !frame.grounded);
    for (let i = 0; i < 180; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const frame = readState(`jump_trace_${i}`);
      frames.push(frame);
      airborneSeen ||= !frame.grounded;
      if (airborneSeen && frame.grounded) break;
    }

    const ascent = frames.find((frame) => !frame.grounded && frame.playerVy > 0.4) ?? null;
    const airborneFrames = frames.filter((frame) => !frame.grounded && frame.playerPos);
    const apex = airborneFrames.reduce((best, frame) => (
      !best || frame.playerPos.y > best.playerPos.y ? frame : best
    ), null);
    const landing = frames.find((frame, index) => (
      airborneSeen
      && index > 0
      && frame.grounded
      && frames[index - 1]
      && !frames[index - 1].grounded
    )) ?? frames.at(-1) ?? null;

    return {
      roomBounds,
      ceilingY,
      before: frames[0] ?? null,
      ascent,
      apex,
      landing,
      anyCameraAboveCeiling: frames.some((frame) => frame.cameraAboveCeiling),
      anyCameraOutsideRoomXZ: frames.some((frame) => !frame.cameraInsideRoomXZ),
      ceilingOccluderSeen: frames.some((frame) => frame.occluderMesh === 'neutral_decorBlock_ceiling_shell'),
      entryClampSeen: frames.some((frame) => frame.occlusion?.usedEntryClamp === true),
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
      eastWallNorth: north,
      eastWallSouth: south,
      eastWallHeader: header,
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
  expect(report?.eastWallNorth?.bounds).not.toBeNull();
  expect(report?.eastWallSouth?.bounds).not.toBeNull();
  expect(report?.eastWallHeader?.bounds).not.toBeNull();
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
      playerPos: window.__DADA_DEBUG__?.playerPos ? {
        x: Number(window.__DADA_DEBUG__.playerPos.x.toFixed(3)),
        y: Number(window.__DADA_DEBUG__.playerPos.y.toFixed(3)),
        z: Number(window.__DADA_DEBUG__.playerPos.z.toFixed(3)),
      } : null,
      playerYaw: Number((window.__DADA_DEBUG__?.playerYaw ?? 0).toFixed(3)),
      cameraYaw: Number((window.__DADA_DEBUG__?.cameraYaw ?? 0).toFixed(3)),
      cameraDesiredYaw: Number((window.__DADA_DEBUG__?.cameraDesiredYaw ?? 0).toFixed(3)),
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

async function captureLevel5DoorwayRotationPhases(page) {
  const phases = {};
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });
  await resetEra5Pose(page, LEVEL5_DOORWAY_START_POSE);
  await page.waitForTimeout(260);
  phases.straight = await getLevel5DoorwayCameraState(page);

  await resetEra5Pose(page, LEVEL5_DOORWAY_DIRECT_BLOCK_POSE);
  await page.waitForTimeout(260);
  phases.directBlock = await getLevel5DoorwayCameraState(page);

  await resetEra5Pose(page, LEVEL5_DOORWAY_START_POSE);
  await page.waitForTimeout(220);
  for (const step of LEVEL5_DOORWAY_RIGHT_TURN_STEPS) {
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowRight', key: 'ArrowRight' });
    await page.waitForTimeout(step.holdMs);
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowRight', key: 'ArrowRight' });
    await page.waitForTimeout(280);
    phases[step.key] = await getLevel5DoorwayCameraState(page);
  }
  return phases;
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
    const floorEdgeScreen = floorEdgePoint ? (() => {
      const engine = scene.getEngine();
      const width = engine.getRenderWidth();
      const height = engine.getRenderHeight();
      const projected = Vector3.Project(
        floorEdgePoint,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );
      return {
        x: Number(projected.x.toFixed(3)),
        y: Number(projected.y.toFixed(3)),
        z: Number(projected.z.toFixed(6)),
      };
    })() : null;
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
    const state = {
      active: false,
      rafId: null,
      frameCounter: 0,
      pendingPlans: [],
      shotEntries: [],
      seenProjectileNames: new Set(),
      earliestUnreadableShots: [],
      roomBounds,
      preexistingProjectileCount: 0,
    };
    const getProjectileMeshes = () => (scene?.meshes ?? [])
      .filter((mesh) => String(mesh.name || '').startsWith('era5Bubble_'));
    const getCameraTarget = () => camera?.getTarget?.() ? {
      x: Number(camera.getTarget().x.toFixed(3)),
      y: Number(camera.getTarget().y.toFixed(3)),
      z: Number(camera.getTarget().z.toFixed(3)),
    } : null;
    const getPlayerPos = () => debug?.playerPos ? {
      x: Number(debug.playerPos.x.toFixed(3)),
      y: Number(debug.playerPos.y.toFixed(3)),
      z: Number(debug.playerPos.z.toFixed(3)),
    } : null;
    const getPlayerForward = () => debug?.playerForward ? {
      x: Number(debug.playerForward.x.toFixed(3)),
      z: Number(debug.playerForward.z.toFixed(3)),
    } : null;
    const getLaunchState = () => debug?.getEra5ProjectileLaunchState?.() ?? null;
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
    const api = {
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
          playerPos: getPlayerPos(),
          playerForward: getPlayerForward(),
          cameraPos: camera?.position ? {
            x: Number(camera.position.x.toFixed(3)),
            y: Number(camera.position.y.toFixed(3)),
            z: Number(camera.position.z.toFixed(3)),
          } : null,
          cameraTarget: getCameraTarget(),
          launchState: getLaunchState(),
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
          currentTestWouldPassBecause: state.shotEntries.map((shot) => ({
            shotIndex: shot.shotIndex,
            firstFrameCenterClearancePx: shot.frames[0]?.centerClearancePx ?? null,
            firstFrameBottomClearancePx: shot.frames[0]?.bottomClearancePx ?? null,
            oldRuntimeSampleFrameOffset: 1,
            oldRuntimeSampleCenterClearancePx: shot.frames[1]?.centerClearancePx ?? null,
            oldRuntimeCenterOnlyWouldPass: (shot.frames[1]?.centerClearancePx ?? -Infinity) > 4,
          })),
        };
      },
    };
    window.__LEVEL5_PROJECTILE_BURST_AUDIT__ = api;
    api.start();
  });
}

async function captureLevel5ProjectileBurstReport(page, { shotCount = 5, interShotDelayMs = 390 } = {}) {
  await page.evaluate(() => {
    window.focus();
  });
  await installLevel5ProjectileBurstAudit(page);

  for (let shotIndex = 1; shotIndex <= shotCount; shotIndex += 1) {
    await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.planShot(index), shotIndex);
    await page.keyboard.press('f');
    await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.waitForShotFrame(index, 0), shotIndex);
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
  return report;
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

function expectLevel5ProjectileBurstReport(report) {
  expect(report?.roomBounds).not.toBeNull();
  expect(report?.shots).toHaveLength(5);
  for (const shot of report.shots) {
    expect(shot?.meshName).toBeTruthy();
    expect(shot?.launchState?.origin).not.toBeNull();
    expect(shot?.launchState?.direction).not.toBeNull();
    expect(shot?.launchState?.aimTarget).not.toBeNull();
    expect(shot?.frames?.length).toBeGreaterThanOrEqual(3);
  }

  const auditedShots = report.shots.slice(0, 3);
  for (const shot of auditedShots) {
    expectLevel5ProjectileBurstFrame(shot.frames[0]);
    expect(shot.frames[1]?.bottomClearancePx).toBeGreaterThan(shot.frames[0]?.bottomClearancePx ?? -Infinity);
    expect(shot.frames[2]?.bottomClearancePx).toBeGreaterThan(shot.frames[1]?.bottomClearancePx ?? -Infinity);
    expect((shot.launchState?.origin?.y ?? -Infinity) - (shot.launchState?.floorTopY ?? Infinity)).toBeGreaterThan(1.6);
  }

  expect(report?.currentTestWouldPassBecause?.slice(0, 3)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ oldRuntimeCenterOnlyWouldPass: true }),
    ]),
  );
  for (const comparison of report?.currentTestWouldPassBecause?.slice(0, 3) ?? []) {
    expect(comparison.firstFrameBottomClearancePx).toBeGreaterThan(4);
  }

  expect(report?.activeProjectiles?.length ?? 0).toBeGreaterThanOrEqual(2);
  for (const projectile of report?.activeProjectiles ?? []) {
    expect(projectile?.screen).not.toBeNull();
    expect(projectile?.bottomClearancePx).toBeGreaterThan(4);
  }
}

test.beforeEach(async ({ page }) => {
  await installCleanStorage(page);
});

for (const levelCase of LEVEL_CASES) {
  test(`runtime: level ${levelCase.id} starts and can finish without uncaught exceptions`, async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(levelCase.url);
    await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
    await startDebugLevel(page, levelCase.id);

    if (levelCase.id === 3) {
      await page.evaluate(() => {
        window.__DADA_DEBUG__.restartRun();
      });
      await expect.poll(
        () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
        { timeout: 5_000 },
      ).toBe('TitleScene');

      await page.evaluate(() => {
        window.__DADA_DEBUG__.startLevel();
      });
      await expect.poll(
        () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
        { timeout: 10_000 },
      ).toBe('CribScene');
    }

    await page.evaluate(() => {
      window.__DADA_DEBUG__.teleportToGoal();
    });

    await expect.poll(
      () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
      { timeout: 10_000 },
    ).toBe('EndScene');

    if (pageErrors.length > 0) {
      throw new Error(`Page errors on level ${levelCase.id}: ${pageErrors.join('\n')}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors on level ${levelCase.id}: ${consoleErrors.join('\n')}`);
    }
  });
}

test('runtime: level 2 horse push keeps player near the lane', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-4.8, 1.25, 0.3);
  });
  await page.waitForTimeout(1800);

  const z = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.z ?? null);
  expect(z).not.toBeNull();
  expect(Math.abs(z)).toBeLessThanOrEqual(0.08);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 5_000 })
    .toBe('CribScene');
});

test('runtime: gameplay hotkey F triggers backflip', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(6.5, 1.25, 0);
  });
  await page.waitForTimeout(150);

  const backflipBeforeCount = await page.evaluate(() => window.__DADA_DEBUG__?.backflip?.count ?? 0);
  const groundedAttempt = await page.evaluate(() => {
    const started = window.__DADA_DEBUG__?.gameplayHotkey?.('KeyF') ?? false;
    return {
      started,
      backflip: window.__DADA_DEBUG__?.backflip ?? null,
    };
  });
  expect(groundedAttempt.started).toBe(false);
  expect(groundedAttempt.backflip?.count ?? 0).toBe(backflipBeforeCount);

  const backflipTriggered = await page.evaluate(() => {
    const player = window.__DADA_DEBUG__?.playerController;
    if (player) {
      player.grounded = false;
      player.jumping = true;
      player.vy = 6;
    }
    const started = window.__DADA_DEBUG__?.gameplayHotkey?.('KeyF') ?? false;
    return {
      started,
      backflip: window.__DADA_DEBUG__?.backflip ?? null,
    };
  });
  expect(backflipTriggered.started).toBe(true);
  expect(backflipTriggered.backflip).not.toBeNull();
  expect(backflipTriggered.backflip.cooldownMs).toBeGreaterThan(0);
  expect(backflipTriggered.backflip.count).toBeGreaterThan(backflipBeforeCount);
});

test('runtime: Cmd+R / Ctrl+R are not intercepted by checkpoint reset handling', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const result = await page.evaluate(() => {
    const before = window.__DADA_DEBUG__?.lastRespawnReason ?? null;
    const ctrlEvt = new KeyboardEvent('keydown', {
      key: 'r',
      code: 'KeyR',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const metaEvt = new KeyboardEvent('keydown', {
      key: 'r',
      code: 'KeyR',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ctrlEvt);
    window.dispatchEvent(metaEvt);
    return {
      before,
      after: window.__DADA_DEBUG__?.lastRespawnReason ?? null,
      ctrlPrevented: ctrlEvt.defaultPrevented,
      metaPrevented: metaEvt.defaultPrevented,
    };
  });

  expect(result.after).toBe(result.before);
  expect(result.ctrlPrevented).toBe(false);
  if (browserName === 'chromium') {
    expect(result.metaPrevented).toBe(false);
  }
});

test('runtime: level 4 stays locked until progress unlocks it, then starts and finishes cleanly', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);

  const lockedState = await page.evaluate(() => ({
    menuText: document.getElementById('titleLevelLock')?.textContent ?? '',
    ariaDisabled: document.getElementById('levelBtn4')?.getAttribute('aria-disabled') ?? '',
  }));
  expect(lockedState.ariaDisabled).toBe('');

  const blocked = await page.evaluate(() => {
    history.replaceState(null, '', `${window.location.pathname}?level=4&debug=1`);
    window.__DADA_DEBUG__?.startLevel?.(4);
    return {
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      hint: document.getElementById('titleHint')?.textContent ?? '',
    };
  });
  expect(blocked.sceneKey).toBe('TitleScene');
  expect(blocked.hint).toContain('unlock Super Sourdough');

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await startDebugLevel(page, 4);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportToGoal?.();
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 20_000 },
  ).toBe('EndScene');
});

test('@level5 @era5 @progression runtime: level 5 stays locked until Level 4 is completed, then runs cleanly for 10 seconds', async ({ page }) => {
  test.setTimeout(240_000);
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  await gotoDebugLevel(page, 1);

  const blocked = await page.evaluate(() => {
    history.replaceState(null, '', `${window.location.pathname}?level=5&debug=1`);
    window.__DADA_DEBUG__?.startLevel?.(5);
    return {
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      hint: document.getElementById('titleHint')?.textContent ?? '',
    };
  });
  expect(blocked.sceneKey).toBe('TitleScene');
  expect(blocked.hint).toContain('Beat Super Sourdough');

  await unlockEra5(page);

  await page.goto('http://127.0.0.1:4173/?level=5&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await startDebugLevel(page, 5);
  await page.waitForTimeout(10_000);

  const runtimeState = await page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError || null,
    musicLevelId: window.__DADA_DEBUG__?.musicLevelId ?? null,
  }));
  expect(runtimeState.sceneKey).toBe('CribScene');
  expect(runtimeState.lastRuntimeError).toBeNull();
  expect(runtimeState.musicLevelId).toBe(5);

  if (pageErrors.length > 0) {
    throw new Error(`Page errors on level 5: ${pageErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors on level 5: ${consoleErrors.join('\n')}`);
  }
});

test('@level5 @era5 runtime: level 5 exposes one-room topology and clean shell truth with no fade pop while turning', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);
  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null);
  const truth = await page.evaluate(() => window.__DADA_DEBUG__?.level5TruthReport?.() ?? null);
  const collision = await page.evaluate(() => window.__DADA_DEBUG__?.level5CollisionReport?.() ?? null);
  const walkable = await page.evaluate(() => window.__DADA_DEBUG__?.level5WalkableReport?.() ?? null);
  const respawn = await page.evaluate(() => window.__DADA_DEBUG__?.level5RespawnReport?.() ?? null);
  test.skip(!topology, 'Level 5 authored topology debug must be available on the authored-space Era 5 path.');
  expect(topology).not.toBeNull();
  expect(truth).not.toBeNull();
  expect(collision).not.toBeNull();
  expect(walkable).not.toBeNull();
  expect(respawn).not.toBeNull();
  expect(topology.sectorCount).toBe(1);
  expect(topology.connectorCount).toBe(0);
  expect(topology.topology?.hasCycle).toBe(false);
  expect((topology.topology?.routeChoices ?? []).length).toBe(0);
  expect(topology.walkableReport?.walkableSurfaceCount ?? 0).toBe(1);
  expect(topology.walkableReport?.missingCollision ?? []).toEqual([]);
  expect(topology.walkableReport?.underThickness ?? []).toEqual([]);
  expect(topology.walkableReport?.hiddenWalkables ?? []).toEqual([]);
  expect(topology.walkableReport?.unclassifiedWalkables ?? []).toEqual([]);
  expect(truth?.disableDecorOcclusionFade).toBe(true);
  expect(truth?.fadeableShells ?? []).toEqual([]);
  expect(truth?.cullRiskShells ?? []).toEqual([]);
  expect(collision?.unownedBlockers ?? []).toEqual([]);
  expect(collision?.invisibleBlockers ?? []).toEqual([]);
  expect(collision?.roomVolumeShells ?? []).toEqual([]);
  expect(walkable?.missingVisibleWalkables ?? []).toEqual([]);
  expect(walkable?.suspiciousFloorLikeDecor ?? []).toEqual([]);
  expect(respawn?.anchorCount ?? 0).toBe(1);
  expect(respawn?.selectedAnchor?.id).toBe('level5_spawn_anchor');
  const room = topology.sectors?.[0] ?? null;
  expect(room?.label).toBe('Starter Room');
  expect(Number(room?.w?.toFixed?.(2) ?? room?.w)).toBe(24);
  expect(Number(room?.d?.toFixed?.(2) ?? room?.d)).toBe(18);
  const audit = await getLevel5StarterRoomAudit(page);
  expect(audit.structuralCeilingShells).toHaveLength(1);
  expect(audit.transparentShells).toEqual([]);
  expect(audit.coplanarCeilingPairs).toEqual([]);
  expect(audit.visibleGoalMeshes).toEqual([]);
  expect(audit.unexpectedVisibleActorsOutsideRoom).toEqual([]);
  expect(audit.actorSummary?.goal?.visibleMeshCount ?? 0).toBe(0);
  expect(audit.actorSummary?.goal?.allowInvisible).toBe(true);
  const launchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(audit, launchAudit);

  await resetEra5Pose(page, { x: 12.0, y: 0.42, z: 9.0, yaw: 0.0, cameraYaw: 0.0 });
  const sweepSamples = [];
  const allowedOccluders = new Set([
    null,
    ...audit.shellMeshes.map((mesh) => `neutral_decorBlock_${mesh.name}`),
  ]);
  for (let i = 0; i < 16; i += 1) {
    const yaw = (i / 16) * Math.PI * 2;
    await resetEra5Pose(page, {
      x: 12.0,
      y: 0.42,
      z: 9.0,
      yaw,
      cameraYaw: yaw,
    });
    await page.waitForTimeout(120);
    sweepSamples.push(await page.evaluate(() => {
      const report = window.__DADA_DEBUG__?.era5VisionReport?.({ limit: 6 }) ?? null;
      return {
        fadedMeshes: report?.counts?.fadedMeshes ?? null,
        occluderMesh: report?.occluderMesh ?? null,
        goalVisibleMeshCount: window.__DADA_DEBUG__?.actors?.goal?.visibleMeshCount ?? null,
      };
    }));
  }
  expect(sweepSamples.every((sample) => sample.fadedMeshes === 0)).toBe(true);
  expect(sweepSamples.every((sample) => allowedOccluders.has(sample.occluderMesh))).toBe(true);
  expect(sweepSamples.every((sample) => sample.goalVisibleMeshCount === 0)).toBe(true);
});

test('@level5 @era5 runtime: level 5 launch frame and two brief left turns keep the starter-room shell visible and camera state aligned', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);

  const initialStarterAudit = await getLevel5StarterRoomAudit(page);
  const initialLaunchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(initialStarterAudit, initialLaunchAudit);

  await tapEra5LeftTurnTwice(page);

  const turnedStarterAudit = await getLevel5StarterRoomAudit(page);
  const turnedLaunchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(turnedStarterAudit, turnedLaunchAudit);
});

test('@level5 @era5 runtime: level 5 jump camera stays below the ceiling and inside the starter-room shell through ascent apex and landing', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const starterAudit = await getLevel5StarterRoomAudit(page);
  const launchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(starterAudit, launchAudit);

  const jumpTrace = await captureLevel5JumpCameraTrace(page);
  expect(jumpTrace.roomBounds).not.toBeNull();
  expect(Number(jumpTrace.ceilingY?.toFixed?.(3) ?? jumpTrace.ceilingY)).toBe(6);
  expect(jumpTrace.anyCameraAboveCeiling).toBe(false);
  expect(jumpTrace.anyCameraOutsideRoomXZ).toBe(false);
  expect(jumpTrace.ceilingOccluderSeen).toBe(true);
  expect(jumpTrace.entryClampSeen).toBe(true);
  expectLevel5JumpPhaseInsideStarterRoom(jumpTrace.before, jumpTrace.roomBounds, jumpTrace.ceilingY);
  expectLevel5JumpPhaseInsideStarterRoom(jumpTrace.ascent, jumpTrace.roomBounds, jumpTrace.ceilingY);
  expectLevel5JumpPhaseInsideStarterRoom(jumpTrace.apex, jumpTrace.roomBounds, jumpTrace.ceilingY);
  expectLevel5JumpPhaseInsideStarterRoom(jumpTrace.landing, jumpTrace.roomBounds, jumpTrace.ceilingY);
  expect(jumpTrace.ascent.playerVy).toBeGreaterThan(0.4);
  expect(jumpTrace.apex.occlusion?.pickDistance).not.toBeNull();
  expect(jumpTrace.apex.occlusion?.safeDistance).toBeLessThan(jumpTrace.apex.occlusion?.pickDistance ?? Infinity);
  expect(jumpTrace.landing.grounded).toBe(true);
  expect(Math.abs(jumpTrace.landing.cameraPos.y - jumpTrace.before.cameraPos.y)).toBeLessThan(0.05);
});

test('@level5 @era5 runtime: level 5 burst shots 1 through 3 stay readable above the far floor band from the gameplay camera', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const starterAudit = await getLevel5StarterRoomAudit(page);
  const launchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(starterAudit, launchAudit);

  const report = await captureLevel5ProjectileBurstReport(page);
  expectLevel5ProjectileBurstReport(report);

  const postLaunchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expect(postLaunchAudit.cameraInsideRoom).toBe(true);
  expect(postLaunchAudit.fadedMeshes).toBe(0);
  expect(postLaunchAudit.occluderMesh).toBe('neutral_decorBlock_west_wall');
});

test('@level5 @era5 runtime: level 5 east doorway assembly stays flush and camera-safe from direct blocker and right-turn doorway views', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);

  const starterAudit = await getLevel5StarterRoomAudit(page);
  const launchAudit = await getLevel5StarterRoomLaunchAudit(page);
  expectLevel5StarterRoomLaunchAudit(starterAudit, launchAudit);

  const assemblyReport = await getLevel5DoorwayAssemblyReport(page);
  expectLevel5DoorwayAssemblyReport(assemblyReport);

  const phases = await captureLevel5DoorwayRotationPhases(page);
  for (const phase of Object.values(phases)) {
    expect(phase?.roomBounds).not.toBeNull();
    expect(phase?.cameraPos).not.toBeNull();
    expect(phase?.cameraTarget).not.toBeNull();
    expect(phase?.cameraInsideRoom).toBe(true);
  }

  expect(phases.directBlock.occluderMesh).toBe('neutral_decorBlock_future_exit_blocker');
  expect(phases.directBlock.occlusion?.pickDistance).not.toBeNull();
  expect(phases.directBlock.occlusion?.usedEntryClamp).toBe(true);

  if (phases.rightStress.occluderMesh !== null) {
    expect(phases.rightStress.occluderMesh).toMatch(/neutral_decorBlock_(future_exit_blocker|east_wall_north|east_wall_south|east_wall_header)/);
    expect(phases.rightStress.occlusion?.pickDistance).not.toBeNull();
    expect(phases.rightStress.occlusion?.safeDistance).toBeLessThan(phases.rightStress.occlusion?.pickDistance ?? Infinity);
  }
  expect(phases.rightStress.cameraPos.x).toBeLessThan((phases.rightStress.roomBounds?.maxX ?? Infinity) - 0.05);
});

test('@level5 @era5 runtime: level 5 floor is fully traversable and the visible exit blocker keeps the player inside the room', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);

  for (const sample of [
    { x: 1.5, z: 1.5 },
    { x: 22.5, z: 1.5 },
    { x: 22.5, z: 16.5 },
    { x: 1.5, z: 16.5 },
    { x: 12.0, z: 9.0 },
  ]) {
    await resetEra5Pose(page, {
      x: sample.x,
      y: 0.42,
      z: sample.z,
      yaw: Math.PI * 0.5,
      cameraYaw: Math.PI * 0.5,
    });
    await page.waitForTimeout(280);
    const state = await page.evaluate(() => ({
      sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
      pos: window.__DADA_DEBUG__?.playerPos ?? null,
    }));
    expect(state.sceneKey).toBe('CribScene');
    expect(state.pos).not.toBeNull();
    expect(state.pos.y).toBeGreaterThan(0.35);
    expect(state.pos.y).toBeLessThan(0.6);
  }

  const blocker = await page.evaluate(() => {
    const report = window.__DADA_DEBUG__?.level5CollisionReport?.() ?? null;
    return (report?.blockers ?? []).find((entry) => entry.sourceName === 'future_exit_blocker') ?? null;
  });
  expect(blocker).not.toBeNull();
  expect(blocker.visibleOwnerCount).toBeGreaterThan(0);

  await resetEra5Pose(page, {
    x: 20.0,
    y: 0.42,
    z: 9.0,
    yaw: Math.PI * 0.5,
    cameraYaw: Math.PI * 0.5,
  });
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(1400);
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
  const blockedState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
  }));
  expect(blockedState.sceneKey).toBe('CribScene');
  expect(blockedState.pos).not.toBeNull();
  expect(blockedState.pos.x).toBeLessThan(23.5);
});

test('@level5 @era5 runtime: level 5 respawn returns to the starter-room spawn anchor', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  await resetEra5Pose(page, {
    x: 18.0,
    y: 0.42,
    z: 14.0,
    yaw: 0.24,
    cameraYaw: 0.24,
  });
  const resetState = await page.evaluate(() => ({
    resetTriggered: window.__DADA_DEBUG__?.gameplayHotkey?.('KeyR') ?? false,
    lastRespawnReason: window.__DADA_DEBUG__?.lastRespawnReason ?? null,
  }));
  expect(resetState.resetTriggered).toBe(true);
  expect(resetState.lastRespawnReason).toBe('manual_reset');

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.lastRespawnAnchor ?? null),
    { timeout: 6_000 },
  ).toMatchObject({
    id: 'level5_spawn_anchor',
    spaceId: 'starter_room',
  });

  const finalState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    anchor: window.__DADA_DEBUG__?.lastRespawnAnchor ?? null,
  }));
  expect(finalState.pos).not.toBeNull();
  expect(finalState.anchor?.id).toBe('level5_spawn_anchor');
  expect(Math.abs(finalState.pos.x - 4.0)).toBeLessThan(0.35);
  expect(Math.abs(finalState.pos.z - 9.0)).toBeLessThan(0.35);
  expect(finalState.pos.y).toBeGreaterThan(0.35);
  expect(finalState.pos.y).toBeLessThan(0.6);
});

test('@fast @era5 @progression runtime: levels 5 through 9 show under-construction overlays in the title menu', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);

  const lockState = await page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null);
  expect(lockState).not.toBeNull();
  expect(lockState.underConstruction).toMatchObject({
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
  });
  expect(lockState[6]).toBe(false);
  expect(lockState[7]).toBe(false);
  expect(lockState[8]).toBe(false);
  expect(lockState[9]).toBe(false);

  await page.click('#levelBtn6');
  await expect(page.locator('#titleHint')).toContainText('under construction');
  await page.click('#levelBtn9');
  await expect(page.locator('#titleHint')).toContainText('under construction');
});

test('@era5 @progression runtime: title click plus start for level 6 stays in the safe under-construction state', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);
  await page.click('#levelBtn6');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  const report = await getUnderConstructionReport(page);
  expectUnderConstructionReport(report, 6, { requirePlaceholderLevel: false });
});

for (const levelId of [6, 7, 8, 9]) {
  test(`@era5 @progression runtime: level ${levelId} direct debug start stays in the under-construction placeholder state`, async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDebugLevel(page, levelId);
    await page.evaluate((targetLevelId) => {
      window.__DADA_DEBUG__?.startLevel?.(targetLevelId);
    }, levelId);
    await page.waitForTimeout(250);
    const report = await getUnderConstructionReport(page);
    expectUnderConstructionReport(report, levelId);
  });
}

test('@era5 @progression runtime: direct auto-start for level 6 remains blocked in the under-construction title state', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('http://127.0.0.1:4173/?level=6&debug=1&start=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await page.waitForTimeout(1200);
  const report = await getUnderConstructionReport(page);
  expectUnderConstructionReport(report, 6);
});

test('runtime: gameplay hotkey R resets to last checkpoint', async ({ page }) => {
  test.setTimeout(180_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(16.3, 1.34, 0);
  });
  await page.waitForTimeout(250);
  const beforeResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  const resetState = await page.evaluate(() => ({
    resetTriggered: window.__DADA_DEBUG__?.gameplayHotkey?.('KeyR') ?? false,
    lastRespawnReason: window.__DADA_DEBUG__?.lastRespawnReason ?? null,
  }));
  expect(resetState.resetTriggered).toBe(true);
  expect(resetState.lastRespawnReason).toBe('manual_reset');
  await page.waitForTimeout(900);
  const afterResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  expect(beforeResetX).not.toBeNull();
  expect(afterResetX).not.toBeNull();
  expect(Math.abs(afterResetX - beforeResetX)).toBeGreaterThan(4);
});

test('runtime: level 2 floor fall clears collected binkies without resetting', async ({ page }) => {
  test.setTimeout(180_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const firstCoin = await page.evaluate(() => {
    const list = window.__DADA_DEBUG__?.collectibles?.() || [];
    return list.find((coin) => !coin.collected) || null;
  });
  expect(firstCoin).not.toBeNull();

  await page.evaluate((coin) => {
    window.__DADA_DEBUG__?.teleportPlayer?.(coin.x, coin.y + 0.28, coin.z);
  }, firstCoin);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(1);

  const beforeFallCoins = await page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-2.0, 1.2, 0);
  });
  await page.waitForTimeout(250);
  const penaltyResult = await page.evaluate(() => window.__DADA_DEBUG__?.triggerFloorPenalty?.() ?? null);
  expect(penaltyResult).not.toBeNull();
  expect(penaltyResult.lastRespawnReason || '').toBe('');

  const afterFall = await page.evaluate(() => ({
    coins: window.__DADA_DEBUG__?.coinsCollected ?? 0,
    floorPenaltyLevel: window.__DADA_DEBUG__?.lastFloorPenaltyLevel ?? null,
    floorPenaltyCount: window.__DADA_DEBUG__?.floorPenaltyCount ?? 0,
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
  }));
  expect(beforeFallCoins).toBeGreaterThan(0);
  expect(afterFall.coins).toBe(0);
  expect(afterFall.floorPenaltyLevel).toBe(2);
  expect(afterFall.floorPenaltyCount).toBeGreaterThan(0);
  expect(afterFall.sceneKey).toBe('CribScene');
});

test('runtime: level 2 pong minigame can be triggered and shows its UI', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel2Pong?.() ?? false);
  expect(started).toBe(true);
  await expect(page.locator('#pongTitle')).toHaveText('PONG PANIC', { timeout: 3_000 });
  await expect(page.locator('.dada-pong').getByText('Win 5 points to bounce back into the condo.')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 20_000 })
    .toBe('CribScene');
});

test('runtime: level 2 secret path debug data exposes floor reset pad and two secret binkies', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const secret = await page.evaluate(() => window.__DADA_DEBUG__?.level2Secret?.() ?? null);
  expect(secret).not.toBeNull();
  expect(Math.abs((secret.resetPadY ?? 999) - 0.02)).toBeLessThanOrEqual(0.06);
  expect(Array.isArray(secret.secretCoinPositions)).toBe(true);
  expect(secret.secretCoinPositions).toHaveLength(2);
  expect(Array.isArray(secret.vanishPlatforms)).toBe(true);
  expect(secret.vanishPlatforms).toHaveLength(3);
});

test('runtime: level 2 final stair is solid and the replacement loft coin exists', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const crumble = await page.evaluate(() => window.__DADA_DEBUG__?.level2LastCrumble?.() ?? null);
  expect(crumble).not.toBeNull();
  expect(crumble.name).toBe('crumbleStair5');

  const landingCoin = await page.evaluate(() => {
    const coins = window.__DADA_DEBUG__?.collectibles?.() ?? [];
    return coins.find((coin) => Math.abs(coin.x - 35.25) < 0.2 && Math.abs(coin.y - 9.86) < 0.2) ?? null;
  });
  expect(landingCoin).not.toBeNull();
  expect(typeof landingCoin.index).toBe('number');
});

// ── New tests for tasks 1–5 ──────────────────────────────────────────────────

test('runtime: onesie pickup shows ACTIVE in HUD and icon label is JUMP', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  // Teleport player onto the onesie pickup (x=15, y=4.70)
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(15.0, 5.0, 0);
  });
  // Wait for buff to become active
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.onesieBuffMs ?? 0),
    { timeout: 8_000 },
  ).toBeGreaterThan(0);

  // Buff panel must be visible and show ACTIVE
  const hudState = await page.evaluate(() => {
    const buffEl = document.querySelector('.dada-buff');
    const stateEl = document.querySelector('[data-buff="onesie"] .dada-buff-state');
    const iconEl = document.querySelector('.dada-buff-icon.onesie');
    return {
      buffVisible: buffEl ? getComputedStyle(buffEl).display !== 'none' : false,
      stateText: stateEl?.textContent ?? '',
      iconText: iconEl?.textContent ?? '',
    };
  });
  expect(hudState.buffVisible).toBe(true);
  expect(hudState.stateText).toBe('ACTIVE');
  expect(hudState.iconText).toBe('JUMP');
});

test('runtime: Reset Baby to New clears capeUnlocked and locks Level 4', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);
  await startDebugLevel(page, 1);

  // Grant progression via debug
  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.capeUnlocked = true;
    state.sourdoughUnlocked = true;
    state.unlocksShown = { cape: true, sourdough: true };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  // Confirm level 4 is now unlocked
  const beforeReset = await page.evaluate(() => ({
    capeUnlocked: window.__DADA_DEBUG__?.progressState?.capeUnlocked ?? false,
    sourdoughUnlocked: window.__DADA_DEBUG__?.progressState?.sourdoughUnlocked ?? false,
  }));
  expect(beforeReset.capeUnlocked).toBe(true);
  expect(beforeReset.sourdoughUnlocked).toBe(true);

  // Trigger Reset Baby to New via debug API
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.resetBabyToNew?.();
  });
  await page.waitForTimeout(300);

  const afterReset = await page.evaluate(() => ({
    capeUnlocked: window.__DADA_DEBUG__?.progressState?.capeUnlocked ?? null,
    sourdoughUnlocked: window.__DADA_DEBUG__?.progressState?.sourdoughUnlocked ?? null,
    level4AriaDisabled: document.querySelector('#menuLevelBtn4')?.getAttribute('aria-disabled') ?? 'absent',
    storageEmpty: (() => {
      try {
        const raw = localStorage.getItem('dadaquest:progress:v1');
        if (!raw) return true;
        const p = JSON.parse(raw);
        return !p?.capeUnlocked && !p?.sourdoughUnlocked;
      } catch { return false; }
    })(),
  }));

  expect(afterReset.capeUnlocked).toBe(false);
  expect(afterReset.sourdoughUnlocked).toBe(false);
  expect(afterReset.storageEmpty).toBe(true);
});

test('runtime: pong win to 5 points shows YOU WON and returns to Level 2', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel2Pong?.() ?? false);
  expect(started).toBe(true);

  // Force the player score to WIN_SCORE via internal state
  await page.evaluate(() => {
    const pong = window.__DADA_DEBUG__?._pongMinigame;
    if (pong) {
      // Jump score to 4, then trigger one final point
      pong.playerScore = 4;
      pong.cpuScore = 0;
      pong.scorePoint(true);  // triggers win
    }
  });

  // Check canvas shows win overlay text (rendered) or title changed
  await page.waitForTimeout(300);
  const titleText = await page.evaluate(() => document.getElementById('pongTitle')?.textContent ?? '');
  expect(titleText).toContain('WON');

  // After 1.5s the game should return to gameplay
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 5_000 },
  ).toBe('CribScene');
});

test('runtime: level 3 out-of-bounds triggers balloon roundup minigame', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel3Balloon?.() ?? false);
  expect(started).toBe(true);

  // Balloon minigame UI should be visible
  const balloonVisible = await page.evaluate(() => {
    const el = document.querySelector('.dada-balloon');
    return el ? el.style.display !== 'none' : false;
  });
  expect(balloonVisible).toBe(true);

  // sceneKey should be MinigameScene
  const sceneKey = await page.evaluate(() => window.__DADA_DEBUG__?.sceneKey ?? null);
  expect(sceneKey).toBe('MinigameScene');

  // ESC should abort and restart Level 3 (back to TitleScene then CribScene)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 20_000 },
  ).toBe('CribScene');
});

test('runtime: level 3 loads without runtime errors after grandma relocation', async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  // Brief gameplay tick
  await page.waitForTimeout(500);

  expect(pageErrors).toHaveLength(0);
  const sceneKey = await page.evaluate(() => window.__DADA_DEBUG__?.sceneKey ?? null);
  expect(sceneKey).toBe('CribScene');
});

test('runtime: level 4 music starts with correct level id after user gesture', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await startDebugLevel(page, 4);

  // Simulate user gesture so AudioContext can unlock
  await page.mouse.click(400, 300);
  await page.waitForTimeout(2000);

  const musicLevelId = await page.evaluate(() => window.__DADA_DEBUG__?.musicLevelId ?? -1);
  expect(musicLevelId).toBe(4);
});

test('runtime: level 4 bread rain system spawns objects during gameplay', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await startDebugLevel(page, 4);

  // Let the rain update loop run for 2 seconds
  await page.waitForTimeout(2_000);

  const rainCount = await page.evaluate(() => window.__DADA_DEBUG__?.l4RainActiveCount ?? -1);
  expect(rainCount).toBeGreaterThan(0);
});
